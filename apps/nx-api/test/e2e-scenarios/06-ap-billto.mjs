// apps/nx-api/test/e2e-scenarios/06-ap-billto.mjs
// AP 帳款歸戶回歸（0711-L）：PO 帶付款對象→AP 歸戶、付款對象取歸戶優先；對照組不帶=null
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('06-ap-billto');
const { call, check } = ctx;
const ids = { pos: [], aps: [], paylogs: [] };

async function poToAp(a, withBillTo) {
  const po = await call('POST', '/nx02/po', {
    poDate: ctx.today, supplierId: a.supplier.id, remark: 'E2E-BILLTO-TEMP',
    items: [{ partId: a.part1.id, qty: 1, unitPriceSnapshot: 100 }],
  });
  if (po.data?.id) ids.pos.push(po.data.id);
  if (withBillTo) await call('PATCH', `/nx02/po/${po.data?.id}`, { invoiceToPartnerId: a.customer.id });
  for (const st of ['PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'CONFIRMED']) {
    await call('PATCH', `/nx02/po/${po.data?.id}`, { status: st });
  }
  const list = await call('GET', '/nx05/ap?page=1&pageSize=100');
  const ap = (list.data?.rows ?? []).find((r) => r.poId === po.data?.id);
  if (ap) ids.aps.push(ap.id);
  return ap;
}

try {
  const a = await ctx.actors();
  const apA = await poToAp(a, true);
  check('A1 帶付款對象 → AP.billTo=歸戶', apA?.billToPartnerId === a.customer.id, JSON.stringify(apA?.billToPartnerId));
  check('A2 supplierId 維持交易對象', apA?.supplierId === a.supplier.id);

  const apB = await poToAp(a, false);
  check('B1 不帶 → billTo=null', apB != null && apB.billToPartnerId === null);

  const payA = await call('POST', '/nx05/payment', { apId: apA?.id, payDate: ctx.today, amount: 10 });
  check('A3 付款單 partner=歸戶對象', payA.status === 201 && payA.data?.partnerId === a.customer.id, JSON.stringify(payA.data?.partnerId));
  if (payA.data?.id) ids.paylogs.push(payA.data.id);

  const payB = await call('POST', '/nx05/payment', { apId: apB?.id, payDate: ctx.today, amount: 10 });
  check('B2 付款單 partner=supplier（無歸戶）', payB.status === 201 && payB.data?.partnerId === a.supplier.id);
  if (payB.data?.id) ids.paylogs.push(payB.data.id);
} finally {
  await ctx.wipeDocs(ids);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
