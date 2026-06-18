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
├── components/    跨業務 widget（PageHeader / PlanChip / filter-bar / form / lookup / quick-search / ...）
├── layout/        外殼（DashboardShell / UnifiedTopBar / PlanetDock / DashboardSubNav / ...）
├── home/          首頁殼 + 共享星球（HomeShell / HomeView / SharedPlanetRoot / Dock / HomeTopBar / HomeLandingChrome）
├── document/      單據雙視圖（DocLayout / DocHeader / DocItemTable / ...）
├── login/         登入頁 View（LoginPageView / planet-orbit）
├── theme/         主題系統（NxPaletteHydration）
├── framework/     平台框架（PWA register）
├── styles/        全域 CSS（globals / tokens / components / utilities-and-animations / tw-animate）
├── hooks/         UI 行為 hook（useDebouncedValue / useListLocalPref / useNxThemeMode / useRowSelection / useSplitUrlState）
└── utils/         UI 工具（cn / cx / arrayMove / normalize-numeric-input / hubCardDimensions）
```

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
├── shell/         主檔殼框架（EntityMasterPage / 共用 UI / hook / config / 六大分區設定 zones / satellite）
├── org/           NX01-01~04 組織架構（員工 / 職務 / 部門 / 組別）
├── permission/    NX01-05~06 權限管理（職務權限矩陣 RoleViewMatrixPage / roles）
├── location/      NX01-07~10 據點倉庫（warehouse-like / location / user-warehouse / warehouse-zoned）
├── partner/       NX01-11~14 往來對象（partner / customer-grade / partner-zoned）
├── product/       NX01-15~18 產品與廠牌（part / part-group / part-zoned 等）
└── dict/          NX01-19~22 字典主檔（country / currency / phonetic-dictionary）
```

主檔頁面**全部走 `shell/entity-master/EntityMasterPage` + `shell/master-config/catalog-masters`** 配置範式、不再有舊式 modal master view（已退場）。

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
| 改主題色 | `design/styles/tokens.css` + `design/theme/NxPaletteHydration.tsx` |
| 改登入 | `app/login/page.tsx` + `design/login/LoginPageView.tsx` + `features/auth/` |
| 改主檔殼 / 通用功能 | `features/nx01/shell/` |
| 改 SaaS 平台後台 | `features/platform/` + `app/platform/` |
| 改新增業務模組 | 對照 NX 編號表、`features/nx0X/` + `data/endpoints/nx0X/` + `data/types/nx0X/` + `app/dashboard/<業務中文名>/` |
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
