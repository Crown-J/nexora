// apps/nx-ui/src/features/sale/ui/fulfillment/numbering.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 7:跨中心連動統一流水號。
 *
 * SO / PK / BX / DN 共用同一流水(例:SO-2604-00054 / PK-2604-00054 /
 * BX-2604-00054 / DN-2604-00054),業務一眼看出是同一筆交易。
 * IT / TI 另自獨立流水,不併入共享池。
 *
 * SalesStore 以 sharedSeq 計數,本檔僅提供 pure 函式。
 */

export function getCurrentYYMM(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

export function formatDocNumber(prefix: string, yymm: string, seq: number): string {
  return `${prefix}-${yymm}-${String(seq).padStart(5, '0')}`;
}

export interface SharedDocNumbers {
  soNumber: string;
  pkNumber: string;
  bxNumber: string;
  dnNumber: string;
}

export function buildSharedDocNumbers(yymm: string, seq: number): SharedDocNumbers {
  return {
    soNumber: formatDocNumber('SO', yymm, seq),
    pkNumber: formatDocNumber('PK', yymm, seq),
    bxNumber: formatDocNumber('BX', yymm, seq),
    dnNumber: formatDocNumber('DN', yymm, seq),
  };
}
