/**
 * File: apps/nx-api/src/nx00/warehouse/dto/warehouse.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-WAREHOUSE-DTO-001：Warehouse DTO（LITE 對齊 nx00_warehouse）
 */

export type WarehouseDto = {
    id: string;
    code: string;
    name: string;
    remark: string | null;
    sortNo: number;
    isActive: boolean;

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

export type ListWarehouseQuery = {
    q?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateWarehouseBody = {
    code: string;
    name: string;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateWarehouseBody = {
    code?: string;
    name?: string;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};