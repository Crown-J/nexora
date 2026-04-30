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
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（過帳通用規則 / A002 drift / B5-Aa 跨模組同源 widening）

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
- **「ADMIN 通吃」對財務模組是反 pattern**：早期 NX01~NX03 都用 `@Roles('ADMIN')` 保守做、NX05 不能跟。財務角色獨立 guard 從本主題開始、後續其他模組（B2 開放公開、見 [NX03 主題 4](../nx03/worklog.md)）也朝「角色細分」方向走、A021 是這個方向不一致的記錄。

### Migration 列表（NX05 直接相關 + 跨模組受影響）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX05 schema 建立（ar / ap / paylog / note / allowance / closing 等） |
| `20260415120000_nx05_paylog_status_void_posted` | paylog 加 VOIDED 狀態（主題 3）|
| `20260415130000_nx05_ar_ap_closing_status_currency` | AR/AP closing status + currency baseline drift fix |
| `20260427051334_phase0_b5_drift_fix_fk_columns_widening` | 跨模組同源 widen `nx05_note.currency_id` VARCHAR(10)→(15)（**B5-Aa 主導、見 [NX02 主題 5 5B](../nx02/worklog.md)**、本日誌不重述）|

### 對應文件

- 後端：[apps/nx-api/src/nx05/](../../apps/nx-api/src/nx05/) + [shared/nx05/](../../apps/nx-api/src/shared/nx05/)
- 業務真相來源：[dailylog/20260413.md](../../dailylog/20260413.md) + [20260415.md](../../dailylog/20260415.md)（Phase5-NX05 段落）
- 過帳通用規則：[CLAUDE.md §九](../../CLAUDE.md) + 待寫 [_shared/worklog.md](../_shared/worklog.md)
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
- 跨模組關聯：[NX02 主題 1](../nx02/worklog.md)（RR POSTED 過帳寫 ledger 同步呼叫 create-ap）/ [NX04 主題 1](../nx04/worklog.md)（SO SHIPPED 過帳呼叫 create-ar）

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
- 跨模組關聯：[NX03 主題 1](../nx03/worklog.md)（stock 過帳不可逆對比）

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/worklog.md) / [NX02](../nx02/worklog.md) / [NX03](../nx03/worklog.md) / [NX04](../nx04/worklog.md) worklog 五段式結構
- ⚠️ **「穩定模組真誠揭露」範式**（本日誌新建立）：當模組工作量真的小（NX05 是首例）、worklog 反映真實樣貌、不為對齊其他 worklog 篇幅湊主題。**worklog 大小應反映模組真實工作量、不為對稱湊字數**。
- ⚠️ **「穩定模組訊號 audit」範式**（本日誌新建立）：NX05 後續若出現新工作、要先 audit「這是跨模組受影響（B5-Aa 模式）」還是「真的 NX05 業務新增」？前者引用主導模組 worklog 不重述、後者才獨立寫主題。NX05 的穩定性本身是訊號、突然有大量 commit 要警覺。
- **跨模組對比表格化**（本日誌主題 3 4 維度對比 NX05 vs NX03 過帳）：當兩模組設計**有意刻意不同**時、表格化對比讓教學價值最大化。沿用 NX02 主題 5 / NX03 主題 4 對比手法。
- **「接收側設計」**範式（主題 2）：跨模組業務鏈的 helper 放接收側、業務模組只發訊號 — schema 演進友善、解耦清晰。未來 NX06 物流 / NX08 報表的跨模組接收若有類似情境可參考。
- 跨模組或公版（過帳通用規則 / 公版 component / BUSINESS-RESTRUCTURE / A002 / B5-Aa 跨模組同源 widening / 跨模組測試基礎設施演進）**不寫進本日誌**、之後寫 `_shared/worklog.md` 統合
- 下一輪預期：[docs/nx06/worklog.md](../nx06/worklog.md)（NX06 物流模組、Phase5-NX06 + DN 送貨單 + GPS/intl-shipping、預期工作量也偏小）

---

> 文件版本：v1.0（初版、3 主題、~4200 字）
> 下次更新觸發：NX05 出現新工作（先 audit 是跨模組受影響還是 NX05 業務新增）/ 新 migration / SR → allowance 沖抵缺口補上
