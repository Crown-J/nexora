/**
 * File: apps/nx-api/src/shared/workflows/nx01-nx03-workflow.ts
 *
 * Purpose:
 * - 統一 NX01（RFQ/PO）與 NX03（QUOTE/SO）狀態機規則
 *
 * Notes:
 * - 目前 DB 欄位使用 string 儲存，因此此檔只做程式層驗證（避免寫入非法狀態轉移）。
 * - 狀態碼命名以你們既有 NX01 models 的意圖為主：
 *   - Nx01Rfq.status：D/DRAFT, S/SENT, R/REPLIED, C/CLOSED, V=VOID
 *   - Nx01Po.status：D=DRAFT, P=POSTED, C=CANCELED
 */

export type RfqStatus = 'D' | 'S' | 'R' | 'C' | 'V';
export type QuoteStatus = 'D' | 'S' | 'A' | 'C';
export type PoStatus = 'D' | 'P' | 'C';
export type SalesOrderStatus = 'D' | 'R' | 'S' | 'X' | 'C';

// RFQ
export const RFQ_STATUS = Object.freeze({
  DRAFT: 'D',
  SENT: 'S',
  REPLIED: 'R',
  CLOSED: 'C',
  VOID: 'V',
} as const);

// QUOTE（對客報價）
export const QUOTE_STATUS = Object.freeze({
  DRAFT: 'D',
  SENT: 'S',
  ACCEPTED: 'A',
  CANCELED: 'C',
} as const);

// PO（進貨單）
export const PO_STATUS = Object.freeze({
  DRAFT: 'D',
  POSTED: 'P',
  CANCELED: 'C',
} as const);

// SO（銷貨單/訂單）
export const SO_STATUS = Object.freeze({
  DRAFT: 'D',
  READY_TO_SHIP: 'R',
  SHIPPED: 'S',
  DONE: 'X',
  CANCELED: 'C',
} as const);

export type TransitionRule = {
  from: string;
  to: string;
};

function assertEnumValue(value: string, allowed: readonly string[], entityLabel: string) {
  if (!allowed.includes(value)) {
    throw new Error(`${entityLabel}: invalid status value "${value}"`);
  }
}

function assertTransition(current: string, next: string, rules: TransitionRule[], entityLabel: string) {
  const ok = rules.some((r) => r.from === current && r.to === next);
  if (!ok) {
    throw new Error(`${entityLabel}: illegal status transition ${current} -> ${next}`);
  }
}

/**
 * RFQ 狀態機（依你描述的流程）：
 * - 庫存/銷貨詢價 → 輸入成本/交期 → REPLIED
 * - 成交（或作廢）→ CLOSED 或 VOID
 */
export function assertRfqStatusTransition(current: RfqStatus, next: RfqStatus) {
  assertEnumValue(current, Object.values(RFQ_STATUS), 'RFQ');
  assertEnumValue(next, Object.values(RFQ_STATUS), 'RFQ');

  const rules: TransitionRule[] = [
    { from: 'D', to: 'R' }, // 草稿輸入/回覆結果
    { from: 'R', to: 'C' }, // 成交/關閉
    { from: 'D', to: 'V' }, // 作廢（草稿）
    { from: 'R', to: 'V' }, // 作廢（已回覆）
  ];

  assertTransition(current, next, rules, 'RFQ');
}

/**
 * QUOTE 狀態機：
 * - DRAFT → SENT（可選）
 * - SENT → ACCEPTED（成交）
 * - 任一狀態 → CANCELED（作廢）
 */
export function assertQuoteStatusTransition(current: QuoteStatus, next: QuoteStatus) {
  assertEnumValue(current, Object.values(QUOTE_STATUS), 'QUOTE');
  assertEnumValue(next, Object.values(QUOTE_STATUS), 'QUOTE');

  const rules: TransitionRule[] = [
    { from: 'D', to: 'S' },
    { from: 'S', to: 'A' },
    { from: 'D', to: 'A' }, // 你們若允許「建立後直接成交」
    { from: 'D', to: 'C' },
    { from: 'S', to: 'C' },
    { from: 'A', to: 'C' }, // 若允許接受後取消
  ];

  assertTransition(current, next, rules, 'QUOTE');
}

/**
 * PO 狀態機（依你們流程會在「成交後」建立 PO，並在「到貨入庫」時 POSTED）：
 * - DRAFT → POSTED
 * - DRAFT/POSTED → CANCELED（若允許）
 */
export function assertPoStatusTransition(current: PoStatus, next: PoStatus) {
  assertEnumValue(current, Object.values(PO_STATUS), 'PO');
  assertEnumValue(next, Object.values(PO_STATUS), 'PO');

  const rules: TransitionRule[] = [
    { from: 'D', to: 'P' },
    { from: 'D', to: 'C' },
    { from: 'P', to: 'C' }, // 若允許沖回/取消（實作可後續補）
  ];

  assertTransition(current, next, rules, 'PO');
}

/**
 * SO 狀態機（依你描述的「成交後建立 SO → 完成出貨」）：
 * - DRAFT → READY_TO_SHIP（建立後就緒）
 * - READY_TO_SHIP → SHIPPED（出貨完成）
 * - SHIPPED → DONE（結案，可選）
 * - 任一階段 → CANCELED（作廢）
 */
export function assertSalesOrderStatusTransition(current: SalesOrderStatus, next: SalesOrderStatus) {
  assertEnumValue(current, Object.values(SO_STATUS), 'SO');
  assertEnumValue(next, Object.values(SO_STATUS), 'SO');

  const rules: TransitionRule[] = [
    { from: 'D', to: 'R' },
    { from: 'R', to: 'S' },
    { from: 'S', to: 'X' },
    { from: 'D', to: 'C' },
    { from: 'R', to: 'C' },
    { from: 'S', to: 'C' },
  ];

  assertTransition(current, next, rules, 'SO');
}

