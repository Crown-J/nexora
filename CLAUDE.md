# NEXORA GRID — Claude Code 工作說明

> 最後更新：2026-04-11
> 維護人：Crown Lin（創辦人）

---

## 一、專案背景

NEXORA GRID 是一套針對台灣 VAG（Volkswagen Audi Group）汽車零件經銷商的多租戶 SaaS ERP 系統，由 Innova IT（伊諾瓦資訊科技）開發。

**真實業務模型：** 恆迎企業（5 倉：Z00 總倉 + Z01~Z04 分倉）

**三人開發團隊：**
```
Crown（創辦人）  → 產品決策、Schema Review
Alex（Claude AI）→ PM、架構設計、文件產出
Hank（Cursor AI）→ 工程師、程式碼實作
```

**鐵律：Schema 設計優先 → 後端 API → 前端 UI，不可跳步**

---

## 二、Tech Stack

```
Monorepo：    pnpm + Turbo
後端：        NestJS（apps/nx-api）
前端：        Next.js 15（apps/nx-ui）
資料庫：      PostgreSQL（本機 Docker）
ORM：         Prisma 7（packages/db-core，prisma.config.ts）
部署：        Vercel（前端）+ Railway（後端）
DNS：         Cloudflare（app.nexoragrid.com）
```

---

## 三、模組代碼（重排後 v2.0）

| 代碼 | 名稱 | 最低版本 | 說明 |
|------|------|---------|------|
| NX01 | 主檔管理 | LITE | 使用者/料號/廠商/客戶/倉庫主檔 |
| NX02 | 採購管理 | LITE | 詢價/採購/驗收/退貨 |
| NX03 | 庫存管理 | LITE | 庫存台帳/盤點/調撥/撿貨/包貨 |
| NX04 | 銷售管理 | LITE | 報價/銷貨/銷退 |
| NX05 | 財務管理 | LITE | AP/AR/收付款/票據/關帳 |
| NX06 | 物流管理 | LITE | 送貨單/電子簽收 |
| NX07 | 人資管理 | PRO | 出勤/排班/薪資/績效 |
| NX08 | 經營分析 | PRO | HPA/BCG/TOWS/報表 |
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

### 單據編號
```
格式：[類型碼]-[年月]-[倉庫/機構碼]-[5碼流水]
範例：RF-202604-Z01-00001 / BOX-202604-Z01-00001
機構碼預設：HQ0（可自訂，如 HEY=恆迎）
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
id         String   @id @default(dbgenerated("gen_xxx_id()")) @db.VarChar(15)
tenant_id  String   @db.VarChar(15)
tenant     Nx99Tenant @relation(fields: [tenant_id], references: [id])
created_at DateTime @default(now())
created_by String   @db.VarChar(15)   // 必填 NN=True
creator    Nx01User @relation("creator", fields: [created_by], references: [id])
updated_at DateTime @updatedAt
updated_by String   @db.VarChar(15)   // 必填 NN=True
updater    Nx01User @relation("updater", fields: [updated_by], references: [id])
```

> created_by / updated_by 說明：
> - 系統操作：帶入當前使用者 ID
> - DB Seed/Migration：填入系統管理員 ID
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
// PLUS 功能
@UseGuards(PlusPlanGuard)  // 非 PLUS/PRO 回傳 HTTP 403

// 從 JWT 取得方案
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

// 4. stock_ledger source 欄位
// NX02 開帳存：sourceDocType='I', sourceModule='NX02'
// NX02 盤點：  sourceDocType='T', sourceModule='NX02'
// NX02 調撥：  sourceDocType='X', sourceModule='NX02'
// NX01 進貨：  sourceDocType='P', sourceModule='NX01' // 注意：舊NX01=採購，新NX02
// NX01 退貨：  sourceDocType='R', sourceModule='NX01'
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
│   ├── nx01/    ← 主檔管理（原 nx00，待重建）
│   ├── nx02/    ← 採購管理（原 nx01，開發中）
│   ├── nx03/    ← 庫存管理（原 nx02，已完成）
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
├── nx01/          ← 主檔管理（原 nx00，待重建）
├── nx02/          ← 採購管理（原 nx01，開發中）
│   ├── rfq/
│   ├── po/
│   ├── rr/
│   └── pr/
├── nx03/          ← 庫存管理（原 nx02，已完成）
│   ├── balance/
│   ├── ledger/
│   ├── init/
│   ├── stock-take/
│   ├── transfer/
│   └── shortage/
├── prisma/
└── shared/
```

---

## 十三、開發環境

```
家裡：PostgreSQL Docker port 5432
辦公室：PostgreSQL Docker port 5433（本機有衝突）

Git：GitHub Private（Crown-J/nexora）
Git GUI：GitHub Desktop
Branch：feature/NX{模組}-{功能} → main
Commit：[TASK-CODE] description

每日工作日誌：dailylog/YYYYMMDD.md
```

---

## 十四、重要開發原則

```
1. Schema 設計一定要 Crown review 後才能開始實作
2. 新功能比較麻煩，刪功能比較輕鬆 → 設計時寧可多不要少
3. 所有欄位說明要夠清楚，讓 Hank 不需要猜
4. 不要用 clsx，用 cx from @/shared/lib/cx
5. 不要用 schema.prisma 設定，改用 prisma.config.ts
6. 全局 ValidationPipe 已啟用，DTO 必須完整定義
7. PlusPlanGuard 從 nx03 module imports 取得
```

---

## 十五、docs/ 資料夾說明

```
docs/spec/
  nx_model.csv           ← 模組定義（12個模組）
  nx_table_v7.csv        ← 表格清單（124張）
  nx01_field_v1.csv      ← NX01 主檔欄位定義（378欄）
  doc_number_rules_v3.csv← 單據編號規則（22筆）
  version_plan.csv       ← 版本定價級距（9個級距）
  version_feature_matrix.csv ← 功能矩陣（83項）

docs/workflow/
  主流程/                ← P-W01~S-W06 等 45 個主流程
  子流程/                ← I01~F05 等 14 個子流程
```
