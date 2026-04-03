export type PartGroupDto = {
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

export type ListPartGroupQuery = { q?: string; isActive?: boolean; page?: number; pageSize?: number };

export type CreatePartGroupBody = {
    /** 平台 ADMIN（JWT 無租戶）時必填 */
    tenantId?: string;
    code: string;
    name: string;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdatePartGroupBody = { code?: string; name?: string; sortNo?: number; isActive?: boolean };

export type SetActiveBody = { isActive: boolean };
