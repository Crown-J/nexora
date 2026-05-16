<!-- docs/auto-replenish/ar-summary.md -->

# AR 自動補貨建議單 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-16
> 撰寫：Hank（整合 TASK-AR-IMPL-01 13 commit + AR-AUDIT-01 v2 + ar-overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/auto-replenish/spec/intent/ar-overview.md` v0.1.0
> 戰略定位：NX03 範圍 B 戰略軌（NX03 範圍 A closure 後啟動）

---

# § 1. AR 模組業務角色

## 1.1 模組定位

AR = **NEXORA 核心戰略特色**、業界中小企業 ERP 第一個能做「智能品牌替代補貨」。

```
NX03 庫存 → 偵測缺貨 → AR 算建議量 → Nx02Demand → RFQ → Po → Rr → NX03 入庫
   ↑                                                                ↓
   └──────────────── 補貨循環閉環 ────────────────────────────────────┘
```

**戰略意義**：
- ⭐⭐⭐ 業界第一個「智能品牌替代補貨」（OE 缺貨自動推副廠、副廠彙整算銷貨）
- ⭐⭐ 倉層級彈性頻率（每倉自訂計算頻率）
- ⭐⭐ 系統建議 + 人介入並重（倉庫實體限制 / 採購策略雙重把關）

## 1.2 8 業務功能（範圍 B 對齊 overview §8.1）

1. 自動計算引擎（4 階段）
2. 倉層級彈性頻率設定
3. 兩層分類 + 配比規則
4. 副廠池銷貨比例分配
5. 替代品牌邏輯（application 層）
6. 建議單管理（UI 獨立軌 backlog）
7. 倉管 / 產品手動介入
8. 詢價接點（NX02 Demand）

---

# § 2. Schema 真相

## 2.1 2 migration（A041 精確）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260516150000_ar_impl_01_m1_part_stock_setting_ar_columns` | PartStockSetting +3 欄（frequency/lastCalc/windowDays）|
| M2 | `20260516160000_ar_impl_01_m2_brand_allocation_rule_create` | BrandAllocationRule 新表 |

DB：54 migrations applied、Database schema is up to date ✓

## 2.2 新增 model 1（A041）

`Nx03BrandAllocationRule`（BALR、PLUS 戰略級）：
- modelId 級配比（Crown Q-B1=A）
- oemRatio + aftermarketRatio Decimal(5,4)、Σ = 1.0 application 自律
- source S/M 雙來源（Crown Q-S1=A manual 覆寫 system）
- validFrom/validTo 支援歷史版本
- unique [tenantId, modelId, validFrom]

## 2.3 schema 升級 1（PartStockSetting）

| 欄 | 業務 | null fallback |
|---|---|---|
| `calculationFrequency` Int? | 倉層級彈性頻率（天）| 1 天 |
| `lastCalculatedAt` DateTime? | scheduler 比較 | null=從未跑 |
| `calculationWindowDays` Int? | 平均出貨窗口（天）| 90 天 |

---

# § 3. Service 真相

## 3.1 新增 services（A041 = 5）

| service | 角色 | 主 method |
|---|---|---|
| `BrandAllocationRuleService` | 配比規則 CRUD | list/getById/create/update/softDelete |
| `ArCalculatorService` | **4 階段計算引擎** | detectShortageCandidates / calculateForecastQty / classifyByOemAftermarket / distributeAftermarketPool |
| `PartReplacementService` | 替代品牌 helper | findReplacementsByModel / findAftermarketAlternatives / findUniversalAlternatives |
| `ArSuggestionWriterService` | 寫 Demand 全流程 | runForWarehouse |
| `ArSchedulerService` | scheduler 邏輯 | findDueWarehouses / runDueBatch |

## 3.2 endpoints（A041 = 7 新）

| Method | Path | 功能 |
|---|---|---|
| GET | `/nx03/brand-allocation-rule` | list |
| GET | `/nx03/brand-allocation-rule/:id` | detail |
| POST | `/nx03/brand-allocation-rule` | create |
| PATCH | `/nx03/brand-allocation-rule/:id` | update |
| DELETE | `/nx03/brand-allocation-rule/:id` | softDelete |
| POST | `/nx03/auto-replenish/trigger?warehouseId=` | 手動觸發 |
| POST | `/nx03/auto-replenish/run-due` | scheduler 跑 due 倉 |

## 3.3 4 階段計算引擎流程

```
Stage 1 偵測：detectShortageCandidates(tenantId, warehouseId?)
   scan PartStockSetting × stock_balance WHERE onHand < minQty
   → ShortageCandidate[]（含 modelId 反查、windowDays）

Stage 2 計算：calculateForecastQty(tenantId, candidate, leadTimeDays=7)
   找 part_model.modelId 下所有 parts（跨品牌彙整）
   SUM(qtyOut) FROM stock_ledger WHERE sourceDocType='S' (排除 X 調撥)
   AND movementDate >= now - windowDays
   → avgDaily × leadTime = forecastQty

Stage 3 兩層分類：classifyByOemAftermarket(tenantId, forecast)
   找 BrandAllocationRule WHERE modelId AND 有效期 AND isActive
   優先 source='M' manual、再 'S' system、無 → 0.5:0.5 DEFAULT
   → oemQty = forecastQty × oemRatio / aftermarketQty = forecastQty × aftermarketRatio

Stage 4 副廠池分配：distributeAftermarketPool(tenantId, allocation)
   找 model 下 isOem=false 副廠 parts
   對每 part 算 windowDays 銷貨
   shareRatio = part_shipped / total_aftermarket_shipped
   → AftermarketBrandBreakdown[]（每副廠 part suggestedQty）
```

---

# § 4. 拓樸 4 層（plan §2 對齊 NX01/NX03 範式）

```
L1 基礎層：
  M1 PartStockSetting +3 欄 + M2 BrandAllocationRule 新表
  BrandAllocationRule CRUD service + 5 endpoints

L2 計算引擎：
  ArCalculatorService 4 階段（偵測 / 計算 / 兩層分類 / 副廠池分配）
  PartReplacementService（application 層替代品牌邏輯、fitLevel 套用）

L3 建議單管理：
  ArSuggestionWriterService（runForWarehouse、寫 N Demand row）
  ArSchedulerService（findDueWarehouses + runDueBatch）
  AutoReplenishController（POST /trigger + /run-due）

L4 跨模組接點：
  AR → Nx02Demand → RFQ → Qt → Po → Rr → NX03 入庫
  verify 報告：docs/auto-replenish/spec/impl/ar-impl-01-phase5-verify.md
```

---

# § 5. 跨模組接點

## 5.1 上游接點（→ AR 讀取）

| 上游 | 提供 | AR 用途 |
|---|---|---|
| NX03 stock_balance | 即時量 | Stage 1 偵測 |
| NX03 stock_ledger (source=S) | 銷貨歷史 | Stage 2 計算 + Stage 4 銷貨比例 |
| NX03 part_stock_setting | minQty / 頻率 / 窗口 | Stage 1 觸發條件 + scheduler |
| NX01 part / part_model | 料件 + 車型適配 | 跨品牌彙整 + 替代邏輯 |
| NX01 part.isOem / partBrandId | 兩層分類 | Stage 3/4 |
| NX03 brand_allocation_rule | 配比規則 | Stage 3 |

## 5.2 下游接點（AR →）

| 下游 | 接收 | AR 提供 |
|---|---|---|
| Nx02Demand | 採購建議單 | demandType='S' 寫入、batchId in remark |
| Nx02Rfq | 詢價單 | demandId 串接（由採購專員建 RFQ）|
| Rr → NX03 ledger | 最終入庫 source=P | AR 觸發鏈終點 |

---

# § 6. NEXORA 戰略特色

## 6.1 智能品牌替代補貨 ⭐⭐⭐（已落地）

- **業界第一個**：OE 缺貨自動推副廠、副廠彙整算銷貨
- Stage 3+4 + PartReplacementService 整合落地
- 對齊 Crown Q-AR-廠牌 4 題完整拍板

## 6.2 倉層級彈性頻率 ⭐⭐（已落地）

- **業界第一個**：每倉自訂計算頻率
- M1 PartStockSetting +calculationFrequency + scheduler.findDueWarehouses
- 業界場景：快銷倉每天 / 慢銷倉每週 / 特殊倉每月

## 6.3 系統建議 + 人介入並重 ⭐⭐（已落地）

- 配比規則 source S/M 雙來源、manual 優先
- 倉管調整 qty / 產品決策 status 走既有 Demand path

## 6.4 跨品牌銷貨彙整 ⭐（已落地）

- Stage 2 partIds = part_model.modelId 下所有 parts
- 對齊業界「同 model 跨品牌總需求」業務語意

---

# § 7. 範圍 B closure 標準對齊（overview §8.2）

| 標準 | 狀態 |
|---|---|
| 4 階段計算引擎落地 | ✅ Phase 3 commit 1+2 |
| 倉層級頻率設定 + 排程 | ✅ M1 + Phase 4 scheduler |
| BrandAllocationRule schema + service | ✅ M2 + Phase 2 |
| 銷貨比例自動算 + 手動覆寫 | ✅ Stage 4 + Q-S1=A |
| application 層替代邏輯 | ✅ Phase 3 commit 3 |
| 建議單管理 UI | 🟡 stub（Phase 6、UI 獨立軌）|
| NX02 Demand 接點完整 | ✅ Phase 4 commit 1 |

⭐ **6/7 closure 標準滿足、UI 1 項 stub 留 TASK-AR-IMPL-UI-01**。

---

# § 8. backlog（A026 子項）

| # | 項目 | 推薦處置 |
|---|---|---|
| 1 | @nestjs/schedule cron decorator 註冊 | 外部 cron / k8s CronJob HTTP 觸發、本軌不依賴 |
| 2 | per-setting calculationFrequency 細粒度 due 判斷 | 本軌按倉統一、後續可升 |
| 3 | ArRunResult 持久化 batch log | 本軌純 in-memory return、後續可新表 |
| 4 | N+1 query 優化（Stage 1 / Stage 4）| plan §7 已揭露、按倉切批 + index |
| 5 | leadTimeDays schema 欄 | 預設 7 天、Crown 後續可拍 |
| 6 | TASK-AR-IMPL-02-TEST 獨立軌 | 對齊 NX03-IMPL-02-TEST 範式 |
| 7 | TASK-AR-IMPL-UI-01 UI 獨立軌 | 倉管調整 / 產品決策 UI |
| 8 | 預測性補貨 | 範圍 B 後續軌 |
| 9 | 跨倉自動調撥建議 | NX03 範圍 backlog |
| 10 | 客戶分級補貨策略 | 後續軌 |

---

# § 9. 開工進度時間軸

| 階段 | commit 範圍 | 主軸 |
|---|---|---|
| Phase 0 | 1 commit | plan 文件 |
| Phase 1 | 2 commit | M1 + M2 schema |
| Phase 2 | 1 commit | L1 BrandAllocationRule CRUD |
| Phase 3 | 3 commit | L2 計算引擎 4 階段 + replace helper |
| Phase 4 | 2 commit | L3 ArSuggestionWriter + Scheduler/Controller |
| Phase 5 | 1 commit | L4 跨模組 verify 報告 |
| Phase 6 | 1 commit | UI stub placeholder |
| Phase 7 | 1 commit | summary + worklog（本 commit）|

**總計：12 commit / 2 migration / 命中 plan §4 估 10~12 上界**

---

> 完整業務需求：`docs/auto-replenish/spec/intent/ar-overview.md` v0.1.0
> Phase 0 plan：`docs/auto-replenish/spec/impl/ar-impl-01-plan.md`
> Phase 5 verify：`docs/auto-replenish/spec/impl/ar-impl-01-phase5-verify.md`
> AR-AUDIT-01 v2：`docs/auto-replenish/ar-audit-01.md`
