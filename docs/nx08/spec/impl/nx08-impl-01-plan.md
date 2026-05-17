<!-- docs/nx08/spec/impl/nx08-impl-01-plan.md -->

# TASK-NX08-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx08-reporting`（自 main HEAD `b3fa8f0` 切出、v0.9.0-nx06-routing-closure + NX08-AUDIT-01 後）
> 對應依據：[nx08-overview v0.1.0](../intent/nx08-overview.md) + [nx08-audit-01](../../nx08-audit-01.md)
> 紀律：對齊 NX05/NX06 範式（Q-RHYTHM-2 第四次落地）

---

## §0 計畫文件性質

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v0.1.0 沒提到的新需求）
- 跨模組行為改變（需動既有 production 行為）
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 7 業務功能（對齊 overview v0.1.0 §9.1）

| # | 功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | 7 角色 21 dashboard placeholder UI | — | — | — | 🟡 stub × 21 |
| 2 | 7 dashboard 即時 SQL 聚合 service | ✅ 上游業務 model 齊 | 0 | 新建 7 service | 🟡 placeholder 對應 |
| 3 | 3 業界改革 dashboard ⭐⭐⭐ | ✅ 上游 model 齊 | 0 | 新建 3 method | 🟡 stub |
| 4 | ETL HTTP endpoint（外部 cron 觸發、mock shell）| — | — | 新建 EtlController + shell service | — |
| 5 | 6 業務模組 reverse FK 補入 NX08 Cache schema | 既有 8 Cache 不動 | M1 + 3 new doc-level caches | — | — |
| 6 | menu.nx08.ts + side-menu wire | ❌ 0 | — | — | 🟡 menu + wire |
| 7 | 治理檔補完（summary / merge-verify、worklog 主題 4）| ❌ | — | — | — |

---

## §2 拓樸排序 4 層

### L1 — 基礎層（schema：3 new doc-level Cache + reverse FK）

⭐ **Hank Q-H1 自決**：既有 8 Nx08 Cache 模型結構 **0 動**（per-partner-aggregated 設計、Q1=c 保留不改），新增 **3 doc-level snapshot cache models**（鏡像 audit § 5.2 揭露的 reverse FK 缺口）：

- **Nx08ApCacheSnapshot**（per Nx05ApLedger 文件級快照、提供逐筆 AP 歷史 trace）
- **Nx08ArCacheSnapshot**（per Nx05ArLedger 文件級快照、提供逐筆 AR overdueDays 軌跡）
- **Nx08DeliveryCacheSnapshot**（per Nx06Dn 文件級快照、含 driverUserId + handoverCount 衍生欄）

**M1 schema 性質**：純新表 × 3、無 ALTER 既有 table、0 backfill 衝突；reverse FK 列表自動透過 prisma 加上對應 business model（Nx05ApLedger / Nx05ArLedger / Nx06Dn 各 +1 reverse list relation）。

**Q1=c 邊界守住**：本軌只建 schema、**0 writer**（後續軌 TASK-NX08-IMPL-02-CACHE 啟動 ETL）。

### L2 — 即時 SQL 聚合 service（7 角色 dashboard）

對齊 overview §2 + §3 + audit §6 候選池、命名：

| service | controller | 路由 | 主 method | 對應上游 |
|---|---|---|---|---|
| `Nx08SalesRepDashboardService`     | controller    | /nx08/dashboard/sales-rep        | personalSales / customerInsight / productSales | NX04 So + Nx01Partner |
| `Nx08WarehouseStaffDashboardService` | controller  | /nx08/dashboard/warehouse-staff  | turnover / dormant / lowStockAlert | NX03 stock_balance + ledger |
| `Nx08WarehouseLeadDashboardService` | controller   | /nx08/dashboard/warehouse-lead ⭐ | deliveryCost / routeEfficiency / handoverStats | NX06 Dn + DnHandover |
| `Nx08PurchasingDashboardService`    | controller   | /nx08/dashboard/purchasing       | supplierGrade / priceCompare / poStats | NX02 Po/Rfq/Rr/Pr |
| `Nx08FinanceDashboardService`       | controller   | /nx08/dashboard/finance          | arOverview / apOverview / cashFlow | NX05 Ap/Ar/Paylog |
| `Nx08OwnerDashboardService`         | controller   | /nx08/dashboard/owner            | deptPerf / salesRanking / kpiGap | NX04 + Nx01KpiTarget |
| `Nx08StrategyDashboardService`      | controller   | /nx08/dashboard/strategy ⭐      | crossModule / bcgMatrix / strategyKpi | 全模組聚合 |

⭐ **7 個 service / 7 個 controller / ≥ 21 endpoints**（每 service ≥ 3 method 對應 21 dashboard）。

### L3 — 業界改革 dashboard 3 method（內嵌、不另建 service）

對齊 overview §3.2、3 業界改革 dashboard 不另建 service、內嵌到 §L2 對應角色：

- **AR 補貨建議命中率**：Nx08PurchasingDashboardService.arRecallHitRate（query Nx02Demand demandType=S → refRfqId → Rr 鏈）
- **DnHandover 動態交接統計**：Nx08WarehouseLeadDashboardService.handoverStats（query Nx06DnHandover by status SUGGESTED/ACCEPTED/REJECTED/COMPLETED/CANCELLED + 節省時間估）
- **BCG matrix 商品分類 + HPA trend**：Nx08StrategyDashboardService.bcgMatrix（query Nx03 stock_balance 周轉率 + NX04 So 銷售額 → 4 象限 Q/S/C/D）

### L4 — ETL HTTP endpoint shell（外部 cron 範式、Crown Q4=b）

對齊 NX05 ArStatement 範式：
- **Nx08EtlController** + **Nx08EtlService**
- 3 endpoint：
  - `POST /nx08/etl/run-daily-report`（每日 daily-report 批次重算、本軌 mock shell）
  - `POST /nx08/etl/run-monthly-summary`（每月 monthly summary 重算、本軌 mock shell）
  - `POST /nx08/etl/refresh-cache`（refresh Nx08*Cache、本軌 mock shell、Q1=c 後續軌啟動）

**性質**：本軌全 shell（純 audit log 寫入 + mock response）、避免外部依賴拖累本軌。

### L5 — UI 21 placeholder + menu + wire

- `apps/nx-ui/src/app/dashboard/nx08/` 加 7 子目錄（sales-rep / warehouse-staff / warehouse-lead / purchasing / finance / owner / strategy）× 3 placeholder = 21 pages
- 既有 `/dashboard/nx08/workspace` 升 desc
- **menu.nx08.ts** 建立（getNx08SideMenu、3 group 或 1 group 22 items）
- **side-menu.ts** 加 nx08 路由 → getNx08SideMenu()

---

## §3 Migration 拆軌策略（A041 精確 = **1 軌**）

### M1 — `nx08_impl_01_m1_doc_level_caches`

範圍：3 新表 + 3 業務模組 reverse list relations。

```sql
-- Nx08ApCacheSnapshot：per AP ledger snapshot
CREATE TABLE "nx08_ap_cache_snapshot" (
  "id"             VARCHAR(15) PRIMARY KEY DEFAULT gen_nx08_ap_cache_snapshot_id(),
  "tenant_id"      VARCHAR(15) NOT NULL,
  "ap_ledger_id"   VARCHAR(15) NOT NULL,
  "snapshot_date"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "original_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "paid_amount"     DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "balance_amount"  DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "status_at"       VARCHAR(20) NOT NULL,
  "overdue_days"    INT NOT NULL DEFAULT 0,
  ...
);

-- Nx08ArCacheSnapshot：per AR ledger snapshot
CREATE TABLE "nx08_ar_cache_snapshot" (...);

-- Nx08DeliveryCacheSnapshot：per DN snapshot
CREATE TABLE "nx08_delivery_cache_snapshot" (
  "id"              VARCHAR(15) PRIMARY KEY DEFAULT gen_nx08_delivery_cache_snapshot_id(),
  "tenant_id"       VARCHAR(15) NOT NULL,
  "dn_id"           VARCHAR(15) NOT NULL,
  "snapshot_date"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "driver_user_id"  VARCHAR(15),
  "handover_count"  INT NOT NULL DEFAULT 0,
  "internal_cost_sum" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ...
);
```

3 個 reverse FK 列表（自動隨 prisma schema relation）：
- Nx05ApLedger：`rev_Nx08ApCacheSnapshot_apLedgerId Nx08ApCacheSnapshot[]`
- Nx05ArLedger：`rev_Nx08ArCacheSnapshot_arLedgerId Nx08ArCacheSnapshot[]`
- Nx06Dn：`rev_Nx08DeliveryCacheSnapshot_dnId Nx08DeliveryCacheSnapshot[]`

性質：純新表 × 3、0 既有 ALTER、0 backfill 衝突。

---

## §4 commit 拆軌（A041 估 = **8~10 commit**、命中 Crown 估 12~15 預算 ~60%）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本檔）|
| Phase 1 | 1 | M1 schema（3 new cache models + reverse FK + migrate dev）|
| Phase 2 | 2 | 7 dashboard service + 7 controller + DTO（拆兩波：sales/warehouse/purchasing / finance/owner/strategy）|
| Phase 3 | 1 | 3 業界改革 method（內嵌、AR 命中率 + DnHandover + BCG matrix）+ ETL controller + shell service |
| Phase 4 | 1 | UI 21 placeholder + menu.nx08.ts + side-menu wire |
| Phase 5 | 1 | summary + worklog 主題 4 + _team 主題 28 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push（待 Crown）|

**估計**：8 commit + 1 收尾 = 9 commit、可能因 dashboard 邏輯複雜度浮動 ±2。

---

## §5 拍板 Q 對齊 overview v0.1.0

| Q | Crown 拍板 | 影響 |
|---|---|---|
| Q1 Cache writer | c=保留 schema、不啟動 writer | 本軌 0 writer、純即時 SQL 聚合 |
| Q2 dashboard 範圍 | b=完整 7 角色 | 7 service + 21 dashboard |
| Q3 UI strategy | a=純 stub | 21 placeholder（同 NX02-06 範式）|
| Q4 ETL 機制 | b=外部 cron HTTP endpoint | 不裝 @nestjs/schedule、純 endpoint trigger |
| Q5 客戶端 extranet | b=後續軌（範圍 B）| 本軌不做 |

**本軌 Hank 自決 Q**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 既有 8 Cache 處置 | 結構 0 動（per-partner aggregated 設計、Q1=c 拍板對齊）| 避免大改、後續軌 ETL 寫入既有結構 |
| Q-H2 3 新 doc-level cache 設計 | per-doc snapshot（鏡像 audit reverse FK 缺口）| 解 audit § 5.2 揭露「0 業務模組接點」缺口、不破壞既有 |
| Q-H3 7 dashboard service 結構 | 1 controller / 1 service / role / N method | 對齊 NX02-06 範式、role 細分清晰 |
| Q-H4 ETL controller shell mock 內容 | 寫 audit log + 回 mock response（同 Lalamove / web-push 範式）| 對齊 Q-RHYTHM-2 mock 範式 |
| Q-H5 業界改革 3 dashboard 是否抽 service | 不抽（內嵌 7 service 中對應角色 method）| 避免過度切割、業務語意明確 |
| Q-H6 dashboard endpoint 認證 | RolesGuard 分流（SALES / WAREHOUSE / PURCHASING / FINANCE / OWNER / SYSADMIN）| 角色權限對齊 overview §2 |
| Q-H7 UI placeholder 路徑命名 | /dashboard/nx08/<role>/<dashboard> 兩層（同 NX06 driver 範式）| 符合 menu 結構 |
| Q-H8 menu.nx08 group | 7 group（每角色一 group、簡潔）| 對齊 menu.nx06 範式（IMPL-02 有 2 group：物流管理 + driver PWA）|

---

## §6 邊界守住

- ✅ **既有 4 service + 12 endpoint 行為 100% 保留**（daily-report / monthly-report / kpi-target / kpi-record 0 動）
- ✅ **既有 8 Nx08 Cache 結構 0 動**（Q1=c 拍板對齊、後續軌 ETL）
- ✅ **0 cross-module helper**（NX08 純 prisma 直 query、無需上游 helper）
- ✅ **0 上游 production 行為改變**（純 read-only 聚合）
- ⚠️ **3 新 doc-level cache schema 純 additive**（純新表、0 writer、後續軌啟動 ETL）
- ⚠️ **UI placeholder × 21**（檔案數膨脹但純 stub）

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| 7 dashboard service 跨模組 prisma query 複雜度 | 中 | 中 | 對齊既有 monthly-report 範式（aggregate + groupBy）|
| BCG matrix 演算法精度 | 中 | 小 | 簡化版（X 軸=銷售額成長率 / Y 軸=市占率 proxy=銷售額比）|
| AR 命中率計算（Demand → RFQ → PO → RR 鏈）| 中 | 中 | 簡化：query Nx02Demand 已關聯 refRfqId 比例 |
| 動態交接統計接合 NX06-IMPL-02 schema | 低 | 低 | NX06 closure 已合進 main、schema 穩定 |
| 21 placeholder UI tsc/build 時間影響 | 低 | 小 | 純 stub、無動態 import 開銷 |
| ETL endpoint 被外部 cron 真正呼叫風險 | 低 | 中 | mock shell、無實質 side effect |

---

## §8 後續軌預告

- TASK-NX08-IMPL-UI-01：21 placeholder → 真實 chart（Recharts / Chart.js）
- TASK-NX08-IMPL-02-CACHE：ETL writer 啟動（refresh-cache 真實寫入既有 8 Cache + 3 doc-level Cache）
- TASK-NX08-IMPL-02-TEST：service + ETL unit test
- TASK-NX08-IMPL-03-EXTRANET：客戶端 portal（範圍 B 戰略軌）
- TASK-NX08-IMPL-04-DESIGNER：自訂報表設計器（PRO 級候選）
- TASK-NX08-IMPL-05-AI：AI 預測分析（銷售/庫存/客戶流失）

---

> 文件版本：v0.1.0（IMPL-01 plan 初版、Q-RHYTHM-2 第四次落地）
> 待 plan commit 後 → Phase 1 schema 開工
