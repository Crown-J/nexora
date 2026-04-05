/**
 * File: apps/nx-api/src/nx02/guards/plus-plan.guard.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-PLS-GUA-001：PLUS／PRO 方案 Guard（LITE → 403 PLAN_NOT_SUPPORTED）
 *
 * @FUNCTION_CODE NX02-PLS-GUA-001-F01
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

/**
 * @FUNCTION_CODE NX02-PLS-GUA-001-F01
 */
@Injectable()
export class PlusPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    const p = (user?.planCode ?? '').trim().toUpperCase();
    if (p === 'PLUS' || p === 'PRO') return true;
    throw new HttpException(
      {
        code: 'PLAN_NOT_SUPPORTED',
        message: '此功能需 PLUS 或 PRO 方案',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
