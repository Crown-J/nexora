// packages/db-core/prisma/seed/template/apply-warehouse.ts
// @FUNCTION_CODE SYS-TMPL-SVC-008-F01
// 範本：倉庫（ALL，依 tier 建不同數量）。
// LITE：1 倉（MW1）/ PLUS：2 倉（MW1+BW1）/ PRO：6 倉（HW1+MW1+BW1~BW4）
// schema 原本就是 @@unique([tenantId, code])，無需 migration 調整。
//
// 注意：warehouse_type 是全域型錄（system/ 層），不帶 tenantId 過濾。

import type { PrismaClient } from '../../../generated/prisma';
import type { SeedTier } from '../lib/seed-tier';
import type { ApplyTemplateParams } from './index';

interface WhRow {
  code: string;
  name: string;
  sortNo: number;
  typeCode: string | null;
}

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

export async function applyWarehouse(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;

  const rows = warehouseRowsForTier(tier);

  // 全域型錄：不帶 tenantId 過濾
  const typeByCode = new Map<string, string>();
  if (tier !== 'LITE') {
    const types = await prisma.nx01WarehouseType.findMany({ select: { id: true, code: true } });
    for (const t of types) typeByCode.set(t.code, t.id);
  }

  // 預設據點（applySite 已先建「主要倉庫(M)」）：倉庫的 siteId 指向它
  const defaultSite = await prisma.nx01Site.findFirst({
    where: { tenantId },
    orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
    select: { id: true },
  });
  const siteId = defaultSite?.id ?? null;

  for (const r of rows) {
    const warehouseTypeId = r.typeCode ? typeByCode.get(r.typeCode) ?? null : null;
    await prisma.nx01Warehouse.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        warehouseTypeId,
        siteId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
        warehouseTypeId,
        siteId,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_warehouse_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_warehouse), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyWarehouse: ${rows.length} 筆 (tenant=${tenantId} tier=${tier})`);
}
