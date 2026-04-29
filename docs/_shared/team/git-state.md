<!-- docs/_shared/team/git-state.md -->

# NEXORA - Git 版控文件

> 文件目的：讓 Crown / Alex 隨時掌握「本地有哪些分支、各分支跟 origin 的同步狀態、誰沒 push、誰有風險」
> 撰寫者：Hank
> 結構規範：A~D 是「現況快照」（每次更新只動這四段）、E 是「維護方式」（穩定不動）

---

## A. 當前 Git 狀態快照

> **快照時間：2026-04-29（NX01 worklog 完成後）**
> **當前分支：`feature/wp-phase1-doc-restructure`**（HEAD = `bbc071e`）
> **本次更新觸發：§E.2-#3「大量 commit」（doc-restructure 分支累計 8 commit、跨 2 task）**

### A.1 本地分支總覽（12 條）

| 分支 | 同步狀態 | 最新 commit | 訊息摘要 |
|------|---------|-------------|---------|
| `main` | ✅ 同步 | `6e46a4b` | dailylog 20260428 — Phase 1 雙線 |
| `feature/wp-phase1-doc-restructure` ⭐ | 🟡 ahead 3 | `bbc071e` | ARCH NX01 子模組 14→11 修正（NX01 worklog 完成）|
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

⭐ = 當前 HEAD 所在
🟡 = doc-restructure 分支 ahead origin 3 個 commit（待 push、見 §C）
✅ = 其餘 11 條本地分支跟 origin 同步

### A.2 Tag

| Tag | 指向 commit | 含義 |
|-----|------------|------|
| `phase0-complete` | `259855c` | Phase 0 收官（schema + translator + APIs merge） |

### A.3 工作樹狀態

```
On branch feature/wp-phase1-doc-restructure
Your branch is ahead of 'origin/feature/wp-phase1-doc-restructure' by 3 commits.
  (use "git push" to publish your local commits)
nothing to commit, working tree clean
```

> ⚠️ 本次 GIT-STATE 更新後執行 `git push` 即同步、預計 push 後 §C 清空。

---

## B. 各 Feature Branch 對應的 Task

| 分支 | 對應 Task | 狀態 |
|------|----------|------|
| `feature/wp-phase1-doc-restructure` | **TASK-PHASE1-DOC-RESTRUCTURE-01**（4 任務 + 1.5）+ **TASK-PHASE1-NX01-WORKLOG**（共用沿用此分支）| 全部完成、等 Crown 拍板（doc-restructure 4+1.5 任務 ✅、NX01 worklog 初版 ✅） |
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

🟡 **`feature/wp-phase1-doc-restructure` ahead origin 3 個 commit**（GIT-STATE 自身 commit 也算進去）：

| commit | 摘要 |
|--------|------|
| `aeceb26` | TASK-PHASE1-NX01-WORKLOG NX01 共用基礎模組工作日誌 v1.0 |
| `bbc071e` | ARCH update 2026-04-29 NX01 子模組 14→11 修正 |
| `(本次)`  | GIT-STATE update 2026-04-29 NX01 worklog 完成 |

→ 立即執行 `git push origin feature/wp-phase1-doc-restructure` 即同步。

上版（5d599bf）兩個風險點已解除：
- `feature/demo-emergency` G1 ✅ push 完成（`0df5a84`）
- `feature/home-modals-settings` G2 ✅ push 完成 + upstream tracking（`76ad3ae`）

---

## D. 重要分歧點

### D.1 兩條 Phase 1 並行分支（無衝突）

```
main (6e46a4b)
  ├── feature/wp-phase1-w2-mini      (5a34664) — DEMO-02 LITE seed + 客戶命名
  └── feature/wp-phase1-doc-restructure (c7b0464) — 文件重整（本檔所在）
```

兩條從 `main` 切出、各自獨立、改動範圍不重疊：
- w2-mini 改 `packages/db-core/prisma/seed/demo/`
- doc-restructure 改 `docs/_shared/team/` + `CLAUDE.md` + `README.md` + `_cursorrules`

**預期合併順序：** 兩條都完成後分別 merge 回 main、不會 conflict。

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

- 此分支 merge 回 main 時（同時收 doc-restructure + NX01-WORKLOG 兩 task），觸發時機 #2
- 或 Crown 拍 NX02~NX10 worklog 開新分支時，觸發時機 #1
- 或下次 Hank 切到家裡 / 辦公室機器時，觸發時機 #5

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
