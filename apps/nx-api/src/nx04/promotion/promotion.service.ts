// apps/nx-api/src/nx04/promotion/promotion.service.ts
// F1-D 銷貨優惠價子系統 2026-06-08：促銷規則 CRUD service（schema-only、引擎在 F1-E）
//
// 業務語意（Alex 拍板）：
//   ① Promotion = 時段 × 商品範圍 × 絕對單價（Q2）
//   ② scope 3 種：P=part / B=brand / G=partGroup（Q1）
//   ③ 同商品多優惠取最低（Q4、引擎在 F1-E）
//   ④ 即期門檻 = 全域 tenant.shelfLifeWarningDays（Q3）

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreatePromotionDto,
  CreatePromotionScopeDto,
  ListPromotionQueryDto,
  ReplacePromotionScopesDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  priceOverride: true,
  validFrom: true,
  validTo: true,
  isClearance: true,
  minBuyQty: true,
  remark: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const SCOPE_SEL = {
  id: true,
  promotionId: true,
  scopeType: true,
  scopeId: true,
  createdAt: true,
  createdBy: true,
} as const;

type Row = Prisma.Nx04PromotionGetPayload<{ select: typeof SEL }>;
type ScopeRow = Prisma.Nx04PromotionScopeGetPayload<{ select: typeof SCOPE_SEL }>;

@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(row: Row & { scopes?: ScopeRow[] }) {
    return {
      ...row,
      priceOverride: row.priceOverride.toString(),
      minBuyQty: row.minBuyQty?.toString() ?? null,
      validFrom: row.validFrom.toISOString().slice(0, 10),
      validTo: row.validTo.toISOString().slice(0, 10),
      scopes: row.scopes ?? undefined,
    };
  }

  /** validFrom <= validTo */
  private assertValidPeriod(from: Date, to: Date) {
    if (to < from) {
      throw new BadRequestException(
        `validTo (${to.toISOString().slice(0, 10)}) must be >= validFrom (${from.toISOString().slice(0, 10)})`,
      );
    }
  }

  /** scope 對應的 ref entity 存在 + tenant 一致（application 層 guard、schema 不建 FK） */
  private async assertScopeExists(tenantId: string, scopeType: string, scopeId: string): Promise<void> {
    if (scopeType === 'P') {
      const p = await this.prisma.nx01Part.findFirst({ where: { id: scopeId, tenantId }, select: { id: true } });
      if (!p) throw new BadRequestException(`partId ${scopeId} not found in tenant`);
    } else if (scopeType === 'B') {
      const b = await this.prisma.nx01Brand.findFirst({ where: { id: scopeId, tenantId }, select: { id: true } });
      if (!b) throw new BadRequestException(`brandId ${scopeId} not found in tenant`);
    } else if (scopeType === 'G') {
      const g = await this.prisma.nx01PartGroup.findFirst({ where: { id: scopeId, tenantId }, select: { id: true } });
      if (!g) throw new BadRequestException(`partGroupId ${scopeId} not found in tenant`);
    } else {
      throw new BadRequestException(`Invalid scopeType: ${scopeType}（must be P/B/G）`);
    }
  }

  private whereList(tenantId: string, q: ListPromotionQueryDto): Prisma.Nx04PromotionWhereInput {
    const where: Prisma.Nx04PromotionWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.isClearance !== undefined) where.isClearance = q.isClearance;
    return where;
  }

  async list(user: RequestUser, q: ListPromotionQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04Promotion.count({ where }),
      this.prisma.nx04Promotion.findMany({
        where,
        orderBy: [{ validFrom: 'desc' }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { ...SEL, scopes: { select: SCOPE_SEL } },
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Promotion.findFirst({
      where: { id, tenantId },
      select: { ...SEL, scopes: { select: SCOPE_SEL } },
    });
    if (!row) throw new NotFoundException('Promotion not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePromotionDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx04Promotion.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`促銷代碼 ${code} 已存在`);

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);
    this.assertValidPeriod(validFrom, validTo);

    // 驗每個 scope ref 存在
    for (const s of dto.scopes) {
      await this.assertScopeExists(tenantId, s.scopeType, s.scopeId);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const promo = await tx.nx04Promotion.create({
        data: {
          tenantId,
          code,
          name: dto.name.trim(),
          priceOverride: new PrismaNs.Decimal(dto.priceOverride),
          validFrom,
          validTo,
          isClearance: dto.isClearance ?? false,
          minBuyQty: dto.minBuyQty ? new PrismaNs.Decimal(dto.minBuyQty) : null,
          remark: dto.remark?.trim() || null,
          isActive: dto.isActive ?? true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      // 建 scopes（unique [tenantId, promotionId, scopeType, scopeId] 守重複）
      for (const s of dto.scopes) {
        await tx.nx04PromotionScope.create({
          data: {
            tenantId,
            promotionId: promo.id,
            scopeType: s.scopeType,
            scopeId: s.scopeId,
            createdBy: user.sub,
          },
        });
      }
      const full = await tx.nx04Promotion.findFirst({
        where: { id: promo.id },
        select: { ...SEL, scopes: { select: SCOPE_SEL } },
      });
      return full!;
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_promotion',
      entityId: row.id,
      entityCode: row.code,
      summary: `建立促銷規則（${dto.scopes.length} scope）`,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePromotionDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Promotion.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Promotion not found');

    // 驗時段（若都帶才比較）
    if (dto.validFrom !== undefined || dto.validTo !== undefined) {
      const from = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
      const to = dto.validTo ? new Date(dto.validTo) : existing.validTo;
      this.assertValidPeriod(from, to);
    }

    const row = await this.prisma.nx04Promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.priceOverride !== undefined ? { priceOverride: new PrismaNs.Decimal(dto.priceOverride) } : {}),
        ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validTo !== undefined ? { validTo: new Date(dto.validTo) } : {}),
        ...(dto.isClearance !== undefined ? { isClearance: dto.isClearance } : {}),
        ...(dto.minBuyQty !== undefined
          ? { minBuyQty: dto.minBuyQty ? new PrismaNs.Decimal(dto.minBuyQty) : null }
          : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: { ...SEL, scopes: { select: SCOPE_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_promotion',
      entityId: id,
      entityCode: row.code,
      summary: '修改促銷規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Promotion.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Promotion not found');
    const row = await this.prisma.nx04Promotion.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: { ...SEL, scopes: { select: SCOPE_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_promotion',
      entityId: id,
      entityCode: row.code,
      summary: '停用促銷規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  /** 整批取代 scopes（最簡介面、避免 add/remove 個別 endpoint） */
  async replaceScopes(user: RequestUser, id: string, dto: ReplacePromotionScopesDto) {
    const tenantId = requireTenantId(user);
    const promo = await this.prisma.nx04Promotion.findFirst({ where: { id, tenantId }, select: SEL });
    if (!promo) throw new NotFoundException('Promotion not found');

    for (const s of dto.scopes) {
      await this.assertScopeExists(tenantId, s.scopeType, s.scopeId);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.nx04PromotionScope.deleteMany({ where: { tenantId, promotionId: id } });
      for (const s of dto.scopes) {
        await tx.nx04PromotionScope.create({
          data: {
            tenantId,
            promotionId: id,
            scopeType: s.scopeType,
            scopeId: s.scopeId,
            createdBy: user.sub,
          },
        });
      }
      return tx.nx04Promotion.findFirst({
        where: { id },
        select: { ...SEL, scopes: { select: SCOPE_SEL } },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_promotion',
      entityId: id,
      entityCode: promo.code,
      summary: `重設範圍（${dto.scopes.length} scope）`,
      afterData: row as object,
    });
    return this.mapRow(row!);
  }

  /** F1-D 配套：讀寫全域即期門檻（tenant.shelfLifeWarningDays） */
  async getShelfLifeWarningDays(user: RequestUser): Promise<number> {
    const tenantId = requireTenantId(user);
    const t = await this.prisma.nx99Tenant.findUnique({
      where: { id: tenantId },
      select: { shelfLifeWarningDays: true },
    });
    return t?.shelfLifeWarningDays ?? 30;
  }

  async setShelfLifeWarningDays(user: RequestUser, days: number): Promise<{ shelfLifeWarningDays: number }> {
    const tenantId = requireTenantId(user);
    if (!Number.isInteger(days) || days < 0) {
      throw new BadRequestException('shelfLifeWarningDays 必須為 ≥ 0 的整數');
    }
    const t = await this.prisma.nx99Tenant.update({
      where: { id: tenantId },
      data: { shelfLifeWarningDays: days },
      select: { shelfLifeWarningDays: true },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx99_tenant',
      entityId: tenantId,
      summary: `設定即期門檻 = ${days} 天`,
      afterData: t as object,
    });
    return t;
  }
}
