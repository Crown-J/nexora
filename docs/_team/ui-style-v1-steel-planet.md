<!-- docs/_team/ui-style-v1-steel-planet.md -->
# UI 風格架構書 v1 — 鋼鐵星球・遊戲科技風（已封存）

> 位置：docs/_team/ui-style-v1-steel-planet.md
> 版本：v1（2026-06-28 封存）
> 說明：NEXORA GRID 前端**第一代外殼風格**的架構記錄。2026-06-28 起由 [v2 專業簡約系統風](./ui-style-v2-professional.md) 取代為預設。
> 程式**保留不刪、可復原**，僅退出 active 路徑。本書供日後復原 / 對照 / 抽取資產用。

---

## 1. 設計語言

「鋼鐵星球」科技感：以太空 / 星球 / 反應爐為意象，深色底 + 金黃琥珀重點色，大量場景動畫。
視覺華麗、有沉浸感——但客戶反映「像在打電玩、缺專業感」，故改版。

- **氛圍**：深色太空、星空粒子、頂部極光輝光、玻璃擬態（glassmorphism）
- **重點色**：金黃 / 琥珀（`#ffb800` / `#f5c842` / `#e8a020`）+ glow 發光
- **動畫**：GSAP 場景編排（timeline / ScrollTrigger / KPI 數字滾動）+ framer-motion 元件層 + 星球飛行轉場
- **導覽**：單顆「小星球」Dock，多層 rail 橫向滑動

---

## 2. 外殼結構

| 角色 | 元件 | 位置 |
|---|---|---|
| 首頁外殼 | `HomeShell` | `design/home/HomeShell.tsx` |
| 子頁外殼 | `DashboardShell` | `design/layout/DashboardShell.tsx` |
| 頂欄 | `UnifiedTopBar`（小星球觸發 + 品牌 + 時鐘 + 公告/通知 + 環境設定 + 用戶選單） | `design/layout/UnifiedTopBar.tsx` |
| 全域導覽 | `PlanetDock`（小星球 dock、Alt+X 喚醒、↑↓/Enter 鍵盤導航、多層 rail） | `design/layout/PlanetDock.tsx` |
| 飛行星球 | `SharedPlanetRoot`（單顆星球在 login ↔ TopBar slot 間飛行 + 三守護衛星 + hexwave 漣漪） | `design/home/SharedPlanetRoot.tsx` |
| 背景 | `NxAppBackdrop`（星空粒子 / 極光 / vignette） | `design/layout/NxAppBackdrop.tsx` |
| 首頁內容 | `HomeView`（問候 + 行事曆 + KPI + 待辦，stagger 進場） | `design/home/HomeView.tsx` |
| 轉場 | `ScatterPageGate`（頁面 scatter 進場） | `design/motion/scatter/` |

登入：星球大圖 + 金色漸層按鈕 + 登入成功星球飛入 TopBar 的雙段轉場。

---

## 3. 配色 / Tokens

`design/styles/tokens.css` 內兩套 palette（靠 `<html>` 的 `.light` + `data-nx-palette` 切換）：

- `classic`：冷灰深色底 + 金主色
- `steel`（預設）：純黑 / 鐵灰 / 反應爐黃（`#ffb800` / `#cc8400`）；含 light 暖米白變體
- 每套皆有深 / 淺兩版，由頂欄「深淺主題」鈕切換（`nx-theme` localStorage）

特效 token：`--nx-glow-primary`（發光）、`--nx-exp-gradient`（漸層）、`.glass-card` / `.glass-panel`（玻璃）、`home-stars` / `home-aurora` / `home-sky-glow`（星空極光）。

---

## 4. 動畫框架

見 [animation-spec.md](./animation-spec.md)。GSAP 補場景編排、framer-motion 留元件層；
`design/motion/gsap/tokens.ts` 定義 DURATION（含 `dramatic 0.8`）/ EASE（含 `back.out` 彈跳）/ STAGGER。
鐵律：`prefers-reduced-motion: reduce` 一律關動畫。

---

## 5. 封存方式（2026-06-28）

- 路由不再走 v1 外殼：`app/dashboard/layout.tsx` 改用 v2 `WorkbenchShell`；`app/dashboard/page.tsx` 改用 `WorkbenchHome`。
- `SharedPlanetRoot` 的星球一律 `display:none`（context 保留）。
- 預設 palette 由 `steel` 改 `pro`；統一 forced light（見 v2 架構書）。
- **未刪除**的 v1 資產：HomeShell / DashboardShell / UnifiedTopBar / PlanetDock / HomeView / NxAppBackdrop / SharedPlanetRoot / motion/*、`steel`+`classic` palette。

### 若要復原 v1
1. `app/dashboard/layout.tsx` 改回 `DashboardShell`、`page.tsx` 改回 `HomeShell`。
2. `DashboardPaletteContext` / `NxPaletteHydration` 預設改回 `steel`、移除強制 `.light`。
3. `SharedPlanetRoot` 星球 `display` 還原。
4. 還原登入頁 v1 presenter（見 git 歷史 commit `bd3f4a6` 之前）。

---

## 6. 為何改版（教訓）

華麗動畫 + 金色 + 太空意象 → 視覺加分但**降低專業可信度**，B2B / 年長使用者尤甚。
ERP 客戶要的是「快、清楚、不表演」。改版方向見 [v2 專業簡約系統風](./ui-style-v2-professional.md)。
