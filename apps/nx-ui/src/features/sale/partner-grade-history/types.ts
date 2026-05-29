// apps/nx-ui/src/features/sale/partner-grade-history/types.ts
// NX04-M3 C5：客戶等級變更歷史型別

export const PGH_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type PghStatus = (typeof PGH_STATUSES)[number];

export const PGH_STATUS_LABEL: Record<PghStatus, string> = {
  PENDING: '待核可',
  APPROVED: '已核可（已生效）',
  REJECTED: '已退回',
};

export const PGH_STATUS_BADGE_CLASS: Record<PghStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  APPROVED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
};

export interface PartnerGradeHistoryRow {
  id: string;
  tenantId: string;
  partnerId: string;
  oldGradeId: string;
  newGradeId: string;
  status: PghStatus;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateGradeChangeRequestPayload {
  partnerId: string;
  newGradeId: string;
  reason: string;
}

export interface RejectGradeChangePayload {
  rejectReason: string;
}
