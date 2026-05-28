// apps/nx-ui/src/features/inventory/issue-report/types.ts
// NX03-STOCK-LITE M3-3a：異常回報型別（對齊 nx-api IR_SEL + dto enum）

export const ISSUE_TYPES = ['D', 'E', 'S', 'L', 'O'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const DISPOSITION_TYPES = ['R', 'W', 'C', 'D', 'N'] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

export const ISSUE_STATUSES = ['DRAFT', 'REPORTED', 'PROCESSING', 'CLOSED', 'CANCELLED'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

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
}

export interface CloseIssueReportPayload {
  remark?: string;
}
