/**
 * File: apps/nx-ui/src/features/nx00/brand/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-BRAND-TYPES-001：Brand Types（SSOT）
 *
 * Notes:
 * - 本檔案為 brand 前端型別單一真實來源（API/HOOK/UI 皆使用）
 * - createdByName/updatedByName 若後端有回傳，可直接顯示；未回傳則 fallback id
 */

export type BrandDto = {
    id: string;

    code: string;
    name: string;
    originCountry: string | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;

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

export type BrandsListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateBrandBody = {
    code: string;
    name: string;
    originCountry?: string | null;
    remark?: string | null;
    isActive?: boolean;
    sortNo?: number;

    statusCode?: string;
    remark2?: string | null; // 保留（避免跟 remark 混淆，未來可拿掉）
};

export type UpdateBrandBody = {
    code?: string;
    name?: string;
    originCountry?: string | null;
    remark?: string | null;
    isActive?: boolean;
    sortNo?: number;

    statusCode?: string;
    remark2?: string | null;
};