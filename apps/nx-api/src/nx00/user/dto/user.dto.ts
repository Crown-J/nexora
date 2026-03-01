/**
 * File: apps/nx-api/src/nx00/user/dto/user.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USER-DTO-001：User DTO（LITE 對齊 nx00_user）
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

export type ListUserQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateUserBody = {
    username: string;
    password: string; // 明碼只允許從 API input 進來，DB 存 passwordHash
    displayName: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
};

export type UpdateUserBody = {
    password?: string; // 可選：要改密碼才傳
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};