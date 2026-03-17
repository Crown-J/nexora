/**
 * NEXORA db-core Prisma Seed
 * 執行：pnpm prisma db seed（需在 packages/db-core 目錄或由根目錄透過 workspace 執行）
 */
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  /**
   * @FUNCTION_CODE NX99-TENANT-SVC-SEED-F01
   * 說明：DEV 測試用租戶 seed，確保開發環境有基礎租戶資料
   */
  await prisma.nx99Tenant.upsert({
    where: { code: 'DEV-INNOVA' },
    update: {},
    create: {
      code: 'DEV-INNOVA',
      name: '伊諾瓦資訊科技有限公司（開發測試）',
      status: 'A',
      sortNo: 1,
      isActive: true,
    },
  });

  /**
   * @FUNCTION_CODE NX99-TENANT-SVC-SEED-F02
   * 說明：將現有 nx00_user 全部綁定至 DEV-INNOVA 開發測試租戶
   */
  const devTenant = await prisma.nx99Tenant.findUnique({
    where: { code: 'DEV-INNOVA' },
  });

  if (devTenant) {
    const result = await prisma.nx00User.updateMany({
      where: { tenantId: null },
      data: { tenantId: devTenant.id },
    });
    console.log(
      `✅ 所有 nx00_user 已綁定至 DEV-INNOVA（tenantId: ${devTenant.id}，更新 ${result.count} 筆）`
    );
  }
}

main()
  .then(() => {
    console.log('Seed completed.');
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
