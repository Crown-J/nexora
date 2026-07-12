<!-- docs/_team/session-handoff-2026-07-13-transfer-inquiry.md -->
<!-- 位置：docs/_team/（團隊工作檔） -->
<!-- 版本：v1.0（2026-07-13、Hank；調貨詢價軌收官交接，家機→公司機） -->
<!-- 說明：TRANSFER-INQ 全 11 項＋攻略本完工、已全推 GitHub main。
     此檔給「換公司機開新對話的 Hank」銜接用——重點在公司機 DB 落差與測試資料落差。 -->

# 交接：調貨詢價軌（TRANSFER-INQ）收官 → 公司機接手

## 一句話狀態
調貨詢價從構想到深化 **全 11 項完工、已全部推上 GitHub main**（最新 commit `9321f36f`）。
換公司機只要 pull + 補 DB + 重啟即可繼續；**沒有半成品、沒有未推的 commit。**

---

## 這對話做了什麼（08a8ab4d .. 9321f36f，一項一 commit）

| # | commit | 內容 |
|---|--------|------|
| 1 | `08a8ab4d` | 銷貨單行補「補貨來源」標記（後端 PATCH transferSourceType＋UI 選擇器＋明細狀態欄；修缺貨行標不了 G 的 UI 斷鏈） |
| 2 | `21c0fe6b` | F5 調貨清單卡片化＋「近30天 N 筆・最低 X（同行）」摘要＋Alt+H 引導精靈 |
| 3 | `bed5d052` | 即時詢價對話框全鍵盤流（同行→量→價 Enter 逐欄、存檔發 `nx-inquiry-recorded` 回清單連打下一家） |
| 4 | `0f886201` | 同行調貨 modal 鍵盤化＋成本預覽（↑↓/Space/Enter、每行預覽會帶入的詢價成本、查無亮警示） |
| 5 | `e69410a1` | 接通 F1 主視窗 Alt+D 加調貨清單（事件 `nx-transfer-add`、無群組料退回主件、回饋 chip） |
| 6 | `eb5c3be1` | 報價紀錄加 `is_transfer` 旗標（schema＋全鏈；F2 ④選調貨→旗標落紀錄；報價紀錄頁/picker 顯調貨徽章） |
| 7 | `23944073` | 攻略本 S01B 開本（key `nx-wt-s01b`）＋S01 v2.8 關卡二/五瘦身指路 |
| 8 | `a5c2fff7` / `03c8d2de` | SO「從報價紀錄拉入」回補（工具列 R／Alt+R、`isTransfer`→補貨來源 G 自動標）＋S01B v1.1 |
| 9 | `3691976e` | F5 摘要口徑改「近 30 天」（起訖都帶——後端 dateRange「只填起=查該日當天」陷阱） |
| 10 | `914f4c56` | 客戶主檔編輯表單補「預設取貨方式」下拉（後端 07/12 已備、純前端補欄）＋S01A 判斷格撤除 |
| 11 | `9321f36f` | F2 屬性面板加「調貨詢價歷史」列（第2列、純看🅐、Esc關）＋警示修正 |

**回歸套件** `pnpm --filter nx-api test:scenarios` 8/8 綠（第 1~6 項做完時跑過；第 8~11 是 UI＋唯讀查詢、未再跑，動 SO/schema 的第 1、6、8 項已含在那次綠燈內）。

### ⭐ 第 11 項附帶修的既有 bug（要知道）
缺貨警示「近30天沒問過同行」的查詢**一直只帶 dateFrom 沒帶 dateTo** → 後端當「只查30天前那一天」→ 幾乎永遠 0 筆 → 警示幾乎永遠亮。這是執行長覺得「詢過還在警示、要改」的真因。已修（`recent30Range` 帶起訖）。修後：近30天真的詢過的料、警示才會消。同一個 dateTo 陷阱在第 9 項 F5 也踩過修過——**日後凡查 inquiry/quote-record 帶日期區間，起訖都要帶。**

---

## ⚠️ 公司機開工前必做（DB 落差、最重要）

家機這輪的 schema 變更走 **`db execute`（不寫 migration，專案現行範式）**、只套在家機本機 Docker DB。
公司機是**另一台、本機 DB 狀態未知**，pull 完程式碼後 Prisma client 會帶 `is_transfer` / `default_delivery_type`，但公司機 DB 若沒這兩欄 → 報價紀錄 / 客戶主檔相關 API 直接炸。

**開工前照做（全冪等、安全）：**
1. `git pull`（main、到 `9321f36f` 或更新）
2. 公司機本機 DB 跑一次 **`packages/db-core/prisma/sql/pending-production.sql`**（全檔 `IF NOT EXISTS`、冪等；重點是第 4 段 `default_delivery_type`＋第 5 段 `is_transfer`，前 3 段若已有不影響）
3. `cd packages/db-core && npx prisma generate`（cwd 要在 db-core、prisma.config.ts 在那）
4. 重啟 nx-api / nx-ui（launch.json 有 nx-api:3001 / nx-ui:3000 / docs-walkthrough:5599）
5. 硬重整瀏覽器一次（HMR 舊 bundle 陷阱）

> Railway production **完全沒碰**（本機範式）；上正式時 pending-production.sql 整檔跑、套完把段落移到檔尾歷史區。

---

## ⚠️ 測試資料落差
家機 dev DB 的 seed 素材**公司機沒有**，攻略本 S01B/S01A 的測試料號會對不上：
- 皮帶 `025 260 849B` 全倉 0＋兩筆詢價（復興 405 / 鐙薪 398、後者是第 3 項連打驗證殘留）
- `C0049` 一筆掛「調貨」旗標的報價紀錄（remark=`seed:S01B調貨`）、`default_delivery_type='D'`
- 同行 `O0007` 復興 / `O0012` 鐙薪 / `O0013` 品鑫（無皮帶詢價、驗查無警示用）

公司機要嘛用 `packages/db-core/scripts/seed-instant-inquiry-demo.ts` 造詢價 demo、要嘛挑公司機現有的缺貨料＋同行自己補幾筆詢價再走攻略。**測試前先確認手上有一顆「全倉 0＋近30天有詢價」的料**，否則新的「調貨詢價歷史」列會全顯「未詢價」。

---

## 還開著的判斷（非阻塞、執行長實走再拍）
- F5/F2 摘要「近30天最低」的天數（現 30 天）——實走覺得太長/太短再調（S01B 關卡三提過）
- S01A 關卡一①：結構化地址（衛星表）還沒接進 F2 工作台（顯示佔位字）
- 主檔 optional 欄位 PATCH「空值不送」→ 選回「（未指定）」清不掉舊值（全欄位共同既有行為、要解另開一軌）

## 相關檔案
- 攻略本：`docs/_team/walkthrough/`（index.html / s01-instant-sales v2.8 / s01a v1.1 / s01b v1.2）
- 待上正式 DDL：`packages/db-core/prisma/sql/pending-production.sql`（第 4、5 段是這兩輪的）
- 家機環境特徵＋驗證陷阱：記憶檔 project_home_machine_setup（$雜湊污染 / HMR 舊 bundle / pane 事件直發法）
- 進度真相：`git log --oneline`（[TRANSFER-INQ] 系列）
