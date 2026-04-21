// packages/db-core/prisma/seed/system/nx01_warehouse_type.ts
// @FUNCTION_CODE SYS-SEED-SVC-009-F01
// 倉庫類型型錄（全域型錄）：H / M / W / S 四種，不隸屬任何租戶。
//
// 說明：
//   - schema 本身無 tenantId、無 createdBy/updatedBy，設計就是全域共用
//   - 所有租戶引用這四筆時都是讀取共用資料
//   - 未來若真的需要客戶客製，要先改 schema 加 tenantId 欄位
//
// flowMode：C=集中管理 / D=分倉管理（控制進貨後自動調撥的觸發邏輯）

import type { PrismaClient } from '../../../generated/prisma';

interface WarehouseTypeRow {
  code: string;
  name: string;
  flowMode: string;
  sortNo: number;
  description: string;
}

export async function seedNx01WarehouseType(prisma: PrismaClient): Promise<void> {
  const types: WarehouseTypeRow[] = [
    { code: 'H', name: '總部集中倉', flowMode: 'C', sortNo: 1, description: 'HW1 類型' },
    { code: 'M', name: '主倉',       flowMode: 'C', sortNo: 2, description: 'MW1 類型' },
    { code: 'W', name: '分倉',       flowMode: 'D', sortNo: 3, description: 'BW 類型' },
    { code: 'S', name: '衛星倉',     flowMode: 'D', sortNo: 4, description: '衛星據點' },
  ];

  for (const t of types) {
    await prisma.nx01WarehouseType.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        name: t.name,
        flowMode: t.flowMode,
        sortNo: t.sortNo,
        description: t.description,
        isActive: true,
      },
      update: {
        name: t.name,
        flowMode: t.flowMode,
        sortNo: t.sortNo,
        description: t.description,
        isActive: true,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_warehouse_type_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_warehouse_type), 0), 1), true)`,
  );

  console.log(`✅ [SYSTEM] nx01_warehouse_type: ${types.length} 筆（全域型錄）`);
}
