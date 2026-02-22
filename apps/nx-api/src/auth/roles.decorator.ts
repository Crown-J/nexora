/**
 * File: apps/nx-api/src/auth/roles.decorator.ts
 * Purpose: 定義 API 需要的角色
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @CODE nxapi_auth_roles_decorator_001
 * 說明：
 * - 在 Controller 方法上標記所需角色
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
