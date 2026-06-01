// apps/nx-ui/src/features/inventory/workstation/api/index.ts
// v1.2 階段 G P2/P3：手機工作站共用 API client（nx03/pk + pl + parcel）

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

// ────────────────────────────────────────────────────────────
// 型別（對齊後端 PK_SEL / PK_ITEM_SEL / PL_SEL / PARCEL_SEL）
// ────────────────────────────────────────────────────────────

/** Pk status: P=待撿 / C=撿貨中 / F=已完成 / V=作廢 */
export type PkStatus = 'P' | 'C' | 'F' | 'V';

export interface Pk {
  id: string;
  tenantId: string;
  warehouseId: string;
  docNo: string;
  pkDate: string;
  triggerSource: 'S' | 'T';
  deliveryType: 'D' | 'P' | 'C' | 'T';
  status: PkStatus;
  pickupCode?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  remark?: string | null;
  createdAt: string;
}

export interface PkItem {
  id: string;
  pkId: string;
  refSoId?: string | null;
  refSoItemId?: string | null;
  refStId?: string | null;
  lineNo: number;
  partId: string;
  partNo?: string | null;
  partName?: string | null;
  locationId?: string | null;
  qty: string;
  status: 'P' | 'C' | 'M';
  notFoundReason?: string | null;
}

export interface PkDetail extends Pk {
  items: PkItem[];
}

/** Pl status: P=待包 / C=包貨中 / F=已完成 / S=已寄出 / V=作廢 */
export type PlStatus = 'P' | 'C' | 'F' | 'S' | 'V';

export interface Pl {
  id: string;
  tenantId: string;
  warehouseId: string;
  docNo: string;
  plDate: string;
  plType: 'D' | 'P' | 'C' | 'T';
  status: PlStatus;
  pkId?: string | null;
  pkNo?: string | null;
  logisticsProvider?: string | null;
  logisticsTrackingNo?: string | null;
  remark?: string | null;
  createdAt: string;
}

export interface PlItem {
  id: string;
  plId: string;
  parcelId?: string | null;
  partId: string;
  partNo?: string | null;
  partName?: string | null;
  qty: string;
}

export interface PlDetail extends Pl {
  items: PlItem[];
}

export interface Parcel {
  id: string;
  tenantId: string;
  plId: string;
  parcelNo: string; // BX-YYYYMM-倉碼-NNNNN
  parcelType: 'D' | 'P' | 'C' | 'T';
  toWarehouseId?: string | null;
  toPartnerId?: string | null;
  logisticsTrackingNo?: string | null;
  weightKg?: string | null;
  remark?: string | null;
  createdAt: string;
}

export interface ListResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

// ────────────────────────────────────────────────────────────
// nx03/pk
// ────────────────────────────────────────────────────────────

interface ListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

function qs(q: ListQuery): string {
  return buildQueryString({
    page: q.page ? String(q.page) : undefined,
    pageSize: q.pageSize ? String(q.pageSize) : undefined,
    status: q.status,
    search: q.search,
  });
}

export function listPks(q: ListQuery = {}): Promise<ListResponse<Pk>> {
  return apiJson(`/nx03/pk${qs(q)}`);
}

export function getPk(id: string): Promise<PkDetail> {
  return apiJson(`/nx03/pk/${encodeURIComponent(id)}`);
}

export function patchPk(id: string, payload: { status?: PkStatus; remark?: string }): Promise<Pk> {
  return apiJson(`/nx03/pk/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * 撿貨「一鍵完成」：P → C → F sequential（state machine 不允許 P → F 直跳）。
 * 若已 C 則只 patch C → F。
 */
export async function completePicking(id: string, currentStatus: PkStatus): Promise<Pk> {
  if (currentStatus === 'F' || currentStatus === 'V') {
    throw new Error(`Pk 已 ${currentStatus}、無法完成`);
  }
  if (currentStatus === 'P') {
    await patchPk(id, { status: 'C' });
  }
  return patchPk(id, { status: 'F' });
}

// ────────────────────────────────────────────────────────────
// nx03/pl
// ────────────────────────────────────────────────────────────

export function listPls(q: ListQuery = {}): Promise<ListResponse<Pl>> {
  return apiJson(`/nx03/pl${qs(q)}`);
}

export function getPl(id: string): Promise<PlDetail> {
  return apiJson(`/nx03/pl/${encodeURIComponent(id)}`);
}

export interface CreatePlPayload {
  pkId: string;
  plDate: string; // YYYY-MM-DD
  plType: 'D' | 'P' | 'C' | 'T';
  remark?: string;
}

export function createPl(payload: CreatePlPayload): Promise<Pl> {
  return apiJson(`/nx03/pl`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function patchPl(
  id: string,
  payload: { status?: PlStatus; remark?: string; logisticsProvider?: string; logisticsTrackingNo?: string },
): Promise<Pl> {
  return apiJson(`/nx03/pl/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * 包貨「一鍵完成」：P → C → F sequential + 自動建 Parcel（含包裹編號 BX-…）。
 * Q4 拍板：完成包貨同時產生包裹編號（blueprint §10.3「完成後系統產生包裹編號」）。
 */
export async function completePackingAndCreateParcel(
  id: string,
  currentStatus: PlStatus,
  plType: 'D' | 'P' | 'C' | 'T',
): Promise<{ pl: Pl; parcel: Parcel }> {
  if (currentStatus === 'F' || currentStatus === 'S' || currentStatus === 'V') {
    throw new Error(`Pl 已 ${currentStatus}、無法完成`);
  }
  if (currentStatus === 'P') {
    await patchPl(id, { status: 'C' });
  }
  const pl = await patchPl(id, { status: 'F' });
  const parcel = await createParcel({ plId: id, parcelType: plType });
  return { pl, parcel };
}

// ────────────────────────────────────────────────────────────
// nx03/parcel（包裹編號自動生：BX-YYYYMM-倉碼-NNNNN、後端 allocParcelNo）
// ────────────────────────────────────────────────────────────

export function listParcels(q: ListQuery = {}): Promise<ListResponse<Parcel>> {
  return apiJson(`/nx03/parcel${qs(q)}`);
}

export interface CreateParcelPayload {
  plId: string;
  parcelType: 'D' | 'P' | 'C' | 'T';
  toWarehouseId?: string;
  toPartnerId?: string;
  logisticsTrackingNo?: string;
  weightKg?: number;
  remark?: string;
}

export function createParcel(payload: CreateParcelPayload): Promise<Parcel> {
  return apiJson(`/nx03/parcel`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
