<!-- docs/nx01/spec/intent/nx01-05-part.md -->

# NEXORA NX01-05 料號主檔（nx01_part）子規格書

> 文件版本：v1.1
> 最後更新:2026-05-27
> 狀態：拍板版（v1.1 下半場重做、Crown 拍板）
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-05-PART-SPEC-V1-01
> 性質：A 主檔（NEXORA 業務心臟、5 業務模組 25 條 reverse 引用、最後整合節點）
> 拓樸位置：拓樸排序第 6 份（12 → 15 → 14 → 13 → 07 → **05** → 17 → 16）

---

## 下半場 v1.1 變更（2026-05-27、Crown 拍板）

- **完整料號顯示格式**（業界 muscle memory）：`{零件品牌代碼} - {SEG1 SEG2 …單空格} #{產地代碼}`
  例：`VAG - 03H 115 562 H #DEU`、`BOS - 3397 118 979 #DEU`（SEG4/5 用不到自動隱藏）。
  - 即時組合 displayCode、不存 DB；品牌「空格-空格」、產地「空格#」。
  - 未選編碼規則（手動料號）：原樣顯示、不加前後綴。
  - 適用車型交給 nx01_part_model、part 不加 carBrandId。
- **codeRuleId 改選填**（未選＝手動輸入完整料號字串）。
- 新增 **oldCode**（舊料號、轉系統客戶用）、**cost**（成本、價格重算基準）。
- 新增 **正廠對應料號子表** `nx01_part_oem_code`（一料多正廠號：對應廠牌 + 正廠料號 + 備註）。
- 價格：依成本 + 客戶分級毛利率重算 A/B/C/D（A×1.12 / B×1.15 / C×1.18 / D×1.22、可手動微調）。
- 搜尋正規化（去空格/-/#）：主料號 / 舊料號 / 副廠 / 正廠對應料號皆命中、標示主料號 / 替代品。

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_part` = NEXORA **料號主檔**、汽車零件業務的核心識別單位。所有業務流程（採購 / 庫存 / 銷售 / 物流 / 報表）的最小資料原子。

業務情境：建一筆 `VAG-1K0·129·620·A #VALDEU 空氣濾芯` 料號後、即可：

- 採購（NX02）：開 PO / RFQ / 進貨單引用此料
- 庫存（NX03）：建初始庫存 / 即時查詢 / 調撥 / 盤點
- 銷售（NX04）：建報價 / 銷貨單 / 退回單
- 物流(NX06)：建出貨單
- 報表（NX08）：庫存月報 / 銷售分析

⭐ **戰略地位（Hank 諮詢 §3 真相）**：

- 25 條 reverse @relation、5 業務模組依賴
- ON DELETE RESTRICT、不可刪、僅軟刪除
- 規格寫錯影響全 NEXORA 業務模組

### ⭐ Crown 業界 muscle memory 拍板（v1.0 核心揭露）

**真相 1：適用車品牌（codeRule）跟零件廠商（partBrand）完全解耦**

業界料號編碼 = 「**這料適用於哪個車品牌**」、不是「**這料是誰造的**」。同一料件、副廠廠商生產、走 OEM 車品牌編碼規則、業務人員自由決定編碼歸屬。

**Crown 雨刷案例（業界真實場景）**：

「雨刷片-後-軟式-A335H」：

- 適用車品牌：VAG（料件給 VAG 車用、codeRule 選 VAG 編碼結構）
- 段資料：`5H9 955 427 9B9`（依 brand_code_rule.segDefinitions 5 段填寫）
- 零件廠商：BOS（BOSCH 副廠生產、part_brand.code = BOS）
- 產地：CHN（中國上海生產、country.code = CHN）
- **最終 part.code：`VAG-5H9 955 427 9B9 #BOSCHN`**
- 副廠料號（secCode）：`3 397 016 317`（BOSCH 原始料號、業務查料雙路徑）

另一料件範例：`VAG-6RF 199 262P #BOSCHN`（同 codeRule + 同廠商 + 同產地、只是段資料不同）

**真相 2：sourceCode 後綴 6 字元 = partBrand.code(3) + country.code(3)**

part.code 後綴 `#BOSCHN` 由兩個獨立欄位拼接：

- 前 3 字元：part.partBrandId → part_brand.code（VARCHAR(3)、業界縮寫慣例）
- 後 3 字元：part.countryId → country.code（ISO 3166-1 alpha-3）

⭐ **後綴是 part 每筆動態組裝、不是 codeRule 固定模板**：同一個 codeRule（VAG）可以對應不同廠商 / 產地組合的 part、後綴依 part.partBrandId + part.countryId 動態生成。

**真相 3：「沙漏場」業界場景 — 來源不明、partBrand / country 必須可空**

業界真實情境：

- 沙漏場 / 二手料 / 退單貨 / 拆車料、來路不明
- 業務人員拿到實體、不知道誰造的、不知道哪產的、需先建料號入帳、後續再補資料

→ partBrand / country 都 nullable、不強制必填。

**真相 4：sourceCode 後綴用 UNK 佔位、保持字數一致**

業務需求：part.code 可能印貼紙貼在零件上、客戶可看到、需「客戶可視友善」的佔位字元。

NEXORA 採用 **UNK**（Unknown）作為佔位字元、6 字元字數一致：

| 情境 | partBrand | country | sourceCode 後綴 | part.code 範例 |
|------|-----------|---------|---------------|---------------|
| 完整資料（雨刷案例） | BOS | CHN | `#BOSCHN` | `VAG-5H9 955 427 9B9 #BOSCHN` |
| 廠商未知 | (空) | CHN | `#UNKCHN` | `VAG-5H9 955 427 9B9 #UNKCHN` |
| 產地未知 | BOS | (空) | `#BOSUNK` | `VAG-5H9 955 427 9B9 #BOSUNK` |
| **沙漏場（全空）** | (空) | (空) | `#UNKUNK` | `VAG-5H9 955 427 9B9 #UNKUNK` |

⭐ **附帶決定**：`UNK` 為 NEXORA 系統保留字、tenant 不可用 `UNK` 當 part_brand.code 或 country.code（避免撞名）。對齊 NX01-12 SYSTEM_SEED_CODES hardcode 範式。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 跨租戶 audit、罕用 | 罕用 |
| OWNER | 維護料號主檔策略、檢視全公司料庫 | 偶爾 |
| **PURCHASING** | 建料號、改料號規格、改 priceA~D 建議售價（採購組長戰略）| **每天高頻** |
| SALES | 查料、引用料號到報價 / 銷貨單 | **每天高頻** |
| WAREHOUSE | 查料、料號倉儲屬性確認 | 每天 |

⚠️ Hank 揭露：schema 註解寫「採購組長設定 priceA~D」、但 NEXORA 7 role 沒「採購組長」、只有 PURCHASING。Crown 拍板 Q1=A：用既有 PURCHASING role、PURCHASING 全權編輯 priceA~D（戰略欄位）、不擴張 role 列表。

## 1.3 跨模組引用（25 條 reverse 真相揭露）

| 業務模組 | reverse 數 | 表 |
|---|---|---|
| NX01 內部 | 2 | PartRelation 雙向（partIdFrom / partIdTo）|
| NX02 採購 | 6 | Demand / PoItem / PrItem / RfqItem / RrItem / TiItem |
| NX03 庫存 | 11 | InitItem / PartStockSetting / PkItem / PlItem / Shortage / StItem / StockBalance / StockLedger / StockTakeItem / InboundItem / OutboundItem |
| NX04 銷售 | 4 | Co / QuoteItem / SoItem / SrItem |
| NX06 物流 | 1 | DnItem |
| NX08 報表 | 1 | InventoryCache |

⭐ part 是 NEXORA 業務心臟、ON DELETE RESTRICT 保護資料完整性、軟刪除 isActive=false 對齊既有單據。

## 1.4 4 FK 上游依賴

| FK | 目標 | 必填 | impl 狀態 |
|---|---|---|---|
| codeRuleId | nx01_brand_code_rule（NX01-11）| ✅ NN | ✅ schema + controller、軸翻轉為 carBrand（本對話 NX01-12-IMPL-v2 落地）|
| partBrandId | nx01_part_brand（NX01-07）| ❌ nullable | ✅ |
| partGroupId | nx01_part_group（NX01-07）| ❌ nullable | ✅ 本對話 NX01-07-IMPL 剛建 |
| countryId | nx01_country | ❌ nullable | ✅ |

⚠️ NX01-11 軸翻轉後、part 的 codeRule **業務語意改變**：

| 範式 | 業務含義 |
|------|---------|
| 舊（partBrand 軸）| 料號編碼規則對應「零件廠商 BOSCH / MANN」|
| **新（carBrand 軸）** | 料號編碼規則對應「車型品牌 VAG / BMW」⭐ |

→ part.code 業界範式 `VAG-1K0·129·620·A` 中、`VAG` 是車型品牌、不是零件廠商、對齊新範式。

⭐ **codeRule 跟 partBrand 完全解耦**（Crown 業界 muscle memory 拍板）：

- BOSCH 副廠生產的「給 VAG Golf 用的火星塞」、codeRule 走 VAG、partBrand 標 BOS
- 業務人員自由決定編碼歸屬、系統不強制「partBrand=BOS 就必走 BOS 編碼」
- codeRule = 「料件適用於哪個車品牌」、partBrand = 「料件誰造的」、兩個獨立維度

---

# § 2. UI 頁面

## 2.1 料號列表頁（`/master/part`）

- 顯示當前 tenant 可用的所有料號
- 表格欄位：料號 / 副廠料號 / 品名 / 規格 / 車型品牌（透過 codeRule）/ 零件品牌 / 零件分類 / 是否正廠 / 售價 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：
  - 車型品牌（透過 codeRule → carBrand）
  - 零件品牌（partBrandId）
  - 零件分類（partGroupId）
  - 是否正廠（isOem）
  - 類型（type A/B/C/D）
  - 退貨政策（returnPolicy F/S/R/N/W）
- 排序：依料號 / 依品名
- 搜尋：依 code / secCode / name 模糊搜尋（含注音快搜 .name、待 A061 接線）

## 2.2 料號編輯頁（`/master/part/:id/edit`）

**識別資訊：**

- 料號（code、VARCHAR(50)、必填、依編碼規則拼接、見 §5.3）
- 副廠料號（secCode、可空、業界場景：同料件 OEM 跟副廠各有料號）
- 品名（name、必填、業務看得懂）
- 規格 / 備註（spec、可空、例：MANN / 含墊片 / 06L…適用）

**編碼規則 + 段定義：**

- 編碼規則（codeRule、必填、下拉時依據【品牌編碼規則】之設定 = car_brand 軸）
- 動態渲染 N 個 SEG 輸入欄（依 codeRule.segDefinitions JSON）
- 段資料（seg1~seg5、依 codeRule 段數動態啟用 / 隱藏）
- ⭐ Crown 拍板 **Q2 待**：seg1~5 命名是否改成業務語意命名（如 categoryCode / systemCode）

**分類:**

- 零件品牌（partBrandId、可空、下拉時依據【零件品牌型錄】）
- 零件分類（partGroupId、可空、下拉時依據【料群型錄】）
- 原產國（countryId、可空、下拉時依據【國家檔】）
- 類型（type、預設 A、A 專用 / B 通用 / C 組合 / D 拆解）
- 是否正廠件（isOem、預設 true、業界區分 OEM vs 副廠）

**單位 + 退貨 + 保固：**

- 單位（uom、預設 pcs、v1.0 固定不換算、見 §3.2.6）
- 退貨政策（returnPolicy、預設 S、見 §4 業務 muscle memory）
- 保固月數（warrantyMonths、預設 0、進貨驗收自動算 warranty_expired_at）

**售價（戰略欄位、見 §3.2.5）：**

- 建議售價 A 級 / B 級 / C 級 / D 級（priceA~D Decimal(14,4)、對應 customer_grade 4 級）
- 售價最後更新時間 / 更新人（priceUpdatedAt / priceUpdatedBy、系統自動）

**呈現設定：**

- 啟用狀態（isActive、預設 true、軟刪除）

## 2.3 部分欄位的隱性使用（跨業務模組）

| 欄位 | 隱性使用點 |
|---|---|
| code / secCode | 全業務模組單據引用、查料雙路徑 |
| returnPolicy | NX03 PKitem 包貨流程、依政策貼貼紙（業界 muscle memory）|
| warrantyMonths | NX02 RrItem 進貨驗收、自動計算 warranty_expired_at |
| priceA~D | NX02 報價 / NX04 銷貨建議售價、配合 customer_grade.marginPct 業務檢核 |
| isOem | NX02 採購多源 / NX04 銷貨客戶接受度 |

---

# § 3. 業務規則

## 3.1 PK + unique 範圍

- PK = `id`
- ⭐ Crown 拍板 Q3=A：補 unique([tenantId, code, countryId])（業界場景：同料號不同產地可並存、如 VAG-1K0 #DEU vs VAG-1K0 #TWN）
- ⭐ Crown 拍板 Q4=A：補 4 個 index 一次到位：
  - (tenantId, code) 精確查料 #1 場景
  - (tenantId, name) text search
  - (tenantId, partBrandId) 篩選下拉
  - (tenantId, partGroupId) 篩選下拉

## 3.2 業務檢核（28 業務欄位、附 5 audit）

### 3.2.1 識別欄位

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| code | ✅ | VARCHAR(50) | 依 codeRule 拼接（§5.3）、unique 視 Q3 |
| secCode | ❌ | VARCHAR(50) | 副廠料號、可空 |
| name | ✅ | VARCHAR(200) | 業界品名 |
| spec | ❌ | VARCHAR(200) | 規格 / 備註 |

### 3.2.2 編碼規則 + 段（5 欄位）

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| codeRuleId | ✅ | FK | 必引用既有 brand_code_rule、tenant 內存在 + isActive=true |
| seg1~5 | ❌ | VARCHAR(10) × 5 | 依 codeRule.segDefinitions JSON 動態渲染、各段 length / charset 對應 |

### 3.2.3 分類欄位

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| partBrandId | ❌ | FK | 對應 part_brand 必存在 + isActive=true |
| partGroupId | ❌ | FK | 對應 part_group 必存在 + isActive=true |
| countryId | ❌ | FK | 對應 country 必存在 |
| type | ❌ | VARCHAR(1)、預設 A | enum A/B/C/D（A 專用 / B 通用 / C 組合 / D 拆解）|
| isOem | ✅ | bool、預設 true | OEM vs 副廠 |

### 3.2.4 單位 + 退貨 + 保固（戰略對齊）

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| uom | ✅ | VARCHAR(10)、預設 pcs | v1.0 固定 pcs、不開放多單位（避過度設計、Crown 拍 NX01-15 同範式）|
| returnPolicy | ✅ | VARCHAR(1)、預設 S | enum F/S/R/N/W、影響 NX03 包貨貼紙策略（業界 muscle memory）|
| warrantyMonths | ✅ | INT、預設 0 | NX02 進貨驗收自動算 warranty_expired_at = inboundDate + warrantyMonths |

### 3.2.5 售價戰略欄位（5 欄位）

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| priceA | ❌ | Decimal(14,4)、預設 0 | A 級客戶建議售價、對應 customer_grade A (marginPct 12%) |
| priceB | ❌ | Decimal(14,4)、預設 0 | B 級客戶建議售價、對應 customer_grade B (15%) |
| priceC | ❌ | Decimal(14,4)、預設 0 | C 級客戶建議售價、對應 customer_grade C (18%) |
| priceD | ❌ | Decimal(14,4)、預設 0 | D 級客戶建議售價、對應 customer_grade D (22%) |
| priceUpdatedAt | ❌ | DateTime | 售價最後更新時間、系統自動 |
| priceUpdatedBy | ❌ | VARCHAR(15) | 售價最後更新人、系統自動 |

⭐ Crown 業界 muscle memory：

- priceA~D 跟 customer_grade A/B/C/D **業務戰略對應**、非巧合
- 客戶分級 A → 報價時自動帶 priceA、進階用戶可改
- 售價檢核接點在 NX02 / NX04 service、**本軌不處理接線**（跨軌、Hank 自決揭露）
- priceUpdatedAt / priceUpdatedBy 由 service 自動寫入（PATCH 改 priceA~D 時觸發）、不靠 audit log（戰略級即時可查）

### 3.2.6 啟用 + audit

| 欄位 | 必填 | 格式 |
|------|-----|------|
| isActive | ✅ | bool、預設 true |
| createdAt / createdBy / updatedAt / updatedBy | ✅ | 系統自動 |

## 3.3 跨主檔連動（業務語意）

- codeRuleId NN → brand_code_rule → carBrand（車型品牌軸、NX01-11 軸翻轉後）
- partBrandId 可空 → part_brand（零件品牌、業界 OEM vs 副廠）
- partGroupId 可空 → part_group（料群分類、業界 6 大類）
- countryId 可空 → country（產地、業界料號 #DEU / #VAL 後綴用）

⚠️ 關鍵業務語意翻轉（Hank §5.3 揭露、Crown 拍板 Q5=A）：

- 舊範式：part 建立時、若沒給 codeRuleId、給 partBrandId 系統自動建 brand_code_rule（auto-vivify）
- 新範式：partBrand 軸不存在、改成 carBrand 軸、auto-vivify 邏輯要重設計

## 3.4 軟刪除 vs 停用

- isActive=false → 不出現在新單據下拉、歷史單據保留
- 25 條 reverse @relation 全 ON DELETE RESTRICT → 不可真刪、只可停用
- 即使 isActive=false、ON DELETE RESTRICT 仍保護 referential integrity

---

# § 4. 欄位列表

對應 §3.2 業務檢核、本段重點是「業務語意對齊 schema 真相」、Hank 揭露 28 業務欄位 + 5 audit、Alex 之前漏 spec / uom 2 欄位、本 v0.1.0 全涵蓋。

## 4.1 完整 28 業務欄位（已在 §3.2 詳列、本段為快速索引）

| 群組 | 欄位數 | 欄位 |
|------|-------|------|
| 識別 | 5 | code / secCode / name / spec / type |
| FK | 4 | codeRuleId / partBrandId / partGroupId / countryId |
| 編碼段 | 5 | seg1 / seg2 / seg3 / seg4 / seg5 |
| 分類 | 1 | isOem |
| 屬性 | 3 | uom / returnPolicy / warrantyMonths |
| 售價戰略 | 6 | priceA / priceB / priceC / priceD / priceUpdatedAt / priceUpdatedBy |
| 啟用 | 1 | isActive |
| 系統自動 | 5 | tenantId + audit 4 |
| **合計** | **30**（28 業務 + 2 系統）+ audit |

## 4.2 returnPolicy 業界 muscle memory（重要）

對齊 Hank §4.7 + schema 註解：

| code | 中文 | 倉管包貨動作 |
|------|------|------------|
| F | 自由退貨 | 貼包裝 LOGO 日期貼紙 |
| S | 標準退貨（預設）| 貼包裝 LOGO 日期貼紙 |
| R | 限制退貨 | 貼**本體** LOGO 日期貼紙 |
| N | 不可退貨 | 不貼貼紙 |
| W | 保固處理 | 貼**保固 QRCode** 貼紙 |

⭐ 跟 NX03 PKitem 包貨流程深度耦合、本軌只揭露語意、實際包貨檢核留 NX03 軌（Crown 拍板 Q6=A：本軌只揭露 schema 真相、跨軌接線實作 NX02 / NX03 / NX04 軌負責）。

## 4.3 系統 seed 策略

⭐ part 主檔不 seed、tenant 開通後 OWNER / PURCHASING 自己建料號、隨業務累積。

---

# § 5. 工作流程

## 5.1 系統初始化

1. tenant 開通時、依賴的 4 個 FK 表必已 seed apply：
   - brand_code_rule（NX01-11）：4 規則 apply（VAG / POR / BMW / BEN、本對話 NX01-12-IMPL-v2 commit 4 落地）
   - part_brand（NX01-07）：10 個業界主流德國品牌 apply
   - part_group（NX01-07）：6 大類 apply
   - country（NX01-09）：階段 D 已 seed
2. nx01_part 空表進、業務人員建料號

## 5.2 建料號核心流程（v1.0 業務流程拍板、Crown 雨刷案例完整展示）

業界 muscle memory：建料號是 **PURCHASING / OWNER 每天高頻操作**、流程必順、否則影響全業務。

**Crown 雨刷案例完整流程**（「雨刷片-後-軟式-A335H」、BOSCH 副廠生產、中國上海產）：

1. 進「料號主檔列表」→ [新增]
2. **選車型品牌編碼規則**（必填、下拉自 brand_code_rule、依 carBrand 篩選）
   - 選 `VAG`（這料件適用於 VAG 車型）
3. 系統依 codeRule.segDefinitions JSON、動態渲染 N 個 SEG 輸入欄
4. **填段資料**
   - SEG1=`5H9` / SEG2=`955` / SEG3=`427` / SEG4=`9B9`
5. 填品名、規格
   - name=`雨刷片-後-軟式-A335H` / spec（選填）
6. **選零件廠商**（partBrand、下拉自 part_brand、可空）
   - 選 `BOS`（BOSCH 副廠生產）
   - ⭐ codeRule 跟 partBrand 解耦、BOSCH 副廠走 VAG 編碼規則合法
7. **選產地**（country、下拉自 country、可空）
   - 選 `CHN`（中國上海生產）
8. 填副廠料號 secCode（可空、業界場景：BOSCH 原始料號雙路徑查料）
   - secCode=`3 397 016 317`
9. 選 partGroup（料群分類、可空）
   - 選 `BODY 車身底盤`
10. 填屬性
    - type=B（通用）/ isOem=false（副廠件）/ uom=`pcs` / returnPolicy=`S` 標準 / warrantyMonths=`6`
11. 填建議售價 priceA~D（採購人員戰略、PURCHASING role 可改）
12. [儲存] → 系統 service 拼接 part.code、寫進 nx01_part、寫 audit log
    - 最終 part.code = `VAG-5H9 955 427 9B9 #BOSCHN`
13. 後續可在 NX02 採購 / NX03 庫存 / NX04 銷售 引用此料

⭐ Crown 業界 muscle memory：partBrand / country 可空、UNK 佔位、對齊「沙漏場」業界場景（見 §5.X）。

## 5.3 part.code 拼接邏輯（v1.0 拍板：service 後端拼接、Q7=B）

⭐ Crown 拍板 Q7=B：拼接邏輯在後端 service、業務邏輯集中、保一致性。

**拼接 input（4 個欄位、service 接 dto 後組裝）：**

- `codeRule.brand_code`（如 `VAG`、從 brand_code_rule 反查）
- `segs[]`（如 `[5H9, 955, 427, 9B9]`、依 codeRule.segDefinitions 渲染）
- `partBrand.code`（如 `BOS`、可空）
- `country.code`（如 `CHN`、可空）

**拼接公式：**

```
part.code = {codeRule.brand_code}-{segs joined by separator} #{sourceCode 後綴}

其中 sourceCode 後綴：
  - partBrand 填 → 前 3 字元 = partBrand.code
  - partBrand 空 → 前 3 字元 = UNK
  - country 填 → 後 3 字元 = country.code
  - country 空 → 後 3 字元 = UNK
```

**範例**：

| 情境 | partBrand | country | part.code |
|------|-----------|---------|-----------|
| 完整資料（雨刷案例） | BOS | CHN | `VAG-5H9 955 427 9B9 #BOSCHN` |
| 廠商未知 | (空) | CHN | `VAG-5H9 955 427 9B9 #UNKCHN` |
| 產地未知 | BOS | (空) | `VAG-5H9 955 427 9B9 #BOSUNK` |
| 沙漏場（全空） | (空) | (空) | `VAG-5H9 955 427 9B9 #UNKUNK` |

⭐ UNK 佔位保字數一致 6 字元、客戶可視貼紙友善（vs `???` 業務語意太刺眼）。

⚠️ `UNK` 為系統保留字、tenant 不可用 UNK 當 part_brand.code / country.code。

## 5.X 沙漏場場景（業界 muscle memory）

業界真相：沙漏場 / 二手料 / 退單貨 / 拆車料、來路不明、業務人員拿到實體：

1. 進「料號主檔列表」→ [新增]
2. 選 codeRule（仍必填、依料件實際適用車品牌、業務人員可從零件本體辨識）
   - 選 `VAG`（從零件外觀 / 紋路辨識）
3. 填段資料（從零件本體刻印讀取）
   - SEG1=`5H9` / SEG2=`955` / SEG3=`427` / SEG4=`9B9`
4. 填品名（業務人員自定）
5. **partBrand 不填**（廠商未知）
6. **country 不填**（產地未知）
7. partGroup / type / 屬性按業務判斷填
8. [儲存] → part.code = `VAG-5H9 955 427 9B9 #UNKUNK`
9. 後續若補到資料（如客戶告知來源）、業務可編輯料號補 partBrand / country
   - 編輯後 part.code 自動重組為 `VAG-5H9 955 427 9B9 #BOSCHN`

⭐ Crown 業界 muscle memory：沙漏場是業界真實場景、系統必支援來源不明場景、不可強制 partBrand / country 必填。

## 5.4 採購人員改 priceA~D 戰略場景

業界 muscle memory：建議售價是「採購戰略欄位」、市場行情變動會週期性調整：

1. PURCHASING 進料號編輯頁
2. 改 priceA = 1850 / priceB = 1900 / priceC = 1980 / priceD = 2080
3. [儲存] → service 自動寫 priceUpdatedAt = now() + priceUpdatedBy = 當前 user
4. 後續 NX02 報價 / NX04 銷貨建議售價套用新值（既有單據保留歷史）

⭐ Crown 業界 muscle memory：售價更新時間 / 人是業務戰略級資訊、業務日常會看「上次改價是誰、何時」。

## 5.5 一般用戶建料號簡化版（業務 muscle memory 場景）

業界真相：一般用戶（LITE 單店修車廠）建料號時、可能只填核心識別：

1. 進列表 → [新增]
2. 必填：codeRule + 品名（PartGroup / PartBrand / Country 可全空）
3. 段資料按 codeRule 要求填（仍必、code 是料號識別根本）
4. priceA~D 可全空（不做客戶分級、後續報價直接打單價）
5. returnPolicy 預設 S / warrantyMonths 預設 0 / uom 預設 pcs
6. [儲存]

⭐ 對齊 Crown 業界 muscle memory：詳細分類進階功能、不強制填。

## 5.6 異常：嘗試停用被引用的料

- 料號 P12345 已被 N 筆採購單 + M 筆銷貨單 + K 筆庫存引用
- OWNER 點 [停用]
- 系統提示：「P12345 被 N 採購 + M 銷貨 + K 庫存引用、停用後不出現在新單據下拉、歷史保留。確認停用？」
- OWNER [確認] → isActive=false

## 5.7 異常：嘗試刪除被引用的料

- 25 條 reverse @relation ON DELETE RESTRICT
- DB 層拒絕、service 回 409 / 業務錯誤訊息

---

# § 6. 角色權限

⭐ Crown 拍板 Q1=A：用既有 PURCHASING role（NEXORA 7 role 不擴張）、PURCHASING 全權編輯 priceA~D（戰略欄位）、業務上 PURCHASING 內部信任管理由 OWNER 負責。

權限矩陣：

| 角色 | 看料號 | 新增 | 改基本欄位 | 改 priceA~D | 停用 | 刪除 |
|------|-------|------|----------|------------|------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ | ❌（reverse RESTRICT）|
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅ | ✅ | ❌ |
| **PURCHASING** | ✅ | ✅ | ✅ | **✅（戰略）** | ✅ | ❌ |
| SALES | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WAREHOUSE | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| FINANCE | ✅（read-only）| ❌ | ❌ | ❌ | ❌ | ❌ |
| HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ | ❌ |

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看料號列表（read-only）| ✅ | ✅ | ✅ |
| 建料號 / 改基本欄位 | ✅ | ✅ | ✅ |
| 編碼規則拼接（依 NX01-11）| ✅ | ✅ | ✅ |
| priceA~D 4 級售價設定 | ✅ | ✅ | ✅ |
| returnPolicy + warrantyMonths 戰略 | ✅ | ✅ | ✅ |
| 多單位換算（uom） | ❌（v1.0 固定 pcs）| ❌ | ❌ |
| 注音快搜（part.name）| 🟡 規格 v1.0 設計、impl 待 A061 後續軌 |

→ 本表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 / NX01-14 / NX01-15 / NX01-13 / NX01-07 拍板：基礎主檔功能不是訂閱差異化欄位

---

# § 8. 注音索引

✅ 規格 v1.0 設計：part.name 接 nx01_phonetic_index、對齊 NX01-10 v1.0 §8.2 階段 1（part / partner / user）

⚠️ impl 真相揭露（Hank §8.1）：

- part.name **尚未 attach phonetic_index trigger**
- 對齊 NX01-12-IMPL-v2 commit 1.A Hank 自決 F9「字典空、attach 沒 ROI、留 A061 後續軌」
- NX01-05 規格 v1.0 寫接、impl 待 A061 完成（字典資料匯入 A057 + trigger attach A061）

對齊 Crown 業界 muscle memory：part 是中文密集主檔（業界品名常用中文「空氣濾芯」「煞車來令片」）、注音 ROI 高、跟 partner / user 同範式接入。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-12 | Alex | 初版草稿、11 段完整、§10 列 8 個 Q 給 Crown 拍。整合 Hank §1~§10 諮詢真相揭露 + Crown 5 份既有規格書(NX01-12/14/15/13/07)業界 muscle memory 沉澱。28 業務欄位完整涵蓋(前一輪 Alex 漏 spec/uom 2 欄、本版補正)。25 條 reverse @relation 揭露(前一輪 Alex 推測 24、Hank verify 25、#21 紀律校正)。標 NX01-11 軸翻轉後 part 業務語意翻轉(partBrand → carBrand)。揭露 production blocker(part.service.ts 跟 NX01-11 schema drift)給 Hank impl 軌前置處理。8 個 Q：(Q1)PURCHASING role 對應採購組長 (Q2)seg1~5 命名 vs 業務語意命名 (Q3)schema unique 補法 (Q4)schema index 補法 (Q5)NX01-11 軸翻轉後 part 自動建 rule 邏輯重設計 (Q6)returnPolicy/warrantyMonths/priceA~D 跨軌接線範圍 (Q7)part.code 拼接邏輯位置 (Q8)注音索引 v1.0 範圍 vs impl A061 路徑。|
| v1.0 | 2026-05-12 | Alex | 拍板版。Crown 拍 Q1~Q9 全 A + UNK 佔位 + 2 個關鍵業界 muscle memory 揭露。Q1=A(用既有 PURCHASING role)/ Q2=A(保留 seg1~5)/ Q3=A(unique(tenantId,code,countryId))/ Q4=A(補 4 個 index)/ Q5=A(拿掉 auto-vivify、業務先建 rule 再建 part)/ Q6=A(本軌只揭露 schema、跨軌實作給 NX02/03/04)/ Q7=B(後端 service 拼接)/ Q8=A(規格寫接、impl 標明 A061 後續軌)。Q9=C(partBrand+country 都可空、UNK 佔位、6 字元字數一致)。Crown 業界揭露：(1) Crown 雨刷案例(雨刷片-後-軟式-A335H、BOSCH 副廠走 VAG 編碼規則、最終 code = VAG-5H9 955 427 9B9 #BOSCHN)、明示 codeRule 跟 partBrand 完全解耦。(2) 沙漏場業界場景(來路不明料、partBrand/country 必須可空、用 UNK 佔位、最終 code = VAG-5H9 955 427 9B9 #UNKUNK)。附帶決定：UNK 為系統保留字、tenant 不可用 UNK 當 part_brand.code / country.code。|

---

# § 10. 待 Hank grep 確認項

(v1.0 升版後此段取代原 §10 待拍 Q)

1. nx01_part schema 既有狀態揭露(Hank 諮詢已 verify、line 702~796 95 行 + 28 業務欄位 + 5 audit)
   - 本軌實際改動：補 unique([tenantId, code, countryId]) + 4 個 index
   - 對齊 Q3=A + Q4=A 拍板

2. 🔴 production blocker 必先 hotfix(獨立軌、不本軌)
   - part.service.ts line 92 / 102 仍引用已刪除的 partBrandId 欄位
   - 編譯掛 + part create/update endpoint 執行 crash
   - Hank 開緊急修補軌、partBrandId → carBrandId 業務邏輯重設計(對齊 Q5=A 拿掉 auto-vivify)

3. part.service.resolveCodeRuleId 重設計(Q5=A 拍板)
   - 拿掉 partBrand → brand_code_rule auto-vivify 機制
   - 改為：codeRuleId NN 必填、業務必先在 NX01-11 建好 rule 再建 part
   - DTO 移除 partBrandId-driven 自動建 rule 路徑

4. part.code 拼接邏輯實作(Q7=B 拍板)
   - 位置：後端 service
   - input：codeRuleId + segs[] + partBrandId + countryId
   - output：完整 part.code(含 separator + sourceCode 後綴 UNK 佔位)
   - 對齊 §5.3 拼接公式

5. UNK 系統保留字 guard
   - service.create/update：partBrand.code === 'UNK' || country.code === 'UNK' → 拒絕(409 / 業務錯誤)
   - 對齊 NX01-12 SYSTEM_SEED_CODES hardcode 範式

6. UI 升級(Crown 雨刷案例完整流程)
   - codeRule 動態 SEG 渲染(依 segDefinitions JSON)
   - partBrand / country 下拉可空、UNK 佔位 preview part.code
   - priceA~D 戰略欄位 + audit 自動寫入(priceUpdatedAt / priceUpdatedBy)
   - 對齊 §5.2 13 步驟

7. 跨軌接線揭露(Q6=A 拍板、本軌只揭露、不實作)
   - returnPolicy → NX03 PKitem 包貨貼紙策略
   - warrantyMonths → NX02 RrItem 進貨驗收 warranty_expired_at
   - priceA~D → NX02 報價 / NX04 銷貨 + customer_grade.marginPct 業務檢核
   - 跨軌實作由 NX02 / NX03 / NX04 軌負責

8. 注音索引 part.name(Q8=A 拍板、impl 待 A061 後續軌)
   - 規格 v1.0 寫接 nx01_phonetic_index
   - impl trigger attach 待 A061 軌(對齊 NX01-12-IMPL-v2 commit 1.A F9)
   - A060 v1.1 對齊軌一起處理規格 vs impl drift

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 | impl 狀態 |
|------|------|------|----------|
| 依賴（前置）| `nx01_brand_code_rule`（NX01-11）| codeRuleId NN FK、carBrand 軸 | ✅ 落地 |
| 依賴（前置）| `nx01_part_brand`（NX01-07）| partBrandId nullable | ✅ 落地 |
| 依賴（前置）| `nx01_part_group`（NX01-07）| partGroupId nullable | ✅ 本對話 NX01-07-IMPL 剛建 |
| 依賴（前置）| `nx01_country`（NX01-09）| countryId nullable | ✅ 落地 |
| 依賴（基礎設施）| `nx01_phonetic_index`（NX01-10）| name 接注音、impl A061 後續軌 | 🟡 schema 建、trigger attach 未 |
| 被依賴（戰略）| 5 業務模組 25 條 reverse | NX02 / NX03 / NX04 / NX06 / NX08 全範圍 | 部分待建 |
| 被依賴（戰略）| `nx01_part_relation`（NX01-17）| partIdFrom + partIdTo 雙向 FK | 規格待建、schema 已建（NX01-12 諮詢揭露）|
| 被依賴（戰略）| `nx01_part_model`（NX01-16）| 料號 ↔ 車型適配核心 | 規格 / impl 全待建 |

⭐ 跨軌接線 揭露（業務戰略、本軌不實作）：

- returnPolicy → NX03 PKitem 包貨貼紙策略
- warrantyMonths → NX02 RrItem 進貨驗收 warranty_expired_at
- priceA~D → NX02 / NX04 報價 / 銷貨 + customer_grade.marginPct 業務檢核

⚠️ **production blocker（Hank §5.3 揭露）**：

- part.service.ts line 92 / 102 仍引用已刪除的 partBrandId
- NX01-05 impl 落地前**必先 hotfix**
- 屬獨立軌（Hank 開緊急修補軌、非 NX01-05 範圍）

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- **階段 0（前置 hotfix）**：part.service.ts partBrandId → carBrandId（production blocker、獨立軌）
- **階段 1**：schema 補 unique + index（Q3 + Q4 拍）
- **階段 2**：service.resolveCodeRuleId 重設計（Q5 拍）+ part.code 拼接位置（Q7 拍）
- **階段 3**：UI 升級（codeRule 動態 SEG 渲染、priceA~D 戰略欄位 + audit 自動寫入）
- **階段 4**：注音 trigger attach 待 A061
- **階段 5**：下游驗證（NX01-17 part_relation / NX01-16 part_model 規格落地後）

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12/14/15/13/07 範式、11 段完整、Crown 拍 Q1~Q9 全 A + UNK 佔位落地。
> ⭐ part 是 NEXORA 業務心臟、最後整合節點、25 條 reverse 引用 5 業務模組、規格密度高。
> ⭐ Crown 業界 muscle memory：4 級售價戰略對應、退貨政策貼紙策略、保固月數自動算到期日、編碼規則 carBrand 軸翻轉。
> ⭐ Crown 雨刷案例：BOSCH 副廠走 VAG 編碼、codeRule 跟 partBrand 完全解耦、最終 code = VAG-5H9 955 427 9B9 #BOSCHN。
> ⭐ 沙漏場業界場景：來路不明料、partBrand / country 可空、UNK 佔位、最終 code = VAG-5H9 955 427 9B9 #UNKUNK。
> ⚠️ Hank 揭露 production blocker：part.service.ts 跟 NX01-11 schema drift、impl 前置 hotfix 必修（獨立軌、不本軌）。
> ⚠️ #22 鐵律揭露：注音索引 v1.0 規格寫接 / impl 待 A061、規格 vs impl drift 經 A060 後續軌對齊。
