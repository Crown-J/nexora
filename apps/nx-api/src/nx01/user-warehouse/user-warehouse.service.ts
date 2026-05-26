// apps/nx-api/src/nx01/user-warehouse/user-warehouse.service.ts
/**
 * UserWarehouse Service（補完軌：仿 user-role 範式）
 *
 * 4 endpoint：list / getById / assign / revoke
 * 對齊前端 UserWarehouseDto（含 userAccount / warehouseCode / warehouseName / assignedByName）
 * 軟刪除鐵律：revoke = isActive false + revokedAt（系統不刪資料、保留歷史）
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  AssignUserWarehouseDto,
  ListUserWarehouseQueryDto,
  RevokeUserWarehouseDto,
} from './dto/user-warehouse.dto';

const SEL = {
  id: true,
  tenantId: true,
  userId: true,
  warehouseId: true,
  isActive: true,
  assignedAt: true,
  assignedBy: true,
  revokedAt: true,
  user: { select: { userName: true, userAccount: true } },
  warehouse: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01UserWarehouseGetPayload<{ select: typeof SEL }>;

type UserWarehouseDtoOut = {
  id: string;
  userId: string;
  warehouseId: string;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  assignedByName: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  userAccount: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
};

@Injectable()
export class UserWarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  private async mapRow(row: Row): Promise<UserWarehouseDtoOut> {
    let assignedByName: string | null = null;
    if (row.assignedBy) {
      const assigner = await this.prisma.nx01User.findUnique({
        where: { id: row.assignedBy },
        select: { userName: true, userAccount: true },
      });
      assignedByName = assigner?.userName ?? assigner?.userAccount ?? null;
    }
    return {
      id: row.id,
      userId: row.userId,
      warehouseId: row.warehouseId,
      isActive: row.isActive,
      assignedAt: row.assignedAt.toISOString(),
      assignedBy: row.assignedBy,
      assignedByName,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      userDisplayName: row.user?.userName ?? row.user?.userAccount ?? null,
      userAccount: row.user?.userAccount ?? null,
      warehouseCode: row.warehouse?.code ?? null,
      warehouseName: row.warehouse?.name ?? null,
    };
  }

  async list(user: RequestUser, q: ListUserWarehouseQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.Nx01UserWarehouseWhereInput = { tenantId };
    if (q.userId) where.userId = q.userId;
    if (q.warehouseId) where.warehouseId = q.warehouseId;
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const [total, rows] = await Promise.all([
      this.prisma.nx01UserWarehouse.count({ where }),
      this.prisma.nx01UserWarehouse.findMany({
        where,
        orderBy: [{ assignedAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    const items = await Promise.all(rows.map((r) => this.mapRow(r)));
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01UserWarehouse.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('UserWarehouse not found');
    return this.mapRow(row);
  }

  async assign(user: RequestUser, dto: AssignUserWarehouseDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01UserWarehouse.findFirst({
      where: {
        tenantId,
        userId: dto.userId,
        warehouseId: dto.warehouseId,
        isActive: true,
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('User already assigned to this warehouse');

    const created = await this.prisma.nx01UserWarehouse.create({
      data: {
        tenantId,
        userId: dto.userId,
        warehouseId: dto.warehouseId,
        isActive: true,
        assignedBy: user.sub,
      },
      select: SEL,
    });
    return this.mapRow(created);
  }

  async revoke(user: RequestUser, id: string, _dto: RevokeUserWarehouseDto) {
    const tenantId = requireTenantId(user);
    const found = await this.prisma.nx01UserWarehouse.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('UserWarehouse not found');

    // 軟刪除鐵律：保留紀錄、isActive=false + revokedAt（系統不刪資料）
    const updated = await this.prisma.nx01UserWarehouse.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
      select: SEL,
    });
    return this.mapRow(updated);
  }
}
