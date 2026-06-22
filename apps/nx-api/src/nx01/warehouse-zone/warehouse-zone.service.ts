// apps/nx-api/src/nx01/warehouse-zone/warehouse-zone.service.ts
// 倉庫分區 service（2026-06-22 執行長拍板新增四層架構）
//
// schema unique = (tenantId, warehouseId, code)：同倉內 code 唯一
// service 層守：warehouseId 必須屬於該 tenant
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreateWarehouseZoneDto,
  ListWarehouseZoneQueryDto,
  UpdateWarehouseZoneDto,
} from './dto/warehouse-zone.dto';

const SEL = {
  id: true,
  tenantId: true,
  warehouseId: true,
  code: true,
  name: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  warehouse: { select: { code: true, name: true } },
} as const;

@Injectable()
export class WarehouseZoneService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWarehouseInTenant(tenantId: string, warehouseId: string) {
    const wh = await this.prisma.nx01Warehouse.findFirst({
      where: { id: warehouseId, tenantId },
      select: { id: true },
    });
    if (!wh) throw new BadRequestException(`warehouseId not found in tenant`);
  }

  async list(user: RequestUser, q: ListWarehouseZoneQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01WarehouseZoneWhereInput = { tenantId };
    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    const [total, rows] = await Promise.all([
      this.prisma.nx01WarehouseZone.count({ where }),
      this.prisma.nx01WarehouseZone.findMany({
        where,
        orderBy: [{ warehouseId: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01WarehouseZone.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('WarehouseZone not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateWarehouseZoneDto) {
    const tenantId = requireTenantId(user);
    const warehouseId = dto.warehouseId.trim();
    await this.assertWarehouseInTenant(tenantId, warehouseId);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01WarehouseZone.findFirst({
      where: { tenantId, warehouseId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('分區代碼已存在、請改用其他代碼');
    return this.prisma.nx01WarehouseZone.create({
      data: {
        tenantId,
        warehouseId,
        code,
        name: dto.name.trim(),
        sortNo: dto.sortNo ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateWarehouseZoneDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01WarehouseZone.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('WarehouseZone not found');
    return this.prisma.nx01WarehouseZone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01WarehouseZone.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('WarehouseZone not found');
    return this.prisma.nx01WarehouseZone.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
  }
}
