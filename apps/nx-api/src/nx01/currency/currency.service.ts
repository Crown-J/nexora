import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateCurrencyDto, ListCurrencyQueryDto, UpdateCurrencyDto } from './dto/currency.dto';

const SEL = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  decimalPlaces: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01CurrencyGetPayload<{ select: typeof SEL }>;

@Injectable()
export class CurrencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(q: ListCurrencyQueryDto): Prisma.Nx01CurrencyWhereInput {
    const where: Prisma.Nx01CurrencyWhereInput = {};
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

  async list(_user: RequestUser, q: ListCurrencyQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Currency.count({ where }),
      this.prisma.nx01Currency.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(_user: RequestUser, id: string) {
    const row = await this.prisma.nx01Currency.findUnique({ where: { id }, select: SEL });
    if (!row) throw new NotFoundException('Currency not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateCurrencyDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Currency.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Currency code already exists');
    const row = await this.prisma.nx01Currency.create({
      data: {
        code,
        name: dto.name.trim(),
        symbol: dto.symbol?.trim() || null,
        decimalPlaces: dto.decimalPlaces ?? 2,
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
      entityTable: 'nx01_currency',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立幣別',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateCurrencyDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Currency.findUnique({ where: { id }, select: SEL });
    if (!existing) throw new NotFoundException('Currency not found');
    const row = await this.prisma.nx01Currency.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}),
        ...(dto.decimalPlaces !== undefined ? { decimalPlaces: dto.decimalPlaces } : {}),
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
      entityTable: 'nx01_currency',
      entityId: id,
      entityCode: row.code,
      summary: '修改幣別',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Currency.findUnique({ where: { id }, select: SEL });
    if (!existing) throw new NotFoundException('Currency not found');
    const row = await this.prisma.nx01Currency.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_currency',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除幣別',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
