// apps/nx-api/test/e2e-scenarios/14-account-gate.mjs
// 帳戶閘門全鏈驗證（規格 v1.3、2026-07-21 執行長拍板）：
//   交易資格＝帳戶（R 收款=可賣 / P 進貨付款=可買 / T 調貨付款=可同行調貨）、類型降級純分類。
//   驗：建檔自動開戶、統編檢核、PA-001 未開戶擋銷售、現金客戶放行、帳戶停啟用即時反應、
//       gate=SELL/TRANSFER/PURCHASE 過濾一致性。只能對本機開發 DB 跑、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('帳戶閘門全鏈');
const created = { partnerIds: [], soIds: [] };
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;

  // ── T1 建檔自動開戶 ──────────────────────────────────
  // 無統編保養廠 → 自動 R 戶 + 待補件
  let r = await ctx.call('POST', '/nx01/partners', { name: '閘門測試保養廠', partnerType: 'C' });
  ctx.check('T1a 建無統編保養廠', r.status === 201, `HTTP ${r.status}`);
  const pC = r.data;
  created.partnerIds.push(pC.id);
  let acc = await ctx.call('GET', `/nx01/partners/${pC.id}/accounts`);
  const rAcct = (acc.data?.accounts ?? []).find((a) => a.direction === 'R');
  ctx.check('T1b 自動開 R 戶+統編待補', !!rAcct && rAcct.status === 'A' && rAcct.needsBackfill === true, JSON.stringify(acc.data));
  // 有統編同行 → R+T 雙戶、不待補
  r = await ctx.call('POST', '/nx01/partners', { name: '閘門測試同行', partnerType: 'O', taxId: '22099131' });
  ctx.check('T1c 建同行（合法統編）', r.status === 201, `HTTP ${r.status}`);
  const pO = r.data;
  created.partnerIds.push(pO.id);
  acc = await ctx.call('GET', `/nx01/partners/${pO.id}/accounts`);
  const dirs = (acc.data?.accounts ?? []).map((a) => `${a.direction}${a.needsBackfill ? '!' : ''}`).sort().join(',');
  ctx.check('T1d 同行自動 R+T 雙戶不待補', dirs === 'R,T', dirs);

  // ── T2 統編檢核 ─────────────────────────────────────
  r = await ctx.call('POST', `/nx01/partners/${pC.id}/accounts`, { direction: 'R', taxId: '12345678' });
  ctx.check('T2a 壞統編開戶 → PA-006', r.status === 400 && String(r.data?.message).includes('PA-006'), JSON.stringify(r.data));
  r = await ctx.call('POST', `/nx01/partners/${pC.id}/accounts`, { direction: 'R', taxId: 'FR999888', foreignTaxId: true });
  ctx.check('T2b 外籍後門跳過檢核（既有戶啟用中→已開擋回）', r.status === 400 && !String(r.data?.message).includes('PA-006'), JSON.stringify(r.data));

  // ── T3 未開戶擋銷售 + 現金客戶放行 ────────────────────
  // 建一個 V 一般廠商（自動只有 P 戶、無 R）→ 賣他要被 PA-001 擋
  r = await ctx.call('POST', '/nx01/partners', { name: '閘門測試一般廠商', partnerType: 'V' });
  const pV = r.data;
  created.partnerIds.push(pV.id);
  const wh = await one(`SELECT id FROM nx01_warehouse WHERE tenant_id=$1 AND is_active=true ORDER BY sort_no LIMIT 1`, [T]);
  const part = await one(
    `SELECT b.part_id FROM nx03_stock_balance b JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>5 ORDER BY b.available_qty DESC LIMIT 1`, [T, wh.id]);
  const soBody = {
    customerId: pV.id, warehouseId: wh.id, soDate: ctx.today, deliveryType: 'P',
    deliveryAddress: '自取', taxRate: 5, invoiceCopies: 3,
    items: [{ partId: part.part_id, qty: 1, unitPriceSnapshot: 99999, warehouseId: wh.id, transferSourceType: 'S' }],
  };
  r = await ctx.call('POST', '/nx04/so', soBody);
  ctx.check('T3a 無收款戶開單 → PA-001 擋', r.status === 400 && String(r.data?.message).includes('PA-001'), JSON.stringify(r.data));
  // 標記現金客戶 → 放行
  r = await ctx.call('PATCH', `/nx01/partners/${pV.id}`, { isCashCustomer: true });
  ctx.check('T3b 標記現金客戶', r.status === 200, `HTTP ${r.status}`);
  r = await ctx.call('POST', '/nx04/so', soBody);
  if (r.status === 201) created.soIds.push(r.data.id);
  ctx.check('T3c 現金客戶開單 → 放行', r.status === 201, JSON.stringify(r.data).slice(0, 200));

  // ── T4 帳戶停用即時擋 ────────────────────────────────
  // 停用測試保養廠的 R 戶 → 開單被擋；重啟 → 放行
  r = await ctx.call('PATCH', `/nx01/partner-accounts/${rAcct.id}`, { status: 'S' });
  ctx.check('T4a 停用 R 戶', r.status === 200 && r.data?.status === 'S', JSON.stringify(r.data));
  r = await ctx.call('POST', '/nx04/so', { ...soBody, customerId: pC.id });
  ctx.check('T4b 停用後開單 → PA-001', r.status === 400 && String(r.data?.message).includes('PA-001'), JSON.stringify(r.data));
  r = await ctx.call('PATCH', `/nx01/partner-accounts/${rAcct.id}`, { status: 'A' });
  r = await ctx.call('POST', '/nx04/so', { ...soBody, customerId: pC.id });
  if (r.status === 201) created.soIds.push(r.data.id);
  ctx.check('T4c 重啟後開單 → 放行', r.status === 201, JSON.stringify(r.data).slice(0, 200));

  // ── T5 gate 過濾一致性 ───────────────────────────────
  const sell = await ctx.call('GET', '/nx01/partners?page=1&pageSize=1&isActive=true&gate=SELL');
  const tr = await ctx.call('GET', '/nx01/partners?page=1&pageSize=1&isActive=true&gate=TRANSFER');
  const pu = await ctx.call('GET', '/nx01/partners?page=1&pageSize=1&isActive=true&gate=PURCHASE');
  const rTot = await ctx.call('GET', '/nx01/partners?page=1&pageSize=1&isActive=true&hasAccount=R');
  ctx.check('T5a gate 三值皆可查', sell.status === 200 && tr.status === 200 && pu.status === 200,
    `${sell.status}/${tr.status}/${pu.status}`);
  ctx.check('T5b SELL ⊇ R 戶（含現金客戶/散客）', (sell.data?.total ?? 0) >= (rTot.data?.total ?? 0),
    `SELL=${sell.data?.total} R=${rTot.data?.total}`);
  // TRANSFER 必為同行身分 ∩ T 戶：抽 3 筆驗
  const trRows = await ctx.call('GET', '/nx01/partners?page=1&pageSize=3&isActive=true&gate=TRANSFER');
  const allO = (trRows.data?.rows ?? []).every((p) => p.partnerType === 'O' || p.canTransferStock);
  ctx.check('T5c TRANSFER 全為同行身分', allO, JSON.stringify((trRows.data?.rows ?? []).map((p) => p.code)));
} finally {
  // 自清：SO（草稿直刪）→ 帳戶 → 測試 partner
  for (const id of created.soIds) {
    await ctx.db.query(`DELETE FROM nx04_so_item WHERE so_id=$1`, [id]);
    await ctx.db.query(`DELETE FROM nx04_so WHERE id=$1`, [id]);
  }
  if (created.partnerIds.length) {
    await ctx.db.query(`DELETE FROM nx01_partner_account WHERE tenant_id=$1 AND partner_id = ANY($2)`, [ctx.tenant, created.partnerIds]);
    await ctx.db.query(`DELETE FROM nx01_partner WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, created.partnerIds]);
  }
  console.log(`\n【自清】partner×${created.partnerIds.length}、SO×${created.soIds.length}`);
  ctx.summary();
  await ctx.db.end();
}
