// apps/nx-api/test/e2e-scenarios/08-finance-flow-e.mjs
// E 組財務流回歸：出貨→AR→收款沖帳、銷退全循環（好壞品閘+自動折讓）、
// AP 分段沖銷（PARTIAL→PAID）、月關帳期間鎖/解鎖
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('08-finance-flow-e');
const { call, check, db } = ctx;
const ids = { sos: [], srs: [], pos: [], aps: [], ars: [], paylogs: [], closings: [] };
let bak = null;
try {
  const a = await ctx.actors();
  if (!a.stockPart) throw new Error('第一倉找不到足量庫存靶料、環境不符前置');
  const PART = a.stockPart.part_id;
  bak = await ctx.backupBalances(PART);

  // E1 出貨 → AR → 收款
  const so = await call('POST', '/nx04/so', {
    customerId: a.customer.id, soDate: ctx.today, deliveryType: 'D', warehouseId: a.wh1.id, taxRate: 5, remark: 'E2E-E-TEMP',
  });
  if (so.data?.id) ids.sos.push(so.data.id);
  const it = await call('POST', `/nx04/so/${so.data?.id}/items`, {
    partId: PART, warehouseId: a.wh1.id, qty: 2, unitPriceSnapshot: 100,
  });
  check('E1a 加明細（庫存足 → 補貨完成 C）', it.data?.transferStatus === 'C', JSON.stringify(it.data?.message ?? ''));
  for (const st of ['CONFIRMED', 'PICKING', 'SHIPPED']) {
    const r = await call('PATCH', `/nx04/so/${so.data?.id}`, { status: st });
    check(`E1b SO ${st}`, r.status === 200, JSON.stringify(r.data?.message ?? ''));
  }
  const arList = await call('GET', '/nx05/ar?page=1&pageSize=100');
  const ar = (arList.data?.rows ?? []).find((r) => r.soId === so.data?.id);
  check('E1c 出貨自動 AR（210 含稅）', !!ar && Math.abs(Number(ar.originalAmount) - 210) < 0.01, JSON.stringify(ar?.originalAmount));
  if (ar) ids.ars.push(ar.id);

  const rc = await call('POST', '/nx05/receipt', { payDate: ctx.today, arId: ar?.id, amount: 210, remark: 'E2E-E-TEMP' });
  if (rc.data?.id) ids.paylogs.push(rc.data.id);
  const rcPost = await call('PATCH', `/nx05/receipt/${rc.data?.id}`, { status: 'POSTED' });
  check('E1d 收款過帳', rcPost.status === 200 && rcPost.data?.status === 'POSTED');
  const ar2 = ((await call('GET', '/nx05/ar?page=1&pageSize=100')).data?.rows ?? []).find((r) => r.id === ar?.id);
  check('E1e AR 沖到清（PAID/balance 0）', Number(ar2?.balanceAmount) === 0 && ar2?.status === 'PAID');

  // 銷退全循環（好壞品閘 → 過帳 → 自動折讓）
  const sr = await call('POST', '/nx04/sales-return', {
    soId: so.data?.id, srDate: ctx.today, returnMethod: 'S', taxRate: 5, remark: 'E2E-E-TEMP',
    items: [{ soItemId: it.data?.id, qty: 1, returnReason: 'C' }],
  });
  if (sr.data?.id) ids.srs.push(sr.data.id);
  await call('PATCH', `/nx04/sales-return/${sr.data?.id}`, { status: 'INSPECTING' });
  const blocked = await call('PATCH', `/nx04/sales-return/${sr.data?.id}`, { status: 'POSTED' });
  check('SR1 未標好壞品被正確擋', blocked.status === 400, JSON.stringify(blocked.data?.message ?? ''));
  const srItems = (await call('GET', `/nx04/sales-return/${sr.data?.id}`)).data?.items ?? [];
  await call('PATCH', `/nx04/sales-return/${sr.data?.id}/items/${srItems[0]?.id}`, { dispositionFlag: 'G' });
  const srPost = await call('PATCH', `/nx04/sales-return/${sr.data?.id}`, { status: 'POSTED' });
  check('SR2 標好品後過帳', srPost.status === 200 && srPost.data?.status === 'POSTED', JSON.stringify(srPost.data?.message ?? ''));
  const alw = await db.query(
    `SELECT total_amount FROM nx05_allowance WHERE tenant_id=$1 AND ref_ar_id=$2`, [ctx.tenant, ar?.id]);
  check('SR3 過帳自動開折讓（口徑=未稅小計、Q4 待 CTO 定案）', alw.rows.length === 1, JSON.stringify(alw.rows));

  // E2 AP 分段沖銷
  const po = await call('POST', '/nx02/po', {
    poDate: ctx.today, supplierId: a.supplier.id, remark: 'E2E-E-TEMP',
    items: [{ partId: a.part1.id, qty: 1, unitPriceSnapshot: 50 }],
  });
  if (po.data?.id) ids.pos.push(po.data.id);
  for (const st of ['PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'CONFIRMED']) {
    await call('PATCH', `/nx02/po/${po.data?.id}`, { status: st });
  }
  const ap = ((await call('GET', '/nx05/ap?page=1&pageSize=100')).data?.rows ?? []).find((r) => r.poId === po.data?.id);
  if (ap) ids.aps.push(ap.id);
  check('E2a 廠商確認 → AP 52.5', !!ap && Math.abs(Number(ap.originalAmount) - 52.5) < 0.01);
  for (const [amt, expStatus, expBal] of [[30, 'PARTIAL', 22.5], [22.5, 'PAID', 0]]) {
    const pay = await call('POST', '/nx05/payment', { apId: ap?.id, payDate: ctx.today, amount: amt });
    if (pay.data?.id) ids.paylogs.push(pay.data.id);
    await call('PATCH', `/nx05/payment/${pay.data?.id}`, { status: 'POSTED' });
    const apNow = ((await call('GET', '/nx05/ap?page=1&pageSize=100')).data?.rows ?? []).find((r) => r.id === ap?.id);
    check(`E2b 付 ${amt} → ${expStatus}/balance ${expBal}`,
      Number(apNow?.balanceAmount) === expBal && apNow?.status === expStatus,
      JSON.stringify({ b: apNow?.balanceAmount, s: apNow?.status }));
  }

  // E3 月關帳（關上月、鎖、解鎖；上月已有關帳單則略過）
  const prevEnd = new Date(); prevEnd.setDate(0);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);
  const inPrev = prevEndStr.slice(0, 8) + '15';
  const pc = await call('POST', '/nx05/period-close', { closingDate: prevEndStr, remark: 'E2E-E-TEMP' });
  if (pc.status === 201 || pc.status === 200) {
    ids.closings.push(pc.data?.id);
    const cl = await call('PATCH', `/nx05/period-close/${pc.data?.id}`, { status: 'CLOSED' });
    check('E3a 關上月（OPEN→CLOSED）', cl.status === 200 && cl.data?.status === 'CLOSED');
    const lock = await call('POST', '/nx05/receipt', { payDate: inPrev, arId: ar?.id, amount: 1 });
    check('E3b 關帳期內收款被鎖', lock.status === 400, JSON.stringify(lock.data?.message ?? ''));
    if (lock.data?.id) ids.paylogs.push(lock.data.id);
    const reopen = await call('PATCH', `/nx05/period-close/${pc.data?.id}`, { status: 'REOPENED', reopenReason: 'E2E 測試解鎖' });
    check('E3c 解鎖（CLOSED→REOPENED）', reopen.status === 200 && reopen.data?.status === 'REOPENED');
  } else {
    console.log('SKIP E3（上月關帳單已存在或建立失敗）：' + JSON.stringify(pc.data?.message ?? '').slice(0, 150));
  }
} finally {
  await ctx.wipeDocs(ids);
  if (bak) await ctx.restoreBalances(bak);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
