// apps/nx-ui/src/features/page-guide/content.ts
// v1.2 對齊軌 D：22 個 LITE 工作台引導內容
//
// 對齊 v1.2 §3.3 設定精靈格式：
//   📚 [工作台名] 引導
//   主要功能：N 點
//   操作流程：簡述
//   [我知道了、開始使用]
//
// pageKey 對應 Nx01UserPageGuide.page_key、user × pageKey 第一次進跳

export interface PageGuideContent {
  pageKey: string;
  /// 標題（含 emoji 模式）
  title: string;
  /// 一句話描述用途
  purpose: string;
  /// 主要功能（3-6 點）
  features: string[];
  /// 操作流程（可選）
  workflow?: string;
  /// 重要提示（可選、會以 amber 顯示）
  tip?: string;
}

export const PAGE_GUIDES: Record<string, PageGuideContent> = {
  // ─────────────────────────────────────
  // NX02 進貨（6 工作台）
  // ─────────────────────────────────────
  'purchase.rfq': {
    pageKey: 'purchase.rfq',
    title: '📋 詢價單工作台',
    purpose: '向廠商詢價、收回報價、比價後決定要不要建採購單。',
    features: [
      '列表頁可看所有詢價單、依日期 / 廠商 / 狀態篩選',
      '新增詢價單時、可從「採購需求單」拉項目（系統建議）',
      '「產生詢價文字」可 copy 到 LINE / Email 給廠商',
      '同 RFQ 可收多家廠商報價、並排比價選最便宜',
      '「採用」報價 → 自動建採購單、其他報價自動 REJECTED',
    ],
    workflow: '建詢價 → 產生文字 / 寄出 → 收廠商回價 → 並排比價 → 採用 → 建採購單',
  },
  'purchase.po': {
    pageKey: 'purchase.po',
    title: '🛒 採購單工作台',
    purpose: '對廠商正式下單、進貨入庫前的單據。',
    features: [
      '可從詢價單「採用」自動建、或手動新增',
      '可分多次採購同一份詢價（先採急的、剩下等廠商）',
      '採購單建好等廠商出貨、貨到開進貨單驗收',
      '國外採購多 6 階段（備貨 / 付款 / 待出貨 / 上船 / 到港 / 驗收）',
    ],
    workflow: '採購單建立 → 等貨 → 開進貨單驗收 → 自動入庫 + 自動產生應付帳',
  },
  'purchase.rr': {
    pageKey: 'purchase.rr',
    title: '📦 進貨單（驗收）工作台',
    purpose: '貨到、開進貨單清點、按「驗收」自動入庫 + 寫應付。',
    features: [
      '進貨單對應某採購單、明細自動帶出',
      '清點實際到貨數量、可全收 / 部分收',
      '按「驗收」自動：入庫 stock_balance + 寫應付 AP + 移動平均成本',
      '驗收後發現問題 → 開退貨單（選處置：退換 / 退錢 / 保固）',
      '國外進貨費用按金額比例攤分到各料件成本',
    ],
    tip: '⚠️ 驗收一旦按下、會立刻寫帳。請務必先清點清楚。',
  },
  'purchase.pr': {
    pageKey: 'purchase.pr',
    title: '↩️ 退貨單工作台',
    purpose: '進貨後發現問題、退還廠商。',
    features: [
      '從進貨單觸發、選「處置方式」：退回換新 / 退錢 / 保固',
      '選「保固」會自動產生一張保固申請單',
      '退貨後自動沖回應付帳款',
    ],
  },
  'purchase.warranty-claim': {
    pageKey: 'purchase.warranty-claim',
    title: '🛡️ 保固申請單工作台',
    purpose: '客戶反映產品故障、向廠商申請保固理賠。',
    features: [
      '兩種型態：客訴型（連 SO、客戶反映）/ 自用型（自家庫存壞）',
      '5 階段：草稿 → 送出 → 處理中 → 完成 / 拒絕',
      '4 種結果：換新 / 退錢 / 維修 / 駁回',
      '可上傳照片 / 行照（base64 範式、上限 100MB）',
      '保固理賠成功會自動沖應付帳',
    ],
    tip: '⚠️ 行照很重要、客戶要拿出來證明車是他自己的、避免冒用保固',
  },
  'purchase.vendor': {
    pageKey: 'purchase.vendor',
    title: '🏢 供應商管理（進貨角度）',
    purpose: '從進貨角度看廠商：等級 / 付款條件 / 主要產品。',
    features: [
      '等級 A/B/C/D 依付款條件初步分（NET90=A、NET60=B...）',
      '客戶累積進貨資料後可改算更精準的等級',
      '篩選等級 / 主要產品方便選下單對象',
      '與「主檔中心 → 廠商」同一份資料、欄位專注進貨角度',
    ],
  },
  'purchase.product': {
    pageKey: 'purchase.product',
    title: '📦 產品管理（進貨角度）',
    purpose: '從進貨角度看產品：成本 / 安全量 / 改號關聯 / 通用零件。',
    features: [
      '公司定價 ABCD 自動算（成本 × 客戶等級毛利率）',
      '平均進貨價即時統計',
      '安全量低於 → 自動寫採購需求單',
      '改號關聯 = 同產品的新舊型號互通（剎車片 V1 → V2 合計庫存）',
      '通用零件 = 同零件可用多車型（VW Golf 剎車片）',
    ],
  },

  // ─────────────────────────────────────
  // NX03 庫存（6 工作台）
  // ─────────────────────────────────────
  'inventory.stocktake': {
    pageKey: 'inventory.stocktake',
    title: '🔢 盤點作業',
    purpose: '定期 / 不定期清點實際庫存、跟系統量對比。',
    features: [
      '頻率：每日 / 週 / 月 / 不定期',
      '範圍：全倉 / 庫位 / 產品族群',
      '差異不為 0 必填原因（被偷 / 算錯 / 破損 / 不明）',
      '送出後進主管核可、核可後過帳',
      '過帳後低於安全量自動寫採購需求單',
    ],
    workflow: 'DRAFT → COUNTING → ADJUSTING → submitForApproval → POSTED',
  },
  'inventory.stock-query': {
    pageKey: 'inventory.stock-query',
    title: '🔍 庫存查詢（三維度）',
    purpose: '隨時查詢庫存、可從料號 / 庫位 / 倉庫 3 個角度看。',
    features: [
      '料號維度：1 partId × N warehouse × M location',
      '庫位維度：1 locationId × N parts（純從 ledger aggregate）',
      '倉庫維度：1 warehouseId × N parts（含 4 KPI summary）',
    ],
  },
  'inventory.issue-report': {
    pageKey: 'inventory.issue-report',
    title: '⚠️ 異常回報',
    purpose: '統一管理庫存 5 類異常 × 5 類處置。',
    features: [
      '5 異常：D 損毀 / E 過期 / S 短缺 / L 放錯庫位 / O 其他',
      '5 處置：R 退貨 / W 保固 / C 重組 / D 報廢 / N 未處置',
      'L 放錯庫位時 locationId 必填',
      '銷退壞品 / 撿包配發現問題 / 盤點差異都進這張表',
    ],
    workflow: 'DRAFT → REPORTED → PROCESSING → CLOSED / CANCELLED',
  },
  'inventory.conversion': {
    pageKey: 'inventory.conversion',
    title: '🔄 重組 / 分解',
    purpose: '拆解或組裝零件、自動扣料入庫 + 成本加權。',
    features: [
      'M 重組：N inputs → 1 output、output unitCost = Σ 加權',
      'D 分解：1 input → N outputs、costRatio auto / manual',
      'POSTED 一步到位、要改要先作廢重建',
      'service 自動 invariant 校驗 inputs / outputs 數量平衡',
    ],
  },
  'inventory.location': {
    pageKey: 'inventory.location',
    title: '📍 庫位管理',
    purpose: '管理倉庫內的區 / 庫位（例：A 區 → A01 / A02）。',
    features: [
      '樹狀分區（A 區汽油車 / B 區柴油車）',
      '新增 / 編輯 / 停用',
      '配合產品設定「預設庫位」、進貨自動帶建議庫位',
    ],
  },
  'inventory.part-stock-setting': {
    pageKey: 'inventory.part-stock-setting',
    title: '⚙️ 產品庫存設定',
    purpose: '設每項產品的安全量 / 最高量 / 預設庫位。',
    features: [
      '安全量：低於觸發採購需求',
      '最高量：避免囤貨（盤點時 safety > max 警示）',
      '預設庫位：進貨建議上架位置',
      '可逐項設、也可從匯入精靈批次套',
    ],
  },

  // ─────────────────────────────────────
  // NX04 銷貨（5 工作台）
  // ─────────────────────────────────────
  'sale.quote': {
    pageKey: 'sale.quote',
    title: '📜 報價單工作台',
    purpose: '給客戶開報價、寄出、看接受 / 拒絕。',
    features: [
      '加料件行時自動顯示「該客戶上次買這料的價格」（歷史價提示）',
      '單價低於客戶等級最低售價 → 紅字警告必須補理由',
      '被銷貨單「拉走」後自動 ACCEPTED、同客戶同料件其他 QT 自動 CANCELLED',
      '可標來源：供應商 / 同行 / 庫存',
    ],
    workflow: 'DRAFT → SENT →（ACCEPTED 被 SO 拉走 / REJECTED / EXPIRED）→ CANCELLED',
  },
  'sale.so': {
    pageKey: 'sale.so',
    title: '🧾 銷貨單工作台',
    purpose: '客戶確認後開銷貨單、走撿貨 / 包貨 / 出貨流程。',
    features: [
      '⭐ 拉舊報價建單（非 1:1 轉換、可混合拉多張 QT + 補新行）',
      '⭐ 雙段狀態組合顯示：等貨 / 補貨中 / 等撿貨 / 撿包中 / 已出貨',
      '⭐ 任一行需向同行調貨 → 顯示 ⚠️ 黃色警示橫條 + 「建調貨單」按鈕',
      '可「先出有貨的、缺貨的等同行調來再補」',
    ],
    workflow: 'DRAFT → CONFIRMED（自動調撥）→ PICKING → SHIPPED → INVOICED / CANCELLED',
  },
  'sale.sr': {
    pageKey: 'sale.sr',
    title: '↩️ 銷退單工作台',
    purpose: '客戶退貨、收貨檢查、分流好品 / 壞品。',
    features: [
      '業務開單 → 倉管收貨檢查 → 過帳',
      '每行必填「好品 G」或「壞品 B」（過帳前擋）',
      '好品入主倉可再賣、壞品自動寫異常回報',
      '退款方式：R 退錢 / D 折讓 / X 換新（X 不沖庫存）',
    ],
    workflow: 'DRAFT → INSPECTING（倉管檢查、填 G/B + 庫位）→ POSTED / REJECTED',
    tip: '⚠️ returnMethod=X 換新可跳過 dispositionFlag 必填',
  },
  'sale.ti': {
    pageKey: 'sale.ti',
    title: '🔁 同行調貨單',
    purpose: '從銷貨單觸發、向同行調缺貨料。',
    features: [
      'SO 上「來源=同行」的行存在時、SO detail 出現黃色警示條',
      '按「建調貨單」開 modal、選同行 partnerId + 勾選要調的行',
      '建好 TI 草稿、跳轉到 NX02 TI 詳情頁填單價',
      '同行對象限 partner_type=O 或 canTransferStock=true',
    ],
    tip: '⭐ 客戶確定才調、不囤貨（v1.2 §6.4）',
  },
  'sale.customer-grade-history': {
    pageKey: 'sale.customer-grade-history',
    title: '📈 客戶等級變更',
    purpose: '業務員申請 → G 主管核可 → 自動更新等級 + 變更歷史。',
    features: [
      '客戶等級 ABCD 對應毛利率（12 / 15 / 18 / 22%）',
      '同客戶不允許重複 PENDING',
      '核可後該客戶所有後續 QT 自動套新毛利',
      '退回維持原等級',
    ],
    workflow: 'PENDING → APPROVED（自動更新 partner.customerGradeId）/ REJECTED',
  },

  // ─────────────────────────────────────
  // 主檔（部分核心、4 工作台）
  // ─────────────────────────────────────
  'master.partners': {
    pageKey: 'master.partners',
    title: '👥 往來對象主檔',
    purpose: '統一管理客戶 / 供應商 / 同行 / 銀行 / 廠商 / 物流 6 類。',
    features: [
      'partner_type 六分類：C 保養廠 / O 同行 / S 供應商 / T 物流 / B 銀行 / V 廠商',
      'O 同行特殊：能買也能調貨、canTransferStock=true',
      '客戶選單篩選 partner_type IN (C, O)',
      '可改等級 / 信用 / 付款條件 / 業務歸屬',
    ],
  },
  'master.parts': {
    pageKey: 'master.parts',
    title: '📦 零件主檔',
    purpose: '所有產品的基本資料 + 定價 + 改號關聯 + 車型適配。',
    features: [
      '公司定價 ABCD（成本 × 客戶等級毛利率自動算）',
      '改號關聯 nx01_part_relation',
      '車型適配 nx01_part_model（通用零件 / 專用零件）',
      '版本 nx01_part_version（規格變更歷史）',
    ],
  },
  'master.warehouses': {
    pageKey: 'master.warehouses',
    title: '🏭 倉庫主檔',
    purpose: '管理倉庫 + 倉管主管 + 結構化地址。',
    features: [
      '一個 tenant 一個主倉（isMain=true、partial unique）',
      '倉管主管 user 對應（離職時 SET NULL）',
      '結構化地址：縣市 / 鄉鎮 / 路街 / 巷 / 弄 / 號',
    ],
  },
  'master.users': {
    pageKey: 'master.users',
    title: '👤 員工主檔',
    purpose: '管理員工帳號 + 角色綁定。',
    features: [
      '可建 / 停用員工帳號',
      '掛角色（到「設定 → 角色與權限」建好角色後回來掛）',
      '一個員工可掛多個角色（業務 + 採購）',
      '首次登入強制改密碼',
    ],
    tip: '⚠️ 負責人不能停用（防止鎖死系統）',
  },

  // ─────────────────────────────────────
  // 設定（3 工作台）
  // ─────────────────────────────────────
  'settings.roles': {
    pageKey: 'settings.roles',
    title: '🔐 角色與權限',
    purpose: '⭐ v1.2 核心：負責人從零建角色、自由命名、組合系統權限。',
    features: [
      '完全不預設「業務角色該有什麼權限」、自己勾',
      '角色名稱完全自由（中文 / 英文 / 任何字串）',
      '系統提供 229 筆權限項目固定、不能新增',
      '可複製現有角色再微調',
      '停用角色 → 掛載員工自動失去權限',
    ],
    workflow: '建角色 → 勾權限 → 儲存 → 到「員工主檔」掛角色 → 員工生效',
  },
  'settings.system-param': {
    pageKey: 'settings.system-param',
    title: '⚙️ 系統參數',
    purpose: '全公司共用的系統參數。',
    features: [
      '⭐ 資料起算點（起算前歷史只進查詢、不計入報表）',
      '報價單預設有效期（1-365 天）',
      '客戶等級毛利率（連結到主檔 customer_grade）',
      '詢價單客套話（連結到 NX02 進貨）',
    ],
    tip: '⚠️ 資料起算點適合「舊公司轉系統」客戶、避免新報表被舊資料污染',
  },
  'settings.wizard': {
    pageKey: 'settings.wizard',
    title: '🪄 引導精靈',
    purpose: '重開匯入精靈 / 重置我的設定精靈。',
    features: [
      '匯入精靈：可隨時重新匯入舊資料',
      '設定精靈：重置後、所有頁面下次進去會再次跳引導',
      '重置只影響「我」、不影響其他員工',
    ],
  },
};

/// 給 ? 按鈕用的「強制重開」path（先去 reset 該 pageKey 旗標、再返回）
export function listAllPageKeys(): string[] {
  return Object.keys(PAGE_GUIDES);
}
