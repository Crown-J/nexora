<!-- docs/nx03/nx03-audit-02.md -->

# NX03-AUDIT-02 — 舊 NX02 庫存 / 舊 NX03 銷貨 殘留資產盤點

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx03/、Crown 拍板後再決定要不要 commit）
> 撰寫者：Hank
> 日期：2026-05-15
> 真實 main HEAD：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
> 對應 AUDIT-01：[nx03-audit-01.md](nx03-audit-01.md)
> Pivot 真相校正：舊 NX02=庫存 → 新 NX03、舊 NX03=銷貨 → 新 NX04

---

## 0. Pivot 真相一張表（先講最重要）

| 編號 | 舊語意（pivot 前）| 新語意（pivot 後）|
|---|---|---|
| NX02 | 庫存 | **採購** |
| NX03 | 銷貨 | **庫存** |
| NX04 | 財務 | **銷貨** |
| NX05 | 物流 | **財務** |
| ...  | (整體偏移 1 個編號) | |

**關鍵發現**：所有 `menu.nxXX.ts` 檔名 = 舊編號、檔頭描述 + href 路徑 = **新編號**。menu 配置處於「**半搬遷**」狀態（函數名舊、目標路徑新）。

---

## 任務 A：舊 NX02 庫存殘留盤點

### A1. schema 殘留（grep -c "^model Nx02" = **13**）

```
1459: Nx02Demand        — 採購需求單
1509: Nx02Po            — 採購單
1587: Nx02PoItem        — 採購單明細
1632: Nx02Pr            — 採購退回
1698: Nx02PrItem        — 採購退回明細
1744: Nx02Qt            — 採購報價單
1786: Nx02Rfq           — 詢價單
1853: Nx02RfqItem       — 詢價單明細
1905: Nx02Rr            — 進貨單
1981: Nx02RrImport      — 進貨匯入
2047: Nx02RrItem        — 進貨單明細
2103: Nx02Ti            — 同行調貨單
2161: Nx02TiItem        — 同行調貨單明細
```

⭐ **schema 真相：13 / 13 個 Nx02 model 全是合法新 NX02（採購業務）、0 條庫存殘留**。

⚠️ AUDIT-01 提到的 `Nx03Inbound/Outbound` 4 表 migration 日期 `20260415120000`、命名空間從一開始就用 `nx03_*`、**非舊 NX02 庫存時代搬過來的**、是 NX03 命名空間下的 Phase 5 殘留設計（與 pivot 無關）。

### A2. backend 殘留（`find apps/nx-api/src/nx02 -type d` = 5 子模組）

```
apps/nx-api/src/nx02/po/                 — 採購單（4 endpoints）
apps/nx-api/src/nx02/purchase-return/    — 採購退回
apps/nx-api/src/nx02/qt/                 — 採購報價單 + 9 test specs
apps/nx-api/src/nx02/rfq/                — 詢價單
apps/nx-api/src/nx02/rr/                 — 進貨單（含 stock_balance 過帳）
apps/nx-api/src/shared/nx02/             — 5 個共用工具（advisory-lock / currency / doc-no / list-query / state-machine）
```

⭐ **backend 真相：5 / 5 個子模組全是合法新 NX02（採購業務）、0 條庫存殘留**。

### A3. frontend 殘留（`find apps/nx-ui/src -path "*nx02*"`）

⚠️ **frontend 是滿地舊 NX02 庫存殘留**：

#### A3.1 `app/dashboard/nx02/` 路由（13 個子路由全是庫存業務）

```
nx02/auto-replenish/   — 自動補貨
nx02/balance/          — 即時庫存
nx02/domestic/         — 國內庫存
nx02/import/           — 進口庫存
nx02/init/             — 開帳（new + [id]）
nx02/ledger/           — 庫存台帳
nx02/product/          — 商品
nx02/shortage/         — 缺貨
nx02/special/          — 特殊處理
nx02/stock-setting/    — 安全量設定
nx02/stock-take/       — 盤點（new + [id]）
nx02/transfer/         — 調撥（new + [id]）
nx02/vendor/           — 供應商
```

#### A3.2 `features/nx02/` 9 個子模組（共 ~30 檔、全是庫存業務）

```
features/nx02/auto-replenish/   — 自動補貨（api + hooks + ui×2）
features/nx02/balance/          — 即時庫存（api + hooks + ui）
features/nx02/dashboard/        — 庫存儀表板（api + hooks + ui×2、Nx02DashboardPage / Nx02StatCard）
features/nx02/init/             — 開帳單（api + 3 hooks + 4 ui）
features/nx02/ledger/           — 庫存台帳（api + hooks + ui）
features/nx02/shared/           — PartLookupAutocomplete / PlanUpgradePrompt
features/nx02/shortage/         — 缺貨（api + hooks + ui）
features/nx02/stock-setting/    — 安全量設定（api + hooks + ui）
features/nx02/stock-take/       — 盤點（api + 3 hooks + 3 ui）
features/nx02/transfer/         — 調撥（api + hooks + ui×2）
```

#### A3.3 menu 配置（半搬遷狀態）

```
apps/nx-ui/src/features/layout/config/menu.nx02.ts:
  函數名：getNx02SideMenu()         ← 舊編號殘留
  檔頭：「NX03 庫存管理側邊選單」      ← 新編號
  href：/dashboard/nx03/workspace 等  ← 新編號
```

→ menu 函數名指向「舊 NX02」、實際 href 指向「新 NX03」。但 **menu 指向的 `/dashboard/nx03/` 路由只有 2 個 page**（workspace / warehouse-setting），其他庫存路由全部在 `/dashboard/nx02/*`。

#### A3.4 home dock 殘留（active 路徑 14 行）

`apps/nx-ui/src/components/home/dock.tsx` 第 72~95 行 + 266~269 行：
- 14 行 `pathname.startsWith('/dashboard/nx02/...')` 庫存 active 判斷
- 4 個 DockSubLink 指向 `/dashboard/nx02/{ledger,stock-take,transfer,init}`

→ **真實 production 使用中的庫存入口是 `/dashboard/nx02/*`、不是 `/dashboard/nx03/*`**。

#### A3.5 InventoryCenterHub 殘留（新檔 import 舊路徑）

`apps/nx-ui/src/features/inventory/ui/InventoryCenterHub.tsx`：
- 第 21 行 `import useDashboard from '@/features/nx02/dashboard/hooks/useDashboard'`
- 第 70 / 83 / 104 / 118 / 131 行：href 全部指向 `/dashboard/nx02/*`

→ **新 inventory feature 仍依賴舊 nx02 feature**、是「新殼舊心」狀態。

### A4. migration 殘留（**0 條** `nx02_stock|nx02_inventory|nx02_warehouse`）

```
grep -l "nx02_stock|nx02_inventory|nx02_warehouse" packages/db-core/prisma/migrations/*/migration.sql
→ 0 條
```

全部 `nx02_*` migration（4 條）只動到採購表：
```
20260414100000_nx02_po_rr_status_varchar30
20260414103000_nx02_doc_no_varchar30
20260414104500_nx02_currency_fk_len
20260425100300_phase0_b5_nx02_qt
```

⭐ **migration 真相：0 條庫存殘留**。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 B：舊 NX03 銷貨殘留盤點

### B1. schema 殘留（grep "^model Nx03.*Sale|^model Nx03.*Order|^model Nx03So|^model Nx03Quote" = **0**）

⭐ **schema 真相：20 / 20 個 Nx03 model 全是庫存業務、0 條銷貨殘留**（AUDIT-01 已詳述）。

### B2. backend 殘留（AUDIT-01 已揭露：7 個 nx03/* 子模組全庫存）

```
nx03/inbound/          — 庫存入庫（4 endpoints）
nx03/outbound/         — 庫存出庫（4 endpoints）
nx03/stock-balance/    — 即時庫存（2）
nx03/stock-ledger/     — 異動帳冊（1）
nx03/stock-reservation/ — 預留（2 + 8 tests）
nx03/stocktake/        — 盤點（4）
nx03/transfer/         — 調撥（4）
```

⭐ **backend 真相：0 條銷貨殘留**。

### B3. frontend 殘留

#### B3.1 `features/nx03/` 庫存錯位（A041 = 1 sales + 7 workflow components）

```
features/nx03/sales/SalesFlowHub.tsx               — 銷貨工作流入口（1064 行）
features/nx03/workflow/types.ts                    — Workflow 型別
features/nx03/workflow/mock/documentsBrowse.mock.ts
features/nx03/workflow/mock/operation.mock.ts
features/nx03/workflow/mock/workbench.mock.ts
features/nx03/workflow/ui/SalesDocumentsBrowse.tsx
features/nx03/workflow/ui/SalesOperationWorkspace.tsx
features/nx03/workflow/ui/SalesOrderWorkspace.tsx
features/nx03/workflow/ui/SalesWorkflowPage.tsx
features/nx03/workflow/ui/WorkflowQuickActions.tsx
features/nx03/workflow/ui/WorkflowStepBar.tsx
features/nx03/workflow/ui/WorkflowStepPanel.tsx
```

🔴 **真相揭露**：`grep -rn "SalesFlowHub\|SalesWorkflowPage" apps/nx-ui/src` → **0 處外部引用**。
→ features/nx03/sales + workflow 12 檔是「**孤兒 code**」、export 後沒人 import。

#### B3.2 menu 配置（半搬遷狀態）

```
apps/nx-ui/src/features/layout/config/menu.nx03.ts:
  函數名：getNx03SideMenu()           ← 舊編號殘留
  檔頭：「NX04 銷售管理側邊選單」        ← 新編號
  href：/dashboard/nx04/{domestic,export,customer}  ← 新編號
```

#### B3.3 `/dashboard/nx04/*` 路由（A041 = 4 檔、全 placeholder）

```
nx04/layout.tsx           — 唯一非 placeholder
nx04/customer/page.tsx    — import NxWorkspacePlaceholder
nx04/domestic/page.tsx    — import NxWorkspacePlaceholder
nx04/export/page.tsx      — import NxWorkspacePlaceholder
```

🔴 **NX04 銷貨路由 3/3 是 placeholder、0 條真實功能**。

#### B3.4 `features/sales/` 替代候選（1 檔）

```
features/sales/ui/SalesCenterHub.tsx
```

🔴 **`SalesCenterHub` 也是 0 處外部引用的孤兒**。

#### B3.5 dashboard nx03 庫存路由（A041 = 4 檔）

```
nx03/layout.tsx
nx03/page.tsx
nx03/warehouse-setting/page.tsx
nx03/workspace/page.tsx
```

→ menu.nx02.ts 指向這條（新庫存）、但實際使用的是 `/dashboard/nx02/*`（舊 13 路由）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 表 1：舊 NX02 庫存殘留盤點

| # | 殘留位置 | 性質 | 業務語意 | 推薦 | 理由 |
|---|---|---|---|---|---|
| 1 | `Nx02*` 13 個 model | schema | 全採購、0 庫存 | — | 無殘留、不適用 |
| 2 | `apps/nx-api/src/nx02/*` 5 子模組 | backend | 全採購、0 庫存 | — | 無殘留、不適用 |
| 3 | `apps/nx-api/src/shared/nx02/*` 5 工具 | backend | 全採購 | — | 無殘留、不適用 |
| 4 | `migrations/*nx02*` 4 條 | migration | 全採購 | — | 無殘留、不適用 |
| 5 | `app/dashboard/nx02/balance/` | UI 路由 | 即時庫存 | ✅ 搬到 `dashboard/nx03/balance` | 業務功能完整、value high、有 production 使用 |
| 6 | `app/dashboard/nx02/ledger/` | UI 路由 | 異動帳冊 | ✅ 搬到 `dashboard/nx03/ledger` | 對應 stock_ledger、強制溯源核心 UI |
| 7 | `app/dashboard/nx02/init/` (new + [id]) | UI 路由 | 開帳單 | ✅ 搬到 `dashboard/nx03/init` | 對應 Nx03Init、業界 muscle memory 起點 |
| 8 | `app/dashboard/nx02/stock-take/` (new + [id]) | UI 路由 | 盤點 | ✅ 搬到 `dashboard/nx03/stock-take` | 對應 stocktake controller（已 impl） |
| 9 | `app/dashboard/nx02/transfer/` (new + [id]) | UI 路由 | 調撥 | ✅ 搬到 `dashboard/nx03/transfer` | 對應 transfer controller（已 impl + D3） |
| 10 | `app/dashboard/nx02/stock-setting/` | UI 路由 | 安全量設定 | ✅ 搬到 `dashboard/nx03/stock-setting` | 對應 Nx03PartStockSetting |
| 11 | `app/dashboard/nx02/shortage/` | UI 路由 | 缺貨 | ✅ 搬到 `dashboard/nx03/shortage` | 對應 Nx03Shortage（PLUS） |
| 12 | `app/dashboard/nx02/auto-replenish/` | UI 路由 | 自動補貨 | ✅ 搬到 `dashboard/nx03/auto-replenish` | 對應 Nx03AutoReplenish（PLUS） |
| 13 | `app/dashboard/nx02/domestic/` | UI 路由 | 國內庫存 | ⚠️ Crown 拍板 | 業務語意 vs balance 差異不明 |
| 14 | `app/dashboard/nx02/import/` | UI 路由 | 進口庫存 | ⚠️ Crown 拍板 | 「進口」業務語意 vs 採購進貨 RR 區隔不明 |
| 15 | `app/dashboard/nx02/special/` | UI 路由 | 特殊處理 | ⚠️ Crown 拍板 | 業務語意不明 |
| 16 | `app/dashboard/nx02/product/` | UI 路由 | 商品 | ⚠️ Crown 拍板 | 應該在 NX01 主檔、為何在 nx02？ |
| 17 | `app/dashboard/nx02/vendor/` | UI 路由 | 供應商 | ⚠️ Crown 拍板 | 應該在 NX01 主檔（partner_type=V）或新 NX02 採購 |
| 18 | `features/nx02/balance/` (api+hooks+ui) | UI feature | 即時庫存 | ✅ 搬到 `features/nx03/balance/` | 配合 #5 路由搬遷 |
| 19 | `features/nx02/ledger/` | UI feature | 異動帳冊 | ✅ 搬到 `features/nx03/ledger/` | 配合 #6 |
| 20 | `features/nx02/init/` | UI feature | 開帳單 | ✅ 搬到 `features/nx03/init/` | 配合 #7 |
| 21 | `features/nx02/stock-take/` | UI feature | 盤點 | ✅ 搬到 `features/nx03/stock-take/` | 配合 #8 |
| 22 | `features/nx02/transfer/` | UI feature | 調撥 | ✅ 搬到 `features/nx03/transfer/` | 配合 #9 |
| 23 | `features/nx02/stock-setting/` | UI feature | 安全量設定 | ✅ 搬到 `features/nx03/stock-setting/` | 配合 #10 |
| 24 | `features/nx02/shortage/` | UI feature | 缺貨 | ✅ 搬到 `features/nx03/shortage/` | 配合 #11 |
| 25 | `features/nx02/auto-replenish/` | UI feature | 自動補貨 | ✅ 搬到 `features/nx03/auto-replenish/` | 配合 #12 |
| 26 | `features/nx02/dashboard/` (Nx02DashboardPage + Nx02StatCard) | UI feature | 庫存儀表板 | ✅ 搬到 `features/nx03/dashboard/`（含 class 改名） | InventoryCenterHub 也在 import 它 |
| 27 | `features/nx02/shared/` (PartLookupAutocomplete / PlanUpgradePrompt) | UI feature | 共用元件 | 🟡 評估：搬 `features/_shared/` | 不一定屬 NX03、跨模組共用 |
| 28 | `features/layout/config/menu.nx02.ts` | UI config | 庫存 menu（半搬遷）| 🟡 改名 + 修內容 | 改為 `menu.nx03.ts`、函數重命名 + 移除舊檔 |
| 29 | `components/home/dock.tsx` (14 行 nx02 active + 4 DockSubLink) | UI shell | 庫存入口 dock | ✅ 全部改 `/dashboard/nx03/*` | 配合路由搬遷 |
| 30 | `features/inventory/ui/InventoryCenterHub.tsx` (5 行 nx02 href + 1 import) | UI hub | 庫存 hub | ✅ 改成 nx03 路徑 + nx03 import | 新殼舊心需修正 |
| 31 | `app/dashboard/nx01/page.tsx` (`redirect('/dashboard/nx02/domestic')`) | UI redirect | 預設 redirect | ✅ 改 `/dashboard/nx03/...` | 入口修正 |

---

## 表 2：舊 NX03 銷貨殘留盤點

| # | 殘留位置 | 性質 | 業務語意 | 推薦 | 理由 |
|---|---|---|---|---|---|
| 1 | `Nx03*` 20 個 model | schema | 全庫存、0 銷貨 | — | 無殘留、不適用 |
| 2 | `apps/nx-api/src/nx03/*` 7 子模組 | backend | 全庫存 | — | 無殘留、不適用 |
| 3 | `features/nx03/sales/SalesFlowHub.tsx` (1064 行) | UI component | 銷貨工作流 hub | 🟡 廢棄 | 0 處外部引用、孤兒 code、`features/sales/` 已建（雖也孤兒）|
| 4 | `features/nx03/workflow/types.ts` | UI types | Workflow 型別 | 🟡 廢棄 | workflow 整批未被使用 |
| 5 | `features/nx03/workflow/mock/{documentsBrowse,operation,workbench}.mock.ts` | UI mock | 3 個 mock data | 🟡 廢棄 | 同上 |
| 6 | `features/nx03/workflow/ui/SalesDocumentsBrowse.tsx` | UI component | 銷貨單據瀏覽 | ⚠️ Crown 拍板 | 1064 行設計資產、可能有保留價值搬到 `features/sales/` |
| 7 | `features/nx03/workflow/ui/SalesOperationWorkspace.tsx` | UI component | 銷貨操作工作台 | ⚠️ Crown 拍板 | 同上 |
| 8 | `features/nx03/workflow/ui/SalesOrderWorkspace.tsx` | UI component | 銷貨單工作台 | ⚠️ Crown 拍板 | 同上 |
| 9 | `features/nx03/workflow/ui/SalesWorkflowPage.tsx` | UI component | 銷貨工作流 page | ⚠️ Crown 拍板 | 同上 |
| 10 | `features/nx03/workflow/ui/WorkflowQuickActions.tsx` | UI component | 快捷動作 | ⚠️ Crown 拍板 | 通用 workflow component、可能跨模組保留 |
| 11 | `features/nx03/workflow/ui/WorkflowStepBar.tsx` | UI component | Step bar | ⚠️ Crown 拍板 | 同上 |
| 12 | `features/nx03/workflow/ui/WorkflowStepPanel.tsx` | UI component | Step panel | ⚠️ Crown 拍板 | 同上 |
| 13 | `features/layout/config/menu.nx03.ts` | UI config | 銷貨 menu（半搬遷）| 🟡 改名 + 修內容 | 改為 `menu.nx04.ts`、函數重命名 |
| 14 | `app/dashboard/nx04/{customer,domestic,export}/page.tsx` 3 個 | UI 路由 | NX04 銷貨入口 | 🟡 placeholder、保留外殼 | 3/3 是 NxWorkspacePlaceholder、待 NX04 規格書落地後實作 |
| 15 | `features/sales/SalesCenterHub.tsx` | UI component | 銷貨中心 hub（替代候選）| ⚠️ Crown 拍板 | 0 處引用、跟 SalesFlowHub 並存、需擇一 |
| 16 | `feature/nx03-sales-flow-hub` git branch | git branch | pivot 前命名歷史 | 🟡 文件揭露即可 | branch 已 merge main 可刪除（git-state.md 已標記） |

---

## 搬遷地圖（總計）

| 類別 | 數量 | 範圍 |
|---|---|---|
| ✅ **搬到 NX03 候選** | **17** | 表 1 #5~#12（8 路由）+ #18~#26（9 feature）+ #29~#31（3 shell） = 20、扣減重複統計（#5~#12 對應 #18~#26）= 純獨立操作 17 |
| ✅ 搬到 NX04 候選 | **0** | 表 2 NX04 placeholder 不算「搬遷」（待規格書落地實作） |
| 🟡 廢棄候選 | **5** | 表 2 #3, #4, #5（含 3 個 mock）= 5（孤兒 code 整批） |
| ⚠️ 需 Crown 拍板 | **15** | 表 1 #13~#17（5 路由業務語意不明）+ #27（features/shared 歸屬）+ #28（menu 改名策略） = 7、表 2 #6~#12（7 個 workflow component 是否保留搬 sales/）+ #15（哪個 SalesHub 留）= 8 |

---

## 搬遷批次拍板建議（給 Alex 整合用）

### Batch-1（純物理搬移、業界 muscle memory 清晰）
🎯 ✅ 17 項一次性搬：8 庫存路由 + 9 庫存 feature 子模組 + 3 UI shell（dock / InventoryCenterHub / nx01 redirect）
- 風險：低（路徑改名 + import 改名、業務語意 100% 對齊）
- 工作量：估 ~30 檔修改、1~2 commit

### Batch-2（業務語意不明、Crown 拍板優先）
⚠️ 7 路由 + UI config：
- domestic/import/special 三大「庫存類型」業務區分
- product/vendor 應屬 NX01 主檔 還是 新 NX02 採購？
- menu.nx02.ts → menu.nx03.ts 改名 + 函數重命名策略

### Batch-3（銷貨孤兒整批處置）
🟡 廢棄 features/nx03/sales + workflow（13 檔孤兒）
- 或 ⚠️ Crown 拍板：搬到 `features/sales/` 保留設計資產
- 議題：跟 `features/sales/SalesCenterHub.tsx` 並存、需擇一

### Batch-4（backlog、NX04 規格書落地後）
- `/dashboard/nx04/*` 3 placeholder 等規格書
- `menu.nx03.ts` → `menu.nx04.ts` 改名同步

---

## 補充揭露：⚠️ pivot 半搬遷風險

1. **`menu.nx02.ts` 函數名 = `getNx02SideMenu`、實際指向 NX03 路徑** → 任何 grep `nx02` 看似搜舊庫存、實際命中新庫存 menu config，認知負擔高
2. **同檔內 3 個編號**：函數名（nx02）+ 檔頭描述（nx03）+ href（nx03）+ group label（庫存管理）→ 4 層語意、有 1 層舊
3. **重複 menu 風險**：menu.nx02.ts 已半搬到 NX03，但 `menu.nx03.ts` 也指向新 NX04（銷貨），那 NX04 對應 menu 又是哪一個？**全 menu 配置全是半搬遷狀態**（從 menu.nx01 ~ menu.nx04 全是同樣模式、本檔僅深掘庫存主軌、其他模組未驗）
4. **`/dashboard/nx02/*` 13 條 production 路由還在用**（dock.tsx active + 4 DockSubLink 證實），搬遷時不能直接 rm、需做 redirect

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記：本檔輸出紀律對齊

- 純諮詢、不開工任何 commit、不切分支、留 main ✓
- A041 精確 count：Nx02 model 13、nx02 子模組 5、shared 5、migration 4、menu 1、dashboard/nx02 路由 13、features/nx02 9 子模組 ✓
- §G.9 verify 通配 grep：`find apps/nx-api/src/nx02 -type d` + `find apps/nx-ui/src -path "*nx02*"` + `grep -l nx02_stock` ✓
- §I.6.3 揭露不完整：每段尾 ⚠️ 註記 ✓
- 真實 main HEAD verify：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 不深掘 pivot 全歷史、聚焦庫存主軌 + 銷貨保留判斷 ✓
- 本檔位置：`docs/nx03/nx03-audit-02.md`（諮詢產出、未 commit、Crown 拍板後再決定）

**下一步**：Alex 整合 → 列「搬遷批次拍板」（Batch-1 一次性搬 / Batch-2 業務語意拍板 / Batch-3 銷貨孤兒處置 / Batch-4 NX04 backlog）→ 後續進 NX03 範圍 A 主軌（overview + 第一份子規格書）。
