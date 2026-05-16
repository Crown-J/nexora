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

// Nx03Disposal.status VarChar(30)：DRAFT / POSTED / VOIDED
// Crown Q-B1=a 不簽核、倉管直接過帳：DRAFT → POSTED 一步到位（對齊 Init 範式）
export const DisposalStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  VOIDED: 'VOIDED',
} as const;

// Nx03Pk.status VarChar(1)：P=待撿貨 / C=撿貨中 / F=已完成 / V=作廢（schema 既有 enum）
// 撿貨 = 待辦工作清單（非業務單據）、不寫 ledger
export const PkStatus = {
  PENDING: 'P',
  COUNTING: 'C',
  FINISHED: 'F',
  VOIDED: 'V',
} as const;

// Nx03Pl.status VarChar(1)：P=待包貨 / C=包貨中 / F=已完成 / S=已寄出 / V=作廢
export const PlStatus = {
  PENDING: 'P',
  COUNTING: 'C',
  FINISHED: 'F',
  SHIPPED: 'S',
  VOIDED: 'V',
} as const;

// Nx03Conversion.status VarChar(30)：DRAFT / POSTED / VOIDED（對齊 Disposal 範式）
// conversionType M=merge 重組 / D=disassemble 分解（不在 status enum、是另一欄）
export const ConversionStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  VOIDED: 'VOIDED',
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

const DISPOSAL_EDGES: Record<string, Set<string>> = {
  [DisposalStatus.DRAFT]: new Set([DisposalStatus.POSTED, DisposalStatus.VOIDED]),
  [DisposalStatus.POSTED]: new Set(),
  [DisposalStatus.VOIDED]: new Set(),
};

const PK_EDGES: Record<string, Set<string>> = {
  [PkStatus.PENDING]: new Set([PkStatus.COUNTING, PkStatus.VOIDED]),
  [PkStatus.COUNTING]: new Set([PkStatus.FINISHED, PkStatus.VOIDED]),
  [PkStatus.FINISHED]: new Set(),
  [PkStatus.VOIDED]: new Set(),
};

const PL_EDGES: Record<string, Set<string>> = {
  [PlStatus.PENDING]: new Set([PlStatus.COUNTING, PlStatus.VOIDED]),
  [PlStatus.COUNTING]: new Set([PlStatus.FINISHED, PlStatus.VOIDED]),
  [PlStatus.FINISHED]: new Set([PlStatus.SHIPPED]),
  [PlStatus.SHIPPED]: new Set(),
  [PlStatus.VOIDED]: new Set(),
};

const CONVERSION_EDGES: Record<string, Set<string>> = {
  [ConversionStatus.DRAFT]: new Set([ConversionStatus.POSTED, ConversionStatus.VOIDED]),
  [ConversionStatus.POSTED]: new Set(),
  [ConversionStatus.VOIDED]: new Set(),
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

export function assertDisposalStatusTransition(from: string, to: string): void {
  const edges = DISPOSAL_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid disposal status transition: ${from} -> ${to}`);
  }
}

export function assertPkStatusTransition(from: string, to: string): void {
  const edges = PK_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid pk status transition: ${from} -> ${to}`);
  }
}

export function assertPlStatusTransition(from: string, to: string): void {
  const edges = PL_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid pl status transition: ${from} -> ${to}`);
  }
}

export function assertConversionStatusTransition(from: string, to: string): void {
  const edges = CONVERSION_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid conversion status transition: ${from} -> ${to}`);
  }
}
