// packages/db-core/scripts/weimeng-sr-spotcheck.ts
// 臨時抽驗：看一筆偉盟銷退 Sr + 明細，確認 soId=null / status / 預設欄位。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const sr = await prisma.nx04Sr.findFirst({
    where: { tenantId: t!.id, remark: '偉盟匯入' },
    select: { docNo: true, status: true, srDate: true, customerId: true, soId: true, returnMethod: true, totalAmount: true,
      rev_Nx04SrItem_srId: { take: 2, select: { partNo: true, qty: true, unitPrice: true, soItemId: true, returnReason: true, returnPolicy: true, locationId: true } } },
  });
  console.log(JSON.stringify(sr, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
