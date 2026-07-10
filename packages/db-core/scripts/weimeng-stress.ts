// packages/db-core/scripts/weimeng-stress.ts
// 偉盟匯入 Phase4：大量歷史銷貨載入後，量測系統關鍵讀取路徑的反應時間。
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
  const itemCount = await prisma.nx04SoItem.count({ where: { so: { tenantId: tid, remark: '偉盟匯入' } } });
  console.log(`資料量：SO ${soCount} 張 / 明細 ${itemCount} 列`);

  // 取一筆有歷史的 客戶×料號（熱點查詢用）
  const sample = await prisma.nx04SoItem.findFirst({ where: { so: { tenantId: tid, remark: '偉盟匯入' } }, select: { partId: true, so: { select: { customerId: true } } } });
  const partId = sample!.partId, customerId = sample!.so.customerId;
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 1);
  console.log(`\n熱點查詢（客戶=${customerId} 料=${partId}）：`);

  await ms('銷貨列表 前100（docNo desc）', () => prisma.nx04So.findMany({ where: { tenantId: tid }, orderBy: { docNo: 'desc' }, take: 100, select: { id: true, docNo: true, totalAmount: true } }));
  await ms('自動帶價：同客戶該料 最近成交', () => prisma.nx04SoItem.findFirst({ where: { partId, so: { tenantId: tid, customerId } }, orderBy: { so: { soDate: 'desc' } }, select: { unitPrice: true, so: { select: { soDate: true } } } }));
  await ms('比價⑤：同料 市場最近成交(任一客戶)', () => prisma.nx04SoItem.findFirst({ where: { partId, so: { tenantId: tid } }, orderBy: { so: { soDate: 'desc' } }, select: { unitPrice: true } }));
  await ms('歷史價：同客戶該料 近一個月', () => prisma.nx04SoItem.findMany({ where: { partId, so: { tenantId: tid, customerId, soDate: { gte: cutoff } } }, orderBy: { so: { soDate: 'desc' } }, take: 20, select: { unitPrice: true } }));
  await ms('客戶交易數 count', () => prisma.nx04So.count({ where: { tenantId: tid, customerId } }));
  await ms('該料被賣過幾次 count', () => prisma.nx04SoItem.count({ where: { partId, so: { tenantId: tid } } }));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
