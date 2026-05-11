<!-- docs/nx01/spec/intent/nx01-09-address-catalog.md -->

# NX01-09 - 地址型錄系統子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-05
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-09-address-catalog.md

---

## 文件定位

NX01-09 = NX01 主檔模組的「**地址型錄系統**」子規格書。

對齊 [docs/_shared/template/spec-template.md](docs/_shared/template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_city`（縣市型錄、約 22 筆）
- `nx01_district`（鄉鎮市區型錄、約 368 筆）
- `nx01_street`（路街型錄、含 3+3 郵遞區號、數萬筆）⭐
- 全 NEXORA 地址相關業務都引用此型錄系統

**戰略意義：**

對齊 [nx01-overview.md §6.4](docs/nx01/spec/intent/nx01-overview.md) 擴充性踩坑預期 + Crown 揭露的業務真相：
- 寄帳單 → 必須 3+3 結構化郵遞區號（避免人工填錯）
- 業務人員 UI → 階層下拉選（縣市 → 鄉鎮 → 路街）、選完自動帶郵遞區號
- 對應台灣郵政查詢系統 UX

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_city / nx01_district / nx01_street` = **NEXORA 全域共用的台灣地址型錄**、所有「跟地址有關的業務」都引用此型錄。

3 張表組成階層型錄：

```
nx01_city（縣市、22 筆）
  └── nx01_district（鄉鎮市區、368 筆、屬 city）
       └── nx01_street（路街、數萬筆、屬 district、含 3+3 郵遞區號）⭐
```

業務人員 UI 選擇地址時走階層下拉：
- 第 1 層：選縣市（如「臺北市」）
- 第 2 層：依 city 過濾鄉鎮（如「文山區」）
- 第 3 層：依 district 過濾路街（如「羅斯福路六段」）→ 自動帶 3+3 郵遞區號（如「116-051」）

→ 對應台灣郵政查詢系統 UX、業界 muscle memory。

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 一次匯入完整台灣行政區資料、後續中華郵政更新時批次同步 | 半年 1 次 |
| 業務 / 採購 | 編輯 partner / address 時下拉選（read-only）| 每天 |
| 倉管 / 物流 | 出貨時 read-only 看地址 | 每天 |
| 全角色 | 不直接維護此型錄、只下拉選用 | - |

→ 此子模組屬「**B 型錄型 + 全域共用**」、業務人員不直接維護、只 read。

### 1.3 跨模組引用

地址型錄是 NEXORA 引用最廣的型錄系統之一：

| 業務模組 | 引用方式 |
|---------|---------|
| NX01-04 客戶地址管理 | partner_billing_address / partner_shipping_address 引用 city / district / street |
| NX01 倉庫主檔 | warehouse 加結構化地址欄位（之後擴充）|
| NX02 採購 | PO 收貨地址（如有）|
| NX04 銷貨 | DN 送貨地址 snapshot（透過 NX01-04）|
| NX05 財務 | 應收 / 對帳單寄送地址 snapshot（透過 NX01-04）|
| NX06 物流 | 配送單地址 + 路線優化（PRO tier）|

→ 地址型錄改動可能影響全 NEXORA、走擴充原則 #23。

### 1.4 全域共用設計

對齊 [nx01-overview.md §3.1](docs/nx01/spec/intent/nx01-overview.md) 多租戶隔離例外：

```
nx01_city / nx01_district / nx01_street:
  ✅ 全域型錄、不帶 tenantId
  ✅ 所有租戶共用
  ✅ SYSADMIN 統一維護、業務人員 read-only

理由:
  - 台灣行政區資料是公開的（中華郵政發布）
  - 每租戶複製一份是冗餘
  - 跨租戶共用 = 統一資料來源、減少 drift
  - 對齊 nx01_currency（國際幣別 ISO 標準）的全域型錄精神
```

---

## § 2. UI 頁面

### 2.1 SYSADMIN 維護頁（`/admin/address-catalog`）

⚠️ 此頁僅 SYSADMIN 可進、不對一般業務人員開放。

**列表頁：**
- Tab 切：[縣市] [鄉鎮市區] [路街]
- 表格欄位：code / name / 階層歸屬 / 紀錄數 / 最後更新
- 動作：[一次性初始化匯入] / [增量更新匯入] / [手動編輯]（罕用）

**初始化匯入頁（`/admin/address-catalog/import-init`）：**
- 上傳中華郵政 OpenData CSV
- 預覽 3 階層數量（如「22 縣市 / 368 鄉鎮 / 25,000 路街」）
- 確認後一次匯入（不允許部分匯入、避免 FK 階層斷掉）

**增量更新頁（`/admin/address-catalog/import-update`）：**
- 上傳新版 CSV（中華郵政更新時用）
- 系統 diff:[新增] [修改] [刪除（停用）]
- 確認後增量更新
- 業務人員看到的下拉選項自動更新

### 2.2 業務人員地址下拉互動（嵌入 NX01-04 編輯頁）

⚠️ 此互動不是獨立頁面、是 NX01-04 客戶地址編輯頁的一部分。

```
1. 業務在 NX01-04 編輯地址、點「縣市」下拉
2. 系統 query nx01_city（22 筆）顯示
3. 業務選「臺北市」
4. 系統 query nx01_district WHERE city_id = '...' 顯示（如 12 個區）
5. 業務選「文山區」
6. 系統 query nx01_street WHERE district_id = '...' 顯示（如 200+ 路街）
7. 業務選「羅斯福路六段」
8. 系統自動帶 zipcode_full = '116-051'（從 nx01_street 抓）
9. 業務填巷 / 弄 / 號 / 樓（純文字 address_detail、不在型錄內）
```

→ 對齊台灣郵政查詢系統 UX、業務 muscle memory。

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

**`nx01_city`：**
- `code` UNIQUE（如 `TPE` / `NWT` / `KAO`、ISO 3166-2:TW 對應碼）
- 全域 unique（不帶 tenantId）
- ⭐ Q4 擴展性預留：nx01_city 加 `country_id` 欄位（FK to nx01_country、預設 'TW'）
  - 預設值 'TW'：台灣
  - 海外擴展時設定其他國家 ID（如 'JP' 日本 / 'US' 美國）
  - PK 升級為 `(country_id, code)` UNIQUE（避免不同國家撞 code）
  - 對齊擴充原則 #23 類型 2「升級既有結構」3 階段演進

**`nx01_district`：**
- `(city_id, code)` UNIQUE（如「臺北市信義區」+「臺北市文山區」code 不重複）
- `(city_id, name)` UNIQUE（同縣市內鄉鎮名稱不重複）

**`nx01_street`：**
- `(district_id, name)` UNIQUE（同鄉鎮內路街名稱不重複、但跨鄉鎮可同名）
- `zipcode_full` 不 unique（一條路街跨多個 3+3 段）

### 3.2 業務檢核

**`nx01_city`：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `code` | ✅ | 大寫英文 3 字（ISO 3166-2:TW） | unique |
| `name` | ✅ | 中文（最長 20 字元） | 如「臺北市」 |
| `name_en` | ❌ | 英文（最長 50 字元） | 如「Taipei City」 |
| `sort_order` | ✅ | 整數 | 業界排序順位 |

**`nx01_district`：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `city_id` | ✅ | FK to nx01_city | - |
| `code` | ✅ | 大寫英文 3~5 字 | (city_id, code) unique |
| `name` | ✅ | 中文（最長 20 字元）| 如「文山區」 |
| `name_en` | ❌ | 英文 | 如「Wenshan District」|
| `sort_order` | ✅ | 整數 | 區內排序 |

**`nx01_street`：**

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `district_id` | ✅ | FK to nx01_district | - |
| `name` | ✅ | 中文（最長 100 字元）| 如「羅斯福路六段」|
| `zipcode_3` | ✅ | 數字 3 位 | 如「116」|
| `zipcode_full` | ✅ | 格式 `NNN-NNN` | 如「116-051」⭐ |
| `name_en` | ❌ | 英文 | 如「Sec. 6, Roosevelt Rd.」|

### 3.3 跨主檔連動

階層 FK 關係嚴格遵守：

```
nx01_city（無 FK、頂層）
  ↓ city_id
nx01_district
  ↓ district_id
nx01_street
```

→ 不允許跳級引用（如 partner_billing_address 不能直接引用 city、必須走 city → district → street）。

### 3.4 跨業務模組連動

哪些業務單據 / 主檔會引用此型錄系統：

| 模組 | 引用對象 | 引用欄位 |
|------|---------|---------|
| NX01-04 客戶地址 | billing_address / shipping_address | city_id / district_id / street_id |
| NX01 倉庫主檔（之後擴充）| warehouse 結構化地址 | city_id / district_id / street_id |
| NX04 銷貨（透過 snapshot）| DN 顯示城市 / 區域 / 路街名 | snapshot 字串、不直接 FK |
| NX05 財務（透過 snapshot）| 應收單顯示寄送城市 | snapshot 字串、不直接 FK |

→ 直接 FK 只有 NX01-04 / 倉庫主檔等「主檔層」、單據層走 snapshot（對齊 NX01-04 §5.7）。

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview §3.2](docs/nx01/spec/intent/nx01-overview.md)：

**全域型錄特殊處理：**
- 一旦匯入、不可真刪（避免破壞既有引用）
- 中華郵政停用某行政區（如鄉鎮合併）→ 該紀錄 `isActive = false`
- 既有 partner_billing_address 仍引用「停用的 district」、歷史資料保留
- 新增 partner_billing_address 不出現在下拉選

**地址資料合併處理：**
- 中華郵政合併行政區（如 2014 年桃園縣升直轄市）
- migration script 處理:
  - 舊縣市標停用
  - 新縣市加入
  - 既有引用走 snapshot 不變動（既有單據顯示舊縣市名）
  - 新引用走新縣市

---

## § 4. 欄位列表

### 4.1 nx01_city 欄位

⚠️ 以下欄位待 Hank grep 既有 schema 確認、可能需校正。

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `id` | 系統 ID | ✅（系統）| UUID | 系統自動 |
| `code` | 縣市代碼（如 TPE）| ✅ | 無 | 中華郵政 + ISO 3166-2 |
| `name` | 中文名（如 臺北市）| ✅ | 無 | 中華郵政 |
| `name_en` | 英文名 | ❌ | null | 中華郵政 / 外交部 |
| `sort_order` | 排序順位（業界慣例如六都優先）| ✅ | 0 | SYSADMIN 設 |
| `isActive` | 是否啟用 | ✅ | true | SYSADMIN 可停用 |

### 4.2 nx01_district 欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `id` | 系統 ID | ✅ | UUID | 系統自動 |
| `city_id` | 所屬縣市（FK to nx01_city）| ✅ | 無 | 中華郵政 |
| `code` | 鄉鎮代碼（如 WSN）| ✅ | 無 | 中華郵政 |
| `name` | 中文名（如 文山區）| ✅ | 無 | 中華郵政 |
| `name_en` | 英文名 | ❌ | null | 中華郵政 / 外交部 |
| `sort_order` | 區內排序 | ✅ | 0 | SYSADMIN 設 |
| `isActive` | 是否啟用 | ✅ | true | SYSADMIN 可停用 |

### 4.3 nx01_street 欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `id` | 系統 ID | ✅ | UUID | 系統自動 |
| `district_id` | 所屬鄉鎮（FK to nx01_district）| ✅ | 無 | 中華郵政 |
| `name` | 路街名（如 羅斯福路六段）| ✅ | 無 | 中華郵政 |
| `name_en` | 英文名 | ❌ | null | 中華郵政 / 外交部 |
| `zipcode_3` | 3 碼郵遞區號 | ✅ | 無 | 中華郵政 |
| `zipcode_full` | 3+3 完整郵遞區號 ⭐ | ✅ | 無 | 中華郵政 |
| `isActive` | 是否啟用 | ✅ | true | SYSADMIN 可停用 |

### 4.4 系統自動欄位

對齊 [CLAUDE.md §六](CLAUDE.md)：

| 欄位 | 業務語意 |
|------|---------|
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（SYSADMIN）|

⚠️ 全域型錄不帶 `tenantId`（對齊 §1.4 全域共用設計）。

### 4.5 注音索引

地址型錄不建注音索引（對齊 NX01-04 §4.4）：
- 業務人員不打地址注音搜尋
- 階層下拉選用 + 文字搜尋已夠用

### 4.6 巷弄門牌結構化設計（Crown 拍 Q5、徹底防呆）⭐

**Crown 揭露的設計理念：**

> 「希望我的系統能把防呆做得徹底一點、最好巷弄門號樓層都能分開輸入、避免員工誤 Key」

對齊 NEXORA 設計哲學「強制資料溯源 + 比業界更好」、結構化欄位獨立檢核、減少業務輸入錯誤。

**參考來源：** 台灣郵政地址查詢系統（圖一）+ Crown 簡化排版設計。

**業務輸入 UI 結構（7 段）：**

```
1. [城市下拉]
2. [鄉鎮區下拉]
3. [路名下拉]   ← 自帶 3+3 郵遞區號
4. [ ]巷
5. [ ]弄
6. [ ]號 - [ ]號  ← 號 + 號的子號（如「5-1 號」= 5 號之 1）
7. [ ]樓 - [ ]室  ← 樓層 + 室號（如「3-12」= 3 樓 12 室）
```

⚠️ 此 6 個欄位 **不在 nx01_street 主檔內**、屬 NX01-04 partner_billing_address / partner_shipping_address 的業務欄位（NX01-04 v1.0 §4.1 / §4.2 提到的 `address_detail` 將拆成這些欄位）。

**業務輸入欄位列表：**

| 欄位 | 業務語意 | 必填 | 格式 | 範例 |
|------|---------|-----|------|------|
| `lane` | 巷 | ❌ | 純數字 | `7`（表示 7 巷） |
| `alley` | 弄 | ❌ | 純數字 | `1`（表示 1 弄） |
| `building_no` | 號 | ✅ | 純數字 | `5`（表示 5 號） |
| `building_sub_no` | 號的子號（之 N） | ❌ | 純數字 | `1`（表示「5-1 號」= 5 號之 1） |
| `floor` | 樓層 | ❌ | 文字（容納地下 / 商辦） | `3` / `B1` / `3F` |
| `room_no` | 室號 | ❌ | 文字（容納變體） | `12` / `A` |

**業務檢核規則：**

- `building_no` 必填（地址至少要有號）
- `lane` / `alley` / `building_sub_no` 純數字（防呆，避免業務 Key 錯）
- `floor` 容納地下 / 商辦變體（如「B1」「3F」）
- `room_no` 容納數字 + 字母（如「12」「A 室」）
- 全填完整地址 = `${street.name} ${lane}巷 ${alley}弄 ${building_no}-${building_sub_no}號 ${floor}-${room_no}`

**業務組合範例：**

| 地址類型 | 範例 | 對應欄位 |
|---------|------|---------|
| 一般住宅 | 羅斯福路六段 5 號 3 樓 | building_no=5、floor=3 |
| 巷內住宅 | 羅斯福路六段 7 巷 1 弄 5 號 | lane=7、alley=1、building_no=5 |
| 子號住宅 | 羅斯福路六段 5-1 號 | building_no=5、building_sub_no=1 |
| 商辦 | 信義路五段 7 號 13 樓 | building_no=7、floor=13 |
| 公寓 | 忠孝東路四段 100 號 5 樓 12 室 | building_no=100、floor=5、room_no=12 |
| 地下室商辦 | 市政北一路 12 號 B1 | building_no=12、floor=B1 |

**對齊既有設計範式：**

- 對齊 NX01-04 §3.5 軟刪除規則（地址改動走 snapshot 機制）
- 對齊 nx01-overview §6.4 擴充性踩坑預期
- 對齊擴充原則 #23 類型 2「升級既有結構」3 階段演進（partner.address 單欄 → 結構化欄位）

---

---

## § 5. 工作流程

### 5.1 SYSADMIN 一次性初始化匯入

```
1. SYSADMIN 進 /admin/address-catalog
2. 點 [一次性初始化匯入]
3. 上傳中華郵政 OpenData CSV（3+3 郵遞區號完整版）
4. 系統解析、預覽:
   - 22 縣市
   - 368 鄉鎮市區
   - ~25,000 路街
5. 系統檢查:
   - 既有資料如有 → 警告「已初始化過、要走增量更新而非初始化」
   - 既有資料如無 → 進入確認頁
6. SYSADMIN 確認 → 一次匯入（一個 transaction、保證 FK 階層完整）
7. 匯入完成、業務人員下拉選可用
```

### 5.2 中華郵政發布更新時的增量同步

```
1. SYSADMIN 收到中華郵政更新通知（如 2026-Q3 新增 50 條路街）
2. 進 /admin/address-catalog/import-update
3. 上傳新版 CSV
4. 系統 diff 既有資料:
   - 新增:50 條路街（新建社區 / 重劃區）
   - 修改:10 條路街（路名變更、郵遞區號調整）
   - 停用:5 條路街（廢除路街、僅保留歷史紀錄）
5. SYSADMIN 確認 diff → 增量更新
6. 既有業務資料引用「停用的路街」→ 仍可查、歷史保留
7. 新地址下拉選自動帶最新資料
```

### 5.3 業務地址選擇（嵌入 NX01-04）

對應 §2.2 業務人員地址下拉互動。

### 5.4 異常：行政區合併（如桃園縣升直轄市）

```
情境:中華郵政發布桃園縣升格為桃園市

migration 處理:
1. 新增 nx01_city「桃園市」(code TYC、isActive=true)
2. 既有 nx01_city「桃園縣」標 isActive=false（保留歷史）
3. 既有 nx01_district 中所屬桃園縣的鄉鎮 → 改 city_id 指向新桃園市
4. 既有 partner_billing_address 引用「桃園縣 / 中壢市」（snapshot 在 NX04/05 單據內已是字串）→ 不變
5. 新建 partner_billing_address 走「桃園市 / 中壢區」

→ 對齊 §3.5 軟刪除規則 + NX01-04 §5.7 snapshot 機制
```

### 5.5 異常：業務試圖手動編輯型錄資料

```
業務 / 採購誤進 /admin/address-catalog 試圖編輯:
1. 系統 401 拒絕（非 SYSADMIN）
2. 跳訊息「地址型錄需 SYSADMIN 權限維護、請聯繫系統管理員」

→ 對齊 §1.4 全域共用 + §6 角色權限
```

---

## § 6. 角色權限

| 角色 | 看 | 改 | 新增 | 停用 | 真刪 |
|------|---|---|------|------|------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ❌（保護歷史引用）|
| BUSINESS_OWNER | ✅（read-only、下拉選用）| ❌ | ❌ | ❌ | ❌ |
| 業務 / 採購 / 倉管 | ✅（read-only、下拉選用）| ❌ | ❌ | ❌ | ❌ |
| HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |

**關鍵權限規則：**

⭐ **全域型錄、純 SYSADMIN 維護：**
- 業務人員只 read、不直接維護
- SYSADMIN 透過初始化 / 增量匯入維護
- 不開放手動編輯（避免人為誤改）

⭐ **不允許真刪（保護歷史引用）：**
- 一旦匯入、即使中華郵政廢除某行政區、只能 isActive = false
- 既有 partner_billing_address 引用「停用的 district」仍可查
- 對齊 §3.5 軟刪除規則

---

## § 7. Tier 差異

無差異、全 LITE / PLUS / PRO 共用同一份地址型錄資料。

理由：
- 全域型錄（對齊 §1.4）、所有租戶共用
- 地址資料是 NEXORA 基礎建設、不是 tier 加值功能
- 對齊 nx01_currency（幣別）的全 tier 共用精神

---

## § 8. 注音索引

地址型錄不建注音索引（§4.5 已說明）。

理由：
- 業務人員透過階層下拉選 + 文字搜尋已夠用
- 業務不會打地址注音碼搜
- phonetic_index 只給 partner / part 等「業務常打簡稱搜」的主檔

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-05 | Alex | 初稿（NX01 第三份子規格書、對齊 spec-template + NX01-04 依賴）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（資料初始化）**：A 一次匯入完整資料（Alex 推薦、無需改動）
- **Q2（多語言支援）**：A 加 name_en 欄位（既有設計、無需改動）
- **Q3（中華郵政更新追蹤）**：A 手動追蹤（既有設計、無需改動）
- **Q4（國外 zipcode 擴展）**：C 暫不規劃 + ⭐ **保留擴展性**（schema 設計時預留 country_id 欄位、預設 'TW'、未來可擴展）
- **Q5（巷弄門牌設計）**：⭐ B+ 結構化欄位徹底防呆（新增 §4.6、6 欄位獨立檢核、對齊台灣郵政結構 + Crown 簡化排版）

---

## § 10. 待 Hank grep 確認項

⚠️ 以下事項 Hank push 前主動確認:

A. 既有 schema 確認:
   - nx01_city / nx01_district / nx01_street 既有 schema 是否已建?
     - 如沒有 → 屬 schema 補建範圍（軌 D、TASK-PHASE2-NX01-ADDRESS-SCHEMA-EXTEND-01）
     - 如有 → 確認欄位對齊 §4 欄位列表

B. NX01-04 巷弄門牌欄位 schema 確認:
   - nx01_partner_billing_address / nx01_partner_shipping_address 既有 schema 是否有以下 6 欄?
     - lane / alley / building_no / building_sub_no / floor / room_no
   - 如沒有 → 併入 schema 補建範圍（軌 D）

C. Q4 國外擴展性預留:
   - schema 補建時、nx01_city 加 `country_id` 欄位（FK to nx01_country、預設 'TW'）
   - nx01_country 表已在 NX01 主檔規格書 §2.2 列入（11 個 schema 已建未實作之一）
   - 啟用 nx01_country 的時機:海外擴展時（暫不必啟用）

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。
→ 若需補 schema migration、合併進軌 D 一併處理。

---

*文件結束。NX01-09 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-09-address-catalog.md。*
