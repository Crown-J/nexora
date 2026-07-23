// apps/nx-api/test/e2e-scenarios/11-pick-ship-chain.mjs
// 撿包送重設計鏈（SALES-FLOW 2026-07-22）：SO(現貨+等調撥+誤標) → 確認 → ST 收貨解鎖 →
//   【撿貨池】開始撿+逐行撿完 → 【包貨台】建包貨單(一箱一單)+封箱 → 【三區】自取簽收 → 過帳。
// ⭐ 核心驗證：扣庫存+開應收從「出庫 SHIPPED」搬到「簽收完成 COMPLETED」(D4/D6)——
//   封箱後(SHIPPED)庫存不動、簽收後(COMPLETED)才扣庫存+開應收。
// 仍驗：①ST RECEIVED 回寫 SO 行 C ②誤標調撥後端自動轉現貨 ③fulfillStatus 全流轉 W→PK→PL→F。
// 只能對本機開發 DB 跑；庫存 backup/restore 還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('撿貨出貨鏈');
const created = { sos: [], sts: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const customer = (await ctx.actors()).customer;

  // 演員：A 倉 + 有貨料 P1/P2/P4（P4 用來誤標）+ 跨倉料 P3（A 無貨、他倉有 → 等調撥）
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w
     WHERE w.tenant_id=$1 AND w.is_active AND EXISTS
       (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>20)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const stocks = await many(
    `SELECT b.part_id AS id, p.code, b.available_qty FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>20
     ORDER BY b.available_qty DESC LIMIT 3`, [T, whA.id]);
  const [P1, P2, P4] = stocks;
  const P3 = await one(
    `SELECT b.part_id AS id, p.code, w.code AS src_wh, b.warehouse_id AS src_wh_id FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     JOIN nx01_warehouse w ON w.id=b.warehouse_id
     WHERE b.tenant_id=$1 AND b.available_qty>10 AND b.warehouse_id<>$2
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_balance b2
                       WHERE b2.tenant_id=$1 AND b2.part_id=b.part_id AND b2.warehouse_id=$2 AND b2.available_qty>0)
     ORDER BY w.sort_no LIMIT 1`, [T, whA.id]);
  console.log(`客戶 ${customer.code}／A倉 ${whA.code}`);
  console.log(`P1=${P1.code} P2=${P2.code} P4=${P4.code}(誤標T) P3=${P3.code}(等調撥、${P3.src_wh}來)`);

  // 庫存快照（測後還原）
  for (const pid of [P1.id, P2.id, P3.id, P4.id]) balBaks.push(await ctx.backupBalances(pid));
  const balOf = async (partId, whId) =>
    Number((await one(
      `SELECT on_hand_qty FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3`,
      [T, partId, whId]))?.on_hand_qty ?? 0);
  const balA_P1_before = await balOf(P1.id, whA.id);
  const balA_P3_before = await balOf(P3.id, whA.id); // 0（A 無此料）
  const balSrc_P3_before = await balOf(P3.id, P3.src_wh_id);

  // ══ 1. 建單（現貨×2 + 等調撥×1 + 誤標×1）→ 確認 ══
  console.log('\n══ 1. 建單+確認（4 行） ══');
  const mk = (pid, qty, src) => ({
    partId: pid, warehouseId: whA.id, qty, unitPriceSnapshot: 999,
    transferSourceType: src, belowMinReason: '撿貨鏈測試',
  });
  const soRes = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'P', deliveryAddress: '客戶自取（撿貨鏈測試）',
    taxRate: 5, invoiceCopies: 3,
    items: [mk(P1.id, 2, 'S'), mk(P2.id, 3, 'S'), mk(P3.id, 3, 'T'), mk(P4.id, 2, 'T')],
  });
  ctx.check('1a 建單', soRes.status === 201, JSON.stringify(soRes.data));
  const so = soRes.data;
  created.sos.push(so.id);
  const conf = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  ctx.check('1b 確認', conf.status === 200, JSON.stringify(conf.data));

  const itemsAfterConfirm = await many(
    `SELECT part_id, transfer_source_type AS src, transfer_status AS ts, st_id, fulfill_status AS fs
     FROM nx04_so_item WHERE so_id=$1 ORDER BY line_no`, [so.id]);
  const li = (pid) => itemsAfterConfirm.find((r) => r.part_id === pid);
  ctx.check('1c 現貨行 S/C 等撿貨', li(P1.id)?.ts === 'C' && li(P2.id)?.ts === 'C', JSON.stringify([li(P1.id), li(P2.id)]));
  ctx.check('1d 誤標行(有貨標T) → 後端自動轉回 S/C ⭐新修', li(P4.id)?.src === 'S' && li(P4.id)?.ts === 'C' && !li(P4.id)?.st_id,
    JSON.stringify(li(P4.id)));
  ctx.check('1e 等調撥行 T/I+綁ST', li(P3.id)?.src === 'T' && li(P3.id)?.ts === 'I' && !!li(P3.id)?.st_id,
    JSON.stringify(li(P3.id)));

  // ══ 2. 調撥執行：補儲位 → 在途 → 收貨過帳 ══
  console.log('\n══ 2. 調撥 ST：補儲位 → TRANSIT → RECEIVED ══');
  const stId = li(P3.id).st_id;
  created.sts.push(stId);
  const stItem = await one(`SELECT id FROM nx03_st_item WHERE st_id=$1`, [stId]);
  const locOf = async (whId) =>
    (await one(`SELECT id FROM nx01_location WHERE warehouse_id=$1 AND is_active LIMIT 1`, [whId]))?.id;
  const patchLoc = await ctx.call('PATCH', `/nx03/transfer/${stId}/items/${stItem.id}`, {
    fromLocationId: await locOf(P3.src_wh_id), toLocationId: await locOf(whA.id),
  });
  ctx.check('2a 倉管補儲位', patchLoc.status === 200, JSON.stringify(patchLoc.data));
  const toTransit = await ctx.call('PATCH', `/nx03/transfer/${stId}`, { status: 'TRANSIT' });
  ctx.check('2b DRAFT→TRANSIT', toTransit.status === 200, JSON.stringify(toTransit.data));
  const toRecv = await ctx.call('PATCH', `/nx03/transfer/${stId}`, { status: 'RECEIVED' });
  ctx.check('2c TRANSIT→RECEIVED 收貨過帳', toRecv.status === 200, JSON.stringify(toRecv.data));

  // 收貨後真相：庫存移動 + SO 行解鎖 + 通知
  const balA_P3_afterRecv = await balOf(P3.id, whA.id);
  const balSrc_P3_afterRecv = await balOf(P3.id, P3.src_wh_id);
  ctx.check('2d 庫存移動：來源倉 -3、A 倉 +3',
    balSrc_P3_before - balSrc_P3_afterRecv === 3 && balA_P3_afterRecv - balA_P3_before === 3,
    `src ${balSrc_P3_before}→${balSrc_P3_afterRecv}、A ${balA_P3_before}→${balA_P3_afterRecv}`);
  const p3After = await one(
    `SELECT transfer_status FROM nx04_so_item WHERE so_id=$1 AND part_id=$2`, [so.id, P3.id]);
  ctx.check('2e ⭐新修：ST 收貨 → SO 行解鎖 I→C（原本永遠卡補貨中）', p3After?.transfer_status === 'C',
    JSON.stringify(p3After));
  const notice = await one(
    `SELECT title FROM nx98_task_pool WHERE tenant_id=$1 AND source_doc_id=$2 AND category='SALES_SHIP_READY'`,
    [T, so.id]);
  ctx.check('2f 通知建單人「調撥料已到」', !!notice && notice.title.includes('調撥料已到'), notice?.title ?? '無');

  // ══ 3. 撿貨清單（庫位軸）：依料件撿(整批標已撿、W→PK) → 隱形撿貨單自動 F ══
  console.log('\n══ 3. 撿貨清單（庫位軸、依料件合併撿、W→PK、隱形撿貨單自動完成） ══');
  // 清單依庫位分組、同（倉×料件）合併總量；撿到了＝某（倉×料件）整批標已撿
  const list = await ctx.call('GET', '/nx03/pick-pool');
  ctx.check('3a 撿貨清單載入（依庫位分組）', list.status === 200 && Array.isArray(list.data?.groups),
    JSON.stringify(list.data)?.slice(0, 120));
  for (const p of [P1, P2, P3, P4]) {
    const pick = await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: p.id });
    ctx.check(`3b 撿 ${p.code}（整批標已撿）`, pick.status === 201 && pick.data?.picked >= 1, JSON.stringify(pick.data));
  }
  let fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('3c ⭐行 fulfillStatus W→PK（撿貨完、銷貨單看得到進度）',
    fs.length === 1 && fs[0].fulfill_status === 'PK', JSON.stringify(fs));
  const pkStat = await one(
    `SELECT count(*) FILTER (WHERE pk_id IS NOT NULL) AS pk_cnt,
            count(DISTINCT pk_id) AS pk_uniq,
            count(*) FILTER (WHERE status='C') AS done
     FROM nx03_pk_item WHERE ref_so_id=$1`, [so.id]);
  ctx.check('3d 一張 SO 一張隱形撿貨單（非爆多張）＋ 4 行皆已撿 C',
    Number(pkStat?.pk_uniq) === 1 && Number(pkStat?.done) === 4, JSON.stringify(pkStat));

  // ══ 4. 包貨台：建包貨單(一箱一單) → 封箱 → SO SHIPPED（⭐ 不扣帳） ══
  console.log('\n══ 4. 包貨台（客戶為單位建單、封箱→SHIPPED、⭐ 庫存/應收不動） ══');
  const balA_P1_beforeSeal = await balOf(P1.id, whA.id);
  const pack = await ctx.call('POST', '/nx03/pack-pool', {
    customerId: customer.id, warehouseId: whA.id, deliveryType: 'P',
  });
  ctx.check('4a 建包貨單（客戶為單位、預設一箱一單）', pack.status === 201 && (pack.data?.parcels?.length ?? 0) >= 1,
    JSON.stringify(pack.data));
  const plId = pack.data?.id;
  fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('4b ⭐行 fulfillStatus PK→PL（包貨中）', fs.length === 1 && fs[0].fulfill_status === 'PL', JSON.stringify(fs));
  const seal = await ctx.call('POST', '/nx03/pack-pool/seal', { plId });
  ctx.check('4c 封箱（包貨完成）', seal.status === 201, JSON.stringify(seal.data));
  const soAfterSeal = await one(`SELECT status FROM nx04_so WHERE id=$1`, [so.id]);
  ctx.check('4d 封箱 → SO 已出倉待簽收 SHIPPED', soAfterSeal?.status === 'SHIPPED', JSON.stringify(soAfterSeal));
  const balA_P1_afterSeal = await balOf(P1.id, whA.id);
  ctx.check('4e ⭐ 封箱後庫存「不動」（過帳未提前、D4）', balA_P1_afterSeal === balA_P1_beforeSeal,
    `${balA_P1_beforeSeal}→${balA_P1_afterSeal}`);
  const arBeforeSign = await one(
    `SELECT count(*)::int AS n FROM nx05_ar_ledger WHERE tenant_id=$1 AND so_id=$2`, [T, so.id]);
  ctx.check('4f ⭐ 封箱後應收「未開」', arBeforeSign?.n === 0, `AR ${arBeforeSign?.n}`);

  // ══ 5. 出貨三區 · 自取簽收 → COMPLETED（⭐ 此刻才扣庫存 + 開應收） ══
  console.log('\n══ 5. 三區自取簽收 → COMPLETED（⭐ 簽收才扣庫存+開應收、D4/D6） ══');
  const sign = await ctx.call('POST', '/nx03/ship-zones/pickup/sign', { plId, signerName: '撿包送鏈測試簽收' });
  ctx.check('5a 自取簽收', sign.status === 201 && sign.data?.ok, JSON.stringify(sign.data));
  const soDone = await one(`SELECT status FROM nx04_so WHERE id=$1`, [so.id]);
  ctx.check('5b 簽收 → SO 完成 COMPLETED', soDone?.status === 'COMPLETED', JSON.stringify(soDone));
  fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('5c ⭐行 fulfillStatus → F（已送達）', fs.length === 1 && fs[0].fulfill_status === 'F', JSON.stringify(fs));
  const balA_P1_after = await balOf(P1.id, whA.id);
  const balA_P3_afterShip = await balOf(P3.id, whA.id);
  ctx.check('5d ⭐ 簽收後「才」扣庫存：P1 A倉 -2', balA_P1_before - balA_P1_after === 2,
    `${balA_P1_before}→${balA_P1_after}`);
  ctx.check('5e 簽收後扣庫存：P3 A倉 3→0（調來的貨出掉）', balA_P3_afterShip === balA_P3_before,
    `A ${balA_P3_afterRecv}→${balA_P3_afterShip}`);
  const ledgers = await one(
    `SELECT count(*)::int AS n FROM nx03_stock_ledger
     WHERE tenant_id=$1 AND source_doc_id=$2 AND source_doc_type='S'`, [T, so.id]);
  ctx.check('5f 出貨流水 4 行入帳（doc_type=S）', ledgers?.n === 4, `實際 ${ledgers?.n}`);
  const arAfter = await one(
    `SELECT count(*)::int AS n FROM nx05_ar_ledger WHERE tenant_id=$1 AND so_id=$2`, [T, so.id]);
  ctx.check('5g ⭐ 簽收後才開應收 1 筆', arAfter?.n === 1, `AR ${arAfter?.n}`);
  // WMS 恆等式：撿→包→簽收(從待包扣)全鏈後，每料每倉 Σ庫位 = 倉庫 onHand
  const inv = async (pid, whId) => Number((await one(
    `SELECT (SELECT COALESCE(SUM(on_hand_qty),0) FROM nx03_stock_location_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3)
          - (SELECT COALESCE(on_hand_qty,0) FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3) AS d`, [T, pid, whId]))?.d ?? 0);
  const invP1 = await inv(P1.id, whA.id), invP3 = await inv(P3.id, whA.id);
  ctx.check('5h ⭐ WMS 全鏈恆等式 Σ庫位=倉庫（P1/P3）', invP1 === 0 && invP3 === 0, `P1差${invP1} P3差${invP3}`);
} finally {
  // 還原庫存 + 清單據/通知（PK/PL 依 refSoId 反查清、wipeDocs 未涵蓋）
  for (const b of balBaks) await ctx.restoreBalances(b);
  await ctx.db.query(
    `DELETE FROM nx98_task_pool WHERE tenant_id=$1 AND source_doc_id = ANY($2)`, [ctx.tenant, created.sos]);
  if (created.sos.length) {
    const pkIds = (await ctx.db.query(
      `SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id);
    if (pkIds.length) {
      const plIds = (await ctx.db.query(
        `SELECT id FROM nx03_pl WHERE pk_id = ANY($1)
         UNION
         SELECT DISTINCT pl_id FROM nx03_pl_item
           WHERE pk_item_id IN (SELECT id FROM nx03_pk_item WHERE pk_id = ANY($1))`, [pkIds])).rows.map((r) => r.id);
      if (plIds.length) {
        await ctx.db.query(`DELETE FROM nx03_pl_item WHERE pl_id = ANY($1)`, [plIds]);
        await ctx.db.query(`DELETE FROM nx03_parcel WHERE pl_id = ANY($1)`, [plIds]);
        await ctx.db.query(`DELETE FROM nx03_pl WHERE id = ANY($1)`, [plIds]);
      }
      await ctx.db.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]);
      await ctx.db.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]);
    }
  }
  await ctx.wipeDocs(created);
  console.log(`\n【自清】SO×${created.sos.length}、ST×${created.sts.length}、庫存快照還原×${balBaks.length}`);
  ctx.summary();
  await ctx.db.end();
}
