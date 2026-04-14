import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class Nx07NoFinanceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const roles = req.user?.roles ?? [];
    if (roles.some((r) => String(r).trim().toUpperCase() === 'FINANCE')) {
      throw new ForbiddenException('Finance role cannot access NX07');
    }
    return true;
  }
}
