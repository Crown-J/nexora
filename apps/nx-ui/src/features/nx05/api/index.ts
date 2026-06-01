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

// v1.2 階段 F P5 A：401 TXT 兩檔下載
export type Period401TxtExport = {
  reportPeriod: string;
  mediaFileName: string;
  mediaContent: string; // base64
  mediaLineCount: number;
  mainFileName: string;
  mainContent: string; // base64
  summary: {
    salesNet: string;
    outputTax: string;
    purchaseNet: string;
    inputTax: string;
    taxPayable: string;
  };
  note: string;
};

export async function export401Txt(yp: string): Promise<Period401TxtExport> {
  const res = await apiFetch(`/nx05/period-close/period/${encodeURIComponent(yp)}/txt-export`, {
    method: 'GET',
  });
  await assertOk(res, 'nxui_nx05_401_txt_export');
  return res.json();
}

// v1.2 階段 F P5 B：票據新增 + 一對多沖銷
export type NoteSettlement = {
  arId?: string | null;
  apId?: string | null;
  settledAmount: number | string;
};

export type CreateNoteWithSettlementsBody = {
  noteType: 'R' | 'P'; // R=收款 / P=付款
  paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK' | 'CREDIT';
  partnerId: string;
  amount: number | string;
  noteDate: string; // YYYY-MM-DD
  remark?: string;
  settlements: NoteSettlement[];
};

export async function createNoteWithSettlements(
  body: CreateNoteWithSettlementsBody,
): Promise<{ paylogId: string; settlements: number }> {
  const res = await apiFetch('/nx05/paylog/with-settlements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx05_paylog_create_with_settlements');
  return res.json();
}

// v1.2 階段 F P5 E：催款（純內部記錄）
// v1.2 階段 F P5-B：一張 AR/AP 沖銷歷史視圖（settlement 列表）
export type SettlementRow = {
  id: string;
  paylogId: string;
  paylogDocNo: string;
  paylogPayDate: string;
  paylogPayMethod: string;
  paylogPayType: string;
  settledAmount: string;
  remark: string | null;
  createdAt: string;
};

export async function listArSettlements(arId: string): Promise<{
  rows: SettlementRow[];
  totalSettled: string;
}> {
  const res = await apiFetch(`/nx05/ar/${encodeURIComponent(arId)}/settlements`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_ar_settlements');
  return res.json();
}

export async function listApSettlements(apId: string): Promise<{
  rows: SettlementRow[];
  totalSettled: string;
}> {
  const res = await apiFetch(`/nx05/ap/${encodeURIComponent(apId)}/settlements`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_ap_settlements');
  return res.json();
}

export async function notifyArOverdue(
  arId: string,
  remark?: string,
): Promise<{ logId: string }> {
  const res = await apiFetch(`/nx05/ar/${encodeURIComponent(arId)}/notify-overdue`, {
    method: 'POST',
    body: JSON.stringify({ remark }),
  });
  await assertOk(res, 'nxui_nx05_ar_notify_overdue');
  return res.json();
}

// v1.2 階段 F P5 E：折讓人工沖銷 + 主管核可
export type CreateAllowanceBody = {
  allowanceType: 'P' | 'S'; // P=進貨折讓 / S=銷貨折讓
  partnerId: string;
  allowanceDate: string;
  totalAmount: number | string;
  refArId?: string;
  refApId?: string;
  remark?: string;
};

export async function createAllowanceManual(body: CreateAllowanceBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx05/allowance/manual', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx05_allowance_create_manual');
  return res.json();
}

export async function approveAllowance(id: string): Promise<{ id: string; status: string }> {
  const res = await apiFetch(`/nx05/allowance/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  });
  await assertOk(res, 'nxui_nx05_allowance_approve');
  return res.json();
}

export type AllowanceRow = {
  id: string;
  docNo: string;
  allowanceType: 'P' | 'S';
  partnerId: string;
  allowanceDate: string;
  refArId: string | null;
  refApId: string | null;
  totalAmount: string;
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectReason: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string | null;
};

export async function listAllowance(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<Nx05PagedResult<AllowanceRow>> {
  const qs = buildQueryString({
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    search: params.search?.trim() || undefined,
    status: params.status?.trim() || undefined,
  });
  const res = await apiFetch(`/nx05/allowance${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx05_allowance_list');
  return res.json() as Promise<Nx05PagedResult<AllowanceRow>>;
}

export async function rejectAllowance(
  id: string,
  rejectReason: string,
): Promise<{ id: string; status: string }> {
  const res = await apiFetch(`/nx05/allowance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'REJECTED', rejectReason }),
  });
  await assertOk(res, 'nxui_nx05_allowance_reject');
  return res.json();
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
