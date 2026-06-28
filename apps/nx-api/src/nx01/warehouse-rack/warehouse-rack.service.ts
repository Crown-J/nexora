// apps/nx-api/src/nx01/warehouse-rack/warehouse-rack.service.ts
// 貨架 service（2026-06-28 五層倉儲第四層：區域 → 貨架）
//
// schema unique = (tenantId, zoneId, code)：同區域內 code 唯一
// service 層守：zoneId 必須屬於該 tenant
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  CreateWarehouseRackDto,
  ListWarehouseRackQueryDto,
  UpdateWarehouseRackDto,
} from './dto/warehouse-rack.dto';

const SEL = {
  id: true,
  tenantId: true,
  zoneId: true,
  code: true,
  name: true,
  sortNo: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  zone: { select: { code: true, name: true } },
} as const;

@Injectable()
export class WarehouseRackService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertZoneInTenant(tenantId: string, zoneId: string) {
    const zone = await this.prisma.nx01WarehouseZone.findFirst({
      where: { id: zoneId, tenantId },
      select: { id: true },
    });
    if (!zone) throw new BadRequestException(`zoneId not found in tenant`);
  }

  async list(user: RequestUser, q: ListWarehouseRackQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01WarehouseRackWhereInput = { tenantId };
    if (q.zoneId?.trim()) where.zoneId = q.zoneId.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    const [total, rows] = await Promise.all([
      this.prisma.nx01WarehouseRack.count({ where }),
      this.prisma.nx01WarehouseRack.findMany({
        where,
        orderBy: [{ zoneId: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01WarehouseRack.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('WarehouseRack not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateWarehouseRackDto) {
    const tenantId = requireTenantId(user);
    const zoneId = dto.zoneId.trim();
    await this.assertZoneInTenant(tenantId, zoneId);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01WarehouseRack.findFirst({
      where: { tenantId, zoneId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('貨架代碼已存在、請改用其他代碼');
    return this.prisma.nx01WarehouseRack.create({
      data: {
        tenantId,
        zoneId,
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

  async update(user: RequestUser, id: string, dto: UpdateWarehouseRackDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01WarehouseRack.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('WarehouseRack not found');
    return this.prisma.nx01WarehouseRack.update({
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
    const existing = await this.prisma.nx01WarehouseRack.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('WarehouseRack not found');
    return this.prisma.nx01WarehouseRack.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
  }
}
