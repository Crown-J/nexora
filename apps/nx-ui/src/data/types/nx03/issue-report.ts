// apps/nx-ui/src/features/inventory/issue-report/types.ts
// NX03-STOCK-LITE M3-3a：異常回報型別（對齊 nx-api IR_SEL + dto enum）

export const ISSUE_TYPES = ['D', 'E', 'S', 'L', 'O'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

// F1 特價售出 2026-06-08：第 6 處置 X（建特價 SO、specialPriceFlag=true）
export const DISPOSITION_TYPES = ['R', 'W', 'C', 'D', 'N', 'X'] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

export const ISSUE_STATUSES = ['DRAFT', 'REPORTED', 'PROCESSING', 'CLOSED', 'CANCELLED'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

// W5 異常鏈 Step 4 2026-07-11：標籤自舊 IssueReportListView 搬入 types（對齊 TI_STATUS_LABEL 範式）
export const IR_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  REPORTED: '已回報',
  PROCESSING: '處置中',
  CLOSED: '已結案',
  CANCELLED: '已作廢',
};

export const IR_ISSUE_LABEL: Record<string, string> = {
  D: '損毀',
  E: '過期',
  S: '數量短缺',
  L: '放錯庫位',
  O: '其他',
};

// W5 Step 4：R 標籤修正「退貨→Nx02Rr」舊註解遺毒 → 明確指向進貨退回單（PR、2026-07-10 第八張單）
export const IR_DISPOSITION_LABEL: Record<string, string> = {
  R: '退廠商（進貨退回單）',
  W: '保固申請',
  C: '重組分解',
  D: '報廢',
  N: '未處置',
  // F1 特價售出 2026-06-08：第 6 處置
  X: '特價售出',
};

export interface IssueReport {
  id: string;
  tenantId: string;
  docNo: string;
  reportDate: string;
  warehouseId: string;
  locationId: string | null;
  partId: string;
  partNo: string;
  partName: string;
  partVersionId: string | null;
  qty: string;
  issueType: IssueType;
  dispositionType: DispositionType;
  relatedDocId: string | null;
  sourceModule: string | null;
  sourceDocType: string | null;
  sourceDocId: string | null;
  status: IssueStatus;
  description: string | null;
  photoUrl: string | null;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  warehouse?: { code: string; name: string } | null;
  location?: { code: string; name: string } | null;
  part?: { code: string; name: string } | null;
  /** W5 Step 4：list 後端 enrich（單據外殼列表欄） */
  createdByName?: string | null;
}

export interface IssueReportListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: IssueReport[];
}

export interface CreateIssueReportPayload {
  reportDate: string;
  warehouseId: string;
  locationId?: string;
  partId: string;
  qty: number;
  issueType: IssueType;
  description?: string;
  photoUrl?: string;
  sourceModule?: string;
  sourceDocType?: string;
  sourceDocId?: string;
}

export interface UpdateIssueReportPayload {
  reportDate?: string;
  locationId?: string;
  qty?: number;
  issueType?: IssueType;
  description?: string;
  photoUrl?: string;
}

export interface DisposeIssueReportPayload {
  dispositionType: DispositionType;
  relatedDocId?: string;
  // F1 特價售出 2026-06-08：dispositionType='X' 且未帶 relatedDocId 時、後端自動建特價 SO 需要：
  customerId?: string;
  warehouseId?: string;
  unitPrice?: number;
  // W5 異常鏈 Step 3/4：一鍵開單（true 且無 relatedDocId：D 任何來源 / R+W 限進貨驗收來源；C 不支援）
  autoCreate?: boolean;
}

export interface CloseIssueReportPayload {
  remark?: string;
}
