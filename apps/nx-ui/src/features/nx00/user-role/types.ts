/**
 * File: apps/nx-ui/src/features/nx00/user-role/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-ROLE-TYPES-001：UserRole types（SSOT）
 *
 * Notes:
 * - UserRole 是關聯管理頁（Role 群組 → Members）
 * - UI 顯示 username/displayName，不顯示 id（fallback 才顯示 id）
 */

export type RoleLiteDto = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
};

export type UserLiteDto = {
    id: string;
    username: string;
    displayName?: string | null;
    email?: string | null;
    isActive: boolean;
};

export type UserRoleDto = {
    id: string;
    userId: string;
    roleId: string;

    isPrimary: boolean;
    assignedAt: string;
    assignedBy: string | null;
    revokedAt: string | null;
    isActive: boolean;

    // 後端若有 join 回傳就用；沒有也沒關係（UI 會 fallback）
    user?: UserLiteDto;
    role?: RoleLiteDto;

    assignedByName?: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type AssignUserRoleBody = {
    userId: string;
    roleId: string;
    isPrimary?: boolean;
};

export type RevokeUserRoleBody = {
    remark?: string | null;
};

export type SetPrimaryBody = {
    isPrimary: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};