<!-- docs/_team/login-page-feature-audit.md -->

# LOGIN-PAGE-FEATURE-AUDIT — 登入畫面既有功能落地真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：NEXORA v1.5（main HEAD `13fab41`、13 tag）後 Crown 啟動 UI 真實化軌、第一階段測試報告產出、Alex 列 A-E 5 大類測試項目、Hank verify 哪些已落地避免 Crown 測 Hank 沒做的功能
> 對齊：[NX-UI-AUDIT-01](./ui-audit-01.md) §6.3 auth wire 揭露 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 結論先說（給 Crown 測試清單用）

⭐ **18 項測試項目落地統計**：

```
✅ 已落地：12 項
⚠️ 部分：1 項
❌ 未實作：5 項
🔵 後續軌候選：4 項
```

⭐ **Crown 測試重點建議**：
- ✅ 可測 12 項已落地（A1/A2 部分/A5 + 全 B + C1/C4 + 全 D + E1）
- ❌ 不要測：A2 多次錯誤鎖定 / A4 忘記密碼 / B3 記住帳號 / B4 自動 focus / B6 預填 / C3 Rate Limiting / E2 SSO
- ⚠️ A3 多租戶大小寫：backend `mode: 'insensitive'` 已 wire、可測

---

## §1 每項功能落地狀態

### A. 功能正確性

| # | 項目 | 落地 | 揭露 |
|---|---|---|---|
| A1 | 正常登入（公司 + 帳號 + 密碼 → /dashboard）| ✅ 已落地 | callLoginApi → setToken → router.replace('/dashboard') |
| A2 | 錯誤處理 — 空欄位 | ✅ 已落地 | frontend validateLoginForm「請輸入 XXX」+ backend DTO message |
| A2 | 錯誤處理 — 公司帳號錯 | ⚠️ 部分（**模糊訊息**）| 統一「登入失敗，請確認公司帳號、使用者帳號與密碼」（防 enumeration attack）|
| A2 | 錯誤處理 — 使用者錯 | ⚠️ 部分（同上、**模糊訊息**）| 同 |
| A2 | 錯誤處理 — 密碼錯 | ⚠️ 部分（同上、**模糊訊息**）| 同 |
| A2 | 錯誤處理 — 公司停用 | ✅ 已落地（**明確訊息**）| 「公司帳號已停用，請聯繫系統管理員」 |
| A2 | 錯誤處理 — 使用者停用 | ✅ 已落地（**明確訊息**）| 「使用者帳號已停用，請聯繫您的公司管理員」 |
| A2 | 多次錯誤鎖定機制 | ❌ 未實作 | backend 0 throttler / 0 attempt counter |
| A3 | 多租戶隔離 | ✅ 已落地 | backend tenantCode composite key + `mode: 'insensitive'` 大小寫無關 |
| A4 | 忘記密碼流程 | ❌ 未實作 | button 在但無 onClick / 無對應頁 |
| A5 | 顯示密碼眼睛 icon | ✅ 已落地 | Eye / EyeOff toggle + aria-label「顯示/隱藏密碼」|

### B. UX 細節

| # | 項目 | 落地 | 揭露 |
|---|---|---|---|
| B1 | Tab 鍵切換順序 | ✅ 已落地（**瀏覽器預設**）| DOM 順序 = 公司 → 使用者 → 密碼 → 眼睛 → 忘記密碼 → 登入按鈕 |
| B2 | Enter 鍵提交 | ✅ 已落地 | `<form onSubmit>` 自動處理 |
| B3 | 記住公司 / 使用者帳號 | ❌ 未實作 | 0 localStorage / 0 sessionStorage 預填 |
| B4 | 自動 focus 第一欄位 | ❌ 未實作 | 0 autoFocus 屬性 / 0 useRef focus |
| B5 | Loading 狀態 | ✅ 已落地 | `isSubmitting` → 顯示 spinner（`border-2 animate-spin`）+ button `disabled` 防重複點擊 |
| B6 | placeholder | ✅ 已落地（**純展示、非預填**）| placeholder「Company ID」「Username」「Password」（英文、非 TEST-LITE 預填）|

### C. 安全

| # | 項目 | 落地 | 揭露 |
|---|---|---|---|
| C1 | 密碼欄位 type="password" + autocomplete | ✅ 已落地 | password input + `autoComplete="current-password"` + 其他欄 organization / username 標準值 |
| C2 | SQL Injection 防護 | ✅ 已落地（backend）| Prisma findFirst / findUnique 參數化 query、無 raw SQL |
| C3 | Rate Limiting（IP）| ❌ 未實作 | backend 0 @nestjs/throttler / 0 express-rate-limit |
| C4 | Session / Token 機制 | ✅ 已落地 | JWT 7 天過期、localStorage 儲存（key=`nx00_access_token`）、Bearer 自動帶 |

### D. 響應式

| # | 項目 | 落地 | 揭露 |
|---|---|---|---|
| D1 | 桌面版 | ✅ 已落地 | `lg:`（≥1024px）切兩欄（左 PlanetOrbit / 右 LoginForm）、`xl:`（≥1280px）擴大 PlanetOrbit |
| D2 | 手機版（iPhone / Android）| ✅ 已落地 | `h-dvh`（動態視口高度）+ flex column + 安全區（`pt-4 pb-1`）+ 隱藏桌面 layout（`lg:hidden`）|
| D3 | iPad / Tablet | ✅ 已落地（**fallback 走 mobile layout**）| `md:`（≥768px）無特化、`lg:` 才切桌面、≥768 < 1024 走 mobile |

### E. 業界改革承載

| # | 項目 | 落地 | 揭露 |
|---|---|---|---|
| E1 | 多租戶系統識別（公司帳號）| ✅ 已落地（業界改革 ⭐⭐⭐）| 公司帳號 + composite key + insensitive 大小寫、業界中小汽配 ERP 罕見 |
| E2 | SSO（LINE / Google）| 🔵 後續軌 | 0 LINE Login SDK / 0 Google OAuth |

### §I.6.3 §1 揭露不完整

- 未 verify A2 模糊訊息對 Crown 「使用者導向 = 容易上手」哲學是否符合（業務員不知道哪個欄位錯、可能造成 friction）
- 未 verify D3 iPad 直橫向實測（純推測 fallback mobile layout）

---

## §2 既有實作細節

### 2.1 frontend 元件結構

```
apps/nx-ui/src/app/login/page.tsx          ← 主頁面（203 行）
  ├─ <main className="login-shell">         ← 全局 CSS class
  ├─ <ParticleField />                      ← 背景星空粒子
  ├─ <PlanetOrbit />                        ← 行星軌道動畫（lg:hidden 在 mobile / lg: 顯示桌面）
  ├─ <LoginForm onSubmit errorMsg isSubmitting />  ← 真實表單
  └─ Demo mode 提示 banner（`isNexoraDemoMode()` 條件顯示）
```

### 2.2 LoginForm 元件（147 行）

```typescript
type LoginFormFields = {
  companyAccount: string;
  userAccount: string;
  password: string;
};

// 純 useState 受控（無 react-hook-form）
const [formData, setFormData] = useState<LoginFormFields>({ ... });
const [showPassword, setShowPassword] = useState(false);
const canSubmit = useMemo(...);  // 三欄位皆有值 + 非 isSubmitting

// 3 欄位 input：
//   公司帳號（Building2 icon、autoComplete="organization"）
//   使用者帳號（User icon、autoComplete="username"）
//   密碼（Lock icon、autoComplete="current-password" + EyeOff/Eye toggle button、aria-label）
//
// 錯誤訊息：role="alert" + bg-destructive/10 + text-destructive
// 忘記密碼 button：純展示（無 onClick）
// 登入 button：disabled={!canSubmit || isSubmitting} + spinner / 「登入系統」+ ArrowRight icon
```

### 2.3 A1 正常登入流程（細節）

```
1. 點「登入系統」button
2. onSubmit(e, formData)
3. normalizeFields → trim 公司 / 使用者帳號（密碼保留空白）
4. validateLoginForm → 任一欄位空 return「請輸入 XXX」
5. setView({ isSubmitting: true })
6. callLoginApi({ account, password, tenantCode })
   ├─ Demo mode（NEXT_PUBLIC_NEXORA_RUN_MODE=demo）：
   │   ├─ 比對 NEXORA_DEMO_LOGIN_USERNAME='demo' + PASSWORD='nexora2026'
   │   ├─ 不符 → throw '帳號或密碼錯誤'
   │   └─ 符合 → 寫 sessionStorage（demo username + tenantCode）+ return mock token
   └─ Real API：
       └─ apiJson('/auth/login', { tenantCode, username, password })
7. 取 result.token → setToken（寫 localStorage `nx00_access_token`）
8. router.replace('/dashboard')
9. 失敗 → setView({ errorMsg })
10. finally → setView({ isSubmitting: false })
```

### 2.4 A2 錯誤訊息全清單（A041 精確）

frontend 自驗：
- 「請輸入公司帳號」
- 「請輸入使用者帳號」
- 「請輸入密碼」
- 「[nxui_nx00_auth_login_flow_001] token missing in response」（極罕、token 解析失敗）
- 「帳號或密碼錯誤 / 或 API 無回應」（fallback）

backend 回傳：
- `400` BadRequest：
  - 「請輸入公司帳號」（DTO `@IsNotEmpty`）
  - 「公司帳號格式錯誤（只允許英數字與 -）」（DTO `@Matches`）
  - 「請輸入使用者帳號」
  - 「請輸入密碼」（密碼 `@MinLength(6)`、低於 6 位也擋）
- `401` Unauthorized：
  - **「登入失敗，請確認公司帳號、使用者帳號與密碼」**（情境 A 公司不存在 / 情境 C 使用者不存在 / 情境 E 密碼錯、3 種情境**統一模糊訊息**防 enumeration）
  - 「公司帳號已停用，請聯繫系統管理員」（情境 B）
  - 「使用者帳號已停用，請聯繫您的公司管理員」（情境 D）

### 2.5 A3 多租戶隔離細節

backend `auth.service.ts` 行 64-66：

```typescript
const tenant = await this.prisma.nx99Tenant.findFirst({
  where: { code: { equals: tenantCodeTrim, mode: 'insensitive' } },  // ⭐ 大小寫無關
  select: { id: true, isActive: true },
});
```

```typescript
const user = await this.prisma.nx01User.findUnique({
  where: { tenantId_userAccount: { tenantId: tenant.id, userAccount: uname } },
  // ⭐ tenantId + userAccount composite unique key
  // ⭐ user.userAccount 大小寫敏感（精確匹配）
});
```

DTO 額外 regex：`@Matches(/^[A-Za-z0-9-]+$/)` 公司帳號只允許英數字 + 連字號（防注入字元）。

### 2.6 A5 顯示密碼 toggle 細節

```tsx
<input type={showPassword ? 'text' : 'password'} ... />
<button
  type="button"  // ⭐ 防止當 submit
  onClick={() => setShowPassword(!showPassword)}
  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}  // ⭐ a11y
>
  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
</button>
```

### 2.7 B5 Loading spinner 細節

```tsx
{isSubmitting ? (
  <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
) : (
  <>
    <span>登入系統</span>
    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
  </>
)}
```

⭐ button `disabled={!canSubmit || isSubmitting}` 雙重防重複點擊。

### 2.8 C1 autocomplete 全清單

| 欄位 | autoComplete | 對應 |
|---|---|---|
| 公司帳號 | `organization` | 對齊 WHATWG HTML5 標準 |
| 使用者帳號 | `username` | 標準、瀏覽器密碼管理會抓 |
| 密碼 | `current-password` | 標準、會被密碼管理器辨識 |

### 2.9 C4 JWT / Token 細節

- 算法：`@nestjs/jwt` 預設 HS256
- 過期：**7 天**（`signOptions: { expiresIn: '7d' }`）
- 密鑰：`process.env.JWT_SECRET || 'dev_secret_change_me'`（⚠️ production 必設、dev fallback 暴露）
- payload：`{ sub, username, tenantId, tenantCode, planCode }`
- 儲存：**localStorage**（key=`nx00_access_token`、SSR safe + storage exception 容錯）
- 傳送：`apiFetch` 自動加 `Authorization: Bearer <token>` header
- credentials: 'include'（CORS cookie）+ mode: 'cors'

### 2.10 D 響應式 breakpoint 細節

```
< 1024px（mobile）：
  - 單欄垂直 flex
  - 頂部 NEXORA GRID logo + ERP PLATFORM 標籤（lg:hidden）
  - 中段 PlanetOrbit 行星軌道（aspect-square max-w-[360px]）
  - 底部 LoginForm（max-w-md）
  - h-dvh 動態視口（鍵盤彈出時自動縮）

≥ 1024px（lg:）：
  - 兩欄 horizontal flex
  - 左欄 1/2（PlanetOrbit + ENTERPRISE RESOURCE PLANNING 標籤 + 大字 NEXORA GRID）
  - 右欄 1/2（WELCOME 分隔線 + 系統登入 標題 + LoginForm card）

≥ 1280px（xl:）：
  - 左欄 3/5、右欄 2/5
  - PlanetOrbit 放大至 420px
  - NEXORA 字體放大 5xl → 6xl
```

⭐ 響應式視覺亮點：
- ParticleField 全頁星空背景（z-0）
- 上下 + 左右雙 gradient overlay
- login-card 加 backdrop-blur-md + bg-card/60 毛玻璃
- amber accent 點（NEXORA 中的 O 字母內含脈動圓點）

---

## §3 後端 endpoint

### 3.1 POST /auth/login

```
Controller: apps/nx-api/src/auth/controllers/auth.controller.ts:30
@Post('login')
async login(@Body() body: LoginDto)
```

**Request body**（LoginDto）：
```json
{
  "tenantCode": "TEST-LITE",     // required, regex /^[A-Za-z0-9-]+$/, ≤50
  "username": "admin",            // required, ≥1, ≤50
  "password": "test1234"          // required, ≥6, ≤100
}
```

**Response 200**（success）：
```json
{
  "token": "<JWT>",
  "user": {
    "id": "NX01USER0000001",
    "username": "admin",
    "display_name": "Admin User"
  }
}
```

**Response 400** BadRequest（DTO 驗證失敗）：
```json
{
  "statusCode": 400,
  "message": ["請輸入公司帳號", "請輸入使用者帳號", ...]
}
```

**Response 401** Unauthorized：
```json
{
  "statusCode": 401,
  "message": "登入失敗，請確認公司帳號、使用者帳號與密碼"
}
```

### 3.2 GET /auth/me（驗證 token）

```
Controller: apps/nx-api/src/auth/controllers/auth.controller.ts:38
@UseGuards(JwtAuthGuard)
@Get('me')
async me(@User() payload: JwtPayload)
```

**Headers**：`Authorization: Bearer <token>`

**Response**（MeResponse）：
```json
{
  "id": "NX01USER0000001",
  "username": "admin",
  "display_name": "Admin User",
  "tenant_name": "TEST-LITE 公司",
  "tenant_name_en": "TEST-LITE Co.",
  "roles": ["OWNER"],
  "plan_code": "NEXORA-LITE",
  "view_permissions": null  // SYSADMIN/OWNER 為 null、無租戶為 {}
}
```

### 3.3 Token wire 鏈

```
login → token 寫 localStorage `nx00_access_token`
  ↓
apiFetch（client.ts）自動讀 token → 加 Authorization: Bearer header
  ↓
backend JwtAuthGuard 驗證 → JwtPayload { sub, username, tenantId, tenantCode, planCode }
  ↓
useSessionMe hook → callMeApi → display 用戶 / planCode 推 LITE/PLUS/PRO
  ↓
DashboardShell：!me → router.replace('/login')
```

### §I.6.3 §3 揭露不完整

- 未 verify JWT_SECRET 是否 production 真的有設（dev fallback 暴露）
- 未 verify CORS 設定（apiFetch 用 `credentials: 'include' + mode: 'cors'`、後端必須對應 origin 白名單）
- 未 verify token 過期後 frontend 行為（推測 401 → router.replace login）

---

## §4 既有 component 路徑

### 4.1 frontend（A041 精確）

```
apps/nx-ui/src/app/login/page.tsx                  ← 主登入頁（203 行）
apps/nx-ui/src/components/login/login-form.tsx     ← LoginForm（147 行）
apps/nx-ui/src/components/login/planet-orbit.tsx   ← PlanetOrbit + ParticleField 動畫
apps/nx-ui/src/features/auth/
  ├── api/login.ts                                  ← callLoginApi（含 demo 短路）
  ├── api/me.ts                                     ← callMeApi
  ├── constants.ts                                  ← AUTH_ACCESS_TOKEN_KEY + NEXORA_DEMO_* 常數
  ├── demo-session.ts                               ← Demo session helper
  ├── hooks/useSessionMe.ts                         ← React hook
  ├── run-mode.ts                                   ← isNexoraDemoMode
  ├── token.ts                                      ← setToken/getToken/clearToken
  └── types.ts                                      ← LoginRequest/LoginResponse/MeDto
apps/nx-ui/src/shared/api/client.ts                 ← apiFetch + apiJson + Bearer token
apps/nx-ui/src/shared/api/errors.ts                 ← ApiClientError
apps/nx-ui/src/middleware.ts                        ← Next middleware（Demo mode 直接放行）
apps/nx-ui/src/app/globals.css                     ← .login-shell / .login-card / .login-stars CSS
```

### 4.2 backend（A041 精確）

```
apps/nx-api/src/auth/
  ├── controllers/auth.controller.ts                ← @Post('login') + @Get('me')
  ├── services/auth.service.ts                      ← bcrypt verify + JWT sign + tenant lookup
  ├── dto/login.dto.ts                              ← LoginDto（tenantCode/username/password）
  ├── strategies/jwt.strategy.ts                    ← JwtStrategy（passport-jwt）
  └── auth.module.ts                                ← JwtModule + JWT_SECRET + expiresIn 7d
```

### 4.3 既有元件清單統計

| 類別 | 數量 |
|---|---|
| frontend page / layout | 1 / 1 |
| frontend component | 2（LoginForm + PlanetOrbit/ParticleField）|
| frontend auth lib | 7 file（api × 2 + constants/demo-session/hooks/run-mode/token/types）|
| frontend shared api | 3 file |
| backend controller / service / dto | 1 / 1 / 1 |
| backend strategy / module | 1 / 1 |
| **A041 總計** | **frontend 14 / backend 5 = 19 file** |

---

## §5 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex 補揭露：

1. **§1 A2** 模糊訊息 vs Crown「容易上手」哲學是否衝突
2. **§1 D3** iPad 直橫向實測（未測真機）
3. **§3** JWT_SECRET production 設定狀態
4. **§3** CORS origin 白名單設定
5. **§3** token 過期後 frontend 自動處理流程
6. **§4** 既有 PlanetOrbit 動畫實作細節（framer-motion 範圍？）
7. **§4** Demo mode env 變數完整清單（NEXT_PUBLIC_NEXORA_RUN_MODE / NEXT_PUBLIC_DEMO_MODE 兩種同時存在）
8. **§2** Demo mode 對 production 風險（NEXORA_DEMO_LOGIN_PASSWORD='nexora2026' 寫死 bundle）
9. **§1 B4** 為何不做 autoFocus（推測：避免 mobile iOS 鍵盤自動彈出干擾 PlanetOrbit 視覺）
10. **§1 A4** 忘記密碼 button 純展示是設計決策還是 backlog

---

## §6 戰略總覽（給 Crown 測試清單用）

### 6.1 ✅ 可直接測試 12 項

```
A1 正常登入                              （demo 模式 demo/nexora2026 + 任一公司帳號）
A2 空欄位錯誤                            （留空提交）
A2 公司停用 / 使用者停用                  （後端 isActive=false 帳號）
A3 多租戶大小寫無關                      （TEST-LITE vs test-lite 應同租戶）
A5 顯示密碼眼睛                          （點 toggle、icon 切換）
B1 Tab 鍵切換                            （Tab 4 次到登入按鈕）
B2 Enter 鍵提交                          （任一欄位 Enter）
B5 Loading spinner                       （連線慢時可見）
B6 placeholder                           （Company ID / Username / Password 英文）
C1 密碼 type / autocomplete              （瀏覽器密碼管理彈出）
C4 JWT 儲存 / Bearer                    （DevTools localStorage `nx00_access_token`）
D1+D2+D3 響應式                          （調整視窗 / 真機開）
E1 多租戶識別                            （換公司帳號進不同 tenant）
```

### 6.2 ⚠️ 部分落地、測試需注意

```
A2 公司/使用者/密碼錯 → 「登入失敗，請確認公司帳號、使用者帳號與密碼」統一模糊訊息
   （非業界常見的精確訊息、是業界 enumeration attack 防護慣例）
```

### 6.3 ❌ 不要測 5 項（未實作）

```
A2 多次錯誤鎖定機制                      （0 throttler、暴力破解不會被擋）
A4 忘記密碼                              （button 純展示、點下去無反應）
B3 記住帳號                              （0 localStorage 預填、F5 後欄位都空）
B4 自動 focus                            （開頁面 cursor 不會自動到第一欄）
C3 Rate Limiting                         （IP 無上限、可無限次嘗試）
```

### 6.4 🔵 後續軌候選 4 項

```
A2 多次錯誤鎖定（5 次/15 分）            → TASK-AUTH-RATE-LIMIT
A4 忘記密碼流程                          → TASK-AUTH-PASSWORD-RESET
B3+B4 記住帳號 + 自動 focus              → TASK-AUTH-UX-POLISH
E2 SSO（LINE Login / Google OAuth）      → TASK-AUTH-SSO
```

### 6.5 ⭐⭐⭐ 業界改革重大揭露

**E1 公司帳號多租戶識別 = 業界改革 ⭐⭐⭐**：
- 中小汽配 ERP（恆迎 / 偉盟）多數**單租戶**部署（一公司一套 ERP、各裝各的）
- NEXORA **公司帳號做為 tenantCode + composite unique key + insensitive 大小寫**
- 業務員可在「同一個 NEXORA」帳號內服務不同公司（多企業集團）
- 同 userAccount 可在不同 tenant 共存（X1 方案、TASK-SEED-REFACTOR-01）

---

> 文件版本：v1.0（LOGIN-PAGE-FEATURE-AUDIT 純諮詢、6 段揭露 + 4 表 + 18 項測試落地分類 + 19 file path）
> 待 Crown 依此清單測試（12 ✅ 可測 + 1 ⚠️ 注意 + 5 ❌ 不要測 + 4 🔵 backlog）
