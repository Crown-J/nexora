<!-- docs/_team/system-routes-survey.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：全線路重整 階段 A 測繪報告（Hank 給 CTO）。純盤點不動工。
     範圍：apps/nx-ui + apps/nx-api + packages/db-core；五份清單；所有計數實際 grep。 -->

# 系統線路測繪（2026-06-10）

> 階段 A：純測繪、不刪、不改、不搬、不改名。
> 分支：`chore/cleanup-phase3`、撰寫者：Hank。
> 工具：Grep / Glob / Read（不含 fs 變更）。

---

## 0. 白話摘要

### 0.1 線路現況（一段話）

NEXORA 前端走 Next.js App Router，**路由分兩種風格並存**：一種露 NX 代碼（`/dashboard/nx02/...`、`/dashboard/nx06/...`），一種用業務中文名（`/dashboard/inventory`、`/dashboard/purchase`、`/dashboard/sale`、`/dashboard/finance`、`/dashboard/report`、`/dashboard/base`）。LITE 完整版收尾時做過一輪「URL 收斂」，把 `/dashboard/nx01`、`/nx02`、`/nx04` 的根頁面改成 redirect 出去；但**子頁與 5 個模組（nx06/nx07/nx09/nx10/nx05 子頁/nx08 子頁/nx02 子頁/nx04 子頁/nx03）尚未改名**，仍露代碼。

### 0.2 最大的三個問題

1. **客戶端 URL 大面積露 NX 代碼**：共 **102 條活躍頁面** + **4 條 root redirect** 露代碼，全 repo 被引用 **372 次**（hardcoded 在程式裡的字串）。改名工程量集中在 nx02（95 次）、nx08（60 次）、nx04（43 次）、nx06（36 次）、nx03（37 次）四大區。
2. **前端 features/nxXX 跟後端 nx-api/nxXX 的語意不一致**：
   - 後端 `nx01` = 主檔系統（51 子模組），前端 `features/nx01` = 採購（PO/RFQ/RR 為主、混散主檔）
   - 後端 `nx02` = 採購/進貨（13 子模組），前端 `features/nx02` = 庫存操作（transfer/stock-take/balance/ledger 為主）
   - 同代號雙重語意、新進 AI 接手會被誤導。
3. **舊 hub 死碼 + 業務名/NX 並存**：4 個 feature 0 外部引用（`finance`、`report`、`sales`、`nx06`）；同時 `features/inventory` 跟 `features/nx02`、`features/sale` 跟 `features/nx03 sales`、`features/nx01 procurement` 跟 `features/purchase` 都各有一套、業務語意重疊。

### 0.3 意料外的線路問題（⚠️）

- `/dashboard/nx01/page.tsx` 的 redirect 目標是 `/dashboard/nx02/domestic` ── 從露代碼 URL 跳到另一條露代碼 URL（且 nx02 已 redirect 到 purchase/domestic）── 兩次跳轉。
- `features/nx01` 包含採購（po/pr/rfq/rr/procurement）+ 散主檔（customer-grade/engine/model/phonetic-dictionary/vehicle-classification）混雜在一起、命名不貼業務。
- `features/nx03` 內容是「銷貨流程 workflow」+「stock-balance」混雜（同一資料夾下兩個不同業務領域）。
- `features/inventory/workspace/ui/InventoryWorkspacePage.tsx` 同時引用 `@/features/nx02` 跟 `@/features/nx03`（庫存 hub 跨吃兩個 NX 領域）── 業務歸屬不純。
- 主檔 UI 散在 7 個 feature 資料夾（`base` / `master-shell` / `master-zones` / `part-zoned` / `partner-zoned` / `user-zoned` / `warehouse-zoned`）。

---

## 1. 清單 1：前端 feature 全表

> 位置：`apps/nx-ui/src/features/`、共 **31 個 feature**、總計 **611 個 .ts/.tsx 檔**。
> 「外部引用」= 該 feature 被本資料夾**外**的程式 `import` 的次數（grep `from '@/features/<name>'` 排除 self）。
> 計數方式：`Grep` `from ['\"]@/features/<name>(/|['\"])`、`files_with_matches`。

| 名稱 | 角色（一句話） | 檔數 | 外部引用 | 狀態 |
|---|---|---:|---:|:---|
| `auth` | 登入/session/權限 hooks/demo-session | 9 | 多處 (26 檔含 self) | ✅ 現役 |
| `base` | 主檔 UI 主層（NX01 模組各 master view）| 64 | 多處 (68 檔含 self) | ✅ 現役 |
| `finance` | `FinanceCenterHub.tsx`（單檔、舊財務 hub）| 1 | **0** | ⛔ **死碼**（被取代：`app/dashboard/finance/page.tsx` 自己畫 hub）|
| `home-dashboard` | 首頁 dashboard + 指標選擇 modal + task panel | 13 | 1 (sys-dashboard) | ✅ 現役 |
| `inventory` | LITE 庫存操作（撿/包/送/收/盤/廢/位置/查/init/conv/部位/ledger）| 47 | 多處 (36 檔含 self) | ✅ 現役 |
| `layout` | 全局 UI 殼（DashboardShell / dock / side-menu / BusinessTopNav / TopModuleTabs / MobileFab / menu.nx01~10 config）| 26 | 多處 (89 檔含 self) | ✅ 現役 |
| `master-shell` | 主檔通用殼（ErpToolbar / EntityPickerDialog / EntityMasterPage / config）| 17 | 多處 (44 檔含 self) | ✅ 現役 |
| `master-zones` | 主檔分區配置（part/partner/user/warehouse zones）| 6 | 多處 (12 檔含 self) | ✅ 現役 |
| `nx01` | **採購**（po/pr/rfq/rr/procurement）+ 散主檔（customer-grade/engine/model/phonetic-dictionary/vehicle-classification/dashboard）| 39 | 12 外部（含 `app/dashboard/purchase/*`、`base/part-model`）| ✅ 現役 ⚠️ 命名違背（內容是採購、不是主檔） |
| `nx02` | **庫存操作**（transfer/stock-take/stock-setting/balance/ledger/init/auto-replenish/shortage/qt/rfq-greeting-template/warranty-claim/dashboard）| 52 | 多處 (21 檔含 self) | ✅ 現役 ⚠️ 命名違背（內容是庫存、不是進貨） |
| `nx03` | 銷貨流程 workflow + stock-balance（兩塊混在一起）| 13 | 6 外部（sale/so 引、nx01/rr 引）| 🟡 **新舊並存** + 命名混雜（sales 部份跟 `features/sale` 並存、stock-balance 跟 `features/inventory` 並存） |
| `nx05` | 財務 workbench（ar/ap/allowance/closing/note + 對應 dialogs）| 11 | 多處 (15 檔含 self) | ✅ 現役 |
| `nx06` | `push-subscription.ts`（單檔、僅自身 re-export）| 1 | **0** | ⛔ **死碼**（已知，先前盤點已標記）|
| `nx08` | 報表（6 張：個人月報/進貨/銷售/庫存/損益/營運 + common）| 9 | 多處（含 `app/dashboard/report/*`）| ✅ 現役 |
| `nx98` | task-pool（待辦池）| 2 | 1（`app/dashboard/task-pool`）| ✅ 現役 |
| `page-guide` | 引導精靈 provider + AutoPageGuide | 6 | 2（layout/DashboardShell + settings/wizard）| ✅ 現役 |
| `part-zoned` | 零件主檔分區頁（PartZonedPage / PartFormZoned / StockSettingsSatellite）| 5 | 3（base/parts page、purchase/product page、sale/product/master page）| ✅ 現役 |
| `partner-zoned` | 往來戶主檔分區頁（PartnerMasterPage / PartnerFormZoned）| 4 | 4（base/partners、purchase/vendor、sale/customer/info、nx05/AccountManagementView）| ✅ 現役 |
| `platform` | 平台管理員殼（PlatformShell / api client）| 4 | 6（app/platform 整區）| ✅ 現役 |
| `purchase` | 採購中心 hub UI（PurchaseCenterHub）| 17 | 4（app/dashboard/purchase 4 個次頁）| ✅ 現役 |
| `report` | `ReportCenterHub.tsx`（單檔、舊報表 hub）| 1 | **0** | ⛔ **死碼**（被取代：`app/dashboard/report/page.tsx` 自己畫 hub）|
| `sale` | 銷貨（so/qt/bundle/promotion/return/sales-return/partner-grade-history/inquiry/sop-workspace）| 80 | 多處（31 檔含 self）| ✅ 現役 |
| `sales` | `SalesCenterHub.tsx`（單檔、舊銷貨 hub）| 1 | **0** | ⛔ **死碼**（被取代：`features/sale/ui/hub/SalesHubMobile.tsx` + dock）|
| `satellite` | 衛星元件範式 | 1 | 5（4 個 zoned form + 1 part form）| ✅ 現役 |
| `settings` | 設定（role 編輯）| 4 | 2（app/dashboard/settings/roles 2 頁）| ✅ 現役 |
| `shared` | 共用 master/lookup/api client/hooks/role-view | 49 | 多處 (118 occ / 62 檔) | ✅ 現役 |
| `sys-admin` | 開戶後台（platform 客戶 detail + onboarding）| 3 | 2（app/platform/customers、onboarding）| ✅ 現役 |
| `sys-dashboard` | 系統 dashboard（DashboardHomePlanContext / Pro/Plan toggles / ProNx10LeftPanel）| 10 | 4（dock/top-bar/NxPaletteHydration/app dashboard page）| ✅ 現役 |
| `user-zoned` | user 主檔分區頁 | 4 | 1（base/users page）| ✅ 現役 |
| `warehouse-zoned` | warehouse 主檔分區頁 | 4 | 1（base/warehouses page）| ✅ 現役 |
| `wizard` | 設定精靈 framework | 2 | 2（layout/DashboardShell + settings/wizard）| ✅ 現役 |

**死碼小計：4 個 feature、4 個檔（finance、report、sales、nx06）**

---

## 2. 清單 2：客戶端 URL ↔ 內部模組 完整對照表

> 位置：`apps/nx-ui/src/app/`。
> 三個頂層：`/login`、`/change-password`、`/coming-soon`、`/pricing` + `/dashboard/*`（21 個次目錄）+ `/sys-admin` + `/platform/*`。
> 重點：列出 **/dashboard 子路由的露 NX 代碼狀況** + **被源碼引用次數**（grep `/dashboard/nx0X`）。

### 2.1 頂層路由

| URL | 對應內部 | 露 NX | 引用次數 |
|---|---|:---:|---:|
| `/login` | `features/auth`（login API + me）| ❌ | （N/A）|
| `/change-password` | `app/change-password` | ❌ | （N/A） |
| `/coming-soon` | `app/coming-soon` | ❌ | （N/A） |
| `/pricing` | `app/pricing` | ❌ | （N/A） |
| `/sys-admin` | `app/sys-admin` | ❌ | （N/A） |
| `/platform/login` | `features/platform`、`features/auth` | ❌ | （N/A） |
| `/platform/change-password` | `features/platform` | ❌ | （N/A） |
| `/platform/customers` + `/platform/customers/[id]` + `/platform/onboarding` | `features/platform` + `features/sys-admin` | ❌ | （N/A） |
| `/dashboard` | `features/sys-dashboard` + `features/home-dashboard` | ❌ | （N/A） |

### 2.2 /dashboard 子路由（業務名 URL、不露代碼）

| URL prefix | pages | 對應 feature | 對應後端 |
|---|---:|---|---|
| `/dashboard/base/*` | 42 | `features/base` + `features/master-shell` + `features/*-zoned` | `nx01` |
| `/dashboard/inventory/*` | 31 | `features/inventory` + `features/nx02`（混引）| `nx03` |
| `/dashboard/purchase/*` | 20 | `features/purchase` + `features/nx01` | `nx02` |
| `/dashboard/sale/*` | 30 | `features/sale` + 部份 `features/nx03/workflow` | `nx04` |
| `/dashboard/finance/*` | 2 | `features/nx05`（hub 連 `/dashboard/nx05/*`）| `nx05` |
| `/dashboard/report/*` | 7 | `features/nx08`（hub 連 `/dashboard/nx08/*`）| `nx08` |
| `/dashboard/settings/*` | 5 | `features/settings` + `features/wizard` | `nx01`（role）|
| `/dashboard/auto-replenish` | 1 | `features/inventory`、`features/nx02` | `nx03` |
| `/dashboard/owner/grade-approvals` | 1 | `features/sale` | `nx04` |
| `/dashboard/task-pool` | 1 | `features/nx98` | `nx98` |
| `/dashboard/tiered-form-demo` | 1 | `features/nx02`、`features/shared` | （demo） |

### 2.3 /dashboard 子路由（**露 NX 代碼**、需收斂）⚠️

| URL prefix | pages | 業務領域 | 對應前端 feature | 對應後端 | **源碼引用次數** | root redirect? |
|---|---:|---|---|---|---:|:---|
| `/dashboard/nx01/*` | 2 | 採購（root redirect）+ stock-replenishment | `features/nx01` | `nx01`（master）/ `nx02`（purchase）| **6** | ✅ root → `/dashboard/nx02/domestic` ⚠️（自己跳到另一條露代碼）|
| `/dashboard/nx02/*` | 20 | 進貨/庫存（多）| `features/nx02` + `features/nx01` | `nx02`（purchase）| **95** | ✅ root → `/dashboard/purchase/domestic` |
| `/dashboard/nx03/*` | 4 | 銷貨/庫存（混）| `features/nx03` + `features/inventory` | `nx03`（inventory）| **37** | ✅ root → `/dashboard/nx03/workspace`（仍露代碼）|
| `/dashboard/nx04/*` | 8 | 銷貨 | `features/sale` + `features/nx03/workflow` | `nx04`（sales）| **43** | ✅ root → `/dashboard/sale/so` |
| `/dashboard/nx05/*` | 6 | 財務（workspace + 5 工作台）| `features/nx05` | `nx05`（finance）| **29** | ❌ 無 root |
| `/dashboard/nx06/*` | 12 | 配送 | （無對應 feature/nx06、直接用 hooks/components）| `nx06`（delivery）| **36** | ❌ 無 root |
| `/dashboard/nx07/*` | 8 | HR | （無對應 feature/nx07、直接用 hooks/components）| `nx07`（HR）| **20** | ❌ 無 root |
| `/dashboard/nx08/*` | 23 | 報表 | `features/nx08` | `nx08`（BI）| **60** | ❌ 無 root |
| `/dashboard/nx09/*` | 10 | KM | （無對應 feature/nx09、直接用 hooks/components）| `nx09`（KM）| **23** | ❌ 無 root |
| `/dashboard/nx10/*` | 10 | 遊戲化 | （無對應 feature/nx10、直接用 hooks/components）| `nx10`（gamification）| **23** | ❌ 無 root |

**露 NX 代碼小計**：
- 活躍頁面：**102 條**（不含 4 條 root redirect 自身）
- root redirect 自身：4 條（nx01/nx02/nx03/nx04）
- **總引用次數 = 6+95+37+43+29+36+20+60+23+23 = 372 次**（含 `mocks/dashboard.ts`、`features/layout/config/menu.nx0X.ts`、`features/layout/ui/TopModuleTabs.tsx`、`components/home/dock.tsx` 等）

### 2.4 露 NX 代碼 URL 集中標記（依量級排序）

| 區段 | pages | 引用 | 業務名 | 改名工程量 |
|---|---:|---:|---|---|
| `/dashboard/nx02/*` | 20 | 95 | 進貨 → 建議改 `/dashboard/purchase/*`（部份子頁如 `transfer/stock-take/balance/ledger/init` 屬庫存、應改 `/dashboard/inventory/*`）| 🔴 最大 |
| `/dashboard/nx08/*` | 23 | 60 | 報表 → 建議改 `/dashboard/report/*` | 🔴 大 |
| `/dashboard/nx04/*` | 8 | 43 | 銷貨 → 建議改 `/dashboard/sale/*` | 🟠 中 |
| `/dashboard/nx03/*` | 4 | 37 | 銷貨/庫存 → 建議拆 `/dashboard/sale/*` 跟 `/dashboard/inventory/*` | 🟠 中 |
| `/dashboard/nx06/*` | 12 | 36 | 配送 → 建議改 `/dashboard/delivery/*`（無業務名 URL 可選）| 🟠 中 |
| `/dashboard/nx05/*` | 6 | 29 | 財務 → 建議改 `/dashboard/finance/*` | 🟡 小 |
| `/dashboard/nx09/*` | 10 | 23 | KM → 建議改 `/dashboard/km/*` 或 `/dashboard/knowledge/*` | 🟡 小 |
| `/dashboard/nx10/*` | 10 | 23 | 遊戲化 → 建議改 `/dashboard/incentive/*` 或 `/dashboard/reward/*` | 🟡 小 |
| `/dashboard/nx07/*` | 8 | 20 | HR → 建議改 `/dashboard/hr/*` | 🟡 小 |
| `/dashboard/nx01/*` | 2 | 6 | 採購 root（已 redirect）→ 直接刪 nx01/page.tsx + 改 stock-replenishment 路徑 | 🟢 最小 |

---

## 3. 清單 3：後端模組對照

> 位置：`apps/nx-api/src/`、共 **19 個頂層目錄**（含 `__tests__`、`prisma`、`public-files`、`shared`、`auth`、`platform-auth`、`platform-tenants`、`sys-admin` + nx01~10 + nx98 + nx99）。
> 子模組數量計：`apps/nx-api/src/<module>/*/` 一級子資料夾。

| 後端模組 | 子模組數 | 業務領域 | 對應前端 feature | 對應 URL |
|---|---:|---|---|---|
| `nx01` | 51 | **主檔系統**（brand / part / partner / user / role / warehouse / location / model / engine / drivetrain / transmission / country / currency / customer-grade / supplier-grade / phonetic-dictionary / region / site / team / department / discount-code / bulletin / part-compat-group / part-relation / part-model / part-photo / part-version / part-group / partner-address / partner-contact / permission / role-view / user-photo / user-pref / user-role / user-team / user-warehouse / view / warehouse-type / address-catalog / calendar-event）| `features/base` + `features/master-shell` + `features/master-zones` + `features/*-zoned` + `features/nx01`（散主檔部份）| `/dashboard/base/*` |
| `nx02` | 13 | **採購/進貨**（demand / partner-part / po / price-comparison / purchase-return / purchase-stage / purchase-suggestion / qt / rfq / rfq-greeting-template / rr / warranty-claim）| `features/nx01`（po/pr/rfq/rr/procurement）+ `features/purchase` + `features/nx02`（部份：qt/rfq-greeting-template/warranty-claim/shortage/auto-replenish）| `/dashboard/purchase/*` + `/dashboard/nx02/*` |
| `nx03` | 18 | **庫存**（auto-replenish / brand-allocation-rule / conversion / disposal / inbound / init / issue-report / outbound / parcel / part-stock-setting / pk / pl / stock-balance / stock-ledger / stock-query / stock-reservation / stocktake / transfer）| `features/inventory` + `features/nx02`（transfer/stock-take/init/balance/ledger）+ `features/nx03/stock-balance` | `/dashboard/inventory/*` + `/dashboard/nx02/*`（部份）+ `/dashboard/nx03/*` |
| `nx04` | 10 | **銷貨**（bundle / co-estimate / credit-guard / issue-report / partner-grade-history / promotion / quote / sales-performance / sales-return / so）| `features/sale` + `features/nx03/workflow` + `features/nx03/sales` | `/dashboard/sale/*` + `/dashboard/nx04/*` |
| `nx05` | 11 | **財務**（account-code / allowance / ap / ar / ar-statement / note / overdue-watcher / paylog / payment / period-close / receipt）| `features/nx05` | `/dashboard/finance/*` + `/dashboard/nx05/*` |
| `nx06` | 13 | **配送/物流**（delivery / dispatch / dn-ops / driver-mobile / dto / dynamic-handover / intl-shipping / lalamove-integration / pickup / printer-integration / return-pickup / route-optimization / web-push）| （無 features/nx06 有效 feature；hooks/components 直接用 API client）| `/dashboard/nx06/*` |
| `nx07` | 9 | **HR/人資**（attendance / employee-change / leave / medical / overtime / payroll / performance / salary-accrual / training）| （無 features/nx07；hooks/components 直接用 API client）| `/dashboard/nx07/*` |
| `nx08` | 6 | **BI/報表**（daily-report / dashboard / etl / kpi-record / kpi-target / monthly-report）| `features/nx08` | `/dashboard/report/*` + `/dashboard/nx08/*` |
| `nx09` | 8 | **KM/知識管理**（article / document / fulltext-search / meeting / repair-sop / sub-tables / system-manual / vin-lookup）| （無 features/nx09；直接用 API client）| `/dashboard/nx09/*` |
| `nx10` | 10 | **遊戲化/激勵**（checkin / exp / leaderboard / medals / mentorship / promotion / sprint / surprise-box / tasks / team-task）| （無 features/nx10；直接用 API client）| `/dashboard/nx10/*` |
| `nx98` | 1 | **跨模組共用**（task-pool）| `features/nx98` | `/dashboard/task-pool` |
| `nx99` | 3 | **平台層**（feature-flag / subscription / tenant）| `features/platform`、`features/sys-admin`（部份）| `/platform/*` |
| `auth` | 5 | 一般使用者登入 | `features/auth` | `/login`、`/api/auth/*` |
| `platform-auth` | 5 | 平台管理員登入 | `features/platform` | `/platform/login` |
| `platform-tenants` | 4 | 平台管理員 ↔ 租戶管理 | `features/platform` + `features/sys-admin` | `/platform/customers/*` |
| `prisma` | 2 | Prisma client / migrations service | （後端內部）| – |
| `public-files` | 2 | 公開檔案上傳/讀取 | `features/shared/api` | – |
| `shared` | 99 / 18 子模組 | guards / RBAC / decorators / errors / filters / file-upload / nx01~10 共用 service / plan / workflows | 多處 | – |
| `sys-admin` | 4 | 開戶後台（importer / onboarding / system-param / wizard）| `features/sys-admin` + `features/wizard` | `/dashboard/settings/*` |

**packages/db-core/prisma/schema.prisma**：單檔 197 models（無模組化拆檔）。

---

## 4. 清單 4：新舊命名並存點總清單

> 列出所有「兩套（或多套）名字並存」的情況。判定「該收斂」需 CTO 確認業務語意是否真的等價。

### 4.1 確定該收斂（單側 0 引用、純死殼）

| 並存點 | 哪兩個 | 該留 | 該廢 | 理由 |
|---|---|---|---|---|
| 1 | `features/sale` ✅ vs `features/sales` ⛔ | `sale` | `sales` | `sales/ui/SalesCenterHub.tsx` 0 外部引用、已被 `features/sale/ui/hub/*` 取代 |
| 2 | `features/nx05`（財務 workbench）vs `features/finance` ⛔ | `nx05`（或更名 `finance`）| `finance/ui/FinanceCenterHub.tsx` | `finance` 0 外部引用、hub 已搬 `app/dashboard/finance/page.tsx` |
| 3 | `features/nx08`（報表）vs `features/report` ⛔ | `nx08`（或更名 `report`）| `report/ui/ReportCenterHub.tsx` | `report` 0 外部引用、hub 已搬 `app/dashboard/report/page.tsx` |

### 4.2 兩套都活、需 CTO 評估業務語意

| 並存點 | 哪幾個 | 待收斂？ | 建議方向 |
|---|---|:---:|---|
| 4 | `features/inventory`（47 檔，LITE 操作）+ `features/nx02`（52 檔，stock-take/transfer/balance/ledger/init）| 🟡 是 | 兩個都是庫存業務、建議整併到 `features/inventory/{operations,documents,settings,...}` |
| 5 | `features/nx01`（採購 po/pr/rfq/rr + 散主檔）+ `features/purchase`（17 檔僅 hub UI）| 🟡 是 | 把 `features/nx01/{po,pr,rfq,rr,procurement}` 搬到 `features/purchase/`、把散主檔（customer-grade/engine/model/phonetic-dictionary/vehicle-classification）搬 `features/base/` |
| 6 | `features/sale`（80 檔）+ `features/nx03/workflow`（10 檔 sales workflow）+ `features/nx03/sales` | 🟡 是 | nx03 內銷貨相關搬 `features/sale/` |
| 7 | `features/nx03/stock-balance` + `features/inventory/*` | 🟡 是 | nx03/stock-balance 搬 `features/inventory/` |
| 8 | `features/base` + `features/master-shell` + `features/master-zones` + `features/part-zoned` + `features/partner-zoned` + `features/user-zoned` + `features/warehouse-zoned`（共 7 個主檔相關 feature）| 🟢 部份 | `master-shell` 屬通用 shell（保留）；`*-zoned` + `master-zones` 是分區範式、可整併到 `features/base/zoned/*` 或留分（看 CTO 判定 zoned 是否該獨立）|

### 4.3 同代號雙語意（命名衝突）

| 並存點 | 並存項 | 待收斂？ | 建議方向 |
|---|---|:---:|---|
| 9 | 後端 `nx01` = 主檔 vs 前端 `features/nx01` = 採購 | 🔴 是 | 前後端 NX 編號該對齊；建議前端 `features/nx01` 改名 `features/purchase/`（內容移過去）|
| 10 | 後端 `nx02` = 採購 vs 前端 `features/nx02` = 庫存 | 🔴 是 | 同上；前端 `features/nx02` 改名 `features/inventory/`（合併到既有 `features/inventory/`）|
| 11 | 後端 `nx03` = 庫存 vs 前端 `features/nx03` = 銷貨 workflow + stock-balance | 🔴 是 | 拆分（sales workflow 搬 `features/sale/`、stock-balance 搬 `features/inventory/`）、`features/nx03` 整個刪 |

### 4.4 URL 雙路徑並存

| 並存點 | URL 雙存 | 待收斂？ | 建議方向 |
|---|---|:---:|---|
| 12 | `/dashboard/purchase/*` + `/dashboard/nx01/*`（2 頁、root 已 redirect）+ `/dashboard/nx02/*`（20 頁，多為進貨）| 🔴 是 | 全部歸 `/dashboard/purchase/*`，nx02 內非進貨子頁（transfer/stock-take/balance/ledger/init）搬 `/dashboard/inventory/*` |
| 13 | `/dashboard/sale/*` + `/dashboard/nx04/*`（8 頁、root 已 redirect）+ `/dashboard/nx03/*`（部份 sales workflow）| 🔴 是 | 全部歸 `/dashboard/sale/*` |
| 14 | `/dashboard/finance/*`（hub）+ `/dashboard/nx05/*`（6 工作台）| 🟠 是 | 全部歸 `/dashboard/finance/*` |
| 15 | `/dashboard/report/*`（hub）+ `/dashboard/nx08/*`（23 子頁）| 🟠 是 | 全部歸 `/dashboard/report/*` |
| 16 | `/dashboard/inventory/*`（31 頁、LITE 操作）+ `/dashboard/nx02/*` 庫存部份 + `/dashboard/nx03/*` 庫存部份 | 🔴 是 | 全部歸 `/dashboard/inventory/*` |
| 17 | `/dashboard/nx06/*`（配送 12 頁）→ 無業務名 URL | 🟠 是 | 建議建立 `/dashboard/delivery/*` 或 `/dashboard/logistics/*`（業務名待 CTO 拍板）|
| 18 | `/dashboard/nx07/*`（HR 8 頁）→ 無業務名 URL | 🟠 是 | 建議建立 `/dashboard/hr/*` |
| 19 | `/dashboard/nx09/*`（KM 10 頁）→ 無業務名 URL | 🟠 是 | 建議建立 `/dashboard/km/*` 或 `/dashboard/knowledge/*` |
| 20 | `/dashboard/nx10/*`（遊戲化 10 頁）→ 無業務名 URL | 🟠 是 | 建議建立 `/dashboard/incentive/*` 或類似業務名（CTO 拍板）|

**該收斂並存組總計：20 組**（4.1 + 4.2 + 4.3 + 4.4）

---

## 5. 清單 5：死碼總清單

> 判定條件：「外部引用 = 0」+「已被取代」。
> 計數方式：`Grep` `from ['\"]@/features/<name>(/|['\"])`、`grep` `<class/function name>`。

| 死碼路徑 | 內容 | 外部引用 | 取代者 |
|---|---|---:|---|
| `apps/nx-ui/src/features/finance/ui/FinanceCenterHub.tsx` | 舊財務中心 hub 元件 | **0** | `apps/nx-ui/src/app/dashboard/finance/page.tsx`（自己畫 hub）|
| `apps/nx-ui/src/features/report/ui/ReportCenterHub.tsx` | 舊報表中心 hub 元件 | **0** | `apps/nx-ui/src/app/dashboard/report/page.tsx`（自己畫 hub）|
| `apps/nx-ui/src/features/sales/ui/SalesCenterHub.tsx` | 舊銷貨中心 hub 元件 | **0** | `apps/nx-ui/src/features/sale/ui/hub/SalesHubMobile.tsx` + dock + `app/dashboard/sale/page.tsx` redirect |
| `apps/nx-ui/src/features/nx06/push-subscription.ts` | Web Push 訂閱 helper（單檔、僅自身 re-export）| **0** | （無取代者、未串入；先前盤點已標記）|

**死碼小計：4 個檔（3 個 hub 元件 + 1 個 push-subscription helper）**

### 5.1 引用檢查證據

- `FinanceCenterHub`：`Grep -n "FinanceCenterHub"` 全 repo 僅 `features/finance/ui/FinanceCenterHub.tsx:27` 一處（自身 `export`）。
- `ReportCenterHub`：`Grep -n "ReportCenterHub"` 全 repo 僅 `features/report/ui/ReportCenterHub.tsx:18` 一處（自身 `export`）。
- `SalesCenterHub`：`Grep -n "SalesCenterHub"` 全 repo 僅 `features/sales/ui/SalesCenterHub.tsx:172` 一處（自身 `export`）。
- `push-subscription`：`Grep -n "push-subscription"` 全 repo 僅 `features/nx06/push-subscription.ts` 自身一處。

### 5.2 候選待確認（未列入死碼、需 CTO 判定）

- `features/nx03/workflow/mock/*.ts`（2 個 mock 檔）— 引用次數 0，但 workflow 元件自身有用 mock；可能僅元件內部 import 路徑沒被 grep 到。**待確認**。
- `features/nx02/dashboard/`（含 `Nx02DashboardPage.tsx`）— root nx02 已 redirect 到 purchase/domestic，此 dashboard 頁是否仍在某 menu 入口？**待確認**。
- `features/nx01/dashboard/Nx01DashboardPage.tsx` — `app/dashboard/nx01/page.tsx` 已 redirect，dashboard 元件是否被 menu 引用？**待確認**。

---

## 6. 範圍說明 + 已知限制

- **範圍**：`apps/nx-ui`（前端）+ `apps/nx-api`（後端模組數量盤點、不深入子檔）+ `packages/db-core`（schema models 數量）。
- **不在範圍內**：`docs/`、`infra/`、`packages/` 其餘子套件、`apps/nx-api/src/shared/nxXX` 跨模組共用層細目。
- **計數方式**：所有「引用次數」「檔數」都用 `Grep` / `Glob` 實際 count、無估算。
- **未深入處**（待 CTO 指示是否要在階段 A 補）：
  - 後端 controllers ↔ 前端 API client ↔ 路由的端到端線路圖（涉及 `features/*/api/`、`features/shared/master/*/api/`、後端 `controllers/`）
  - `features/shared` 內 99 個檔的細部分類（master / lookup / role-view / hooks / api / part-compat）
  - DB schema 197 models 的業務領域分群（屬 NX 哪一塊）
  - 後端 `shared/nx01~10` 跟 `nx01~10` 主模組的職責切分

---

## 附錄 A：計數方法備查

| 計數項 | 工具 | 模式 |
|---|---|---|
| feature 檔數 | PowerShell `Get-ChildItem -Recurse -File -Include *.ts,*.tsx` | – |
| feature 外部引用 | `Grep` `from ['\"]@/features/<name>(/\|['\"])` | `output_mode=files_with_matches` |
| URL prefix 引用 | `Grep` `/dashboard/nx0X` | `output_mode=count` |
| dashboard 頁數 | `Glob` `apps/nx-ui/src/app/**/page.tsx` + `PowerShell Get-ChildItem -Filter page.tsx` | – |
| 後端模組子數 | `find apps/nx-api/src/<module> -maxdepth 2 -type d` | – |
| Prisma models | `Grep` `^model\s+\w+` in `schema.prisma` | `output_mode=count` |

— Hank（2026-06-10）
