/**
 * File: apps/nx-api/src/nx02/balance/dto/balance.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-DTO-001：庫存餘額列表／摘要／首頁統計 Query 與回應型別
 *
 * Notes:
 * - 與 GET /nx02/balance、/summary、/dashboard 對齊
 */

export type BalanceStatusFilter = 'all' | 'in_stock' | 'zero' | 'negative';

export type BalanceSortField =
  | 'code'
  | 'name'
  | 'on_hand_qty'
  | 'available_qty'
  | 'stock_value'
  | 'last_move_at';

export type SortDir = 'asc' | 'desc';

/**
 * GET /nx02/balance/dashboard 回應（庫存首頁卡片；無單據時多為 0，鍵名固定）
 */
export type Nx02BalanceDashboardDto = {
  balance: { inStock: number; zero: number; negative: number };
  ledger: { thisMonthCount: number };
  init: { totalCount: number };
  stockSetting: { settingCount: number };
  stockTake: { inProgressCount: number };
  transfer: { inProgressCount: number };
  shortage: { openCount: number };
  autoReplenish: { activeRuleCount: number };
};
