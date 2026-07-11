// apps/nx-ui/src/design/layout/workbench/menu-data.ts
// 第一層選單列「目標 IA」登錄表（執行長 2026-06-28 定案、八大組）。
// - accel：頂層 Alt+字母 快捷（字尾字母、閃開工具列 Alt+A/E/D/F/M/R… 與分頁 Alt+1/2）
// - pending：功能尚未建置 → 灰顯「建置中」、不可點
// - comingSoon：整個模組暫緩討論 → 頂層灰顯、展開只顯「即將推出」（子項先留存、待之後啟用）
// - 能對到現有路由的接 href；對不到的標 pending
// ⚠️ 基本資料七分類為「目標結構」：部分接現有主檔頁、部分待「主檔重構軌」補；
//    與 master-registry（現六分類）暫時分家，重構軌落地後再對齊。

export type MenuAction = 'logout';

export type MenuNode = {
  key: string;
  label: string;
  href?: string;
  accel?: string; // 頂層快捷字母（Alt+X 之類）
  pending?: boolean; // 建置中（單一功能）
  comingSoon?: boolean; // 整模組暫緩（頂層用）
  action?: MenuAction;
  children?: MenuNode[];
};

export const MENU_BAR: MenuNode[] = [
  // ───────── 系統設定 (Z) ─────────
  {
    key: 'system',
    label: '系統設定',
    accel: 'Z',
    children: [
      { key: 'me', label: '個人資料', href: '/dashboard/me' },
      { key: 'change-password', label: '修改密碼', href: '/dashboard/me/change-password' },
      { key: 'settings', label: '環境設定', href: '/dashboard/settings' },
      { key: 'roles', label: '角色與權限', href: '/dashboard/settings/roles' },
      { key: 'system-param', label: '系統參數', href: '/dashboard/settings/system-param' },
      { key: 'wizard', label: '設定精靈', href: '/dashboard/settings/wizard' },
      { key: 'bulletins', label: '公告', href: '/dashboard/master/bulletins' },
      { key: 'logout', label: '登出', action: 'logout' },
    ],
  },

  // ───────── 基本資料 (Y)：七分類 ─────────
  {
    key: 'master',
    label: '基本資料',
    accel: 'Y',
    children: [
      {
        key: 'm-account',
        label: '帳號權限',
        children: [
          { key: 'users', label: '使用者基本資料', href: '/dashboard/master/users' },
          // 權限綁「權限等級」非職務（拆分軌新頁 permission-level）
          { key: 'account-type', label: '權限等級', href: '/dashboard/settings/permission-levels' },
          { key: 'role-view', label: '權限設定', href: '/dashboard/settings/permission-settings' },
        ],
      },
      {
        key: 'm-org',
        label: '組織架構',
        children: [
          { key: 'department', label: '部門基本資料', href: '/dashboard/master/department' },
          { key: 'team', label: '組別基本資料', href: '/dashboard/master/team' },
          { key: 'roles-m', label: '職務基本資料', href: '/dashboard/master/roles' },
          { key: 'org-structure', label: '組織架構設定', href: '/dashboard/master/org-structure' },
        ],
      },
      {
        key: 'm-site',
        label: '據點倉庫',
        children: [
          { key: 'site', label: '據點基本資料', href: '/dashboard/master/site' },
          { key: 'warehouses', label: '倉庫基本資料', href: '/dashboard/master/warehouses' },
          // 五層倉儲：據點→倉庫→區域→貨架→庫位（區域=倉庫分區 A/B/C，非地理地區）
          { key: 'wh-zone', label: '區域基本資料', href: '/dashboard/master/warehouse-zone' },
          { key: 'wh-rack', label: '貨架基本資料', href: '/dashboard/master/warehouse-rack' },
          { key: 'location', label: '庫位基本資料', href: '/dashboard/master/location' },
          { key: 'location-structure', label: '據點架構圖', href: '/dashboard/master/location-structure' },
        ],
      },
      {
        key: 'm-partner',
        label: '往來對象',
        children: [
          { key: 'cust', label: '客戶基本資料', href: '/dashboard/master/partners/customer' },
          { key: 'supp', label: '供應商基本資料', href: '/dashboard/master/partners/supplier' },
          { key: 'other-partner', label: '其他往來對象', href: '/dashboard/master/partners/other' },
        ],
      },
      {
        key: 'm-product',
        label: '產品與廠牌',
        children: [
          { key: 'parts', label: '零件基本資料', href: '/dashboard/master/parts' },
          { key: 'brand', label: '廠牌基本資料', href: '/dashboard/master/brand' },
          { key: 'model', label: '車型基本資料', href: '/dashboard/master/model' },
          { key: 'part-group', label: '自訂群組', href: '/dashboard/master/part-group' },
          {
            key: 'part-relation-grp',
            label: '零件關聯表',
            children: [
              { key: 'universal-group', label: '零件通用表', href: '/dashboard/master/universal-group' },
              { key: 'part-relation', label: '零件改版表', href: '/dashboard/master/part-relation' },
              { key: 'part-model', label: '零件適配車型', href: '/dashboard/master/part-model' },
              { key: 'part-kit', label: '組合（分解）零件', href: '/dashboard/master/part-kit' },
            ],
          },
          { key: 'supplier-supply', label: '供貨對應', href: '/dashboard/master/supplier-supply' },
          // 偉盟 P2 2.8 2026-07-11：批次調價維運工具
          { key: 'batch-price', label: '批次調價', href: '/dashboard/master/parts/batch-price' },
        ],
      },
      {
        key: 'm-acc',
        label: '財務會計',
        children: [
          { key: 'acc-subject', label: '會計科目', pending: true },
          { key: 'acc-account', label: '交易帳戶基本資料', pending: true },
        ],
      },
      {
        key: 'm-dict',
        label: '字典主檔',
        children: [
          { key: 'country', label: '國家基本資料', href: '/dashboard/master/country' },
          { key: 'zipcode', label: '郵遞區號基本資料', href: '/dashboard/master/zipcode' },
          { key: 'currency', label: '幣別基本資料', href: '/dashboard/master/currency' },
          { key: 'phonetic', label: '注音輔助基本資料', href: '/dashboard/master/phonetic-dictionary' },
        ],
      },
    ],
  },

  // ───────── 採購與進貨 (X)：2026-07-11 開放（單據頁全數已建、doc-shell 列印十張全通） ─────────
  {
    key: 'purchase',
    label: '採購與進貨',
    accel: 'X',
    children: [
      { key: 'demand', label: '缺貨簿', href: '/dashboard/purchase/demand' },
      { key: 'rfq', label: '詢價作業', href: '/dashboard/purchase/rfq' },
      { key: 'po', label: '採購單', href: '/dashboard/purchase/po' },
      // NX02-TI-SHELL 2026-07-11：正名——原 key 'ti' 掛的是國內採購工作台（改 key 'domestic'）、
      // 同行調貨單 TI 管理面首發、進貨單 RR 補上直達項
      { key: 'domestic', label: '國內採購工作台', href: '/dashboard/purchase/domestic' },
      { key: 'rr', label: '進貨單', href: '/dashboard/purchase/rr' },
      { key: 'ti', label: '同行調貨單', href: '/dashboard/purchase/ti' },
      { key: 'pr', label: '進貨退回', href: '/dashboard/purchase/pr' },
      { key: 'warranty', label: '保固申請', href: '/dashboard/purchase/warranty' },
      { key: 'special', label: '特殊採購', href: '/dashboard/purchase/special' },
    ],
  },

  // ───────── 銷售作業 (W)：建置中（報價單已進新外殼、其餘為 LITE 頁待逐張改版）─────────
  {
    key: 'sales',
    label: '銷售作業',
    accel: 'W',
    children: [
      { key: 'qt', label: '報價單', href: '/dashboard/sale/qt' },
      { key: 'qt-log', label: '報價紀錄', href: '/dashboard/sale/quote-log' },
      { key: 'iq-log', label: '詢價紀錄', href: '/dashboard/sale/inquiry-log' },
      { key: 'so', label: '銷貨單', href: '/dashboard/sale/so' },
      { key: 'sreturn', label: '銷貨退回', href: '/dashboard/sale/return' },
      // 「調貨詢價」單據降級成清單＝上方「詢價紀錄」（即時詢價寫入）；舊 R7 mock 入口退役、路由留給內部 prototype。
      // ⚠️ 調撥單（Nx03St 倉對倉內部調撥）2026-07-07 執行長拍板改歸「庫存管理(U) → 調撥作業」、不在銷售作業；
      //    此處不再列（非同行調貨；同行調貨單是 Nx02Ti）。
      { key: 'promotion', label: '促銷組合', href: '/dashboard/sale/promotion' },
      { key: 'discount', label: '優惠折扣管理', href: '/dashboard/master/discount-code' },
      { key: 'sale-issue', label: '銷售異常回報', pending: true },
    ],
  },

  // ───────── 簽核作業 (V)：跨模組簽核中心 ─────────
  {
    key: 'approval',
    label: '簽核作業',
    accel: 'V',
    comingSoon: true,
    children: [
      { key: 'ap-po', label: '採購單簽核', pending: true },
      { key: 'ap-pr', label: '退貨單簽核', pending: true },
      { key: 'ap-sr', label: '銷退單簽核', pending: true },
      { key: 'ap-transfer', label: '調撥簽核', pending: true },
      { key: 'ap-scrap', label: '零件報廢簽核', pending: true },
      { key: 'ap-conv', label: '零件重組分解簽核', pending: true },
      { key: 'ap-allowance', label: '折讓單簽核', href: '/dashboard/finance/allowance' },
      { key: 'ap-settings', label: '簽核作業設定', pending: true },
    ],
  },

  // ───────── 庫存管理 (U)：2026-07-11 開放（href 子項頁面逐一核實存在、未建項維持 pending） ─────────
  {
    key: 'inventory',
    label: '庫存管理',
    accel: 'U',
    children: [
      {
        key: 'i-inbound',
        label: '入庫作業',
        children: [
          { key: 'receiving', label: '到貨驗收作業', href: '/dashboard/inventory/receiving' },
          { key: 'transfer-recv', label: '調撥驗收作業', pending: true },
          { key: 'sreturn-recv', label: '銷退驗收作業', pending: true },
          { key: 'posting', label: '入帳作業', pending: true },
        ],
      },
      {
        key: 'i-outbound',
        label: '出貨作業',
        children: [
          { key: 'picking', label: '撿貨作業', href: '/dashboard/inventory/picking' },
          { key: 'packing', label: '包貨作業', href: '/dashboard/inventory/packing' },
          { key: 'self-pickup', label: '客戶自取', pending: true },
          { key: 'consign', label: '寄貨作業', pending: true },
          { key: 'dispatch', label: '配送作業', href: '/dashboard/delivery' },
          { key: 'delivery', label: '送貨作業', href: '/dashboard/inventory/delivery' },
        ],
      },
      {
        key: 'i-transfer',
        label: '調撥作業',
        children: [
          { key: 'transfer', label: '調撥單', href: '/dashboard/inventory/transfer' },
          { key: 'auto-replenish', label: '自動補貨設定', href: '/dashboard/inventory/auto-replenish' },
        ],
      },
      { key: 'stocktake', label: '盤點作業', href: '/dashboard/inventory/stock-take' },
      { key: 'issue-report', label: '誤差回報', href: '/dashboard/inventory/issue-report' },
      {
        key: 'i-disposition',
        label: '處置回報',
        children: [
          { key: 'conversion', label: '重組分解申請', href: '/dashboard/inventory/conversion' },
          { key: 'disposal', label: '報廢申請', href: '/dashboard/inventory/disposal' },
        ],
      },
    ],
  },

  // ───────── 會計財務 (Q)：2026-07-11 開放（AR/AP/票據/月關帳/帳務頁全在） ─────────
  {
    key: 'finance',
    label: '會計財務',
    accel: 'Q',
    children: [
      { key: 'ar', label: '應收帳款', href: '/dashboard/finance/ar' },
      { key: 'ap', label: '應付帳款', href: '/dashboard/finance/ap' },
      { key: 'notes', label: '收付票據', href: '/dashboard/finance/notes' },
      { key: 'closing', label: '月關帳', href: '/dashboard/finance/closing' },
      { key: 'account', label: '帳務', href: '/dashboard/finance/account' },
    ],
  },

  // ───────── 報表與分析 (N)：2026-07-11 開放（六報表頁全在） ─────────
  {
    key: 'report',
    label: '報表與分析',
    accel: 'N',
    children: [
      { key: 'r-personal', label: '個人月報', href: '/dashboard/report/personal' },
      { key: 'r-purchase', label: '採購報表', href: '/dashboard/report/purchase' },
      { key: 'r-sales', label: '銷售報表', href: '/dashboard/report/sales' },
      { key: 'r-inventory', label: '庫存報表', href: '/dashboard/report/inventory' },
      { key: 'r-pnl', label: '損益表', href: '/dashboard/report/pnl' },
      { key: 'r-ops', label: '營運報表', href: '/dashboard/report/ops' },
    ],
  },
];
