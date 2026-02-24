/**
 * File: apps/nx-api/src/nx00/permissions/dto/permissions.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PERMISSIONS-DTO-001：Permissions DTO（CRUD + audit displayName）
 *
 * Notes:
 * - 回傳同時包含 createdBy/updatedBy 與 createdByName/updatedByName
 * - createdByName/updatedByName 由 service include nx00_user.displayName 取得
 */

export type PermissionDto = {
    id: string;

    code: string;
    name: string;
    moduleCode: string;
    action: string;

    isActive: boolean;
    sortNo: number | null;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListPermissionsQuery = {
    q?: string;
    moduleCode?: string;
    action?: string;
    isActive?: boolean;
    page?: number; // 1-based
    pageSize?: number;
};

export type CreatePermissionBody = {
    code: string;
    name: string;
    moduleCode: string; // nx00/nx01/nx02...
    action: string;     // view/create/update/delete/post/...
    isActive?: boolean;
    sortNo?: number | null;
};

export type UpdatePermissionBody = {
    code?: string;
    name?: string;
    moduleCode?: string;
    action?: string;
    isActive?: boolean;
    sortNo?: number | null;
};