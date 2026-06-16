// apps/nx-ui/src/data/mocks/finance-hub.ts
/**
 * 財務中心首頁 Mock（待串接 API）
 */

export const mockFinanceCounts = {
  ar: { pending: 5, total: 42 },
  ap: { pending: 2, total: 38 },
  cash: { pending: 1, total: 12 },
  note: { pending: 0, total: 4 },
  closing: { pending: 0, total: 2 },
} as const;
