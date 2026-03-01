/**
 * File: apps/nx-ui/src/features/nx00/role/api/role.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-API-001：Role API Client（list/get/create/update/setActive）
 *
 * Notes:
 * - 統一使用 shared/api（apiFetch + assertOk + buildQueryString）
 * - 型別一律引用 features/nx00/role/types.ts（SSOT）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreateRoleBody, PagedResult, RoleDto, UpdateRoleBody } from '@/features/nx00/role/types';

export type ListRoleParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-API-001-F01
 * 說明：
 * - listRole：列出角色清單（分頁）
 * - GET /role?page=&pageSize=&q=
 */
export async function listRole(params: ListRoleParams): Promise<PagedResult<RoleDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`/role${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_role_list_001');
    return (await res.json()) as PagedResult<RoleDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-API-001-F02
 * 說明：
 * - getRole：取得單筆角色
 * - GET /role/:id
 */
export async function getRole(id: string): Promise<RoleDto> {
    const res = await apiFetch(`/role/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_role_get_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-API-001-F03
 * 說明：
 * - createRole：建立角色
 * - POST /role
 */
export async function createRole(body: CreateRoleBody): Promise<RoleDto> {
    const res = await apiFetch('/role', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_role_create_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-API-001-F04
 * 說明：
 * - updateRole：更新角色
 * - PUT /role/:id
 */
export async function updateRole(id: string, body: UpdateRoleBody): Promise<RoleDto> {
    const res = await apiFetch(`/role/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_role_update_001');
    return (await res.json()) as RoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-API-001-F05
 * 說明：
 * - setRoleActive：切換啟用狀態
 * - PATCH /role/:id/active
 */
export async function setRoleActive(id: string, isActive: boolean): Promise<RoleDto> {
    const res = await apiFetch(`/role/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_role_set_active_001');
    return (await res.json()) as RoleDto;
}