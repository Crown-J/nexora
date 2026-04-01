export type CarBrandDto = {
    id: string;
    code: string;
    name: string;
    countryId: string | null;
    originCountry: string | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;
    createdAt: string;
    createdBy: string | null;
    createdByName?: string | null;
    updatedAt: string;
    updatedBy: string | null;
    updatedByName?: string | null;
};

export type PagedResult<T> = { items: T[]; page: number; pageSize: number; total: number };

export type CreateCarBrandBody = {
    code: string;
    name: string;
    countryId?: string | null;
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateCarBrandBody = {
    code?: string;
    name?: string;
    countryId?: string | null;
    originCountry?: string | null;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};
