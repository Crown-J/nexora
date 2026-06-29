<!-- apps/nx-ui/README.md -->
# NEXORA GRID — nx-ui（前端）

多租戶 SaaS ERP「NEXORA GRID」的前端應用。台灣汽配經銷商導向、純網頁 PWA。

- **技術棧**：Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS v4 / lucide-react
- **後端**：nx-api（NestJS，Railway）；資料層走 `@data/*`
- **部署**：Vercel
- **monorepo**：pnpm workspace（本目錄為 `apps/nx-ui`）

---

## 開發指令

```bash
pnpm dev      # 開發伺服器（http://localhost:3000）
pnpm lint     # eslint
pnpm build    # 正式編譯
```

> ⚠️ 本機驗收：`pnpm dev` 跑著時，用 `lint` + `tsc --noEmit` + 瀏覽器確認，**不要另跑 `pnpm build`**（會撞壞 `.next/` 與 HMR）。

型別檢查：`npx tsc --noEmit -p tsconfig.json`

---

## 介面風格（重要）

NEXORA 前端歷經一次門面大改版，存在**兩套外殼風格**：

| 版本 | 風格 | 狀態 | 架構書 |
|---|---|---|---|
| v1 | 鋼鐵星球・遊戲科技風（星球/星空/金色/GSAP 動畫） | **已封存**（程式保留、非預設） | [docs/_team/ui-style-v1-steel-planet.md](../../docs/_team/ui-style-v1-steel-planet.md) |
| v2 | 專業簡約・傳統 ERP 系統風（墨藍×銀×白、六層介面） | **現行預設** | [docs/_team/ui-style-v2-professional.md](../../docs/_team/ui-style-v2-professional.md) |

現行 v2 為**統一單一主題**（墨藍×銀×白、不分深淺）。改任何外殼/配色前先讀對應架構書。

- **六層介面鐵則**：任何頁面一律六層——1 選單列 / 2 內容分頁 / 3 情境工具列 / 4 頁內分頁 / 5 主內容 / 6 狀態列。層 1/2/6 由 `WorkbenchShell` 全頁自動給；層 3 由各頁 `ToolbarPortal` 投影；層 4/5 各頁提供。
- **手機響應式**：同一份程式碼 `md:` 斷點——桌面六層不變、<md 切手機版（漢堡選單 + 分頁切換器 + 卡片 master-detail + FAB + 多欄逐層下鑽）。
- **品牌標**：`design/brand/BrandLogo.tsx`（立體 N、墨藍×銀）；favicon / PWA 圖示在 `public/`（同造型 SVG）。

---

## 目錄結構（重點）

```
src/
├─ app/                      # Next.js App Router（路由頁、薄殼，邏輯在 features）
│  ├─ layout.tsx             # Root layout：字型 + NxAppBackdrop + SharedPlanetRoot + NxPaletteHydration
│  ├─ login/                 # 登入頁（container=page.tsx / presenter=@design/login）
│  └─ dashboard/
│     ├─ layout.tsx          # 套 WorkbenchShell（現行 v2 外殼）
│     ├─ page.tsx            # 首頁工作區（WorkbenchHome）
│     └─ master|purchase|sale|inventory|finance|report|...  # 各模組功能頁
│
├─ design/                   # 設計層（UI、外殼、樣式、共用元件）— ⚠️ 不 import @/features 業務邏輯
│  ├─ layout/workbench/      # 🟢 v2 現行外殼：WorkbenchShell / TopMenuBar / 分頁 / 情境工具列插槽 / 狀態列 / 首頁
│  ├─ layout/                # DashboardShell / UnifiedTopBar / PlanetDock（🔴 v1 封存外殼）
│  ├─ home/                  # SharedPlanetRoot（v1 飛行星球，現一律隱藏）/ HomeShell（v1 封存）
│  ├─ login/                 # 登入畫面層
│  ├─ styles/                # tokens.css（設計變數 / palette）+ globals + utilities-and-animations
│  ├─ motion/                # GSAP × framer-motion 動畫框架（v1 場景動畫）
│  └─ components/            # 共用元件（quick-search F2、page-header、toast…）
│
├─ features/                 # 業務功能（依模組 nx01~nx10）
│  └─ nx01/shell/            # 主檔共用外殼：ErpToolbar / MasterTable / EntityMasterPage / 各 zoned 頁…
│
└─ data/                     # 資料層（API endpoints、home-data DOCK_NAV、auth、config）
```

---

## 設計系統重點

- **主題變數**：`design/styles/tokens.css`，現行 palette = `data-nx-palette='pro'`（墨藍銀白統一）。
- **導覽單一來源（SSOT）**：
  - 頂部八大組選單 = `design/layout/workbench/menu-data.ts` 的 `MENU_BAR`（權威 IA：系統設定/基本資料/採購進貨/銷售/簽核/庫存/會計財務/報表）。
  - 業務模組快捷 = `data/home/home-data.ts` 的 `DOCK_NAV`（首頁卡片）；主檔登錄 = `features/nx01/shell/master-nav/master-registry.ts`。
  - 新增功能改對應登錄表、各導覽介面自動同步。
- **情境工具列（L3）**：`design/layout/workbench/WorkbenchToolbarSlot.tsx`——頁面 `ErpToolbar` 用 `ToolbarPortal` 投影到外殼第 3 層、隨頁面/聚焦變；手機自動收成「5 顆 + 更多」。
- **主檔頁模板（7 種）**：表格 `EntityMasterPage` / `Zoned` / 多欄 cascade / `MasterBatchShell` / `PartKitMasterView` / 權限矩陣 / 郵遞字典——皆已手機化，細節見 `src/README.md`。
- **F2 全域料號查詢**：`design/components/quick-search/GlobalPartQuickSearch.tsx`。
- **多租戶**：客戶端 URL 用業務中文名、不露 NX 代碼。

---

## 團隊文件

- 工程慣例 / 規格：`docs/專案/規格書/`
- 操作手冊：`docs/專案/操作手冊/`
- 介面風格架構書：`docs/_team/ui-style-v1-steel-planet.md`、`docs/_team/ui-style-v2-professional.md`
- 動畫規範：`docs/_team/animation-spec.md`
