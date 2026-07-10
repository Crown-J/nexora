// apps/nx-ui/src/features/shared/issue-report-trigger/index.ts
// NX04-M3 C6：跨單據問題回報共用元件 barrel

// W5 Step 5：加 export IssueReportModal（新殼 toolbar 直接嵌 modal、不用自帶按鈕的舊 wrapper）
export { IssueReportTrigger, IssueReportModal, type IrPartOption } from './IssueReportTrigger';
export type {
  CreateIssueReportPayload,
  DispositionType,
  IssueType,
  SourceDocType,
} from '@data/types/shared/issue-report-trigger';
