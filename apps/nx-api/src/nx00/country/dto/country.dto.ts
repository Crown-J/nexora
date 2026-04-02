export type CountryDto = {
    id: string;
    code: string;
    name: string;
    sortNo: number;
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

export type ListCountryQuery = { q?: string; isActive?: boolean; page?: number; pageSize?: number };

export type CreateCountryBody = { code: string; name: string; sortNo?: number; isActive?: boolean };

export type UpdateCountryBody = {
    code?: string;
    name?: string;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = { isActive: boolean };
