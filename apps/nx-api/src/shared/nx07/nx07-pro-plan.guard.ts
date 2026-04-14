import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { planSupportsNx07Pro } from './nx07-plan';

@Injectable()
export class Nx07ProPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const u = req.user;
    if (!planSupportsNx07Pro(u?.planCode ?? null)) {
      throw new ForbiddenException('NX07 requires PRO plan');
    }
    return true;
  }
}
