// apps/nx-api/test/e2e-scenarios/16-wms-bin-invariant.mjs
// WMS 庫位級庫存 P1 恆等式驗證（2026-07-23）：進出同步維護庫位餘額後，
//   「某料某倉 Σ(庫位 onHand) ＝ 該倉 nx03_stock_balance.on_hand_qty」在真實移動前後都成立。
// 移動用調撥（源倉→A倉）DRAFT→TRANSIT→RECEIVED：源倉 applyQtyOut、A倉 applyQtyIn 各走一次。
// 只能對本機開發 DB 跑；庫存 backup/restore（含庫位餘額）還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('WMS庫位恆等式');
const created = { sts: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const locOf = async (whId) => (await one(`SELECT id FROM nx01_location WHERE warehouse_id=$1 AND is_active AND location_type='S' LIMIT 1`, [whId]))?.id
    ?? (await one(`SELECT id FROM nx01_location WHERE warehouse_id=$1 AND is_active LIMIT 1`, [whId]))?.id;

  // 目標 A 倉 + 源倉（有同一料件庫存）
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w WHERE w.tenant_id=$1 AND w.is_active
     AND EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>5)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const src = await one(
    `SELECT b.part_id, b.warehouse_id AS wh_id, w.code FROM nx03_stock_balance b
     JOIN nx01_warehouse w ON w.id=b.warehouse_id
     WHERE b.tenant_id=$1 AND b.available_qty>5 AND b.warehouse_id<>$2 ORDER BY w.sort_no LIMIT 1`, [T, whA.id]);
  if (!src) { console.log('（跳過：找不到他倉庫存）'); ctx.summary(); await ctx.db.end(); process.exit(0); }
  const P = src.part_id;
  balBaks.push(await ctx.backupBalances(P));

  const sumBins = async (wh) => Number((await one(
    `SELECT COALESCE(SUM(on_hand_qty),0) AS s FROM nx03_stock_location_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3`, [T, P, wh])).s);
  const whQty = async (wh) => Number((await one(
    `SELECT COALESCE(on_hand_qty,0) AS q FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3`, [T, P, wh]))?.q ?? 0);
  const checkInvariant = async (label) => {
    const [sSrc, wSrc, sA, wA] = [await sumBins(src.wh_id), await whQty(src.wh_id), await sumBins(whA.id), await whQty(whA.id)];
    ctx.check(`${label} 源倉 Σ庫位=倉庫（${sSrc}=${wSrc}）`, sSrc === wSrc, `Σ${sSrc} vs 倉${wSrc}`);
    ctx.check(`${label} A倉 Σ庫位=倉庫（${sA}=${wA}）`, sA === wA, `Σ${sA} vs 倉${wA}`);
  };

  console.log('\n══ 移動前基線 ══');
  await checkInvariant('基線');

  console.log('\n══ 調撥 源→A（TRANSIT→RECEIVED、各走一次進/出） ══');
  const stRes = await ctx.call('POST', '/nx03/transfer', {
    fromWarehouseId: src.wh_id, toWarehouseId: whA.id, stDate: ctx.today,
    items: [{ partId: P, fromLocationId: await locOf(src.wh_id), toLocationId: await locOf(whA.id), qty: 3 }],
  });
  ctx.check('建調撥單', stRes.status === 201, JSON.stringify(stRes.data));
  const st = stRes.data; created.sts.push(st.id);
  await ctx.call('PATCH', `/nx03/transfer/${st.id}`, { status: 'TRANSIT' });
  const recv = await ctx.call('PATCH', `/nx03/transfer/${st.id}`, { status: 'RECEIVED' });
  ctx.check('收貨過帳（源-3、A+3）', recv.status === 200, JSON.stringify(recv.data));

  console.log('\n══ 移動後恆等式（P1 有同步維護庫位餘額才會成立） ══');
  await checkInvariant('移動後');
} finally {
  for (const b of balBaks) await ctx.restoreBalances(b);
  await ctx.wipeDocs(created);
  console.log(`\n【自清】ST×${created.sts.length}、庫存快照還原×${balBaks.length}`);
  ctx.summary();
  await ctx.db.end();
}
