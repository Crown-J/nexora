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
  SetPrimaryUserWarehouseDto,
} from './dto/user-warehouse.dto';

const SEL = {
  id: true,
  tenantId: true,
  userId: true,
  warehouseId: true,
  isPrimary: true,
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
  isPrimary: boolean;
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
      isPrimary: row.isPrimary,
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
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'desc' }],
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

    // 若指派為主要倉、先把該員工其他主要倉旗標清掉（service 層守唯一、範式同 user-role）
    if (dto.isPrimary) {
      await this.prisma.nx01UserWarehouse.updateMany({
        where: { tenantId, userId: dto.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.nx01UserWarehouse.create({
      data: {
        tenantId,
        userId: dto.userId,
        warehouseId: dto.warehouseId,
        isPrimary: dto.isPrimary ?? false,
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
    // 若取消的是主要倉、isPrimary 同時清掉、避免「停用但仍標主要」邏輯洞
    const updated = await this.prisma.nx01UserWarehouse.update({
      where: { id },
      data: { isActive: false, isPrimary: false, revokedAt: new Date() },
      select: SEL,
    });
    return this.mapRow(updated);
  }

  async setPrimary(user: RequestUser, id: string, dto: SetPrimaryUserWarehouseDto) {
    const tenantId = requireTenantId(user);
    const target = await this.prisma.nx01UserWarehouse.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true, isActive: true },
    });
    if (!target) throw new NotFoundException('UserWarehouse not found');
    if (!target.isActive) {
      throw new ConflictException('Cannot set primary on revoked assignment');
    }

    if (dto.isPrimary) {
      // 同員工只能一筆 isPrimary=true：先把其他筆改 false
      await this.prisma.nx01UserWarehouse.updateMany({
        where: { tenantId, userId: target.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const updated = await this.prisma.nx01UserWarehouse.update({
      where: { id },
      data: { isPrimary: dto.isPrimary },
      select: SEL,
    });
    return this.mapRow(updated);
  }
}
