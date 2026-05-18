<!-- docs/_team/nexora-error-code-spec.md -->

# NEXORA 錯誤代碼統一規範 v1.1

> **性質**：架構級規範文件（NEXORA 全棧跨模組統一標準）
> **撰寫者**：Alex（NEXORA 專案 PM AI）
> **拍板者**：Crown（NEXORA 創辦人）
> **日期**：2026-05-18
> **版本**：v1.1（對齊 Hank NEXORA-CODE-NAMING-AUDIT 5 校正）
> **戰略定位**：NEXORA 第 19 業界改革候選 ⭐⭐⭐（跨模組統一錯誤代碼制度、業界中小汽配 ERP 多無）
> **影響範圍**：NEXORA 全 11 模組 + Auth + System + Networking、所有後續軌錯誤訊息對齊

---

## §0 規範性質

對齊 Crown 拍板 Q1=b / Q2=a / Q3=a + Hank verify 5 校正：

- 格式：**`{XX}-{NNN}`** 6 字
- 13 模組縮寫（v1.0 12 個 + Hank 揭露 NW Networking）
- 序號分 5 區（一般 / 狀態 / 權限 / 驗證 / 限流）
- 字母組合 reserve table（避免跟既有 NX 範式衝突）

本文件是 NEXORA 架構級規範、影響：
- 所有 backend API 錯誤 response（含 errorCode 欄位）
- 所有 frontend UI 錯誤顯示
- 客服 / 員工溝通共同語言
- 長期擴展（新模組 / 新錯誤對齊規範）

---

## §1 設計戰略

### 1.1 業界範式對標

| 維度 | 業界 | NEXORA |
|---|---|---|
| 模糊訊息（安全防護）| ✅ AWS / Stripe / 銀行 | ✅ 已實作（Hank verify）|
| 錯誤代碼（客服診斷）| ⚠️ 部分 SaaS 有 | ⭐ 本規範落地 |
| **跨模組統一格式** | ⚠️ 業界中小 ERP **多無** | **⭐⭐⭐ NEXORA 業界改革第 19 候選** |

### 1.2 對齊 NEXORA 既有 3 層命名範式

對齊 Hank NEXORA-CODE-NAMING-AUDIT 揭露：

| 層級 | 範例 | 用途 | user-facing |
|---|---|---|---|
| **@FUNCTION_CODE** | `NX02-PO-UI-001-F01` | 業務規格追溯（340 處）| ❌ |
| **@CODE** | `nxui_nx00_auth_login_002` | 函式 marker（23 處）| ❌ |
| **XX-NNN**（本規範）| `AU-001` | **錯誤碼**| ✅ |

⭐ **3 層完全獨立、零衝突**：
- @FUNCTION_CODE = 「這段程式碼對應哪個業務規格」
- @CODE = 「這個函式可被定位 / 引用」
- **XX-NNN = 「這個錯誤該怎麼跟使用者解釋」**

### 1.3 對齊 NEXORA UX 戰略

對齊 Crown 累積揭露：
- **使用者導向 = 容易上手** → 員工看 6 字代碼好記
- **跨模組一致** → 看 prefix 知模組（AU = Auth / SO = Sales）
- **客服協助** → 員工 / 客服共同語言

---

## §2 格式規範（核心）

### 2.1 格式

```
{XX}-{NNN}
```

- **總長**：6 字（含分隔符 `-`）
- **XX**：模組縮寫（2 字大寫英文）
- **NNN**：序號（3 字數字、001~999）

### 2.2 範例

```
AU-001    登入失敗
SO-002    客戶信用額度不足
IN-003    庫存不足
```

⚠️ **絕對不可變更格式**（影響全棧）：
- ❌ 不能用 4 字或 8 字（如 AU-1 / AUTH-0001）
- ❌ 不能用小寫（如 au-001）
- ❌ 不能用底線（如 AU_001）

---

## §3 13 模組縮寫對照表（v1.1 校正 +NW）

| 縮寫 | 模組 | 對應 NEXORA | 落地狀態 |
|---|---|---|---|
| **AU** | Auth 認證 | 登入 / 註冊 / 密碼重置 | v1.1 落地（12 代碼）|
| **MS** | Master 主檔 | NX01 全部主檔 | 後續軌 |
| **PO** | Purchase 採購 | NX02 採購流程 | 後續軌 |
| **IN** | Inventory 庫存 | NX03 庫存管理 | 後續軌 |
| **SO** | Sales 銷貨 | NX04 銷貨流程 | 後續軌 |
| **FN** | Finance 財務 | NX05 財務管理 | 後續軌 |
| **DN** | Delivery 物流 | NX06 物流配送 | 後續軌 |
| **HR** | HR 人資 | NX07 人資管理 | 後續軌 |
| **RP** | Report 報表 | NX08 報表分析 | 後續軌 |
| **KM** | Knowledge EIP | NX09 EIP 知識管理 | 後續軌 |
| **GM** | Gamification 八角 | NX10 八角遊戲化 | 後續軌 |
| **SY** | System 系統 | 系統 / 權限 / Audit | 後續軌 |
| **NW** ⭐ | Networking | API client 邊界錯誤 | v1.1 落地（1 代碼）|

### 3.1 字母組合 Reserve Table（v1.1 新增）

對齊 Hank 揭露「AU 既有命名表中無、但 AR 已被 NX03 用」、避免未來衝突：

#### 已使用（規範 v1.1）

```
AU = Auth 認證
MS = Master 主檔
PO = Purchase 採購
IN = Inventory 庫存
SO = Sales 銷貨
FN = Finance 財務
DN = Delivery 物流
HR = HR 人資
RP = Report 報表
KM = Knowledge EIP
GM = Gamification 八角
SY = System 系統
NW = Networking API 邊界
```

#### 業界保留（未來可能用、需 Crown 拍板）

```
WH = Warehouse（如倉位細分）
CM = Customer（如 CRM 細分）
VD = Validation（驗證類錯誤、跨模組共用？）
EX = External API（如 NHTSA / Lalamove / Google Maps）
PY = Payment（如金流整合、後續軌）
```

#### 不可使用（既有 NX 範式衝突）

```
AR ❌（NX03 AutoReplenish 已用、不可重用）
A* / NX* ❌（保留給既有 @FUNCTION_CODE）
PR ❌（NX02 PurchaseReturn 已用）
RR ❌（NX02 ReceiveRecord 已用）
RFQ ❌（NX02 RequestForQuote 已用、雖然 3 字、避免混淆）
```

### 3.2 未來擴展規則

1. **grep verify 不衝突**：新增前 grep 既有 NX 子類名清單
2. **不可用既有 NX 子類**：PO/SO/AR/AP/RFQ/RR/PR/CU/VD/HUB/UI/AUTH/PLN/AUDIENCE 等
3. **Crown 拍板**：新增模組縮寫須 Crown 認可
4. **更新本表**：reserve table + 本規範 v1.X

---

## §4 序號分區制（5 區）

對齊 Crown 拍板 Q3=a：

```
001~099  一般業務錯誤（最常見、優先使用）
100~199  狀態錯誤（已停用 / 已關閉 / 已過期）
200~299  權限錯誤
300~399  驗證錯誤（格式 / 必填）
400~499  限流 / 鎖定
500~999  系統錯誤 / 預留
```

### 4.1 客服 / 員工識別效益

對齊 Crown 揭露「方便客服協助處理」：
- 看到 `AU-001` → 一般業務問題（最常見、優先處理）
- 看到 `AU-101` → 狀態問題（停用、要重啟）
- 看到 `AU-201` → 權限問題（要授權）
- 看到 `AU-301` → 驗證問題（格式錯誤、教學使用者）
- 看到 `AU-401` → 限流（暴力嘗試、安全事件）
- 看到 `AU-501` → 系統錯誤（要工程師介入）

### 4.2 序號分配原則

- **001 開始**：每模組從 001 起、不跨模組共用
- **依序新增**：不跳號（除非保留特殊用途）
- **不重用**：刪除錯誤代碼後序號不重用（歷史追溯）

---

## §5 既有 Auth 錯誤代碼分配（v1.1 完整 12 代碼）

對齊 Hank verify 11 處既有錯誤訊息 + 後續軌：

### 5.1 一般錯誤（001~099）

| 代碼 | 使用者看到（模糊）| 客服 log 看到（精準）| 既有訊息位置 |
|---|---|---|---|
| **AU-001** | 登入失敗、請確認公司帳號、使用者帳號與密碼 | tenantCode 不存在（情境 A）| backend auth.service.ts |
| **AU-002** | 登入失敗、請確認公司帳號、使用者帳號與密碼 | username 不存在（情境 C）| backend auth.service.ts |
| **AU-003** | 登入失敗、請確認公司帳號、使用者帳號與密碼 | password 錯誤（情境 E）| backend auth.service.ts |

⚠️ 3 種錯誤**使用者訊息相同**（業界 enumeration attack 防護）、**錯誤代碼不同**（客服診斷）。

### 5.2 狀態錯誤（100~199）

| 代碼 | 使用者看到 | 客服 log | 既有訊息位置 |
|---|---|---|---|
| **AU-101** | 公司帳號已停用、請聯繫系統管理員 | tenant.isActive=false | backend auth.service.ts |
| **AU-102** | 使用者帳號已停用、請聯繫您的公司管理員 | user.isActive=false | backend auth.service.ts |

### 5.3 驗證錯誤（300~399、v1.1 新增）

對齊 Hank 揭露既有 frontend validateLoginForm + backend DTO：

| 代碼 | 使用者看到 | 觸發時機 | 既有訊息位置 |
|---|---|---|---|
| **AU-301** | 請輸入公司帳號 | 公司帳號空 | frontend + backend DTO |
| **AU-302** | 請輸入使用者帳號 | 使用者帳號空 | frontend + backend DTO |
| **AU-303** | 請輸入密碼 | 密碼空 | frontend + backend DTO |
| **AU-304** | 請輸入公司帳號、使用者帳號與密碼 | 後端 BadRequest 防禦 | backend service |

### 5.4 限流 / 鎖定（400~499、後續軌）

| 代碼 | 使用者看到 | 客服 log | 落地 |
|---|---|---|---|
| **AU-401** | 多次錯誤已鎖定 15 分鐘、請稍後再試 | rate limit triggered | ❌ TASK-AUTH-RATE-LIMIT |
| **AU-402** | 系統忙碌、稍後再試 | IP rate limit | ❌ TASK-AUTH-RATE-LIMIT |

### 5.5 系統錯誤（500~999、v1.1 新增）

對齊 Hank 揭露既有 hack [nxui_nx00_auth_login_flow_001]：

| 代碼 | 使用者看到 | 客服 log | 既有 hack 來源 |
|---|---|---|---|
| **AU-501** | 登入流程異常、請重試或聯繫管理員 | token missing in response | frontend `[nxui_nx00_auth_login_flow_001]` |

⚠️ AU-501 = 既有 hack 清理目標（不該觸發、若觸發代表 backend 問題）。

---

## §6 NW Networking 模組（v1.1 新增）

對齊 Hank 揭露既有 `[NX00-API-001]` shared/api error、清理 mapping：

### 6.1 一般錯誤（001~099）

| 代碼 | 使用者看到 | 客服 log | 既有 hack 來源 |
|---|---|---|---|
| **NW-001** | 網路連線異常、請檢查網路後重試 | API client fetch failed | frontend `[NX00-API-001]` |

⚠️ NW-001 = 既有 `[NX00-API-001]` 清理目標。

### 6.2 預留範例（未來擴展）

```
NW-002  API timeout（後續軌）
NW-101  API 服務暫停維護（後續軌）
NW-401  外部 API 配額用罄（後續軌）
NW-501  External API 回應格式錯誤（後續軌）
```

---

## §7 API Response 格式規範（v1.1 明確 TypeScript interface）

### 7.1 Backend Response Interface（v1.1 新增明確定義）

對齊 Hank 揭露：NestJS 預設 `{ statusCode, message }` 需擴 `{ statusCode, errorCode, message }`：

```typescript
/**
 * NEXORA 統一錯誤 response 格式
 * 對齊 NEXORA 錯誤代碼統一規範 v1.1
 */
interface NexoraErrorResponse {
  statusCode: number;     // HTTP status (既有 NestJS 預設)
  errorCode: string;      // XX-NNN ⭐ v1.1 新增（如 "AU-001"）
  message: string;        // 使用者看到的中文訊息 (既有)
  timestamp?: string;     // ISO 8601 log trace 用 (可選)
  path?: string;          // request path (可選)
}
```

### 7.2 Backend 實作範例

```typescript
// backend NestJS HttpException 範例
throw new HttpException({
  statusCode: HttpStatus.UNAUTHORIZED,
  errorCode: 'AU-001',
  message: '登入失敗、請確認公司帳號、使用者帳號與密碼',
  timestamp: new Date().toISOString(),
}, HttpStatus.UNAUTHORIZED);
```

### 7.3 Frontend UI 顯示格式

對齊 Crown「方便客服協助處理」：

```
[Toast / Dialog / Inline 提示]

登入失敗
請確認公司帳號、使用者帳號與密碼

[錯誤代碼：AU-001]
```

⚠️ **顯示位置**：
- 錯誤代碼放在訊息**最下方**、字較小（如 12px）
- 不干擾主要訊息閱讀
- 但 Crown / 員工 / 客服可快速看到

### 7.4 Backend Log 格式

```
[ERROR] 2026-05-18T10:30:00 AU-001 tenantCode='ABC-XYZ' not found (IP: 1.2.3.4)
```

⚠️ Log 含：
- `errorCode`（grep 用）
- 真實診斷資訊（precise）
- IP / timestamp（追蹤）
- 不含敏感資訊（如完整密碼）

### 7.5 破壞性 verify 預備

⚠️ **既有 frontend 接收程式可能假設 `{ statusCode, message }`**：
- 加 `errorCode` **不破壞**（新欄位、frontend 不讀就忽略）
- 但 frontend 若要顯示需新增讀取邏輯
- 對齊 TASK-AUTH-ERROR-CODE 落地時 Hank verify 既有 frontend client.ts / http.ts

---

## §8 命名規則與審查

### 8.1 新增錯誤代碼流程

```
1. 開發者寫新功能、需要錯誤代碼
   ↓
2. 查 NEXORA 錯誤代碼總表（本文件 §11）
   ↓
3. 確認模組縮寫 + 分區
   ↓
4. 取下一個序號（如 SO-004）
   ↓
5. 更新總表 + commit
   ↓
6. 實作 backend errorCode + frontend 顯示
```

### 8.2 審查原則

- ✅ 對齊 13 模組縮寫
- ✅ 對齊 5 區序號分配
- ✅ 訊息清楚（使用者看得懂）
- ✅ 不重複（grep 確認）
- ✅ 不衝突字母 reserve table
- ❌ 不可跨模組共用代碼
- ❌ 不可重用刪除代碼
- ❌ 不可用既有 NX 子類縮寫

---

## §9 後續軌實作 task

對齊 Hank verify「⚠️ errorCode 待落地」：

### 9.1 TASK-AUTH-ERROR-CODE（v1.1 第一個落地軌）

**範圍**：13 個代碼落地（12 Auth + 1 NW 既有 hack 清理）

**Backend 改動**：

| 既有訊息位置 | 改動 |
|---|---|
| backend auth.service.ts 情境 A | 加 errorCode='AU-001' |
| backend auth.service.ts 情境 C | 加 errorCode='AU-002' |
| backend auth.service.ts 情境 E | 加 errorCode='AU-003' |
| backend auth.service.ts tenant 停用 | 加 errorCode='AU-101' |
| backend auth.service.ts user 停用 | 加 errorCode='AU-102' |
| backend DTO @IsNotEmpty 公司 | 加 errorCode='AU-301' |
| backend DTO @IsNotEmpty 使用者 | 加 errorCode='AU-302' |
| backend DTO @IsNotEmpty 密碼 | 加 errorCode='AU-303' |
| backend service BadRequest 防禦 | 加 errorCode='AU-304' |

**Frontend 改動**：

| 既有 hack | 改動 |
|---|---|
| `[nxui_nx00_auth_login_flow_001] token missing` | 改 `[AU-501]` + 規範 errorCode 範式 |
| `[NX00-API-001]` shared/api error | 改 `[NW-001]` + 規範 errorCode 範式 |
| frontend validateLoginForm 3 處 | 加 errorCode='AU-301~303' |
| API response 接收程式 | 加讀取 errorCode + UI 顯示 |

**UI 改動**：
- Toast / inline 顯示加 `[錯誤代碼：XX-NNN]` 行
- 字較小（如 12px）、不干擾主訊息

### 9.2 TASK-NX{XX}-ERROR-CODE 系列（後續軌）

每個 NX02~NX10 各一軌：
- 對齊本規範
- 列出該模組所有錯誤情境
- 分配代碼
- 實作 + verify

### 9.3 TASK-NEXORA-ERROR-CODE-CONSOLIDATE（總整理）

- 全模組落地後總整理
- 對外文件（給亞羅 / 未來客戶看）

---

## §10 既有 Hack 清理 Mapping（v1.1 新增）

對齊 Hank 揭露 2 處 hack：

| # | 既有 hack | 位置 | 改為 | 落地軌 |
|---|---|---|---|---|
| 1 | `[nxui_nx00_auth_login_flow_001]` token missing | frontend features/auth/api/login.ts | **`[AU-501]`** | TASK-AUTH-ERROR-CODE |
| 2 | `[NX00-API-001]` shared/api error | frontend shared/api/client.ts | **`[NW-001]`** | TASK-AUTH-ERROR-CODE |

⚠️ **不可保留**：兩個 hack 違反本規範、應在 TASK-AUTH-ERROR-CODE 一併清理。

---

## §11 NEXORA 錯誤代碼總表（v1.1）

### Auth 模組（AU、12 代碼）

| 代碼 | 訊息 | 落地 |
|---|---|---|
| AU-001 | 登入失敗（tenant 不存在）| v1.1 |
| AU-002 | 登入失敗（user 不存在）| v1.1 |
| AU-003 | 登入失敗（password 錯誤）| v1.1 |
| AU-101 | 公司已停用 | v1.1 |
| AU-102 | 帳號已停用 | v1.1 |
| AU-301 | 請輸入公司帳號 | v1.1 |
| AU-302 | 請輸入使用者帳號 | v1.1 |
| AU-303 | 請輸入密碼 | v1.1 |
| AU-304 | 請輸入公司帳號、使用者帳號與密碼 | v1.1 |
| AU-401 | 多次錯誤已鎖定 | ❌ 後續軌 |
| AU-402 | IP 限流 | ❌ 後續軌 |
| AU-501 | 登入流程異常（既有 hack 清理）| v1.1 |

### Networking 模組（NW、1 代碼）

| 代碼 | 訊息 | 落地 |
|---|---|---|
| NW-001 | 網路連線異常（既有 hack 清理）| v1.1 |

### 其他模組（待後續軌實作）

```
MS-xxx  Master 主檔（待 NX01 改版時擴）
PO-xxx  Purchase（待 NX02 改版時擴）
IN-xxx  Inventory（待 NX03 改版時擴）
SO-xxx  Sales（待 NX04 改版時擴）
FN-xxx  Finance（待 NX05 改版時擴）
DN-xxx  Delivery（待 NX06 改版時擴）
HR-xxx  HR（待 NX07 改版時擴）
RP-xxx  Report（待 NX08 改版時擴）
KM-xxx  Knowledge（待 NX09 改版時擴）
GM-xxx  Gamification（待 NX10 改版時擴）
SY-xxx  System
```

---

## §12 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v1.0 | 2026-05-18 | 首版、Crown 拍板（Q1=b 6 字格式 / Q2=a 12 模組縮寫 / Q3=a 5 區分配）+ Auth 7 代碼初版 |
| **v1.1** | **2026-05-18** | **對齊 Hank NEXORA-CODE-NAMING-AUDIT 5 校正**：(1) +NW Networking 模組 = 13 縮寫 / (2) §3.1 字母 reserve table / (3) §5.3 §5.5 Auth 補 AU-301~304 + AU-501 = 12 代碼 / (4) §7.1 NexoraErrorResponse TypeScript interface / (5) §10 既有 2 hack 清理 mapping |

---

> **本文件是 NEXORA 架構級規範、所有後續軌錯誤訊息必對齊**
> **NEXORA 業界改革第 19 候選 ⭐⭐⭐**（跨模組統一錯誤代碼制度、業界中小汽配 ERP 多無）
> **3 層命名範式協同**（@FUNCTION_CODE / @CODE / XX-NNN）零衝突
