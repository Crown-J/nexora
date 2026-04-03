/**
 * Car brand（nx00_car_brand）— 對齊 Prisma / docs
 */

export type CarBrandDto = {
    id: string;
    code: string;
    name: string;
    countryId: string | null;
    /** nx00_country.code */
    countryCode: string | null;
    /** nx00_country.name */
    countryName: string | null;
    /** 同 countryCode，保留舊欄位名 */
    originCountry: string | null;
    remark: string | null;
    isActive: boolean;
    sortNo: number;

    createdAt: string;
    createdBy: string | null;
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

export type ListCarBrandQuery = {
    q?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateCarBrandBody = {
    /** 平台 ADMIN（JWT 無租戶）時必填 */
    tenantId?: string;
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

export type SetActiveBody = { isActive: boolean };
