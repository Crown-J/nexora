// apps/nx-ui/src/features/nx08/api/index.ts
// v1.2 階段 H：NX08 報表 API client

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

// ============================================================
// 個人月報（P3a）
// ============================================================

export type PersonalMonthlyReport = {
  periodStart: string;
  periodEnd: string;
  userId: string;
  isSelf: boolean;
  orderCounts: {
    so: number;
    qt: number;
    po: number;
  };
  performance: {
    salesAmount: string;
    cogsAmount: string;
    grossProfit: string;
    grossMarginPct: string;
  };
  operations: {
    pickQty: string;
    shipQty: string;
    customerCount: number;
  };
  note: string;
};

export async function getPersonalMonthlyReport(params: {
  periodStart: string;
  periodEnd: string;
  userId?: string;
}): Promise<PersonalMonthlyReport> {
  const qs = buildQueryString({
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    userId: params.userId || undefined,
  });
  const res = await apiFetch(`/nx08/dashboard/sales-rep/personal-monthly-report${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx08_personal_monthly');
  return res.json() as Promise<PersonalMonthlyReport>;
}

// ============================================================
// 進貨報表（P3b、purchasing-dashboard 4 endpoint）
// ============================================================

export type SupplierGradeRow = {
  supplierId: string;
  supplierCode?: string;
  supplierName?: string;
  poCount: number;
  totalAmount: string;
};

export async function getSupplierGrade(): Promise<{
  ok: boolean;
  period: string;
  topSuppliers: SupplierGradeRow[];
}> {
  const res = await apiFetch('/nx08/dashboard/purchasing/supplier-grade', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_supplier_grade');
  return res.json();
}

export async function getPriceCompare(): Promise<{
  ok: boolean;
  sampleSize: number;
  items: Array<{
    partId: string;
    partNo?: string;
    partName?: string;
    minPrice: string;
    maxPrice: string;
    avgPrice: string;
    supplierCount: number;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/purchasing/price-compare', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_price_compare');
  return res.json();
}

export async function getPoStats(): Promise<{
  ok: boolean;
  period: string;
  byStatus: Array<{ status: string; _count: { _all: number }; _sum: { totalAmount: string | null } }>;
  totalCount: number;
  totalAmount: string;
}> {
  const res = await apiFetch('/nx08/dashboard/purchasing/po-stats', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_po_stats');
  return res.json();
}

// ============================================================
// 銷售報表（P3c、sales-rep + owner 角度切換）
// ============================================================

export type ProductSalesRow = {
  partId: string;
  partNo: string;
  partName: string;
  qtySum: number;
  amtSum: number;
};

export async function getProductSales(): Promise<{
  ok: boolean;
  period: string;
  topProducts: ProductSalesRow[];
}> {
  const res = await apiFetch('/nx08/dashboard/sales-rep/product-sales', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_product_sales');
  return res.json();
}

export async function getCustomerInsight(): Promise<{
  ok: boolean;
  vipCustomers?: Array<{ customerId: string; customerName?: string; totalAmount: string }>;
  churnRisk?: Array<{ customerId: string; customerName?: string; lastOrderDate?: string }>;
}> {
  const res = await apiFetch('/nx08/dashboard/sales-rep/customer-insight', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_customer_insight');
  return res.json();
}

export async function getSalesRanking(): Promise<{
  ok: boolean;
  rankings?: Array<{ userId: string; userName?: string; totalAmount: string; soCount: number }>;
}> {
  const res = await apiFetch('/nx08/dashboard/owner/sales-ranking', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_sales_ranking');
  return res.json();
}

// ============================================================
// 庫存報表（P3d、warehouse-staff + warehouse-lead）
// ============================================================

export async function getInventoryTurnover(): Promise<{
  ok: boolean;
  period?: string;
  items: Array<{
    partId: string;
    partNo?: string;
    partName?: string;
    onHandQty: number;
    soldQty?: number;
    turnoverRate?: string;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/warehouse-staff/turnover', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_turnover');
  return res.json();
}

export async function getDormantParts(): Promise<{
  ok: boolean;
  items: Array<{
    partId: string;
    partNo?: string;
    partName?: string;
    onHandQty: number;
    lastMovementDate?: string;
    dormantDays: number;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/warehouse-staff/dormant', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_dormant');
  return res.json();
}

export async function getLowStockAlert(): Promise<{
  ok: boolean;
  items: Array<{
    partId: string;
    partNo?: string;
    partName?: string;
    onHandQty: number;
    safetyStock?: number;
    shortageQty?: number;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/warehouse-staff/low-stock-alert', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_low_stock');
  return res.json();
}

// ============================================================
// 損益表（P3e、finance/pnl）
// ============================================================

export type PnL = {
  periodStart: string;
  periodEnd: string;
  // 02 對齊第二批 C 軌 CP2 2026-06-06：未開發票銷貨佔比（總經理拍板損益底部呈現）
  revenue: {
    gross: string;
    return: string;
    net: string;
    soCount?: number;
    srCount?: number;
    noInvoice?: string;
    noInvoiceCount?: number;
  };
  cogs: string;
  grossProfit: string;
  grossMarginPct: string;
  opex: {
    total: string;
    detail: Array<{ accountCode: string; accountName?: string; amount: string }>;
  };
  operatingIncome: string;
  opMarginPct: string;
  note: string;
};

export async function getPnL(params: { periodStart: string; periodEnd: string }): Promise<PnL> {
  const qs = buildQueryString({ periodStart: params.periodStart, periodEnd: params.periodEnd });
  const res = await apiFetch(`/nx08/dashboard/finance/pnl${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx08_pnl');
  return res.json() as Promise<PnL>;
}

// ============================================================
// 對帳查詢（銷售第 7 格）：依客戶彙總未收款
// 規格 §4.2：業務出貨前要看這個客戶有沒有逾期
// ============================================================

export type ArByCustomerRow = {
  customerId: string;
  customerCode: string | null;
  customerName: string | null;
  /** 未收總額（含未到期）*/
  openAmount: string;
  /** 其中已逾期的金額 */
  overdueAmount: string;
  /** 最久逾期天數；0 = 沒有逾期 */
  maxOverdueDays: number;
  /** 未結單據筆數 */
  docCount: number;
  /** 最近一筆到期日（YYYY-MM-DD）*/
  nextDueDate: string | null;
};

/** 逾期金額大的排前面——業務打開就先看到最該追的 */
export async function getArByCustomer(): Promise<{ rows: ArByCustomerRow[] }> {
  const res = await apiFetch('/nx08/dashboard/finance/ar-by-customer', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_ar_by_customer');
  return res.json() as Promise<{ rows: ArByCustomerRow[] }>;
}

// ============================================================
// 營運報表（P3f、owner + strategy、高權限）
// ============================================================

export async function getDeptPerf(): Promise<{
  ok: boolean;
  depts?: Array<{ deptId: string; deptName?: string; totalAmount: string; soCount: number }>;
}> {
  const res = await apiFetch('/nx08/dashboard/owner/dept-perf', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_dept_perf');
  return res.json();
}

export async function getKpiGap(): Promise<{
  ok: boolean;
  items?: Array<{
    userId: string;
    userName?: string;
    target: string;
    actual: string;
    gap: string;
    achievePct: string;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/owner/kpi-gap', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_kpi_gap');
  return res.json();
}

export async function getCrossModule(): Promise<{
  ok: boolean;
  metrics?: Record<string, unknown>;
}> {
  const res = await apiFetch('/nx08/dashboard/strategy/cross-module', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_cross_module');
  return res.json();
}

export async function getBcgMatrix(): Promise<{
  ok: boolean;
  items?: Array<{
    partId: string;
    partNo?: string;
    partName?: string;
    category: 'STAR' | 'CASH_COW' | 'QUESTION' | 'DOG' | string;
    growthRate?: string;
    marketShare?: string;
  }>;
}> {
  const res = await apiFetch('/nx08/dashboard/strategy/bcg-matrix', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_bcg_matrix');
  return res.json();
}

export async function getStrategyKpi(): Promise<{
  ok: boolean;
  kpi?: Record<string, unknown>;
}> {
  const res = await apiFetch('/nx08/dashboard/strategy/strategy-kpi', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_strategy_kpi');
  return res.json();
}

// ============================================================
// User list（個人月報員工選擇用、負責人可選其他人）
// ============================================================

export async function listUsersForReport(): Promise<Array<{ id: string; username: string; displayName: string }>> {
  const res = await apiFetch('/nx01/users?pageSize=100&isActive=true', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_user_list');
  const data = await res.json().catch(() => ({}));
  return (data.items ?? data.rows ?? []) as Array<{ id: string; username: string; displayName: string }>;
}

// ============================================================
// 首頁待辦彙總（首頁改版 V1 2026-07-11）
// ============================================================

export type HomeSummary = {
  sales: { openQuotes: number; toShipSo: number; replenishingItems: number; overdueAr: number };
  warehouse: { inspectingRr: number; pickingItems: number; packingItems: number };
  finance: { apDueSoon: number; overdueAr: number };
  /** OWNER/SYSADMIN 才有、其他 null */
  manager: { todaySoAmount: string; todaySoCount: number } | null;
  /** v3.0.0 §3.3「要追蹤的」——不追會爛掉、但今天不做也不會死的 */
  track: {
    expiredQuotes: number;
    dormantCustomers: number;
    overdueAr: number;
    apDueSoon: number;
  };
  /** v3.0.0 §3.3「我的待辦」。⚠️ 待簽核缺席——系統還沒有簽核單據表 */
  mine: { openIssues: number };
};

export async function getHomeSummary(): Promise<HomeSummary> {
  const res = await apiFetch('/nx08/dashboard/home/summary', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_home_summary');
  return (await res.json()) as HomeSummary;
}
