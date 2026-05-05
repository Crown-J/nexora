<!-- docs/nx01/spec/intent/nx01-03-partner.md -->

# NX01-03 - 客戶/供應商主檔工作站子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-04
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-03-partner.md

---

## 文件定位

NX01-03 = NX01 主檔模組的「**客戶/供應商主檔工作站**」子規格書。

對齊 [docs/_shared/template/spec-template.md](docs/_shared/template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_partner` 主檔（涵蓋 5 種 partner_type：C/S/T/V/B 通用）
- 不含地址（地址歸 NX01-04 客戶地址管理子模組）
- 不含注音搜尋細節（注音機制歸 NX01-10 注音快搜系統）

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 必填欄位：見 [CLAUDE.md](CLAUDE.md) §六
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- Plan Guard：見 [CLAUDE.md](CLAUDE.md) §八
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_partner`（客戶/供應商主檔）= **NEXORA 對外往來對象的統一主檔**、所有「跟誰做生意」的紀錄都在這。

5 種 partner_type 涵蓋對外往來對象的全部分類：

| type | 業務語意 | 主要使用模組 |
|------|---------|------------|
| C | Customer 客戶 | NX04 銷貨 / NX05 應收 |
| S | Supplier 零件供應商 | NX02 採購 / NX05 應付 |
| T | Transport 外包物流 | NX06 物流 |
| V | Vendor 一般廠商（雜支供應商）| NX02 採購 / NX05 費用 |
| B | Bank 銀行 ⚠️ | NX05 財務（暫時、未來獨立 nx01_bank_account）|

**設計哲學對齊：**

- 設計哲學 #1「中心 = 角色工作台」：partner 是「**業務 / 採購工作站的核心主檔**」、不是獨立工作站。
- 設計哲學 #13「強制資料溯源」：partner 不可真刪、只能停用（一旦被任何單據引用過）。

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| BUSINESS_OWNER | 看全公司客戶 / 供應商總覽、設信用條件上限 | 每月 |
| 業務 | 維護自己負責的客戶、查客戶資料 | 每天 |
| 採購 | 維護自己對接的供應商、查供應商資料 | 每天 |
| 倉管 | 看出貨對象（客戶）、查供應商發貨資訊 | 每天 |
| HR_ADMIN | 不用此主檔（人資只用 user / role） | - |
| SYSADMIN | 跨租戶查詢、不直接維護 | 不常 |

### 1.3 跨模組引用

partner 是 NEXORA 引用次數最多的主檔之一：

| 業務模組 | 引用方式 | 引用 type |
|---------|---------|---------|
| NX02 採購 | RFQ / PO / GR 引用 partner（供應商）| S / V |
| NX04 銷貨 | QT / SO / DN / RR 引用 partner（客戶）| C |
| NX05 財務 | 應收 / 應付 / 銀行帳引用 partner | C / S / V / B |
| NX06 物流 | DN 物流追蹤、外包物流引用 partner | T |
| NX08 報表 | 按客戶 / 供應商維度統計 | C / S |

→ partner 改動可能影響全 NEXORA、請走擴充性原則 #23。

---

## § 2. UI 頁面

### 2.1 列表頁（`/master/partner`）

**顯示內容：**
- 表格欄位：partner_type（圖示 / 標籤）/ code / name / 統編 / 主要聯絡人 / 業務歸屬 / 客戶等級 / 狀態
- 預設排序：updated_at DESC（最近編輯的最上）
- 預設過濾：isActive = true（停用的隱藏、可手動切換）

**互動功能：**
- 上方 Tab 切 partner_type：[全部] [客戶 C] [供應商 S] [物流 T] [廠商 V] [銀行 B]
- 注音搜尋 F4：打「ㄍㄐㄍ」+ F4 → 列出「光佳工業 / 工建工程 / ...」
- 一般搜尋：name / code / 統編 模糊搜尋
- 進階篩選：業務歸屬 / 客戶等級 / 信用條件 / 建立時間
- 動作：[新增] / [編輯] / [停用] / [批次匯入]

### 2.2 詳細頁（`/master/partner/:id`）

**顯示內容：**
- 主資訊區：code / name / partner_type / 統編 / 公司簡稱 / Logo
- 聯絡資訊區：聯絡人 / 電話 / 手機 / Email / 傳真
- 商務資訊區：業務歸屬 / 客戶等級 / 預設交易幣別 / 信用條件 / 付款條件
- 地址 tab：→ 跳轉 NX01-04 地址管理子模組（一對一收帳 + 一對多送貨）
- 引用記錄 tab：列出此 partner 被哪些單據引用（讀取 NX02/04/05/06）
- 系統資訊：建立時間 / 建立者 / 最後編輯時間

**動作：**
- [編輯]
- [停用] / [啟用]
- [真刪除]（僅未被引用時可用）

### 2.3 編輯頁（`/master/partner/:id/edit`）

**表單分區：**
- 基本資訊：code（編輯時不可改）/ name / partner_type / 統編
- 聯絡資訊：主要聯絡人 + 電話 + Email
- 商務資訊：業務歸屬（下拉 user）/ 客戶等級（下拉、type=C 才顯示）/ 預設幣別 / 信用條件
- 備註

**動作：**
- [儲存] → 系統自動寫 phonetic_index
- [取消]
- [刪除]（如未被引用）/ [停用]（如已被引用）

### 2.4 新增頁（`/master/partner/new`）

跟 2.3 編輯頁類似、但 code 可填、partner_type 不可改（一開始選定後鎖死）。

### 2.5 批次匯入頁（`/master/partner/import`）

- 上傳 CSV / Excel
- 預覽 → 對照既有 partner（依 code / 統編 / name 比對）→ 衝突解決 → 匯入
- 匯入後自動寫 phonetic_index

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

- `code` unique 範圍 = `(tenantId, code)`（多租戶 scoped）
- `tax_id`（統編）unique 範圍 = `(tenantId, tax_id)`（同租戶內統編不可重複）

對齊 [CLAUDE.md §五](CLAUDE.md) 命名規則 + nx01-overview §3.1。

### 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| code | ✅ | 大寫英文 + 數字（3~20 字元）| `(tenantId, code)` unique |
| name | ✅ | 中/英文（最長 100 字元） | 不可全空白 |
| partner_type | ✅ | 單字元 C/S/T/V/B | 必為 5 種之一 |
| tax_id | ⚠️ | 台灣統編 8 位數 | type=C/S/V 必填、type=T/B 選填 |
| contact_name | ⚠️ | 中/英文 | type=C/S 必填 |
| contact_phone | ⚠️ | 電話格式 | type=C/S 必填 |
| email | ❌ | Email 格式 | 選填、但格式必須對 |
| name_en | ❌ | 英文（最長 100 字元）| 海外客戶 / 出口往來填 |
| website | ❌ | URL 格式 | 公司官網 |
| service_location | ❌ | 字串 | 業務拜訪據點（如「台北 / 台中 / 高雄」）|
| sales_user_id | ⚠️ | FK to nx01_user | 全 tier 必填、業務歸屬 |
| customer_grade_id | ❌ | FK to nx01_customer_grade | type=C 才出現、可不填走預設 |
| default_currency_id | ❌ | FK to nx01_currency | 不填走 TWD |
| credit_limit | ❌ | 整數 ≥ 0 | type=C 才出現 |
| payment_terms | ❌ | 字串（如 月結 60 天）| - |

**跨欄位驗證：**
- type=C → customer_grade_id / sales_user_id 邏輯出現
- type=S/V → 移除客戶相關欄位
- type=T → 移除商務欄位（僅基本資訊 + 聯絡）
- type=B → 移除商務欄位、未來會獨立成 nx01_bank_account（v1.0 主檔規格書 §6.3）

### 3.3 跨主檔連動

partner 引用其他 NX01 主檔：

| 引用主檔 | 用途 | type 限制 |
|---------|------|---------|
| `nx01_user` | 業務歸屬（sales_user_id）| 僅 type=C |
| `nx01_customer_grade` | 客戶等級 | 僅 type=C |
| `nx01_currency` | 預設交易幣別 | 全 type |
| `nx99_tenant` | 多租戶隔離 | 全 type |

→ 編輯 partner 時、上述主檔走「下拉選」、不打字。

### 3.4 跨業務模組連動

哪些業務單據會引用 partner（影響「真刪除」可行性）：

| 模組 | 單據 | 引用欄位 |
|------|------|---------|
| NX02 採購 | RFQ / PO / GR | supplier_id |
| NX04 銷貨 | QT / SO / DN / RR | customer_id |
| NX05 財務 | 應收單 / 應付單 / 銀行對帳 | partner_id |
| NX06 物流 | DN | shipping_partner_id（type=T）|

→ 一旦 partner 被任何單據引用、不可真刪、只能停用（對齊 nx01-overview §3.2）。

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview §3.2](docs/nx01/spec/intent/nx01-overview.md)：

- **未被引用**：可真刪（純 metadata error 修正）
- **已被引用**：只能停用（`isActive = false`）
  - 既有單據（如歷史 SO）仍顯示此 partner
  - 新增單據不可選此 partner（下拉選不出現）
  - 報表查詢仍可看到（歷史可查）

---

## § 4. 欄位列表

### 4.1 業務欄位

⚠️ 以下欄位待 Hank grep 既有 nx01_partner schema 確認、可能需校正。

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 客戶/供應商代碼（如 `CUS-VW001`）| ✅ | 無 | 業務人員填、可批次匯入 |
| `name` | 公司全名（如「光佳工業股份有限公司」）| ✅ | 無 | 業務人員填 |
| `short_name` | 公司簡稱（如「光佳」）| ❌ | name 前 10 字 | 業務人員填、UI 顯示用 |
| `partner_type` | 類型（C/S/T/V/B）| ✅ | 無 | 業務人員選定後鎖死 |
| `tax_id` | 統一編號（台灣 8 位數）| ⚠️ | 無 | type=C/S/V 必填 |
| `contact_name` | 主要聯絡人 | ⚠️ | 無 | type=C/S 必填 |
| `contact_phone` | 聯絡電話 | ⚠️ | 無 | type=C/S 必填 |
| `contact_mobile` | 聯絡手機 | ❌ | null | - |
| `email` | 主要 Email | ❌ | null | - |
| `fax` | 傳真號 | ❌ | null | 老派客戶仍用 |
| `name_en` | 公司英文名（如「Kuang-Chia Industrial Co., Ltd.」）| ❌ | null | 海外 / 出口客戶 |
| `website` | 公司官網（如 `https://kuang-chia.com.tw`）| ❌ | null | - |
| `service_location` | 負責據點（如「台北 / 台中」）| ❌ | null | 業務拜訪定位用 |
| `sales_user_id` | 業務歸屬（FK to nx01_user）| ⚠️ | 當前登入 user | 全 tier 必填、type=C 重要 |
| `customer_grade_id` | 客戶等級（FK to nx01_customer_grade）| ❌ | 預設 1 級 | 僅 type=C 出現 |
| `default_currency_id` | 預設交易幣別（FK to nx01_currency）| ❌ | TWD | 全 type 通用 |
| `credit_limit` | 信用額度上限（整數）| ❌ | 0 | 僅 type=C 出現 |
| `payment_terms` | 付款條件（如「月結 60 天」）| ❌ | null | - |
| `note` | 備註 | ❌ | null | 業務人員填 |
| `isActive` | 是否啟用 | ✅ | true | 業務人員可停用 |

### 4.2 系統自動欄位（不可改）

對齊 [CLAUDE.md §六](CLAUDE.md)：

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID（UUID）|
| `tenantId` | 多租戶隔離（自動帶當前租戶）|
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（從登入 user 帶）|

### 4.3 注音索引欄位（系統自動同步、不在 partner 表內）

`phonetic_code`（聲母碼如「ㄍㄐㄍ」）、`phonetic_full`（完整注音）由 trigger 自動寫入 `nx01_phonetic_index`、不在主檔表內。

對齊 [nx01-overview §3.6 注音快搜跨主檔機制](docs/nx01/spec/intent/nx01-overview.md)。

### 4.4 地址欄位（不在此表）

收帳地址 / 送貨地址歸 NX01-04 客戶地址管理子模組（`nx01_partner_billing_address` + `nx01_partner_shipping_address`）。

partner 跟地址表的關係：
- 一個 partner 對應 0 或 1 筆 billing_address（一對一、type=C 才有）
- 一個 partner 對應 0~N 筆 shipping_address（一對多、type=C 才有）

---

## § 5. 工作流程

### 5.1 業務新建客戶（標準流程）

```
1. 業務進列表頁、點 [新增]
2. 選 partner_type = C 客戶
3. 填基本資訊（code / name / 統編 / 簡稱）
4. 填聯絡資訊（聯絡人 / 電話 / Email）
5. 填商務資訊:
   - 業務歸屬:自動帶「當前登入 user」、可改
   - 客戶等級:下拉選 customer_grade、不選走預設 1 級
   - 預設幣別:不選走 TWD
   - 信用額度:不填走 0
6. [儲存]
7. 系統自動:
   - 寫 phonetic_index（trigger 監聽）
   - 寫 audit log（誰建的）
8. 跳到 partner 詳細頁、業務點「地址」tab → 進 NX01-04 地址管理填地址
```

### 5.2 採購新建供應商

```
1. 採購進列表頁、點 [新增]
2. 選 partner_type = S 供應商
3. 填基本資訊（code / name / 統編 / 簡稱）
4. 填聯絡資訊（聯絡人 / 電話 / Email）
5. 商務欄位中的「客戶等級 / 信用額度」自動隱藏（type=S 不出現）
6. [儲存]
7. 系統自動寫 phonetic_index + audit log
8. 跳到 partner 詳細頁、可選擇填地址（供應商地址通常不要寄送、選填）
```

### 5.3 異常：撞 unique（code 或 統編）

業務人員填 code = `CUS-VW001`、但已存在：

- UI 即時驗證、紅字提示「此 code 已被使用、是否要改用既有的?」
- 提供「查看既有」按鈕跳轉
- 不可儲存、業務改 code 或停用既有

統編撞號類似（同租戶內統編不可重複）。

### 5.4 異常：被引用的 partner 想刪除

業務人員試圖真刪客戶「光佳工業」、但已有 50 筆 SO 引用：

- UI 跳警告「此客戶已被 50 筆銷貨單引用、不可真刪、是否改為停用?」
- 業務確認 → `isActive = false`
- 既有 SO 仍顯示「光佳工業」（歷史可查）
- 新增 SO 下拉選不出現此客戶
- 報表查詢仍可看到歷史銷售紀錄

### 5.5 跨角色協作：業務轉手

業務 A 離職、客戶轉給業務 B：

```
1. BUSINESS_OWNER（或業務 A）進此客戶詳細頁
2. 點 [編輯]
3. 改 sales_user_id 從業務 A → 業務 B
4. [儲存]
5. 系統自動:
   - 寫 audit log（誰改了業務歸屬）
   - 通知業務 B（透過 nx01_bulletin 機制、待業務真要時實作）
6. 之後業務 B 列表看得到此客戶、業務 A 看不到（除非 BUSINESS_OWNER 授權）
```

### 5.6 銀行（type=B）特殊處理

對齊 [nx01-overview §6.3 Banker 未來獨立 nx01_bank_account](docs/nx01/spec/intent/nx01-overview.md)：

- v1.0 期間：銀行用 partner 紀錄（type=B、商務欄位隱藏）
- 未來：銀行獨立成 `nx01_bank_account` 表（含分行 / 帳號 / SWIFT）
- 走擴充原則類型 2「升級既有結構」3 階段演進

---

## § 6. 角色權限

| 角色 | 看 | 改 | 新增 | 停用 | 真刪 | 業務歸屬 |
|------|---|---|------|------|------|---------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ✅ | - |
| BUSINESS_OWNER | ✅（自己租戶全部）| ✅ | ✅ | ✅ | ❌ | 可改任何 |
| 業務 | ✅（**全部 partner**）| ✅（**僅自己 sales_user_id 的 type=C**）| ✅（type=C、自動帶自己）| ✅（自己負責的）| ❌ | 自動帶自己 |
| 採購 | ✅（**全部 partner**）| ✅（自己對接的 type=S/V）| ✅（type=S/V）| ✅（自己對接的）| ❌ | - |
| 倉管 | ✅（read-only）| ❌ | ❌ | ❌ | ❌ | - |
| HR_ADMIN | ❌ | ❌ | ❌ | ❌ | ❌ | - |

**關鍵權限規則（v1.0 拍板版）：**

⭐ **看 vs 改 權限分離（Crown 拍 Q2/Q3 真相揭露）：**

- **看（read）：全業務 / 採購都看得到所有 partner**
  - 業務透明度高、業務之間互相了解客戶狀況
  - 業務可 cover 同事休假時的客戶詢問
  - 不限「自己負責的」、所有客戶 / 供應商列表全顯示
  
- **改（write）：只有「負責人」可以維護**
  - type=C 客戶：僅 sales_user_id = 當前 user 可改
  - type=S/V 供應商 / 廠商：僅「建立者」可改（採購團隊歸屬）
  - 資料品質負責制：誰負責誰維護

⭐ **業務轉手流程（對齊 §5.5）：**
- BUSINESS_OWNER 改 sales_user_id → 業務 A → 業務 B
- 改完後業務 A 失去「改」權、保留「看」權
- 業務 B 取得「改」權

⭐ **跨團隊協作：**
- 業務缺席 → 同事看得到客戶資料、但不能改
- 緊急狀況 → BUSINESS_OWNER 暫時改 sales_user_id 授權
- 所有變更走 audit log（誰看誰改、紀錄完整）

→ 詳細權限矩陣由 NX01-02 角色權限工作站子規格書定義。

---

## § 7. Tier 差異

### LITE

- partner 數限制：500 筆（含全 type 合計）
- 客戶等級：固定 1 級（不可開放 customer_grade）
- 業務歸屬：✅ 開放（Crown 拍 Q4：避免升級 PLUS 時要回頭一個個設定、欄位永遠存在）
  - LITE 單店時通常 sales_user_id = 老闆本人
  - 升級 PLUS 時資料無痛延續
- 海外欄位（name_en / website）：可填、但 LITE 單店通常不需

### PLUS

- partner 數限制：5000 筆
- 客戶等級：最多 10 級
- 業務歸屬：✅ 開放、最多 30 個業務
- 多幣別：開放

### PRO（Yaro 主場）

- partner 數無限
- 客戶等級無限
- 業務歸屬無限
- 多幣別無限
- 30 年資料庫遷移服務（加值）：協助匯入 30 年恆迎客戶資料

→ Tier 限制由 Plan Guard 強制（[CLAUDE.md §八](CLAUDE.md)）。

---

## § 8. 注音索引

### 8.1 是否需注音索引

✅ 需要（業務 / 採購 / 倉管會打注音碼搜 partner）

### 8.2 trigger 來源欄位

| 主檔欄位 | → 注音索引 |
|---------|-----------|
| `name`（如「光佳工業股份有限公司」）| `phonetic_code = 'ㄍㄐㄍㄧㄍㄈㄧㄒㄍㄙ'` |
| `short_name`（如「光佳」）⭐ | 獨立索引（業務最常打簡稱搜尋）|
| `name` | `phonetic_full = 'ㄍㄨㄤ ㄐㄧㄚ ㄍㄨㄥ ㄧㄝ ㄍㄨˇ ㄈㄣˋ ...'` |

⭐ Crown 拍 Q5：short_name 必做注音索引（業務 muscle memory）。

`code`（如 `CUS-VW001`）：不建注音索引（業界常見「打英文碼搜」、走一般文字搜尋即可）。

### 8.3 trigger 觸發時機

- INSERT `nx01_partner` → 自動寫 phonetic_index
- UPDATE `nx01_partner.name` 或 `short_name` → 自動更新 phonetic_index
- DELETE `nx01_partner` → 自動刪除 phonetic_index 對應紀錄

對齊 [PROJECT_CONTEXT 工程模式 #4](PROJECT_CONTEXT.md)「trigger 做 invariant」+ [nx01-overview §3.6](docs/nx01/spec/intent/nx01-overview.md)。

### 8.4 第一階段範圍

對齊 nx01-overview §3.6：第一階段注音索引支援 `nx01_part` + `nx01_partner`、其他主檔之後擴充。

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-04 | Alex | 初稿（NX01 第一份子規格書、對齊 spec-template v1.0）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（欄位）**：§3.2 / §4.1 加 3 欄位（`name_en` / `website` / `service_location`）
- **Q2 / Q3（權限）**：§6 權限矩陣重新設計、看 vs 改分離
  - 業務 / 採購：看全部、改僅自己負責
  - 對齊「資料透明 + 維護負責制」業界 muscle memory
- **Q4（Tier 差異）**：§7 LITE 也開放業務歸屬（避免升級 PLUS 一個個補設定）
- **Q5（注音索引）**：§8.2 short_name 必做獨立注音索引

---

## § 10. 待 Hank grep 確認項

⚠️ 以下欄位 Alex 業界推測、Hank push 前 grep 既有 nx01_partner schema 確認:
- `short_name` / `contact_mobile` / `fax` / `payment_terms` 既有 schema 是否已有?
- 如缺、Hank push v1.0 規格書（內容不動）+ 開新 task 補 schema migration
- 如有、確認欄位名 / 型別對齊

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。

---

*文件結束。NX01-03 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-03-partner.md。*
