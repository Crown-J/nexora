/**
 * File: apps/nx-ui/src/features/nx00/permissions/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PERM-TYPES-001：Permissions Types（SSOT）
 *
 * Notes:
 * - permissions 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - createdByName/updatedByName 為 optional：後端有回就顯示，沒有就 fallback id
 */

export type PermissionDto = {
    id: string;

    code: string;
    name: string;

    moduleCode: string;
    action: string;

    isActive: boolean;
    sortNo: number;

    createdAt: string;
    createdBy: string | null;
    createdByName?: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName?: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type PermissionsListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreatePermissionBody = {
    code: string;
    name: string;
    moduleCode: string;
    action: string;

    isActive?: boolean;
    sortNo?: number;

    // 保留：未來若後端支援可直接送
    statusCode?: string;
    remark?: string | null;
};

export type UpdatePermissionBody = {
    code?: string;
    name?: string;
    moduleCode?: string;
    action?: string;

    isActive?: boolean;
    sortNo?: number;

    statusCode?: string;
    remark?: string | null;
};