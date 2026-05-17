<!-- docs/nx08/nx08-audit-01.md -->

# NX08-AUDIT-01 — 報表模組 schema + 既有狀態真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：NEXORA 業務閉環第一階段戰略全 closure（main HEAD `e725607`、7 tag），Crown 啟動 NX08 報表模組前 verify
> 對齊：NX02 / NX03 / AR / NX04 / NX05 / NX06 audit 範式 + §I.5 #22 鐵律（Alex 寫業務需求前 verify schema 真相）+ §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §1 NX08 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx08" packages/db-core/prisma/schema.prisma
→ 8
```

### 1.2 8 個 Nx08* model（schema.prisma line 範圍 + 業務語意）

| # | Model | Line | Table | 業務語意推測 | 性質 |
|---|---|---|---|---|---|
| 1 | `Nx08DailyReport`     | 5103 | nx08_daily_report     | 員工每日工作日報（doneItems/kpiProgress/exceptionItems/tomorrowPlan + 主管回覆）| ✅ 原始資料（有 endpoint）|
| 2 | `Nx08FinanceCache`    | 5144 | nx08_finance_cache    | 財務報表快取（revenue/cogs/grossMargin/AR-overdue/cashCycleDays + HPA trend）| ⚠️ Cache（無 endpoint / 無 writer）|
| 3 | `Nx08HrCache`         | 5189 | nx08_hr_cache         | HR 報表快取（attendanceRate/lateCount/otHours/kpiAchieveRate + 人才象限 HS/HL/LS/LL）| ⚠️ Cache（無 endpoint / 無 writer）|
| 4 | `Nx08InventoryCache`  | 5231 | nx08_inventory_cache  | 庫存報表快取（turnoverRate/daysStagnant + BCG 象限 Q/S/C/D + HPA trend）| ⚠️ Cache（無 endpoint / 無 writer）|
| 5 | `Nx08PestelRecord`    | 5278 | nx08_pestel_record    | PESTEL 策略分析（political/economic/social/technological/environmental/legal）| ⚠️ 戰略記錄（無 endpoint）|
| 6 | `Nx08PurchaseCache`   | 5319 | nx08_purchase_cache   | 採購報表快取（poAmount/onTimeRate/defectRate + 廠商評級 A/B/C/D + HPA trend）| ⚠️ Cache（無 endpoint / 無 writer）|
| 7 | `Nx08SalesCache`      | 5361 | nx08_sales_cache      | 銷售報表快取（soAmount/netAmount/grossMargin + 客戶等級 A/B/C/D + HPA trend）| ⚠️ Cache（無 endpoint / 無 writer）|
| 8 | `Nx08SwotRecord`      | 5405 | nx08_swot_record      | SWOT 策略分析（strengths/weaknesses/opportunities/threats + SO/WO/ST/WT 策略）| ⚠️ 戰略記錄（無 endpoint）|

### 1.3 上游業務模組 reverse FK 接點（A041 精確 = **8 個 reverse FK**）

| 來源模組 | 來源 model | 行 | reverse FK | 接收 Nx08 model | 接點欄 |
|---|---|---|---|---|---|
| NX01 Part      | `Nx01Part`      | 801  | rev_Nx08InventoryCache_partId      | InventoryCache | partId |
| NX01 Partner   | `Nx01Partner`   | 1010 | rev_Nx08PurchaseCache_supplierId   | PurchaseCache  | supplierId |
| NX01 Partner   | `Nx01Partner`   | 1011 | rev_Nx08SalesCache_customerId      | SalesCache     | customerId |
| NX01 User      | `Nx01User`      | 1212 | rev_Nx08DailyReport_userId         | DailyReport    | userId |
| NX01 User      | `Nx01User`      | 1213 | rev_Nx08HrCache_userId             | HrCache        | userId |
| NX01 Warehouse | `Nx01Warehouse` | 1441 | rev_Nx08InventoryCache_warehouseId | InventoryCache | warehouseId |
| NX99 Tenant    | `Nx99Tenant`    | 6703~6710 | × 8（每 Nx08 model 都串 tenantId）| 全 8 Nx08 model | tenantId |

⚠️ **核心揭露**：上游業務模組（NX02 採購 / NX04 銷貨 / NX05 財務 / NX06 物流 / AR 自動補貨）**沒有任何直接 reverse FK 到 Nx08 model**：
- NX02 PO/RR/TI/PR → ❌ 0 接點到 PurchaseCache（PurchaseCache 只接 NX01 Partner.supplierId）
- NX04 SO/SR → ❌ 0 接點到 SalesCache（SalesCache 只接 NX01 Partner.customerId）
- NX05 AR/AP/Allowance/Paylog → ❌ 0 接點到 FinanceCache
- NX06 DN → ❌ 0 接點（NX08 schema 無 LogisticsCache）
- AR Suggestion → ❌ 0 接點

⭐ **設計意涵**：Nx08*Cache 設計成「**獨立快照表**」（不串業務原始單據）、依賴 SQL 聚合計算或 ETL 寫入快取、不依賴 FK trigger。

### §I.6.3 §1 揭露不完整

- 未 verify Nx08 schema migration 拆軌數（grep migration dir：⚠️ 待 §2 補揭）
- 未 verify Nx08*Cache 8 schema 是否含已 deprecate 欄位

---

## §2 NX08 backend service 真相

### 2.1 既有 service 列表（A041 精確 = **4 service / 4 controller / 12 endpoint**）

```
apps/nx-api/src/nx08/
├── nx08.module.ts
├── daily-report/
│   ├── daily-report.controller.ts
│   ├── daily-report.service.ts
│   ├── daily-report.dto.ts
│   └── nx08-daily-report-list-query.dto.ts
├── kpi-record/
│   ├── kpi-record.controller.ts
│   ├── kpi-record.service.ts
│   ├── kpi-record.dto.ts
│   └── nx08-kpi-record-list-query.dto.ts
├── kpi-target/
│   ├── kpi-target.controller.ts
│   ├── kpi-target.service.ts
│   ├── kpi-target.dto.ts
│   └── nx08-kpi-list-query.dto.ts
└── monthly-report/
    ├── monthly-report.controller.ts
    ├── monthly-report.service.ts
    └── nx08-monthly-report-list-query.dto.ts
```

shared 層：`apps/nx-api/src/shared/nx08/nx08-pro-plan.guard.ts`（PRO 方案限制）

### 2.2 12 endpoint 列表

| controller | endpoint | method | 角色 |
|---|---|---|---|
| daily-report | `GET /nx08/daily-report`       | list | 員工日報列表 |
| daily-report | `GET /nx08/daily-report/:id`   | get | 日報 detail |
| daily-report | `POST /nx08/daily-report`      | create | 提交日報 |
| daily-report | `PATCH /nx08/daily-report/:id` | update | 修改日報 |
| daily-report | `PATCH /nx08/daily-report/:id/complete` | complete | 主管回覆 |
| kpi-record   | `GET /nx08/kpi-record`         | list | KPI 紀錄列表 |
| kpi-record   | `POST /nx08/kpi-record`        | create | KPI 紀錄 |
| kpi-target   | `GET /nx08/kpi-target`         | list | KPI 目標列表 |
| kpi-target   | `POST /nx08/kpi-target`        | create | KPI 目標 |
| kpi-target   | `PATCH /nx08/kpi-target/:id`   | update | KPI 目標 |
| monthly-report | `GET /nx08/monthly-report/summary` | summary | 月報聚合 |
| monthly-report | `GET /nx08/monthly-report`         | list | 月報列表 |

### 2.3 「跨模組 vs 模組擁有」資料來源真相揭露 ⭐

- **kpi-record / kpi-target endpoint** 業務語意 NX08、但 Prisma model 實際是 **Nx01KpiRecord / Nx01KpiTarget**（NX01 主檔層）
- **daily-report endpoint** 業務語意 NX08、Prisma model 是 Nx08DailyReport（NX08 自有）
- **monthly-report endpoint** 業務語意 NX08、是**即時 SQL 聚合**（不寫 Nx08FinanceCache 等 cache 表）

⚠️ **重大揭露：Nx08*Cache 6 表 0 endpoint / 0 writer**：
- `Nx08SalesCache` / `Nx08PurchaseCache` / `Nx08InventoryCache` / `Nx08FinanceCache` / `Nx08HrCache` / `Nx08PestelRecord` / `Nx08SwotRecord` — 7 表 schema 在、**沒有任何 prisma client 寫入**
- nx08-worklog 主題 3 已揭露：monthly-report 走「即時 SQL 聚合」、`nx08_monthly_report` 表 schema 有 / 行為不寫入 = schema vs 行為不一致（已備 A/B 選項待 Crown 拍）

### 2.4 cross-module aggregation 範式

- ❌ 0 shared/nx08 helper（跨模組 helper 完全 0）
- ✅ shared/nx08 僅 `nx08-pro-plan.guard.ts`（PRO 方案 guard）
- monthly-report.service 直接走 `this.prisma.nx04So.aggregate(...)` 等跨模組讀（非 helper 範式）

### §I.6.3 §2 揭露不完整

- 未 verify daily-report.service 是否實際聚合 KPI 自動帶入（看 schema doc 說 `KPI 當日累計進度（系統自動帶入）` 但服務行為未深 read）
- 未 verify monthly-report.summary 涵蓋的聚合範圍（哪些業務指標、是否含 NX02/NX03/NX05/NX06）
- 未 verify nx08-pro-plan.guard 對 IMPL-01 PRO 方案是否強制（產品方案分層待 audit-02）

---

## §3 NX08 frontend 真相

### 3.1 既有 app/dashboard/nx08（A041 精確 = **1 page**）

```
apps/nx-ui/src/app/dashboard/nx08/
└── workspace/
    └── page.tsx   (NX08-WS-UI-001-F01、title='經營分析'、desc='PRO 功能")
```

### 3.2 features/nx08（A041 精確 = **0 檔**）

```
find apps/nx-ui/src/features -ipath '*nx08*'  → 0 results
```

⚠️ **features/nx08 不存在**（對比 NX06 已有 `features/nx06/push-subscription.ts`）。

### 3.3 menu.nx08.ts（A041 精確 = **不存在**）

```
ls apps/nx-ui/src/features/layout/config/menu.nx08*  → No such file
grep -n 'nx08\|Nx08' apps/nx-ui/src/features/layout/config/side-menu.ts  → 0 matches
```

⚠️ **side-menu.ts 0 wire nx08**（對比 menu.nx02-06 全在）。

### 3.4 production 運作狀態

- ✅ /dashboard/nx08/workspace 純 placeholder（onboarding 進入 = "經營分析 / PRO 功能"）
- ❌ 真實報表 UI 0（dashboard chart / KPI gauge / pivot table / BCG matrix viz 全 0）

### §I.6.3 §3 揭露不完整

- 未 verify 是否有其他模組 dashboard 引用 NX08 endpoint（grep '/nx08/' UI 來源）

---

## §4 既有 demo 揭露

### 4.1 從 codebase + worklog 推斷

- ✅ **真實落地（NX08-IMPL phase5 v7_baseline）**：daily-report CRUD + 4 controller + 12 endpoint backend
- ✅ **真實落地**：monthly-report summary 即時 SQL 聚合（NX04/NX05 部分指標）
- ⚠️ **schema-only 沒寫入**：Nx08*Cache 7 表全空（A002 drift 候選）
- ❌ **UI 0 demo**：只有 placeholder、無 chart/dashboard
- ❌ **PESTEL / SWOT / BCG / HPA 高階分析** schema 有部分（PestelRecord/SwotRecord 表 + InventoryCache.bcgQuadrant 欄）、行為 0 落地

### 4.2 對比其他模組 demo 狀態

| 模組 | 真實 demo | 高階分析 | UI 落地 |
|---|---|---|---|
| NX02-06 + AR | ✅ 完整業務 demo | — | ⚠️ stub placeholder（UI 獨立軌 backlog）|
| NX08（本軌前）| ⚠️ 僅 daily-report 完整 + monthly 即時聚合 | ❌ Cache 表全空 + PESTEL/SWOT 0 | ❌ 1 placeholder |

### §I.6.3 §4 揭露不完整

- 未 verify NX02-06 demo 是否含 NX08 報表面顯示測試資料
- 未 verify Nx08DailyReport 表是否 production 已有真實 row

---

## §5 NX08 vs 7 軌範式對齊

### 5.1 partVersionId M1 配套狀態

- ⭐ **N/A**：NX08 是純報表聚合層、不寫 stock_ledger / paylog / dn_item 等 ledger 表
- Nx08*Cache 寫入時若需 part snapshot、可走 partId direct（無 partVersionId 配套需求）
- 對齊 NX05 / NX06 純非 ledger 模組範式

### 5.2 跟上游模組接點完整度（reverse FK + cache 機制）

| 模組接點 | 真相 |
|---|---|
| NX01 主檔 → NX08（Part / Partner / User / Warehouse / Tenant）| ✅ 全 6 FK 在 |
| NX02 採購 → NX08 PurchaseCache | ❌ 0 reverse FK（只接 Partner.supplierId 不接 Po/Pr/Ti）|
| NX04 銷貨 → NX08 SalesCache | ❌ 0 reverse FK（只接 Partner.customerId 不接 So/Sr）|
| NX05 財務 → NX08 FinanceCache | ❌ 0 reverse FK |
| NX06 物流 → NX08（無 LogisticsCache）| ❌ schema 無 |
| AR → NX08（無 SuggestCache）| ❌ schema 無 |

⚠️ **設計意涵**：Nx08*Cache 是「**獨立快照表**」、非業務單據反向 FK 衍生。Cache 寫入需專屬 batch job（cron）or ETL pipeline、本軌前 0 機制存在。

### 5.3 模組層治理（summary / audit / phase / closure）落後程度

| 治理檔 | NX02 | NX03 | NX04 | NX05 | NX06 | NX08 |
|---|---|---|---|---|---|---|
| audit-01 | ✅ | ✅ | ✅ | ✅ | ✅ | **🆕 本檔**|
| audit-02 | ❌ | ❌ | ❌ | ❌ | ✅ | — |
| overview spec | ✅ | ✅ | ✅ | ✅ | ✅ v0.2.0 | ❌（worklog 主題 1 已揭露無 spec/intent）|
| impl-01 plan | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| summary | ✅ | ✅ | ✅ | ✅ | ✅ v0.2.0 | ❌ |
| merge verify | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| worklog | ✅ | ✅ | ✅ | ✅ | ✅ v1.2 | ✅ v1.0（3 主題、~5200 字、Phase5 落地後即穩定）|
| nx06-overview-v0.2 等版本 | — | — | — | — | ✅ | ❌ |

⚠️ **NX08 治理落後 2 階段**（無 spec / 無 audit / 無 plan / 無 summary / 無 merge verify、僅有 worklog 三主題揭露既有狀態 + 4 缺口）。

### §I.6.3 §5 揭露不完整

- 未 verify nx08-pro-plan.guard 適用範圍（哪些 endpoint 強制 PRO）
- 未 verify NX07 / NX09 / NX10 模組治理檔狀態（本軌不涉及）

---

## §6 業界場景候選揭露 ⭐ Crown 拍板池

### 6.1 NEXORA 6 業務資料源齊備（業界閉環第一階段）

| 上游模組 | 報表素材（可聚合）|
|---|---|
| NX02 採購 | PO/PR/TI/RR 數據（廠商分析 / 比價歷史 / 採購額 / 退貨率 / 準時率）|
| NX03 庫存 | StockBalance/StockLedger 數據（周轉率 / 滯銷品 / 缺貨警示 / BCG）|
| NX04 銷貨 | SO/SR/Qt 數據（業務員業績 / 客戶分析 / 商品銷量 / 毛利）|
| NX05 財務 | AR/AP/Paylog/Allowance/Closing 數據（應收應付 / 月結 / 現金流）|
| NX06 物流 | DN/DnStop/DnItem/DnHandover 數據（配送成本 / 路線效率 / 動態交接統計）|
| AR | Nx02Demand 數據（補貨建議命中率 / 廠牌替代率 / 庫存預測）|

### 6.2 dashboard 候選池（業界 muscle memory）

| 角色 | dashboard 名 | 業務指標範例 | 上游模組來源 | ⭐ 評等 |
|---|---|---|---|---|
| **業務員** | 個人銷售業績            | 本月銷售額 / vs 目標 / 客戶數 / 平均訂單金額    | NX04 SO + KpiTarget | ⭐⭐⭐ 業界必備 |
| **業務員** | 客戶分析（My Customer） | 客戶等級 ABCD / overdue / 重複下單率           | NX04 SO + NX05 AR   | ⭐⭐ |
| **業務員** | 商品銷量 ranking        | top 10 銷售件數 / top 10 銷售額 / 滯銷件數     | NX04 SO + NX03      | ⭐⭐ |
| **主管** | 部門業績總覽            | 業務員 ranking / 達標率 / pipeline 預測           | NX04 + KpiTarget    | ⭐⭐⭐ 業界必備 |
| **主管** | 跨業務員業績比較        | 個人 vs 平均 / hpa trend / 退貨率               | NX04 + Nx08SalesCache | ⭐⭐ |
| **主管** | 業績目標管理            | KPI target vs actual / 達成率                     | NX01 KpiTarget+KpiRecord | ⭐⭐⭐ |
| **倉管組長** | 庫存周轉率              | turnover / 滯銷 / 缺貨警示 / BCG matrix      | NX03 + Nx08InventoryCache | ⭐⭐⭐ 業界必備 |
| **倉管組長** | 配送成本分析            | 平均配送成本 / 路線效率 / 動態交接統計         | NX06 + DnHandover   | ⭐⭐⭐ 本軌 closure 新解鎖 |
| **倉管組長** | 補貨建議命中率（AR）    | 建議單採納率 / 廠牌替代率 / 庫存預測精度       | AR + NX02 Demand    | ⭐⭐ |
| **採購** | 廠商評等                | 準時率 / 瑕疵率 / 平均交期 / 廠商評級 ABCD     | NX02 PO/RR + Nx08PurchaseCache | ⭐⭐⭐ 業界必備 |
| **採購** | 比價歷史                | 同料號跨廠商價差 / 議價空間                    | NX02 PO + Nx01Part  | ⭐⭐ |
| **採購** | 採購額 ranking          | 月/季/年 採購額 / top 廠商                    | NX02 PO             | ⭐⭐ |
| **財務** | 應收應付總覽            | AR/AP balance / overdue / cash flow forecast    | NX05 AR+AP          | ⭐⭐⭐ 業界必備 |
| **財務** | 月結進度                | NX05 Closing 4 階 / 401 報表追蹤                 | NX05 Closing        | ⭐⭐⭐ |
| **財務** | 毛利率分析              | revenue/cogs/grossMargin/hpaTrend / 費用率     | NX04 + NX05 + Nx08FinanceCache | ⭐⭐⭐ |
| **Crown 主管** | 跨部門綜合              | 採購+銷貨+庫存+財務+物流 5 軌指標 KPI bar    | 全模組 + 全 Cache    | ⭐⭐⭐ 高階主管必備 |
| **Crown 主管** | 戰略指標                | PESTEL / SWOT 季更 / HPA trend / BCG matrix | Nx08PestelRecord / SwotRecord / Cache | ⭐⭐ 戰略可選 |
| **Crown 主管** | 業績目標 OKR            | 公司年度目標 + 各部門季度目標 + KPI 達成率     | NX01 KpiTarget+KpiRecord | ⭐⭐ |
| **HR / NX07** | 出勤 / KPI 達成率       | attendanceRate / lateCount / kpiAchieveRate / 人才象限 | Nx08HrCache + NX07 | ⭐⭐ |
| **客戶 (extranet 後續軌)** | 自助對帳 / 訂單追蹤    | 客戶看自家 AR / SO 狀態 / DN 物流追蹤         | 跨 NX04/05/06       | 🔵 後續軌 |

### 6.3 業界 muscle memory 候選（中小 ERP 標準 dashboard）

- **首頁 dashboard** 業界標準 4 卡：今日營收 / 待出貨單數 / 待收款金額 / 庫存警示數
- **drilldown 範式**：dashboard 卡片點擊 → 直接帶 filter 跳到原模組 list（業務閉環導航）
- **PDF 月報自動生成**（業界財務 + 主管必備、寄 email + 雲端存）
- **excel export 全 dashboard**（資料分析師 muscle memory）
- **時間軸對比**（本月 vs 上月、本季 vs 去年同期）

### 6.4 業界改革候選 ⭐⭐⭐

- ⭐⭐⭐ **AR 補貨建議命中率 dashboard**（NEXORA 業界首發、跟 AR closure 接合）
- ⭐⭐⭐ **DnHandover 動態交接統計 dashboard**（NEXORA 業界首發、跟 NX06 IMPL-02 接合）
- ⭐⭐⭐ **BCG matrix 商品分類 + HPA trend 自動標記**（業界 ERP 多有 schema 少落地、NEXORA 可第一個全自動）

### §I.6.3 §6 揭露不完整

- 未 verify Crown 對「個人 dashboard vs 主管 dashboard」分權細粒度需求
- 未 verify 客戶端 extranet（自助對帳 / 訂單追蹤）是否本軌範圍 vs 後續軌
- 未 verify PDF 自動寄送 / excel export / 排程 cron 哪些列範圍 A
- 未 verify Crown 對「跨對話 BI dashboard 個人化」需求（saved view / favorite chart）

---

## §7 IMPL plan 預告（給 Alex 寫 overview 對齊用）

對齊 NX06-AUDIT-01 → IMPL-01 範式預告，NX08 推測 plan 框架：

| Phase 候選 | 範圍 |
|---|---|
| Phase 0 plan | overview v0.1.0 + Q-RHYTHM-2 拍板 |
| Phase 1 schema | M1 補 LogisticsCache / SuggestCache 新表（or 不補？）+ ETL writer schema |
| Phase 2 service | ETL writer service（cron / on-demand）+ N dashboard query service |
| Phase 3 endpoint | 各 dashboard endpoint（角色分流：業務 / 主管 / 倉管 / 採購 / 財務 / Crown）|
| Phase 4 cross-module helper | 0（NX08 走 prisma 直 query、非 helper 範式）|
| Phase 5 PWA / UI | dashboard chart placeholder + menu.nx08 + side-menu wire |
| Phase 6 docs | summary + worklog 主題 4 + _team 主題 28 + merge-verify |

**戰略題待 Crown 拍板**：
1. Nx08*Cache 7 表處置（A=刪表走即時聚合 / B=補 ETL writer 寫入 / C=保留 schema + 暫不 wire）— nx08-worklog 主題 3 已開待拍
2. dashboard 範圍切（基礎 4 vs 完整 7 vs 跨對話分軌）
3. UI 落地 strategy（純 stub 同 NX02-06 pattern / 真實 chart component 一起做）
4. ETL 排程 mechanism（@nestjs/schedule cron / 外部 cron HTTP / on-demand 觸發）
5. 客戶端 extranet（範圍 A vs 範圍 B 後續軌）

---

## §8 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / 業界使用者補揭露事項：

1. **§1** Nx08 schema migration 拆軌數（grep migration dir 未做）
2. **§1** Nx08*Cache 8 schema 是否含已 deprecate 欄位
3. **§2** daily-report.service KPI 自動帶入機制（schema doc 提到、service 行為未深 read）
4. **§2** monthly-report.summary 聚合涵蓋範圍（含哪些業務模組指標）
5. **§2** nx08-pro-plan.guard 對 PRO 方案強制範圍
6. **§3** 其他模組 dashboard 是否引用 NX08 endpoint
7. **§4** Nx08DailyReport 表 production 真實 row 量
8. **§5** NX07 / NX09 / NX10 模組治理檔狀態（本軌不涉及）
9. **§6** Crown 個人 vs 主管 dashboard 分權細粒度
10. **§6** 客戶端 extranet 範圍 A vs B 拍板
11. **§6** PDF / excel export / 排程 cron 範圍

---

## §9 與 nx08-worklog v1.0 對齊揭露

對齊 [docs/nx08/nx08-worklog.md](../nx08-worklog.md) 主題 1-3 揭露：

- 主題 1：v7_baseline + Phase5-NX08 第九批 API 落地（PRO + 跨模組讀寫）
- 主題 2：跨模組資料源管理（NX08 是聚合層、不擁有原始資料）
- 主題 3：monthly-report 即時聚合 vs 寫入表的設計取捨（Q3 待拍 A/B）

worklog 已揭露 4 個缺口（本 audit §2.3 對應重述）：
1. KPI 計算 helper 沒寫（schema 有 / 實際聚合靠 SQL inline）
2. nx08_monthly_report 表 schema 有 / 行為不寫入（schema vs 行為不一致 ⭐ 新類型）
3. BCG / TOWS / HPA 等高階分析 schema 沒做（CLAUDE.md §三 提到 / 實際 0）
4. 沒 spec/intent 目錄

⭐ 本 audit-01 補揭：**Nx08*Cache 7 表 0 writer**（worklog 主題 3 已暗示 / 本檔精確 grep verify）。

---

> 文件版本：v1.0（NX08-AUDIT-01 純諮詢、9 段揭露 + 8 model schema + 12 endpoint + 1 placeholder + 20 dashboard 候選池）
> 待 Crown 拍板 5 戰略題（§7 末段）→ Alex 寫 nx08-overview v0.1.0 → Hank 寫 nx08-impl-01-plan
