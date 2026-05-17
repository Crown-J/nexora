<!-- docs/nx09/spec/impl/nx09-impl-02-merge-verify.md -->

# TASK-NX09-IMPL-02 — Merge Main 上線風險揭露（NX09-IMPL-02-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-18
> 觸發：Phase 7 closure 後、Q-RHYTHM-2 第九次全軌連跑完成
> 真實 main HEAD（merge 前）：`e016b68`（v1.4.0-nx10-social-mission-closure + NX09-AUDIT-02）
> 分支：`feature/nx09-yaro-feature`（ahead 7 commit）
> 對應依據：[plan v0.1.0](./nx09-impl-02-plan.md) + [overview v0.2.0](../intent/nx09-overview.md) + [audit-02](../../nx09-audit-02.md)

---

## §0 ahead 7 commit 真實清單

```
（Phase 7 本 commit：summary v2.0 + worklog 主題 4 + _team 主題 33 + merge-verify）
25ac493 Phase 6 commit: UI 4 placeholder + menu.nx09 升（10 items）+ workspace desc
31b2d6e Phase 4+5 合併 commit: RepairSop service + ↔ PartModel 雙向 wire ⭐⭐⭐
ebf3fd5 Phase 3 commit: VinLookup service + NHTSA 整合 + Parts 查詢 ⭐⭐⭐
7cd2c97 Phase 2 commit: 4 子表 endpoint 補（17 新 endpoint）
5ea30d7 Phase 1 commit: M1 schema migration + M2 constraint naming drift
c80b613 Phase 0 commit: plan v0.1.0 + overview v0.2.0 連帶 commit
```

---

## §1 NX09 service 改動 verify

### 1.1 既有 IMPL-01 6 controller / 26 endpoint 行為

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| article / document / meeting / system-manual / fulltext-search | ❌ 0 改 | ✅ 100% 保留 |
| sub-tables（IMPL-01 4 endpoint）| ⚠️ service + controller 擴（4 新子表）| ✅ 既有 4 endpoint 行為 100% 保留 |

⭐ **既有 26 endpoint 100% 保留 / sub-tables 純加 17 endpoint**。

### 1.2 新增 2 service + 2 controller + 35 endpoint（純新增）

| controller | 路由 | endpoint | 業界改革 |
|---|---|---|---|
| Nx09VinLookupController ⭐⭐⭐ | /nx09/vin-lookup | 8（list / :id / by-vin/:vin / decode / POST / PATCH / DELETE / :id/parts）| VIN NHTSA + 手動混合 |
| Nx09RepairSopController ⭐⭐⭐ | /nx09/repair-sop | 10（CRUD 6 + wire 4）| 維修 SOP 結構化 + 雙向 wire |
| Nx09SubTablesController 升 | /nx09 | +17（既有 4 → 21）| - |

⭐ A041：**8 controller / 61 endpoint**（IMPL-01 6/26 + IMPL-02 +2 controller +35 endpoint）。

### 1.3 跨模組接點 verify（純 NX01 上游讀、0 跨業務模組 wire）

| 接點 | 真相 |
|---|---|
| NX01 CarBrand FK | ✅ VinLookup.carBrandId（可空、NHTSA Make 對照 nameEn）|
| NX01 Model FK | ✅ VinLookup.modelId + RepairSop.carModelFilter（皆可空）|
| NX01 PartModel FK | ✅ RepairSopPartModel.partModelId（link 表雙向 wire）|
| NX99 Tenant FK | ✅ 2 主表 tenantId |
| 業務模組（NX02/04/05/06/07/08）| ❌ 0 跨模組 wire（Crown Q5=b 留 IMPL-03）|

### 1.4 NHTSA HTTP call ⚠️ 行為改變揭露

| 行為 | 影響 |
|---|---|
| POST /nx09/vin-lookup/decode 觸發 HTTPS GET → vpic.nhtsa.dot.gov | 上線後 production 開始 outbound HTTPS（既有 NX06 Google Maps 已有同範式）|
| ENV NHTSA_API_ENABLED 預設 true | 任何 deploy 0 設定即啟用、明確 'false' 才停用 |
| 5s timeout AbortController + graceful fallback | API 失敗 → source='MANUAL' + null fields + audit log warn、不阻擋 upstream |
| 亞洲車型覆蓋率較低 | 上線後 7 天統計、後續軌 TASK-NX09-IMPL-VIN-API-FALLBACK 處理 |

⚠️ **production 影響**：
- 既有 NX09 IMPL-01 26 endpoint 0 影響
- 新增 35 endpoint 上線（含 1 外網 HTTP call）
- 風險：低（fallback graceful、無 secret key 洩漏風險）

---

## §2 schema 改對既有功能影響

### 2.1 2 軌 migration（IMPL-02）

| 軌 | 範圍 | 風險 |
|---|---|---|
| M1 nx09_impl_02_m1_vin_lookup_and_repair_sop | 3 新表 + 3 ID generator function | ✅ 純 CREATE、0 既有 ALTER、0 backfill |
| M2 nx09_impl_02_m2_constraint_naming_alignment | constraint rename `_fkey` → `_id_fkey` | ✅ 純 rename、0 data change |

### 2.2 既有 11 model + 新 3 model = 14 model（IMPL-02 後）

NX01 vehicle chain（CarBrand / Model / PartModel）**0 動結構**、純加 reverse relations。

⭐ **0 prisma drift 風險**（drift 已在 M2 完成對齊）。

---

## §3 UI 改動 verify

### 3.1 新增 4 placeholder（純 UI stub）

- `/dashboard/nx09/vin-lookup` ⭐⭐⭐
- `/dashboard/nx09/repair-sop` ⭐⭐⭐
- `/dashboard/nx09/article-tag`
- `/dashboard/nx09/meeting-detail`

### 3.2 menu.nx09 升

- 既有 6 → 10 items（分 2 group：EIP 基礎 + 亞羅特色 IMPL-02）
- workspace desc 升（IMPL-01 + IMPL-02 完整化揭露 + 8 controller / 61 endpoint）

### 3.3 side-menu.ts 0 動

⭐ IMPL-01 已 wire nx09 路由、本軌 0 動 side-menu。

---

## §4 預期 production 行為清單

1. ✅ 既有 26 endpoint 100% 保留
2. ✅ 新增 35 endpoint 上線
3. ⚠️ POST /nx09/vin-lookup/decode 觸發 outbound HTTPS → NHTSA（業界改革 ⭐⭐⭐ 行為新增）
4. ⚠️ RepairSop ↔ PartModel link 表新建（業務員可開始建檔）
5. ⚠️ 4 子表 CRUD 全開（KmArticleTag attach/detach、MeetingAction/Attendee/Minutes 完整管理）
6. ✅ 4 UI placeholder 上線
7. ✅ menu.nx09 升 10 items

---

## §5 Rollback 風險

| commit | rollback 路徑 |
|---|---|
| Phase 6 UI | git revert `25ac493` |
| Phase 4+5 RepairSop | git revert `31b2d6e`（含 service + controller + module wire）|
| Phase 3 VinLookup | git revert `ebf3fd5`（含 NHTSA client + service + controller + module wire）|
| Phase 2 子表 | git revert `7cd2c97`（service + controller 擴）|
| Phase 1 schema | ⚠️ migration rollback 需手動 DROP TABLE × 3 + DROP FUNCTION × 3（無 Prisma down migration、production 建議保留）|
| Phase 0 plan | git revert `c80b613` |

⭐ commit 4 個 service/controller 全部 git revert 可逆、schema 建議保留（非破壞性）。

---

## §6 Build / Tsc verify

- pnpm --filter=nx-api exec tsc --noEmit → 0 error
- pnpm --filter=nx-ui exec tsc --noEmit → 0 error
- prisma migrate status → "Database schema is up to date!"

---

## §7 A026 補登候選（Crown 拍板 merge 時補登）

1. **TASK-NX09-IMPL-03-CROSS-WIRE** ⭐⭐⭐（NX07 / NX04 / NX02 / NX08 → NX09 跨模組 wire）
2. **TASK-NX09-IMPL-04-RAG** ⭐（pgvector + OpenAI embedding 向量化）
3. **TASK-NX09-IMPL-VIN-API-FALLBACK**（亞洲車型補充：VSCC / OEM 經銷商）
4. **TASK-NX09-IMPL-DTC-LIBRARY**（OBD-II DTC 故障代碼庫 → RepairSop wire）
5. **TASK-NX09-IMPL-UI-01**（真實 UI 含 VIN 查詢面板 + 維修 SOP 步驟編輯器）
6. **TASK-NX09-IMPL-AUTO-VERSION**（DocumentVersion 自動寫入 + KmArticle 統計 writer、IMPL-01 backlog 沿用）
7. **TASK-NX09-IMPL-REPAIRSOP-SEED**（業務員首日範例 SOP seed）
8. **TASK-NX09-IMPL-02-TEST**（VinLookup + RepairSop + NHTSA + 雙向 wire unit test）
9. **VIN 17 字 checksum 校驗**（業界進階、本軌只驗 length=17）
10. **NHTSA 亞洲車型覆蓋率 production 統計**（上線後 7 天收集）

---

## §8 Merge 建議

⭐ **建議 merge 入 main + tag `v1.5.0-nx09-yaro-feature-closure`**：

| 維度 | 評估 |
|---|---|
| 既有 endpoint 行為保留 | ✅ 100% |
| schema 衝擊 | ✅ 0 既有 ALTER、純加 3 表 |
| 跨模組 wire | ✅ 0（純內部 + NX01 上游讀）|
| tsc / build | ✅ 0 error |
| 業界改革落地 | ⭐⭐⭐ 3 全落地（VIN / RepairSop / 內部 wire 雙向）|
| Rollback 可行性 | ✅ git revert × 6 可逆 |
| commit 結構 | ✅ 7 commit 清晰可逐 phase rollback |

stop 給 Crown + Alex 驗收，Crown 拍板 A 後 Hank 自跑 merge / push / tag 收尾。

---

> 文件版本：v1.0（NX09-IMPL-02 merge-verify、8 段揭露、stop 給 Crown）
