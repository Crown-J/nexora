// apps/nx-ui/src/features/home-dashboard/api.ts
// 首頁儀表板 Sub 2：API client
// - 21 卡用既有 list endpoint + pagination.total
// - 公告：/nx01/bulletins?pageSize=5
// - 待辦池：/nx98/task-pool?pageSize=5

import { apiJson } from '@/shared/api/client';

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  rows: unknown[];
};

/**
 * 拉某 list endpoint 的 total 當數字
 * 失敗時拋錯（caller 處理 error 狀態）
 */
export async function fetchCardCount(endpoint: string): Promise<number> {
  // endpoint 已含 ?pageSize=1、無需再拼
  const res = await apiJson<ListResponse>(endpoint, { method: 'GET' });
  return res.total ?? 0;
}

// ─── 下半部公告 ──────────────────────────────────────────────
export type BulletinSummary = {
  id: string;
  title: string;
  publishedAt: string | null;
  type?: string | null;
};

type BulletinListResponse = ListResponse & {
  rows: BulletinSummary[];
};

export async function fetchHomeBulletins(): Promise<BulletinSummary[]> {
  const res = await apiJson<BulletinListResponse>('/nx01/bulletins?pageSize=5', { method: 'GET' });
  return res.rows ?? [];
}

// ─── 下半部待辦池 ──────────────────────────────────────────────
export type TaskPoolItem = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  dueAt?: string | null;
};

type TaskPoolListResponse = ListResponse & {
  rows: TaskPoolItem[];
};

export async function fetchHomeTasks(): Promise<TaskPoolItem[]> {
  const res = await apiJson<TaskPoolListResponse>('/nx98/task-pool?pageSize=5', { method: 'GET' });
  return res.rows ?? [];
}
