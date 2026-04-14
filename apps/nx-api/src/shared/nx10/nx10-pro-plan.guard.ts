import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { planSupportsNexoraPro } from '../nexora-pro-plan';

@Injectable()
export class Nx10ProPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!planSupportsNexoraPro(req.user?.planCode ?? null)) {
      throw new ForbiddenException('NX10 requires PRO plan');
    }
    return true;
  }
}
