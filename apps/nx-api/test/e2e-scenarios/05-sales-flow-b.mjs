// apps/nx-api/test/e2e-scenarios/05-sales-flow-b.mjs
// B 組銷售流回歸：報價（SENT 閘）→轉銷貨帶行帶價 → 缺貨 G 分流開同行調貨 → 銷退業務閘
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('05-sales-flow-b');
const { call, check } = ctx;
const ids = { quotes: [], sos: [], tis: [] };
try {
  const a = await ctx.actors();
  const P1 = a.part1.id, P2 = a.part2.id;

  const qt = await call('POST', '/nx04/quote', {
    quoteDate: ctx.today, customerId: a.customer.id, taxRate: 5, remark: 'E2E-B-TEMP',
    items: [
      { partId: P1, qty: 2, unitPriceSnapshot: 1000, isSelected: true },
      { partId: P2, qty: 1, unitPriceSnapshot: 500, isSelected: true },
    ],
  });
  check('B1a 建報價單（2 行）', qt.status === 201 && !!qt.data?.id, JSON.stringify(qt.data?.message ?? ''));
  if (qt.data?.id) ids.quotes.push(qt.data.id);

  const sent = await call('PATCH', `/nx04/quote/${qt.data?.id}`, { status: 'SENT' });
  check('B1b 報價寄出（草稿不能轉單的業務閘前置）', sent.status === 200 && sent.data?.status === 'SENT');

  const pi = await call('GET', `/nx04/quote/price-intel?customerId=${a.customer.id}&partId=${P1}`);
  check('B1c price-intel 回帶價結構', pi.status === 200 && !!pi.data && 'suggestedPrice' in pi.data, JSON.stringify(Object.keys(pi.data ?? {})));

  const so = await call('POST', `/nx04/so/from-quote/${qt.data?.id}`);
  check('B1d 報價轉銷貨', (so.status === 201 || so.status === 200) && !!so.data?.id, JSON.stringify(so.data?.message ?? ''));
  if (so.data?.id) ids.sos.push(so.data.id);

  const soGet = await call('GET', `/nx04/so/${so.data?.id}`);
  const items = soGet.data?.items ?? [];
  const l1 = items.find((i) => i.partId === P1);
  const l2 = items.find((i) => i.partId === P2);
  check('B1e 明細帶行帶價', items.length === 2 && Number(l1?.unitPrice) === 1000 && Number(l2?.unitPrice) === 500);
  check('B1f 回連報價單', soGet.data?.quoteId === qt.data?.id);
  check('B1g 總額含稅', Math.abs(Number(soGet.data?.totalAmount) - 2625) < 0.01, soGet.data?.totalAmount);

  const gi = await call('POST', `/nx04/so/${so.data?.id}/items`, {
    partId: P1, warehouseId: soGet.data?.warehouseId, qty: 1, unitPriceSnapshot: 800, transferSourceType: 'G',
  });
  check('B3a 加 G 行 → 待補 P', gi.data?.transferSourceType === 'G' && gi.data?.transferStatus === 'P', JSON.stringify(gi.data?.message ?? ''));

  const ptl = await call('GET', `/nx04/so/${so.data?.id}/pending-transfer-lines`);
  check('B3b 待調貨行清單', (ptl.data?.items ?? []).some((r) => r.id === gi.data?.id));

  const ti = await call('POST', `/nx04/so/${so.data?.id}/create-ti`, {
    partnerId: a.peer.id, soItemIds: [gi.data?.id], remark: 'E2E-B-TEMP',
  });
  const tiId = ti.data?.id ?? ti.data?.tiId; // create-ti 回應鍵為 tiId
  check('B3c 從 SO 開同行調貨', (ti.status === 201 || ti.status === 200) && !!tiId, JSON.stringify(ti.data?.message ?? ti.data ?? ''));
  if (tiId) ids.tis.push(tiId);

  const soGet2 = await call('GET', `/nx04/so/${so.data?.id}`);
  const gLine = (soGet2.data?.items ?? []).find((i) => i.id === gi.data?.id);
  check('B3d SO 行回連 TI + 補貨中', !!tiId && gLine?.tiId === tiId && gLine?.transferStatus === 'I',
    JSON.stringify({ tiId: gLine?.tiId, ts: gLine?.transferStatus }));

  const sr = await call('POST', '/nx04/sales-return', { soId: so.data?.id, srDate: ctx.today, returnMethod: 'S', taxRate: 5 });
  check('B4 業務閘：草稿銷貨不可退（可讀 400）', sr.status === 400 && String(sr.data?.message ?? '').length > 0, JSON.stringify(sr.data?.message));
} finally {
  await ctx.wipeDocs(ids);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
