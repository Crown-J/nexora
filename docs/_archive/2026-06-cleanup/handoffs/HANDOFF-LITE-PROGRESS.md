<!-- docs/_team/HANDOFF-LITE-PROGRESS.md -->

# NEXORA — LITE 交接（給新 Alex + 新 Hank 雙視角）

> 撰寫者：Hank（Claude Code、2026-05-28 接 NX03 LITE 階段 2 的那位）
> 第一版撰寫：2026-05-28（M1 開工前）
> 第二版更新：2026-05-28（M3-2 完工後、M3-3 開工前）
> 第三版更新：2026-05-28（M6 closure 完成）
> 第四版：2026-05-29（加 Part 0 給新 Alex 完整脈絡）
> ⭐ **第五版：2026-06-03（NX04 → v1.2 對齊全軌 → 平台分離 → 首頁 → 精靈 → 席次制中、本次更新、給接手的新 Alex）**
> 對應 main HEAD：`53f8edb`（席次制段 2 精靈挑啟用 UI、HEAD 後續會隨段 3/4 推進）
> 接班對象：
>   - **新 Alex（PM、AI、本次主要讀者）**：起手讀 §AA~§AF（最新進度脈絡、Crown 給的 A-F 涵蓋）→ 再 Part 0（路線歷史脈絡 §0~§J、需要時查）→ Part 1（Hank git 細節）只在需要時查
>   - **新 Hank（Cursor IDE / Claude Code）**：必讀 §AE（已拍板規則 + 鐵律）、§AF（pending 與起手指引）
> 觸發原因：Crown 即將換 Alex 對話、需讓新 Alex 無縫接手「目前正在做席次制段 3」、本次補完從 NX04 → 目前的所有業務脈絡 + 技術現況

---

## ⚡ 新 Alex 30 秒上手

| 項 | 值 |
|---|---|
| 今日定位 | 員工啟用 + 席次控管 + 預設密碼五段任務、做完段 1/1.5/2/5、**正在做段 3** |
| 下一步動作 | 段 3：精靈內 ActivationStep 啟用成功後顯示預設密碼 `changeme` |
| 真實客戶 | **恆迎企業**（`TW-100001`）、第一個簽約對象、Crown 親自驗收 |
| 不能碰 | Railway production（落後 92 支 migration、簽約前 2-4 週才同步） |
| 鐵律 | 0 schema（純邏輯）、0 推銷字眼、只露中文不露 NXxx、git add 精確路徑不用 -A |
| 給 Crown 回報 | 一般員工口吻、不帶內部術語 / 編號（公司範式 §0.4） |

→ 接著看 **§AA**（定位與角色）然後 **§AE**（已拍板規則彙整）。

---

# Part 0 — 給新 Alex 的完整脈絡（必讀）

> 對象：下一棒 Alex、接手 LITE 階段 3 銷貨 NX04 前必讀
> 風格：脈絡 + 為什麼、不只結論
> 撰寫時機：2026-05-29、NX03 LITE closure 後

## §0. 工作模式（先讀這個）

### 0.1 Crown 全權授權
| 項目 | 授權 |
|------|------|
| migration（dev DB） | ✅ 自走 |
| git push（main + feature） | ✅ 自走 |
| merge to main (`--no-ff`) | ✅ 自走 |
| tag closure | ✅ 自走 |
| commit 大小決定 | ✅ 自走（漸進式 Step-by-Step） |
| Railway production migration | ❌ **不動**（A077、累計落後 88 支、真實客戶簽約前 2~4 週才同步） |
| `.env` localhost | ❌ 不改 |
| 中間驗證 | ❌ **Crown 不做**（瀏覽器測 AI 做不到、跳過、記操作手冊、Crown 最後親測） |
| 不確定的方向 | ⚠️ 標 ⚠️ 回報 Alex 拍板、別擅自決定 |

### 0.2 對話交接規定
- **模組 closure 後才換對話**（Alex + Hank 都是）
- 中途不換對話、避免斷線
- 接手前先讀本檔 + `git log --oneline -20` + 最近 commit message
- Alex 寫意圖（業務需求 / 拍板 / FU 管理）、Hank 寫實作（schema / code / 操作手冊）

### 0.3 收尾範式（每模組必跑）
對齊 NX02 / NX03 範本：
1. **自動化驗證**：`prisma migrate status` + `nx-api build` + `nx-ui build` + 三租戶 seed 重跑
2. **操作手冊**：`docs/_team/nxXX-{module}-operation-manual.md`（每功能：路徑 / 步驟 / 預期結果 / Crown 親測 checklist / Follow-up 列誠實）
3. **closure**：commit 完整 → merge `--no-ff` main → tag `vX.Y.Z-nxXX-{module}-lite-closure` → push main + tag → 更新 `docs/_team/git-state.md` → commit + push git-state → 寫 memory closure

### 0.4 公司範式（PROJECT_RULES §0.4）
- Crown = 總經理（創辦人）
- Alex = PM（AI）
- Hank = 工程師（AI、Cursor IDE / Claude Code 載體）
- 對 Crown 用一般員工口吻、不帶內部術語 / 編號
- worklog ⛔ 不寫（改 commit 訊息）
- merge-verify ⛔ 不獨立文件（merge commit 訊息詳列）

---

## §A. 路線總綱（為什麼按 tier 開發）

NEXORA 改「**按 tier 開發**」：先把 **LITE 完整可賣**、再 PLUS、再 PRO。
不再按模組（NX01→NX02→...）順序、改按客戶價值順序。

**LITE 五大模組順序（固定）**：
1. ✅ 階段 0 partner 改制（前置、tag `v1.1.0-partner-six-classes-closure`）
2. ✅ 階段 1 進貨 NX02（tag `v1.2.0-nx02-purchase-lite-closure`）
3. ✅ 階段 2 庫存 NX03（tag `v1.3.0-nx03-stock-lite-closure`）
4. 🟠 **階段 3 銷貨 NX04** ← 下一棒
5. ⏸️ 階段 4 財務 NX05
6. ⏸️ 階段 5 報表 NX08

---

## §B. 階段 0 partner 改制脈絡（v1.1.0）

### B.1 為什麼改
原本系統用 5 種 partner_type、Crown 反映「對不上恆迎業界實際分類」。要對齊保養廠 / 同行 / 供應商 / 物流 / 銀行 / 一般廠商六類業務實際。

### B.2 拍板過程
討論過兩種方案：
- **方案 A**：用旗標標註同行（保留現有 5 類 + isPeer 旗標）
- **方案 B** ✅ **拍板採用**：同行給獨立代號 O、保留 C 客戶、其他沿用
  - 理由：分類本身就明確、用旗標會讓「同行買貨 / 賣貨 / 調貨」三身份混亂

### B.3 最終六分類
| 代號 | 中文 | 用途 |
|------|------|------|
| C | 保養廠 | 客戶主體 |
| O | 同行 | 雙重身份：能買能調貨 |
| S | 供應商 | 採購來源 |
| T | 外包物流 | 運送 |
| B | 銀行 | 收付款 |
| V | 一般廠商 | 雜支付款對象 |

### B.4 canTransferStock 旗標
- 同行 O 預設 `true`（service create 自動帶）
- 保養廠 C 可手動設 `true`（彈性、有些大保養廠互通有無）
- 其他類型一般 `false`

### B.5 同行 O 的雙重身份（重要、影響後續模組）
- **客戶選單**：`partner_type IN ('C','O')`（同行也買貨）
- **供應商選單**：`partner_type='S'` only（O 不污染採購比價）
- **調貨對象**：`partner_type='O' OR canTransferStock=true`

### B.6 影響範圍
67 檔 + 17 service filter + DTO enum 清、seed 空殼 + 4 nx00 孤兒刪。

---

## §C. 階段 1 進貨 NX02 脈絡（v1.2.0）

### C.1 詢價單為什麼「不發單、純記錄」
Crown 拍板：「業務 LINE / 電話問、回來記」（恆迎實際流程）。
- 系統只做：產生詢價文字（複製貼到 LINE / Email）+ 並排比價 + 採用建單
- **不發單給供應商**（傳統 ERP 的 RFQ 流程太重、業務不會用）
- 客套話可設定（per-tenant 自訂開頭結尾、避免 hard-code）

### C.2 為什麼「採用報價」要分流
業務拍板：rfqType=G（一般詢價）vs rfqType=P（同行調貨）兩條路：
- **G** → adoptQt 建 **PO**（向 S 供應商比價、走採購）
- **P** → adoptQt 建 **TI**（向 O 同行調貨、走調貨單、D4 stub、需 sourceSoItemId）
- 同 RFQ 內其他 Qt 自動 REJECTED、RFQ CLOSED

### C.3 國外進貨為什麼「按金額比例攤」
Crown 拍板:原本「按數量平均」公式錯、修正成按金額比例。
- `actualUnitCost = (originalUnitCost × exchangeRate × qty + allocatedImportFee) ÷ qty`
- 例:100 個小零件 + 1 個大零件、不該各分一半費用、應按金額比例（貴的料分多運費）

### C.4 為什麼「成本=原始批次+移動平均並用」
歐元便宜時囤貨 → 批次成本記錄保留、移動平均做為日常出貨成本。
- **批次成本**:stock_ledger 每筆 unitCost 保留（可追溯）
- **移動平均**:stock_balance.avgCost 加權（出庫用）

### C.5 保固單兩型由來
- **客訴型**:客戶反映故障、連 SO（待 NX04 出來才能完整、需 sourceSoId picker、見 FU-04）
- **自用型**:自家庫存壞、不連 SO

**5 階段**:DRAFT → SUBMITTED → REVIEWED → COMPLETED / REJECTED
**4 結果**:NEW（換新）/ REF（退錢）/ RPR（維修）/ REJ（駁回）
**附件**:行照（Crown 強調最重要、避免冒用）+ 照片 + 影片（base64 範式、上限 100MB）

### C.6 供應商等級為什麼「付款條件自動算+手動」
初期沒信用評分 / 不良率數據、先用付款條件當代理指標：
- NET90 → A、NET60 → B、NET30 → C、PREPAY → D
- 之後客戶累積數據才換更精準的算法

### C.7 產品定價 ABCD
- 系統算為主：`cost × (1 + customer_grade.marginPct/100)`
- fallback：A=12% / B=15% / C=18% / D=22%
- 人工可微調覆寫

---

## §D. NX00 清理脈絡

### D.1 為什麼清
Crown 在畫面看到「NX00」字眼殘留、要求徹底清。

### D.2 原本以為 vs 實際發現
- **原本以為**:孤兒死碼、刪就好
- **實際發現**:是「命名過時的 active shared layer」、不能直接刪、要搬

### D.3 處理
- **Phase 1**:純死碼直接刪（32 個檔）
- **Phase 2**:活的 9 module 搬到 `features/shared/master/`（部分原 nx00 命名的東西其實是 master 主檔層）
- sed sweep + redirect rules 移除（舊 bookmark 從此 404）

### D.4 結果
`grep "nx00" apps/` = 0 殘留（排除 .next）、build 全綠。

---

## §E. 階段 2 庫存 NX03 脈絡（v1.3.0）

### E.1 三大拍板由來

#### E.1.1 異常回報新表 Nx03IssueReport（5 異常 × 5 處置分流）
- 原本可能在各模組散落寫「壞了 / 過期 / 短缺」、Crown 要統一入口
- **5 異常**:D 損毀 / E 過期 / S 短缺 / L 放錯庫位（locationId 必填）/ O 其他
- **5 處置**:R 退貨 / W 保固 / C 重組分解 / D 報廢 / N 未處置
- **軟連結 relatedDocId**（不建 FK、跨模組共用）

#### E.1.2 庫位查詢純從 ledger aggregate（不改 balance schema）
- **方案 A**:增 per-location balance（重）
- **方案 B** ✅ **拍板**:純從 ledger groupBy aggregate（不改 schema）
- 原因:per-location avgCost ≡ per-warehouse avgCost（同倉同料同成本、不必細到 per-location）

#### E.1.3 自動補貨走 nx98 task-pool、舊 Nx03AutoReplenish 表廢棄
- **不刪、只標 deprecated**
- 改走通用待辦池框架（NX02 帶出來的）

### E.2 重組 / 分解為什麼 LITE 就做
原本想押後、Crown 拍：接既有 `Nx03Conversion` service（已寫完整、M/D 兩 mode）→ 做 UI 就好、值得做。

### E.3 動態盤點既有完整
- `Nx03StockTake + Item` 已有五軸 snapshotQty / deltaQty / formulaExpectedQty / countedQty / realDiffQty
- 綠燈利多、不重做、本軌只補 4 欄位（核可流轉 + 差異原因 enum）

### E.4 盤點核可邏輯
- `maxItemDiffCost = max(abs(realDiffQty × unitCost))`
- ≤ smallToleranceQty → autoPass=true（倉管自過）
- \> smallToleranceQty → approvalStatus='P'（等 G 簽核）
- **強制要走 submitForApproval**（即使 smallTol=0 + 零差異也走一次 auto-pass）

### E.5 差異原因 enum
- S 被偷 / M 算錯 / B 破損 / U 不明
- 倉管在 ADJUSTING 階段填、有差異就要選

### E.6 盤點完自動寫待辦池
- POSTED on transaction、`stocktake.service.ts:807 writeReplenishTasks`
- 對 (partId, warehouseId) 唯一組合做 batch 檢查、低於 minQty 就寫
- 同 stocktake 同 part+warehouse 避重（OPEN / CLAIMED 任一狀態都跳過）

---

## §F. 兩個全模組共用框架（NX02 帶出、後續模組直接套）

### F.1 nx98 共享待辦池
- **位置**:`apps/nx-api/src/nx98/task-pool/` + `apps/nx-ui/src/features/nx98/`
- **資料表**:`Nx98TaskPool`（sourceModule + sourceDocType + sourceDocId 三軸軟連結、不建 FK）
- **三大視圖**:「我的待辦」/「部門池」/「指派他人」
- **領取機制**:unassigned → claimedByUserId（claim API）
- **跨模組接點**:各業務 service 寫入 task-pool
- **後續模組做法**:直接呼叫 `taskPoolService.create({ sourceModule:'nx04', sourceDocType:'sales-order', ... })`

### F.2 features/shared/tiered-form 三層欄位
- **位置**:`apps/nx-ui/src/features/shared/tiered-form/`
- **三層**:🟢 必要 / 🟡 建議（Alt+L 二段展開）/ ⚪ 進階（Alt+L 三段展開）
- **API**:`<TieredFormProvider>` + `<TieredField tier="lite|expanded|all">` + `<TieredFormToolbar />`
- **快捷鍵**:Alt+L 三段循環
- ⚠️ NX03 LITE 沒用 Provider、內聯 icon 標示（FU-stock-lite-02）

---

## §G. ⭐ 階段 3 銷貨 NX04 業務細節 — 已被取代

> ⚠️ 2026-05-30 docs 清檔：原 §G 銷貨業務細節（G.0~G.9）已被
> **`docs/_team/nexora-lite-blueprint-v1.2.md`** 完整取代（Alex 撰寫、總經理拍板）。
> 為避免雙來源 drift、本段細節刪除、僅保留指引。
> NX04 LITE closure 已完成（tag `v1.4.0-nx04-sales-lite-closure`、操作手冊
> `docs/_team/nx04-sales-operation-manual.md`），新 Alex / 新 Hank 直接讀 v1.2 + 操作手冊。

---

## §H. Follow-up 押後清單（不擋核心測試、之後一起補）

### H.1 進貨 NX02
- RFQ / PO / PR / Part / Partner form 三層欄位 retrofit
- 各既有 UI「空畫面 / 全鍵盤 / Alt+L/T」audit
- 保固附件 download 功能（目前只能 upload）
- 保固「客訴型」`sourceSoId` picker（待 NX04 SO 出來才能做）
- 待辦池業務模組自動 trigger（如：保固建立 → auto 寫待辦）
- 待辦池 RBAC enforce
- 待辦池 detail page（目前只有 list）
- 待辦池 realtime（目前要 refresh）
- NX02 hub `/dashboard/purchase/*` 舊路由整理

### H.2 庫存 NX03
- FU-stock-lite-01 主檔 picker（partId / warehouseId / locationId autocomplete）
- FU-stock-lite-02 UI 整合 TieredFormProvider（Alt+L 切換）
- FU-stock-lite-03 Mobile 版接真實 API（目前 mock）
- FU-stock-lite-04 盤點核可 RBAC enforce
- Conversion 草稿改明細（Alex 拍板「不做」、客戶反映才開）

### H.3 全模組
- **TASK-NX99-PLAN-MIDDLEWARE**:tier 守門中間件（LITE 用戶不能呼叫 PLUS / PRO endpoint）

---

## §I. 環境 / 紀律

### I.1 當前 git 狀態
- **main HEAD** = `32f721d`（NX03 closure 收尾 git-state update）
- **上一個業務 tag** = `v1.3.0-nx03-stock-lite-closure` → `7ae0c2a`
- **`feature/nx04-sales-lite`** 待開（從 main HEAD `32f721d` 起手）

### I.2 工具鏈提醒
- **Prisma 7**:`migrate dev` / `reset` **不會**自動跑 seed（v6 才會）、新環境手動跑 `pnpm seed`（從 `packages/db-core/` 跑）
- **GitHub CLI 沒裝**:PR 要 Crown 手動開、Hank 只 push branch + 給 PR title + body 模板
- **shell**:Windows PowerShell + Bash 都可用
- **pnpm workspaces**:根目錄 `pnpm` 跑全套、單包用 `pnpm --filter <pkg>`

### I.3 三租戶 seed 狀態
| Tier | tenantId | 狀態 |
|------|----------|------|
| LITE | `NX99TANT9900001` | 空殼（admin + 系統範本、無假業務資料） |
| PLUS | `NX99TANT9900002` | 空殼 |
| PRO | `NX99TANT9900003` | 空殼 |

Crown 自己放真實業務資料測（部分模組）、其他模組 Crown 依操作手冊親測。

### I.4 schema migration 累計
- **dev DB**:88 migrations applied、`migrate status` up to date
- **Railway production**:累計落後 88 支（A077、`.env` 維持 localhost、真實客戶簽約前 2~4 週才同步、本軌不動）

### I.5 角色分工
- **Alex** 寫意圖（業務需求 / 拍板 / FU 管理）
- **Hank** 寫實作（schema / code / 操作手冊）
- 不確定標 ⚠️ 回報 Alex 拍板、別擅自決定

---

## §J. 給新 Alex 接上最該注意的 3 件事

1. **NX04 銷貨「拉報價」非「轉換」的設計（§G.3 + §G.4）**
   - SO 不是從 QT 一鍵生成、是在 SO 上拉客戶舊 QT + 補新 Qt 混合
   - **部分待出貨是汽材行常態**、要支援（lineStatus WAIT / PARTIAL / DELIVERED）
   - 這跟一般 ERP 的「QT → SO 1:1 轉換」不一樣、別讓 Hank 走錯路

2. **跨模組共用接點不要重做（§G.8）**
   - 待辦池（nx98）、tiered-form 直接套
   - **IssueReport 共用 NX03 那張表**、不另建 NX04 異常表（Crown 拍板資料同表）
   - 出貨扣帳走 `applyQtyOutWithLedger`（NX03 helpers）
   - 保固客訴型 sourceSoId picker 是 NX02 FU-04、SO 出來後**回頭補**

3. **客戶等級變更核可流程（§G.7）**
   - **沿用 NX03 stocktake `approvalStatus` 範式**（不要重發明）
   - 含**變更歷史**、核可通過自動套新毛利、退回維持原等級
   - 這個 Crown 明確要、不要被當「OOTB CRM 流程」處理掉

---

# Part 0+ — 第五版增量（2026-06-03、給新 Alex 接手用）

> 從 NX04 之後到目前的所有業務脈絡 + 技術現況。
> 涵蓋 Crown 給的 A-F 六大塊（定位 / 本段完成 / 進行中 / 已拍板規則 / pending / 技術現況）。
> 風格對齊 Part 0：「為什麼 + 怎麼做 + 影響」、不只 commit log。

## §AA. 定位與角色

### AA.1 NEXORA LITE 做什麼

NEXORA 是「**汽車零件業 ERP**」、Crown 自身的恆迎企業是先導客戶。
LITE 是入門版（最便宜、5-15 席、月費）、PLUS / PRO 是進階版。

**LITE 範圍**（六大模組）：
1. **主檔中心**（NX01）：員工、客戶、供應商、產品、倉庫、品牌、車型、職務角色...
2. **進貨**（NX02）：採購需求 → 詢價（不發單、業務 LINE 問）→ 採購單 → 進貨單 → 保固
3. **庫存**（NX03）：庫存查詢、撿貨、包貨、盤點、異常回報、調撥
4. **銷貨**（NX04）：報價、銷貨單（部分出貨）、銷退、同行調貨
5. **財務**（NX05）：應收/應付帳款、票據、月關帳、401 兩個月雙報（已上報 vs 未上報）
6. **報表**（NX08）：個人月報、進貨、銷售、庫存、損益、營運 — 6 張、桌面+手機+Excel 三模式

每模組都有「業務中文名」（採購需求/詢價單/...）給客戶看、**內部 NXxx 不露**（Crown 鐵律）。

### AA.2 恆迎企業（TW-100001、第一個真客戶）

| 項 | 值 |
|---|---|
| tenantCode | `TW-100001`（規格 TW/ZT-{6digits}、平台軌 P6.3 定下） |
| 行業 | 汽車零件批發、保養廠 / 同行業務 |
| 訂閱方案 | LITE（onboarding 開戶硬編 seats=10） |
| Crown 角色 | 既是 NEXORA 創辦人、也是恆迎負責人；用恆迎當測試 + 上線首發 |
| 簽約預期 | 2026 年下半 / 待 Crown 拍板實際時程 |

### AA.3 三人團隊範式（PROJECT_RULES §0.4）

| 角色 | 名稱 | 載體 | 職責 |
|---|---|---|---|
| 總經理 | **Crown** | 真人 | 拍業務決策、看交付、不做中間驗證（瀏覽器測 AI 做不到、跳過） |
| PM | **Alex** | AI 對話 | 寫意圖（業務需求 / 拍板紀錄 / FU 管理）、不寫程式 |
| 工程師 | **Hank** | Cursor IDE / Claude Code | 寫實作（schema / code / 操作手冊）、隸屬 Alex |

#### AA.3.1 對 Crown 的回報範式（重要）
- **一般員工口吻**、不帶內部術語 / 編號（例：別寫「FU-onboarding-05」、寫「首次登入強制改密」）
- **絕無推銷**（席次滿不寫「升級 / 加購 / 聯絡我們」、就說「已達席次上限」）
- 該講的講完、不延伸別的軌

#### AA.3.2 Crown 授權邊界（速查）
| 動作 | 授權 |
|---|---|
| dev DB migration（localhost） | ✅ 自走 |
| git push main / feature | ✅ 自走 |
| merge to main `--no-ff` + tag | ✅ 自走 |
| commit 大小決定 | ✅ 自走（漸進式 Step-by-Step、每段 stop review） |
| 順手清技術債（不改外部行為 + commit 標示 + 回報列出） | ✅ 自走 |
| Railway production migration | ❌ **不動**（落後 92 支、客戶簽約前 2-4 週才同步） |
| `.env` localhost 改動 | ❌ 不改 |
| 破壞性 schema 變更（新表 / 刪欄 / 重命名） | ⚠️ STOP 報 Crown 拍板 |
| 不確定方向 | ⚠️ 標 ⚠️ 回報 Alex 拍板 |

#### AA.3.3 決策分級
- **業務規則**：Crown 拍板（席次規則、員編制、無推銷、客戶見字、流程設計）
- **PM/方案選擇**：Alex 提 2-3 案 + 推薦、Crown 點頭
- **工程實作**：Hank 自走（架構決定 / 抽常數 / 抽 helper / 命名）
- **跨段順序**：Crown 給策略（「先做段 5 再 2、4 共用」）、Hank 拆執行

### AA.4 跟舊 Alex 的差異（給新 Alex 的提醒）

舊 Alex 撰寫了 docs/_team/HANDOFF.md（封存交棒、2026-05-28）、之後是「分段對話接力」範式：模組 closure 後才換對話、中間不換。但本次 Crown 在席次制中段換你、因為對話接近上限、不換會斷線。所以：
- 你的「起點」是 main HEAD `53f8edb`、席次制段 5/2 已 commit、段 3 待開
- 「我說的」=本檔 + git log + 對應 spec 檔
- 換手後第一次走查、Crown 會稍微觀察你是否有對齊「無推銷」「員工口吻」這些細微規則

---

## §AB. 本段完成（首頁儀表板 + 設定精靈）

### AB.1 首頁儀表板大改造（11 commit、ttsdK `1281f58` → `5bd3755`）

#### AB.1.1 為什麼改
Crown 看舊首頁（Win8 磚式 + Pro/Lite 雙 body mock 渲染）不喜歡：「磚體沒辨識度、PRO 假資料、客戶看不懂」。要重設計成「**四區塊 dashboard**」：
- 上方：5 個用戶可設定數據格
- 下方三欄：任務清單 / 行事曆 / 事件簿

#### AB.1.2 設計重點（已定稿）
| 區塊 | 行為 |
|---|---|
| 5 數據格 | 空 = 虛線「+ 點擊設定數據」；點 → modal 列可選數據（**依使用者權限過濾**、KPI 標🔒升級套件不可選）；已設定 = 自動拉 endpoint 顯示計數 |
| 設定持久化 | 新表 `nx01_user_pref`（user × pref_key + JSONB pref_value）、跟使用者帳號跑、不 localStorage |
| 任務清單 | `/nx98/task-pool` 拉前 10 筆、緊急 badge + 逾期 |
| 行事曆 | mini month grid（自寫、不引 lib）、有事件圓點、選日連動右欄；資料源 `Nx01CalendarEvent` 表既存、但**目前無寫入端**（PENDING） |
| 事件簿 | filter 當日事件、S/C/R type badge |
| TopBar 三 icon | 公告 / 任務 / 精靈引導 全收 MasterTopBar、右下浮動鈕拿掉 |
| 視覺 | 對齊主檔中心 `glass-card.nx-glass-raised` + ParticleField 星空背景 |

#### AB.1.3 重要決策（避免被新 Alex 誤解）
- **5 格用戶可自選**：不是固定 21 卡（上一輪是、Crown 否決）
- **公告/任務獨立按鈕已刪**：全走 TopBar icon、避免雙入口
- **精靈引導浮動鈕已刪**：改 TopBar icon + window CustomEvent 觸發（WizardLauncher 只渲染 overlay）

### AB.2 設定精靈（3 個調整、commit `aca4d37`）

#### AB.2.1 🔴 下載範本 401 修了
- 根因：`window.open(url)` 直接開、瀏覽器新分頁不帶 Bearer
- 修法：fetch + Authorization + blob URL 觸發下載、Content-Disposition 解 filename
- 7 個 importer 共用同函式、一處修全修

#### AB.2.2 玻璃化
overlay shell / progress bar / 各內容 box 改 `glass-card` + token、對齊首頁打磨後風格。

#### AB.2.3 拿掉黃色依賴提示框
OrderPage（第二步「建議匯入順序」）下方原本有 `border-amber-300 bg-amber-50` 區塊講「沒先匯產品、進貨匯入時找不到產品」— Crown 認為多餘、整塊刪。

---

## §AC. 進行中（員工啟用 + 席次控管 + 預設密碼五段）

### AC.1 任務分段與當前進度

| 段 | 範圍 | 狀態 | commit |
|---|---|---|---|
| **段 1** | 範本拿掉「啟用」欄 + Importer 一律 `isActive=false` + 抽 `DEFAULT_EMPLOYEE_PASSWORD` | ✅ done | `34a130a` |
| **段 1.5** | 範本對齊員編制（latent bug 修：原範本沒員編欄、所有匯入 100% 失敗）+ Email 退選填 | ✅ done | `789bbce` |
| **段 5（提前）** | 後端 `user.service` 加 seats enforcement（`assertSeatCapacity` / `bulkActivate` / `getSeatUsage`）+ `update` 加 false→true 守門 | ✅ done | `b0341ea` |
| **段 2** | 精靈 ActivationStep UI：席次計數 + checkbox 清單 + 滿了 disable | ✅ done | `53f8edb` |
| **段 3** | ActivationStep 啟用成功後顯示預設密碼 `changeme` + 提示首登改密 | 🟠 **下一步** | — |
| **段 4** | 主檔切換啟用同樣走守門（service 已加、UI 跑通即可） | ⏸️ pending | — |

### AC.2 已落地的後端 API（給段 3/4 用）

```
GET    /nx01/users/seat-usage              → { used, total, available }
PUT    /nx01/users/bulk-activate           → { activated, seatUsage }
PATCH  /nx01/users/:id  { isActive: true } → 走同個守門（段 4 主檔切換用同 endpoint）
```

錯誤碼：
- **SE-001** Conflict：「已達席次上限（X/Y 席）、本次無法啟用 N 名使用者」
- **SE-002** Conflict：「租戶尚無有效訂閱、無法啟用使用者」（防護）

### AC.3 段 3 開工要點（給接手後）

- 在 `ActivationStep.tsx` 內、`onActivated` 回呼或 successCount 區、顯示密碼欄
- 密碼值：**從前端常數讀**（不從後端傳、避免額外 endpoint）；保持與 backend `DEFAULT_EMPLOYEE_PASSWORD` 同步
- 文案：「預設密碼：`changeme`、請通知員工首次登入後修改」
- 不要顯示在「啟用按鈕旁邊」常駐、只在啟用成功後顯示

### AC.4 段 4 開工要點（接手後）

- 主檔 user 列表已存在（`dashboard/base/users`）、切換啟用走 PATCH `/nx01/users/:id`
- 段 5 已在 `update` 加 false→true 守門、所以後端已就緒
- 主檔 UI 只需：失敗時 catch ApiClientError → 顯示「已達席次上限（X/Y 席）」訊息（無推銷）
- 順手可加 toolbar 上「X / Y 席」徽章（沿用 SeatBadge）

---

## §AD. 已拍板規則（Crown 親拍、未來不重議）

### AD.1 席次制（2026-06-03）

| 規則 | 內容 |
|---|---|
| 資料筆數 | **不限制**（員工可建 1000 筆都行） |
| 啟用受限 | 已啟用使用者數（**含負責人**）≤ 訂閱 seats |
| onboarding seats | 硬編 **10**（onboarding.service.ts:195、所有新租戶都是 10） |
| 含負責人 | 負責人（OWNER / 林翰杰）開戶時 `isActive=true`、**計入「目前啟用」**、所以從 `1/10` 起算、能再勾 9 個 |
| 匯入員工 | 一律 `isActive=false`（範本沒「啟用」欄）、之後在精靈「挑啟用」步驟勾 |
| 預設密碼 | `changeme`（沿用、首登 `mustChangePassword=true` 強制改）；Email 通知做好後改隨機 |
| 滿擋 | UI checkbox disable + 文字「已達席次上限（10 席）」；後端 SE-001 保底 |
| **絕無推銷** | 不寫「升級 / 加購 / 聯絡 / upgrade / contact」（spec 內負面斷言驗證） |
| 未啟用員工 | 之後可在主檔挑啟用（段 4）；資料筆數無限制 |
| 停用方向 | true→false 永遠放行、不檢查（idempotent） |

### AD.2 員工編號制（2026-06-02、平台軌 P6.3 之後）

| 規則 | 內容 |
|---|---|
| 員工帳號 | `userAccount` = 員工編號（自由文字、租戶內唯一） |
| 客戶可用舊習慣 | 例：`Y0053`、`001`、`wang` — 不強制格式（不補 Y、不補零） |
| Email | 改選填、純聯絡用（之後寄信 / 重設密碼） |
| 員編可改 | 改完不斷 FK 關聯（FK 全指 id、員編只是顯示） |

### AD.3 公司範式（PROJECT_RULES §0.4、2026-05-26）

- Crown = 總經理、Alex = PM、Hank = 工程師
- 對 Crown 回報用一般員工口吻、不帶內部術語 / 編號
- worklog ⛔ 不寫（改 commit 訊息）
- merge-verify ⛔ 不獨立文件（merge commit 訊息詳列）
- 範圍超出原本指示時：可直接做 + 事後回報（危險命令除外、例如 reset --hard / force push）

### AD.4 客戶見字鐵律
- 只露中文業務名（「採購需求」「詢價單」「採購單」「進貨單」「客戶」「員工」...）
- **不露任何 NXxx**（NX02 / NX03 / FU-xx / TASK-xx / commit SHA）
- 報表 / 訊息 / button label / 錯誤訊息 全部走中文業務語意

---

## §AE. PENDING / DEFER backlog

### AE.1 行事曆資料源未定 ⚠️
- table `Nx01CalendarEvent` 已存在（schema 261）、read-only endpoint `/nx01/calendar-event` 已做
- 但**沒有任何寫入端**（沒人把事件塞進這張表）
- 候選方案（待 Crown 拍）：
  1. 採購單到期日 / 銷貨單交期 → 自動寫事件
  2. user 手動建（CRUD UI 走完）
  3. 兩者並存
- 現況：首頁行事曆顯示「當日無事件」、不影響其他功能

### AE.2 「新公司從零建立」精靈引導未設計 ⚠️
- 目前精靈只有「匯入舊資料」流程（7 個 importer）
- 完全新公司（無舊資料）目前的選項是「全部略過、之後再說」
- 缺一條路徑：引導建立第一個客戶 / 第一個產品 / 第一個倉庫的單體流程
- 待 Crown 拍板要不要做（不擋 LITE 上線）

### AE.3 首頁質感 — 有資料再調
- 目前 5 數據格全 `count` 型（KPI ratio/trend/share 全標 isPremium 鎖）
- 等真實資料進來再看是否要加「上週/本週對比」「微縮趨勢線」之類
- 不擋上線

### AE.4 上線前必做（**全 defer**）
| 項 | 內容 |
|---|---|
| 登入時保底檢查 | 啟用已硬擋、登入不會超、極端邊界之後補（Crown 拍板 defer） |
| 真實定價 | 目前所有 plan baseFeeMonth / seatFeeMonth 是 placeholder、Crown 還沒給定價 |
| Email 通知 | 系統隨機密碼 → 寄信、目前用統一 `changeme` |
| 線上付費加購 | 加席次 / 升級 plan 流程；目前 Crown 後台手動改 nx99_subscription |

### AE.5 既有技術債（不擋核心）
- `useSessionMe` 回傳 `tenantLogoUrl` 但 type 沒寫進 `UseSessionMeResult`（tsc 顯 2 個錯、不擋 build）
- 全站掃描禁露 NXxx（i18n 反向檢查工具未做）
- mocks/dashboard.ts 還有 PRO 元件依賴（ProExpRankBar / ProNx10LeftPanel / ProTodayAttendancePanel）— 等 PLUS/PRO 真實接時清

### AE.6 順手提（員工範本「員編制」latent bug 已修）
- 段 1.5 已修：範本對齊員編制（新欄「員工編號（登入用）」、Email 退選填）
- 寫了 vitest 6 項驗證：raw Excel → extractDataRows → handler → prisma.create 端到端

---

## §AF. 技術現況 + 鐵律 + 起手指引

### AF.1 技術棧
| 項 | 值 |
|---|---|
| Backend | NestJS + Prisma 7 + PostgreSQL (localhost dev) |
| Frontend | Next.js 15 (App Router) + Tailwind + Radix UI + lucide-react + recharts |
| Monorepo | pnpm workspaces：`apps/nx-api` / `apps/nx-ui` / `packages/db-core` |
| Auth | JWT Bearer（client 存 localStorage）、`@UseGuards(JwtAuthGuard, RolesGuard)` |
| Test | vitest（nx-api）；nx-ui 暫無 vitest 環境（本軌不引入） |
| Shell | Windows PowerShell + Bash 都可（Hank 主要用 Bash tool） |

### AF.2 main HEAD + 最新 tag
- **main HEAD**：`53f8edb`（席次制段 2、2026-06-03）
- **最新業務 tag**：`v2.2.0-platform-tenant-separation`（平台/租戶層分離軌、2026-06-02）
- **前一個業務 tag**：`v2.1.0-lite-complete`（LITE 完整實測動線、2026-06-01）
- **席次制本軌結束時**：預計 closure tag 由 Crown 拍板（候選：`v2.3.0-seats-enforcement`）

### AF.3 各模組狀態
| 模組 | 狀態 | tag |
|---|---|---|
| NX01 主檔（25 主檔遷鋼鐵星球範式） | ✅ | `v1.0-nx01-closure` |
| NX02 進貨 | ✅ | `v1.2.0-nx02-purchase-lite-closure` |
| NX03 庫存 | ✅ | `v1.3.0-nx03-stock-lite-closure` |
| NX04 銷貨 | ✅ | `v1.4.0-nx04-sales-lite-closure` |
| NX05 財務（含 401 兩個月雙報、月關帳） | ✅ | `v2.0.6-alignment-f-complete` |
| NX08 報表（6 張） | ✅ | `v2.0.7-alignment-h-complete` |
| 手機殼（5 工作站 + dock + FAB + BarcodeScanner） | ✅ | `v2.0.8-alignment-g-complete` |
| LITE 整合（4 補連線：退貨→保固、PR 3 來源、國外進貨 UI、hub 11 redirect） | ✅ | `v2.1.0-lite-complete` |
| 平台 / 租戶分離（platform_admin 表 + JWT scope + /platform/login + TW/ZT 規格） | ✅ | `v2.2.0-platform-tenant-separation` |
| 首頁儀表板大改造 | ✅ | （無單獨 tag、commit `1281f58`→`5bd3755`） |
| 設定精靈打磨 | ✅ | （commit `aca4d37`） |
| 員工啟用 + 席次制 | 🟠 進行中段 3 | — |

### AF.4 鐵律（給新 Hank 起手前必讀、給新 Alex 配合審查時用）

| # | 規則 | 為什麼 |
|---|---|---|
| 1 | **Railway 0 碰**（落後 92 支 migration） | 真實客戶簽約前 2-4 週才同步、現在動會壞 production |
| 2 | **全 localhost**（`.env` 不動） | dev 流程穩定、改 env 會打散其他人 |
| 3 | **git add 精確路徑、不用 `-A`** | 避免帶到 `.env` / 隨機檔；公司範式既定 |
| 4 | **破壞性 schema 才 STOP**（新表 / 刪欄 / 重命名）；additive 直接做 | 同既有「破壞性結構變更才 review」範式 |
| 5 | **0 推銷字眼**（席次 / 升級訊息） | Crown 明確、客戶覺得被推銷會反感 |
| 6 | **只露中文名、不露 NXxx** | 客戶見字鐵律 |
| 7 | **驗證附證據**（vitest / grep / actual URL）、不憑記憶 | Crown 2026-06-02 走查抓到「Sub 2 commit 說改了實際沒改」事件後立的鐵律 |
| 8 | **段段 stop review**（漸進式重構） | Crown 不喜歡一次大改、看不到中間決策；改 commit 後 stop 等核可 |
| 9 | **Edit 後驗證**（grep/Read 確認改了、commit 前 git diff、測前端實際 URL） | 同 #7 |
| 10 | **危險命令前確認**（reset --hard / force push / 跨檔 sed sweep） | 公司範式：範圍超出可直接做、但危險命令例外 |

### AF.5 新 Alex 起手 checklist

1. **看本檔 §AA～§AF**（最新進度脈絡）
2. **`git log --oneline -20`**（看 commit 序列 / Crown 回應節奏）
3. **看席次制 5 個 commit 的訊息**：`34a130a` / `789bbce` / `b0341ea` / `53f8edb`（段 1 / 1.5 / 5 / 2）
4. **看 PROJECT_RULES §0.4**（公司範式）— `docs/PROJECT_RULES.md`
5. **跑一次測試確認環境**：`cd apps/nx-api && pnpm exec vitest run src/nx01/user/__tests__/seat-enforcement.spec.ts`（應該 12/12 過）
6. **準備接 Crown 的「段 2 review 通過、接段 3」訊息**、先別動、等 Crown 主動

### AF.6 新 Hank 起手 checklist

1. 本檔 §AA～§AF 全讀
2. `docs/PROJECT_RULES.md` Part III Hank 段
3. `git log --oneline -30`、看上輪 commit 風格
4. 對應 spec：`apps/nx-api/src/nx01/user/__tests__/seat-enforcement.spec.ts`、`apps/nx-api/src/sys-admin/importer/__tests__/employee-template.spec.ts` 跑過確認
5. 接 Crown 段 3 指示開工

---

> 第五版到此結束。後續每個 closure tag 後可再加 §AG / §AH 增量、保持時序、不動 Part 1。

---

# Part 1 — Hank 進度交接（原文、聚焦 git / commit / 進度）

> 以下原文：Hank 視角的進度紀錄、聚焦 commit / migration / build 結果。
> 跟 Part 0 互補（Part 0 解釋「為什麼」、Part 1 解釋「做了什麼」）。
> 原 §1~§9 章節保持不動、只在最上面加 Part 0、章節編號維持。

## 1. 路線總綱

### 1.1 開發路線（2026-05-28 Crown 拍板）

NEXORA 改「**按 tier 開發**」：先把 **LITE 完整可賣**、再 PLUS、再 PRO。
不再按模組 (NX01→NX02→...) 順序、改按客戶價值順序。

**LITE 藍圖文件**：[memory: project_lite_blueprint.md](../../C--NEXORA/memory/project_lite_blueprint.md)（Alex 2026-05-28 寫）

**LITE 五大模組順序（固定）**：
1. ✅ 階段 0 partner 改制（前置、tag `v1.1.0-partner-six-classes-closure`）
2. ✅ 階段 1 進貨 NX02（tag `v1.2.0-nx02-purchase-lite-closure`）
3. ✅ **階段 2 庫存 NX03（M1~M6 全部完工、tag `v1.3.0-nx03-stock-lite-closure`）** ← 本檔 closure
4. 🟠 **階段 3 銷貨 NX04** ← 下一個 Hank 起手點
5. ⏸️ 階段 4 財務 NX05
6. ⏸️ 階段 5 報表 NX08

### 1.2 Crown 授權邊界（重要）

| 項目 | 授權 |
|------|------|
| migration（dev DB） | ✅ 自走 |
| git push（main + feature） | ✅ 自走 |
| merge to main (`--no-ff`) | ✅ 自走 |
| tag closure | ✅ 自走 |
| commit 大小決定 | ✅ 自走（漸進式 Step-by-Step） |
| Railway production migration | ❌ **不動**（A077、累計落後 89 支、真實客戶簽約前 2~4 週才同步） |
| `.env` localhost | ❌ 不改 |
| 中間驗證 | ❌ **Crown 不做**（瀏覽器測 AI 做不到、跳過、記操作手冊、Crown 最後親測） |
| 不確定的方向 | ⚠️ 標 ⚠️ 回報 Alex 拍板、別擅自決定 |

### 1.3 收尾範式（每模組必跑）

對齊階段 1 NX02 範本：
1. **自動化驗證**：`prisma migrate status` + `nx-api build` + `nx-ui build` + 三租戶 seed 重跑
2. **操作手冊**：`docs/_team/nxXX-{module}-operation-manual.md`（每功能：路徑 / 步驟 / 預期結果 / Crown 親測 checklist / Follow-up 列誠實）
3. **closure**：commit 完整 → merge `--no-ff` main → tag `vX.Y.Z-nxXX-{module}-lite-closure` → push main + tag → 更新 `docs/_team/git-state.md` → commit + push git-state

---

## 2. 已完成階段

### 2.1 階段 0 — partner 改制 ✅

- **Tag**：`v1.1.0-partner-six-classes-closure`（沿襲、實際 closure commit 在 `4938dd0` 之前 merge）
- **六分類**：`C` 保養廠 / `O` 同行 / `S` 供應商 / `T` 外包物流 / `B` 銀行 / `V` 一般廠商
- **同行特殊**：用獨立代號 `O` + `canTransferStock` 旗標（service create 自動帶 true）
- **客戶選單**：`partner_type IN ('C','O')` — 同行也買貨
- **供應商選單**：`partner_type='S'` only
- **調貨對象**：`partner_type='O' OR canTransferStock=true`
- **詳見**：memory `project_partner_six_classes_closure.md`

### 2.2 階段 1 — 進貨 NX02 ✅

- **Tag**：`v1.2.0-nx02-purchase-lite-closure`、merge `9bf8419`
- **14 commits 整軌**（M1 schema → M6 操作手冊）
- **核心交付**：
  - 詢價單（產生詢價文字 + 多家並排比價 + 採用建 PO）
  - 採購單 / 進貨單（驗收 + 移動平均成本）
  - 國外進貨（匯率鎖定 + 費用按金額比例攤分）
  - 退貨單 + 自動 AP 沖銷
  - 保固申請單（兩型 / 5 階段 / 4 結果 / base64 附件）
  - 客套話設定（per-tenant）
  - 供應商等級重算（A/NET90 → B/NET60 → C/NET30 → D/PREPAY）
  - 產品定價重算（cost × (1+marginPct)、fallback A=12%/B=15%/C=18%/D=22%）
- **業務分流**（看 commit message + 操作手冊）：
  - **rfqType=G 一般詢價** → adoptQt 建 **PO**
  - **rfqType=P 同行調貨** → adoptQt 建 **TI**（D4 stub、需 sourceSoItemId）
- **操作手冊**：[docs/\_team/nx02-purchase-operation-manual.md](nx02-purchase-operation-manual.md)（13 章節 + Crown 親測 checklist）
- **詳見**：memory `project_nx02_purchase_lite_closure.md`

### 2.3 NX00 命名清理 ✅

- **Tag**：`nx00-cleanup-complete`、merge `7dc3b6d`
- **Phase 1**：rm 32 個死碼（user/user-role full module + 6 module dormant UI/hooks/meta）
- **Phase 2**：搬家 + sed sweep
  - `features/nx00/*` → **`features/shared/master/*`**（9 active modules：brand/car-brand/location/lookup/part/partner/role/role-view/warehouse）
  - `features/base/nx00-*` → 去 `nx00-` 前綴（3 個）
  - `menu.nx00.ts` → `menu.base.ts`
  - `nx00_access_token` → `access_token`（⚠️ user 下次需重新登入）
  - `nxapi_nx00_*` → `nxapi_*`
- **結果**：`grep "nx00" apps/`（排除 .next）= **0 殘留**、build 全綠
- **副作用**：舊 bookmark `/dashboard/nx00*` 從此 404（redirect rules 刪除）
- **詳見**：memory `project_nx00_cleanup_closure.md`

### 2.4 main HEAD 對齊

| 項目 | 值 |
|------|----|
| main HEAD | `9909502`（[HANDOFF] 2026-05-28 Hank 中段交接） |
| feature 分支 HEAD | `62df415`（NX03-STOCK-LITE M3-2、未 merge） |
| 最新業務 tag | `nx00-cleanup-complete` → `7dc3b6d` |
| 上一輪 closure | `v1.2.0-nx02-purchase-lite-closure` → `9bf8419` |
| origin/main + feature 分支 | 已同步 push |

### 2.5 ⭐ NX03 LITE 階段 2 全軌完工（M1~M6 全部 closure）

**分支**：`feature/nx03-stock-lite`（從 main `9909502` 開、已 merge main、可刪）
**Merge commit**：`7ae0c2a`
**Tag**：`v1.3.0-nx03-stock-lite-closure`

**完整 11 commits**（`git log --oneline 9909502..7ae0c2a`）：

| Commit | 範圍 | 摘要 |
|--------|------|------|
| `19b4c10` | M1 schema | 1 新表 `Nx03IssueReport` + 4 欄位（盤點核可+差異原因+預設庫位）+ AutoReplenish 標 deprecated；migration `20260528400000_nx03_stock_lite_m1_schema` |
| `3bdb4c0` | M2-A/B | stocktake 核可流轉（submitForApproval + decideApproval）+ POSTED→nx98 task-pool 自動寫補貨通知 |
| `dce38fc` | M2-F | PartStockSetting 補 defaultLocationId + suggestLocation endpoint + safety>max warning |
| `fde6862` | M2-E | 新 stock-query 模組（by-part/by-location/by-warehouse 3 endpoint） |
| `c749f43` | M2-C | 新 IssueReport 模組（CRUD + report/dispose/close/cancel、5 處置軟連結） |
| `877d236` | M3-1 | 庫存中心 hub 補入口 + 盤點工作台 UI（list + detail + 完整核可流程） |
| `62df415` | M3-2 | 庫存查詢三維度 UI + 庫位設定 UI + 產品設定 UI |
| `3beb654` | M3-3a | 異常回報 UI（list + detail + 5 異常 × 5 處置 + 狀態流轉） |
| `4a9d2b7` | M3-3b | 重組 / 分解 UI（list + 建單 + detail + M/D 兩 mode + 過帳 / 作廢） |
| `c798910` | M4 | 整合驗證 empty commit（migrate / seed / build / 跨模組接點、明細寫 commit message） |
| `06ca97f` | M5 | 操作手冊 docs/_team/nx03-stock-operation-manual.md（13 章節 / 570 行） |

**M2-D Conversion**：發現 `conversion.service.ts` 既有完整實作（merge M + disassemble D 兩路徑齊全、cost weighting auto/manual、partVersionId 帶入）— 無需修改、本軌已標 ✅。

**migration 狀態**：dev DB 已套用 M1 migration、Railway production 累計落後 88 支（A077、未動、`.env` 維持 localhost）。

**驗證狀態（M4 全綠）**：
- `prisma migrate status` ✅ 88 migrations + lock = up to date（含 M1 nx03_stock_lite_m1_schema）
- `pnpm --filter nx-api build` ✅ EXIT=0
- `pnpm --filter nx-ui build` ✅ EXIT=0、4 組新路由（stocktake / stock-query+warehouse+part-stock-setting / issue-report / conversion）
- `pnpm seed` ✅ SYSTEM + LITE/PLUS/PRO 三租戶全綠
- 5 張新表 dev DB ✅（nx03_issue_report / nx03_conversion / nx03_conversion_input / nx03_conversion_output / nx98_task_pool）
- 跨模組接點 ✅（盤點 POSTED → nx98 task-pool / IssueReport 5 處置軟連結 / Conversion 13 處 ledger）

**重點設計決策（Alex 已認同、寫進 commit msg + memory）**：
- 盤點 POSTED 強制 `approvalStatus='A'`、不允許跳過送審（即使 smallTol=0 + 零差異仍要走一次 submitForApproval auto-pass）
- M2-B 補貨通知 inline 在 stocktake.service tx 內、不引入 TaskPoolService 跨模組依賴（保持原子性）
- M2-C IssueReport dispose 不強制 relatedDocId（軟連結、UI 可後續補）
- M2-E 庫位維度 onHandQty 純從 ledger groupBy aggregate（Crown 拍板 B = 方案 C、不改 balance schema）
- M2-E per-location avgCost ≡ per-warehouse avgCost（balance schema 拍板：同倉同料同成本）
- M3 桌面優先、mobile 留 FU；UI 內聯 🟢🟡⚪ icon、未走 TieredFormProvider（FU-stock-lite-02）
- M3-3b Conversion 建單即定型、要改作廢重建（Alex 拍板 LITE 可接受、不開後端 update inputs/outputs endpoint）

**Follow-up 押後階段 3+（操作手冊 §10 詳列）**：
- FU-stock-lite-01 主檔 picker（partId / warehouseId / locationId autocomplete）
- FU-stock-lite-02 UI 整合 TieredFormProvider（Alt+L 切換）
- FU-stock-lite-03 Mobile 版接真實 API（InventoryHubMobile + MobileLocationListPage 目前用 mock）
- FU-stock-lite-04 盤點核可 RBAC enforce（決定簽核權限對應 ABCD/EF 主管、跟進貨待辦池一起補）
- 待辦池 FU-05~08（跨軌、與 NX02 共用）

---

## 3. 兩個跨模組共用框架 ⭐（後續模組直接套）

階段 1 進貨意外帶出兩個 framework、所有 LITE 模組都會用：

### 3.1 nx98 共享待辦池

- **位置**：`apps/nx-api/src/nx98/task-pool/` + `apps/nx-ui/src/features/nx98/`
- **資料表**：`Nx98TaskPool`（schema.prisma、含 sourceModule + sourceDocType + sourceDocId 三軸軟連結、不建 FK）
- **三大視圖**：「我的待辦」/「部門池」/「指派他人」
- **領取機制**：unassigned → claimedByUserId（claim API）
- **跨模組接點**：各業務 service 寫入 task-pool（如「保固單建立 → 寫待辦給技術員」）
- **後續模組做法**：直接呼叫 `taskPoolService.create({ sourceModule:'nx03', sourceDocType:'stock-take', ... })` 即可

### 3.2 features/shared/tiered-form 三層欄位

- **位置**：`apps/nx-ui/src/features/shared/tiered-form/`
- **三層**：
  - 🟢 **必要**（核心欄位、永遠顯示）
  - 🟡 **建議**（業務常用、Alt+L 第二段展開）
  - ⚪ **進階**（罕用、Alt+L 第三段展開）
- **API**：`<TieredFormProvider>` + `<TieredField tier="lite|expanded|all">{...}</TieredField>` + `<TieredFormToolbar />`
- **快捷鍵**：Alt+L 三段循環切換
- **後續模組做法**：表單外包 Provider、欄位 wrap TieredField、頂部放 Toolbar

---

## 4. Follow-up 押後清單（不影響核心測試、之後分批清）

階段 1 closure + NX03 LITE M3 中途留下、可在任何時機補：

| 編號 | 項目 | 預估 |
|------|------|------|
| FU-01 | RFQ / PO / PR / Part / Partner form 三層欄位 retrofit | 中（單模組 1~2 commit） |
| FU-02 | 各既有 UI「空畫面 / 全鍵盤 / Alt+L/T」audit | 中 |
| FU-03 | 保固附件 download 功能（目前只能 upload）| 小 |
| FU-04 | 保固「客訴型」`sourceSoId` picker（待 NX04 SO 出來才能做） | ⏸️ blocked by 階段 3 |
| FU-05 | 待辦池業務模組自動 trigger（例：保固建立 → auto 寫待辦）| 中 |
| FU-06 | 待辦池 RBAC enforce（目前任何 user 可 claim）| 中 |
| FU-07 | 待辦池 detail page（目前只有 list、點開沒頁面）| 中 |
| FU-08 | 待辦池 realtime（目前要 refresh）| 大、PLUS |
| FU-09 | NX02 hub `/dashboard/purchase/*` 舊路由整理 | 小 |
| **FU-stock-lite-01** | **盤點/查詢/設定 UI 的主檔 picker（partId/locationId/warehouseId autocomplete）** | **中（NX03 M3 留下、目前接收 ID 文字輸入）** |
| **FU-stock-lite-02** | **NX03 LITE UI 整合 TieredFormProvider（目前內聯 🟢🟡⚪ icon、未走 Provider）** | **小** |
| **FU-stock-lite-03** | **Mobile 版整合（既有 InventoryHubMobile + MobileLocationListPage 用 mock data、未接真實 API）** | **中** |
| **FU-stock-lite-04** | **盤點核可 RBAC enforce（決定簽核權限對應 ABCD/EF 主管、跟進貨待辦池一起補）** | **中** |

⚠️ FU-04 是 blocked by 階段 3（SO 主檔）、其他可隨時做。
⚠️ FU-stock-lite-01~04 是本輪 NX03 LITE 中途留下、Alex 已登記、不影響交付。

---

## 5. 下一個任務 ⭐ — LITE 階段 3 銷貨（NX04）

### 5.0 ⭐ 新 Hank 接手起點（讀這裡）

**main HEAD**：`7ae0c2a`（merge feature/nx03-stock-lite、tag `v1.3.0-nx03-stock-lite-closure`）
**從哪裡起**：
```bash
git checkout main && git pull
git log --oneline -10                # 看到 7ae0c2a Merge feature/nx03-stock-lite
git tag | grep nx03                  # 看到 v1.3.0-nx03-stock-lite-closure
```

**剩餘 LITE 階段**：
- 🟠 **階段 3 銷貨 NX04** ← 新 Hank 起手
- ⏸️ 階段 4 財務 NX05
- ⏸️ 階段 5 報表 NX08

**階段 3 銷貨 NX04 起手前提**：等 Alex 開「銷貨 LITE 需求總綱」、再對齊 NX02/NX03 範式 Step-by-Step（M1 schema → M2 backend → M3 frontend → M4 整合 → M5 手冊 → M6 closure）。

**注意接點**（NX04 銷貨會用到的 NX03 庫存掛鉤）：
- 銷貨出貨會走 `applyQtyOutWithLedger`（sourceModule='NX04'、sourceDocType='SO'）扣 stock_balance
- `Nx03Outbound` 表為銷貨預留接點、本軌未動、階段 3 才決定是否啟用
- 保固客訴型 `sourceSoId` picker 需 NX04 SO 出來才能做（FU-04）
- NX03 IssueReport 軟連結 `sourceModule + sourceDocType + sourceDocId` 已支援、銷貨可建異常回報軟連結到 SO

**每階段做完回報 Alex 放行下一階段**。Crown 全權授權 push/migrate/merge、Railway 不動、不確定標 ⚠️。

### 5.1 M3-3 規格 ✅ 已完工（保留供參考、實作見 commits `3beb654` + `4a9d2b7`）

#### 5.1.1 異常回報 UI（IssueReport）

**路由**：`/dashboard/inventory/issue-report`（路徑已在 hub 配置、目前 404、需要建）

**對應後端**：`/nx03/issue-report` — 完整 CRUD + report/dispose/close/cancel endpoint（M2-C commit `c749f43` 已做完）

**狀態流程**（service 內 STATUS_EDGES、UI 要對齊）：
- DRAFT → REPORTED（提交、向倉管/主管出聲）
- REPORTED → PROCESSING（dispose 動作、選 5 處置之一 + 軟連結 relatedDocId）
- PROCESSING → CLOSED（close 動作、處置完成）
- 任意 → CANCELLED

**5 異常 × 5 處置**：
- issueType: D=損毀 / E=過期 / S=數量短缺 / L=放錯庫位 / O=其他
- dispositionType: R=退貨 / W=保固 / C=重組分解 / D=報廢 / N=未處置
- ⚠️ issueType=L 時 locationId 必填（service 自律、UI 也要對齊）
- ⚠️ dispose 不強制 relatedDocId（軟連結特性、UI 顯示可選 input）

**UI 範式**：對齊 M3-1 盤點 / M3-2 庫位 / 產品設定範式：
- 路由：`features/inventory/issue-report/ui/IssueReportListView.tsx` + `IssueReportDetailView.tsx`
- `app/dashboard/inventory/issue-report/page.tsx` + `[id]/page.tsx`
- list + 篩選（status / issueType / dispositionType / warehouseId / search）
- inline 新增（warehouseId + partId + qty + issueType + 必要 locationId）
- detail：header + 狀態流程按鈕 + dispose 處置選 5 + close 結案
- 空畫面 + 全鍵盤 N/R + 🟢🟡⚪ icon

**API client 套路**：對齊 `apps/nx-ui/src/features/inventory/stocktake/api/stocktake.ts`、5 個動詞 endpoint 用 POST。

#### 5.1.2 重組/分解 UI（Conversion）

**路由**：`/dashboard/inventory/conversion`（路徑已在 hub 配置、目前 404）

**對應後端**：`/nx03/conversion`（既有 controller、無需改後端）

**重點業務**：
- conversionType: `M`=重組（N inputs → 1 output、output unitCost = Σ 加權）/ `D`=分解（1 input → N outputs、costRatio auto/manual mode）
- 狀態：DRAFT → POSTED → VOIDED（過帳一步到位）
- inputs / outputs invariant 校驗在 service 層（不必 UI 重複、UI 只做基本表單）
- create 時要送完整 inputs[] + outputs[]、過帳寫 ledger（service 自動算成本）

**UI 範式**：
- `features/inventory/conversion/ui/ConversionListView.tsx` + `ConversionFormView.tsx`
- list（含 status filter）+ 新增多列 inputs/outputs 的編輯表單 + 過帳/作廢按鈕
- 三層欄位：必要（conversionType / warehouseId / inputs / outputs）/ 建議（remark）/ 進階（無）
- POSTED 後唯讀

⚠️ 重組分解涉及多列 inputs/outputs、UI 表單複雜度比其他高一點、可以參考 NX02 RR/PO 表單 pattern 或自製簡化版（minimal viable）。

### 5.2 M4 整合驗證 ✅ 已完工（commit `c798910`、驗證明細寫進 commit message）

對齊 NX02 範本：
1. `prisma migrate status`（應 up to date、89 支）
2. `nx-api build`（黑盒、應全綠）
3. `nx-ui build`（next build、應全綠）
4. 三租戶 seed 重跑：`pnpm db:seed`（LITE/PLUS/PRO 三租戶開通）
5. （可選）寫 1-2 個快速 smoke test 確認 stocktake post 不爆

### 5.3 M5 操作手冊 ✅ 已完工（commit `06ca97f`、`docs/_team/nx03-stock-operation-manual.md`）

撰寫 `docs/_team/nx03-stock-operation-manual.md`、結構對齊 `nx02-purchase-operation-manual.md`：

| 章節 | 內容 |
|------|------|
| §1 模組概觀 | 7 功能列表 + 路徑 |
| §2 盤點工作台 | 路徑 / 步驟（DRAFT→COUNTING→ADJUSTING→送審→過帳）/ 核可邏輯 / Crown 親測 checklist |
| §3 庫存查詢三維度 | 路徑 / 三 tab / 預期回應 |
| §4 異常回報 | 路徑 / 5 處置 / 軟連結 / Crown 親測 checklist |
| §5 重組分解 | 路徑 / M/D 兩 mode / cost 算法 |
| §6 庫位設定 | 路徑 / CRUD / 停用 |
| §7 產品設定 | 路徑 / 安全量/最高量/預設庫位 / warnings 顯示 |
| §8 補貨通知 | 盤點 POSTED 後 → nx98 task-pool 範例 / 觀察方式 |
| §9 Follow-up | FU-stock-lite-01~04 + 全局 FU 連結 |

### 5.4 M6 closure ✅ 已完工（merge commit `7ae0c2a` + tag `v1.3.0-nx03-stock-lite-closure`）

對齊 NX02 收尾 SOP：
1. `git checkout main && git merge --no-ff feature/nx03-stock-lite -m "Merge feature/nx03-stock-lite: NX03 庫存 LITE 模組（M1~M6）"`
2. `git tag v1.3.0-nx03-stock-lite-closure`
3. `git push origin main && git push origin v1.3.0-nx03-stock-lite-closure`
4. 更新 `docs/_team/git-state.md`（main HEAD + tag 行）
5. commit + push git-state
6. 寫 memory `project_nx03_stock_lite_closure.md`（對齊 `project_nx02_purchase_lite_closure.md` 結構）
7. 回報 Alex「庫存 LITE closure 完成、可進階段 3 銷貨」

### 5.5 分支策略 ✅ 已完工（`feature/nx03-stock-lite` 已 merge main、可刪）

---

## 5-A. 舊 §5.x（原 M1 開工前的設計需求總綱）⭐ 保留供參考

### 5.1（舊版）需求總綱（Crown 2026-05-28 定案）

**定位**：倉管（CD 主力 / EF 協助）工作台。
入出庫不在這獨立做（進貨銷貨自動）、管：**查詢 + 盤點 + 庫位 + 異常**。

**五大功能**：
1. **盤點作業**（多頻率：日/週/隔週/季/年 × 多範圍：族群/區域 × 動態盤點 + 自動補貨通知 + 差異核可 + 原因記錄）
2. **庫位維護**（既有 Nx01Location 已有）
3. **產品維護**（最高量倉管設 + 預設庫位 + 安全量採購已做）
4. **異常回報**（5 類整合一張表、跨模組共用入口）
5. **庫存查詢**（料號 / 庫位 / 倉庫三維度）

### 5.2 落差盤點重點（給新 Hank 直接看結論）

**🟢 既有可用（不動）**：
- `Nx03StockBalance` 庫存現況、`Nx03StockLedger` 帳冊（per warehouse 維度完整）
- `Nx03StockTake + Item` 盤點單（⭐ **動態盤點 schema + service 已完整**、五軸 snapshotQty/deltaQty/formulaExpectedQty/countedQty/realDiffQty、`stocktake.service.ts:37-69, 157-184, 462-489` ledger aggregate 已實作）
- `Nx03PartStockSetting` 含 `minQty`（安全量、採購用）+ **`maxQty`（最高量、已有）**
- `Nx01Location` 庫位主檔（NX01 closure 已做）

**🔴 需補（Crown 三大拍板已定）**：

| # | Crown 拍板 | 落差 |
|---|-----------|------|
| A | **異常回報**：方案 A 獨立新表（入口 → 5 處置分流：退貨/保固/重組/分解/報廢） | 🔴 新建 `Nx03IssueReport` 表 |
| B | **庫位維度查詢**：方案 C 純從 ledger aggregate、不改 balance 結構 | 🔴 新增 query endpoint（無 schema 改動）|
| C | **自動補貨**：用 nx98 task-pool 統一入口、舊 `Nx03AutoReplenish` 表廢棄 | 🔴 task-pool 串接 + AutoReplenish 表廢用（不刪、只標 deprecated） |
| D | **盤點差異核可**：小門檻倉管自過、超過 G 簽核 | 🔴 補 `smallToleranceQty` / `approvalStatus` / `approverUserId` / `approvedAt` 4 欄位 |
| E | **盤點差異原因** enum | 🔴 補 `varianceReasonCode` enum（被偷/算錯/破損/不明）|
| F | **預設庫位** | 🔴 補 `Nx03PartStockSetting.defaultLocationId` 1 欄位 |
| G | **重組 / 分解 完整做** | ⭐ Crown 拍板「不延後、本軌做」、接既有 `Nx03Conversion + Input + Output` schema |
| H | **盤點 → nx98 補貨通知**（POSTED 後自動產生待辦） | 🔴 service 串 task-pool |
| I | **safety ≤ max 警示**（LITE 提示即可） | 🟡 service 層 warning |

**🟡 既有可用、需 UI**：
- `Nx03Disposal` 報廢單 schema + service 完整、缺 UI
- `Nx03Conversion + Input + Output` 組裝轉換 schema 已有、缺 service + UI（重組分解本軌做）

**🔴 前端 UI 幾乎空白**：
- `apps/nx-ui/src/features/nx03/` 只有 sales/ + workflow/（銷貨相關、非庫存）
- `/dashboard/nx03/workspace` 是 placeholder
- **需建：盤點工作台 / 庫存查詢三維度 / 異常回報 / 產品設定 / 庫位設定**

### 5.3 預估規模

對齊 NX02 範式、**約 14~20 commits**：
- **M1 schema**：5~7 欄位 + 1 新表（IssueReport）+ 1 migration
- **M2 backend**：盤點 task-pool 串接、IssueReport CRUD、stock-balance per-location aggregate query、PartStockSetting + Conversion service
- **M3 frontend**：5 大工作台（盤點 / 查詢 / 異常 / 產品設定 / 庫位設定）+ Disposal/Conversion UI
- **M4 整合**：safety/max warning、Inbound/Outbound 角色確認、AutoReplenish 廢用
- **M5 操作手冊** + **M6 closure**

### 5.4 Inbound/Outbound 角色（已釐清）

| 表 | 結論 |
|----|------|
| `Nx03Inbound` | 業務 caller = 0、進貨入庫**不經此表**、直接 `applyQtyInWithLedger`。保留為「手工過帳憑證」、本軌**不主動開 UI** |
| `Nx03Outbound` | 業務 caller = 0、預留銷貨接點。階段 3 銷貨才決定是否啟用 |

Crown 拍板：保留結構不廢棄、本軌不動。

### 5.5 分支策略

- 新分支：`feature/nx03-stock-lite`
- 從 main `1b41db5` 開
- 對齊 NX02 範式 Step-by-Step commit

---

## 6. 紀律（Crown 範式 / PROJECT_RULES §0.4）

| 規則 | 操作 |
|------|------|
| 對 Crown 回報 | 員工口吻、不帶內部術語 / 編號 |
| 範圍超出 | 可直接做 + 事後回報（危險命令除外） |
| worklog | ⛔ 不寫（改 commit 訊息）|
| merge-verify | ⛔ 不獨立文件（merge commit 訊息詳列）|
| 漸進式重構 | Step 完成即 commit、等核可才下一步（但 Crown 全權授權後可連續做、做好紀錄） |
| 技術債順手清 | 滿足三條件（不改外部行為 + commit 標 + 回報列）可不問清掉 |
| 不確定方向 | 標 ⚠️ 回報 Alex、別擅自決定 |
| 系統不刪資料 | 所有 master「D 刪除」實為軟刪（`isActive=false`）、UI 顯示「停用」+ `PowerOff` icon |
| 新建 / 修改檔案第一行 | 必須是路徑註解（`// apps/nx-api/src/...`） |
| 回覆語言 | 一律繁體中文 |

---

## 7. 環境提醒

### 7.1 工具鏈

- **Prisma 7**：`migrate dev` / `migrate reset` **不會**自動跑 seed（v6 才會）。新環境要手動跑：
  ```bash
  pnpm db:seed   # 三租戶 LITE/PLUS/PRO 開通
  ```
- **GitHub CLI（`gh`）沒裝**：**PR 要 Crown 手動開**。Hank 只 push branch + 給 PR title + body 模板讓 Crown 貼。
- **shell**：Windows PowerShell + Bash 都可用、`Bash` tool 處理 sed/find/grep（dist 是 gitignored、build 產物無關 source 殘留）
- **pnpm workspaces**：根目錄 `pnpm` 跑全套；單包用 `pnpm --filter <pkg>`

### 7.2 三租戶 seed 狀態

| Tier | tenantId | 狀態 |
|------|----------|------|
| LITE | `NX99TANT9900001` | 空殼（admin + 系統範本、無假業務資料） |
| PLUS | `NX99TANT9900002` | 空殼 |
| PRO | `NX99TANT9900003` | 空殼 |

Crown 自己放真實業務資料測（部分模組）、其他模組 Crown 依操作手冊親測。

### 7.3 schema migration 累計

- dev DB：**89 migrations applied**、`migrate status` up to date
- Railway production：**累計落後 89 支**（A077、`.env` 維持 localhost、真實客戶簽約前 2~4 週才同步、本軌不動）

### 7.4 公司範式（PROJECT_RULES §0.4）

- **Crown** = 總經理（創辦人）
- **Alex** = 專案經理 PM（AI）
- **Hank** = 工程師（AI、Cursor IDE / Claude Code 載體、就是接班的你）
- 對 Crown 用一般員工口吻、不要說「Hank」「Alex」內部術語、用「我」「PM」即可

---

## 8. 新 Hank 起手 checklist（階段 3 銷貨 NX04 接手版）

接班第一件事跑：

```bash
git fetch origin
git checkout main
git pull origin main
git log --oneline -10                # 應看到 7ae0c2a Merge feature/nx03-stock-lite
git tag | grep nx03                  # 應看到 v1.3.0-nx03-stock-lite-closure
git status                           # 確認工作區乾淨
cat docs/_team/HANDOFF-LITE-PROGRESS.md  # 讀本檔（特別是 §2 進度 + §5 下一階段）
```

確認 HEAD 是 `7ae0c2a`、tag `v1.3.0-nx03-stock-lite-closure` 存在、然後跟 Alex 講「庫存 closure 對齊、要開銷貨 NX04」。

**第一步推薦**：等 Alex 開「銷貨 LITE 需求總綱」、再 scan 既有 `apps/nx-api/src/nx04/` 與 `apps/nx-ui/src/features/sale*/` 看現況、跟 Alex 確認落差表後對齊 NX02/NX03 範式 Step-by-Step（M1 schema → M6 closure）。

**對齊兩個跨模組共用框架**（NX02 帶出、本軌也用、銷貨繼續用）：
1. nx98 共享待辦池：`apps/nx-api/src/nx98/task-pool/`（銷貨可寫待辦：催客戶付款 / 出貨延遲 / 退貨追蹤等）
2. features/shared/tiered-form 三層欄位：`apps/nx-ui/src/features/shared/tiered-form/`（銷貨表單可用 Provider 取代內聯 icon）

⚠️ 對話視窗大小是體力資源、做完一個 milestone 後可告一段落、避免做一半斷線。

---

## 9. 相關文件索引

| 文件 | 用途 |
|------|------|
| [HANDOFF.md](HANDOFF.md) | 上一輪舊 Hank 封存交棒（瞭解路線轉向）|
| [git-state.md](git-state.md) | 當前 main / branch / tag 狀態（每 closure 更新）|
| [nx02-purchase-operation-manual.md](nx02-purchase-operation-manual.md) | NX02 進貨操作手冊（Crown 親測用、本軌交付範本）|
| `../PROJECT_RULES.md` | 規範合一手冊（§0.4 + Part I + Part III Hank 段必讀）|
| `../PROJECT_CONTEXT.md` | 業務介紹（Yaro / 恆迎 / 三人團隊）|
| memory `project_lite_blueprint.md` | LITE 藍圖（Alex 2026-05-28 寫的五階段路線）|
| memory `project_nx02_purchase_lite_closure.md` | NX02 closure 摘要 + 業務規則 |
| memory `project_nx00_cleanup_closure.md` | NX00 命名清理 closure |
| memory `project_partner_six_classes_closure.md` | partner 六分類 closure |

---

> 收尾：交棒完成、main 工作區乾淨。
> 新 Hank：直接讀 §5 進階段 2 庫存（NX03）開工。
> Crown / Alex：等新 Hank 起手確認、給開工指令。
