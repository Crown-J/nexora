/**
 * File: apps/nx-ui/src/features/nx00/part/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-TYPES-001：Part Types（SSOT，對齊 nx-api PartDto / nx00_part）
 */

export type PartDto = {
    id: string;
    codeRuleId: string;
    codeRuleName?: string | null;
    code: string;
    name: string;

    partBrandId: string | null;
    brandCode?: string | null;
    brandName?: string | null;

    isOem: boolean;

    /** A/B/C/D */
    partType: string | null;

    secCode: string | null;
    seg1: string | null;
    seg2: string | null;
    seg3: string | null;
    seg4: string | null;
    seg5: string | null;

    countryId: string | null;
    countryCode?: string | null;
    countryName?: string | null;

    partGroupId: string | null;
    partGroupCode?: string | null;
    partGroupName?: string | null;

    spec: string | null;
    uom: string;
    isActive: boolean;

    createdAt: string;
    createdBy: string | null;
    createdByUsername?: string | null;
    createdByName?: string | null;

    updatedAt: string;
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

export type PartsListQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreatePartBody = {
    codeRuleId: string;
    code: string;
    name: string;
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

export type UpdatePartBody = {
    codeRuleId?: string;
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
