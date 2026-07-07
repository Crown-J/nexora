// packages/db-core/scripts/weimeng-stress2.ts
// 偉盟續作 Phase E：全量歷史（銷貨~306萬列 + 進貨~59萬列）下量測關鍵讀取路徑反應時間。
//   含新增的「進貨成本記憶」查詢（自動帶進貨成本 / 供應商比價）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const ms = async (label: string, fn: () => Promise<unknown>) => {
  const s = process.hrtime.bigint();
  const r = await fn();
  const t = Number(process.hrtime.bigint() - s) / 1e6;
  const cnt = Array.isArray(r) ? `(${r.length} 筆)` : r == null ? '(空)' : '';
  console.log(`  ${t.toFixed(1)} ms  ${label} ${cnt}`);
  return r;
};
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const soCount = await prisma.nx04So.count({ where: { tenantId: tid, remark: '偉盟匯入' } });
  const soItem = await prisma.nx04SoItem.count({ where: { so: { tenantId: tid, remark: '偉盟匯入' } } });
  const rrCount = await prisma.nx02Rr.count({ where: { tenantId: tid, remark: '偉盟匯入' } });
  const rrItem = await prisma.nx02RrItem.count({ where: { rr: { tenantId: tid, remark: '偉盟匯入' } } });
  console.log(`資料量：銷貨 SO ${soCount} 張 / 明細 ${soItem} 列 ; 進貨 RR ${rrCount} 張 / 明細 ${rrItem} 列`);

  const sSample = await prisma.nx04SoItem.findFirst({ where: { so: { tenantId: tid, remark: '偉盟匯入' } }, select: { partId: true, so: { select: { customerId: true } } } });
  const partId = sSample!.partId, customerId = sSample!.so.customerId;
  const pSample = await prisma.nx02RrItem.findFirst({ where: { rr: { tenantId: tid, remark: '偉盟匯入' } }, select: { partId: true, rr: { select: { supplierId: true } } } });
  const pPart = pSample!.partId, supplierId = pSample!.rr.supplierId;
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 1);

  console.log('\n── 銷貨查詢 ──');
  await ms('銷貨列表 前100（docNo desc）', () => prisma.nx04So.findMany({ where: { tenantId: tid }, orderBy: { docNo: 'desc' }, take: 100, select: { id: true, docNo: true, totalAmount: true } }));
  await ms('自動帶價：同客戶該料 最近成交', () => prisma.nx04SoItem.findFirst({ where: { partId, so: { tenantId: tid, customerId } }, orderBy: { so: { soDate: 'desc' } }, select: { unitPrice: true, so: { select: { soDate: true } } } }));
  await ms('比價：同料 市場最近成交(任一客戶)', () => prisma.nx04SoItem.findFirst({ where: { partId, so: { tenantId: tid } }, orderBy: { so: { soDate: 'desc' } }, select: { unitPrice: true } }));
  await ms('該料被賣過幾次 count', () => prisma.nx04SoItem.count({ where: { partId, so: { tenantId: tid } } }));

  console.log('\n── 進貨成本記憶查詢（新）──');
  await ms('進貨列表 前100（docNo desc）', () => prisma.nx02Rr.findMany({ where: { tenantId: tid }, orderBy: { docNo: 'desc' }, take: 100, select: { id: true, docNo: true, totalAmount: true } }));
  await ms('自動帶成本：該料 最近進貨成本', () => prisma.nx02RrItem.findFirst({ where: { partId: pPart, rr: { tenantId: tid } }, orderBy: { rr: { rrDate: 'desc' } }, select: { unitCost: true, rr: { select: { rrDate: true } } } }));
  await ms('供應商成本：該料該供應商 最近進貨', () => prisma.nx02RrItem.findFirst({ where: { partId: pPart, rr: { tenantId: tid, supplierId } }, orderBy: { rr: { rrDate: 'desc' } }, select: { unitCost: true } }));
  await ms('該料進貨過幾次 count', () => prisma.nx02RrItem.count({ where: { partId: pPart, rr: { tenantId: tid } } }));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
