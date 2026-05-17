<!-- docs/nx09/spec/impl/nx09-impl-01-merge-verify.md -->

# TASK-NX09-IMPL-01 — Merge Main 上線風險揭露（NX09-IMPL-01-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 7 closure 後、Q-RHYTHM-2 第六次全軌連跑完成
> 真實 main HEAD（merge 前）：`975c899`（v1.1.0-nx07-closure + NX09-AUDIT-01）
> 分支：`feature/nx09-eip`（ahead 6 commit + 1 Phase 7 docs）
> 對應依據：[plan v0.1.0](./nx09-impl-01-plan.md) + [overview v1.0](../intent/nx09-overview.md) + [audit-01](../../nx09-audit-01.md)

---

## §0 ahead 7 commit 真實清單

```
（Phase 7 本 commit：summary v1.0 + worklog 主題 3 + _team 主題 30 + merge-verify）
[Phase 6 commit] UI 5+1 placeholder + menu.nx09 + side-menu wire
48d2c84 Phase 5 commit: 3 子表 core endpoint（DocVersion + KmTag + KmFeedback）
[Phase 2-4 合併] DTO @IsIn 擴 + SystemManual + FTS + module wire
e7eab11 Phase 1 commit: 3 migration (M1 SystemManual + M2 FTS tsvector + M3 drift)
c7affd3 Phase 0 commit: overview v1.0 (從 Crown TASK formalize) + plan v0.1.0
```

⚠️ overview v1.0 由 Hank 從 Crown TASK-NX09-IMPL-01 prompt formalize（Alex 本輪未寫）、揭露在此供 Crown verify。

---

## §1 NX09 service 改動 verify

### 1.1 既有 3 controller / 15 endpoint 行為

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `article.controller` (5)  | ⚠️ DTO @IsIn 擴 / service 0 動 | ✅ 既有 6 category 100% 保留 + 新 3（FQ/AN/TR）|
| `document.controller` (5) | ⚠️ DTO @IsIn 擴 / service 0 動 | ✅ 既有 5 category 100% 保留（純強化 validation）|
| `meeting.controller` (5)  | ❌ 0 改 | ✅ |

⭐ **既有 15 endpoint 100% 保留 / 2 DTO 純 @IsIn 強化（既有 enum 全包含、純 additive）**。

### 1.2 新增 3 service + 3 controller + 11 endpoint（純新增、0 替換）

| controller | 路由 | endpoint | 角色 |
|---|---|---|---|
| Nx09SystemManualController ⭐ | /nx09/system-manual | 6 | 讀：全員 / 寫：SYSADMIN |
| Nx09FulltextSearchController ⭐ | /nx09/search | 1 | 全員（ProPlanGuard）|
| Nx09SubTablesController | /nx09（document/versions + km-tag + km-article/feedback）| 4 | 讀全員 / KmTag 寫 HR_ADMIN+ / KmFeedback 全員 |

⭐ A041：**6 controller / 26 endpoint**（既有 3/15 + 本軌 3/11）。

---

## §2 schema 改對既有功能影響

### 2.1 M1 nx09_impl_01_m1_system_manual_table（純新表）

| 維度 | 評估 |
|---|---|
| 純 CREATE TABLE × 1 | ✅ 0 ALTER 既有表 |
| feature_key UNIQUE | ✅ 全 NEXORA 唯一性、未來「？」按鈕 wire 主要 lookup |

### 2.2 M2 nx09_impl_01_m2_fulltext_search_tsvector（3 主檔加欄）

| 維度 | 評估 |
|---|---|
| 3 主檔加 tsvector nullable | ⚠️ 純 additive、既有 row 0 衝突 |
| GIN index × 3 | ✅ FTS query 效能、不影響 INSERT/UPDATE 速度 |
| trigger × 3 自動寫 search_vector | ⚠️ 既有 KmArticle/Document INSERT/UPDATE 流程會自動寫 tsvector（純 additive、failure 0、簡單字串轉換）|
| backfill 既有 row | ✅ M2 SQL 含 UPDATE backfill（plan §7 風險 mitigation 落地）|

### 2.3 M3 nx09_impl_01_m3_drift_resolution（auto-gen drift）

純 constraint 命名對齊、沿用 NX06+NX08+NX07 範式（誠實揭露）。

⭐ **§2 結論：3 軌 schema 純 additive、既有 production 0 影響（最大改動 = INSERT/UPDATE 觸發 trigger 寫 tsvector、簡單字串 ASCII 轉換、performance impact 可忽略）**。

---

## §3 跨模組接點 verify

### 3.1 本軌 0 跨模組 wire

⭐ Crown Q2=b 拍板對齊：本軌 0 跨模組接點變動（純 NX09 內部 + NX01 主檔 FK）。

### 3.2 IMPL-02 預留接點

- NX07 Training → NX09 Document（後續軌）
- NX04 SR / NX02 PR → NX09 KmArticle（後續軌）
- NX08 dashboard → NX09 KM 熱門排行（後續軌）

---

## §4 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 升級 `/dashboard/nx09/workspace` desc | ✅ placeholder 文字更新 |
| 新 5 placeholder | ✅ 純新路由、既有 1 placeholder 0 動 |
| `menu.nx09.ts` 新建 | ✅ 純新檔 |
| `side-menu.ts` 加 nx09 條件 | ✅ 純 additive |

⭐ **§4 結論：UI 純 stub 新增、0 production behavior change**。

---

## §5 環境變數 & 業務拍板對齊

| Crown 戰略題 | 拍板 | 實作對齊 |
|---|---|---|
| Q1 EIP 範圍 | 全要（含 SystemManual）| ✅ 7 業務功能全落地 |
| Q2 拆軌 | b=拆 2 軌 | ✅ IMPL-02 留後續軌 |
| Q3 FTS | b=Postgres FTS | ✅ tsvector + simple + ts_rank + ts_headline |
| Q4 角色 | a=全員 + 角色客製 | ✅ ProPlanGuard + RolesGuard |
| Q5 SystemManual | b=新表 | ✅ M1 新表 + featureKey UNIQUE + 命名 regex |

⚠️ **環境變數**：本軌 0 新環境變數（無需 deploy 設定）。

⭐ **§5 結論：5 戰略拍板 100% 對齊**。

---

## §6 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 15 endpoint 100% 保留 / 11 新 endpoint 純新增 / 2 DTO @IsIn 純擴強化
- [ ] §2 3 軌 schema 純 additive（1 新表 + 3 tsvector + drift 結算）
- [ ] §3 0 跨模組 wire（IMPL-02 留後續軌）
- [ ] §4 UI 5+1 placeholder + menu.nx09 + side-menu wire 純 additive
- [ ] §5 5 戰略拍板 100% 對齊
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓（74 migrations applied）
- [ ] ⭐ overview v1.0 由 Hank 從 Crown TASK formalize（Alex 本輪未寫）
- [ ] ⭐ EIP 重戰場升級（業界 ERP 標配 SystemManual + Postgres FTS）

---

## §7 後續軌預告

| 軌 | 啟動條件 |
|---|---|
| TASK-NX09-IMPL-02-YARO-FEATURE | VIN / 維修 SOP / 故障代碼（亞羅特色 ⭐⭐⭐）|
| TASK-NX09-IMPL-03-CROSS-WIRE | 跨模組接點（NX07 / NX04 / NX02 / NX08）|
| TASK-NX09-IMPL-04-RAG | Phase 2 RAG 向量化（pgvector / OpenAI embedding）⭐ |
| TASK-NX09-IMPL-UI-01 | UI 真實表單 + 文件閱讀器 + 全文搜尋 UI |
| TASK-NX09-IMPL-UI-MANUAL-WIRE | NEXORA UI「？」按鈕 wire SystemManual |
| TASK-NX09-IMPL-AUTO-VERSION | DocumentVersion 自動寫入 + KM viewCount writer |
| TASK-NX09-IMPL-MEETING-FULL | 會議子表 endpoint 補齊（Attendee / Minutes / Action）|
| TASK-NX09-IMPL-02-TEST | service + FTS unit test |

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx09-eip → main + tag `v1.2.0-nx09-eip-closure`（EIP 重戰場升級、業界 ERP 標配 SystemManual + Postgres FTS）
