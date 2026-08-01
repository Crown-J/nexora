// apps/nx-api/src/shared/guards/jwt-auth.guard.ts
// JwtAuthGuard：保護路由用（@UseGuards(JwtAuthGuard)）
//
// v3.0.0 開發期：免登入開關打開時跳過 token 驗證、直接注入固定身分。
// 開關與理由見 shared/dev/dev-auth.ts。⛔ 正式環境永遠走原本的驗證。

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { buildDevRequestUser, isDevAuthOpen } from '../dev/dev-auth';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isDevAuthOpen()) {
      const req = context.switchToHttp().getRequest<{ user?: unknown }>();
      req.user = buildDevRequestUser();
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }
}
