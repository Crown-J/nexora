import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { NX00_VIEW_PERMISSION_KEY, type Nx00ViewPermissionMeta } from './require-nx00-view-permission.decorator';
import { ViewPermissionService } from './view-permission.service';

@Injectable()
export class Nx00ViewPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly viewPerm: ViewPermissionService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const meta = this.reflector.getAllAndOverride<Nx00ViewPermissionMeta | undefined>(
            NX00_VIEW_PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!meta) return true;

        const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
        const user = req.user;
        if (!user?.sub) {
            throw new ForbiddenException('Invalid token');
        }

        const merged = await this.viewPerm.mergeForRequestUser(user);
        if (merged === null) return true;

        const p = merged[meta.viewCode];
        if (!this.viewPerm.actionSatisfied(p, meta.action)) {
            throw new ForbiddenException('此畫面權限不足');
        }
        return true;
    }
}
