// apps/nx-api/src/nx03/auto-replenish/part-replacement.service.ts
// application 層替代品牌邏輯（Crown Q-AR-設計-2=b 不動 schema、純 service）
// 對齊 overview §6 替代品牌邏輯
//
// fitLevel 範式（既有 Nx01PartModel schema、SmallInt enum）：
//   1 = 原廠（OE 正廠）
//   2 = 副廠等效
//   3 = 通用替代
//
// 三業務場景（overview §6.2）：
//   場景 A 缺正廠 → 推 fitLevel=2 副廠等效
//   場景 B 缺副廠特定品牌 → 推同副廠池其他品牌（fitLevel=2）
//   場景 C 完全缺貨 → 升 fitLevel=3 通用替代

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/** 替代品牌候選（含 fitLevel + isOem 雙標記）。 */
export type ReplacementCandidate = {
  partId: string;
  partBrandId: string | null;
  fitLevel: number; // 1 原廠 / 2 副廠等效 / 3 通用替代
  isOem: boolean;
};

export type FindReplacementOptions = {
  /** 納入的 fitLevel 集合（預設 [2, 3] = 副廠等效 + 通用替代、排除 fitLevel=1 原廠）。 */
  includeFitLevels?: number[];
  /** 排除特定 partIds（如：來源候選本身、已庫存的 part）。 */
  excludePartIds?: string[];
  /** 只取 isOem=false（純副廠池）。 */
  aftermarketOnly?: boolean;
};

@Injectable()
export class PartReplacementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 找該 model 下的替代品牌候選池
   *   - 篩選 part_model.isActive=true + part.isActive=true
   *   - 排序：fitLevel asc（優先原廠/副廠等效、最後通用）
   *
   * @param tenantId 租戶
   * @param modelId 車型
   * @param options 篩選選項
   */
  async findReplacementsByModel(
    tenantId: string,
    modelId: string,
    options: FindReplacementOptions = {},
  ): Promise<ReplacementCandidate[]> {
    const includeFitLevels = options.includeFitLevels ?? [2, 3];
    const partModels = await this.prisma.nx01PartModel.findMany({
      where: {
        tenantId,
        modelId,
        isActive: true,
        fitLevel: { in: includeFitLevels },
        ...(options.excludePartIds?.length
          ? { partId: { notIn: options.excludePartIds } }
          : {}),
        part: {
          isActive: true,
          ...(options.aftermarketOnly ? { isOem: false } : {}),
        },
      },
      orderBy: { fitLevel: 'asc' },
      select: {
        partId: true,
        fitLevel: true,
        part: { select: { partBrandId: true, isOem: true } },
      },
    });

    return partModels.map((pm) => ({
      partId: pm.partId,
      partBrandId: pm.part.partBrandId,
      fitLevel: pm.fitLevel,
      isOem: pm.part.isOem,
    }));
  }

  /**
   * 場景 A：缺正廠 → 推副廠等效（fitLevel=2、isOem=false）
   */
  async findAftermarketAlternatives(
    tenantId: string,
    modelId: string,
    excludePartIds: string[] = [],
  ): Promise<ReplacementCandidate[]> {
    return this.findReplacementsByModel(tenantId, modelId, {
      includeFitLevels: [2],
      aftermarketOnly: true,
      excludePartIds,
    });
  }

  /**
   * 場景 C：完全缺貨 → 升通用替代（fitLevel=3、不限 isOem）
   */
  async findUniversalAlternatives(
    tenantId: string,
    modelId: string,
    excludePartIds: string[] = [],
  ): Promise<ReplacementCandidate[]> {
    return this.findReplacementsByModel(tenantId, modelId, {
      includeFitLevels: [3],
      excludePartIds,
    });
  }
}
