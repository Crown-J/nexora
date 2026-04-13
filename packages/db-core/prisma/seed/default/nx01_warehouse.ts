import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';
import type { SeedTier } from '../lib/seed-tier';

type WhRow = { code: string; name: string; sortNo: number; typeCode: string | null };

function warehouseRowsForTier(tier: SeedTier): WhRow[] {
  if (tier === 'LITE') {
    return [{ code: 'MW1', name: '主倉 MW1', sortNo: 1, typeCode: null }];
  }
  if (tier === 'PLUS') {
    return [
      { code: 'MW1', name: '主倉 MW1', sortNo: 1, typeCode: 'M' },
      { code: 'BW1', name: '分倉 BW1', sortNo: 2, typeCode: 'W' },
    ];
  }
  return [
    { code: 'HW1', name: '總倉 HW1', sortNo: 1, typeCode: 'H' },
    { code: 'MW1', name: '主倉 MW1', sortNo: 2, typeCode: 'M' },
    { code: 'BW1', name: '分倉 BW1', sortNo: 3, typeCode: 'W' },
    { code: 'BW2', name: '分倉 BW2', sortNo: 4, typeCode: 'W' },
    { code: 'BW3', name: '分倉 BW3', sortNo: 5, typeCode: 'W' },
    { code: 'BW4', name: '分倉 BW4', sortNo: 6, typeCode: 'W' },
  ];
}

export async function seedNx01Warehouse(prisma: PrismaClient, tier: SeedTier): Promise<void> {
  const rows = warehouseRowsForTier(tier);
  const typeByCode = new Map<string, string>();
  if (tier !== 'LITE') {
    const types = await prisma.nx01WarehouseType.findMany({ select: { id: true, code: true } });
    for (const t of types) typeByCode.set(t.code, t.id);
  }

  for (const r of rows) {
    const warehouseTypeId = r.typeCode ? typeByCode.get(r.typeCode) ?? null : null;
    await prisma.nx01Warehouse.upsert({
      where: { code: r.code },
      create: {
        tenantId: DEMO_TENANT_ID,
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        warehouseTypeId,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        warehouseTypeId,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_warehouse_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_warehouse), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_warehouse: ${rows.length} 筆 (${tier})`);
}
