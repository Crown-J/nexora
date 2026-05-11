/**
 * File: apps/nx-api/src/auth/roles.guard.ts
 * Purpose: 驗證角色權限
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  /**
   * @CODE nxapi_auth_roles_guard_001
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // 沒有設定角色 → 直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('Invalid token');
    }

    // 查詢使用者角色
    const userRoles = await this.prisma.nx01UserRole.findMany({
      where: { userId: user.sub, isActive: true },
      include: { role: { select: { code: true, isActive: true } } },
    });

    const roleCodes = userRoles
      .filter((r) => r.role.isActive)
      .map((r) => r.role.code);

    // 🔥 SYSADMIN / OWNER 全通行邏輯（A042 closure、Crown 拍 Q1）
    // - SYSADMIN：系統管理（NEXORA team 跨租戶）
    // - OWNER：客戶最高權限（單租戶內 admin）
    // A034 將 role.code 'ADMIN' → 'SYSADMIN' 後、原 'ADMIN' 全通行邏輯永遠 false、production guard 失效。
    const SUPER_ROLES = new Set(['SYSADMIN', 'OWNER']);
    if (roleCodes.some((c) => SUPER_ROLES.has(String(c).trim().toUpperCase()))) {
      return true;
    }

    const hasPermission = requiredRoles.some((role) =>
      roleCodes.some((c) => String(c).trim().toUpperCase() === String(role).trim().toUpperCase()),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
