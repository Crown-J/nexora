import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { ListCustomerGradeQueryDto } from './dto/customer-grade.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  marginPct: true,
  sortNo: true,
  isActive: true,
} as const;

type Row = Prisma.Nx01CustomerGradeGetPayload<{ select: typeof SEL }>;

@Injectable()
export class CustomerGradeService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(tenantId: string, q: ListCustomerGradeQueryDto): Prisma.Nx01CustomerGradeWhereInput {
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
    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => ({
        ...r,
        marginPct: r.marginPct == null ? null : String(r.marginPct),
      })),
    };
  }
}
