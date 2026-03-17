/**
 * File: apps/nx-api/src/shared/decorators/current-user.decorator.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - CurrentUser decorator：從 req.user 取出 JWT 驗證後的使用者物件
 *
 * Notes:
 * - 型別為 RequestUser（見 auth/strategies/jwt.strategy.ts），含 sub, username, roles,
 *   tenantId, tenantCode, planCode（NX99-T3）
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type { RequestUser } from '../../auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
