// packages/db-core/prisma/seed/system/nx01_country.ts
// @FUNCTION_CODE SYS-SEED-SVC-007-F01
// 系統層：ISO 3166-1 alpha-3 國家主檔（不隸屬任何租戶）。

import type { PrismaClient } from '../../../generated/prisma';
import { SYSADMIN_USER_ID } from './constants';

export async function seedNx01Country(prisma: PrismaClient): Promise<void> {
  const rows = [
    { code: 'TWN', name: '台灣', sortNo: 1 },
    { code: 'DEU', name: '德國', sortNo: 2 },
    { code: 'JPN', name: '日本', sortNo: 3 },
    { code: 'USA', name: '美國', sortNo: 4 },
    { code: 'CHN', name: '中國', sortNo: 5 },
    { code: 'KOR', name: '韓國', sortNo: 6 },
  ];

  for (const r of rows) {
    await prisma.nx01Country.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_country_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_country), 0), 1), true)`,
  );

  console.log(`✅ [SYSTEM] nx01_country: ${rows.length} 筆`);
}
