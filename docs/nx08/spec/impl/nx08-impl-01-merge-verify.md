<!-- docs/nx08/spec/impl/nx08-impl-01-merge-verify.md -->

# TASK-NX08-IMPL-01 — Merge Main 上線風險揭露（NX08-IMPL-01-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 5 closure 後、Q-RHYTHM-2 第四次全軌連跑完成
> 真實 main HEAD（merge 前）：`b3fa8f0`（v0.9.0-nx06-routing-closure + NX08-AUDIT-01）
> 分支：`feature/nx08-reporting`（ahead 5 commit）
> 對應依據：[plan v0.1.0](./nx08-impl-01-plan.md) + [overview v0.1.0](../intent/nx08-overview.md) + [audit-01](../../nx08-audit-01.md)

---

## §0 ahead 5 commit 真實清單

```
（待補 Phase 5 docs commit）
[Phase 4 commit] UI 22 placeholder + menu.nx08 + side-menu wire
[Phase 2-3 合併] 7 dashboard + 3 業界改革 inline + ETL + module wire
60e376c Phase 1 commit: 2 migration (M1 + M2 drift) + 修 NX06 M4 header
53f1993 Phase 0 commit: plan v0.1.0
```

---

## §1 NX08 service 改動 verify

### 1.1 既有 4 controller / 12 endpoint 行為

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `daily-report.controller`   | ❌ 0 改 | ✅ 5 endpoint 100% 保留 |
| `monthly-report.controller` | ❌ 0 改 | ✅ 2 endpoint 100% 保留 |
| `kpi-target.controller`     | ❌ 0 改 | ✅ 3 endpoint 100% 保留 |
| `kpi-record.controller`     | ❌ 0 改 | ✅ 2 endpoint 100% 保留 |

⭐ **既有 12 endpoint 行為 100% 保留**。

### 1.2 新增 8 service / 8 controller / 25 endpoint（純新增、0 替換）

| controller | 路由 | endpoint 數 | 角色 |
|---|---|---|---|
| Nx08SalesRepDashboardController     | /nx08/dashboard/sales-rep        | 3 | @Roles SALES |
| Nx08WarehouseStaffDashboardController | /nx08/dashboard/warehouse-staff | 3 | @Roles WAREHOUSE |
| Nx08WarehouseLeadDashboardController ⭐⭐⭐ | /nx08/dashboard/warehouse-lead | 3 | @Roles WAREHOUSE |
| Nx08PurchasingDashboardController ⭐⭐⭐    | /nx08/dashboard/purchasing      | 4 | @Roles PURCHASING |
| Nx08FinanceDashboardController       | /nx08/dashboard/finance          | 3 | @Roles FINANCE |
| Nx08OwnerDashboardController         | /nx08/dashboard/owner            | 3 | @Roles OWNER |
| Nx08StrategyDashboardController ⭐⭐⭐    | /nx08/dashboard/strategy        | 3 | @Roles OWNER |
| Nx08EtlController                    | /nx08/etl                        | 3 | @Roles SYSADMIN |

⭐ **§1 結論：既有 12 endpoint 100% 保留 / 8 新 controller + 25 new endpoint 純新增 / A041 = 12 controller / 37 endpoint**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 nx08_impl_01_m1_doc_level_caches（純新表 × 3）

| 維度 | 評估 |
|---|---|
| 純 CREATE TABLE × 3 | ✅ 0 ALTER 既有表、0 backfill 衝突 |
| 既有 8 Nx08 Cache 影響 | ✅ 0 動（Q1=c 拍板對齊）|
| 既有 Nx05ApLedger / Nx05ArLedger / Nx06Dn 影響 | ⚠️ 加 reverse FK list relation（schema-level 純 additive、不改既有欄）|
| 既有 service 路徑 | ✅ 0 動（reverse FK 是 prisma 編譯期、runtime 0 影響）|
| FK 約束 | ✅ 3 新表寫入時若 apLedgerId/arLedgerId/dnId 不存在會 throw（本軌 0 writer 不會觸發）|

### 2.2 M2 nx08_impl_01_m2_constraint_naming_alignment（auto-gen drift）

| 維度 | 評估 |
|---|---|
| 內容 | M1 我的 CONSTRAINT 自訂名 → Prisma convention 名（純命名）|
| 風險 | 低（命名變更、FK 邏輯不變）|
| 沿用範式 | NX06-IMPL-02 M4 drift 結算同模式（誠實揭露）|

⭐ **§2 結論：2 軌 schema 純 additive、既有 production 0 影響、Q1=c 拍板 0 writer 後續軌啟動 ETL**。

---

## §3 跨模組 helper / wire verify

⭐ **本軌 0 cross-module helper 變動**（NX08 走 prisma 直 query、非 helper 範式）。

- 既有 4 helper（其他模組 helper）0 動
- 0 上游 production 行為改變（純 read-only 聚合）
- ETL endpoints 全 mock shell（純 audit log + 不實際聚合）

---

## §4 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 升級 `/dashboard/nx08/workspace` desc | ✅ placeholder 文字更新、UI shell 0 動 |
| 新 21 placeholder（7 角色）| ✅ 純新路由、既有 1 placeholder 0 動 |
| `menu.nx08.ts` 新建（既有 0 個）| ✅ 純新檔 |
| `side-menu.ts` 加 nx08 條件 | ✅ 純 additive（既有 nx02-06 路由 0 動）|

⭐ **§4 結論：UI 純 stub 新增、0 production behavior change**。

---

## §5 環境變數 & 業務拍板對齊 verify

| Crown 戰略題 | 拍板 | 實作對齊 |
|---|---|---|
| Q1 Cache writer | c=保留 schema 不啟動 | ✅ 8 既有 Cache 0 動、3 新 doc-level Cache 0 writer |
| Q2 dashboard 範圍 | b=完整 7 角色 | ✅ 7 service / 22 endpoint / 21 placeholder |
| Q3 UI strategy | a=純 stub | ✅ 21 placeholder + 1 升級（同 NX02-06 範式）|
| Q4 ETL 機制 | b=外部 cron HTTP | ✅ 3 endpoint shell、不裝 @nestjs/schedule、env `NX08_ETL_ENABLED` 預設 false |
| Q5 客戶端 extranet | b=後續軌 | ✅ 本軌 0、留 TASK-NX08-IMPL-03-EXTRANET |

⭐ **§5 結論：5 戰略拍板 100% 對齊、deploy 預設全 mock**。

---

## §6 5 commit ahead 真實清單 + 1 收尾

```
（Phase 5 本 commit：summary + worklog + merge-verify）
[Phase 4 commit] UI 22 placeholder + menu.nx08 + side-menu wire
[Phase 2-3 合併] 7 dashboard + 3 業界改革 inline + ETL + module wire
60e376c Phase 1 commit: 2 migration (M1 + M2 drift) + 修 NX06 M4 header
53f1993 Phase 0 commit: plan v0.1.0
```

---

## §7 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 12 endpoint 100% 保留 / 8 新 controller 25 endpoint 純新增
- [ ] §2 2 軌 schema 純 additive（3 新 doc-level Cache + drift 結算、0 既有 ALTER）
- [ ] §3 0 cross-module helper、0 上游 production 行為改變
- [ ] §4 UI 21 placeholder + menu.nx08 8 group + side-menu wire 純 additive
- [ ] §5 5 戰略拍板 100% 對齊（Q1=c / Q2=b / Q3=a / Q4=b / Q5=b）
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓（69 migrations applied）
- [ ] 業務閉環延伸第 8 軌、Crown / 主管戰略入口落地

---

## §8 後續軌預告

| 軌 | 啟動條件 |
|---|---|
| TASK-NX08-IMPL-UI-01 | UI 真實 chart（21 placeholder → Recharts / Chart.js）|
| TASK-NX08-IMPL-02-CACHE | ETL writer 啟動（refresh-cache 真實寫入 + 8 既有 + 3 doc-level Cache）|
| TASK-NX08-IMPL-02-TEST | service + ETL unit test |
| TASK-NX08-IMPL-03-EXTRANET | 客戶端 portal（範圍 B）|
| TASK-NX08-IMPL-04-DESIGNER | 自訂報表設計器（PRO 級候選）|
| TASK-NX08-IMPL-05-AI | AI 預測分析 |

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx08-reporting → main + tag `v1.0.0-nx08-closure`（業務閉環延伸第 8 軌、NEXORA 主版本 v1.0 達成）
