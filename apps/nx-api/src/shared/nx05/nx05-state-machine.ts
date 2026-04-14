import { BadRequestException } from '@nestjs/common';

export const ArStatus = {
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  WRITTEN_OFF: 'WRITTEN_OFF',
} as const;

export const ApStatus = {
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  VOID: 'VOID',
} as const;

export const PaylogStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  VOIDED: 'VOIDED',
} as const;

/** 票據 DB：H/C/B/V → API token */
export const NoteApiStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLEARED: 'CLEARED',
  BOUNCED: 'BOUNCED',
  VOIDED: 'VOIDED',
} as const;

/** 折讓 DB：D/A/P/C/V */
export const AllowanceApiStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const ClosingStatus = {
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
} as const;

const AR_EDGES: Record<string, Set<string>> = {
  [ArStatus.OPEN]: new Set([ArStatus.PARTIAL, ArStatus.PAID, ArStatus.OVERDUE, ArStatus.WRITTEN_OFF]),
  [ArStatus.PARTIAL]: new Set([ArStatus.PAID, ArStatus.OVERDUE, ArStatus.WRITTEN_OFF]),
  [ArStatus.OVERDUE]: new Set([ArStatus.PARTIAL, ArStatus.PAID, ArStatus.WRITTEN_OFF]),
  [ArStatus.PAID]: new Set(),
  [ArStatus.WRITTEN_OFF]: new Set(),
};

const AP_EDGES: Record<string, Set<string>> = {
  [ApStatus.OPEN]: new Set([ApStatus.PARTIAL, ApStatus.PAID, ApStatus.OVERDUE, ApStatus.VOID]),
  [ApStatus.PARTIAL]: new Set([ApStatus.PAID, ApStatus.OVERDUE, ApStatus.VOID]),
  [ApStatus.OVERDUE]: new Set([ApStatus.PARTIAL, ApStatus.PAID, ApStatus.VOID]),
  [ApStatus.PAID]: new Set(),
  [ApStatus.VOID]: new Set(),
};

const PAYLOG_EDGES: Record<string, Set<string>> = {
  [PaylogStatus.DRAFT]: new Set([PaylogStatus.POSTED, PaylogStatus.VOIDED]),
  /** 已過帳作廢：沖回 AR/AP（見 nx05-paylog-posting reverse*）。 */
  [PaylogStatus.POSTED]: new Set([PaylogStatus.VOIDED]),
  [PaylogStatus.VOIDED]: new Set(),
};

/** 票據：API 狀態機（對應 DB 字元見 note.service 轉換） */
const NOTE_EDGES: Record<string, Set<string>> = {
  [NoteApiStatus.DRAFT]: new Set([NoteApiStatus.ACTIVE, NoteApiStatus.VOIDED]),
  [NoteApiStatus.ACTIVE]: new Set([NoteApiStatus.CLEARED, NoteApiStatus.BOUNCED, NoteApiStatus.VOIDED]),
  [NoteApiStatus.CLEARED]: new Set(),
  [NoteApiStatus.BOUNCED]: new Set(),
  [NoteApiStatus.VOIDED]: new Set(),
};

const ALLOW_EDGES: Record<string, Set<string>> = {
  [AllowanceApiStatus.DRAFT]: new Set([AllowanceApiStatus.APPROVED, AllowanceApiStatus.REJECTED]),
  [AllowanceApiStatus.APPROVED]: new Set(),
  [AllowanceApiStatus.REJECTED]: new Set(),
};

/** 折讓 DB 狀態（與 migration 一致） */
export const AllowanceDbStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PROCESSED: 'PROCESSED',
  VOIDED: 'VOIDED',
} as const;

const CLOSING_EDGES: Record<string, Set<string>> = {
  [ClosingStatus.OPEN]: new Set([ClosingStatus.CLOSING, ClosingStatus.CLOSED]),
  [ClosingStatus.CLOSING]: new Set([ClosingStatus.CLOSED, ClosingStatus.OPEN]),
  [ClosingStatus.CLOSED]: new Set([ClosingStatus.REOPENED]),
  [ClosingStatus.REOPENED]: new Set(),
};

function assertEdge(edges: Record<string, Set<string>>, from: string, to: string, label: string) {
  const e = edges[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid ${label} status transition: ${from} -> ${to}`);
  }
}

export function assertArStatusTransition(from: string, to: string): void {
  assertEdge(AR_EDGES, from, to, 'AR');
}

export function assertApStatusTransition(from: string, to: string): void {
  assertEdge(AP_EDGES, from, to, 'AP');
}

export function assertPaylogStatusTransition(from: string, to: string): void {
  assertEdge(PAYLOG_EDGES, from, to, 'receipt/payment');
}

export function assertNoteApiStatusTransition(from: string, to: string): void {
  assertEdge(NOTE_EDGES, from, to, 'note');
}

export function assertAllowanceApiStatusTransition(from: string, to: string): void {
  assertEdge(ALLOW_EDGES, from, to, 'allowance');
}

export function assertClosingStatusTransition(from: string, to: string): void {
  assertEdge(CLOSING_EDGES, from, to, 'closing');
}
