// apps/nx-ui/src/features/sale/so/types.ts
// NX04-M3 C2：SO 銷貨單型別（對齊 nx-api SO_SEL / SO_ITEM_SEL）

export const SO_STATUSES = ['DRAFT', 'CONFIRMED', 'PICKING', 'SHIPPED', 'INVOICED', 'CANCELLED'] as const;
export type SoStatus = (typeof SO_STATUSES)[number];

export const SO_STATUS_LABEL: Record<SoStatus, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已確認（自動調撥已觸發）',
  PICKING: '撿貨中',
  SHIPPED: '已出貨',
  INVOICED: '已開立',
  CANCELLED: '已取消',
};

/// 補貨來源類型（SoItem.transferSourceType）
/// S 本倉現貨 / T 自倉調撥 / G 同行調貨 / B 客戶訂單
export const TRANSFER_SOURCE_LABEL: Record<string, string> = {
  S: '本倉現貨',
  T: '自倉調撥',
  G: '同行調貨',
  B: '客戶訂單',
};

/// 補貨進度（SoItem.transferStatus）
/// C 補貨完成 / P 待補 / I 補貨中
export const TRANSFER_STATUS_LABEL: Record<string, string> = {
  C: '補貨完成',
  P: '待補',
  I: '補貨中',
};

/// 出貨進度（SoItem.fulfillStatus）
/// W 等貨 / PK 撿貨中 / PL 包裝中 / D 已出貨 / F 已完成
export const FULFILL_STATUS_LABEL: Record<string, string> = {
  W: '等貨',
  PK: '撿貨中',
  PL: '包裝中',
  D: '已出貨',
  F: '已完成',
};

export interface SoItem {
  id: string;
  soId: string;
  quoteItemId: string | null;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  warehouseId: string;
  locationId: string | null;
  qty: string;
  unitPrice: string;
  unitPriceSnapshot: string;
  lineAmount: string;
  reservedQty: string;
  remark: string | null;
  itemStatus: string;
  transferSourceType: string;
  transferStatus: string;
  fulfillStatus: string;
  tiId: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface So {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  soDate: string;
  customerId: string;
  quoteId: string | null;
  deliveryType: string;
  deliveryAddress: string | null;
  sourceType: string;
  currencyId: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  status: SoStatus;
  paymentTerm: string | null;
  remark: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: SoItem[];
}

export interface SoListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: So[];
}

export interface CreateSoItemPayload {
  partId: string;
  warehouseId: string;
  locationId?: string;
  qty: number;
  unitPriceSnapshot: number;
  quoteItemId?: string;
  /// S/T/G/B 補貨來源（未填預設 S）
  transferSourceType?: string;
  belowMinReason?: string;
  remark?: string;
}

export interface CreateSoPayload {
  warehouseId: string;
  soDate: string;
  customerId: string;
  quoteId?: string;
  /// P 自取 / D 配送 / S 寄送
  deliveryType: string;
  currencyId?: string;
  taxRate: number;
  remark?: string;
  items?: CreateSoItemPayload[];
}

export interface UpdateSoPayload {
  soDate?: string;
  remark?: string;
  status?: SoStatus;
  cancelReason?: string;
  deliveryType?: string;
  deliveryAddress?: string;
}

export interface PatchSoItemPayload {
  locationId?: string;
  qty?: number;
  unitPriceSnapshot?: number;
  remark?: string;
}

/// 拉報價 picker 回傳行（GET /nx04/so/quote-lines/open）
export interface OpenQuoteLine {
  quoteItemId: string;
  quoteId: string;
  docNo: string;
  quoteDate: string;
  quoteStatus: string;
  warehouseId: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  transferredQty: string;
  remainQty: string;
  unitPrice: string;
  minPrice: string | null;
  belowMinReason: string | null;
  createdAt: string;
}

/// 待調貨行（GET /nx04/so/:id/pending-transfer-lines）
export interface PendingTransferLinesResponse {
  soId: string;
  docNo: string;
  customerId: string;
  items: SoItem[];
}

export interface CreateTiFromSoPayload {
  partnerId: string;
  soItemIds: string[];
  remark?: string;
}

export interface CreateTiFromSoResponse {
  tiId: string;
  tiDocNo: string;
  soId: string;
  soDocNo: string;
  partnerId: string;
  lineCount: number;
}
