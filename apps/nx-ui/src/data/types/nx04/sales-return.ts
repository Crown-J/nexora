// apps/nx-ui/src/features/sale/sales-return/types.ts
// NX04-M3 C4：SR 銷退單型別（對齊 nx-api SR_SEL / SR_ITEM_SEL）

export const SR_STATUSES = ['DRAFT', 'INSPECTING', 'POSTED', 'REJECTED', 'CANCELLED'] as const;
export type SrStatus = (typeof SR_STATUSES)[number];

export const SR_STATUS_LABEL: Record<SrStatus, string> = {
  DRAFT: '草稿（業務開單）',
  INSPECTING: '驗收中（倉管收貨）',
  POSTED: '已過帳',
  REJECTED: '駁回',
  CANCELLED: '已取消',
};

export const SR_STATUS_BADGE_CLASS: Record<SrStatus, string> = {
  DRAFT: 'bg-muted text-foreground',
  INSPECTING: 'bg-amber-100 text-amber-900',
  POSTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

/// 退款方式 returnMethod（R 退錢 / D 折讓 / X 換新）
export const RETURN_METHOD_LABEL: Record<string, string> = {
  R: 'R 退錢給客戶',
  D: 'D 折讓下次採購',
  X: 'X 換新品',
};

/// 05 補做 C1 2026-06-09：退回方式 initiationType
export const INITIATION_TYPE_LABEL: Record<string, string> = {
  A: 'A 業務發起（計畫性、業務接到客戶要退）',
  B: 'B 送貨員當場帶回（臨時、配送時被告知）',
};

/// 過帳 returnAction（POSTED 時帶入）
export const RETURN_ACTION_LABEL: Record<string, string> = {
  R: 'R 退錢（NX05 Allowance）',
  D: 'D 折讓（NX05 ArLedger 沖帳）',
  X: 'X 換新（業務手動建新 SO、不沖庫存）',
};

/// 好品 / 壞品旗標
export const DISPOSITION_LABEL: Record<string, string> = {
  G: 'G 好品（入主倉）',
  B: 'B 壞品（寫異常表）',
};

export interface SrItem {
  id: string;
  srId: string;
  /** 來源銷貨明細（DB 可空：偉盟歷史匯入無原單） */
  soItemId: string | null;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  returnPolicy: string | null;
  returnType: string;
  returnReason: string;
  concessionReason: string | null;
  qty: string;
  unitPrice: string;
  unitPriceSnapshot: string;
  lineAmount: string;
  locationId: string | null;
  dispositionFlag: 'G' | 'B' | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Sr {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  srDate: string;
  customerId: string;
  /** 來源銷貨單（DB 可空：偉盟歷史匯入無原單；系統內建立必填） */
  soId: string | null;
  returnMethod: string;
  /** 05 補做 C1 2026-06-09：退回方式（A=業務發起 / B=送貨員當場帶回） */
  initiationType?: 'A' | 'B' | null;
  status: SrStatus;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectReason: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: SrItem[];
  // NX04-QT-SHELL 2026-07-10：單據模板 enriched 顯示欄（後端 SR_SEL/list 回傳）
  customerCode?: string | null;
  customerName?: string | null;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  soDocNo?: string | null;
  createdByName?: string | null;
  itemCount?: number;
}

export interface SrListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Sr[];
}

export interface CreateSrItemPayload {
  soItemId: string;
  qty: number;
  returnReason: string;
  returnType?: string;
  locationId?: string;
  concessionReason?: string;
  dispositionFlag?: 'G' | 'B';
  remark?: string;
}

export interface CreateSrPayload {
  soId: string;
  srDate: string;
  /// R 退錢 / D 折讓 / X 換新
  returnMethod: string;
  /** 05 補做 C1 2026-06-09：退回方式（A=業務發起 / B=送貨員當場帶回） */
  initiationType?: 'A' | 'B';
  taxRate: number;
  remark?: string;
  items?: CreateSrItemPayload[];
}

export interface UpdateSrPayload {
  srDate?: string;
  remark?: string;
  status?: SrStatus;
  rejectReason?: string;
  returnAction?: 'R' | 'D' | 'X';
  /** 05 補做 C1 2026-06-09 */
  initiationType?: 'A' | 'B';
}

export interface PatchSrItemPayload {
  locationId?: string;
  qty?: number;
  returnReason?: string;
  returnType?: string;
  concessionReason?: string;
  dispositionFlag?: 'G' | 'B';
  remark?: string;
}
