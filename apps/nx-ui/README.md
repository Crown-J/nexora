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
  - 業務模組選單 = `data/home/home-data.ts` 的 `DOCK_NAV`（選單列、首頁快捷共用）。
  - 主檔 = `features/nx01/shell/master-nav/master-registry.ts`。
  - 新增功能只改這兩處，所有導覽介面自動同步。
- **情境工具列**：`design/layout/workbench/WorkbenchToolbarSlot.tsx`——頁面 `ErpToolbar` 用 portal 投影到外殼第 2 層，隨頁面內容變。
- **F2 全域料號查詢**：`design/components/quick-search/GlobalPartQuickSearch.tsx`。
- **多租戶**：客戶端 URL 用業務中文名、不露 NX 代碼。

---

## 團隊文件

- 工程慣例 / 規格：`docs/專案/規格書/`
- 操作手冊：`docs/專案/操作手冊/`
- 介面風格架構書：`docs/_team/ui-style-v1-steel-planet.md`、`docs/_team/ui-style-v2-professional.md`
- 動畫規範：`docs/_team/animation-spec.md`
