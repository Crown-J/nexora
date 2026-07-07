// packages/db-core/scripts/weimeng-overview.ts
// 偉盟匯入總覽：銷貨/進貨/銷退 三類筆數 + 銷退列表查詢（驗 null soId 不炸）+ 抽樣進貨成本記憶。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const ms = async (label: string, fn: () => Promise<unknown>) => {
  const s = process.hrtime.bigint(); const r = await fn();
  console.log(`  ${(Number(process.hrtime.bigint() - s) / 1e6).toFixed(1)} ms  ${label}${Array.isArray(r) ? ` (${r.length})` : ''}`);
  return r;
};
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id; const w = { tenantId: tid, remark: '偉盟匯入' };
  console.log('=== 偉盟匯入總覽（TW-100001）===');
  console.log(`銷貨 SO   ${await prisma.nx04So.count({ where: w })} / 明細 ${await prisma.nx04SoItem.count({ where: { so: w } })}`);
  console.log(`進貨 RR   ${await prisma.nx02Rr.count({ where: w })} / 明細 ${await prisma.nx02RrItem.count({ where: { rr: w } })}`);
  console.log(`銷退 SR   ${await prisma.nx04Sr.count({ where: w })} / 明細 ${await prisma.nx04SrItem.count({ where: { sr: w } })}`);
  console.log(`  其中 soId=null 的銷退 ${await prisma.nx04Sr.count({ where: { ...w, soId: null } })} 張`);
  console.log('\n=== 銷退列表查詢（驗 null soId 不炸）===');
  await ms('銷退列表 前100（含 soId/customer join）', () => prisma.nx04Sr.findMany({ where: { tenantId: tid }, orderBy: { docNo: 'desc' }, take: 100, select: { id: true, docNo: true, soId: true, totalAmount: true, customer: { select: { name: true } } } }));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
