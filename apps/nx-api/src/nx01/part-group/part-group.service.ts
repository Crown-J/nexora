// apps/nx-api/src/nx01/part-group/part-group.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0 (part_group 子段)
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreatePartGroupDto,
  ListPartGroupQueryDto,
  UpdatePartGroupDto,
} from './dto/part-group.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PartGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListPartGroupQueryDto): Prisma.Nx01PartGroupWhereInput {
    const where: Prisma.Nx01PartGroupWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListPartGroupQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartGroup.count({ where }),
      this.prisma.nx01PartGroup.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartGroup.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Part group not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePartGroupDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01PartGroup.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Part group code already exists in this tenant');
    const row = await this.prisma.nx01PartGroup.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
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
      entityTable: 'nx01_part_group',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立料件分類',
      afterData: row as object,
    });
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdatePartGroupDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartGroup.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part group not found');
    const row = await this.prisma.nx01PartGroup.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
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
      entityTable: 'nx01_part_group',
      entityId: id,
      entityCode: row.code,
      summary: '修改料件分類',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartGroup.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Part group not found');
    const row = await this.prisma.nx01PartGroup.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_part_group',
      entityId: id,
      entityCode: row.code,
      summary: '停用料件分類',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
