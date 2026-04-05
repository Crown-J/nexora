# Migration 代碼對照表

| 代碼 | 目錄名 | 說明 |
|------|--------|------|
| MIG001 | `20260403130000_MIG001-mw1-baseline` | MW1 Baseline：NX00 + NX99 全部表結構與 ID 產生函式 |
| MIG002 | `20260404120000_MIG002-nx00-schema-refactor` | NX00 料號規則／零件／訂閱幣別等 schema 重構 |
| MIG003 | `20260405100000_MIG003-nx02-inventory` | MW2：NX02 庫存（台帳、餘額、設定、盤點、調撥、缺貨、自動補貨） |
| MIG003b | `20260405110000_MIG003b-nx02-init` | NX02 開帳存（`nx02_init` / `nx02_init_item`） |
| MIG004 | `20260406100000_MIG004-nx01-rfq` | NX01 詢價單草稿（`nx01_rfq` / `nx01_rfq_item`）＋缺貨 `ref_rfq_id` FK |
| MIG005 | `20260406120000_MIG005-nx01-full` | NX01 對齊欄位＋`nx01_po`／`rr`／`pr` 全套表與 ID 函式 |

## 封存說明

歷史 migration 鏈置於 **`prisma/_archive_migrations/`**（**不可**放在 `migrations/` 底下：Prisma 會把該目錄內每一個子資料夾都當成一支 migration，導致 `migrate deploy` 失敗）。

## 命名規則

後續 migration 依序編碼：MIG002、MIG003…

格式：`{timestamp}_MIG{NNN}-{module}-{slug}`

例：`20260405100000_MIG003-nx02-inventory`

## 既有開發庫（曾套用舊鏈）注意

若本機或共用庫的 `_prisma_migrations` 仍記錄 **init～20260405120000** 等舊目錄，但 repo 已改為 **僅 MIG001**，`prisma migrate status` 會顯示 **drift**。請擇一：

- **空庫／Railway 新庫**：直接 **`pnpm exec prisma migrate deploy`** 即可。
- **本機要保留資料**：備份後 **`migrate reset`**、或另建新 database 再 deploy；不建議手動硬改 `_prisma_migrations` 除非清楚風險。
