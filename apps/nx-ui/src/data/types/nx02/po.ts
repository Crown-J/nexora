// apps/nx-ui/src/data/types/nx02/po.ts
// NX02-PO-SHELL：採購單型別（單據外殼用、對齊後端 po.service enrich 後回傳）
//   舊 data/types/nx02.ts 的 PoListRow/PoDetailDto 為舊視圖所用、隨舊視圖退場

export const PO_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SUBMITTED',
  'CONFIRMED',
  'PARTIAL_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_APPROVAL: '待核准',
  APPROVED: '已核准',
  SUBMITTED: '已寄廠商',
  CONFIRMED: '廠商確認',
  PARTIAL_RECEIVED: '部分到貨',
  RECEIVED: '已到貨',
  CLOSED: '結案',
  CANCELLED: '已取消',
};

export const PURCHASE_TYPE_LABEL: Record<string, string> = {
  D: '國內',
  I: '國外',
  B: '掃貨',
};

export const PAYMENT_MILESTONE_LABEL: Record<string, string> = {
  N: '廠商已通知付款',
  D: '已付款',
};

export type PoItem = {
  id: string;
  poId?: string;
  rfqItemId: string | null;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: number | string;
  receivedQty: number | string;
  /** 取消量（剩餘可收 = qty - receivedQty - cancelledQty） */
  cancelledQty?: number | string | null;
  unitCost: number | string;
  lineAmount: number | string;
  expectedDate: string | null;
  remark: string | null;
  /** = unitCost（後端 mapPoDetail 附帶） */
  unitPriceSnapshot?: number | string;
  /** 廠牌料號（runtime JOIN nx01_part.secCode） */
  secCode?: string | null;
};

export type Po = {
  id: string;
  docNo: string;
  poDate: string;
  supplierId: string;
  rfqId: string | null;
  currencyId: string;
  status: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  expectedDate: string | null;
  remark: string | null;
  /** 採購類型（D 國內 / I 國外 / B 掃貨） */
  purchaseType?: 'D' | 'I' | 'B';
  /** 國外 6 階段（顯示用、編輯走國外採購頁） */
  purchaseStage?: number | null;
  // T1 審計欄
  submittedForReviewAt?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  supplierConfirmedAt?: string | null;
  rejectReason?: string | null;
  // T6 里程碑 / 物流
  domesticTrackingNo?: string | null;
  paymentMilestone?: 'N' | 'D' | null;
  apMonth?: string | null;
  customsAgentPartnerId?: string | null;
  // T7 對象分開
  invoiceToPartnerId?: string | null;
  shipToPartnerId?: string | null;
  shipToAddressId?: string | null;
  deliveryAddress?: string | null;
  voidedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // ── enrich（NX02-PO-SHELL 後端攤平）──
  supplierCode?: string | null;
  supplierName?: string | null;
  rfqDocNo?: string | null;
  createdByName?: string | null;
  /** 列表帶（_count） */
  itemCount?: number;
  /** 詳情帶 */
  items?: PoItem[];
};
