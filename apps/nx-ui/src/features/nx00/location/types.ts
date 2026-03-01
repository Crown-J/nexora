/**
 * File: apps/nx-ui/src/features/nx00/location/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-TYPES-001：Location Types（SSOT）
 */

export type LocationDto = {
    id: string;

    warehouseId: string;

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

    statusCode?: string;
    remark2?: string | null;
};

export type UpdateLocationBody = {
    warehouseId?: string;

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