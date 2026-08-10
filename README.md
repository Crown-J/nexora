<!-- README.md -->

> ## ⏸ 2026-08-10 狀態宣告：本專案已遞延
>
> **先讀這段，再讀底下任何一行。**
>
> 兩大主軸 ＝ **恆迎**（CEO 現在待的公司）＋ **亞羅**（2027/09 設立）。
> NEXORA／伊諾瓦的商轉計畫因策略改變**往後遞延**，⛔ 不是主軸；重啟時機由執行長決定。
>
> - 亞羅新系統 ⛔ **不在本 repo 改造**，另起爐灶。
>   原因（實測結論）：多租戶／方案／席次假設已焊進核心，改造時每行都要問一次
>   「這是租戶邏輯還是亞羅邏輯」——結果就是混淆。亞羅從自己出發、砍掉重練，⛔ 不考慮 Innova。
> - 網域 **nexoragrid.com** 先轉給亞羅營運系統使用。
> - **⚠️ 本 repo ⛔ 不是亞羅的素材庫。** 亞羅的鐵律是「查出來的可引用、想出來的一律重推」，
>   而本 repo 大部分是架構與介面判斷（＝想出來的）。要帶走的只有「按下去才發現的事實」，
>   且必須經由**單一引用入口**（該檔尚未建立），⛔ 不得直接翻本 repo 當論據。
> - 在本宣告撤銷前：⛔ **不動工、不開新分支、不刪既有分支**（約 100 個分支，脈絡要留）。
>
> ### ⛔ 底下這份 README 有兩處已經過期，別再引用
> - 「**兩個樣本**」那行寫「亞羅（2028）」→ **錯**。亞羅設立是 **2027/09**
>   （CEO 預計 2027/08 離開恆迎），且亞羅**不是** NEXORA 的示範場——亞羅系統另起爐灶。
>   時程一律以 `C:\yaro_project` 為準。
> - 「總帳脊椎是空的」這類講法 → 2026-08-01 `[SPEC-GL-SPINE-B]` B 階段已結案
>   （試算表／損益表／資產負債表／年度結帳／子帳對總帳，實測全過）。
>
> 📌 以下 §「NEXORA GRID」起全部維持原樣未改——遞延不是清算，脈絡要留。
> 在宣告撤銷前，它描述的是「重啟時要回到的狀態」，不是現在要動工的指令。
>
> | 不在這裡 | 去哪裡 |
> |---|---|
> | 恆迎的分析、全部 SQL、PETKA | `C:\autoparts` |
> | 恆迎線上系統／LINE bot | `C:\heng-system\web`（`cytic-web`）／`C:\heng-system\lineworks_bot`（`cytic-bot`） |
> | 亞羅現行規劃 | `C:\yaro_project` |

---

# NEXORA GRID

**通路業 ERP 的核心引擎**，由伊諾瓦資訊科技（Innova IT）開發。汽配是第一層皮，不是產品的邊界。

- **產品定位**：多租戶 SaaS ERP、三版 LITE / PLUS / PRO（只差人數上限 15/50/100、功能皆模組化加購）
- ⭐ **核心 vs 行業皮**：核心引擎行業無關（交易循環、單據狀態機、過帳進總帳、多租戶），
  **可搬到五金／機車料／工業耗材／醫材通路**；汽配專屬的（料號/OEM 對照、車型相容、VIN）是**可抽換的插件**。
  ⚠ 每個焊進核心的「恆迎專用」假設 ＝ 未來擴張的地雷。
- **灘頭堡**：台灣 VAG 體系中小型汽車零件經銷商。站穩再向外擴。
- **賣的是什麼**：不是「記帳快」，是**管理紀律本身**——命脈＝可信可稽核的帳
  （IFRS/TIFRS ＋ 過得了 COSO）→ 國際通行證。
- **兩個樣本**：恆迎（Crown 過去 30 年 VAG 經銷商）＝**過去**的參考樣本；
  亞羅（2028）＝**第一個實作與示範場**。
- 🔴 **roadmap 硬事實**：總帳/財報脊椎**優先於**銷售 UI 精修。帳接不進總帳、生不出財報，vision 就沒往前。

> 📐 上位依據：[`docs/專案/規格書/核心/NEXORA-策略骨架.md`](docs/專案/規格書/核心/NEXORA-策略骨架.md)
> （位階在所有規格書之上，⚠ 目前仍是 v0.1 草案・待執行長 review）

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
│   ├── 專案/規格書/             # 需求/系統規格（核心/ 內含策略骨架＝最高上位依據）
│   ├── 專案/操作手冊/           # 各模組操作手冊
│   ├── 專案/介面規格/           # UI 規格
│   ├── _team/                  # 團隊文件（工具紀律、線路圖、交接）
│   ├── _archive/               # 歷史歸檔
│   └── _reference/             # 外部參考
├── CLAUDE.md                   # Hank（全端工程師）工作規範
└── README.md                   # 本檔
```

---

## 🎨 前端 nx-ui 結構

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
| ⭐ `docs/專案/規格書/核心/NEXORA-策略骨架.md` | **最高層上位依據**（功能取捨 / 模組定義 / 邊界爭議的判準）|
| `docs/專案/規格書/核心/NEXORA-模組重定義分析.md` | 落地版：現況→該長怎樣→差在哪→先做哪（§4 缺口1＝總帳脊椎是空的）|
| `docs/專案/規格書/核心/` | 需求 / 系統規格 |
| `docs/專案/操作手冊/` | 各模組操作手冊 |
| `docs/專案/介面規格/` | UI 規格 |
| `CLAUDE.md` | Hank（全端工程師）工作規範 v2.3 |
| `docs/_team/HANK-工具紀律.md` | 工具陷阱速查（A041/A052/A066 等）|
| `docs/_team/system-routes-final.md` | 系統線路圖（收尾版 2026-06-10）|
| `docs/_team/post-cleanup-state.md` | 階段三清理真實狀態 |
| `docs/_team/route-realignment-plan.html` | 全線路重整施工方案 |
| `docs/_archive/` | 歷史歸檔（不入新文件）|

---

## 👥 團隊（2026-07-18 起兩人）

| 角色 | 身份 | 工作 |
|---|---|---|
| **Crown** | 創辦人 / CEO | 戰略 + 拍板 + 驗收 + 業務語意定義 |
| **Hank（Claude Code）** | 全端核心工程師 | 系統規格 + UI/介面 + schema / migration / service / API + 前後端串接 + 操作手冊 |

⚠ 原 CTO **Alex**（規格）與設計 **Hana**（介面）已於 2026-07-18 退場，職責併入 Hank。
不再有第三方對接，疑問直接問執行長。詳見 [`CLAUDE.md`](CLAUDE.md) §1。

---

## 🔐 危險指令保護

`.claude/settings.json` + `hooks/block-dangerous.ps1` 自動擋：
- Railway 連線（避免誤碰 production）
- `git push --force/-f`
- `prisma migrate reset`

如需執行、必須由執行長拍板。
