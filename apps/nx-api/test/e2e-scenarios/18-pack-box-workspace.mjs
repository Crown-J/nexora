// apps/nx-api/test/e2e-scenarios/18-pack-box-workspace.mjs
// WMS 包貨兩區（2026-07-24）：左已撿貨池 → 右三區建箱、加貨/移出/封箱、混客戶旗標、出貨方式不符擋。
// 只能對本機開發 DB 跑；backup/restore（含庫位餘額）還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('包貨建箱工作區');
const created = { sos: [] };
const balBaks = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w WHERE w.tenant_id=$1 AND w.is_active
     AND EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>5)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const parts = await many(
    `SELECT b.part_id AS id FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>5 ORDER BY b.available_qty DESC LIMIT 3`, [T, whA.id]);
  const custs = await many(
    `SELECT id, name FROM nx01_partner WHERE tenant_id=$1 AND partner_type='C' AND is_active
     AND (credit_status IS NULL OR credit_status <> 'F') ORDER BY code LIMIT 2`, [T]);
  const [P0, P1, P2] = parts; const [C0, C1] = custs;
  for (const p of parts) balBaks.push(await ctx.backupBalances(p.id));
  const mk = (part, qty) => ({ partId: part.id, warehouseId: whA.id, qty, unitPriceSnapshot: 500, transferSourceType: 'S', belowMinReason: '建箱測試' });
  const mkSo = async (cust, part, deliveryType) => {
    const r = await ctx.call('POST', '/nx04/so', { customerId: cust.id, warehouseId: whA.id, soDate: ctx.today, deliveryType, deliveryAddress: deliveryType === 'D' ? '送貨地址' : '自取', taxRate: 5, invoiceCopies: 3, items: [mk(part, 1)] });
    created.sos.push(r.data.id); await ctx.call('PATCH', `/nx04/so/${r.data.id}`, { status: 'CONFIRMED' }); return r.data;
  };
  const ws = async () => (await ctx.call('GET', '/nx03/pack-pool/workspace')).data;
  const poolHas = (w, soId) => w.pool.some((g) => g.soId === soId);
  const pkItemsOfSo = async (soId) => (await many(`SELECT id FROM nx03_pk_item WHERE ref_so_id=$1 AND status='C'`, [soId])).map((r) => r.id);

  // ══ A. 兩張自取單撿完 → 進已撿池 ══
  console.log('\n══ A. 已撿貨池 ══');
  const soP1 = await mkSo(C0, P0, 'P');
  const soP2 = await mkSo(C1, P1, 'P');
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P0.id });
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P1.id });
  let w = await ws();
  ctx.check('A1 左池有我的 2 張單', poolHas(w, soP1.id) && poolHas(w, soP2.id), JSON.stringify(w.pool.map(g=>g.soDocNo)));
  ctx.check('A2 右三區皆空箱 0', w.boxes.P.length === 0 && w.boxes.C.length === 0 && w.boxes.D.length === 0, JSON.stringify(Object.keys(w.boxes).map((k) => w.boxes[k].length)));

  // ══ B. 建自取箱 + 加第一張單整批 ══
  console.log('\n══ B. 建箱 + 加貨 ══');
  w = (await ctx.call('POST', '/nx03/pack-pool/box', { deliveryType: 'P', warehouseId: whA.id })).data;
  ctx.check('B1 自取區多一空箱', w.boxes.P.length === 1 && w.boxes.P[0].lineCount === 0, JSON.stringify(w.boxes.P));
  const boxId = w.boxes.P[0].plId;
  const add1 = await ctx.call('POST', '/nx03/pack-pool/box/add', { plId: boxId, pkItemIds: await pkItemsOfSo(soP1.id) });
  w = add1.data;
  ctx.check('B2 加貨後箱有 1 項', w.boxes.P[0].lineCount === 1, JSON.stringify(w.boxes.P[0]));
  ctx.check('B3 soP1 離池、soP2 還在', !poolHas(w, soP1.id) && poolHas(w, soP2.id), 'soP1在?'+poolHas(w,soP1.id));
  ctx.check('B4 箱非混客戶', w.boxes.P[0].mixedCustomer === false, JSON.stringify(w.boxes.P[0]));

  // ══ C. 加第二張單 → 混客戶旗標 ══
  console.log('\n══ C. 混客戶旗標 ══');
  w = (await ctx.call('POST', '/nx03/pack-pool/box/add', { plId: boxId, pkItemIds: await pkItemsOfSo(soP2.id) })).data;
  ctx.check('C1 箱有 2 項', w.boxes.P[0].lineCount === 2, JSON.stringify(w.boxes.P[0]));
  ctx.check('C2 混客戶旗標=true（跳提示用）', w.boxes.P[0].mixedCustomer === true && w.boxes.P[0].customerCount === 2, JSON.stringify(w.boxes.P[0]));
  ctx.check('C3 兩張都離池', !poolHas(w, soP1.id) && !poolHas(w, soP2.id), 'soP1='+poolHas(w,soP1.id)+' soP2='+poolHas(w,soP2.id));

  // ══ D. 移出一筆 → 退回池 ══
  console.log('\n══ D. 移出退回池 ══');
  const pk1 = (await pkItemsOfSo(soP1.id))[0];
  w = (await ctx.call('POST', '/nx03/pack-pool/box/remove', { plId: boxId, pkItemId: pk1 })).data;
  ctx.check('D1 箱剩 1 項', w.boxes.P[0].lineCount === 1, JSON.stringify(w.boxes.P[0]));
  ctx.check('D2 soP1 退回左池', poolHas(w, soP1.id), 'soP1在?'+poolHas(w,soP1.id));

  // ══ E. 出貨方式不符擋 ══
  console.log('\n══ E. 出貨方式不符擋 ══');
  const soD = await mkSo(C0, P2, 'D');
  await ctx.call('POST', '/nx03/pick-pool/pick', { warehouseId: whA.id, partId: P2.id });
  const badAdd = await ctx.call('POST', '/nx03/pack-pool/box/add', { plId: boxId, pkItemIds: await pkItemsOfSo(soD.id) });
  ctx.check('E1 配送貨加不進自取箱（400）', badAdd.status === 400, `status ${badAdd.status}`);

  // ══ F. 封箱 → SO SHIPPED ══
  console.log('\n══ F. 封箱 ══');
  const seal = await ctx.call('POST', '/nx03/pack-pool/seal', { plId: boxId });
  ctx.check('F1 封箱成功', seal.status === 201, JSON.stringify(seal.data));
  const soStat = await one(`SELECT status FROM nx04_so WHERE id=$1`, [soP2.id]);
  ctx.check('F2 箱內 SO → SHIPPED', soStat?.status === 'SHIPPED', JSON.stringify(soStat));
} finally {
  for (const b of balBaks) await ctx.restoreBalances(b);
  if (created.sos.length) {
    const plIds = (await ctx.db.query(`SELECT id FROM nx03_pl WHERE tenant_id=$1 AND id IN (SELECT DISTINCT pl_id FROM nx03_pl_item pi JOIN nx03_pk_item pk ON pk.id=pi.pk_item_id WHERE pk.ref_so_id = ANY($2))`, [ctx.tenant, created.sos])).rows.map((r) => r.id);
    if (plIds.length) { await ctx.db.query(`DELETE FROM nx03_pl_item WHERE pl_id = ANY($1)`, [plIds]); await ctx.db.query(`DELETE FROM nx03_parcel WHERE pl_id = ANY($1)`, [plIds]); await ctx.db.query(`DELETE FROM nx03_pl WHERE id = ANY($1)`, [plIds]); }
    const pkIds = (await ctx.db.query(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [created.sos])).rows.map((r) => r.pk_id).filter(Boolean);
    if (pkIds.length) { await ctx.db.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]); await ctx.db.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]); }
  }
  await ctx.wipeDocs(created);
  console.log(`\n【自清】SO×${created.sos.length}、庫存快照還原×${balBaks.length}`);
  ctx.summary();
  await ctx.db.end();
}
