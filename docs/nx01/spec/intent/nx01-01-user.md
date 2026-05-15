<!-- docs/nx01/spec/intent/nx01-01-user.md -->

# NX01-01 - 用戶管理工作站子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-05
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-01-user.md

---

## 文件定位

NX01-01 = NX01 主檔模組的「**用戶管理工作站**」子規格書。

對齊 [docs/_template/spec-template.md](docs/_template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_user`（系統使用者帳號主檔）
- 登入流程（mandatory tenantCode）
- ID 範圍標準（已落地、TASK-SEED-REFACTOR-01）
- 不含角色權限細節（歸 NX01-02 角色權限工作站）
- 不含 HR 員工資料（歸 NX07 人資模組、之後寫）

**戰略意義：**

user 是 NEXORA 全模組引用最廣的主檔之一：
- partner.sales_user_id 業務歸屬（NX01-03）
- 全業務單據 createdBy / updatedBy（NX02~NX10）
- 角色權限執行單位（NX01-02）

→ user 改動可能影響全 NEXORA、走擴充原則 #23。

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 必填欄位：見 [CLAUDE.md](CLAUDE.md) §六
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_user`（系統使用者帳號）= **NEXORA 全模組身份識別的單一真相**、所有「誰建的、誰改的、誰負責」都引用 user。

**業務語意：**
- 1 user 對應 1 個自然人 + 1 個 tenant
- user 可有 1 或多個 role（多對多透過 nx01_user_role）
- user 透過登入產生 session、其他模組透過 session 識別 user

**設計哲學對齊：**
- 設計哲學 #1「中心 = 角色工作台」：user 是「**HR 工作站的核心主檔**」
- 設計哲學 #13「強制資料溯源」：所有業務動作都記錄 user 是誰
- 設計哲學 #12「智能預設」：登入後自動帶 createdBy / updatedBy

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| BUSINESS_OWNER | 看公司全 user 列表、批准新員工帳號 | 每月 |
| HR | 維護 user（新增 / 停用 / 改 role）⭐ | 每週 |
| 業務 / 採購 / 倉管 | 看自己 profile（read-only）| 不常 |
| SYSADMIN | 跨租戶查看 / 處理特殊問題 | 不常 |
| user 自己 | 改自己密碼 / profile 部分欄位 | 偶爾 |

### 1.3 跨模組引用

user 是 NEXORA 引用最廣的主檔之一：

| 業務模組 | 引用方式 | 引用欄位 |
|---------|---------|---------|
| NX01-02 角色權限 | nx01_user_role 多對多 | user_id |
| NX01-03 客戶/供應商 | partner.sales_user_id 業務歸屬 | sales_user_id |
| NX02 採購 | RFQ / PO 建立人 | createdBy / updatedBy |
| NX04 銷貨 | QT / SO / DN 建立人 | createdBy / updatedBy |
| NX05 財務 | 應收 / 應付建立人 | createdBy / updatedBy |
| NX06 物流 | 配送單建立人 | createdBy / updatedBy |
| NX07 人資（之後）| employee → user FK 連結 | user_id |
| NX08 報表 | 按 user 維度統計業績 | salesman_id |
| NX10 遊戲化 | 勳章 / 排行榜歸屬 | user_id |

→ user 改動可能影響全 NEXORA、走擴充原則 #23。

### 1.4 ID 範圍標準（已落地）

對齊 [PROJECT_CONTEXT § ID 範圍標準](PROJECT_CONTEXT.md)（TASK-SEED-REFACTOR-01 拍板）：

```
nx01_user.id 命名規則:NX01USER + 7 位數字
  - NX01USER0000001              = SYSADMIN（系統管理員、跨租戶）
  - NX01USER0000002 ~ 0899999    = 真實客戶 user（業務範圍）
  - NX01USER9900001 ~ 9999999    = 測試租戶 user（dev / test）

說明:
  - SYSADMIN 唯一、不開放真實客戶用此 ID 範圍
  - 真實客戶 user 從 0000002 起算、約 89 萬個 ID 容量
  - 測試租戶（LITE/PLUS/PRO）user 用 99 開頭、跟真實客戶區隔
```

→ 對齊 PROJECT_CONTEXT 命名規範、不擅自改動。

---

## § 2. UI 頁面

### 2.1 列表頁（`/master/user`）

**顯示內容：**
- 表格欄位：username / display_name / email / 主要 role / 部門 / 狀態 / 最後登入時間
- 預設排序：updated_at DESC
- 預設過濾：isActive = true

**互動功能：**
- 一般搜尋：username / display_name / email
- 進階篩選：role / 部門 / 建立時間 / 狀態
- 動作：[新增] / [編輯] / [停用] / [重設密碼] / [批次匯入]

⭐ 對齊 [CLAUDE.md §四 版本方案](CLAUDE.md) Tier user 上限（詳見 §7）

### 2.2 詳細頁（`/master/user/:id`）

**顯示內容：**
- 主資訊：username / display_name / email / 手機 / 部門
- 帳號狀態：建立時間 / 最後登入 / 失敗登入次數 / 是否鎖定
- 權限資訊：role 列表（連結到 NX01-02）
- 業務資訊（如為業務）：負責 partner 數 / 銷貨業績統計（連結 NX04 / NX08）

**動作：**
- [編輯]
- [停用] / [啟用]
- [重設密碼]（HR 強制重設）
- [真刪除]（⚠️ Q1 拍）

### 2.3 編輯頁（`/master/user/:id/edit`）

**表單分區：**
- 基本資訊：display_name / email / 手機 / 部門
- 帳號設定：username（編輯時不可改）/ password（重設用）
- 權限分配：role 多選（連結 NX01-02 角色權限工作站）

⚠️ HR 不能改自己的 role（避免提權）

### 2.4 user profile 頁（`/profile`）

**user 自己使用：**
- 看：username / display_name / email / role 列表
- 改：display_name / 手機 / 個人偏好設定 / 改密碼
- 不可改：username / email / role

### 2.5 登入頁（`/login`）

**mandatory tenantCode 流程（已落地、TASK-SEED-REFACTOR-01）：**

```
1. 輸入 tenantCode（如「YARO-AUTO」「TEST-LITE」）
2. 輸入 username / password
3. 系統驗證:
   - tenantCode 是否存在 + isActive
   - username + password 是否符合（hash 比對）
   - user.tenantId 是否對應 tenantCode
4. 通過 → 建立 session、跳轉 user 預設工作站
5. 失敗 → 紀錄 failed_login_count、超過閥值鎖定
```

→ 對齊 PROJECT_CONTEXT 工程模式 #11「mandatory tenantCode flow」。

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

- `id` UNIQUE（系統 ID、走 ID 範圍標準 §1.4）
- `(tenantId, username)` UNIQUE（同租戶內 username 唯一、跨租戶可同名）
- `(tenantId, email)` UNIQUE（同租戶內 email 唯一）

對齊 [CLAUDE.md §五](CLAUDE.md) 命名規則 + 多租戶隔離。

### 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `username` | ✅ | 英數 + 底線（4~30 字元）| (tenantId, username) unique |
| `password` | ✅ | bcrypt hash | 業務人員填明文、系統 hash |
| `display_name` | ✅ | 中/英文（最長 50 字元）| 顯示用 |
| `email` | ✅ | Email 格式 | (tenantId, email) unique |
| `mobile` | ❌ | 手機格式 | 選填 |
| `department_id` | ❌ | FK to nx01_department | 部門歸屬（NX01 暫保留 schema、未來啟用）|
| `isActive` | ✅ | boolean | 系統自動 / HR 控制 |

### 3.3 跨主檔連動

user 引用其他 NX01 主檔：

| 引用主檔 | 用途 | 必填 |
|---------|------|-----|
| `nx99_tenant` | 多租戶歸屬 | ✅ |
| `nx01_role`（透過 nx01_user_role）| 角色權限 | ✅ 至少 1 個 |
| `nx01_department` | 部門歸屬 | ❌（暫保留 schema） |

→ 編輯 user 時、role 走「多選下拉」連結 NX01-02。

### 3.4 跨業務模組連動

哪些業務單據 / 主檔會引用 user：

詳見 §1.3 跨模組引用表。

→ 一旦 user 被引用、不可真刪、只能停用（對齊 nx01-overview §3.2）。

⭐ Q1 拍板（B）：user 真刪僅限「未被引用」、被引用走離職轉手流程

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview §3.2](docs/nx01/spec/intent/nx01-overview.md)：

- **未被引用**：可真刪（罕見、僅誤建帳號）
- **已被引用**：只能停用（`isActive = false`）
  - 既有業務單據仍顯示此 user（createdBy / updatedBy 不變）
  - 該 user 無法登入
  - 該 user 負責的 partner 需轉手給其他業務（對齊 NX01-03 §5.5）
  - 報表查詢仍可看到歷史紀錄

⭐ Q1 拍板（B 詳細）：離職員工走「停用 + 離職轉手」流程、詳見 §5.4

### 3.6 密碼規則

⭐ Q2 拍板（B 中等）：
- 最少 10 位
- 必含大小寫 + 數字 + 特殊字元
- 3 個月過期、強制改密
- 失敗 5 次鎖定 30 分鐘 / 10 次鎖到 HR 解鎖（對齊 §3.7）

### 3.7 帳號鎖定規則

failed_login_count 累計：
- 達 5 次 → 鎖定 30 分鐘
- 達 10 次 → 鎖定到 HR 解鎖
- 成功登入 → reset count

---

## § 4. 欄位列表

### 4.1 業務欄位

⚠️ 以下欄位待 Hank grep 既有 nx01_user schema 確認、可能需校正。

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `id` | 系統 ID（NX01USER + 7 位數）| ✅ | 系統自動 | ID 範圍標準 §1.4 |
| `username` | 登入帳號（如 `john.doe`）| ✅ | 無 | HR 填 |
| `password_hash` | 密碼 hash（bcrypt）| ✅ | 無 | 系統自動 hash |
| `display_name` | 顯示名（如「林翰杰」）| ✅ | 無 | HR 填 |
| `email` | 主要 Email | ✅ | 無 | HR 填 |
| `mobile` | 手機 | ❌ | null | HR 填 |
| `department_id` | 部門 ID（FK）| ❌ | null | 待 NX01 部門啟用 |
| `tenantId` | 多租戶歸屬 | ✅ | 系統自動 | 系統自動 |
| `last_login_at` | 最後登入時間 | ❌ | null | 系統自動 |
| `failed_login_count` | 失敗登入次數 | ✅ | 0 | 系統自動 |
| `locked_until` | 鎖定到何時 | ❌ | null | 系統自動 |
| `isActive` | 是否啟用 | ✅ | true | HR 控制 |

### 4.2 系統自動欄位（不可改）

對齊 [CLAUDE.md §六](CLAUDE.md)：

| 欄位 | 業務語意 |
|------|---------|
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（從登入 user 帶）|

⚠️ user 表自己的 createdBy / updatedBy = 當前登入 HR（不是 user 自己）

### 4.3 注音索引欄位（系統自動同步）

`phonetic_code`（聲母碼如「ㄌㄏㄐ」）、`phonetic_full`（完整注音）由 trigger 自動寫入 `nx01_phonetic_index`、不在主檔表內。

第二階段支援的主檔（user 屬此階段）：
- 對齊 [nx01-overview §3.6 注音快搜跨主檔機制](docs/nx01/spec/intent/nx01-overview.md)

---

## § 5. 工作流程

### 5.1 HR 新增 user（標準流程）

```
1. HR 進列表頁、點 [新增]
2. 填基本資訊（username / display_name / email / 手機）
3. 設定密碼（系統提示複雜度規則）
4. 分配 role（多選、至少 1 個、連結 NX01-02）
5. 設定部門（如已啟用部門功能）
6. [儲存]
7. 系統自動:
   - bcrypt hash 密碼
   - 建立 user 紀錄
   - 寫 phonetic_index
   - 寫 audit log
   - 發送歡迎 Email（含初始密碼、要求首次登入改密）
8. 返回列表頁、新 user 出現
```

### 5.2 user 首次登入流程

```
1. user 收到歡迎 Email、進 /login
2. 輸入 tenantCode + username + 初始密碼
3. 系統檢查:
   - 是否首次登入（last_login_at IS NULL）
   - 如是 → 強制跳「改密碼」頁
4. user 輸入新密碼 + 確認密碼
5. 系統 hash 新密碼、更新 password_hash
6. 跳轉預設工作站（依角色決定:業務 → 業務工作站 / 倉管 → 倉管工作站 / 等）
```

### 5.3 異常：user 撞 unique（username 或 email）

HR 試圖新增 username = `john`、但同租戶已有：

- UI 即時驗證、紅字提示「此 username 已被使用」
- 不可儲存、HR 改 username

### 5.4 異常：user 離職處理

⭐ Q1 拍板（B）：詳細離職轉手流程（落地版）

```
1. HR 進此 user 詳細頁
2. 點 [停用 + 離職處理]
3. 系統跳「離職轉手清單」:
   - 此 user 負責的 partner 數量
   - 此 user 進行中的業務單據（QT/SO 等）
   - 此 user 待處理事項
4. HR 選擇接手 user（多選 + 各分配比例）
5. 系統自動:
   - 該 user.isActive = false
   - 該 user 所有 partner.sales_user_id 改為接手 user
   - 進行中業務單據通知接手 user
   - 寫 audit log（離職時間 + 接手分配紀錄）
6. 該 user 無法登入
7. 業務歷史紀錄保留
```

### 5.5 異常：HR 試圖改自己的 role

```
1. HR 進自己 detail 頁、點 [編輯]
2. 試圖改 role（如把自己降級為一般業務）
3. 系統 401:「不可改自己的 role、避免提權問題」
4. 跳訊息「請其他 HR 或 BUSINESS_OWNER 協助」
```

### 5.6 跨角色協作：BUSINESS_OWNER 批准

⚠️ Q：是否要 BUSINESS_OWNER 批准 HR 新建 user?
- 業務真實:小公司不必（HR 直接建）
- 大公司可能需要（避免人事權集中）
- Alex 推薦:預設不必、但提供「待批准」可選功能

---

## § 6. 角色權限

| 角色 | 看 | 改 | 新增 | 停用 | 真刪 | 改自己密碼 |
|------|---|---|------|------|------|---------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ✅ | ✅ |
| BUSINESS_OWNER | ✅（自己租戶全部）| ✅ | ✅ | ✅ | ❌ | ✅ |
| HR | ✅（自己租戶全部）| ✅（不能改自己 role）| ✅ | ✅ | ❌ | ✅ |
| 業務 / 採購 / 倉管 | ✅（自己 profile）| ✅（部分欄位）| ❌ | ❌ | ❌ | ✅ |

**關鍵權限規則：**

⭐ **HR 是 user 主檔的主要維護人**：
- 不是 BUSINESS_OWNER（雖然有權、通常委派給 HR）
- 不是 SYSADMIN（跨租戶角色、不直接維護單一租戶）

⭐ **避免提權問題**：
- HR 不能改自己的 role
- 同 HR 之間可互改 role（互相制衡）

⭐ **user 自己權限**：
- 可改 display_name / 手機 / 個人偏好 / 密碼
- 不可改 username / email / role / department

→ 詳細權限矩陣由 NX01-02 角色權限工作站子規格書定義。

---

## § 7. Tier 差異（對齊 CLAUDE.md §四 版本方案）

⭐ 對齊 [CLAUDE.md §四「版本方案」](CLAUDE.md) 真相、不擅自定義 user 上限。

### LITE（基礎版、單店 / 小團隊）

- **user 數：1~10 人**（內部子級分 S/M）
  - LITE-S：1~5 人（單店、老闆 + 業務 + 倉管 + 助理）
  - LITE-M：6~10 人（小型多人團隊）
- 部門架構：無
- 多部門功能：不開放
- HR 角色：可指派、但通常 BUSINESS_OWNER 兼任

### PLUS（進階版、中型 / 多倉）

- **user 數：5~30 人**（內部子級分 S/M/L）
- 部門架構：基本（可建多部門、user 歸屬部門）
- 多部門功能：開放
- HR 可批次匯入

### PRO（專業版、大型 / 多廠 / 海外、Yaro 主場）

- **user 數：10~100 人**（內部子級分 S/M/L/XL）
- 部門架構：完整組織架構
- 多部門無限
- 海外時區支援（PRO 加值）
- 對齊 30 年資料庫遷移服務（含老員工帳號批量建立）

### Tier 升級時的 user 數處理

- LITE → PLUS：既有 user 全保留、新增空間從 10 變 30（業務無痛升級）
- PLUS → PRO：既有 user 全保留、新增空間從 30 變 100
- 對齊 NX01-04 §7 「升級無痛」精神

→ Tier 限制由 Plan Guard 強制（[CLAUDE.md §八](CLAUDE.md)）。

---

## § 8. 注音索引

### 8.1 是否需注音索引

✅ 需要（HR / BUSINESS_OWNER 會打注音搜 user）

### 8.2 trigger 來源欄位

| 主檔欄位 | → 注音索引 |
|---------|-----------|
| `display_name`（如「林翰杰」）| `phonetic_code = 'ㄌㄏㄐ'` |
| `display_name` | `phonetic_full = 'ㄌㄧㄣˊ ㄏㄢˋ ㄐㄧㄝˊ'` |

### 8.3 trigger 觸發時機

- INSERT `nx01_user` → 自動寫 phonetic_index
- UPDATE `nx01_user.display_name` → 自動更新 phonetic_index
- DELETE `nx01_user` → 自動刪除（罕見、user 通常停用而非真刪）

對齊 [PROJECT_CONTEXT 工程模式 #4](PROJECT_CONTEXT.md)「trigger 做 invariant」。

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-05 | Alex | 初稿（NX01 第四份子規格書、對齊 spec-template + ID 範圍標準）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（離職員工處理）**：B 詳細離職轉手流程（§5.4 落地）
- **Q2（密碼規則）**：B 中等（10 位 + 大小寫 + 數字 + 特殊、3 個月過期）
- **Q3（user 跨租戶搬遷）**：A 不支援（YAGNI、對齊既有設計、罕見場景）
- **Q4（user vs employee 關係）**：C 暫不規劃（NX07 人資模組未啟用）
- **Q5（LITE user 上限）**：⭐ 對齊 CLAUDE.md §四「版本方案」真相
  - LITE 1~10 人（S:1~5 / M:6~10）
  - PLUS 5~30 人（S/M/L）
  - PRO 10~100 人（S/M/L/XL）
  - §7 Tier 差異重新設計、對齊既有 NEXORA Tier 定義

**Alex 失誤紀錄（給未來新對話的 Alex 跨對話讀）：**

- 失誤候選 #39:Alex 寫 Tier 差異時、沒 grep CLAUDE.md §四「版本方案」真相
  - 跟失誤候選 #28 / #32 / #38 同根源（沒 grep 既有 NEXORA 真相文件）
  - 規則升級:Tier 差異段落必須先 grep CLAUDE.md §四

---

## § 10. 待 Hank grep 確認項

⚠️ 以下事項 Hank push 前主動確認:

A. 既有 nx01_user schema 確認:
   - id 欄位範圍規則對齊（NX01USER 前綴 + 7 位數）
   - username / email composite unique 含 tenantId
   - password_hash / failed_login_count / locked_until 等帳號鎖定欄位
   - last_login_at 欄位

B. mandatory tenantCode 登入流程確認:
   - 既有 auth service 是否已實作（PROJECT_CONTEXT 工程模式 #11 提到已落地）
   - 跟本規格書 §2.5 對齊

C. nx01_department 欄位確認:
   - 規格書 §4.1 提到 department_id（FK）
   - nx01_department 屬「已建未實作」schema（nx01-overview §2.2）
   - department_id 暫保留 nullable、未啟用

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。
→ 缺欄位 → 評估是否合併進 schema 補建 task。

---

*文件結束。NX01-01 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-01-user.md。*
