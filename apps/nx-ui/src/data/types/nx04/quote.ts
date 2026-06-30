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
  warehouseId: string;
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
