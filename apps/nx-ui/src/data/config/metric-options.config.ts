// apps/nx-ui/src/features/home-dashboard/metric-options.config.ts
// 5 格可選的數據項目（modal 列表用）
//
// 沿用前面已修正的 cards.config 21 卡 endpoint、但這裡是「可選清單」、
// 每項標 metricType 決定 render 哪種圖（段 C 接）：
//   - count    → 大數字卡（單一筆數）
//   - amount   → 大數字卡（金額、加千分位）
//   - trend    → 簡易趨勢線（近 N 天、列表 endpoint group by 日期）
//   - ratio    → 環形進度圖（百分比、KPI 套件鎖）
//   - share    → 圓餅圖（佔比、KPI 套件鎖）
//
// 依權限規則：me.view_permissions === null 全開 / 否則 viewCode.can_read=true 才列
// KPI 鎖（isPremium=true）：列出但標🔒、不可選

export type MetricType = 'count' | 'amount' | 'trend' | 'ratio' | 'share';

export type MetricOptionDef = {
  /** 內部 key（存到 nx01_user_pref.pref_value 的 slot.optionKey）*/
  key: string;
  /** 顯示給客戶的業務中文名（絕不露 NXxx）*/
  label: string;
  /** 副說明（modal 內小字）*/
  description: string;
  /** 對應 nx01_view code（決定是否列在 modal）*/
  viewCode: string;
  /** 圖表型別 */
  metricType: MetricType;
  /** API endpoint（list endpoint 拿 total 或實際資料源）*/
  endpoint: string;
  /** 大分類（modal 內分群顯示）*/
  category: '採購' | '庫存' | '銷售' | '財務';
  /** KPI 升級鎖（true = 列但標🔒、不可選、本軌不做 ratio/share）*/
  isPremium?: boolean;
};

export const METRIC_OPTIONS: MetricOptionDef[] = [
  // ─── 採購（現況數字 count）─────────────────────────
  { key: 'purchase.demand', label: '採購需求',  description: '採購需求單筆數',    viewCode: 'NX02_DEMAND',         metricType: 'count',  endpoint: '/nx02/demand?pageSize=1',          category: '採購' },
  { key: 'purchase.rfq',    label: '詢價單',    description: '詢價單筆數',        viewCode: 'NX02_RFQ',            metricType: 'count',  endpoint: '/nx02/rfq?pageSize=1',             category: '採購' },
  { key: 'purchase.po',     label: '採購單',    description: '採購單筆數',        viewCode: 'NX02_PO',             metricType: 'count',  endpoint: '/nx02/po?pageSize=1',              category: '採購' },
  { key: 'purchase.rr',     label: '進貨單',    description: '進貨單筆數',        viewCode: 'NX02_RR',             metricType: 'count',  endpoint: '/nx02/rr?pageSize=1',              category: '採購' },
  { key: 'purchase.warranty', label: '保固申請', description: '保固單筆數',       viewCode: 'NX02_WARRANTY',       metricType: 'count',  endpoint: '/nx02/warranty-claims?pageSize=1', category: '採購' },

  // ─── 庫存（現況數字 count）─────────────────────────
  { key: 'inventory.stockSetting', label: '產品庫存設定', description: '已設定數', viewCode: 'NX02_STOCK_SETTING',  metricType: 'count',  endpoint: '/nx03/part-stock-setting?pageSize=1', category: '庫存' },
  { key: 'inventory.pk',       label: '撿貨單',    description: '撿貨單筆數',      viewCode: 'NX03_PK',             metricType: 'count',  endpoint: '/nx03/pk?pageSize=1',              category: '庫存' },
  { key: 'inventory.pl',       label: '包貨單',    description: '包貨單筆數',      viewCode: 'NX03_PL',             metricType: 'count',  endpoint: '/nx03/pl?pageSize=1',              category: '庫存' },
  { key: 'inventory.stocktake', label: '盤點單',   description: '盤點單筆數',      viewCode: 'NX03_STOCK_TAKE',     metricType: 'count',  endpoint: '/nx03/stocktake?pageSize=1',       category: '庫存' },
  { key: 'inventory.shortage', label: '異常回報',  description: '異常單筆數',      viewCode: 'NX03_SHORTAGE',       metricType: 'count',  endpoint: '/nx03/issue-report?pageSize=1',    category: '庫存' },

  // ─── 銷售（現況數字 count）─────────────────────────
  { key: 'sale.quote',     label: '報價單',  description: '報價單筆數',          viewCode: 'NX04_QUOTE',          metricType: 'count',  endpoint: '/nx04/quote?pageSize=1',           category: '銷售' },
  { key: 'sale.so',        label: '銷貨單',  description: '銷貨單筆數',          viewCode: 'NX04_SO',             metricType: 'count',  endpoint: '/nx04/so?pageSize=1',              category: '銷售' },
  { key: 'sale.sr',        label: '銷退單',  description: '銷退單筆數',          viewCode: 'NX04_SR',             metricType: 'count',  endpoint: '/nx04/sales-return?pageSize=1',    category: '銷售' },
  { key: 'sale.ti',        label: '同行調貨', description: '同行調貨筆數',         viewCode: 'NX02_TI',             metricType: 'count',  endpoint: '/nx02/purchase-return?pageSize=1', category: '銷售' },

  // ─── 財務（現況數字 count + amount）──────────────
  { key: 'finance.ar',      label: '應收帳款', description: '應收筆數',          viewCode: 'NX05_AR',             metricType: 'count',  endpoint: '/nx05/ar?pageSize=1',              category: '財務' },
  { key: 'finance.ap',      label: '應付帳款', description: '應付筆數',          viewCode: 'NX05_AP',             metricType: 'count',  endpoint: '/nx05/ap?pageSize=1',              category: '財務' },
  { key: 'finance.note',    label: '票據',    description: '票據張數',            viewCode: 'NX05_NOTE',           metricType: 'count',  endpoint: '/nx05/note?pageSize=1',            category: '財務' },
  { key: 'finance.closing', label: '關帳作業', description: '已關帳期數',         viewCode: 'NX05_CLOSING',        metricType: 'count',  endpoint: '/nx05/period-close?pageSize=1',    category: '財務' },

  // ─── KPI 套件（升級鎖、本軌不做、列出讓使用者看到「未來解鎖」）──
  { key: 'kpi.sale.target',     label: '銷售目標達成率',  description: '本月 vs 月目標',   viewCode: 'NX04_SO',     metricType: 'ratio', endpoint: '',  category: '銷售', isPremium: true },
  { key: 'kpi.sale.margin',     label: '毛利率走勢',      description: '本月 vs 上月',     viewCode: 'NX04_SO',     metricType: 'trend', endpoint: '',  category: '銷售', isPremium: true },
  { key: 'kpi.purchase.saving', label: '採購節約率',      description: '議價省下 %',       viewCode: 'NX02_PO',     metricType: 'ratio', endpoint: '',  category: '採購', isPremium: true },
  { key: 'kpi.inventory.match', label: '帳實一致率',      description: '盤點差異',         viewCode: 'NX03_STOCK_TAKE', metricType: 'ratio', endpoint: '', category: '庫存', isPremium: true },
  { key: 'kpi.finance.dso',     label: '帳齡 / DSO',     description: '平均收款天數',      viewCode: 'NX05_AR',     metricType: 'count', endpoint: '',  category: '財務', isPremium: true },
  { key: 'kpi.sale.winrate',    label: '報價成單率',      description: '報價 → 成交',     viewCode: 'NX04_QUOTE',  metricType: 'ratio', endpoint: '',  category: '銷售', isPremium: true },
  { key: 'kpi.sale.share',      label: '銷售品類佔比',    description: '各品類銷售貢獻',    viewCode: 'NX04_SO',     metricType: 'share', endpoint: '', category: '銷售', isPremium: true },
];

/** 5 格儀表板設定的 pref_key（後端 nx01_user_pref.pref_key） */
export const METRICS_PREF_KEY = 'home.dashboard.metrics';

/** pref_value 的型別 */
export type MetricsPrefValue = {
  slots: (string | null)[]; // 5 格、每格存 MetricOptionDef.key、null = 未設定
};

export const EMPTY_METRICS: MetricsPrefValue = { slots: [null, null, null, null, null] };
