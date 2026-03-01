/**
 * File: apps/nx-ui/src/features/nx00/warehouse/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-TYPES-001：Warehouse Types（SSOT）
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
    createdByName?: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName?: string | null;
};

export type CreateWarehouseBody = {
    code: string;
    name: string;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;

    statusCode?: string;
    remark2?: string | null;
};

export type UpdateWarehouseBody = {
    code?: string;
    name?: string;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;

    statusCode?: string;
    remark2?: string | null;
};