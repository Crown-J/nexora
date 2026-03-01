/**
 * File: apps/nx-api/src/nx00/part/dto/part.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-DTO-001：Part DTO（LITE 對齊 nx00_part）
 */

export type PartDto = {
    id: string;
    code: string;
    name: string;

    brandId: string | null;
    brandCode: string | null; // display helper（待 brand model 確認）
    brandName: string | null; // display helper（待 brand model 確認）

    spec: string | null;
    uom: string;
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

export type ListPartQuery = {
    q?: string;
    brandId?: string;
    isActive?: boolean;
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
};

export type UpdatePartBody = {
    code?: string;
    name?: string;
    brandId?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};