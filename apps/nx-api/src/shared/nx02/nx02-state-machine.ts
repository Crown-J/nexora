import { BadRequestException } from '@nestjs/common';

export const RfqStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  REPLIED: 'REPLIED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export const PoStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PARTIAL_RECEIVED: 'PARTIAL_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export const RrStatus = {
  DRAFT: 'DRAFT',
  INSPECTING: 'INSPECTING',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const PrStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

const RFQ_EDGES: Record<string, Set<string>> = {
  [RfqStatus.DRAFT]: new Set([RfqStatus.SENT, RfqStatus.CANCELLED]),
  [RfqStatus.SENT]: new Set([RfqStatus.REPLIED, RfqStatus.CANCELLED]),
  [RfqStatus.REPLIED]: new Set([RfqStatus.CLOSED, RfqStatus.CANCELLED]),
  [RfqStatus.CLOSED]: new Set(),
  [RfqStatus.CANCELLED]: new Set(),
};

const PO_EDGES: Record<string, Set<string>> = {
  [PoStatus.DRAFT]: new Set([PoStatus.CONFIRMED, PoStatus.CANCELLED]),
  [PoStatus.CONFIRMED]: new Set([PoStatus.PARTIAL_RECEIVED, PoStatus.RECEIVED, PoStatus.CANCELLED]),
  [PoStatus.PARTIAL_RECEIVED]: new Set([PoStatus.RECEIVED, PoStatus.CLOSED, PoStatus.CANCELLED]),
  [PoStatus.RECEIVED]: new Set([PoStatus.CLOSED, PoStatus.CANCELLED]),
  [PoStatus.CLOSED]: new Set(),
  [PoStatus.CANCELLED]: new Set(),
};

const RR_EDGES: Record<string, Set<string>> = {
  [RrStatus.DRAFT]: new Set([RrStatus.INSPECTING, RrStatus.CANCELLED]),
  [RrStatus.INSPECTING]: new Set([RrStatus.POSTED, RrStatus.REJECTED, RrStatus.CANCELLED]),
  [RrStatus.POSTED]: new Set(),
  [RrStatus.REJECTED]: new Set([RrStatus.CANCELLED]),
  [RrStatus.CANCELLED]: new Set(),
};

const PR_EDGES: Record<string, Set<string>> = {
  [PrStatus.DRAFT]: new Set([PrStatus.POSTED, PrStatus.CANCELLED]),
  [PrStatus.POSTED]: new Set(),
  [PrStatus.CANCELLED]: new Set(),
};

export function assertRfqStatusTransition(from: string, to: string): void {
  const edges = RFQ_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid RFQ status transition: ${from} -> ${to}`);
  }
}

export function assertPoStatusTransition(from: string, to: string): void {
  const edges = PO_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid PO status transition: ${from} -> ${to}`);
  }
}

export function assertRrStatusTransition(from: string, to: string): void {
  const edges = RR_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid RR status transition: ${from} -> ${to}`);
  }
}

export function assertPrStatusTransition(from: string, to: string): void {
  const edges = PR_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid purchase-return status transition: ${from} -> ${to}`);
  }
}

/** DB 單字元 PR 狀態轉 API token */
export function prDbToApi(s: string): string {
  if (s === 'P') return PrStatus.POSTED;
  if (s === 'V') return PrStatus.CANCELLED;
  return PrStatus.DRAFT;
}

export function prApiToDb(s: string): string {
  if (s === PrStatus.POSTED) return 'P';
  if (s === PrStatus.CANCELLED) return 'V';
  return 'D';
}
