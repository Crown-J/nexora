/**
 * File: apps/nx-api/src/nx00/role/dto/role.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-DTO-001：Role DTO（LITE 對齊 nx00_role）
 */

export type RoleDto = {
    id: string;
    code: string;
    name: string;
    description: string | null;

    isSystem: boolean;
    isActive: boolean;
    sortNo: number;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string;
    updatedBy: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListRoleQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateRoleBody = {
    code: string;
    name: string;
    description?: string | null;

    isSystem?: boolean;  // LITE 新增
    isActive?: boolean;
    sortNo?: number;     // LITE 新增
};

export type UpdateRoleBody = {
    code?: string;
    name?: string;
    description?: string | null;

    isActive?: boolean;
    sortNo?: number;
    // isSystem 不提供 update（系統角色不可被隨意改）
};

export type SetActiveBody = {
    isActive: boolean;
};