/**
 * File: apps/nx-api/src/auth/services/auth.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-002 / NX00-AUTH-003：Auth Service（login / me）
 * - NX99-T3：登入時 JWT payload 帶入 tenantId / tenantCode / planCode
 *
 * Notes:
 * - 驗證帳密、簽發 JWT
 * - /auth/me 用 sub 查 nx00_user 回傳使用者資訊
 * - Prisma 回傳 camelCase 欄位（isActive/passwordHash/displayName...）
 * - tenant_id 為 null 時仍可登入；僅「無租戶＋ADMIN」簽出無租戶 JWT，其餘租戶 admin 帶 tenantId
 */

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import { ViewPermissionService } from '../../nx00/rbac/view-permission.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly viewPerm: ViewPermissionService,
  ) { }

  /**
   * @CODE nxapi_nx00_auth_login_003
   * @FUNCTION_CODE NX99-AUTH-SVC-001-F01
   *
   * 說明：
   * - 依 username 查 user（含 tenant）
   * - 檢查 isActive
   * - bcryptjs compare(password, passwordHash)
   * - 查詢該租戶的 active subscription + plan
   * - 簽發 JWT 回傳 token（payload 含 tenantId / tenantCode / planCode）
   * - 登入成功更新 lastLoginAt（稽核）
   * - user.tenantId 為 null 時仍可登入，租戶/方案欄位帶 null
   */
  async login(username: string, password: string, tenantCode?: string | null) {
    if (!username || !password) {
      throw new BadRequestException('username/password required');
    }

    const uname = String(username).trim();
    if (!uname) throw new BadRequestException('username/password required');

    const tenantCodeTrim =
      tenantCode != null && String(tenantCode).trim() !== '' ? String(tenantCode).trim() : '';

    const userInclude = {
      tenant: true,
      userRoles: {
        where: { isActive: true },
        include: { role: { select: { code: true } } },
      },
    } as const;

    let user;
    if (tenantCodeTrim) {
      const tenant = await this.prisma.nx99Tenant.findFirst({
        where: {
          code: { equals: tenantCodeTrim, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (!tenant) {
        throw new UnauthorizedException('Invalid username or password');
      }
      user = await this.prisma.nx00User.findUnique({
        where: { tenantId_userAccount: { tenantId: tenant.id, userAccount: uname } },
        include: userInclude,
      });
    } else {
      user = await this.prisma.nx00User.findFirst({
        where: { userAccount: uname },
        include: userInclude,
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      throw new UnauthorizedException('Invalid username or password');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const scopedUserRoles = user.userRoles.filter((ur) => ur.tenantId === user.tenantId);
    /** 僅「無租戶綁定」的 ADMIN 為跨租戶平台；租戶內 admin 帳號仍帶 tenantId 以隔離資料 */
    const isCrossTenantPlatform =
      scopedUserRoles.some((ur) => String(ur.role?.code ?? '').trim().toUpperCase() === 'ADMIN') &&
      user.tenantId == null;

    let subscription: { plan: { code: string } } | null = null;
    if (!isCrossTenantPlatform && user.tenantId) {
      subscription = await this.prisma.nx99Subscription.findFirst({
        where: { tenantId: user.tenantId, status: 'A' },
        include: { plan: true },
      });
    }

    const token = await this.buildToken(
      {
        id: user.id,
        username: user.userAccount,
        tenant: user.tenant ? { id: user.tenant.id, code: user.tenant.code } : null,
      },
      subscription,
      isCrossTenantPlatform,
    );
    await this.prisma.nx00User.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.userAccount,
        display_name: user.userName ?? null,
      },
    };
  }

  /**
   * @FUNCTION_CODE NX99-AUTH-SVC-001-F02
   * 說明：組裝 JWT payload（含租戶與方案資訊）
   */
  private async buildToken(
    user: { id: string; username: string; tenant?: { id: string; code: string } | null },
    subscription: { plan: { code: string } } | null,
    isCrossTenantPlatform: boolean,
  ) {
    if (isCrossTenantPlatform) {
      return this.jwt.signAsync({
        sub: user.id,
        username: user.username,
        tenantId: null,
        tenantCode: null,
        planCode: null,
      });
    }
    return this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      tenantId: user.tenant?.id ?? null,
      tenantCode: user.tenant?.code ?? null,
      planCode: subscription?.plan?.code ?? null,
    });
  }

  /**
   * @CODE nxapi_nx00_auth_me_003
   *
   * 說明：
   * - JWT Guard 解析 sub 後，帶入 userId
   * - 查 nx00_user 回傳乾淨 DTO（不包含 passwordHash）
   */
  async me(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Token user not found');
    }

    const user = await this.prisma.nx00User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        userAccount: true,
        userName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        tenant: { select: { name: true, nameEn: true } },
        userRoles: {
          where: { isActive: true },
          select: {
            tenantId: true,
            roleId: true,
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token user not found');
    }

    const roleRowsForMe = user.tenantId
      ? user.userRoles.filter((ur) => ur.tenantId === user.tenantId)
      : user.userRoles;
    const roles = roleRowsForMe.map((ur) => ur.role.code);
    /** 與 Guard 一致：掛 ADMIN 職務者 view_permissions 為 null（前端視為全開） */
    const isPlatformAdminForPerms = roleRowsForMe.some(
      (ur) => String(ur.role.code).trim().toUpperCase() === 'ADMIN',
    );

    const merged = await this.viewPerm.mergeForProfile({
      tenantId: user.tenantId,
      isPlatformAdmin: isPlatformAdminForPerms,
      roleIdsForTenant: roleRowsForMe.map((ur) => ur.roleId),
    });

    let plan_code: string | null = null;
    if (user.tenantId) {
      const sub = await this.prisma.nx99Subscription.findFirst({
        where: { tenantId: user.tenantId, status: 'A' },
        include: { plan: true },
      });
      plan_code = sub?.plan?.code ?? null;
    }

    const view_permissions =
      merged === null
        ? null
        : Object.fromEntries(
          Object.entries(merged).map(([code, v]) => [
            code,
            {
              can_read: v.canRead,
              can_create: v.canCreate,
              can_update: v.canUpdate,
              can_toggle_active: v.canToggleActive,
              can_export: v.canExport,
            },
          ]),
        );

    return {
      id: user.id,
      username: user.userAccount,
      display_name: user.userName,
      email: user.email ?? null,
      phone: user.phone ?? null,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt ?? null,
      tenant_name: user.tenant?.name ?? null,
      tenant_name_en: user.tenant?.nameEn ?? null,
      plan_code,
      roles,
      view_permissions,
    };
  }
}