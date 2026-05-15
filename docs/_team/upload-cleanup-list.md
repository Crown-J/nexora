<!-- docs/_team/upload-cleanup-list.md -->

# Claude.AI 上傳檔案清理清單

> 文件版本：v1.0
> 最後更新：2026-05-15
> 撰寫：Hank（TASK-NX01-SUMMARY-AND-FINAL-CLEANUP 軸 4）
> 用途：Crown 手動清理 Claude.AI 上傳的指引清單
> 觸發更新：規範 / 模組架構書 / 跨模組 worklog 結構變動時

---

# § 1. ❌ 可下架（5 檔）

規範合一 milestone（TASK-DOCS-RESTRUCTURE-AND-RULES-COMPLETE）後、以下檔案內容已被 PROJECT_RULES.md 取代或本身已 stale、可從 Claude.AI 上傳區下架：

| # | 檔案 | 下架原因 | 替代位置 |
|---|------|---------|---------|
| 1 | `CLAUDE.md`（root）| 已縮為 15 行 stub、純指向 docs/PROJECT_RULES.md | docs/PROJECT_RULES.md Part III |
| 2 | `hank-charter.md` | 已 git rm、內容併入 PROJECT_RULES Part III | docs/PROJECT_RULES.md §III.1 / §III.6 / §III.7 / §III.8 |
| 3 | `file-placement-suggestion.md` | 已 mv 進 `_archive/2026-04-28_file-placement-decisions.md`、ADR 性質 | docs/PROJECT_RULES.md §III.7（Q5-1/5-4/5-5 整合）|
| 4 | `version-plan.csv` | 已 git rm、CLAUDE §四 / PROJECT_RULES §I.1.2 完整覆蓋 | docs/PROJECT_RULES.md §I.1.2 |
| 5 | `nx-model.csv` | 已 git rm、schema.prisma 是 Prisma model 真相 | packages/db-core/prisma/schema.prisma |

⭐ **下架 4-5 屬 git rm 已完成**、Claude.AI 端若還有殘留 Crown 手動刪。

⭐ **下架 1-3 屬 git 仍存（檔案被縮 / mv）**、Claude.AI 端如已上傳舊版、Crown 可直接刪舊版或上傳新版替換。

---

# § 2. 🟡 NX01 全 closure 後可下架（18 檔、本軌觸發）

NX01 17 子規格書 + impl 全 closure（2026-05-15）+ nx01-summary.md 落地後、Claude.AI 上傳區可只保留 summary、完整子規格留本機 Cursor 讀：

| # | 檔案 | 內容性質 | 替代位置 |
|---|------|---------|---------|
| 6 | `nx01-overview.md` | NX01 模組總覽（753 行）| nx01-summary.md §1 + §3 |
| 7 | `nx01-01-user.md`（509 行）| user 主檔規格 | nx01-summary.md §2 NX01-01 |
| 8 | `nx01-02-role.md`（460 行）| role 規格 | nx01-summary.md §2 NX01-02 |
| 9 | `nx01-03-partner.md`（479 行）| partner 規格 | nx01-summary.md §2 NX01-03 |
| 10 | `nx01-04-address.md`（524 行）| address 規格 | nx01-summary.md §2 NX01-04 |
| 11 | `nx01-05-part.md`（619 行）⭐⭐ | part 業務心臟 | nx01-summary.md §2 NX01-05 |
| 12 | `nx01-06-warehouse.md`（470 行）| warehouse 規格 | nx01-summary.md §2 NX01-06 |
| 13 | `nx01-07-base-catalog.md`（579 行）| 5 表合一精煉 | nx01-summary.md §2 NX01-07 |
| 14 | `nx01-08-bulletin.md`（366 行）| 公告系統 | nx01-summary.md §2 NX01-08 |
| 15 | `nx01-09-address-catalog.md`（521 行）| 地址型錄 | nx01-summary.md §2 NX01-09 |
| 16 | `nx01-10-phonetic-search.md`（385 行）| 注音快搜 | nx01-summary.md §2 NX01-10 |
| 17 | `nx01-11-brand-code-rule.md`（401 行）| 編碼規則 | nx01-summary.md §2 NX01-11 |
| 18 | `nx01-12-car-brand.md`（348 行）| 汽車品牌 | nx01-summary.md §2 NX01-12 |
| 19 | `nx01-13-model.md`（409 行）⭐ | 車型主檔 | nx01-summary.md §2 NX01-13 |
| 20 | `nx01-14-engine.md`（359 行）| 引擎 | nx01-summary.md §2 NX01-14 |
| 21 | `nx01-15-vehicle-classification.md`（553 行）| 3 分類 | nx01-summary.md §2 NX01-15 |
| 22 | `nx01-16-part-model.md`（361 行）⭐⭐ | 料件車型適配 | nx01-summary.md §2 NX01-16 |
| 23 | `nx01-17-part-version-relation.md`（490 行）| version + relation | nx01-summary.md §2 NX01-17 |

⭐ **下架時機**：Crown 確認 nx01-summary.md 完整性後可下架（壓縮率 -95%、~404 行對 8237 行）。

⭐ **再次需要完整 spec**：本機 Cursor 永遠可讀、push 給 Alex 對話也可即時上傳。

---

# § 3. ✅ 必保留 / 必上傳（8 檔）

NEXORA 三人團隊紀律單一真相 + 動態狀態 + 模組架構書：

| # | 檔案 | 性質 | 變動頻率 |
|---|------|------|---------|
| 1 | `docs/PROJECT_CONTEXT.md` v2.1 | 專案介紹（業務 / 三人團隊）| 極低 |
| 2 | `docs/PROJECT_RULES.md` v1.0 | 規範合一 Part I + II + III | 中（失誤紀錄 / 紀律升級時）|
| 3 | `docs/_team/git-state.md` | branch 狀態、main HEAD | **高**（每 merge 更新）|
| 4 | `docs/_team/system-architecture.md` | 蓋的房子快照 | 中 |
| 5 | `docs/_team/worklog.md` | 跨模組 task log | **高**（每軌新主題）|
| 6 | `docs/_reference/` 4 個 CSV | nx-table / doc-number-rules / route-table / version-feature-matrix | 低 |
| 7 | `docs/_template/spec-template.md` | spec 範本 | 極低 |
| 8 | `docs/nx01/nx01-summary.md` ⭐⭐ | NX01 模組架構書（本軌新建）| 低（NX01 已 closure）|

⭐ **8 個固定上傳位置**、Crown 每次更新看本機 push 即可：
- 根層 2 個（PROJECT_CONTEXT + PROJECT_RULES）
- _team/ 3 個（git-state + system-architecture + worklog）
- _reference/ 4 個 CSV（少變動）
- _template/ 1 個
- nx01/ 1 個 summary

---

# § 4. 未來 NX02~NX10 上傳範式

每模組完整 closure 後產出 `nxXX-summary.md`、加入「✅ 必保留」清單：

| 模組 | 預計 summary 撰寫時機 | 完整 spec 下架時機 |
|------|---------------------|-------------------|
| NX02 採購 | NX02 全 closure 後（NX03 起跑軌） | NX02 closure 後 |
| NX03 庫存 | NX03 全 closure 後 | 同上 |
| NX04~NX06 | 各模組 closure 後 | 同上 |
| NX07~NX10（PRO）| PRO tier 戰略軌時 | 同上 |
| NX98 / NX99 | 系統層、優先順序低 | 同上 |

---

# § 5. 變動觸發更新本檔

本檔需更新時機：

- 新模組 closure 產出新 nxXX-summary.md → 加入 § 3 必保留
- 規範升級涉及檔案結構（如 PROJECT_RULES 拆檔）→ 更新 § 3
- Claude.AI 上傳機制變動（如資料夾支援、上傳上限變動）→ 更新策略
- 新一波下架 batch 揭露 → 更新 § 1 + § 2

---

> v1.0 = NX01 全 closure 後沉澱版（2026-05-15）
> 釋放統計（含本軌）：35 → 14 上傳檔（-60%）
> 維護人：Hank（撰寫不決策、實際下架由 Crown 手動執行）
