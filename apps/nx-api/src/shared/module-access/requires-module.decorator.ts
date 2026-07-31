/**
 * File: apps/nx-api/src/shared/module-access/requires-module.decorator.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 標記某個 controller / handler 需要哪一個 app 模組（如 'NX07'）。
 * - 與 {@link ModuleAccessGuard} 搭配使用；沒有標記＝不做模組檢查。
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, ModuleAccessGuard, RolesGuard)
 *   @RequiresModule('NX07')
 *   export class Nx07AttendanceController {}
 */

import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requiresModule';

export const RequiresModule = (appModuleCode: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, appModuleCode);
