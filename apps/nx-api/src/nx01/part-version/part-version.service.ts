// apps/nx-api/src/nx01/part-version/part-version.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
// part_version 是 read-only service（write 由 part.service.update tx 同步寫、不在此暴露）
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { ListPartVersionQueryDto } from './dto/part-version.dto';

const SEL = {
  id: true,
  tenantId: true,
  partId: true,
  versionNo: true,
  effectiveFrom: true,
  effectiveTo: true,
  codeSnapshot: true,
  nameSnapshot: true,
  partBrandIdSnapshot: true,
  countryIdSnapshot: true,
  specSnapshot: true,
  priceASnapshot: true,
  priceBSnapshot: true,
  priceCSnapshot: true,
  priceDSnapshot: true,
  changeReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01PartVersionGetPayload<{ select: typeof SEL }>;

function decimalStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    return (v as { toString(): string }).toString();
  }
  return String(v);
}

function mapRow(r: Row) {
  return {
    ...r,
    priceASnapshot: decimalStr(r.priceASnapshot),
    priceBSnapshot: decimalStr(r.priceBSnapshot),
    priceCSnapshot: decimalStr(r.priceCSnapshot),
    priceDSnapshot: decimalStr(r.priceDSnapshot),
  };
}

@Injectable()
export class PartVersionService {
  constructor(private readonly prisma: PrismaService) {}

  private whereList(
    tenantId: string,
    q: ListPartVersionQueryDto,
  ): Prisma.Nx01PartVersionWhereInput {
    const where: Prisma.Nx01PartVersionWhereInput = { tenantId };
    if (q.partId?.trim()) where.partId = q.partId.trim();
    if (q.versionNo !== undefined) where.versionNo = q.versionNo;
    return where;
  }

  async list(user: RequestUser, q: ListPartVersionQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01PartVersion.count({ where }),
      this.prisma.nx01PartVersion.findMany({
        where,
        orderBy: [{ partId: 'asc' }, { versionNo: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map(mapRow) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01PartVersion.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Part version not found');
    return mapRow(row);
  }
}
