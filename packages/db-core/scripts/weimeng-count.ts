// packages/db-core/scripts/weimeng-count.ts
// 臨時盤點：印出 TW-100001 現有主檔量（Part/Partner 分型/Location/Warehouse），供估 placeholder 規模。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  console.log('Part   ', await prisma.nx01Part.count({ where: { tenantId: tid } }));
  console.log('Partner', await prisma.nx01Partner.count({ where: { tenantId: tid } }));
  for (const ty of ['C', 'S', 'O', 'T', 'B', 'V']) console.log(`  ${ty}`, await prisma.nx01Partner.count({ where: { tenantId: tid, partnerType: ty } }));
  console.log('Location', await prisma.nx01Location.count({ where: { tenantId: tid } }));
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { code: true } });
  console.log('Warehouse', wh.map((w) => w.code).join(','));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
