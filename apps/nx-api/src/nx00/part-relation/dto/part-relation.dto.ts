/** docs/nx00_field.csv：S/R/C/B/F */
export type PartRelationType = 'S' | 'R' | 'C' | 'B' | 'F';

export type PartRelationDto = {
    id: string;
    partIdFrom: string;
    partIdTo: string;
    partCodeFrom: string | null;
    partNameFrom: string | null;
    partCodeTo: string | null;
    partNameTo: string | null;
    relationType: PartRelationType;
    remark: string | null;
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

export type ListPartRelationQuery = { q?: string; isActive?: boolean; page?: number; pageSize?: number };

export type CreatePartRelationBody = {
    partIdFrom: string;
    partIdTo: string;
    relationType: PartRelationType;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdatePartRelationBody = {
    partIdFrom?: string;
    partIdTo?: string;
    relationType?: PartRelationType;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = { isActive: boolean };
