// apps/nx-ui/src/features/base/api/user-team.ts
// 05 批 T3 2026-06-07：UserTeam 衛星 API client（範式對齊 user-role.ts）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from './types';

export type UserTeamDto = {
  id: string;
  userId: string;
  teamId: string;
  isPrimary: boolean;
  isLeader: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string | null;
  revokedAt: string | null;
  userDisplayName: string | null;
  teamCode: string | null;
  teamName: string | null;
  /** team 所屬部門（後端 join 帶出、給前端「主組決定部門」UX 用） */
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
};

export async function listUserTeams(params: {
  userId?: string;
  teamId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<UserTeamDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    userId: params.userId,
    teamId: params.teamId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
  });
  const res = await apiFetch(`/user-team${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_team_list');
  return res.json() as Promise<PagedResult<UserTeamDto>>;
}

export async function assignUserTeam(body: {
  userId: string;
  teamId: string;
  isPrimary?: boolean;
  isLeader?: boolean;
}): Promise<UserTeamDto> {
  const res = await apiFetch('/user-team', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_user_team_assign');
  return res.json() as Promise<UserTeamDto>;
}

export async function revokeUserTeam(id: string): Promise<UserTeamDto> {
  const res = await apiFetch(`/user-team/${encodeURIComponent(id)}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  await assertOk(res, 'nxui_base_user_team_revoke');
  return res.json() as Promise<UserTeamDto>;
}

export async function setUserTeamPrimary(id: string, isPrimary: boolean): Promise<UserTeamDto> {
  const res = await apiFetch(`/user-team/${encodeURIComponent(id)}/primary`, {
    method: 'PATCH',
    body: JSON.stringify({ isPrimary }),
  });
  await assertOk(res, 'nxui_base_user_team_primary');
  return res.json() as Promise<UserTeamDto>;
}

export async function setUserTeamLeader(id: string, isLeader: boolean): Promise<UserTeamDto> {
  const res = await apiFetch(`/user-team/${encodeURIComponent(id)}/leader`, {
    method: 'PATCH',
    body: JSON.stringify({ isLeader }),
  });
  await assertOk(res, 'nxui_base_user_team_leader');
  return res.json() as Promise<UserTeamDto>;
}
