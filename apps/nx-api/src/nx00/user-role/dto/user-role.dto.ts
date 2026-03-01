/**
 * File: apps/nx-api/src/nx00/user-role/dto/user-role.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-ROLE-DTO-001：UserRole DTO（LITE 對齊 nx00_user_role）
 */

export type UserRoleDto = {
    id: string;
    userId: string;
    roleId: string;

    isPrimary: boolean;
    isActive: boolean;

    assignedAt: string;
    assignedBy: string | null;
    assignedByName: string | null;

    revokedAt: string | null;

    // 方便前端顯示（可選但建議）
    userDisplayName: string | null;
    roleCode: string | null;
    roleName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListUserRoleQuery = {
    userId?: string;
    roleId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type AssignUserRoleBody = {
    userId: string;
    roleId: string;
    isPrimary?: boolean;
};

export type RevokeUserRoleBody = {
    revokedAt?: string; // 不傳就由後端用 now()
};

export type SetPrimaryBody = {
    isPrimary: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};