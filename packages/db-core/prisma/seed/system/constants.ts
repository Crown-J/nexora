// packages/db-core/prisma/seed/system/constants.ts
// @FUNCTION_CODE SYS-SEED-SVC-001-F02
// 系統層常數：跨租戶共用，不隸屬任何租戶。

/** 系統管理員 UID：永遠 is_active=FALSE，僅用於 createdBy 標記系統資料。 */
export const SYSADMIN_USER_ID = 'NX01USER0000001';

/** 系統內部租戶 ID：SYSADMIN 的 tenantId 歸屬，永遠 is_active=FALSE。
 *  業務查詢預設過濾 active 自動排除；禁止在其下建立業務資料。 */
export const SYSTEM_TENANT_ID = 'NX99TANT0000000';

/** bcrypt：預設密碼 Nexoragrid2026 */
export const DEFAULT_PASSWORD_HASH =
  '$2b$10$H269i.oPp5pRGqcV2dzzb.viPbIMP4BMFR62oxD17CGiWvciXNWIq';
