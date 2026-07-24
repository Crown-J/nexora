// apps/nx-api/test/e2e-scenarios/19-pack-chunk-batch.mjs
// WMS 包貨 Phase B「A」（2026-07-24）：部分撿的多筆分批包——包一筆、另一筆仍在池；一行全包完才推 PL。
// 只能對本機開發 DB 跑；backup/restore 還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('包貨分批包');
const created = { sos: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const customer = (await ctx.actors()).customer;
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w WHERE w.tenant_id=$1 AND w.is_active
     AND EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>5)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const P = await one(
    `SELECT b.part_id AS id FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>5 ORDER BY b.available_qty DESC LIMIT 1`, [T, whA.id]);
  balBaks.push(await ctx.backupBalances(P.id));
  const wsPoolLinesOfSo = async (soId) => {
    const w = (await ctx.call('GET', '/nx03/pack-pool/workspace')).data;
    const g = w.pool.find((s) => s.soId === soId);
    return g ? g.lines : [];
  };
  const lineFs = async (soId) => (await one(`SELECT fulfill_status FROM nx04_so_item WHERE so_id=$1 AND part_id=$2`, [soId, P.id]))?.fulfill_status;

  // ══ 建 qty=2 自取單 + 部分撿成 2 筆 ══
  console.log('\n══ 部分撿成 2 筆 ══');
  const soRes = await ctx.call('POST', '/nx04/so', { customerId: customer.id, warehouseId: whA.id, soDate: ctx.today, deliveryType: 'P', deliveryAddress: '自取', taxRate: 5, invoiceCopies: 3, items: [{ partId: P.id, warehouseId: whA.id, qty: 2, unitPriceSnapshot: 500, transferSourceType: 'S', belowMinReason: '分批包測試' }] });
  const so = soRes.data; created.sos.push(so.id);
  await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P.id, qty: 1 }); // 撿 1
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P.id, qty: 1 }); // 再撿 1 → 2 筆
  const lines0 = await wsPoolLinesOfSo(so.id);
  ctx.check('S1 池顯示 2 筆撿貨明細', lines0.length === 2, `${lines0.length} 筆`);
  ctx.check('S2 撿完行=PK', (await lineFs(so.id)) === 'PK', `fs=${await lineFs(so.id)}`);

  // ══ 包第一筆 → 行仍 PK、另一筆還在池 ══
  console.log('\n══ 包第一筆 ══');
  const cr = await ctx.call('POST', '/nx03/pack-pool/package', { deliveryType: 'P', warehouseId: whA.id, pkItemIds: [lines0[0].pkItemId] });
  ctx.check('B1 建包裹成功', cr.status === 201, JSON.stringify(cr.data));
  const boxId = cr.data.id;
  const lines1 = await wsPoolLinesOfSo(so.id);
  ctx.check('B2 池仍剩 1 筆（另一筆沒消失、bug 修正）', lines1.length === 1 && lines1[0].pkItemId === lines0[1].pkItemId, `${lines1.length} 筆`);
  ctx.check('B3 行仍=PK（沒整行推進）', (await lineFs(so.id)) === 'PK', `fs=${await lineFs(so.id)}`);

  // ══ 包第二筆 → 行全包完 → PL ══
  console.log('\n══ 包第二筆（全包完） ══');
  await ctx.call('POST', '/nx03/pack-pool/box/add', { plId: boxId, pkItemIds: [lines0[1].pkItemId] });
  ctx.check('B4 池空（兩筆都包了）', (await wsPoolLinesOfSo(so.id)).length === 0, '');
  ctx.check('B5 行=PL（全包完才推進）', (await lineFs(so.id)) === 'PL', `fs=${await lineFs(so.id)}`);

  // ══ 移出一筆 → 退回池、行退回 PK ══
  console.log('\n══ 移出一筆 ══');
  await ctx.call('POST', '/nx03/pack-pool/box/remove', { plId: boxId, pkItemId: lines0[1].pkItemId });
  ctx.check('B6 池又有 1 筆', (await wsPoolLinesOfSo(so.id)).length === 1, '');
  ctx.check('B7 行退回 PK', (await lineFs(so.id)) === 'PK', `fs=${await lineFs(so.id)}`);
} finally {
  for (const b of balBaks) await ctx.restoreBalances(b);
  if (created.sos.length) {
    const plIds = (await ctx.db.query(`SELECT DISTINCT pl.id FROM nx03_pl pl JOIN nx03_pl_item pi ON pi.pl_id=pl.id JOIN nx03_pk_item pk ON pk.id=pi.pk_item_id WHERE pk.ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.id);
    if (plIds.length) { await ctx.db.query(`DELETE FROM nx03_pl_item WHERE pl_id = ANY($1)`, [plIds]); await ctx.db.query(`DELETE FROM nx03_parcel WHERE pl_id = ANY($1)`, [plIds]); await ctx.db.query(`DELETE FROM nx03_pl WHERE id = ANY($1)`, [plIds]); }
    const pkIds = (await ctx.db.query(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id).filter(Boolean);
    if (pkIds.length) { await ctx.db.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]); await ctx.db.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]); }
  }
  await ctx.wipeDocs(created);
  console.log(`\n【自清】SO×${created.sos.length}`);
  ctx.summary();
  await ctx.db.end();
}
