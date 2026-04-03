/**
 * File: apps/nx-api/src/nx00/user-warehouse/dto/user-warehouse.dto.ts
 *
 * Purpose:
 * - NX00-API-USER-WH-DTO-001：UserWarehouse DTO（對齊 nx00_user_warehouse）
 */

export type UserWarehouseDto = {
    id: string;
    userId: string;
    warehouseId: string;

    isActive: boolean;

    assignedAt: string;
    assignedBy: string | null;
    assignedByName: string | null;

    revokedAt: string | null;

    userDisplayName: string | null;
    /** 使用者帳號（列表顯示；避免僅有 userId 內碼） */
    userAccount: string | null;
    warehouseCode: string | null;
    warehouseName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListUserWarehouseQuery = {
    userId?: string;
    warehouseId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type AssignUserWarehouseBody = {
    userId: string;
    warehouseId: string;
};

export type RevokeUserWarehouseBody = {
    revokedAt?: string;
};
