// apps/nx-api/src/nx01/customer-grade/customer-grade.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0
// Crown 拍 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive、code 鎖
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  ListCustomerGradeQueryDto,
  UpdateCustomerGradeDto,
} from './dto/customer-grade.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  marginPct: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01CustomerGradeGetPayload<{ select: typeof SEL }>;

function mapRow(r: Row) {
  return {
    ...r,
    marginPct: r.marginPct == null ? null : String(r.marginPct),
  };
}

@Injectable()
export class CustomerGradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(
    tenantId: string,
    q: ListCustomerGradeQueryDto,
  ): Prisma.Nx01CustomerGradeWhereInput {
    const where: Prisma.Nx01CustomerGradeWhereInput = { tenantId };
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

  async list(user: RequestUser, q: ListCustomerGradeQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01CustomerGrade.count({ where }),
      this.prisma.nx01CustomerGrade.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map(mapRow) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01CustomerGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Customer grade not found');
    return mapRow(row);
  }

  /**
   * 規格 §6 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive、code 鎖
   * DTO 層已不含 code（whitelist ValidationPipe 自動防護）、service 無需再 guard
   */
  async update(user: RequestUser, id: string, dto: UpdateCustomerGradeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01CustomerGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Customer grade not found');
    const row = await this.prisma.nx01CustomerGrade.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.marginPct !== undefined
          ? { marginPct: new Prisma.Decimal(dto.marginPct) }
          : {}),
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
      entityTable: 'nx01_customer_grade',
      entityId: id,
      entityCode: row.code,
      summary: '修改客戶分級（marginPct/name/sortNo/isActive）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return mapRow(row);
  }
}
