import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx05AccountCode(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const rows = [
    { code: '4100', name: '銷貨收入', category: 'I', sort: 1 },
    { code: '5100', name: '銷貨成本', category: 'E', sort: 2 },
    { code: '6132', name: '租金支出', category: 'E', sort: 3 },
    { code: '6139', name: '水電費', category: 'E', sort: 4 },
    { code: '6150', name: '電話費', category: 'E', sort: 5 },
    { code: '6200', name: '薪資支出', category: 'E', sort: 6 },
    { code: '6300', name: '折舊費用', category: 'E', sort: 7 },
    { code: '7100', name: '利息收入', category: 'I', sort: 8 },
    { code: '7200', name: '利息支出', category: 'E', sort: 9 },
    { code: '1100', name: '現金', category: 'A', sort: 10 },
    { code: '1200', name: '應收帳款', category: 'A', sort: 11 },
    { code: '2100', name: '應付帳款', category: 'L', sort: 12 },
  ];

  for (const r of rows) {
    await prisma.nx05AccountCode.upsert({
      where: { code: r.code },
      create: {
        tenantId: DEMO_TENANT_ID,
        code: r.code,
        name: r.name,
        category: r.category,
        isSystem: true,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        category: r.category,
        isSystem: true,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_account_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_account_code), 0), 1), true)`,
  );

  console.log(`✅ default/nx05_account_code: ${rows.length} 筆`);
}
