/**
 * File: apps/nx-api/src/nx00/brand/dto/brand.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-DTO-001：Brand DTO（零件品牌 nx00_part_brand；國家→country_id，對齊 docs/nx00_field.csv）
 */

export type BrandDto = {
    id: string;
    code: string;
    name: string;
    /** → nx00_country.id */
    countryId: string | null;
    /** 等同 nx00_country.code（保留舊欄位名供前端） */
    originCountry: string | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;

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

export type ListBrandQuery = {
    q?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateBrandBody = {
    code: string;
    name: string;
    countryId?: string | null;
    /** 若未傳 countryId，可依 3 碼國家代碼對應 nx00_country（如 DEU、TWN） */
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateBrandBody = {
    code?: string;
    name?: string;
    countryId?: string | null;
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};