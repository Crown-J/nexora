// apps/nx-ui/src/data/endpoints/nx04/credit-guard/api/credit-guard.ts
// 客戶授信預檢 API client（對應 apps/nx-api/src/nx04/credit-guard/credit-guard.controller.ts）
//
// 用途：開單前先問「這個客戶現在能不能出貨」。
//   · 黑名單 / 額度超額 → 後端回 403（呼叫端自己 catch）
//   · 逾期超過門檻 → passed=true 但 overdueTransferToCash=true（要改收現金）
//   · 正常 → passed=true

import { apiFetch } from '@data/api/client';
import { ApiClientError } from '@data/api/errors';

export type CreditCheckResult = {
  passed: true;
  adjustedPaymentTerm: string;
  overdueTransferToCash: boolean;
  details: {
    creditStatus: string;
    creditLimit: string;
    usedAmount: string;
    /** 數字字串或 'UNLIMITED' */
    availableAmount: string;
    overdueDays: number;
    overdueThreshold: number;
    blockedReason: string | null;
  };
};

/** 被擋下來（403）時的結果；呼叫端不必自己解 HTTP 狀態 */
export type CreditCheckBlocked = { passed: false; blockedReason: string };

/**
 * 授信預檢。soAmount 傳 0 ＝ 純查「這個客戶現在的狀態」，不預判任何金額。
 * ⚠️ 後端擋單是丟 403，這裡轉成 { passed: false } 回傳——查詢頁面不該因為客戶被擋就整頁報錯。
 */
export async function checkCredit(
  customerId: string,
  soAmount = 0,
): Promise<CreditCheckResult | CreditCheckBlocked> {
  const res = await apiFetch('/nx04/credit-guard/check', {
    method: 'POST',
    body: JSON.stringify({ customerId, soAmount }),
  });
  if (res.status === 403) {
    const body = await res.text().catch(() => '');
    let reason = '此客戶目前無法出貨';
    try {
      const j = JSON.parse(body) as { message?: string };
      if (j.message) reason = j.message;
    } catch {
      // 後端沒回 JSON 就用預設訊息
    }
    return { passed: false, blockedReason: reason };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiClientError(res.status, `[NW-001] HTTP ${res.status}${body ? `\n${body}` : ''}`, body);
  }
  return (await res.json()) as CreditCheckResult;
}
