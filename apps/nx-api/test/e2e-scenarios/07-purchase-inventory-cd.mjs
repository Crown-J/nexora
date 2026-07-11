// apps/nx-api/test/e2e-scenarios/07-purchase-inventory-cd.mjs
// C/D 組回歸：採購入庫過帳、進退（B 壞品 + W 保固自動建＝0711-S bug 修回歸）、
// LITE 調撥（Plan Guard 拆除回歸）、異常回報→一鍵報廢→過帳→IR 自動結案（W5 鏈）
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('07-purchase-inventory-cd');
const { call, check, db } = ctx;
const ids = { pos: [], rrs: [], prs: [], sts: [], irs: [], disposals: [] };
let bak = null;
try {
  const a = await ctx.actors();
  if (!a.stockPart) throw new Error('第一倉找不到足量庫存靶料、環境不符前置');
  const PART = a.stockPart.part_id;
  bak = await ctx.backupBalances(PART);

  // C3 PO → to-rr → RR 過帳（+4）
  const po = await call('POST', '/nx02/po', {
    poDate: ctx.today, supplierId: a.supplier.id, remark: 'E2E-CD-TEMP',
    items: [{ partId: PART, qty: 4, unitPriceSnapshot: 40 }],
  });
  if (po.data?.id) ids.pos.push(po.data.id);
  for (const st of ['PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'CONFIRMED']) {
    await call('PATCH', `/nx02/po/${po.data?.id}`, { status: st });
  }
  const poGet = await call('GET', `/nx02/po/${po.data?.id}`);
  const poItemId = (poGet.data?.items ?? [])[0]?.id;
  const toRr = await call('POST', `/nx02/po/${po.data?.id}/to-rr`, {
    warehouseId: a.wh1.id, items: [{ poItemId, qty: 4, locationId: a.wh1.locId }],
  });
  check('C3a PO 轉進貨', (toRr.status === 201 || toRr.status === 200) && !!toRr.data?.id, JSON.stringify(toRr.data?.message ?? ''));
  if (toRr.data?.id) ids.rrs.push(toRr.data.id);
  const rrGet = await call('GET', `/nx02/rr/${toRr.data?.id}`);
  const rrItemId = (rrGet.data?.items ?? [])[0]?.id;
  check('C3b RR 承接明細', (rrGet.data?.items ?? []).length === 1 && Number(rrGet.data?.items?.[0]?.qty) === 4);
  for (const st of ['INSPECTING', 'POSTED']) {
    const r = await call('PATCH', `/nx02/rr/${toRr.data?.id}`, { status: st });
    check(`C3c RR ${st}`, r.status === 200, JSON.stringify(r.data?.message ?? ''));
  }

  // C4 進退：B 壞品退 + W 保固退（自動建保固單＝bug 修回歸重點）
  async function makePr(flag) {
    const pr = await call('POST', '/nx02/purchase-return', {
      prDate: ctx.today, warehouseId: a.wh1.id, supplierId: a.supplier.id, rrId: toRr.data?.id, taxRate: 5,
      dispositionFlag: flag, remark: 'E2E-CD-TEMP',
      items: [{ rrItemId, partId: PART, qty: 1, unitPriceSnapshot: 40, locationId: a.wh1.locId }],
    });
    if (pr.data?.id) ids.prs.push(pr.data.id);
    const post = await call('PATCH', `/nx02/purchase-return/${pr.data?.id}`, { status: 'POSTED' });
    return { pr, post };
  }
  const b = await makePr('B');
  check('C4a 壞品退（B）過帳', b.post.status === 200, JSON.stringify(b.post.data?.message ?? ''));
  const w = await makePr('W');
  check('C4b 保固退（W）過帳', w.post.status === 200, JSON.stringify(w.post.data?.message ?? ''));
  const wc = await db.query(
    `SELECT id, claim_type, status FROM nx02_warranty_claim WHERE tenant_id=$1 AND source_pr_id=$2`,
    [ctx.tenant, w.pr.data?.id]);
  check('C4c ⭐ W 過帳自動建保固單（0711-S bug 修回歸）',
    wc.rows.length === 1 && wc.rows[0].claim_type === 'SELF' && wc.rows[0].status === 'D', JSON.stringify(wc.rows));

  // D1 LITE 調撥（Plan Guard 拆除回歸）
  const st1 = await call('POST', '/nx03/transfer', {
    fromWarehouseId: a.wh1.id, toWarehouseId: a.wh2.id, stDate: ctx.today, remark: 'E2E-CD-TEMP',
    items: [{ partId: PART, fromLocationId: a.wh1.locId, toLocationId: a.wh2.locId, qty: 2 }],
  });
  check('D1a ⭐ LITE 可建調撥（版本閘門拆除回歸）', (st1.status === 201 || st1.status === 200) && !!st1.data?.id,
    JSON.stringify(st1.data?.message ?? ''));
  if (st1.data?.id) ids.sts.push(st1.data.id);
  for (const s of ['TRANSIT', 'RECEIVED']) {
    const r = await call('PATCH', `/nx03/transfer/${st1.data?.id}`, { status: s });
    check(`D1b 調撥 ${s}`, r.status === 200, JSON.stringify(r.data?.message ?? ''));
  }

  // D2 異常鏈（W5 全軌）
  const ir = await call('POST', '/nx03/issue-report', {
    reportDate: ctx.today, warehouseId: a.wh1.id, partId: PART, qty: 1, issueType: 'D', description: 'E2E-CD-TEMP',
  });
  if (ir.data?.id) ids.irs.push(ir.data.id);
  await call('POST', `/nx03/issue-report/${ir.data?.id}/report`);
  const disp = await call('POST', `/nx03/issue-report/${ir.data?.id}/dispose`, { dispositionType: 'D', autoCreate: true });
  const disposalId = disp.data?.relatedDocId;
  check('D2a 一鍵開報廢單', (disp.status === 200 || disp.status === 201) && !!disposalId, JSON.stringify(disp.data?.message ?? ''));
  if (disposalId) ids.disposals.push(disposalId);
  const dPost = await call('PATCH', `/nx03/disposal/${disposalId}`, { status: 'POSTED' });
  check('D2b 報廢過帳', dPost.status === 200, JSON.stringify(dPost.data?.message ?? ''));
  const irGet = await call('GET', `/nx03/issue-report/${ir.data?.id}`);
  check('D2c IR 自動結案（W5 鏈）', irGet.data?.status === 'CLOSED', JSON.stringify(irGet.data?.status));
} finally {
  await ctx.wipeDocs(ids);
  if (bak) await ctx.restoreBalances(bak);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
