<!-- docs/_shared/team/file-placement-suggestion.md -->

# NEXORA - 檔案放置建議

> 撰寫者：Hank（2026-04-28）
> 對象：Crown 拍板用、Alex 核對用
> 任務：TASK-PHASE1-DOC-RESTRUCTURE-01（任務 2）
> 文件性質：Hank 對 Q1~Q5 的建議 + 待 Crown 拍板

---

## 維護成本前提（先講清楚再答題）

我寫文件的工作流是：**Hank 寫 → push → Crown 下載 → 上傳 Claude.ai → Alex 讀**。

每一道工序都有成本：
- 我寫 / push 是一次性、沒問題
- Crown 下載 + 上傳是**每次都做**、所以 rename / 改檔名要盡量避免
- Alex 讀只看內容、檔名語意他沒差

兩條軌的事實：
- **GitHub repo** = 樹狀（路徑反映歸屬）+ kebab-case 英文（既有 50+ 檔案慣例）
- **Claude.ai project** = 平鋪（沒資料夾）+ 中文檔名（Crown / Alex 習慣）

兩邊**用途不同**、強求命名一致會讓 Crown 多一道 rename 工。
我建議的核心邏輯：**接受兩邊命名不對等、Crown 上傳時手動 rename**（一次性成本）。

---

## Q1：規格需求書放 GitHub repo 哪個位置？

**建議：放、用既有 `docs/nx0X/spec/intent/` 結構**

| 類型 | GitHub 路徑 | Claude.ai 檔名 |
|------|------------|---------------|
| 模組主檔 | `docs/nx04/spec/intent/_overview.md` | NX04 - 銷貨模組需求規格書 |
| 子規格 | `docs/nx04/spec/intent/01-search.md` | NX04 - 01 - 查詢功能規格書 |

**理由：**
1. 規格書是程式實作的真相來源、必須跟程式碼一起 git 版控
2. 既有 v2 結構已有 `spec/intent/`、繼續沿用、不需新發明
3. 我寫程式時可以 grep / 跳轉、不需要切到 Claude.ai 找
4. `_overview.md` 用 `_` 前綴讓它在資料夾排序排第一、好找
5. 子規格用 `NN-{feature}.md` 編號、跟 Alex 命名「NX04 - 01 -」對齊

**Crown 上傳成本：** rename `_overview.md` → `NX04 - 銷貨模組需求規格書.md`（每模組一次性）

---

## Q2：Git 版控文件放哪？

**建議：`docs/_shared/team/git-state.md`**

**理由：**
1. 跟 hank-charter.md 同層、語意一致（都是「三人團隊規範」）
2. Git 動態文件 commit 痕跡天然就在 git log 裡、不需要 dailylog 也記
3. 我每次切分支 / merge / 重要 commit 後更新一份、commit 用 `[GIT-STATE]` 前綴
4. 維護成本低：改一個檔 + commit、不分散

**Claude.ai 命名：** NEXORA - Git 版控文件

---

## Q3：工作日誌 / 實作架構書放哪？

**工作日誌建議分兩層粒度（兩條軌都保留）：**

| 粒度 | GitHub 路徑 | 用途 | 撰寫節奏 |
|------|------------|------|---------|
| Daily | `dailylog/YYYYMMDD.md` | 「今天做了什麼」 | 每天結尾 |
| Module | `docs/nx0X/nx0X-worklog.md` | 「這模組怎麼蓋的」 | 每完成 module 工作累加 |
| 跨模組 | `docs/_shared/worklog.md` | 「跨模組工作」 | 每完成跨模組工作累加 |

> Daily（既有）+ Module（新增）兩條軌不衝突。
> Daily 寫「做了什麼」按時間排、Module 寫「怎麼蓋的」按主題排。
> Daily 是 Hank 自我紀錄、Module 是給 Alex 讀的「考古手冊」。

**實作架構書建議分兩層：**

| 粒度 | GitHub 路徑 | 用途 |
|------|------------|------|
| 系統級 | `docs/_shared/team/system-architecture.md` | 跨模組導航地圖（任務 4 建立） |
| 模組級 | `docs/nx0X/spec/impl/{feature}-impl.md` | 各功能實作細節（既有結構） |

**Claude.ai 命名：**
- NEXORA - 系統架構文件
- NEXORA - NX01 - 共用基礎模組工作日誌
- NEXORA - SHARED - 跨模組工作日誌

---

## Q4：既有 `docs/nx04/spec/intent/w2-mini-intent.md` 之類要搬遷嗎？

**建議：(b) 只新東西用新規則、舊東西留原位**

**理由：**
1. docs/ v2 重整剛 2026-04-25 完成（13 天前）、再搬一次破壞剛建立的索引
2. 50+ 檔案搬遷成本高、git log 跨檔案追溯會斷（即使用 `git mv` 也會散落）
3. 新文件按新規則寫、舊文件留著、自然新陳代謝
4. 如果哪天有強烈業務需要再做（例如規格書全面重寫）

**例外：**
- `docs/archive/` 內檔案永遠不動（歸檔是 frozen 狀態）
- 既有 `*-intent.md` 命名（如 `so-data-model-intent.md`）跟新規則 `01-{feature}.md` 不衝突、繼續並存
- 真要搬時：寫一個 mapping 表 + `git mv` 一次到位、commit 標 `[DOCS-RENAME]`

---

## Q5：對 Alex 提的命名規則有調整建議？

**5 條具體調整：**

### 5-1 兩端統一英文 kebab-case + 模組前綴（2026-05-04 修正）

- GitHub + Claude.ai **兩端統一英文 kebab-case + 模組前綴**
- 不再要求「兩端不對等、Crown 上傳時 rename」
- Crown 上傳時直接用 GitHub 檔名、不轉中文

**修正理由（2026-05-04 揭露）：**
- Claude.ai 是平面結構（沒有資料夾分層）、跨對話 review 時、中文檔名 + 不同模組會誤判（e.g. 同看到「主檔規格書」但分不出哪個模組）
- 英文 kebab-case + 模組前綴（如 `nx01-overview.md`）讓 Claude.ai 平面結構也有歸屬可辨
- Phase 1 worklog rename（commit `03bf701`）已落地「nxXX 前綴」慣例、兩端統一是延續該紀律

⚠️ **此修正跟 5-2 / 5-3 邏輯有交集**（待 Crown 拍是否同步調整）：
- 5-2「`NEXORA -` 前綴只用在 Claude.ai」— 兩端統一後是否也取消 Claude.ai 端 `NEXORA -` 前綴？
- 5-3「SHARED 改 `_shared`、Claude.ai 端可繼續 `NEXORA - SHARED -`」— 是否兩端都用 `_shared`？

本 task 範圍只動 5-1 + 5-5、5-2 / 5-3 維持原拍板待 Crown 後續釐清。

### 5-2 `NEXORA -` 前綴只用在 Claude.ai 上傳、GitHub 不用

- GitHub 路徑已經反映歸屬（`docs/_shared/team/`）、再加 `NEXORA -` 前綴等於重複
- 範例：GitHub `git-state.md` ↔ Claude.ai `NEXORA - Git 版控文件.md`

### 5-3 `SHARED` 改成 `_shared`（GitHub 端）

- 對齊既有 `docs/_shared/` 命名
- `_` 前綴排序自然在前
- Claude.ai 端可繼續用 `NEXORA - SHARED -` 前綴（兩條軌獨立）

### 5-4 工作日誌粒度分兩層（daily + module）

- 既有 `dailylog/YYYYMMDD.md` 不動
- 新增 `docs/nx0X/nx0X-worklog.md`（按模組累加）
- 不重複、各有用途（時間軸 vs 主題軸）

### 5-5 規格書「主檔 + 子規格」結構（2026-05-04 修正命名）

- 主檔：`nxXX-overview.md`（兩端對等、模組前綴）
- 子規格：`nxXX-NN-{feature}.md`（兩端對等、模組前綴 + 編號）
- 既有 `xxx-intent.md` 命名不衝突、繼續用

**範例：**
- `docs/nx01/spec/intent/nx01-overview.md`（NX01 主檔規格書 v1.0、2026-05-04 落地）
- `docs/nx01/spec/intent/nx01-03-customer-supplier.md`（NX01 第 3 份子規格書）

**修正理由：** 對齊 5-1「兩端統一英文 kebab-case + 模組前綴」紀律、Claude.ai 上傳時直接用 GitHub 檔名、不轉 `_overview.md`（去模組前綴會讓 Claude.ai 平面結構失去歸屬可辨）。

---

## 給 Crown 的決策表（拍板用）

| Q | 議題 | Hank 建議 | 你的選擇 |
|---|------|----------|---------|
| Q1 | 規格書 GitHub 位置 | `docs/nx0X/spec/intent/_overview.md` + `01-{feature}.md` | ☐ 同意 / ☐ 改 |
| Q2 | Git 版控文件位置 | `docs/_shared/team/git-state.md` | ☐ 同意 / ☐ 改 |
| Q3-1 | 工作日誌粒度 | daily（既有）+ module（新增） | ☐ 同意 / ☐ 只用其中一種 |
| Q3-2 | 工作日誌位置 | `docs/nx0X/nx0X-worklog.md` + `docs/_shared/worklog.md` | ☐ 同意 / ☐ 改 |
| Q3-3 | 系統架構書位置 | `docs/_shared/team/system-architecture.md` | ☐ 同意 / ☐ 改 |
| Q4 | 舊檔搬遷 | (b) 只新東西用新規則、舊不動 | ☐ 同意 / ☐ 改 (a) 全搬 / ☐ 改 (c) 其他 |
| Q5-1 | GitHub vs Claude.ai 命名 | **兩端統一英文 kebab-case + 模組前綴**（2026-05-04 修正） | ☑ 已拍板 |
| Q5-2 | `NEXORA -` 前綴 | 只用在 Claude.ai、GitHub 不用 | ⚠️ 跟 Q5-1 邏輯有交集、待 Crown 釐清 |
| Q5-3 | `SHARED` 命名 | GitHub 用 `_shared`、Claude.ai 用 `SHARED` | ⚠️ 跟 Q5-1 邏輯有交集、待 Crown 釐清 |
| Q5-4 | 工作日誌粒度 | daily + module 雙層 | ☑ 已拍板 |
| Q5-5 | 規格書結構 | `nxXX-overview.md` + `nxXX-NN-{feature}.md`（2026-05-04 修正） | ☑ 已拍板 |

---

## 任務 3 / 任務 4 等你拍板後我會這樣做

依上面建議、任務 3 / 4 預計檔案路徑：

```
docs/_shared/team/
├── hank-charter.md              ← 任務 1（已建）
├── file-placement-suggestion.md ← 任務 2（本檔）
├── git-state.md                 ← 任務 3（待建）
└── system-architecture.md       ← 任務 4（待建）
```

如果你拍 Q1~Q5 改其他選項、我會調整任務 3 / 4 的檔案位置。

---

## 我考慮過但沒推的方案（透明）

**方案 X：GitHub 也用中文檔名（強求一致）**
- 優點：Crown 不用 rename
- 缺點：50+ 既有英文檔得搬、git 工具鏈處理中文路徑可能有 edge case、PR diff 不友好
- 結論：不推

**方案 Y：Hank 同時 push 兩份（英文 + 中文）**
- 優點：Crown 直接拿中文版上傳
- 缺點：雙重維護、anti-pattern
- 結論：不推

**方案 Z：寫腳本自動生成中文版**
- 優點：自動化
- 缺點：腳本本身要維護、過度工程
- 結論：未來如果 rename 工作量真的大再說、現在不做

---

> 等 Crown 拍板。拍完我進任務 3。

---

## Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|--------|---------|
| v1 | 2026-04-28 | Hank | 初稿（Q1~Q5 給 Crown 拍板）|
| v1.1 | 2026-04-29 | Hank | 對應 Phase 1 worklog rename：5-4 工作日誌路徑改 `nxXX-worklog.md`（commit `a9dd686`）|
| v2 | 2026-05-04 | Hank | TASK-PHASE2-NX01-SPEC-INTENT-OVERVIEW-01：5-1 兩端命名從「不對等」改「兩端統一英文 kebab-case + 模組前綴」/ 5-5 命名範例改 `nxXX-overview.md` + `nxXX-NN-{feature}.md` / 拍板表 Q5-1 / Q5-5 同步、Q5-2 / Q5-3 標 ⚠️ 待 Crown 釐清交集 |
