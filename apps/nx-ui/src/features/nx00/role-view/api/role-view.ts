/**
 * File: apps/nx-ui/src/features/nx00/role-view/api/role-view.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLE-VIEW-API-001：RoleView APIs（list/grant/updatePerms/revoke/setActive + listView）
 *
 * Notes:
 * - 你後端 controller：@Controller('role-view')、@Controller('view')
 * - 本檔案採「A 前端策略」：本地暫存 → Save 時拆成多個 API 呼叫
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult, RoleViewDto, ViewDto, Perms } from '@/features/nx00/role-view/types';

export type ListRoleViewParams = {
    roleId?: string;
    viewId?: string;
    moduleCode?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F01
 * 說明：
 * - listRoleView：列出 role-view（分頁）
 * - GET /role-view?roleId=&moduleCode=&isActive=&page=&pageSize=
 */
export async function listRoleView(params: ListRoleViewParams): Promise<PagedResult<RoleViewDto>> {
    const q = buildQueryString({
        roleId: params.roleId,
        viewId: params.viewId,
        moduleCode: params.moduleCode,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 1000), // 矩陣通常要一次拉完
    });

    const res = await apiFetch(`/role-view${q}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_role_view_list_001');
    return (await res.json()) as PagedResult<RoleViewDto>;
}

export type GrantRoleViewBody = {
    roleId: string;
    viewId: string;
} & Partial<Perms>;

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F02
 * 說明：
 * - grantRoleView：授權（建立或重新啟用）
 * - POST /role-view
 */
export async function grantRoleView(body: GrantRoleViewBody): Promise<RoleViewDto> {
    const res = await apiFetch('/role-view', { method: 'POST', body: JSON.stringify(body) });
    await assertOk(res, 'nxui_nx00_role_view_grant_001');
    return (await res.json()) as RoleViewDto;
}

export type UpdateRoleViewPermsBody = Partial<Perms>;

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F03
 * 說明：
 * - updateRoleViewPerms：更新 CRUDX 權限
 * - PATCH /role-view/:id/perms
 */
export async function updateRoleViewPerms(id: string, body: UpdateRoleViewPermsBody): Promise<RoleViewDto> {
    const res = await apiFetch(`/role-view/${encodeURIComponent(id)}/perms`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
    await assertOk(res, 'nxui_nx00_role_view_update_perms_001');
    return (await res.json()) as RoleViewDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F04
 * 說明：
 * - revokeRoleView：撤銷（soft revoke）
 * - PATCH /role-view/:id/revoke
 */
export async function revokeRoleView(id: string, body: Record<string, any> = {}): Promise<RoleViewDto> {
    const res = await apiFetch(`/role-view/${encodeURIComponent(id)}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
    await assertOk(res, 'nxui_nx00_role_view_revoke_001');
    return (await res.json()) as RoleViewDto;
}

export type SetActiveBody = { isActive: boolean };

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F05
 * 說明：
 * - setRoleViewActive：切換啟用狀態
 * - PATCH /role-view/:id/active
 */
export async function setRoleViewActive(id: string, isActive: boolean): Promise<RoleViewDto> {
    const res = await apiFetch(`/role-view/${encodeURIComponent(id)}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive } satisfies SetActiveBody),
    });
    await assertOk(res, 'nxui_nx00_role_view_set_active_001');
    return (await res.json()) as RoleViewDto;
}

export type ListViewParams = {
    q?: string;
    moduleCode?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLE-VIEW-API-001-F06
 * 說明：
 * - listView：列出 View（分頁，seed resource）
 * - GET /view?q=&moduleCode=&isActive=&page=&pageSize=
 */
export async function listView(params: ListViewParams = {}): Promise<PagedResult<ViewDto>> {
    const q = buildQueryString({
        q: params.q?.trim() ? params.q.trim() : undefined,
        moduleCode: params.moduleCode,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 1000), // 矩陣一次拉完
    });

    const res = await apiFetch(`/view${q}`, { method: 'GET' });
    await assertOk(res, 'nxui_nx00_view_list_001');
    return (await res.json()) as PagedResult<ViewDto>;
}