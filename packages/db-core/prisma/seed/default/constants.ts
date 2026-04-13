/** 固定 ID：與規格／CSV 占位一致，便於重跑 seed 與測試驗證。 */
export const SYSADMIN_USER_ID = 'NX01USER0000001';
export const TENANT_ADMIN_USER_ID = 'NX01USER0000002';
export const DEMO_TENANT_ID = 'NX99TANT0000001';

/** bcrypt：租戶 admin — Nexoragrid2026（與舊 seed 相同，利於 demo） */
export const ADMIN_PASSWORD_HASH =
  '$2b$10$H269i.oPp5pRGqcV2dzzb.viPbIMP4BMFR62oxD17CGiWvciXNWIq';

/** SYSADMIN 不可登入，仍存雜湊占位 */
export const SYSADMIN_PASSWORD_HASH = ADMIN_PASSWORD_HASH;
