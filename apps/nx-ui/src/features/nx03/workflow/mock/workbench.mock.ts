/**
 * File: apps/nx-ui/src/features/nx03/workflow/mock/workbench.mock.ts
 *
 * Purpose:
 * - 即時報價工作台：由既有 PartVariantSnapshot 衍生本倉、倉別彙總、儲位 mock、牌價與比價列（不呼叫 API）
 */

import type { PartVariantSnapshot } from '@/features/nx03/workflow/mock/operation.mock';

/** 登入／作業倉別（mock：對應「本倉」） */
export const WB_LOGIN_WAREHOUSE = 'B 倉（北區）';

export const WB_STAFF_LABEL = 'Y156 林翰杰';

export type MockCustomer = { id: string; code: string; name: string };

export const WB_MOCK_CUSTOMERS: MockCustomer[] = [
  { id: 'C001', code: 'A0490', name: '祥和汽車修配廠' },
  { id: 'C002', code: 'B0888', name: '大順汽車百貨' },
  { id: 'C003', code: 'C0231', name: '桃園保修站' },
  { id: 'C004', code: 'D0155', name: '新竹車業有限公司' },
  { id: 'C005', code: 'B0120', name: '範例材料行（訂單）' },
];

export const WB_DEFAULT_CUSTOMER = WB_MOCK_CUSTOMERS[0]!;

export type WorkbenchComparisonCategory = '銷貨' | '報價';

export interface WorkbenchComparisonRow {
  docNo: string;
  category: WorkbenchComparisonCategory;
  date: string;
  customerId: string;
  customerName: string;
  unitPrice: string;
  qty: number;
  remark: string;
}

export interface WorkbenchWarehouseRollup {
  code: string;
  name: string;
  qty: number;
  available: number;
  expectedIn: number;
  expectedOut: number;
}

export interface WorkbenchBinRow {
  id: string;
  name: string;
  qty: number;
  remark: string;
}

export interface WorkbenchPriceList {
  a: number;
  b: number;
  c: number;
  d: number;
  lastPurchase: number;
  avgPurchase: number;
}

export interface WorkbenchDerived {
  loginWarehouse: string;
  localAvailable: number;
  localTotal: number;
  totalInventory: number;
  rollup: WorkbenchWarehouseRollup[];
  binsByWarehouse: Array<{ warehouse: string; bins: WorkbenchBinRow[] }>;
  priceList: WorkbenchPriceList;
  comparisonRows: WorkbenchComparisonRow[];
  /** 參考：取第一倉安全量示意 */
  safetyHint: number;
  maxStockHint: number;
}

export function parseTwdToNumber(s: string): number {
  const cleaned = s.replace(/,/g, '').replace(/NT\$\s*/gi, '').trim();
  const m = cleaned.match(/[\d.]+/);
  if (!m) return 0;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
}

function warehouseCodeFromName(name: string): string {
  const m = name.match(/^([A-Za-z])/);
  return m ? `${m[1]!.toUpperCase()}00` : 'Z99';
}

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-003-F01
 * 由單筆料號快照衍生工作台用欄位。
 */
export function buildWorkbenchDerived(variant: PartVariantSnapshot): WorkbenchDerived {
  const login = WB_LOGIN_WAREHOUSE;
  const localRow = variant.stockByWarehouse.find((w) => w.warehouse === login);
  const localAvailable = localRow?.qty ?? 0;
  const localTotal = localAvailable;
  const totalInventory = variant.stockByWarehouse.reduce((s, w) => s + w.qty, 0);

  const rollup: WorkbenchWarehouseRollup[] = variant.stockByWarehouse.map((w) => ({
    code: warehouseCodeFromName(w.warehouse),
    name: w.warehouse,
    qty: w.qty,
    available: w.qty,
    expectedIn: 0,
    expectedOut: 0,
  }));

  const binsByWarehouse = variant.stockByWarehouse.map((w) => {
    const code = warehouseCodeFromName(w.warehouse);
    const q = w.qty;
    if (q <= 0) {
      return {
        warehouse: w.warehouse,
        bins: [{ id: `${code}-000`, name: '（無庫存）', qty: 0, remark: '—' }],
      };
    }
    const q1 = Math.max(1, Math.ceil(q * 0.55));
    const q2 = q - q1;
    return {
      warehouse: w.warehouse,
      bins: [
        { id: `${code}-01A`, name: `${w.warehouse.replace(/（.*?）/g, '').trim()}儲區一`, qty: q1, remark: '' },
        {
          id: `${code}-02B`,
          name: `${w.warehouse.replace(/（.*?）/g, '').trim()}儲區二`,
          qty: Math.max(0, q2),
          remark: '',
        },
      ],
    };
  });

  const lastP = parseTwdToNumber(variant.lastPurchasePrice);
  const cost = parseTwdToNumber(variant.costPrice);
  const avgP = lastP && cost ? Math.round((lastP + cost) / 2) : lastP || cost;
  const priceList: WorkbenchPriceList = {
    a: lastP ? Math.round(lastP * 1.35) : 0,
    b: lastP ? Math.round(lastP * 1.12) : 0,
    c: cost ? Math.round(cost * 1.08) : 0,
    d: cost ? Math.round(cost * 1.02) : 0,
    lastPurchase: lastP,
    avgPurchase: avgP,
  };

  const cust = WB_DEFAULT_CUSTOMER;
  const rows: WorkbenchComparisonRow[] = [];

  variant.quotesThisCustomer.forEach((r) => {
    rows.push({
      docNo: r.quoteNo,
      category: '報價',
      date: r.date,
      customerId: cust.code,
      customerName: r.customerName,
      unitPrice: r.unitPrice,
      qty: 1,
      remark: '',
    });
  });
  variant.quotesOtherCustomers.forEach((r) => {
    rows.push({
      docNo: r.quoteNo,
      category: '報價',
      date: r.date,
      customerId: '—',
      customerName: r.customerName,
      unitPrice: r.unitPrice,
      qty: 1,
      remark: '',
    });
  });
  variant.dealsThisCustomer.forEach((r) => {
    rows.push({
      docNo: r.docNo,
      category: '銷貨',
      date: r.date,
      customerId: cust.code,
      customerName: r.customerName,
      unitPrice: r.amount,
      qty: 1,
      remark: '成交',
    });
  });
  variant.dealsOtherCustomers.forEach((r) => {
    rows.push({
      docNo: r.docNo,
      category: '銷貨',
      date: r.date,
      customerId: '—',
      customerName: r.customerName,
      unitPrice: r.amount,
      qty: 1,
      remark: '',
    });
  });

  rows.sort((a, b) => b.date.localeCompare(a.date));

  const safetyHint = variant.stockByWarehouse.reduce((m, w) => Math.max(m, w.safety), 0);
  const maxStockHint = safetyHint > 0 ? safetyHint * 6 : 60;

  return {
    loginWarehouse: login,
    localAvailable,
    localTotal,
    totalInventory,
    rollup,
    binsByWarehouse,
    priceList,
    comparisonRows: rows,
    safetyHint,
    maxStockHint,
  };
}

export function findMockCustomerByCode(code: string): MockCustomer | undefined {
  const c = code.trim().toUpperCase();
  return WB_MOCK_CUSTOMERS.find((x) => x.code.toUpperCase() === c);
}
