/**
 * File: apps/nx-api/src/nx00/roles/dto/roles.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ROLES-DTO-001：Roles DTO
 */

export type RoleDto = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;

    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;

    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type ListRolesQuery = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type CreateRoleBody = {
    code: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
};

export type UpdateRoleBody = {
    code?: string;
    name?: string;
    description?: string | null;
    isActive?: boolean;
};

export type SetActiveBody = {
    isActive: boolean;
};