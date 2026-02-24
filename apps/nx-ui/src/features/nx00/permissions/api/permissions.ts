/**
 * File: apps/nx-ui/src/features/nx00/permissions/api/permissions.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PERM-API-001：Permissions API Client（list/get/create/update/setActive）
 *
 * Notes:
 * - 後端路徑為 /nx00/permissions（避免打到不存在的 /permissions）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreatePermissionBody, PagedResult, PermissionDto, UpdatePermissionBody } from '@/features/nx00/permissions/types';

export type ListPermissionsParams = {
    page: number;
    pageSize: number;
    q?: string;
};

const BASE = '/nx00/permissions';

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-API-001-F01
 * 說明：
 * - GET /nx00/permissions?page=&pageSize=&q=
 */
export async function listPermissions(params: ListPermissionsParams): Promise<PagedResult<PermissionDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_permissions_list_001');
    return (await res.json()) as PagedResult<PermissionDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-API-001-F02
 * 說明：
 * - GET /nx00/permissions/:id
 */
export async function getPermission(id: string): Promise<PermissionDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_permissions_get_001');
    return (await res.json()) as PermissionDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-API-001-F03
 * 說明：
 * - POST /nx00/permissions
 */
export async function createPermission(body: CreatePermissionBody): Promise<PermissionDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_permissions_create_001');
    return (await res.json()) as PermissionDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-API-001-F04
 * 說明：
 * - PUT /nx00/permissions/:id
 */
export async function updatePermission(id: string, body: UpdatePermissionBody): Promise<PermissionDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_permissions_update_001');
    return (await res.json()) as PermissionDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PERM-API-001-F05
 * 說明：
 * - PATCH /nx00/permissions/:id/active
 */
export async function setPermissionActive(id: string, isActive: boolean): Promise<PermissionDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_permissions_set_active_001');
    return (await res.json()) as PermissionDto;
}