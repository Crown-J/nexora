// apps/nx-api/src/nx01/car-brand/car-brand.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-12-car-brand.md v1.0 §2 / §3 / §5
// SYSTEM seed code lock guard（Crown 拍 Q5=B）
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateCarBrandDto,
  ListCarBrandQueryDto,
  UpdateCarBrandDto,
} from './dto/car-brand.dto';

/** SYSTEM seed 4 主流品牌（Crown 拍 Q5=B：code 鎖、其他欄位 tenant 可調） */
const SYSTEM_SEED_CODES = new Set(['VAG', 'POR', 'BMW', 'BEN']);

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  nameEn: true,
  countryId: true,
  logoUrl: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  country: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01CarBrandGetPayload<{ select: typeof SEL }>;

@Injectable()
export class CarBrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { country, ...rest } = r;
    return {
      ...rest,
      countryCode: country?.code ?? null,
      countryName: country?.name ?? null,
      isSystemSeed: SYSTEM_SEED_CODES.has(r.code),
    };
  }

  private whereList(tenantId: string, q: ListCarBrandQueryDto): Prisma.Nx01CarBrandWhereInput {
    const where: Prisma.Nx01CarBrandWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { nameEn: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListCarBrandQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01CarBrand.count({ where }),
      this.prisma.nx01CarBrand.findMany({
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
    const row = await this.prisma.nx01CarBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Car brand not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateCarBrandDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01CarBrand.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Car brand code already exists in this tenant');
    const row = await this.prisma.nx01CarBrand.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        countryId: dto.countryId?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
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
      entityTable: 'nx01_car_brand',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立車型品牌',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateCarBrandDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01CarBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Car brand not found');

    // Crown 拍 Q5=B + 規格 §2.2 / §5.6：SYSTEM seed 4 主流品牌 code 鎖
    const isSystemSeed = SYSTEM_SEED_CODES.has(existing.code);
    if (
      isSystemSeed &&
      dto.code !== undefined &&
      dto.code.trim().toUpperCase() !== existing.code
    ) {
      throw new BadRequestException(
        `System seed car brand "${existing.code}" code is locked (Q5=B)`,
      );
    }

    const row = await this.prisma.nx01CarBrand.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && !isSystemSeed
          ? { code: dto.code.trim().toUpperCase() }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn?.trim() || null } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
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
      entityTable: 'nx01_car_brand',
      entityId: id,
      entityCode: row.code,
      summary: '修改車型品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01CarBrand.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Car brand not found');

    // 規格 §3.5：SYSTEM seed 4 個不可真刪、只能停用
    const row = await this.prisma.nx01CarBrand.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_car_brand',
      entityId: id,
      entityCode: row.code,
      summary: '停用車型品牌',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
