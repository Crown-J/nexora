// apps/nx-ui/src/features/nx05/api/index.ts
// v1.2 階段 F P4：NX05 財務模組 API client
// 對齊 P3 新建 endpoint：
//   - mark-filed（401 期上報旗標）
//   - period/:yp/preview（401 雙月一期預覽）
//   - ap/payable-view（應付彙整視圖、含 SR Allowance）

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

// ============================================================
// types
// ============================================================

export type Nx05PagedResult<T> = {
  page: number;
  pageSize: number;
  total: number;
  rows: T[];
};

export type ArRow = {
  id: string;
  docNo: string;
  sourceType?: string;
  soId: string | null;
  prId?: string | null;
  customerId: string;
  arDate: string;
  dueDate: string;
  originalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  status: string;
  displayStatus?: string;
  paymentTerm: string;
  overdueDays?: number;
  remark: string | null;
};

export type ApRow = {
  id: string;
  docNo: string;
  sourceType: string;
  poId: string | null;
  rrId: string | null;
  tiId: string | null;
  supplierId: string;
  apDate: string;
  dueDate: string;
  originalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  status: string;
  displayStatus?: string;
  paymentTerm: string;
  remark: string | null;
};

export type PayableViewRow =
  | (ApRow & { kind: 'AP' })
  | {
      kind: 'SR_ALLOWANCE';
      id: string;
      docNo: string;
      date: string;
      partnerId: string;
      refArId: string | null;
      amount: string;
      status: string;
      remark: string | null;
      createdAt: string;
      updatedAt: string;
    };

export type ClosingRow = {
  id: string;
  docNo: string;
  closingDate: string;
  closedAt: string | null;
  closedBy: string | null;
  isAuto: boolean;
  reportPrintedAt: string | null;
  status: 'OPEN' | 'CLOSING' | 'CLOSED' | 'REOPENED';
  reopenedAt: string | null;
  reopenedBy: string | null;
  reopenReason: string | null;
  remark: string | null;
  reportPeriod: string | null;
  reportFiledAt: string | null;
  reportFiledBy: string | null;
};

export type Period401Preview = {
  reportPeriod: string;
  months: string[];
  startDate: string;
  endDate: string;
  sales: {
    gross: string;
    return: string;
    net: string;
    soCount: number;
    srCount: number;
  };
  purchase: {
    gross: string;
    return: string;
    net: string;
    rrCount: number;
    prCount: number;
  };
  taxPayable: string;
  closings: Array<{
    id: string;
    docNo: string;
    closingDate: string;
    status: string;
    reportFiledAt: string | null;
  }>;
  filed: boolean;
  readyToFile: boolean;
  note: string;
};

export type NoteRow = {
  id: string;
  docNo: string;
  noteType: string;
  paymentMethod: string;
  partnerId: string;
  amount: string;
  status: string;
  noteDate: string;
  remark: string | null;
};

// ============================================================
// AR
// ============================================================

export async function listAr(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<Nx05PagedResult<ArRow>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/ar${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_ar_list');
  return res.json() as Promise<Nx05PagedResult<ArRow>>;
}

// ============================================================
// AP（含彙整視圖）
// ============================================================

export async function listAp(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<Nx05PagedResult<ApRow>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/ap${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_ap_list');
  return res.json() as Promise<Nx05PagedResult<ApRow>>;
}

export async function getPayableView(params: {
  search?: string;
  status?: string;
}): Promise<{
  ap: Array<ApRow & { kind: 'AP' }>;
  srAllowance: Array<Extract<PayableViewRow, { kind: 'SR_ALLOWANCE' }>>;
  totalCount: number;
  note: string;
}> {
  const qs = buildQueryString({
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/ap/payable-view${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_ap_payable_view');
  return res.json();
}

// ============================================================
// period-close / 401
// ============================================================

export async function listClosing(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<Nx05PagedResult<ClosingRow>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/period-close${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_closing_list');
  return res.json() as Promise<Nx05PagedResult<ClosingRow>>;
}

export async function createClosing(body: { closingDate: string; remark?: string }): Promise<ClosingRow> {
  const res = await apiFetch('/nx05/period-close', { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_nx05_closing_create');
  return res.json() as Promise<ClosingRow>;
}

export async function patchClosingStatus(
  id: string,
  body: { status: string; reopenReason?: string },
): Promise<ClosingRow> {
  const res = await apiFetch(`/nx05/period-close/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx05_closing_patch');
  return res.json() as Promise<ClosingRow>;
}

export async function markClosingFiled(id: string, remark?: string): Promise<ClosingRow> {
  const res = await apiFetch(`/nx05/period-close/${encodeURIComponent(id)}/mark-filed`, {
    method: 'POST',
    body: JSON.stringify({ remark }),
  });
  await assertOk(res, 'nxui_nx05_closing_mark_filed');
  return res.json() as Promise<ClosingRow>;
}

export async function previewPeriod401(yp: string): Promise<Period401Preview> {
  const res = await apiFetch(`/nx05/period-close/period/${encodeURIComponent(yp)}/preview`, {
    method: 'GET',
  });
  await assertOk(res, 'nxui_nx05_period_preview');
  return res.json() as Promise<Period401Preview>;
}

// ============================================================
// Note（票據）
// ============================================================

export async function listNotes(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<Nx05PagedResult<NoteRow>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/note${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_note_list');
  return res.json() as Promise<Nx05PagedResult<NoteRow>>;
}
