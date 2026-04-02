/**
 * File: apps/nx-api/src/nx00/part/dto/part.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-DTO-001：Part DTO（對齊 docs/nx00_field.csv / nx00_part）
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

    /** A/B/C/D 或 null */
    partType: string | null;

    secCode: string | null;
    seg1: string | null;
    seg2: string | null;
    seg3: string | null;
    seg4: string | null;
    seg5: string | null;
    countryId: string | null;
    /** 產地國家（nx00_country）顯示用 */
    countryCode: string | null;
    countryName: string | null;

    partGroupId: string | null;
    /** 零件族群顯示用 */
    partGroupCode: string | null;
    partGroupName: string | null;

    spec: string | null;
    uom: string;
    isActive: boolean;

    createdAt: string;
    createdBy: string | null;
    /** 建立者帳號（與 createdByName 併用可組「帳號 姓名」） */
    createdByUsername: string | null;
    createdByName: string | null;

    updatedAt: string;
    updatedBy: string | null;
    updatedByUsername: string | null;
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
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreatePartBody = {
    code: string;
    name: string;
    partBrandId?: string | null;
    isOem?: boolean;
    /** A/B/C/D，空字串視為 null */
    partType?: string | null;
    secCode?: string | null;
    seg1?: string | null;
    seg2?: string | null;
    seg3?: string | null;
    seg4?: string | null;
    seg5?: string | null;
    countryId?: string | null;
    partGroupId?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;
};

export type UpdatePartBody = {
    code?: string;
    name?: string;
    partBrandId?: string | null;
    isOem?: boolean;
    partType?: string | null;
    secCode?: string | null;
    seg1?: string | null;
    seg2?: string | null;
    seg3?: string | null;
    seg4?: string | null;
    seg5?: string | null;
    countryId?: string | null;
    partGroupId?: string | null;
    spec?: string | null;
    uom?: string;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};
