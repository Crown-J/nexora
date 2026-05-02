<!-- docs/nx02/nx02-worklog.md -->

# NEXORA - NX02 - 採購模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX02 採購管理（rfq / po / rr / qt / purchase-return）+ NX02 主導的跨模組 task（B5 RFQ/QT API、採購中心 Hub UI、demo SOP 重構）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史散在 `main` / `feature/wp-phase0-schema` / `feature/demo-emergency` / `feature/wp-phase1-w2-mini`

---

## 結構說明

- 按主題（不按時間順序）累加、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- 寫「為什麼這樣蓋」「踩過什麼坑」、不寫「現在長什麼樣」（[system-architecture.md](../_shared/team/system-architecture.md) 的事）
- ⚠️ 標記未確認 / 待 Crown / Alex 補充
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（D3 雙帳 / D4 Translator / B2 反查 / 公版 component / TASK-BUSINESS-RESTRUCTURE / A002 drift）

---

## 主題 1｜v7_baseline + Phase5-NX02 第三批 API 落地（2026-04-14）

### 起源

`spec_v7_baseline`（2026-04-13）建好 NX02 schema（rfq / po / rr / pr 4 表 + items + ti）、但只有 schema、沒有 controller。Phase5 的 task code「第三批 API」依序填模組：第一批 NX99（租戶/訂閱）、第二批 NX01（主檔 8 項 CRUD）、**第三批 NX02 採購 4 個資源**（rfq / po / rr / purchase-return）。

### 設計決策

1. **DB 表名 `nx02_pr`、API 路徑 `/nx02/purchase-return`**：表名遷就舊 v6 縮寫、API 路徑用語意化全名。理由：DB 表名改不動（會破舊 migration）、API 路徑前後端可重新對齊、用語意化降低新人讀 controller 的門檻。
2. **狀態 machine 改 token 字串、DB 仍存舊單字元**：API 對外用 `DRAFT / INSPECTING / POSTED / CANCELLED`、DB 仍存 `D / I / P / V`。理由：v6 historical schema 留下單字元 enum、改不動但對 API 不友好、用 state-machine 層轉換。
3. **過帳跨模組寫 ledger 統一規則**：RR `POSTED` 在**單一 transaction** 內呼叫 `applyQtyInWithLedger`、寫 `nx03_stock_balance` + `nx03_stock_ledger`、`sourceModule=NX02 / sourceDocType=I`。對齊 [CLAUDE.md](../../CLAUDE.md) §九過帳通用規則。
4. **共用 utils 集中 `shared/nx02/`**：`nx02-list-query / nx02-doc-no / nx02-state-machine / nx02-currency`、避免每個 controller 重複實作分頁/單號/幣別轉換。
5. **單號前綴對齊 v3 規則**：`RF-` / `PO-` / `RR-` / `PR-`（後續 0427 B5 加 `TI-`、Phase 0 widen 到 VARCHAR(30)）。

### 實作歷程

- 2026-04-14（migration）`20260414100000_nx02_po_rr_status_varchar30` | po/rr 狀態 VARCHAR 擴 + 舊單字元值轉 token
- 2026-04-14（migration）`20260414103000_nx02_doc_no_varchar30` | rfq/po/rr/pr 之 doc_no → VARCHAR(30)
- 2026-04-14（migration）`20260414104500_nx02_currency_fk_len` | 4 表 currency_id → VARCHAR(15)
- 2026-04-14（commits 在 `feature/sys-dashboard`、後 merge）| 4 個 controller/service/DTO + shared utils + crud-fetch 驗證腳本

### 踩坑 / 學到的

- **DB enum 是單字元、API 不能直接吐**。若直接 `return prismaResult.status`、API 會吐 `'D' / 'I' / 'P' / 'V'`、前端要解碼、不友好。`nx02-state-machine.ts` 加雙向 mapping、controller 統一吐 token 字串。教訓：DB schema 跟 API DTO **不同規格**、要明確分開、別用同一個 enum。
- **過帳跨模組必須單一 transaction**。一開始想「先 update RR.status、再用另一個 client 寫 ledger」、結果 status 寫了但 ledger 沒寫、庫存對不上。教訓：跨表過帳一律 `prisma.$transaction(async (tx) => { ... })` 內部完成、出錯整批 rollback。
- **`@Roles('ADMIN')` 是早期保守做法、之後 B2 開放公開（A021）**。RR 等業務寫操作要 ADMIN 沒問題、但 list/getById 給 ADMIN-only 太嚴、未來業務角色應可讀。本主題沒處理、留 A021。

### 對應文件

- 後端：[apps/nx-api/src/nx02/](../../apps/nx-api/src/nx02/) + [shared/nx02/](../../apps/nx-api/src/shared/nx02/)
- 對應架構債：A021（stock-balance.controller `@Roles('ADMIN')` vs B2 開放方向不一致）

---

## 主題 2｜NX02 採購中心 Hub UI 設計（2026-04-15、0420 系列）

### 起源

Phase5 後端 4 個資源已落地、但前端只有舊 v1 「採購中心」散落在 `dashboard/purchase/*` 各子頁、沒有統一 hub。Crown 拍板「先做採購中心 Hub 把採購流程**視覺化**、讓客戶 demo 一進採購中心就能看見完整 SOP」。

⚠️ **本主題寫的是「UI 結構決策 + 為什麼選這個分區」（charter §A.2 邊界內）、不寫視覺細節（顏色 / 像素 / 字級）**。

### 設計決策

1. **採購中心分 3 群組**：管理 / 國內採購 / 特殊採購。理由：客戶採購業務最常切換國內 vs 特殊（國外/急件）、管理（產品/供應商/退貨/保固）獨立成「不在主流程上的長尾功能」。
2. **流程卡 Step.1~5 + 主線箭頭**：詢價 → 採購 → 進貨 為主線（橘金 #E8A020 視覺強調）、退貨/保固用 SVG 虛線迴圈表達「非主流程、可從任意主流程節點分流」。
3. **0420-D1 採購中心卡片頁路由 `/dashboard/purchase`**：跟舊 `/dashboard/nx02` 並存、新路由是「業務語意路徑」、舊路由是「模組代碼路徑」、過渡期都保留（後來變成 A027 架構債）。
4. **0420-G/H/I 採購工作台四欄 grid**：勾選視覺 / 料號資訊 / 庫存條+缺口 / 需求量。理由：採購人員第一眼判斷「夠不夠 + 缺多少 + 要詢多少」、四欄壓縮在一列讓「掃 12 筆需求」可以快速掃完。
5. **新增表單 keyboard-driven**：`Alt+A` 新增、`Alt+E` 編輯、`Alt+S` 儲存、`↑↓` 選列、`Tab` 跳格、`Enter` 確認、`Esc` 取消。理由：採購人員批量操作多、滑鼠效率太低、鍵盤操作對齊傳統 ERP 用戶 muscle memory。

### 實作歷程

- 2026-04-15 `4bdcb24` | NX02-DASH 採購中心首頁 flow card 設計
- 2026-04-15 `f6d8141` | 採購中心 horizontal flow + 退貨/保固 loop arrows
- 2026-04-15 `665953e` | 統一卡片尺寸 220×160 + loop arrows for return/warranty
- 2026-04-15 `6407ea0 / cdf9025 / d67dc17` | 群組標題 + step badge + Step.N 標籤
- 2026-04-20 `9130853` | 0420-D1：採購中心卡片頁 `/dashboard/purchase`
- 2026-04-20 `2bf6aa2 / acc65c9` | 0420-E：採購產品管理頁（料號建立 + 4 關聯 Tab）
- 2026-04-20 `43ac352` | 0420-F：採購供應商管理頁
- 2026-04-20 `207a74c` | 0420-G：採購工作台首版（左 160px 流程、中需求清單、右待詢價）
- 2026-04-20 `f2fd5f8 / f25d396 / 6bf6a2b` | 0420-G 細節對齊規格
- 2026-04-20 `c5fee0a / 1c30150 / 2227eaf` | 0420-H/I：詢價節點 + 表單 + 三項組合

### 踩坑 / 學到的

- **SVG 虛線量測不能用 window resize**。第一版用 `window.addEventListener('resize')` 重算虛線端點、結果整個視窗 resize 也觸發、效能差。改 `useLayoutEffect + setTimeout(100)` + `ResizeObserver` **僅監聽流程列 rootRef** 容器、效能對齊。教訓：DOM 量測 observer 範圍要收窄、global resize 是最後手段。
- **「整卡可點擊」跟「卡內按鈕可點擊」會 event bubble 衝突**。一開始整卡 `<Link>` 包按鈕、按鈕點擊也觸發整卡 nav。改成卡片底層 `<Link className="absolute inset-0 z-0">`、按鈕 `z-10` 浮在上層、各自 stopPropagation。
- **0420 D1~D5 五大中心 Hub 同時做、共用 primitive 拆出**：`features/layout/ui/module-hub/hub-primitives.tsx`（`ModuleHubSection / HubLinkCard / HubStepBadge / HubProBadge`）。一開始想各中心自己寫、第三個（NX03 庫存中心）就發現重複度高、抽出共用。教訓：**3 個相似實作是抽象的最佳時機、不是 2 個（過早）也不是 5 個（太晚）**。

### 對應文件

- 工作台規劃：[docs/nx02/ui/po-workspace.md](ui/po-workspace.md) / [import-workspace.md](ui/import-workspace.md) / [product-workspace.md](ui/product-workspace.md)
- 業務流程：[docs/nx02/workflow/primary/p-w01-domestic-purchase.md](workflow/primary/p-w01-domestic-purchase.md)（Alex 寫）
- 架構債：A027（dashboard/{nx02} vs dashboard/{purchase} 並存、待春酒後處理）

---

## 主題 3｜TASK-0421 五單據 demo（NX02 三張：RF / PO / RR）

> ⚠️ 公版 component（DocLayout / DocListView / DocDetailView / DocHeader / DocItemTable / docStatus）跨模組共用、見 [_shared/worklog.md 主題 4](../_shared/worklog.md)。本主題只記 NX02 三張單據的 demo 用法。

### 起源

0420 採購工作台落地後、Crown 要看「**單據明細頁長什麼樣**」demo（不是工作台、是進入單一單據後的 detail page）。Phase5 後端 4 資源 API 已有、但前端 detail view 沒做、demo 給客戶看時只能看列表。Crown 拍板：先做 5 張 mock 單據（NX02 三張 RF/PO/RR + NX04 兩張 QT/SO）、走公版 component、demo 階段全部 mock data、未來接 API。

### 設計決策

1. **三張單據統一公版**：列表/明細切換、表頭、明細表鍵盤、狀態 badge 全用同一套 component、避免每張單據自己刻一份。
2. **PO 即時算稅 + 小計 + 總額**：採購單表單**輸入時即時計算**、不等 submit 才算。理由：採購人員邊輸入邊判斷預算、即時 feedback 比「填完才看到」好。
3. **RR 草稿可過帳後鎖定**：DRAFT 可改、POSTED 不可改、要改只能作廢重開。理由：過帳後庫存已動、改原單會破壞庫存對帳。
4. **mock data 集中 `mockData.ts`、不分散到各 component**：5 張單據共用 `MOCK_RFQ_LIST / MOCK_PO_LIST / MOCK_RR_LIST / MOCK_CUSTOMERS / MOCK_LOCATIONS`、改 mock 只改一個檔。

### 實作歷程

- 2026-04-21 `12748d0` | TASK-0421：5 張 demo 單據 + 公版 component + DOCK 子選單 + 採購/銷貨短連結
- 五張單據對應 FUNCTION_CODE：
  - `NX02-RFQ-UI-001-F01` → `/dashboard/purchase/rfq`
  - `NX02-PO-UI-002-F01` → `/dashboard/purchase/po`
  - `NX02-RR-UI-001-F01` → `/dashboard/purchase/rr`

### 踩坑 / 學到的

- **公版 component 第一版「太通用」反而難用**。一開始 DocItemTable 想 props 全配置（renderCell / inputClassName / disableRowDelete / ...）、結果三張單據用法都不同、每張都傳 10+ props、可讀性比不抽象還差。後來收窄成「2~3 個必要 prop + barrel 匯出 + 單據自己 wrapper」。教訓：通用 component 第一版用「3 個實際單據」當輸入、不要憑空想配置點。
- **mock data 跟真 schema 對齊很重要**。第一版 MOCK_PO_LIST 欄位名亂取（`供應商 / 金額`）、後來接 API 全要重命名（`partnerId / totalAmount`）。教訓：mock data 命名跟 schema/DTO 對齊、即使是 demo、未來 wire up 才不重寫。

### 對應文件

- 公版 component 細節 → 見 [_shared/worklog.md 主題 4](../_shared/worklog.md)
- DEMO 路徑短網址 redirect 規則：[apps/nx-ui/next.config.ts](../../apps/nx-ui/next.config.ts)

---

## 主題 4｜DEMO-EMERGENCY R5 / R7 採購 SOP 重構（2026-04-22~23）

> ⚠️ **本主題屬 demo / mock 階段、未來 W4 採購工作台真實落地時可能整套重寫。** 紀錄本主題的目的是踩坑教訓 + 設計脈絡（給未來真實落地時參考）、不是「這就是最終 NEXORA codebase」。

### 起源

Crown 接到客戶 demo 排期、要求把「採購流程整套 SOP」做成可演示的 mobile workspace（手機優先、桌面退而求其次）。Phase5 後端 + 0420 工作台都是桌面導向、demo 客戶在手機上看會卡。R5（domestic purchase SOP mobile）跟 R7（4 分區架構大重構）都是 demo emergency branch 上的工作、目的是「**讓客戶在手機上看完整採購流程**」。

### 設計決策

1. **R5 mobile workspace STEP 1-2 步驟卡**：把採購 SOP 拆 2 個步驟（需求 → 詢價）、每步驟做成 mobile 全頁卡片、上下滑切。理由：手機螢幕窄、橫向 4 欄 grid 變不可能、改縱向步驟流。
2. **R7 phase 2.5 移除非首頁 DOCK、SectionTabs 改貼底**：原本每頁都有 DOCK（底部模組切換列）、占太多 mobile vertical space、改只在首頁顯示、其他頁讓 SectionTabs 貼底取代。
3. **R7 phase 7 採購 4 分區架構**：管理 / 工作站 / 單據 / 狀態追蹤。理由：採購業務有 4 種「視角」、不同角色（主管/採購員/倉管/業務）關注不同分區、4 分區 tab 切換比 hub-card 樹狀更直覺。
4. **R7 phase 7-1~7-3 缺貨分流 OutOfStockDialog**：銷貨 SO 開單時撞缺貨、彈 dialog 讓使用者選「直接缺貨單 → 採購 RFQ」或「忽略繼續」。理由：把「銷貨缺貨 → 採購詢價」業務流程做成 inline UX、不要使用者離開銷貨頁去採購頁手動建單。
5. **R7 phase 7-4~7-6 RFQ 詳情頁 + 採用生成 QT**：RFQ list 點進 detail、可選「採用此 RFQ 生成 QT」、模擬採購→銷貨的轉單流程。

### 實作歷程

- 2026-04-22 `1df3253` | DEMO-R5 phase 1：domestic purchase SOP mobile workspace + STEP 1-2
- 2026-04-23 `64a63f5` | DEMO-R7 phase 3：工作站 + 單據管理分區 + 10 placeholder 路由
- 2026-04-23 `4fd79f8` | DEMO-R7 phase 4：客戶維護分區
- 2026-04-23 `514cc9a` | DEMO-R7 phase 5+6：inquiry dialog + cleanup
- 2026-04-23 `d08810a` | DEMO-R7 phase 7-1~7-3：缺貨分流 OutOfStockDialog + RFQ store + 列表頁
- 2026-04-23 `bf8ef8e` | DEMO-R7 phase 7-4~7-6：RFQ 詳情頁 + 採用生成 QT + 狀態追蹤整合

### 踩坑 / 學到的

- **Zustand selector 不能 inline `.filter / .map / .sort`**（A014、`6f3c45b` hotfix）。RFQ store 第一版 selector 寫 `useStore((s) => s.list.filter(rfq => rfq.status === 'DRAFT'))`、每次 render 回傳新陣列、觸發 React #185 無限 re-render。改用 `useMemo` 或 Zustand `shallow`。**這是 demo 階段揭露的、但教訓是 NEXORA 全 codebase 適用**、charter §A 同步寫進規範。
- **手機 SOP 步驟卡 ≠ 桌面工作台 mini 化**。R5 第一版直接把桌面工作台 4 欄 grid 縮 70%、結果手機按鈕點不到、字看不清。後來重新設計成「縱向步驟流 + 每步驟全頁」。教訓：mobile UX 不是 desktop 縮小、是另一種互動模型。
- **DOCK 跟 SectionTabs 不能同時占底部 64px+**。第一版兩個都在、mobile 螢幕上方剩不到 60% vertical space、內容根本看不到。教訓：mobile 底部組件互斥、設計時先決定哪個常駐、其他要消失或改頂部。
- **inline dialog UX（缺貨分流）vs 跳頁 UX 的取捨**：inline dialog 業務流程連貫但 modal 多會疊、跳頁清楚但跨業務流程斷鏈。R7 選 inline、Crown 拍板「demo 時連貫感比 modal stack 重要」。

### 對應文件

- ⚠️ **本主題的具體實作（mobile workspace / 4 分區 tab / OutOfStockDialog 等）可能不會進 NEXORA 真實 codebase、僅作為 demo 設計參考。** 真實 W4 採購工作台落地時、會基於 NX02 規格書 + workflow 重新設計。
- 業務流程：[docs/nx02/workflow/primary/p-w01-domestic-purchase.md](workflow/primary/p-w01-domestic-purchase.md)（Alex 寫的真實流程）
- 架構債：A014（Zustand selector 規範、本主題揭露）

---

## 主題 5｜B5 RFQ/QT API + DEMO-02 NX02 schema widening（Phase 0 收官、2026-04-25~28）

> Alex 觀察：本主題工作量大、按 Crown 同意拆 5 小節（schema 拆分 / drift fix / API 實作 / error 設計 / 反查鏈決策）給 Alex 易讀。

### 起源

Phase 0 D3 雙帳資料模型把 SO 改成「主帳 + 子帳」、子帳含 type='G' 中間態（採購中）、需要對應 RFQ/QT 的真實業務流程。原 v6 schema 把 RFQ 和 QT 混在 `nx02_rfq` 一張表、欄位語意混亂（一張表既是「我詢」又是「對方報」）。B5 任務：**從 RFQ 拆出獨立 QT 表**、實作 RFQ/QT 業務 API、撐起 D3 雙帳的採購接龍。

### 5A. Schema 拆分（nx02_qt 從 nx02_rfq 拆 + 反查欄位）

- **2026-04-25 `c80dee2` D3 patch：加 nx02_qt 表**
  - RFQ = 我方對廠商發出詢價、QT = 廠商回給我方報價
  - 一張 RFQ 可能有 N 張 QT（不同廠商各報一份）
  - 拆兩表後業務語意清楚、後續 adopt/reject 流程才實作得動
- **2026-04-27 `1cdb094` B5-A：加 `nx02_rfq.source_so_item_id`（反查欄位、nullable + FK to `nx04_so_item`）**
  - 起源：D3 / D4 stub 階段沒留反查欄位、B5 業務「採用 QT → 反查 SO line item 更新 transferStatus」做不到
  - 4 方案對焦見 5E
- **同步升級 D4 RefreshmentDocCreator**：建 RFQ stub 時寫入 `sourceSoItemId`、之後 B5 才有得反查

### 5B. Drift fix 兩波（B5-Aa / B5-Ab，含 DEMO-02 widening 同源延伸）

整合測試跑下去**連環撞 schema drift**、跟主題 1 v6 historical drift 同源：

#### 第一波 currency_id widening（3 欄）— `96e091c` B5-Aa

- 撞點：`nx02_ti.currency_id VARCHAR(10)` 存不下 `nx01_currency.id VARCHAR(15)`
- grep 全 schema 找到 3 欄同源：`nx02_ti / nx02_rr_import / nx05_note`
- Crown 拍板：「**全 3 欄一次清掉**」（含跨模組到 nx05）
- 揭露偏好規則化：「**同源同批 v7 historical drift 算實質單一決策、不算實質跨模組**」→ 寫進 memory `feedback_tech_debt_cleanup.md`

#### 第二波 docNo widening（13 欄）— `2571837` B5-Ab

- 撞點：`nx02_ti.doc_no VARCHAR(16)` 存不下實際 docNo（[CLAUDE.md](../../CLAUDE.md) §5 規範最短 19 字元）
- grep 找到 12 + 1 欄（5 個 VARCHAR(16) + 7 個 VARCHAR(20) + 1 個 polymorphic ref `orderDocNo`）
- Crown 拍板「全 13 欄清光」
- 命名修正順手：`nx02_ti / nx02_rr_import` 註解的「FK nx02_currency」改成「FK nx01_currency」（migration 寫的時候同源筆誤）

#### 第三波 DEMO-02 widening（part_brand.code / brand_code_rule.name）— 不在本日誌

- 屬 NX01 schema、見 [docs/nx01/nx01-worklog.md](../nx01/nx01-worklog.md) 主題 5
- 邏輯延續同精神「跑 seed 撞 P2000 → audit 同類型欄位 → 一次清光」

### 5C. API 實作（5 endpoints + 14 tests + advisory-lock）

- **5 endpoint**：`listRfqs / addQt / adoptQt / rejectQt / cancelRfq`
- **14 tests**：12 unit（mocked Prisma） + 2 integration（自帶 fixture、不依賴 D4 路徑）
- **共用 utils 擴充**：
  - 新增 `nx02-advisory-lock.ts`（PostgreSQL `pg_advisory_xact_lock`、防 adopt 競態）
  - `nx02-doc-no.ts` 加 `TI` 前綴
  - state-machine 加 RFQ_EDGES `DRAFT → REPLIED`
- **integration test 自帶 fixture**：`loadOrCreateB5Fixture`（自建 brand_code_rule + part + location + customer + 2 同行 partner）、不依賴 DEMO-02 seed（home 機沒 partner/part）
- **vitest fileParallelism: false**：兩個 .int-spec.ts 並行 race 撞 fixture unique constraint、序列化所有 .int-spec.ts

### 5D. Error class 4 層設計

```
Nx02BaseError              ← 抽象基底
  ├─ Nx02InvalidInputError ← 400（DTO 驗證後仍邏輯錯）
  ├─ Nx02ConflictError     ← 409（狀態衝突、如 adopt 已 closed RFQ）
  ├─ Nx02BusyError         ← 423（advisory lock 撞、可重試）
  └─ Nx02SystemError       ← 500（不該發生但發生了）
```

理由：HTTP status 4 種對應 4 種錯誤型態、使用者可分辨「我的輸入錯」vs「狀態時序問題」vs「重試就好」vs「真的炸了」。**Busy 用 423 而非 409**：423 Locked 語意更精準、客戶端可加自動重試、不會跟 Conflict（業務狀態衝突）混淆。

### 5E. 反查鏈關鍵決策（4 方案對焦選 i）

業務需求：採用某 QT 後、要反查 SO line item 更新 `transferStatus`。但 D3 / D4 階段建 RFQ stub 時**沒留反查欄位**、有 4 個方案：

| 方案 | 做法 | 取捨 |
|------|------|------|
| **i** ⭐ | 加 `nx02_rfq.source_so_item_id`（schema patch） | RFQ 知道自己源自哪張 SO 的哪一行、業務語意自然、純加法影響最小 |
| ii | 加 `nx04_so_item.rfqId` | 語意較亂（一張 SO line 可能對 N 張 RFQ）、不選 |
| iii | 用 docNo / remark 反查 | fragile、字串匹配、不選 |
| iv | 不反查（spec amend） | 業務破壞最大、不選 |

選 i 因為 schema patch 影響最小（nullable + 純加法）、未來 W4 工作台展示「這 RFQ 為哪張 SO 服務」也用得到。

### 實作歷程（總表）

- 2026-04-25 `c80dee2` | D3 patch：add nx02_qt table for B5 RFQ/QT separation
- 2026-04-27 `213e09a` | B5-impl spec + intent v2
- 2026-04-27 `1cdb094` | B5-A：schema patch + D4 stub upgrade
- 2026-04-27 `96e091c` | B5-Aa drift fix：3 currency_id VARCHAR(15)
- 2026-04-27 `2571837` | B5-Ab drift fix：13 docNo VARCHAR(30)
- 2026-04-27 `78f9db3` | B5-B：5 endpoints + 14 tests
- 2026-04-27 `259825c` | Phase 0 main work merge（含 B5 全部）+ tag `phase0-complete`

### 踩坑 / 學到的

- **schema drift 連環揭露的真規律**：每次跑 integration test 撞「值太長」P2000 → grep 全 schema 找同類型欄位、不要只修當下這欄。第二波 docNo 才在跑時撞、grep 一下發現 12 欄、再加 1 欄 polymorphic ref 是 13 欄。教訓：**drift fix 前先 grep 範圍 → 拍板選擇全清/部分 → 一次到位**、避免分批修 N 次。
- **TS narrow 跨 await 邊界失效**：`adoptQt` 內 `if (!rfq.sourceSoItemId) throw` 後 TS narrow 失效（rfq 是 mutable object 後續可能被 await 改）。解法：const 提取 `const sourceSoItemId = rfq.sourceSoItemId; if (!sourceSoItemId) throw`。教訓：跨 await 邊界後 object property narrow 不可靠、用 const 提取確保 narrow 穩定。
- **「順手清理」決策成本曲線**：B5-Ab 修 12 欄 docNo 時又發現 1 個 orderDocNo（polymorphic ref）。之前會停下回報 Crown「12 → 13 欄要不要納入」、本次直接順手納入並在 commit message 講清楚 12→13。理由：Crown 已多次拍板「同源同批一次清掉」、orderDocNo 同性質、停下回報的決策成本 > 順手做的價值。教訓：**Crown 偏好已揭露 + 行動屬「明確同類型擴張」時、不需逐次回報、commit message 講清楚就好**。但「跨類型」或「破壞性」仍要停下。
- **prisma migrate dev 後別忘了 rebuild db-core**：schema 改完跑 migrate dev 後、nx-api 的 typecheck 會 fail、因為 prisma generate 寫到 `packages/db-core/generated/`、但 `db-core/dist/`（nx-api import 的 entry）沒重 build。教訓：schema 改完跑 `pnpm --filter db-core build` 是必要步驟。
- **fileParallelism: false 是務實取捨**：unit test 並行收益微小、序列化所有 .int-spec.ts 也省心智負擔（fixture race 在 CI 隨機 fail 很難 debug）。

### 對應文件

- 意圖：[docs/nx02/spec/intent/rfq-qt-api-intent.md](spec/intent/rfq-qt-api-intent.md)
- 實作：[docs/nx02/spec/impl/b5-impl_rfq-qt-api.md](spec/impl/b5-impl_rfq-qt-api.md)
- 對應架構債：✅ A018（currency_id × 3）、✅ A019（docNo × 13）、✅ A020（D3 nx03_st_item FK ON DELETE drift、B5-A migrate 順手修）
- ⚠️ D3 雙帳資料模型 / D4 SYS-C Translator 細節 → 待寫 [docs/nx04/nx04-worklog.md](../nx04/nx04-worklog.md)、本日誌只記 B5 對 D3/D4 的依賴

---

## 統整：NX02 Migration 列表（v7_baseline 之後）

| Migration | 主題 | 性質 |
|-----------|------|------|
| `20260413120000_spec_v7_baseline` | 主題 1 | NX02 4 表（rfq/po/rr/pr）+ items + ti |
| `20260414100000_nx02_po_rr_status_varchar30` | 主題 1 | po/rr 狀態 enum widen + 舊單字元轉 token |
| `20260414103000_nx02_doc_no_varchar30` | 主題 1 | rfq/po/rr/pr docNo → VARCHAR(30) |
| `20260414104500_nx02_currency_fk_len` | 主題 1 | 4 表 currency_id → VARCHAR(15) |
| `20260425100300_phase0_b5_nx02_qt` | 主題 5A | 從 nx02_rfq 拆出 nx02_qt 獨立表 |
| `20260427014134_phase0_b5_rfq_source_so_item` | 主題 5A | 加 nx02_rfq.source_so_item_id 反查欄位 |
| `20260427051334_phase0_b5_drift_fix_fk_columns_widening` | 主題 5B | 3 currency_id → VARCHAR(15)（含 NX02 兩欄）|
| `20260427053231_phase0_b5_drift_fix_docno_widening` | 主題 5B | 13 docNo → VARCHAR(30)（含 NX02 多欄）|

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01 worklog](../nx01/nx01-worklog.md) 五段式結構：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件
- 主題 4 demo 重構是**特殊情況**（disclaimer 三段標明 demo 階段、未來真實落地可能重寫）— 之後類似 demo / mock 工作可沿用此 disclaimer 模式
- 主題 5 拆 5 小節（5A schema / 5B drift / 5C API / 5D error / 5E 反查鏈）— 工作量大的主題拆小節對 Alex 跨對話讀更友善
- 跨模組或公版（D3 / D4 / B2 / TASK-BUSINESS-RESTRUCTURE / 公版 component / A002）**不寫進本日誌**、已寫進 [_shared/worklog.md](../_shared/worklog.md) 統合
- 下一輪預期：`docs/nx03/nx03-worklog.md`（主題會跟 B2 反查 + Phase5-NX03 + DEMO-R1 mobile balance 重疊）

---

> 文件版本：v1.0（初版）
> 下次更新觸發：NX02 有新工作（migration / 新 controller / 採購流程 spec 改動）
