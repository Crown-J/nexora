import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

import type { ListWarehouseTypeQueryDto } from './dto/warehouse-type.dto';

const SEL = {
  id: true,
  code: true,
  name: true,
  flowMode: true,
  description: true,
  sortNo: true,
  isActive: true,
} as const;

type Row = Prisma.Nx01WarehouseTypeGetPayload<{ select: typeof SEL }>;

@Injectable()
export class WarehouseTypeService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(q: ListWarehouseTypeQueryDto): Prisma.Nx01WarehouseTypeWhereInput {
    const where: Prisma.Nx01WarehouseTypeWhereInput = {};
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

  /** 不需 tenant（nx01_warehouse_type 無 tenant_id） */
  async list(_user: RequestUser, q: ListWarehouseTypeQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01WarehouseType.count({ where }),
      this.prisma.nx01WarehouseType.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r: Row) => ({ ...r })) };
  }
}
