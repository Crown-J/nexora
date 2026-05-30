// apps/nx-api/src/shared/decorators/permission.decorator.ts
// v1.2 對齊軌 A+B：新 RBAC framework 權限 decorator
//
// 用法：@Permission('sale.quote.list')
//      @Permission('sale.so.create', 'sale.so.edit')  // 任一通過即可
//
// PermissionsGuard 會：
// 1. 查 user 的 nx01_user_role active 角色
// 2. 查每個角色的 nx01_role_permission 連結到 nx01_permission
// 3. 若有任一 permissionCode 命中、放行
// 4. SYSADMIN / OWNER 永遠全通行（safety net、避免鎖死系統）

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permission = (...permissionCodes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissionCodes);
