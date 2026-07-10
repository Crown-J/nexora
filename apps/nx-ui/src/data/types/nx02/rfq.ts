// apps/nx-ui/src/data/types/nx02/rfq.ts
// NX02-RFQ-SHELL：詢價單型別（單據外殼用、對齊後端 rfq.service enrich 後回傳）
//   舊 data/types/nx02.ts 的 RfqListRow/RfqDetailDto 為舊視圖所用、隨舊視圖退場

export const RFQ_STATUSES = ['DRAFT', 'SENT', 'REPLIED', 'CLOSED', 'CANCELLED'] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export const RFQ_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  SENT: '已發出',
  REPLIED: '已回覆',
  CLOSED: '結案',
  CANCELLED: '已取消',
};

/** 明細狀態：P 待回覆 / R 已回覆 / C 不採用 / S 已選用 */
export const RFQ_ITEM_STATUS_LABEL: Record<string, string> = {
  P: '待回覆',
  R: '已回覆',
  C: '不採用',
  S: '已選用',
};

export type RfqItem = {
  id: string;
  rfqId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  qty: number | string;
  unitPrice: number | string | null;
  currencyId?: string | null;
  leadTimeDays: number | null;
  status: string;
  remark: string | null;
  /** 廠牌料號（runtime JOIN nx01_part.secCode） */
  secCode?: string | null;
};

export type Rfq = {
  id: string;
  docNo: string;
  rfqDate: string;
  supplierId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  currency: string;
  status: string;
  remark: string | null;
  rfqType?: string | null;
  rfqReason?: string | null;
  warehouseId?: string | null;
  validUntil?: string | null;
  demandId?: string | null;
  voidedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // ── enrich（NX02-RFQ-SHELL 後端攤平）──
  supplierCode?: string | null;
  supplierName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  createdByName?: string | null;
  /** 列表帶（_count） */
  itemCount?: number;
  /** 詳情帶 */
  items?: RfqItem[];
};
