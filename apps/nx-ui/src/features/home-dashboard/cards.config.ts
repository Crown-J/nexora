// apps/nx-ui/src/features/home-dashboard/cards.config.ts
// 首頁儀表板：19 個子功能現況數字卡定義（依權限顯示）
//
// 顆粒度：子功能層級（對應 nx01_view code、跟 me API view_permissions 1:1 對應）
// 規則：has(viewCode).can_read === true → 顯示該卡
//      view_permissions === null（SYSADMIN/OWNER）→ 全部顯示
//
// 每卡顯示：現況數字（待處理數 / 待確認數 / 本月金額…）
// 點卡 → 跳對應功能頁
// KPI 類（達成率/比較類）標 isPremium = true、顯示「📌 選購套件」、本軌不接 API

export type CardCategory = 'purchase' | 'inventory' | 'sale' | 'finance';

export type HomeCardDef = {
  /** nx01_view code（決定是否顯示、來自 me API view_permissions）*/
  viewCode: string;
  /** 卡片中文標題 */
  title: string;
  /** 點卡跳的路徑 */
  href: string;
  /** 顯示分類（用於分群 / 著色） */
  category: CardCategory;
  /** 數字後綴單位（例：'件'、'元'、'%'）*/
  unit: string;
  /** 此卡的數字 API endpoint（Sub 2 串接）；KPI 套件 null */
  endpoint: string | null;
  /** 副說明（小灰字、可選）*/
  hint?: string;
  /** 選購套件標記（true = KPI 類、本軌不串 API）*/
  isPremium?: boolean;
  /** API endpoint 尚未提供、顯示「即將上線」（本軌不串、待後續軌補）*/
  isPending?: boolean;
};

export const HOME_CARDS: HomeCardDef[] = [
  // ─── 採購 ──────────────────────────────────────────────
  {
    viewCode: 'NX02_DEMAND',
    title: '採購需求',
    href: '/dashboard/purchase/demand',
    category: 'purchase',
    unit: '件',
    endpoint: '/nx02/dashboard/demand-pending-count',
    hint: '待處理',
  },
  {
    viewCode: 'NX02_RFQ',
    title: '詢價單',
    href: '/dashboard/purchase/rfq',
    category: 'purchase',
    unit: '件',
    endpoint: '/nx02/dashboard/rfq-pending-count',
    hint: '待回覆',
  },
  {
    viewCode: 'NX02_PO',
    title: '採購單',
    href: '/dashboard/purchase/po',
    category: 'purchase',
    unit: '件',
    endpoint: '/nx02/dashboard/po-pending-count',
    hint: '待確認 + 待到貨',
  },
  {
    viewCode: 'NX02_RR',
    title: '今日待驗收',
    href: '/dashboard/inventory/receiving',
    category: 'purchase',
    unit: '件',
    endpoint: '/nx02/dashboard/rr-today-count',
    hint: '工作站',
  },
  {
    viewCode: 'NX02_WARRANTY',
    title: '保固申請',
    href: '/dashboard/purchase/warranty',
    category: 'purchase',
    unit: '件',
    endpoint: '/nx02/dashboard/warranty-pending-count',
    hint: '待核可 + 進行中',
  },
  {
    viewCode: 'NX02_STOCK_SETTING',
    title: '安全量警示',
    href: '/dashboard/inventory/part-stock-setting',
    category: 'purchase',
    unit: '料',
    endpoint: '/nx03/dashboard/low-stock-count',
    hint: '低於安全量',
  },

  // ─── 庫存 ──────────────────────────────────────────────
  {
    viewCode: 'NX03_PK',
    title: '今日待撿貨',
    href: '/dashboard/inventory/picking',
    category: 'inventory',
    unit: '件',
    endpoint: '/nx03/dashboard/picking-today-count',
    hint: '工作站',
  },
  {
    viewCode: 'NX03_PL',
    title: '今日待包貨',
    href: '/dashboard/inventory/packing',
    category: 'inventory',
    unit: '件',
    endpoint: '/nx03/dashboard/packing-today-count',
    hint: '工作站',
  },
  {
    viewCode: 'NX03_TRANSFER',
    title: '今日待配送',
    href: '/dashboard/inventory/delivery',
    category: 'inventory',
    unit: '件',
    endpoint: '/nx03/dashboard/delivery-today-count',
    hint: '工作站',
  },
  {
    viewCode: 'NX03_STOCK_TAKE',
    title: '盤點單',
    href: '/dashboard/inventory/stocktake',
    category: 'inventory',
    unit: '件',
    endpoint: '/nx03/dashboard/stocktake-pending-count',
    hint: '進行中 + 待核可',
  },
  {
    viewCode: 'NX03_SHORTAGE',
    title: '異常回報',
    href: '/dashboard/inventory/issue-report',
    category: 'inventory',
    unit: '件',
    endpoint: '/nx03/dashboard/issue-report-pending-count',
    hint: '待處理',
  },

  // ─── 銷售 ──────────────────────────────────────────────
  {
    viewCode: 'NX04_QUOTE',
    title: '報價單',
    href: '/dashboard/sale/quote',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/quote-pending-count',
    hint: '進行中 + 即將過期',
  },
  {
    viewCode: 'NX04_SO',
    title: '銷貨單',
    href: '/dashboard/sale/so',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/so-pending-count',
    hint: '待確認 + 待出貨',
  },
  {
    viewCode: 'NX04_SR',
    title: '銷退單',
    href: '/dashboard/sale/sr',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/sr-pending-count',
    hint: '進行中',
  },
  {
    viewCode: 'NX02_TI',
    title: '同行調貨',
    href: '/dashboard/sale/ti',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/ti-pending-count',
    hint: '進行中',
  },
  {
    viewCode: 'NX04_CUSTOMER_FEEDBACK',
    title: '產品回報',
    href: '/dashboard/sale/product-issue',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/product-issue-pending-count',
    hint: '待處理',
  },
  {
    viewCode: 'NX04_CUSTOMER_GRADE_REQ',
    title: '客戶等級變更',
    href: '/dashboard/sale/customer-grade-change',
    category: 'sale',
    unit: '件',
    endpoint: '/nx04/dashboard/customer-grade-change-pending-count',
    hint: '待核可',
  },

  // ─── 財務 ──────────────────────────────────────────────
  {
    viewCode: 'NX05_AR',
    title: '應收帳款',
    href: '/dashboard/finance/ar',
    category: 'finance',
    unit: '元',
    endpoint: '/nx05/dashboard/ar-overdue-amount',
    hint: '逾期金額',
  },
  {
    viewCode: 'NX05_AP',
    title: '應付帳款',
    href: '/dashboard/finance/ap',
    category: 'finance',
    unit: '元',
    endpoint: '/nx05/dashboard/ap-overdue-amount',
    hint: '逾期金額',
  },
  {
    viewCode: 'NX05_NOTE',
    title: '票據',
    href: '/dashboard/finance/voucher',
    category: 'finance',
    unit: '張',
    endpoint: '/nx05/dashboard/voucher-pending-count',
    hint: '進行中 + 即將到期',
  },
  {
    viewCode: 'NX05_CLOSING',
    title: '關帳作業',
    href: '/dashboard/finance/closing',
    category: 'finance',
    unit: '',
    endpoint: '/nx05/dashboard/closing-status',
    hint: '待關帳月',
  },
];

// ─── KPI 類（選購套件、本軌不接 API、留底）─────────────────────────────
export const HOME_CARDS_PREMIUM_KPI: HomeCardDef[] = [
  {
    viewCode: 'NX04_SO',
    title: '銷售目標達成率',
    href: '/dashboard/report/sales',
    category: 'sale',
    unit: '%',
    endpoint: null,
    hint: '本月 vs 月目標',
    isPremium: true,
  },
  {
    viewCode: 'NX04_SO',
    title: '毛利率走勢',
    href: '/dashboard/report/sales',
    category: 'sale',
    unit: '%',
    endpoint: null,
    hint: '本月 vs 上月',
    isPremium: true,
  },
  {
    viewCode: 'NX02_PO',
    title: '採購節約率',
    href: '/dashboard/report/purchase',
    category: 'purchase',
    unit: '%',
    endpoint: null,
    hint: '議價省下 %',
    isPremium: true,
  },
  {
    viewCode: 'NX03_STOCK_TAKE',
    title: '帳實一致率',
    href: '/dashboard/inventory/stocktake',
    category: 'inventory',
    unit: '%',
    endpoint: null,
    hint: '盤點差異 vs 上次',
    isPremium: true,
  },
  {
    viewCode: 'NX05_AR',
    title: '帳齡分析 / DSO',
    href: '/dashboard/finance/ar',
    category: 'finance',
    unit: '天',
    endpoint: null,
    hint: '平均收款天數',
    isPremium: true,
  },
  {
    viewCode: 'NX04_QUOTE',
    title: '報價成單率',
    href: '/dashboard/sale/quote',
    category: 'sale',
    unit: '%',
    endpoint: null,
    hint: '報價 → 成交',
    isPremium: true,
  },
];

/** 統計：適合放現況數字 19 / KPI 選購套件 6 / 不放 7（主檔工具類）*/
