<!-- docs/nx09/nx09-summary.md -->

# NX09 EIP 企業資訊平台 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX09-IMPL-01 7 Phase commit + AUDIT-01 + overview v1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx09/spec/intent/nx09-overview.md`
> 戰略定位：NEXORA v1.1 後第二個收尾軌（剩 NX09 + NX10、本軌 9/11 → 10/11）+ 業界 ERP 標配 SystemManual
> Q-RHYTHM-2 第六次落地：Crown + Alex 預批、Hank 全軌連跑

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

# § 9. 後續軌（IMPL-02 + 4 UI/wire 軌）

- TASK-NX09-IMPL-02-YARO-FEATURE：亞羅特色（VIN / 維修 SOP / 故障代碼）⭐⭐⭐
- TASK-NX09-IMPL-03-CROSS-WIRE：跨模組接點（NX07 / NX04 / NX02 / NX08 → NX09）
- TASK-NX09-IMPL-04-RAG：Phase 2 RAG 向量化（pgvector / OpenAI embedding）⭐
- TASK-NX09-IMPL-UI-01：UI 真實 chart + 文件閱讀器 + 全文搜尋 UI
- TASK-NX09-IMPL-UI-MANUAL-WIRE：NEXORA UI「？」按鈕 wire SystemManual ⭐
- TASK-NX09-IMPL-AUTO-VERSION：DocumentVersion 自動寫入 + KM viewCount writer
- TASK-NX09-IMPL-MEETING-FULL：會議子表 endpoint 補齊（Attendee / Minutes / Action）
- TASK-NX09-IMPL-02-TEST：service + FTS unit test

---

> 文件版本：v1.0（IMPL-01 closure、Q-RHYTHM-2 第六次落地、EIP 重戰場升級）
> 下次更新觸發：IMPL-02 亞羅特色 / RAG Phase 2 / UI wire / Meeting 子表 endpoint 補齊
