// apps/nx-ui/src/features/shared/part-compat/part-compat-group-api.ts
// 02 對齊第二批前端收尾軌 FE-CP5 2026-06-07：通用件群組 + member CRUD client
import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';

export type CompatRole = 1 | 2; // 1=PRIMARY 主件 / 2=ALT 替代品

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
