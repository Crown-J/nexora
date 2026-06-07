/**
 * File: apps/nx-ui/src/features/nx01/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-UI-TYPES-001：採購模組前端 DTO（對齊 nx-api JSON）
 */

export type Nx01Paged<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Nx01DashboardStats = {
  rfq: { pending: number; total: number };
  po: { pending: number; total: number };
  rr: { pending: number; total: number };
  posted: { thisMonth: number };
  pr: { inProgress: number };
};

export type RfqListRow = {
  id: string;
  docNo: string;
  rfqDate: string;
  supplierName: string | null;
  itemCount: number;
  status: string;
  createdAt: string;
};

export type RfqItemDto = {
  id: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: number;
  unitPrice: number | null;
  leadTimeDays: number | null;
  status: string;
  remark: string | null;
};

export type RfqDetailDto = {
  id: string;
  docNo: string;
  rfqDate: string;
  supplierId: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  currency: string;
  status: string;
  remark: string | null;
  createdAt: string;
  voidedAt: string | null;
  items: RfqItemDto[];
};

export type PoListRow = {
  id: string;
  docNo: string;
  poDate: string;
  supplierName: string;
  itemCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type PoDetailDto = {
  id: string;
  docNo: string;
  poDate: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  rfqId: string | null;
  rfqDocNo: string | null;
  currencyId: string;
  currencyCode: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  expectedDate: string | null;
  remark: string | null;
  /** 採購類型（D 國內 / I 國外 / B 掃貨） */
  purchaseType?: 'D' | 'I' | 'B';
  // T1 進貨對齊批次 2026-06-07：核准/寄出/廠商確認/退件審計欄
  // T1-fix 2026-06-07：加送審稽核欄
  submittedForReviewAt?: string | null;
  submittedForReviewBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  sentAt?: string | null;
  supplierConfirmedAt?: string | null;
  rejectReason?: string | null;
  // T6 進貨對齊批次 2026-06-08：B 級小欄位
  domesticTrackingNo?: string | null;
  paymentMilestone?: 'N' | 'D' | null;
  apMonth?: string | null;
  customsAgentPartnerId?: string | null;
  // T7 進貨對齊批次 2026-06-08：對象分開（4 欄全 nullable、null = 跟 supplier 同）
  invoiceToPartnerId?: string | null;
  shipToPartnerId?: string | null;
  shipToAddressId?: string | null;
  deliveryAddress?: string | null;
  createdAt: string;
  voidedAt: string | null;
  items: {
    id: string;
    lineNo: number;
    rfqItemId: string | null;
    partId: string;
    partNo: string;
    partName: string;
    qty: number;
    receivedQty: number;
    unitCost: number;
    lineAmount: number;
    expectedDate: string | null;
    remark: string | null;
  }[];
};

export type RrListRow = {
  id: string;
  docNo: string;
  rrDate: string;
  warehouseCode: string;
  supplierName: string;
  itemCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type RrDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  warehouseName: string;
  rrDate: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  rfqId: string | null;
  rfqDocNo: string | null;
  poId: string | null;
  poDocNo: string | null;
  currencyId: string;
  currencyCode: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  /** T6 進貨對齊批次 2026-06-08：提貨單號（國外進口報關行核發） */
  deliveryOrderNo?: string | null;
  /** 國外進貨提貨單（國內 RR 無、可選） */
  rrImport?: {
    id: string;
    freightCost: number | string;
    customsDuty: number | string;
    customsFee: number | string;
    storageFee: number | string;
    otherFee: number | string;
    totalImportCost: number | string;
    totalQty: number | string;
    /** M1 新加：買入時匯率鎖定（國內=1） */
    exchangeRate: number | string;
    currencyId: string;
    incoterm: string;
  } | null;
  items: {
    id: string;
    lineNo: number;
    partId: string;
    partNo: string;
    partName: string;
    locationId: string;
    locationCode: string | null;
    qty: number;
    unitCost: number;
    /** M1 新加：原始外幣單價（國內=TWD 同 unitCost） */
    originalUnitCost?: number | string;
    /** M1 新加：攤分到此 item 的進口費用（按金額比例、國內=0） */
    allocatedImportFee?: number | string;
    /** M1 新加：實際入庫成本（含換匯+攤分、過帳用） */
    actualUnitCost?: number | string;
    lineAmount: number;
    poItemId: string | null;
    rfqItemId: string | null;
    /** T2-b 進貨對齊批次 2026-06-07：驗收欄位（預期量+實際量+瑕疵+批號+保固到期） */
    expectedQty?: number | string;
    actualQty?: number | string | null;
    defectQty?: number | string;
    defectType?: 'D' | 'F' | 'W' | 'O' | null;
    defectDesc?: string | null;
    batchNo?: string | null;
    warrantyExpiredAt?: string | null;
    remark: string | null;
  }[];
};

export type PrListRow = {
  id: string;
  docNo: string;
  prDate: string;
  /** 後端 list 只返 supplierId、未 join；optional 容忍 */
  supplierId?: string;
  supplierName?: string;
  itemCount?: number;
  status: string;
  returnMode?: 'F' | 'P' | 'A';
  /** 階段 I P2 加：退貨處置（G=一般 / B=壞品 / W=走保固） */
  dispositionFlag?: 'G' | 'B' | 'W';
  totalAmount: number;
  createdAt: string;
};

export type PrDetailDto = {
  id: string;
  docNo: string;
  warehouseId: string;
  /** backend list/detail 未 join 名稱、optional 容忍 */
  warehouseName?: string;
  prDate: string;
  supplierId: string;
  supplierName?: string;
  rrId: string | null;
  rrDocNo?: string | null;
  currencyId: string;
  currencyCode?: string;
  status: string;
  returnMode?: 'F' | 'P' | 'A';
  /** 階段 I P2 加：退貨處置（G/B/W、W 過帳自動建保固單） */
  dispositionFlag?: 'G' | 'B' | 'W';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  remark: string | null;
  createdAt: string;
  postedAt: string | null;
  voidedAt: string | null;
  items: {
    id: string;
    lineNo: number;
    rrItemId: string;
    rrItemQty: number;
    partId: string;
    partNo: string;
    partName: string;
    locationId: string;
    locationCode: string | null;
    qty: number;
    unitCost: number;
    lineAmount: number;
    remark: string | null;
  }[];
};
