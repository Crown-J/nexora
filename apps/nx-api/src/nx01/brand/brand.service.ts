// apps/nx-api/src/nx01/brand/brand.service.ts
// W6 [3-8] 2026-06-06 品牌合併服務（NX-MANUAL-02 v2.0 §3.8）
//
// 合 PartBrandService + CarBrandService → 單一 BrandService。
// - isCar / isPart 雙開關：同 code 可同時是車牌 + 零件廠牌（業界 VAG 範式）
// - filter 支援：?isCar=true（車型字典 picker）/ ?isPart=true（零件 picker）
// - is_oem 不在品牌層、由零件 part.isOem 決定

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateBrandDto, ListBrandQueryDto, UpdateBrandDto } from './dto/brand.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  nameEn: true,
  countryId: true,
  logoUrl: true,
  isCar: true,
  isPart: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  country: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01BrandGetPayload<{ select: typeof SEL }>;

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListBrandQueryDto): Prisma.Nx01BrandWhereInput {
    const where: Prisma.Nx01BrandWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { nameEn: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.isCar !== undefined) where.isCar = q.isCar;
    if (q.isPart !== undefined) where.isPart = q.isPart;
    return where;
  }

  async list(user: RequestUser, q: ListBrandQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Brand.count({ where }),
      this.prisma.nx01Brand.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Brand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Brand not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateBrandDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Brand.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('品牌代碼已存在、請改用其他代碼');
    const row = await this.prisma.nx01Brand.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        countryId: dto.countryId?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        isCar: dto.isCar ?? false,
        isPart: dto.isPart ?? false,
        remark: dto.remark?.trim() || null,
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
      entityTable: 'nx01_brand',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立品牌',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateBrandDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Brand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Brand not found');
    const row = await this.prisma.nx01Brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn?.trim() || null } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId?.trim() || null } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
        ...(dto.isCar !== undefined ? { isCar: dto.isCar } : {}),
        ...(dto.isPart !== undefined ? { isPart: dto.isPart } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
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
      entityTable: 'nx01_brand',
      entityId: id,
      entityCode: row.code,
      summary: '修改品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Brand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Brand not found');
    const row = await this.prisma.nx01Brand.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_brand',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { country, ...scalar } = row;
    return {
      ...scalar,
      countryCode: country?.code ?? null,
      countryName: country?.name ?? null,
    };
  }
}
