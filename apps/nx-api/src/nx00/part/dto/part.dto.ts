/**
 * File: apps/nx-api/src/nx00/part/dto/part.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-DTO-001：Part DTO（LITE 對齊 nx00_part）
 */

/** nx00_part.type：A=專用型 / B=通用型 / C=組合型 / D=拆解型 */
export type PartTypeCode = 'A' | 'B' | 'C' | 'D';

export type PartDto = {
    id: string;
    code: string;
    name: string;

    partBrandId: string | null;
    brandCode: string | null;
    brandName: string | null;

    /** 是否正廠件 */
    isOem: boolean;
    /** 汽車廠牌 → nx00_car_brand.id */
    carBrandId: string | null;
    carBrandCode: string | null;
    carBrandName: string | null;

    /** A/B/C/D 或 null */
    partType: string | null;

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
    partBrandId?: string;
    carBrandId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreatePartBody = {
    code: string;
    name: string;
    partBrandId?: string | null;
    isOem?: boolean;
    carBrandId?: string | null;
    /** A/B/C/D，空字串視為 null */
    partType?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;
};

export type UpdatePartBody = {
    code?: string;
    name?: string;
    partBrandId?: string | null;
    isOem?: boolean;
    carBrandId?: string | null;
    partType?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};
