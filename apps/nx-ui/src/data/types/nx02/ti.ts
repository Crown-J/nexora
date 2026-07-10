// apps/nx-ui/src/data/types/nx02/ti.ts
// NX02-TI-SHELL：同行調貨單型別（單據外殼用、對齊後端 ti.service 回傳）

export const TI_STATUSES = ['DRAFT', 'SENT', 'REPLIED', 'PENDING_RECEIPT', 'COMPLETED', 'CANCELLED'] as const;
export type TiStatus = (typeof TI_STATUSES)[number];

export const TI_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  SENT: '已發出',
  REPLIED: '已回覆',
  PENDING_RECEIPT: '待驗收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export type TiItem = {
  id: string;
  tiId: string;
  rfqItemId: string | null;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  locationId: string | null;
  qty: number | string;
  unitCost: number | string;
  lineAmount: number | string;
  remark: string | null;
  /** 來源銷貨明細（schema 必填、TI 明細必回鏈客戶訂單） */
  sourceSoItemId: string;
  sourceInquiryRecordId?: string | null;
  /** = unitCost（後端附帶） */
  unitPriceSnapshot?: number | string;
  /** 廠牌料號（runtime JOIN nx01_part.secCode） */
  secCode?: string | null;
  /** 來源銷貨單號（getById 批次解析） */
  sourceSoDocNo?: string | null;
};

/** 關聯進貨單（TI 轉出的 RR、追蹤用） */
export type TiRelatedRr = { id: string; docNo: string; status: string };

export type Ti = {
  id: string;
  docNo: string;
  tiDate: string;
  warehouseId: string;
  partnerId: string;
  rfqId: string | null;
  currencyId: string;
  status: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  remark: string | null;
  voidedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // ── enrich（NX02-TI-SHELL 後端攤平）──
  partnerCode?: string | null;
  partnerName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  rfqDocNo?: string | null;
  createdByName?: string | null;
  /** 列表帶（_count） */
  itemCount?: number;
  /** 詳情帶 */
  items?: TiItem[];
  relatedRrs?: TiRelatedRr[];
};
