<!-- docs/nx03/nx03-audit-03.md -->

# NX03-AUDIT-03 — 舊 NX02 庫存業務資產揭露（重塑前置）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx03/、Crown 拍板後再決定要不要 commit）
> 撰寫者：Hank
> 日期：2026-05-15
> 真實 main HEAD：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
> 對應前置：[nx03-audit-01.md](nx03-audit-01.md)、[nx03-audit-02.md](nx03-audit-02.md)
> 戰略背景：Crown 拍板「重塑」路線、不搬遷、分支獨立重塑、main 保網頁運作

---

## 0. 開場 — AUDIT-02 真相校正 + 兩個重大發現（先看）

### 0.1 校正 AUDIT-02 #13~#17 錯誤標記

⚠️ AUDIT-02 表 1 第 #13~#17 把 `/dashboard/nx02/{domestic,import,special,product,vendor}` 5 個標為「庫存業務」**錯誤**。真相 verify：
- `/dashboard/nx02/domestic/page.tsx` 第 9 行：**「國內採購作業工作台」**（functionCode `NX02-PO-UI-001-F01`）
- `/dashboard/nx02/import/page.tsx`：**「國外採購作業工作台」**（PLUS）
- `/dashboard/nx02/special/page.tsx`：**「特殊採購」**（掃貨、機會採購）
- `/dashboard/nx02/product/page.tsx`：**「產品管理」**（定價、安全量、廠商關係）
- `/dashboard/nx02/vendor/page.tsx`：**「廠商管理」**（廠商主檔與評鑑）

→ 5 個 page.tsx 全是 `NxWorkspacePlaceholder` 空殼、且是**新 NX02 採購**的 placeholder（非舊庫存殘留）。

⭐ **校正後**：`/dashboard/nx02/*` 共 13 路由 = **8 舊庫存實體**（balance/ledger/init/stock-take/transfer/stock-setting/shortage/auto-replenish）+ **5 新採購 placeholder**（domestic/import/special/product/vendor）。本 AUDIT-03 聚焦前者 8 條。

### 0.2 ⚠️ 重大發現：Frontend ↔ Backend API 路徑斷裂

| Frontend API call | Backend Controller 路徑 | 狀態 |
|---|---|---|
| `/nx02/balance` | `nx03/stock-balance` | ❌ 路徑斷裂 |
| `/nx02/balance/summary` | （未提供）| ❌ 死路徑 |
| `/nx02/balance/dashboard` | （未提供）| ❌ 死路徑 |
| `/nx02/ledger` | `nx03/stock-ledger` | ❌ 路徑斷裂 |
| `/nx02/init`、`/nx02/init/{id}/post`、`/void` | （後端 0 條 init endpoint）| ❌ 死路徑 |
| `/nx02/stock-take`、`/post`、`/void`、`/export` | `nx03/stocktake` | ❌ 路徑斷裂 |
| `/nx02/transfer`、`/post`、`/void` | `nx03/transfer` | ❌ 路徑斷裂 |
| `/nx02/shortage` | （後端 0 條 shortage endpoint）| ❌ 死路徑 |
| `/nx02/stock-setting` | （後端 0 條 part-stock-setting endpoint）| ❌ 死路徑 |
| `/nx02/auto-replenish` | （後端 0 條 auto-replenish endpoint）| ❌ 死路徑 |

Backend `/nx02/*` controller path 全是採購（po / purchase-return / qt / rfq / rr）。
Next.config 第 28~52 行有 **page redirect**、**但 0 條 API rewrite**。

⭐ **此真相意味**：舊 NX02 庫存 frontend 在 production 是「**0 條 endpoint 可運作的死殼**」、使用者看到的「無資料」其實是 API 404 fallback。Crown 拍板「重塑」是正確判斷、舊版實質早已殘缺。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 A：8 條舊 NX02 庫存路由業務語意揭露

| # | 路由 | 業務功能（白話）| 表格概念（業務語意）| 涉及欄位（重點）| 業務邏輯（操作流程）|
|---|---|---|---|---|---|
| 1 | `/dashboard/nx02/balance` | 即時庫存查詢 | 庫存量 ×（料件 × 倉庫）| 料號 / 品名 / 廠牌 / 倉庫 / 現存量 / 佔用量 / 可用量 / 調撥中(PLUS) / 單位 / 移動均價 / 庫存金額 / 安全量 / 最後異動 | 1. 選倉（含全部）2. 篩庫存狀態（全部/有庫存/零庫存/負庫存）3. 料號品名搜尋 4. 多欄位排序（料號/品名/現存量/可用量/庫存金額/最後異動）5. 負庫存 row 紅標、零庫存灰標、低於安全量 orange 警示 6. 點料號 link → 跳該料件異動歷史 |
| 2 | `/dashboard/nx02/ledger` | 庫存異動台帳查詢 | 異動帳冊 ×（時序 + 強制溯源）| 異動時間 / 異動類型(I入庫/O出庫/A盤點調整) / 來源單據(I開帳/P進貨/S銷貨/T盤點/X調撥/R退貨) / 料號 / 品名 / 倉庫 / 庫位 / 入庫量 / 出庫量 / 單位成本 / 異動總成本 / 異動後庫存 / 異動後均價 / 來源單號 | 1. 從 balance 點料號跳入 2. 篩倉庫 / 異動類型 / 來源單據 / 起訖日 3. 看每筆 ledger row 完整溯源（為什麼這筆異動、單號是誰）4. 移動平均成本歷史追蹤 |
| 3 | `/dashboard/nx02/init` (list + new + [id]) | 開帳存單據（業務員手動建初始庫存）| 開帳單表頭 + 明細（單據式）| 表頭：單號 / 倉庫 / 開帳日期 / 料號數 / 狀態 / 建立時間；明細：零件 / 品名 / 庫位 / 數量 / 均價 / 金額 | 1. 列表頁篩狀態（含作廢 V）2. 新增開帳存：選倉 + 開帳日 + 明細 row 多筆 input 3. 明細表 editable（庫位 / 數量 / 均價）4. 過帳 (POST /post) → 寫 stock_balance + stock_ledger（source_doc_type=I）5. 作廢 (POST /void) |
| 4 | `/dashboard/nx02/stock-take` (list + new + [id]) | 盤點單（找出帳實差異 + 處置）| 盤點單表頭 + 明細 + Excel 匯出 | 表頭：單號 / 倉庫 / 日期 / 範圍(F全倉/P部分) / 料號數 / 已盤 / 狀態；明細：料號 / 品名 / 帳面 / 實盤 / 差異 / 均價 / 差異金額 / 狀態 / 備註 | 1. 列表頁篩狀態 2. 新增盤點單：選倉 + 範圍 3. 明細頁直接 input 實盤數量（placeholder=「空白=未盤」）4. 系統計算 diff = counted - system 5. 過帳 (POST /post) → 寫 stock_balance 差異 + stock_ledger(source=T)、處置 type W/R/D/U（報廢/重組/瑕疵/中古）6. 作廢 (POST /void) 7. **GET /export 匯出 Excel** ⭐ |
| 5 | `/dashboard/nx02/transfer` (list + new + [id]) (PLUS) | 跨倉調撥單 | 調撥單表頭 + 明細（兩倉移動）| 表頭：單號 / 來源倉 / 目標倉 / 調撥日期 / 料號數 / 狀態；明細：料號 / 品名 / 出貨庫位 / 目標庫位 / 數量 / 來源現存 / 出庫成本(P狀態才顯示) / 備註 | 1. 列表頁篩狀態 2. 新增調撥單：選來源 + 目標倉 + 多明細 3. 明細顯示「來源現存」即時校核 4. 過帳 (POST /post) → 來源 -qty、目標 +qty、寫 ledger(source=X)、in_transit_qty 維護 5. 作廢 (POST /void) |
| 6 | `/dashboard/nx02/stock-setting` | 料件×倉 安全量 / 最高量 / 補貨點設定 | Split view（左清單 + 右表單）| 料件 / 倉庫 / 安全量(min_qty) / 最高量(max_qty) / 補貨建議(reorder_qty) / 啟用 / 備註 | 1. 左清單搜尋料號 / 品名 2. 點選跳右表單編輯 3. 新增/編輯數值 4. 儲存（POST）5. 後續被 shortage 偵測 + auto-replenish 引用 |
| 7 | `/dashboard/nx02/shortage` (PLUS) | 缺貨簿（系統自動偵測 + 業務員批次處理）| 缺貨偵測表 + 批次轉 RFQ 工作流 | 料號 / 品名 / 倉庫 / 現存量 / 安全量 / 缺貨量 / 建議訂購 / 偵測時間 / 狀態(O缺貨中/R已轉RFQ/C已關閉/I忽略) / 關聯 RFQ / 操作 | 1. 系統依 stock-setting 偵測 on_hand < min_qty → 自動產生缺貨 row 2. 業務員看缺貨簿、選狀態篩 3. ⭐**批次勾選 → 全選本頁可轉 RFQ → POST 一次性建立 RFQ** 4. 狀態自動 O → R 5. RFQ 完成後狀態 R → C |
| 8 | `/dashboard/nx02/auto-replenish` (PLUS) | 自動補貨規則（來源倉 → 目標倉 拓樸配置）| Split view（左清單 + 右表單）| 來源倉 / 目標倉 / 優先順序 / 啟用 / 備註 | 1. 左清單列既有補貨規則 2. 點選編輯規則 3. 新增：選來源 + 目標 + priority 4. 多條規則（同目標倉多來源依 priority 嘗試）5. 配合 flowMode C/D 控制觸發邏輯 |

A 路由小計：8 條庫存實體路由（不計 nx02/page.tsx 模組首頁 hub）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 B：9 個 features/nx02 庫存子模組業務邏輯揭露

| # | 子模組 | 業務情境 | 關鍵 hook / state（業務概念）| 關鍵 API call（操作意圖）| UI 互動範式 |
|---|---|---|---|---|---|
| 1 | `balance/` | 業務員 / 倉管早上 9 點查「今天有什麼料、多少」| qInput 搜尋字、warehouseId 倉、status 庫存狀態、page/pageSize 分頁、sortBy/sortDir 排序、rows 表格資料、summary（有庫存/零/負筆數）| `GET /nx02/balance`（list with filters）、`GET /nx02/balance/summary`（4 個 KPI 數）| 桌面 table 含 sortable 欄；手機 card 卡（可用量大字 + 4 格 grid 顯示現存/佔用/調撥中/安全量、低於安全量 orange 條、負庫存紅條）|
| 2 | `ledger/` | 業務員追「這筆庫存怎麼來的、為什麼少了」| qInput、warehouseId、movementType(I/O/A)、sourceDocType(I/P/S/T/X)、dateFrom/dateTo、page/rows | `GET /nx02/ledger`（list with filters）| 桌面 table 14 欄；手機 card（異動 badge + 來源 + 數量大字 + 4 格成本 grid）+ rangeError 日期區間驗證 |
| 3 | `init/` | 業務員手動建立「現有庫存底」（不依賴 RR）| List / Detail / New 三 view、過帳 / 作廢 action | `POST /nx02/init`（建單）、`POST /nx02/init/{id}/post`（過帳）、`POST /nx02/init/{id}/void`（作廢）| 列表→新增 form→明細 editable 多 row→過帳釋出至 balance + ledger |
| 4 | `stock-take/` | 業務員月底盤點、找帳實差異、寫處置 | List / Detail / New + Excel 匯出 | 同 init + `GET /nx02/stock-take/{id}/export` Excel | 明細頁「空白=未盤」placeholder、實盤 inline input、diff 即時計算 |
| 5 | `transfer/` (PLUS) | 倉管把料從 A 倉移到 B 倉 | List / Form（新增 + 編輯共用 form）| 同 init + 過帳 / 作廢 | Form 顯示「來源現存」即時校核、過帳後才顯示「出庫成本」欄位 |
| 6 | `stock-setting/` | 業務員依「這料 30 年來常缺、所以安全量設 100」設定 min/max | Split view 左清單 + 右表單 | `GET /nx02/stock-setting`、`GET /nx02/stock-setting/{id}`、`POST /nx02/stock-setting`（建/更新合一）| 左清單搜尋 + 點選 → 右表單編輯 / 新增 |
| 7 | `shortage/` (PLUS) | 業務員看缺貨簿、批次選一票料件轉 RFQ | shortage rows、checkbox 全選 / 半選、狀態篩選 | `GET /nx02/shortage`、`POST /nx02/shortage/...`（轉 RFQ 批次）| 全選 / 半選 checkbox header、桌面 table 9 欄含「關聯 RFQ」「操作」、業務員一次處理多筆 |
| 8 | `auto-replenish/` (PLUS) | 倉管設「主倉缺貨自動找衛星倉調」拓樸 | Split view + priority 拖拉？（推測）| `GET /nx02/auto-replenish`、`GET by id`、`POST` | Split view + form panel、配對 fromWarehouse → toWarehouse + priority |
| 9 | `dashboard/` | 庫存模組首頁、4 個 KPI + 入口 hub | summary stats / 倉儲作業入口 | `GET /nx02/balance/dashboard`（KPI 聚合）| h1「庫存管理」+ subtitle「庫存查詢、台帳與倉儲作業入口」+ 3 區 h2（推測：庫存查詢區 / 台帳區 / 倉儲作業區）+ Nx02StatCard component |

⚠️ 注：第 9 項 `shared/` 已揭露 2 元件 (`PartLookupAutocomplete` / `PlanUpgradePrompt`) 屬跨模組共用、不算單獨子模組業務、上表只列 9 個業務子模組（dashboard 算 1）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 C：5 個新 NX01 主檔對照熱點

### C1. `nx01_part` （料件主檔、新版含 codeRuleId NN / part_version snapshot）

**舊 NX02 庫存怎麼用 part？**
- balance 列表顯示 `partCode`（料號 link）+ `partName`（品名）+ `brandName`（廠牌）+ `uom`（單位）4 欄
- ledger 顯示 `partCode` + `partName` 2 欄
- init / stock-take / transfer 明細含 `partId / partNo / partName` 快照（schema 已 verify）
- stock-setting / shortage 用 `partId` 設安全量 / 偵測缺貨

**舊邏輯哪裡可能跟新 NX01-05 衝突？**
- ⚠️ **codeRuleId NN guard**：新 NX01-05 part 主檔強制 codeRuleId 非空（hotfix `feature/nx01-11-part-service-hotfix`）。舊庫存 init/stock-take 新增明細時、若用「自由輸入 partNo」可能跳過 codeRuleId 流程
- ⚠️ **part_version snapshot**：新 NX01-17 有 `Nx01PartVersion` 表（part 改版歷史）。舊庫存 ledger 只記 `partNo / partName` 快照、未記 versionId、無法回放「異動當下的料件版本」
- ⚠️ **partCode unique**：新 NX01-14 加 unique on part（migration `20260514110000_nx01_part_add_unique_and_indexes`）、舊庫存查詢用 partCode 搜尋已對齊
- 🟡 **previewCode + UNK guard**：新 NX01-05 service 有 previewCode + UNK guard、舊庫存的 part autocomplete 用法未深掘 verify

### C2. `nx01_warehouse` （倉庫主檔、新版 6 倉模型 + flowMode C/D）

**舊 NX02 庫存怎麼用 warehouse？**
- balance / ledger / init / stock-take / shortage / setting 全部都有「**選倉**」select dropdown（warehouses prop 注入、option 顯示 `name (code)`）
- transfer 用 from + to 兩倉
- auto-replenish 用 fromWarehouseId + toWarehouseId 兩倉
- ledger / stock-take 顯示 locationId（庫位、warehouse 子層）

**舊 type 4 種 vs 新「6 倉」對應？**
- 舊 UI 操作層面**沒有看到 `warehouseTypeId` / `flowMode`** 任何引用（select 只顯示 name + code）
- 4 種 type seed（H 總部 / M 主倉 / W 分倉 / S 衛星倉、flowMode C/C/D/D）schema 落地、UI 層 0 條使用
- 「6 倉」業務拓樸 vs schema 4 type 的對應、舊 UI 完全未實現
- ⭐ **重塑機會**：新 NX03 可直接基於 6 倉 + flowMode C/D 設計（舊版根本沒這層）

### C3. `nx01_part_model` （料件↔車型適配、新版戰略表）

**舊 NX02 庫存有沒有涉及車型查詢？**
- 全部 8 條庫存路由 **0 條** 涉及車型 / 引擎 / 變速主檔
- balance / ledger / init / stock-take 搜尋只支援「料號 / 品名」、無「VIN 或車型查料」
- shortage / setting / auto-replenish 同上、純料件視角

**業務員「2018 Golf 7 GTI 機油濾芯查庫存」場景舊版怎麼做？**
- 🔴 **舊版完全做不到**。業務員必須先離開庫存系統、查 part 主檔（甚至紙本筆記）找到「Golf 7 GTI 對應的機油濾芯料號」、再回庫存查 partNo
- ⭐ **重塑機會**：新 NX03 可基於 NX01-16 `part_model` 戰略表設計「車型 → 料件 → 庫存」直查、是業界 muscle memory 與 NEXORA PRO 戰略級資產的對齊點

### C4. `nx01_partner` （partner_type 5 字元 C/S/T/V/B）

**舊 NX02 庫存怎麼用 partner？**
- balance / ledger / stock-take / setting / shortage / replenish **0 條** 涉及 partner
- transfer **0 條** 涉及 partner（純內部倉間）
- init **0 條** 涉及 partner（業務員手動建底、無對外）

**外包物流 T 怎麼處理？**
- 🔴 **舊版 0 涉及**。schema 層 `Nx03Parcel.toPartnerId`（寄貨對象）+ `Nx03DnItem` 物流屬 NX06、不在舊 NX02 庫存範圍
- ⭐ **重塑機會**：新 NX03 範圍 A 是否要含 parcel + partner（T 外包物流）由 Crown 拍板

### C5. `nx01_part_version` / `nx01_part_relation` （版本與關聯）

**舊 NX02 庫存有沒有「料號改版庫存怎麼處理」邏輯？**
- 🔴 **舊版 0 條** 部分版本邏輯
- ledger / balance / init / stock-take 快照只記 partNo / partName（VarChar 200）、未記 versionId
- 「Golf 7 GTI 機油濾芯 V1（停產）→ V2（新版）」場景：舊版無法區分庫存是 V1 還 V2
- ⭐ **重塑機會**：新 NX03 schema `Nx03StockLedger` 可加 partVersionId、新 ledger 寫入時 snapshot 當下版本

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 D：舊 NX02 獨有業務邏輯清單（新 NX03 backend 沒覆蓋的）

| # | 獨有業務 | 出處 | 性質 | 重塑保留候選 |
|---|---|---|---|---|
| 1 | **Excel 匯出盤點明細** | `GET /nx02/stock-take/{id}/export` API + stock-take Detail view | 業務檢核（盤點員紙本核對）| ⭐ 保留（業界 muscle memory 強）|
| 2 | **缺貨批次轉 RFQ** | shortage view 「全選本頁可轉 RFQ」checkbox + `POST /nx02/shortage/...` | 業務批次操作（PLUS 戰略動線）| ⭐ 保留（PRO/PLUS 殺手級）|
| 3 | **負庫存標記 + 低於安全量警示** | balance view rowBg 紅 / orange 邏輯 | UI 業務檢核規則 | ⭐ 保留（業界 muscle memory）|
| 4 | **庫存狀態多分類查詢** | balance status filter（全部 / 有庫存 / 零庫存 / 負庫存）| UI 篩選範式 | ⭐ 保留 |
| 5 | **dashboard KPI 統計**（有庫存 / 零 / 負 筆數）| balance summary endpoint 回 4 KPI | 報表類 UI | 🟡 評估（NX08 報表快取對齊）|
| 6 | **庫存儀表板 hub**（庫存查詢/台帳/倉儲作業 3 區）| `features/nx02/dashboard/ui/Nx02DashboardPage` | 模組首頁 hub | 🟡 評估（重塑後對齊新 UI 拓樸）|
| 7 | **balance 點料號跳 ledger** | BalanceView `ledgerHrefForPart()` href 邏輯 | UI 工作流關聯 | ⭐ 保留（業務員追溯動線）|
| 8 | **盤點實盤 inline input** | StockTakeDetailView 「空白=未盤」placeholder + 即時 diff 計算 | UI 業務範式 | ⭐ 保留 |
| 9 | **盤點處置 type 4 種**（W 報廢 / R 重組 / D 瑕疵 / U 中古）| schema `Nx03StockTakeItem.disposeType` | 業務 enum | ⭐ 保留（schema 已落地、新 NX03 backend stocktake 應實作）|
| 10 | **transfer 來源現存即時校核** | TransferFormView 顯示「來源現存」即時值 | UI 業務檢核 | ⭐ 保留 |
| 11 | **transfer 過帳前後欄位切換** | 出庫成本欄位 `status === 'P'` 才顯示 | UI 狀態機 | ⭐ 保留 |
| 12 | **Init 開帳專用單據語意**（業務員手動建底）| init List / New / Detail 三 view | 業務情境（非 RR）| ⭐ 保留（業界 muscle memory 起點、Crown 揭露範圍 A）|
| 13 | **auto-replenish 拓樸 priority 機制** | AutoReplenishFormPanel + Split view | 業務邏輯（PLUS）| 🟡 評估（PLUS phase 才開）|
| 14 | **stock-setting reorder_qty 補貨建議** | schema `reorderQty` + setting view | 業務計算欄位 | ⭐ 保留 |
| 15 | **ledger 移動平均成本歷史欄** | balanceCost 欄（異動後均價）| 業務溯源核心 | ⭐ 保留（#13 強制溯源） |
| 16 | **ledger 日期區間驗證** | LedgerView rangeError | UI 業務檢核 | ⭐ 保留 |
| 17 | **balance PLUS 條件式欄位** | `showPlus` 控制「調撥中」欄顯示 | Tier 差異化機制 | ⭐ 保留（對齊 NEXORA LITE/PLUS/PRO）|
| 18 | **手機 card 雙版本 UI** | balance / ledger 都有 桌面 table + 手機 card 雙視圖 | UI 範式 | ⭐ 保留（PWA-first 對齊）|

D 獨有業務小計：**18 項**、保留候選 **14 項**、評估 **4 項**、廢棄 **0 項**。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 對照熱點地圖

| 類別 | 數量 | 範圍 |
|---|---|---|
| ✅ **跟新 NX01 直接對齊**（可直接基於新版設計）| **5** | balance 用 partCode/brand/uom ✓、ledger 用 partCode/partName ✓、warehouse select ✓、part_id snapshot ✓、status enum 對齊 |
| ⚠️ **跟新 NX01 部分衝突**（需 Crown 判斷新舊取捨）| **7** | (1) codeRuleId NN guard 與舊 part 自由輸入；(2) part_version 快照舊版未記；(3) 6 倉拓樸 vs 舊 4 type；(4) part_model 車型查料 0 落地；(5) partner T 外包物流 0 落地；(6) 移動平均成本算法版本一致性；(7) location 庫位舊版限定庫位視角 vs 新 NX01 地址完整 7 欄 |
| 🔴 **完全失去語意**（廢棄候選）| **3** | (1) 舊 frontend `/nx02/*` 庫存 API 路徑全死；(2) 舊 init endpoint 後端 0 落地；(3) 舊 shortage/setting/auto-replenish endpoint 後端 0 落地 |

---

## 重塑批次拍板建議（給 Alex 整合用）

### Batch-R1：直接基於新 NX01 重塑（高 ROI、業界 muscle memory 強）
- balance 即時庫存（含負庫存 / 低於安全量警示、桌面 + 手機雙視圖）
- ledger 異動台帳（含日期區間 + 多 filter + Excel 匯出）
- init 開帳存（業務員手動建底、Crown 揭露範圍 A 起點）
- stock-take 盤點（含 Excel 匯出 + 處置 4 type W/R/D/U）

### Batch-R2：戰略級重塑（業界第一個能做的事）
- shortage 缺貨簿 + 批次轉 RFQ（PLUS 殺手級）
- **車型 → 料件 → 庫存直查**（基於 NX01-16 part_model、業界第一個能做）
- transfer 跨倉調撥含 flowMode C/D 自動拓樸

### Batch-R3：Tier 差異化重塑（PLUS / PRO 才開）
- auto-replenish 自動補貨拓樸
- stock-setting 安全量 / 補貨建議
- NX08 InventoryCache 報表快取（PRO）

### Batch-R4：跨模組接點（後續對齊）
- Init 連接點：NX02 RR 進貨 / NX04 SO 銷貨 / NX06 DN 物流 / NX08 報表
- Partner T 外包物流（Parcel.toPartnerId）

---

## 後記：本檔輸出紀律對齊

- 純諮詢、不開工任何 commit、不切分支、留 main ✓
- A041 精確 count：13 路由（5 採購 + 8 庫存）、9 子模組、14 endpoint patterns、18 獨有業務 ✓
- §G.9 verify 通配 grep：3 處 `find -iname` / `Controller(` / `apiFetch(` ✓
- §I.6.3 揭露不完整：每段尾 ⚠️ 註記 ✓
- 不揭露程式碼結構（function signature / TypeScript type 細節）、要揭露業務語意 ✓
- 真實 main HEAD verify：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 本檔位置：`docs/nx03/nx03-audit-03.md`（諮詢產出、未 commit、Crown 拍板後再決定）

**下一步**：Alex 整合對照新 NX01 → 給 Crown 列「保留 / 修正 / 廢棄」拍板批次（建議 R1/R2/R3/R4 4 批拍板）→ 拍完才開始建分支 + 寫 nx03-overview.md。
