<!-- docs/nx01/spec/intent/nx01-15-vehicle-classification.md -->

# NEXORA NX01-15 車輛分類型錄（nx01_transmission / nx01_drivetrain / nx01_model_type）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q6 + 揭露關鍵業界真相（詳細分類為進階功能 / seed 最小骨架 / OWNER 自加擴充為主）
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-15-VEHICLE-CLASSIFICATION-SPEC-V1-01
> 性質：B 型錄合一規格書（含 1 個 A 主檔複雜度的 transmission + 2 個 B 型錄）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_transmission / nx01_drivetrain / nx01_model_type` = NEXORA **車輛分類三維度型錄**、給 NX01-13 model（車型）引用組成完整車型基本資料。

業務情境：建一台 `Golf 7 代 GTI` 時、可選填：
- **變速箱**（transmission）：DSG 7 速雙離合 / 6 速手排 / CVT
- **傳動方式**（drivetrain）：前驅 / 後驅 / 四驅 / AWD
- **車體類型**（model_type）：轎車 / 掀背 / 休旅 / 旅行 / 跑車

⭐ **Crown 業界 muscle memory 真相（v1.0 核心拍板）**：

三表詳細分類 = **數據化管理進階用戶才會用的功能**、不強制要求一定要填：

- 一般用戶（LITE 單店修車廠 / 小經銷商）= 可能根本懶得填、建 model 時 3 個 FK 全空也能運作
- 進階用戶（PRO Yaro / 大型經銷商、要分析庫存周轉 / 採購預測）= 完整填寫、用於數據化分析

每個品牌有自己的命名方式（VAG 的 SUV 叫 Tiguan / Touareg 體系、Toyota 的 SUV 叫 RAV4 / Highlander 體系）、系統 seed **不追求完整、只給最小可運作骨架**、業界擴充走 OWNER 自加。

### 為什麼三表合一規格書

三表都是 model 的「車輛分類型錄」、業務語意同軌（給 model 引用、不獨立操作）、合一寫規格書有以下好處：

- 統一拍板「型錄維護權限」（SYSADMIN vs OWNER）
- 統一 seed 來源（同一份業界 muscle memory）
- 統一注音索引策略
- 共用 Tier 差異規則

但三表業務語意 + 複雜度有差異、本規格內按表分區處理（§ 2 / § 3 / § 4 / § 5 各分三節）。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 維護全域預設變速箱 / 傳動 / 車體類型 seed | 加新型錄條目時、不常 |
| OWNER | 新增自家業務需要的型錄條目 | 開店初期 + 偶爾擴充 |
| PURCHASING / SALES | 建車型 / 查車型時、下拉選分類 | 每天（隱性使用、透過 NX01-13 model）|

## 1.3 跨模組引用

- `nx01_model`（NX01-13、後續落地）：核心被引用方、車型同時引用 3 表
  - `model.transmission_id` FK
  - `model.drivetrain_id` FK
  - `model.model_type_id` FK
- `nx01_car_brand`（NX01-12、已 v1.0）：間接、變速箱業界資料常按品牌歸類（DSG = VAG 集團、AT = 通用）
- `nx99_tenant`：tenant scoped、系統 seed 業界通用值 apply 所有 tenant、tenant 可加自家補充

## 1.4 三表特性對照（拍規格前先看清楚）

| 維度 | nx01_transmission | nx01_drivetrain | nx01_model_type |
|------|------------------|-----------------|----------------|
| 業務分類 | A 主檔（複雜度高）| B 型錄（簡單）| B 型錄（簡單）|
| seed 最小骨架 | ~3~5 筆（MT / AT / DSG / CVT 通用類別）| ~4 筆（FF / FR / 4WD / AWD）| ~3~5 筆（SED / SUV / HAT 等業界 70% 場景）|
| 業界擴充來源 | ⭐ OWNER 自加（業務日常）| ⭐ OWNER 自加（罕用）| ⭐ OWNER 自加（業務日常）|
| 在 model 引用 | nullable（不強制）| nullable（不強制）| nullable（不強制）|
| 需注音索引 | ✅（變速箱型號中文常用）| ❌（量小、英文縮寫直接打）| ✅（轎車 / 休旅注音常用）|
| 是否分品牌 | ⭐ 可選歸 car_brand（DSG = VAG / Tiptronic = POR）| ❌ | ❌ |
| OWNER 可加 | ✅ | ✅ | ✅ |

⭐ Crown 業界 muscle memory 拍板：三表 seed 都採「最小可運作骨架」策略、業界擴充靠 OWNER 自加、不追求 seed 完整。

⭐ 三表在 NX01-13 model 引用全部 **nullable**（不強制填）、一般用戶建 model 可全空、進階用戶完整填寫。

---

# § 2. UI 頁面

## 2.1 變速箱型錄頁（`/master/transmission`）

### 2.1.1 列表頁

- 顯示當前 tenant 可用的所有變速箱
- 表格欄位：代碼 / 中文名 / 英文名 / 變速箱類型（手排 / 自排 / 雙離合 / CVT）/ 檔位數 / 關聯品牌（可空）/ 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：變速箱類型 / 關聯品牌 / 啟用狀態
- 排序：依 sortNo（預設）/ 依檔位數 / 依代碼

### 2.1.2 編輯頁

**基本資訊：**

- 變速箱代碼（業界常用縮寫、如 DSG7 / AT8 / MT6 / CVT）
- 變速箱中文名（如「7 速雙離合自手排」）
- 變速箱英文名（如「7-Speed DSG」）
- 變速箱類型：1.手排 2.自排 3.雙離合 4.CVT 5.AMT 6.其他
- 檔位數（INT、CVT 填 0 或 null）
- 關聯品牌（下拉時依據【車型品牌型錄】之設定、可空）
  - 業界 muscle memory：DSG = VAG 集團專用 / Tiptronic = POR / ZF = BMW 常用
  - 但通用變速箱（如 ZF AT 系列）跨品牌使用、本欄可空
- 備註

**呈現設定：**

- 排序（預設 0、由小到大）
- 啟用狀態（啟用 / 停用）

## 2.2 傳動方式型錄頁（`/master/drivetrain`）

### 2.2.1 列表頁

- 顯示當前 tenant 可用的所有傳動方式
- 表格欄位：代碼 / 中文名 / 英文名 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：啟用狀態

### 2.2.2 編輯頁

- 代碼（如 FF / FR / 4WD / AWD）
- 中文名（如「前置前驅」「前置後驅」「四輪驅動」「全時四驅」）
- 英文名（如「Front-Engine Front-Wheel Drive」）
- 備註
- 排序

⭐ 系統 seed 4 種核心傳動方式（FF / FR / 4WD / AWD）作為最小骨架、tenant 業界需要新增（如 EV 雙馬達 / Hybrid AWD）OWNER 自加

## 2.3 車體類型型錄頁（`/master/model-type`）

### 2.3.1 列表頁

- 顯示當前 tenant 可用的所有車體類型
- 表格欄位：代碼 / 中文名 / 英文名 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：啟用狀態

### 2.3.2 編輯頁

- 代碼（如 SED / HAT / SUV / WAG / CPE）
- 中文名（如「轎車」「掀背」「休旅車」「旅行車」「跑車」）
- 英文名（如「Sedan」「Hatchback」「SUV」「Wagon」「Coupe」）
- 備註
- 排序

## 2.4 隱性使用（跨多畫面下拉）

業務人員以下情境會看到本三表的下拉選單：

- NX01-13 model 編輯頁（同時選 3 表、組成車型完整資料）
- NX03 即時查詢工作站（依車體類型 / 傳動方式篩選車型）

下拉只顯示 `isActive = true` 的資料、依 sortNo 排序。

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

| 表 | unique |
|---|---|
| nx01_transmission | `(tenantId, code)` |
| nx01_drivetrain | `(tenantId, code)` |
| nx01_model_type | `(tenantId, code)` |

三表皆 tenant scoped、系統 seed apply 到所有 tenant、跨租戶代碼撞名不檢查（對齊 NX01-11 / NX01-12 範式 + #13）。

## 3.2 業務檢核

### 3.2.1 nx01_transmission

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| code | ✅ | 字串 | tenant 內 unique |
| name | ✅ | 字串 | 業務看得懂中文名 |
| nameEn | ❌ | 字串 | 國際對照 |
| transmissionType | ✅ | enum | 1.手排 2.自排 3.雙離合 4.CVT 5.AMT 6.其他 |
| gearCount | ❌ | INT | 手排 / 自排 / 雙離合可填、CVT 為 null |
| carBrandId | ❌ | FK | 關聯品牌、跨品牌通用可空、對應 car_brand 必存在 + isActive=true |
| remark | ❌ | 字串 | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

### 3.2.2 nx01_drivetrain

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| code | ✅ | 字串 | tenant 內 unique |
| name | ✅ | 字串 | |
| nameEn | ❌ | 字串 | |
| remark | ❌ | 字串 | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

### 3.2.3 nx01_model_type

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| code | ✅ | 字串 | tenant 內 unique |
| name | ✅ | 字串 | |
| nameEn | ❌ | 字串 | |
| remark | ❌ | 字串 | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

## 3.3 跨主檔連動

- 被引用 `nx01_model`（NX01-13、後續落地）：model 同時引用 3 表（transmission_id / drivetrain_id / model_type_id）
- `nx01_transmission.carBrandId` 引用 `nx01_car_brand`（NX01-12 已 v1.0）

## 3.4 跨業務模組連動

- NX01-13 model（直接依賴）
- NX01-16 part_model（透過 model 間接依賴）
- NX03 即時查詢 / NX02 採購（透過 model 間接依賴、車型篩選用）

## 3.5 軟刪除 vs 停用

- 三表 isActive=false → 下拉不顯示、不能用於新建 model
- 已建 model 引用保留（不阻擋歷史資料）
- 被 model 引用 → 不可刪、只能停用
- 未被引用（剛建錯）→ 可真刪
- 系統 seed 不可刪、只能停用

---

# § 4. 欄位列表

## 4.1 nx01_transmission 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 變速箱代碼 | ✅ | 無 | SYSADMIN / OWNER 填 |
| `name` | 變速箱中文名 | ✅ | 無 | |
| `nameEn` | 變速箱英文名 | ❌ | null | |
| `transmissionType` | 變速箱類型 enum | ✅ | 無 | 1~6 |
| `gearCount` | 檔位數 | ❌ | null | 手排 / 自排 / 雙離合填、CVT 為 null |
| `carBrandId` | 關聯品牌 FK | ❌ | null | 業界常用品牌 / 通用空 |
| `remark` | 備註 | ❌ | null | |
| `sortNo` | 排序 | ✅ | 0 | |
| `isActive` | 啟用狀態 | ✅ | true | |

## 4.2 nx01_drivetrain 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 傳動代碼 | ✅ | 無 | SYSADMIN seed |
| `name` | 傳動中文名 | ✅ | 無 | |
| `nameEn` | 傳動英文名 | ❌ | null | |
| `remark` | 備註 | ❌ | null | |
| `sortNo` | 排序 | ✅ | 0 | |
| `isActive` | 啟用狀態 | ✅ | true | |

## 4.3 nx01_model_type 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 車體類型代碼 | ✅ | 無 | SYSADMIN / OWNER 填 |
| `name` | 車體類型中文名 | ✅ | 無 | |
| `nameEn` | 車體類型英文名 | ❌ | null | |
| `remark` | 備註 | ❌ | null | |
| `sortNo` | 排序 | ✅ | 0 | |
| `isActive` | 啟用狀態 | ✅ | true | |

## 4.4 系統自動欄位（三表共用、不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離 |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者 |

## 4.5 系統 seed 最小可運作骨架

⭐ Crown 業界 muscle memory 拍板：三表 seed 不追求業界完整、只給最小可運作骨架、業界擴充靠 OWNER 自加。

### 4.5.1 nx01_transmission seed（最小骨架、~3~5 筆通用類別）

對齊 Q4 拍板：seed **不細到「DSG7 / DSG6 / ZF8AT」**、只 seed 通用類別、tenant 自己細化（業界每個品牌變速箱命名方式不同、系統不該強制統一）。

| code | name | nameEn | transmissionType | gearCount | carBrandId |
|------|------|--------|-----------------|-----------|-----------|
| MT | 手排變速箱 | Manual Transmission | 1 手排 | (空) | (空) |
| AT | 自動變速箱 | Automatic Transmission | 2 自排 | (空) | (空) |
| DCT | 雙離合變速箱 | Dual-Clutch Transmission | 3 雙離合 | (空) | (空) |
| CVT | 無段變速箱 | Continuously Variable Transmission | 4 CVT | (空) | (空) |

OWNER 業務日常會新增的範例（不在 seed）：

- DSG7（VAG）、TIP8（POR）、ZF8AT、6MT、e-CVT 等等

### 4.5.2 nx01_drivetrain seed（最小骨架、4 筆核心）

對齊 Q2 拍板：seed 4 個核心傳動方式涵蓋業界 95% 燃油車場景、EV 雙馬達 / Hybrid AWD 等 OWNER 自加。

| code | name | nameEn |
|------|------|--------|
| FF | 前置前驅 | Front-Engine Front-Wheel Drive |
| FR | 前置後驅 | Front-Engine Rear-Wheel Drive |
| 4WD | 四輪驅動 | Four-Wheel Drive |
| AWD | 全時四驅 | All-Wheel Drive |

OWNER 業務需要的擴充範例（不在 seed）：

- MR（中置後驅、跑車）、RR（後置後驅、保時捷 911）、Hybrid AWD、Dual-Motor EV

### 4.5.3 nx01_model_type seed（最小骨架、~3~5 筆業界 70% 場景）

對齊 Q3 拍板：seed 不窮舉、只給業界最常見類別、其他靠 OWNER 自加（每個品牌車體類型命名方式不同）。

| code | name | nameEn |
|------|------|--------|
| SED | 轎車 | Sedan |
| HAT | 掀背 | Hatchback |
| SUV | 休旅車 | SUV |
| CPE | 跑車 | Coupe |
| MPV | 多功能廂式 | MPV |

OWNER 業務需要的擴充範例（不在 seed）：

- WAG（旅行車）、CON（敞篷）、PUP（皮卡）、VAN（廂型）、Crossover、Roadster、Limo 等

---

# § 5. 工作流程

## 5.1 系統 seed apply（系統初始化）

1. 系統建立新 tenant 時、自動 apply 三表系統 seed 最小骨架
2. transmission ~4 筆（MT / AT / DCT / CVT 通用類別）+ drivetrain 4 筆（FF / FR / 4WD / AWD）+ model_type ~5 筆（SED / HAT / SUV / CPE / MPV）寫入、tenantId = 新 tenant
3. tenant 啟用後業務即可使用基礎、進階用戶按需自加

對齊 NX01-12 seed 範式、跟 NX01-12 car_brand seed 同時 apply（變速箱關聯品牌依賴 car_brand 先存在）。

⭐ Crown 業界 muscle memory：seed 不追求完整、最小骨架 + OWNER 自加是業界主流模式。

## 5.2 OWNER 新增業務日常使用的變速箱條目（業界主流）

業界 muscle memory：每個品牌變速箱命名方式不同、OWNER **業務日常**會自加品牌專用變速箱：

- DSG7 / DSG6（VAG 集團）
- TIP8（Porsche Tiptronic 8 速）
- ZF 8AT（BMW / Audi 通用）
- 6MT（手排 6 速、各品牌）
- Allison 1000（商用車）

流程：

1. OWNER 進「變速箱型錄列表」→ [新增]
2. 填 code = DSG7、name = 7 速雙離合自手排、transmissionType = 3 雙離合、gearCount = 7、carBrandId = VAG
3. [儲存] → 該 tenant 新變速箱啟用
4. 後續 NX01-13 model 編輯頁下拉可選

⭐ 對齊 Crown 拍板：本流程是業務日常、不是「稀有情況」、屬進階用戶數據化管理常規操作。

## 5.3 OWNER 新增業務日常使用的車體類型條目（業界主流）

業界 muscle memory：每個品牌車體類型命名方式不同、OWNER 業務日常會自加：

- WAG（旅行車）
- CON（敞篷）
- PUP（皮卡）
- VAN（廂型車）
- Crossover（跨界休旅）
- Roadster（雙座敞篷跑車）

流程同 §5.2。

## 5.4 OWNER 新增業務需要的傳動方式條目（罕用但開放）

業界 muscle memory：傳動方式相對穩定、但 EV / Hybrid 新興類別擴充：

- Hybrid AWD（油電全時四驅、Toyota RAV4 Hybrid）
- Dual-Motor EV（雙馬達電動車、Tesla / Taycan）
- MR（中置後驅、跑車）
- RR（後置後驅、Porsche 911）

流程同 §5.2。

⭐ 對齊全 Tier 對等拍板：drivetrain OWNER 開放新增、雖罕用但不限制（守 #20 自查、對齊 NX01-12 全 Tier 對等）。

## 5.5 OWNER 調整型錄呈現順序

業界真相：不同經銷商主推車型不同：

- 休旅車專營店 → SUV / MPV 排前
- 跑車專營店 → CPE / CON 排前

流程：編輯各條目 sortNo、下拉即時反映。

## 5.6 一般用戶建 model 不填三表 FK（業務 muscle memory 場景）

業界真相：一般用戶（LITE 單店修車廠）建 model 時、可能只填基本資訊（車型品牌 + 車型名稱 + 年份）、三表 FK 全空。

流程：

1. 業務人員進 NX01-13 model 編輯頁
2. 填 car_brand = VAG、model_name = Golf、year = 2018
3. transmission / drivetrain / model_type **全部不填**
4. [儲存] → model 仍可建立、不阻擋業務流程

⭐ 對齊 Crown 業界 muscle memory：詳細分類是進階用戶功能、不強制要求一定要填。

## 5.7 異常：嘗試停用被引用的型錄條目

- 變速箱 DSG7 已被 N 筆 model 引用
- OWNER 點 [停用]
- 系統提示：「DSG7 被 N 個車型引用、停用後下拉不再顯示、但歷史資料保留。確認停用？」
- OWNER [確認] → isActive = false

---

# § 6. 角色權限

## 6.1 nx01_transmission

| 角色 | 看 | 新增 | 改名稱 / 排序 / 啟用 | 刪除 |
|------|---|------|-------------------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ |

## 6.2 nx01_drivetrain

| 角色 | 看 | 新增 | 改名稱 / 排序 / 啟用 | 刪除 |
|------|---|------|-------------------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ |

⭐ 對齊 NX01-12 全 Tier 對等拍板：drivetrain 雖罕用、仍開放 OWNER 新增（EV / Hybrid 等業界擴充用）

## 6.3 nx01_model_type

| 角色 | 看 | 新增 | 改名稱 / 排序 / 啟用 | 刪除 |
|------|---|------|-------------------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ |

⭐ 系統 seed 條目代碼 tenant 不可改、其他欄位完全可調（對齊 NX01-12 範式）

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看三表型錄（read-only）| ✅ | ✅ | ✅ |
| 系統 seed 最小骨架（transmission ~4 / drivetrain 4 / model_type ~5）| ✅ | ✅ | ✅ |
| OWNER 改 seed 條目欄位（除 code）| ✅ | ✅ | ✅ |
| OWNER 新增三表條目（無上限）| ✅ | ✅ | ✅ |
| 在 model 引用時三表 FK 全 nullable | ✅ | ✅ | ✅ |
| 注音快搜（transmission / model_type）| ✅ | ✅ | ✅ |

→ 本三表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 拍板：型錄基礎功能不是訂閱差異化欄位
→ Crown 業界 muscle memory：詳細分類是進階用戶（PRO Yaro / 大型經銷商）會用、但不限制 LITE 用戶填寫

---

# § 8. 注音索引

## 8.1 nx01_transmission

✅ 啟用、`name` 欄位接入 nx01_phonetic_index。

業務情境：業務人員打「ㄕㄙㄕ」搜「7 速雙離合」、「ㄐㄨㄣ」搜「Tiptronic 8 速」。

## 8.2 nx01_drivetrain

❌ 不啟用、量小（6 筆）+ 業界英文縮寫直接打（FF / 4WD / AWD），注音 ROI 低。

## 8.3 nx01_model_type

✅ 啟用、`name` 欄位接入 nx01_phonetic_index。

業務情境：業務人員打「ㄒㄌ」搜「休旅」、「ㄓㄔ」搜「轎車」。

對齊 NX01-10 注音快搜系統設計：A 主檔 / 高頻 B 型錄需注音、低頻固定 B 型錄不需。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-12 | Alex | 初版草稿、11 段完整、§10 列 6 個 Q 給 Crown 拍。對齊 NX01-12 car_brand v1.0 拍板範式（系統 seed + tenant scoped + 全 Tier 對等 + seed 修改僅鎖 code）|
| v1.0 | 2026-05-12 | Alex | Crown 拍 Q1~Q6 + 揭露關鍵業界真相：(1) transmission.carBrandId FK 保留、業界專用標明（Q1 拍 A）(2) drivetrain seed 縮成 4 核心、EV / Hybrid 等 OWNER 自加（Q2 拍 A + 縮小）(3) model_type seed 縮成 ~5 核心、每個品牌命名不同、OWNER 自加（Q3 拍 A + 縮小）(4) transmission seed 縮成 ~4 通用類別（MT / AT / DCT / CVT）、不細到 DSG7、OWNER 自加品牌專用（Q4 拍 C + 縮小）(5) transmissionType enum 6 種保留、其他 escape hatch（Q5 拍 A）(6) drivetrain OWNER 開放新增、對齊 NX01-12 全 Tier 對等拍板（Q6 拍 B、#20 自查撤回原 A）。⭐ Crown 核心揭露：詳細分類是進階用戶數據化管理功能、不強制要求一定要填、在 NX01-13 model 引用時三表 FK 全 nullable。|

---

# § 10. 待 Hank grep 確認項

（v1.0 升版後此段取代原 §10 待拍 Q）

1. 三表 schema 既有狀態揭露（Hank 諮詢回報全部未建、line 0）
   - 對照本規格 §4.1 / §4.2 / §4.3 欄位列表、按表獨立 migration
   - transmission 含 carBrandId FK 接 nx01_car_brand（NX01-12 已 v1.0）

2. 系統 seed apply 機制配套 NX01-12 car_brand
   - transmission ~4 筆 / drivetrain 4 筆 / model_type ~5 筆最小骨架
   - 對齊 NEXORA seed 三層架構（system / template / test）
   - transmission seed 4 筆全 carBrandId = 空（通用類別、不歸品牌）

3. nx01_phonetic_index trigger 機制接入
   - transmission.name + model_type.name 接入注音索引
   - drivetrain 不接入（量小、業界英文縮寫直接打）
   - 對齊 NX01-10 v1.0 既有實作範式

4. 被引用判斷邏輯（停用時提示 N 個 model 引用）
   - 依下游 model FK reverse query 實作、NX01-13 落地後才完整通

5. 跨軌依賴揭露給 NX01-13 model（戰略傳遞）
   - 三表 FK 在 model schema 預期 **nullable**（不強制填）
   - 對齊 Crown 業界 muscle memory：詳細分類是進階功能、不阻擋基礎業務流程
   - NX01-13 規格書 v0.1.0 寫作時必對齊本拍板

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 |
|------|------|------|
| 依賴（前置）| `nx01_car_brand`（NX01-12、已 v1.0）| transmission.carBrandId FK、可空 |
| 依賴（基礎設施）| `nx01_phonetic_index`（NX01-10、已 v1.0）| transmission.name + model_type.name 接注音 |
| 被依賴（核心）| `nx01_model`（NX01-13、後續）| model 同時引用 3 表、**3 個 FK 全 nullable**（Crown 業界 muscle memory 拍板）|
| 被依賴（戰略）| `nx01_part_model`（NX01-16、後續）| 透過 model 間接 |
| 被依賴（業務）| NX03 即時查詢 / NX02 採購 | 透過 model 間接 |

⭐ 給 NX01-13 規格書作者注意：本三表在 model 引用必須 nullable、不可寫成 NOT NULL、避免阻擋一般用戶建 model 基礎流程。

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- 階段 1：3 張 schema migration + seed apply 機制最小骨架（transmission ~4 / drivetrain 4 / model_type ~5）
- 階段 2：3 個列表頁 + 3 個編輯頁 UI（三表全部開放新增、對齊全 Tier 對等）
- 階段 3：注音索引 trigger 接線（transmission + model_type、drivetrain 跳過）
- 階段 4：下游驗證（NX01-13 model schema 同時 FK 3 表 nullable、路徑通）

NX01-13 model 落地後、本三表才完整接通車型體系。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-11 / NX01-12 範式、11 段完整、Crown 拍 Q1~Q6 落地。
> ⭐ 三表合一規格書、複雜度跨度大（transmission A 主檔 vs drivetrain / model_type B 型錄）、§ 2 / § 3 / § 4 / § 5 分區處理。
> ⭐ 跟 NX01-12 同屬「車輛分類維度」、共用 seed apply / tenant scoped / Tier 對等範式。
> ⭐ Crown 核心業界 muscle memory：詳細分類是進階用戶數據化管理功能、seed 最小骨架 + OWNER 自加為主、在 model 引用三表 FK 全 nullable 不強制填。
