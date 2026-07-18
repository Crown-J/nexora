// apps/nx-api/test/e2e-scenarios/12-peer-ti-chain.mjs
// 同行調貨 G 鏈（PEER-G 2026-07-19）：詢價紀錄 → SO 含 G 行 → 確認（G 行不被自倉調撥掃炸 ⭐修）
// → create-ti 自動開調貨單（成本帶詢價紀錄+回鏈）→ SO 行轉補貨中綁 TI。
// 模擬即時銷售站 4 的同行分配送出（含逃生門等價路徑：先記詢價再開單）。只能對本機開發 DB 跑；自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('同行調貨G鏈');
const created = { sos: [], tis: [] };
const inqIds = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const A = await ctx.actors();
  const customer = A.customer;
  const peer = A.peer;
  if (!peer) throw new Error('租戶無同行 O、無法跑本情境');

  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w
     WHERE w.tenant_id=$1 AND w.is_active AND EXISTS
       (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>20)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const P1 = await one(
    `SELECT b.part_id AS id, p.code FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>20
     ORDER BY b.available_qty DESC LIMIT 1`, [T, whA.id]);
  // 死料：全倉皆無庫存（同行調貨的真實情境；也逼出「G 行被自倉調撥掃炸」的舊 bug）
  const dead = await one(
    `SELECT p.id, p.code FROM nx01_part p
     WHERE p.tenant_id=$1 AND p.is_active
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.part_id=p.id AND b.available_qty>0)
     LIMIT 1`, [T]);
  console.log(`客戶 ${customer.code}／同行 ${peer.code}／A倉 ${whA.code}／現貨料 ${P1.code}／死料 ${dead.code}`);

  // ══ 1. 站3 詢價（或站4 逃生門「現場填價」——兩者等價：先記詢價紀錄） ══
  console.log('\n══ 1. 詢價紀錄（同行 × 死料 × 70） ══');
  const inq = await ctx.call('POST', '/nx04/inquiry-record', {
    sourcePartnerId: peer.id, partId: dead.id, qty: 2, unitPrice: 70, remark: '同行G鏈測試',
  });
  ctx.check('1a 詢價紀錄建立', inq.status === 201, JSON.stringify(inq.data));
  if (inq.data?.id) inqIds.push(inq.data.id);

  // ══ 2. SO：現貨行 + 同行 G 行 → 確認 ══
  console.log('\n══ 2. SO 含 G 行 → 確認（⭐G 行不被自倉調撥掃炸） ══');
  const soRes = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'P', deliveryAddress: '客戶自取（同行G測試）', taxRate: 5, invoiceCopies: 3,
    items: [
      { partId: P1.id, warehouseId: whA.id, qty: 1, unitPriceSnapshot: 999, transferSourceType: 'S', belowMinReason: '測試' },
      { partId: dead.id, warehouseId: whA.id, qty: 2, unitPriceSnapshot: 120, transferSourceType: 'G', belowMinReason: '測試' },
    ],
  });
  ctx.check('2a 建單', soRes.status === 201, JSON.stringify(soRes.data));
  const so = soRes.data;
  created.sos.push(so.id);
  const conf = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  ctx.check('2b ⭐確認成功（修前：G 行全倉無貨會被自倉調撥掃到直接 500）', conf.status === 200,
    JSON.stringify(conf.data));
  const gLine = await one(
    `SELECT id, transfer_source_type, transfer_status, ti_id, st_id FROM nx04_so_item
     WHERE so_id=$1 AND part_id=$2`, [so.id, dead.id]);
  ctx.check('2c G 行保持 G/P 待補、未被誤開 ST', gLine?.transfer_source_type === 'G' && gLine?.transfer_status === 'P' && !gLine?.st_id,
    JSON.stringify(gLine));

  // ══ 3. create-ti：自動開調貨單（即時銷售送出時做的事） ══
  console.log('\n══ 3. create-ti（成本自動帶詢價紀錄+回鏈） ══');
  const tiRes = await ctx.call('POST', `/nx04/so/${so.id}/create-ti`, {
    partnerId: peer.id, soItemIds: [gLine.id], remark: '即時銷售自動開單',
  });
  ctx.check('3a 調貨單建立', tiRes.status === 201, JSON.stringify(tiRes.data));
  if (tiRes.data?.tiId) created.tis.push(tiRes.data.tiId);
  const tiItem = await one(
    `SELECT i.unit_cost, i.source_inquiry_record_id, i.source_so_item_id, t.partner_id, t.status
     FROM nx02_ti_item i JOIN nx02_ti t ON t.id=i.ti_id WHERE i.ti_id=$1`, [tiRes.data?.tiId]);
  ctx.check('3b 成本=70（詢價紀錄自動帶）', Number(tiItem?.unit_cost) === 70, JSON.stringify(tiItem));
  ctx.check('3c 回鏈：詢價紀錄+SO行+同行對象', tiItem?.source_inquiry_record_id === inqIds[0] &&
    tiItem?.source_so_item_id === gLine.id && tiItem?.partner_id === peer.id, JSON.stringify(tiItem));
  const gAfter = await one(
    `SELECT transfer_status, ti_id FROM nx04_so_item WHERE id=$1`, [gLine.id]);
  ctx.check('3d SO 行轉補貨中 I + 綁 TI', gAfter?.transfer_status === 'I' && gAfter?.ti_id === tiRes.data?.tiId,
    JSON.stringify(gAfter));
} finally {
  await ctx.wipeDocs(created);
  if (inqIds.length) await ctx.db.query(`DELETE FROM nx04_inquiry_record WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, inqIds]);
  console.log(`\n【自清】SO×${created.sos.length}、TI×${created.tis.length}、詢價紀錄×${inqIds.length}`);
  ctx.summary();
  await ctx.db.end();
}
