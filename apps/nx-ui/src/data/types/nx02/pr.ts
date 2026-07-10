// apps/nx-ui/src/data/types/nx02/pr.ts
// NX02-PR-SHELL：進貨退回型別（單據外殼用、對齊後端 purchase-return.service enrich 後回傳）

export const PR_STATUSES = ['DRAFT', 'POSTED', 'CANCELLED'] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export const PR_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  POSTED: '已過帳',
  CANCELLED: '已取消',
};

/** 退貨類型：F 全部退 / P 部分退 / A 折讓不退（貨留、不扣庫存、寫進貨折讓沖應付） */
export const RETURN_MODE_LABEL: Record<string, string> = {
  F: '全部退',
  P: '部分退',
  A: '折讓不退',
};

/** 退貨處置：G 一般退 / B 壞品退 / W 走保固（過帳時每行自動建保固申請單、不立應收） */
export const DISPOSITION_LABEL: Record<string, string> = {
  G: '一般退',
  B: '壞品退',
  W: '走保固',
};

/** 退貨原因（1 碼、後端預設 O）：D 商品瑕疵 / W 送錯料號 / Q 數量錯誤 / O 其他 */
export const PR_REASON_LABEL: Record<string, string> = {
  D: '商品瑕疵',
  W: '送錯料號',
  Q: '數量錯誤',
  O: '其他',
};

export type PrItem = {
  id: string;
  prId?: string;
  rrItemId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  locationId: string | null;
  qty: number | string;
  unitCost: number | string;
  lineAmount: number | string;
  returnReason: string | null;
  remark: string | null;
  /** = unitCost（後端附帶） */
  unitPriceSnapshot?: number | string;
};

export type Pr = {
  id: string;
  docNo: string;
  prDate: string;
  warehouseId: string;
  supplierId: string;
  rrId: string | null;
  currencyId: string;
  status: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  remark: string | null;
  returnMode?: 'F' | 'P' | 'A' | null;
  dispositionFlag?: 'G' | 'B' | 'W' | null;
  voidedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // ── enrich（NX02-PR-SHELL 後端攤平）──
  supplierCode?: string | null;
  supplierName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  rrDocNo?: string | null;
  createdByName?: string | null;
  /** 列表帶（_count） */
  itemCount?: number;
  /** 詳情帶 */
  items?: PrItem[];
};
