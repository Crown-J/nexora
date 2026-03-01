/**
 * File: apps/nx-api/src/nx00/view/dto/view.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-VIEW-DTO-001：View DTO（LITE 對齊 nx00_view）
 */

export type ViewDto = {
    id: string;
    code: string;
    name: string;
    moduleCode: string;
    path: string;
    sortNo: number;
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

export type ListViewQuery = {
    q?: string;
    moduleCode?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

export type CreateViewBody = {
    code: string;
    name: string;
    moduleCode: string;
    path: string;
    sortNo?: number;
    isActive?: boolean;
};

export type UpdateViewBody = {
    code?: string;
    name?: string;
    moduleCode?: string;
    path?: string;
    sortNo?: number;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};