export type CurrencyDto = {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
    decimalPlaces: number;
    sortNo: number;
    isActive: boolean;
    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;
    updatedAt: string;
    updatedBy: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = { items: T[]; page: number; pageSize: number; total: number };

export type ListCurrencyQuery = { q?: string; isActive?: boolean; page?: number; pageSize?: number };

export type CreateCurrencyBody = {
    code: string;
    name: string;
    symbol?: string | null;
    decimalPlaces?: number;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateCurrencyBody = {
    code?: string;
    name?: string;
    symbol?: string | null;
    decimalPlaces?: number;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = { isActive: boolean };
