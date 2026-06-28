<!-- docs/_team/ui-style-v2-professional.md -->
# UI 風格架構書 v2 — 專業簡約・傳統 ERP 系統風（現行）

> 位置：docs/_team/ui-style-v2-professional.md
> 版本：v2（2026-06-28 起為預設）
> 說明：NEXORA GRID 前端**現行外殼風格**。取代 [v1 鋼鐵星球遊戲風](./ui-style-v1-steel-planet.md)。
> 改任何外殼 / 配色前先讀本書。

---

## 1. 設計語言

傳統桌面 ERP（偉盟 / 正航 / 鼎新 那派）的**現代詮釋**：嚴謹、資訊密、商務感，
但用乾淨現代版面，不做 Win95 復古立體、也不做太空電玩感。

定案要點（執行長拍板）：
- **統一單一主題**：墨藍 × 銀 × 白，**不分深淺**（無深淺切換鈕、一律 forced light）。
- **護眼優先**（使用者年紀偏大）：主內容白底黑字、白不刺眼（用銀白 `#eef1f4` 非純白）。
- **質感靠材質非明暗**：銀框上緣反光 + 工具列下緣陰影 + 金屬刷銀漸層，而非靠深淺對比。
- **無動畫表演**：glow / 星空 / 極光 / orbit 全壓平（見 §6）。

---

## 2. 六層介面結構（由上到下）

| 層 | 內容 | 元件 |
|---|---|---|
| 1 頂部選單列 | 系統 / 主檔 / 採購 / 銷貨 / 庫存 / 財務 / 報表 + 右側 F2 搜尋。**墨藍底銀白字** | `TopMenuBar` |
| 2 內容分頁 | 已開功能分頁（首頁釘最前、可關、sessionStorage 持久）。銀底 | `WorkbenchTabStrip` + `WorkbenchTabsContext` |
| 3 情境工具列 | 頁面動作（新增/編輯/刪除/查詢/排序/列印/匯出…），**隨頁面變**。刷銀金屬漸層 | 插槽 `WorkbenchToolbarSlot` ← 頁面 `ErpToolbar` 投影 |
| 4 頁內分頁 | 資料瀏覽 / 詳細資料（Alt+1 / Alt+2） | `MasterTabs`（在 `MasterPageHead`） |
| 5 主內容 | 表格（白底黑字、完整全展開、邊到邊） | `MasterTable` 等 |
| 6 底部狀態列 | 公司・使用者・日期時間・版本。銀底 | `WorkbenchStatusBar` |

> 註：第 2、3 層順序為「分頁在上、工具列在下」（執行長 2026-06-28 調整）。

外殼總成：`design/layout/workbench/WorkbenchShell.tsx`
（登入守衛 + modal-stack guard + Palette/Bulletin/PageGuide/Tabs/ToolbarSlot Provider）。
首頁工作區：`WorkbenchHome.tsx`（歡迎 + 模組快捷）。

---

## 3. 情境工具列機制（核心）

第 3 層工具列要「在外殼層、又隨頁面變」——用 **React portal 投影**：

- `WorkbenchToolbarSlot.tsx`：外殼第 3 層放插槽 div；Provider 持有 DOM + 掛載計數。
- 頁面的 `ErpToolbar`（`features/nx01/shell/ui/ErpToolbar.tsx`）三模式（瀏覽/編輯/選取）
  外層包 `<ToolbarPortal>` → 投影到插槽；**頁面狀態零改動**（portal 只換 DOM 位置）。
- 改 `ErpToolbar` 一個元件 → 全部主檔外殼 + 未來單據頁自動套用。
- 無工具列頁面（首頁/報表）→ 計數 0 → 插槽收合。
- 無 Provider（非 workbench）→ ToolbarPortal 退回原地 inline（向後相容）。

---

## 4. 導覽單一來源（SSOT）

- 業務模組選單列從 `data/home/home-data.ts` 的 `DOCK_NAV` 衍生（`menu-data.ts` 轉換）。
- 主檔來自 `features/nx01/shell/master-nav/master-registry.ts`。
- 新增功能只改這兩處、所有導覽自動同步。系統類動作（個人/密碼/設定/登出）收在選單列「系統」。

---

## 5. 配色 / Tokens（墨藍 × 銀 × 白）

`design/styles/tokens.css` → `html[data-nx-palette='pro']`（**單一 mode-independent 區塊**，與 `.light` 無關）。
`NxPaletteHydration` 一律加 `.light`（native 控制項 + utility 淺色規則）。

| 用途 | token | 值 |
|---|---|---|
| 頁底（銀白） | `--background` | `#eef1f4` |
| 文字（近黑） | `--foreground` | `#1a1d24` |
| 白卡面 | `--card` | `#ffffff` |
| 主色（墨藍） | `--primary` / `--accent` | `#25365a` |
| 銀 | `--secondary` | `#e4e8ec` |
| 銀淺 / 弱字 | `--muted` / `--muted-foreground` | `#ebeef2` / `#5b6573` |
| 銀邊 | `--border` | `#d4d9e0` |
| 選單列 L1（墨藍） | `--nx-menubar-bg` / `-fg` / `-fg-strong` | `#1f2d4d` / `#cdd8e8` / `#fff` |
| 工具列 L3（刷銀漸層） | `--nx-surface-toolbar-from` / `-to` | `#f4f6f9` → `#e0e4ea` |

**鐵律**：UI 一律用語意 token（`bg-card` / `text-foreground` / `border-border` / `text-primary`…），
**禁止硬編 hex**。2026-06-28 已把主檔外殼 235 處硬編 hex（金色 + 鋼鐵深色）收斂成 token。

---

## 6. 與 v1 的差異（壓平清單）

| 項目 | v1 鋼鐵星球 | v2 專業簡約 |
|---|---|---|
| 主色 | 金黃琥珀 + glow | 墨藍、無發光（`--nx-glow-primary: none`）|
| 底 | 深色太空 + 星空/極光 | 銀白、`home-stars`/`aurora`/`sky-glow` 關閉 |
| 卡片 | 玻璃擬態 blur | 純色白卡 + 銀框反光 |
| 導覽 | 小星球 Dock | 頂部選單列 |
| 動畫 | GSAP 場景 + 星球飛行 + orbit | 極短過場、orbit 停、無表演 |
| 深淺 | 深/淺雙版可切 | 單一主題、無切換 |
| 登入 | 星球大圖 + 金漸層鈕 | 兩欄式（石墨深底品牌區 + 白卡表單）|

壓平規則寫在 `design/styles/utilities-and-animations.css` 末段 `[data-nx-palette='pro']` 覆寫。

---

## 7. 改版里程（commit 軌 `[NX-UI-TRAD-SHELL]` / `[NX-UI-PRO-PALETTE]`）

1. pro palette 雛形 + 特效壓平 + 切換鈕
2. 傳統外殼骨架（選單列/工具列/分頁/狀態列）接成新預設、太空風封存
3. 登入畫面改傳統乾淨風 → 再加質感（石墨深底品牌區）
4. 配色定案：純藍 → 石墨藍灰 → **墨藍×銀×白統一主題**（方案 4 墨藍頂+銀質工具列）
5. 六層介面 + 情境工具列 portal + 主檔頁精簡（清麵包屑/QuickNav、表格全展開）
6. 主檔外殼 235 處硬編 hex 收斂為 token

---

## 8. 待辦 / 注意

- `design` 區 import `@/features/*` 會有 lint warning（既有容忍模式、非 error；外殼需 session/context 暫沿用）。
- 麵包屑移除目前做了 `UserZonedPage`；其餘主檔外殼（EntityMasterPage 等）視需要比照。
- 視窗模型為路由驅動分頁；分頁 keep-alive（切換保留狀態）尚未做。
