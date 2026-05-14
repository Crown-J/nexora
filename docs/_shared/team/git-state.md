<!-- docs/_shared/team/git-state.md -->

# NEXORA - Git 版控文件

> 文件目的：讓 Crown / Alex 隨時掌握「本地有哪些分支、各分支跟 origin 的同步狀態、誰沒 push、誰有風險」
> 撰寫者：Hank
> 結構規範：A~D 是「現況快照」（每次更新只動這四段）、E 是「維護方式」（穩定不動）

---

## A. 當前 Git 狀態快照

> **快照時間：2026-05-15（⭐ TASK-NX01-17-MODAL-IMPL R 同款 modal 路線 A merge、NX01-17 規格 v1.0 達成 100%）**
> **當前分支：`main`**（HEAD = `2403ea8`、merge commit）
> **本次更新觸發：§E.2-#2「merge 回 main」（feature/nx01-17-r-modal 3 commit、--no-ff）**
> **⭐ NX01-17 R 同款 modal 完整實作：Nx00FlatMasterView 加 onAfterCreate prop + BasePartRelationMasterView handleRSameReverseHint + window.confirm UX、3 commit / +126/-1 / 3 檔**
>
> ⚠️ **本檔 minimal update**（2026-05-02 起累積）：累積 10 軌 merge（#17~#21 / NX01-12 三模組 / NX01-14 / NX01-13+15 / NX01-07 / NX01-11 hotfix / NX01-05 / NX01-17 / NX01-17-UI / NX01-17-MODAL）、其他既有分支狀態 full audit 留後續軌

### A.1 本地分支總覽（12 條）

| 分支 | 同步狀態 | 最新 commit | 訊息摘要 |
|------|---------|-------------|---------|
| `main` ⭐ | ✅ 同步 | `2403ea8` | **MERGE NX01-17 R 同款 modal 路線 A（TASK-NX01-17-MODAL-IMPL、2 commit、規格 100% 達成）** |
| `feature/nx01-17-r-modal` | ✅ 同步、**已 merge main、可考慮刪除** | `8769eef` | R 同款 modal 路線 A：generic onAfterCreate prop + caller handler + worklog 主題 17 |
| `feature/nx01-17-ui-and-drift-fix` | ✅ 同步、**已 merge main、可考慮刪除** | `d11cffa` | Q5 UI 接通 + 4 drift 補正 + charter §G.7/§G.8 升級 + worklog 主題 16 |
| `feature/nx01-17-part-version-relation` | ✅ 同步、**已 merge main、可考慮刪除** | `2fb31ac` | 軸 1 字母 enum SmallInt + part_version + part_relation 後端 + worklog 主題 15 |
| `feature/nx01-05-part` | ✅ 同步、**已 merge main、可考慮刪除** | `5cd62ae` | NX01-05 spec + schema unique+4 index + service 重設計 + UNK guard + previewCode + worklog 主題 14 |
| `feature/nx01-11-part-service-hotfix` | ✅ 同步、**已 merge main、可考慮刪除** | `fb1dae4` | 🔴 Production blocker hotfix：part.service auto-vivify 廢棄、codeRuleId NN |
| `feature/nx01-07-base-catalog` | ✅ 同步、**已 merge main、可考慮刪除** | `e00dbde` | NX01-07 spec + customer_grade unique + part_group 後端 + customer_grade UI + worklog 主題 13 |
| `feature/nx01-13-model` | ✅ 同步、**已 merge main、可考慮刪除** | `17e646f` | NX01-13 model + NX01-15 三表 spec + schema + 後端 + 前端 + worklog 主題 12 |
| `feature/nx01-14-engine` | ✅ 同步、**已 merge main、可考慮刪除** | `f7d41b0` | NX01-14 engine spec + schema + 後端 + 前端 + worklog 主題 11 |
| `feature/nx01-12-car-brand` | ✅ 同步、**已 merge main、可考慮刪除** | `8b0a6bc` | NX01-10/11/12 + 2 spec + worklog 主題 10 + PROJECT_CONTEXT v1.6 #22 |
| `feature/alex-failure-17-21` | ✅ 同步、**已 merge main、可考慮刪除** | `ae70773` | Alex 失誤紀錄 #17~#21 補登 + PROJECT_CONTEXT v1.5 |
| `feature/wp-phase1-doc-restructure` | ✅ 同步、**已 merge main、可考慮刪除** | `b20dfb9` | GIT-STATE update 2026-04-29 Phase 1 收官 |
| `feature/wp-phase1-w2-mini` | ✅ 同步 | `5a34664` | WP-PHASE1-DEMO02 customer 命名規則調整 |
| `feature/wp-phase0-schema` | ✅ 同步 | `7652c43` | WP-PHASE0-B2 stock reverse lookup API |
| `feature/demo-emergency` | ✅ 同步 | `0df5a84` | TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 10（**G1 已 push**） |
| `feature/home-modals-settings` | ✅ 同步 | `76ad3ae` | 首頁 Modal / 使用者設定 / TopBar（**G2 已建 upstream**） |
| `feature/NX99-multitenancy` | ✅ 同步 | `e9fc3bd` | NX-UI Redesign login/home + PWA |
| `feature/base-master-hub` | ✅ 同步 | `3b45e2e` | 首頁 |
| `feature/nx-ui-v0-mobile-route` | ✅ 同步 | `8a65160` | DOC dailylog structure + 20260326 |
| `feature/nx03-sales-flow-hub` | ✅ 同步 | `b33f529` | NX03 銷貨工作台四區塊 + Alt+A |
| `feature/spec-reverse-sw01` | ✅ 同步 | `d2bdce2` | TASK-SPEC-REVERSE-S-W01 dailylog |
| `feature/sys-dashboard` | ✅ 同步 | `9096c2b` | NX01 default seed upsert keys fix |

⭐ = 當前 HEAD 所在（main、Phase 1 落地後）
✅ = 12 條分支全部跟 origin 同步、無 ahead / 無未 push 工作
⚠️ `feature/wp-phase1-doc-restructure` 已完整 merge main（merge commit `5d4dbac`）、**可刪本地分支**、待 Crown 拍

### A.2 Tag

| Tag | 指向 commit | 含義 |
|-----|------------|------|
| `phase0-complete` | `259855c` | Phase 0 收官（schema + translator + APIs merge） |
| `phase1-complete` ⭐ | `5d4dbac` | Phase 1 doc-restructure 收官（11 worklog + 4 基礎設施文件 + 35+ 範式 + PROJECT_CONTEXT） |

### A.3 工作樹狀態

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

> ⚠️ 本檔在 main 分支 update（不是 feature 分支）— Phase 1 已 merge、git-state 跟著 main 走。
> ⚠️ 本次 TASK-PHASE1-MERGE-MAIN-01 含 1 merge + 1 GIT-STATE commit：
>   1 個 [MERGE]（feature/wp-phase1-doc-restructure → main、--no-ff、merge commit `5d4dbac`、22 檔變動）
>   + 1 個 tag（`phase1-complete` 指向 `5d4dbac`）
>   + 即將加 [GIT-STATE]（本檔、main 分支上 commit）

---

## B. 各 Feature Branch 對應的 Task

| 分支 | 對應 Task | 狀態 |
|------|----------|------|
| `feature/nx01-17-part-version-relation` | **TASK-NX01-17-IMPL**（軸 1 字母 enum 升 SmallInt 最小範圍 part.type+relationType + 軸 2 part_version 新建 + part_relation 補 unique/index/CRUD + R 同款 reverseHint + worklog 主題 15）| ✅ 全部收官、merge main（6 commit、+906/-18、17 檔不含 UI 跳過 A071）|
| `feature/nx01-05-part` | **TASK-NX01-05-IMPL**（NX01-05 part 最後整合節點：schema unique + 4 index + service 重設計 + UNK guard + previewCode + worklog 主題 14）| ✅ 全部收官、merge main（3 commit、+835/-31、7 檔不含 UI）|
| `feature/nx01-11-part-service-hotfix` | **🔴 HOTFIX-NX01-11-PART-SERVICE**（A063 升級觸發、NX01-12-IMPL-v2 commit 2 漏 sync、編譯掛修補）| ✅ 收官、merge main（1 commit、+31/-30、1 檔）|
| `feature/nx01-07-base-catalog` | **TASK-NX01-07-IMPL**（NX01-07 基礎型錄精煉：part_group 後端新建 + customer_grade schema unique + PATCH + 前端 UI + worklog 主題 13）| ✅ 全部收官、merge main（5 commit、+1369/-16、14 檔）|
| `feature/nx01-13-model` | **TASK-NX01-13-IMPL**（NX01-13 model + NX01-15 三表前置 spec + schema + 後端 + 前端 + worklog 主題 12、#22 鐵律觸發本軌擴張）| ✅ 全部收官、merge main（8 commit、+4187/-5、34 檔）|
| `feature/nx01-14-engine` | **TASK-NX01-14-IMPL**（NX01-14 engine 主檔 spec + schema + 後端 + 前端 + worklog 主題 11）| ✅ 全部收官、merge main（4 commit、+1582/-2、12 檔）|
| `feature/nx01-12-car-brand` | **TASK-NX01-12-IMPL-v2**（NX01-10 phonetic 基礎設施 + NX01-11 schema FK 翻轉 + NX01-12 schema/seed/controller + 2 spec + worklog 主題 10 + PROJECT_CONTEXT v1.6 #22） | ✅ 全部收官、merge main（11 commit、+3220/-70、27 檔） |
| `feature/alex-failure-17-21` | **TASK-PROJECT-CONTEXT-FAILURE-17-21**（Alex 失誤 #17~#21 補登 + PROJECT_CONTEXT v1.5）| ✅ 收官、merge main（merge commit `e9f0efe`）|
| `feature/wp-phase1-doc-restructure` | **TASK-PHASE1-DOC-RESTRUCTURE-01** + **TASK-PHASE1-NX01~10-WORKLOG** + **TASK-NX08-MONTHLY-REPORT-CLEANUP** + **TASK-WORKLOG-RENAME** + **TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01** + **TASK-PHASE1-SHARED-WORKLOG-01** + **TASK-PHASE1-MERGE-MAIN-01** | ✅ 全部收官、merge main、tag `phase1-complete` |
| `feature/wp-phase1-w2-mini` | TASK-PHASE1-W2-MINI（W2-mini 庫存 + DEMO-02 LITE seed） | 進行中 |
| `feature/wp-phase0-schema` | WP-PHASE0（schema + translator + APIs） | ✅ 已收官（tag `phase0-complete`） |
| `feature/demo-emergency` | TASK-BUSINESS-RESTRUCTURE（大塊 1~3、Phase 1~10） | 進行中（已 push 至 origin） |
| `feature/home-modals-settings` | UI 首頁 Modal / 使用者設定（沒明確 task code） | 已 push、待 Crown 確認 status |
| `feature/NX99-multitenancy` | NX99 多租戶 + login/home redesign | 早期（待 Crown 確認狀態） |
| `feature/base-master-hub` | 主檔 hub / 首頁 | 早期（待 Crown 確認狀態） |
| `feature/nx-ui-v0-mobile-route` | mobile route v0 | 早期（待 Crown 確認狀態） |
| `feature/nx03-sales-flow-hub` | NX03 銷貨工作台四區塊 | 早期（待 Crown 確認狀態） |
| `feature/spec-reverse-sw01` | TASK-SPEC-REVERSE-S-W01 | 早期（待 Crown 確認狀態） |
| `feature/sys-dashboard` | sys-dashboard / NX01 seed fix | 早期（待 Crown 確認狀態） |

> ⚠️ 「早期」分支共 6 條、可能是已合併到 main 的歷史分支。建議 Crown 拍板：保留 / 刪本地 / 刪 origin。

---

## C. 未 Push 的本地工作

✅ **無未 push 工作**（main 已 push 含 Phase 1 merge、tag `phase1-complete` 已 push、本次 GIT-STATE commit 即將 push）。

Phase 1 收官 task 全部已 push 完成：

| task | commit 範圍 | push 時間 |
|------|------------|----------|
| TASK-NX08-MONTHLY-REPORT-CLEANUP + TASK-WORKLOG-RENAME | `f531680..2a92e1d` 共 6 commit | 2026-04-29 上午 |
| TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01 | `7d705fe..4b0bc89` 共 6 commit | 2026-04-29 中午 |
| TASK-PHASE1-SHARED-WORKLOG-01 | `df5e93c..b20dfb9` 共 3 commit | 2026-04-29 下午 |
| TASK-PHASE1-MERGE-MAIN-01 | merge commit `5d4dbac` + tag `phase1-complete` | 2026-05-02 |

歷史風險點全數解除：
- `feature/demo-emergency` G1 ✅ push 完成（`0df5a84`）
- `feature/home-modals-settings` G2 ✅ push 完成 + upstream tracking（`76ad3ae`）

---

## D. 重要分歧點

### D.1 兩條 Phase 1 並行分支（doc-restructure 已 merge）

```
main (5d4dbac, ⭐ Phase 1 落地、tag phase1-complete)
  │
  ├── feature/wp-phase1-w2-mini      (5a34664) — DEMO-02 LITE seed + 客戶命名（仍進行中）
  └── feature/wp-phase1-doc-restructure (b20dfb9, ✅ 已 merge main、可考慮刪除)
```

⭐ **Phase 1 doc-restructure 收官清單**（已完成、merge commit `5d4dbac`）：
- ✅ docs/ v2 結構（按 NX 模組劃分）
- ✅ hank-charter.md / system-architecture.md / git-state.md / file-placement-suggestion.md（三人團隊規範）
- ✅ NX01~NX10 worklog 10/10 + nxXX 前綴 rename
- ✅ NX08 monthly_report cleanup（A030）
- ✅ PROJECT_CONTEXT.md v1.0 進場 repo root
- ✅ _shared/worklog.md v1.0（8 主題跨模組統合 + 累計範式總表 8 分類）
- ✅ Yaro 拼字校正全 repo

⚠️ `feature/wp-phase1-doc-restructure` 已完整 merge main、本地分支可刪、待 Crown 拍（不主動刪、紀律守住）。

`feature/wp-phase1-w2-mini` 仍進行中（Phase 1 軌 2、DEMO-02 LITE seed）、跟 doc-restructure 改動範圍不重疊：
- w2-mini 改 `packages/db-core/prisma/seed/demo/`
- doc-restructure 改 `docs/_shared/team/` + `CLAUDE.md` + `README.md` + `_cursorrules` + `PROJECT_CONTEXT.md`

**w2-mini 完成後 merge 回 main、不會 conflict**（範圍隔離已驗證）。

### D.2 `home-modals-settings` 跟 `NX99-multitenancy` 共享 commit `e9fc3bd`

兩條分支都包含 `[NX-UI] Redesign login/home experience with PWA and theme updates` 這個 commit。
代表它們從同一個基底分歧出來、可能是早期實驗。

**待 Crown 確認：** 這是不是已被取代的 WIP、要不要清理。

---

## E. 維護方式（Hank 自己提的建議）

### E.1 為什麼不每次 commit 都更新？

- 每 commit 更新成本太高、會 inflate 我的工作流
- git log 本身就是 commit 真相、不需要在 .md 裡重複
- 這份文件是「快照地圖」、不是「commit 紀錄簿」

### E.2 觸發更新的 5 個時機

| # | 時機 | 為什麼 |
|---|------|-------|
| 1 | 切新分支 | 新分支要登錄到 §A.1 表格 + §B 對應 task |
| 2 | merge 回 main / 刪除分支 | 表格要拿掉舊分支 |
| 3 | 大量 commit 後（≥ 5 個或跨 task） | 確保 §A.1 表格的 commit hash 不過期 |
| 4 | Crown 主動詢問 Git 狀態 | 順便重新生成 |
| 5 | **跨機器切換時更新**（家裡↔辦公室） | 換機器前先 push、新機器先讀 git-state 對齊 |

### E.3 由誰觸發？

- **Hank 自己觸發**：上面 4 個時機任一達成、我自動更新
- **Crown 觸發**：說「更新 git-state」、我立即重新生成

### E.4 更新方式

- 只動「快照區塊」（§A ~ §D）
- 「維護方式」（§E）穩定不動
- commit 訊息：`[GIT-STATE] update YYYY-MM-DD <簡述>`
- 例：`[GIT-STATE] update 2026-04-29 demo-emergency pushed`

### E.5 下次更新時機（預測）

- Phase 2 第一個 task 啟動時（如 NX01 主檔規格書相關 implementation）、觸發時機 #1（切新分支）
- 或 `feature/wp-phase1-w2-mini` merge main 時、觸發時機 #2
- 或 Crown 拍刪 `feature/wp-phase1-doc-restructure` 本地分支時、觸發時機 #2
- 或 Phase 2 task 累積 ≥5 commit、觸發時機 #3
- 或下次 Hank 切到家裡 / 辦公室機器時、觸發時機 #5

### E.6 不寫的東西

- 不寫每個 commit 的細節（git log 已是真相）
- 不寫業務邏輯說明（規格書 / 工作日誌的事）
- 不寫未來規劃（Alex / Crown 的事）

---

## 給 Crown 的拍板事項（2026-04-28 已全數拍板）

| 編號 | 議題 | Crown 拍板 | 執行結果 |
|-----|------|-----------|---------|
| G1 | `feature/demo-emergency` 6 commit 未 push | ☑ push | ✅ 已 push（commit `5e7a952..0df5a84`） |
| G2 | `feature/home-modals-settings` 整條沒 upstream | ☑ push | ✅ 已 push + 建 upstream tracking |
| G3 | 6 條早期分支 | ☑ 暫不動（等所有任務完開新 task 處理） | — 留 |
| G4 | E.2 觸發更新時機 | ☑ 同意 + 加第 5 條「跨機器切換時更新」 | ✅ 已加入 §E.2-#5 |
