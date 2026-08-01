/**
 * File: apps/nx-api/src/shared/module-access/module-access.guard.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 依 **模組訂閱** 決定能不能用，取代舊的 Nx0{7,8,9}ProPlanGuard（依 planCode 判 PRO）。
 * - 產品鐵則（CLAUDE.md §4）：功能全模組化不綁版本、絕不做版本功能閘門。
 *
 * Notes:
 * - 純記憶體檢查：模組清單已由 jwt.strategy 在既有的訂閱查詢上一併解析，掛在 req.user.enabledModules。
 *   guard 本身**不再打 DB**。
 * - ⚠ 跨租戶平台使用者（SYSADMIN 且 tenantId 為 null）放行——他們是 NEXORA 團隊、不隸屬任何租戶，
 *   若照模組檢查會被自己的產品擋在門外。**這是本次改動刻意調整的行為**（舊 guard 因 planCode 為 null 會擋住），
 *   若執行長認為平台端也該受限，改這一段即可。
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { isDevAuthOpen } from '../dev/dev-auth';

import { REQUIRES_MODULE_KEY } from './requires-module.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // v3.0.0 開發期免登入：模組訂閱檢查跳過（見 shared/dev/dev-auth.ts）
    if (isDevAuthOpen()) return true;

    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // 沒有標記 @RequiresModule ＝ 不做模組檢查
    if (!required) return true;

    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const u = req.user;

    // 跨租戶平台（NEXORA 團隊）：不隸屬任何租戶，不受模組訂閱限制
    if (u && u.tenantId == null) return true;

    const want = required.trim().toUpperCase();
    const has = (u?.enabledModules ?? []).includes(want);
    if (!has) {
      throw new ForbiddenException(`Module ${want} is not enabled for this tenant`);
    }
    return true;
  }
}
