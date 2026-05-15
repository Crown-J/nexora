<!-- docs/nx01/spec/intent/nx01-04-address.md -->

# NX01-04 - 客戶地址管理子模組子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-05
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-04-address.md

---

## 文件定位

NX01-04 = NX01 主檔模組的「**客戶地址管理子模組**」子規格書。

對齊 [docs/_template/spec-template.md](docs/_template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_partner_billing_address` 主檔（收帳地址、一對一）
- `nx01_partner_shipping_address` 主檔（送貨地址、一對多 + is_default）
- 不含地址型錄資料（city / district / street 歸 NX01-09 地址型錄系統）
- 不含 partner 主檔（partner 5 種 type 歸 NX01-03）

**業務情境：**
- 業務 / 採購維護 partner（type=C 客戶）後、進詳細頁點「地址」tab → 進此子模組維護地址
- 寄帳單 → 用 billing_address
- 送貨 / 物流 → 用 shipping_address（含 is_default 預設地址）
- NX02 採購 / NX04 銷貨 / NX05 財務 / NX06 物流 各自引用對應地址

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- partner 主檔：見 [docs/nx01/spec/intent/nx01-03-partner.md](docs/nx01/spec/intent/nx01-03-partner.md)
- 命名規則：見 [PROJECT_RULES.md](../../../PROJECT_RULES.md) §III.2
- 必填欄位：見 [PROJECT_RULES.md](../../../PROJECT_RULES.md) §III.2.5
- 多租戶隔離：見 [PROJECT_RULES.md](../../../PROJECT_RULES.md) §III.2.6
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_partner_billing_address` + `nx01_partner_shipping_address` = **partner 主檔的地址延伸**、處理「往哪裡寄」的精準資訊。

對齊 NX01 主檔規格書 §6.4 擴充性踩坑預期：原本 partner.address 一個字串欄位 → 拆成 3+3 結構化郵遞區號 + 多筆送貨地址。

走擴充原則 #23 類型 2「升級既有結構」3 階段演進：
- 階段 1：保留 partner.address（既有）+ 新地址表並存
- 階段 2：批次回填舊資料到結構化地址
- 階段 3：廢棄 partner.address 欄位

兩種地址業務語意差異：

| 地址類型 | 基數 | 業務用途 | 主要使用模組 |
|---------|------|---------|------------|
| billing_address 收帳地址 | 一對一（每個 partner 1 個）| 寄帳單、開發票、應收 | NX05 財務 |
| shipping_address 送貨地址 | 一對多（每個 partner N 個）| 送貨、物流、配送 | NX04 銷貨 / NX06 物流 |

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| 業務 | 維護自己客戶的地址（收帳 + 送貨）| 每月 1~3 次 / 客戶 |
| 採購 | 偶爾維護供應商地址（type=S、收貨用）| 不常 |
| 倉管 | 出貨時看送貨地址（read-only）| 每天 |
| 財務 | 寄帳單時看收帳地址（read-only）| 每月 |
| BUSINESS_OWNER | 看公司地址資料總覽 | 不常 |
| HR | 不用此子模組 | - |
| SYSADMIN | 不直接維護 | 不常 |

### 1.3 跨模組引用

地址是 NEXORA 寄送 / 物流相關業務的核心：

| 業務模組 | 引用方式 | 引用類型 |
|---------|---------|---------|
| NX02 採購 | PO 收貨地址（公司倉庫地址、不引用 partner 地址）| - |
| NX04 銷貨 | DN 送貨單引用 shipping_address | shipping |
| NX05 財務 | 應收單 / 對帳單寄送引用 billing_address | billing |
| NX06 物流 | 配送單路線優化引用 shipping_address | shipping |

→ 地址改動可能影響進行中單據（請走擴充性原則 #23）。

---

## § 2. UI 頁面

### 2.1 partner 詳細頁的「地址」tab（`/master/partner/:id` → 地址 tab）

**進入路徑：** 業務先在 NX01-03 partner 列表選定 partner、進詳細頁、點「地址」tab → 進此子模組

**顯示內容：**

收帳地址區（一對一）：
- 顯示既有收帳地址（如有）
- 動作：[新增] / [編輯]（如已有）/ [清除]

送貨地址區（一對多）：
- 表格列出所有送貨地址
- 欄位：label（如「台北倉」「高雄分店」）/ 完整地址 / 收件人 / 是否預設
- 預設地址 = 高亮 / 加 ⭐ 標示
- 動作：[新增] / [編輯] / [刪除] / [設為預設]

### 2.2 地址新增頁（`/master/partner/:id/address/new?type={billing|shipping}`）

**收帳地址表單：**
- 縣市（下拉、來自 nx01_city）
- 鄉鎮市區（下拉、依縣市過濾、來自 nx01_district）
- 路街（下拉、依鄉鎮過濾、來自 nx01_street、自帶 3+3 郵遞區號）
- 巷 / 弄 / 號 / 之 / 樓 / 之 / 室（業務人員填、對齊台灣郵政結構）
- 收件人（業務人員填）
- 收件電話（業務人員填）
- 備註（選填）

**送貨地址表單：**
- 跟收帳地址相同欄位
- 額外欄位：
  - label（業務自取名、如「台北倉」「高雄分店」）
  - is_default（單選、設為預設後其他取消）

**業務檢核：**
- 縣市 / 鄉鎮 / 路街 / 號 必填
- 收件人 / 收件電話 必填（寄帳單 / 送貨需要）
- 收帳地址：partner type=C 才允許新增（type=S/T/V/B 不需收帳）

### 2.3 地址編輯頁（`/master/partner/:id/address/:address_id/edit`）

跟新增頁類似、所有欄位可改。

⚠️ 業務檢核：地址改動如已被進行中單據引用、跳警告（避免改動影響運送中）。

### 2.4 跨頁面互動

- partner 詳細頁的「地址」tab 預設顯示
- 點「新增收帳地址」→ 跳新增頁、預填 partner_id
- 點「新增送貨地址」→ 跳新增頁、預填 partner_id
- 儲存後返 partner 詳細頁地址 tab、新地址出現

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

**`nx01_partner_billing_address`：**
- `partner_id` UNIQUE（強制一對一、每個 partner 只能 1 筆收帳地址）
- 對齊 [PROJECT_RULES.md §III.2](../../../PROJECT_RULES.md) 命名規則 + 多租戶隔離

**`nx01_partner_shipping_address`：**
- 一個 partner 多筆送貨地址、不限制總數（但 PRO tier 也不限）
- `partner_id + label` UNIQUE（同一 partner 同名 label 不可重複）
- `partner_id + is_default = true` 邏輯約束（同一 partner 只能 1 筆 is_default）
  - 走 application 層 + DB partial unique index 雙重保證

### 3.2 業務檢核

**收帳地址（billing）：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `partner_id` | ✅ | FK to nx01_partner | partner type=C 才能建立 |
| `city_id` | ✅ | FK to nx01_city | - |
| `district_id` | ✅ | FK to nx01_district | 必屬 city_id |
| `street_id` | ✅ | FK to nx01_street | 必屬 district_id、自帶 3+3 郵遞區號 |
| `address_detail` | ✅ | 字串（最長 200 字元）| 巷 / 弄 / 號 / 樓 等 |
| `recipient_name` | ✅ | 字串 | 收件人 |
| `recipient_phone` | ✅ | 電話格式 | 收件電話 |
| `note` | ❌ | 字串 | 備註 |

**送貨地址（shipping）：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `partner_id` | ✅ | FK to nx01_partner | partner type=C 才能建立（type=S/T/V/B 不需送貨） |
| `label` | ✅ | 字串（最長 50 字元）| 同 partner 不可重複 |
| `is_default` | ✅ | boolean | 同 partner 只能 1 筆 true |
| `city_id` | ✅ | FK to nx01_city | - |
| `district_id` | ✅ | FK to nx01_district | 必屬 city_id |
| `street_id` | ✅ | FK to nx01_street | 必屬 district_id |
| `address_detail` | ✅ | 字串（最長 200 字元）| - |
| `recipient_name` | ✅ | 字串 | - |
| `recipient_phone` | ✅ | 電話格式 | - |
| `note` | ❌ | 字串 | 備註 |

### 3.3 跨主檔連動

| 引用主檔 | 用途 |
|---------|------|
| `nx01_partner` | 主從關係（partner 刪除 / 停用時、地址要 cascade）|
| `nx01_city` | 縣市選擇 |
| `nx01_district` | 鄉鎮市區選擇（依 city 過濾）|
| `nx01_street` | 路街選擇（依 district 過濾、自帶 3+3 郵遞區號）|
| `nx99_tenant` | 多租戶隔離 |

→ 編輯地址時、city / district / street 走「下拉選 + 階層過濾」、不打字。

### 3.4 跨業務模組連動

哪些業務單據會引用地址（影響「真刪除」可行性）：

| 模組 | 單據 | 引用欄位 | 引用對象 |
|------|------|---------|---------|
| NX04 銷貨 | DN 送貨單 | shipping_address_id | shipping_address |
| NX05 財務 | 應收單 / 對帳單 | billing_address_id | billing_address |
| NX06 物流 | 配送單 / 路線單 | shipping_address_id | shipping_address |

→ 一旦地址被任何單據引用、不可真刪、只能停用 / 改成新地址（對齊 nx01-overview §3.2）。

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview §3.2](docs/nx01/spec/intent/nx01-overview.md)：

**收帳地址（billing）：**
- 未被引用：可真刪
- 被引用：只能改既有（不刪、原地修改）
  - 但要考慮「歷史單據引用的舊地址」是否還能查到
  - 解法：DN / 應收單建立時 snapshot 地址資訊（不只 FK）
  - 改地址後、既有單據顯示 snapshot 舊地址、新單據用新地址

**送貨地址（shipping）：**
- 未被引用：可真刪
- 被引用：只能停用（`isActive = false`）
  - 既有 DN 仍顯示此地址（snapshot）
  - 新增 DN 不可選此地址（下拉不出現）

⭐ 地址 snapshot 機制納入本 v1.0 範圍（Crown 拍 Q3 = A）：
  - DN / 應收單 / 對帳單建立時 snapshot 完整地址資訊到單據表
  - 既有單據引用「snapshot 舊地址」、新單據引用「最新地址」
  - 詳見 §5.7 snapshot 機制設計

---

## § 4. 欄位列表

### 4.1 nx01_partner_billing_address 業務欄位

⚠️ 以下欄位待 Hank grep 既有 schema 確認、可能需校正。

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `partner_id` | 客戶 ID（FK to nx01_partner、UNIQUE）| ✅ | 無 | 系統帶 |
| `city_id` | 縣市（FK to nx01_city）| ✅ | 無 | 業務下拉選 |
| `district_id` | 鄉鎮市區（FK to nx01_district）| ✅ | 無 | 業務下拉選 |
| `street_id` | 路街（FK to nx01_street）| ✅ | 無 | 業務下拉選、自帶 3+3 郵遞區號 |
| `address_detail` | 地址細節（巷 / 弄 / 號 / 樓 / 室）| ✅ | 無 | 業務人員填 |
| `recipient_name` | 收件人 | ✅ | partner 主聯絡人 | 業務人員可改 |
| `recipient_phone` | 收件電話 | ✅ | partner 主電話 | 業務人員可改 |
| `note` | 備註 | ❌ | null | 業務人員填 |

### 4.2 nx01_partner_shipping_address 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `partner_id` | 客戶 ID（FK to nx01_partner）| ✅ | 無 | 系統帶 |
| `label` | 地址標籤（如「台北倉」）| ✅ | 無 | 業務人員填 |
| `is_default` | 是否預設送貨地址 | ✅ | 第一筆建的自動 true | 業務人員可改 |
| `city_id` | 縣市 | ✅ | 無 | 業務下拉選 |
| `district_id` | 鄉鎮市區 | ✅ | 無 | 業務下拉選 |
| `street_id` | 路街（自帶 3+3 郵遞區號）| ✅ | 無 | 業務下拉選 |
| `address_detail` | 地址細節 | ✅ | 無 | 業務人員填 |
| `recipient_name` | 收件人 | ✅ | partner 主聯絡人 | 業務人員可改 |
| `recipient_phone` | 收件電話 | ✅ | partner 主電話 | 業務人員可改 |
| `isActive` | 是否啟用 | ✅ | true | 業務人員可停用 |
| `note` | 備註 | ❌ | null | 業務人員填 |

### 4.3 系統自動欄位（不可改）

對齊 [PROJECT_RULES.md §III.2.5](../../../PROJECT_RULES.md)：

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID（UUID）|
| `tenantId` | 多租戶隔離（自動帶當前租戶）|
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（從登入 user 帶）|

### 4.4 注音索引

地址不建注音索引、業務人員打中文 / 路名搜尋即可。

對齊「注音索引」設計原則：給「業務人員常打簡稱搜」的主檔（如 partner / part）、不是地址。

---

## § 5. 工作流程

### 5.1 業務新建客戶後填地址（標準流程）

```
1. 業務先在 NX01-03 建立客戶 partner
2. 跳到 partner 詳細頁、點「地址」tab
3. 收帳地址區點 [新增]
4. 階層下拉選縣市 → 鄉鎮 → 路街（自帶郵遞區號）
5. 填巷/弄/號/樓
6. 填收件人 + 收件電話（預填 partner 主聯絡人、可改）
7. [儲存]
8. 返 partner 詳細頁地址 tab
9. 送貨地址區點 [新增]
10. 同樣流程
11. 第 1 筆送貨地址自動 is_default = true
12. 之後新增第 2 筆、預設不勾、業務可改
```

### 5.2 業務換預設送貨地址

```
1. 業務在地址 tab 看到送貨地址列表
2. 點某筆送貨地址的 [設為預設]
3. 系統自動:
   - 該筆 is_default = true
   - 其他送貨地址 is_default = false
4. 列表 ⭐ 標示移到新預設地址
```

### 5.3 異常：客戶搬家、改地址

業務人員試圖改既有收帳地址（例如客戶搬家）：

- 系統檢查：是否有進行中單據引用此地址？
- 如有：跳警告「此地址有 3 筆進行中應收單引用、改地址後既有單據會 snapshot 舊地址、新單據用新地址、確認改嗎?」
- 業務確認 → 改地址
- 既有應收單顯示舊地址（snapshot）
- 新建應收單用新地址

### 5.4 異常：刪除送貨地址但已被引用

業務試圖真刪「台北倉」送貨地址、但有 5 筆 DN 引用：

- 系統跳警告「此地址被 5 筆送貨單引用、不可真刪、改成停用?」
- 業務確認 → `isActive = false`
- 既有 DN 仍顯示「台北倉」（snapshot）
- 新建 DN 下拉選不出現此地址

### 5.5 partner 停用 / 真刪時的地址 cascade

partner 主檔停用 / 真刪時：

| partner 動作 | billing_address | shipping_address |
|------------|----------------|-----------------|
| 停用（isActive=false）| 保留、可查、不可改 | 保留、全部停用 |
| 真刪（如未被引用）| ON DELETE CASCADE 刪除 | ON DELETE CASCADE 刪除 |

→ partner 真刪 = 對應地址也真刪（FK CASCADE）

⭐ Q4 拍板（B 單一檢查）：partner 未被引用即可真刪、地址 CASCADE 一併刪
  - 不必雙重檢查「地址也未被引用」
  - 既然 partner 都未被引用、地址必定也未被引用（地址只被 DN/應收引用、必透過 partner）
  - 邏輯上 partner 未被引用 = 全鏈未被引用、單一檢查即可

### 5.6 業務轉手時地址處理（Crown 拍 Q5 = A）

業務 A → 業務 B 轉手客戶時、地址自動跟 partner 一起轉手：

```
1. BUSINESS_OWNER（或業務 A）在 NX01-03 改 partner.sales_user_id
2. 系統自動:
   - 該 partner 的所有 billing_address / shipping_address 維護權跟著轉
   - 業務 B 取得「改」權限
   - 業務 A 失去「改」權限、保留「看」權限
3. 業務 B 之後可自行確認 / 調整地址資訊
```

優點：無痛接管、業務 B 不需從零建地址資料
業務 B 操作：接管後可主動確認地址是否需更新（業務判斷、非系統強制）

對齊 NX01-03 §5.5 業務轉手流程精神。

### 5.7 地址 snapshot 機制（Crown 拍 Q3 = A、本 v1.0 範圍）

**業務情境：** 客戶搬家、業務改 billing_address 後、既有應收單顯示舊地址 / 新單顯示新地址。

**snapshot 機制設計：**

```
1. 既有單據建立時（NX04 DN / NX05 應收單）:
   - 不只存 FK billing_address_id / shipping_address_id
   - 同時 snapshot 完整地址資訊到單據表的對應欄位:
     - city_name / district_name / street_name / zipcode / address_detail
     - recipient_name / recipient_phone
   - snapshot 是「建單當下的地址狀態」、不會跟著 nx01_partner_*_address 改動而變

2. 業務改地址後:
   - nx01_partner_billing_address 紀錄改變
   - 既有單據 snapshot 不變（顯示「建單當下地址」）
   - 新建單據:從最新 nx01_partner_billing_address 抓 + snapshot

3. 單據顯示邏輯:
   - 列表 / 詳細頁:顯示 snapshot 地址資訊（歷史一致）
   - 編輯模式:可選擇「重新從 nx01_partner_*_address 抓最新」
```

**為什麼 snapshot 在地址子規格書定義：**

- 地址 vs 單據是「主從關係」、地址是源頭
- snapshot 機制是「地址設計核心」、不是 NX04 / NX05 各自的事
- 統一在 NX01-04 定義、NX04 / NX05 規格書引用即可

**對應業務模組責任：**

- NX01-04（本子規格書）：定義 snapshot 機制 + 標明哪些欄位需 snapshot
- NX04 銷貨：DN 表 schema 加 snapshot 欄位、建單時觸發 snapshot
- NX05 財務：應收單 / 對帳單表 schema 加 snapshot 欄位
- NX06 物流：配送單表 schema 加 snapshot 欄位

→ 詳細 snapshot 觸發邏輯由 NX04 / NX05 / NX06 各自規格書展開、本子規格書定義「機制與欄位範圍」。

---

## § 6. 角色權限

對齊 NX01-03 §6 權限模型「看 vs 改分離」：

| 角色 | 看 | 改 | 新增 | 停用 | 真刪 |
|------|---|---|------|------|------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ✅ |
| BUSINESS_OWNER | ✅（自己租戶全部）| ✅ | ✅ | ✅ | ❌ |
| 業務 | ✅（**全部地址**）| ✅（**僅自己 sales_user_id 的 partner**）| ✅（自己客戶）| ✅（自己客戶）| ❌ |
| 採購 | ✅（**全部地址、read-only**）| ❌ | ❌ | ❌ | ❌ |
| 倉管 | ✅（read-only、出貨用）| ❌ | ❌ | ❌ | ❌ |
| 財務 | ✅（read-only、寄帳單用）| ❌ | ❌ | ❌ | ❌ |
| HR | ❌ | ❌ | ❌ | ❌ | ❌ |

**關鍵權限規則：**

⭐ **看 vs 改分離（對齊 NX01-03 §6）：**
- 看（read）：全業務 / 採購 / 倉管 / 財務都看得到所有地址
- 改（write）：僅 partner 的負責業務（sales_user_id = 當前 user）可改

⭐ **業務轉手後：**
- 業務 A 失去「改」權、保留「看」權
- 業務 B 取得「改」權

⭐ **地址 vs partner 權限同步：**
- 業務無權改 partner 主檔 → 也無權改該 partner 的地址
- partner 維護負責人 = 地址維護負責人

---

## § 7. Tier 差異（Crown 拍 Q2 = 全 tier 開放 5 個地址）

⭐ Crown 拍板：地址數量不分 tier、全 LITE/PLUS/PRO 都開放 5 個 shipping_address。

業界真相揭露：
- 一個客戶常用的送貨地址 5 個就很多（如總公司 + 北中南分店）
- 超過 5 個通常是「臨時客戶要求」、業務直接手動改、不入主檔
- 5 個是「業務天花板」、不是「Tier 規模差異」
- 對齊 Alex 失誤紀錄候選 #31「Tier 差異設計時、不該把業務固定上限當 Tier 限制」

### 全 Tier 共通

- billing_address：開放（一對一、type=C 才有）
- shipping_address：**5 個 / partner**（業務常用上限、超過走「臨時改」不入主檔）
- 業務歸屬：✅ 開放（對齊 NX01-03 §7）

### Tier 真實差異（非地址數量）

| Tier | 跟地址相關的 tier 差異 |
|------|---------------------|
| LITE | 沒有路線優化（軌 2 進階功能）|
| PLUS | 沒有路線優化 |
| PRO | ✅ 路線優化系統（軌 2 進階功能 roadmap、用 shipping_address 地理座標）|

→ Tier 限制由 Plan Guard 強制（[PROJECT_RULES.md §III.2.7](../../../PROJECT_RULES.md)）。

---

## § 8. 注音索引

地址不建注音索引（§4.4 已說明）。

理由：
- 地址用文字 / 路名搜尋更直覺
- 業務人員不會打地址注音碼搜
- phonetic_index 只給 partner / part 等「業務常打簡稱搜」的主檔

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-05 | Alex | 初稿（NX01 第二份子規格書、對齊 spec-template + NX01-03）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（收件人欄位）**：A 預填 + 可改（既有設計、無需改動）
- **Q2（地址數量 Tier 差異）**：⭐ 全 tier 開放 5 個 shipping_address、Tier 不區隔地址數量（業界真相揭露）
- **Q3（snapshot 機制）**：A 納入本 v1.0 範圍、新增 §5.7 詳細定義
- **Q4（partner 真刪驗證）**：B 單一檢查（partner 未被引用 = 全鏈未被引用）
- **Q5（業務轉手地址）**：A 自動跟 partner 一起轉手

---

## § 10. 待 Hank grep 確認項

⚠️ 以下欄位 Alex 業界推測、Hank push 前 grep 既有 schema 確認:

A. 既有預期欄位（v7_baseline 應已有 partner_*_address 表）:
   - 確認 nx01_partner_billing_address / nx01_partner_shipping_address 兩表是否已存在
   - 如沒有 → 跟 NX01-03 schema task 同模式、開新 task 補 schema migration
   - 如有 → 確認欄位名 / 型別對齊

B. 待確認欄位（Alex 業界推測、不確定既有有沒有）:
   - label（送貨地址自取名）
   - is_default（送貨地址預設標記）
   - recipient_name / recipient_phone（收件人 / 電話）
   - address_detail（巷/弄/號/樓 細節）

C. 引用主檔欄位:
   - city_id / district_id / street_id（FK to nx01_city / district / street）
   - 確認既有地址型錄主檔（NX01-09）是否已建

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。
→ 若需補 schema migration、開新 task TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01。

---

*文件結束。NX01-04 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-04-address.md。*
