<!-- apps/nx-ui/src/README.md -->

# NEXORA GRID 前端架構

這份是 `apps/nx-ui/src/` 的腦袋路徑說明。半年後回來、或新人加入、看這份就能找到家。

---

## 一、四個格子

整個 `src/` 想像成四個格子：

```
src/
├── app/              網址（Next.js 路由）
├── design/           畫面（純 UI、不分業務）
├── data/             資料（API / 類型 / 假資料 / 設定）
├── features/         業務（黏畫面 + 資料、做事的人）
└── middleware.ts     Next.js 中介層
```

- **app/** → 客戶在瀏覽器網址列看到的路徑、Next.js App Router 強制這層
- **design/** → 「只關心畫面長怎樣」的程式碼
- **data/** → 「只關心資料怎麼來怎麼去」的程式碼
- **features/** → 「人類在做的事」、會用 design 的畫面 + data 的資料

頂層**只有這四個資料夾**。沒有 `hooks/`、`lib/`、`shared/`、`mocks/` 之類的雜物抽屜。

---

## 二、兩條鐵則

### 鐵則 1：對外用業務中文名、對內用 NX 編號

- **客戶看得到的網址（`app/dashboard/*`）= 業務中文名**
  - `master / purchase / inventory / sale / finance / report / delivery / hr / knowledge`
  - 不曝光 nx 編號、避免外部人員從 URL 猜到模組架構

- **程式碼結構（`features/`、`data/`）= NX 編號**
  - `nx00 / nx01 / nx02 / nx03 / nx04 / nx05 / nx08 / nx98 / nx99`
  - 對內辨識用、簡短一致、跟規格書編號對齊

舊網址（如 `/dashboard/nx02`、`/dashboard/base`）全部 308 permanent redirect 到業務名、寫在 `next.config.ts`。

### 鐵則 2：四個格子各管各的、不混

- **design/** 不能引 `@/features/*` 的業務邏輯（ESLint warn 守、目標 error）
- **data/** 不能引 `@/features/*` 或 `@/components/*`（ESLint error 守）
- **features/** 可以引 design + data，但業務模組之間原則上不互引

---

## 三、NX 模組對照表

對齊規格書 `docs/專案/規格書/核心/NEXORA-模組架構總覽.html`：

| NX | 規格名稱 | 對外網址 | 角色 |
|---|---|---|---|
| NX00 | 登入與首頁殼層 | `/login`, `/dashboard` | 殼層 |
| NX01 | 主檔管理（六大分區）| `/dashboard/master` | 核心 |
| NX02 | 採購管理 | `/dashboard/purchase` | 核心 |
| NX03 | 庫存管理 | `/dashboard/inventory` | 核心 |
| NX04 | 銷售管理 | `/dashboard/sale` | 核心 |
| NX05 | 財務管理 | `/dashboard/finance` | 核心 |
| NX06 | 物流管理 | `/dashboard/delivery` | 加購 |
| NX07 | 人資管理 | `/dashboard/hr` | 加購 |
| NX08 | 經營分析 / 報表 | `/dashboard/report` | 核心 |
| NX09 | 知識管理 | `/dashboard/knowledge` | 加購 |
| NX98 | 共用核心（單據流轉等）| — | 共用 |
| NX99 | 系統管理（租戶 / 方案 / 訂閱）| `/platform`, `/sys-admin` | 平台 |

---

## 四、四個格子的內容

### `app/` — Next.js 路由

```
app/
├── login/               登入頁
├── dashboard/           登入後的工作區
│   ├── master/          主檔六大分區（NX01）
│   ├── purchase/        進貨（NX02）
│   ├── inventory/       庫存（NX03）
│   ├── sale/            銷貨（NX04）
│   ├── finance/         財務（NX05）
│   ├── delivery/        物流（NX06、加購）
│   ├── hr/              人資（NX07、加購）
│   ├── report/          報表（NX08）
│   ├── knowledge/       知識管理（NX09、加購）
│   ├── auto-replenish/  自動補貨（NX03 工作站延伸）
│   ├── owner/           老闆儀表板
│   ├── settings/        環境設定
│   ├── task-pool/       任務池（NX98）
│   └── tiered-form-demo/  共用 form 框架 demo
├── platform/            伊諾瓦員工營運後台（NX99）
└── sys-admin/           新租戶開戶後台（NX99）
```

### `design/` — 純畫面（不分業務）

```
design/
├── primitives/    shadcn 基本元件（button / input / dialog / card / ...）
├── components/    跨業務 widget（PageHeader / PlanChip / filter-bar / form / lookup / quick-search / master-batch / multi-select-modal / toast / ...）
├── layout/        外殼（DashboardShell / UnifiedTopBar / PlanetDock / DashboardSubNav / ...）
├── home/          首頁殼 + 共享星球（HomeShell / HomeView / SharedPlanetRoot / Dock / HomeTopBar / HomeLandingChrome）
├── document/      單據雙視圖（DocLayout / DocHeader / DocItemTable / ...）
├── login/         登入頁 View（LoginPageView / planet-orbit）
├── theme/         主題系統（NxPaletteHydration）
├── framework/     平台框架（PWA register）
├── styles/        全域 CSS（globals / tokens / components / utilities-and-animations / tw-animate）
├── motion/        動畫範式（scatter 頁切換 radial 散合、對齊 demo system-integrate.js）
├── hooks/         UI 行為 hook（useDebouncedValue / useDirtyGuard / useListLocalPref / useNxThemeMode / useRowSelection / useSplitUrlState）
└── utils/         UI 工具（cn / cx / arrayMove / normalize-numeric-input / hubCardDimensions）
```

頁切換動畫機制（`design/motion/scatter/`）:`tryNavigate` 攔截 → 註冊的 `ScatterPageGate` 跑 radial scatter exit（沿位置向量推 120px、300ms 後 swap）→ 新頁 `data-nx-frame` 元件自動套散開→合攏（440ms cubic-bezier）。共用元件已預設 `data-nx-frame`:`PageHeader` / `MasterPageHead` / `ErpToolbar` / `MasterTable` / `MasterDetailScroll` / `HomeView` 四區。

檔名 **PascalCase**（`HomeShell.tsx`），utility 用 **camelCase**（`useNxThemeMode.ts` / `cn.ts`）。

### `data/` — 純資料

```
data/
├── api/           HTTP client / errors / pagination / fetchAllPages
├── auth/          token / session / demo-session / run-mode
├── errors/        NexoraError 統一錯誤型別
├── hooks/         資料 hook（useDemoSession / useMetricValue）
├── config/        設定檔（metric-options / version）
├── home/          home-data 假資料
├── mocks/         其他模組 hub 假資料（dashboard / finance-hub / purchase-hub / report-hub / sales-hub）
├── utils/         工具（datetime / jwt / parse / nx01Pagination）
├── endpoints/     API 客戶端、按 NX 編號分區
│   ├── auth/        登入 API
│   ├── home-dashboard/  首頁 API
│   ├── nx01/        主檔 API
│   ├── nx02/        採購 API
│   ├── nx03/        庫存 API
│   ├── nx04/        銷貨 API
│   ├── nx05/        財務 API
│   ├── nx08/        報表 API
│   ├── nx98/        單據流轉共用 API
│   ├── platform/    平台 / 伊諾瓦營運 API
│   ├── settings/    設定 API
│   ├── shared/      跨模組共用 API（含 shared/master/* lookup 層）
│   ├── sys-admin/   租戶開戶 API
│   └── wizard/      匯入精靈 API
└── types/         資料形狀（跟 endpoints 同樣分區）
```

`endpoints/shared/master/*` 是「跨模組共用 master lookup 層」（NX02/NX03/NX04 都會用來查零件、客戶等主檔）、跟 `endpoints/nx01/api/*`（主檔頁自己編輯用 CRUD）分開。

### `features/` — 業務邏輯（NX 編號分區）

```
features/
├── auth/          登入認證 hook（useSessionMe / useLogin）
├── nx00/          登入殼 + 首頁殼 context（DashboardBulletinContext / DashboardPaletteContext / DashboardHomePlanContext）
├── nx01/          主檔六大分區 ⭐ 見下節
├── nx02/          進貨（po/pr/rfq/rr/demand/domestic/foreign/ui sop-workspace）
├── nx03/          庫存（auto-replenish/balance/conversion/delivery/disposal/init/issue-report/...）
├── nx04/          銷貨（bundle/promotion/quote/sales-return/so/workflow/ui sop-workspace）
├── nx05/          財務（allowance/closing/paylog/settlement/ui）
├── nx08/          報表（personal-monthly/purchase/sales/inventory/pnl/ops）
├── nx98/          共用核心（task-pool 任務池）
├── platform/      伊諾瓦營運後台（tenants / auth / ui）
├── sys-admin/     租戶開戶（onboarding）
├── page-guide/    引導精靈框架（跨模組、不掛 NX）
├── wizard/        匯入精靈框架（跨模組、不掛 NX）
└── shared/        跨業務 widget（address / part-compat / part-photo / partner-contact / tiered-form / user-photo / issue-report-trigger）
```

#### `features/nx01/` — 主檔六大分區（對齊規格 NX01-01~22）

```
nx01/
├── shell/                 主檔殼框架
│   ├── entity-master/     EntityMasterPage 通用 config-driven 主檔頁 + MasterTabs / format
│   ├── master-config/     25+ 個 master config（catalog-masters / simple-masters）
│   ├── master-nav/        主檔快速入口（master-pages.ts 22 主檔 metadata / MasterPageHead / MasterQuickNav 分組翻頁）
│   ├── ui/                共用 UI 元件
│   │   ├── ErpToolbar.tsx  工具列（A/E/D/F/M/R/P/O/T、跨主檔 / 單據共用）
│   │   ├── MasterTable.tsx 列表 + dnd-kit 表頭拖拉重排
│   │   ├── MasterDetail.tsx 詳細頁 wrapper（MasterDetailScroll / EmptyDetail / DetailTable）
│   │   ├── FormField.tsx   FormField / FormInput / FormSelect（已 token 化、跟主題切）
│   │   ├── SearchPanel.tsx / ConfirmDialog.tsx / KeyboardSelect.tsx
│   │   │   （ToastStack / EntityPickerDialog 已搬到 design/components/toast/ + design/components/multi-select-modal/）
│   │   ├── columns-config/ useColumnsPref hook（localStorage 記欄位順序）
│   │   └── sort-config/    SortMenuButton（M 排序 dropdown、循環三態）
│   ├── hooks/             主檔頁 hook（useExportTable 三模式匯出 CSV/PDF/列印）
│   ├── satellite/         SatelliteSection 衛星表共用 UI
│   ├── zones/             zoned 主檔分區定義（user / part / warehouse / partner zones + USER_FIELD_SECTIONS）
│   ├── keyboard/          鍵盤工具
│   └── config/            shell 通用 config
├── org/           NX01-01~04 組織架構（員工 user-zoned / 職務 roles / 部門 department / 組別 team / structure 組織架構圖）
├── permission/    NX01-05~06 權限管理（職務權限矩陣 RoleViewMatrixPage）
├── location/      NX01-07~10 據點倉庫（warehouse-zoned / location / site / structure 據點架構圖）
├── partner/       NX01-11~14 往來對象（partner-zoned / customer-grade / supplier-grade / supplier-supply 供貨對應）
├── product/       NX01-15~18 產品與廠牌（part-zoned / brand 合併 / part-group / universal-group 主件範式）
└── dict/          NX01-19~22 字典主檔（country / currency / phonetic-dictionary / region）
```

### ⭐ 六層介面鐵則（2026-06-28 執行長定、傳統 ERP 外殼）

任何頁面一律由六層組成、無一例外：
1. **選單列**（頂部八大組 Alt+字母）2. **內容分頁**（已開啟頁的 tab 列）3. **情境工具列**（銀質、依頁變按鈕）
4. **頁內分頁**（list/detail 或 Alt+1~N 切欄）5. **主內容** 6. **底部狀態列**

- 層 1 / 2 / 6 由 **WorkbenchShell** 全頁自動給；層 3 由各頁用 **ToolbarPortal** 投影到外殼插槽；層 4 / 5 各頁提供。
- **麵包屑已全面退場**：頁標題改由「內容分頁（L2）」顯示，主檔模板不再 render `PageHeader`。
- L3 銀質工具列共用 `ErpToolbar`（`features/nx01/shell/ui/`）的 bar 樣式 + `ToolbarButton`；按鈕內容隨頁/聚焦欄變換。

### 主檔模板總覽（六層化後・主檔群基本完成）

> 乾淨六層基準範本 = **`UserZonedPage`（使用者基本資料）**；新主檔對照 `docs/_team/master-page-shell-範式.md`。

| # | 模板 | 型態 | 落點 | 代表頁 |
|---|---|---|---|---|
| 1 | **EntityMasterPage** | config 驅動的表格主檔（最常用）| `shell/entity-master/` + config `shell/master-config/`（catalog-masters / simple-masters）| 國家/幣別/部門/職務/權限等級/區域/貨架/自訂群組/廠牌/車型…（25+ 個）|
| 2 | **Zoned 主檔** | 分區編輯（衛星表 + zone 分頁）、複雜主檔 | `shell/zones/` + 各頁 | 使用者 / 零件 / 倉庫 / 往來對象 |
| 3 | **InlineEditMasterPage** | L0 字典・列雙擊 inline 編輯 | `shell/inline-master/` | 國家 / 注音 / 部門（字典級）|
| 4 | **KeyboardCardMasterPage** | 卡片鍵盤式主檔 | `shell/keyboard-card-master/` | 卡片型主檔 |
| 5 | **多欄 cascade 結構頁** | 階層下鑽、Alt+1~N 切欄（自訂）| `features/nx01/*/structure/` | 組織架構（4 欄）/ 據點架構（5 欄：據點→倉庫→區域→貨架→庫位）|
| 6 | **MasterBatchShell** | 左主體列表 / 右成員列表雙欄、config 驅動（Alt+1/2）| `design/components/master-batch/` | 零件通用表 / 供貨對應 |
| 7 | **PartKitMasterView** | 雙欄列表 + 編輯彈窗（Alt+1 組合件 / Alt+2 組件明細）| `features/nx01/product/part-kit/` | 組合（分解）零件 |
| 8 | **PermissionViewMatrixPage** | 左選等級 / 右畫面權限矩陣（R/C/U/D/匯出/核准）| `features/nx01/permission/permission-level/` | 權限設定 |
| 9 | **ZipcodePage** | 唯讀字典雙欄 + 搜尋（縣市→鄉鎮郵遞）| `features/nx01/address/zipcode/` | 郵遞區號 |

共用六層元件：`ToolbarPortal`（L3 投影、`design/layout/workbench/`）、`ErpToolbar`（銀質 bar + `ToolbarButton`）、`MasterPageHead`（list/detail 分頁 head）、`ColTab`/`BatchTab`（L4 分頁 chip）。

EntityMasterPage / Zoned 統一支援：item-level 導航（⏮◀N/M▶⏭）+ 表頭拖拉欄位 + M 排序 dropdown + P 列印 + O 匯出 + T 垃圾桶 + 全 pro light token。

#### `MasterBatchShell` 細節（`design/components/master-batch/`）

「左主體 + 右成員」雙欄殼、config-driven。左欄 `flat`/`tree`、右欄 `list`/`list-with-extra`/`grouped`。六層化後內建 L3 工具列（新增/加入）+ L4 兩分頁（Alt+1 主體 / Alt+2 明細）。

| Case | leftMode | rightMode | 路由 |
|---|---|---|---|
| 零件通用表 | flat | list | `/master/universal-group` |
| 供貨對應 | flat | grouped | `/master/supplier-supply` |

- 多選 reuse `design/components/multi-select-modal/EntityPickerDialog`；零件搜尋選擇用 `PartSearchSelect`（part-kit）。
- 鍵盤：↑↓ / Enter/Space / Esc / Alt+A 加入 / Alt+1·2 切欄。

### `middleware.ts` — Next.js 中介層

session / auth gating、跨路由共用邏輯。

---

## 五、新人問「我要改 X 怎麼辦」

| 改什麼 | 去哪 |
|---|---|
| 改主檔的 partner 畫面 | `design/components/`（共用元件）+ `features/nx01/partner/`（業務）+ `data/endpoints/nx01/api/partner.ts`（API）|
| 改 F2 料號即時搜尋（全域元件）| `design/components/quick-search/`（Modal/Combobox/PhoneticPicker/GlobalPartQuickSearch、掛在 `app/dashboard/layout.tsx`）+ `data/endpoints/nx01/part-search/`（API）|
| 改報價單 | `features/nx04/quote/`（業務）+ `data/endpoints/nx04/quote/`（API）+ `app/dashboard/sale/qt/`（網址）|
| 改首頁版面 | `design/home/HomeView.tsx`（內容）+ `design/home/HomeShell.tsx`（殼）|
| 改共享星球轉場 | `design/home/SharedPlanetRoot.tsx` |
| 改頁切換動畫 | `design/motion/scatter/ScatterPageGate.tsx` + 任何想參與動畫的元件 outer div 加 `data-nx-frame` |
| 改主題色 | `design/styles/tokens.css`（含 `--nx-surface-input*` light theme token）+ `design/theme/NxPaletteHydration.tsx` |
| 改登入 | `app/login/page.tsx` + `design/login/LoginPageView.tsx` + `features/auth/` |
| 改主檔殼 / 通用功能 | `features/nx01/shell/` |
| 改主檔工具列按鈕 | `features/nx01/shell/ui/ErpToolbar.tsx`（跨主檔 / 單據共用、A/E/D/F/M/R/P/O/T 統一範式）|
| 改主檔快速入口（dock 同步）| `features/nx01/shell/master-nav/master-pages.ts`（22 主檔 metadata、href/category/icon）+ `data/home/home-data.ts`（PlanetDock 主檔分組、**真實 dock data source**）|
| 改主檔群組類型頁（左主體右成員）| `design/components/master-batch/`（shell）+ `features/nx01/<分區>/<頁名>/`（case 自管 mock/API + config）。範式見 `MasterBatchShell` 章節 |
| 追 navigation 失敗 / dock 卡死 | DevTools console 用 `[NX-NAV]` 過濾、看 tryNavigate → scatter exit → pathname effect 全鏈；`ScatterPageGate` 1.5s fail-safe 會 console.warn 標出失敗 target |
| 改員工 zones / 詳細頁分區 | `features/nx01/shell/zones/user-zones.ts`（USER_ZONES / USER_FIELDS / USER_FIELD_SECTIONS）|
| 改 SaaS 平台後台 | `features/platform/` + `app/platform/` |
| 改新增業務模組 | 對照 NX 編號表、`features/nx0X/` + `data/endpoints/nx0X/` + `data/types/nx0X/` + `app/dashboard/<業務中文名>/` |
| 新主檔頁採樣 | 對照 `docs/_team/master-page-shell-範式.md` 8 步 SOP、複製 UserZonedPage 改 API + zone config |
| 改個欄位名 / typo | 直接 grep 全文找、改、跑 `pnpm --filter nx-ui exec tsc --noEmit` 確認 |

---

## 六、不照鐵則的特例（合理例外）

- **`features/page-guide/`、`features/wizard/`**：跨模組 framework、不屬任何單一 NX、保留在 `features/` 頂層
- **`features/shared/`**：跨業務 UI widget（address picker、part photo、partner contact 等）、被多個 NX 模組共用、保留 `shared/` 名稱避免硬塞 NX 編號
- **`features/auth/`**：登入認證 hook（useSessionMe）、所有頁面共用、保留頂層
- **`data/endpoints/shared/master/`**：cross-module 主檔 lookup API（NX02/NX03/NX04 都用）、跟 `data/endpoints/nx01/api/`（主檔頁 CRUD）功能不同
- **`features/sys-admin/`、`features/platform/`**：屬 NX99 系統管理範疇、但因為使用者面向不同（sys-admin = 新租戶開戶；platform = 伊諾瓦員工後台）拆兩個目錄、不強合 `nx99/`

---

## 七、命名規範

| 類型 | 命名 | 例 |
|---|---|---|
| React 元件檔 | PascalCase.tsx | `HomeShell.tsx` |
| Hook | camelCase.ts、`use` 開頭 | `useNxThemeMode.ts` |
| Utility | camelCase.ts | `cn.ts` / `datetime.ts` |
| 純資料 / config | kebab-case.ts | `home-data.ts` / `metric-options.config.ts` |
| 資料夾 | kebab-case | `part-zoned/` / `home-landing-chrome/`（檔名 PascalCase 但目錄 kebab） |
| 頁面 | Next.js 強制 `page.tsx` / `layout.tsx` | — |
| 路徑註解 | 每個檔第一行 `// apps/nx-ui/src/...` 或 `<!-- ... -->`、與檔案實際位置一致 | — |

---

## 八、參考

- 規格書：`docs/專案/規格書/核心/`
  - `NEXORA-模組架構總覽.html`（系統地圖、NX 編號權威來源）
  - `需求規格-00 ~ 08.html`（各模組細分）
  - `nx-table.csv`（schema 對照表）
- 介面規格：`docs/專案/介面規格/ERP SYSTEM TEST/`（Hana demo HTML / JS / CSS、轉場動畫 system-integrate.js 是對齊源頭）
- 主檔範式手冊：`docs/_team/master-page-shell-範式.md`（員工頁封存範本、17 元件清單、8 步採樣 SOP）
- 工具紀律：`docs/_team/HANK-工具紀律.md`
- 整理歷史：`git log --oneline --grep="CLEANUP"`（P1~P8 共 26 個 commit、~140 檔死碼 / ~25,000 行清掉）
- ESLint 邊界守：`apps/nx-ui/eslint.config.mjs`
- 路徑 alias：`apps/nx-ui/tsconfig.json`（`@/* = src/*`、`@data/* = src/data/*`、`@design/* = src/design/*`）

---

## 九、要注意的事

- **改前先 grep**：改 ENUM / model / 跨表用法前、先 `grep -rn` 全專案、不憑記憶
- **不要重新建立頂層雜物抽屜**：找不到地方塞就回來看這份、四個格子一定有家
- **舊網址留 redirect**：刪 URL 改名前、進 `next.config.ts` 加 308、不破舊書籤
- **dev server 跑著別 build**：本機驗收用 `lint + tsc + curl`、不要 `pnpm build` 撞壞 `.next/`
- **新檔第一行加路徑註解**：與檔案實際位置一致、搬遷時要跟著改
- **死碼順手清**：發現孤兒檔 grep 確認 0 引用後可刪、commit 訊息標清楚
