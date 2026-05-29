// apps/nx-ui/src/features/shared/issue-report-trigger/types.ts
// NX04-M3 C6：跨單據問題回報共用元件型別

export const ISSUE_TYPES = ['D', 'E', 'S', 'L', 'O'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  D: 'D 損毀',
  E: 'E 過期',
  S: 'S 數量短缺',
  L: 'L 放錯庫位',
  O: 'O 其他',
};

export const DISPOSITION_TYPES = ['R', 'W', 'C', 'D', 'N'] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

export const DISPOSITION_TYPE_LABEL: Record<DispositionType, string> = {
  R: 'R 退貨',
  W: 'W 保固',
  C: 'C 重組分解',
  D: 'D 報廢',
  N: 'N 未處置',
};

export const SOURCE_DOC_TYPES = ['QT', 'SO', 'SR'] as const;
export type SourceDocType = (typeof SOURCE_DOC_TYPES)[number];

export interface CreateIssueReportPayload {
  sourceDocType: SourceDocType;
  sourceDocId: string;
  partId: string;
  qty: number;
  issueType: IssueType;
  dispositionType?: DispositionType;
  warehouseId: string;
  locationId?: string;
  description?: string;
}
