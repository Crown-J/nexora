/**
 * File: apps/nx-ui/src/features/nx00/user/api/user.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-API-001：User API Client（list/get/create/update/setActive）
 *
 * Notes:
 * - 統一使用 shared/api（apiFetch + assertOk + buildQueryString）
 * - 型別一律引用 features/nx00/user/types.ts（SSOT）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreateUserBody, PagedResult, UpdateUserBody, UserDto } from '@/features/nx00/user/types';

export type ListUserParams = {
    page: number;
    pageSize: number;
    q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-API-001-F01
 * 說明：
 * - listUser：列出使用者清單（分頁）
 * - GET /user?page=&pageSize=&q=
 */
export async function listUser(params: ListUserParams): Promise<PagedResult<UserDto>> {
    const query = buildQueryString({
        page: String(params.page),
        pageSize: String(params.pageSize),
        q: params.q?.trim() ? params.q.trim() : undefined,
    });

    const res = await apiFetch(`/user${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_user_list_001');
    return (await res.json()) as PagedResult<UserDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-API-001-F02
 * 說明：
 * - getUser：取得單筆使用者
 * - GET /user/:id
 */
export async function getUser(id: string): Promise<UserDto> {
    const res = await apiFetch(`/user/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_user_get_001');
    return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-API-001-F03
 * 說明：
 * - createUser：建立使用者
 * - POST /user
 */
export async function createUser(body: CreateUserBody): Promise<UserDto> {
    const res = await apiFetch('/user', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_create_001');
    return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-API-001-F04
 * 說明：
 * - updateUser：更新使用者
 * - PUT /user/:id
 */
export async function updateUser(id: string, body: UpdateUserBody): Promise<UserDto> {
    const res = await apiFetch(`/user/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_update_001');
    return (await res.json()) as UserDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-API-001-F05
 * 說明：
 * - setUserActive：切換啟用狀態
 * - PATCH /user/:id/active
 */
export async function setUserActive(id: string, isActive: boolean): Promise<UserDto> {
    const res = await apiFetch(`/user/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });

    await assertOk(res, 'nxui_nx00_user_set_active_001');
    return (await res.json()) as UserDto;
}