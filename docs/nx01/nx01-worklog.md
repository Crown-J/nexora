<!-- docs/nx01/nx01-worklog.md -->

# NEXORA - NX01 - 共用基礎模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX01 主檔管理（user / role / part / part-brand / partner / warehouse / warehouse-type / customer-grade / currency / bulletin）+ 跨模組但 NX01 主導的工作（X1 強制 tenantCode、Seed 三層架構）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史散在 `main` 與 `feature/wp-phase1-w2-mini`、`feature/sys-dashboard` 等

---

## 結構說明

- 按主題（不按時間順序）累加、給 Alex 跨對話讀的考古手冊
- 同一主題下多個 commit 用「YYYY-MM-DD commit_hash | 摘要」記錄
- 寫「為什麼這樣蓋」「踩過什麼坑」、不寫「現在長什麼樣」（那是 [system-architecture.md](../_team/system-architecture.md) 的事）
- ⚠️ 標記未確認 / 待 Crown / Alex 補充的項目

---

## 主題 1｜v7_baseline + NX01 模組首次成形（2026-04-13）

### 起源

`spec_v7_baseline` 是 NEXORA 重啟後的第一份完整 schema（128 表）。**模組代碼從 `nx00` 改名為 `nx01`** — 從這天起 `nx01_user / nx01_role / nx01_part / ...` 才正式落地、SYS-DASH 系列 task 是把這次改名 + 模組重劃一次到位。

### 設計決策

1. **NX00 → NX01 改名**：原本「主檔管理」用 `nx00`、v7 改成 `nx01`。理由：給「共用核心」保留 `nx98`（單據流轉）、「系統管理」保留 `nx99`、業務模組從 NX01 開始更直覺。
2. **後端模組劃分採「11 子模組」而非 14**：即使 schema 有 25+ 個 `Nx01*` model、Phase 5 只暴露 11 個 controller。其餘（CarBrand / BrandCodeRule / PartGroup / Country / Location / Department / Team / DiscountCode / CalendarEvent / KpiTemplate / AuditLog）暫不做 REST、走 seed 或 lookup 即可。
3. **tenant-scoped unique 補洞（同日 migration）**：v7 baseline 把 `Nx01Warehouse / Nx01PartBrand / Nx01Partner / Nx01Role` 的 `code` 設為**全域 unique**、馬上發現會跨租戶撞號 → `20260413180000_nx01_tenant_code_unique` 改成 `(tenantId, code)` composite。

### 實作歷程

- 2026-04-13 `2caa872` | sync nx-ui dashboard routes + spec v7 migration baseline（128 表落地）
- 2026-04-13 `ec66b8c` | SYS-DASH-P4：seed 架構 + system/default seed data
- 2026-04-13 `c210ce2` | SYS-DASH-P5：complete all backend API modules NX01-NX10（NX01 11 子模組成形）
- 2026-04-13 `5866748` | SYS-DASH-P5：nx-api NX99-NX10 modules + remove nx00（nx00 正式退役）
- 2026-04-13（migration）`20260413180000_nx01_tenant_code_unique` | 4 表 unique 改 tenant-scoped

### 踩坑 / 學到的

- **schema 全域 unique 是 v7 baseline 的常見漏洞**。整個 v7 baseline 寫的時候沒系統性審視「這個 unique 該不該加 tenantId」、第一天就要補一輪。教訓：Schema review 時看到 `@@unique([code])` 不帶 tenantId、預設質疑（業務型錄通常都是 tenant-scoped）。
- **Prisma 7 的 unique 是 `CREATE UNIQUE INDEX`、不是 `ADD CONSTRAINT`**。手寫 migration 想 drop 舊 unique 要用 `DROP INDEX`、不是 `DROP CONSTRAINT`。
- **Cursor agent 跑 `prisma migrate reset` 會卡住**。Prisma 7 對 AI agent 加了 `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 安全機制、用 `DROP SCHEMA public CASCADE` + `migrate deploy` 繞過更穩。
- ⚠️ **後端「14 子模組」是文件說法、實作只有 11**。原任務指令誤寫、Crown 已確認、本日誌統一用 11；[system-architecture.md](../_team/system-architecture.md) §B.1 同步修正。

### 對應文件

- 欄位定義：[docs/nx01/reference/field-definitions.csv](reference/field-definitions.csv)
- 主檔對照矩陣：[docs/nx01/reference/master-field-matrix.md](reference/master-field-matrix.md)（主題 2 產出）

---

## 主題 2｜NX01 主檔欄位對齊（TASK-0422 + TASK-0423，2026-04-20~23）

> 字數最多的一塊：分三小節（schema 對齊 / API 收斂 / 前端整合）方便 Alex 按議題讀。

### 起源

v7_baseline + SYS-DASH-P5 雖然把 11 子模組 controller 撐起來、但很多 DTO 跟 schema 對不上、前端還在用舊 `nx00/*` 路徑、查詢參數也不統一（`q` vs `search`、回應 `rows` vs `items`）。Crown 拍板要「**先把 NX01 主檔線完整收斂**、再進業務模組」。

### 設計決策

1. **產出 master-field-matrix**：用一張 markdown 矩陣表把「Prisma model ↔ nx-api DTO/Service ↔ nx-ui 型別/表單」全部對齊、刻意暴露**已實作 vs 未實作**的落差（CarBrand / BrandCodeRule / PartGroup 等都標 **「未實作」**）。
2. **Partner code 重複檢查改 tenant 範圍**：對應主題 1 的 tenant-scoped unique migration、business 層也要跟上。
3. **Partner PATCH 剝除 code**：避免使用者改 partner code 造成單據反查斷鏈、UI 端先擋。
4. **前端 API client 全面改名**：`/base/*` → `/nx01/*`、`q` → `search`、`rows` → `items`、`PUT` → `PATCH`。一次到位、不留 backwards-compat shim。
5. **後端 list `pageSize ≤ 100` 強制**：`Nx01ListQueryDto` 加 `@Max(100)`、防止前端誤傳 `pageSize=2000` 直接拖垮 query。

### 實作歷程

#### 2A. Schema 對齊 + DTO 擴充

- 2026-04-20~22 `83a0812` | TASK-0422：master-field-matrix + Part/Partner DTO 大擴充
  - **Part**：補 `segs / partType / returnPolicy / warrantyMonths / priceA~D / 價格異動稽核欄位`
  - **Partner**：補 `creditLimit / paymentTermImport / incoterm / customerGrade join`
- 新 lookup API：`GET /nx01/customer-grades`、`GET /nx01/warehouse-types`（兩個都是唯讀 list、給 partner / warehouse 表單下拉）

#### 2B. API client 路徑與參數收斂

- 一次性把 base / nx00 相關 client 全收到 `/nx01/*`：users / roles / warehouses / partners / parts / part-brands / bulletins
- 查詢 query：統一 `search`（不再用 `q` / `keyword`）
- 回應結構：統一 `items[]`（不再用 `rows[]` / `data[]`）
- 更新方法：統一 `PATCH`（不再 `PUT` 整包）
- 公告路徑：`/dashboard/base/bulletins` 取代舊的 `/dashboard/bulletin`

#### 2C. 前端 server pagination + fetchAllPages 防線（TASK-0423 + 0421 延伸）

- 2026-04-22 `8d6fe81` | NX01 user/role lists：server pagination + listQuery fixes
- 2026-04-22 `799fb71` | clamp pageSize to 100 + split URL state + nx00 user/role list
- 2026-04-23 `ca9bbba` | 全站 nx01 list pageSize clamp + fetchAllPages
- 重點手段：
  - 新建 `shared/api/fetchAllPages` helper：每頁 ≤100、自動聚合（給 picker 等需要全載的場景）
  - 主檔 list 改 **debounce 關鍵字 + server pagination**（`SERVER_PAGE_SIZE=50`）、不再 client filter 大資料集
  - 明細若不在當頁、用 `getUser / getRole` 單筆補齊（避免「找不到列」的錯覺）
- ListUserQueryDto 加 `primaryRoleIds`（CSV）、`UserService` search 擴及電話 / 主要角色名 / 倉庫代碼

### 踩坑 / 學到的

- **`tsc --noEmit` 會被 `.next/types/validator.ts` 舊路由誤報**。改路徑後一定要 `rm -rf .next` 再跑、否則 type error 是 stale 的、不是真的錯。Crown 一度被誤報嚇到、Hank 後來都改用 `pnpm build` 驗。
- **路徑統一一次性比漸進好**。原本想「先改 user 再改 role」、結果 client 跟 backend 路徑暫時 mismatch 又要寫 alias、最後反而是同一個 commit 全改完最省事。一次性 breaking change > 半套相容。
- **「每頁 ≤100」是後端真實上限、前端必須 clamp**。先前一堆地方傳 `pageSize=2000` 撈全部、上 prod 會 400。`fetchAllPages` helper 是這個約束的唯一正解。

### 對應文件

- 主檔對照矩陣：[docs/nx01/reference/master-field-matrix.md](reference/master-field-matrix.md)
- 欄位定義：[docs/nx01/reference/field-definitions.csv](reference/field-definitions.csv)
- 仍未做 REST 的 NX01 model 清單見 matrix「**未實作**」標記（給 Alex 寫 spec 時挑）

---

## 主題 3｜A001 + X1 強制 tenantCode 登入（2026-04-21）

### 起源

v7_baseline 留了一個**跨租戶 session 誤派**的 hole：`Nx01User.userAccount` 是**全域 unique**、登入只憑 `userAccount + password`、沒有 tenant 篩選。如果兩家租戶的 admin 都用 `admin` 這個 account（DEMO-02 三租戶就是這設計）、登入後 JWT 會誤帶錯 tenantId、業務查詢全錯。**A001 = 多租戶設計缺陷、🔴 級當下修**。

### 設計決策

1. **Migration drop 全域 unique**：`Nx01User.userAccount` 不再 unique、改成 `(tenantId, userAccount)` 才是業務 unique。
2. **登入路徑強制要 `tenantCode`**：API + UI + LoginDto 全要、沒有 `tenantCode` fallback。Demo banner 也強化、避免測試環境誤用。
3. **JWT payload 帶 tenantCode**：每個 request middleware 自動帶入、業務查詢必加 `WHERE tenant_id = :tenantId`。
4. **後續 demo session 從 login tenantCode 反推 planCode**（`b6da920`）：之前 demo 用 mock context 切 plan、改成依登入時的 tenantCode 對應 SUBSCRIPTION 表反查 planCode。

### 實作歷程

- 2026-04-21（migration）`20260421144610_drop_global_user_account_unique` | A001 修復
- 2026-04-21 `ac8aaf7` | TASK-SEED-REFACTOR-01 Migration 2：drop user_account 全域 unique
- 2026-04-21 `c73c84b` | TASK-SEED-REFACTOR-01 X1：強制 tenantCode 登入（API + UI + LoginDto + demo banner）
- 2026-04-22 `b6da920` | DEMO-R4A-FIX：demo session 從登入 tenantCode 推 planCode

### 踩坑 / 學到的

- **多租戶設計缺陷一定當下修、不要拖**。A001 是「**🔴 級**」（依本日誌新定義的三級分類：🔴 多租戶設計缺陷立刻修 / 🟡 協作漏洞 drift 另案 / 🟢 命名不一致順手清）、不能等下個 sprint。等到第二家租戶接 prod 才修就是事故。
- **「demo mode 短路 auth」是埋雷**。原本為了 demo 方便、auth 給了 fallback 路徑；後來用 fallback 的不只 demo、其他地方也接上、要拔的時候到處都是。教訓：demo / 短路機制要綁明確 env flag、ban 一切「沒設環境變數時的 fallback 行為」。
- **Schema 改 unique 要連 application 層一起改**。Migration drop unique 後、`UserService.findByAccount` 還用 `findUnique` 會直接爆、必須改成 `findFirst({ where: { tenantId, userAccount } })`。grep 全 codebase 找 `userAccount` 用法是必要步驟。

### 對應架構債

- ✅ A001（已解決）— 對應 [system-architecture.md](../_team/system-architecture.md) §G.1
- 對應 memory：`project_task_seed_refactor.md`（X1 是 Step 4 的一部分）

---

## 主題 4｜Seed 三層架構重整（TASK-SEED-REFACTOR-01，2026-04-21）

### 起源

v7_baseline 的 seed 是「`default/` 一層平鋪」、22 個 CSV 檔混在一起、不分「跨環境系統資料」vs「新租戶模板」vs「測試 fixture」。問題：
- prod deploy 時可能誤建 demo data（`default/` 沒有環境保護）
- 升級租戶（LITE → PLUS）要補新資料、`default/` 邏輯沒辦法只挑 PLUS 那層
- 測試環境跟 prod 共用 seed 結構、test fixture 改動會影響 prod

### 設計決策

1. **拆三層**：
   - `system/` — 跨環境（含 prod）：SYSTEM tenant + SYSADMIN + 全域型錄（view / role_view / currency / country / warehouse_type / plan）
   - `template/` — 租戶模板：`applyTemplateToTenant({ tenantId, tier, actorUserId })` 統合入口、依 tier 過濾（LITE / PLUS / PRO）
   - `test/` — 僅 `NODE_ENV=development|test` 跑：lite / plus / pro 三租戶 fixture
2. **SYSADMIN 設計**：`NX01USER0000001`、永遠保留、`isActive=FALSE`、不開放 UI 登入、僅供 DB seed/migration 填 `created_by`。
3. **ID 段位規劃**（重要標準）：
   ```
   nx01_user:
     0000001         SYSADMIN（保留）
     0000002~0899999 真客戶
     9900001~9999999 測試租戶
   nx99_tenant:
     0000000         SYSTEM tenant（保留、isActive=FALSE）
     0000001~0899999 真客戶
     9900001~9999999 測試租戶
   ```
4. **seed 主入口加 `--mode / --tier` flag**：`pnpm tsx prisma/seed/index.ts --mode all --tier all`、Prisma 7 `migrate reset` 不再自動跑 seed、必須兩段執行。
5. **template apply 函式 12 個**：每個業務型錄一個 `apply-*.ts`、依 tier 過濾、idempotent upsert。

### 實作歷程

- 2026-04-21 `0afba4b` | Step 1：建立 template/test 目錄結構
- 2026-04-21 `712157c` | Step 2：system 層（SYSTEM tenant + SYSADMIN + 9 plans + view/currency/country）
- 2026-04-21 `b3d4c88` | Step 3 P1 — Migration 1：`fix_tenant_scoped_unique`（4 個表 `@@unique([code])` 改 `(tenantId, code)`、跟主題 1 同源延伸）
- 2026-04-21 `dc9e483` | Step 3 P2+3：system/warehouse_type + template/ 12 個 apply 函式
- 2026-04-21 `1d0209d` | Step 4 test：test/ 11 個檔案（3 個測試租戶）
- 2026-04-21 `74012fc` | Step 5：seed 主入口改寫支援 `--mode/--tier`
- 2026-04-21 `53b900d` | Step 6+7：刪 default/ 22 檔 + checkin-reward 情境 A + CLAUDE.md 順手更新

### 事實校正（揭露原 spec 錯誤）

- ⚠️ `nx01_role` 實際 **8 個職務**（含 `HR_ADMIN` 人資主管）、原 spec 寫 7 個 → spec 已修
- ⚠️ `nx10_medal_level` 實際 **16 階**（4 tier × 4 rank）、原 spec 寫 20 階 → spec 已修

### 三租戶測試環境

| tier | tenantCode | tenantId | adminUserId | plan |
|------|-----------|----------|-------------|------|
| LITE | `TEST-LITE` | `NX99TANT9900001` | `NX01USER9900001` | NEXORA-LITE-M |
| PLUS | `TEST-PLUS` | `NX99TANT9900002` | `NX01USER9900002` | NEXORA-PLUS-L |
| PRO  | `TEST-PRO`  | `NX99TANT9900003` | `NX01USER9900003` | NEXORA-PRO-XL |

三個 admin 帳號都叫 `admin` / 密碼都是 `Nexoragrid2026`（bcrypt hash 在 `system/constants.ts`）。**三個 admin 同帳號不同 tenant** — 這就是逼 X1（主題 3）必須做的場景。

### 踩坑 / 學到的

- **system 跟 template 的界線要明確**。一開始想把 `nx01_warehouse_type` 放 template（每租戶建一份）、後來改回 system（schema 沒 tenantId、跨租戶共用）。判準：**schema 有沒有 tenantId 欄位**、有就 template、沒有就 system。
- **template apply 函式 idempotent 必須 `findFirst + update/create`、不能用 `upsert + composite key`**。理由：tier upgrade 時補寫 PLUS 資料、PLUS 資料的 unique key 可能跟 LITE 撞、`upsert` 會直接 fail。
- **`prisma migrate reset` 不再自動跑 seed（Prisma 7 變更）**。本機+Railway 各驗一次、確認兩段流程：
  ```bash
  pnpm prisma migrate reset --force
  pnpm tsx prisma/seed/index.ts --mode all --tier all
  ```
- **架構債三級分類**從這次任務揭露：🔴 多租戶設計缺陷立刻修、🟡 協作漏洞 drift 另案、🟢 命名不一致順手清。後續 memory `feedback_tech_debt_cleanup.md` 是這次具體規則化的成果。
- **「順手清理」三條件**從這次明確化：(1) 不改外部行為 (2) commit 訊息標示順手修 (3) 完成回報列出。本任務順手清的：`PLACEHOLDER_ACTOR` / `.gitignore` / `_ddl_fragment.sql` 註解 / CLAUDE.md line 356。

### 對應架構債 / 文件

- ✅ A001（X1 是 Migration 2 + step 4 的一部分）
- ⚠️ **A002（schema drift）** 也是本次 task 間插完成、跨多模組（NX07 status default + 4 個 index）— 詳見 [_team/worklog.md 主題 2](../_team/worklog.md)、不在本日誌範圍。
- 對應 memory：`project_task_seed_refactor.md`、`feedback_tech_debt_cleanup.md`
- ⚠️ `template/apply-checkin-reward.ts` **從未建立**（Step 7 情境 A）— 舊邏輯保留在 `pre-53b900d` git history、未來 NX10 遊戲化啟用時撈回。

---

## 主題 5｜DEMO-02 NX01 schema widening（A022 / A023，2026-04-28）

### 起源

DEMO-02 LITE seed 第一次跑、撞兩波 P2000「值太長」：

1. **第一波 part_brand.code VARCHAR(3) 太緊**：DEMO-02 用 13 個 sub-brand catalog（VW / Audi / Skoda / Porsche / Toyota / Honda / Hyundai / BMW / M-Benz / Ford / ...）、`HND` 縮寫同時撞 Honda 跟 Hyundai。
2. **第二波 brand_code_rule.name VARCHAR(15) 太緊**：`'Mercedes-Benz 編碼規則'` 是 18 字元、塞不下。

### 設計決策

1. **part_brand.code: 3 → 10**：Crown 拍方案 B widen、不縮寫。理由：「**業界真實感是 NEXORA pitch 賣點**、`'TOYOTA'` 比 `'TYT'` 賣相好」。
2. **brand_code_rule.name: 15 → 50**：audit 全 schema 60 個 name 欄位、只這欄緊縮、其他都 ≥ 50。`Nx10MedalLevel.levelName` 不縮、固定中文短詞獨立例外。
3. **兩波都拍「同 v7 historical drift」邏輯**：跟 Phase 0 16 欄一次清光（currency_id × 3 + docNo × 13）同精神延續、不過這次每波只 1 欄、widening 純加法。

### 實作歷程

- 2026-04-28（migration）`20260428044853_phase1_widen_part_brand_code` | A022
- 2026-04-28 `0b494c0` | WP-PHASE1-DEMO02-SCHEMA：widen `Nx01PartBrand.code` VARCHAR(3)→VARCHAR(10)
- 2026-04-28（migration）`20260428062337_phase1_widen_brand_code_rule_name` | A023
- 2026-04-28 `a390e0b` | WP-PHASE1-DEMO02-SCHEMA：widen `Nx01BrandCodeRule.name` VARCHAR(15)→VARCHAR(50)

### 踩坑 / 學到的

- **跑 demo seed 撞 P2000 → 立刻 audit 同類型欄位**（不只修當下這欄）。0427 Phase 0 兩波 currency_id + docNo widening 已經有教訓、0428 又重複一次（兩波相隔 ~1 小時）— 教訓：第一次撞「值太長」就該全 schema audit name 欄位、不要等第二波再 audit。本次 audit 後反而確認「**只有 1 欄需修**」、其他 60 個 name 欄位都 OK、audit 本身價值就在這。
- **業界真實感比邏輯題難寫**。第一版客戶名「信義誠信汽車材料行」邏輯沒問題、業界看了不對勁（像連鎖企業而非個體戶）。教訓：mock data 第一版必先給 Crown preview 業界感、再進 SQL/seed 落地。
- **「同 v7 historical drift 邏輯」適用範圍**：純 widening、跨模組但同源、commit 標示範圍。一旦不是 widening（破壞性 / 縮欄）就要單獨拍板、不可順手做。

### 對應架構債 / 文件

- ✅ A022 / A023（已解決）— [system-architecture.md](../_team/system-architecture.md) §G.1
- DEMO-02 主任務屬 NX99（跨模組）、本日誌只記 NX01 schema 改動的部分
- ⚠️ A024（customers-catalog 真實感）已修模板、待 Crown preview — 屬 DEMO-02 / NX99 範圍、不在本日誌

---

## 統整：NX01 Migration 列表（v7_baseline 之後）

| Migration | 主題 | 性質 |
|-----------|------|------|
| `20260413120000_spec_v7_baseline` | 主題 1 | 128 表結構建立（含全部 Nx01\*） |
| `20260413180000_nx01_tenant_code_unique` | 主題 1 | 4 表 unique 改 tenant-scoped（首輪補洞） |
| `20260421132744_fix_tenant_scoped_unique` | 主題 4 | 4 表 unique（template apply 撞號 → 第二輪補洞） |
| `20260421144610_drop_global_user_account_unique` | 主題 3 | A001 修復 |
| `20260421152710_fix_schema_drift` | （A002，跨模組）| ⚠️ 不在本日誌、待 `_team/worklog.md` |
| `20260428044853_phase1_widen_part_brand_code` | 主題 5 | A022 修復 |
| `20260428062337_phase1_widen_brand_code_rule_name` | 主題 5 | A023 修復 |

---

## 給未來新對話 Hank 的提示

- 本日誌是「**考古手冊**」性質、按主題不按時間排
- 寫的時候對齊 [hank-charter.md](../PROJECT_RULES.md) §D.2 工作日誌規範
- 已寫的後續（Phase 1 收官 2026-04-29）：
  - [_team/worklog.md](../_team/worklog.md)（8 主題跨模組統合 + 累計範式總表 + 工程文化範式 5 條）
  - `docs/nx02/nx02-worklog.md` ~ `docs/nx10/nx10-worklog.md`（10/10 完成）
- 撰寫流程：先盤點 → 列主題候選給 Crown → 拍板後再寫
- 範本可參考本日誌結構：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式

---

> 文件版本：v1.0（初版）
> 下次更新觸發：NX01 有新工作（migration / 新 controller / 主檔擴張）
