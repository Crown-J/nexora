// apps/nx-ui/src/data/types/nx04/record.ts
// 報價紀錄表 / 詢價紀錄表 型別（對齊 nx-api src/nx04/record）

/** 報價紀錄（客戶側原子日誌，單行）*/
export interface QuoteRecord {
  id: string;
  recordDate: string;
  customerId: string;
  customerCode: string | null;
  customerName: string | null;
  customerGradeId: string | null;
  partId: string;
  partNo: string;
  partName: string;
  baseNo: string | null;
  brandNo: string | null;
  brandName: string | null;
  warehouseId: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  qty: string;
  unitPrice: string;
  currencyId: string;
  currencyCode: string | null;
  source: string; // INSTANT 即時 / QUOTE 由報價單行寫入
  sourceDocId: string | null;
  salesPersonId: string | null;
  salesPersonName: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
}

/** 詢價紀錄（調貨/同行側原子日誌，單行）*/
export interface InquiryRecord {
  id: string;
  recordDate: string;
  sourcePartnerId: string;
  partnerCode: string | null;
  partnerName: string | null;
  partId: string;
  partNo: string;
  partName: string;
  baseNo: string | null;
  brandNo: string | null;
  brandName: string | null;
  warehouseId: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  qty: string;
  unitPrice: string;
  currencyId: string;
  currencyCode: string | null;
  salesPersonId: string | null;
  salesPersonName: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
}

export interface RecordListResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export interface CreateQuoteRecordPayload {
  customerId: string;
  partId: string;
  qty: number;
  unitPrice: number;
  recordDate?: string;
  warehouseId?: string;
  customerGradeId?: string;
  currencyId?: string;
  source?: string;
  sourceDocId?: string;
  salesPersonId?: string;
  remark?: string;
}

export interface CreateInquiryRecordPayload {
  sourcePartnerId: string;
  partId: string;
  qty: number;
  unitPrice: number;
  recordDate?: string;
  warehouseId?: string;
  currencyId?: string;
  salesPersonId?: string;
  remark?: string;
}
