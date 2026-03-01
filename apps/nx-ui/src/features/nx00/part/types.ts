/**
 * File: apps/nx-ui/src/features/nx00/part/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-TYPES-001：Part Types（SSOT）
 *
 * Notes:
 * - 本檔案為 part 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - createdByName/updatedByName 若後端有回傳，可直接顯示；未回傳則 fallback id
 * - brandName/brandCode 為 UI 便利欄位：後端若未回傳，可在 UI 用 brandId fallback
 */

export type PartDto = {
    id: string;
    code: string;
    name: string;

    brandId: string | null;
    brandCode?: string | null;
    brandName?: string | null;

    spec: string | null;
    uom: string;
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

export type PartsListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreatePartBody = {
    code: string;
    name: string;
    brandId?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;

    statusCode?: string;
    remark?: string | null;
};

export type UpdatePartBody = {
    code?: string;
    name?: string;
    brandId?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;

    statusCode?: string;
    remark?: string | null;
};