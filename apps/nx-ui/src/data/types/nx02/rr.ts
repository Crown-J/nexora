// apps/nx-ui/src/data/types/nx02/rr.ts
// NX02-RR-SHELL：進貨單型別（單據外殼用、對齊後端 rr.service enrich 後回傳）
//   舊 data/types/nx02.ts 的 RrListRow/RrDetailDto 為舊視圖所用、Step 4 隨舊視圖退場

export const RR_STATUSES = ['DRAFT', 'INSPECTING', 'POSTED', 'REJECTED', 'CANCELLED'] as const;
export type RrStatus = (typeof RR_STATUSES)[number];

export const RR_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  INSPECTING: '驗收中',
  POSTED: '已過帳',
  REJECTED: '已駁回',
  CANCELLED: '已取消',
};

/** 瑕疵類型（T2-b 驗收欄位）：D 損壞 / F 功能不良 / W 錯料 / O 其他 */
export const DEFECT_TYPE_LABEL: Record<string, string> = {
  D: '損壞',
  F: '功能不良',
  W: '錯料',
  O: '其他',
};

export type RrItem = {
  id: string;
  rrId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  locationId: string;
  qty: number | string;
  unitCost: number | string;
  /** 原始外幣單價（審計；M2-a） */
  originalUnitCost?: number | string | null;
  /** 攤分進口費（M2-a） */
  allocatedImportFee?: number | string | null;
  /** 實際入庫成本（過帳用；M2-a） */
  actualUnitCost?: number | string | null;
  lineAmount: number | string;
  expectedQty?: number | string | null;
  actualQty?: number | string | null;
  defectQty?: number | string | null;
  defectType?: 'D' | 'F' | 'W' | 'O' | null;
  defectDesc?: string | null;
  batchNo?: string | null;
  warrantyExpiredAt?: string | null;
  remark?: string | null;
  /** = unitCost（後端 mapRrDetail 附帶） */
  unitPriceSnapshot?: number | string;
  /** 廠牌料號（runtime JOIN nx01_part.secCode） */
  secCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Rr = {
  id: string;
  docNo: string;
  warehouseId: string;
  supplierId: string;
  rfqId: string | null;
  poId: string | null;
  tiId: string | null;
  currencyId: string;
  status: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  remark: string | null;
  rrDate: string;
  /** 提貨單號（國外進口報關行核發；T6） */
  deliveryOrderNo?: string | null;
  voidedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // ── enrich（NX02-RR-SHELL 後端攤平）──
  supplierCode?: string | null;
  supplierName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  poDocNo?: string | null;
  tiDocNo?: string | null;
  rfqDocNo?: string | null;
  createdByName?: string | null;
  /** 列表帶（_count） */
  itemCount?: number;
  /** 詳情帶 */
  items?: RrItem[];
};
