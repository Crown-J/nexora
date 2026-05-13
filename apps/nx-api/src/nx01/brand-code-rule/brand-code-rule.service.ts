// apps/nx-api/src/nx01/brand-code-rule/brand-code-rule.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-11-brand-code-rule.md v1.0 §2 / §3 / §5
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateBrandCodeRuleDto,
  ListBrandCodeRuleQueryDto,
  SegDefinitionDto,
  UpdateBrandCodeRuleDto,
} from './dto/brand-code-rule.dto';

const SEL = {
  id: true,
  tenantId: true,
  carBrandId: true,
  name: true,
  description: true,
  segCount: true,
  segDefinitions: true,
  separator: true,
  sourceCodePrefix: true,
  sourceCodeFormat: true,
  examplePartCode: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  carBrand: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01BrandCodeRuleGetPayload<{ select: typeof SEL }>;

@Injectable()
export class BrandCodeRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { carBrand, ...rest } = r;
    return {
      ...rest,
      carBrandCode: carBrand?.code ?? null,
      carBrandName: carBrand?.name ?? null,
    };
  }

  private validateSegDefinitions(segCount: number, segDefinitions: SegDefinitionDto[]) {
    if (segDefinitions.length !== segCount) {
      throw new BadRequestException(
        `segDefinitions length (${segDefinitions.length}) must equal segCount (${segCount})`,
      );
    }
    for (const seg of segDefinitions) {
      if (seg.length_min > seg.length_max) {
        throw new BadRequestException(
          `SEG${seg.seg_no} length_min (${seg.length_min}) > length_max (${seg.length_max})`,
        );
      }
    }
  }

  private whereList(
    tenantId: string,
    q: ListBrandCodeRuleQueryDto,
  ): Prisma.Nx01BrandCodeRuleWhereInput {
    const where: Prisma.Nx01BrandCodeRuleWhereInput = { tenantId };
    if (q.search?.trim()) {
      where.name = { contains: q.search.trim(), mode: 'insensitive' };
    }
    if (q.carBrandId?.trim()) where.carBrandId = q.carBrandId.trim();
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
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Brand code rule not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateBrandCodeRuleDto) {
    const tenantId = requireTenantId(user);
    this.validateSegDefinitions(dto.segCount, dto.segDefinitions);

    // 規格 §3.1：每租戶內、一個 car_brand 只能有 1 條規則
    const dup = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { tenantId, carBrandId: dto.carBrandId },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException('Car brand already has a code rule in this tenant');
    }

    const row = await this.prisma.nx01BrandCodeRule.create({
      data: {
        tenantId,
        carBrandId: dto.carBrandId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        segCount: dto.segCount,
        segDefinitions: dto.segDefinitions as unknown as Prisma.InputJsonValue,
        separator: dto.separator ?? '·',
        sourceCodePrefix: dto.sourceCodePrefix ?? '#',
        examplePartCode: dto.examplePartCode?.trim() || null,
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
      summary: '建立品牌編碼規則',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateBrandCodeRuleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Brand code rule not found');

    if (dto.segCount !== undefined && dto.segDefinitions !== undefined) {
      this.validateSegDefinitions(dto.segCount, dto.segDefinitions);
    } else if (dto.segDefinitions !== undefined && dto.segCount === undefined) {
      this.validateSegDefinitions(existing.segCount, dto.segDefinitions);
    }

    const row = await this.prisma.nx01BrandCodeRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.segCount !== undefined ? { segCount: dto.segCount } : {}),
        ...(dto.segDefinitions !== undefined
          ? { segDefinitions: dto.segDefinitions as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.separator !== undefined ? { separator: dto.separator } : {}),
        ...(dto.sourceCodePrefix !== undefined ? { sourceCodePrefix: dto.sourceCodePrefix } : {}),
        ...(dto.examplePartCode !== undefined ? { examplePartCode: dto.examplePartCode } : {}),
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
      summary: '修改品牌編碼規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01BrandCodeRule.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
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
      summary: '停用品牌編碼規則',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
