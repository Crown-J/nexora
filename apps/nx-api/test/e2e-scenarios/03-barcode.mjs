// apps/nx-api/test/e2e-scenarios/03-barcode.mjs
// 零件條碼對照（WEIMENG-P2 Step 1/2 回歸）：CRUD/預設旗標搶佔/同租戶唯一/resolve/defaults
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('03-barcode');
const { call, check } = ctx;
const BC = (n) => `E2E-BC-${n}`;
try {
  const a = await ctx.actors();
  const P1 = a.part1.id, P2 = a.part2.id;

  const b1 = await call('POST', `/nx01/parts/${P1}/barcodes`, { barcode: BC(1) });
  check('B1 第一條自動預設', b1.status === 201 && b1.data?.isDefault === true, JSON.stringify(b1.data?.message ?? ''));
  const b2 = await call('POST', `/nx01/parts/${P1}/barcodes`, { barcode: BC(2), remark: 'E2E' });
  check('B2 第二條非預設', b2.status === 201 && b2.data?.isDefault === false);
  const b3 = await call('POST', `/nx01/parts/${P2}/barcodes`, { barcode: BC(1) });
  check('B3 跨料重複條碼 409 可讀訊息', b3.status === 409 && String(b3.data?.message ?? '').includes('已掛在料號'));

  const r1 = await call('GET', `/nx01/part-barcode/resolve?code=${encodeURIComponent(BC(1))}`);
  check('B4 resolve 命中', r1.data?.found === true && r1.data?.partId === P1);
  const r2 = await call('GET', `/nx01/part-barcode/resolve?code=E2E-BC-NOPE`);
  check('B5 resolve 未命中 found=false', r2.data?.found === false);

  const u1 = await call('PATCH', `/nx01/parts/${P1}/barcodes/${b2.data?.id}`, { isDefault: true });
  const l1 = await call('GET', `/nx01/parts/${P1}/barcodes`);
  const rows = l1.data?.rows ?? [];
  check('B6 搶預設換手', u1.status === 200 &&
    rows.find((r) => r.id === b2.data?.id)?.isDefault === true &&
    rows.find((r) => r.id === b1.data?.id)?.isDefault === false);

  const d1 = await call('POST', `/nx01/part-barcode/defaults`, { partIds: [P1, P2] });
  check('B7 defaults 批量取預設（無對照不回列）',
    d1.data?.rows?.length === 1 && d1.data?.rows?.[0]?.barcode === BC(2), JSON.stringify(d1.data?.rows));

  for (const [pid, bid] of [[P1, b1.data?.id], [P1, b2.data?.id]]) {
    if (bid) await call('DELETE', `/nx01/parts/${pid}/barcodes/${bid}`);
  }
  const l2 = await call('GET', `/nx01/parts/${P1}/barcodes`);
  check('B8 清理後歸零', (l2.data?.rows ?? ['x']).length === 0);
} finally {
  // 保險絲：API 清理漏網的一律 SQL 收
  await ctx.db.query(`DELETE FROM nx01_part_barcode WHERE tenant_id=$1 AND barcode LIKE 'E2E-BC-%'`, [ctx.tenant]);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
