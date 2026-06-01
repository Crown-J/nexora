// apps/nx-api/src/platform-auth/strategies/platform-jwt.strategy.ts
// 平台層 vs 租戶層分離軌 Phase 2：平台 JWT Strategy
//
// 設計重點：
// - 跟既有 JwtStrategy 共用 secret、但 strategy name = 'platform-jwt'（passport 區隔）
// - validate 只認 scope === 'platform' 的 token、其他 scope 拒絕
// - tenant token 即使 secret 對也無法用 PlatformAdminGuard 進入（scope 不符）
// - validate 回傳 PlatformRequestUser、注入 req.user

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';

export type PlatformJwtPayload = {
  sub: string;
  account: string;
  scope: 'platform' | 'tenant';
  iat?: number;
  exp?: number;
};

export type PlatformRequestUser = {
  sub: string;
  account: string;
  scope: 'platform';
  displayName: string;
};

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
    });
  }

  async validate(payload: PlatformJwtPayload): Promise<PlatformRequestUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid platform token payload');
    }
    // scope 嚴守：tenant token 拒絕進入 platform endpoint
    if (payload.scope !== 'platform') {
      throw new UnauthorizedException('Token scope mismatch (tenant token cannot access platform)');
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, account: true, displayName: true, isActive: true },
    });
    if (!admin) {
      throw new UnauthorizedException('Platform admin not found');
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Platform admin account disabled');
    }

    return {
      sub: admin.id,
      account: admin.account,
      scope: 'platform',
      displayName: admin.displayName,
    };
  }
}
