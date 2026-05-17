<!-- docs/nx09/spec/impl/nx09-impl-01-plan.md -->

# TASK-NX09-IMPL-01 — EIP 基礎軌 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx09-eip`（自 main HEAD `975c899` 切出、v1.1.0-nx07-closure + NX09-AUDIT-01 後）
> 對應依據：[nx09-overview v1.0](../intent/nx09-overview.md)（本軌 Hank 從 Crown TASK 直接 formalize、Alex 本輪未寫）+ [nx09-audit-01](../../nx09-audit-01.md)
> 紀律：對齊 NX02~NX08 範式（Q-RHYTHM-2 第六次落地）

---

## §0 計畫文件性質

⚠️ **NX09 本軌特殊性**：
- Crown 揭露 NX09 = **EIP 企業資訊平台**（重戰場升級、非小知識庫）
- 既有 backend 完整（10 model / 3 controller / 15 endpoint、worklog 揭露「最純粹穩定模組」）
- frontend 最落後（1 placeholder、0 menu、0 features）
- 治理檔落後 2 階段
- → 本軌 = **EIP 補強（SystemManual 新表 + FTS）+ 既有升級（KmArticle / Document 4 大分類）+ 治理補齊 + UI stub**

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v1.0 沒提到的新需求）
- Postgres FTS 中文分詞（pg_jieba 安裝衝突 / 純 simple verify）
- 既有 KmArticle / Document service 需動到（屬重大破壞、Crown 拍板）
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 7 業務功能（對齊 overview v1.0 §7.1）

| # | 功能 | 既有狀態 | 本軌動作 |
|---|---|---|---|
| 1 | KmArticle 主檔升級（4 大分類）| ✅ schema + service | Phase 2：擴 category enum（FAQ/SOP/ANNOUNCE/TRAIN）、service 0 動 |
| 2 | Document 主檔升級（規格 / 規章 / 廠商）| ✅ schema + service | Phase 2：擴 docCategory enum |
| 3 | SystemManual 新表 + service + endpoint ⭐ | ❌ 0 | Phase 1+3：M1 新表 + Phase 3 service / controller / DTO |
| 4 | Postgres FTS 全文搜尋 ⭐ | ❌ 0 | Phase 1+4：M2 tsvector schema + Phase 4 service / endpoint |
| 5 | 3 子表 core endpoint（DocVersion / KmTag / Feedback）| ⚠️ schema-only | Phase 5：補核心 endpoint（不裝完整、business-critical only）|
| 6 | UI 6 placeholder + menu.nx09 + side-menu wire | ❌ 0 | Phase 6 |
| 7 | 治理檔補完 | ❌ | Phase 7 |

---

## §2 拓樸排序 5 層

### L1 — 基礎層（schema：M1 SystemManual + M2 tsvector）

⭐ **Hank Q-H1 自決**：既有 10 model 結構 0 動（守 Q-RHYTHM-2 紀律 + Crown「既有 15 endpoint 0 改」），新增：

- **M1 Nx09SystemManual** 新表（featureKey UNIQUE / title / content / steps JSON / screenshots JSON / version / category / isActive）
- **M2 3 主檔加 tsvector 欄**（KmArticle / Document / SystemManual）+ trigger 自動更新

**M1 / M2 schema 性質**：純 additive（新表 + ADD COLUMN nullable + trigger）、0 既有 ALTER、0 backfill 衝突。

### L2 — KmArticle / Document service 輕度升級

⚠️ **Hank Q-H2 自決**：既有 service CRUD 0 動、僅擴 DTO category enum：

- KmArticle：既有 6 分類（SO/BP/RG/CX/EM/OT）→ 加 4 大語意對齊（FAQ/SOP/ANNOUNCE/TRAIN、Crown overview §3.1）
  - 實作：DTO IsIn 加新 enum、schema docstring 註解
- Document：既有 5 分類（CR/SP/JD/FM/OT）→ docCategory 包含規格 / 規章 / 廠商文件 / 版本歷史語意（既有已涵蓋、無需擴）
- service 0 改、endpoint 行為 100% 保留

### L3 — SystemManual + Postgres FTS（2 新 service）

- **Nx09SystemManualService**（CRUD + featureKey UNIQUE guard）
- **Nx09SystemManualController** `/nx09/system-manual`：list / get-by-id / get-by-featureKey / create / patch / delete
- **Nx09FulltextSearchService**（跨 3 主檔 FTS）
- **Nx09FulltextSearchController** `/nx09/search`：GET ?q=...&scope=km|doc|manual|all

### L4 — 3 子表核心 endpoint

⚠️ **Hank Q-H3 自決**：補 core endpoint、不裝完整 CRUD（避免本軌膨脹）：

- **DocumentVersion**：`GET /nx09/document/:docId/versions`（list、append-only 不暴露 PATCH）
- **KmTag**：`GET /nx09/km-tag` + `POST /nx09/km-tag`（list + create、標籤主檔）
- **KmFeedback**：`POST /nx09/km-article/:articleId/feedback`（給文章點「已解決」、accumulate helpfulCount）

### L5 — UI 6 placeholder + menu + wire

- `apps/nx-ui/src/app/dashboard/nx09/` 加 6 placeholder：
  - `/dashboard/nx09/workspace`（升級既有 desc）
  - `/dashboard/nx09/km`（知識庫 QA）
  - `/dashboard/nx09/document`（制度文件）
  - `/dashboard/nx09/manual` ⭐（系統操作手冊）
  - `/dashboard/nx09/search` ⭐（全文搜尋）
  - `/dashboard/nx09/meeting`（會議系統、既有 schema CRUD endpoint 入口）
- **menu.nx09.ts** 建立（getNx09SideMenu、1 group 7 items）
- **side-menu.ts** 加 nx09 路由 → getNx09SideMenu()

---

## §3 Migration 拆軌策略（A041 估 = **2 軌 + 1 drift**）

### M1 — `nx09_impl_01_m1_system_manual_table`

範圍：新表 Nx09SystemManual。

```sql
CREATE TABLE "nx09_system_manual" (
  id           VARCHAR(15) PRIMARY KEY DEFAULT gen_nx09_system_manual_id(),
  tenant_id    VARCHAR(15) NOT NULL,
  feature_key  VARCHAR(50) NOT NULL,        -- 'nx04.so.create' 等命名規範
  title        VARCHAR(200) NOT NULL,
  content      TEXT,                         -- markdown 內文
  steps        TEXT,                         -- JSON 字串、操作步驟陣列
  screenshots  TEXT,                         -- JSON 字串、screenshot URL 陣列
  category     VARCHAR(30) DEFAULT 'GENERAL',-- GENERAL / FAQ / TROUBLESHOOT
  version      VARCHAR(10) DEFAULT '1.0',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  remark       VARCHAR(500),
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by   VARCHAR(15) NOT NULL,
  updated_at   TIMESTAMP(3) NOT NULL,
  updated_by   VARCHAR(15) NOT NULL,
  CONSTRAINT nx09_system_manual_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES nx99_tenant(id),
  CONSTRAINT nx09_system_manual_feature_key_unique UNIQUE (feature_key)
);
CREATE INDEX nx09_system_manual_tenant_idx ON nx09_system_manual(tenant_id);
CREATE INDEX nx09_system_manual_category_idx ON nx09_system_manual(tenant_id, category);
```

### M2 — `nx09_impl_01_m2_fulltext_search_tsvector`

範圍：3 主檔加 tsvector + trigger（純 additive）。

```sql
ALTER TABLE nx09_km_article ADD COLUMN search_vector tsvector;
ALTER TABLE nx09_document   ADD COLUMN search_vector tsvector;
ALTER TABLE nx09_system_manual ADD COLUMN search_vector tsvector;

CREATE INDEX nx09_km_article_fts_idx     ON nx09_km_article     USING GIN(search_vector);
CREATE INDEX nx09_document_fts_idx       ON nx09_document       USING GIN(search_vector);
CREATE INDEX nx09_system_manual_fts_idx  ON nx09_system_manual  USING GIN(search_vector);

-- trigger × 3：寫入 / 更新時自動 to_tsvector('simple', ...)
-- 中文分詞 = simple（無需 pg_jieba 安裝、CJK 字元分詞、本軌邊界）
```

### M3 — drift 結算（預期 auto-gen）

對齊 NX06-IMPL-02 M4 / NX08-IMPL-01 M2 / NX07-IMPL-01 M2 同模式（純 constraint 命名對齊）。

---

## §4 commit 拆軌（A041 估 = **9~11 commit**、命中 Crown 估 12-15 預算 75%）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0 + overview v1.0（從 Crown TASK formalize）|
| Phase 1 | 1 | M1 + M2 schema（+ 預期 M3 drift 結算）|
| Phase 2 | 1 | KmArticle / Document DTO category enum 擴 + service 升 |
| Phase 3 | 1 | SystemManual service + controller + DTO |
| Phase 4 | 1 | FulltextSearch service + controller（純 SQL FTS）|
| Phase 5 | 1 | 3 子表 core endpoint（DocVersion list / KmTag list+create / KmFeedback create）|
| Phase 6 | 1 | UI 6 placeholder + menu.nx09 + side-menu wire |
| Phase 7 | 1 | summary + worklog 主題 3 + _team 主題 30 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push（待 Crown）|

**估計**：8 commit + 1 收尾 = 9、命中 plan 估 9-11 下界 ✓ 命中 Crown 估 12-15 預算 60-75%。

---

## §5 拍板 Q 對齊 overview v1.0

| Q | Crown 拍板 | 影響 |
|---|---|---|
| Q1 EIP 範圍 | 全要（含 SystemManual）| 本軌 7 業務功能完整 |
| Q2 拆軌 | b=拆 2 軌（本軌 IMPL-01 基礎）| IMPL-02 亞羅特色 / 跨模組 留後續軌 |
| Q3 FTS 技術 | b=Postgres FTS（純原生）| tsvector + simple 分詞、不裝 ES / pg_jieba |
| Q4 角色範圍 | a=全公司員工 + 角色客製 | 既有 viewPermission + ProPlanGuard |
| Q5 SystemManual | b=新表（含 featureKey）| M1 新表、featureKey UNIQUE |

**本軌 Hank 自決 Q-H**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 既有 10 model 處置 | 結構 0 動 | Crown「既有 15 endpoint 0 改」+ Q-RHYTHM-2 紀律 |
| Q-H2 KmArticle / Document service 升 | 0 動 service、僅 DTO category enum 擴 | 對齊「既有 endpoint 100% 保留」|
| Q-H3 3 子表 endpoint 範圍 | 核心 only（DocVersion list / KmTag list+create / KmFeedback create）| 避免本軌膨脹、完整 CRUD 留後續軌 |
| Q-H4 SystemManual content / steps / screenshots 結構 | content=markdown text / steps=JSON string / screenshots=JSON URL array string | 簡化、結構化升留後續軌 |
| Q-H5 FTS 中文分詞 | simple 配置（不裝 pg_jieba）| 安裝風險避免、verify 可行性後決定 |
| Q-H6 search endpoint scope param | `km` / `doc` / `manual` / `all` 4 種 | 簡明、可前端 filter |
| Q-H7 UI placeholder 範圍 | 6（workspace 升 + km / document / manual / search / meeting）| 對齊 NX07 IMPL-01 8 個 placeholder 規模 |
| Q-H8 menu.nx09 結構 | 1 group 7 items（簡潔同 NX05/07）| HR + 全員 dashboard 入口 |

---

## §6 邊界守住

- ✅ **既有 3 controller + 15 endpoint 行為 100% 保留**（article / document / meeting CRUD 0 改）
- ✅ **既有 10 model 結構 0 動**（Crown 拍板 + Q-RHYTHM-2 紀律）
- ✅ **append-only DocumentVersion 設計 0 動**（worklog 主題 2 範式保留）
- ⚠️ **3 主檔加 tsvector 純 additive**（純新欄 nullable、trigger 寫入時觸發、既有 row backfill via UPDATE）
- ⚠️ **DTO category enum 擴**（純 IsIn 列表加值、既有 row 0 衝突、新 category 可選填）
- ⚠️ **3 子表 core endpoint**（純新增 endpoint、既有 schema 0 動）

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| Postgres FTS simple 中文分詞效果差 | 中 | 中 | 本軌 simple、後續軌 verify pg_jieba 安裝 + 升級 |
| tsvector trigger 對既有 row 不寫入（需 backfill）| 高 | 小 | M2 migration 含 `UPDATE ... SET search_vector = to_tsvector(...)` backfill |
| Prisma 對 tsvector 型別支援不完整 | 中 | 中 | service 用 `$queryRaw` 寫 FTS query、不靠 prisma type-safe |
| SystemManual featureKey 命名規範擴散 | 低 | 小 | 本軌定 init 命名（nx04.so.create 範式）、後續軌可加 lint |
| UI placeholder 多（6 個）| 低 | 小 | 純 stub、無互動 |
| Prisma migrate drift 結算 | 中（NX06+NX08+NX07 教訓）| 低 | 預期 M3 drift / rename + resolve、commit message 揭露 |

---

## §8 後續軌預告

對齊 audit § 7 + overview § 8：

- TASK-NX09-IMPL-02-YARO-FEATURE：亞羅特色（VIN / 維修 SOP / 故障代碼）⭐⭐⭐
- TASK-NX09-IMPL-03-CROSS-WIRE：跨模組接點（NX07 / NX04 / NX02 / NX08）
- TASK-NX09-IMPL-04-RAG：Phase 2 RAG 向量化（pgvector / OpenAI embedding）
- TASK-NX09-IMPL-UI-01：UI 真實 chart + 文件閱讀器 + 全文搜尋 UI
- TASK-NX09-IMPL-UI-MANUAL-WIRE：NEXORA UI「？」按鈕 wire SystemManual ⭐
- TASK-NX09-IMPL-AUTO-VERSION：DocumentVersion 自動寫入 + KM 統計 writer
- TASK-NX09-IMPL-02-TEST：service + FTS unit test

---

> 文件版本：v0.1.0（IMPL-01 plan 初版、Q-RHYTHM-2 第六次落地）
> 待 plan commit 後 → Phase 1 schema 開工
