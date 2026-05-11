/**
 * 依 nx01_role_view 合併「目前 JWT 使用者＋租戶」之畫面權限（多職務 OR）。
 * - 凡 JWT roles 含 **SYSADMIN / OWNER**：merge 回傳 null → 略過 Guard（租戶資料範圍仍依 **tenantId**）
 *   ⚠️ A042 closure：A034 將 role.code 'ADMIN' → 'SYSADMIN'、補 OWNER 對齊 NX01-02 規格 7 role 真相
 * - nx01_role_view 無 can_toggle_active：以 canUpdate || canDelete 對應 toggleActive
 */

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

import type { Nx01ViewAction } from './nx01-view-action';

export type MergedNx01ViewPerms = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canToggleActive: boolean;
  canExport: boolean;
};

@Injectable()
export class ViewPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  private rolesIncludeSuperAdmin(roles: string[] | undefined): boolean {
    return (roles ?? []).some((r) => {
      const c = String(r).trim().toUpperCase();
      return c === 'SYSADMIN' || c === 'OWNER';
    });
  }

  private async userHasActiveSuperAdminAssignment(userId: string, tenantId: string | null): Promise<boolean> {
    const row = await this.prisma.nx01UserRole.findFirst({
      where: {
        userId,
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
        role: { code: { in: ['SYSADMIN', 'OWNER'] }, isActive: true },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async mergeForRequestUser(user: RequestUser): Promise<Record<string, MergedNx01ViewPerms> | null> {
    if (this.rolesIncludeSuperAdmin(user.roles)) return null;
    if (await this.userHasActiveSuperAdminAssignment(user.sub, user.tenantId ?? null)) return null;
    const tid = user.tenantId;
    if (!tid) return {};

    const urs = await this.prisma.nx01UserRole.findMany({
      where: { userId: user.sub, tenantId: tid, isActive: true },
      select: { roleId: true },
    });
    const roleIds = urs.map((r) => r.roleId);
    if (roleIds.length === 0) return {};

    const rows = await this.prisma.nx01RoleView.findMany({
      where: { tenantId: tid, isActive: true, roleId: { in: roleIds } },
      include: { view: { select: { code: true } } },
    });

    const map: Record<string, MergedNx01ViewPerms> = {};
    const z = (): MergedNx01ViewPerms => ({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canToggleActive: false,
      canExport: false,
    });

    for (const r of rows) {
      const code = r.view.code?.trim();
      if (!code) continue;
      if (!map[code]) map[code] = z();
      const m = map[code];
      m.canRead ||= r.canRead;
      m.canCreate ||= r.canCreate;
      m.canUpdate ||= r.canUpdate;
      m.canToggleActive ||= r.canUpdate || r.canDelete;
      m.canExport ||= r.canExport;
    }

    return map;
  }

  async mergeForProfile(args: {
    tenantId: string | null;
    isPlatformAdmin: boolean;
    roleIdsForTenant: string[];
  }): Promise<Record<string, MergedNx01ViewPerms> | null> {
    if (args.isPlatformAdmin) return null;
    const tid = args.tenantId;
    if (!tid || args.roleIdsForTenant.length === 0) return {};

    const rows = await this.prisma.nx01RoleView.findMany({
      where: { tenantId: tid, isActive: true, roleId: { in: args.roleIdsForTenant } },
      include: { view: { select: { code: true } } },
    });

    const map: Record<string, MergedNx01ViewPerms> = {};
    const z = (): MergedNx01ViewPerms => ({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canToggleActive: false,
      canExport: false,
    });

    for (const r of rows) {
      const code = r.view.code?.trim();
      if (!code) continue;
      if (!map[code]) map[code] = z();
      const m = map[code];
      m.canRead ||= r.canRead;
      m.canCreate ||= r.canCreate;
      m.canUpdate ||= r.canUpdate;
      m.canToggleActive ||= r.canUpdate || r.canDelete;
      m.canExport ||= r.canExport;
    }

    return map;
  }

  actionSatisfied(perms: MergedNx01ViewPerms | undefined, action: Nx01ViewAction): boolean {
    if (!perms) return false;
    switch (action) {
      case 'read':
        return perms.canRead;
      case 'create':
        return perms.canCreate;
      case 'update':
        return perms.canUpdate;
      case 'toggleActive':
        return perms.canToggleActive;
      case 'export':
        return perms.canExport;
      default:
        return false;
    }
  }
}
