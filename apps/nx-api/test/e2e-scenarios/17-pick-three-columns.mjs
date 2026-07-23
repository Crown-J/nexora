// apps/nx-api/test/e2e-scenarios/17-pick-three-columns.mjs
// WMS P2-3 撿貨三欄後端（2026-07-23）：中欄「已撿貨」/右欄「已取消」清單 + 取消撿貨/已放回。
//   A. 撿貨 → 進中欄；取消撿貨 → 離中欄、回左待撿、待包 K→原儲位、恆等式成立。
//   B. 撿貨 → 訂單取消 → 進右欄（貨在待上架 B）；已放回 → 離右欄、B→原儲位、恆等式成立。
// 只能對本機開發 DB 跑；backup/restore（含庫位餘額）還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('撿貨三欄後端');
const created = { sos: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const customer = (await ctx.actors()).customer;
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w WHERE w.tenant_id=$1 AND w.is_active
     AND EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>10)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const P = await one(
    `SELECT b.part_id AS id, p.code FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>10 ORDER BY b.available_qty DESC LIMIT 1`, [T, whA.id]);
  balBaks.push(await ctx.backupBalances(P.id));
  const mk = (qty) => ({ partId: P.id, warehouseId: whA.id, qty, unitPriceSnapshot: 999, transferSourceType: 'S', belowMinReason: '三欄測試' });
  const mkSo = async () => {
    const r = await ctx.call('POST', '/nx04/so', { customerId: customer.id, warehouseId: whA.id, soDate: ctx.today, deliveryType: 'P', deliveryAddress: '自取', taxRate: 5, invoiceCopies: 3, items: [mk(2)] });
    created.sos.push(r.data.id); await ctx.call('PATCH', `/nx04/so/${r.data.id}`, { status: 'CONFIRMED' }); return r.data;
  };
  const inList = async (path, docNo) => JSON.stringify((await ctx.call('GET', path)).data ?? {}).includes(docNo);
  const inv = async () => Number((await one(
    `SELECT (SELECT COALESCE(SUM(on_hand_qty),0) FROM nx03_stock_location_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3)
          - (SELECT COALESCE(on_hand_qty,0) FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3) AS d`, [T, P.id, whA.id])).d);
  const binQty = async (type) => Number((await one(
    `SELECT COALESCE(SUM(lb.on_hand_qty),0) AS q FROM nx03_stock_location_balance lb
     JOIN nx01_location l ON l.id=lb.location_id AND l.location_type=$4
     WHERE lb.tenant_id=$1 AND lb.part_id=$2 AND lb.warehouse_id=$3`, [T, P.id, whA.id, type])).q);

  // ══ A. 撿貨→中欄；取消撿貨→回左待撿 ══
  console.log('\n══ A. 中欄「已撿貨」+ 取消撿貨 ══');
  const so = await mkSo();
  const kBefore = await binQty('K');
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P.id });
  const lineFs = async (soId) => (await one(`SELECT fulfill_status FROM nx04_so_item WHERE so_id=$1 AND part_id=$2`, [soId, P.id]))?.fulfill_status;
  ctx.check('A1 撿貨後在中欄「已撿貨」', await inList('/nx03/pick-pool/picked', so.docNo), '中欄應含');
  ctx.check('A2 撿貨後行=PK（離開左欄待撿）', (await lineFs(so.id)) === 'PK', `fs=${await lineFs(so.id)}`);
  ctx.check('A3 撿貨後待包 K +2', (await binQty('K')) - kBefore === 2, `K ${kBefore}→${await binQty('K')}`);
  const cp = await ctx.call('POST', '/nx03/pick-pool/cancel-pick', { soId: so.id, partId: P.id, warehouseId: whA.id });
  ctx.check('A4 取消撿貨成功', cp.status === 201 && cp.data?.cancelled >= 1, JSON.stringify(cp.data));
  ctx.check('A5 取消後離開中欄', !(await inList('/nx03/pick-pool/picked', so.docNo)), '中欄不應含');
  ctx.check('A6 取消後行回 W（回左欄待撿）', (await lineFs(so.id)) === 'W', `fs=${await lineFs(so.id)}`);
  ctx.check('A7 待包 K 歸零（貨回原儲位）', (await binQty('K')) === kBefore, `K=${await binQty('K')}`);
  ctx.check('A8 恆等式成立', (await inv()) === 0, `差 ${await inv()}`);

  // ══ B. 撿貨→訂單取消→右欄；已放回 ══
  console.log('\n══ B. 右欄「已取消」+ 已放回 ══');
  const so2 = await mkSo();
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P.id });
  const bBefore = await binQty('B');
  await ctx.call('PATCH', `/nx04/so/${so2.id}`, { status: 'CANCELLED', cancelReason: '三欄測試取消' });
  ctx.check('B1 取消後在右欄「已取消」', await inList('/nx03/pick-pool/cancelled', so2.docNo), '右欄應含');
  ctx.check('B2 不在中欄', !(await inList('/nx03/pick-pool/picked', so2.docNo)), '中欄不應含');
  ctx.check('B3 貨在待上架 B +2', (await binQty('B')) - bBefore === 2, `B ${bBefore}→${await binQty('B')}`);
  const pb = await ctx.call('POST', '/nx03/pick-pool/put-back', { soId: so2.id, partId: P.id, warehouseId: whA.id });
  ctx.check('B4 已放回成功', pb.status === 201 && pb.data?.putBack >= 1, JSON.stringify(pb.data));
  ctx.check('B5 放回後離開右欄', !(await inList('/nx03/pick-pool/cancelled', so2.docNo)), '右欄不應含');
  ctx.check('B6 待上架 B 歸零（貨回原儲位）', (await binQty('B')) === bBefore, `B=${await binQty('B')}`);
  ctx.check('B7 恆等式成立', (await inv()) === 0, `差 ${await inv()}`);
} finally {
  for (const b of balBaks) await ctx.restoreBalances(b);
  if (created.sos.length) {
    const pkIds = (await ctx.db.query(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id).filter(Boolean);
    if (pkIds.length) { await ctx.db.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]); await ctx.db.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]); }
  }
  await ctx.wipeDocs(created);
  console.log(`\n【自清】SO×${created.sos.length}、庫存快照還原×${balBaks.length}`);
  ctx.summary();
  await ctx.db.end();
}
