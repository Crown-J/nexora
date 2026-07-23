// apps/nx-api/test/e2e-scenarios/15-doc-timing-putback.mjs
// 單據計時 KPI + 撿貨中被取消放回（DOC-TIMING-KPI 2026-07-23 執行長拍板）：
//   A. SO 全鏈時間戳：撿貨→pick_started_at、封箱→sealed_at、簽收→completed_at、timing.totalMinutes 可算。
//   B. ST 發貨戳：DRAFT→TRANSIT 寫 dispatched_at、timing.totalMinutes（發貨→收貨）。
//   C. 撿貨中取消：撿到一半的 SO 被取消 → 開 PUTBACK 放回待辦 + 隱形撿貨單作廢 + 排出包貨台。
// 只能對本機開發 DB 跑；庫存 backup/restore 還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('計時KPI+放回');
const created = { sos: [], sts: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const customer = (await ctx.actors()).customer;

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
  const [P1, P2] = stocks;
  for (const pid of [P1.id, P2.id]) balBaks.push(await ctx.backupBalances(pid));
  const mk = (pid, qty) => ({ partId: pid, warehouseId: whA.id, qty, unitPriceSnapshot: 999, transferSourceType: 'S', belowMinReason: '計時KPI測試' });
  const soGet = async (id) => (await ctx.call('GET', `/nx04/so/${id}`)).data;

  // ══ A. SO 全鏈時間戳 ══
  console.log('\n══ A. SO 全鏈時間戳（撿貨開始→封箱→簽收完成） ══');
  const soRes = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'P', deliveryAddress: '自取（計時測試）', taxRate: 5, invoiceCopies: 3,
    items: [mk(P1.id, 2), mk(P2.id, 3)],
  });
  ctx.check('A0 建單', soRes.status === 201, JSON.stringify(soRes.data));
  const so = soRes.data; created.sos.push(so.id);
  await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });

  // 撿貨前：三戳皆 null
  let d = await soGet(so.id);
  ctx.check('A1 撿貨前 pick_started_at 為 null', d.timing?.pickStartedAt == null, JSON.stringify(d.timing));

  // 撿貨（兩料件整批撿）
  for (const p of [P1, P2]) await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: p.id });
  d = await soGet(so.id);
  ctx.check('A2 撿貨後 pick_started_at 有值（KPI 起點）', !!d.timing?.pickStartedAt, JSON.stringify(d.timing));
  ctx.check('A3 撿貨後 sealed_at 仍 null（未封箱）', d.timing?.sealedAt == null, JSON.stringify(d.timing));

  // 記下撿貨戳、驗第二次撿不覆蓋（只寫一次）
  const pickStamp1 = d.timing.pickStartedAt;

  // 封箱
  const pack = await ctx.call('POST', '/nx03/pack-pool', { customerId: customer.id, warehouseId: whA.id, deliveryType: 'P' });
  const plId = pack.data?.id;
  await ctx.call('POST', '/nx03/pack-pool/seal', { plId });
  d = await soGet(so.id);
  ctx.check('A4 封箱後 sealed_at 有值（KPI 中段）', !!d.timing?.sealedAt, JSON.stringify(d.timing));
  ctx.check('A5 pick_started_at 不被封箱覆寫（只寫一次）', d.timing?.pickStartedAt === pickStamp1, `${pickStamp1} vs ${d.timing?.pickStartedAt}`);
  ctx.check('A6 撿→封段可算 pickToSealMinutes', typeof d.timing?.pickToSealMinutes === 'number', JSON.stringify(d.timing));

  // 簽收
  await ctx.call('POST', '/nx03/ship-zones/pickup/sign', { plId, signerName: '計時測試簽收' });
  d = await soGet(so.id);
  ctx.check('A7 簽收後 completed_at 有值（KPI 終點）', !!d.timing?.completedAt, JSON.stringify(d.timing));
  ctx.check('A8 全鏈 totalMinutes 可算（撿→簽、>=0）', typeof d.timing?.totalMinutes === 'number' && d.timing.totalMinutes >= 0, JSON.stringify(d.timing));
  ctx.check('A9 封→簽段可算 sealToSignMinutes', typeof d.timing?.sealToSignMinutes === 'number', JSON.stringify(d.timing));

  // ══ B. ST 發貨出庫戳 ══
  console.log('\n══ B. ST 發貨出庫戳（DRAFT→TRANSIT） ══');
  const srcWh = await one(
    `SELECT b.warehouse_id AS wh_id, b.part_id, w.code FROM nx03_stock_balance b
     JOIN nx01_warehouse w ON w.id=b.warehouse_id
     WHERE b.tenant_id=$1 AND b.available_qty>5 AND b.warehouse_id<>$2 ORDER BY w.sort_no LIMIT 1`, [T, whA.id]);
  const locOf = async (whId) => (await one(`SELECT id FROM nx01_location WHERE warehouse_id=$1 AND is_active LIMIT 1`, [whId]))?.id;
  if (srcWh && await locOf(srcWh.wh_id) && await locOf(whA.id)) {
    const stRes = await ctx.call('POST', '/nx03/transfer', {
      fromWarehouseId: srcWh.wh_id, toWarehouseId: whA.id, stDate: ctx.today,
      items: [{ partId: srcWh.part_id, fromLocationId: await locOf(srcWh.wh_id), toLocationId: await locOf(whA.id), qty: 1 }],
    });
    ctx.check('B0 建調撥單', stRes.status === 201, JSON.stringify(stRes.data));
    const st = stRes.data; created.sts.push(st.id);
    let sd = (await ctx.call('GET', `/nx03/transfer/${st.id}`)).data;
    ctx.check('B1 發貨前 dispatched_at 為 null', sd.timing?.dispatchedAt == null, JSON.stringify(sd.timing));
    await ctx.call('PATCH', `/nx03/transfer/${st.id}`, { status: 'TRANSIT' });
    sd = (await ctx.call('GET', `/nx03/transfer/${st.id}`)).data;
    ctx.check('B2 TRANSIT 後 dispatched_at 有值（調撥 KPI 起點）', !!sd.timing?.dispatchedAt, JSON.stringify(sd.timing));
  } else {
    console.log('（跳過 B：找不到他倉庫存+庫位）');
  }

  // ══ C. 撿貨中被取消 → 放回待辦 + 隱形撿貨單作廢 ══
  console.log('\n══ C. 撿貨中被取消 → 放回待辦 ══');
  const so2Res = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'P', deliveryAddress: '自取（取消測試）', taxRate: 5, invoiceCopies: 3,
    items: [mk(P1.id, 1)],
  });
  const so2 = so2Res.data; created.sos.push(so2.id);
  await ctx.call('PATCH', `/nx04/so/${so2.id}`, { status: 'CONFIRMED' });
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P1.id });
  const pkBefore = await one(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id=$1`, [so2.id]);
  ctx.check('C0 撿貨後有隱形撿貨單', !!pkBefore?.pk_id, JSON.stringify(pkBefore));

  // 取消
  const cancel = await ctx.call('PATCH', `/nx04/so/${so2.id}`, { status: 'CANCELLED', cancelReason: '計時測試-撿貨中取消' });
  ctx.check('C1 SO 取消成功', cancel.status === 200, JSON.stringify(cancel.data));

  const putback = await one(
    `SELECT title, description, priority, status FROM nx98_task_pool
     WHERE tenant_id=$1 AND source_doc_id=$2 AND category='PUTBACK'`, [T, so2.id]);
  ctx.check('C2 開了 PUTBACK 放回待辦', !!putback, JSON.stringify(putback));
  ctx.check('C3 放回待辦高優先 H + 池中 OPEN', putback?.priority === 'H' && putback?.status === 'OPEN', JSON.stringify(putback));
  ctx.check('C4 標題主打料號×數量+已取消', !!putback?.title && putback.title.includes(P1.code) && putback.title.includes('已取消'), putback?.title ?? '無');
  ctx.check('C4b 內文帶單號+項次（參考）', !!putback?.description && putback.description.includes(so2.docNo) && putback.description.includes('項次'), putback?.description ?? '無');

  const pkAfter = await one(`SELECT status FROM nx03_pk WHERE id=$1`, [pkBefore.pk_id]);
  ctx.check('C5 隱形撿貨單被作廢 V（排出包貨台）', pkAfter?.status === 'V', JSON.stringify(pkAfter));

  const packPool = await ctx.call('GET', '/nx03/pack-pool');
  const inPool = JSON.stringify(packPool.data ?? {}).includes(so2.docNo);
  ctx.check('C6 已取消 SO 不再出現在包貨台', !inPool, `包貨台含此單=${inPool}`);
} finally {
  for (const b of balBaks) await ctx.restoreBalances(b);
  await ctx.db.query(`DELETE FROM nx98_task_pool WHERE tenant_id=$1 AND source_doc_id = ANY($2)`, [ctx.tenant, created.sos]);
  if (created.sos.length) {
    const pkIds = (await ctx.db.query(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id).filter(Boolean);
    if (pkIds.length) {
      const plIds = (await ctx.db.query(
        `SELECT id FROM nx03_pl WHERE pk_id = ANY($1)
         UNION SELECT DISTINCT pl_id FROM nx03_pl_item WHERE pk_item_id IN (SELECT id FROM nx03_pk_item WHERE pk_id = ANY($1))`, [pkIds])).rows.map((r) => r.id);
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
