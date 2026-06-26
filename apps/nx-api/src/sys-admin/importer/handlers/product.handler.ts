// apps/nx-api/src/sys-admin/importer/handlers/product.handler.ts
// v1.2 對齊軌 C-FU FU-import-03：產品 importer
//
// 範本欄位：name / code / secCode(廠牌料號) / category / safetyQty / maxQty / defaultLocation
// 寫 Nx01Part + Nx03PartStockSetting
// 2026-06-26：廠牌料號 secCode 改必填

import type { HandlerContext, HandlerResult, ImportRow } from './base';
import { parseNumber } from './base';

export async function importProducts(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };

  // 取主倉（產品設定 PartStockSetting 需指定 warehouseId）
  const mainWh = await ctx.prisma.nx01Warehouse.findFirst({
    where: { tenantId: ctx.tenantId, isMain: true, isActive: true },
    select: { id: true },
  });

  for (const { rowNo, data } of rows) {
    if (!data.name || !data.code || !data.secCode) {
      result.errors.push({ rowNo, reason: '產品名稱 / 基準料號 / 廠牌料號必填' });
      continue;
    }
    // 檢編碼重複
    const exist = await ctx.prisma.nx01Part.findFirst({
      where: { tenantId: ctx.tenantId, code: data.code },
      select: { id: true },
    });
    if (exist) {
      result.errors.push({ rowNo, reason: `編碼 ${data.code} 已存在、跳過` });
      continue;
    }

    const part = await ctx.prisma.nx01Part.create({
      data: {
        tenantId: ctx.tenantId,
        code: data.code,
        secCode: data.secCode,
        name: data.name,
        isActive: true,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });

    // 寫 PartStockSetting（若有 safetyQty / maxQty / defaultLocation 且有主倉）
    const safetyQty = parseNumber(data.safetyQty);
    const maxQty = parseNumber(data.maxQty);
    if (mainWh && (safetyQty !== null || maxQty !== null || data.defaultLocation)) {
      let defaultLocationId: string | null = null;
      if (data.defaultLocation) {
        const loc = await ctx.prisma.nx01Location.findFirst({
          where: {
            tenantId: ctx.tenantId,
            warehouseId: mainWh.id,
            code: data.defaultLocation,
          },
          select: { id: true },
        });
        defaultLocationId = loc?.id ?? null;
      }
      try {
        await ctx.prisma.nx03PartStockSetting.create({
          data: {
            tenantId: ctx.tenantId,
            partId: part.id,
            warehouseId: mainWh.id,
            minQty: safetyQty ?? 0,
            maxQty: maxQty ?? 0,
            defaultLocationId,
            isActive: true,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          },
        });
      } catch {
        // PartStockSetting 寫失敗不算 row error、產品本身已建好
      }
    }
    result.imported++;
  }
  return result;
}
