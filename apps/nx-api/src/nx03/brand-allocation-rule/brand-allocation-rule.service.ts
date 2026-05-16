// apps/nx-api/src/nx03/brand-allocation-rule/brand-allocation-rule.service.ts
// NX03 BrandAllocationRule service（AR 配比規則 CRUD）
// 對齊 ar-overview §5 + Crown Q-B1=A / Q-S1=A / Q-M2=A
//
// 校驗範式（application 自律）：
//   - Σ (oemRatio + aftermarketRatio) ≈ 1.0（容差 0.000001、對齊 conversion costRatio 範式）
//   - validFrom < validTo（若 validTo 非空）
//   - unique [tenantId, modelId, validFrom]（schema 強制 + service 友善 throw）
//   - 重疊期間 application 自律提示（不 throw、避免太嚴）

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  BrandAllocationRuleListQueryDto,
  CreateBrandAllocationRuleDto,
  UpdateBrandAllocationRuleDto,
} from './dto/brand-allocation-rule.dto';

const RULE_SEL = {
  id: true,
  tenantId: true,
  modelId: true,
  oemRatio: true,
  aftermarketRatio: true,
  source: true,
  validFrom: true,
  validTo: true,
  isActive: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const RATIO_EPSILON = new PrismaNs.Decimal('0.000001');
const RATIO_ONE = new PrismaNs.Decimal('1');

@Injectable()
export class BrandAllocationRuleService {
  constructor(private readonly prisma: PrismaService) {}

  /** 校驗 Σ ratio ≈ 1.0、容差 0.000001。 */
  private assertRatioSumOne(oem: PrismaNs.Decimal, after: PrismaNs.Decimal) {
    const sum = oem.add(after);
    if (sum.sub(RATIO_ONE).abs().gt(RATIO_EPSILON)) {
      throw new BadRequestException(
        `oemRatio + aftermarketRatio must equal 1.0 (got ${sum.toString()})`,
      );
    }
  }

  /** 校驗 validFrom < validTo（若 validTo 非空）。 */
  private assertValidPeriod(from: Date, to: Date | null) {
    if (to && to <= from) {
      throw new BadRequestException(
        `validFrom (${from.toISOString().slice(0, 10)}) must be < validTo (${to.toISOString().slice(0, 10)})`,
      );
    }
  }

  private whereList(
    tenantId: string,
    q: BrandAllocationRuleListQueryDto,
  ): Prisma.Nx03BrandAllocationRuleWhereInput {
    const where: Prisma.Nx03BrandAllocationRuleWhereInput = { tenantId };
    if (q.modelId?.trim()) where.modelId = q.modelId.trim();
    if (q.source) where.source = q.source;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { remark: { contains: s, mode: 'insensitive' } },
        { model: { code: { contains: s, mode: 'insensitive' } } },
        { model: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  async list(user: RequestUser, q: BrandAllocationRuleListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03BrandAllocationRule.count({ where }),
      this.prisma.nx03BrandAllocationRule.findMany({
        where,
        orderBy: [{ modelId: 'asc' }, { validFrom: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...RULE_SEL,
          model: { select: { code: true, name: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03BrandAllocationRule.findFirst({
      where: { id, tenantId },
      select: {
        ...RULE_SEL,
        model: { select: { code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('BrandAllocationRule not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateBrandAllocationRuleDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    // 校驗 model 存在 + tenant 一致
    const model = await this.prisma.nx01Model.findFirst({
      where: { id: dto.modelId.trim(), tenantId },
      select: { id: true },
    });
    if (!model) throw new BadRequestException('modelId not found in tenant');

    const oem = new PrismaNs.Decimal(dto.oemRatio ?? 0.5);
    const after = new PrismaNs.Decimal(dto.aftermarketRatio ?? 0.5);
    this.assertRatioSumOne(oem, after);

    const validFrom = new Date(dto.validFrom);
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    this.assertValidPeriod(validFrom, validTo);

    // schema unique [tenantId, modelId, validFrom] 校驗（提前 throw 友善訊息）
    const dup = await this.prisma.nx03BrandAllocationRule.findFirst({
      where: { tenantId, modelId: model.id, validFrom },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException(
        `BrandAllocationRule already exists for modelId=${model.id} validFrom=${dto.validFrom} (id=${dup.id})`,
      );
    }

    return this.prisma.nx03BrandAllocationRule.create({
      data: {
        tenantId,
        modelId: model.id,
        oemRatio: oem,
        aftermarketRatio: after,
        source: dto.source ?? 'S',
        validFrom,
        validTo,
        isActive: true,
        remark: dto.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
      select: RULE_SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateBrandAllocationRuleDto) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;

    const existing = await this.prisma.nx03BrandAllocationRule.findFirst({
      where: { id, tenantId },
      select: RULE_SEL,
    });
    if (!existing) throw new NotFoundException('BrandAllocationRule not found');

    // ratio 部分變更時、校驗 Σ 仍 = 1.0（取 incoming or existing）
    const nextOem =
      dto.oemRatio !== undefined ? new PrismaNs.Decimal(dto.oemRatio) : new PrismaNs.Decimal(existing.oemRatio);
    const nextAfter =
      dto.aftermarketRatio !== undefined
        ? new PrismaNs.Decimal(dto.aftermarketRatio)
        : new PrismaNs.Decimal(existing.aftermarketRatio);
    if (dto.oemRatio !== undefined || dto.aftermarketRatio !== undefined) {
      this.assertRatioSumOne(nextOem, nextAfter);
    }

    // validTo 變更時、校驗 validFrom < validTo
    if (dto.validTo !== undefined) {
      const nextTo = dto.validTo ? new Date(dto.validTo) : null;
      this.assertValidPeriod(existing.validFrom, nextTo);
    }

    const data: Prisma.Nx03BrandAllocationRuleUpdateInput = { updatedBy: userId };
    if (dto.oemRatio !== undefined) data.oemRatio = nextOem;
    if (dto.aftermarketRatio !== undefined) data.aftermarketRatio = nextAfter;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.validTo !== undefined) data.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.remark !== undefined) data.remark = dto.remark?.trim() || null;

    return this.prisma.nx03BrandAllocationRule.update({
      where: { id },
      data,
      select: RULE_SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const userId = user.sub;
    const existing = await this.prisma.nx03BrandAllocationRule.findFirst({
      where: { id, tenantId },
      select: { id: true, isActive: true },
    });
    if (!existing) throw new NotFoundException('BrandAllocationRule not found');
    if (!existing.isActive) return { ok: true, alreadyInactive: true };
    await this.prisma.nx03BrandAllocationRule.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
    return { ok: true };
  }
}
