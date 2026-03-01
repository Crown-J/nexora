/**
 * File: apps/nx-api/src/nx00/location/dto/location.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-DTO-001：Location DTO（LITE 對齊 nx00_location）
 */

export type LocationDto = {
    id: string;
    warehouseId: string;

    // display helpers
    warehouseCode: string | null;
    warehouseName: string | null;

    code: string;
    name: string | null;

    zone: string | null;
    rack: string | null;
    levelNo: number | null;
    binNo: string | null;

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

export type ListLocationQuery = {
    q?: string;
    warehouseId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateLocationBody = {
    warehouseId: string;
    code: string;
    name?: string | null;

    zone?: string | null;
    rack?: string | null;
    levelNo?: number | null;
    binNo?: string | null;

    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateLocationBody = {
    warehouseId?: string; // 若你不想允許跨倉移動，可拿掉並在 service 禁止
    code?: string;
    name?: string | null;

    zone?: string | null;
    rack?: string | null;
    levelNo?: number | null;
    binNo?: string | null;

    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};