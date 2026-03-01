/**
 * File: apps/nx-ui/src/features/nx00/user/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-TYPES-001：User Types（SSOT）
 *
 * Notes:
 * - 本檔案為 user 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - createdByName/updatedByName 若後端有回傳，可直接顯示；未回傳則 fallback id
 */

export type UserDto = {
    id: string;

    username: string;
    displayName: string;
    email: string | null;
    phone: string | null;

    isActive: boolean;
    lastLoginAt: string | null;

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

export type UsersListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateUserBody = {
    username: string;
    password?: string; // 前端建立用（後端轉 hash）
    displayName: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;

    statusCode?: string;
    remark?: string | null;
};

export type UpdateUserBody = {
    username?: string;
    password?: string; // 可選：重設密碼（若後端支援）
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;

    statusCode?: string;
    remark?: string | null;
};