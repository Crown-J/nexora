/**
 * File: apps/nx-api/src/nx00/role-view/dto/role-view.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLE-VIEW-DTO-001：RoleView DTO（LITE 對齊 nx00_role_view）
 */

export type RoleViewPerms = {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExport: boolean;
};

export type RoleViewDto = {
    id: string;
    roleId: string;
    viewId: string;

    perms: RoleViewPerms;
    isActive: boolean;

    grantedAt: string;
    grantedBy: string | null;
    grantedByName: string | null;

    revokedAt: string | null;
    revokedBy: string | null;
    revokedByName: string | null;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string;
    updatedBy: string | null;
    updatedByName: string | null;

    // display helpers（建議保留）
    roleCode: string | null;
    roleName: string | null;
    viewCode: string | null;
    viewName: string | null;
    viewPath: string | null;
    viewModuleCode: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListRoleViewQuery = {
    roleId?: string;
    viewId?: string;
    moduleCode?: string; // 透過 view.moduleCode 篩
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type GrantRoleViewBody = {
    roleId: string;
    viewId: string;
    perms?: Partial<RoleViewPerms>; // 未提供就用預設（canRead true，其餘 false）
};

export type UpdateRoleViewPermsBody = {
    perms: Partial<RoleViewPerms>;
};

export type RevokeRoleViewBody = {
    revokedAt?: string; // 不傳就 now()
};

export type SetActiveBody = {
    isActive: boolean;
};