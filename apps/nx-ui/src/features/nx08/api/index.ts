// apps/nx-ui/src/features/nx08/api/index.ts
// v1.2 階段 H：NX08 報表 API client

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

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
// User list（個人月報員工選擇用、負責人可選其他人）
// ============================================================

export async function listUsersForReport(): Promise<Array<{ id: string; username: string; displayName: string }>> {
  const res = await apiFetch('/nx01/users?pageSize=100&isActive=true', { method: 'GET' });
  await assertOk(res, 'nxui_nx08_user_list');
  const data = await res.json().catch(() => ({}));
  return (data.items ?? data.rows ?? []) as Array<{ id: string; username: string; displayName: string }>;
}
