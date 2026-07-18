// apps/nx-api/test/e2e-scenarios/11-pick-ship-chain.mjs
// 撿貨出貨鏈（PICK-CHAIN 2026-07-18）：SO(現貨+等調撥+誤標) → 確認 → ST 在途/收貨 → 行解鎖 →
// PICKING → SHIPPED 扣庫存。驗兩個新修：①ST RECEIVED 回寫 SO 行 C ②誤標調撥後端自動轉現貨。
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

  // ══ 3. 撿貨 PK：建單 → 啟動(行 W→PK) → 逐項完成 → F ══
  console.log('\n══ 3. 撿貨 PK（fulfillStatus W→PK ⭐新回寫） ══');
  const soItemRows = await many(
    `SELECT id, part_id, qty FROM nx04_so_item WHERE so_id=$1 ORDER BY line_no`, [so.id]);
  const pkRes = await ctx.call('POST', '/nx03/pk', {
    warehouseId: whA.id, pkDate: ctx.today, triggerSource: 'S', deliveryType: 'C',
    items: soItemRows.map((r) => ({ refSoId: so.id, refSoItemId: r.id, partId: r.part_id, qty: Number(r.qty) })),
  });
  ctx.check('3a 撿貨單建立（4 行、綁 SO 行）', pkRes.status === 201, JSON.stringify(pkRes.data));
  const pkId = pkRes.data?.id;
  const pkStart = await ctx.call('PATCH', `/nx03/pk/${pkId}`, { status: 'C' });
  ctx.check('3b 撿貨啟動 P→C', pkStart.status === 200, JSON.stringify(pkStart.data));
  let fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('3c ⭐行 fulfillStatus W→PK（撿貨中、銷貨單看得到進度）',
    fs.length === 1 && fs[0].fulfill_status === 'PK', JSON.stringify(fs));
  const pkItems = await many(`SELECT id FROM nx03_pk_item WHERE pk_id=$1`, [pkId]);
  for (const it of pkItems) {
    await ctx.call('PATCH', `/nx03/pk/${pkId}/items/${it.id}`, { status: 'C' });
  }
  const pkFin = await ctx.call('PATCH', `/nx03/pk/${pkId}`, { status: 'F' });
  ctx.check('3d 撿貨完成 C→F', pkFin.status === 200, JSON.stringify(pkFin.data));

  // ══ 4. 包貨 PL：從 PK 建 → 啟動(行 PK→PL) → 完成 → 寄出(行 PL→D) ══
  console.log('\n══ 4. 包貨 PL（fulfillStatus PK→PL→D ⭐新回寫） ══');
  const plRes = await ctx.call('POST', '/nx03/pl', { pkId, plDate: ctx.today, plType: 'C' });
  ctx.check('4a 包貨單從撿貨單轉建', plRes.status === 201, JSON.stringify(plRes.data));
  const plId = plRes.data?.id;
  const plStart = await ctx.call('PATCH', `/nx03/pl/${plId}`, { status: 'C' });
  ctx.check('4b 包貨啟動 P→C', plStart.status === 200, JSON.stringify(plStart.data));
  fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('4c ⭐行 fulfillStatus PK→PL（包貨中）', fs.length === 1 && fs[0].fulfill_status === 'PL', JSON.stringify(fs));
  const plFin = await ctx.call('PATCH', `/nx03/pl/${plId}`, { status: 'F' });
  ctx.check('4d 包貨完成 C→F', plFin.status === 200, JSON.stringify(plFin.data));
  const plShip = await ctx.call('PATCH', `/nx03/pl/${plId}`, { status: 'S', logisticsTrackingNo: 'TEST-TRACK-001' });
  ctx.check('4e 寄出 F→S', plShip.status === 200, JSON.stringify(plShip.data));
  fs = await many(`SELECT DISTINCT fulfill_status FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  ctx.check('4f ⭐行 fulfillStatus PL→D（配送中；DN 簽收推 F 既有）',
    fs.length === 1 && fs[0].fulfill_status === 'D', JSON.stringify(fs));

  // ══ 5. 出貨：PICKING → SHIPPED（扣庫存） ══
  console.log('\n══ 5. 出貨 PICKING → SHIPPED ══');
  const toPick = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'PICKING' });
  ctx.check('5a CONFIRMED→PICKING', toPick.status === 200, JSON.stringify(toPick.data));
  const toShip = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'SHIPPED' });
  ctx.check('5b PICKING→SHIPPED 過帳', toShip.status === 200, JSON.stringify(toShip.data));

  const balA_P1_after = await balOf(P1.id, whA.id);
  const balA_P3_afterShip = await balOf(P3.id, whA.id);
  ctx.check('5c 出貨扣庫存：P1 A倉 -2', balA_P1_before - balA_P1_after === 2,
    `${balA_P1_before}→${balA_P1_after}`);
  ctx.check('5d 出貨扣庫存：P3 A倉 3→0（調來的貨出掉）', balA_P3_afterShip === balA_P3_before,
    `A ${balA_P3_afterRecv}→${balA_P3_afterShip}`);
  const ledgers = await many(
    `SELECT count(*)::int AS n FROM nx03_stock_ledger
     WHERE tenant_id=$1 AND source_doc_id=$2 AND source_doc_type='S'`, [T, so.id]);
  ctx.check('5e 出貨流水 4 行入帳（doc_type=S）', ledgers[0]?.n === 4, `實際 ${ledgers[0]?.n}`);
} finally {
  // 還原庫存 + 清單據/通知（PK/PL 依 refSoId 反查清、wipeDocs 未涵蓋）
  for (const b of balBaks) await ctx.restoreBalances(b);
  await ctx.db.query(
    `DELETE FROM nx98_task_pool WHERE tenant_id=$1 AND source_doc_id = ANY($2)`, [ctx.tenant, created.sos]);
  if (created.sos.length) {
    const pkIds = (await ctx.db.query(
      `SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id);
    if (pkIds.length) {
      await ctx.db.query(
        `DELETE FROM nx03_pl_item WHERE pl_id IN (SELECT id FROM nx03_pl WHERE pk_id = ANY($1))`, [pkIds]);
      await ctx.db.query(`DELETE FROM nx03_pl WHERE pk_id = ANY($1)`, [pkIds]);
      await ctx.db.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]);
      await ctx.db.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]);
    }
  }
  await ctx.wipeDocs(created);
  console.log(`\n【自清】SO×${created.sos.length}、ST×${created.sts.length}、庫存快照還原×${balBaks.length}`);
  ctx.summary();
  await ctx.db.end();
}
