<!-- docs/_team/new-dev-machine-setup.md -->
<!-- 位置：docs/_team/new-dev-machine-setup.md -->
<!-- 版本：v1.0（2026-07-10） -->
<!-- 說明：新開發機從零到能開發的建置手冊。首發用途：執行長家用機（F2 改版線）；未來用途：新工程師 onboarding。照順序走，走不通的地方＝本手冊缺口，回報補文件。 -->

# 新開發機建置手冊

> 目標：一台乾淨的 Windows 電腦 → 能跑 NEXORA 前後端 + 本機資料庫 + Claude Code 開發環境。
> 預估時間：1~2 小時（多數在等安裝與還原）。

---

## 1. 安裝軟體（版本要對齊公司機）

| 軟體 | 版本 | 備註 |
|---|---|---|
| Git | 最新版即可 | 裝完設 user.name / user.email |
| Node.js | **v22（公司機 v22.15.0）** | 官網 LTS 安裝檔 |
| pnpm | **10.29.3**（鎖定於 package.json packageManager） | `npm install -g pnpm@10.29.3`，或裝 corepack 讓它自動抓 |
| PostgreSQL | **16**（公司機 16.6） | 記下安裝時設的 postgres 密碼與埠號（預設 5432） |
| Claude Code | 最新版 | 桌面版或 CLI |
| VS Code | 選用 | — |

## 2. 取得程式碼

```
git clone https://github.com/Crown-J/nexora.git C:\nexora
cd C:\nexora
pnpm install
```

前置：這台機器的 GitHub 帳號要有 repo 權限（Crown-J/nexora 私有庫）——用 GitHub CLI `gh auth login` 或 PAT 皆可。

## 3. 環境設定檔（不進 git、必須手動帶）

從公司機複製以下 **4 個檔案**到相同路徑：

| 檔案 | 用途 |
|---|---|
| `apps/nx-ui/.env` | 前端環境 |
| `apps/nx-ui/.env.local` | 前端本機覆寫 |
| `apps/nx-api/.env` | 後端環境（含 DATABASE_URL、JWT secret） |
| `packages/db-core/.env` | Prisma 用 DATABASE_URL |

⛔ **`packages/db-core/.env.railway` 不要帶**——那是 Railway 生產連線，家用機/工程師機不需要、也不該有（縮小外洩面）。

⚠️ 帶過去後，把含 `DATABASE_URL` 的檔案裡的**埠號改成新機的 PostgreSQL 埠號**（公司機是 5433、PG 預設安裝是 5432）。

## 4. 資料庫（輕量快照還原）

### 4a. 公司機：產生快照

```
powershell -File packages\db-core\scripts\export-dev-snapshot.ps1
```

產出 `packages/db-core/snapshots/nexora-dev-snapshot-<日期>.dump`。
內容＝全 schema + 主檔/庫存/設定全量資料，**排除偉盟歷史交易 6 大表的資料**（銷貨/進貨/銷退 頭+明細、約 1.7GB、開發用不到）。用隨身碟或雲端硬碟帶到新機。

### 4b. 新機：還原

```
powershell -File packages\db-core\scripts\restore-dev-snapshot.ps1 -DumpFile <快照路徑> -Port 5432
```

腳本會建 `nexora` 角色 + `nexora_core` 資料庫並還原、最後印出零件/庫存/夥伴筆數當驗證。

### 4c. 產生 Prisma client

```
cd packages\db-core
pnpm exec prisma generate
```

⛔ **絕對不要跑** `prisma migrate reset`、`prisma migrate dev`、整包 `db push`——本專案 migration 追蹤有已知狀況（Prisma 7 陷阱），schema 變更一律由主線（公司機）用 `prisma db execute` 管理，新機只吃快照。

### 已知限制

- 快照不含歷史銷貨/進貨單 → **「前次售價」「價格情報」這類靠歷史單據的畫面在新機會是空的**。開發時用假資料，最終驗證回公司機做。
- 本機測試租戶：TW-100001（NX99TANT9900004）、登入帳號沿用公司機既有測試帳號（隨資料庫一起還原）。

## 5. Claude Code 環境

**隨 repo 自動生效（不用做事）**：`CLAUDE.md`（Hank 人設與紀律）、`.claude/settings.json` + `.claude/hooks/block-dangerous.ps1`（危險指令黑名單：Railway 連線 / force push / migrate reset）。

**要手動裝（使用者層、不隨 repo）**：

| 項目 | 怎麼裝 |
|---|---|
| GSAP AI Skill（動畫規範開發用） | Claude Code 內 `/plugin` → 加入市集 `greensock/gsap-skills` → 安裝 gsap 技能組 |
| 官方插件市集 | `/plugin` → `anthropics/claude-plugins-official`（公司機也有裝） |

⚠️ **Hank 的記憶不會跟著走**：記憶目錄綁定機器（`~/.claude/projects/` 下），新機的 Hank 是「新人」。開工靠三件事補上下文：`CLAUDE.md` → `git log` → `docs/_team/` 交接文件。這正是交接文件制度存在的原因。

## 6. 啟動與驗證清單

```
# 終端 1：後端
cd apps\nx-api
pnpm start:dev

# 終端 2：前端
cd apps\nx-ui
pnpm dev
```

- [ ] nx-api 起來無錯（NestJS watch 模式）
- [ ] nx-ui 起來、瀏覽器開 http://localhost:3000
- [ ] 用測試帳號登入租戶 TW-100001
- [ ] F2 即時料號查詢有零件資料、庫存數字有值
- [ ] `cd apps\nx-ui; npx tsc --noEmit` 綠

## 7. 兩機分工紀律（2026-07-10 起）

| 事項 | 規則 |
|---|---|
| 分支 | 各機各自開 feature 分支，⛔ 不直接在 main 上工作 |
| 開工前 | `git checkout main; git pull` 再從最新 main 開分支 |
| feature 分支 push | **日常動作、隨做隨推**（存檔 + 跨機同步） |
| main 的 merge / push | **一律執行長拍板** |
| 動資料庫 schema | **只有公司機主線可以做**；家用機/工程師機不動 schema |
| 共用元件（design/、shared/） | 要改先講，兩線都可能碰 |

---

## 附：本手冊的維護

第一次照走時卡住的每一步，回報 Hank 補進來。目標是下一個人照著走**零卡點**。
