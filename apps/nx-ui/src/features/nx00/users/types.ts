/**
 * File: apps/nx-ui/src/features/nx00/users/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-TYPES-001：Users Types（SSOT）
 *
 * Notes:
 * - users 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - displayName 對齊前端 camelCase，後端若回 display_name 可在 API adapter 做轉換
 * - createdBy/updatedBy 先用 string | null（名稱可另外加 createdByName/updatedByName）
 */

export type UserDto = {
    id: string;

    username: string;
    displayName: string | null;

    email: string | null;
    phone: string | null;

    isActive: boolean;
    statusCode: string | null;
    remark: string | null;

    lastLoginAt: string | null;

    createdAt: string;
    createdBy: string | null;

    updatedAt: string | null;
    updatedBy: string | null;

    // 可選：若後端有回顯示名稱可直接吃
    createdByName?: string | null;
    updatedByName?: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type UsersListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateUserBody = {
    username: string;

    displayName?: string | null;
    email?: string | null;
    phone?: string | null;

    isActive?: boolean;
    statusCode?: string | null;
    remark?: string | null;

    // 密碼欄位依你後端設計調整（如果後端需要）
    password?: string;
};

export type UpdateUserBody = {
    username?: string;

    displayName?: string | null;
    email?: string | null;
    phone?: string | null;

    isActive?: boolean;
    statusCode?: string | null;
    remark?: string | null;

    // 若允許改密碼
    password?: string;
};