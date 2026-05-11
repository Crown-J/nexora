<!-- docs/_shared/team/system-architecture.md -->

# NEXORA - 系統架構文件

> 文件目的：給 Alex（沒跨對話 context）快速掌握「Hank 蓋了什麼房子」的全貌
> 撰寫者：Hank
> 撰寫時間：2026-04-28
> 文件性質：**現況快照**（不寫過去歷史、不寫未來規劃、不重述業務邏輯）

---

## A. Repo 結構總覽

```
nexora/
├── CLAUDE.md                ← 全局工作規範（PROJECT_CONTEXT 入口）
├── README.md                ← 專案總覽
├── _cursorrules             ← Cursor IDE 規範
├── apps/
│   ├── nx-ui/               ← Next.js 16.1.6 前端（→ Vercel）
│   └── nx-api/              ← NestJS 後端（→ Railway）
├── packages/
│   └── db-core/             ← Prisma 7 schema + migrations + seed
├── docs/                    ← v2 結構（按 NX 模組）
│   ├── _shared/             ← 跨模組（decisions/plans/reference/system/team）
│   ├── nx01/ ... nx10/      ← 各業務模組（reference/spec/ui/workflow）
│   ├── nx98/ + nx99/        ← 共用核心 / 系統管理
│   └── archive/YYYY-MM/     ← 歷史 task log
├── dailylog/                ← 每日工作日誌（YYYYMMDD.md）
└── demo/                    ← 設計參考檔（不在 git）
```

詳見 [CLAUDE.md](../../../CLAUDE.md) §十一~十六。

---

## B. 後端架構（apps/nx-api）

### B.1 NestJS Modules（14 個）

```
src/
├── app.module.ts            ← 主入口
├── auth/                    ← JWT + tenantCode 強制（X1 改造、消滅 A001）
├── prisma/                  ← Prisma Client wrapper
├── nx01/  主檔管理          ← 10 controller（user/role/part/part-brand/partner/warehouse/warehouse-type/customer-grade/currency/bulletin）
├── nx02/  採購管理          ← 5 controller（rfq/po/rr/qt/purchase-return）
├── nx03/  庫存管理          ← 7 controller（balance/ledger/inbound/outbound/stocktake/transfer/reservation）
├── nx04/  銷售管理          ← 4 controller（quote/so/sales-return + so/translator/）
├── nx05/  財務管理          ← 7 controller（ar/ap/receipt/payment/note/allowance/period-close）
├── nx06/  物流管理          ← 4 controller（delivery/pickup/intl-shipping/return-pickup）
├── nx07/  人資管理          ← 7 controller（attendance/leave/overtime/payroll/performance/training/employee-change）
├── nx08/  報表分析          ← 4 controller（daily-report/monthly-report/kpi-target/kpi-record）
├── nx09/  知識管理          ← 3 controller（article/document/meeting）
├── nx10/  遊戲化            ← 5 子目錄 / 6 controller（exp/checkin/leaderboard/medals/tasks；tasks/ 內含 tasks + tasks-today 兩 controller）
└── nx99/  系統管理          ← 3 controller（subscription/tenant/feature-flag）
```

**API 路由命名：** `/{nxXX}/{kebab-case-resource}`、共 **60 controller**（截至 2026-04-29、controller 算法見 [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md) §📋 資料層數量）。

### B.2 D3 雙帳設計（SO 資料模型 + 4 triggers）

> 詳見 [docs/nx04/spec/intent/so-data-model-intent.md](../../nx04/spec/intent/so-data-model-intent.md)
>     [docs/nx04/spec/impl/d3-impl_so-schema.md](../../nx04/spec/impl/d3-impl_so-schema.md)
>     [docs/nx04/spec/impl/d3-trigger.md](../../nx04/spec/impl/d3-trigger.md)

⚠️ Trigger 細節我沒在原始碼層級重新驗證、依 spec 文件為真相。
如要 audit、grep `migrations/*.sql` 找 trigger 定義。

### B.3 D4 SYS-C Translator

位置：`apps/nx-api/src/nx04/so/translator/`

```
translator.controller.ts       ← REST 入口
translator.service.ts          ← 主邏輯
refreshment-doc-creator.ts     ← 補單產生器
transfer-source-resolver.ts    ← 調貨來源解析
translator-error.ts            ← 自訂錯誤型別
```

> 詳見 [docs/nx04/spec/impl/d4-impl_translator.md](../../nx04/spec/impl/d4-impl_translator.md)

### B.4 D5 Navigation Policy

> 詳見 [docs/_shared/spec/intent/navigation-context-policy.md](../spec/intent/navigation-context-policy.md)

⚠️ 未在 nx-api / nx-ui 裡 grep 出明顯對應實作位置、可能落在 layout 層。Alex / Crown 確認。

### B.5 版本功能管控（Plan Guard）

```typescript
@UseGuards(PlusPlanGuard)  // 非 PLUS/PRO → HTTP 403
@UseGuards(ProPlanGuard)   // 非 PRO       → HTTP 403
```

JWT payload 內含 `planCode: 'LITE' | 'PLUS' | 'PRO'`。

---

## C. 前端架構（apps/nx-ui）

### C.1 App Router 路由樹

```
src/app/
├── page.tsx                 ← 首頁
├── coming-soon/             ← 占位
├── dashboard/
│   ├── nx01/ ~ nx10/        ← 模組工作台（標準 v2 路由）
│   ├── base/                ← 主檔管理（users/roles/parts/partners/warehouses/...、共 17+ 子頁）
│   ├── purchase/            ← ⚠️ 跟 nx02 並存（v1 殘留、未清理）
│   ├── sale/                ← ⚠️ 跟 nx04 並存（v1 殘留）
│   ├── inventory/           ← ⚠️ 跟 nx03 並存（v1 殘留）
│   ├── finance/ + report/   ← v1 殘留
│   └── ...
└── m/ + driver/             ← 手機版（倉管 / 外務）
```

⚠️ `dashboard/{nx01-10}` vs `dashboard/{purchase|sale|inventory|finance|report}` 兩條路由並存、是 v2 重整過渡期狀態。詳細決議見 [docs/_shared/decisions/2026-04-24_workstation-pivot.md](../decisions/2026-04-24_workstation-pivot.md)。

### C.2 Features/ 結構

```
src/features/
├── auth/             ← 登入流程
├── base/             ← 主檔
├── home/             ← 首頁
├── layout/           ← 共用版型（含 module-hub）
├── sys-dashboard/    ← 系統儀表板
├── nx01/ ~ nx03/     ← v2 模組功能
├── nx00/             ← ⚠️ 舊代碼（v2 已改 NX01、未清理）
├── purchase/ + sale/ + sales/ + inventory/ + finance/ + report/  ← v1 殘留
└── document-demo/    ← demo 用
```

⚠️ `nx00` / `sale` 跟 `sales` 兩個並存：可能跟 [Git 版控文件](git-state.md) §A.1 的早期分支殘留有關。

### C.3 Shared/ 結構

```
src/shared/
├── api/        ← 前端 API client
├── format/     ← 格式化 helpers（日期 / 金額 / id 顯示）
├── hooks/      ← 共用 hooks（含 useSessionMe）
├── lib/        ← cx (className 合併、不用 clsx)
├── types/      ← 共用型別
└── ui/         ← 共用元件（PartLookupAutocomplete、PlanUpgradePrompt 等）
```

### C.4 State 管理

- **Zustand stores** 散落在各 feature 下：
  - `features/sale/ui/fulfillment/store.ts`（A007 拆出後的新 store）
  - `features/sale/...inquiry-store / sales-store`（既有）
- **規範（A014 教訓）**：selector 只取原 reference slice、不在 selector 內 `.filter() / .map() / .sort()`、derive 一律用 `useMemo` 或 Zustand `shallow`

---

## D. 資料層架構（packages/db-core）

### D.1 Prisma Schema

```
packages/db-core/prisma/
├── schema.prisma            ← 137 models / 6113 行（單檔、未拆模組、截至 2026-04-29）
├── prisma.config.ts         ← ORM 設定（v7 必用、不是 schema.prisma 內 generator）
├── migrations/              ← 25 個 migrations（v7 baseline 起算）
└── seed/                    ← 三層架構（system / template / test）
```

### D.2 Models 模組劃分

依命名前綴 `Nx01~Nx99` 對應 12 個業務模組（NX01~NX10 + NX98 + NX99）。
完整欄位定義 → `docs/nx0X/reference/field-definitions.csv`。

### D.3 ID 與單據編號規則

| 規則 | 格式 | 範例 |
|------|------|------|
| ID 欄位 | `[模組大寫][4碼前綴][7碼流水]` VARCHAR(15) | `NX01USER0000001` |
| 單據編號 | `[2碼類型]-[年月]-[倉/機構]-[5碼流水]` | `RF-202604-Z01-00001` |

ID 段位（重要）：
- `NX01USER0000001` → SYSADMIN（永遠保留、is_active=FALSE）
- `NX01USER0000002~0899999` → 真實客戶
- `NX01USER9900001~9999999` → 測試租戶
- `NX99TANT0000000` → SYSTEM 內部租戶（永遠 is_active=FALSE）

### D.4 重要 ENUM / 慣例

```
partner_type:  C=客戶 / S=零件供應商 / T=外包物流 / V=一般廠商 / B=銀行
warehouse_type: H=HQ總部 / M=主倉 / W=分倉 / S=衛星倉
plan_code:    LITE / PLUS / PRO
```

### D.5 Migrations（24 個）

從 `20260413120000_spec_v7_baseline` 起算，重要里程碑：

| migration | 重要性 |
|-----------|-------|
| `20260413120000_spec_v7_baseline` | 128 表結構建立 |
| `20260421132744_fix_tenant_scoped_unique` | 4 表 unique 改 tenant-scoped |
| `20260421144610_drop_global_user_account_unique` | A001 修復 |
| `20260421152710_fix_schema_drift` | A002 修復（DRIFT-FIX 8 處） |
| `20260425100000_phase0_so_data_model` | D3 雙帳上線 |
| `20260427051334_phase0_b5_drift_fix_fk_columns_widening` | A018 修復（currency_id × 3） |
| `20260427053231_phase0_b5_drift_fix_docno_widening` | A019 修復（docNo × 13） |

### D.6 Seed 三層架構

```
seed/
├── system/     ← 跨環境（含 PROD）：SYSTEM tenant + SYSADMIN + 全域型錄
├── template/   ← 租戶模板：applyTemplateToTenant 統合入口（依 tier 過濾）
└── test/       ← NODE_ENV=development/test 才跑：lite / plus / pro 三租戶
```

⚠️ Prisma 7 `migrate reset --force` 不再自動跑 seed（v6 會、v7 不會）→ 必須兩段：

```bash
pnpm prisma migrate reset --force
pnpm tsx prisma/seed/index.ts --mode all --tier all
```

### D.7 三租戶測試環境

| tier | tenantCode | tenantId | adminUserId | plan |
|------|-----------|----------|-------------|------|
| LITE | `TEST-LITE` | `NX99TANT9900001` | `NX01USER9900001` | NEXORA-LITE-M |
| PLUS | `TEST-PLUS` | `NX99TANT9900002` | `NX01USER9900002` | NEXORA-PLUS-L |
| PRO  | `TEST-PRO`  | `NX99TANT9900003` | `NX01USER9900003` | NEXORA-PRO-XL |

三個 admin 帳號都叫 `admin` / 密碼都是 `Nexoragrid2026`。

### D.8 DEMO-02 三租戶 seed（進行中）

> 詳見 [docs/nx99/spec/intent/seed-demo-02-intent.md](../../nx99/spec/intent/seed-demo-02-intent.md)

- LITE 已落地（`feature/wp-phase1-w2-mini` 分支、客戶範本 8 個 + customer 命名規則對齊個體戶）
- PLUS / PRO 待 Crown 拍板進場

---

## E. 跨層架構

### E.1 多租戶隔離（鐵律）

- 所有業務 model 必填：`id / tenant_id / created_at / created_by / updated_at / updated_by`
- 所有業務查詢必加 `WHERE tenant_id = :tenantId`
- JWT payload 含 `tenantId`、middleware 自動帶入
- 業務 unique key 必跟 `tenantId` 組成 composite unique
- NX99 表格不需 tenant_id（系統層）

### E.2 流水號 helper

DB DEFAULT `gen_{prefix}_id()` 函式生成 ID（PostgreSQL function）、不在 application 層產 ID。

### E.3 過帳邏輯（共用規則）

> 詳見 [CLAUDE.md](../../../CLAUDE.md) §九

關鍵點：
- 單一 `prisma.$transaction` 內完成
- 過帳後呼叫 `ShortageService.detect`
- 入庫均價：`(舊qty × 舊avg + qty_in × unit_cost) / (舊qty + qty_in)`、出庫均價不變
- `stock_ledger.source*` 依新模組代碼（NX02 進貨/退貨、NX03 開帳/盤點/調撥、NX04 銷貨）

### E.4 接龍鎖反查鏈

> 詳見 [docs/nx03/spec/intent/stock-reverse-lookup-api-intent.md](../../nx03/spec/intent/stock-reverse-lookup-api-intent.md)
>     [docs/nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md](../../nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md)

NX03 提供 2 endpoints + 12 tests（B2 階段、Phase 0 收官）。

### E.5 URL Query State

⚠️ 沒找到全域統一的 URL query state 管理機制、各 feature 自己處理。Alex 確認是不是要建立。

---

## F. 環境與部署

### F.1 本地開發

```
PostgreSQL Docker port 5433（家裡 + 辦公室統一、避免 .env 跨機器 desync）
DATABASE_URL=postgres://...:5433/nexora
```

### F.2 雲端部署

| 服務 | 平台 | 說明 |
|------|------|------|
| nx-ui | Vercel | `app.nexoragrid.com`（Cloudflare DNS） |
| nx-api | Railway | 單一 environment（名義 prod、實際當 dev/staging）|
| PostgreSQL | Railway | Production DB |

**Railway 環境策略：** 維持單一 environment 直到第一個真實客戶簽約前 2~4 週（預估 2027 Q1），屆時執行 `TASK-RAILWAY-ENV-SPLIT` 分離為 prod/staging/dev。

### F.3 GitHub workflow

- repo：[Crown-J/nexora](https://github.com/Crown-J/nexora)（private）
- main 分支：穩定線、需 review
- feature/* 分支：開發線、PR merge
- commit format：`[TASK-CODE] description`
- 詳見 [git-state.md](git-state.md)

---

## G. 既有架構債清單（A 系列）

> 編號 A001~A024、整合自 PROJECT_CONTEXT 舊版 + dailylog 0421~0428。
> 部分編號在不同 dailylog 內重複使用（A007/A008/A009 有兩個版本）— 以下取**最新版**為準。

### G.1 已解決 ✅

| # | 描述 | 解決方式 |
|---|------|---------|
| A001 | auth fallback 跨租戶 session 誤派 | Migration 2 + X1 強制 tenantCode |
| A002 | nx07 狀態 default silent mismatch | Migration 3 (DRIFT-FIX-01) |
| A003 | CLAUDE.md / PROJECT_CONTEXT 寫 Next.js 15、實際 16.1.6 | **任務 1.5（commit 19c6a87）** |
| A007 | Zustand store 拆分 inquiry vs sales | 新開 `features/sale/ui/fulfillment/store.ts` |
| A016 | D3 schema drift / placeholder 跨 feature | D3 Phase 0 收斂 |
| A018 | v7 baseline currency_id × 3 緊縮 | Phase 0 B5-Aa migration |
| A019 | v7 baseline docNo × 13 緊縮 | Phase 0 B5-Ab migration |
| A020 | D3 nx03_st_item FK ON DELETE drift | B5-A migrate 順手修 |
| A022 | Nx01PartBrand.code VARCHAR(3) 緊縮 | DEMO-02 schema widen 3→10 |
| A023 | Nx01BrandCodeRule.name VARCHAR(15) 緊縮 | DEMO-02 schema widen 15→50 |
| A030 | nx08_monthly_report schema vs 行為不一致（schema 有表、service 全 read nx01_kpi_record） | 刪表（migration `20260429120000_nx08_drop_monthly_report`） |
| A031 | nx01_partner.partner_type `@default("BOTH")` v6 historical drift（v7 規範 C/S/T/V/B、VARCHAR(1) 撞 4 字元 default、跟 A002 同模式） | 改 default → `"C"` + defensive backfill UPDATE BOTH → C（migration `20260505060156_nx01_partner_fix_partner_type_default`、伴 NX01-03 規格書 7 欄擴充 task） |
| A032 | `packages/db-core/generated/` 是 Prisma generated artifact（每次 `prisma generate` 變動）但被 git tracked、形成 commit noise（4000+ 行 diff per generate）— Phase 1 揭露 | 加進 `.gitignore` + `git rm --cached -r` 移除 tracking（檔案保留 working tree、只 stop tracking、TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01 順手修）|
| A033 | NX01-09 規格書 §3.1 寫 country_id 預設 'TW'（ISO 2 碼）、既有 nx01_country.code VARCHAR(3) 用 ISO 3 碼慣例（TWN/DEU/JPN）— 跟 A002 / A031 同模式（規格 vs 既有 schema 慣例 drift） | schema 補建時對齊既有 ISO 3 碼用 'TWN'、避免製造新 drift（migration `20260505074146_nx01_address_catalog_create_3_tables`、伴 NX01-09 地址型錄 task TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01） |
| A034 | NX01-01 規格書 §4.1 寫 username / display_name / mobile、既有 schema 用 userAccount / userName / phone（v6 historical naming）— 跟 A002 / A031 / A033 同 drift family（規格 vs schema 命名 drift）；同時 NX01-02 規格書 vs apply-role.ts 8→7 種 role drift（移除 LOGISTICS + HR_ADMIN、加 OWNER）；nx01_user_role 缺 (tenantId, userId, roleId) composite unique；nx01_user 缺 failed_login_count / locked_until + (tenantId, email) unique | 1. user 命名 drift：Hank 拍方向 B（schema 不動、Alex 後續 update NX01-01 規格書 v1.1 對齊既有 schema）— 對齊軌 A `rev_Nx01Partner_salesUserId` 範式 + 「既有慣例優先於新建議」紀律；2. role 8→7 重整 + code/name 校正（migration `20260506091854_nx01_role_align_spec_v1_0` 含 per-tenant backfill + apply-role.ts + CSV 同步）；3. 補欄位 + composite unique（migration `20260506104013_nx01_user_add_lock_columns_and_email_unique` + `20260506104100_nx01_user_role_composite_unique`）；TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01 收斂 |
| A035 | NX01-06 規格書 v1.0 §7 PRO「5 倉」文字描述 vs 範式 HW1+MW1+BW1~4 列出 6 個算術不一致；CLAUDE.md §四 + 規格書 + 算術三方都犯同錯（新性質 drift：「文字描述 vs 範式列舉內部算術錯誤」、不在 A034 family）；同時揭露 Tier 數量設計沒區分「預設配置 vs 上限天花板」雙層概念（Alex 失誤紀錄候選 #50）| Crown 拍 6 倉真相 + 預設/上限分層、Alex 修訂 v1.1（§1.5 算術校正 + §7 重整：LITE 1/1 / PLUS 3/10 / PRO 6/無限）、commit `9366885` 落地 |
| A036 | NX01-06 規格書 v1.1 §1.4 寫 ID prefix 「NX01WHSE」、既有 schema 用 「NX01WARE」（gen_nx01_warehouse_id() v7_baseline 落地、含 7 個檔引用 + 既有資料 dev/prod ID）— 跟 A034 同 drift family（規格 vs schema 命名 drift、第 5 例）；同時 nx01_warehouse 缺 is_main + manager_user_id + 地址結構化（city/district/street FK + 6 巷弄門牌）；規格書 §3.2 寫地址欄位必填、schema 階段 1 並存策略採 nullable | 1. ID prefix drift：Hank 拍方向 B（schema 不動 NX01WARE、Alex 後續 update 規格書 v1.2 對齊）— 對齊軌 A/G「既有慣例優先於新建議」紀律 + A034 範式；2. 補欄位（migration `20260506134102_nx01_warehouse_add_is_main_and_manager` 含 partial unique + per-tenant backfill 第一筆 is_main=true）；3. 地址結構化欄位 nullable（migration `20260506134528_nx01_warehouse_add_address_columns`、對齊 partner.address 階段 1 並存範式、application 層強制必填）；TASK-PHASE2-NX01-WAREHOUSE-SCHEMA-EXTEND-01 收斂 |
| A042 | A034 task 改 role 命名（'ADMIN' → 'SYSADMIN'、移除 LOGISTICS+HR_ADMIN、加 OWNER）後、未同步全 repo stale 引用、形成「migration 後應用層 / seed / docs 未同步」drift family 升級版（跟 A040 同 family、但規模 14 倍、🔴 production blocker）。Hank 軌 4.5 揭露時估「~30 處 stale ADMIN」、A041 規則第一次套用 grep -c 揭露實際 431 處（規模震撼）：(1) RolesGuard line 56 ADMIN 全通行邏輯永遠 false（root cause、A034 後所有 SYSADMIN 用戶被 39 controller 403）；(2) 39 controller @Roles('ADMIN') 42 處 + nx02/qt × 4 + nx07 × 7 多 role；(3) 9 處 auth/RBAC 邏輯比對；(4) 7 處 test mocks + UI types；(5) nx01_role_view.csv 118 處 ADMIN + 118 LOGISTICS row + 缺 OWNER 118 row；(6) 3 dead test csv + 7 seed 註解；(7) spec docs 4 份 family F（b5-impl/d4-impl/spec-template/d4 註解）。同時揭露 reset-admin.ts dead v6 script（A044 候選、本軌順手刪）| Crown 拍 Q1~Q7 + Q5-bis 全範圍 closure（軌 4.6 拆 3 commit）：commit 1 live code（RolesGuard SYSADMIN+OWNER 全通行 + 53 @Roles + 9 auth/RBAC + 7 test mocks + Q6 刪 reset-admin.ts、`ff4e1e0`）；commit 2 data layer（nx01_role_view.csv 118 ADMIN→SYSADMIN + 118 LOGISTICS removed + 118 OWNER 新增、對齊 7 role 真相、+ 3 dead csv + 7 seed 註解 + UI types、`338fef6`）；commit 3 spec docs（NX01 spec docs HR_ADMIN×43 全文 replace 為 HR、family F b5-impl/d4-impl/spec-template 升級、worklog/A034 entry 歷史保留）；dev DB 驗證 PLUS tenant：SYSADMIN 0→118 / OWNER 0→118 / LOGISTICS 118→0、A042 收斂達標；Hank 失誤紀錄候選 A046：PowerShell `[System.IO.File]::WriteAllText` 對含中文 UTF-8 檔案破壞為 mojibake（qt.controller + app.controller 各 1 例、git checkout HEAD 還原後改用 Edit tool 修正）；TASK-A042-OLD-ROLE-STALE-CLOSURE-01 收斂 |

### G.2 待修 🟡

| # | 描述 | 計劃 |
|---|------|------|
| A004 | Next.js 16 `middleware` deprecated → `proxy` | 春酒後單獨任務 |
| A005 | `NEXT_PUBLIC_DEMO_MODE` vs `NEXT_PUBLIC_NEXORA_RUN_MODE` 雙 env 混淆 | 春酒後整併為單一 run mode |
| A010 | QT 型別為單料號（每 item 各建一張 QT） | 春酒後評估 |
| A012 | 桌面版銷售中心 7 項無導航卡 | R8 桌面版規劃 |
| A015 | 桌面版 `InventoryCenterHub` orphan | R8 桌面版重構 |
| A021 | `stock-balance.controller` 仍用 `@Roles('ADMIN')` 跟 B2 開放方向不一致 | 留另一 task 評估 |
| A024 | customers-catalog 第一版命名工整連鎖感 | 已修模板（commit 5a34664）、待 Crown preview 確認 |

### G.3 順手清 🟢

| # | 描述 | 處理 |
|---|------|------|
| A006 | `MobileSectionTabs` 與 `MobileHubSectionTabs` 並存 | 順手清 |
| A008 | `MobileDock` 死碼 / `MOCK_SALES_PERSON_MONTHLY` 硬寫 | 順手清 |
| A009 | 料號 inline SVG ~18KB / `offsetBottom` prop 死 | 順手清 |
| A011 | `TodoGroup.onItemClick` prop 無人用 | 順手清 |
| A013 | `CustomerDecision` 型別 alias（tsc 過） | 保持警覺 |

### G.4 教訓 / 流程 🔴

| # | 描述 | 規範 |
|---|------|------|
| A014 | **Zustand selector 禁用 inline `.filter/.map/.sort`** — production React #185 | selector 只取 slice、derive 用 `useMemo` 或 `shallow` |
| A017 | **prod build 前須跑一次真實 prod build 驗證** — dev mode 重現不到的 bug | push main 前 `pnpm build` + `next start` 抽驗關鍵路徑 |

### G.5 Hank 知道但 Crown / Alex 可能不知道的（觀察）

> 寫文件時 grep 發現的觀察。前 4 條已由 Crown 拍登記為 A025~A028（春酒後處理）。第 5 條於 NX01 worklog 揭露、登記為 A029。

- ⚠️ **A025 — 前端 `features/nx00/` 殘留**：v2 模組代碼已改 NX01、`nx00/` 目錄未清理
- ⚠️ **A026 — 前端 `features/sale/` 跟 `features/sales/` 並存**：兩個近名 feature 共存、可能是同源實驗未收斂
- ⚠️ **A027 — 前端 `dashboard/{purchase|sale|inventory|finance|report}/` 跟 `dashboard/{nx02|nx04|nx03|nx05|nx08}/` 並存**：v2 路由重整過渡期、舊路由未刪
- ⚠️ **A028 — `schema.prisma` 單檔承載 100+ models**：Prisma 7 雖支援 multi-file schema、目前未拆分（檔案 ~3000+ 行）
- ⚠️ **A029 — `template/apply-checkin-reward.ts` 從未建立**：TASK-SEED-REFACTOR-01 Step 7「情境 A」決定先不做、舊邏輯保留在 pre-`53b900d` git history（`default/nx10_checkin_reward.ts`）。觸發時機：NX10 遊戲化正式啟用時、從 git 撈回並參數化。詳見 [docs/nx01/nx01-worklog.md](../../nx01/nx01-worklog.md) 主題 4。

---

## 文件邊界（不寫的東西）

依任務指令、本檔**不寫**：
- 業務邏輯細節（→ 規格書 `docs/nx0X/spec/intent/`）
- UI 視覺細節（→ 工作台規劃 `docs/nx0X/ui/`）
- 過去 commit 紀錄（→ `git log` + dailylog/）
- 未來 task 規劃（→ Alex / Crown）
- Git 分支現況（→ [git-state.md](git-state.md)）

---

## 維護方式

- 此文件**現況快照**性質、跟 [git-state.md](git-state.md) 一樣 A~G 段穩定區塊
- 觸發更新時機：
  1. 新增 / 移除模組（後端或前端）
  2. 重大架構決策落地（如 D3 → D6 演進）
  3. 架構債新增 / 解決（A 系列編號）
  4. 部署環境變動（Railway env split / Vercel 換）
  5. Crown 主動詢問「目前架構長什麼樣」
- commit 訊息：`[ARCH] update YYYY-MM-DD <簡述>`

---

> 文件版本：v1.0
> 下次更新觸發：任務 4 之後若有新模組 / 架構債變動
