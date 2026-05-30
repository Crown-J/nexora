// apps/nx-api/src/sys-admin/importer/handlers/warehouse.handler.ts
// v1.2 對齊軌 C-FU FU-import-02：倉庫 / 庫位 importer
//
// 範本欄位：warehouseName / zone / position
// 業務語意：同 warehouseName 多 row 自動聚合成「同一倉、多庫位」
// - 若該 tenant 已有同名倉庫、直接用既有 id 加庫位（避免重複建倉庫）
// - 若沒有、新建倉庫（需 siteId、自動取 isMain=true 的主據點）
// - zone / position 結合成 location code（例：A01）

import type { HandlerContext, HandlerResult, ImportRow } from './base';

export async function importWarehouses(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };

  // 找主據點（沒有就不建倉庫）
  const mainSite = await ctx.prisma.nx01Site.findFirst({
    where: { tenantId: ctx.tenantId, isMain: true, isActive: true },
    select: { id: true },
  });
  if (!mainSite) {
    result.errors.push({
      rowNo: 0,
      reason: '租戶尚未設主據點、無法建倉庫（請先到主檔→據點建立）',
    });
    return result;
  }

  // 找既有倉庫的最大 code 序號
  const existingWh = await ctx.prisma.nx01Warehouse.findMany({
    where: { tenantId: ctx.tenantId },
    select: { code: true, name: true, id: true },
  });
  let whSeq = 0;
  for (const w of existingWh) {
    const m = w.code.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > whSeq) whSeq = n;
    }
  }
  const whByName = new Map<string, string>();
  for (const w of existingWh) whByName.set(w.name, w.id);

  for (const { rowNo, data } of rows) {
    if (!data.warehouseName) {
      result.errors.push({ rowNo, reason: '倉庫名稱必填' });
      continue;
    }

    // 取 / 建倉庫
    let warehouseId = whByName.get(data.warehouseName);
    if (!warehouseId) {
      whSeq++;
      const code = `W${String(whSeq).padStart(2, '0')}`;
      const newWh = await ctx.prisma.nx01Warehouse.create({
        data: {
          tenantId: ctx.tenantId,
          code,
          name: data.warehouseName,
          siteId: mainSite.id,
          isMain: false,
          isActive: true,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        },
      });
      warehouseId = newWh.id;
      whByName.set(data.warehouseName, warehouseId);
    }

    // 建庫位（若 zone + position 都有）
    if (data.zone || data.position) {
      const locCode = `${data.zone || ''}${data.position || ''}`.trim();
      if (locCode) {
        const exist = await ctx.prisma.nx01Location.findFirst({
          where: {
            tenantId: ctx.tenantId,
            warehouseId,
            code: locCode,
          },
          select: { id: true },
        });
        if (!exist) {
          await ctx.prisma.nx01Location.create({
            data: {
              tenantId: ctx.tenantId,
              warehouseId,
              code: locCode,
              name: locCode,
              isActive: true,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });
        }
      }
    }
    result.imported++;
  }
  return result;
}
