// apps/nx-ui/src/features/inventory/disposal/types.ts
// F2 報廢 UI 2026-06-08：對齊 nx-api Nx03Disposal schema + DS_SEL

export const DISPOSAL_REASONS = ['A', 'B', 'C', 'D'] as const;
export type DisposalReason = (typeof DISPOSAL_REASONS)[number];

export const DISPOSAL_REASON_LABEL: Record<DisposalReason, string> = {
  A: '損壞',
  B: '過期',
  C: '瑕疵',
  D: '其他',
};

// state machine：DRAFT → POSTED 一步、不簽核（Crown Q-B1=a）
export const DISPOSAL_STATUSES = ['DRAFT', 'POSTED', 'VOIDED'] as const;
export type DisposalStatus = (typeof DISPOSAL_STATUSES)[number];

export const DISPOSAL_STATUS_LABEL: Record<DisposalStatus, string> = {
  DRAFT: '草稿',
  POSTED: '已過帳',
  VOIDED: '作廢',
};

export interface DisposalItem {
  id: string;
  disposalId: string;
  lineNo: number;
  partId: string;
  partNo: string;
  partName: string;
  partVersionId: string | null;
  locationId: string;
  qty: string;
  unitCost: string;
  disposalReason: DisposalReason;
  disposalRemark: string | null;
  remark: string | null;
}

export interface Disposal {
  id: string;
  tenantId: string;
  docNo: string;
  warehouseId: string;
  disposalDate: string;
  status: DisposalStatus;
  remark: string | null;
  postedAt: string | null;
  postedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: DisposalItem[];
}

export interface DisposalListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Disposal[];
}

export interface CreateDisposalItemPayload {
  partId: string;
  locationId: string;
  qty: number;
  disposalReason: DisposalReason;
  disposalRemark?: string;
  remark?: string;
}

export interface CreateDisposalPayload {
  warehouseId: string;
  disposalDate: string;
  remark?: string;
  items?: CreateDisposalItemPayload[];
}

export interface UpdateDisposalPayload {
  disposalDate?: string;
  remark?: string;
  status?: DisposalStatus;
}
