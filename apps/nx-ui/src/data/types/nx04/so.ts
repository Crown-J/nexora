// apps/nx-ui/src/features/sale/so/types.ts
// NX04-M3 C2：SO 銷貨單型別（對齊 nx-api SO_SEL / SO_ITEM_SEL）

export const SO_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'PICKING',
  'SHIPPED',
  'INVOICED',
  // 05 補做 C6 2026-06-09：已完成（送達簽收後 + 全 lines fulfillStatus='F' 自動推進）
  'COMPLETED',
  'CANCELLED',
] as const;
export type SoStatus = (typeof SO_STATUSES)[number];

export const SO_STATUS_LABEL: Record<SoStatus, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已確認（自動調撥已觸發）',
  PICKING: '撿貨中',
  SHIPPED: '已出貨',
  INVOICED: '已開立',
  COMPLETED: '已完成',
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

/// 05 補做 C3 2026-06-09：銷貨方式 datalist 常用值（業界口語、可手填）
export const SALES_METHOD_OPTIONS = ['自叫', '網路單', '櫃台', '業務上門', 'LINE 下單'] as const;

export interface SoItem {
  id: string;
  soId: string;
  quoteItemId: string | null;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  /** 05 補做 B5 2026-06-09：廠牌 snapshot */
  brandId?: string | null;
  brandName?: string | null;
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
  /** 偉盟設計檢視 P1-5 2026-07-10：實際出貨料號（替代出貨；null=照下單料號出） */
  actualPartId?: string | null;
  actualPartNo?: string | null;
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
  /** 05 補做 C2/C3/C4 2026-06-09：業務員 / 銷貨方式 / 帳款年月 */
  salesPersonId?: string | null;
  salesMethod?: string | null;
  accountPeriod?: string | null;
  /** 05 補做 D1 2026-06-09：header 揀貨/出貨整體進度（derived from line.fulfillStatus）*/
  pickingStatus?: string | null;
  remark: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: SoItem[];
  // NX04-QT-SHELL 2026-07-07：單據模板 enriched 顯示欄（後端 SO_SEL/list 回傳）
  customerCode?: string | null;
  customerName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  currencyCode?: string | null;
  salesPersonName?: string | null;
  createdByName?: string | null;
  itemCount?: number;
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
  // NX04-QT-SHELL：選填（後端 create 有 fallback：客戶預設倉→使用者隸屬倉→主倉）
  warehouseId?: string;
  soDate: string;
  customerId: string;
  quoteId?: string;
  /// P 自取 / D 配送 / S 寄送
  deliveryType: string;
  currencyId?: string;
  taxRate: number;
  remark?: string;
  items?: CreateSoItemPayload[];
  /** 05 補做 C2/C3/C4 2026-06-09：業務員 / 銷貨方式 / 帳款年月（YYYY-MM-DD） */
  salesPersonId?: string;
  salesMethod?: string;
  accountPeriod?: string;
  /** 發票聯式（0 不開 / 2 二聯 / 3 三聯）；未填後端從客戶預設帶 */
  invoiceCopies?: number;
  /** 付款條件（CASH/NET30…）；未填後端沿用客戶主檔，過 CreditGuard（INSTANT-SALES 2026-07-18） */
  paymentTerm?: string;
  /** 送貨地點／取貨註記（A 叫貨送 B、B 來取）；未填後端帶客戶預設送貨地址 */
  deliveryAddress?: string;
}

export interface UpdateSoPayload {
  soDate?: string;
  remark?: string;
  status?: SoStatus;
  cancelReason?: string;
  deliveryType?: string;
  deliveryAddress?: string;
  /** 05 補做 C2/C3/C4 2026-06-09 */
  salesPersonId?: string;
  salesMethod?: string;
  accountPeriod?: string;
}

export interface PatchSoItemPayload {
  locationId?: string;
  qty?: number;
  unitPriceSnapshot?: number;
  remark?: string;
  /** 偉盟設計檢視 P1-5：實際出貨料號（null=清除、照下單料號出） */
  actualPartId?: string | null;
  /** 調貨詢價軌 2026-07-12：補貨來源改標（S/T/G/B）；補貨中禁改（後端擋） */
  transferSourceType?: string;
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
