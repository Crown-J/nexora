// apps/nx-ui/src/features/base/api/team.ts
// 05 批 T2/T3 2026-06-07：組主檔 API client
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type TeamDto = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  parentTeamId: string | null;
  parentTeamCode: string | null;
  parentTeamName: string | null;
  warehouseId: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  isActive: boolean;
  sortNo: number;
  createdAt: string;
  updatedAt: string;
};

const BASE = '/nx01/teams';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export async function listTeams(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  departmentId?: string;
}): Promise<PagedResult<TeamDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    departmentId: params.departmentId,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_team_list');
  return normalizePaged<TeamDto>(await res.json());
}
