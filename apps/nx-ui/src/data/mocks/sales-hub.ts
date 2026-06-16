// apps/nx-ui/src/data/mocks/sales-hub.ts
/**
 * @FUNCTION_CODE NX04-DASH-MOCK-001-F01
 * 銷貨中心首頁 Mock（待串接 API）
 */

export const mockSalesCounts = {
  customer: { total: 48 },
  part: { total: 3120 },
  quote: { pending: 4, total: 22 },
  so: { pending: 3, total: 36 },
  pick: { pending: 2, total: 11 },
  ship: { pending: 1, total: 14 },
  return: { pending: 0, total: 6 },
} as const;
