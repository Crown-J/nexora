// apps/nx-api/src/nx01/brand-code-rule/brand-code-rule.service.ts
// 下半場 A：軸翻轉 carBrandId → partBrandId、拿掉 JSON segDefinitions、改 SEG1~5 字數欄位。
// 同一零件品牌可有多個規則（以 name 區分）；範例料號改前端即時預覽（不存 DB）。
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateBrandCodeRuleDto,
  ListBrandCodeRuleQueryDto,
  UpdateBrandCodeRuleDto,
} from './dto/brand-code-rule.dto';

const SEL = {
  id: true,
  tenantId: true,
  partBrandId: true,
  name: true,
  description: true,
  seg1Length: true,
  seg2Length: true,
  seg3Length: true,
  seg4Length: true,
  seg5Length: true,
  separator: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class BrandCodeRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 確認 partBrandId 屬同租戶（外鍵防呆） */
  private async verifyPartBrand(tenantId: string, partBrandId: string): Promise<void> {
    const pb = await this.prisma.nx01PartBrand.findFirst({
      where: { id: partBrandId, tenantId },
      select: { id: true },
    });
    if (!pb) throw new ConflictException('Part brand not found in tenant');
  }

  private whereList(
    tenantId: string,
    q: ListBrandCodeRuleQueryDto,
  ): Prisma.Nx01BrandCodeRuleWhereInput {
    const where: Prisma.Nx01BrandCodeRuleWhereInput = { tenantId };
    if (q.search?.trim()) {
      where.name = { contains: q.search.trim(), mode: 'insensitive' };
    }
    if (q.partBrandId?.trim()) where.partBrandId = q.partBrandId.trim();
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListBrandCodeRuleQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01BrandCodeRule.count({ where }),
      this.prisma.nx01BrandCodeRule.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01BrandCodeRule.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Brand code rule not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateBrandCodeRuleDto) {
    const tenantId = requireTenantId(user);
    await this.verifyPartBrand(tenantId, dto.partBrandId);

    // 同品牌可多規則、但同品牌內 name 不可重複（對齊 @@unique([tenantId, partBrandId, name])）
    const dup = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { tenantId, partBrandId: dto.partBrandId, name: dto.name.trim() },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Rule name already exists for this part brand');

    const row = await this.prisma.nx01BrandCodeRule.create({
      data: {
        tenantId,
        partBrandId: dto.partBrandId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        seg1Length: dto.seg1Length,
        seg2Length: dto.seg2Length,
        seg3Length: dto.seg3Length,
        seg4Length: dto.seg4Length ?? 0,
        seg5Length: dto.seg5Length ?? 0,
        separator: dto.separator ?? '·',
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_brand_code_rule',
      entityId: row.id,
      entityCode: row.name,
      summary: '建立品牌料號規則',
      afterData: row as object,
    });
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateBrandCodeRuleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01BrandCodeRule.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Brand code rule not found');

    const row = await this.prisma.nx01BrandCodeRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.seg1Length !== undefined ? { seg1Length: dto.seg1Length } : {}),
        ...(dto.seg2Length !== undefined ? { seg2Length: dto.seg2Length } : {}),
        ...(dto.seg3Length !== undefined ? { seg3Length: dto.seg3Length } : {}),
        ...(dto.seg4Length !== undefined ? { seg4Length: dto.seg4Length } : {}),
        ...(dto.seg5Length !== undefined ? { seg5Length: dto.seg5Length } : {}),
        ...(dto.separator !== undefined ? { separator: dto.separator } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_brand_code_rule',
      entityId: id,
      entityCode: row.name,
      summary: '修改品牌料號規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01BrandCodeRule.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Brand code rule not found');
    const row = await this.prisma.nx01BrandCodeRule.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_brand_code_rule',
      entityId: id,
      entityCode: row.name,
      summary: '停用品牌料號規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
