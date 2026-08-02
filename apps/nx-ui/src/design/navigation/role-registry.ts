// apps/nx-ui/src/design/navigation/role-registry.ts
//
// 九宮格導覽 SSOT（v3.0.0 階段 1 Step 1）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §3 §4
//
// 結構：角色層(1-9) → 功能層(1-9) → 子功能層(1-9)
// 消費者：NineGrid 元件（Step 2）、新外殼（Step 3）
//
// ⛔ 號碼凍結鐵則（規格 §5）：
//   數字一旦配給某個功能就終身不改。新功能撿空號排後面、停用的號碼留白不回收。
//   顯示順序可調，但號碼跟著功能走、不跟著位置走。
//   ⚠️ 改動本檔的 `no` 之前，先確認該功能是否已上線 —— 上線後改號＝全公司打錯單。
//
// ⛔ 第二層只放「作業類別」，不放單據。
//   新增一種單據只加第三層，九宮格一格都不用動。這是保護上面那條鐵則的做法。
//
// status：
//   'live'    = 路由已存在、可直接開
//   'pending' = 規格已定、頁面未建（格子顯示為建置中、不可進）
//
// ⚠️ 尚未收進本表的既有頁面（Step 1 盤點發現、待執行長裁示歸屬）：
//   · /dashboard/knowledge/*（8 頁：知識庫/文件/手冊/會議/維修SOP/VIN查詢/標籤/搜尋）
//     ＝ EIP 知識管理。規格 §10 的方向是「知識掛在 ERP 物件上」而非獨立知識庫，
//     與這批既有頁面的做法不同，另開軌處理後再決定是否進九宮格。
//   · /dashboard/task-pool（待辦池）＝ 規格改走頂欄鈴鐺，暫不進格。
//   · /dashboard/inventory/stocktake 與 /dashboard/inventory/stock-take 兩套盤點路由並存，
//     本表先接 stock-take，重複問題留待階段 4 清理。
//
// ⚠️ 2026-08-01 銷售重排後「有路由但不在格子裡」的頁（⛔ 沒刪、等著被吸收）：
//   · /dashboard/sale/price-check（查價查貨）→ 併進 1 報價作業
//   · /dashboard/sale/quote-log（報價紀錄）  → 併進 1 報價作業
//   · /dashboard/sale/inquiry-log（詢價紀錄）→ 併進 4 調貨作業

export type RoleNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CellNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type GridCell = {
  /** 九宮格位置。⛔ 終身凍結，見檔頭鐵則 */
  no: CellNo;
  id: string;
  label: string;
  /** 直接開的路由；有 children 時可省略（按下去進第三層） */
  href?: string;
  /**
   * 開既有的即時工作站（浮層，不是路由）。1-6 對應 instant-workbench/station-registry。
   * ⚠️ 過渡做法：規格 §2.1 要求一頁式、⛔ 不用彈跳視窗，五個站改寫成分頁排在階段 4；
   *    Step 4 只做「鍵位歸位、功能不損失」，先讓九宮格能開現有的站。
   */
  station?: 1 | 2 | 3 | 4 | 5 | 6;
  /** 第三層 */
  children?: GridCell[];
  status: 'live' | 'pending';
};

export type RoleDef = {
  /** 第一層位置。⛔ 終身凍結。沒權限的角色格子變灰、不重排（規格 §3.1） */
  no: RoleNo;
  id: string;
  label: string;
  /** 對應部門（規格 §4.1）；純說明用，不參與邏輯 */
  department: string;
  /** RBAC 權限碼，階段 2 接線後生效；現階段全部可進 */
  permissionCode?: string;
  cells: GridCell[];
};

export const ROLES: RoleDef[] = [
  // ───────────────────────────────────────── 1 銷售作業
  {
    no: 1,
    id: 'sales',
    label: '銷售作業',
    department: '業務部',
    // ⭐ 2026-08-01 執行長重排（取代先前的 5 格＋第三層版本）。三個變動與理由：
    //
    // 一、⛔ 沒有「查價查貨／問價」這一格。
    //     執行長：「客戶打進來就是來詢價，所以要做的就是直接報價。」
    //     查料、看兩個價、看有沒有貨——那些是**報價當下的動作**，不是另一件事，
    //     收進報價作業裡面。規格 v1.0 原本也是這樣寫的（查價查貨不佔格子）。
    //
    // 二、⛔ 拿掉「即時 X ／ X 單列表」那種第三層配對。
    //     那個配對只在舊架構下才需要——當年正式單據頁又重又慢，才另外做浮層工作站當快速通道。
    //     一頁式架構（規格 §2.1）把這個理由消滅了：報價就是報價，一頁走完，
    //     沒有「即時版」跟「正式版」之分。四個舊名字隨之消失。
    //     ⚠️ 但第三層本身沒有被禁用——只是它要放「不同的事」，不是「同一件事的兩套做法」。
    //        例：1 報價作業 ▸ 建立報價（做事）／單據管理（查已經做過的）。
    //
    // 三、報價排第 1、銷貨排第 2 —— 照生意的順序（先報價才有單）。
    //
    // ⚠️ 舊的四個浮層工作站（即時報價／即時詢價／快速開單／即時銷退）在新架構下沒有格子。
    //    它們的功能要被吸收進各自的「作業」頁，⚠️ 在改寫完成前，選單進不去這四個站。
    //    元件本身沒刪，InstantWorkbench 還掛著（其他頁面的嵌入點仍在用）。
    cells: [
      // 1 報價作業：客戶打電話進來的落點。
      // ⚠️ 這一格有第三層（執行長 2026-08-01）：「建立報價」是做事、「單據管理」是查已經做過的，
      //    兩件事分開。⛔ 這跟舊的「即時報價／正式報價單」配對不是同一回事——
      //    舊配對是同一件事的兩套做法（快的／正式的），這裡是兩件不同的事。
      {
        no: 1,
        id: 'quote-ops',
        label: '報價作業',
        status: 'live',
        children: [
          { no: 1, id: 'quote-create', label: '建立報價', href: '/dashboard/sale/quote', status: 'live' },
          // ⚠️ 2026-08-02 執行長改名：原「單據管理」→「報價管理」。
          //    理由是每一格底下都有一個「單據管理」時分不出來是誰的單據，
          //    冠上所屬作業（報價管理／銷貨管理）才看得出差別。⛔ 號碼不動（§5 號碼凍結）。
          { no: 2, id: 'quote-docs', label: '報價管理', href: '/dashboard/sale/qt', status: 'live' },
        ],
      },
      // 2 銷貨作業：報價談成 → 開單
      // ⚠️ 2026-08-02 執行長拍板加第三層（比照 1 報價作業）：
      //    「建立銷貨單」是做事、「銷貨管理」是查已經做過的，兩件不同的事。
      //    ⛔ 這跟舊的「即時銷售／銷貨單列表」配對不是同一回事——那是同一件事的兩套做法。
      {
        no: 2,
        id: 'so-ops',
        label: '銷貨作業',
        status: 'live',
        children: [
          { no: 1, id: 'so-create', label: '建立銷貨單', href: '/dashboard/sale/order', status: 'live' },
          { no: 2, id: 'so-docs', label: '銷貨管理', href: '/dashboard/sale/so', status: 'live' },
        ],
      },
      // 3 退貨作業：客戶要退 → 依零件的退貨政策自動分流成一般退貨或轉保固（規格 §4.2）
      { no: 3, id: 'sr-ops', label: '退貨作業', href: '/dashboard/sale/return', status: 'live' },
      // 4 調貨作業：沒貨時跟同行問價、建調貨單、看問過誰
      { no: 4, id: 'transfer-ops', label: '調貨作業', href: '/dashboard/purchase/ti', status: 'live' },
      { no: 5, id: 'customer', label: '客戶管理', href: '/dashboard/master/partners/customer', status: 'live' },
      // 6 對帳查詢：出貨前看客戶有沒有逾期
      { no: 6, id: 'ar-check', label: '對帳查詢', href: '/dashboard/report/finance/ar-overview', status: 'live' },
      { no: 7, id: 'warranty-query', label: '保固查詢', href: '/dashboard/sale/warranty', status: 'live' },
      { no: 8, id: 'sales-report', label: '銷售分析', href: '/dashboard/report/sales', status: 'live' },
      // 9 保留（執行長 2026-08-01 明確留白）
      // ⛔ 不硬湊（規格 §4.2），且號碼凍結鐵則下這個空號將來只給新功能、不回收（§5）
    ],
  },

  // ───────────────────────────────────────── 2 採購作業
  {
    no: 2,
    id: 'purchase',
    label: '採購作業',
    department: '採購部',
    cells: [
      { no: 1, id: 'demand', label: '缺貨簿', href: '/dashboard/purchase/demand', status: 'live' },
      { no: 2, id: 'po', label: '採購單', href: '/dashboard/purchase/po', status: 'live' },
      { no: 3, id: 'rfq', label: '詢價作業', href: '/dashboard/purchase/rfq', status: 'live' },
      { no: 4, id: 'rr', label: '進貨單', href: '/dashboard/purchase/rr', status: 'live' },
      { no: 5, id: 'pr', label: '進貨退回', href: '/dashboard/purchase/pr', status: 'live' },
      // 採購真正的痛點是追未到的貨（規格 §4.2 補上的格）
      { no: 6, id: 'eta-track', label: '交期追蹤', status: 'pending' },
      // 收三種來源：銷售轉來的保固／進貨異常／盤點異常 → 向供應商求償
      { no: 7, id: 'warranty-claim', label: '保固求償', href: '/dashboard/purchase/warranty', status: 'live' },
      { no: 8, id: 'supplier', label: '供應商管理', href: '/dashboard/master/partners/supplier', status: 'live' },
      { no: 9, id: 'purchase-report', label: '採購分析', href: '/dashboard/report/purchase', status: 'live' },
    ],
  },

  // ───────────────────────────────────────── 3 倉庫作業
  // ⭐ 刻意收成「作業類別」而非單據（規格 §5）：新增一種入庫方式只加第三層、九宮格不動。
  //    撿貨從兩下變三下的代價可接受——倉管是「進去待著做一整批」，不是一直切換。
  {
    no: 3,
    id: 'warehouse',
    label: '倉庫作業',
    department: '倉管部',
    cells: [
      {
        no: 1,
        id: 'inbound',
        label: '入庫作業',
        status: 'live',
        children: [
          { no: 1, id: 'receiving', label: '進貨驗收', href: '/dashboard/inventory/receiving', status: 'live' },
          { no: 2, id: 'transfer-recv', label: '調撥驗收', status: 'pending' },
          { no: 3, id: 'sr-recv', label: '銷退驗收', status: 'pending' },
        ],
      },
      {
        no: 2,
        id: 'outbound',
        label: '出庫作業',
        status: 'live',
        children: [
          { no: 1, id: 'picking', label: '撿貨', href: '/dashboard/inventory/picking', status: 'live' },
          { no: 2, id: 'packing', label: '包貨', href: '/dashboard/inventory/packing', status: 'live' },
          { no: 3, id: 'shipping', label: '出貨', href: '/dashboard/inventory/ship-zones', status: 'live' },
        ],
      },
      {
        no: 3,
        id: 'transfer',
        label: '調撥作業',
        status: 'live',
        children: [
          { no: 1, id: 'transfer-doc', label: '調撥單', href: '/dashboard/inventory/transfer', status: 'live' },
          { no: 2, id: 'auto-replenish', label: '自動補貨設定', href: '/dashboard/inventory/auto-replenish', status: 'live' },
        ],
      },
      {
        no: 4,
        id: 'stocktake',
        label: '盤點作業',
        status: 'live',
        children: [
          { no: 1, id: 'stocktake-doc', label: '盤點單', href: '/dashboard/inventory/stock-take', status: 'live' },
          { no: 2, id: 'stocktake-diff', label: '盤點差異表', status: 'pending' },
        ],
      },
      {
        no: 5,
        id: 'conversion',
        label: '重組分解',
        status: 'live',
        children: [
          { no: 1, id: 'conversion-doc', label: '重組分解單', href: '/dashboard/inventory/conversion', status: 'live' },
          { no: 2, id: 'disposal', label: '報廢申請', href: '/dashboard/inventory/disposal', status: 'live' },
        ],
      },
      {
        no: 6,
        id: 'issue',
        label: '異常回報',
        status: 'live',
        children: [
          { no: 1, id: 'issue-report', label: '誤差回報', href: '/dashboard/inventory/issue-report', status: 'live' },
          { no: 2, id: 'quality-issue', label: '品質異常', status: 'pending' },
        ],
      },
      {
        no: 7,
        id: 'location',
        label: '庫位管理',
        status: 'live',
        children: [
          { no: 1, id: 'loc', label: '庫位', href: '/dashboard/master/location', status: 'live' },
          { no: 2, id: 'rack', label: '貨架', href: '/dashboard/master/warehouse-rack', status: 'live' },
          { no: 3, id: 'zone', label: '區域', href: '/dashboard/master/warehouse-zone', status: 'live' },
          { no: 4, id: 'loc-structure', label: '據點架構圖', href: '/dashboard/master/location-structure', status: 'live' },
        ],
      },
      {
        no: 8,
        id: 'warehouse-report',
        label: '倉庫分析',
        status: 'live',
        children: [
          { no: 1, id: 'stock-report', label: '庫存報表', href: '/dashboard/report/inventory', status: 'live' },
          { no: 2, id: 'turnover', label: '週轉分析', href: '/dashboard/report/warehouse-staff/turnover', status: 'live' },
          { no: 3, id: 'dormant', label: '呆滯料', href: '/dashboard/report/warehouse-staff/dormant', status: 'live' },
        ],
      },
      // no 9 留空——⛔ 不硬湊（規格 §4.2）
    ],
  },

  // ───────────────────────────────────────── 4 物流作業
  // 1-6 是外務在外面做的、7-9 是調度與主管看的。
  // ⛔ 不因為「外務用手機、調度用電腦」拆成兩個角色——功能不綁裝置（規格 §4.2）
  {
    no: 4,
    id: 'logistics',
    label: '物流作業',
    department: '倉管部',
    cells: [
      { no: 1, id: 'today-delivery', label: '今日配送', href: '/dashboard/delivery/dispatch', status: 'live' },
      { no: 2, id: 'delivery-doc', label: '送貨單', href: '/dashboard/inventory/delivery', status: 'live' },
      { no: 3, id: 'sign', label: '簽收回報', href: '/dashboard/delivery/sign', status: 'live' },
      // ⚠️ 司機收現金回來要交出納——錢與帳分離（規格 §8.3）
      { no: 4, id: 'cod', label: '代收貨款', status: 'pending' },
      { no: 5, id: 'delivery-exception', label: '異常回報', href: '/dashboard/delivery/exception', status: 'live' },
      { no: 6, id: 'return-pickup', label: '退貨取回', status: 'pending' },
      { no: 7, id: 'route', label: '配送排程', href: '/dashboard/delivery/route', status: 'live' },
      { no: 8, id: 'vehicle', label: '車輛管理', status: 'pending' },
      { no: 9, id: 'logistics-report', label: '物流分析', href: '/dashboard/report/warehouse-lead/route-efficiency', status: 'live' },
    ],
  },

  // ───────────────────────────────────────── 5 產品作業
  {
    no: 5,
    id: 'product',
    label: '產品作業',
    department: '產品部',
    cells: [
      { no: 1, id: 'part-create', label: '產品建檔', href: '/dashboard/master/parts', status: 'live' },
      { no: 2, id: 'part-maintain', label: '產品維護', href: '/dashboard/inventory/product-maintenance', status: 'live' },
      { no: 3, id: 'pricing', label: '定價管理', href: '/dashboard/master/parts/batch-price', status: 'live' },
      { no: 4, id: 'brand', label: '廠牌管理', href: '/dashboard/master/brand', status: 'live' },
      { no: 5, id: 'part-group', label: '族群管理', href: '/dashboard/master/part-group', status: 'live' },
      // ⛔ 叫「組合設定」不叫「重組分解」——這是定義「一箱＝12 瓶」的對應關係（設定、很少改），
      //    與倉庫作業的「重組分解單」（作業、天天做）是兩件事，⛔ 不可同名（規格 §4.2）
      { no: 6, id: 'kit-setting', label: '組合設定', href: '/dashboard/master/part-kit', status: 'live' },
      {
        no: 7,
        id: 'alternatives',
        label: '替代料管理',
        status: 'live',
        children: [
          { no: 1, id: 'universal-group', label: '通用表', href: '/dashboard/master/universal-group', status: 'live' },
          { no: 2, id: 'part-relation', label: '改版表', href: '/dashboard/master/part-relation', status: 'live' },
          // ⚠️ 適配車型是汽配專屬。刻意收在第三層——換行業時整個第三層移除、九宮格不動（規格 §4.2）
          { no: 3, id: 'part-model', label: '適配車型', href: '/dashboard/master/part-model', status: 'live' },
        ],
      },
      { no: 8, id: 'supplier-supply', label: '供貨對應', href: '/dashboard/master/supplier-supply', status: 'live' },
      { no: 9, id: 'product-report', label: '產品分析', status: 'pending' },
    ],
  },

  // ───────────────────────────────────────── 6 出納作業
  // ⚠️ 與會計分開是內控要求不是選項：管錢的不管帳（規格 §4.1）
  {
    no: 6,
    id: 'cashier',
    label: '出納作業',
    department: '財務部',
    cells: [
      { no: 1, id: 'receipt', label: '收款作業', status: 'pending' },
      { no: 2, id: 'payment', label: '付款作業', status: 'pending' },
      { no: 3, id: 'notes', label: '票據管理', href: '/dashboard/finance/notes', status: 'live' },
      { no: 4, id: 'bank', label: '銀行存提', status: 'pending' },
      { no: 5, id: 'cash-daily', label: '現金日報', status: 'pending' },
      { no: 6, id: 'petty-cash', label: '零用金', status: 'pending' },
      { no: 7, id: 'account', label: '帳戶管理', href: '/dashboard/finance/account', status: 'live' },
      { no: 8, id: 'cashier-report', label: '出納報表', href: '/dashboard/report/finance/cash-flow', status: 'live' },
      // no 9 留空
    ],
  },

  // ───────────────────────────────────────── 7 會計作業
  {
    no: 7,
    id: 'accounting',
    label: '會計作業',
    department: '財務部',
    cells: [
      { no: 1, id: 'ar', label: '應收帳款', href: '/dashboard/finance/ar', status: 'live' },
      { no: 2, id: 'ap', label: '應付帳款', href: '/dashboard/finance/ap', status: 'live' },
      // ⚠️ 3/6/9 由總帳脊椎軌產出（另一個對話並行中），介面軌不動後端
      { no: 3, id: 'voucher', label: '傳票作業', status: 'pending' },
      { no: 4, id: 'tax', label: '發票稅務', status: 'pending' },
      { no: 5, id: 'closing', label: '月關帳', href: '/dashboard/finance/closing', status: 'live' },
      { no: 6, id: 'gl-query', label: '總帳查詢', status: 'pending' },
      { no: 7, id: 'fin-report', label: '財務報表', href: '/dashboard/report/pnl', status: 'live' },
      { no: 8, id: 'fixed-asset', label: '固定資產', status: 'pending' },
      { no: 9, id: 'account-code', label: '會計科目', status: 'pending' },
    ],
  },

  // ───────────────────────────────────────── 8 經營作業
  {
    no: 8,
    id: 'executive',
    label: '經營作業',
    department: '總經理／董事長',
    cells: [
      { no: 1, id: 'dashboard', label: '經營儀表板', href: '/dashboard/report/workspace', status: 'live' },
      { no: 2, id: 'approval', label: '待簽核', status: 'pending' },
      { no: 3, id: 'exception-track', label: '異常追蹤', status: 'pending' },
      {
        no: 4,
        id: 'exec-report',
        label: '經營報表',
        status: 'live',
        children: [
          { no: 1, id: 'pnl', label: '損益表', href: '/dashboard/report/pnl', status: 'live' },
          { no: 2, id: 'ops', label: '營運報表', href: '/dashboard/report/ops', status: 'live' },
          { no: 3, id: 'dept-perf', label: '部門績效', href: '/dashboard/report/owner/dept-perf', status: 'live' },
          { no: 4, id: 'cross-module', label: '跨模組分析', href: '/dashboard/report/strategy/cross-module', status: 'live' },
          { no: 5, id: 'bcg', label: 'BCG 矩陣', href: '/dashboard/report/strategy/bcg-matrix', status: 'live' },
        ],
      },
      { no: 5, id: 'hr-kpi', label: '人員績效', href: '/dashboard/hr/kpi', status: 'live' },
      { no: 6, id: 'kpi-gap', label: '目標與 KPI', href: '/dashboard/report/owner/kpi-gap', status: 'live' },
      { no: 7, id: 'customer-rank', label: '客戶排行', href: '/dashboard/report/owner/sales-ranking', status: 'live' },
      // no 8 / no 9 留空
    ],
  },

  // ───────────────────────────────────────── 9 行政作業
  // 管理部「人、事務、資產」。⚠️ 與經營作業是兩回事，⛔ 不可混稱「管理作業」（規格 §4.1）
  {
    no: 9,
    id: 'admin',
    label: '行政作業',
    department: '管理部',
    cells: [
      {
        no: 1,
        id: 'personnel',
        label: '人員資料',
        status: 'live',
        children: [
          { no: 1, id: 'employee', label: '員工資料', href: '/dashboard/hr/employee', status: 'live' },
          { no: 2, id: 'attendance', label: '出勤', href: '/dashboard/hr/attendance', status: 'live' },
          { no: 3, id: 'leave', label: '請假', href: '/dashboard/hr/leave', status: 'live' },
          { no: 4, id: 'salary', label: '薪資', href: '/dashboard/hr/salary', status: 'live' },
        ],
      },
      // ⚠️ 待執行長裁示：「人員資料」（員工、離職要留存）與本格（登入帳號、離職要停用）
      //    是否合併成一格。規格 §4.2 已標。
      { no: 2, id: 'user-perm', label: '使用者與權限', href: '/dashboard/master/users', status: 'live' },
      { no: 3, id: 'bulletin', label: '公告管理', href: '/dashboard/master/bulletins', status: 'live' },
      { no: 4, id: 'org', label: '組織架構', href: '/dashboard/master/org-structure', status: 'live' },
      { no: 5, id: 'asset', label: '資產管理', status: 'pending' },
      { no: 6, id: 'site', label: '據點倉庫', href: '/dashboard/master/site', status: 'live' },
      { no: 7, id: 'sys-param', label: '系統參數', href: '/dashboard/settings/system-param', status: 'live' },
      {
        no: 8,
        id: 'dictionary',
        label: '字典設定',
        status: 'live',
        children: [
          { no: 1, id: 'country', label: '國家', href: '/dashboard/master/country', status: 'live' },
          { no: 2, id: 'zipcode', label: '郵遞區號', href: '/dashboard/master/zipcode', status: 'live' },
          { no: 3, id: 'currency', label: '幣別', href: '/dashboard/master/currency', status: 'live' },
          { no: 4, id: 'phonetic', label: '注音輔助', href: '/dashboard/master/phonetic-dictionary', status: 'live' },
        ],
      },
      { no: 9, id: 'audit-log', label: '操作紀錄', status: 'pending' },
    ],
  },
];

/** 依角色編號取角色（找不到回 undefined） */
export function getRole(no: RoleNo): RoleDef | undefined {
  return ROLES.find((r) => r.no === no);
}

/** 依格號取某角色的功能格 */
export function getCell(role: RoleDef, no: CellNo): GridCell | undefined {
  return role.cells.find((c) => c.no === no);
}

/**
 * 九宮格渲染用：把稀疏的 cells 攤成固定 9 格（1-9），空位回 null。
 * ⛔ 位置固定是肌肉記憶的前提——⛔ 不得因為某格為空就把後面的往前遞補。
 */
export function toGrid<T extends { no: CellNo }>(items: T[]): (T | null)[] {
  return Array.from({ length: 9 }, (_, i) => items.find((x) => x.no === i + 1) ?? null);
}

/** 九宮格的視覺列序：照數字鍵盤 789 / 456 / 123（規格 §3.1） */
export const NUMPAD_ROWS: CellNo[][] = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];
