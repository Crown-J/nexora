/**
 * File: apps/nx-ui/src/features/nx00/roles/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLES-TYPES-001：Roles Types（SSOT）
 *
 * Notes:
 * - 本檔案為 roles 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - 若後端回傳 createdByName/updatedByName，可直接顯示；未回傳則 fallback id
 */

export type RoleDto = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;

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

export type RolesListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateRoleBody = {
    code: string;
    name: string;
    description?: string | null;
    isActive?: boolean;

    // 保留：未來若後端支援可直接送
    statusCode?: string;
    remark?: string | null;
};

export type UpdateRoleBody = {
    code?: string;
    name?: string;
    description?: string | null;
    isActive?: boolean;

    statusCode?: string;
    remark?: string | null;
};