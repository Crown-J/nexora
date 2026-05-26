// apps/nx-api/src/nx01/user-role/user-role.service.ts
/**
 * UserRole Service（業界改革 #22 v1.2、解前端 /user-role 404）
 *
 * 6 endpoint：list / getById / assign / revoke / setPrimary / setActive
 * 對齊前端 UserRoleDto（含 roleCode / roleName / userDisplayName / assignedByName）
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
  AssignUserRoleDto,
  ListUserRoleQueryDto,
  RevokeUserRoleDto,
  SetActiveDto,
  SetPrimaryDto,
} from './dto/user-role.dto';

const SEL = {
  id: true,
  tenantId: true,
  userId: true,
  roleId: true,
  isPrimary: true,
  isActive: true,
  assignedAt: true,
  assignedBy: true,
  revokedAt: true,
  user: { select: { userName: true, userAccount: true } },
  role: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01UserRoleGetPayload<{ select: typeof SEL }>;

type UserRoleDtoOut = {
  id: string;
  userId: string;
  roleId: string;
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  assignedByName: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  roleCode: string | null;
  roleName: string | null;
};

@Injectable()
export class UserRoleService {
  constructor(private readonly prisma: PrismaService) {}

  private async mapRow(row: Row): Promise<UserRoleDtoOut> {
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
      roleId: row.roleId,
      isPrimary: row.isPrimary,
      isActive: row.isActive,
      assignedAt: row.assignedAt.toISOString(),
      assignedBy: row.assignedBy,
      assignedByName,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      userDisplayName: row.user?.userName ?? row.user?.userAccount ?? null,
      roleCode: row.role?.code ?? null,
      roleName: row.role?.name ?? null,
    };
  }

  async list(user: RequestUser, q: ListUserRoleQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.Nx01UserRoleWhereInput = { tenantId };
    if (q.userId) where.userId = q.userId;
    if (q.roleId) where.roleId = q.roleId;
    if (q.isActive !== undefined) where.isActive = q.isActive;

    const [total, rows] = await Promise.all([
      this.prisma.nx01UserRole.count({ where }),
      this.prisma.nx01UserRole.findMany({
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
    const row = await this.prisma.nx01UserRole.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('UserRole not found');
    return this.mapRow(row);
  }

  async assign(user: RequestUser, dto: AssignUserRoleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01UserRole.findFirst({
      where: { tenantId, userId: dto.userId, roleId: dto.roleId, isActive: true },
      select: { id: true },
    });
    if (existing) throw new ConflictException('User already has this role');

    const created = await this.prisma.nx01UserRole.create({
      data: {
        tenantId,
        userId: dto.userId,
        roleId: dto.roleId,
        isPrimary: dto.isPrimary ?? false,
        isActive: true,
        assignedBy: user.sub,
      },
      select: SEL,
    });
    return this.mapRow(created);
  }

  async revoke(user: RequestUser, id: string, _dto: RevokeUserRoleDto) {
    const tenantId = requireTenantId(user);
    const found = await this.prisma.nx01UserRole.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('UserRole not found');

    const updated = await this.prisma.nx01UserRole.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
      select: SEL,
    });
    return this.mapRow(updated);
  }

  async setPrimary(user: RequestUser, id: string, dto: SetPrimaryDto) {
    const tenantId = requireTenantId(user);
    const target = await this.prisma.nx01UserRole.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true },
    });
    if (!target) throw new NotFoundException('UserRole not found');

    if (dto.isPrimary) {
      await this.prisma.nx01UserRole.updateMany({
        where: { tenantId, userId: target.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const updated = await this.prisma.nx01UserRole.update({
      where: { id },
      data: { isPrimary: dto.isPrimary },
      select: SEL,
    });
    return this.mapRow(updated);
  }

  async setActive(user: RequestUser, id: string, dto: SetActiveDto) {
    const tenantId = requireTenantId(user);
    const found = await this.prisma.nx01UserRole.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('UserRole not found');

    const updated = await this.prisma.nx01UserRole.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        revokedAt: dto.isActive ? null : new Date(),
      },
      select: SEL,
    });
    return this.mapRow(updated);
  }
}
