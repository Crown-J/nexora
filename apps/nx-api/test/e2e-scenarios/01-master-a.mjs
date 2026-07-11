// apps/nx-api/test/e2e-scenarios/01-master-a.mjs
// A 組主檔：客戶巡檢（查/讀/改/還原）+ 預設出貨倉 → 建單自動帶（三層補位第一層優先序）
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('01-master-a');
const { call, check } = ctx;
const ids = { sos: [] };
try {
  const a = await ctx.actors();
  const list = await call('GET', `/nx01/partners?search=${encodeURIComponent(a.customer.code)}&pageSize=10`);
  const rows = list.data?.items ?? list.data?.rows ?? [];
  check('A1a 搜尋客戶命中', list.status === 200 && rows.some((r) => r.id === a.customer.id), rows.length);

  const det = await call('GET', `/nx01/partners/${a.customer.id}`);
  check('A1b 詳情讀取', det.status === 200 && det.data?.code === a.customer.code && det.data?.partnerType === 'C');
  const origRemark = det.data?.remark ?? null;
  const origWh = det.data?.defaultWarehouseId ?? null;

  await call('PATCH', `/nx01/partners/${a.customer.id}`, { remark: 'E2E-A-TEMP' });
  const det2 = await call('GET', `/nx01/partners/${a.customer.id}`);
  check('A1c 編輯存檔（remark）', det2.data?.remark === 'E2E-A-TEMP');
  await call('PATCH', `/nx01/partners/${a.customer.id}`, { remark: origRemark });
  const det3 = await call('GET', `/nx01/partners/${a.customer.id}`);
  check('A1d 還原 remark', (det3.data?.remark ?? null) === origRemark);

  // A2 預設倉優先序：掛 wh2（非使用者補位倉）→ 建單應帶 wh2
  await call('PATCH', `/nx01/partners/${a.customer.id}`, { defaultWarehouseId: a.wh2.id });
  const so = await call('POST', '/nx04/so', {
    customerId: a.customer.id, soDate: ctx.today, deliveryType: 'P', taxRate: 5, remark: 'E2E-A-TEMP',
  });
  check('A2a 建單自動帶客戶預設倉（優先於使用者補位）', so.status === 201 && so.data?.warehouseId === a.wh2.id,
    JSON.stringify({ got: so.data?.warehouseId, want: a.wh2.id }));
  if (so.data?.id) ids.sos.push(so.data.id);
  await call('PATCH', `/nx01/partners/${a.customer.id}`, { defaultWarehouseId: origWh });
  const det4 = await call('GET', `/nx01/partners/${a.customer.id}`);
  check('A2b 還原預設倉', (det4.data?.defaultWarehouseId ?? null) === origWh);
} finally {
  await ctx.wipeDocs(ids);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
