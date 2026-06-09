import { BadRequestException } from '@nestjs/common';

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const SoStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PICKING: 'PICKING',
  SHIPPED: 'SHIPPED',
  INVOICED: 'INVOICED',
  /// 05 補做 C6 2026-06-09：已完成（送達簽收後、配送單 Nx06Dn.signedAt 全簽 → 自動推進）。
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const SalesReturnStatus = {
  DRAFT: 'DRAFT',
  INSPECTING: 'INSPECTING',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

const QUOTE_EDGES: Record<string, Set<string>> = {
  [QuoteStatus.DRAFT]: new Set([QuoteStatus.SENT, QuoteStatus.CANCELLED]),
  [QuoteStatus.SENT]: new Set([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELLED]),
  [QuoteStatus.ACCEPTED]: new Set(),
  [QuoteStatus.REJECTED]: new Set(),
  [QuoteStatus.EXPIRED]: new Set(),
  [QuoteStatus.CANCELLED]: new Set(),
};

const SO_EDGES: Record<string, Set<string>> = {
  [SoStatus.DRAFT]: new Set([SoStatus.CONFIRMED, SoStatus.CANCELLED]),
  [SoStatus.CONFIRMED]: new Set([SoStatus.PICKING, SoStatus.CANCELLED]),
  [SoStatus.PICKING]: new Set([SoStatus.SHIPPED, SoStatus.CANCELLED]),
  // 05 補做 C6 2026-06-09：SHIPPED 可直推 COMPLETED（簽收後但發票未開）或經 INVOICED
  [SoStatus.SHIPPED]: new Set([SoStatus.INVOICED, SoStatus.COMPLETED]),
  [SoStatus.INVOICED]: new Set([SoStatus.COMPLETED]),
  [SoStatus.COMPLETED]: new Set(),
  [SoStatus.CANCELLED]: new Set(),
};

const SR_EDGES: Record<string, Set<string>> = {
  [SalesReturnStatus.DRAFT]: new Set([SalesReturnStatus.INSPECTING, SalesReturnStatus.CANCELLED]),
  [SalesReturnStatus.INSPECTING]: new Set([
    SalesReturnStatus.POSTED,
    SalesReturnStatus.REJECTED,
    SalesReturnStatus.CANCELLED,
  ]),
  [SalesReturnStatus.POSTED]: new Set(),
  [SalesReturnStatus.REJECTED]: new Set(),
  [SalesReturnStatus.CANCELLED]: new Set(),
};

export function assertQuoteStatusTransition(from: string, to: string): void {
  const edges = QUOTE_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid quote status transition: ${from} -> ${to}`);
  }
}

export function assertSoStatusTransition(from: string, to: string): void {
  const edges = SO_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid SO status transition: ${from} -> ${to}`);
  }
}

export function assertSalesReturnStatusTransition(from: string, to: string): void {
  const edges = SR_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid sales-return status transition: ${from} -> ${to}`);
  }
}
