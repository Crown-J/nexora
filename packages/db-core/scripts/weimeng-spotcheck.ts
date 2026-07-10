// packages/db-core/scripts/weimeng-spotcheck.ts
// 臨時抽驗：看一筆偉盟進貨 Rr + 明細，確認 status/locationId/unitCost 正確。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const rr = await prisma.nx02Rr.findFirst({
    where: { tenantId: t!.id, remark: '偉盟匯入' },
    select: { docNo: true, status: true, rrDate: true, supplierId: true, currencyId: true, totalAmount: true, postedAt: true,
      rev_Nx02RrItem_rrId: { take: 2, select: { partNo: true, qty: true, unitCost: true, actualUnitCost: true, locationId: true, lineAmount: true } } },
  });
  console.log(JSON.stringify(rr, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
