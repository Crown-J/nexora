<!-- docs/_team/post-cleanup-state.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：階段三清理收尾、給 CTO 寫 README 用的「真實狀態」。
     repo 樹／nx-ui src 角色／真實啟動指令／workspace 結構四項。 -->

# Post-Cleanup 真實狀態（2026-06-10）

> 給 CTO 寫 README 用、Hank 實際查過、非憑印象。
> 分支：`chore/cleanup-phase3`、5 commits、待合回 main。

---

## 1. Repo 頂層結構樹（深度 2~3）

```
nexora/
├── apps/
│   ├── nx-api/                       # NestJS 後端（部署 Railway）
│   │   ├── src/                      # 詳見 §2
│   │   ├── scripts/                  # 留 vitest 測試用、不含 .mjs smoke
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── .env.example
│   └── nx-ui/                        # Next.js 16.1.6 前端（部署 Vercel）
│       ├── src/                      # 詳見 §2
│       ├── public/
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── eslint.config.mjs
│       ├── tsconfig.json
│       ├── .env.example
│       └── .env.local.example
├── packages/
│   └── db-core/                      # Prisma 7 + seed + 工具
│       ├── prisma/
│       │   ├── schema.prisma         # ⭐ schema 真相
│       │   ├── migrations/           # 12 支正式 + _archive_migrations/
│       │   ├── seed/                 # system / template / test 三層
│       │   ├── seed-data/            # default / system / test
│       │   ├── sql/                  # id_generators.sql / mw1_baseline_*.sql
│       │   └── _archive_migrations/  # 早期合併前歷史快照
│       ├── scripts/                  # generate-* / merge-baseline / verify
│       ├── src/index.ts
│       ├── prisma.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
├── infra/
│   └── docker/
│       └── docker-compose.yml        # 本機 PostgreSQL 16、port 5433
├── docs/
│   ├── 專案/
│   │   ├── 規格書/核心/              # CTO 寫的需求規格 9 檔（HTML/CSV）
│   │   ├── 規格書/選購套件/          # 待 Phase 3 進場
│   │   ├── 操作手冊/                 # 16 本（HTML + .md）
│   │   └── 介面規格/                 # Hana 的位子（待寫）
│   ├── _archive/                     # 已歸檔歷史文件
│   │   ├── 2026-04/                  # 早期文件
│   │   └── 2026-06-cleanup/          # 含 dailylog / handoffs / staging / superseded / v1.2-alignment
│   ├── _team/                        # 團隊文件（HANK-工具紀律、平台 backlog 等）
│   ├── _reference/                   # 外部參考（待補）
│   ├── _template/spec-template.md
│   └── README.md
├── dev-backups/                      # 本機 pg_dump 備份（gitignored）
├── node_modules/                     # gitignored
├── .git/
├── .vscode/settings.json
├── .claude/                          # 含 settings.json（黑名單 hook）
├── CLAUDE.md                         # Hank 工作規範 v2.0
├── README.md                         # ⚠️ 內容嚴重過時、待 CTO 翻修
├── package.json                      # monorepo root（已清模板殘留）
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .gitignore
├── .gitattributes
└── .npmrc
```

**頂層目錄角色一句話**：
- `apps/` — 兩個跑得起來的應用（前 nx-ui、後 nx-api）
- `packages/` — 共用套件（目前只有 db-core 給 Prisma）
- `infra/` — 基礎設施（目前只有 docker-compose 本機 DB）
- `docs/` — 規格書／手冊／團隊文件／歷史歸檔
- `dev-backups/` — Hank 本機 pg_dump、不入版控
- 其他根目錄都是設定／鎖檔

---

## 2. apps/nx-ui/src/ 目錄角色（一句話）

| 目錄 | 角色 |
|---|---|
| `app/` | Next.js App Router 路由載入點（每個資料夾對一個路由） |
| `components/` | UI 元件、依場景分（dashboard / document / home / layout / login / theme / ui） |
| `features/` | 業務 feature module（33 個、每個獨立功能領域、含自家 UI/API/hooks） |
| `shared/` | 跨 feature 共用（api / errors / format / hooks / lib / types / ui） |
| `mocks/` | 開發 mock data（dashboard / finance-hub / purchase-hub / report-hub / sales-hub） |
| `hooks/` | 全域 React hooks |
| `lib/` | 全域 utility |
| `middleware.ts` | Next.js 全域中介層 |

**features/** 細目（33 個）：
`auth, base, finance, home-dashboard, inventory, layout, master-shell, master-zones, nx01, nx02, nx03, nx05, nx06, nx08, nx98, page-guide, part-zoned, partner-zoned, platform, purchase, report, sale, sales, satellite, settings, shared, sys-admin, sys-dashboard, user-zoned, warehouse-zoned, wizard`

**app/** 一級路由：`change-password / coming-soon / dashboard / login / platform / pricing / sys-admin`（含 globals.css / layout.tsx / manifest.ts / page.tsx）

---

## 3. apps/nx-api/src/ 目錄角色

| 目錄 | 角色 |
|---|---|
| `app.controller.ts / app.module.ts / app.service.ts / main.ts` | NestJS 進入 |
| `auth/` | 租戶 JWT 與守 |
| `platform-auth/` | 平台層（伊諾瓦營運）JWT 與 PlatformAdminGuard |
| `platform-tenants/` | 平台租戶管理（開戶、訂閱） |
| `nx01 ~ nx10` | 十個業務模組 controller / service |
| `nx98 / nx99` | 共用核心（nx98=共用業務、nx99=訂閱與系統） |
| `prisma/` | PrismaService |
| `shared/` | 跨模組共用 |
| `sys-admin/` | 系統管理（角色、權限、設定精靈） |
| `public-files/` | 公開靜態檔 |
| `__tests__/sanity.spec.ts` | 唯一 vitest unit test |

---

## 4. 真實啟動指令

### 本機開發

```bash
# 1) 裝依賴（從 repo 根）
pnpm install

# 2) 啟動本機 PostgreSQL（5433 port）
docker compose -f infra/docker/docker-compose.yml up -d

# 3) 設 .env（複製 .env.example 改）
cp apps/nx-api/.env.example apps/nx-api/.env
cp apps/nx-ui/.env.example apps/nx-ui/.env
cp apps/nx-ui/.env.local.example apps/nx-ui/.env.local
cp packages/db-core/.env.example packages/db-core/.env

# 4) prisma migration + seed
pnpm --filter @nexora/db-core exec prisma migrate dev
pnpm tsx packages/db-core/prisma/seed/index.ts --mode all --tier all

# 5) 啟動服務（兩個 terminal）
# 後端 API（port 3001）
cd apps/nx-api && pnpm dev   # 實際 script：nest start

# 前端 UI（port 3000）
cd apps/nx-ui && pnpm dev    # 實際 script：next dev
```

### 各 package 的 script

| Package | dev | build | start | test |
|---|---|---|---|---|
| `apps/nx-ui` | `next dev` | `next build` | `next start` | — |
| `apps/nx-api` | — | `nest build` | `nest start` | `vitest run` |
| `packages/db-core` | — | — | — | — |
| root | — | `tsc -p tsconfig.json`（少用） | — | — |

---

## 5. .env.example 列示（不列值）

### apps/nx-api/.env.example
- `NODE_ENV`
- `PORT`（後端服務 port、預設 3001）
- `DATABASE_URL`（PostgreSQL 連線、本機指 localhost:5433/nexora_core）
- `JWT_SECRET`、`JWT_EXPIRES_IN`
- `NEXORA_UPLOAD_LOCAL_ROOT`、`NEXORA_UPLOAD_MAX_BYTES`

### apps/nx-ui/.env.example
- `NEXT_PUBLIC_NEXORA_RUN_MODE`
- `NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_API_URL`（指後端、本機 http://localhost:3001）
- `NEXT_PUBLIC_NEXORA_VERSION_SUFFIX`

### apps/nx-ui/.env.local.example（DEMO 模式專用）
- `NEXT_PUBLIC_DEMO_MODE`
- `NEXT_PUBLIC_DEMO_USER_NAME`、`NEXT_PUBLIC_DEMO_USER_ROLE`
- `NEXT_PUBLIC_DEMO_PLAN_CODE`、`NEXT_PUBLIC_DEMO_TENANT_NAME`

### packages/db-core/.env.example
- `DATABASE_URL`、`DIRECT_URL`（兩個分開、Prisma 7 用）

---

## 6. pnpm workspace 結構（真實掃描）

`pnpm-workspace.yaml`：

```yaml
packages:
  - apps/*
  - packages/*
```

實際 workspace 掃到 4 個專案（含 root）：
1. `nexora-monorepo`（root）
2. `apps/nx-ui`
3. `apps/nx-api`
4. `packages/db-core`

驗證指令：`pnpm install --frozen-lockfile` 顯示 `Scope: all 4 workspace projects`。

`turbo.json` 定義 3 個 task（build / dev / lint）、build 輸出 `dist/**` + `.next/**`（不含 .next/cache）。

---

## 7. 階段三清理結果

| 組 | 動作 | 檔數 |
|---|---|---|
| A | 直接刪 T1/T3/T6/T7/T8/G4/G6 | 25 tracked + 2 空目錄 |
| B | dailylog/ 歸 _archive/2026-06-cleanup/dailylog/ | 21 rename |
| C | 刪根 prisma/ 空殼 + demo/ 腳手架 | 173 + 0 tracked（prisma 都 untracked） |
| D | _archive 鬆散歸位 + 中文目錄刪 + home 殘殼遷移 + 根 pkg 清 | 7 動 |

**5 個 commit**：
1. `[docs cleanup phase1] 產出 cleanup-inventory.html`
2. `chore(cleanup): A 組 — 移除幽靈目錄/孤兒檔/一次性腳本`
3. `chore(cleanup): B 組 — dailylog 歷史日誌歸檔後移除`
4. `chore(cleanup): C 組 — 移除根 prisma 空殼與 demo 腳手架`
5. `chore(cleanup): D 組 — 文件歸位/空目錄整併/home 殘殼遷移/根 pkg 清理`

**驗證**：
- `pnpm install --frozen-lockfile` ✅ Scope: all 4 workspace projects
- `tsc --noEmit`（nx-ui）✅ 0 錯誤

---

## 8. README.md 需翻修的點（給 CTO）

repo 根 `README.md` 現指：
- `docs/PROJECT_CONTEXT.md` — 已搬 `_archive/2026-06-cleanup/superseded/`
- `docs/spec/` — 不存在（規格在 `docs/專案/規格書/核心/`）
- `docs/workflow/` — 不存在
- `docs/ui/` — 不存在
- `dailylog/` — 已搬 `_archive/2026-06-cleanup/dailylog/`
- 自稱「Cursor AI 工作規範」— 已改 Claude Code（Hank）

新 README 建議的「文件導航」應指：
- `docs/專案/規格書/核心/` — 需求規格與系統規格
- `docs/專案/操作手冊/` — 各模組操作手冊
- `docs/專案/介面規格/` — Hana UI 規格（待寫）
- `CLAUDE.md` — Hank 工作規範
- `docs/_team/HANK-工具紀律.md` — 工具陷阱
- `docs/_archive/` — 歷史歸檔（不入新文件）

本機開發指令直接用本文 §4。

---

— 本文件由 Hank 階段三清理收尾產出、實際查過真實狀態、不憑印象。—
