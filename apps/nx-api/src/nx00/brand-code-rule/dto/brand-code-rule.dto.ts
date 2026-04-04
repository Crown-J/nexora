export type BrandCodeRuleDto = {
    id: string;
    partBrandId: string;
    name: string;
    partBrandCode: string | null;
    partBrandName: string | null;
    seg1: number;
    seg2: number;
    seg3: number;
    seg4: number;
    seg5: number;
    codeFormat: string;
    brandSort: string;
    isActive: boolean;
    createdAt: string;
    createdBy: string | null;
    createdByUsername: string | null;
    createdByName: string | null;
    updatedAt: string;
    updatedBy: string | null;
    updatedByUsername: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = { items: T[]; page: number; pageSize: number; total: number };

export type ListBrandCodeRuleQuery = { q?: string; isActive?: boolean; page?: number; pageSize?: number };

export type CreateBrandCodeRuleBody = {
    partBrandId: string;
    name: string;
    seg1?: number;
    seg2?: number;
    seg3?: number;
    seg4?: number;
    seg5?: number;
    codeFormat?: string;
    brandSort?: string;
    isActive?: boolean;
};

export type UpdateBrandCodeRuleBody = {
    name?: string;
    seg1?: number;
    seg2?: number;
    seg3?: number;
    seg4?: number;
    seg5?: number;
    codeFormat?: string;
    brandSort?: string;
    isActive?: boolean;
};

export type SetActiveBody = { isActive: boolean };
