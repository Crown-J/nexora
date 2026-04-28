# NEXORA GRID — Claude Code 工作說明

> 最後更新：2026-04-12
> 維護人：Crown Lin（創辦人）

---

## 一、專案背景

NEXORA GRID 是一套針對台灣 VAG（Volkswagen Audi Group）汽車零件經銷商的多租戶 SaaS ERP 系統，由 Innova IT（伊諾瓦資訊科技）開發。

**真實業務模型：** 恆迎企業（5 倉：HW1 總倉 + MW1 主倉 + BW1~BW4 分倉）

**三人開發團隊：**
```
Crown（創辦人）                              → 產品決策、Schema Review、版本拍板
Alex（Claude PM AI、Claude.ai）              → 撰寫需求規格書、追蹤進度、紀錄 Hank 架構
Hank（NEXORA 工程 AI、任何 IDE 內的 Claude）  → 程式撰寫、欄位設計、實作架構書、工作日誌、Git 版控文件
```

**鐵律：Schema 設計優先 → 後端 API → 前端 UI，不可跳步**

---

## 二、Tech Stack

```
Monorepo：    pnpm + Turbo
後端：        NestJS（apps/nx-api）
前端：        Next.js 16.1.6（apps/nx-ui）
資料庫：      PostgreSQL（本機 Docker）
ORM：         Prisma 7（packages/db-core，prisma.config.ts，非 schema.prisma）
部署：        Vercel（前端）+ Railway（後端）
DNS：         Cloudflare（app.nexoragrid.com）
```

---

## 三、模組代碼（v2.0，2026-04-11 確定）

| 代碼 | 名稱 | 最低版本 | 說明 |
|------|------|---------|------|
| NX01 | 主檔管理 | LITE | 使用者/料號/廠商/客戶/倉庫主檔 |
| NX02 | 採購管理 | LITE | 詢價/採購/驗收/退貨/調貨 |
| NX03 | 庫存管理 | LITE | 庫存台帳/盤點/調撥/撿貨/包貨 |
| NX04 | 銷售管理 | LITE | 報價/銷貨/銷退 |
| NX05 | 財務管理 | LITE | AP/AR/收付款/票據/關帳 |
| NX06 | 物流管理 | LITE | 送貨單/電子簽收 |
| NX07 | 人資管理 | PRO | 出勤/排班/薪資/績效 |
| NX08 | 經營分析 | PRO | HPA/BCG/TOWS/報表/日月報 |
| NX09 | 知識管理 | PRO | KM/文件庫/會議管理 |
| NX10 | 遊戲化系統 | PRO | 任務/勳章/轉職 |
| NX98 | 共用核心 | LITE | 單據流轉（不對外顯示）|
| NX99 | 系統管理 | LITE | 多租戶/方案/功能開關（不對外顯示）|

> ⚠️ 舊代碼對照：NX00→NX01 / NX01→NX02 / NX02→NX03 / NX03→NX04 / NX04→NX05 / NX05→NX08 / NX06→NX98 / NX07→NX06 / NX08→NX07

---

## 四、版本方案

| 版本 | 名稱 | 人數 | 月費範圍 |
|------|------|------|---------|
| LITE | 基礎版 | 1~10人（S:1~5 / M:6~10）| 2,500~4,500 |
| PLUS | 進階版 | 5~30人（S/M/L）| 8,000~18,000 |
| PRO | 專業版 | 10~100人（S/M/L/XL）| 25,000~70,000 |

**繳費方式：**
- 月繳：原價
- 季繳：× 2.8（省 7%）
- 年繳：× 10（省 17%，等同贈 2 個月）

**版本功能邊界：**
- LITE：NX01~NX06 基礎、單倉（MW1）、無部門架構、無 PO 審核
- PLUS：加多倉（MW1+BW1）、調撥、採購審核、基本部門架構
- PRO：全功能含 NX07~NX10、5倉（HW1+MW1+BW1~4）、完整組織架構

---

## 五、資料庫命名規則

### DB 表格名稱
```
格式：nx{模組號}_{表格名稱}
範例：nx01_user / nx02_rfq / nx03_stock_ledger
```

### Prisma Model 命名
```
格式：Nx{模組號}{PascalCase}
範例：Nx01User / Nx02Rfq / Nx03StockLedger
```

### ID 欄位
```
型別：VARCHAR(15)
格式：[模組大寫][4碼前綴][7碼流水號]
範例：NX01USER0000001 / NX02RFHT0000001
產生：DB DEFAULT gen_{prefix}_id() 函式
```

### 單據編號（v3，2026-04-11 確定）
```
格式：[2碼類型]-[年月]-[倉庫/機構碼]-[5碼流水]
範例：RF-202604-Z01-00001

⚠️ 包裹編號：BX-202604-Z01-00001（BX 兩碼，非 BOX 三碼）

主要類型碼：
  NX02：DR=需求單 / RF=詢價單 / PO=採購單 / RR=進貨單 / PR=退供應商 / TI=調貨單
  NX03：ST=調撥單 / SL=盤點單 / IN=開帳單 / PK=撿貨單 / PL=包貨單 / BX=包裹
  NX04：QT=報價單 / SO=銷貨單 / SR=銷退單
  NX05：AP=應付 / AR=應收 / AL=折讓單 / PY=收付款 / NT=票據 / CL=關帳
  NX06：DN=送貨單
```

### 欄位命名
```
DB 欄位：    snake_case（created_at, tenant_id）
Prisma：     camelCase + @map("snake_case")
API 路由：   kebab-case（/nx01/user, /nx02/rfq）
DTO/型別：   PascalCase（CreateRfqDto）
React 元件： PascalCase（RfqFormView）
```

---

## 六、必填欄位規則

每個 model 都必須有以下欄位：

```prisma
id         String     @id @default(dbgenerated("gen_xxx_id()")) @db.VarChar(15)
tenant_id  String     @db.VarChar(15)
tenant     Nx99Tenant @relation(fields: [tenant_id], references: [id])
created_at DateTime   @default(now())
created_by String     @db.VarChar(15)   // NN=True，必填
creator    Nx01User   @relation("creator", fields: [created_by], references: [id])
updated_at DateTime   @updatedAt
updated_by String     @db.VarChar(15)   // NN=True，必填
updater    Nx01User   @relation("updater", fields: [updated_by], references: [id])
```

> created_by / updated_by 填入規則：
> - 系統操作：帶入當前使用者 ID
> - DB Seed / Migration：填入 SYSADMIN ID（NX01USER0000001）
> - 系統匯入功能：帶入執行匯入的使用者 ID

---

## 七、多租戶隔離

```
所有業務表格都必須有 tenant_id 欄位
所有查詢必須加上 WHERE tenant_id = :tenantId
JWT payload 包含 tenantId，每個 request 自動帶入
NX99 表格不需要 tenant_id（系統層）
```

---

## 八、版本功能管控

### 後端（NestJS Guard）
```typescript
@UseGuards(PlusPlanGuard)  // 非 PLUS/PRO 回傳 HTTP 403
@UseGuards(ProPlanGuard)   // 非 PRO 回傳 HTTP 403

const planCode = request.user.planCode  // 'LITE' | 'PLUS' | 'PRO'
```

### 前端（Next.js）
```typescript
const { me } = useSessionMe()
const isPlus = me?.plan_code === 'PLUS' || me?.plan_code === 'PRO'
const isPro  = me?.plan_code === 'PRO'

if (!isPro) return <PlanUpgradePrompt requiredPlan="PRO" />
```

---

## 九、過帳邏輯通用規則

所有庫存過帳（進貨/退貨/盤點/調撥/開帳存）必須：

```typescript
// 1. 在單一 Prisma $transaction 內完成
// 2. 過帳後呼叫缺貨偵測
await ShortageService.detect(tx, tenantId, partId, warehouseId)

// 3. 移動平均成本
// 入庫：新均價 = (舊qty × 舊avg_cost + qty_in × unit_cost) / (舊qty + qty_in)
// 出庫：均價不變

// 4. stock_ledger source 欄位（依新模組代碼）
// NX03 開帳存：sourceDocType='I', sourceModule='NX03'
// NX03 盤點：  sourceDocType='T', sourceModule='NX03'
// NX03 調撥：  sourceDocType='X', sourceModule='NX03'
// NX02 進貨：  sourceDocType='P', sourceModule='NX02'
// NX02 退貨：  sourceDocType='R', sourceModule='NX02'
// NX04 銷貨：  sourceDocType='S', sourceModule='NX04'
```

---

## 十、FUNCTION_CODE 格式

```
NX{模組}-{子系統}-{層級}-{序號}-F{兩位數}

層級代碼：
  UI      = 純畫面 render
  HOOK    = 資料流 / state
  API     = 前端 API client
  API-CTL = 後端 Controller
  SVC     = 後端 Service
  DTO     = DTO / 型別
  MDL     = Module 註冊

範例：NX02-RFQ-SVC-001-F01
```

---

## 十一、前端資料夾結構

```
apps/nx-ui/src/
├── app/dashboard/
│   ├── nx01/    ← 主檔管理
│   ├── nx02/    ← 採購管理
│   ├── nx03/    ← 庫存管理
│   ├── nx04/    ← 銷售管理
│   ├── nx05/    ← 財務管理
│   ├── nx06/    ← 物流管理
│   └── ...
├── features/
│   ├── nx01/
│   ├── nx02/
│   ├── nx03/
│   └── shared/ui/
│       ├── PartLookupAutocomplete.tsx  ← 250ms debounce
│       └── PlanUpgradePrompt.tsx
└── shared/
    └── lib/
        └── cx.ts  ← className merging（不用 clsx，用這個）
```

---

## 十二、後端資料夾結構

```
apps/nx-api/src/
├── auth/          ← JWT 登入驗證
├── nx01/          ← 主檔管理
├── nx02/          ← 採購管理
│   ├── demand/
│   ├── rfq/
│   ├── po/
│   ├── rr/
│   ├── pr/
│   └── ti/
├── nx03/          ← 庫存管理
│   ├── balance/
│   ├── ledger/
│   ├── init/
│   ├── stock-take/
│   ├── transfer/
│   ├── shortage/
│   ├── picking/
│   └── packing/
├── nx04/          ← 銷售管理
├── nx05/          ← 財務管理
├── nx06/          ← 物流管理
├── prisma/
└── shared/
```

---

## 十三、Seed 資料結構

```
packages/db-core/prisma/
├── seed/
│   ├── system/          ← 系統資料（每次 deploy 同步，跟租戶無關）
│   │   ├── nx01_view.csv          ← 118 個畫面代碼
│   │   └── nx01_role_view.csv     ← 826 筆預設角色權限
│   ├── default/         ← 新租戶初始化資料（依 seed_type 篩選）
│   │   ├── nx01_user.csv          ← ALL（2筆：SYSADMIN+admin）
│   │   ├── nx01_role.csv          ← ALL（7筆）
│   │   ├── nx01_country.csv       ← ALL（6筆）
│   │   ├── nx01_currency.csv      ← ALL（5筆）
│   │   ├── nx01_car_brand.csv     ← ALL（4筆）
│   │   ├── nx01_part_group.csv    ← ALL（6筆）
│   │   ├── nx01_part_brand.csv    ← ALL（6筆）
│   │   ├── nx01_customer_grade.csv← ALL（4筆）
│   │   ├── nx01_discount_code.csv ← ALL（4筆）
│   │   ├── nx01_warehouse_type.csv← PLUS（4筆）
│   │   ├── nx01_warehouse.csv     ← ALL/PLUS/PRO 混合（6筆）
│   │   ├── nx01_department.csv    ← PLUS/PRO 混合（6筆）
│   │   ├── nx05_account_code.csv  ← ALL（12筆）
│   │   ├── nx07_leave_type.csv    ← PRO（6筆）
│   │   ├── nx10_medal_level.csv   ← PRO（20筆）
│   │   └── nx99_plan.csv          ← ALL（9筆）
│   └── test/            ← 開發測試資料
│       ├── lite/        ← 5人/1倉(MW1)/30料號
│       ├── plus/        ← 15人/3倉/80料號
│       └── pro/         ← 30人/5倉/150料號
└── seed.ts
```

**seed_type 邏輯：**
```typescript
// 新租戶初始化
const allowed = { LITE: ['ALL'], PLUS: ['ALL','PLUS'], PRO: ['ALL','PLUS','PRO'] }[plan]
// 升級補寫：LITE→PLUS 寫入 PLUS；PLUS→PRO 寫入 PRO
```

**SYSADMIN 設計：**
```
SYSADMIN（NX01USER0000001）：is_active=FALSE，不開放 UI 登入，只供 DB 匯入填 created_by
租戶管理員（NX01USER0000002）：admin，客戶實際使用的最高權限帳號，首次登入強制改密碼
```

---

## 十四、開發環境

```
家裡：PostgreSQL Docker port 5433
辦公室：PostgreSQL Docker port 5433（兩邊一致，避免 .env 跨機器不一致）

Git：GitHub Private（Crown-J/nexora）
Git GUI：GitHub Desktop
Branch：feature/NX{模組}-{功能} → main
Commit：[TASK-CODE] description

每日工作日誌：dailylog/YYYYMMDD.md
```

---

## 十五、重要開發原則

```
1. Schema 設計一定要 Crown review 後才能開始實作
2. 新功能比較麻煩，刪功能比較輕鬆 → 設計時寧可多不要少
3. 所有欄位說明要夠清楚，讓 Hank 不需要猜
4. 不要用 clsx，用 cx from @/shared/lib/cx
5. ORM 設定用 prisma.config.ts，不是 schema.prisma
6. 全局 ValidationPipe 已啟用，DTO 必須完整定義
7. partner_type 單字元：C=客戶 / S=零件供應商 / T=外包物流 / V=一般廠商 / B=銀行
8. nx01_view / nx99_plan / nx01_currency / nx01_country / nx01_warehouse_type 屬 system seed（全域）；
   nx01_role_view 由 applyTemplateToTenant 為每個租戶載入（依 tier 篩 826 筆/tenant）
```

---

## 十六、docs/ 資料夾說明

> 2026-04-25 重整為 v2 結構（按 NX 模組劃分，C 方案）。完整索引見 [docs/README.md](docs/README.md)。

```
docs/
├── README.md                 ← 文件總索引、命名規則、決策樹
├── _shared/                  ← 跨模組共用
│   ├── decisions/            ← ADR
│   ├── plans/                ← Master Plan
│   ├── reference/            ← 跨模組真相來源（nx-table.csv / doc-number-rules.csv / version-* / route-table-v2.md）
│   ├── system/               ← 跨模組系統層（首頁、版型、SYS-W 流程）
│   └── team/                 ← 三人團隊規範（Hank charter / Git state / system architecture）
├── nx01/ ... nx10/           ← 業務模組（與 §3 模組代碼對齊）
│   ├── reference/            ← field-definitions.csv（取代舊 nxXX_field_v1.csv）
│   ├── spec/                 ← 設計契約（intent/ Alex 寫，impl/ Hank 寫，按需長）
│   ├── ui/                   ← 工作台畫面規劃
│   └── workflow/             ← 業務流程（primary/ + sub/）
├── nx98/ + nx99/             ← 共用核心 / 系統管理
└── archive/YYYY-MM/          ← 已完成的歷史 task log
```

**常用入口**：
- 模組欄位定義：`docs/nx0X/reference/field-definitions.csv`
- 跨模組規則：`docs/_shared/reference/`（nx-table / doc-number-rules / version-*）
- ADR / Plan：`docs/_shared/decisions/` + `docs/_shared/plans/`
- 業務流程：`docs/nx0X/workflow/primary/` + `docs/nx0X/workflow/sub/`
- 三人團隊規範：`docs/_shared/team/hank-charter.md`（Hank 自我認同）

**demo 設計參考檔**仍在 `C:\nexora\demo\`（不在 git）。

---

## 十七、Hank 必讀順序（新對話開工前必跑）

```
1. CLAUDE.md（本檔）— 全局規範
2. docs/_shared/team/hank-charter.md — Hank 工作規範（self-binding 自我認同）
3. docs/_shared/team/git-state.md — Git 版控現況（任務 3 建立後）
4. docs/_shared/team/system-architecture.md — Hank 蓋的房子（任務 4 建立後）
5. 涉及模組的工作日誌 + 規格書（依當前 task）
```

### 開工前自檢清單

- [ ] 讀完 CLAUDE.md？
- [ ] 讀完 hank-charter.md？
- [ ] 看過 git-state.md、知道現在哪條分支？
- [ ] 看過涉及模組的工作日誌、知道上次做到哪？
- [ ] grep 過要改的 schema / API、確認現況？
- [ ] 不確定的點列出來了？

任一項「沒」→ 不要動手。

> 此清單跟 `docs/_shared/team/hank-charter.md` §E.3 對齊、CLAUDE.md 是入口、charter 是細節。
