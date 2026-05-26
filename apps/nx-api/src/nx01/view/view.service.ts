// apps/nx-api/src/nx01/view/view.service.ts
/**
 * View Service（補後端軌：畫面字典、唯讀）
 *
 * Nx01View 是系統層畫面字典（無租戶欄位、跨租戶共用），供 role-view 權限指派的 viewId 下拉。
 * 唯讀：只提供 list / getById（畫面清單由系統 seed 維護）。
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';
import { Nx01ListQueryDto } from '../../shared/nx01/pagination.dto';

const SEL = {
  id: true,
  code: true,
  name: true,
  moduleCode: true,
  path: true,
  sortNo: true,
  isActive: true,
} as const;

@Injectable()
export class ViewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: Nx01ListQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01ViewWhereInput = {};
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { moduleCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    const [total, rows] = await Promise.all([
      this.prisma.nx01View.count({ where }),
      this.prisma.nx01View.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(id: string) {
    const row = await this.prisma.nx01View.findUnique({ where: { id }, select: SEL });
    if (!row) throw new NotFoundException('View not found');
    return row;
  }
}
