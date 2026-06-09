<!-- docs/nx01/spec/intent/nx01-14-engine.md -->

# NEXORA NX01-14 引擎主檔（nx01_engine）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q5（Q1=C / Q2~Q5=A）
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-14-ENGINE-SPEC-V1-01
> 性質：A 主檔（車輛分類維度核心、被 NX01-13 model 引用、車輛核心識別）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_engine` = NEXORA **引擎主檔**、記錄車輛引擎核心識別資訊（引擎代碼 / 排氣量 / 缸數 / 燃料 / 增壓）、給 NX01-13 model 引用。

業務情境：建一台 `Golf 7 GTI` 時、進階用戶會填引擎 = `EA888 1984cc 直4 汽油 渦輪`、用於後續料號 → model → engine 反查（如查「VAG EA888 引擎適配的火星塞料號」）。

⭐ **Crown 業界 muscle memory（對齊 NX01-15 拍板）**：

引擎詳細分類 = **進階用戶數據化管理功能、不強制要求一定要填**：

- 一般用戶（LITE 單店修車廠）= 可不填、建 model 時 engine_id 留空
- 進階用戶（PRO Yaro / 大型經銷商、要分析「特定引擎適配的料號」）= 完整填寫

每個品牌引擎命名方式不同（VAG = EA888 / EA211、Toyota = 2GR-FE / 1ZR-FE、BMW = N20 / B48 系列）、系統 seed 不追求完整、**初始空表、業界擴充走 OWNER 自加**。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 預設無內容、提供框架由 tenant 自加 | 罕用 |
| OWNER | 新增業務日常接觸的引擎（按品牌 / 排氣量擴充） | 開店初期 + 偶爾擴充 |
| PURCHASING / SALES | 建 model / 查 model 時、下拉選引擎 | 進階用戶每天、一般用戶偶爾 |

## 1.3 跨模組引用

- `nx01_model`（NX01-13、後續落地）：核心被引用方、`model.engine_id` FK、**nullable**（不強制填）
- `nx01_car_brand`（NX01-12、已落地）：可選歸品牌、`engine.car_brand_id` FK、nullable（跨品牌通用空）
- `nx99_tenant`：tenant scoped、空表進、tenant 自加

## 1.4 特性對照（vs NX01-15 transmission）

| 維度 | nx01_engine | nx01_transmission（NX01-15 對照）|
|------|-------------|------|
| 業務分類 | A 主檔 | A 主檔 |
| seed 策略 | 空表進（每品牌命名差異大、seed 無通用值）| 最小骨架 4 筆通用類別 |
| 業界擴充來源 | ⭐ OWNER 自加（業務日常、按品牌） | ⭐ OWNER 自加 |
| 在 model 引用 | nullable（不強制） | nullable（不強制） |
| 是否分品牌 | ⭐ 可選歸 car_brand（EA888 = VAG / 2GR = TOY）| 可選歸 car_brand |
| 需注音索引 | ❌（業界用英文 / 數字代碼、對齊 Crown 揭露車輛分類軸不接注音） | ❌ |

⭐ 對齊 Crown 業界 muscle memory 拍板：車輛分類軸（car_brand / engine / transmission / drivetrain / model_type）一律不接注音索引、業界用英文縮寫。

---

# § 2. UI 頁面

## 2.1 引擎主檔列表頁（`/master/engine`）

- 顯示當前 tenant 可用的所有引擎
- 表格欄位：引擎代碼 / 引擎名稱 / 排氣量（cc）/ 缸數配置 / 燃料類型 / 增壓方式 / 關聯品牌（可空）/ 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：燃料類型 / 增壓方式 / 關聯品牌 / 啟用狀態
- 排序：依 sortNo（預設）/ 依排氣量 / 依引擎代碼

## 2.2 引擎編輯頁（`/master/engine/:id/edit`）

**基本資訊：**

- 引擎代碼（業界常用、如 EA888 / EA211 / 2GR-FE / N20）
- 引擎名稱（業務看得懂的描述、如「EA888 第三代 2.0T」）
- 排氣量（cc、INT、如 1984 / 1395）

**規格分類：**

- 缸數配置（直 4 / V6 / V8 / 水平對臥 H4 / H6 等、業界常用字串）
- 燃料類型：1.汽油 2.柴油 3.Hybrid 4.EV
- 增壓方式：1.NA 自然進氣 2.TC 渦輪 3.SC 機械 4.TC+SC 雙增壓

**關聯：**

- 關聯品牌（下拉時依據【車型品牌型錄】之設定、可空）
  - 業界 muscle memory：EA888 / EA211 = VAG / 2GR-FE = Toyota / N20 / B48 = BMW
  - 跨品牌通用引擎（罕、業務不分品牌）= 留空

**呈現設定：**

- 備註（衍生車型 / 停產說明等）
- 排序（預設 0、由小到大）
- 啟用狀態（啟用 / 停用）

## 2.3 下拉選單（隱性使用、跨 NX01-13 model 編輯）

業務人員在 NX01-13 model 編輯頁、選擇車型對應引擎時出現。

下拉只顯示 `isActive = true` 的引擎、依 sortNo 排序、依關聯品牌篩選（如選 VAG car_brand 時、優先顯示 carBrandId = VAG 的引擎）。

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

- PK = `id`
- unique = `(tenantId, code)`（每租戶內、引擎代碼唯一）
- tenant scoped、跨租戶代碼撞名不檢查（對齊 NX01-12 / NX01-15 拍板）

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離（系統自動帶當前租戶） |
| code | ✅ | 字串 | tenant 內 unique、業界縮寫 / 數字代碼（大寫慣例） |
| name | ✅ | 字串 | 業務描述、可中文混英文 |
| displacementCc | ❌ | INT | 排氣量、EV 引擎可空 |
| cylinderConfig | ❌ | 字串 | 缸數配置（直 4 / V6 / 等）、EV 引擎可空 |
| fuelType | ✅ | enum | 1.汽油 2.柴油 3.Hybrid 4.EV |
| aspirationType | ❌ | enum | 1.NA 2.TC 3.SC 4.TC+SC、EV 引擎可空 |
| carBrandId | ❌ | FK | 對應 car_brand 必存在 + isActive=true、跨品牌通用空 |
| remark | ❌ | 字串 | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

⚠️ EV 燃料引擎業務真相：無排氣量 / 缸數 / 增壓概念、規格 §3.2 三欄保留 nullable、不強制 EV 引擎填。

## 3.3 跨主檔連動

- `engine.carBrandId` 引用 `nx01_car_brand`（NX01-12 已落地）
- 被引用 `nx01_model`（NX01-13、後續落地）：`model.engine_id` FK、**nullable**
- 對齊 NX01-15 三表 FK 在 model 全 nullable 拍板

## 3.4 跨業務模組連動

- NX01-13 model（直接依賴）
- NX01-16 part_model（透過 model 間接依賴、戰略表）
- NX03 即時查詢 / NX02 採購（透過 model 間接、進階用戶用引擎篩選料）

## 3.5 軟刪除 vs 停用

- 引擎 isActive=false → 下拉不顯示、不能用於新建 model
- 已建 model 引用保留（不阻擋歷史資料）
- 被 model 引用 → 不可刪、只能停用
- 未被引用（剛建錯）→ 可真刪

---

# § 4. 欄位列表

## 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 引擎代碼 | ✅ | 無 | OWNER 填、業界縮寫慣例 |
| `name` | 引擎名稱 | ✅ | 無 | OWNER 填 |
| `displacementCc` | 排氣量（cc）| ❌ | null | OWNER 填、EV 可空 |
| `cylinderConfig` | 缸數配置 | ❌ | null | OWNER 填、EV 可空 |
| `fuelType` | 燃料類型 enum | ✅ | 1 汽油 | 1.汽油 2.柴油 3.Hybrid 4.EV |
| `aspirationType` | 增壓方式 enum | ❌ | 1 NA | 1.NA 2.TC 3.SC 4.TC+SC、EV 可空 |
| `carBrandId` | 關聯品牌 FK | ❌ | null | 業界專用標明 / 通用空 |
| `remark` | 備註 | ❌ | null | OWNER 填 |
| `sortNo` | 排序 | ✅ | 0 | OWNER 設 |
| `isActive` | 啟用狀態 | ✅ | true | OWNER 切換 |

## 4.2 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離 |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者 |

## 4.3 系統 seed 策略：空表進

⭐ Crown 業界 muscle memory 拍板（Q4 = A）：

每個品牌引擎命名方式差異大、無業界通用值可 seed、初始空表進、OWNER 自加業務日常接觸的引擎。

業界 OWNER 自加範例（不在 seed）：

- VAG 系列：EA888 / EA211 / EA827 / VR6
- Toyota 系列：2GR-FE / 1ZR-FE / 8AR-FTS
- BMW 系列：N20 / B48 / S55 / B58
- Mercedes-Benz 系列：M276 / M254 / M256
- Porsche 系列：MA1 / MA2 / 9A1

---

# § 5. 工作流程

## 5.1 系統初始化（空表）

1. 系統建立新 tenant 時、nx01_engine 空表進（無 seed apply）
2. tenant 啟用後、業務人員按需自加引擎

對齊 NX01-15 範式、跟「seed 最小骨架 + OWNER 自加」哲學一致、本表更激進、完全靠 OWNER 自加。

## 5.2 OWNER 新增業務日常使用的引擎（業界主流場景）

業界 muscle memory：經銷商按主推品牌、會建一批自家經營的引擎清單：

- VAG 經銷商 → 先建 EA888 / EA211（覆蓋 80% 業務）
- Toyota 經銷商 → 先建 2GR-FE / 1ZR-FE
- 多品牌綜合店 → 按主推品牌分批建

流程：

1. OWNER 進「引擎主檔列表」→ [新增]
2. 填 code = EA888、name = EA888 第三代 2.0T、displacementCc = 1984、cylinderConfig = 直 4、fuelType = 1 汽油、aspirationType = 2 TC 渦輪、carBrandId = VAG
3. [儲存] → 該 tenant 新引擎啟用
4. 後續 NX01-13 model 編輯頁下拉可選

## 5.3 OWNER 新增 EV / Hybrid 引擎（進階場景）

業界 muscle memory：EV 業務漸進、PRO 用戶會建 EV 引擎條目：

- Tesla Model 3 後驅單馬達
- Porsche Taycan 雙馬達
- Toyota Prius Hybrid 系統

流程：

1. OWNER 進「引擎主檔列表」→ [新增]
2. 填 code = TESLA-M3-RWD、name = Tesla Model 3 後驅電機、fuelType = 4 EV
3. displacementCc / cylinderConfig / aspirationType **全部不填**（EV 無此概念）
4. carBrandId = （業務自行決定、Tesla 不在系統 seed 4 主流、需 OWNER 先在 car_brand 加 TSLA）
5. [儲存] → 該 tenant 新引擎啟用

⭐ 對齊 §3.2：EV 燃料引擎業務真相、排氣量 / 缸數 / 增壓三欄保留 nullable、不強制填。

## 5.4 OWNER 調整呈現順序

業界真相：經銷商主推引擎不同：

- VAG 專營店 → EA888 / EA211 排前
- Toyota 專營店 → 2GR / 1ZR 排前

流程：編輯各引擎 sortNo、下拉即時反映。

## 5.5 一般用戶建 model 不填 engine_id（業務 muscle memory 場景）

業界真相：一般用戶（LITE 單店修車廠）建 model 時、可能不填引擎（不做數據化管理）。

流程：

1. 業務人員進 NX01-13 model 編輯頁
2. 填 car_brand = VAG、model_name = Golf、year = 2018
3. engine_id **不填**
4. [儲存] → model 仍可建立、不阻擋業務流程

⭐ 對齊 Crown 業界 muscle memory：詳細分類是進階用戶功能、不強制要求填。

## 5.6 異常：嘗試停用被引用的引擎

- 引擎 EA888 已被 N 筆 model 引用
- OWNER 點 [停用]
- 系統提示：「EA888 被 N 個車型引用、停用後下拉不再顯示、但歷史資料保留。確認停用？」
- OWNER [確認] → isActive = false

---

# § 6. 角色權限

| 角色 | 看引擎列表 | 新增引擎 | 改引擎欄位 | 停用 / 啟用 | 刪除 |
|------|---------|---------|-----------|-----------|------|
| SYSADMIN（跨租戶）| ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅（全 Tier 無上限）| ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |

⭐ tenant scoped 設計、無 seed 預設、無 code 鎖定限制（全是 OWNER 自加）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看引擎列表（read-only）| ✅ | ✅ | ✅ |
| OWNER 新增引擎（無上限）| ✅ | ✅ | ✅ |
| 在 model 引用時 engine_id nullable | ✅ | ✅ | ✅ |

→ 本表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 / NX01-15 拍板：型錄基礎功能不是訂閱差異化欄位
→ Crown 業界 muscle memory：詳細分類是進階用戶（PRO Yaro / 大型經銷商）會用、但不限制 LITE 用戶填寫

---

# § 8. 注音索引

❌ **不接入注音索引**。

⭐ 對齊 Crown 業界 muscle memory 拍板（NX01-12 / NX01-15 同範式）：車輛分類軸（car_brand / engine / transmission / drivetrain / model_type）一律不接注音、業界料號用英文 / 數字代碼（EA888 / 2GR-FE / N20）、注音 ROI 低。

注音索引保留給中文密集主檔（part / partner / user）。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-12 | Alex | 初版拍板版、11 段完整。Crown 拍 Q1=C（燃料 4 enum：汽油 / 柴油 / Hybrid / EV）+ Q2=A（增壓 4 enum）+ Q3=A（carBrandId nullable 保留）+ Q4=A（系統 seed 空表進）+ Q5=A（model 引用 nullable）。對齊 NX01-12 / NX01-15 拍板範式（tenant scoped + 全 Tier 對等 + 車輛分類軸不接注音 + 詳細分類是進階用戶功能不強制填）。本規格書直接走 v1.0、未經 v0.1.0、依拓樸排序第 3 份、Crown 業界 muscle memory 已沉澱可直接拍板。|

---

# § 10. 待 Hank grep 確認項

1. nx01_engine schema 真相揭露（預期 Hank 諮詢回報全未建、line 0）
   - 對照本規格 §4.1 / §4.2 欄位列表、從零建 migration
   - 含 carBrandId FK 接 nx01_car_brand（NX01-12 已落地）

2. fuelType / aspirationType enum 實作方式 Hank 自決
   - Prisma enum vs SmallInt + 業務層 enum 轉換、對齊 NEXORA 既有範式

3. EV 引擎業務檢核邏輯
   - displacementCc / cylinderConfig / aspirationType 三欄 EV 時可空
   - 業務層校驗 vs 純 schema nullable、Hank 自決

4. 跨軌依賴揭露給 NX01-13 model（戰略傳遞）
   - engine_id FK 在 model schema 預期 **nullable**（不強制填）
   - 對齊 Crown 業界 muscle memory：詳細分類進階功能、不阻擋基礎業務
   - NX01-13 規格書 v0.1.0 寫作時必對齊本拍板

5. UI 元件複用範式
   - 對齊 NX01-12 / NX01-15 既有型錄管理 UI 範式（BaseBrandLikeMasterView / BaseMasterPage）
   - Hank 自決細節

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 |
|------|------|------|
| 依賴（前置）| `nx01_car_brand`（NX01-12、已落地）| engine.carBrandId FK、可空 |
| 被依賴（核心）| `nx01_model`（NX01-13、後續）| model.engine_id FK、**nullable**（Crown 業界 muscle memory 拍板）|
| 被依賴（戰略）| `nx01_part_model`（NX01-16、後續）| 透過 model 間接 |
| 被依賴（業務）| NX03 即時查詢 / NX02 採購 | 透過 model 間接 |

⭐ 給 NX01-13 規格書作者注意：本表在 model 引用必須 nullable、不可寫成 NOT NULL、避免阻擋一般用戶建 model 基礎流程（對齊 NX01-15 三表同範式）。

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- 階段 1：schema migration（含 carBrandId FK 接 NX01-12）+ 空 seed apply 機制
- 階段 2：列表頁 + 編輯頁 UI（含 fuelType / aspirationType enum 下拉）
- 階段 3：EV 業務檢核邏輯（displacementCc / cylinderConfig / aspirationType nullable）
- 階段 4：下游驗證（NX01-13 model schema 含 engine_id nullable FK、路徑通）

NX01-13 model 落地後、本表才完整接通車型體系。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12 / NX01-15 範式、11 段完整。
> ⭐ 本表是 A 主檔（vs NX01-15 transmission 同 A 主檔複雜度）、車輛分類最後一個維度。
> ⭐ Crown 業界 muscle memory：seed 空表進、業界擴充 OWNER 自加、車輛分類軸不接注音、在 model 引用 nullable。
> ⭐ 本表 + NX01-12 + NX01-15 三規格書定義「車輛分類維度全套」、給 NX01-13 model 引用、組成完整車型基本資料。
