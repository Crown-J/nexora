// apps/nx-ui/src/features/inventory/workstation/api/index.ts
// v1.2 階段 G P2/P3：手機工作站共用 API client（nx03/pk + pl + parcel）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

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

/** 撿包送 LITE-OP-UI 2026-06-09：建撿貨單 */
export interface CreatePkPayload {
  warehouseId: string;
  pkDate: string;
  triggerSource: 'S' | 'T';
  deliveryType: 'D' | 'P' | 'C' | 'T';
  remark?: string;
  items?: Array<{
    refSoId?: string;
    refSoItemId?: string;
    refStId?: string;
    partId: string;
    locationId?: string;
    qty: number;
  }>;
}

export function createPk(payload: CreatePkPayload): Promise<Pk> {
  return apiJson(`/nx03/pk`, { method: 'POST', body: JSON.stringify(payload) });
}

export interface PatchPkItemPayload {
  status?: 'P' | 'C' | 'M';
  notFoundReason?: string;
  qty?: number;
  remark?: string;
}

export function patchPkItem(id: string, itemId: string, payload: PatchPkItemPayload): Promise<PkItem> {
  return apiJson(`/nx03/pk/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, {
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
// nx03/pick-pool（撿貨清單、SALES-FLOW 撿貨重設計）
// 庫位軸：依庫位分組、同（倉×料件）合併總量。倉管照庫位順路撿到包貨區。
// ────────────────────────────────────────────────────────────

/** 撿貨任務列（同 倉×料件 合併總量、支援部分撿）。 */
export interface PickItem {
  warehouseId: string;
  warehouseCode: string;
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null; // 廠牌快照
  photoId: string | null; // 料件主圖 id（配 partPhotoUrl 取圖）
  locationId: string | null;
  locationCode: string | null;
  customerName?: string | null; // 依客戶分組時有值
  neededQty: string; // 需求總量
  pickedQty: string; // 已撿量
  remainingQty: string; // 剩餘待撿
  soItemIds: string[];
}

/** 分組（依庫位＝庫位碼標題 / 依客戶＝客戶名標題）。 */
export interface PickGroup {
  title: string;
  locationId: string | null;
  locationCode: string | null;
  warehouseCode: string;
  items: PickItem[];
}

export type GroupBy = 'location' | 'customer';

export interface PickListQuery {
  warehouseId?: string;
  search?: string;
  groupBy?: GroupBy;
}

export function getPickList(q: PickListQuery = {}): Promise<{ groups: PickGroup[]; total: number; lineCount: number }> {
  return apiJson(`/nx03/pick-pool${buildQueryString({ warehouseId: q.warehouseId, search: q.search, groupBy: q.groupBy })}`);
}

/** 撿取：qty 省略=全部撿取 / 帶 qty=部分撿取。 */
export function pickAggregate(warehouseId: string, partId: string, qty?: number): Promise<{ picked: number }> {
  return apiJson(`/nx03/pick-pool/pick`, {
    method: 'POST',
    body: JSON.stringify({ warehouseId, partId, ...(qty != null ? { qty } : {}) }),
  });
}

/** 撿貨異常：對剩餘量開正式異常回報單（D=損毀 / S=數量短缺、qty 後端自動）。 */
export function reportPickIssue(payload: {
  warehouseId: string;
  partId: string;
  issueType: 'D' | 'S';
  reason?: string;
}): Promise<{ id: string; docNo: string }> {
  return apiJson(`/nx03/pick-pool/issue`, { method: 'POST', body: JSON.stringify(payload) });
}

/** 重置數量：把某（倉×料件）已撿量歸零。 */
export function resetPick(warehouseId: string, partId: string): Promise<{ reset: number }> {
  return apiJson(`/nx03/pick-pool/reset`, { method: 'POST', body: JSON.stringify({ warehouseId, partId }) });
}

// ── WMS P2 撿貨三欄：中欄「已撿貨」/右欄「已取消」（依單號/客戶） ──

/** 已撿貨/已取消清單的一個料件（同單×料件合併、帶單號/客戶/儲位供顯示）。 */
export interface StagedItem {
  soId: string;
  soDocNo: string;
  customerName: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: number;
  warehouseId: string;
  locationCode: string | null;
}

/** 已撿貨/已取消清單一組（依客戶名 或 依儲位碼）。 */
export interface StagedGroup {
  title: string;
  lineCount: number;
  items: StagedItem[];
}

/** 中欄：已撿完待包的貨。 */
export function getPickedList(q: PickListQuery = {}): Promise<{ groups: StagedGroup[]; total: number }> {
  return apiJson(`/nx03/pick-pool/picked${buildQueryString({ warehouseId: q.warehouseId, search: q.search, groupBy: q.groupBy })}`);
}

/** 右欄：訂單取消、貨已撿待放回。 */
export function getCancelledList(q: PickListQuery = {}): Promise<{ groups: StagedGroup[]; total: number }> {
  return apiJson(`/nx03/pick-pool/cancelled${buildQueryString({ warehouseId: q.warehouseId, search: q.search, groupBy: q.groupBy })}`);
}

/** 中欄「取消撿貨」（誤按修正、退回左邊待撿）。 */
export function cancelPick(soId: string, partId: string, warehouseId: string): Promise<{ cancelled: number; qty: number }> {
  return apiJson(`/nx03/pick-pool/cancel-pick`, { method: 'POST', body: JSON.stringify({ soId, partId, warehouseId }) });
}

/** 右欄「已放回」（訂單取消貨搬回原儲位）。 */
export function putBack(soId: string, partId: string, warehouseId: string): Promise<{ putBack: number; qty: number }> {
  return apiJson(`/nx03/pick-pool/put-back`, { method: 'POST', body: JSON.stringify({ soId, partId, warehouseId }) });
}

/** 中/右欄「異常回報」（開六處置單 + 移出本區）。 */
export function stagedIssue(payload: {
  soId: string;
  partId: string;
  warehouseId: string;
  issueType: 'D' | 'S';
  reason?: string;
}): Promise<{ reported: boolean; qty: number }> {
  return apiJson(`/nx03/pick-pool/staged-issue`, { method: 'POST', body: JSON.stringify(payload) });
}

// ────────────────────────────────────────────────────────────
// nx03/pack-pool（包貨台、SALES-FLOW 階段 2）
// 以客戶為單位、預設一箱一單、同客戶小件可併箱、封箱。
// ────────────────────────────────────────────────────────────

export interface PackPoolLine {
  pkItemId: string;
  soId: string;
  soDocNo: string;
  soItemId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
}

export interface PackPoolGroup {
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  deliveryType: string; // D=配送 / P=自取 / C=寄貨
  deliveryLabel: string;
  soCount: number;
  lineCount: number;
  lines: PackPoolLine[];
}

export interface PackingParcelLine {
  id: string;
  lineNo: number;
  partNo: string;
  partName: string;
  qty: string;
  soDocNo: string | null;
}

export interface PackingParcel {
  id: string;
  parcelNo: string; // BX-YYYYMM-倉碼-NNNNN
  parcelType: string;
  weightKg: string | null;
  logisticsTrackingNo: string | null;
  lines: PackingParcelLine[];
}

export interface PackingDetail {
  id: string;
  docNo: string;
  plDate: string | null;
  plType: string;
  status: PlStatus;
  pkId: string | null;
  customerId: string | null;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  parcels: PackingParcel[];
}

export interface PackPoolQuery {
  warehouseId?: string;
  search?: string;
}

export function getPackPool(q: PackPoolQuery = {}): Promise<{ groups: PackPoolGroup[]; total: number }> {
  return apiJson(`/nx03/pack-pool${buildQueryString({ warehouseId: q.warehouseId, search: q.search })}`);
}

export function getPacking(id: string): Promise<PackingDetail> {
  return apiJson(`/nx03/pack-pool/${encodeURIComponent(id)}`);
}

/** 包貨中（已建、未封箱）的一張包貨單摘要。 */
export interface InProgressPacking {
  id: string;
  docNo: string;
  plType: string;
  customerName: string;
  warehouseCode: string;
  parcelCount: number;
  lineCount: number;
  createdAt: string;
}

/** 列包貨中（未封箱）——接續封箱用。 */
export function listInProgressPacking(q: PackPoolQuery = {}): Promise<{ rows: InProgressPacking[]; total: number }> {
  return apiJson(`/nx03/pack-pool/in-progress${buildQueryString({ warehouseId: q.warehouseId, search: q.search })}`);
}

// ── WMS 包貨兩區（2026-07-24）：左已撿池 + 右三區建箱 ──

/** 左邊已撿池的一張銷貨單（可整張拉、或拉單一 line）。 */
export interface PackPoolSo {
  soId: string;
  soDocNo: string;
  customerName: string;
  deliveryType: string; // D/P/C
  deliveryAddress: string | null;
  warehouseId: string;
  lines: { pkItemId: string; partNo: string; partName: string; qty: string }[];
}

/** 右邊一個箱（建箱中）。 */
export interface PackBox {
  plId: string;
  docNo: string;
  plType: string; // D/P/C
  lineCount: number;
  customerCount: number;
  mixedCustomer: boolean;
  lines: { plItemId: string; pkItemId: string; partNo: string; qty: string; soDocNo: string; customerName: string }[];
}

export interface PackWorkspace {
  pool: PackPoolSo[];
  boxes: { P: PackBox[]; C: PackBox[]; D: PackBox[] };
}

export function getPackWorkspace(q: PackPoolQuery = {}): Promise<PackWorkspace> {
  return apiJson(`/nx03/pack-pool/workspace${buildQueryString({ warehouseId: q.warehouseId, search: q.search })}`);
}

/** 建空箱（進對應出貨方式區）。 */
export function createBox(deliveryType: 'D' | 'P' | 'C', warehouseId: string): Promise<PackWorkspace> {
  return apiJson(`/nx03/pack-pool/box`, { method: 'POST', body: JSON.stringify({ deliveryType, warehouseId }) });
}

/** 加貨進箱（整張單多筆或單筆）。 */
export function addToBox(plId: string, pkItemIds: string[]): Promise<PackWorkspace> {
  return apiJson(`/nx03/pack-pool/box/add`, { method: 'POST', body: JSON.stringify({ plId, pkItemIds }) });
}

/** 從箱移出一筆（退回左池）。 */
export function removeFromBox(plId: string, pkItemId: string): Promise<PackWorkspace> {
  return apiJson(`/nx03/pack-pool/box/remove`, { method: 'POST', body: JSON.stringify({ plId, pkItemId }) });
}

/** 丟棄箱（貨全退回池）。 */
export function discardBox(plId: string): Promise<PackWorkspace> {
  return apiJson(`/nx03/pack-pool/box/discard`, { method: 'POST', body: JSON.stringify({ plId }) });
}

// ── 包貨單據頁 + 5 步精靈（Phase A）──

/** 包裹列表一列（DocWorkbench）。 */
export interface PackageRow {
  id: string;
  docNo: string;
  status: string; // C/F/S
  plType: string; // D/P/C
  plDate: string | null;
  createdAt: string;
  warehouseCode: string;
  lineCount: number;
  customerCount: number;
  customerLabel: string;
}

export interface PackageListQuery {
  search?: string;
  status?: string;
  deliveryType?: string;
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}

export function listPackages(q: PackageListQuery = {}): Promise<{ items: PackageRow[]; total: number }> {
  return apiJson(`/nx03/pack-pool/packages${buildQueryString({
    search: q.search, status: q.status, deliveryType: q.deliveryType, warehouseId: q.warehouseId,
    page: q.page != null ? String(q.page) : undefined, pageSize: q.pageSize != null ? String(q.pageSize) : undefined,
  })}`);
}

/** 精靈步驟 1：可撿完待包的銷貨單（可選出貨方式）。 */
export function listPickableSos(q: { search?: string; deliveryType?: 'D' | 'P' | 'C'; warehouseId?: string } = {}): Promise<{ sos: PackPoolSo[] }> {
  return apiJson(`/nx03/pack-pool/pickable-sos${buildQueryString({ search: q.search, deliveryType: q.deliveryType, warehouseId: q.warehouseId })}`);
}

/** 精靈完成：把選定已撿貨一次建成一個包裹。 */
export function createPackage(deliveryType: 'D' | 'P' | 'C', warehouseId: string, pkItemIds: string[]): Promise<{ id: string; docNo: string; parcelNo: string }> {
  return apiJson(`/nx03/pack-pool/package`, { method: 'POST', body: JSON.stringify({ deliveryType, warehouseId, pkItemIds }) });
}

/** 建包貨單：某客戶某出貨方式整批進、預設一箱一單。 */
export function createPacking(payload: {
  customerId: string;
  warehouseId: string;
  deliveryType: 'D' | 'P' | 'C';
}): Promise<PackingDetail> {
  return apiJson(`/nx03/pack-pool`, { method: 'POST', body: JSON.stringify(payload) });
}

/** 併箱：來源包裹併入目標包裹。 */
export function mergeParcels(payload: {
  plId: string;
  sourceParcelId: string;
  targetParcelId: string;
}): Promise<PackingDetail> {
  return apiJson(`/nx03/pack-pool/merge-parcels`, { method: 'POST', body: JSON.stringify(payload) });
}

/** 封箱：包貨完成。 */
export function sealPacking(plId: string): Promise<PackingDetail> {
  return apiJson(`/nx03/pack-pool/seal`, { method: 'POST', body: JSON.stringify({ plId }) });
}

// ────────────────────────────────────────────────────────────
// nx03/ship-zones（出貨三區、SALES-FLOW 階段 3b）
// 封箱後路由：自取(P) / 寄貨(C) / 配送(D)。完成事件觸發過帳（扣庫存+開應收）。
// ────────────────────────────────────────────────────────────

export interface ShipZoneItem {
  plId: string;
  docNo: string;
  customerId: string | null;
  customerName: string;
  warehouseCode: string;
  parcelCount: number;
  soDocNos: string[];
  deliveryAddress: string | null;
  logisticsProvider: string | null;
  logisticsTrackingNo: string | null;
}

export interface ShipZones {
  pickup: ShipZoneItem[];
  mail: ShipZoneItem[];
  delivery: ShipZoneItem[];
}

export function getShipZones(warehouseId?: string): Promise<ShipZones> {
  return apiJson(`/nx03/ship-zones${buildQueryString({ warehouseId })}`);
}

/** 自取簽收。 */
export function signPickup(plId: string, signerName: string): Promise<{ ok: true; completedSoCount: number }> {
  return apiJson(`/nx03/ship-zones/pickup/sign`, {
    method: 'POST',
    body: JSON.stringify({ plId, signerName }),
  });
}

/** 寄貨寄出。 */
export function shipMail(
  plId: string,
  logisticsProvider: string,
  trackingNo: string,
): Promise<{ ok: true; completedSoCount: number }> {
  return apiJson(`/nx03/ship-zones/mail/ship`, {
    method: 'POST',
    body: JSON.stringify({ plId, logisticsProvider, trackingNo }),
  });
}

/** 配送配單（組多張包貨單成一趟、派外務）。 */
export function createDeliveryRun(
  plIds: string[],
  driverUserId: string,
): Promise<{ dnId: string; docNo: string; stopCount: number; plCount: number }> {
  return apiJson(`/nx03/ship-zones/delivery/run`, {
    method: 'POST',
    body: JSON.stringify({ plIds, driverUserId }),
  });
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

/** 撿包送 LITE-OP-UI 2026-06-09：包貨明細 patch（分配包裹/微調數量） */
export interface PatchPlItemPayload {
  parcelId?: string;
  qty?: number;
  remark?: string;
}

export function patchPlItem(id: string, itemId: string, payload: PatchPlItemPayload): Promise<PlItem> {
  return apiJson(`/nx03/pl/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, {
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

// ────────────────────────────────────────────────────────────
// nx06/delivery（配送 DN）
// status: DRAFT → DISPATCHED → DELIVERED / FAILED / VOIDED
// ────────────────────────────────────────────────────────────

export type DnStatus = 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'FAILED' | 'VOIDED';

export interface DnStop {
  id: string;
  dnId: string;
  taskType?: string | null;
  partnerId?: string | null;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
}

export interface Dn {
  id: string;
  tenantId: string;
  docNo: string;
  dnDate: string;
  warehouseId: string;
  driverUserId: string;
  vehicleNo?: string | null;
  status: DnStatus;
  sourceSoId?: string | null;
  remark?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface DnDetail extends Dn {
  stops?: DnStop[];
}

export function listDns(q: ListQuery = {}): Promise<ListResponse<Dn>> {
  return apiJson(`/nx06/delivery${qs(q)}`);
}

export function getDn(id: string): Promise<DnDetail> {
  return apiJson(`/nx06/delivery/${encodeURIComponent(id)}`);
}

/** 撿包送 LITE-OP-UI 2026-06-09：配送單簽收（terminal 狀態時必填 signature） */
export interface SignaturePayload {
  signerType: 'C' | 'W';
  signerName: string;
  signatureUrl?: string;
  stopId?: string;
}

export function patchDn(
  id: string,
  payload: {
    status: DnStatus;
    remark?: string;
    vehicleNo?: string;
    signature?: SignaturePayload;
  },
): Promise<Dn> {
  return apiJson(`/nx06/delivery/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** 撿包送 LITE-OP-UI 2026-06-09：列退貨取件單 RETURN_PICKUP */
export type ReturnPickupStatus = 'DRAFT' | 'DISPATCHED' | 'PICKED_UP' | 'FAILED' | 'VOIDED';

export interface ReturnPickup extends Omit<Dn, 'status' | 'sourceSoId'> {
  status: ReturnPickupStatus;
  sourceSrId?: string | null;
}

export function listReturnPickups(q: ListQuery = {}): Promise<ListResponse<ReturnPickup>> {
  return apiJson(`/nx06/return-pickup${qs(q)}`);
}

export function getReturnPickup(id: string): Promise<ReturnPickup & { stops?: DnStop[] }> {
  return apiJson(`/nx06/return-pickup/${encodeURIComponent(id)}`);
}

export function patchReturnPickup(
  id: string,
  payload: {
    status: ReturnPickupStatus;
    remark?: string;
    vehicleNo?: string;
    signature?: SignaturePayload;
  },
): Promise<ReturnPickup> {
  return apiJson(`/nx06/return-pickup/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ────────────────────────────────────────────────────────────
// nx03/inbound（驗收 GRN、Q4=a 拍板）
// status: DRAFT → INSPECTING → POSTED / REJECTED / CANCELLED
// ────────────────────────────────────────────────────────────

export type InboundStatus = 'DRAFT' | 'INSPECTING' | 'POSTED' | 'REJECTED' | 'CANCELLED';

export interface InboundItem {
  id: string;
  inboundId: string;
  lineNo: number;
  partId: string;
  partNo?: string | null;
  partName?: string | null;
  locationId?: string | null;
  qty: string;
  unitCost: string;
  lineAmount?: string | null;
  remark?: string | null;
}

export interface Inbound {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  inboundDate: string;
  status: InboundStatus;
  remark?: string | null;
  postedAt?: string | null;
  createdAt: string;
}

export interface InboundDetail extends Inbound {
  items: InboundItem[];
}

export function listInbounds(q: ListQuery = {}): Promise<ListResponse<Inbound>> {
  return apiJson(`/nx03/inbound${qs(q)}`);
}

export function getInbound(id: string): Promise<InboundDetail> {
  return apiJson(`/nx03/inbound/${encodeURIComponent(id)}`);
}

export function patchInbound(id: string, payload: { status?: InboundStatus; remark?: string }): Promise<Inbound> {
  return apiJson(`/nx03/inbound/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * 驗收「一鍵完成」：DRAFT → INSPECTING → POSTED sequential。
 * state machine 不允許 DRAFT → POSTED 直跳、必經 INSPECTING。
 */
export async function completeReceiving(id: string, currentStatus: InboundStatus): Promise<Inbound> {
  if (currentStatus === 'POSTED' || currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') {
    throw new Error(`Inbound 已 ${currentStatus}、無法完成`);
  }
  if (currentStatus === 'DRAFT') {
    await patchInbound(id, { status: 'INSPECTING' });
  }
  return patchInbound(id, { status: 'POSTED' });
}

// ────────────────────────────────────────────────────────────
// nx03/stocktake（盤點、P6 手機掃條碼用）
// status: DRAFT → COUNTING → ADJUSTING → POSTED / CANCELLED
// ────────────────────────────────────────────────────────────

export type StocktakeStatus = 'DRAFT' | 'COUNTING' | 'ADJUSTING' | 'POSTED' | 'CANCELLED';

export interface StocktakeItem {
  id: string;
  stockTakeId: string;
  lineNo: number;
  partId: string;
  partNo?: string | null;
  partName?: string | null;
  locationId?: string | null;
  systemQty: string;
  countedQty?: string | null;
  diffQty?: string | null;
  varianceReasonCode?: 'S' | 'M' | 'B' | 'U' | null;
  remark?: string | null;
}

export interface Stocktake {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  stockTakeDate: string;
  scopeType?: string | null;
  status: StocktakeStatus;
  approvalStatus?: 'N' | 'P' | 'A' | 'R' | null;
  remark?: string | null;
  createdAt: string;
}

export interface StocktakeDetail extends Stocktake {
  items: StocktakeItem[];
}

export function getStocktake(id: string): Promise<StocktakeDetail> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}`);
}

export function patchStocktake(
  id: string,
  payload: { status?: StocktakeStatus; remark?: string },
): Promise<Stocktake> {
  return apiJson(`/nx03/stocktake/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function patchStocktakeItem(
  stockTakeId: string,
  itemId: string,
  payload: {
    countedQty?: number;
    varianceReasonCode?: 'S' | 'M' | 'B' | 'U';
    remark?: string;
  },
): Promise<StocktakeItem> {
  return apiJson(
    `/nx03/stocktake/${encodeURIComponent(stockTakeId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * 盤點掃條碼進入「盤點中」階段（DRAFT → COUNTING）。
 * 若已 COUNTING/ADJUSTING 則無動作。
 */
export async function ensureCountingStatus(
  id: string,
  currentStatus: StocktakeStatus,
): Promise<void> {
  if (currentStatus === 'DRAFT') {
    await patchStocktake(id, { status: 'COUNTING' });
  }
}
