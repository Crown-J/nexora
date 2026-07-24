// apps/nx-api/test/e2e-scenarios/_seed-pick-board-demo.mjs
// 一次性：造撿貨三欄看板的測試資料（不自清、給執行長看畫面）。各欄用不同料件、避免撿貨互相牽動。
//   左 待撿貨：2 張單確認、不撿。
//   中 已撿貨：2 張單確認 + 撿完（貨進待包暫存）。
//   右 已取消：2 張單確認 + 撿完 + 取消（貨進待上架）。
// 全部 remark 標「撿貨看板測試」好辨識；看完要清用 _seed-pick-board-clean.mjs。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('撿貨看板測試資料');
try {
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const T = ctx.tenant;
  const wh = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w WHERE w.tenant_id=$1 AND w.is_active
     AND EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>8)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const parts = await many(
    `SELECT b.part_id AS id, p.code FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>8 ORDER BY b.available_qty DESC LIMIT 6`, [T, wh.id]);
  const custs = await many(
    `SELECT id, name FROM nx01_partner WHERE tenant_id=$1 AND partner_type='C' AND is_active
     AND (credit_status IS NULL OR credit_status <> 'F') ORDER BY code LIMIT 3`, [T]);
  if (parts.length < 6 || custs.length < 2) { console.log('資料不足（需 6 料件 + 2 客戶）'); await ctx.db.end(); process.exit(0); }
  const [P0, P1, P2, P3, P4, P5] = parts;
  const [C0, C1, C2] = [custs[0], custs[1], custs[2] ?? custs[0]];

  const line = (part, qty) => ({ partId: part.id, warehouseId: wh.id, qty, unitPriceSnapshot: 500, transferSourceType: 'S', belowMinReason: '看板測試' });
  const mkSo = async (cust, items, remark) => {
    const r = await ctx.call('POST', '/nx04/so', {
      customerId: cust.id, warehouseId: wh.id, soDate: ctx.today, deliveryType: 'P',
      deliveryAddress: '自取', taxRate: 5, invoiceCopies: 3, remark, items,
    });
    if (r.status !== 201) throw new Error('建單失敗 ' + JSON.stringify(r.data));
    await ctx.call('PATCH', `/nx04/so/${r.data.id}`, { status: 'CONFIRMED' });
    return r.data;
  };
  const pick = (part) => ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: wh.id, partId: part.id });
  const RM = '撿貨看板測試';

  // ── 左 待撿貨（確認、不撿） ──
  await mkSo(C0, [line(P0, 2), line(P1, 1)], `${RM}-待撿`);
  await mkSo(C1, [line(P0, 1)], `${RM}-待撿`);
  console.log('✅ 左 待撿貨：2 張單（料件 P0/P1）');

  // ── 中 已撿貨（確認 + 撿完、貨進待包暫存） ──
  await mkSo(C0, [line(P2, 2), line(P3, 1)], `${RM}-已撿`);
  await mkSo(C1, [line(P2, 1)], `${RM}-已撿`);
  await pick(P2); await pick(P3);
  console.log('✅ 中 已撿貨：2 張單撿完（料件 P2/P3 → 待包暫存）');

  // ── 右 已取消（確認 + 撿完 + 取消、貨進待上架） ──
  const r1 = await mkSo(C2, [line(P4, 2)], `${RM}-取消`);
  const r2 = await mkSo(C0, [line(P5, 1)], `${RM}-取消`);
  await pick(P4); await pick(P5);
  await ctx.call('PATCH', `/nx04/so/${r1.id}`, { status: 'CANCELLED', cancelReason: `${RM}-撿後取消` });
  await ctx.call('PATCH', `/nx04/so/${r2.id}`, { status: 'CANCELLED', cancelReason: `${RM}-撿後取消` });
  console.log('✅ 右 已取消：2 張單撿後取消（料件 P4/P5 → 待上架）');

  // 對帳確認沒破壞恆等式
  const bad = await many(
    `SELECT sb.part_id FROM nx03_stock_balance sb
     LEFT JOIN nx03_stock_location_balance lb ON lb.tenant_id=sb.tenant_id AND lb.part_id=sb.part_id AND lb.warehouse_id=sb.warehouse_id
     WHERE sb.tenant_id=$1 AND sb.warehouse_id=$2 AND sb.part_id = ANY($3)
     GROUP BY sb.part_id, sb.on_hand_qty HAVING sb.on_hand_qty <> COALESCE(SUM(lb.on_hand_qty),0)`,
    [T, wh.id, parts.map((p) => p.id)]);
  console.log(`\n對帳：涉及料件恆等式不一致 ${bad.length} 筆（應 0）`);
  console.log('登入 Y0001 / TW-100001 → 庫存 → 撿包送 → 撿貨，三欄都有料看了。');
} finally {
  await ctx.db.end();
}
