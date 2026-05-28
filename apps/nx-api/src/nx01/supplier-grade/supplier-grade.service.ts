// apps/nx-api/src/nx01/supplier-grade/supplier-grade.service.ts
// LITE 階段 1 M2-c：供應商分級 service（CRUD）。
// 對齊 customer-grade service 範式。
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  ListSupplierGradeQueryDto,
  UpdateSupplierGradeDto,
} from './dto/supplier-grade.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01SupplierGradeGetPayload<{ select: typeof SEL }>;

@Injectable()
export class SupplierGradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(
    tenantId: string,
    q: ListSupplierGradeQueryDto,
  ): Prisma.Nx01SupplierGradeWhereInput {
    const where: Prisma.Nx01SupplierGradeWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListSupplierGradeQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01SupplierGrade.count({ where }),
      this.prisma.nx01SupplierGrade.findMany({
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
    const row = await this.prisma.nx01SupplierGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Supplier grade not found');
    return row;
  }

  /**
   * M2-c：OWNER 可改 name / description / sortNo / isActive。
   * code 鎖（A/B/C/D 4 級固定、DTO 層已 whitelist 過濾）。
   */
  async update(user: RequestUser, id: string, dto: UpdateSupplierGradeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01SupplierGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Supplier grade not found');
    const row = await this.prisma.nx01SupplierGrade.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
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
      entityTable: 'nx01_supplier_grade',
      entityId: id,
      entityCode: row.code,
      summary: '修改供應商分級（name/description/sortNo/isActive）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
