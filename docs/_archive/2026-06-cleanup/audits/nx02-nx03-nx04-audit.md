<!-- docs/_team/nx02-nx03-nx04-audit.md -->

# NX02 / NX03 / NX04 完整盤點報告

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應 main HEAD：`813d6fd`（NX04 LITE closure 後 git-state update）
> 任務性質：純盤點 / 不動程式碼 / 給 Alex 對藍圖 + 總經理拍板用
> 範圍：4 份清單（工作台 / Sidebar / RBAC / Mobile）

---

## ⚠️ 開頭警告 — 在看清單前先讀

掃完發現 3 件 Alex 對藍圖時必須注意的事：

### W1. `/dashboard/nx04` 的側邊選單仍指向「舊 placeholder」、不是 NX04 LITE 新工作台

`features/layout/config/side-menu.ts` 把 `/dashboard/nx04/*` 路由對到 `getNx03SideMenu()`、而 `menu.nx03.ts` 內容是舊的「銷售管理」menu（指向 `/nx04/domestic` / `/nx04/export` / `/nx04/customer` 三個 stub）。

我在 NX04-M3 C7 寫的 `menu.nx04.ts`（含「銷貨 LITE / 客戶 / 主管」7 entries 對應新工作台）**目前沒被任何路由叫到**。`side-menu.ts` 把 `/dashboard/nx05/*` 對到 `getNx04SideMenu()` —— 但 NX05 是財務模組、會看到銷貨 menu。

→ 修正需求：side-menu.ts 路由表 + menu.nxXX.ts 檔名兩件事一起調。

### W2. `menu.nxXX.ts` 檔名整套 off-by-one

| 檔案 | 內容對應到的業務模組 |
|------|---------------------|
| `menu.base.ts` (`getNx00SideMenu`) | NX01 主檔（base） |
| `menu.nx01.ts` (`getNx01SideMenu`) | NX02 採購（指 `/dashboard/nx02/*`） |
| `menu.nx02.ts` (`getNx02SideMenu`) | NX03 庫存（指 `/dashboard/nx03/*`） |
| `menu.nx03.ts` (`getNx03SideMenu`) | NX04 銷售（指 `/dashboard/nx04/*`） |
| `menu.nx04.ts` (`getNx04SideMenu`) ⭐ | NX04 LITE 新工作台（M3 C7 寫的） |
| `menu.nx05.ts` | （要查） |
| ... | ... |

歷史包袱：NX 編號改過、檔名沒跟著改。對齊範式時要不要 rename 是 Alex 拍板事項。

### W3. 同個業務模組有「兩套並存」UI 系統

| 業務模組 | UI 系統 A | UI 系統 B |
|---------|----------|----------|
| 採購 NX02 | `/dashboard/purchase/*`（hub-driven、含 mobile SOP 9 步、桌面 step cards）| `/dashboard/nx02/*`（LITE 新功能：保固/客套話/...、+ 多個 NxWorkspacePlaceholder stub）|
| 庫存 NX03 | `/dashboard/inventory/*`（NX03 LITE 主場、stocktake/stock-query/issue-report/conversion + mobile workstation 撿/包/送）| `/dashboard/nx03/*`（只 2 個：`/workspace` + `/warehouse-setting`、看似舊路由）|
| 銷貨 NX04 | `/dashboard/sale/*`（舊 hub + mobile SOP 9 步 + `/sale/{qt,so,return,sop-demo,docs/*}`）| `/dashboard/nx04/*`（NX04 LITE 新做的：quote / sales-order / sales-return / partner-grade-history、+ stub redirect）|

且還有第三條孤兒分支：採購 NX02 hub 自己內部又指向 `/dashboard/nx01/*`（看似更舊的 LITE 階段 1 路由：`/nx01/rfq`、`/nx01/po`、`/nx01/rr`、`/nx01/pr`）。

→ Alex 對藍圖時必須拍板「哪一條保留、哪一條砍 / redirect」。

---

## 【清單 1】NX02 / NX03 / NX04 完整工作台路徑表

### 1.1 NX02 採購（業務）

| 工作台 | URL 路徑 | 列表 | 詳情 | 對應後端 module | 對應 features/ |
|--------|---------|------|------|----------------|---------------|
| 採購中心 hub（hub-driven）| `/dashboard/purchase` | — | — | — | `features/layout/ui/module-hub` |
| 詢價單 RFQ | `/dashboard/purchase/rfq` | ✅ | ⚠️ 無 `[id]` route（單檔 page） | `nx02/rfq` | `features/purchase/...?` 未進 features/purchase 內 |
| 採購單 PO | `/dashboard/purchase/po` | ✅ | ⚠️ 同上 | `nx02/po` | 同上 |
| 進貨單 RR | `/dashboard/purchase/rr` | ✅ | ⚠️ 同上 | `nx02/rr` | 同上 |
| 國內採購工作台 | `/dashboard/purchase/domestic` | ✅ | — | `nx02/purchase-stage` | `features/purchase/domestic/PurchaseDomesticWorkbenchView.tsx` |
| 產品管理 | `/dashboard/purchase/product` | ✅ | — | `nx02/...` | `features/purchase/product/PurchaseProductManagementView.tsx` |
| 廠商管理 | `/dashboard/purchase/vendor` | ✅ | — | `nx01/supplier-grade` | `features/purchase/vendor/PurchaseVendorManagementView.tsx` |
| SOP 精品示範（mobile）| `/dashboard/purchase/sop-demo` | — | — | （demo / mock）| `features/purchase/ui/sop-workspace/MobilePurchaseSopPage.tsx`（Step1Requirements + Step2Inquiry + StepPlaceholder × 7）|
| **以下是 `/nx02/*` 平行路由（LITE 階段 1 新做）** | | | | | |
| NX02 進貨 hub | `/dashboard/nx02` | — | — | — | （app/dashboard/nx02/page.tsx 內聯）|
| 國內採購（stub）| `/dashboard/nx02/domestic` | ❌ placeholder | ❌ | （UI 未做、stub）| — |
| 國外採購（stub）| `/dashboard/nx02/import` | ❌ placeholder | ❌ | （UI 未做）| — |
| 特殊採購（stub）| `/dashboard/nx02/special` | ❌ placeholder | ❌ | — | — |
| 產品（stub）| `/dashboard/nx02/product` | ❌ placeholder | ❌ | — | — |
| 廠商（stub）| `/dashboard/nx02/vendor` | ❌ placeholder | ❌ | — | — |
| 進貨需求 init | `/dashboard/nx02/init` | ✅ | ✅ `[id]` + `new` | `nx02/...` | `features/nx02/init/...` |
| 保固申請單 ⭐ | `/dashboard/nx02/warranty-claim` | ✅ | — | `nx02/warranty-claim` | `features/nx02/warranty-claim/...` |
| 客套話設定 ⭐ | `/dashboard/nx02/rfq-greeting-template` | ✅ | — | `nx02/rfq-greeting-template` | `features/nx02/rfq-greeting-template/...` |
| 自動補貨 | `/dashboard/nx02/auto-replenish` | ✅ | — | `nx03/auto-replenish`（deprecated）| `features/nx02/auto-replenish` ⚠️ NX03 已標 deprecated |
| 庫存 balance | `/dashboard/nx02/balance` | ✅ | — | `nx03/stock-balance` ⚠️ | `features/nx02/balance` ⚠️ 看似誤分類到 NX02 |
| 庫存 ledger | `/dashboard/nx02/ledger` | ✅ | — | `nx03/stock-ledger` ⚠️ | `features/nx02/ledger` ⚠️ |
| 缺料分析 | `/dashboard/nx02/shortage` | ✅ | — | `nx02/...` | `features/nx02/shortage` |
| 安全量 stock-setting | `/dashboard/nx02/stock-setting` | ✅ | — | `nx03/part-stock-setting` ⚠️ | ⚠️ |
| 盤點單 stock-take | `/dashboard/nx02/stock-take` | ✅ | ✅ `[id]` + `new` | `nx03/stocktake` ⚠️ | `features/nx02/stock-take` ⚠️ 實際是庫存盤點、誤掛 NX02 |
| 調撥單 transfer | `/dashboard/nx02/transfer` | ✅ | ✅ `[id]` + `new` | `nx03/transfer` ⚠️ | `features/nx02/transfer` ⚠️ 同上 |

⚠️ NX02 觀察：`/nx02/{balance,ledger,stock-take,transfer,stock-setting,auto-replenish}` 6 條路由實際是「庫存」業務、不是「採購」。這是 LITE 路線轉向前的舊 by-module 範式殘留、跟現在新 `/dashboard/inventory/*` LITE 重疊。

**NX02 後端 controller 完整列表（11 支）**：
`partner-part / po / price-comparison / purchase-return / purchase-stage / purchase-suggestion / qt / rfq / rfq-greeting-template / rr / warranty-claim`

⚠️ 注意：`nx02/qt` controller 存在（採購端 QT 詢價）、跟 `nx04/quote`（銷貨端 QT 報價）是**不同業務概念**、容易混淆。

---

### 1.2 NX03 庫存（倉管）

| 工作台 | URL 路徑 | 列表 | 詳情 | 對應後端 module | 對應 features/ |
|--------|---------|------|------|----------------|---------------|
| 庫存中心 hub | `/dashboard/inventory` | — | — | — | `features/inventory/ui/hub` + `InventoryHubMobile` |
| 庫存查詢（3 維度）⭐ | `/dashboard/inventory/stock-query` | ✅ | — | `nx03/stock-query` | `features/inventory/stock-query/StockQueryView.tsx` |
| 異常回報 ⭐ | `/dashboard/inventory/issue-report` | ✅ | ✅ `[id]` | `nx03/issue-report` | `features/inventory/issue-report/ui/...` |
| 重組 / 分解 ⭐ | `/dashboard/inventory/conversion` | ✅ | ✅ `[id]` | `nx03/conversion` | `features/inventory/conversion/ui/...` |
| 盤點工作台 ⭐ | `/dashboard/inventory/stocktake` | ✅ | ✅ `[id]` | `nx03/stocktake` | `features/inventory/stocktake/ui/...` |
| 庫位設定 | `/dashboard/inventory/warehouse/locations` | ✅ | — | `nx01/location`（主檔）| `features/inventory/locations/LocationsView.tsx` |
| 產品設定（安全量 / 預設庫位）| `/dashboard/inventory/part-stock-setting` | ✅ | — | `nx03/part-stock-setting` | `features/inventory/part-stock-setting/...` |
| 盤點配置（PRO）| `/dashboard/inventory/warehouse/stocktake-config` | ✅ | — | `nx03/...` | `features/inventory/warehouse/stocktake-config/MobileStocktakeConfigPage.tsx` |
| **工作站 mobile 視圖**（撿/包/送/調撥/同行調撥取貨）| | | | | |
| 撿貨 picking | `/dashboard/inventory/picking` | ✅ mobile | — | `nx03/pk` | `features/inventory/workstation/picking/MobilePickingListPage.tsx` |
| 包貨 packing | `/dashboard/inventory/packing` | ✅ mobile | — | `nx03/pl` | `features/inventory/workstation/packing/MobilePackingListPage.tsx` |
| 送貨 delivery | `/dashboard/inventory/delivery` | ✅ mobile | — | `nx06/dn-ops` | `features/inventory/workstation/delivery/MobileDeliveryListPage.tsx` |
| 調貨單 transfer | `/dashboard/inventory/transfer` | ✅ mobile | — | `nx03/transfer` | `features/inventory/workstation/transfer/MobileTransferListPage.tsx` |
| 同行調貨取貨 ti | `/dashboard/inventory/ti` | ✅ mobile | — | `nx02/...` | `features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx` |
| 進貨驗收（mobile）| `/dashboard/inventory/receiving` | ✅ mobile | — | `nx03/inbound` | `features/inventory/...?` |
| **以下是 `/nx03/*` 平行路由（少量）** | | | | | |
| 庫存模組首頁 | `/dashboard/nx03` | — | — | — | （hub）|
| 庫存作業工作台 | `/dashboard/nx03/workspace` | ✅ | — | `nx03/...` | `features/inventory/workspace/ui/InventoryWorkspacePage.tsx` |
| 庫位 / 安全量設定 | `/dashboard/nx03/warehouse-setting` | ✅ | — | `nx01/warehouse`（主檔）| — |

**NX03 後端 controller 完整列表（19 支）**：
`auto-replenish（deprecated）/ brand-allocation-rule / conversion / disposal / inbound / init / outbound / parcel / pk / pl / stock-balance / stock-ledger / stock-reservation / transfer / issue-report / part-stock-setting / stock-query / stocktake / ...`

⚠️ NX03 觀察：路由集中度高、`/dashboard/inventory/*` 是真實主場、`/dashboard/nx03/*` 只剩 2 條低活躍路由。架構最乾淨。

---

### 1.3 NX04 銷貨（業務 + 倉管）

| 工作台 | URL 路徑 | 列表 | 詳情 | 對應後端 module | 對應 features/ |
|--------|---------|------|------|----------------|---------------|
| **舊 `/dashboard/sale/*`（hub-driven、含 mobile SOP）** | | | | | |
| 銷售中心 hub | `/dashboard/sale` | — | — | — | `features/sale/ui/hub` + `SalesHubMobile` |
| 報價 qt（舊路徑）| `/dashboard/sale/qt` | ✅ | — | `nx04/quote` | （app 頁面內聯）|
| 銷貨 so（舊路徑）| `/dashboard/sale/so` | ✅ | — | `nx04/so` | 同上 |
| 銷退 return（舊路徑）| `/dashboard/sale/return` | ✅ | — | `nx04/sales-return` | 同上 |
| 保固申請（舊路徑）| `/dashboard/sale/warranty` | ✅ | — | `nx02/warranty-claim` | 同上 |
| 國外銷售（舊路徑）| `/dashboard/sale/export` | ✅ | — | — | 同上 |
| SOP 精品示範（mobile 9 步）| `/dashboard/sale/sop-demo` | — | — | （demo）| `features/sale/ui/sop-workspace/MobileSaleSopPage.tsx`（Step1~Step9）|
| 詢價清單（mobile）| `/dashboard/sale/inquiry` | ✅ | ✅ `[rfqId]` | `nx02/rfq` | `features/sale/ui/inquiry/Mobile*.tsx` |
| 客戶資訊 | `/dashboard/sale/customer/info` | ✅ | — | `nx01/partner`（主檔）| — |
| 客戶分析 | `/dashboard/sale/customer/analysis` | ✅ | — | `nx04/sales-performance` | — |
| 客戶等級設定 | `/dashboard/sale/customer/grading` | ✅ | — | `nx01/customer-grade`（主檔）| — |
| 單據群組（docs）| `/dashboard/sale/docs/{inquiry,orders,quote,return,sales,transfer,warranty}` | ✅ | quote 有 `[qtId]` | 多個 | — |
| **新 `/dashboard/nx04/*`（M3 C7 closure 後）** ⭐ | | | | | |
| NX04 LITE hub | `/dashboard/nx04` | — | — | — | `app/dashboard/nx04/page.tsx`（內聯卡片）|
| 報價單 QT | `/dashboard/nx04/quote` | ✅ | ✅ `[id]` | `nx04/quote` | `features/sale/quote/ui/Quote{List,Detail}View.tsx` |
| 銷貨單 SO | `/dashboard/nx04/sales-order` | ✅ | ✅ `[id]` | `nx04/so` | `features/sale/so/ui/So{List,Detail}View.tsx + CreateTiFromSoModal` |
| 銷退單 SR | `/dashboard/nx04/sales-return` | ✅ | ✅ `[id]` | `nx04/sales-return` | `features/sale/sales-return/ui/SalesReturn{List,Detail}View.tsx` |
| 客戶等級變更 | `/dashboard/nx04/partner-grade-history` | ✅ | — | `nx04/partner-grade-history` | `features/sale/partner-grade-history/ui/GradeHistoryListView.tsx` |
| 主管待核可清單 | `/dashboard/owner/grade-approvals` | ✅ | — | `nx04/partner-grade-history` | 同上元件、不同 props |
| 國內銷售（stub → redirect）| `/dashboard/nx04/domestic` | redirect to /sales-order | — | — | — |
| 國外銷售（stub → redirect）| `/dashboard/nx04/export` | redirect to /sales-return | — | — | — |
| 客戶管理（stub）| `/dashboard/nx04/customer` | ❌ placeholder | — | — | — |

**NX04 後端 controller 完整列表（9 支）**：
`co-estimate / credit-guard / sales-performance / sales-return / so/translator / issue-report / partner-grade-history / quote / so`

⚠️ NX04 觀察：兩條路徑並存最嚴重。`/sale/*` 還有 SOP 9 步 mobile workflow、`/nx04/*` 是 LITE 新桌面範式。Alex 對藍圖時要拍板兩條合一還是分業務員 vs 倉管。

---

### 1.4 跨模組「客戶 / 產品 / 倉庫」主檔位置

- **主檔層的 master**：`features/shared/master/*`（9 active modules：brand / car-brand / location / lookup / part / partner / role / role-view / warehouse）— NX01 鋼鐵星球範式遷移後的家
- **客戶等級**：`nx01/customer-grade`（主檔）→ `/dashboard/base/...` 或 `/dashboard/sale/customer/grading`
- **客戶等級變更**：NX04-M3 新做 `features/sale/partner-grade-history/`（屬銷貨模組業務行為、非主檔）
- **產品定價 ABCD**：在 `features/shared/master/part`（後端 `nx01/part` + part 主檔）
- **倉庫 / 庫位**：在 `features/shared/master/warehouse` + `features/shared/master/location`
- ⚠️ 觀察：`features/shared/master/` 目前只有 `role-view/ui/RoleViewMatrix.tsx` 一個 UI 檔被 glob 抓到、其他模組的 UI 應該在 `app/dashboard/base/...` 路徑下、走鋼鐵星球範式 `EntityMasterPage`（bypass DashboardShell）

### 1.5 「國外進貨」相關工作台有沒有獨立

- **國外採購** `/dashboard/nx02/import`：⚠️ 目前是 placeholder stub、實際後端有 `nx02/po purchaseType=F`（國外）+ `nx02/rr` 國外驗收（按金額比例攤匯費）+ 提貨單 `nx03/parcel`、UI 未做（屬 LITE 待補 / PLUS 階段）
- **提貨單** `nx03/parcel`：後端 controller 存在、UI 未見專屬工作台
- **驗收單**：採購驗收走 `/dashboard/purchase/rr`、銷退倉管驗收走 NX04 SR INSPECTING（不獨立驗收單）

---

## 【清單 2】Sidebar / Menu 結構

### 2.1 一級分類

目前**混合範式**：頂欄星球（HomeTopBar）切換主模組、左側 SubNav（SideMenu）顯示模組子選單。

- **頂欄星球**：每個主模組（base / purchase / sale / inventory / finance / report + nx02~nx10 編號路由）一顆星球
- **左側 SubNav**：由 `resolveSideMenuGroups(pathname)` 動態決定
  - `/dashboard/base` → 空（鋼鐵星球範式自帶 MasterShell）
  - `/dashboard/purchase` → 空（hub-driven）
  - `/dashboard/sale` → 空（同上）
  - `/dashboard/inventory` → 空（同上）
  - `/dashboard/finance` → 空
  - `/dashboard/report` → 空
  - `/dashboard/nx02/{domestic,import,special,product,vendor}` → 空（hub-driven，這 5 條跟 /purchase 重疊）
  - `/dashboard/nx03/*` → `getNx02SideMenu()`（庫存 menu）
  - `/dashboard/nx04/*` → `getNx03SideMenu()`（銷售 menu，**stale**、指向 `/nx04/domestic` 等 stub）⚠️
  - `/dashboard/nx05/*` → `getNx04SideMenu()`（**NX04 LITE menu**、被掛在 NX05 路由 = 死的）⚠️
  - `/dashboard/nx06/*` → `getNx06SideMenu()`
  - `/dashboard/nx07/*` → `getNx07SideMenu()`
  - `/dashboard/nx08/*` → `getNx08SideMenu()`
  - `/dashboard/nx09/*` → `getNx09SideMenu()`
  - `/dashboard/nx10/*` → `getNx10SideMenu()`

### 2.2 二級項目（各 menu.nxXX.ts 內容摘要）

#### menu.base.ts（`getNx00SideMenu` = NX01 主檔）
5 groups / 16 entries：
- 帳號與權限（base/users, /roles, /role-view, /bulletins）
- 產品與料號（parts, car-brand, part-brand, part-group, brand-code-rule, part-relation, part-model）
- 國家與幣別（country, currency）
- 倉儲（site, warehouses, location）
- 往來對象（partners）

#### menu.nx01.ts（`getNx01SideMenu` = NX02 採購）
1 group / 6 entries：
- 採購管理（home/domestic/import/special/product/vendor、全指 `/dashboard/nx02/*` stub）⚠️ 跟 `/purchase` hub 重疊

#### menu.nx02.ts（`getNx02SideMenu` = NX03 庫存）
1 group / 3 entries：
- 庫存管理（home → `/nx03/workspace`、workspace、setting → `/nx03/warehouse-setting`）⚠️ 沒指到 `/dashboard/inventory/*` LITE 主場

#### menu.nx03.ts（`getNx03SideMenu` = NX04 銷售）
1 group / 4 entries：
- 銷售管理（home/domestic/export/customer、全指 `/dashboard/nx04/*` stub）⚠️ 沒指到 quote/sales-order/sales-return LITE 主場

#### menu.nx04.ts（`getNx04SideMenu` = NX04 LITE 新做的）⭐
2 groups / 7 entries：
- 銷貨 LITE（home/quote/sales-order/sales-return → `/nx04/*` 真實工作台）
- 客戶 / 主管（partner-grade-history / owner/grade-approvals / customer）

⚠️ **此 menu 目前不會出現在任何 NX04 路徑下**（side-menu.ts 把它掛在 `/nx05/*`）。

#### menu.nx05~10.ts
未在本軌掃描範圍、按命名應為財務 / 物流 / 人資 / 報表 / 知識中心 / 員工激勵。

### 2.3 裝置切換（手機 vs 電腦）

各 hub 有自己的處理：
- **採購 hub** `/dashboard/purchase`：桌面所有 section 全列、手機底部 tabs（`MobileHubSectionTabs`）切 master/domestic/special
- **銷售 hub** `/dashboard/sale`：桌面用舊 2 section（MasterSection + DomesticSection）、手機完全走 `SalesHubMobile` 4 分區架構（狀態追蹤 / 工作站 / 單據 / 客戶）
- **庫存 hub** `/dashboard/inventory`：桌面 4 section、手機走 `InventoryHubMobile` 4 分區
- **NX04 LITE hub** `/dashboard/nx04`：5 張卡片 grid、**沒有手機 / 桌面分流**（同一 UI）⚠️

切換邏輯：CSS 斷點（`hidden lg:block` / `lg:hidden`）+ Mobile 元件用 URL query `?section=` 持久化分區狀態。

---

## 【清單 3】RBAC 角色框架現況

### 3.1 既有角色 enum（從 `@Roles(...)` 用法統計）

實際出現過的角色字串：

| 角色 code | 出現次數（粗估）| 業務語意 |
|----------|---------------|---------|
| `SYSADMIN` | 全部 controller（120+）| NEXORA 跨租戶系統管理 |
| `OWNER` | 全部 controller（120+）| 客戶最高權限（單租戶內） |
| `PURCHASING` | NX02 採購 controller 6 處 | 採購人員（qt/po/rr/rfq-greeting/price-comparison/purchase-stage/partner-part/purchase-suggestion） |
| `SALES` | NX02 qt + NX04 sales-performance + NX08 sales-rep-dashboard + warranty-claim | 業務員 |
| `WAREHOUSE` | NX06 dn-ops/dynamic-handover/lalamove/printer/return-pickup/route-optimization/web-push + NX08 warehouse-staff/warehouse-lead | 倉管 / 出貨人員 |
| `FINANCE` | NX08 finance-dashboard | 財務 |
| `HR` | NX07 training | 人資 |
| `HR_ADMIN` | NX10 mentorship/promotion/sprint/team-task + NX09 sub-tables + NX07 salary-accrual | 人資管理 |

### 3.2 RBAC 實際 enforce 程度

`roles.guard.ts` 邏輯：
```
1. 沒設 @Roles → 直接放行
2. SYSADMIN 或 OWNER → 全通行（hardcoded）
3. 其他角色 → 比對 user 的 nx01_user_role 表
```

**多數 controller 寫法**：`@Roles('SYSADMIN', 'OWNER')` → 實際等於「只有最高權限能用」、沒分業務 / 倉管 / 送貨。

**有細分的 controller**（少數）：
- NX02 採購系列：加 `PURCHASING`、業務員 `SALES`
- NX06 物流：加 `WAREHOUSE`
- NX08 dashboard：依角色決定看哪個 dashboard（owner / sales-rep / warehouse-staff / warehouse-lead / purchasing / finance）
- NX10 員工激勵：加 `HR_ADMIN`

### 3.3 NX04 銷貨 controller RBAC 現況

| Controller | @Roles | 應有的設計 |
|-----------|--------|----------|
| `nx04/so` | `SYSADMIN, OWNER` | 應加 `SALES` |
| `nx04/quote` | `SYSADMIN, OWNER` | 應加 `SALES` |
| `nx04/sales-return` | `SYSADMIN, OWNER` | 應加 `SALES`、INSPECTING 階段給 `WAREHOUSE` |
| `nx04/partner-grade-history` | `SYSADMIN, OWNER` | approve / reject 應 OWNER only（已列 FU-sales-lite-04）|
| `nx04/issue-report` | `SYSADMIN, OWNER` | 全員可用 |
| `nx04/sales-performance` | `SYSADMIN, OWNER, SALES` ✅ | 對 |
| `nx04/credit-guard` | （未確認）| — |

### 3.4 user 表 / role 表結構

從 RolesGuard 推回：
- `nx01_user_role`（user × role m-n、含 isActive）
- `nx01_role`（含 code 唯一、isActive）
- 用戶可掛多個角色（一個業務員可同時是 `SALES` + `PURCHASING`、視業務分配）

### 3.5 三租戶 seed 每 tier 的 admin 角色

| Tier | tenantId | seed admin |
|------|----------|-----------|
| SYSTEM | `NX99TANT0000000` | SYSADMIN（NEXORA team）|
| LITE | `NX99TANT9900001` | admin + 系統範本（無業務假資料）|
| PLUS | `NX99TANT9900002` | 同上 + users 7 筆 + admin 角色指派 |
| PRO | `NX99TANT9900003` | 同 PLUS、tier=PRO 配置（6 倉庫 / 6 部門 / 7 team）|

PLUS / PRO seed 帶 7 個 user、role 全給 admin、leader 5 個（PRO）。

⚠️ 沒有「業務員」「倉管」「送貨」這種 mock 角色 seed、所有租戶都 admin = OWNER 等級。

---

## 【清單 4】Mobile 既有狀況

### 4.1 features/sale/* 既有 Mobile 結構

#### a. `features/sale/ui/hub/SalesHubMobile.tsx`（銷售中心 mobile hub）
- 4 分區 tabs（URL query `?section=status|workstation|documents|customer`）
- 對應 4 sub-section：`StatusSection / WorkstationSection / DocumentsSection / CustomerSection`
- 走 `/dashboard/sale` 路由、桌面 / 手機 CSS 斷點分流

#### b. `features/sale/ui/inquiry/`（業務 mobile 詢價工作站）
- `MobileInquiryListPage.tsx` — 待詢價清單
- `MobileInquiryDetailPage.tsx` — 單筆詢價詳情
- `MobileQTDetailPage.tsx` — 報價單詳情
- 元件：`AdoptQuoteDialog / VendorQuoteInput / VendorQuoteItem / InquiryListItem / ConfirmDialog`
- 走 `/dashboard/sale/inquiry`、`/dashboard/sale/inquiry/[rfqId]` 路由
- 業務語意：業務員在外面用手機問價、回來在 app 內接 vendor 報價、選擇採用 → 自動建 QT
- ⚠️ **接的是 nx02/rfq 後端**（採購詢價、不是 nx04/quote 銷貨報價）— 是「外面跟同行問價」、不是「給客戶開報價」

#### c. `features/sale/ui/sop-workspace/`（業務員 9 步精品 SOP）
9 個 Step 元件：
1. `Step1SelectCustomer` — 選客戶
2. `Step2SearchParts` — 搜料件
3. `Step3QuoteList` — 報價清單
4. `Step4QuoteMethod` — 報價方式（書面/口頭）
5. `Step5CustomerDecide` — 客戶決定（接受/部分接受/拒絕）
6. `Step6DeliveryMethod` — 配送方式
7. `Step7SignMethod` — 簽收方式
8. `Step8OrderComplete` — 訂單完成
9. `Step9Summary` — 總結

支援元件：`HistoryQuoteAlert / MarginAlert / OutOfStockDialog / PartialAcceptDialog / PriceAdjustDialog / RejectReasonDialog / SignaturePadModal / AddMoreDialog / ConsiderDialog / FloatingToast / ImageLightbox`
走 `/dashboard/sale/sop-demo` 路由、`MobileSaleSopPage.tsx` 主元件
業務語意：業務員拜訪客戶時、用手機逐步走完詢價→報價→銷貨整套流程、防呆設計

⚠️ **跟 NX04 LITE 桌面版範式不同方向**：LITE 走「業務員回 office 用桌面建立 QT/SO/SR」、SOP 走「業務員在客戶現場用手機 9 步」。

#### d. fulfillment（撿/包/送）
⚠️ 沒在 `features/sale/` 下、實際在 `features/inventory/workstation/` —— 屬倉管的工作。

### 4.2 mock-data 還是真實 API

- **SalesHubMobile + 4 sections**：sections 是 hub 卡片、本身不打 API、點進去才打
- **inquiry mobile**：⚠️ 看似有 hook 但需要追實際 fetch 行為（沒確認）
- **sop-workspace 9 步**：⚠️ 由命名判斷是 demo / mock data、要追 hook
- **inventory workstation mobile**：HANDOFF 揭露 `InventoryHubMobile + MobileLocationListPage 用 mock data、未接真實 API`（FU-stock-lite-03）

### 4.3 對應「進貨 / 撿貨 / 包貨 / 配送 / 盤點」五窗口

| 窗口 | 對應 mobile UI | 路徑 | 是否真實 |
|------|---------------|------|---------|
| 進貨驗收 | `MobileReceiving*`（未列）| `/dashboard/inventory/receiving` | ⚠️ |
| 撿貨 | `MobilePickingListPage` | `/dashboard/inventory/picking` | ⚠️ FU-stock-lite-03 mock |
| 包貨 | `MobilePackingListPage` | `/dashboard/inventory/packing` | ⚠️ mock |
| 配送 | `MobileDeliveryListPage` | `/dashboard/inventory/delivery` | ⚠️ mock |
| 盤點 | `StocktakeDetailView`（桌面 + mobile 共用?）| `/dashboard/inventory/stocktake/[id]` | ✅ 接真實 API |
| 調撥（額外）| `MobileTransferListPage` | `/dashboard/inventory/transfer` | ⚠️ |
| 同行調撥取貨（額外）| `MobileInquiryPickupListPage` | `/dashboard/inventory/ti` | ⚠️ |

「五窗口」對齊度：**部分對齊**、撿/包/送 mobile UI 在、但是 mock data、未接真實 API。

### 4.4 features/purchase / features/inventory 的 Mobile

#### purchase mobile
- `features/purchase/ui/sop-workspace/MobilePurchaseSopPage.tsx`（採購版 SOP demo）
- 只 2 個 Step（Requirements / Inquiry）+ 7 個 StepPlaceholder
- 走 `/dashboard/purchase/sop-demo`
- ⚠️ 跟銷售 SOP 同範式、但只做了前 2 步

#### inventory mobile
- `features/inventory/ui/hub/InventoryHubMobile.tsx`（庫存中心 mobile hub、4 分區）
- workstation 5 個 mobile：picking / packing / delivery / transfer / ti
- `features/inventory/warehouse/{locations,stocktake-config}/Mobile*.tsx`（倉位 / 盤點配置）
- shared 元件：`DocStatusBadge`

### 4.5 可不可以拆出來做基礎 vs 砍掉重做

**Hank 客觀觀察（給 Alex 對藍圖參考、非建議）**：

| 模組 | 評估 |
|------|------|
| `features/sale/ui/hub` | ✅ 結構乾淨、可拆 / 改造 — 4 分區 tabs 範式跟 hub-driven 一致 |
| `features/sale/ui/inquiry`（業務手機詢價）| ⚠️ 業務語意值得保留（業務員外面跟同行問價）、但要決定**接 nx02/rfq 還是 nx04/quote** |
| `features/sale/ui/sop-workspace`（9 步 demo）| ⚠️ 元件齊全、但與 LITE「業務員回 office 用桌面」方向**不同**、是「業務員客戶現場用手機」、保留 vs 砍要 Alex 拍 |
| `features/inventory/workstation/*`（撿/包/送/調撥）| ⚠️ UI 已建、但 mock data、未接 API（FU-stock-lite-03）— 接 API 後可用 |
| `features/purchase/ui/sop-workspace` | ⚠️ 只做 2 步、跟銷售 SOP 同範式但 demo 早於 LITE 階段 1、可能可砍 |

---

## §X 結尾觀察 — 給 Alex 對藍圖時注意的事

### X.1 三個面向的「兩套並存」要拍板優先

每個業務模組目前都有「hub-driven `/dashboard/{業務}/*`」+「NX 編號 `/dashboard/nxXX/*`」兩條路徑：
- 採購：`/purchase` vs `/nx02`（+ 還有 `/nx01` 一條 LITE 階段 1 的舊路徑、由 NX02 hub 內聯指過去）
- 庫存：`/inventory` vs `/nx03`
- 銷貨：`/sale` vs `/nx04`

要不要統一、用哪一條當主、Alex 對藍圖時必須先拍。

### X.2 menu.nxXX.ts 檔名跟 side-menu.ts 路由表全錯位

- 檔名 nx01 ~ nx04 對應的業務模組是 NX02 ~ NX04 LITE（off-by-one）
- side-menu.ts 把 `/nx05/*` 對到我寫的 NX04 LITE menu、`/nx04/*` 對到 stale 銷售 menu
- 我寫的 NX04 LITE menu **目前不會出現在任何 NX04 路徑下**

Alex 拍板「整套重命名 menu.purchase.ts / menu.sale.ts / menu.inventory.ts」是否要做。

### X.3 RBAC 角色細分目前極淺

99% controller 寫 `@Roles('SYSADMIN', 'OWNER')`、只少數加 `PURCHASING / SALES / WAREHOUSE / FINANCE / HR(_ADMIN)`。

要分業務 / 倉管 / 送貨 / 主管 / 老闆五大角色 enforce、需要：
1. 整套 controller 改 @Roles 細分
2. seed 三租戶帶這 5 角色的測試 user
3. 前端依角色決定哪些 hub / 卡片可見（已部分有：`master-cards.ts` 用 minPlan、但無 minRole）

### X.4 Mobile 既有「兩種設計方向」並存

- **A 方向（SOP 9 步精品）**：業務員在客戶現場手機走完整流程、防呆 dialog、demo 已建但 mock
- **B 方向（4 分區 hub）**：業務員 / 倉管手機看狀態追蹤 / 工作站、跟桌面同 hub 不同 layout、已接真實 hub 結構

跟總經理「進貨 / 撿貨 / 包貨 / 配送 / 盤點」五窗口的關係：
- **B 方向**：對齊度高（工作站子分區就是五窗口）、UI 已建、缺接 API
- **A 方向**：跟五窗口無直接對應（A 是業務員流程、B 是各工作站視窗）

Alex 對藍圖時可能要：(1) 保留 B、砍 A、(2) 兩條並存（A 給業務、B 給倉管）、(3) 重定義 A 的業務語意

### X.5 國外進貨 / 提貨單 UI 完全缺

`/dashboard/nx02/import` 是 placeholder、後端有完整 `nx02/po purchaseType=F` + 國外驗收費用攤分公式。NX03 `parcel`（提貨單）controller 有、UI 沒做。**屬 LITE 階段 1 後續軌或 PLUS 才啟動**。

---

> 盤點完成。本檔純現況、不含遷移建議 / 拍板結論。
> 下一步：Alex 對總經理重整的藍圖、整理出落差表 + 路線、再 step-by-step 做。
