// apps/nx-ui/src/features/sale/quote/types.ts
// NX04-M3 C1：QT 報價單型別（對齊 nx-api Q_SEL / Q_ITEM_SEL）

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: '草稿',
  SENT: '已寄出',
  ACCEPTED: '已接受（含 SO 採用）',
  REJECTED: '客戶拒絕',
  EXPIRED: '已過期',
  CANCELLED: '已取消（含 SO 取代）',
};

export interface QuoteItem {
  id: string;
  quoteId: string;
  lineNo: number;
  groupNo?: number | null;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  unitPrice: string;
  unitPriceSnapshot: string;
  minPrice: string | null;
  discountCodeId: string | null;
  lineAmount: string;
  isSelected: boolean;
  belowMinReason: string | null;
  transferredQty: string;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  // 由零件帶（顯示用）：基準料號 / 廠牌料號 / 廠牌
  baseNo?: string | null;
  brandNo?: string | null;
  brandName?: string | null;
}

export interface Quote {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  quoteDate: string;
  customerId: string;
  customerGradeId: string | null;
  salesPersonId: string | null;
  customerRefNo: string | null;
  validUntil: string | null;
  currencyId: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  status: QuoteStatus;
  remark: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  rfqId: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: QuoteItem[];
  // 後端關聯帶回的顯示名稱（避免畫面露內碼）
  customerCode?: string | null;
  customerName?: string | null;
  customerGradeName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  salesPersonName?: string | null;
  currencyCode?: string | null;
  createdByName?: string | null;
  itemCount?: number;
}

export interface QuoteListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Quote[];
}

export interface CreateQuoteItemPayload {
  partId: string;
  qty: number;
  unitPriceSnapshot: number;
  isSelected?: boolean;
  remark?: string;
  belowMinReason?: string;
}

export interface CreateQuotePayload {
  warehouseId?: string;
  quoteDate: string;
  customerId: string;
  customerGradeId?: string;
  salesPersonId?: string;
  customerRefNo?: string;
  validUntil?: string;
  currencyId?: string;
  taxRate: number;
  remark?: string;
  items?: CreateQuoteItemPayload[];
}

export interface UpdateQuotePayload {
  quoteDate?: string;
  validUntil?: string;
  salesPersonId?: string;
  customerRefNo?: string;
  warehouseId?: string;
  remark?: string;
  status?: QuoteStatus;
}

export interface PatchQuoteItemPayload {
  qty?: number;
  unitPriceSnapshot?: number;
  isSelected?: boolean;
  remark?: string;
  belowMinReason?: string;
}

export interface QuoteHistoricalPrice {
  quoteItemId: string;
  quoteId: string;
  docNo: string;
  quoteDate: string;
  status: QuoteStatus;
  unitPrice: string;
  qty: string;
  minPrice: string | null;
  belowMinReason: string | null;
  createdAt: string;
}

/** 批次報價 picker 的候選列（整組替代料，每列帶可出量/歷史價/建議價）*/
export interface QuoteCandidate {
  id: string;
  code: string;
  name: string;
  secCode: string | null;
  brandCode: string | null;
  brandName: string | null;
  isOem: boolean;
  isActive: boolean;
  role: number; // 1=主件 / 2=替代
  warehouseAvailable: string;
  /** 各倉可出量（warehouseId → available）；換倉看該倉剩餘用 */
  stockByWh: Record<string, string>;
  customerLastDate: string | null;
  customerLastAmount: string | null;
  partLastDate: string | null;
  partLastAmount: string | null;
  suggestedPrice: string | null;
}

/** 報價比價面板 5 格（②~⑤ 逾一個月回 null）*/
export interface QuotePriceRef {
  date: string;
  amount: string;
}
export interface QuotePriceIntel {
  suggestedPrice: string | null; // ① 建議售價（等級地板）
  sameCustomerQuote: QuotePriceRef | null; // ② 同客戶最近報價
  sameCustomerSale: QuotePriceRef | null; // ③ 同客戶最近成交
  sameGradeQuote: QuotePriceRef | null; // ④ 同級距他客最近報價
  sameGradeSale: QuotePriceRef | null; // ⑤ 同級距他客最近成交
}

export interface QuoteCandidatesResult {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouses: { id: string; code: string; name: string }[];
  candidates: QuoteCandidate[];
}
