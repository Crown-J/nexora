// apps/nx-ui/src/data/home/home-data.ts
// NX00 首頁儀表板 共用 metadata + 全域導覽 (DOCK_NAV)
//
// 2026-06-25 執行長拍板「移除所有測試資料」Phase 1：
//   - CALENDAR_EVENTS / ATTENDANCE / TASKS / BULLETINS / NOTIFICATIONS / TENANT_NAME mock 全拆
//   - 保留：type 定義、EVENT_TYPES / ATTEND_STATUS / DOC_TYPES 顯示用 metadata、TODAY 日期工具、DOCK_NAV 全域導覽
//   - 公告 → DashboardBulletinContext + UnifiedTopBar 走 listBulletins
//   - 行事曆 → HomeView 走 listCalendarEvents
//   - 出勤 / 任務 / 通知 → Phase 1 暫顯空狀態（Phase 2 接 endpoint）

export type EventType = 'meeting' | 'activity' | 'leave' | 'holiday';
export type AttendStatus = 'work' | 'remote' | 'trip' | 'leave' | 'sick';
export type DocType = 'quote' | 'sales' | 'ship' | 'collect' | 'purchase';

export type CalendarEvent = {
  time: string;
  title: string;
  type: EventType;
  meta?: string;
};

export const EVENT_TYPES: Record<EventType, { label: string; color: string }> = {
  meeting: { label: '會議', color: '#378add' },
  activity: { label: '活動', color: '#1d9e75' },
  leave: { label: '請假', color: '#e8a020' },
  holiday: { label: '假日', color: '#e24b4a' },
};

export const ATTEND_STATUS: Record<AttendStatus, { label: string; color: string }> = {
  work: { label: '上班', color: '#1d9e75' },
  remote: { label: '外出', color: '#378add' },
  trip: { label: '出差', color: '#9a6cff' },
  leave: { label: '休假', color: '#e8a020' },
  sick: { label: '病假', color: '#e24b4a' },
};

export const DOC_TYPES: Record<DocType, { label: string; color: string }> = {
  quote: { label: '報價', color: '#378add' },
  sales: { label: '銷貨', color: '#1d9e75' },
  ship: { label: '出貨', color: '#9a6cff' },
  collect: { label: '收款', color: '#e8a020' },
  purchase: { label: '採購', color: '#e24b4a' },
};

// today 工具：給行事曆 focus 起點用
const T = new Date();
const TY = T.getFullYear();
const TM = T.getMonth() + 1;
const TD = T.getDate();
const dkey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
export const TODAY = { y: TY, m: TM, d: TD, key: dkey(TY, TM, TD) };

// 全域導覽（小星球 Dock）8 主選單 + 主檔三層
export type DockItem = {
  key: string;
  label: string;
  icon?: string;
  href?: string;
  sub?: DockItem[];
};

// DOCK_NAV 對齊 docs/專案/規格書/核心/NEXORA-模組架構總覽 v3.0
// 8 主選單（首頁/個人/主檔/採購/銷貨/庫存/財務/報表）+ 主檔 6 分區 + 各模組規格列出的子畫面
export const DOCK_NAV: DockItem[] = [
  { key: 'home', label: '首頁', icon: 'home', href: '/dashboard' },
  { key: 'me', label: '個人', icon: 'user', href: '/dashboard/me' },
  {
    key: 'master',
    label: '主檔',
    icon: 'database',
    sub: [
      {
        key: 'org',
        label: '組織架構',
        icon: 'network',
        sub: [
          { key: 'users', label: '員工', icon: 'user-square', href: '/dashboard/master/users' },
          { key: 'roles', label: '職務', icon: 'briefcase', href: '/dashboard/master/roles' },
          { key: 'department', label: '部門', icon: 'building', href: '/dashboard/master/department' },
          { key: 'team', label: '組別', icon: 'users', href: '/dashboard/master/team' },
        ],
      },
      {
        key: 'rbac',
        label: '權限管理',
        icon: 'shield-check',
        sub: [
          { key: 'orgchart', label: '組織架構圖', icon: 'network', href: '/dashboard/master/org-structure' },
          { key: 'permmatrix', label: '職務權限設定', icon: 'shield-check', href: '/dashboard/master/role-view' },
        ],
      },
      {
        key: 'site',
        label: '據點倉庫',
        icon: 'warehouse',
        sub: [
          { key: 'sitechart', label: '據點架構圖', icon: 'network', href: '/dashboard/master/location-structure' },
          { key: 'sites', label: '據點', icon: 'map-pin', href: '/dashboard/master/site' },
          { key: 'warehouses', label: '倉庫', icon: 'warehouse', href: '/dashboard/master/warehouses' },
          { key: 'location', label: '庫位', icon: 'package-open', href: '/dashboard/master/location' },
        ],
      },
      {
        key: 'partner',
        label: '往來對象',
        icon: 'handshake',
        sub: [
          { key: 'partners', label: '往來對象', icon: 'handshake', href: '/dashboard/master/partners' },
          { key: 'cust-grade', label: '客戶分級', icon: 'crown', href: '/dashboard/master/customer-grade' },
          { key: 'supp-grade', label: '供應商分級', icon: 'award', href: '/dashboard/master/supplier-grade' },
          { key: 'partner-part', label: '供應商供貨對應', icon: 'link', href: '/dashboard/master/supplier-supply' },
        ],
      },
      {
        key: 'part',
        label: '產品與廠牌',
        icon: 'boxes',
        sub: [
          { key: 'parts', label: '零件', icon: 'box', href: '/dashboard/master/parts' },
          { key: 'brand', label: '廠牌', icon: 'tag', href: '/dashboard/master/brand' },
          { key: 'part-group', label: '零件群組', icon: 'layers', href: '/dashboard/master/part-group' },
          { key: 'univ-group', label: '通用件群組', icon: 'combine', href: '/dashboard/master/universal-group' },
        ],
      },
      {
        key: 'dict',
        label: '字典主檔',
        icon: 'book-open',
        sub: [
          { key: 'region', label: '地區', icon: 'globe', href: '/dashboard/master/region' },
          { key: 'country', label: '國家', icon: 'flag', href: '/dashboard/master/country' },
          { key: 'currency', label: '幣別', icon: 'coins', href: '/dashboard/master/currency' },
          { key: 'phonetic', label: '注音字典', icon: 'book-open', href: '/dashboard/master/phonetic-dictionary' },
        ],
      },
    ],
  },
  {
    key: 'purchase',
    label: '採購',
    icon: 'shopping-cart',
    sub: [
      { key: 'demand', label: '缺貨簿', icon: 'alert-triangle', href: '/dashboard/purchase/demand' },
      { key: 'rfq', label: '詢價', icon: 'help-circle', href: '/dashboard/purchase/rfq' },
      { key: 'po', label: '採購', icon: 'clipboard-list', href: '/dashboard/purchase/po' },
      { key: 'domestic', label: '國內進貨', icon: 'package-plus', href: '/dashboard/purchase/domestic' },
      { key: 'foreign', label: '國外進貨', icon: 'ship', href: '/dashboard/purchase/foreign' },
      { key: 'pr', label: '進貨退回', icon: 'package-minus', href: '/dashboard/purchase/pr' },
      { key: 'warranty', label: '保固申請', icon: 'shield', href: '/dashboard/purchase/warranty' },
      { key: 'product', label: '產品管理', icon: 'box', href: '/dashboard/purchase/product' },
      { key: 'vendor', label: '供應商管理', icon: 'building-2', href: '/dashboard/purchase/vendor' },
    ],
  },
  {
    key: 'sales',
    label: '銷貨',
    icon: 'trending-up',
    sub: [
      { key: 'qt', label: '報價單', icon: 'file-text', href: '/dashboard/sale/qt' },
      { key: 'so', label: '銷貨單', icon: 'receipt', href: '/dashboard/sale/so' },
      { key: 'return', label: '銷貨退回', icon: 'undo-2', href: '/dashboard/sale/return' },
      { key: 'inquiry', label: '調貨詢價', icon: 'search', href: '/dashboard/sale/inquiry' },
      { key: 'transfer', label: '調貨單', icon: 'package-check', href: '/dashboard/sale/docs/transfer' },
      { key: 'sale-product', label: '產品管理', icon: 'box', href: '/dashboard/sale/product' },
      { key: 'customer', label: '客戶管理', icon: 'users-2', href: '/dashboard/sale/customer/info' },
    ],
  },
  {
    key: 'inventory',
    label: '庫存',
    icon: 'package',
    sub: [
      { key: 'picking', label: '撿貨', icon: 'hand', href: '/dashboard/inventory/picking' },
      { key: 'packing', label: '包貨', icon: 'package-open', href: '/dashboard/inventory/packing' },
      { key: 'delivery', label: '送貨', icon: 'truck', href: '/dashboard/inventory/delivery' },
      { key: 'stocktake', label: '盤點', icon: 'clipboard', href: '/dashboard/inventory/stock-take' },
      { key: 'conversion', label: '重組分解', icon: 'combine', href: '/dashboard/inventory/conversion' },
      { key: 'issue', label: '異常處理', icon: 'alert-circle', href: '/dashboard/inventory/issue-report' },
      { key: 'stock-setting', label: '安全量設定', icon: 'sliders-horizontal', href: '/dashboard/inventory/stock-setting' },
      { key: 'auto-replenish', label: '自動補貨', icon: 'repeat', href: '/dashboard/inventory/auto-replenish' },
      { key: 'balance', label: '庫存查詢', icon: 'search', href: '/dashboard/inventory/balance' },
      { key: 'warehouse-setting', label: '倉庫設定', icon: 'warehouse', href: '/dashboard/inventory/warehouse-setting' },
    ],
  },
  {
    key: 'finance',
    label: '財務',
    icon: 'dollar',
    sub: [
      { key: 'ar', label: '應收', icon: 'arrow-down-left', href: '/dashboard/finance/ar' },
      { key: 'ap', label: '應付', icon: 'arrow-up-right', href: '/dashboard/finance/ap' },
      { key: 'notes', label: '收付款票據', icon: 'receipt', href: '/dashboard/finance/notes' },
      { key: 'allowance', label: '折讓核可', icon: 'percent', href: '/dashboard/finance/allowance' },
      { key: 'closing', label: '月關帳', icon: 'calendar-check', href: '/dashboard/finance/closing' },
    ],
  },
  { key: 'reports', label: '報表', icon: 'bar-chart', href: '/dashboard/report' },
];
