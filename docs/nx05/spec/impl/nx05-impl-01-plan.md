<!-- docs/nx05/spec/impl/nx05-impl-01-plan.md -->

# TASK-NX05-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑到底、僅 final stop 驗收）
> 撰寫者：Hank
> 日期：2026-05-18
> 分支：`feature/nx05-finance`（自 main HEAD `af727d9` 切出、NX04 v0.6.0 tag 後 + audit-01 commit 後）
> 對應依據：[nx05-overview v0.1.0](../intent/nx05-overview.md) + [nx05-audit-01](../../nx05-audit-01.md)
> 紀律：對齊 NX02/NX03/NX04/AR-IMPL-01 範式 + Q-RHYTHM-2 新節奏（全軌連跑、Crown 僅 final 驗收）

---

## §0 計畫文件性質

本檔是 NX05 財務重塑開工第一份產出、「**做什麼 + 什麼順序**」的決策稿、**Q-RHYTHM-2 範式下 plan 完成即進 Phase 1 連跑**。

文件邊界：
- ✅ 列拓樸排序 4 層（對齊 NX02/NX03/AR L1~L4 範式）
- ✅ 列 migration 拆軌（含每軌範圍 + 風險）
- ✅ 列 commit 拆軌策略
- ✅ 列關鍵設計決策（不寫拍板 Q、Crown + Alex 已預批）
- ❌ 不寫 .prisma 任何一行
- ❌ 不跑 `prisma migrate dev`（純文件）

**Q-RHYTHM-2 紀律承諾**：plan commit 後 Hank 全軌連跑、僅在以下情境 stop：
- 業務語意衝突（overview 沒提到的新需求）
- 跨模組行為改變（需動既有 production 行為）
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §⭐ Q-RHYTHM-2 啟用對齊

| 階段 | 紀律 |
|---|---|
| Plan 撰寫 | Hank 自寫、不送 review |
| Schema migration | Hank 自寫 SQL + 自跑 migrate（不停）|
| Service impl phase | Hank 自決推進（不停）|
| 跨模組 helper / verify | Hank 自決（不停）|
| UI stub / 文件收尾 | Hank 自決範式（不停）|
| Final merge verify | Hank 寫 report → stop 給 Crown + Alex 驗收 |
| Final merge | Crown 拍板 A → Hank 自跑 merge + tag + push |

⭐ Crown + Alex 僅在 Final merge 介入、其他 phase 全自主。

---

## §1 範圍 A 9 業務功能（對齊 overview §12.1）

| # | 功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | **AccountCode 主檔**（seed + CRUD）| ✅ 表已備 | M1 seed INSERT（~120 科目）| 新建 AccountCodeService CRUD | 🟡 stub |
| 2 | AP 應付帳款（3 來源、5 階流）| ✅ | 0 | 既有 ap.service ✓ | 🟡 stub |
| 3 | AR 應收帳款（5 階流、overdueDays）| ✅ | 0 | 既有 ar.service ✓ | 🟡 stub |
| 4 | Allowance 折讓單（雙向、3 處置）| ✅ | 0 | 既有 allowance.service ✓ | 🟡 stub |
| 5 | Closing 關帳單（每日、4 階）| ✅ | 0 | 既有 period-close.service ✓ + Phase 3c 整合 FinancePeriod | 🟡 stub |
| 6 | Note 票據（記錄 + 沖帳）| ✅ | 0 | 既有 note.service ✓ + Phase 3c 升 CLEARED 觸發 Paylog | 🟡 stub |
| 7 | Paylog 收付款（5 種 payType）| ✅ | 0 | 既有 payment + receipt 既有 ✓ | 🟡 stub |
| 8 | **AR 月底自動對帳單**（每月 1 號 cron）| ✅ 既有 AR 表 | 0（純 service 計算）| 新建 ArStatementService | 🟡 stub |
| 9 | **逾期催收警示**（共享 tenant 設定）| ✅ overdueDays 既有 | 0（共享 Nx99Tenant.creditOverdueDaysThreshold、NX04 既有）| 新建 OverdueWatcherService | 🟡 stub |

---

## §2 拓樸排序 4 層（對齊 NX02/NX03/AR/NX04 範式）

### L1 — 基礎層（schema seed + 主檔 service）

- M1 AccountCode seed migration（INSERT 約 120 業界標準科目、改編恆迎參考）
- 新建 `AccountCodeService` CRUD（list / getById / create / update / softDelete）
- 註冊到 nx05.module.ts

### L2 — 新建戰略 service 層

⭐ **新建 2 service**：

- **ArStatementService**（AR 月底自動對帳單、Crown Q3 + Q7=a）
  - input：tenantId / customerId / period（year/month）
  - logic：query AR + Paylog by customerId in period、計算上月 carryover + 本月銷貨 + 收款 + 未收餘額
  - 輸出：text + payload（仿 NX02 rfq.exportRfq 範式）
  - endpoint：`GET /nx05/ar-statement/:customerId?year=&month=`
  - cron 設計：本軌純 endpoint、cron decorator 註冊留 backlog（AR M1 範式）
- **OverdueWatcherService**（逾期催收警示、Crown Q4 + Q8=a）
  - input：tenantId / customerId?
  - logic：query AR overdueDays > tenant.creditOverdueDaysThreshold（共享 NX04 既有閾值）
  - 輸出：逾期 AR 清單 + 客戶分組 + 累計逾期金額
  - endpoint：`GET /nx05/overdue-watcher/list`
  - 對齊 NX04 CreditGuardService 範式（純 query、不寫 DB）

### L3 — 既有 service 升級層

⭐ **既有 7 子模組升級 3 接點**：

- **note.service 升 CLEARED 觸發 Paylog**：
  - 票據 status DRAFT/ACTIVE → CLEARED transit 時自動建 Paylog（CR/CP）
  - 票據 status → BOUNCED transit 時自動 OPEN 對應 AR/AP（沖帳回滾）
- **period-close.service 升 FinancePeriod 整合**：
  - 對齊 NX02-IMPL-01 Phase 5 commit 5a 揭露的 FinancePeriod 校驗 backlog
  - createAllowanceFromPurchaseReturn / createAllowanceFromSalesReturn 加 assertFinancePeriodMutable 校驗（Phase 4 補強）
- **payment + receipt 業務語意 verify**（純文件揭露、無 code 改）
  - audit-01 §4.3 揭露「payment + receipt 兩 controller 對 1 Paylog」、Phase 4 verify report 釐清

### L4 — 跨模組接點 helper 補完 + verify

⭐ **5 helper 補完**：

- **新建** `nx05-create-ap-from-rr.ts`（NX02 RR POSTED → AP、LITE 直接路徑、audit-01 §1.4 揭露待 verify）
- **新建** `nx05-create-ap-from-ti.ts`（NX02 TI 同行調貨 → AP、audit-01 §1.4 揭露待 verify）
- **既有 3 helper 0 改**（createApFromConfirmedPo / syncApLedgerFromPo / createArFromShippedSo）
- **既有 2 Allowance helper 補 FinancePeriod 校驗**（既知 A026 backlog）

### UI 層

- 升 dashboard/nx05/workspace/page.tsx desc + API hint
- 新建 4 個 placeholder（ap / ar / allowance / closing）對齊 NX02/NX04 多 placeholder 範式
- 新建 `menu.nx05.ts`（既有 0 檔、NX04 Phase 6 已修轉接、本軌建立）
- 清 `features/finance/FinanceCenterHub.tsx` 殘留 → 留 TASK-NX05-DEMO-CLEANUP（不本軌做、避免 production UI 破壞）

---

## §3 Migration 拆軌策略（A041 精確 = **1 軌**）

### M1 — `nx05_account_code_seed`（業界標準科目表 seed）

範圍：
- INSERT INTO nx05_account_code（約 120 科目精選）
- 8 大分類：1xxx 資產 / 2xxx 負債 / 3xxx 業主權益 / 4xxx 營業收入 / 5xxx 營業成本 / 6xxx 營業費用 / 7xxx 營業外 / 8xxx 所得稅
- 改編恆迎 204 科目為「亞羅汽配業專用標準範本」
- 去除恆迎特有（如特定銀行帳戶代碼）
- `isSystem = TRUE`（系統預設、軟刪除）
- tenant_id 用 `default_tenant_id`（NEXORA 約定常數、所有 tenant 共用 seed）

⚠️ **tenant_id seed 策略**：
- 選項 A：seed 對 tenant_id='DEFAULT' 寫入 + 新 tenant 時 copy（複雜）
- 選項 B：seed 純 SQL 對既有 tenant 寫入（一次性）
- 選項 C：純 application 層 seed（每 tenant 開戶時跑）
- **本軌選 B**（純 SQL INSERT、grep 既有 tenant 後 INSERT）+ 後續軌可升 application 層 seed-on-tenant-create

風險：低（純 INSERT、unique [tenantId, code] schema 保護、無破壞既有資料）
commit 數：1（migration + 對應 schema 不動）

### Migration 軌總計

- 本期 IMPL-01 跑：**M1 = 1 軌、1 migration、1 commit**

⭐ **NX05 schema 衝擊最小**（既有 8 model 設計成熟、只需 seed 補主檔資料）。

---

## §4 commit 拆軌策略（A041 估計）

| 階段 | commit 數 | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本 commit）|
| Phase 1 | 1 | M1 AccountCode seed migration（~120 科目 INSERT）|
| Phase 2 | 1 | L1 AccountCodeService CRUD + endpoint |
| Phase 3 | 3 | (a) ArStatementService + endpoint / (b) OverdueWatcherService + endpoint / (c) note + period-close 升 |
| Phase 4 | 2 | (a) 2 新 helper：createApFromRr + createApFromTi / (b) FinancePeriod 校驗補強 + verify report |
| Phase 5 | 1 | UI 升 dashboard + 4 placeholder + menu.nx05.ts 建 |
| Phase 6 | 2~3 | nx05-summary + worklog 主題 10 + 可能 NX05 merge verify report（純諮詢） |

**總計估計：11~12 commit / 1 migration / 3~5 工作日**（比 NX02 17 / NX04 14 都少、因 schema 衝擊最小 + 既有 service 大多完整）

---

## §5 紀律對齊承諾（必履行）

### 5.1 Q-RHYTHM-2 全軌連跑

- Phase 0~6 連跑、不每 phase stop
- 僅 Final merge verify 後 stop 給 Crown + Alex 驗收
- 戰略題 / 業務語意衝突仍立即 stop（純 Hank 自決有疑慮時）

### 5.2 對齊既有範式

- tsc 0 error 每 commit 基準
- A041 精確 count、不模糊
- §G.9 通配 grep、不單檔 ls
- §I.6.3 揭露不完整尾標

### 5.3 不擅自處理範圍外

- 401 報表政府對接 = 獨立技術軌、本軌 0 touch
- 應收應付沖抵 = 範圍 B 戰略軌、本軌 0 touch
- 預付款 / 訂金 = 範圍 B、本軌 0 touch
- 銀行對帳自動化 = 第三方 API、本軌 0 touch
- features/finance 殘留 = 留 TASK-NX05-DEMO-CLEANUP（避免破壞 production UI）

### 5.4 業務閉環收口

- 5 helper 補完（NX02 RR/TI AP 接點 + Allowance FinancePeriod 校驗）
- NEXORA 業務閉環完成（採購 + 庫存 + 銷貨 + 自動補貨 + 財務）

---

## §6 關鍵設計決策（不送 review、Q-RHYTHM-2 預批）

### D1 拓樸 4 層

L1 schema seed + 主檔 → L2 新 2 service → L3 既有升 → L4 跨模組 helper + verify

### D2 1 軌 migration

只 M1 AccountCode seed、其他純 service / 純 in-memory。

### D3 AccountCode seed 策略

選 B（純 SQL INSERT、tenant_id 既有對齊）、後續軌可升 application 層 seed-on-tenant-create。

### D4 AR 月底對帳單

本軌純 endpoint（業務員 / cron 手動 / 外部觸發）、cron decorator 留 backlog（對齊 AR M1 範式）。

### D5 逾期催收

共享 NX04 既有 Nx99Tenant.creditOverdueDaysThreshold（不新建 schema）、純 service query。

### D6 FinancePeriod 整合

對齊 NX02-IMPL-01 Phase 5 commit 5a 揭露的 backlog、本軌補強 2 Allowance helper 加 assertFinancePeriodMutable。

### D7 UI 範圍

對齊 NX02/NX04 Q-U1=c 範式（全 stub、UI 獨立軌 backlog）、本軌升 desc + 補 4 placeholder + 建 menu.nx05.ts。

### D8 features/finance 清理

留 TASK-NX05-DEMO-CLEANUP 獨立軌（純命名殘留、不破壞 production）。

---

## §7 風險與停下點

### 7.1 主要風險

1. **AccountCode seed 對既有 tenant 寫入**：
   - 風險：production 既有 tenant 已有自訂科目、seed 重複寫入可能違反 unique
   - 對策：INSERT ON CONFLICT DO NOTHING（純加新、不覆蓋既有）

2. **AR 對帳單算法效能**：
   - 風險：query AR + Paylog by period 大量資料 N+1
   - 對策：純 SQL aggregate + 按客戶切批

3. **新 helper createApFromRr/Ti 跨模組界線**：
   - 風險：NX02 既有 rr.service / 同行調貨流可能已有 AP 創建（重複）
   - 對策：本軌 helper 純加冪等 dedup（query 既有 AP_RR / AP_TI sourceType 已存在 skip）

4. **FinancePeriod 校驗加在 Allowance helper 影響既有測試**：
   - 風險：既有 NX02/NX04 Allowance 路徑跑測試 / production 可能在關帳期間被擋
   - 對策：純 throw + 業務責任、對齊既有 NX05 allowance.service line 122 範式

### 7.2 預設停下點

依 Q-RHYTHM-2 紀律、以下情境必停下回報：
- 業務語意衝突（overview 沒提到的新需求）
- 跨模組行為改變（需動既有 production 行為）
- Phase 連跑期間發現重大設計缺陷（如 5 helper 補完發現 schema 衝突）
- 全軌完成、stop 給 Crown + Alex 驗收 Final merge

---

## §8 下次接續工作（連跑、不送 review）

Plan commit 後立即進 Phase 1：
1. M1 AccountCode seed SQL（INSERT ~120 科目）
2. 連跑到 Phase 6 收尾
3. 寫 Final merge verify report
4. stop 給 Crown + Alex 驗收

---

## 後記

- 真實 main HEAD：`af727d9`（NX04 v0.6.0 + NX05 audit-01 後）
- 真實 branch HEAD：`feature/nx05-finance`（從 main 切出、無新 commit、無 push）
- 本檔位置：`docs/nx05/spec/impl/nx05-impl-01-plan.md`
- ⭐ Q-RHYTHM-2 首次落地：本檔 commit 後 Hank 全軌連跑、Crown + Alex 僅在 Final merge 介入

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx05-overview v0.1.0](../intent/nx05-overview.md) · [nx05-audit-01](../../nx05-audit-01.md) · [nx04-impl-01-plan](../../../nx04/spec/impl/nx04-impl-01-plan.md) · [nx02-impl-01-plan](../../../nx02/spec/impl/nx02-impl-01-plan.md)
