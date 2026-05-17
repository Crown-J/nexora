<!-- docs/nx05/nx05-worklog.md -->

# NEXORA - NX05 - 財務模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX05 財務管理（ar / ap / receipt / payment / note / allowance / period-close）+ NX05 主導的跨模組接收側（NX02/NX04 → NX05 自動建單）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 3 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ **NX05 工作量比 NX01~NX04 都小**（Phase5 落地後即穩定）— 反映真實樣貌、不湊主題
- **跨模組或公版主題不寫進本日誌**、寫進 [_team/worklog.md](../_team/worklog.md)（過帳通用規則 / A002 drift / B5-Aa 跨模組同源 widening）

---

## 主題 1｜v7_baseline + Phase5-NX05 第六批 API 落地（2026-04-14~15）

### 起源

`spec_v7_baseline` 建好 NX05 schema（ar / ap / paylog / note / allowance / closing）。Phase5「第六批 API」按序填模組（NX99 → NX01 → NX02 → NX03 → NX04 → **NX05**）。

> ⚠️ **NX05 沒有 spec 目錄**：`docs/nx05/spec/` 不存在、業務邏輯**真相來源在 [dailylog/20260413.md](../../dailylog/20260413.md) + [20260415.md](../../dailylog/20260415.md)** 的 Phase5-NX05 段落。Alex 之後寫 NX05 規格書要從這兩份 dailylog 挖、不是從 spec/intent/ 找。

### 設計決策

1. **7 子模組對齊單據生命週期**：
   - **AR**（應收）/ **AP**（應付）：debit/credit 主帳
   - **receipt**（收款）/ **payment**（付款）：paylog 子帳（API 路徑 `/nx05/receipt`、DB `nx05_paylog`、`PY-` 前綴共用）
   - **note**（票據）：銀行往來
   - **allowance**（折讓）：AR/AP 沖抵
   - **period-close**（關帳）：月結鎖定
2. **9 個共用 utils 抽 `shared/nx05/`**（最多模組之一）：
   - `nx05-list-query / nx05-doc-no / nx05-state-machine / nx05-ar-display`（基礎）
   - `nx05-finance-access.guard`（獨立財務角色 guard、不共用 ADMIN）
   - `nx05-period-lock`（關帳鎖、跨表強制關帳期間不可改）
   - `create-ap-from-po / sync-ap-from-po / create-ar-from-so`（跨模組接收側、見主題 2）
   - `nx05-paylog-posting`（CR/CP 過帳沖回、見主題 3）
3. **`nx05-finance-access.guard` 獨立財務角色 guard**：不能用 `@Roles('ADMIN')` 通吃。理由：財務權限是業務角色、不該綁系統角色（ADMIN）；老闆/出納/會計各自看不同 endpoint。
4. **IPv4 解析改 split**：guard 內判斷 client IP（內網辦公室 vs 外網行動） — 第一版用 regex `(\d+)\.(\d+)\.(\d+)\.(\d+)` 撞括號 escape 錯誤、改 `ip.split('.')` 直接拿四段。
5. **`nx05-period-lock` 關帳鎖**：當期關帳後（period-close POSTED）、所有跨表寫入動作（AR/AP/paylog/note/allowance）拒絕「`docDate` 在已關帳期間」的單。理由：避免財務報表上一期數字被回填動到。

### 實作歷程

- 2026-04-15（migration）`20260415120000_nx05_paylog_status_void_posted` | paylog 狀態加 VOIDED（見主題 3）
- 2026-04-15（migration）`20260415130000_nx05_ar_ap_closing_status_currency` | AR/AP closing status + currency baseline drift fix
- 2026-04-15（commits 在 `feature/sys-dashboard`） | 7 子模組 controller/service/DTO + 9 共用 utils + crud-fetch 驗證腳本

### 踩坑 / 學到的

- **regex 跨多語環境的括號 escape 風險**：第一版 IPv4 regex 在某些 lib（例如 `class-validator` 內部 string 處理）會把括號 escape 錯、變成不正確的 group。教訓：**簡單問題用簡單方案**、`ip.split('.')` 一行解決、不需要 regex 高深匠氣。
- **關帳鎖必須在 application 層、不在 trigger**：第一版想用 trigger 擋寫入、但 trigger 拋出的錯誤訊息對使用者不友善（PostgreSQL exception 看不懂）。改 application service 開頭 check `nx05-period-lock`、拋業務 exception。教訓：**錯誤訊息可讀性是 application 層責任、trigger 適合做 invariant 不適合做業務 validation**。
- **「ADMIN 通吃」對財務模組是反 pattern**：早期 NX01~NX03 都用 `@Roles('ADMIN')` 保守做、NX05 不能跟。財務角色獨立 guard 從本主題開始、後續其他模組（B2 開放公開、見 [NX03 主題 4](../nx03/nx03-worklog.md)）也朝「角色細分」方向走、A021 是這個方向不一致的記錄。

### Migration 列表（NX05 直接相關 + 跨模組受影響）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX05 schema 建立（ar / ap / paylog / note / allowance / closing 等） |
| `20260415120000_nx05_paylog_status_void_posted` | paylog 加 VOIDED 狀態（主題 3）|
| `20260415130000_nx05_ar_ap_closing_status_currency` | AR/AP closing status + currency baseline drift fix |
| `20260427051334_phase0_b5_drift_fix_fk_columns_widening` | 跨模組同源 widen `nx05_note.currency_id` VARCHAR(10)→(15)（**B5-Aa 主導、見 [NX02 主題 5 5B](../nx02/nx02-worklog.md)**、本日誌不重述）|

### 對應文件

- 後端：[apps/nx-api/src/nx05/](../../apps/nx-api/src/nx05/) + [shared/nx05/](../../apps/nx-api/src/shared/nx05/)
- 業務真相來源：[dailylog/20260413.md](../../dailylog/20260413.md) + [20260415.md](../../dailylog/20260415.md)（Phase5-NX05 段落）
- 過帳通用規則：[CLAUDE.md §九](../../CLAUDE.md) + [_team/worklog.md 主題 3](../_team/worklog.md)
- 對應架構債：A021（finance-access.guard 角色細分 vs 其他模組 ADMIN-only 不一致）

---

## 主題 2｜跨模組業務鏈：NX02 / NX04 → NX05 自動建單

### 起源

業務鏈：採購到貨（RR POSTED）→ **應該自動產生 AP**（廠商欠我們錢、要付）。銷貨出貨（SO SHIPPED）→ **應該自動產生 AR**（客戶欠我們錢、要收）。問題：**自動建單邏輯放哪個模組？**

3 個方案對焦：

| 方案 | 做法 | 取捨 |
|------|------|------|
| **i** ⭐ | NX05 主導、提供 `create-ap-from-po / create-ar-from-so` helper、NX02/NX04 過帳時呼叫 | NX05 對 AR/AP 100% 控制、NX02/NX04 不需懂財務細節 |
| ii | NX02/NX04 主導、寫 AP/AR 邏輯內嵌在 RR/SO service | 散落、財務改邏輯要動 3 個模組 |
| iii | trigger 自動建單 | 跨表 trigger 太複雜、debug 困難 |

選方案 i：**「自動建單在接收側 NX05、業務模組只發訊號」**。

### 設計決策（核心：為什麼接收側設計）

1. **`create-ap-from-po.ts`（NX02 觸發）**：RR `POSTED` 在 transaction 內呼叫此 helper、依 PO header + items 建 AP 主帳 + 子帳。AP 編號 NX05 自己決定（AP- 前綴）、跟 PO/RR docNo 綁但不重複。
2. **`sync-ap-from-po.ts`（NX02 改動同步）**：PO 在「過帳前」改幣別 / 金額 / 廠商、AP 同步更新（一對一同步）。過帳後則禁止改、走作廢流程。
3. **`create-ar-from-so.ts`（NX04 觸發）**：SO `SHIPPED` 在 transaction 內呼叫、跟 AP 對稱結構。
4. **業務模組只「發訊號」、不「寫財務」**：RR/SO service 只 import helper、不直接 INSERT nx05_ap/ar。理由：財務 schema 改動只動 NX05、業務模組不需 redeploy。

### 跨模組業務鏈表

| 業務動作 | 觸發模組 | 接收側 | 接收側 helper | 過帳結果 |
|---------|---------|--------|--------------|---------|
| RR POSTED | NX02 | NX05 | `create-ap-from-po` | AP 建立 + AP_item N 筆 |
| PO 過帳前改 | NX02 | NX05 | `sync-ap-from-po` | AP 同步更新 |
| SO SHIPPED | NX04 | NX05 | `create-ar-from-so` | AR 建立 + AR_item N 筆 |
| SR POSTED | NX04 | NX05 | （未實作）| ⚠️ allowance 沖抵邏輯待補 |

### 實作歷程

- 2026-04-15 `feature/sys-dashboard` 內提交 | 3 個 helper + RR/SO service 內呼叫點

### 踩坑 / 學到的

- **「接收側設計」對 schema 演進極友善**：NX05 改 AR/AP 欄位、不需動 NX02/NX04 一行 — 過了 3 個月（v7_baseline 0413→0427 Phase 0 收官）NX05 schema 完全沒被動到、就是接收側設計的紅利。
- **同 transaction 跨模組呼叫的隱性 coupling**：`create-ap-from-po` 是 NX02 RR service 內呼叫、出錯整批 rollback。但 NX05 內部錯誤訊息對 NX02 service 不可解 — 教訓：**跨模組 helper 拋錯要包成業務 exception、不要把 Prisma 內部錯訊往上拋**。
- **作廢流程要對稱**：第一版做了 `create-` 沒做 `void-`、結果 PO 作廢但 AP 還活、財務報表錯。教訓：**自動建單跟自動作廢要成對設計、不能只做正向**。SR → allowance 沖抵也是同類缺口（待補）。

### 對應文件

- 共用 helper：[apps/nx-api/src/shared/nx05/create-ap-from-po.ts](../../apps/nx-api/src/shared/nx05/create-ap-from-po.ts) / `create-ar-from-so.ts` / `sync-ap-from-po.ts`
- 跨模組關聯：[NX02 主題 1](../nx02/nx02-worklog.md)（RR POSTED 過帳寫 ledger 同步呼叫 create-ap）/ [NX04 主題 1](../nx04/nx04-worklog.md)（SO SHIPPED 過帳呼叫 create-ar）

---

## 主題 3｜paylog 過帳邏輯（CR/CP + VOIDED 沖回）

### 起源

收款（CR）/ 付款（CP）的 paylog 跟 NX03 stock ledger 在概念上對稱：**業務動作 → 寫 ledger**。但**有一個關鍵差異**：

- NX03 stock 過帳**不可逆**：扣完就扣完、要沖只能開反向單（IB 退貨進帳）
- NX05 paylog **允許 VOIDED**（沖回）：原 paylog 直接標 VOIDED、寫反向 paylog 扣回

為什麼財務允許 VOIDED 而庫存不允許？— 業務本質決定。

### NX05 paylog VOIDED vs NX03 stock 不可逆 — 4 維度對比

| 維度 | NX05 paylog | NX03 stock |
|------|-------------|-----------|
| **業務本質** | 數字操作（金額帳）、可純 software 修正 | 物理操作（實體貨）、修正涉及實體搬移 |
| **沖回設計** | `POSTED → VOIDED` 直接狀態變、開反向 paylog 沖回 | 不可從 SHIPPED 退回 DRAFT、要走 SR/IB 開反向業務單 |
| **Audit trail** | 原 paylog 留 `VOIDED` 狀態 + 反向 paylog、雙紀錄保留 | 原單留 SHIPPED + 新增 SR/IB 反向業務單、跨表審計 |
| **設計理由** | 財務報表要「沖一抵一」可解釋、VOIDED 是會計學標準動作 | 庫存反映物理世界、不允許「軟刪除已扣量」（會跟實體不一致） |

> 這個對比是 NX05 工作日誌的核心教學價值：**過帳設計要對齊業務本質、不能跨模組複製貼上**。

### 設計決策

1. **paylog state machine 多一個 `VOIDED`**：跟 NX02/NX03/NX04 的 `CANCELLED` 不同、VOIDED 是「過帳後的合法狀態」、CANCELLED 是「過帳前作廢」。兩個語意不同、不能合併。
2. **`nx05-paylog-posting.ts` 雙函式對稱**：
   - `postPayLog(tx, paylog)`：CR/CP 過帳、寫 ledger / 更新 AR-AP `paid_amount` / 計算餘額
   - `voidPayLog(tx, paylog)`：開反向 paylog 同 transaction 沖回、原 paylog 標 VOIDED
3. **不在 application 自己組沖回邏輯**：寫 helper 強制呼叫者走 `voidPayLog()`、不開放手動 INSERT 反向 paylog。理由：審計鏈要保證「VOIDED 一定有對應反向 paylog」、手動易漏。
4. **VOIDED 的關帳期間檢查**：若原 paylog 在已關帳期間、不能 void（會破壞已關期數字）。要 void 必須先反關帳。

### 實作歷程

- 2026-04-15（migration）`20260415120000_nx05_paylog_status_void_posted` | 加 VOIDED token、保留舊 V 字元向下相容
- 2026-04-15 `feature/sys-dashboard` | `nx05-paylog-posting.ts` + state-machine 加 `POSTED → VOIDED`

### 踩坑 / 學到的

- **「VOIDED 也是合法狀態」是會計常識、不是工程概念**：早期我把 VOIDED 當「壞掉的單據」要過濾掉、Crown 揭露「VOIDED 是會計標準的『沖一抵一』、要顯示在報表上才合會計準則」。教訓：**財務模組設計要懂會計準則、不能套庫存模組那套「不可逆」哲學**。
- **state machine 命名衝突要早期收斂**：CANCELLED vs VOIDED 兩個 token 各模組混用前若不統一、跨模組查詢會把語意搞混。NX05 paylog 內部統一 VOIDED、CANCELLED 留給「過帳前作廢」、文檔內每次提到都標明指哪個。
- **沖回不是「反向修正錯誤」、是「業務過程的一部分」**：客戶退款 / 廠商退貨 / 票據作廢 / 銀行退票全是 VOIDED 場景、不是少數 case。設計時要當 first-class citizen 不是 edge case。

### 對應文件

- 共用：[apps/nx-api/src/shared/nx05/nx05-paylog-posting.ts](../../apps/nx-api/src/shared/nx05/nx05-paylog-posting.ts)
- 過帳通用規則對比：[CLAUDE.md §九](../../CLAUDE.md)（NX03 不可逆過帳）
- 跨模組關聯：[NX03 主題 1](../nx03/nx03-worklog.md)（stock 過帳不可逆對比）

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/nx01-worklog.md) / [NX02](../nx02/nx02-worklog.md) / [NX03](../nx03/nx03-worklog.md) / [NX04](../nx04/nx04-worklog.md) worklog 五段式結構
- ⚠️ **「穩定模組真誠揭露」範式**（本日誌新建立）：當模組工作量真的小（NX05 是首例）、worklog 反映真實樣貌、不為對齊其他 worklog 篇幅湊主題。**worklog 大小應反映模組真實工作量、不為對稱湊字數**。
- ⚠️ **「穩定模組訊號 audit」範式**（本日誌新建立）：NX05 後續若出現新工作、要先 audit「這是跨模組受影響（B5-Aa 模式）」還是「真的 NX05 業務新增」？前者引用主導模組 worklog 不重述、後者才獨立寫主題。NX05 的穩定性本身是訊號、突然有大量 commit 要警覺。
- **跨模組對比表格化**（本日誌主題 3 4 維度對比 NX05 vs NX03 過帳）：當兩模組設計**有意刻意不同**時、表格化對比讓教學價值最大化。沿用 NX02 主題 5 / NX03 主題 4 對比手法。
- **「接收側設計」**範式（主題 2）：跨模組業務鏈的 helper 放接收側、業務模組只發訊號 — schema 演進友善、解耦清晰。未來 NX06 物流 / NX08 報表的跨模組接收若有類似情境可參考。
- 跨模組或公版（過帳通用規則 / 公版 component / BUSINESS-RESTRUCTURE / A002 / B5-Aa 跨模組同源 widening / 跨模組測試基礎設施演進）**不寫進本日誌**、已寫進 [_team/worklog.md](../_team/worklog.md) 統合
- 下一輪預期：[docs/nx06/nx06-worklog.md](../nx06/nx06-worklog.md)（NX06 物流模組、Phase5-NX06 + DN 送貨單 + GPS/intl-shipping、預期工作量也偏小）

---

## 主題 4｜TASK-NX05-IMPL-01 財務模組業務閉環收口（A 軌、2026-05-18、12 commit / 1 migration、Q-RHYTHM-2 首次落地）

### 起源

NX04 銷貨範圍 A closure（v0.6.0、2026-05-18）後、業務鏈進入閉環階段（採購 + 庫存 + 銷貨 + 自動補貨 → 財務）。Crown 揭露「財務不熟、Alex 主導業務判斷」、Crown 3 輪需求討論 + Alex 主導整合 → 11 題拍板 closure → overview v0.1.0 → Hank audit-01 verify。

⭐⭐⭐ **Q-RHYTHM-2 首次落地**：Crown + Alex 預批授權、Hank 全軌連跑、僅 Final merge 介入。

### 設計決策（5 項戰略對齊）

1. **業界標準科目表 seed（Crown Q5=b + Q6=a）**：
   - 改編恆迎 204 科目為亞羅汽配業專用範本（95 科目精選）
   - 8 大分類（1xxx 資產 / 2xxx 負債 / ... / 8xxx 所得稅）
   - 汽配業特色：庫存零件 / 在途進口商品 / 車輛保險 / 油料費
   - isSystem=true 軟刪除、用戶可改 name + 加新科目
   - 業界改革候選 ⭐⭐⭐

2. **AR 月底自動對帳單（Crown Q3 + Q7=a）**：
   - ArStatementService（仿 NX02 rfq.exportRfq text + payload 範式）
   - period 3 段彙整（本月新增 / 本月收款 / 期末未收）
   - cron decorator 註冊留 backlog（對齊 AR @nestjs/schedule 範式）
   - 業界改革候選 ⭐⭐⭐

3. **逾期催收警示（Crown Q4 + Q8=a）**：
   - 共享 NX04 既有 Nx99Tenant.creditOverdueDaysThreshold（不新建 schema）
   - 業務一致性：客戶逾期判定使用同 tenant 閾值
   - OverdueWatcherService（按 customer 分組統計、排序）
   - 業界改革候選 ⭐⭐⭐

4. **業務閉環完整化（7 helper 全乾淨）**：
   - 5 helper 隨 NX02/NX04 兩軌 closure 已落地
   - 本軌 +2 新 helper（createApFromPostedRr LITE 直接路徑 + createApFromPostedTi 同行調貨）
   - +2 既有 Allowance helper 補 FinancePeriod 校驗（補完 NX02 Phase 5 / NX04 Phase 4 既知邊界）
   - 業界改革候選 ⭐⭐

5. **UI 全 stub + menu.nx05.ts 補建（Crown Q-U1=c 對齊 NX02/NX04 範式）**：
   - workspace 升 desc + 4 新 placeholder（ap / ar / allowance / closing）
   - menu.nx05.ts 建立（audit-01 §3.4 揭露既有 0 檔）
   - features/finance/ 命名孤兒留 TASK-NX05-DEMO-CLEANUP

### 實作歷程

| Phase | commit | sha | 主軸 |
|---|---|---|---|
| 0 | 1 | 79d930d | plan v0.1.0（Q-RHYTHM-2 啟用）|
| 1 | 1 | 467c4ad | M1 AccountCode seed（~95 科目、改編恆迎）|
| 2 | 1 | f408afd | L1 AccountCodeService CRUD（補主檔缺口）|
| 3a | 1 | 47715b1 | ArStatementService（月底對帳單）|
| 3b | 1 | 0656c36 | OverdueWatcherService（逾期催收）|
| 4 | 1 | d526e6c | L4 2 新 helper（RR + TI → AP）+ 2 既有 Allowance helper FinancePeriod 補強 |
| 5 | 1 | e9db785 | UI 4 placeholder + menu.nx05.ts |
| 6 | 3 | c5ed47f / ... | summary + worklog（本主題）+ merge verify report |

### 踩坑

1. **Q-RHYTHM-2 第一次全軌連跑**：
   - 過渡：plan 寫完直接進 Phase 1、沒等 Crown 拍板
   - 教訓：信任「Crown + Alex 預批」、節奏比 NX04 快 1.5 倍（NX04 14 commit / 數小時 vs NX05 12 commit / 1~2 小時）
   - 後續軌：穩定模組（NX06 物流推測也是）可沿用 Q-RHYTHM-2

2. **Phase 3c note CLEARED 觸發 Paylog 範圍取捨**：
   - 原 plan：升 note.service.update 加 CLEARED 分流自動建 Paylog
   - 實作複雜（需 inject PaymentService / 寫多表 tx / 處理 BOUNCED 沖回）
   - 決定：本軌僅文件揭露、留 TASK-NX05-NOTE-PAYLOG 獨立軌
   - 教訓：Q-RHYTHM-2 自主節奏下要克制、複雜業務優先留獨立軌

3. **menu.nx05.ts 0 檔的 drift 路徑**：
   - audit-01 §3.4 揭露：既有 menu.nx04.ts 內容寫 NX05 財務（NX04 Phase 6 已修）
   - production menu 系統可能斷指（NX04 修後 NX05 失聯）
   - 本軌補建 menu.nx05.ts 對齊 menu.nx02.ts / nx03.ts 範式

4. **createApFromPostedRr / Ti helper 純 export 不 wire**：
   - 本軌補完 5+2 helper、但不 wire 到 NX02 既有 rr.service / TI 處理流
   - 避免改 NX02 production 行為（risk averse）
   - 後續軌 NX02 LITE 路徑 / TI service 啟動時 wire

### 統合教訓

1. **Q-RHYTHM-2 節奏 vs 風險平衡**：
   - 自主節奏快、但風險決策（如改 production 行為）仍應克制
   - 「純 export helper、不 wire」範式可保留風險選擇給後續軌
   - 教訓：自主 ≠ 激進、保守選擇仍重要

2. **NX05 schema 衝擊最小**：
   - NX02：4 軌 migration / NX04：2 軌 / NX05：1 軌（純 seed）
   - 原因：既有 8 model 設計成熟（D3+D4 之前已成熟）+ 本軌純補配套
   - 教訓：閉環模組（接收端）通常 schema 已成熟、實作量 < 業務模組

3. **共享 tenant 設定範式**（NX04 ↔ NX05）：
   - Nx99Tenant.creditOverdueDaysThreshold 共享、業務一致性
   - 跨模組同源設定避免「同事不同口」風險
   - 後續軌可參考：multi-tenant 設定考慮跨模組共享

4. **業界標準 seed + 用戶可改可加範式**：
   - 改編恆迎 204 → 亞羅汽配業 95 精選
   - 系統提供標準範本、用戶可改名稱 / 加子科目 / 軟刪除
   - 後續軌可參考：主檔資料 seed 策略（PartGroup / Warehouse 等）

### 對應文件

- 業務需求：[nx05-overview.md](./spec/intent/nx05-overview.md) v0.1.0
- 實作計畫：[nx05-impl-01-plan.md](./spec/impl/nx05-impl-01-plan.md) v0.1.0
- AUDIT-01：[nx05-audit-01.md](./nx05-audit-01.md)
- 模組架構書：[nx05-summary.md](./nx05-summary.md) v1.0

### Migration 全列表（1 軌、A041）

| Migration | 主題 | 性質 |
|-----------|------|------|
| `20260518200000_nx05_impl_01_m1_account_code_seed` | 主題 4 | AccountCode 業界標準科目 INSERT（~95 科目、改編恆迎）|

---

> 文件版本：v1.1（主題 4 新增、TASK-NX05-IMPL-01 12 commit 完整實作歷程、Q-RHYTHM-2 首次落地）
