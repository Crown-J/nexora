<!-- docs/_team/crown-local-login-fix-merge-verify.md -->

# CROWN-LOCAL-LOGIN-FIX — 本機登入 HTTP 500 完整 verify + 解

> 性質：純諮詢 + verify 真相、無代碼 bug 可順手修、stop 給 Crown 本機操作
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 雙軌 merge 完成後本機 login HTTP 500、AU-999 + NW-001
> 紀律：A041 精確 count、§G.9 通配 grep、§I.6.3 揭露不完整每段尾標

---

## §1 verify 後端真相

### 1.1 nx-api 啟動配置（§G.9 grep + 讀檔已驗）

```
✅ main.ts line 88：PORT=3001（process.env.PORT 或 default）
✅ main.ts line 14：dotenv.config({ path: '../.env' })
✅ main.ts line 90：boot log「DATABASE_URL exists = <bool>」
✅ main.ts line 76：CORS 含 localhost:3000 + credentials: true
✅ auth.service.ts login flow：找 tenant by code → 找 user → bcrypt 驗密
```

### 1.2 DATABASE_URL 真實配置

```
apps/nx-api/.env line 23：
  DATABASE_URL="postgresql://nexora:nexora123@localhost:5433/nexora_core?schema=public"

packages/db-core/.env line 23-25：
  DATABASE_URL="postgresql://nexora:nexora123@localhost:5433/nexora_core?schema=public"
  DIRECT_URL="postgresql://nexora:nexora123@localhost:5433/nexora_core?schema=public"

✓ 兩者一致、皆指向 **本機 Docker PostgreSQL（localhost:5433）**
✗ Railway 配置已註解（之前在 #15-19 line、目前用本機）
```

### 1.3 JWT_SECRET 配置

```
✅ apps/nx-api/.env line 37：JWT_SECRET=7oU+Io+eoPCRPZrDaXCwfvXzB0Hd...（128-bit base64、足夠強度）
✅ JWT_EXPIRES_IN=8h
```

### 1.4 /auth/login API 500 推測 root cause

| 機率 | Root cause | 觸發行為 |
|------|-----------|---------|
| **⭐⭐⭐⭐ 最高** | Docker PostgreSQL 容器未啟動 | Prisma 連線 ECONNREFUSED → NestJS 500 |
| ⭐⭐⭐ 高 | Docker 啟動但 schema 未 migrate（無 nx99_tenant 表） | Prisma 拋 PrismaClientKnownRequestError → 500 |
| ⭐⭐ 中 | migrate 跑完但 seed 沒跑（TEST-LITE 不存在） | 走 AU-001（401）非 500、**Crown 看到 500 表非此情境** |
| ⭐ 低 | Prisma client 未 generate（@prisma/client 沒生） | nx-api 啟動就拋、Crown「重啟前後端」應已揭露 |
| ⭐ 低 | bcrypt 模組安裝失敗 | 同上、啟動就拋 |

⚠️ **NW-001 真相揭露**（§G.9 grep）：
```
apps/nx-ui/src/shared/api/client.ts:98：
  throw new Error(`[NW-001] HTTP ${res.status}${body ? \n${body} : ''}`);
```
NW-001 = 前端 API client 包裝任何 HTTP 非 2xx 為 NW-001 範式
**所以「NW-001 HTTP 500」= 後端真的回 500、不是前端網路問題**

---

## §2 verify 前後端對齊真相

### 2.1 nx-ui → nx-api baseURL 配置

```
apps/nx-ui/.env line 13：
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
apps/nx-ui/.env line 16：
  NEXT_PUBLIC_API_URL=http://localhost:3001
✓ 前端送 POST http://localhost:3001/auth/login
```

### 2.2 CORS 設定（main.ts line 76-86）

```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://app.nexoragrid.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
✓ http://localhost:3000（nx-ui）已允許
```

### 2.3 API endpoint 路徑對齊

```
前端 (login.ts line 45)：POST /auth/login
後端 (auth.controller.ts)：@Controller('auth') + @Post('login')
✓ 路徑對齊
```

### 2.4 Tenant / User seed 真相

```
seed 三個測試租戶（packages/db-core/prisma/seed/test/）：

TEST-LITE：
  tenant.code = 'TEST-LITE'
  admin userAccount = 'admin'
  passwordHash = bcrypt('Nexoragrid2026')

TEST-PLUS：
  tenant.code = 'TEST-PLUS'
  admin userAccount = 'admin'
  passwordHash = bcrypt('Nexoragrid2026')

TEST-PRO：
  tenant.code = 'TEST-PRO'
  admin userAccount = 'admin'
  passwordHash = bcrypt('Nexoragrid2026')
  + 多個業務角色 user（PRO 限定）

SYSTEM：
  tenant.code = 'SYSTEM'（NX99TANT0000000）
  sysadmin userAccount = 'sysadmin'
```

✅ **Crown 登入測試帳密**（seed 真實落地後）：

| 公司帳號 | 使用者帳號 | 密碼 |
|---------|-----------|------|
| TEST-LITE | admin | Nexoragrid2026 |
| TEST-PLUS | admin | Nexoragrid2026 |
| TEST-PRO | admin | Nexoragrid2026 |

---

## §3 順手修復評估

### 3.1 是否有代碼 bug 可順手修

```
✗ V2 + Polish 雙軌 final typecheck OK
✗ auth.service.ts login flow 邏輯完整、無 bug
✗ main.ts dotenv 載入正確（line 14）
✗ CORS 配置正確（含 localhost:3000）
✗ 前端 callLoginApi 路徑與 payload 對齊
✗ NEXT_PUBLIC_API_URL 配置正確
```

⭐ **結論：無代碼 bug 可順手修**、root cause 屬 **Crown 本機環境 / Docker / migration / seed 狀態**。

### 3.2 為何不能順手修

```
Hank 無法 verify Crown 本機：
- Docker container 啟動狀態（docker ps）
- localhost:5433 連線狀態
- Prisma migration 已套用狀態（_prisma_migrations 表）
- nx-api 真實啟動 console log
- nx-api error log

修復需 Crown 本機操作（destructive 範圍：prisma migrate reset / docker volume rm）
```

---

## §4 Crown 本機操作 step（onboarding 完整流程）

### 4.1 前置確認

```powershell
# 1. 確認 Docker Desktop 正在運行
docker ps
# 預期：列出 running containers（無需特定容器、Docker 引擎啟動即可）

# 2. 確認 PostgreSQL 容器狀態
docker ps -a | findstr nexora-postgres
# 預期：STATUS = Up 或 Exited
```

### 4.2 完整啟動流程（按序執行、每步驗證）

```powershell
# === Step 1：啟動 Docker PostgreSQL ===
cd c:\nexora
docker compose -f infra/docker/docker-compose.yml up -d
docker ps | findstr nexora-postgres
# 預期：STATUS = Up X seconds、PORTS = 0.0.0.0:5433->5432/tcp

# === Step 2：等 DB ready（5~10 秒）===
docker exec nexora-postgres pg_isready -U nexora
# 預期：accepting connections

# === Step 3：generate Prisma client ===
cd packages/db-core
pnpm prisma:generate
# 預期：✔ Generated Prisma Client (vX.X.X)

# === Step 4：套用 migration ===
pnpm prisma:migrate
# 互動 prompt：輸入 migration name 或直接 enter
# 預期：✔ Applied migration(s)

# === Step 5：跑 seed（system + 3 test 租戶）===
pnpm seed
# 預期：
#   ✅ [SYSTEM] tenant=NX99TANT0000000 sysadmin=...
#   ✅ [TEST/LITE] tenant=NX99TANTLITE0001 admin=...
#   ✅ [TEST/PLUS] tenant=NX99TANTPLUS0001 admin=...
#   ✅ [TEST/PRO]  tenant=NX99TANTPRO00001 admin=...
#   ✅ NEXORA Seed 全部完成

# === Step 6：啟動 nx-api（後端）===
cd ../../apps/nx-api
pnpm dev
# 預期 console：
#   [BOOT] DATABASE_URL exists = true
#   [BOOT] nx-api starting on port 3001
#   [Nest] LOG ... Nest application successfully started

# === Step 7：另開 terminal、啟動 nx-ui（前端）===
cd c:\nexora\apps\nx-ui
pnpm dev
# 預期：- Local: http://localhost:3000
```

### 4.3 登入驗證

```
1. 瀏覽器開 http://localhost:3000/login
2. 輸入：
   公司帳號：TEST-LITE
   使用者帳號：admin
   密碼：Nexoragrid2026
3. 點「登入系統」
4. 預期：跳轉到 /dashboard、TopBar 顯示「測試租戶（LITE）」+ [LITE] chip
```

### 4.4 troubleshooting（按錯誤訊息）

```
錯誤 A：「NW-001 HTTP 500」
  → 看 nx-api console 真實 error log
  → 若含「ECONNREFUSED」：Docker PostgreSQL 沒啟動（回 Step 1）
  → 若含「Table does not exist」：migration 沒跑（回 Step 4）
  → 若含「Cannot find module @prisma/client」：generate 沒跑（回 Step 3）

錯誤 B：「AU-001 請確認公司帳號、使用者帳號及密碼」
  → tenant TEST-LITE 不存在 / 公司帳號打錯
  → 確認 seed 完成（看 Step 5 console「✅ NEXORA Seed 全部完成」）

錯誤 C：「AU-003 請確認...」
  → user admin 存在但密碼錯
  → 確認密碼是「Nexoragrid2026」（區分大小寫）

錯誤 D：「AU-101 公司帳號已停用」
  → tenant.isActive = false（seed 不會生這樣的狀態、需 DB 直接改回 true）
```

### 4.5 .env.local 揭露（前端 demo flag 真相）

```
apps/nx-ui/.env.local line 2：
  NEXT_PUBLIC_DEMO_MODE=true   ← ⚠️ 這個讓 useSessionMe 用 DEMO_USER
  NEXT_PUBLIC_DEMO_TENANT_NAME=恆迎企業  ← 上輪 §G.9 揭露的 dead code 來源
  NEXT_PUBLIC_DEMO_USER_NAME=林翰杰
  NEXT_PUBLIC_DEMO_PLAN_CODE=PRO

但 apps/nx-ui/.env line 9：
  NEXT_PUBLIC_NEXORA_RUN_MODE=development  ← 讓 callLoginApi 走真實 API

兩個 demo flag 獨立：
  - DEMO_MODE → useSessionMe 短路
  - NEXORA_RUN_MODE → callLoginApi 短路（並 isNexoraDemoMode）

實測組合：
  RUN_MODE=development + DEMO_MODE=true
    = callLoginApi 送真實 API（HTTP 500 揭露來源）
    + useSessionMe 用 DEMO_USER（但登入失敗就到不了 useSessionMe）
  ⚠️ Crown 看到 HTTP 500 確認：callLoginApi 真的送出（非 demo 短路）
```

⭐ **Crown 真實業務測試建議**：
- 保留 `.env.local NEXT_PUBLIC_DEMO_MODE=true` 不變、或設 false
- 確保 `.env NEXT_PUBLIC_NEXORA_RUN_MODE=development`
- 走 Step 1~7 完整 onboarding

---

## §5 預期 final state

### 5.1 Crown 本機 login 成功後可見

```
登入頁：
  ✅ NEXORA GRID 標題
  ✅ 版本號「NEXORA GRID | v1.5.1 beta」在登入按鈕下方（V2 範式）
  ✅ 字級 110%（polish 軌、視覺較大）
  ✅ 錯誤 UI 橙色 warning（V2 範式、若打錯密碼可見）

Dashboard：
  ✅ TopBar 顯示「測試租戶（LITE）」+ [LITE] chip（GitHub minimal）
  ✅ 字級 110%

主檔中心 (/dashboard/base)：
  ✅ 25 卡片 / 6 分區（含 vehicle 車型字典）
  ✅ LITE 用戶看到 10 鎖卡（PLUS 9 + PRO 1）
  ✅ section header「n 項 / k 鎖」amber 提示
  ✅ 卡片副標題 truncate（1 行 + ellipsis）
  ✅ 點鎖定卡 → UpgradePromptDialog 開
  ✅ 點「了解升級方案」→ navigate /pricing

/pricing：
  ✅ LITE / PLUS / PRO 三方案對比卡
  ✅ PLUS highlighted（amber 邊框 + 推薦 chip）
  ✅ 「聯繫業務」mailto: CTA
```

### 5.2 業界改革 #22 v1.1 完整對外信用背書

```
給亞羅 / 客戶 / VC demo 場景完整閉環：
  1. LITE 登入 → TopBar [LITE]
  2. 主檔中心 25 卡、10 鎖灰化
  3. 點灰化卡 → Dialog 揭露升級內容
  4. 點「了解升級方案」→ /pricing 三方案對比
  5. mailto: 業務窗口

對齊 docx v1.0 截圖預備戰略：
  ✅ 登入頁（V2 橙色 warning + LoginVersionFooter）
  ✅ TopBar（tenant + plan chip）
  ✅ 主檔中心（25 卡 + 灰化 + badge）
  ✅ UpgradePromptDialog
  ✅ /pricing 對比表
```

---

## §6 揭露不完整（規範 §I.6.3）

```
1. Hank 無法 verify Crown 本機 Docker container 啟動狀態（屬 Crown 本機操作範圍）
2. Hank 無法 verify Crown 本機 _prisma_migrations 表狀態（同上）
3. Hank 無法 verify Crown 本機 nx-api 真實 console log（同上）
4. NEXT_PUBLIC_DEMO_TENANT_NAME=恆迎企業 在 .env.local 仍存在（上輪 §G.9 揭露 dead code、後續軌 TASK-MOCK-CLEANUP 清）
5. ⚠️ Hank 未動代碼（純諮詢文件、無 commit 修 frontend / backend）
6. push origin main + tags 仍等 Crown 拍板（destructive / 共享狀態）
```

---

## §7 後續軌 backlog（補 onboarding 體驗）

| 軌 ID | 內容 | 優先 |
|-------|------|------|
| TASK-LOCAL-ONBOARDING-DOC | docs/getting-started.md 完整文件（含本檔 §4 step）| P1 |
| TASK-NX-API-HEALTH-ENDPOINT | /health endpoint + frontend 預先 ping、avoid 500 | P2 |
| TASK-NX-API-DB-PROBE-LOG | nx-api 啟動時 verify DB 連線 + log（失敗 fast-fail）| P2 |
| TASK-MOCK-CLEANUP | mocks/dashboard.ts「恆迎企業」+ .env.local 等 dead code 清 | P3 |
| TASK-PLAN-NORMALIZE-EXTRACT | normalizePlanCode 抽 shared/lib/plan.ts | P3 |

---

**Hank 不修代碼**（紀律邊界）：
- 無代碼 bug 可順手修（auth.service / main.ts / login.ts / .env 配置全綠）
- root cause 屬 Crown 本機環境（Docker / migration / seed）
- 修復需 Crown 本機操作（destructive 範圍、Hank 不擅自）

**等 Crown 本機跑 Step 1~7**（純諮詢文件、無代碼變更）。
