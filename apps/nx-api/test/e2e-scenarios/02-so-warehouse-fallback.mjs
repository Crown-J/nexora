// apps/nx-api/test/e2e-scenarios/02-so-warehouse-fallback.mjs
// 銷貨建單出貨倉三層補位（0711-M 修 DTO 漏鬆綁後回歸）：不帶倉→補位、明示倉→尊重、無效倉→400
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('02-so-warehouse-fallback');
const { call, check } = ctx;
const ids = { sos: [] };
try {
  const a = await ctx.actors();
  const s1 = await call('POST', '/nx04/so', {
    customerId: a.customer.id, soDate: ctx.today, deliveryType: 'D', taxRate: 5, remark: 'E2E-WHFB-TEMP',
  });
  check('1 不帶倉可建單（客戶無預設倉）', s1.status === 201 && !!s1.data?.id, JSON.stringify(s1.data?.message ?? ''));
  check('1b 補位到期望倉（隸屬主要倉/單倉/主倉）', s1.data?.warehouseId === a.expectedFallbackWh,
    JSON.stringify({ got: s1.data?.warehouseId, want: a.expectedFallbackWh }));
  if (s1.data?.id) ids.sos.push(s1.data.id);

  const s2 = await call('POST', '/nx04/so', {
    customerId: a.customer.id, soDate: ctx.today, deliveryType: 'D', taxRate: 5,
    warehouseId: a.wh2.id, remark: 'E2E-WHFB-TEMP',
  });
  check('2 明示帶倉尊重指定', s2.status === 201 && s2.data?.warehouseId === a.wh2.id, JSON.stringify(s2.data?.warehouseId));
  if (s2.data?.id) ids.sos.push(s2.data.id);

  const s3 = await call('POST', '/nx04/so', {
    customerId: a.customer.id, soDate: ctx.today, deliveryType: 'D', taxRate: 5, warehouseId: 'NX01WARE9999999',
  });
  check('3 無效倉 400', s3.status === 400, JSON.stringify(s3.data?.message));
} finally {
  await ctx.wipeDocs(ids);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
