// apps/nx-api/src/nx01/transmission/transmission.service.ts
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §2 / §3
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCarBrandRefs } from '../../shared/nx01/resolve-brand-refs';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateTransmissionDto,
  ListTransmissionQueryDto,
  UpdateTransmissionDto,
} from './dto/transmission.dto';

// W6-切換軌 2026-06-06：select 加 brandId + brand relation；mapRow brand 為主
const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  nameEn: true,
  transmissionType: true,
  gearCount: true,
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

type Row = Prisma.Nx01TransmissionGetPayload<{ select: typeof SEL }>;

@Injectable()
export class TransmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapRow(r: Row) {
    const { carBrand, brand, ...rest } = r;
    return {
      ...rest,
      // W6-切換軌：carBrandId 對前端 picker 顯示用、優先 brandId
      carBrandId: rest.brandId ?? rest.carBrandId,
      carBrandCode: brand?.code ?? carBrand?.code ?? null,
      carBrandName: brand?.name ?? carBrand?.name ?? null,
    };
  }

  private whereList(
    tenantId: string,
    q: ListTransmissionQueryDto,
  ): Prisma.Nx01TransmissionWhereInput {
    const where: Prisma.Nx01TransmissionWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.transmissionType !== undefined) where.transmissionType = q.transmissionType;
    // W6-切換軌：input 可能是 brand.id 或 car_brand.id
    if (q.carBrandId?.trim()) {
      const cb = q.carBrandId.trim();
      where.OR = [...(where.OR ?? []), { carBrandId: cb }, { brandId: cb }];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListTransmissionQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01Transmission.count({ where }),
      this.prisma.nx01Transmission.findMany({
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
    const row = await this.prisma.nx01Transmission.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Transmission not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateTransmissionDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Transmission.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Transmission code already exists in this tenant');
    // W6-切換軌：dual-resolve carBrandId（接 brand.id 或 car_brand.id）
    const refs = await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId);
    const row = await this.prisma.nx01Transmission.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        transmissionType: dto.transmissionType,
        gearCount: dto.gearCount ?? null,
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
      entityTable: 'nx01_transmission',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立變速箱型錄',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateTransmissionDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Transmission.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Transmission not found');
    // W6-切換軌：dual-resolve carBrandId
    const brandRefs =
      dto.carBrandId !== undefined
        ? await resolveCarBrandRefs(this.prisma, tenantId, dto.carBrandId)
        : null;
    const row = await this.prisma.nx01Transmission.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn?.trim() || null } : {}),
        ...(dto.transmissionType !== undefined ? { transmissionType: dto.transmissionType } : {}),
        ...(dto.gearCount !== undefined ? { gearCount: dto.gearCount } : {}),
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
      entityTable: 'nx01_transmission',
      entityId: id,
      entityCode: row.code,
      summary: '修改變速箱型錄',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Transmission.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Transmission not found');
    const row = await this.prisma.nx01Transmission.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_transmission',
      entityId: id,
      entityCode: row.code,
      summary: '停用變速箱型錄',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }
}
