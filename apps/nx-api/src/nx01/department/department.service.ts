// apps/nx-api/src/nx01/department/department.service.ts
// 02 第三批 T1 後續 2026-06-07：部門主檔 CRUD（仿 region 範式）
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateDepartmentDto, ListDepartmentQueryDto, UpdateDepartmentDto } from './dto/department.dto';

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
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListDepartmentQueryDto): Prisma.Nx01DepartmentWhereInput {
    const where: Prisma.Nx01DepartmentWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListDepartmentQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Department.count({ where }),
      this.prisma.nx01Department.findMany({
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
    const row = await this.prisma.nx01Department.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Department not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateDepartmentDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Department.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('部門代碼已存在');
    const row = await this.prisma.nx01Department.create({
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
      entityTable: 'nx01_department',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立部門',
      afterData: row as object,
    });
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateDepartmentDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Department.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Department not found');
    const row = await this.prisma.nx01Department.update({
      where: { id },
      data: {
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
      entityTable: 'nx01_department',
      entityId: id,
      entityCode: row.code,
      summary: '修改部門',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Department.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Department not found');
    const row = await this.prisma.nx01Department.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_department',
      entityId: id,
      entityCode: row.code,
      summary: '停用部門',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
