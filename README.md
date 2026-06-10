<!-- README.md -->
# NEXORA GRID

汽車零件經銷商專用 SaaS ERP 系統，由伊諾瓦資訊科技（Innova IT）開發。

- **產品定位**：多租戶 SaaS ERP、三版 LITE / PLUS / PRO（只差人數上限 15/50/100、功能皆模組化加購）
- **目標市場**：台灣 VAG（Volkswagen Audi Group）體系中小型汽車零件經銷商
- **核心願景**：以恆迎 30 年實戰為樣本、為 2028 亞羅打造的 ERP

## 技術棧

- **前端**：Next.js 16.1.6（App Router、部署 Vercel）
- **後端**：NestJS（部署 Railway）
- **資料庫**：PostgreSQL 16 + Prisma 7
- **Monorepo**：pnpm workspace + Turbo
- **本機 DB**：Docker（PostgreSQL port 5433）

---

## 📁 Repo 結構速覽

```
nexora/
├── apps/
│   ├── nx-api/                 # NestJS 後端（部署 Railway）
│   └── nx-ui/                  # Next.js 前端（部署 Vercel）
├── packages/
│   └── db-core/                # Prisma 7 + schema + seed
├── infra/
│   └── docker/                 # 本機 PostgreSQL docker-compose
├── docs/
│   ├── 專案/規格書/             # CTO Alex 寫的需求/系統規格
│   ├── 專案/操作手冊/           # 各模組操作手冊（Alex 維護）
│   ├── 專案/介面規格/           # Hana UI 規格
│   ├── _team/                  # 團隊文件（工具紀律、線路圖、交接）
│   ├── _archive/               # 歷史歸檔
│   └── _reference/             # 外部參考
├── CLAUDE.md                   # Hank（全端工程師）工作規範
└── README.md                   # 本檔
```

---

## 🎨 前端 nx-ui 結構（給 Hana）

Next.js App Router 結構，**對外網址全部業務中文名（不露 NX 代碼）**。

### 路由（apps/nx-ui/src/app/）

| 對外網址 | 業務 | 對應前端 features |
|---|---|---|
| `/dashboard/base/*` | 主檔（25 主檔） | `base` + `master-shell` + `master-zones` + `*-zoned` |
| `/dashboard/purchase/*` | 採購 | `nx02` + `purchase` |
| `/dashboard/sale/*` | 銷貨 | `sale` |
| `/dashboard/inventory/*` | 庫存 | `nx03` + `inventory` |
| `/dashboard/finance/*` | 財務 | `nx05` |
| `/dashboard/report/*` | 報表 | `nx08` |
| `/dashboard/delivery/*` | 配送 | （API client） |
| `/dashboard/hr/*` | 人資 | （API client） |
| `/dashboard/knowledge/*` | 知識管理 | （API client） |
| `/dashboard/settings/*` | 設定 | `settings` + `wizard` |
| `/dashboard/task-pool` | 待辦池 | `nx98` |
| `/platform/*` | 伊諾瓦營運後台 | `platform` + `sys-admin` |
| `/login` `/change-password` `/pricing` | 公用 | `auth` |

詳細線路圖：`docs/_team/system-routes-final.md`

### features/ 目錄角色

| 資料夾 | 角色 |
|---|---|
| `auth` | 登入 / session / 權限 hooks |
| `base` | 主檔 UI 主層（NX01 模組各 master view） |
| `master-shell` | 主檔通用殼（EntityMasterPage / EntityPickerDialog / config） |
| `master-zones` `*-zoned` | 主檔分區配置（part / partner / user / warehouse） |
| `purchase` | 採購中心 hub UI |
| `nx02` | 採購業務細項（po / pr / rfq / rr / procurement） |
| `sale` | 銷貨（so / qt / bundle / promotion / return / sales-return / workflow） |
| `inventory` | LITE 庫存操作（撿/包/送/收/盤/廢/位置/查/init/conv/部位/ledger） |
| `nx03` | 庫存業務細項（transfer / stock-take / balance / ledger / qt / warranty-claim） |
| `nx05` | 財務 workbench（ar / ap / allowance / closing / note） |
| `nx08` | 報表（個人月報 / 進貨 / 銷售 / 庫存 / 損益 / 營運） |
| `nx98` | 跨模組共用 task-pool（待辦池） |
| `layout` | 全局 UI 殼（DashboardShell / dock / side-menu / BusinessTopNav / TopModuleTabs） |
| `home-dashboard` | 首頁 dashboard + 指標選擇 + task panel |
| `sys-dashboard` | 系統 dashboard（DashboardHomePlanContext） |
| `platform` | 平台管理員殼（PlatformShell） |
| `sys-admin` | 開戶後台（客戶 detail + onboarding） |
| `wizard` | 設定精靈 framework |
| `page-guide` | 引導精靈 provider + AutoPageGuide |
| `shared` | 跨 feature 共用（master / lookup / api client / hooks / role-view） |
| `satellite` | 衛星元件範式 |
| `settings` | 設定（角色編輯） |

### 其他目錄（apps/nx-ui/src/）

| 目錄 | 角色 |
|---|---|
| `components/` | UI 元件（dashboard / document / home / layout / login / theme / ui） |
| `mocks/` | 開發 mock data |
| `hooks/` | 全域 React hooks |
| `lib/` | 全域 utility |
| `middleware.ts` | Next.js 全域中介層 |

---

## ⚙️ 後端 nx-api 結構

`apps/nx-api/src/` 內 19 個頂層模組（NestJS）：

| 模組 | 業務 |
|---|---|
| `nx01` | 主檔系統（51 子模組）|
| `nx02` | 採購 / 進貨（13 子模組） |
| `nx03` | 庫存（18 子模組） |
| `nx04` | 銷貨（10 子模組） |
| `nx05` | 財務（11 子模組） |
| `nx06` | 配送 / 物流（13 子模組） |
| `nx07` | 人資 HR（9 子模組） |
| `nx08` | 報表 BI（6 子模組） |
| `nx09` | 知識管理 KM（8 子模組） |
| `nx10` | 遊戲化 / 激勵（10 子模組） |
| `nx98` | 跨模組共用（task-pool） |
| `nx99` | 平台層（feature-flag / subscription / tenant） |
| `auth` `platform-auth` | 租戶 / 平台 JWT 守 |
| `platform-tenants` | 平台租戶管理（開戶 / 訂閱） |
| `sys-admin` | 開戶後台（importer / onboarding / system-param / wizard） |
| `prisma` `shared` `public-files` | 內部服務 |

---

## 🛠 本機開發（真實啟動指令）

> 來源：`docs/_team/post-cleanup-state.md` §4 — 實際查過、非憑印象。

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

# 4) Prisma migration + seed（三層架構：system / template / test）
pnpm --filter @nexora/db-core exec prisma migrate dev
pnpm tsx packages/db-core/prisma/seed/index.ts --mode all --tier all

# 5) 啟動服務（兩個 terminal）
# 後端 API（port 3001）
cd apps/nx-api && pnpm dev

# 前端 UI（port 3000）
cd apps/nx-ui && pnpm dev
```

### 各 package script 速查

| Package | dev | build | test |
|---|---|---|---|
| `apps/nx-ui` | `next dev` | `next build` | — |
| `apps/nx-api` | `nest start` | `nest build` | `vitest run` |
| `packages/db-core` | — | — | — |

---

## 📚 文件導航

| 文件 | 用途 |
|---|---|
| `docs/專案/規格書/核心/` | 需求 / 系統規格（CTO Alex 寫）|
| `docs/專案/操作手冊/` | 各模組操作手冊（Alex 維護、Hank 核對）|
| `docs/專案/介面規格/` | UI 規格（Hana 寫）|
| `CLAUDE.md` | Hank（全端工程師）工作規範 v2.0 |
| `docs/_team/HANK-工具紀律.md` | 工具陷阱速查（A041/A052/A066 等）|
| `docs/_team/system-routes-final.md` | 系統線路圖（收尾版 2026-06-10）|
| `docs/_team/post-cleanup-state.md` | 階段三清理真實狀態 |
| `docs/_team/route-realignment-plan.html` | 全線路重整施工方案 |
| `docs/_archive/` | 歷史歸檔（不入新文件）|

---

## 👥 團隊四角

| 角色 | 身份 | 工作 |
|---|---|---|
| **Crown** | 創辦人 / CEO | 戰略 + 拍板 + 驗收 |
| **Alex（Claude AI）** | 技術長 CTO | 系統規格 + 操作手冊維護 + 結構化任務分派 |
| **Hana（Claude Design）** | UI/UX 設計師 | UI 元件 / 介面結構 |
| **Hank（Claude Code）** | 全端核心工程師 | schema / migration / service / API / 前後端串接 |

---

## 🔐 危險指令保護

`.claude/settings.json` + `hooks/block-dangerous.ps1` 自動擋：
- Railway 連線（避免誤碰 production）
- `git push --force/-f`
- `prisma migrate reset`

如需執行、必須由執行長拍板。
