// apps/nx-ui/src/features/shared/part-compat/part-compat-group-api.ts
// 02 對齊第二批前端收尾軌 FE-CP5 2026-06-07：通用件群組 + member CRUD client
// 2026-06-22 補 group CRUD helper（UniversalGroupPage 接真 API 用）
import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';
import { buildQueryString } from '@data/api/query';

export type CompatRole = 1 | 2; // 1=PRIMARY 主件 / 2=ALT 替代品

export type PartCompatGroupRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartCompatGroupListResult = {
  page: number;
  pageSize: number;
  total: number;
  rows: PartCompatGroupRow[];
};

export async function listPartCompatGroups(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PartCompatGroupListResult> {
  const qs = buildQueryString({
    search: params?.search?.trim() || undefined,
    isActive: params?.isActive === undefined ? undefined : String(params.isActive),
    page: params?.page != null ? String(params.page) : undefined,
    pageSize: params?.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/nx01/part-compat-groups${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_part_compat_group_list');
  return (await res.json()) as PartCompatGroupListResult;
}

export async function createPartCompatGroup(body: {
  code: string;
  name: string;
  remark?: string;
  sortNo?: number;
  isActive?: boolean;
}): Promise<PartCompatGroupRow> {
  const res = await apiFetch('/nx01/part-compat-groups', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_part_compat_group_create');
  return (await res.json()) as PartCompatGroupRow;
}

export async function updatePartCompatGroup(
  id: string,
  body: {
    name?: string;
    remark?: string | null;
    sortNo?: number;
    isActive?: boolean;
  },
): Promise<PartCompatGroupRow> {
  const res = await apiFetch(`/nx01/part-compat-groups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_part_compat_group_update');
  return (await res.json()) as PartCompatGroupRow;
}

export async function softDeletePartCompatGroup(id: string): Promise<PartCompatGroupRow> {
  const res = await apiFetch(`/nx01/part-compat-groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_part_compat_group_delete');
  return (await res.json()) as PartCompatGroupRow;
}

export type CompatMemberRow = {
  id: string;
  groupId: string;
  partId: string;
  role: CompatRole;
  customPrice: string | null;
  isBidirectional: boolean;
  sortNo: number;
  remark: string | null;
  isActive: boolean;
  part?: { code: string; name: string } | null;
};

export type CompatMemberWriteBody = {
  partId?: string;
  role?: CompatRole;
  customPrice?: number | null;
  isBidirectional?: boolean;
  sortNo?: number;
  remark?: string | null;
  isActive?: boolean;
};

export async function listGroupMembers(groupId: string): Promise<CompatMemberRow[]> {
  const res = await apiFetch(`/nx01/part-compat-groups/${encodeURIComponent(groupId)}/members`, { method: 'GET' });
  await assertOk(res, 'nxui_part_compat_member_list');
  const j = (await res.json()) as { rows: CompatMemberRow[] };
  return j.rows ?? [];
}

export async function addGroupMember(
  groupId: string,
  body: CompatMemberWriteBody & { partId: string },
): Promise<CompatMemberRow> {
  const res = await apiFetch(`/nx01/part-compat-groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_part_compat_member_create');
  return (await res.json()) as CompatMemberRow;
}

export async function updateGroupMember(
  groupId: string,
  memberId: string,
  body: CompatMemberWriteBody,
): Promise<CompatMemberRow> {
  const res = await apiFetch(
    `/nx01/part-compat-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  await assertOk(res, 'nxui_part_compat_member_update');
  return (await res.json()) as CompatMemberRow;
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const res = await apiFetch(
    `/nx01/part-compat-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
  );
  await assertOk(res, 'nxui_part_compat_member_delete');
}
