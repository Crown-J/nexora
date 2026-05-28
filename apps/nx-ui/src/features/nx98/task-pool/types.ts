// apps/nx-ui/src/features/nx98/task-pool/types.ts
// LITE 階段 1 M4：共享待辦池前端 type

export type TaskStatus = 'OPEN' | 'CLAIMED' | 'DONE' | 'VOIDED';
export type TaskPriority = 'L' | 'M' | 'H';
export type TaskScope = 'mine' | 'pool' | 'dept' | 'all';

export type TaskPoolDto = {
  id: string;
  tenantId: string;
  docNo: string | null;
  sourceModule: string | null;
  sourceDocType: string | null;
  sourceDocId: string | null;
  sourceDocNo: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  dueDate: string | null;
  departmentId: string | null;
  assigneeUserId: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  claimedAt: string | null;
  claimedBy: string | null;
  status: TaskStatus;
  completedAt: string | null;
  completedBy: string | null;
  completedRemark: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  department?: { code: string; name: string } | null;
};

export type CreateTaskPoolBody = {
  title: string;
  description?: string;
  category: string;
  priority?: TaskPriority;
  dueDate?: string;
  departmentId?: string;
  assigneeUserId?: string;
  sourceModule?: string;
  sourceDocType?: string;
  sourceDocId?: string;
  sourceDocNo?: string;
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: '池中',
  CLAIMED: '已領取',
  DONE: '已完成',
  VOIDED: '已作廢',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  L: '低',
  M: '中',
  H: '高',
};

export const CATEGORY_LABEL: Record<string, string> = {
  PURCHASE_RECEIVE: '待驗收',
  PURCHASE_INSPECT: '待檢驗',
  SALES_PICK: '待撿貨',
  SALES_PACK: '待包貨',
  SALES_DELIVERY: '待配送',
  INVENTORY_DISPOSAL: '異常處理',
  INVENTORY_STOCKTAKE: '盤點作業',
  FINANCE_AR_FOLLOW: '應收追款',
  FINANCE_AP_DUE: '應付到期',
  OTHER: '其他',
};
