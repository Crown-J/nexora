<!-- docs/PROJECT_CONTEXT.md -->
# PROJECT_CONTEXT.md
> 此文件供 NEXORA 專案經理 AI（Alex）與新加入的工程師使用。
> 每次開啟新對話時請先完整閱讀本文件，再開始執行任務。
> 最後更新：2026-04-22

---

## 一、專案概述

### 產品定位
**NEXORA GRID** 是伊諾瓦資訊科技（Innova IT）開發的汽車零件經銷商專用 SaaS ERP 系統，
目標市場為台灣 VAG（Volkswagen Audi Group）體系的中小型汽車零件經銷商。

真實業務模型參考：**恆迎企業**（5 個倉：Z00 總倉 + Z01~Z04 分倉）

### 開發團隊
| 角色 | 人員 | 職責 |
|------|------|------|
| 創辦人 | Crown Lin（林翰杰） | 產品決策、Schema Review、最終驗收 |
| PM AI | Alex（Claude） | 架構規劃、Schema 設計、任務文件產出 |
| 工程師 | Hank（Cursor AI） | 程式碼實作、測試 |
| 業務夥伴 | 周哥 | 財務與海關協調 |

### 開發鐵律
**Schema 設計優先 → 後端 API → 前端 UI，不可跳步**
> 「新增功能比較麻煩，刪減功能比較輕鬆」→ 設計時寧可多，不要少

---

## 二、版本方案

### 版本定位

| 版本 | 名稱 | 人數 | 典型客戶 |
|------|------|------|---------|
| LITE | 基礎版 | 1~10 人 | 小型單店汽車零件經銷商 |
| PLUS | 進階版 | 5~30 人 | 2~4 倉多據點成長型經銷商 |
| PRO | 專業版 | 10~100 人 | 有完整組織架構的中型企業 |

### 定價級距（9 級）

| 版本 | 級距 | 人數 | 月繳 | 季繳(×2.8) | 年繳(×10) |
|------|------|------|------|------------|-----------|
| LITE | S | 1~5人 | 2,500 | 7,000 | 25,000 |
| LITE | M | 6~10人 | 4,500 | 12,600 | 45,000 |
| PLUS | S | 5~10人 | 8,000 | 22,400 | 80,000 |
| PLUS | M | 11~20人 | 13,000 | 36,400 | 130,000 |
| PLUS | L | 21~30人 | 18,000 | 50,400 | 180,000 |
| PRO | S | 10~20人 | 25,000 | 70,000 | 250,000 |
| PRO | M | 21~40人 | 38,000 | 106,400 | 380,000 |
| PRO | L | 41~70人 | 55,000 | 154,000 | 550,000 |
| PRO | XL | 71~100人 | 70,000 | 196,000 | 700,000 |

> 季繳 = 月費 × 2.8（省 7%）；年繳 = 月費 × 10（省 17%，贈 2 個月）

### 版本功能邊界
- **LITE**：NX01~NX06 基礎功能、單倉、無部門架構、無採購單 PO 審核
- **PLUS**：加多倉/調撥/採購審核/國外採購、基本部門架構（最多 2 層）
- **PRO**：全功能含 NX07~NX10、無限部門層級 + KPI 考核

---

## 三、模組架構（v2.0）

### 模組對照表

| 新代碼 | 模組名稱 | 最低版本 | 對外顯示 | 說明 |
|--------|---------|---------|---------|------|
| NX01 | 主檔管理 | LITE | ✅ | 使用者/料號/廠商/客戶/倉庫主檔 |
| NX02 | 採購管理 | LITE | ✅ | 詢價/採購/驗收/退貨/調貨 |
| NX03 | 庫存管理 | LITE | ✅ | 庫存台帳/盤點/調撥/撿貨/包貨 |
| NX04 | 銷售管理 | LITE | ✅ | 報價/銷貨/銷退 |
| NX05 | 財務管理 | LITE | ✅ | AP/AR/收付款/票據/關帳 |
| NX06 | 物流管理 | LITE | ✅ | 送貨單/電子簽收 |
| NX07 | 人資管理 | PRO | ✅ | 出勤/排班/薪資/績效 |
| NX08 | 經營分析 | PRO | ✅ | HPA/BCG/TOWS/報表/日月報 |
| NX09 | 知識管理 | PRO | ✅ | KM/文件庫/會議管理 |
| NX10 | 遊戲化系統 | PRO | ✅ | 任務/勳章/轉職 |
| NX98 | 共用核心 | LITE | ❌ | 單據流轉關聯 |
| NX99 | 系統管理 | LITE | ❌ | 多租戶/方案/功能開關 |

### 欄位定義完成狀況

| 模組 | CSV 檔案 | 欄位數 | 表格數 | 狀態 |
|------|---------|-------|-------|------|
| NX01 | nx01_field_v1.csv | 378 | 29 | ✅ |
| NX02 | nx02_field_v1.csv | 261 | 12 | ✅ |
| NX03 | nx03_field_v1.csv | 273 | 16 | ✅ |
| NX04 | nx04_field_v1.csv | 133 | 6 | ✅ |
| NX05 | nx05_field_v1.csv | 148 | 8 | ✅ |
| NX06 | nx06_field_v1.csv | 55 | 3 | ✅ |
| NX07 | nx07_field_v1.csv | 188 | 13 | ✅ |
| NX08 | nx08_field_v1.csv | 150 | 9 | ✅ |
| NX09 | nx09_field_v1.csv | 111 | 10 | ✅ |
| NX10 | nx10_field_v1.csv | 160 | 13 | ✅ |
| NX98 | nx98_field_v1.csv | 11 | 1 | ✅ |
| NX99 | nx99_field_v1.csv | 120 | 8 | ✅ |
| **合計** | | **1,988** | **128** | ✅ |

### 重要事實校正（2026-04-22）

以下數量在實作驗證中與 spec 原始描述不一致，**以實作為準**：

| 項目 | spec 原寫 | 實作為 | 確認來源 |
|------|----------|-------|---------|
| nx01_role 預設職務數 | 7 個 | **8 個（含 HR_ADMIN 人資主管）** | TASK-SEED-REFACTOR-01 Step 3 |
| nx10_medal_level 階數 | 20 階 | **16 階（4 tier × 4 rank）** | TASK-SEED-REFACTOR-01 Step 3 |
| nx01_role_view 權限筆數 | spec 未明寫 | **826 筆（per tenant，依 tier 過濾）** | TASK-SEED-REFACTOR-01 Step 5 |

---

## 四、技術架構

### Tech Stack

| 層級 | 技術 |
|------|------|
| Frontend | Next.js 15 + React + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL（本機 Docker） |
| ORM | Prisma 7（`prisma.config.ts`，非 schema.prisma 設定）|
| Monorepo | pnpm + Turbo |
| Auth | JWT（Passport）|
| API | REST |

### Prisma 7 行為備忘（重要）

- `prisma migrate reset --force` **不再自動跑 seed**（v6 會，v7 不會）
- CI/CD 腳本必須用兩個指令：
  ```bash
  pnpm prisma migrate reset --force
  pnpm tsx prisma/seed/index.ts --mode all --tier all
  ```
- 來源：TASK-SEED-REFACTOR-01 Step 5 實測發現

### Monorepo 結構

```
nexora/
├── CLAUDE.md           ← Cursor AI Hank 的工作規範
├── README.md
├── docs/
│   ├── PROJECT_CONTEXT.md   ← 本文件（專案總覽）
│   ├── spec/                ← CSV 規格檔
│   ├── workflow/            ← Workflow 文件（59 個）
│   └── ui/                  ← 畫面規劃文件（19 份）
├── apps/
│   ├── nx-ui/               ← Next.js 前端（app.nexoragrid.com）
│   └── nx-api/              ← NestJS 後端（Railway）
├── packages/
│   └── db-core/             ← Prisma Schema + Migration + Seed
└── dailylog/                ← 每日工作日誌
```

### 部署環境

| 服務 | 平台 | 說明 |
|------|------|------|
| nx-ui | Vercel | app.nexoragrid.com（Cloudflare DNS）|
| nx-api | Railway | 目標部署平台 |
| PostgreSQL | 本機 Docker | **兩台機器統一 port 5433**（避免 .env 跨機器不一致）|

### Railway 環境策略（2026-04-22 定案）

**現階段**：維持 Railway 單一 environment（名義 production，實際當 DEV/Staging 用）

**分離條件**：第一個真實客戶簽約前 2~4 週（預估 2027 Q1）將執行 `TASK-RAILWAY-ENV-SPLIT`，
分離為 production / staging / development 三環境，並把 production 的 DATABASE_URL 限縮在 CI/CD pipeline。

---

## 五、資料庫規範

### DB 命名規則

```
表格名稱:nx{模組號}_{表格名稱}（snake_case）
Prisma Model:Nx{模組號}{PascalCase}
API 路由:kebab-case
DTO/型別:PascalCase
React 元件:PascalCase
```

### ID 欄位規則

```
型別:VARCHAR(15)
格式:[模組大寫][4碼前綴][7碼流水號]
範例:NX01USER0000001 / NX02RFHT0000001
產生:DB DEFAULT gen_{prefix}_id() 函式
```

### ID 段位規劃（2026-04-22 定案，所有 seed/migration/匯入須遵守）

#### nx01_user
| ID 範圍 | 用途 |
|---------|------|
| `NX01USER0000001` | SYSADMIN（永遠保留,唯一）|
| `NX01USER0000002~0899999` | 真實客戶使用者 |
| `NX01USER9900001~9999999` | 測試租戶使用者（test seed 專用）|

#### nx99_tenant
| ID 範圍 | 用途 |
|---------|------|
| `NX99TANT0000000` | SYSTEM 內部租戶（永遠保留,isActive=false）|
| `NX99TANT0000001~0899999` | 真實客戶租戶 |
| `NX99TANT9900001~9999999` | 測試租戶（test seed 專用）|

### SYSTEM 租戶說明

SYSTEM 租戶（`NX99TANT0000000`）是系統內部租戶，作為 SYSADMIN 的歸屬 tenant。
永遠 `isActive=false`，業務查詢預設過濾 active 會自動排除。

**禁止事項：**
- 禁止在 SYSTEM 租戶下建立業務資料
- 禁止將 SYSTEM 設為 active
- 禁止刪除 SYSTEM 租戶

### 單據編號規則（v3）

```
格式:[2碼類型]-[年月]-[倉庫/機構碼]-[5碼流水號]
機構碼:預設 HQ0(可自訂,如 HEY=恆迎)

NX02  DR 採購需求單 / RF 詢價單 / PO 採購單 / RR 進貨單
      PR 退供應商單 / TI 調貨單
NX03  ST 調撥單 / SL 盤點單 / IN 開帳單
      PK 撿貨單 / PL 包貨單 / BX 包裹
NX04  QT 報價單 / SO 銷貨單 / SR 銷退單
NX05  AP/AR/AL/PY/NT/CL
NX06  DN 送貨單
```

> ⚠️ 包裹編號為 **BX**（兩碼），不是 BOX

### 必填欄位規則

每個 model 必須有：`id / tenant_id / created_at / created_by / updated_at / updated_by`

### 多租戶隔離

```
所有業務表格必須有 tenant_id
所有查詢加上 WHERE tenant_id = :tenantId
JWT payload 包含 tenantId,每個 request 自動帶入
所有 (code/levelCode 等業務 unique key) 必須與 tenantId 組成 composite unique
```

---

## 六、業務邏輯重點

### 出貨流程統一化

```
撿貨完成 → 包貨(I04) → 依出貨方式分流
  配送:正常包裝 + 出貨標籤 → 產生 DN
  自取:簡易包裝(不封箱) → BX 編號 → 客戶到場核對後封箱
  寄貨:正常包裝 + 物流標籤 → 第三方物流取件
  調撥:正常包裝 + 調撥標籤 → 產生 DN
```

### partner_type 代碼
```
C = 客戶 / S = 零件供應商 / T = 外包物流 / V = 一般廠商 / B = 銀行
```

### 倉庫類型
```
H = HQ 總部集中倉 / M = 主倉 / W = 分倉 / S = 衛星倉
```

### 登入流程規範（X1 改造，2026-04-21 上線）

NEXORA 走標準 SaaS multi-tenant 登入模式，**強制要求 tenantCode**：

1. 使用者必須輸入 `tenantCode` + `userAccount` + `password`
2. 後端用 `(tenantId, userAccount)` composite key 精確查詢使用者
3. 不再支援「沒帶 tenantCode 的 fallback findFirst」（消除安全漏洞 A001）

#### 錯誤訊息分級原則

| 情境 | 錯誤訊息 | 為什麼 |
|------|---------|-------|
| tenantCode 不存在 | 「登入失敗，請確認公司帳號、使用者帳號與密碼」 | 模糊處理防 enumeration |
| user 不存在 | 同上 | 同上 |
| 密碼錯誤 | 同上 | 同上 |
| tenant 已停用 | 「公司帳號已停用，請聯繫系統管理員」 | 明確訊息（使用者該知道）|
| user 已停用 | 「使用者帳號已停用，請聯繫您的公司管理員」 | 明確訊息 |

#### 三個測試租戶資訊

| tier | tenantCode | tenantId | adminUserId | plan |
|------|-----------|----------|-------------|------|
| LITE | `TEST-LITE` | `NX99TANT9900001` | `NX01USER9900001` | NEXORA-LITE-M |
| PLUS | `TEST-PLUS` | `NX99TANT9900002` | `NX01USER9900002` | NEXORA-PLUS-L |
| PRO  | `TEST-PRO`  | `NX99TANT9900003` | `NX01USER9900003` | NEXORA-PRO-XL |

三個 admin 帳號都叫 `admin`，密碼都是 `Nexoragrid2026`。

---

## 七、Seed 架構（2026-04-21 定案，TASK-SEED-REFACTOR-01）

### 三層架構

```
packages/db-core/prisma/seed/
├─ client.ts
├─ index.ts            主入口(CLI: --mode system|test|all, --tier lite|plus|pro|all)
├─ lib/
├─ system/             系統層(所有環境跑,含 PROD)
│  ├─ constants.ts                  SYSTEM_TENANT_ID / SYSADMIN_USER_ID
│  ├─ nx99_system_tenant.ts         SYSTEM 租戶 + SYSADMIN 合併建立
│  ├─ nx99_plan.ts                  9 級距方案
│  ├─ nx01_view.ts                  118 個畫面
│  ├─ nx01_role_view.ts             權限矩陣(826 × tier 過濾)
│  ├─ nx01_currency.ts              ISO 4217
│  ├─ nx01_country.ts               ISO 3166-1 alpha-3
│  └─ nx01_warehouse_type.ts        全域型錄(H/M/W/S)
├─ template/           租戶模板(被 applyTemplateToTenant 呼叫)
│  ├─ index.ts                      applyTemplateToTenant 統合入口
│  ├─ apply-role.ts                 8 個職務(含 HR_ADMIN)
│  ├─ apply-car-brand.ts            (tenantId, code) composite key
│  ├─ apply-part-group.ts           (tenantId, code)
│  ├─ apply-part-brand.ts
│  ├─ apply-customer-grade.ts
│  ├─ apply-discount-code.ts
│  ├─ apply-account-code.ts         (tenantId, code)
│  ├─ apply-warehouse.ts            依 tier 建 1/2/6 倉
│  ├─ apply-department.ts           LITE skip / PLUS 4 / PRO 6
│  ├─ apply-leave-type.ts           僅 PRO
│  ├─ apply-medal-level.ts          僅 PRO, (tenantId, levelCode), 16 階
│  └─ apply-welcome-bulletin.ts
└─ test/               測試租戶(僅 NODE_ENV=development/test 跑)
   ├─ constants.ts
   ├─ index.ts                      runTestSeed
   ├─ lite/{tenant,users,index}.ts  4 測試使用者
   ├─ plus/{tenant,users,index}.ts  6 測試使用者(+物流+人資)
   └─ pro/{tenant,users,index}.ts   8 測試使用者(+主管+行政)
```

### 三層執行邏輯

```typescript
// 概念示意
runSystemSeed(prisma)              // 跨所有環境
  // 建 SYSTEM tenant + SYSADMIN + 全域型錄

runTestSeed(prisma, tier)          // 僅 NODE_ENV=development/test
  // for each tier {
  //   1. seedTenant()             // 建租戶 + admin
  //   2. applyTemplateToTenant()  // 套用範本(依 tier 過濾)
  //   3. seedTestUsers()          // 建測試使用者 + 指派 role
  // }
```

### CLI 使用

```bash
# 完整跑(DEV 預設)
pnpm prisma db seed

# 只跑系統層(PROD 部署用)
pnpm tsx prisma/seed/index.ts --mode system

# 只跑特定 tier
pnpm tsx prisma/seed/index.ts --mode test --tier pro
```

### applyTemplateToTenant 設計

供兩處共用：
- `test/` 層的測試租戶建立
- 未來 SYS-W01 真實客戶初始化 API

---

## 八、架構債管理

### 三級分類規範（2026-04-21 定案）

| 等級 | 範例 | 處理方式 |
|------|------|---------|
| 🔴 多租戶設計缺陷 | 全域 unique 在 tenant 表 | **當下修**（與當前任務一起修）|
| 🟡 協作漏洞 drift | DB / schema 不一致 | **另案任務**（grep + git blame 後決策）|
| 🟢 命名／註解不一致 | PLACEHOLDER 舊名稱 | **順手清理**（commit 標示「順手修復」）|

### 順手清理授權範圍（給 Hank）

Hank 可在以下三條件**全滿足**時自行清理：
1. 不改變外部行為（只重構內部命名 / 結構）
2. commit message 標示「順手修復：xxx」
3. 完成回報的「偏差說明」段落列出

**仍需先問 Crown 的**：
- 改 schema（migration）
- 改變外部 API 介面
- 改變業務邏輯
- 刪除檔案或函式
- 第三方套件版本變動

### 破壞性指令的 consent 機制

即使 Alex 的 spec 寫「可以執行 reset / drop / delete」，
Hank 遇到破壞性指令仍需**當下向 Crown 取得明確同意**才執行。

例如：`prisma migrate reset --force` 必須帶 `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 環境變數，
且該變數內容必須引用 Crown 當下訊息的原文同意。

### 架構債追蹤表（A 系列編號）

| 編號 | 描述 | 發現日期 | 修復方式 | 狀態 |
|------|------|---------|---------|------|
| A001 | auth fallback 跨租戶 session 誤派風險 | 2026-04-21 | Migration 2 + X1 強制 tenantCode | ✅ 已修 |
| A002 | nx07 狀態 default silent mismatch（DB 'N/P/D' vs schema/業務 'NORMAL/DRAFT'）| 2026-04-21 | TASK-SCHEMA-DRIFT-FIX-01 Migration 3 | ✅ 已修 |

未來新發現的架構級 issue 用 A 系列編號延續。

---

## 九、路由架構（v1，2026-04-13 定案）

```
/dashboard                          首頁儀表板
/dashboard/nx02/domestic            國內採購(採購專員)
/dashboard/nx02/import              國外採購(採購專員)
/dashboard/nx02/special             特殊採購-掃貨(採購專員)
/dashboard/nx02/product             產品管理(採購組長)
/dashboard/nx02/vendor              廠商管理(採購組長)
/dashboard/nx03/workspace           庫存作業工作台
/dashboard/nx03/warehouse-setting   庫位管理 + 安全量建議
/dashboard/nx04/domestic            國內銷售
/dashboard/nx04/export              國外銷售
/dashboard/nx04/customer            客戶管理
/dashboard/nx05/workspace           財務作業工作台
/dashboard/nx06/workspace           物流作業工作台
/dashboard/nx07/workspace           人資作業工作台
/dashboard/nx08/workspace           報表分析工作台
/dashboard/nx09/workspace           知識管理工作台

手機版:
/m/nx03   倉管手機版
/driver   外務手機版
```

### URL v2 規劃（2026-04-21 產出，待整合）

Alex 端已有 `NEXORA_URL_STRUCTURE_v2.md`（153 個 URL），
核心變更：**工作台 × 單據管理完全分離**，採老 ERP 雙 Tab 設計，國內外單據合併用 Tab 篩選。

⚠️ 等 TASK-SEED-DEMO-02 完成後，才拆成 UI 任務給 Hank。

---

## 十、畫面規劃文件清單

存放於 `docs/ui/`，共 **19 份文件，10,372 行**：

| 文件 | 涵蓋內容 | 行數 |
|------|---------|------|
| SYS_DASHBOARD.md | 首頁儀表板（三版本版型/EXP BAR）| 535 |
| SYS_LAYOUT.md | 共用版型規則（6種版型/快捷鍵/顏色/元件）| 756 |
| SYS-W01~W04（4份）| 初始化/升級/退版/Onboarding | 1,119 |
| NX02_PO_WORKSPACE.md | 國內採購作業工作台 | 657 |
| NX02_IMPORT_WORKSPACE.md | 國外採購差異設計 | 370 |
| NX02_PRODUCT_WORKSPACE.md | 特殊採購/產品管理/廠商管理 | 708 |
| NX03_WAREHOUSE_WORKSPACE.md | 入庫/出庫/盤點作業工作台 | 788 |
| NX03_MOBILE_WAREHOUSE.md | 手機版倉管（專員/組長）| 668 |
| NX04_SO_WORKSPACE.md | 國內銷售作業工作台 | 675 |
| NX04_EXPORT_WORKSPACE.md | 國外銷售差異設計 | 383 |
| NX04_CUSTOMER_WORKSPACE.md | 客戶開發/分級/需求回饋 | 465 |
| NX05_FINANCE_WORKSPACE.md | AR/AP/收付款/票據/折讓/關帳 | 700 |
| NX06_LOGISTICS_WORKSPACE.md | 物流組長桌面/外務手機版 | 559 |
| NX07_HR_WORKSPACE.md | 出勤/請假/薪資/績效/訓練/人事 | 788 |
| NX08_REPORT_WORKSPACE.md | 8大分析報表群組 | 777 |
| NX09_KM_WORKSPACE.md | 知識庫/文件庫/會議管理 | 464 |
| NX10_GAME_WORKSPACE.md | Exp系統/排行榜/轉職系統 | 716 |

### 設計系統文件（2026-04-21 產出，待整合）

| 文件 | 說明 | 位置 |
|------|------|------|
| NEXORA_DESIGN_SYSTEM_INVENTORY.md | 14 範本 + 41 模組 + 25 原子 | Alex 端 |
| NEXORA_URL_STRUCTURE_v2.md | 153 個 URL，工作台 × 單據管理分離 | Alex 端 |

⚠️ 設計系統文件目前在 Alex 端，**等 TASK-SEED-DEMO-02 完成後**才拆成 UI 任務給 Hank。

---

## 十一、Workflow 文件架構

存放於 `docs/workflow/`，共 59 個文件：

| 部門 | 代碼 | 數量 |
|------|------|------|
| 採購部 | P-W01~P-W09 | 9 個 |
| 銷售部 | S-W01~S-W06 | 6 個 |
| 倉管部 | I-W01~I-W04 | 4 個 |
| 財務部 | F-W01~F-W07 | 7 個 |
| 人資模組 | H-W01~H-W06 | 6 個 |
| 報表分析 | R-W00~R-W07 | 8 個 |
| 知識管理 | NX09-W01~W03 | 3 個 |
| 遊戲化 | NX10-W01~W02 | 2 個 |
| 子流程 | I01~P01 等 | 14 個 |

---

## 十二、開發進度

### 已完成（截至 2026-04-22）

#### 規格與設計
| 項目 | 說明 |
|------|------|
| 模組重排 v2.0 | 12 個模組定義完成 |
| 版本定價 | LITE/PLUS/PRO 共 9 個級距 |
| 欄位定義 | 1,988 欄 128 張表 |
| 單據編號規則 v3 | 22 筆 |
| Workflow 文件 | 59 個主流程/子流程 |
| 畫面規劃文件 v1 | 19 份，10,372 行 |

#### Schema 與 Seed（2026-04-21 完成 TASK-SEED-REFACTOR-01）
| 項目 | 說明 |
|------|------|
| Prisma 7 baseline migration | 128 表結構建立 |
| Seed 三層架構 | system / template / test 完整 |
| Migration 1: fix_tenant_scoped_unique | 4 表的 unique 改 tenant-scoped |
| Migration 2: drop_global_user_account_unique | 拔除 nx01_user 全域 unique |
| Migration 3: fix_schema_drift（DRIFT-FIX-01）| 8 處 drift 收斂（4 index + 4 default）|
| 三租戶測試環境 | LITE / PLUS / PRO 完整可用 |
| X1 登入改造 | 強制 tenantCode（API + UI + DTO）|

#### 架構債清零
| 編號 | 描述 | 修復 |
|------|------|------|
| A001 | auth fallback 跨租戶誤派 | Migration 2 + X1 |
| A002 | nx07 狀態 default silent mismatch | Migration 3 |

### 進行中
| 任務 | 狀態 | 預計完成 |
|------|------|---------|
| TASK-SEED-DEMO-02 | 大方向已定，細節討論中 | 2026-04 月底 |

### 待啟動（依優先順序）

#### 短期（Q2 內）
| 任務 | 觸發條件 | 說明 |
|------|---------|------|
| TASK-UI-* 系列 | DEMO-02 完成後 | 從 URL v2 拆出 15~20 個 UI 任務 |
| TASK-SCHEMA-AUDIT-01 | UI 開發中插入 | 全 schema 多租戶設計 audit |

#### 中期（觸發前不執行）
| 任務 | 觸發條件 | 說明 |
|------|---------|------|
| TASK-RAILWAY-ENV-SPLIT | 第一個真實客戶簽約前 2~4 週（預估 2027 Q1）| 分離 production/staging/development |
| TASK-STRESS-TEST-01 | 同上 | 100 模擬租戶壓力測試 |

### 長期願景
- 2026 Q3：UI 完整版上線，Innova 可開始接客戶
- 2027 Q1：第一個真實客戶簽約
- 2028 Q3：Yaro Enterprise 正式營運（NEXORA 為核心 ERP）

---

## 十三、規格文件清單

存放於 `docs/spec/`：

| 檔案 | 說明 |
|------|------|
| nx_model_v2.csv | 12 個模組定義 |
| nx_table_v7.csv | 124 張表清單 |
| nx0x_field_v1.csv（各模組）| 欄位定義 |
| doc_number_rules_v3.csv | 單據編號規則 22 筆 |
| version_plan.csv | 版本定價級距 9 個 |
| version_feature_matrix.csv | 功能矩陣 83 項 |
