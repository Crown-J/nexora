<!-- docs/nx08/nx08-summary.md -->

# NX08 報表分析 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX08-IMPL-01 5 Phase commit + AUDIT-01 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx08/spec/intent/nx08-overview.md`
> 戰略定位：NEXORA 業務閉環延伸第 8 軌、Crown / 主管戰略入口
> Q-RHYTHM-2 第四次落地：Crown + Alex 預批、Hank 全軌連跑

---

# § 1. NX08 模組業務角色

## 1.1 模組定位

NX08 = **NEXORA 業務閉環的「眼睛」**、跨模組資料聚合 + 7 角色 dashboard + 3 業界改革指標。

```
上游（業務閉環第一階段 closure ✓）：
  NX02 採購 → 廠商分析 / 比價 / 採購額
  NX03 庫存 → 周轉率 / 滯銷 / 缺貨
  NX04 銷貨 → 業績 / 客戶 / 商品銷量
  NX05 財務 → AR / AP / cash flow
  NX06 物流 → 配送成本 / 路線效率 / 動態交接 ⭐⭐⭐
  AR 自動補貨 → 命中率 ⭐⭐⭐
        ↓
NX08 報表聚合：
  7 角色 21 dashboard + 即時 SQL 聚合 + ETL HTTP endpoint
        ↓
下游：Crown / 主管戰略決策
```

**戰略意義**：
- ⭐⭐⭐ AR 補貨建議命中率（接合 AR closure、業界第一個）
- ⭐⭐⭐ DnHandover 動態任務轉派統計（接合 NX06-IMPL-02、業界第一個）
- ⭐⭐⭐ BCG matrix 商品分類自動標記（業界 schema 多有 / 行為少落地）

## 1.2 7 業務功能（對齊 overview v0.1.0 §9.1）

1. 7 角色 22 dashboard placeholder UI（workspace + 21 dashboard）
2. 7 dashboard 即時 SQL 聚合 service + 22 endpoint
3. 3 業界改革 dashboard ⭐⭐⭐（內嵌、Hank Q-H5 拍板）
4. ETL HTTP endpoint × 3（外部 cron 觸發、mock shell）
5. 6 業務模組 reverse FK 補入 NX08 Cache（透過 M1 3 doc-level caches）
6. menu.nx08.ts（8 group / 22 items）+ side-menu wire
7. 治理檔補完（summary + worklog 主題 4 + _team 主題 28 + merge-verify）

---

# § 2. Schema 真相

## 2.1 2 軌 migration（NX08-IMPL-01 Phase 1）

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx08_impl_01_m1_doc_level_caches` | 純新表 × 3（ApCacheSnapshot / ArCacheSnapshot / DeliveryCacheSnapshot）+ 3 reverse FK list（Nx05ApLedger / Nx05ArLedger / Nx06Dn）|
| M2 | `nx08_impl_01_m2_constraint_naming_alignment` | auto-gen drift 結算（M1 我的 CONSTRAINT 自訂名 → Prisma convention 名、純命名）|

## 2.2 既有 8 model（audit-01 揭露、本軌不動）

對齊 audit-01 §1.2：
- Nx08DailyReport（員工每日工作日報）
- Nx08FinanceCache / Nx08HrCache / Nx08InventoryCache / Nx08PurchaseCache / Nx08SalesCache（5 partner-aggregated cache）
- Nx08PestelRecord / Nx08SwotRecord（2 戰略記錄）

## 2.3 本軌新增 3 model（doc-level snapshot）

| Model | Table | 業務語意 |
|---|---|---|
| `Nx08ApCacheSnapshot` | nx08_ap_cache_snapshot | per Nx05ApLedger 文件級快照（含 overdueDays 計算）|
| `Nx08ArCacheSnapshot` | nx08_ar_cache_snapshot | per Nx05ArLedger 文件級快照 |
| `Nx08DeliveryCacheSnapshot` | nx08_delivery_cache_snapshot | per Nx06Dn 快照（含 handoverCount + internalCostSum）|

⭐ Q1=c 拍板：3 新表純 schema、0 writer（後續軌 TASK-NX08-IMPL-02-CACHE 啟動 ETL）。

---

# § 3. Service 真相

## 3.1 既有 4 service / 12 endpoint（NX08-IMPL-01 前、IMPL phase5 落地）

對齊 audit-01 §2.1：daily-report / monthly-report / kpi-target / kpi-record（行為 100% 保留）。

## 3.2 本軌新增 8 service / 25 endpoint

| service | controller | 路由 | endpoint 數 |
|---|---|---|---|
| Nx08SalesRepDashboardService     | controller | /nx08/dashboard/sales-rep        | 3 |
| Nx08WarehouseStaffDashboardService | controller | /nx08/dashboard/warehouse-staff  | 3 |
| Nx08WarehouseLeadDashboardService | controller | /nx08/dashboard/warehouse-lead   | 3（含 ⭐⭐⭐ handover-stats）|
| Nx08PurchasingDashboardService    | controller | /nx08/dashboard/purchasing       | 4（含 ⭐⭐⭐ ar-recall-hit-rate）|
| Nx08FinanceDashboardService       | controller | /nx08/dashboard/finance          | 3 |
| Nx08OwnerDashboardService         | controller | /nx08/dashboard/owner            | 3 |
| Nx08StrategyDashboardService      | controller | /nx08/dashboard/strategy         | 3（含 ⭐⭐⭐ bcg-matrix）|
| Nx08EtlService                    | controller | /nx08/etl                        | 3（外部 cron 觸發、mock shell）|

⭐ A041 真實：**12 controller / 37 endpoint**（既有 12 + 本軌 25）。

## 3.3 3 業界改革 dashboard ⭐⭐⭐（內嵌實作）

- **AR 補貨建議命中率**：`PurchasingDashboardService.arRecallHitRate`
  - 演算法：query Nx02Demand[demandType=S].refRfqId IS NOT NULL / total %
  - 接合 AR-IMPL-01 closure（業界中小 ERP 第一個）
- **DnHandover 動態交接統計**：`WarehouseLeadDashboardService.handoverStats`
  - 演算法：byStatus groupBy + acceptanceRate + completionRate + topReceiverDrivers
  - 接合 NX06-IMPL-02 closure（業界第一個）
- **BCG matrix 商品分類**：`StrategyDashboardService.bcgMatrix`
  - 演算法：60d split（recent30 vs prior30）+ 自動 4 象限標記 S/C/Q/D
  - top 50 by revenue（規模簡化版）

## 3.4 shared/nx08（既有 1 helper、本軌不動）

- `nx08-pro-plan.guard.ts`（PRO 方案 guard、既有）

---

# § 4. ETL HTTP endpoint（Crown Q4=b 拍板）

對齊 NX05 ArStatement 範式 + Crown Q4=b 拍板（不註冊 @nestjs/schedule）：

| endpoint | method | 用途 |
|---|---|---|
| `/nx08/etl/run-daily-report`     | POST | 每日 daily-report 批次重算（mock shell）|
| `/nx08/etl/run-monthly-summary`  | POST | 每月 summary 重算（mock shell）|
| `/nx08/etl/refresh-cache`        | POST | refresh Nx08*Cache（Q1=c 後續軌啟動真實寫入）|

env：`NX08_ETL_ENABLED` 預設 false = mock 模式。

---

# § 5. UI 真相

## 5.1 既有 1 placeholder（NX08-IMPL-01 前）

- `/dashboard/nx08/workspace`（升 desc 標 7 角色 + 3 業界改革 + ETL）

## 5.2 本軌新增 21 placeholder + 1 menu + side-menu wire（Phase 4）

7 角色 × 平均 3 dashboard placeholder：
- `/dashboard/nx08/sales-rep/{personal-sales,customer-insight,product-sales}`
- `/dashboard/nx08/warehouse-staff/{turnover,dormant,low-stock-alert}`
- `/dashboard/nx08/warehouse-lead/{delivery-cost,route-efficiency,handover-stats}` ⭐⭐⭐
- `/dashboard/nx08/purchasing/{supplier-grade,price-compare,po-stats,ar-recall-hit-rate}` ⭐⭐⭐
- `/dashboard/nx08/finance/{ar-overview,ap-overview,cash-flow}`
- `/dashboard/nx08/owner/{dept-perf,sales-ranking,kpi-gap}`
- `/dashboard/nx08/strategy/{cross-module,bcg-matrix,strategy-kpi}` ⭐⭐⭐

menu.nx08.ts（getNx08SideMenu）8 group / 22 items + side-menu.ts 加 nx08 路由。

⭐ Crown Q3=a 拍板：UI 純 stub、實作獨立軌 TASK-NX08-IMPL-UI-01。

---

# § 6. 環境變數（本軌新增 1）

| 環境變數 | 預設 | 角色 |
|---|---|---|
| `NX08_ETL_ENABLED` | `false`（mock）| 控制 ETL real run（後續軌 TASK-NX08-IMPL-02-CACHE 設 true）|

⭐ 本軌 deploy 無需新環境變數（全預設 mock）。

---

# § 7. NX08-IMPL-01 commit 真相（6 commit / 5 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `53f1993` | plan v0.1.0 + overview v0.1.0 |
| 1 schema | `60e376c` | M1 3 doc-level caches + M2 drift 結算 + 修 NX06 M4 header |
| 2-3 dash + ETL | （Phase 2-3 合併）| 7 dashboard service + 3 業界改革 inline + 4 controller + 1 ETL controller + module wire |
| 4 UI | （Phase 4）| 22 placeholder + menu.nx08（8 group）+ side-menu wire |
| 5 docs | （本 commit）| summary v1.0 + worklog 主題 4 + _team 主題 28 + merge-verify |
| 收尾 | merge / push / tag | v1.0.0-nx08-closure（待 Crown 拍板）|

⭐ 6 commit + 1 收尾 = 7、命中 Crown 估 12-15 預算 ~50%。

---

# § 8. 後續軌（dual-track + UI 軌）

- TASK-NX08-IMPL-UI-01：21 placeholder → 真實 chart（Recharts / Chart.js）
- TASK-NX08-IMPL-02-CACHE：ETL writer 啟動（refresh-cache 真實寫入 8 既有 + 3 doc-level Cache）
- TASK-NX08-IMPL-02-TEST：service + ETL unit test
- TASK-NX08-IMPL-03-EXTRANET：客戶端 portal（範圍 B）
- TASK-NX08-IMPL-04-DESIGNER：自訂報表設計器（PRO 級候選）
- TASK-NX08-IMPL-05-AI：AI 預測分析（銷售 / 庫存 / 客戶流失）

---

> 文件版本：v1.0（IMPL-01 closure、Q-RHYTHM-2 第四次落地）
> 下次更新觸發：NX08-IMPL-UI-01 / NX08-IMPL-02-CACHE / Crown 對 dashboard 分權細粒度調整
