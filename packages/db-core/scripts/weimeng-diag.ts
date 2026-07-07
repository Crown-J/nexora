// packages/db-core/scripts/weimeng-diag.ts
// 臨時診斷：statement_timeout + 早年 SO/明細 真實剩餘量。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const MARK = '偉盟匯入';
async function main() {
  const to = await prisma.$queryRawUnsafe<any[]>(`SHOW statement_timeout`);
  console.log('statement_timeout =', JSON.stringify(to));
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const soCnt = await prisma.nx04So.count({ where: { tenantId: tid, remark: MARK, soDate: { lte: new Date('2023-12-31T23:59:59') } } });
  const itCnt = await prisma.nx04SoItem.count({ where: { so: { tenantId: tid, remark: MARK, soDate: { lte: new Date('2023-12-31T23:59:59') } } } });
  console.log(`早年 SO ${soCnt} 張 / 早年明細 ${itCnt} 列`);
  const soAll = await prisma.nx04So.count({ where: { tenantId: tid, remark: MARK } });
  console.log(`全部偉盟 SO ${soAll} 張（含近三年應 208934+早年）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
