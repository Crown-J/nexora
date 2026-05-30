// apps/nx-api/src/shared/guards/permissions.guard.ts
// v1.2 對齊軌 A+B：新 RBAC framework 權限守門
//
// 跟 RolesGuard 互補：
// - RolesGuard 比對 @Roles(...) 跟 role.code（舊範式、保留用於 SYSADMIN/OWNER hard-bypass）
// - PermissionsGuard 比對 @Permission(...) 跟 role × permission 表（v1.2 §12 新範式）
//
// 順序：JwtAuthGuard → RolesGuard（仍 enforce SYSADMIN/OWNER）→ PermissionsGuard
// 一般 controller 同時掛兩個、過渡期 NX02/03/04 controllers 改成只掛 PermissionsGuard

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // 沒設 @Permission → 直接放行（純 @Roles 系列繼續走 RolesGuard）
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.sub) {
      throw new ForbiddenException('Invalid token');
    }

    // 查使用者的 active 角色 + 角色的權限
    const userRoles = await this.prisma.nx01UserRole.findMany({
      where: { userId: user.sub, isActive: true },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            isActive: true,
          },
        },
      },
    });

    const activeRoleIds = userRoles
      .filter((ur) => ur.role.isActive)
      .map((ur) => ur.role.id);

    // SYSADMIN / OWNER safety bypass（避免鎖死系統、與 RolesGuard 一致）
    const roleCodes = userRoles
      .filter((ur) => ur.role.isActive)
      .map((ur) => String(ur.role.code).trim().toUpperCase());
    const SUPER_ROLES = new Set(['SYSADMIN', 'OWNER']);
    if (roleCodes.some((c) => SUPER_ROLES.has(c))) {
      return true;
    }

    if (activeRoleIds.length === 0) {
      throw new ForbiddenException('User has no active roles');
    }

    // 查角色擁有的權限、跟 requiredPermissions 比對
    const grants = await this.prisma.nx01RolePermission.findMany({
      where: { roleId: { in: activeRoleIds } },
      include: {
        permission: {
          select: { code: true, isActive: true },
        },
      },
    });

    const ownedCodes = new Set(
      grants
        .filter((g) => g.permission.isActive)
        .map((g) => g.permission.code),
    );

    const hasAny = requiredPermissions.some((req) => ownedCodes.has(req));

    if (!hasAny) {
      throw new ForbiddenException(
        `Permission denied. Required: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
