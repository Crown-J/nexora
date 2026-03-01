/**
 * File: apps/nx-api/src/nx00/brand/dto/brand.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-BRAND-DTO-001：Brand DTO（LITE 對齊 nx00_brand）
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
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateBrandBody = {
    code?: string;
    name?: string;
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};