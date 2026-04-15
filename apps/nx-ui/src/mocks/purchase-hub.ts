/**
 * @FUNCTION_CODE NX02-DASH-MOCK-001-F01
 * 採購中心首頁 Mock（待串接 API）
 */

export const mockPurchaseCounts = {
  product: { total: 156 },
  vendor: { total: 23 },
  rfq: { pending: 5, total: 28 },
  po: { pending: 3, total: 45 },
  receipt: { pending: 2, total: 67 },
  return: { pending: 1, total: 12 },
  warranty: { pending: 0, total: 8 },
} as const;
