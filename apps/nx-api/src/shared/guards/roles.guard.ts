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
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from '../shared/decorators/roles.decorator';

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
    const userRoles = await this.prisma.nx00UserRole.findMany({
      where: { userId: user.sub },
      include: { role: true },
    });

    const roleCodes = userRoles.map((r) => r.role.code);

    // 🔥 ADMIN 覆蓋邏輯
    if (roleCodes.includes('ADMIN')) {
      return true;
    }

    const hasPermission = requiredRoles.some((role) =>
      roleCodes.includes(role),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
