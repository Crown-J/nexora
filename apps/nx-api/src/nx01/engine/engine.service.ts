// apps/nx-api/src/nx01/engine/engine.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-14-engine.md v1.0 §2 / §3 / §5
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCarBrandRefs } from '../../shared/nx01/resolve-brand-refs';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateEngineDto,
  ListEngineQueryDto,
  UpdateEngineDto,
} from './dto/engine.dto';

// W6-切換軌 2026-06-06：select 加 brandId + brand relation；mapRow 顯示 brand 為主、fallback carBrand
const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  displacementCc: true,
  cylinderConfig: true,
  fuelType: true,
  aspirationType: true,
  carBrandId: true,
  brandId: true,
  remark: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  carBrand: { select: { code: true, name: true } },
  brand: { select: { code: true, name: true, isCar: true, isPart: true } },
} as const;

type Row = Prisma.Nx01EngineGetPayload<{ select: typeof SEL }>;

@Injectable()
export class EngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { carBrand, brand, ...rest } = r;
    return {
      ...rest,
      // W6-切換軌：carBrandId 對前端 picker 顯示用、優先 brandId（match refOptions value）
      carBrandId: rest.brandId ?? rest.carBrandId,
      carBrandCode: brand?.code ?? carBrand?.code ?? null,
      carBrandName: brand?.name ?? carBrand?.name ?? null,
    };
  }

  private whereList(tenantId: string, q: ListEngineQueryDto): Prisma.Nx01EngineWhereInput {
    const where: Prisma.Nx01EngineWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.fuelType !== undefined) where.fuelType = q.fuelType;
    if (q.aspirationType !== undefined) where.aspirationType = q.aspirationType;
    // W6-切換軌：input 可能是 brand.id 或 car_brand.id、兩個欄位都 OR 比對
    if (q.carBrandId?.trim()) {
      const cb = q.carBrandId.trim();
      where.OR = [...(where.OR ?? []), { carBrandId: cb }, { brandId: cb }];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListEngineQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Engine.count({ where }),
      this.prisma.nx01Engine.findMany({
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
    const row = await this.prisma.nx01Engine.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Engine not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateEngineDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Engine.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Engine code already exists in this tenant');
    // W6-切換軌 2026-06-06：dto.carBrandId 可能是 brand.id（新 picker）或 car_brand.id（舊兼容）
    // helper 兩種都接、回兩個欄位 id 用於 dual-write
    const refs = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
    const row = await this.prisma.nx01Engine.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        displacementCc: dto.displacementCc ?? null,
        cylinderConfig: dto.cylinderConfig?.trim() || null,
        fuelType: dto.fuelType,
        aspirationType: dto.aspirationType ?? null,
        carBrandId: refs.carBrandId,
        brandId: refs.brandId,
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
      entityTable: 'nx01_engine',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立引擎主檔',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateEngineDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Engine.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Engine not found');
    // W6-切換軌：carBrandId dual-write（接到 input 後 dual-resolve、雙寫兩欄位）
    const brandRefs =
      dto.carBrandId !== undefined
        ? await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId)
        : null;
    const row = await this.prisma.nx01Engine.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.displacementCc !== undefined ? { displacementCc: dto.displacementCc } : {}),
        ...(dto.cylinderConfig !== undefined
          ? { cylinderConfig: dto.cylinderConfig?.trim() || null }
          : {}),
        ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
        ...(dto.aspirationType !== undefined ? { aspirationType: dto.aspirationType } : {}),
        ...(brandRefs ? { carBrandId: brandRefs.carBrandId, brandId: brandRefs.brandId } : {}),
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
      entityTable: 'nx01_engine',
      entityId: id,
      entityCode: row.code,
      summary: '修改引擎主檔',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Engine.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Engine not found');
    const row = await this.prisma.nx01Engine.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_engine',
      entityId: id,
      entityCode: row.code,
      summary: '停用引擎主檔',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
