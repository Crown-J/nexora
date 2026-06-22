/**
 * File: apps/nx-ui/src/features/shared/master/location/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-TYPES-001：Location Types（SSOT）
 */

export type LocationDto = {
    id: string;

    warehouseId: string;
    warehouseCode?: string | null;
    warehouseName?: string | null;

    /** 2026-06-22 執行長拍板新增四層架構 zone FK */
    zoneId?: string | null;

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
    createdByUsername?: string | null;
    createdByName?: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByUsername?: string | null;
    updatedByName?: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type CreateLocationBody = {
    warehouseId: string;
    /** 2026-06-22 執行長拍板新增四層架構 zone FK */
    zoneId?: string | null;

    code: string;
    name?: string | null;

    zone?: string | null;
    rack?: string | null;
    levelNo?: number | null;
    binNo?: string | null;

    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;

    statusCode?: string;
    remark2?: string | null;
};

export type UpdateLocationBody = {
    warehouseId?: string;
    /** 2026-06-22 執行長拍板新增四層架構 zone FK */
    zoneId?: string | null;

    code?: string;
    name?: string | null;

    zone?: string | null;
    rack?: string | null;
    levelNo?: number | null;
    binNo?: string | null;

    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;

    statusCode?: string;
    remark2?: string | null;
};