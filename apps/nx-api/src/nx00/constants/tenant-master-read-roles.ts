/**
 * 與 packages/db-core prisma seed ROLE_SPECS 一致。
 * 租戶內一般職務可讀取之主檔 API（GET 列表／明細）；寫入仍多為 ADMIN-only。
 */
export const NX00_TENANT_MASTER_READ_ROLES = [
    'ADMIN',
    'OWNER',
    'SALES',
    'WAREHOUSE',
    'DRIVER',
    'ACCOUNTANT',
] as const;
