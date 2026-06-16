// apps/nx-ui/src/features/purchase/ui/sop-workspace/types.ts
/**
 * 國內進貨 SOP 手機工作台型別定義
 * 全 Mock、不接 API；useReducer 驅動 9 步流程。
 */

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type RequirementGroupLabel = '庫存不足' | '客戶下單需求' | '廠商特價推薦';

export type RequirementItem = {
  sku: string;
  name: string;
  group: RequirementGroupLabel;
  /** 僅「庫存不足」類有值 */
  currentStock?: number;
  safetyStock?: number;
  /** 僅「客戶下單需求」類有值 */
  customerName?: string;
  /** 僅「廠商特價推薦」類有值 */
  recommendNote?: string;
  suggested: number;
  defaultChecked: boolean;
};

export type VendorGrade = 'A' | 'B' | 'C';

export type Vendor = {
  id: string;
  name: string;
  grade: VendorGrade;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  paymentTerms: string;
  deliveryDays: number;
  /** 累計金額（總報價） */
  totalQuote: number;
  /** 廠商額外推銷內容（Demo 展示「廠商順便推銷」的真實場景） */
  extraOffer?: string;
};

export type VendorLinePrice = {
  sku: string;
  unitPrice: number;
};

/** 廠商的逐料號報價單價表；未列到的料號用 fallback 單價 */
export type VendorQuoteTable = Record<string /* vendorId */, VendorLinePrice[]>;

/** 廠商 STEP 6 對單一料號的回覆 */
export type VendorLineReply = {
  sku: string;
  status: 'full' | 'partial' | 'delayed';
  confirmedQty: number;
  note?: string;
};

export type InspectionLine = {
  sku: string;
  expectedQty: number;
  actualQty: number | null;
  condition: 'ok' | 'defect';
};

/** 驅動 9 步流程的核心 state（useReducer） */
export type ScenarioState = {
  /** STEP 1：使用者勾選的需求料號集合 */
  selectedSkus: string[];
  /** STEP 2：選中的廠商 ID（null = 尚未選） */
  selectedVendorId: string | null;
  /** STEP 4：主管審核狀態 */
  approvalStatus: 'pending' | 'approved';
  /** STEP 5：寄送後時間戳（null = 尚未寄） */
  sentAt: string | null;
  /** STEP 6：廠商是否已回覆 */
  vendorReplied: boolean;
  /** STEP 8：驗收輸入 */
  inspection: Record<string /* sku */, InspectionLine>;
};

export type ScenarioAction =
  | { type: 'TOGGLE_REQUIREMENT'; sku: string }
  | { type: 'SET_SELECTED_SKUS'; skus: string[] }
  | { type: 'SELECT_VENDOR'; vendorId: string }
  | { type: 'APPROVE' }
  | { type: 'SENT_TO_VENDOR' }
  | { type: 'VENDOR_REPLIED' }
  | { type: 'SET_INSPECTION_QTY'; sku: string; actualQty: number }
  | { type: 'SET_INSPECTION_CONDITION'; sku: string; condition: 'ok' | 'defect' }
  | { type: 'INIT_INSPECTION'; lines: InspectionLine[] }
  | { type: 'RESET' };

export type StepMeta = {
  id: StepNumber;
  /** 頂部流程條圓點下方的 1~2 字 */
  shortLabel: string;
  /** 當前步驟大標題 */
  title: string;
  /** 副標題（系統輔助說明） */
  subtitle: string;
};
