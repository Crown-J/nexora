import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePartBrandDto, ListPartBrandQueryDto, UpdatePartBrandDto } from './dto/part-brand.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  countryId: true,
  isOem: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01PartBrandGetPayload<{ select: typeof SEL }>;

@Injectable()
export class PartBrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListPartBrandQueryDto): Prisma.Nx01PartBrandWhereInput {
    const where: Prisma.Nx01PartBrandWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListPartBrandQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartBrand.count({ where }),
      this.prisma.nx01PartBrand.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part brand not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreatePartBrandDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01PartBrand.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Part brand code already exists');
    const row = await this.prisma.nx01PartBrand.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        countryId: dto.countryId?.trim() || null,
        isOem: dto.isOem ?? false,
        remark: dto.remark?.trim() || null,
        sortNo: dto.sortNo ?? 0,
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
      entityTable: 'nx01_part_brand',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立零件品牌',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdatePartBrandDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part brand not found');
    const row = await this.prisma.nx01PartBrand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.isOem !== undefined ? { isOem: dto.isOem } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
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
      entityTable: 'nx01_part_brand',
      entityId: id,
      entityCode: row.code,
      summary: '修改零件品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Part brand not found');
    const row = await this.prisma.nx01PartBrand.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_brand',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除零件品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
