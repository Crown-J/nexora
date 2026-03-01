/**
 * File: apps/nx-ui/src/features/nx00/user-role/api/user-role.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-ROLE-API-001：UserRole API Client（list/get/assign/revoke/setPrimary/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type {
    AssignUserRoleBody,
    PagedResult,
    SetActiveBody,
    SetPrimaryBody,
    RevokeUserRoleBody,
    UserRoleDto,
    UserLiteDto,
} from '@/features/nx00/user-role/types';

const BASE = '/user-role';

// ✅ 右側搜尋 users（你後端如果不是 /user，改這裡即可）
const USER_BASE = '/user';

export type ListUserRoleParams = {
    userId?: string;
    roleId?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F01
 * 說明：
 * - listUserRole：列出 user-role（分頁）
 * - GET /user-role?userId=&roleId=&isActive=&page=&pageSize=
 */
export async function listUserRole(params: ListUserRoleParams): Promise<PagedResult<UserRoleDto>> {
    const query = buildQueryString({
        userId: params.userId,
        roleId: params.roleId,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        page: String(params.page),
        pageSize: String(params.pageSize),
    });

    const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_user_role_list_001');
    return (await res.json()) as PagedResult<UserRoleDto>;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F02
 * 說明：
 * - getUserRole：取得單筆 user-role
 * - GET /user-role/:id
 */
export async function getUserRole(id: string): Promise<UserRoleDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_user_role_get_001');
    return (await res.json()) as UserRoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F03
 * 說明：
 * - assignUserRole：指派角色
 * - POST /user-role
 */
export async function assignUserRole(body: AssignUserRoleBody): Promise<UserRoleDto> {
    const res = await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_role_assign_001');
    return (await res.json()) as UserRoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F04
 * 說明：
 * - revokeUserRole：撤銷（soft revoke）
 * - PATCH /user-role/:id/revoke
 */
export async function revokeUserRole(id: string, body: RevokeUserRoleBody = {}): Promise<UserRoleDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_role_revoke_001');
    return (await res.json()) as UserRoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F05
 * 說明：
 * - setUserRolePrimary：設為主角色（同 user 只能有一個 primary）
 * - PATCH /user-role/:id/primary
 */
export async function setUserRolePrimary(id: string, body: SetPrimaryBody): Promise<UserRoleDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/primary`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_role_set_primary_001');
    return (await res.json()) as UserRoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F06
 * 說明：
 * - setUserRoleActive：切換啟用狀態
 * - PATCH /user-role/:id/active
 */
export async function setUserRoleActive(id: string, body: SetActiveBody): Promise<UserRoleDto> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });

    await assertOk(res, 'nxui_nx00_user_role_set_active_001');
    return (await res.json()) as UserRoleDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USER-ROLE-API-001-F07
 * 說明：
 * - searchUsers：右側搜尋 users 候選（autocomplete）
 * - GET /user?q=&page=1&pageSize=20
 *
 * Notes:
 * - 若你後端 user list 不是這支，改 USER_BASE 即可
 */
export async function searchUsers(q: string): Promise<UserLiteDto[]> {
    const query = buildQueryString({
        q: q?.trim() ? q.trim() : undefined,
        page: '1',
        pageSize: '20',
    });

    const res = await apiFetch(`${USER_BASE}${query}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_user_lookup_001');

    // 允許後端回傳 PagedResult 或直接 array：兩種都接
    const data = await res.json();
    if (Array.isArray(data)) return data as UserLiteDto[];
    if (data && Array.isArray(data.items)) return data.items as UserLiteDto[];
    return [];
}