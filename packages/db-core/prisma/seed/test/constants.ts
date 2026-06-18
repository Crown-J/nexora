// packages/db-core/prisma/seed/test/constants.ts
// @FUNCTION_CODE SYS-TEST-SVC-001-F01
// 測試租戶常數：使用 99 起始的 ID 前綴，與正式客戶區隔。
//
// ID 段位規劃：
//   nx99_tenant：9900001/9900002/9900003 → LITE/PLUS/PRO 三個測試租戶
//   nx01_user：
//     9900001/9900002/9900003 → 各租戶的 admin
//     9900011~9900014         → LITE 4 個測試使用者
//     9900021~9900026         → PLUS 6 個測試使用者
//     9900031~9900038         → PRO 8 個測試使用者

/** LITE 測試租戶 */
export const TEST_LITE_TENANT_ID = 'NX99TANT9900001';
export const TEST_LITE_ADMIN_USER_ID = 'NX01USER9900001';

/** PLUS 測試租戶 */
export const TEST_PLUS_TENANT_ID = 'NX99TANT9900002';
export const TEST_PLUS_ADMIN_USER_ID = 'NX01USER9900002';

/** PRO 測試租戶 */
export const TEST_PRO_TENANT_ID = 'NX99TANT9900003';
export const TEST_PRO_ADMIN_USER_ID = 'NX01USER9900003';

/** admin 的 OWNER 角色掛載 id（2026-06-18 新增、修 admin 沒掛 OWNER 導致 user list 403）
 *  每個測試租戶 admin 都掛 OWNER + isPrimary=true、過 RolesGuard 全通行 */
export const TEST_LITE_ADMIN_OWNER_UR_ID = 'NX01UR9900001';
export const TEST_PLUS_ADMIN_OWNER_UR_ID = 'NX01UR9900002';
export const TEST_PRO_ADMIN_OWNER_UR_ID = 'NX01UR9900003';

/** bcrypt hash of "Nexoragrid2026"（re-export 自 system 層，避免兩處不一致）*/
export { DEFAULT_PASSWORD_HASH as TEST_ADMIN_PASSWORD_HASH } from '../system/constants';
