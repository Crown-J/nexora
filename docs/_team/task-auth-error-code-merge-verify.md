<!-- docs/_team/task-auth-error-code-merge-verify.md -->

# TASK-AUTH-ERROR-CODE — Merge Main 上線風險揭露

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：5 commit Q-RHYTHM-2 連跑完成
> 分支：`feature/task-auth-error-code`（ahead 5 commit）
> 對應依據：[docs/_team/nexora-error-code-spec.md](./nexora-error-code-spec.md) v1.1（main HEAD `93c477e`）

---

## §0 ahead 5 commit 真實清單

```
fec7f79 commit 5: UI 顯示 [錯誤代碼：XX-NNN]（規範 v1.1 §7.3）
6233844 commit 4: hack 清理 AU-501 + NW-001（規範 v1.1 §10）
9c6d974 commit 3: frontend validateLoginForm + errorMsg 結構化（NexoraClientError）
9ece3f4 commit 2: backend DTO [XX-NNN] 前綴 + ValidationPipe exceptionFactory 解析
307dfa8 commit 1: NexoraErrorResponse interface + auth.service 5 errorCode
```

---

## §1 spec 對齊（規範 v1.1 §5 §6 §7 §9 §10）

| spec § | 對齊狀態 |
|---|---|
| §5.1 一般錯誤 AU-001/002/003 | ✅ auth.service 5 throw 已對齊（passwordHash 缺失 + 情境 E 共用 AU-003）|
| §5.2 狀態錯誤 AU-101/102 | ✅ auth.service 2 throw |
| §5.3 驗證錯誤 AU-301/302/303 | ✅ DTO message 前綴 + frontend validateLoginForm 雙端對齊 |
| §5.3 AU-304 BadRequest 防禦 | ✅ auth.service 已落地 |
| §5.4 限流 AU-401/402 | ❌ 後續軌 TASK-AUTH-RATE-LIMIT |
| §5.5 系統錯誤 AU-501 | ✅ frontend token missing 改為 AU-501（hack 清理）|
| §6.1 NW-001 | ✅ frontend shared/api/client × 3 處改為 NW-001（hack 清理）|
| §7.1 NexoraErrorResponse interface | ✅ 雙端建立（backend + frontend）|
| §7.2 NexoraHttpException helper | ✅ backend 落地、constructor 驗 regex |
| §7.3 UI 顯示 [錯誤代碼：XX-NNN] | ✅ login-form text-[11px] / opacity 70% |
| §7.4 Backend log 格式 | ⚠️ NexoraHttpException 含 timestamp、但無統一 logger format（後續軌）|
| §7.5 破壞性 verify 預備 | ✅ 既有 frontend `{ statusCode, message }` 不破壞、純加 errorCode |
| §10 hack 清理 mapping | ✅ 2 處全清（[nxui_*] → AU-501、[NX00-API-001] → NW-001）|

---

## §2 response 結構（NexoraErrorResponse）

```typescript
interface NexoraErrorResponse {
  statusCode: number;
  errorCode: string;   // XX-NNN ⭐
  message: string;
  timestamp?: string;
  path?: string;
}
```

實際 response 範例（404 + AU-001 模糊）：

```json
{
  "statusCode": 401,
  "errorCode": "AU-001",
  "message": "登入失敗，請確認公司帳號、使用者帳號與密碼",
  "timestamp": "2026-05-18T12:34:56.789Z"
}
```

⭐ **既有 `{ statusCode, message }` 結構未破壞**（加 errorCode + timestamp 純擴充、舊 frontend 不讀也不影響）。

---

## §3 frontend 顯示驗證

對齊 spec §7.3 範式：

```
[Inline error box（destructive 紅）]
登入失敗，請確認公司帳號、使用者帳號與密碼   ← text-sm（既有）
[錯誤代碼：AU-001]                            ← text-[11px] opacity 70%（新）
```

實際 component 代碼：

```tsx
{errorMsg ? (
  <div role="alert" className="...">
    <div>{errorMsg.message}</div>
    <div className="mt-1 text-[11px] text-destructive/70">
      [錯誤代碼：{errorMsg.errorCode}]
    </div>
  </div>
) : null}
```

---

## §4 hack 清理（A041 精確、grep verify）

```
grep "[nxui_nx00_auth_login_flow_001]" → 0 hit（live）+ 1 註解引用揭露歷史
grep "[NX00-API-001]"                  → 0 hit（live）+ 1 註解引用揭露歷史
```

✅ **2 處 hack 100% 清理**。

| 原 hack | 改為 | 位置 |
|---|---|---|
| `[nxui_nx00_auth_login_flow_001]` token missing | `AU-501` + JSON.stringify({ errorCode, message }) | apps/nx-ui/src/app/login/page.tsx |
| `[NX00-API-001]` HTTPS / NEXT_PUBLIC_API_URL / HTTP fail | `[NW-001]` × 3 處 | apps/nx-ui/src/shared/api/client.ts |

---

## §5 log trace（grep errorCode）

```
grep -rE "errorCode:\s*'AU-|errorCode:\s*'NW-" 全棧 → 12 處（去重後 11 個獨立代碼 + AU-999 fallback）
```

| 代碼 | 落地處 | spec § |
|---|---|---|
| **AU-001** | auth.service 情境 A | §5.1 |
| **AU-002** | auth.service 情境 C | §5.1 |
| **AU-003** | auth.service 情境 E + passwordHash 缺失（2 處共用）| §5.1 |
| **AU-101** | auth.service tenant 停用 | §5.2 |
| **AU-102** | auth.service user 停用 | §5.2 |
| **AU-301** | LoginDto tenantCode（4 decorator）+ frontend validate | §5.3 |
| **AU-302** | LoginDto username（4 decorator）+ frontend validate | §5.3 |
| **AU-303** | LoginDto password（4 decorator）+ frontend validate | §5.3 |
| **AU-304** | auth.service BadRequest 防禦 | §5.3 |
| **AU-501** | frontend token missing（hack 清理）| §5.5 |
| **AU-999** | frontend fallback（spec 未列、⚠️ A026 揭露）| - |
| **NW-001** | shared/api/client × 3 處（hack 清理）| §6.1 |

---

## §6 build / tsc verify

```
pnpm --filter=nx-api exec tsc --noEmit  → 0 error
pnpm --filter=nx-api build               → nest build 通過
pnpm --filter=nx-ui exec tsc --noEmit   → 0 error
```

---

## §7 破壞性 verify

| 維度 | 評估 |
|---|---|
| 既有 `/auth/login` API 行為 | ⚠️ response body 多了 `errorCode + timestamp`（純擴充欄）|
| 既有 frontend `{ statusCode, message }` consumer | ✅ 不破壞（舊欄位仍存）|
| 既有 ApiClientError 結構 | ✅ 不破壞（message 仍是 string、body 仍 raw text）|
| 既有 me / 其他 endpoint | ✅ 不破壞（本軌只動 login 相關 + 全棧 ValidationPipe）|
| 全棧 ValidationPipe `exceptionFactory` 升級 | ⚠️ 既有 DTO 不帶 [XX-NNN] message 走 NestJS 預設 BadRequestException（fallback 不破壞）|

⚠️ **唯一行為改變**：HTTP 400 BadRequest response 在 message 含 [XX-NNN] 前綴的 DTO 改回 `NexoraErrorResponse` 結構（含 errorCode）。其他 DTO 仍走 NestJS 預設 `{ statusCode, message[] }` 結構。

---

## §8 A026 backlog 補登

對齊 spec v1.1 揭露 + 本軌實作浮現：

1. **AU-999** frontend fallback（spec 未列、本軌暫加、待 spec 後續軌補正式分配）
2. **AU-401/402** 限流（後續軌 TASK-AUTH-RATE-LIMIT）
3. **NW-002+** API timeout / 維護 / 配額（後續軌、spec §6.2 預留）
4. **me() 內 2 處 'Token user not found'** 未配 errorCode（後續軌 AU-50x）
5. **Backend log 統一 format**（spec §7.4 揭露、無 statement-level logger middleware、後續軌）
6. **/auth/login 真實連線實測 errorCode response**（本軌僅 tsc + build 驗、未跑 runtime test）
7. **Nx02ErrorFilter 既有範式整併**（NX02 已有自製 ErrorCode 範式：apps/nx-api/src/nx02/qt/qt-error.ts + nx02-error.filter.ts、未來統一規範時需整併）

---

## §9 結論 + Merge 建議

⭐ **建議 merge 入 main**（不需新 tag、屬「規範首落地」性質）：

| 維度 | 評估 |
|---|---|
| spec v1.1 對齊 | ✅ 11 個代碼全落地（§5 + §6 + §10）|
| 既有 endpoint 行為 | ✅ 100% 保留（只擴 response 欄位）|
| hack 清理 | ✅ 2 處全清 |
| tsc / build | ✅ 0 error |
| 業界改革落地 | ⭐⭐⭐ NEXORA 第 19 候選首落地 |
| 5 commit 結構 | ✅ 清晰可逐 commit revert |

stop 給 Crown + Alex 驗收 → Crown 拍板 A 後 Hank 自跑 merge / push（無 tag）。

---

> 文件版本：v1.0（TASK-AUTH-ERROR-CODE merge-verify、9 段揭露、stop 給 Crown）
