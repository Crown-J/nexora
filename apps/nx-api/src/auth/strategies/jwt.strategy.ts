/**
 * File: apps/nx-api/src/auth/strategies/jwt.strategy.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - JWT 驗證 + 注入 roles 到 req.user
 * - NX99-T3：validate 回傳 tenantId / tenantCode / planCode 供 API 識別租戶與方案
 * - **跨租戶平台**：僅當 nx00_user.tenantId 為 null 且具 ADMIN 職務時，租戶欄位為 null
 * - **租戶內 ADMIN**（如 DEMO 的 admin）：仍帶該租戶 tenantId，列表／查詢僅限該公司
 *
 * Notes:
 * - validate 回傳物件會掛到 req.user
 * - 一定要保留 sub，避免 RolesGuard 判定為 Invalid token
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  username: string;
  tenantId?: string | null;
  tenantCode?: string | null;
  planCode?: string | null;
  iat?: number;
  exp?: number;
};

export type RequestUser = {
  sub: string;
  username: string;
  roles: string[];
  tenantId: string | null;
  tenantCode: string | null;
  planCode: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
    });
  }

  /**
   * @CODE nxapi_auth_jwt_strategy_validate_003
   * @FUNCTION_CODE NX99-AUTH-STR-001-F01
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const userRow = await this.prisma.nx00User.findUnique({
      where: { id: payload.sub },
      select: { tenantId: true },
    });
    if (!userRow) {
      throw new UnauthorizedException('User not found');
    }

    const urWhere: { userId: string; isActive: boolean; tenantId?: string } = {
      userId: payload.sub,
      isActive: true,
    };
    if (userRow.tenantId) {
      urWhere.tenantId = userRow.tenantId;
    }

    const urRows = await this.prisma.nx00UserRole.findMany({
      where: urWhere,
      include: { role: true },
    });
    const roles = urRows.map((r) => r.role.code);

    const isCrossTenantPlatform =
      roles.some((c) => String(c).trim().toUpperCase() === 'ADMIN') && userRow.tenantId == null;

    let tenantId: string | null;
    let tenantCode: string | null;
    let planCode: string | null;

    if (isCrossTenantPlatform) {
      tenantId = null;
      tenantCode = null;
      planCode = null;
    } else {
      tenantId = userRow.tenantId ?? payload.tenantId ?? null;
      tenantCode = payload.tenantCode ?? null;
      const payloadPlan = payload.planCode ?? null;

      if (tenantId) {
        if (!tenantCode) {
          const t = await this.prisma.nx99Tenant.findUnique({
            where: { id: tenantId },
            select: { code: true },
          });
          tenantCode = t?.code ?? null;
        }
        // 方案以 DB 有效訂閱為準；JWT 可能為舊簽發（plan 已變更）或與 nx99_plan.code 格式不一致
        const sub = await this.prisma.nx99Subscription.findFirst({
          where: { tenantId, status: 'A' },
          include: { plan: true },
        });
        const dbPlan = sub?.plan?.code ?? null;
        planCode = dbPlan ?? payloadPlan;
      } else {
        planCode = payloadPlan;
      }
    }

    return {
      sub: payload.sub,
      username: payload.username,
      roles,
      tenantId,
      tenantCode,
      planCode,
    };
  }
}
