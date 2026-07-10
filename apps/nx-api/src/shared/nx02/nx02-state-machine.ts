import { BadRequestException } from '@nestjs/common';

export const RfqStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  REPLIED: 'REPLIED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * PoStatus 採購單狀態（T1-fix 進貨對齊批次 2026-06-07 加 PENDING_APPROVAL）
 *
 * 狀態流：
 *   DRAFT →〔送審 採購員〕→ PENDING_APPROVAL →〔核准 主管〕→ APPROVED →〔寄出 採購員〕→ SUBMITTED
 *                                            →〔退件 主管〕→ DRAFT（填 rejectReason、清核准印）
 *   SUBMITTED →〔廠商確認〕→ CONFIRMED → PARTIAL_RECEIVED / RECEIVED → CLOSED
 *                                          ↑
 *                                「廠商確認」應付產生點（createApFromConfirmedPo 觸發）
 *
 * 業務語意（Alex 拍板 2026-06-07：三版本一致、不簡化）：
 * - DRAFT             草稿（業務建單中）
 * - PENDING_APPROVAL  待核准（業務送審完、等主管 review）
 * - APPROVED          已核准（主管核准、寫 approvedAt + approvedBy）
 * - SUBMITTED         已寄廠商（採購方按「寄出」、等廠商回覆、寫 sentAt）
 * - CONFIRMED         廠商確認備貨（廠商回覆 OK、應付認列、業務語意「先款後貨」、寫 supplierConfirmedAt）
 * - PARTIAL_RECEIVED  部分驗收
 * - RECEIVED          全部驗收
 * - CLOSED            結案
 * - CANCELLED         取消
 *
 * 兼容性：既有 createApFromConfirmedPo 觸發點不動（CONFIRMED 業務語意保留）
 */
export const PoStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
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
  // B5 加邊 DRAFT → REPLIED：D4 translator 建的 stub 是 'DRAFT'，採購輸入第一個 QT
  // 直接推到 'REPLIED'（業務跳過 SENT 中間狀態）。原本 DRAFT → SENT 邊保留以兼容
  // 既有「先發 RFQ 再等回」的場景。
  [RfqStatus.DRAFT]: new Set([RfqStatus.SENT, RfqStatus.REPLIED, RfqStatus.CANCELLED]),
  [RfqStatus.SENT]: new Set([RfqStatus.REPLIED, RfqStatus.CANCELLED]),
  [RfqStatus.REPLIED]: new Set([RfqStatus.CLOSED, RfqStatus.CANCELLED]),
  [RfqStatus.CLOSED]: new Set(),
  [RfqStatus.CANCELLED]: new Set(),
};

const PO_EDGES: Record<string, Set<string>> = {
  // T1-fix 2026-06-07：拆 5 段（DRAFT →〔送審〕PENDING_APPROVAL →〔核准/退件〕APPROVED → SUBMITTED → CONFIRMED）
  [PoStatus.DRAFT]: new Set([PoStatus.PENDING_APPROVAL, PoStatus.CANCELLED]),
  [PoStatus.PENDING_APPROVAL]: new Set([PoStatus.APPROVED, PoStatus.DRAFT, PoStatus.CANCELLED]),
  [PoStatus.APPROVED]: new Set([PoStatus.SUBMITTED, PoStatus.PENDING_APPROVAL, PoStatus.CANCELLED]),
  [PoStatus.SUBMITTED]: new Set([PoStatus.CONFIRMED, PoStatus.APPROVED, PoStatus.CANCELLED]),
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

/**
 * TiStatus 同行調貨單狀態（NX02-TI-SHELL 2026-07-11 啟動 TI 管理面時定義）。
 * DB 存單字元（schema nx02_ti.status：D/S/R/P/C/V）、API 走全名 token。
 *
 * 狀態流：D 草稿（SO 缺貨行群組建單 / 比價採用建單）→ S 已發出（向同行送出）
 *        → R 已回覆（同行回價、量價回填）→ P 待驗收（轉進貨後、貨在途）
 *        → C 已完成（來源=TI 的進貨單過帳時自動回寫、SO 缺貨行同步補貨完成）
 *        非終態（P 除外）→ V 作廢（連動來源 SO 行退回待補）
 * 轉進貨放寬 D/S/R → P（實務上貨先到、單況未跟上很常見）；P 不可作廢（先處理其進貨單）。
 */
export const TiStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  REPLIED: 'REPLIED',
  PENDING_RECEIPT: 'PENDING_RECEIPT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

const TI_EDGES: Record<string, Set<string>> = {
  [TiStatus.DRAFT]: new Set([TiStatus.SENT, TiStatus.REPLIED, TiStatus.PENDING_RECEIPT, TiStatus.CANCELLED]),
  [TiStatus.SENT]: new Set([TiStatus.REPLIED, TiStatus.PENDING_RECEIPT, TiStatus.CANCELLED]),
  [TiStatus.REPLIED]: new Set([TiStatus.PENDING_RECEIPT, TiStatus.CANCELLED]),
  [TiStatus.PENDING_RECEIPT]: new Set([TiStatus.COMPLETED]),
  [TiStatus.COMPLETED]: new Set(),
  [TiStatus.CANCELLED]: new Set(),
};

export function assertTiStatusTransition(from: string, to: string): void {
  const edges = TI_EDGES[from];
  if (!edges || !edges.has(to)) {
    throw new BadRequestException(`Invalid TI status transition: ${from} -> ${to}`);
  }
}

const TI_DB_TO_API: Record<string, string> = {
  D: TiStatus.DRAFT,
  S: TiStatus.SENT,
  R: TiStatus.REPLIED,
  P: TiStatus.PENDING_RECEIPT,
  C: TiStatus.COMPLETED,
  V: TiStatus.CANCELLED,
};
const TI_API_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(TI_DB_TO_API).map(([db, api]) => [api, db]),
);

/** DB 單字元 TI 狀態轉 API token */
export function tiDbToApi(s: string): string {
  return TI_DB_TO_API[s] ?? TiStatus.DRAFT;
}

export function tiApiToDb(s: string): string {
  return TI_API_TO_DB[s] ?? 'D';
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
