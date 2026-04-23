// apps/nx-ui/src/features/purchase/ui/sop-workspace/mock-data/scenario.ts
/**
 * 國內進貨 SOP 手機工作台 Mock 情境資料
 * 料號名稱刻意用真實 VAG 品牌（VW / Audi / Skoda / Porsche），讓 demo 有真實感
 */

import type {
  RequirementItem,
  StepMeta,
  Vendor,
  VendorLineReply,
  VendorQuoteTable,
} from '../types';

/** 金額超過此門檻的採購單需主管審核（STEP 3 防呆展示用） */
export const APPROVAL_THRESHOLD_TWD = 100_000;

export const TAX_RATE = 0.05;

// ─────────────────────────────────────────────────────
// STEP 1：採購需求清單
// ─────────────────────────────────────────────────────
export const MOCK_REQUIREMENTS: RequirementItem[] = [
  // 庫存不足（3 項，2 項預設勾選）
  {
    sku: 'SKU-001',
    name: '剎車片 VW Golf MK7',
    group: '庫存不足',
    currentStock: 2,
    safetyStock: 10,
    suggested: 20,
    defaultChecked: true,
  },
  {
    sku: 'SKU-002',
    name: '機油濾心 Audi A4',
    group: '庫存不足',
    currentStock: 0,
    safetyStock: 5,
    suggested: 15,
    defaultChecked: true,
  },
  {
    sku: 'SKU-003',
    name: '引擎蓋密封條 Skoda Octavia',
    group: '庫存不足',
    currentStock: 8,
    safetyStock: 10,
    suggested: 5,
    defaultChecked: false,
  },
  // 客戶下單需求（2 項，1 項預設勾選）
  {
    sku: 'SKU-005',
    name: '輪胎 Porsche Cayenne 21"',
    group: '客戶下單需求',
    customerName: '陳先生（台北電子汽材）',
    suggested: 4,
    defaultChecked: true,
  },
  {
    sku: 'SKU-006',
    name: '火星塞組 VW Passat',
    group: '客戶下單需求',
    customerName: '林老闆（忠明汽修廠）',
    suggested: 8,
    defaultChecked: false,
  },
  // 廠商特價推薦（1 項，預設不勾）
  {
    sku: 'SKU-010',
    name: '空氣濾心 Skoda Superb',
    group: '廠商特價推薦',
    recommendNote: '德國原廠現貨 8 折，限本週',
    suggested: 30,
    defaultChecked: false,
  },
];

/** SKU 對應的完整名稱、料號 quickly 查詢 */
export const REQUIREMENT_BY_SKU: Record<string, RequirementItem> =
  MOCK_REQUIREMENTS.reduce<Record<string, RequirementItem>>((acc, r) => {
    acc[r.sku] = r;
    return acc;
  }, {});

// ─────────────────────────────────────────────────────
// STEP 2：三家廠商（A / B / C 級）
// ─────────────────────────────────────────────────────
export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'V-A',
    name: '德國汽車配件',
    grade: 'A',
    contactName: '王經理',
    contactPhone: '02-1234-5678',
    contactEmail: 'wang@de-autoparts.example',
    paymentTerms: '月結 30 天',
    deliveryDays: 5,
    totalQuote: 0, // runtime 計算
    extraOffer: '採購滿 10 萬贈輪胎 × 2 組',
  },
  {
    id: 'V-B',
    name: '台灣汽材貿易',
    grade: 'B',
    contactName: '李組長',
    contactPhone: '02-2345-6789',
    contactEmail: 'lee@tw-autotrade.example',
    paymentTerms: '月結 15 天',
    deliveryDays: 3,
    totalQuote: 0,
  },
  {
    id: 'V-C',
    name: '東亞零件商',
    grade: 'C',
    contactName: '黃小姐',
    contactPhone: '02-3456-7890',
    contactEmail: 'huang@ea-parts.example',
    paymentTerms: '貨到付款',
    deliveryDays: 7,
    totalQuote: 0,
  },
];

/**
 * 每家廠商對各料號的報價單價（TWD）。刻意讓 V-A（A 級）單價略高但有贈品，
 * V-B 中價但交期快、V-C 低價但交期長 — 三種真實採購取捨。
 */
export const VENDOR_QUOTE_TABLE: VendorQuoteTable = {
  'V-A': [
    { sku: 'SKU-001', unitPrice: 485 },
    { sku: 'SKU-002', unitPrice: 395 },
    { sku: 'SKU-003', unitPrice: 1280 },
    { sku: 'SKU-005', unitPrice: 24800 },
    { sku: 'SKU-006', unitPrice: 1150 },
    { sku: 'SKU-010', unitPrice: 320 },
  ],
  'V-B': [
    { sku: 'SKU-001', unitPrice: 445 },
    { sku: 'SKU-002', unitPrice: 365 },
    { sku: 'SKU-003', unitPrice: 1195 },
    { sku: 'SKU-005', unitPrice: 23900 },
    { sku: 'SKU-006', unitPrice: 1080 },
    { sku: 'SKU-010', unitPrice: 295 },
  ],
  'V-C': [
    { sku: 'SKU-001', unitPrice: 420 },
    { sku: 'SKU-002', unitPrice: 350 },
    { sku: 'SKU-003', unitPrice: 1120 },
    { sku: 'SKU-005', unitPrice: 23200 },
    { sku: 'SKU-006', unitPrice: 1020 },
    { sku: 'SKU-010', unitPrice: 275 },
  ],
};

/** runtime 計算：廠商報價小計（未稅）、稅金、總額 */
export function computeVendorQuote(
  vendorId: string,
  selectedSkus: readonly string[],
): { subtotal: number; tax: number; total: number; lineBreakdown: Array<{ sku: string; qty: number; unitPrice: number; lineTotal: number }> } {
  const table = VENDOR_QUOTE_TABLE[vendorId] ?? [];
  const priceMap = new Map(table.map((r) => [r.sku, r.unitPrice]));
  const lineBreakdown = selectedSkus.map((sku) => {
    const item = REQUIREMENT_BY_SKU[sku];
    const qty = item?.suggested ?? 0;
    const unitPrice = priceMap.get(sku) ?? 0;
    return { sku, qty, unitPrice, lineTotal: qty * unitPrice };
  });
  const subtotal = lineBreakdown.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  return { subtotal, tax, total, lineBreakdown };
}

// ─────────────────────────────────────────────────────
// STEP 6：廠商回覆（Demo 有戲劇性：一項部分缺貨、一項延後）
// ─────────────────────────────────────────────────────
/**
 * 依選中料號產生廠商回覆。第二個料號缺 5 個（展示「部分缺貨」），
 * 第三個料號交期延後 2 天，其餘全出。刻意留一個 pain point 讓 demo 講得精彩。
 */
export function buildVendorReplies(
  selectedSkus: readonly string[],
): VendorLineReply[] {
  return selectedSkus.map((sku, idx) => {
    const item = REQUIREMENT_BY_SKU[sku];
    const ordered = item?.suggested ?? 0;
    // 第 2 項缺 5 個
    if (idx === 1 && ordered > 5) {
      return {
        sku,
        status: 'partial',
        confirmedQty: Math.max(0, ordered - 5),
        note: `缺 5 個，補進需 2 週`,
      };
    }
    // 第 3 項交期延後
    if (idx === 2) {
      return {
        sku,
        status: 'delayed',
        confirmedQty: ordered,
        note: '交期延後 2 天',
      };
    }
    return {
      sku,
      status: 'full',
      confirmedQty: ordered,
    };
  });
}

// ─────────────────────────────────────────────────────
// 9 個 Step 的 meta（頂部流程條與標題共用）
// ─────────────────────────────────────────────────────
export const STEPS_META: readonly StepMeta[] = [
  { id: 1, shortLabel: '需求', title: '採購需求彙整', subtitle: '系統已幫您盤點需要採購的項目' },
  { id: 2, shortLabel: '詢價', title: '廠商詢價比較', subtitle: '系統已向推薦廠商發出詢價' },
  { id: 3, shortLabel: '建單', title: '建立採購單', subtitle: '確認採購明細，系統會幫您計算' },
  { id: 4, shortLabel: '審核', title: '主管審核中', subtitle: '系統已通知您的主管審核' },
  { id: 5, shortLabel: '寄送', title: '寄送採購單', subtitle: '一鍵將採購單寄給廠商' },
  { id: 6, shortLabel: '確認', title: '廠商回覆確認', subtitle: '系統已自動比對廠商確認內容' },
  { id: 7, shortLabel: '進貨', title: '建立進貨單', subtitle: '系統已依採購單自動生成進貨單' },
  { id: 8, shortLabel: '驗收', title: '驗收入庫', subtitle: '逐項核對數量與外觀，差異自動提示' },
  { id: 9, shortLabel: '完成', title: '採購流程完成', subtitle: '系統已自動同步庫存、應付、評分' },
];

/** 採購單預先產生的假單號（固定，避免每次 render 都變） */
export const MOCK_PO_NO = 'PO-202604-00045';
export const MOCK_RR_NO = 'RR-202604-00023';

/** 主管審核人 */
export const MOCK_APPROVER_NAME = '林主管';

/** Demo 用的「預計到貨日」— 以 2026-04-27 為固定展示 */
export const MOCK_EXPECTED_DELIVERY = '2026-04-27';
