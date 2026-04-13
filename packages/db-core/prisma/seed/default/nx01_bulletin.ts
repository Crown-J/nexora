import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

export async function seedNx01Bulletin(prisma: PrismaClient, _tier: SeedTier): Promise<void> {
  const existing = await prisma.nx01Bulletin.findFirst({
    where: { tenantId: DEMO_TENANT_ID, title: '歡迎使用 NEXORA GRID' },
  });

  if (!existing) {
    await prisma.nx01Bulletin.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        title: '歡迎使用 NEXORA GRID',
        content:
          '恆迎企業示範租戶已初始化完成。請使用 admin 帳號登入（首次登入請依政策變更密碼）。SYSADMIN 為系統內建帳號，不提供 UI 登入。',
        type: 'S',
        isPinned: true,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_bulletin_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_bulletin), 0), 1), true)`,
  );

  console.log('✅ default/nx01_bulletin: 歡迎公告 1 筆');
}
