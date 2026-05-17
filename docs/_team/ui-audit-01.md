<!-- docs/_team/ui-audit-01.md -->

# NX-UI-AUDIT-01 — NEXORA 全 UI 現況 + button + 功能盤點

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：NEXORA v1.5 NX09 雙軌完整化（main HEAD `13fab41`、13 tag）後 Crown 啟動「UI 真實化軌」前 verify
> 對齊：§I.5 #22「Alex 寫業務需求前 verify 業界專業真相」+ 3 stage 設計紀律（benchmark → 痛點 → 優化版）+ §G.9 通配 grep + §I.6.3 揭露不完整每段尾標
> 範圍：apps/nx-ui/src 全棧（不含 nx-api 後端）

---

## §0 真相量級總覽（A041 精確）

```
grep recursive apps/nx-ui/src（總 .tsx）       → 439
find app/dashboard -name page.tsx              → 177
含 NxWorkspacePlaceholder / @FUNCTION_CODE     → 95 files
真實 UI page（非 placeholder）                  → 82 files
features/ 子模組                                → 18 個
components/ui shadcn 風格                       → 12 個
menu.nxXX.ts                                    → 11 個（00~10）
features/ <button|onClick=> 出現位置            → 143 files
features/ <form> 元素                           → 1 file
features/ useForm hook                          → 0 file
```

**核心揭露**：
- **placeholder 率 = 53.7%**（95/177、含全 NX05-NX10 業務模組）
- **真實 UI 集中在 base 主檔 + NX01-04 業務模組 + sale/purchase/inventory v2 路由**
- **0 chart 庫 / 0 form 庫 / 0 toast 庫 / 0 table 庫**（純 useState + 自製）
- **0 react-hook-form / 0 zod / 0 tanstack-query / 0 axios / 0 swr**

### §I.6.3 §0 揭露不完整

- 未 verify production runtime（page 編譯通過 ≠ 業務跑得起來）
- 未 verify 個別 page 的 mock data 替換量（多少還在用 mocks/dashboard.ts、purchase-hub.ts 等）

---

## §1 全 UI placeholder 清單（A041 精確）

### 1.1 placeholder 量級分布

```
nx05: 5/5 全 placeholder（100%）
nx06: 12/12 全 placeholder（100%）
nx07: 8/8 全 placeholder（100%）
nx08: 23/23 全 placeholder（100%）
nx09: 10/10 全 placeholder（100%）
nx10: 10/10 全 placeholder（100%）
─────────────────────────
NX05-NX10 小計：68 placeholder（100% stub）
```

剩餘 27 個 placeholder 分散：
- nx02 5 個（domestic / import / special / product / vendor）
- nx03 3 個（page + warehouse-setting + workspace）
- nx04 3 個（customer / domestic / export）
- auto-replenish 1、finance 1、inventory main 1、purchase children 7、sale 6（qt/so/sop-demo/return/warranty/page）、report 1

### 1.2 placeholder 範式（NxWorkspacePlaceholder）

對齊 `apps/nx-ui/src/features/layout/ui/NxWorkspacePlaceholder.tsx`：

```tsx
🚧 emoji（48px）
+ functionCode mono 12px（如 NX10-WS-UI-001-F01）
+ title 20px medium
+ desc 14px muted
```

⭐ **placeholder 0 button / 0 form / 0 chart / 0 link**（純文字 + emoji 展示頁）。

### 1.3 placeholder API hint 揭露範式

從 desc field 撈典型 API hint（IMPL-01/02 軌補完範式）：
- `nx10/workspace` → "8 controller / 61 endpoint：IMPL-01..."
- `nx09/vin-lookup` → "API：GET /nx09/vin-lookup + /:id + /by-vin/:vin..."
- `nx08/strategy/bcg-matrix` → "BCG matrix ⭐⭐⭐..."
- `nx06/handover` → "動態任務轉派 ⭐⭐⭐..."

⭐ **placeholder desc 已含 API endpoint 路徑** = UI 真實化軌可直接從 desc 撈 endpoint list 對齊。

### 1.4 NX05-NX10 業務模組 placeholder 對應 endpoint 統計

| 模組 | placeholder | A041 endpoint（IMPL-01+02 後）|
|---|---|---|
| NX05 | 5 | 從未 audit 整體 endpoint count（待補） |
| NX06 | 12 | 從未 audit（含 driver PWA 子路由） |
| NX07 | 8 | 47 endpoint（IMPL-01 後）|
| NX08 | 23 | 12 + 22 = 34 endpoint（IMPL-01 後）|
| NX09 | 10 | 61 endpoint（IMPL-01+02 後）|
| NX10 | 10 | 34 endpoint（IMPL-01+02 後）|

⚠️ **NEXORA 業務模組 ≥ 200 backend endpoint 對 ≈ 70 UI placeholder = endpoint:UI 約 3:1**（後端深度遠超 UI 真實化）。

### §I.6.3 §1 揭露不完整

- 未 verify NX01-NX04 + base + AR + report 個別 page 的真實 UI vs placeholder 比例細節
- 未 verify 70 placeholder 中哪些 endpoint 已有對應的 features/ component layer（部分 UI 真實化可能在 features 已寫、page 還掛 placeholder）

---

## §2 menu 結構真相（含重大 offset mapping 揭露）

### 2.1 menu.nxXX.ts × 11 個 + side-menu.ts × 1

| 檔案 | 名稱稱呼 vs 實際對應 | items 數 | 真實對應模組 |
|---|---|---|---|
| menu.nx00 | 主檔管理（Base）| 19 | base 主檔 7 group |
| menu.nx01 | "NX02 採購管理" | 6 | NX02 採購 |
| menu.nx02 | "NX03 庫存管理" | 3 | NX03 庫存 |
| menu.nx03 | "NX04 銷售管理" | 4 | NX04 銷售 |
| menu.nx04 | NX04 銷貨管理（後修正）| 4 | NX04 銷貨（pivot 後修正、見 menu.nx04.ts §header）|
| menu.nx05 | NX05 財務管理 | 6 | NX05 財務 |
| menu.nx06 | NX06 物流管理 | 13 | NX06 物流（含 driver PWA 4）|
| menu.nx07 | NX07 人資管理 | 8 | NX07 人資 |
| menu.nx08 | NX08 經營分析 | 23 | NX08 報表（7 角色 group × 3 dashboard + workspace）|
| menu.nx09 | NX09 EIP + 亞羅特色 | 10 | NX09（IMPL-02 升 10 items）|
| menu.nx10 | NX10 八角遊戲化 | 10 | NX10（IMPL-02 升 10 items）|

⭐ **menu 總 items = 106**（不含 nx00 19 base items 則 87 業務 items）。

### 2.2 ⚠️ 重大揭露：menu.nxXX 命名 vs 路由 offset by one

對齊 `apps/nx-ui/src/features/layout/config/side-menu.ts` 真實 wire：

```typescript
if (pathname.startsWith('/dashboard/nx03')) return getNx02SideMenu();
if (pathname.startsWith('/dashboard/nx04')) return getNx03SideMenu();
if (pathname.startsWith('/dashboard/nx05')) return getNx04SideMenu();
// nx06 ↔ getNx06SideMenu（無 offset）
// nx07 ↔ getNx07SideMenu（無 offset）
// nx08 ↔ getNx08SideMenu（無 offset）
// nx09 ↔ getNx09SideMenu（無 offset）
// nx10 ↔ getNx10SideMenu（無 offset）
```

⚠️ **設計史揭露**：
- 早期版本（TASK-0420 路由 v2）依「業務名稱排序」命名 menu.nxXX（nx01=採購 / nx02=庫存 / nx03=銷售 / nx04=財務）
- 後期改用「模組編號路由」（nx02=採購 / nx03=庫存 / nx04=銷售 / nx05=財務）
- 結果：menu.nx01-04 名稱仍是「業務名稱版」、需 side-menu.ts 內 +1 offset wire
- menu.nx04.ts 已修正內容對齊 NX04 銷貨（但檔名仍是 nx04）= **僅 menu.nx04 走「檔名 = 模組編號」**
- menu.nx05~nx10 = 「檔名 = 模組編號」（後期新建）

⭐ **整體 menu 體系 = 兩種命名範式混用、有 offset by one 過渡期 wire**、新 UI 真實化軌建議：
- 統一範式為「檔名 = 模組編號」
- 重新命名 menu.nx01-03（→ menu.nx02 / menu.nx03 / menu.nx04）
- 或保持現狀並在 side-menu.ts 加註解明確化

### 2.3 side-menu skip 情境（5 路由不掛 SideMenu）

對齊 side-menu.ts 真實 wire：

```
/dashboard/base       → 頁面自帶卡片 Hub（return []）
/dashboard/purchase   → 同上（return []）
/dashboard/sale       → 同上（return []）
/dashboard/inventory  → 同上（return []）
/dashboard/finance    → 同上（return []）
/dashboard/report     → 同上（return []）
/dashboard/nx02/{domestic|import|special|product|vendor} → 同上（return []）
```

⭐ **設計範式**：base / 業務 v2 路由 / nx02 部分子路由 用「卡片 Hub 自帶導覽」、不用左側 SubNav；nx03-nx10 用 SubNav 左側選單。

### 2.4 modules.ts TopBar Tab（5 個業務模組）

對齊 `apps/nx-ui/src/features/layout/config/modules.ts`：

```typescript
[base 主檔中心 / purchase 採購管理 / inventory 庫存管理 / sales 銷售管理 / finance 財務管理]
```

⚠️ **重大缺口揭露**：TopBar Tab 只 5 個、缺 logistics / hr / report / knowledge / game = **NX06-NX10 在 TopBar 0 可見**（只能從 URL 直接進）。

### §I.6.3 §2 揭露不完整

- 未 verify base v2 卡片 Hub 與 SubNav 視覺差異
- 未 verify driver PWA（/dashboard/nx06/driver）行動端是否獨立 layout vs 與桌面 layout 共用

---

## §3 既有真實 UI 揭露（82 個非 placeholder page）

### 3.1 真實 UI 分布

| 路由區 | 真實 page 數 | 性質 | 範例 |
|---|---|---|---|
| `/dashboard` 首頁 | 1 | SysDashboardPage Mock 真實 + zustand session | calendar / event / task / NX10 panel |
| `/dashboard/base/*` | 27 | 主檔 CRUD 真實 view + form | parts / partners / car-brand / location / users |
| `/dashboard/nx01/*` | 14 | PO/PR/RFQ/RR + new/edit | PoListView + PoNewForm |
| `/dashboard/nx02/*`（庫存）| 15 | init / transfer / stock-take + new/edit | 完整 detail/new flow |
| `/dashboard/nx03` 1 + `/dashboard/inventory/*` 10 | 11 | 庫存 workspace + 子流程 | delivery / picking / packing |
| `/dashboard/sale/*` | 14 | 銷售 docs / customer / inquiry | hub + sop-workspace |
| `/dashboard/purchase/sop-demo` | 1 + 7 placeholder | 採購 demo | - |

### 3.2 真實 UI 核心範式 — base 主檔層

對齊 `apps/nx-ui/src/app/dashboard/base/parts/page.tsx`：

```tsx
'use client';
import { BasePartMasterView } from '@/features/base/part/BasePartMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BasePartsPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="零件主檔" description="..." />
      <BasePartMasterView />
    </div>
  );
}
```

⭐ 範式：**page 只負責 header + 引用 features/<module>/<entity>/<EntityView>**、真實邏輯在 features layer。

### 3.3 features/ 子模組（18 個 + 多 entity 子模組）

```
features/
├── auth/          （登入 + session、含 useSessionMe + login/me API）
├── base/          （主檔 27 entity、本軌覆蓋最廣）
├── document-demo/ （SO/RFQ 列印展示）
├── finance/       （財務 hub）
├── home/          （首頁 sales/purchase/finance/report hub）
├── inventory/     （ui/warehouse/workspace/workstation）
├── layout/        （DashboardShell / SideMenu / SubNav / TopModuleTabs）
├── nx00/          （warehouse/user 主檔通用元件）
├── nx01/          （PO/PR/RFQ/RR + customer-grade + engine/model + 多 entity）
├── nx02/          （庫存 init/transfer/stock-take）
├── nx03/          （warehouse 視覺）
├── nx06/          （push-subscription 1 file 純常數）
├── purchase/      （vendor / product / hub）
├── report/        （報表 hub）
├── sale/          （inquiry / hub / sop-workspace / fulfillment、含 mock data + FloatingToast 自製）
├── sales/         （與 sale 並存、待 audit）
└── sys-dashboard/ （SysDashboardPage + 5 component + config）
```

### 3.4 sys-dashboard 真實 UI 核心（首頁 /dashboard）

對齊 `SysDashboardPage.tsx`：
- LITE/PLUS 版型：QuickShortcuts + Calendar + EventBook + TaskList
- PRO 版型：+ ProExpRankBar + ProNx10LeftPanel + ProTodayAttendancePanel
- plan code（PRO/PLUS/LITE）由 `useSessionMe()` 推斷
- 全 keyboard shortcut（單字母跳轉 + `/` 全域搜尋）
- 所有資料來自 `mocks/dashboard.ts`（mockCalendarEvents + mockTasks）

⭐ **首頁 NEXORA UI 真實程度最高**（含真實 component + keyboard shortcut + mock data wiring）、但**全 mock**、未連 backend。

### 3.5 已 wire backend 真實 UI（非 mock）

| 模組 | 真實 backend wire 範例 | API 形式 |
|---|---|---|
| auth | callLoginApi / callMeApi | apiJson + token mgmt |
| nx01 PO | listPo + createPo + getPo | useState + useEffect + fetch（純）|
| base parts / partners / users 等 | BasePartMasterView / users CRUD | useState + useEffect + fetch |
| nx02 庫存 | init/transfer/stock-take + detail view | useState + useEffect + fetch |
| sale inquiry / docs / quote | 列表 + detail | useState + useEffect + fetch |

⭐ **真實 backend wire 範式 = 純 fetch + useState + useEffect 手寫**（無 swr / tanstack-query / axios）。

### §I.6.3 §3 揭露不完整

- 未 verify 82 個真實 page 全部 wire 完成度（部分 page 可能 component 寫了但未連後端）
- 未 verify components/dashboard ExpBar / LeftPanel / RightPanel 12 個 component 與 features/sys-dashboard 的職責邊界
- 未 verify features/sale vs features/sales（雙存）的真相（命名歷史 vs 功能差異）

---

## §4 既有 button + 功能盤點

### 4.1 button / onClick 量級

```
features/ <button|onClick=> 出現位置：143 files
app/dashboard/ 真實 button：1 file（nx01/stock-replenishment 10 處）
nx05-nx10 placeholder button：0
```

⭐ **button 集中在 features layer**（page layer 純引用）。

### 4.2 form / 表單範式真相

```
features/ <form> 元素：1 file（PurchaseProductManagementView）
features/ useForm hook：0 file（無 react-hook-form）
features/ 真實表單 useState 數量：> 100 處（純 useState 手寫）
```

⭐ **NEXORA 表單範式 = 純 useState + 受控元件**（無 react-hook-form / zod schema）：

| 重 form file | useState/setValue 場景數 |
|---|---|
| ProcurementFlowHub.tsx | 7 |
| PurchaseVendorManagementView.tsx | 5 |
| PurchaseProductManagementView.tsx | 4 |
| RrNewForm.tsx | 4 |
| PoNewForm.tsx | 3 |
| SoDocPage.tsx / RfqDocPage.tsx | 3 / 3 |
| WarehouseSingleView/FormPanel | 2/2 |

### 4.3 button 行為分類

對齊 grep 結果 + 範式取樣：
1. **路由跳轉**（Next Link / router.push）= 主流量、佔 ~60%（如 `/dashboard/nx01/po/new`）
2. **API call**（list/create/patch/delete）= ~30%（如 createPo / updatePartner / 庫存交易）
3. **純 UI state 切換**（modal open/close / tab 切換 / sort / filter）= ~10%

⭐ **placeholder page 全 0 button**（NX05-NX10 + 部分 NX02-04 子頁 = 70 個 page 完全無互動）。

### 4.4 form 欄位 working state 真相

| 範式 | 範圍 | 真實互動 |
|---|---|---|
| 純 useState 受控 input/select/textarea | 主流量（PO/PR/RFQ/RR new + base CRUD）| ✅ 完整 wire backend + submit |
| FloatingToast 自製（無第三方 toast 庫）| sale/sop-workspace + sale/inquiry | ✅ 完整 |
| 純 Link 跳轉（無實際 form）| placeholder + 部分 hub | ❌ 0 互動 |

### §I.6.3 §4 揭露不完整

- 未 verify form validation 範式（純 onSubmit 檢查 vs 即時驗證）
- 未 verify error handling 一致性（每個 form 自己 try/catch + setError）
- 未 verify accessibility（aria-label / focus management / keyboard nav）

---

## §5 UI 元件庫真相

### 5.1 dependencies 真相（A041 精確）

對齊 `apps/nx-ui/package.json`：

#### 5.1.1 ✅ 既有

| 類別 | 套件 | 版本 |
|---|---|---|
| Framework | next | 16.1.6 |
| Framework | react / react-dom | 19.2.3 |
| Primitive | @radix-ui/react-{avatar, dialog, dropdown-menu, label, scroll-area, slot, tabs} | 1.x-2.x（7 個 primitive）|
| Styling | tailwindcss | v4 |
| Styling | tailwind-merge + clsx + class-variance-authority | shadcn/ui 標配 |
| Styling | tw-animate-css | 1.4 |
| Animation | framer-motion | 12.38 |
| Icon | lucide-react | 1.7 |
| State | zustand | 5.0.12 |
| Date | date-fns + react-day-picker | 4.x / 9.x |

#### 5.1.2 ❌ 缺（業界 ERP UI 標配）

| 類別 | 業界選項 | NEXORA 現況 |
|---|---|---|
| **Chart** | Recharts / Chart.js / Apache ECharts / Tremor / Visx | **0**（NX08 23 placeholder dashboard 全無法視覺化）|
| **Form** | react-hook-form / Formik | **0**（純 useState 手寫）|
| **Schema validation** | zod / yup / valibot | **0**（無 type-safe schema）|
| **Data fetching** | tanstack-query / swr / axios | **0**（純 fetch + useState/useEffect）|
| **Table** | @tanstack/react-table / ag-grid / material-react-table | **0**（純 HTML <table> 手寫）|
| **Toast / Notification** | sonner / react-hot-toast / @radix-ui/react-toast | **0**（FloatingToast 自製）|
| **Drag & drop** | dnd-kit / react-beautiful-dnd | **0**（無拖拽支援）|
| **Rich text editor** | tiptap / lexical | **0**（無 SOP/KM 編輯器）|
| **File upload** | react-dropzone | **0**（無拖拽上傳）|
| **Map** | leaflet / mapbox-gl / react-map-gl | **0**（NX06 物流地圖無法視覺化）|
| **Modal/Sheet** | @radix-ui/react-dialog 已有 | ✅ basic dialog only |
| **Tooltip / Popover** | @radix-ui/react-tooltip / popover | **0**（無 tooltip）|
| **Combobox / Autocomplete** | cmdk / @radix-ui/react-combobox | **0**（搜尋框純 input）|

### 5.2 components/ui shadcn 風格（A041 精確 = 12 個）

```
avatar / badge / button / calendar / card / dialog
dropdown-menu / input / label / scroll-area / tabs / textarea
```

⚠️ **缺基礎 component**：
- ❌ select / combobox（業務員選車型 / 選料件常用）
- ❌ tooltip / popover（hover 提示）
- ❌ command（cmdk 搜尋 palette）
- ❌ skeleton（loading 骨架）
- ❌ progress / slider
- ❌ table（業界 ERP 表格必備）
- ❌ form（react-hook-form 整合）
- ❌ sheet / drawer（行動端常用）
- ❌ accordion / collapsible
- ❌ toast / alert

### 5.3 components/dashboard 既有 dashboard 元件（12 個）

```
ExpBar/ExpBar.tsx + MedalModal.tsx（NX10 經驗 + 勳章）
LeftPanel/CheckinCard / CheckinRewardModal / DailyGoalCard / DailyReportBtn / MonthlyGoalCard
RightPanel/CalendarCard + EventBookCard + TaskListCard + TodayAttendanceCard
ModuleMenuOverlay
```

⭐ **NX10 八角遊戲化 UI 已有 5 個真實 component**（ExpBar + CheckinCard + DailyGoalCard + MonthlyGoalCard + MedalModal）、但**未連 backend、純 mock**。

### 5.4 design tokens / theme

- Tailwind v4（新版 CSS-first config）
- Dark / Light theme 支援（components/theme/）
- 色彩系統：`text-muted-foreground` / `bg-card` / `border-border` / `bg-primary` 等 shadcn/ui token

⚠️ **缺 design system 文件化**（無 docs/design-system.md / Figma URL）。

### §I.6.3 §5 揭露不完整

- 未 verify Tailwind v4 config 內容（CSS 變數 vs theme.extend）
- 未 verify icon set 完整度（lucide-react 1.7 約 1k+ icon）
- 未 verify framer-motion 實際使用範圍（哪些 page 用了動畫）

---

## §6 frontend 整體拓樸

### 6.1 apps/nx-ui/src/ 拓樸圖

```
apps/nx-ui/src/
├── app/                       Next 16 App Router
│   ├── layout.tsx + page.tsx  根入口（redirect → /login）
│   ├── login/page.tsx         登入畫面（PlanetOrbit + ParticleField 視覺）
│   ├── coming-soon/page.tsx   過渡頁
│   └── dashboard/
│       ├── layout.tsx         套 DashboardShell（HomeLandingChrome + HomeTopBar）
│       ├── page.tsx           SysDashboardPage（首頁 mock 真實）
│       ├── base/* (27)        主檔層真實 UI
│       ├── nx01/* (14)        採購 PO/PR/RFQ/RR 真實 UI
│       ├── nx02/* (20)        庫存真實 UI（init/transfer/stock-take/...）
│       ├── nx03/* (3)         銷售 workspace（含 1 placeholder）
│       ├── nx04/* (3)         銷貨 placeholder
│       ├── nx05/* (5)         財務 placeholder
│       ├── nx06/* (12)        物流 placeholder（含 driver PWA 4）
│       ├── nx07/* (8)         人資 placeholder
│       ├── nx08/* (23)        報表 placeholder（7 角色 × 3）
│       ├── nx09/* (10)        EIP placeholder（IMPL-02 升 10）
│       ├── nx10/* (10)        八角遊戲化 placeholder
│       ├── sale/* (20)        銷售 v2 路由真實 UI
│       ├── purchase/* (8)     採購 v2 路由（含 1 sop-demo）
│       ├── inventory/* (10)   庫存 v2 路由
│       ├── finance + report + auto-replenish  各 1 placeholder
├── components/                共用 UI（74 個 .tsx）
│   ├── ui/                    shadcn 風格 12 個 primitive
│   ├── dashboard/             首頁 ExpBar/LeftPanel/RightPanel 12 個
│   ├── home/                  HomeLandingChrome + HomeTopBar
│   ├── layout/                layout 共用
│   ├── login/                 LoginForm + PlanetOrbit + ParticleField
│   ├── theme/                 dark/light 切換
│   ├── document/              文件元件
│   └── pwa-register.tsx
├── features/                  業務 feature layer（18 子模組）
│   ├── auth/                  callLoginApi + callMeApi + useSessionMe + token mgmt
│   ├── base/                  base 主檔 27 entity
│   ├── nx00/ nx01/ nx02/ nx03/ nx06/  各模組 feature
│   ├── purchase/ sale/ sales/ inventory/ finance/ home/ report/  業務 hub
│   ├── document-demo/         SO/RFQ 列印展示
│   ├── layout/                DashboardShell + SideMenu + SubNav + TopModuleTabs + NxWorkspacePlaceholder
│   └── sys-dashboard/         SysDashboardPage + 5 panel + config
├── hooks/                     useDemoSession + useNxThemeMode
├── lib/                       (待 grep) cn util 等
├── middleware.ts              Demo 模式直接放行（其餘 next）
├── mocks/                     5 mock files（dashboard/finance-hub/purchase-hub/report-hub/sales-hub）
└── shared/                    api/client + http + query + format + hooks + lib + jwt
```

### 6.2 routing wire 真相

- **Next 16.1 App Router**（純 Server / Client component）
- 根入口 `/` → redirect `/login`
- 登入後 → `/dashboard`（SysDashboardPage）
- 全 `/dashboard/*` 套 `DashboardLayout` → `DashboardShell`（HomeLandingChrome 星空 + HomeTopBar 模組 Tabs + SubNav 左側 + 內容框）
- middleware.ts 僅 Demo 模式放行（無真實 Edge auth、JWT 驗證在 useSessionMe / apiJson）

### 6.3 auth wire 真相

```
login → callLoginApi → setToken（localStorage / sessionStorage）→ router.push /dashboard
↓
DashboardShell → useSessionMe → callMeApi → me / planCode / view（loading/error）
↓
若 !me → router.replace /login
若 view.errorMsg → 顯示 Session error + 退出 button
```

⭐ Demo mode：`NEXT_PUBLIC_DEMO_MODE=true` 時 callLoginApi 短路 + 寫 sessionStorage tenantCode（TEST-LITE/PLUS/PRO）。

### 6.4 production 運作狀態（未 verify、推測）

- ✅ 編譯通過（tsc 0 error per IMPL closure）
- ✅ Next dev server 應可跑起來
- ⚠️ Demo mode 預設 vs production mode 差異未 verify
- ⚠️ backend API 連線狀態（apiJson baseUrl 設定）未 verify
- ⚠️ NX05-NX10 placeholder = 0 互動（業務員無法操作）

### §I.6.3 §6 揭露不完整

- 未 verify Next 16.1 server component / client component 分布（多少 page 純 server、多少帶 'use client'）
- 未 verify shared/api/client.ts apiJson 詳細實作（baseUrl / interceptor / error）
- 未 verify Demo mode 與 real backend 切換的 env 變數完整清單
- 未 verify PWA register（pwa-register.tsx）對應 service worker 設定
- 未 verify components/login PlanetOrbit / ParticleField 視覺實作（framer-motion 動畫？）

---

## §7 業界對標 + 設計缺口揭露

### 7.1 業界 ERP UI 對標（NEXORA 沒有的）

#### 7.1.1 偉盟系統（legacy ERP UI 範式）— PROJECT_CONTEXT §3.4 引用

| 偉盟有 | NEXORA 現況 | 缺口等級 |
|---|---|---|
| 桌面豐富表單（密集欄位）| ❌ form 主流量純 useState | ⭐⭐ |
| 列印報表（PDF / 紙本格式對齊）| ⚠️ document-demo 僅 SO/RFQ | ⭐⭐⭐ |
| 多視窗多開（業務員同時 5 個 tab）| ❌ Next App Router 預設單頁 | ⭐⭐ |
| 鍵盤快捷鍵密集（F1-F12）| ✅ SysDashboardPage 有 / + 單字母 | ⭐ |

#### 7.1.2 SAP / Oracle / Microsoft Dynamics（大型 ERP）

| 大型 ERP 標配 | NEXORA 現況 | 缺口等級 |
|---|---|---|
| 即時 dashboard chart（KPI / sales trend）| ❌ 0 chart 庫 | ⭐⭐⭐ NX08 23 placeholder 全卡 |
| 全模組搜尋（cmdk style command palette）| ❌ 0 cmdk | ⭐⭐⭐ |
| F1 inline help / context manual | ⚠️ NX09 SystemManual schema 在 + UI placeholder | ⭐⭐ |
| 多 tenant 切換 | ✅ 既有（tenantCode 機制）| - |
| Excel-style 表格編輯 | ❌ 0 table 庫 | ⭐⭐ |

#### 7.1.3 中小汽配 ERP 業界（亞羅實際對手）

| 業界 muscle memory | NEXORA 現況 | 缺口等級 |
|---|---|---|
| VIN 對照 UI（查 VIN → 顯示車型 + 料件清單）| ⚠️ schema + API 在、UI placeholder | ⭐⭐⭐ |
| 維修 SOP 步驟編輯器 | ⚠️ schema + API 在、UI placeholder | ⭐⭐ |
| 客戶/車型適配對照表（partModel）| ✅ base/part-model 已有真實 UI | - |
| 外務員行動 App（簽收 / 路線）| ⚠️ NX06 driver/* 4 placeholder | ⭐⭐⭐ |
| 報價單 PDF 列印 | ⚠️ document-demo 已有 SO 範例 | ⭐ |

### 7.2 v1.5 達成的 16 業界改革候選 UI 真實化需求

對齊 NEXORA 13 tag 累積的業界改革 ⭐⭐⭐ 候選（部分整理）：

| 業界改革 | 模組 | UI 真實化需要 | UI 缺口 |
|---|---|---|---|
| NX06 動態任務轉派（半自動 AI 派車）| NX06 | 地圖 + 派車面板 + 接受/拒絕 button | 0 地圖庫 + 0 互動 button |
| NX06 動態交接獎勵 | NX06+NX10 | 雙方確認介面 + Exp 動畫 | 0 真實 UI |
| NX08 BCG matrix | NX08 | scatter chart + 4 象限 | 0 chart |
| NX08 AR 命中率 dashboard | NX08 | line/bar chart + KPI 卡 | 0 chart |
| NX08 7 角色 dashboard | NX08 | 21 chart + KPI ranking | 0 chart |
| NX07 KPI → 薪資加給 wire | NX07 | salary breakdown table + KPI 來源視覺 | 0 table |
| NX09 Postgres FTS 全文搜尋 | NX09 | command palette + snippet 高亮 | 0 cmdk + 0 syntax highlight |
| NX09 VIN NHTSA 混合 | NX09 | VIN 輸入 + decode 結果 panel + Parts 列表 | 0 真實 form |
| NX09 維修 SOP 結構化 | NX09 | step-by-step 編輯器 + 拖拽排序 + 圖片上傳 | 0 富文本 + 0 dnd + 0 upload |
| NX10 八角驚喜寶箱 | NX10 | 開箱動畫（framer-motion 重度）+ rarity 視覺 | 有 framer-motion 但 0 真實 |
| NX10 衝刺挑戰 | NX10 | 倒數計時器 + 排行榜 chart | 0 真實 |
| NX10 醫章 20 levels | NX10 | progress bar + 升級動畫 + 收集視圖 | ExpBar 在但 mock |
| NX10 排行榜 | NX10 | leaderboard table + filter | 0 table |
| NX10 轉職 3 階審核 | NX10 | timeline view + 階段切換 + reject reason | 0 timeline |
| NX10 帶新人 | NX10 | mentor-mentee 配對視圖 + Exp 結算 | 0 真實 |
| NX10 team task | NX10 | 團隊進度 bar + reward 視覺 | 0 真實 |

⭐ **16 改革候選 → 至少需 5 大 UI 元件補齊**：
1. **chart 庫**（必要、阻擋 NX08 23 placeholder + NX10 leaderboard）
2. **map 庫**（必要、阻擋 NX06 物流地圖 + driver PWA）
3. **table 庫**（必要、ERP 業界 baseline）
4. **command palette / cmdk**（NX09 FTS 全文搜尋核心）
5. **richtext / dnd / file upload**（NX09 RepairSop 步驟編輯器）

### 7.3 角色 dashboard UI 需求差異

對齊 NX08 7 角色 dashboard 設計 + business context：

| 角色 | 主要 dashboard 視覺需求 | 互動需求 |
|---|---|---|
| **業務員**（個人銷售 / 客戶 / 商品 sales）| line chart + ranking table + customer card | 篩選 + drill-down 客戶詳情 |
| **倉管**（庫存周轉 / 滯銷 / 缺貨）| bar chart + alert badge + threshold setting | 篩選倉庫 + 修改安全量 |
| **倉管組長**（配送成本 / 路線 / 動態轉派）| map + scatter chart + KPI tile | **拖拽派車** + 派車面板 + 即時 GPS |
| **採購**（廠商評等 / 比價 / PO stats）| bar chart + comparison table + scatter | 篩選廠商 + 比價輸入 + 議價工作流 |
| **財務**（AR / AP / cash flow）| line chart（時間軸）+ aging table + KPI | 篩選日期 + drill-down 客戶/廠商 |
| **主管**（部門業績 / 業務員 ranking / KPI）| stacked bar + radar + KPI 紅綠燈 | 月份切換 + 跨部門比較 |
| **Crown 戰略**（cross-module / BCG / 戰略 KPI）| 4 象限 + 跨模組總覽 + 戰略卡 | 跨模組篩選 + 戰略決策面板 |
| **PWA 外務員**（行動端）| **地圖**（自己 + 任務）+ **簽收 button** + 路線導航 | 接受/拒絕任務 + GPS 上傳 + 簽名輸入 |
| **Yaro 員工（八角遊戲化）**| ExpBar + 勳章收集 + 排行 + 衝刺 / 寶箱 | 簽到 + 任務領取 + 開箱 + 排行查看 |

⭐⭐⭐ **9 種角色 = 9 種 UI 痛點**、單一 dashboard layout 套不下、需 **per-role dashboard customization 機制**（user-warehouse / role-view 已 wire backend、UI 真實化軌補對齊）。

### 7.4 其他 Alex 沒想到的 UI 維度

| # | 維度 | 揭露 |
|---|---|---|
| 1 | **無障礙 / accessibility**（a11y）| 0 aria-label 系統化 / 0 keyboard focus management 規範 |
| 2 | **i18n / 多語**（業務員台語 vs 越南籍員工）| 全繁中 hard-coded、無 i18n 框架 |
| 3 | **時區處理**（NX10 有 nx10-timezone.util、其他模組？）| 部分模組有、不一致 |
| 4 | **行動端 vs 桌面端 layout**（SysDashboardPage 已分 compact）| 業界其他 page 未分 |
| 5 | **離線支援**（PWA driver 倉庫 / 外務員偏遠地區）| 有 pwa-register 但無 offline-first 策略 |
| 6 | **錯誤邊界**（Error Boundary）| 未 grep、推測 0 全域處理 |
| 7 | **loading skeleton**（vs 純 "載入中..."）| 0 skeleton component |
| 8 | **空狀態 illustration**（empty state）| 0 統一空狀態 |
| 9 | **權限驅動 UI**（不同 role 看到不同 button）| backend role-view 在、UI 套用未 verify |
| 10 | **長表單分段儲存**（PO/RFQ/RR 長表單 draft）| useState 短期、refresh 即失 |
| 11 | **印表機格式對齊**（document-demo 僅 PDF、無實體印表機驅動）| 中小 ERP 必備 |
| 12 | **多開窗口**（業務員同時開 5 個客戶）| Next 預設單頁、無 tab 機制 |
| 13 | **快捷鍵系統化**（除首頁外）| 0 全域 hotkey provider |
| 14 | **批次操作 UI**（一次選 N 筆出貨）| useRowSelection hook 在、UI 套用未 verify |
| 15 | **資料匯出**（Excel / CSV）| 0 export 庫 |
| 16 | **歷史記錄 / 操作日誌 UI**（audit log viewer）| backend audit 在、UI 0 |
| 17 | **通知中心**（任務派送 / Exp 獎勵）| 0 notification center |
| 18 | **拖拽排序 / 看板**（vs 列表）| 0 dnd |

### §I.6.3 §7 揭露不完整

- 未 verify NEXORA 是否需做 mobile native app（Capacitor / Tauri / 純 PWA）
- 未 verify Crown 對「UI 真實化」優先級（NX08 chart 優先 vs NX10 遊戲化動畫優先 vs NX09 VIN/SOP 業界差異化優先）
- 未 verify 設計師資源（Crown / Alex 是否有設計師、Figma URL、design system 計畫）

---

## §8 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex 補揭露：

1. **§0** 整體 production runtime 狀態 + mock data 替換量化
2. **§1** NX01-04 + base + AR + report 真實 UI vs placeholder 比例細節
3. **§1** 70 placeholder 對應 features/ component layer 已寫了多少
4. **§2** base v2 卡片 Hub vs SubNav 視覺差異
5. **§2** driver PWA 行動端 layout 獨立性
6. **§3** features/sale vs features/sales 雙存差異
7. **§3** components/dashboard vs features/sys-dashboard 職責邊界
8. **§4** form validation / error handling / accessibility
9. **§5** Tailwind v4 config + framer-motion 實際使用範圍
10. **§6** server vs client component 分布 / apiJson 詳細 / Demo env 變數 / PWA SW
11. **§7** Crown 對 UI 真實化優先級拍板 + 設計師資源 + 是否做 mobile native

---

## §9 戰略總覽（給 Alex 3 stage 設計紀律的基底）

### 9.1 量化現況

| 維度 | 數字 |
|---|---|
| 總 page | 177 |
| placeholder | 95（53.7%）|
| 真實 UI | 82（46.3%）|
| features/ 子模組 | 18 |
| menu items 總計 | 106 |
| components/ui shadcn 風格 | 12 |
| dashboard 元件 | 12 |
| 業務模組（NX05-NX10）UI 真實化率 | **0%**（68/68 placeholder）|
| 後端 endpoint 對 UI placeholder 比例 | **≈ 3:1**（後端遠超 UI）|

### 9.2 ⭐⭐⭐ Alex 3 stage 設計紀律的入口（5 大決策題）

1. **UI 框架補齊優先級**：A=chart 庫先（解 NX08）/ B=map 庫先（解 NX06）/ C=cmdk 先（解 NX09 FTS）/ D=table 庫先（ERP baseline）
2. **角色 dashboard 優先順序**：A=Crown 戰略 dashboard 先（你會用）/ B=業務員 dashboard 先（人數多）/ C=外務員 PWA 先（最痛）
3. **真實化範圍**：A=全 NX08 23 placeholder 一次解 / B=每模組挑 1-2 高價值 dashboard / C=亞羅特色（NX09 VIN + RepairSop）先
4. **UI 元件庫策略**：A=chart 選 Recharts / B=Tremor / C=Visx / D=Apache ECharts；form 選 react-hook-form 是否引入；table 選 tanstack-table 是否引入
5. **設計師 / Figma**：A=Hank 自己邊做邊設計 / B=Crown 找設計師 / C=Alex benchmark 業界 ERP 截圖後 brief

### 9.3 ⭐⭐⭐ 業界改革候選 → UI 元件 dependency 表

| 改革候選 | 需要 |
|---|---|
| NX06 動態任務轉派 ⭐⭐⭐ | **map 庫**（leaflet/mapbox）+ button + 派車面板 |
| NX08 7 角色 dashboard ⭐⭐⭐ | **chart 庫**（Recharts/Tremor）× 23 個 |
| NX09 VIN NHTSA 混合 ⭐⭐⭐ | **form + table**（VIN 輸入 + Parts 列表）+ snippet 顯示 |
| NX09 維修 SOP 結構化 ⭐⭐⭐ | **richtext + dnd + file upload**（步驟編輯器 + 拖拽 + 圖示）|
| NX10 八角遊戲化 ⭐⭐⭐ | **framer-motion 已有**（開箱 / 升級動畫）+ chart + table |
| NX09 Postgres FTS ⭐⭐ | **cmdk**（command palette）+ snippet 高亮 |

### 9.4 🔵 Alex 3 stage 預告

對齊 Crown 紀律「不跳階段、不直接開工」：

**Stage 1 — benchmark**：
- 業界 ERP UI 截圖盤點（SAP / Oracle / Dynamics / 偉盟 / 中小汽配對手）
- 對齊 NEXORA 9 角色 dashboard 需求
- 對齊本 audit §7 16 改革候選

**Stage 2 — 痛點分析**：
- 對齊本 audit §1.4 endpoint:UI 3:1 缺口
- 對齊本 audit §5.1.2 13 缺套件
- 對齊本 audit §7.4 18 維度

**Stage 3 — 優化版設計（NEXORA UI 真實化方案）**：
- per-role dashboard layout
- 共用 component 庫補齊計畫（chart / table / form / map / cmdk）
- design tokens / 一致性 / accessibility
- 真實化軌拆分（按模組 vs 按角色 vs 按 component）

---

> 文件版本：v1.0（NX-UI-AUDIT-01 純諮詢、9 段揭露 + 11 表 + 13 元件庫缺口 + 18 UI 維度 + 16 改革候選 dependency）
> 待 Alex 進入 3 stage 設計紀律 → 寫 ui-overview / ui-strategy 規格
