/**
 * 首頁公告 API（nx-api /bulletin）
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';

export type BulletinDto = {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  scopeType: string;
  isPinned: boolean;
  expiredAt: string | null;
  isActive: boolean;
  displayBadge: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type PagedBulletins = {
  items: BulletinDto[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listBulletins(params: {
  scopeType?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedBulletins> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    scopeType: params.scopeType,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: 'true',
  });
  const res = await apiFetch(`/bulletin${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_home_bulletin_list');
  return res.json() as Promise<PagedBulletins>;
}

export async function createBulletin(body: {
  title: string;
  subtitle?: string | null;
  content?: string | null;
  scopeType: string;
  isPinned?: boolean;
  displayBadge?: string | null;
}): Promise<BulletinDto> {
  const res = await apiFetch('/bulletin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_home_bulletin_create');
  return res.json() as Promise<BulletinDto>;
}

export async function updateBulletin(
  id: string,
  body: {
    title?: string;
    subtitle?: string | null;
    content?: string | null;
    scopeType?: string;
    isPinned?: boolean;
    displayBadge?: string | null;
  },
): Promise<BulletinDto> {
  const res = await apiFetch(`/bulletin/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_home_bulletin_update');
  return res.json() as Promise<BulletinDto>;
}

export async function setBulletinActive(id: string, isActive: boolean): Promise<BulletinDto> {
  const res = await apiFetch(`/bulletin/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_home_bulletin_active');
  return res.json() as Promise<BulletinDto>;
}
