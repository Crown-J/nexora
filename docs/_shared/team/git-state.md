<!-- docs/_shared/team/git-state.md -->

# NEXORA - Git 版控文件

> 文件目的：讓 Crown / Alex 隨時掌握「本地有哪些分支、各分支跟 origin 的同步狀態、誰沒 push、誰有風險」
> 撰寫者：Hank
> 結構規範：A~D 是「現況快照」（每次更新只動這四段）、E 是「維護方式」（穩定不動）

---

## A. 當前 Git 狀態快照

> **快照時間：2026-04-28**
> **當前分支：`feature/wp-phase1-doc-restructure`**（HEAD = `c7b0464`）

### A.1 本地分支總覽（12 條）

| 分支 | 同步狀態 | 最新 commit | 訊息摘要 |
|------|---------|-------------|---------|
| `main` | ✅ 同步 | `6e46a4b` | dailylog 20260428 — Phase 1 雙線 |
| `feature/wp-phase1-doc-restructure` ⭐ | ✅ 同步 | `c7b0464` | TASK-PHASE1-DOC-RESTRUCTURE-01 任務 2 完成 |
| `feature/wp-phase1-w2-mini` | ✅ 同步 | `5a34664` | WP-PHASE1-DEMO02 customer 命名規則調整 |
| `feature/wp-phase0-schema` | ✅ 同步 | `7652c43` | WP-PHASE0-B2 stock reverse lookup API |
| `feature/demo-emergency` | ⚠️ **ahead 6** | `0df5a84` | TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 10 |
| `feature/home-modals-settings` | ⚠️ **無 upstream** | `76ad3ae` | 首頁 Modal / 使用者設定 / TopBar |
| `feature/NX99-multitenancy` | ✅ 同步 | `e9fc3bd` | NX-UI Redesign login/home + PWA |
| `feature/base-master-hub` | ✅ 同步 | `3b45e2e` | 首頁 |
| `feature/nx-ui-v0-mobile-route` | ✅ 同步 | `8a65160` | DOC dailylog structure + 20260326 |
| `feature/nx03-sales-flow-hub` | ✅ 同步 | `b33f529` | NX03 銷貨工作台四區塊 + Alt+A |
| `feature/spec-reverse-sw01` | ✅ 同步 | `d2bdce2` | TASK-SPEC-REVERSE-S-W01 dailylog |
| `feature/sys-dashboard` | ✅ 同步 | `9096c2b` | NX01 default seed upsert keys fix |

⭐ = 當前 HEAD 所在
⚠️ = 有未 push / 無 upstream 風險（詳見 §C）

### A.2 Tag

| Tag | 指向 commit | 含義 |
|-----|------------|------|
| `phase0-complete` | `259855c` | Phase 0 收官（schema + translator + APIs merge） |

### A.3 工作樹狀態

```
On branch feature/wp-phase1-doc-restructure
Your branch is up to date with 'origin/feature/wp-phase1-doc-restructure'.
nothing to commit, working tree clean
```

---

## B. 各 Feature Branch 對應的 Task

| 分支 | 對應 Task | 狀態 |
|------|----------|------|
| `feature/wp-phase1-doc-restructure` | **TASK-PHASE1-DOC-RESTRUCTURE-01**（4 任務 + 1.5）| 進行中（任務 1/1.5/2 完成） |
| `feature/wp-phase1-w2-mini` | TASK-PHASE1-W2-MINI（W2-mini 庫存 + DEMO-02 LITE seed） | 進行中 |
| `feature/wp-phase0-schema` | WP-PHASE0（schema + translator + APIs） | ✅ 已收官（tag `phase0-complete`） |
| `feature/demo-emergency` | TASK-BUSINESS-RESTRUCTURE（大塊 1~3、Phase 1~10） | 進行中（⚠️ 6 commit 未 push） |
| `feature/home-modals-settings` | UI 首頁 Modal / 使用者設定（沒明確 task code） | ⚠️ 從未 push 過、status 不明 |
| `feature/NX99-multitenancy` | NX99 多租戶 + login/home redesign | 早期（待 Crown 確認狀態） |
| `feature/base-master-hub` | 主檔 hub / 首頁 | 早期（待 Crown 確認狀態） |
| `feature/nx-ui-v0-mobile-route` | mobile route v0 | 早期（待 Crown 確認狀態） |
| `feature/nx03-sales-flow-hub` | NX03 銷貨工作台四區塊 | 早期（待 Crown 確認狀態） |
| `feature/spec-reverse-sw01` | TASK-SPEC-REVERSE-S-W01 | 早期（待 Crown 確認狀態） |
| `feature/sys-dashboard` | sys-dashboard / NX01 seed fix | 早期（待 Crown 確認狀態） |

> ⚠️ 「早期」分支共 6 條、可能是已合併到 main 的歷史分支。建議 Crown 拍板：保留 / 刪本地 / 刪 origin。

---

## C. 未 Push 的本地工作

### C.1 `feature/demo-emergency` — 領先 origin 6 commit ⚠️

未 push 的 6 個 commit（按時間倒序）：

```
0df5a84  [TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 10] 倉管 KPI + 庫位管理 + 盤點設定
bc3d23c  [TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 9]  庫存中心工作站遷移
a6cb00c  [TASK-BUSINESS-RESTRUCTURE 大塊 3 Phase 8]  庫存中心 4 分區重構
4ef0cb2  [TASK-BUSINESS-RESTRUCTURE 大塊 2 Phase 7]  跨中心連動 SO→PK→BX→DN
77b99aa  [TASK-BUSINESS-RESTRUCTURE 大塊 2 Phase 6]  調撥單 IT 完整流程
1f55579  [TASK-BUSINESS-RESTRUCTURE 大塊 2 Phase 5]  SO 備貨 4 情境分流
```

**風險：**
- 6 commit 在本地、雲端沒備份、機器壞掉就消失
- 跨機器（家裡 vs 辦公室）會 desync

**建議：** Crown 拍板要 push 還是保持 WIP

### C.2 `feature/home-modals-settings` — 完全沒 upstream ⚠️

```
76ad3ae  feat(nx-ui): 首頁事件與公告 Modal、使用者設定、TopBar 固定與 Dialog 寬度
333cd41  [NX-UI] Stabilize home calendar styling and local dev reliability
e9fc3bd  [NX-UI] Redesign login/home experience with PWA and theme updates  (← 也在 NX99-multitenancy 分支)
5b497f1  [FLOW] Implement NX01/NX03 flows, UI localization, and docs
603997a  [DOC] Add dailylog structure and 20260326 daily log
```

**風險：**
- 整條分支沒 push、本地獨苗
- 跟 `feature/NX99-multitenancy` 共享 commit `e9fc3bd`、可能是同源分歧

**建議：** Crown 拍板要 push 還是已棄用刪除

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

### E.2 觸發更新的 4 個時機

| # | 時機 | 為什麼 |
|---|------|-------|
| 1 | 切新分支 | 新分支要登錄到 §A.1 表格 + §B 對應 task |
| 2 | merge 回 main / 刪除分支 | 表格要拿掉舊分支 |
| 3 | 大量 commit 後（≥ 5 個或跨 task） | 確保 §A.1 表格的 commit hash 不過期 |
| 4 | Crown 主動詢問 Git 狀態 | 順便重新生成 |

### E.3 由誰觸發？

- **Hank 自己觸發**：上面 4 個時機任一達成、我自動更新
- **Crown 觸發**：說「更新 git-state」、我立即重新生成

### E.4 更新方式

- 只動「快照區塊」（§A ~ §D）
- 「維護方式」（§E）穩定不動
- commit 訊息：`[GIT-STATE] update YYYY-MM-DD <簡述>`
- 例：`[GIT-STATE] update 2026-04-29 demo-emergency pushed`

### E.5 下次更新時機（預測）

- 任務 3 / 4 各 commit 後、不更新（屬於同一個 task、沒切分支、沒 merge）
- 任務 4 完成後 + 此分支 merge 回 main 時、更新（觸發時機 #2）

### E.6 不寫的東西

- 不寫每個 commit 的細節（git log 已是真相）
- 不寫業務邏輯說明（規格書 / 工作日誌的事）
- 不寫未來規劃（Alex / Crown 的事）

---

## 給 Crown 的拍板事項

| 編號 | 議題 | 建議 |
|-----|------|------|
| G1 | `feature/demo-emergency` 6 commit 未 push | ☐ push 上去 / ☐ 保持 WIP / ☐ 其他 |
| G2 | `feature/home-modals-settings` 整條沒 upstream | ☐ push / ☐ 已棄用刪除 / ☐ 其他 |
| G3 | 6 條「早期」分支（NX99/base-master-hub/nx-ui-v0/nx03-sales-flow-hub/spec-reverse-sw01/sys-dashboard）| ☐ 留著 / ☐ 刪本地 / ☐ 刪 origin / ☐ 各別說明 |
| G4 | E.2 觸發更新的 4 個時機 | ☐ 同意 / ☐ 改其他 |

> 等你拍板。拍完我進任務 4 系統架構文件。
