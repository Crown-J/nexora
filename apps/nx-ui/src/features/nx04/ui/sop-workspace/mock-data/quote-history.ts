// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/quote-history.ts
/**
 * TASK-BUSINESS-RESTRUCTURE Phase 2:歷史報價 mock + 綜合查找 hook。
 *
 * 「歷史記錄」包含三種來源,優先順序由 hook 內部決定:
 *   1. 進行中的 RFQ(同客戶 + 同料號,status=waiting|responded)→ 顯示「正在詢價中」
 *   2. 未結案的 QT(同客戶 + 同料號,status=pending_customer)    → 顯示「已報過 NT$ X,待客戶確認」
 *   3. 30 天內的歷史成交報價(本模組的 MOCK_QUOTE_HISTORY)      → 顯示「X 天前曾報過 NT$ Y」,可「套用此價」
 *
 * Mock 資料刻意配合春酒 demo 路徑(B0213×SKU-001 10 天前報過、A0087×SKU-031 已有 RFQ 中)。
 */

'use client';

import { useMemo } from 'react';

import { useRFQStore } from '@/features/nx04/ui/inquiry/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export type HistoryType = 'quote' | 'rfq' | 'qt';

export interface HistoryRecord {
  type: HistoryType;
  docNumber: string;
  /** 金額:quote=歷史售價、qt=待確認售價、rfq=null */
  amount?: number;
  /** 毛利率(%):quote 有,qt 也可計算,rfq 尚無報價所以不顯示 */
  margin?: number;
  /** 距今天數 */
  daysAgo: number;
  /** 對應的 RFQ id / QT id,供「查看詳情」導頁用 */
  refId?: string;
}

interface QuoteHistoryMock {
  customerCode: string;
  partSku: string;
  amount: number;
  margin: number;
  date: Date;
  qtNumber: string;
}

/**
 * Spec PART 2.4 的 mock。跟現有 SKU / 客戶對得上讓 demo 能走。
 * B0213 台北保養廠 10 天前買過 SKU-001 NT$ 600(毛利 25%)。
 */
const MOCK_QUOTE_HISTORY: readonly QuoteHistoryMock[] = [
  {
    customerCode: 'B0213',
    partSku: 'SKU-001',
    amount: 600,
    margin: 25,
    date: new Date(Date.now() - 10 * DAY_MS),
    qtNumber: 'QT-2604-00012',
  },
  {
    customerCode: 'A0087',
    partSku: 'SKU-021',
    amount: 320,
    margin: 23,
    date: new Date(Date.now() - 5 * DAY_MS),
    qtNumber: 'QT-2604-00018',
  },
];

function daysBetween(past: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - past.getTime()) / DAY_MS);
}

/**
 * 查客戶×料號的歷史記錄。整合 useRFQStore(即時)+ MOCK_QUOTE_HISTORY(靜態)。
 * 只有 customerCode + partSku 都非空才查;缺一就回 null。
 */
export function useHistoryRecord(
  customerCode: string | null | undefined,
  partSku: string | null | undefined,
): HistoryRecord | null {
  const rfqs = useRFQStore((s) => s.rfqs);
  const qts = useRFQStore((s) => s.qts);

  return useMemo(() => {
    if (!customerCode || !partSku) return null;

    // 1. 進行中的 RFQ
    const activeRFQ = rfqs.find(
      (r) =>
        r.sourceCustomer.code === customerCode &&
        r.part.sku === partSku &&
        (r.status === 'waiting' || r.status === 'responded'),
    );
    if (activeRFQ) {
      return {
        type: 'rfq',
        docNumber: activeRFQ.rfqNumber,
        daysAgo: daysBetween(activeRFQ.createdAt),
        refId: activeRFQ.id,
      };
    }

    // 2. 未結案的 QT
    const activeQT = qts.find(
      (q) =>
        q.customer.code === customerCode &&
        q.part.sku === partSku &&
        q.status === 'pending_customer',
    );
    if (activeQT) {
      const margin =
        activeQT.finalPrice > 0
          ? ((activeQT.finalPrice - activeQT.vendorCost) / activeQT.finalPrice) * 100
          : 0;
      return {
        type: 'qt',
        docNumber: activeQT.qtNumber,
        amount: activeQT.finalPrice,
        margin: Math.round(margin * 10) / 10,
        daysAgo: daysBetween(activeQT.createdAt),
        refId: activeQT.id,
      };
    }

    // 3. 30 天內歷史成交報價
    const quote = MOCK_QUOTE_HISTORY.find(
      (h) =>
        h.customerCode === customerCode &&
        h.partSku === partSku &&
        daysBetween(h.date) <= 30,
    );
    if (quote) {
      return {
        type: 'quote',
        docNumber: quote.qtNumber,
        amount: quote.amount,
        margin: quote.margin,
        daysAgo: daysBetween(quote.date),
      };
    }

    return null;
  }, [rfqs, qts, customerCode, partSku]);
}
