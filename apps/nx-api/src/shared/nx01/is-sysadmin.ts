// apps/nx-api/src/shared/nx01/is-sysadmin.ts
/**
 * SYSADMIN 鎖定 helper
 *
 * 系統管理員（SYSADMIN）= 伊諾瓦（NEXORA team）跨租戶後台角色。
 * 對一般租戶用戶完全隱藏：不可在職務 / 使用者列表看到、不可指派 / 撤銷。
 * RequestUser.roles 由 jwt.strategy 注入（role.code 陣列）、不需額外 query。
 *
 * 用法：list / getById / assign 等入口判斷 requester 是否 SYSADMIN，
 * 否則對 SYSADMIN role / 擁有該 role 的 user 加過濾條件（裝作不存在）。
 */

import type { RequestUser } from '../../auth/strategies/jwt.strategy';

export const SYSADMIN_ROLE_CODE = 'SYSADMIN';

/** requester 自身是否具 SYSADMIN 角色（伊諾瓦後台） */
export function isSysadmin(user: RequestUser): boolean {
  return (user.roles ?? []).some(
    (c) => String(c).trim().toUpperCase() === SYSADMIN_ROLE_CODE,
  );
}
