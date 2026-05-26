// apps/nx-api/src/nx01/role-view/role-view.service.ts
/**
 * RoleView Service（補後端軌：職務↔畫面權限 join CRUD）
 *
 * 5 endpoint：list / getById / create / update / softDelete
 * verify roleId 屬租戶、viewId 存在（系統字典無租戶）；同租戶 roleId+viewId 不重複。
 * 停用走軟刪除（isActive=false + revokedAt）。
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { isSysadmin, SYSADMIN_ROLE_CODE } from '../../shared/nx01/is-sysadmin';

import type { CreateRoleViewDto, ListRoleViewQueryDto, UpdateRoleViewDto } from './dto/role-view.dto';

const SEL = {
  id: true,
  tenantId: true,
  roleId: true,
  viewId: true,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canExport: true,
  isActive: true,
  grantedAt: true,
  grantedBy: true,
  revokedAt: true,
  role: { select: { code: true, name: true } },
  view: { select: { code: true, name: true } },
} as const;

type Row = Prisma.Nx01RoleViewGetPayload<{ select: typeof SEL }>;

@Injectable()
export class RoleViewService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: Row) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      roleId: row.roleId,
      viewId: row.viewId,
      canRead: row.canRead,
      canCreate: row.canCreate,
      canUpdate: row.canUpdate,
      canDelete: row.canDelete,
      canExport: row.canExport,
      isActive: row.isActive,
      grantedAt: row.grantedAt.toISOString(),
      grantedBy: row.grantedBy,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      roleCode: row.role?.code ?? null,
      roleName: row.role?.name ?? null,
      viewCode: row.view?.code ?? null,
      viewName: row.view?.name ?? null,
    };
  }

  /** verify roleId 屬租戶、且非 SYSADMIN（一般用戶不可對系統管理員設權限） */
  private async verifyRole(user: RequestUser, tenantId: string, roleId: string): Promise<void> {
    const role = await this.prisma.nx01Role.findFirst({
      where: { id: roleId, tenantId },
      select: { code: true },
    });
    if (!role) throw new BadRequestException('Role not found in tenant');
    if (!isSysadmin(user) && String(role.code).trim().toUpperCase() === SYSADMIN_ROLE_CODE) {
      throw new BadRequestException('Role not found in tenant');
    }
  }

  async list(user: RequestUser, q: ListRoleViewQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx01RoleViewWhereInput = { tenantId };
    if (q.roleId) where.roleId = q.roleId;
    if (q.viewId) where.viewId = q.viewId;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    // SYSADMIN 鎖定：一般用戶看不到系統管理員的權限指派
    if (!isSysadmin(user)) {
      where.role = { code: { not: SYSADMIN_ROLE_CODE } };
    }
    const [total, rows] = await Promise.all([
      this.prisma.nx01RoleView.count({ where }),
      this.prisma.nx01RoleView.findMany({
        where,
        orderBy: [{ grantedAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01RoleView.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('RoleView not found');
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateRoleViewDto) {
    const tenantId = requireTenantId(user);
    await this.verifyRole(user, tenantId, dto.roleId);
    const view = await this.prisma.nx01View.findUnique({ where: { id: dto.viewId }, select: { id: true } });
    if (!view) throw new BadRequestException('View not found');
    const dup = await this.prisma.nx01RoleView.findFirst({
      where: { tenantId, roleId: dto.roleId, viewId: dto.viewId, isActive: true },
      select: { id: true },
    });
    if (dup) throw new ConflictException('This role already has this view permission');
    const row = await this.prisma.nx01RoleView.create({
      data: {
        tenantId,
        roleId: dto.roleId,
        viewId: dto.viewId,
        canRead: dto.canRead ?? true,
        canCreate: dto.canCreate ?? false,
        canUpdate: dto.canUpdate ?? false,
        canDelete: dto.canDelete ?? false,
        canExport: dto.canExport ?? false,
        isActive: true,
        grantedBy: user.sub,
      },
      select: SEL,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateRoleViewDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01RoleView.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException('RoleView not found');
    const row = await this.prisma.nx01RoleView.update({
      where: { id },
      data: {
        ...(dto.canRead !== undefined ? { canRead: dto.canRead } : {}),
        ...(dto.canCreate !== undefined ? { canCreate: dto.canCreate } : {}),
        ...(dto.canUpdate !== undefined ? { canUpdate: dto.canUpdate } : {}),
        ...(dto.canDelete !== undefined ? { canDelete: dto.canDelete } : {}),
        ...(dto.canExport !== undefined ? { canExport: dto.canExport } : {}),
        ...(dto.isActive !== undefined
          ? { isActive: dto.isActive, revokedAt: dto.isActive ? null : new Date() }
          : {}),
      },
      select: SEL,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01RoleView.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException('RoleView not found');
    const row = await this.prisma.nx01RoleView.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
      select: SEL,
    });
    return this.mapRow(row);
  }
}
