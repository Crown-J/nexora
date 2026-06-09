<!-- docs/nx09/nx09-summary.md -->

# NX09 EIP 企業資訊平台 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v2.0（IMPL-01 + IMPL-02 完整化 closure、Q-RHYTHM-2 第九次落地）
> 最後更新：2026-05-18
> 撰寫：Hank（整合 TASK-NX09-IMPL-01 + IMPL-02 全 commit + AUDIT-01 + AUDIT-02 + overview v0.2.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx09/spec/intent/nx09-overview.md`
> 戰略定位：⭐⭐⭐ EIP 基礎（IMPL-01）+ 亞羅汽配特色（IMPL-02 VIN/維修 SOP）+ 3 業界改革候選 ⭐⭐⭐ 全落地
> Q-RHYTHM-2 第九次落地：Crown + Alex 預批、Hank 全軌連跑

---

# § 1. NX09 模組業務角色

## 1.1 模組定位

⚠️ Crown 重戰場升級：NX09 = **EIP 企業資訊平台**（不是純小知識庫）。

```
員工查資訊 → NX09 EIP 統一入口：
  KM 知識庫（FAQ / SOP / 公告 / 訓練、4 大分類擴）
  Document 制度文件（規格 / 規章 / 廠商）+ append-only 版本鏈
  SystemManual ⭐（NEXORA 自帶說明書、業界 ERP 標配）
  Postgres FTS ⭐（跨 3 主檔全文搜尋）
  會議系統（既有 v7_baseline）
        ↓
跨模組整合 → IMPL-02 後續軌（NX07 Training / NX04 SR / NX02 PR / NX08 dashboard）
```

**戰略意義**：
- ⭐⭐⭐ SystemManual 內建系統操作手冊（業界 SAP/Oracle/MS Dynamics 標配、中小汽配 ERP 第一個）
- ⭐⭐⭐ Postgres FTS 全文搜尋（純 Postgres 原生、不裝 Elasticsearch、中小 ERP 罕見）
- ⭐⭐ EIP 統一查詢入口（KM + Document + Manual 跨表搜尋）

## 1.2 7 業務功能（對齊 overview v1.0 §3.1）

1. KmArticle 主檔升級（既有 6 + 新 3 = 9 大分類、Crown 4 大語意對齊）
2. Document 主檔升級（既有 5 分類）
3. ⭐ SystemManual 新表 + 6 endpoint（featureKey UNIQUE 命名規範）
4. ⭐ Postgres FTS 全文搜尋（tsvector + simple 分詞 + ts_rank + ts_headline snippet）
5. 3 子表 core endpoint（DocVersion list + KmTag list+create + KmFeedback create）
6. UI 5+1 placeholder + menu.nx09 (1 group 6 items) + side-menu wire
7. 治理檔補完（overview + plan + summary + merge-verify、Hank 從 Crown TASK formalize）

---

# § 2. Schema 真相

## 2.1 3 軌 migration（NX09-IMPL-01 Phase 1）

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx09_impl_01_m1_system_manual_table` | 純新表 Nx09SystemManual（feature_key UNIQUE + content + steps + screenshots JSON）|
| M2 | `nx09_impl_01_m2_fulltext_search_tsvector` | 3 主檔加 tsvector + GIN index + trigger + backfill |
| M3 | `nx09_impl_01_m3_drift_resolution` | auto-gen drift 結算（constraint 命名對齊）|

## 2.2 既有 10 model + 本軌新增 1 model（總 11 model）

audit-01 §1.2 揭露 10 既有（Document/Version + KmArticle/Tag/ArticleTag/Feedback + Meeting/Attendee/Minutes/Action）+ 本軌新增：

| Model | Table | 業務語意 |
|---|---|---|
| `Nx09SystemManual` ⭐ | nx09_system_manual | NEXORA 系統操作手冊（featureKey UNIQUE + content/steps/screenshots + category GENERAL/FAQ/TROUBLESHOOT）|

3 主檔加 `searchVector Unsupported("tsvector")?`（FTS GIN 索引、trigger 自動寫入）：
- Nx09KmArticle
- Nx09Document
- Nx09SystemManual

⭐ Crown Q1=全要 + Q5=b 邊界守住：既有 10 model 結構 0 動、純加 1 新表 + 3 主檔 1 nullable 欄。

---

# § 3. Service 真相

## 3.1 既有 3 service / 15 endpoint（NX09-IMPL-01 前）

對齊 audit-01 §2.1：article / document / meeting 純 CRUD × 5。

## 3.2 本軌新增 3 service / 3 controller / 11 endpoint

| service | controller | 路由 | endpoint 數 |
|---|---|---|---|
| Nx09SystemManualService ⭐ | controller | /nx09/system-manual | 6（list / by-feature/:featureKey / get :id / POST / PATCH / DELETE）|
| Nx09FulltextSearchService ⭐ | controller | /nx09/search | 1（GET ?q=&scope=&limit=）|
| Nx09SubTablesService | controller | /nx09 | 4（document versions list / km-tag list+create / km-article/:id/feedback）|

⭐ A041 真實：**6 controller / 26 endpoint**（既有 3/15 + 本軌 3/11）。

## 3.3 既有 service 0 動 + DTO @IsIn 擴

對齊 Crown「既有 15 endpoint 100% 保留」+ Hank Q-H2：
- article.dto.ts / document.dto.ts：加 @IsIn validation（既有 6 + 新 3 = 9 / 既有 5）
- 既有 service CRUD 0 改

## 3.4 shared/nx09（既有 1 + 本軌新 1 = 2）

- nx09-pro-plan.guard.ts（既有）
- nx09-categories.ts ⭐ 新（4 enum + 4 大分類 mapping）

---

# § 4. SystemManual ⭐（業界 ERP 標配）

業界對標：SAP F1 help / Oracle EBS / Microsoft Dynamics inline help。

featureKey 命名規範：`模組.功能.動作`（regex `/^[a-z0-9]+(\.[a-z0-9]+)+$/`）

```
範例：
  nx04.so.create         — NX04 SO 建立
  nx05.ar.statement      — NX05 AR 對帳單
  nx06.handover.create   — NX06 動態交接建立
  nx07.salary.confirm    — NX07 薪資 CONFIRMED
  nx08.dashboard.bcg     — NX08 BCG matrix dashboard
```

權限：全員可讀（list/get/by-feature）+ SYSADMIN 主寫入（POST/PATCH/DELETE）

「？」按鈕 UI wire 留 TASK-NX09-IMPL-UI-MANUAL-WIRE 後續軌。

---

# § 5. Postgres FTS ⭐（業界中小 ERP 罕見）

純 Postgres 原生（不裝 Elasticsearch）：
- 3 主檔加 `search_vector tsvector` 欄
- GIN index × 3
- trigger × 3 自動 `to_tsvector('simple', ...)` 寫入（INSERT/UPDATE）
- backfill 既有 row

Service 走 `$queryRaw` + `PrismaNs.sql` tagged template：
- `plainto_tsquery('simple', $q)` 處理用戶 query（防 tsquery 注入）
- `ts_rank` 排序 + `ts_headline` snippet（MaxFragments=2, MaxWords=20）
- scope=all 時跨 3 source 合併重排

中文分詞 = `simple` 配置（無需安裝 pg_jieba、CJK 字元分詞、Hank Q-H5 拍板）。

---

# § 6. UI 真相

## 6.1 既有 1 placeholder（NX09-IMPL-01 前）

- `/dashboard/nx09/workspace`（升 desc 標 6 子模組 + 26 endpoint + FTS + IMPL-02 預告）

## 6.2 本軌新增 5 placeholder + 1 menu + side-menu wire

- `/dashboard/nx09/km`       — KM 知識庫
- `/dashboard/nx09/document` — 制度文件庫
- `/dashboard/nx09/manual` ⭐ — 系統操作手冊
- `/dashboard/nx09/search` ⭐ — EIP 全文搜尋
- `/dashboard/nx09/meeting`  — 會議系統

menu.nx09.ts（getNx09SideMenu）1 group / 6 items + side-menu.ts 加 nx09 路由。

⭐ Crown Q4=a 拍板：UI 純 stub、實作獨立軌 TASK-NX09-IMPL-UI-01。

---

# § 7. NX09-IMPL-01 commit 真相（7 commit / 7 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `c7affd3` | overview v1.0（從 Crown TASK formalize）+ plan v0.1.0 |
| 1 schema | `e7eab11` | M1 SystemManual + M2 FTS tsvector + M3 drift 結算 |
| 2-4 合併 | （Phase 2-4）| DTO @IsIn 擴 + SystemManual service/controller + FTS service/controller + module wire |
| 5 sub-tables | `48d2c84` | 3 子表 core endpoint（DocVersion list + KmTag + KmFeedback）|
| 6 UI | （Phase 6）| 5+1 placeholder + menu.nx09 + side-menu wire |
| 7 docs | （本 commit）| summary v1.0 + worklog 主題 3 + _team 主題 30 + merge-verify |
| 收尾 | merge / push / tag | v1.2.0-nx09-eip-closure（待 Crown 拍板）|

⭐ 7 commit + 1 收尾 = 8、命中 plan 估 9-11 預算 ✓ + Crown 估 12-15 預算 60%。

---

# § 8. Q-RHYTHM-2 第六次落地對齊

| Q | Crown 拍板 | 實作對齊 |
|---|---|---|
| Q1 EIP 範圍 | 全要（含 SystemManual）| ✅ 7 業務功能全落地 |
| Q2 拆軌 | b=拆 2 軌 | ✅ IMPL-02 亞羅特色 / 跨模組 留後續軌 |
| Q3 FTS 技術 | b=Postgres FTS | ✅ tsvector + simple + ts_rank + ts_headline |
| Q4 角色範圍 | a=全員 + 角色客製 | ✅ ProPlanGuard + RolesGuard（manual SYSADMIN 寫 + 全員讀）|
| Q5 SystemManual | b=新表 | ✅ M1 新表 + featureKey UNIQUE + 命名 regex |

---

# § 9. 後續軌（IMPL-03+）

- **TASK-NX09-IMPL-02-YARO-FEATURE** ⭐⭐⭐ **✅ 已 closure**（IMPL-02 軌）
- **TASK-NX09-IMPL-MEETING-FULL** ✅ 已 closure（IMPL-02 4 子表 endpoint 補完）
- TASK-NX09-IMPL-03-CROSS-WIRE：跨模組接點（NX07 / NX04 / NX02 / NX08 → NX09）
- TASK-NX09-IMPL-04-RAG：Phase 2 RAG 向量化（pgvector / OpenAI embedding）⭐
- TASK-NX09-IMPL-VIN-API-FALLBACK：亞洲車型補充（VSCC / 其他第三方 API）
- TASK-NX09-IMPL-UI-01：UI 真實 chart + 文件閱讀器 + 全文搜尋 UI
- TASK-NX09-IMPL-UI-MANUAL-WIRE：NEXORA UI「？」按鈕 wire SystemManual ⭐
- TASK-NX09-IMPL-AUTO-VERSION：DocumentVersion 自動寫入 + KM viewCount writer
- TASK-NX09-IMPL-DTC-LIBRARY：故障代碼（OBD-II DTC）→ RepairSop wire
- TASK-NX09-IMPL-02-TEST：service + FTS + VIN/RepairSop unit test

---

# § 10. IMPL-02 升級揭露（v2.0 補章）

## 10.1 新增 2 service / 2 controller / 35 endpoint

| service | controller | 路由 | endpoint 數 | 業界改革 |
|---|---|---|---|---|
| Nx09VinLookupService ⭐⭐⭐ | controller | /nx09/vin-lookup | 8（list + :id + by-vin/:vin + decode + POST + PATCH + DELETE + :id/parts）| **VIN NHTSA + 手動混合** |
| Nx09RepairSopService ⭐⭐⭐ | controller | /nx09/repair-sop | 10（CRUD 6 + wire 4）| **維修 SOP 結構化 + 雙向 wire** |
| Nx09SubTablesService 升 | controller 升 | /nx09 | +17（既有 4 → 21、4 子表 CRUD 補）| - |

⭐ A041 真實 IMPL-02 後：**8 controller / 61 endpoint**（IMPL-01 6/26 + IMPL-02 +2 controller +35 endpoint）。

## 10.2 新增 1 shared helper

- `shared/nx09/nx09-nhtsa-client.ts`（純 fetch + ENV NHTSA_API_ENABLED + 5s timeout + graceful fallback）
- 範式對齊 `shared/nx06/nx06-google-maps-client.ts`

## 10.3 schema 真相（IMPL-02 後 14 model）

3 軌 migration 累積：IMPL-01 3 軌 + IMPL-02 2 軌：

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx09_impl_02_m1_vin_lookup_and_repair_sop` | 3 新表（VinLookup + RepairSop + RepairSopPartModel link）+ 3 ID generator function |
| M2 | `nx09_impl_02_m2_constraint_naming_alignment` | drift resolution（`_fkey` → `_id_fkey`、對齊既有 NX06-IMPL-02 / NX07 / NX08 範式）|

NX01 vehicle chain 0 動（CarBrand / Model / PartModel 既有 schema 100% 保留、reverse relations 純 additive）。

## 10.4 IMPL-02 commit 真相（7 commit / 6 Phase + 1 收尾）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `c80b613` | plan v0.1.0 + overview v0.2.0 連帶 commit |
| 1 schema | `5ea30d7` | M1 3 新表 + M2 constraint naming drift |
| 2 子表 | `7cd2c97` | 4 子表 endpoint 補（ArticleTag 3 + MeetingAction 5 + MeetingAttendee 4 + MeetingMinutes 5 = 17）|
| 3 VinLookup | `ebf3fd5` | VinLookup service + NHTSA client + 8 endpoint |
| 4+5 合併 | `31b2d6e` | RepairSop CRUD 6 + RepairSop↔PartModel 雙向 wire 4 = 10 endpoint |
| 6 UI | `25ac493` | 4 placeholder + menu.nx09 6→10 items + workspace desc |
| 7 docs | （本 commit）| summary v2.0 + worklog 主題 3 + _team 主題 33 + merge-verify |
| 收尾 | merge / push / tag | v1.5.0-nx09-yaro-feature-closure（待 Crown）|

⭐ 7 commit + 1 收尾 = 8、命中 plan 估 8 預算 100% + audit-02 §6.1 推薦組合 100% + Crown 估 7-10 預算 100%。

## 10.5 業界改革 3 落地 ⭐⭐⭐

| # | 改革 | 落地點 |
|---|---|---|
| 1 | **VIN NHTSA + 手動混合** | shared/nx09-nhtsa-client + VinLookup service decode endpoint |
| 2 | **維修 SOP 結構化** | RepairSop service（steps/tools/warnings/photos JSON + carModelFilter + difficulty）|
| 3 | **RepairSop ↔ PartModel 內部 wire 雙向查詢** | listSopsByPartModel（業務員查料件→看 SOP 業界第一）+ listPartsBySop |

---

> 文件版本：v2.0（IMPL-01 + IMPL-02 雙軌完整化 closure、Q-RHYTHM-2 第九次落地、8 controller / 61 endpoint）
> 下次更新觸發：IMPL-03 跨模組 wire / RAG Phase 2 / UI 真實 / 後續軌啟動
