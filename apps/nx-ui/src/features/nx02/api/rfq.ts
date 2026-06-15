/**
 * File: apps/nx-ui/src/features/nx01/api/rfq.ts
 * Project: NEXORA (Monorepo)
 *
 * T0 路徑收斂 2026-06-07：path /nx01/rfq → /nx02/rfq。
 *
 * ⚠️ 已對齊：list / get / create / patch（基本 CRUD）。
 * ⚠️ 待對齊（T1+）：
 *   - patchRfqReply：後端 reply 範式改走 QT（POST /nx02/qt）、本 helper 暫保留死路徑
 *   - patchRfqStatus：後端用 PATCH /:id { status } 統一範式（本 helper 暫保留 /:id/status）
 *   - voidRfq：後端用 DELETE /:id 或 POST /:id/cancel；本 helper 暫保留 /:id/void
 *   - rfqToPo / rfqToRr：後端走 POST /nx02/qt/:id/adopt（QT 採用觸發）；本 helper 暫保留
 * RFQ UI 深度依賴這些 action endpoint、是 T1+ 重接範圍、T0 只做 path 替換。
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Nx01Paged, RfqDetailDto, RfqListRow } from '../types';

export type ListRfqParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

export async function listRfq(params: ListRfqParams): Promise<Nx01Paged<RfqListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/rfq${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rfq_list_001');
  return (await res.json()) as Nx01Paged<RfqListRow>;
}

export async function getRfq(id: string): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rfq_get_001');
  return (await res.json()) as RfqDetailDto;
}

export type CreateRfqBody = {
  warehouseId: string;
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items: { partId: string; qty: number; unitPrice?: number | null; leadTimeDays?: number | null; remark?: string | null }[];
};

export async function createRfq(body: CreateRfqBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx02/rfq', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_create_001');
  return (await res.json()) as { id: string };
}

export type PatchRfqBody = {
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items?: {
    partId: string;
    qty: number;
    unitPrice?: number | null;
    leadTimeDays?: number | null;
    remark?: string | null;
  }[];
};

export async function patchRfq(id: string, body: PatchRfqBody): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_patch_001');
  return (await res.json()) as RfqDetailDto;
}

export type PatchRfqReplyBody = {
  items: { id: string; unit_price: number | null; lead_time_days: number | null; status: 'R' | 'C' }[];
};

/**
 * ⚠️ T1b 2026-06-07：patchRfqReply 走死路徑（後端 /nx02/rfq/reply/:id 不存在）。
 * 業務員按「報價回填」會 fetch fail。新範式建議走並排比價區的「新增報價（QT）+ 採用」。
 * 後續軌（T1c+）決定是否砍 reply UI 全收斂到 QT 主流程。本 helper 暫保留簽名以維持類型相容。
 */
export async function patchRfqReply(id: string, body: PatchRfqReplyBody): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx02/rfq/reply/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_reply_001_DEAD');
  return (await res.json()) as RfqDetailDto;
}

// T1b 詢價單動作重接 2026-06-07：對齊 backend RfqStatus 全名 + 範式
// RfqStatus: DRAFT / SENT / REPLIED / CLOSED / CANCELLED
const RFQ_STATUS_ALIAS: Record<string, string> = {
  D: 'DRAFT',
  S: 'SENT',
  R: 'REPLIED',
  C: 'CLOSED',
  V: 'CANCELLED',
};

export async function patchRfqStatus(id: string, status: string): Promise<void> {
  const full = RFQ_STATUS_ALIAS[status] ?? status;
  // 改 PATCH /:id（UpdateRfqDto 已收 status、對齊 PR / PO 範式）
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: full }),
  });
  await assertOk(res, 'nxui_nx01_rfq_status_001');
}

// T1b 2026-06-07：作廢走 backend QtController 既有 POST /nx02/rfq/:id/cancel
export async function voidRfq(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_rfq_void_001');
}

export type RfqToRrBody = {
  supplierId: string;
  warehouseId: string;
  items: { rfqItemId: string; qty: number }[];
};

export async function rfqToRr(id: string, body: RfqToRrBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}/to-rr`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_to_rr_001');
  return (await res.json()) as { id: string };
}

export type RfqToPoBody = { items: { rfqItemId: string; qty: number }[] };

export async function rfqToPo(id: string, body: RfqToPoBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx02/rfq/${encodeURIComponent(id)}/to-po`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_to_po_001');
  return (await res.json()) as { id: string };
}
