import { BadRequestException } from '@nestjs/common';

export const InboundStatus = {
  DRAFT: 'DRAFT',
  INSPECTING: 'INSPECTING',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const OutboundStatus = {
  DRAFT: 'DRAFT',
  PICKING: 'PICKING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  CANCELLED: 'CANCELLED',
} as const;

export const StockTakeStatus = {
  DRAFT: 'DRAFT',
  COUNTING: 'COUNTING',
  ADJUSTING: 'ADJUSTING',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export const TransferStatus = {
  DRAFT: 'DRAFT',
  TRANSIT: 'TRANSIT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

// Nx03Init.status VarChar(1)：D=DRAFT / P=POSTED / V=VOIDED
// Crown Q-Phase3-1=a 不簽核、倉管直接過帳：D → P 一步到位、無中間 INSPECTING
export const InitStatus = {
  DRAFT: 'D',
  POSTED: 'P',
  VOIDED: 'V',
} as const;

const INBOUND_EDGES: Record<string, Set<string>> = {
  [InboundStatus.DRAFT]: new Set([InboundStatus.INSPECTING, InboundStatus.CANCELLED]),
  [InboundStatus.INSPECTING]: new Set([InboundStatus.POSTED, InboundStatus.REJECTED, InboundStatus.CANCELLED]),
  [InboundStatus.POSTED]: new Set(),
  [InboundStatus.REJECTED]: new Set(),
  [InboundStatus.CANCELLED]: new Set(),
};

const OUTBOUND_EDGES: Record<string, Set<string>> = {
  [OutboundStatus.DRAFT]: new Set([OutboundStatus.PICKING, OutboundStatus.CANCELLED]),
  [OutboundStatus.PICKING]: new Set([OutboundStatus.PACKED, OutboundStatus.CANCELLED]),
  [OutboundStatus.PACKED]: new Set([OutboundStatus.SHIPPED, OutboundStatus.CANCELLED]),
  [OutboundStatus.SHIPPED]: new Set(),
  [OutboundStatus.CANCELLED]: new Set(),
};

const STOCK_TAKE_EDGES: Record<string, Set<string>> = {
  [StockTakeStatus.DRAFT]: new Set([StockTakeStatus.COUNTING, StockTakeStatus.CANCELLED]),
  [StockTakeStatus.COUNTING]: new Set([StockTakeStatus.ADJUSTING, StockTakeStatus.CANCELLED]),
  [StockTakeStatus.ADJUSTING]: new Set([StockTakeStatus.POSTED, StockTakeStatus.CANCELLED]),
  [StockTakeStatus.POSTED]: new Set(),
  [StockTakeStatus.CANCELLED]: new Set(),
};

const TRANSFER_EDGES: Record<string, Set<string>> = {
  [TransferStatus.DRAFT]: new Set([TransferStatus.TRANSIT, TransferStatus.CANCELLED]),
  [TransferStatus.TRANSIT]: new Set([TransferStatus.RECEIVED, TransferStatus.CANCELLED]),
  [TransferStatus.RECEIVED]: new Set(),
  [TransferStatus.CANCELLED]: new Set(),
};

const INIT_EDGES: Record<string, Set<string>> = {
  [InitStatus.DRAFT]: new Set([InitStatus.POSTED, InitStatus.VOIDED]),
  [InitStatus.POSTED]: new Set(),
  [InitStatus.VOIDED]: new Set(),
};

export function assertInboundStatusTransition(from: string, to: string): void {
  const edges = INBOUND_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid inbound status transition: ${from} -> ${to}`);
  }
}

export function assertOutboundStatusTransition(from: string, to: string): void {
  const edges = OUTBOUND_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid outbound status transition: ${from} -> ${to}`);
  }
}

export function assertStockTakeStatusTransition(from: string, to: string): void {
  const edges = STOCK_TAKE_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid stock take status transition: ${from} -> ${to}`);
  }
}

export function assertTransferStatusTransition(from: string, to: string): void {
  const edges = TRANSFER_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid transfer status transition: ${from} -> ${to}`);
  }
}

export function assertInitStatusTransition(from: string, to: string): void {
  const edges = INIT_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid init status transition: ${from} -> ${to}`);
  }
}
