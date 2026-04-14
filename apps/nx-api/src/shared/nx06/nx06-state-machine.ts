import { BadRequestException } from '@nestjs/common';

export const LogisticsKind = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
  INTL_SHIPPING: 'INTL_SHIPPING',
  RETURN_PICKUP: 'RETURN_PICKUP',
} as const;

export type LogisticsKindValue = (typeof LogisticsKind)[keyof typeof LogisticsKind];

export const DnDeliveryStatus = {
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  VOIDED: 'VOIDED',
} as const;

export const DnPickupStatus = {
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  PICKED_UP: 'PICKED_UP',
  FAILED: 'FAILED',
  VOIDED: 'VOIDED',
} as const;

export const DnIntlStatus = {
  DRAFT: 'DRAFT',
  CUSTOMS: 'CUSTOMS',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  VOIDED: 'VOIDED',
} as const;

const DELIVERY_EDGES: Record<string, Set<string>> = {
  [DnDeliveryStatus.DRAFT]: new Set([DnDeliveryStatus.DISPATCHED, DnDeliveryStatus.VOIDED]),
  [DnDeliveryStatus.DISPATCHED]: new Set([DnDeliveryStatus.DELIVERED, DnDeliveryStatus.FAILED, DnDeliveryStatus.VOIDED]),
  [DnDeliveryStatus.DELIVERED]: new Set(),
  [DnDeliveryStatus.FAILED]: new Set(),
  [DnDeliveryStatus.VOIDED]: new Set(),
};

const PICKUP_EDGES: Record<string, Set<string>> = {
  [DnPickupStatus.DRAFT]: new Set([DnPickupStatus.DISPATCHED, DnPickupStatus.VOIDED]),
  [DnPickupStatus.DISPATCHED]: new Set([DnPickupStatus.PICKED_UP, DnPickupStatus.FAILED, DnPickupStatus.VOIDED]),
  [DnPickupStatus.PICKED_UP]: new Set(),
  [DnPickupStatus.FAILED]: new Set(),
  [DnPickupStatus.VOIDED]: new Set(),
};

const INTL_EDGES: Record<string, Set<string>> = {
  [DnIntlStatus.DRAFT]: new Set([DnIntlStatus.CUSTOMS, DnIntlStatus.VOIDED]),
  [DnIntlStatus.CUSTOMS]: new Set([DnIntlStatus.IN_TRANSIT, DnIntlStatus.FAILED, DnIntlStatus.VOIDED]),
  [DnIntlStatus.IN_TRANSIT]: new Set([DnIntlStatus.DELIVERED, DnIntlStatus.FAILED, DnIntlStatus.VOIDED]),
  [DnIntlStatus.DELIVERED]: new Set(),
  [DnIntlStatus.FAILED]: new Set(),
  [DnIntlStatus.VOIDED]: new Set(),
};

function assertEdge(edges: Record<string, Set<string>>, from: string, to: string) {
  const e = edges[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid DN status transition: ${from} -> ${to}`);
  }
}

export function assertDnStatusTransition(kind: LogisticsKindValue, from: string, to: string): void {
  if (to === from) return;
  if (to === 'VOIDED') {
    if (from === 'VOIDED') throw new BadRequestException('Document already VOIDED');
    return;
  }
  if (kind === LogisticsKind.INTL_SHIPPING) {
    assertEdge(INTL_EDGES, from, to);
    return;
  }
  if (kind === LogisticsKind.DELIVERY) {
    assertEdge(DELIVERY_EDGES, from, to);
    return;
  }
  assertEdge(PICKUP_EDGES, from, to);
}
