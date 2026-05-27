// apps/nx-api/src/nx01/country/country.service.ts
/**
 * Country Service —— 補上缺漏的國家主檔 REST（系統層參考資料、無 tenant）。
 *
 * 對齊 Currency（同為系統表）：list / getById 不過濾 tenant；create / update / softDelete 寫 audit。
 * 解前端 refBasePath '/country' → 'nx01/countries' 404 導致車廠品牌 / 零件廠牌「國別」下拉顯示內碼的問題。
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreateCountryDto, ListCountryQueryDto, UpdateCountryDto } from './dto/country.dto';

const SEL = {
  id: true,
  code: true,
  name: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01CountryGetPayload<{ select: typeof SEL }>;

@Injectable()
export class CountryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(q: ListCountryQueryDto): Prisma.Nx01CountryWhereInput {
    const where: Prisma.Nx01CountryWhereInput = {};
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

  async list(_user: RequestUser, q: ListCountryQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Country.count({ where }),
      this.prisma.nx01Country.findMany({
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
    const row = await this.prisma.nx01Country.findUnique({ where: { id }, select: SEL });
    if (!row) throw new NotFoundException('Country not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateCountryDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Country.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Country code already exists');
    const row = await this.prisma.nx01Country.create({
      data: {
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
      entityTable: 'nx01_country',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立國家',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateCountryDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Country.findUnique({ where: { id }, select: SEL });
    if (!existing) throw new NotFoundException('Country not found');
    const row = await this.prisma.nx01Country.update({
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
      entityTable: 'nx01_country',
      entityId: id,
      entityCode: row.code,
      summary: '修改國家',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Country.findUnique({ where: { id }, select: SEL });
    if (!existing) throw new NotFoundException('Country not found');
    const row = await this.prisma.nx01Country.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_country',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除國家',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    return { ...row };
  }
}
