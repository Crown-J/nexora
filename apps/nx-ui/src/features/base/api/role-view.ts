// apps/nx-ui/src/features/base/api/role-view.ts
/**
 * 職務權限設定 API client（對接 nx01/views 畫面字典 + nx01/role-views 權限 join）
 * 供 RoleViewMatrixPage（職務 × 畫面 × 6 權限矩陣）。
 * T1-fix-b 2026-06-07：加 canApprove 第 6 欄（核准權限、與後端 RoleView.canApprove 對應）。
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import type { PagedResult } from './types';

export type ViewDto = {
  id: string;
  code: string;
  name: string;
  moduleCode: string;
  path: string;
  sortNo: number;
  isActive: boolean;
};

export type RoleViewDto = {
  id: string;
  roleId: string;
  viewId: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  // T1-fix-b 2026-06-07：核准權限第 6 欄
  canApprove: boolean;
  isActive: boolean;
  roleCode: string | null;
  roleName: string | null;
  viewCode: string | null;
  viewName: string | null;
};

export type RoleViewPerms = {
  canRead?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canApprove?: boolean;
};

function normalize<T>(data: { page: number; pageSize: number; total: number; items?: T[]; rows?: T[] }): PagedResult<T> {
  return { page: data.page, pageSize: data.pageSize, total: data.total, items: data.items ?? data.rows ?? [] };
}

/** 畫面字典（系統層、按 moduleCode 分群供矩陣） */
export async function listViews(params: { page?: number; pageSize?: number } = {}): Promise<PagedResult<ViewDto>> {
  const qs = buildQueryString({
    isActive: 'true',
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(params.pageSize ?? 100),
  });
  const res = await apiFetch(`nx01/views${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_view_list');
  return normalize<ViewDto>(await res.json());
}

/** 某職務已設定的權限視圖 */
export async function listRoleViews(params: { roleId: string; page?: number; pageSize?: number }): Promise<PagedResult<RoleViewDto>> {
  const qs = buildQueryString({
    roleId: params.roleId,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(params.pageSize ?? 100),
  });
  const res = await apiFetch(`nx01/role-views${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_role_view_list');
  return normalize<RoleViewDto>(await res.json());
}

export async function createRoleView(body: { roleId: string; viewId: string } & RoleViewPerms): Promise<RoleViewDto> {
  const res = await apiFetch('nx01/role-views', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_base_role_view_create');
  return res.json() as Promise<RoleViewDto>;
}

export async function updateRoleView(id: string, perms: RoleViewPerms): Promise<RoleViewDto> {
  const res = await apiFetch(`nx01/role-views/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(perms),
  });
  await assertOk(res, 'nxui_base_role_view_update');
  return res.json() as Promise<RoleViewDto>;
}

/** 移除整列權限（軟刪除） */
export async function deleteRoleView(id: string): Promise<void> {
  const res = await apiFetch(`nx01/role-views/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_base_role_view_delete');
}
