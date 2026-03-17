/**
 * File: apps/nx-api/src/auth/strategies/jwt.strategy.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - JWT 驗證 + 注入 roles 到 req.user
 * - NX99-T3：validate 回傳 tenantId / tenantCode / planCode 供 API 識別租戶與方案
 *
 * Notes:
 * - validate 回傳物件會掛到 req.user
 * - 一定要保留 sub，避免 RolesGuard 判定為 Invalid token
 * - tenantId 為 null 時仍可通過驗證
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
   * 說明：
   * - token 驗證通過後，查 DB 取得角色 codes
   * - 回傳 { sub, username, roles, tenantId, tenantCode, planCode } 給 req.user
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const rows = await this.prisma.nx00UserRole.findMany({
      where: { userId: payload.sub },
      include: { role: true },
    });

    const roles = rows.map((r) => r.role.code);

    return {
      sub: payload.sub,
      username: payload.username,
      roles,
      tenantId: payload.tenantId ?? null,
      tenantCode: payload.tenantCode ?? null,
      planCode: payload.planCode ?? null,
    };
  }
}
