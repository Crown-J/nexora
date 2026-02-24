/**
 * File: apps/nx-ui/src/features/nx00/roles/api/roles.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLES-API-001：Roles API Client（list/get/create/update/setActive）
 *
 * Notes:
 * - 統一使用 shared/api（apiFetch + assertOk + buildQueryString）
 * - 型別一律引用 features/nx00/roles/types.ts（SSOT）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreateRoleBody, PagedResult, RoleDto, UpdateRoleBody } from '@/features/nx00/roles/types';

export type ListRolesParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-API-001-F01
 * 說明：
 * - listRoles：列出角色清單（分頁）
 * - GET /roles?page=&pageSize=&q=
 */
export async function listRoles(params: ListRolesParams): Promise<PagedResult<RoleDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`/roles${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_roles_list_001');
    return (await res.json()) as PagedResult<RoleDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-API-001-F02
 * 說明：
 * - getRole：取得單筆角色
 * - GET /roles/:id
 */
export async function getRole(id: string): Promise<RoleDto> {
    const res = await apiFetch(`/roles/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_roles_get_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-API-001-F03
 * 說明：
 * - createRole：建立角色
 * - POST /roles
 */
export async function createRole(body: CreateRoleBody): Promise<RoleDto> {
    const res = await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_roles_create_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-API-001-F04
 * 說明：
 * - updateRole：更新角色
 * - PUT /roles/:id
 */
export async function updateRole(id: string, body: UpdateRoleBody): Promise<RoleDto> {
    const res = await apiFetch(`/roles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_roles_update_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-API-001-F05
 * 說明：
 * - setRoleActive：切換啟用狀態
 * - PATCH /roles/:id/active
 */
export async function setRoleActive(id: string, isActive: boolean): Promise<RoleDto> {
    const res = await apiFetch(`/roles/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_roles_set_active_001');
    return (await res.json()) as RoleDto;
}