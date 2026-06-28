// apps/nx-api/src/nx01/permission/permission.service.ts
// v1.2 對齊軌 A+B：權限目錄查詢 + 角色權限管理 service

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

const PERM_SEL = {
  id: true,
  code: true,
  moduleCode: true,
  category: true,
  action: true,
  name: true,
  description: true,
  sortNo: true,
  isActive: true,
} as const;

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出所有系統權限目錄（活躍）
   * UI 「設定→角色與權限」樹狀勾選用、依 moduleCode + sortNo 排序
   */
  async listCatalog() {
    const rows = await this.prisma.nx01Permission.findMany({
      where: { isActive: true },
      orderBy: [{ moduleCode: 'asc' }, { sortNo: 'asc' }],
      select: PERM_SEL,
    });
    return rows;
  }

  /**
   * 列出指定角色擁有的權限 ID 集合（給 UI 預填 checkbox）
   */
  async listForRole(user: RequestUser, roleId: string) {
    const tenantId = requireTenantId(user);
    const role = await this.prisma.nx01Role.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    const grants = await this.prisma.nx01RolePermission.findMany({
      where: { roleId, tenantId },
      include: { permission: { select: PERM_SEL } },
    });
    return {
      roleId: role.id,
      code: role.code,
      name: role.name,
      isActive: role.isActive,
      permissions: grants.map((g) => g.permission),
    };
  }

  /**
   * 替換指定角色的權限集合（PUT 語意）
   * - 取現有 permissions
   * - diff 計算 toAdd / toRemove
   * - tx 同步寫入
   * - 不允許改 OWNER / SYSADMIN 角色（safety、避免鎖死）
   */
  async setForRole(user: RequestUser, roleId: string, permissionCodes: string[]) {
    const tenantId = requireTenantId(user);
    const role = await this.prisma.nx01Role.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, code: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    const SUPER_ROLES = new Set(['SYSADMIN', 'OWNER']);
    if (SUPER_ROLES.has(String(role.code).trim().toUpperCase())) {
      throw new ForbiddenException(
        '不可改 SYSADMIN / OWNER 角色權限（safety bypass、防止鎖死）',
      );
    }

    // 將 code 轉成 permission.id（並驗證所有 code 都存在）
    const perms = await this.prisma.nx01Permission.findMany({
      where: { code: { in: permissionCodes }, isActive: true },
      select: { id: true, code: true },
    });
    const codeSet = new Set(permissionCodes);
    const foundCodes = new Set(perms.map((p) => p.code));
    const missing = [...codeSet].filter((c) => !foundCodes.has(c));
    if (missing.length) {
      throw new BadRequestException(`Unknown permissionCodes: ${missing.join(', ')}`);
    }
    const desiredIds = new Set(perms.map((p) => p.id));

    const existing = await this.prisma.nx01RolePermission.findMany({
      where: { roleId, tenantId },
      select: { id: true, permissionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.permissionId));

    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemoveRowIds = existing
      .filter((e) => !desiredIds.has(e.permissionId))
      .map((e) => e.id);

    await this.prisma.$transaction(async (tx) => {
      if (toRemoveRowIds.length) {
        await tx.nx01RolePermission.deleteMany({
          where: { id: { in: toRemoveRowIds } },
        });
      }
      for (const pid of toAdd) {
        await tx.nx01RolePermission.create({
          data: {
            tenantId,
            roleId,
            permissionId: pid,
            grantedBy: user.sub,
          },
        });
      }
    });

    return {
      roleId,
      added: toAdd.length,
      removed: toRemoveRowIds.length,
      total: desiredIds.size,
    };
  }

  /**
   * 取得當前 user 擁有的所有權限 code 集合（給前端 useHasPermission hook 用）
   * SYSADMIN / OWNER 回 ['*']（前端視為「全擁有」）
   */
  async listMine(user: RequestUser): Promise<string[]> {
    const userRoles = await this.prisma.nx01UserRole.findMany({
      where: { userId: user.sub, isActive: true },
      include: { role: { select: { id: true, code: true, isActive: true } } },
    });
    const activeRoles = userRoles.filter((r) => r.role.isActive);
    const codes = activeRoles.map((r) =>
      String(r.role.code).trim().toUpperCase(),
    );
    const SUPER_ROLES = new Set(['SYSADMIN', 'OWNER']);
    // 職務↔權限拆分軌：權限等級 S 視為全擁有（與 OWNER 等效、加性過渡）
    if (
      codes.some((c) => SUPER_ROLES.has(c)) ||
      String(user.permissionLevelCode ?? '').trim().toUpperCase() === 'S'
    ) {
      return ['*'];
    }
    const roleIds = activeRoles.map((r) => r.role.id);
    if (!roleIds.length) return [];
    const grants = await this.prisma.nx01RolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: { select: { code: true, isActive: true } } },
    });
    return [
      ...new Set(
        grants
          .filter((g) => g.permission.isActive)
          .map((g) => g.permission.code),
      ),
    ];
  }
}
