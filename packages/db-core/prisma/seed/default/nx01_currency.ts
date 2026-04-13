import type { PrismaClient } from '../../../generated/prisma';
import { SYSADMIN_USER_ID } from './constants';

export async function seedNx01Currency(prisma: PrismaClient): Promise<void> {
  const rows = [
    { code: 'TWD', name: '新台幣', symbol: 'NT$', decimalPlaces: 0, sortNo: 1 },
    { code: 'USD', name: '美元', symbol: '$', decimalPlaces: 2, sortNo: 2 },
    { code: 'EUR', name: '歐元', symbol: '€', decimalPlaces: 2, sortNo: 3 },
    { code: 'JPY', name: '日圓', symbol: '¥', decimalPlaces: 0, sortNo: 4 },
  ];

  for (const r of rows) {
    await prisma.nx01Currency.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        symbol: r.symbol,
        decimalPlaces: r.decimalPlaces,
        sortNo: r.sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        symbol: r.symbol,
        decimalPlaces: r.decimalPlaces,
        sortNo: r.sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_currency_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_currency), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_currency: ${rows.length} 筆`);
}
