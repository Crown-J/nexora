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
    /** 主檔 UI：由 nx00_user_role（is_active=true）中 is_primary 或第一筆對應之 role.name */
    jobTitle: string | null;

    /** 隸屬倉庫摘要：由 nx00_user_warehouse（is_active=true）彙整，多筆以「、」分隔 */
    warehouseSummary: string | null;

    createdAt: string;
    createdBy: string | null;
    /** 建立者帳號（與 createdByName 併用可組「帳號 姓名」） */
    createdByUsername: string | null;
    createdByName: string | null;

    updatedAt: string;
    updatedBy: string | null;
    updatedByUsername: string | null;
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
    /** 未傳時使用操作者 JWT 之 tenantId（nx00_user.tenant_id 必填） */
    tenantId?: string | null;
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