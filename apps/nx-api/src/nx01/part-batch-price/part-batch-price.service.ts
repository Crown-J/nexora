// apps/nx-api/src/nx01/part-batch-price/part-batch-price.service.ts
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具（漲價潮一鍵調四價的維運工具）
//
// 拍板（2026-07-11）：靜態四價方向不變（不做偉盟動態訂價碼）、只補批次維運工具；
//   留痕=稽核日誌（0 schema）+ Part.priceUpdatedAt/By 戳記；歷次調價紀錄表用到再加。
//
// 業務規則：
//   - 只調「原價 > 0」的欄位（0 = 未定價、不因固定額調整被誤設起價）
//   - 調完 GREATEST(0, x) 防負價（降價 / 負調幅）
//   - 完全沒設 filter = 全庫調價、必須明示 confirmAll（防手滑）
//   - apply 用單發 SQL UPDATE（萬顆級料號秒級完成、不逐顆 roundtrip）；
//     preview 只算前 200 顆顯示 + 總數（apply 依 filter 現值重算、與 preview 間的價格變動以現值為準）

import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  BatchPriceAdjustDto,
  BatchPriceFilterDto,
  BatchPricePayloadDto,
  PriceTarget,
} from './dto/part-batch-price.dto';

const PRICE_COL: Record<PriceTarget, string> = {
  A: 'price_a',
  B: 'price_b',
  C: 'price_c',
  D: 'price_d',
};

const PREVIEW_LIMIT = 200;

@Injectable()
export class PartBatchPriceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private hasAnyFilter(f: BatchPriceFilterDto): boolean {
    return !!(
      f.brandId?.trim() ||
      f.partGroupId?.trim() ||
      f.purchaseCategory != null ||
      f.techCategory != null ||
      f.isOem != null ||
      f.search?.trim()
    );
  }

  private assertAdjust(a: BatchPriceAdjustDto): void {
    if (a.mode === 'PCT' && (a.value < -90 || a.value > 500)) {
      throw new BadRequestException('百分比調幅限 -90% ~ +500%');
    }
    if (a.mode === 'AMT' && Math.abs(a.value) > 100000) {
      throw new BadRequestException('固定額調幅限 ±100,000');
    }
    if (a.value === 0) throw new BadRequestException('調幅不可為 0');
  }

  private whereList(tenantId: string, f: BatchPriceFilterDto): Prisma.Nx01PartWhereInput {
    const where: Prisma.Nx01PartWhereInput = { tenantId, isActive: true };
    if (f.brandId?.trim()) where.brandId = f.brandId.trim();
    if (f.partGroupId?.trim()) where.partGroupId = f.partGroupId.trim();
    if (f.purchaseCategory != null) where.purchaseCategory = f.purchaseCategory;
    if (f.techCategory != null) where.techCategory = f.techCategory;
    if (f.isOem != null) where.isOem = f.isOem;
    if (f.search?.trim()) {
      const s = f.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { secCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /** preview / apply 共用計價（preview JS 算、apply SQL 算、公式一致） */
  private computeNew(old: number, a: BatchPriceAdjustDto): number {
    if (old <= 0) return old; // 未定價不動
    const raw = a.mode === 'PCT' ? old * (1 + a.value / 100) : old + a.value;
    const rounded = a.rounding === 'INT' ? Math.round(raw) : Math.round(raw * 10000) / 10000;
    return Math.max(0, rounded);
  }

  async preview(user: RequestUser, dto: BatchPricePayloadDto) {
    const tenantId = requireTenantId(user);
    this.assertAdjust(dto.adjust);
    const where = this.whereList(tenantId, dto.filter);
    const [total, parts] = await Promise.all([
      this.prisma.nx01Part.count({ where }),
      this.prisma.nx01Part.findMany({
        where,
        orderBy: { code: 'asc' },
        take: PREVIEW_LIMIT,
        select: { id: true, code: true, name: true, priceA: true, priceB: true, priceC: true, priceD: true },
      }),
    ]);
    const rows = parts.map((p) => {
      const olds = { A: Number(p.priceA ?? 0), B: Number(p.priceB ?? 0), C: Number(p.priceC ?? 0), D: Number(p.priceD ?? 0) };
      const news: Partial<Record<PriceTarget, number>> = {};
      for (const t of dto.adjust.targets) news[t] = this.computeNew(olds[t], dto.adjust);
      return { partId: p.id, code: p.code, name: p.name, old: olds, new: news };
    });
    return { total, previewLimit: PREVIEW_LIMIT, rows };
  }

  async apply(user: RequestUser, dto: BatchPricePayloadDto) {
    const tenantId = requireTenantId(user);
    this.assertAdjust(dto.adjust);
    if (!this.hasAnyFilter(dto.filter) && !dto.confirmAll) {
      throw new BadRequestException('未設任何篩選＝全庫調價、需明示 confirmAll 確認');
    }

    // WHERE 片段（與 whereList 同義、raw SQL 版）
    const conds: PrismaNs.Sql[] = [
      PrismaNs.sql`tenant_id = ${tenantId}`,
      PrismaNs.sql`is_active = true`,
    ];
    const f = dto.filter;
    if (f.brandId?.trim()) conds.push(PrismaNs.sql`brand_id = ${f.brandId.trim()}`);
    if (f.partGroupId?.trim()) conds.push(PrismaNs.sql`part_group_id = ${f.partGroupId.trim()}`);
    if (f.purchaseCategory != null) conds.push(PrismaNs.sql`purchase_category = ${f.purchaseCategory}`);
    if (f.techCategory != null) conds.push(PrismaNs.sql`tech_category = ${f.techCategory}`);
    if (f.isOem != null) conds.push(PrismaNs.sql`is_oem = ${f.isOem}`);
    if (f.search?.trim()) {
      const like = `%${f.search.trim()}%`;
      conds.push(PrismaNs.sql`(code ILIKE ${like} OR name ILIKE ${like} OR sec_code ILIKE ${like})`);
    }

    // SET 片段：只動原價 > 0 的欄位、GREATEST(0,·) 防負價
    const a = dto.adjust;
    const factor = a.mode === 'PCT' ? 1 + a.value / 100 : 1;
    const delta = a.mode === 'AMT' ? a.value : 0;
    const sets: PrismaNs.Sql[] = a.targets.map((t) => {
      const col = PrismaNs.raw(PRICE_COL[t]);
      const expr = PrismaNs.sql`(${col} * CAST(${factor} AS numeric) + CAST(${delta} AS numeric))`;
      const rounded = a.rounding === 'INT' ? PrismaNs.sql`ROUND(${expr})` : PrismaNs.sql`ROUND(${expr}, 4)`;
      return PrismaNs.sql`${col} = CASE WHEN ${col} > 0 THEN GREATEST(0, ${rounded}) ELSE ${col} END`;
    });
    sets.push(PrismaNs.sql`price_updated_at = NOW()`);
    sets.push(PrismaNs.sql`price_updated_by = ${user.sub}`);
    sets.push(PrismaNs.sql`updated_at = NOW()`);
    sets.push(PrismaNs.sql`updated_by = ${user.sub}`);

    const affected = await this.prisma.$executeRaw(
      PrismaNs.sql`UPDATE nx01_part SET ${PrismaNs.join(sets, ', ')} WHERE ${PrismaNs.join(conds, ' AND ')}`,
    );

    const filterDesc = this.hasAnyFilter(f)
      ? JSON.stringify(f)
      : '（全庫、confirmAll）';
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_part',
      entityId: 'BATCH-PRICE',
      entityCode: 'BATCH-PRICE',
      summary: `批次調價：${a.targets.join('/')} 價 ${a.mode === 'PCT' ? `${a.value > 0 ? '+' : ''}${a.value}%` : `${a.value > 0 ? '+' : ''}${a.value} 元`}（${a.rounding === 'INT' ? '取整' : '留 4 位'}）、範圍 ${filterDesc}、影響 ${affected} 顆`,
      afterData: { filter: f, adjust: a, affected } as object,
    });

    return { affected };
  }
}
