/**
 * File: apps/nx-api/src/auth/jwt.strategy.ts
 * Purpose: JWT 驗證 + 注入 roles 到 req.user
 * Notes:
 * - validate 回傳物件會掛到 req.user
 * - 一定要保留 sub，避免 RolesGuard 判定為 Invalid token
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
};

export type RequestUser = {
  sub: string;
  username: string;
  roles: string[];
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
   * 說明：
   * - token 驗證通過後，查 DB 取得角色 codes
   * - 回傳 { sub, username, roles } 給 req.user
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

    // ✅ 關鍵：一定要回傳 sub，RolesGuard 才抓得到
    return {
      sub: payload.sub,
      username: payload.username,
      roles,
    };
  }
}
