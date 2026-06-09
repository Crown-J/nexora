<!-- docs/nx01/spec/intent/nx01-13-model.md -->

# NEXORA NX01-13 車型主檔（nx01_model）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q5 全 A + 揭露車型代碼/全名雙軌設計
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-13-MODEL-SPEC-V1-01
> 性質：A 主檔（車輛分類核心、30 年資料承接核心、被 NX01-16 part_model 戰略引用）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_model` = NEXORA **車型主檔**、記錄具體車輛單位（如 `Golf 7 GTI 2017~2024 年式`）、給 NX01-16 part_model（料號 ↔ 車型關聯）戰略引用。

業務情境：業務人員查「Golf 7 GTI 適配哪些火星塞料號」、走 part_model 反查 model、所以 model 是料號 → 車輛適配的**核心交集**。

⭐ **Crown 業界 muscle memory 拍板（v1.0 核心揭露）**：

業界現況：汽車材料行用「備註欄」記錄車型、自由文字（如 `G7 GTI、17>24`）：

- 業務日常溝通快、好閱讀
- 但**無法數據分析**：每個業務人員打法不同、`G7 GTI` / `Golf7 GTI` / `Golf 7 代 GTI` 全指同一車

NEXORA 設計改革：把備註結構化、提供**車型代碼 + 全名雙欄位**：

- `code`（業界縮寫、業務日常溝通用、如 `G7-GTI`）
- `name`（正式全名、報表 / 客戶單據用、如 `Golf 7 GTI`）
- `modelYearFrom` / `modelYearTo`（INT、年份範圍結構化、業界備註「17>24」改成 2017 + 2024）

→ 業務日常打 code 快、需要正式資料時看 name、年份結構化支援報表 / 篩選。

## 1.2 戰略意義

NX01-13 model = **30 年資料承接核心**（overview §591 揭露）：

```
業務查料適配鏈：
part（料號）─< part_model >─ model ── car_brand
                              ↓
                              engine（可空）
                              transmission（可空）
                              drivetrain（可空）
                              model_type（可空）
```

→ model 規格寫得好、NX01-16 part_model 戰略才走得通。

## 1.3 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 預設無內容、提供框架由 tenant 自加 | 罕用 |
| OWNER | 新增業務日常接觸的車型（按品牌 / 年份擴充） | 開店初期 + 持續擴充 |
| PURCHASING / SALES | 建料號適配 / 查料時、下拉選車型 | **每天**（核心高頻使用） |
| WAREHOUSE | 看料號 → 車型反查、確認適配 | 偶爾 |

## 1.4 跨模組引用

- `nx01_car_brand`（NX01-12、已落地）：`model.car_brand_id` FK、**必填**（車型一定有品牌）
- `nx01_engine`（NX01-14、已落地）：`model.engine_id` FK、**nullable**
- `nx01_transmission`（NX01-15、規格 v1.0 / impl 未落地 ⚠️）：`model.transmission_id` FK、**nullable**
- `nx01_drivetrain`（NX01-15、規格 v1.0 / impl 未落地 ⚠️）：`model.drivetrain_id` FK、**nullable**
- `nx01_model_type`（NX01-15、規格 v1.0 / impl 未落地 ⚠️）：`model.model_type_id` FK、**nullable**
- 被引用 `nx01_part_model`（NX01-16、後續落地）：戰略表、本表是料號適配查詢的車型側
- `nx99_tenant`：tenant scoped、空表進、tenant 自加

⚠️ **#22 鐵律揭露**：NX01-15 三表規格 v1.0 但 impl 未落地（schema 0 / controller 0）、Hank 寫 NX01-13 impl 時要先補 NX01-15 schema、本軌範圍會擴張。

---

# § 2. UI 頁面

## 2.1 車型列表頁（`/master/model`）

- 顯示當前 tenant 可用的所有車型
- 表格欄位：車型代碼 / 車型全名 / 車型品牌 / 年份範圍 / 引擎 / 變速箱 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：車型品牌 / 燃料類型（透過 engine）/ 年份範圍（含 modelYearFrom）/ 啟用狀態
- 排序：依車型品牌（預設）→ 依車型代碼 / 依車型全名
- 搜尋：依 code / name 模糊搜尋

⭐ 業務日常使用情境：業務查料時、用 code（`G7-GTI`）快速定位車型、比 name 快。

## 2.2 車型編輯頁（`/master/model/:id/edit`）

**基本資訊：**

- 車型代碼（業界縮寫、必填、如 `G7-GTI`）
- 車型全名（正式名稱、必填、如 `Golf 7 GTI`）
- 車型品牌（下拉時依據【車型品牌型錄】之設定、必填）

**年份範圍（結構化）：**

- 起始年份（modelYearFrom、INT、必填、如 2017）
- 結束年份（modelYearTo、INT、可空、現役車型留空表示「至今」）

**車輛分類（全部可空、進階用戶填）：**

- 引擎（下拉時依據【引擎主檔】之設定、可空、依當前車型品牌篩選 carBrandId）
- 變速箱（下拉時依據【變速箱型錄】之設定、可空、依當前車型品牌篩選 carBrandId）
- 傳動方式（下拉時依據【傳動方式型錄】之設定、可空）
- 車體類型（下拉時依據【車體類型型錄】之設定、可空）

**呈現設定：**

- 備註（特殊版本說明 / 改款細節等）
- 排序（預設 0、由小到大）
- 啟用狀態（啟用 / 停用）

## 2.3 下拉選單（隱性使用、跨 NX01-16 part_model 編輯）

業務人員在 NX01-16 part_model 編輯頁、設定料號適配車型時出現。

下拉只顯示 `isActive = true` 的車型、顯示格式建議：`{car_brand.code} {code}（{name}）{modelYearFrom}~{modelYearTo}`

範例：`VAG G7-GTI（Golf 7 GTI）2017~2024`

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

- PK = `id`
- unique = `(tenantId, code)`（每租戶內、車型代碼唯一）
- tenant scoped、跨租戶代碼撞名不檢查（對齊 NX01-12 / NX01-14 / NX01-15 拍板）

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| code | ✅ | 字串 | tenant 內 unique、業界縮寫、tenant 自定格式 |
| name | ✅ | 字串 | 正式全名、業務看得懂 |
| carBrandId | ✅ | FK | 對應 car_brand 必存在 + isActive=true |
| modelYearFrom | ✅ | INT | 4 位年份（如 2017）、業務檢核 ≥ 1900 + ≤ 當前年+5 |
| modelYearTo | ❌ | INT | 4 位年份、可空（現役留空）、若填必 ≥ modelYearFrom |
| engineId | ❌ | FK | 對應 engine 必存在 + isActive=true |
| transmissionId | ❌ | FK | 對應 transmission 必存在 + isActive=true |
| drivetrainId | ❌ | FK | 對應 drivetrain 必存在 + isActive=true |
| modelTypeId | ❌ | FK | 對應 model_type 必存在 + isActive=true |
| remark | ❌ | 字串 | |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |

⭐ Crown 業界 muscle memory：5 個車輛分類 FK（engine + 三表）全 nullable、一般用戶可全空、進階用戶完整填寫。

## 3.3 年份範圍業務語意

- `modelYearFrom = 2017 / modelYearTo = 2024`：車型 2017~2024 年式（業界備註寫法「17>24」）
- `modelYearFrom = 2024 / modelYearTo = null`：2024 年式至今、現役車型
- `modelYearFrom = modelYearTo = 2024`：單年式車型（罕、特殊改款）

## 3.4 下拉選單聯動規則（建議、Hank 自決 UI 實作）

- 選 carBrandId 後、engine / transmission 下拉**優先顯示** 該品牌（carBrandId 相符）的選項
- 通用引擎 / 變速箱（carBrandId 空）仍顯示、放後段
- drivetrain / model_type 不依品牌篩選（業界通用）

## 3.5 跨主檔連動

- 上游 5 FK：car_brand（必）+ engine / transmission / drivetrain / model_type（可空）
- 下游被引用：nx01_part_model（NX01-16、戰略表）

## 3.6 軟刪除 vs 停用

- 車型 isActive=false → 下拉不顯示、不能用於新建 part_model
- 已建 part_model 引用保留（不阻擋歷史適配資料）
- 被 part_model 引用 → 不可刪、只能停用
- 未被引用（剛建錯）→ 可真刪

---

# § 4. 欄位列表

## 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 車型代碼（業界縮寫）| ✅ | 無 | OWNER 填、tenant 自定格式 |
| `name` | 車型全名（正式名稱）| ✅ | 無 | OWNER 填 |
| `carBrandId` | 車型品牌 FK | ✅ | 無 | OWNER 選 |
| `modelYearFrom` | 起始年份 | ✅ | 無 | OWNER 填、4 位 INT |
| `modelYearTo` | 結束年份 | ❌ | null | OWNER 填、現役留空 |
| `engineId` | 引擎 FK | ❌ | null | OWNER 選、可空 |
| `transmissionId` | 變速箱 FK | ❌ | null | OWNER 選、可空 |
| `drivetrainId` | 傳動方式 FK | ❌ | null | OWNER 選、可空 |
| `modelTypeId` | 車體類型 FK | ❌ | null | OWNER 選、可空 |
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

⭐ 對齊 Crown 業界 muscle memory（Q4 拍 A）：

每個品牌車型數量上千、每個 tenant 經營範圍不同（VAG 專營店 vs 多品牌綜合店）、無業界通用值可 seed、初始空表進、OWNER 自加業務日常接觸的車型。

業界 OWNER 自加範例（不在 seed）：

- VAG 系列：G7-GTI（Golf 7 GTI）/ G8（Golf 8）/ A4-B9（Audi A4 B9 底盤）
- Toyota 系列：CAMRY-XV70 / RAV4-XA50
- BMW 系列：F30（3 系列 F30 底盤）/ G20（3 系列 G20 底盤）

---

# § 5. 工作流程

## 5.1 系統初始化（空表）

1. 系統建立新 tenant 時、nx01_model 空表進（無 seed apply）
2. tenant 啟用後、業務人員按需自加車型

## 5.2 OWNER 新增業務日常使用的車型（業界主流場景）

業界 muscle memory：經銷商按主推品牌、建一批自家經營的車型清單：

- VAG 經銷商 → 先建 Golf 系列（G7 / G7-GTI / G8）、Passat 系列、Tiguan 系列
- 多品牌綜合店 → 按主推品牌分批建

流程：

1. OWNER 進「車型主檔列表」→ [新增]
2. 填基本資訊：
   - code = `G7-GTI`
   - name = `Golf 7 GTI`
   - carBrandId = VAG
3. 填年份：
   - modelYearFrom = 2017
   - modelYearTo = 2024
4. 進階用戶補車輛分類（可全空）：
   - engineId = EA888（VAG）
   - transmissionId = DSG7（VAG）
   - drivetrainId = FF
   - modelTypeId = HAT
5. [儲存] → 該 tenant 新車型啟用
6. 後續 NX01-16 part_model 編輯頁下拉可選

## 5.3 一般用戶建車型只填核心欄位（業務 muscle memory 場景）

業界真相：一般用戶（LITE 單店修車廠）建車型時、只填核心識別、車輛分類全空：

流程：

1. OWNER 進「車型主檔列表」→ [新增]
2. 填核心識別：
   - code = `G7-GTI`
   - name = `Golf 7 GTI`
   - carBrandId = VAG
   - modelYearFrom = 2017
   - modelYearTo = 2024
3. **engineId / transmissionId / drivetrainId / modelTypeId 全部不填**
4. [儲存] → 車型仍可建立、後續料號適配查詢仍可走

⭐ 對齊 Crown 業界 muscle memory：詳細分類是進階用戶功能、不阻擋基礎業務。

## 5.4 OWNER 新增現役車型（modelYearTo 留空）

業界場景：剛上市的新車型、結束年份未知：

1. OWNER [新增] 車型
2. modelYearFrom = 2024
3. modelYearTo **不填**（系統理解為「至今」）
4. [儲存]

未來車型停產後、OWNER 可回頭補 modelYearTo。

## 5.5 OWNER 編輯舊車型補資料（業務 muscle memory 場景）

業界場景：早期建立的車型只有 code + name + carBrand + 年份、後來進階用戶想做料號適配分析、需要補車輛分類資料：

1. OWNER 進「車型主檔列表」→ 編輯 `G7-GTI`
2. 補 engineId = EA888 / transmissionId = DSG7 / drivetrainId = FF / modelTypeId = HAT
3. [儲存] → 後續料號適配查詢可走 engine / transmission 維度

⭐ 漸進補資料 = NEXORA 數據化管理的演化路徑、對齊 Crown 業界 muscle memory「不強制要求一定要填」。

## 5.6 異常：嘗試停用被引用的車型

- 車型 G7-GTI 已被 N 筆 part_model 引用（料號適配）
- OWNER 點 [停用]
- 系統提示：「G7-GTI 被 N 筆料號適配引用、停用後下拉不再顯示、但歷史資料保留。確認停用？」
- OWNER [確認] → isActive = false

## 5.7 異常：modelYearTo < modelYearFrom

- OWNER 填 modelYearFrom = 2024 / modelYearTo = 2017（業務人員 typo）
- 系統拒絕：「結束年份不可早於起始年份」

---

# § 6. 角色權限

| 角色 | 看車型列表 | 新增車型 | 改車型欄位 | 停用 / 啟用 | 刪除 |
|------|---------|---------|-----------|-----------|------|
| SYSADMIN（跨租戶）| ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅（全 Tier 無上限）| ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |

⭐ tenant scoped 設計、無 seed 預設、無 code 鎖定限制（全是 OWNER 自加）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看車型列表（read-only）| ✅ | ✅ | ✅ |
| OWNER 新增車型（無上限）| ✅ | ✅ | ✅ |
| 核心識別欄位（code / name / carBrand / year）| ✅ | ✅ | ✅ |
| 車輛分類欄位（engine / transmission / drivetrain / model_type、全 nullable）| ✅ | ✅ | ✅ |

→ 本表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 / NX01-14 / NX01-15 拍板：型錄基礎功能不是訂閱差異化欄位
→ Crown 業界 muscle memory：車型 + 年份是業界全 Tier 共通需求、詳細分類是進階用戶選填

---

# § 8. 注音索引

❌ **不接入注音索引**。

⭐ 對齊 Crown 業界 muscle memory 拍板（NX01-12 / NX01-14 / NX01-15 同範式）：車輛分類軸（car_brand / model / engine / transmission / drivetrain / model_type）一律不接注音、業界用英文 / 數字代碼（VAG / G7-GTI / EA888 / DSG7）、注音 ROI 低。

注音索引保留給中文密集主檔（part / partner / user）。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-12 | Alex | 初版拍板版、11 段完整。Crown 拍 Q1~Q5 全 A + 揭露關鍵業界 muscle memory：(1) 業界現況用「備註欄」記車型（如「G7 GTI、17>24」）、無結構化、無法數據分析(2) NEXORA 改革設計 = 車型代碼 + 全名雙欄位（code 業界縮寫日常用 / name 正式全名單據用）(3) 年份結構化兩欄 modelYearFrom / modelYearTo INT、業界備註「17>24」改成 2017+2024(4) 5 個車輛分類 FK 全 nullable（engine + 三表）對齊 Crown 業界 muscle memory「詳細分類進階用戶選填」(5) 注音索引不接、對齊車輛分類軸範式。本規格書直接走 v1.0、未經 v0.1.0、依拓樸排序第 4 份、Crown 業界 muscle memory 已沉澱可直接拍板。⚠️ #22 鐵律揭露：NX01-15 三表規格 v1.0 但 impl 未落地、Hank 寫 NX01-13 impl 時要先補 NX01-15 schema。|

---

# § 10. 待 Hank grep 確認項

1. nx01_model schema 真相揭露（預期 Hank 諮詢回報全未建、line 0）
   - 對照本規格 §4.1 / §4.2 欄位列表、從零建 migration
   - 含 5 個 FK：carBrandId（NN）+ engineId / transmissionId / drivetrainId / modelTypeId（nullable）

2. NX01-15 三表 impl 真相 verify（⚠️ #22 鐵律觸發）
   - transmission / drivetrain / model_type schema 預期 0
   - Hank 寫 NX01-13 impl 時要先補 NX01-15 schema、本軌範圍會擴張（類似 NX01-12-IMPL-v2 三模組同軌）
   - 預估本軌範圍 = NX01-15（3 表）+ NX01-13（1 表）= 4 表 schema + 4 模組 controller / UI

3. modelYearFrom / modelYearTo INT 業務檢核實作
   - schema 純 INT nullable / 業務層校驗（≥ 1900 + ≤ 當前年+5 + To ≥ From）
   - Hank 自決 service 層 vs DB constraint

4. 下拉選單聯動規則實作（§3.4）
   - 選 carBrandId 後、engine / transmission 下拉依品牌篩選
   - 純前端 filter / API query parameter、Hank 自決

5. UI 元件複用範式
   - 對齊 NX01-12 / NX01-14 既有型錄管理 UI 範式（BaseBrandLikeMasterView）
   - 本表欄位多（12 個業務欄位 vs car_brand 10 個 / engine 10 個）、UI 可能需自訂排版
   - Hank 自決

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 | impl 狀態 |
|------|------|------|----------|
| 依賴（前置）| `nx01_car_brand`（NX01-12）| model.carBrandId FK、**必填** | ✅ schema + controller 落地 |
| 依賴（前置）| `nx01_engine`（NX01-14）| model.engineId FK、nullable | ✅ schema + controller 落地 |
| 依賴（前置）| `nx01_transmission`（NX01-15）| model.transmissionId FK、nullable | ⚠️ **規格 v1.0、schema 0、controller 0** |
| 依賴（前置）| `nx01_drivetrain`（NX01-15）| model.drivetrainId FK、nullable | ⚠️ **規格 v1.0、schema 0、controller 0** |
| 依賴（前置）| `nx01_model_type`（NX01-15）| model.modelTypeId FK、nullable | ⚠️ **規格 v1.0、schema 0、controller 0** |
| 被依賴（戰略）| `nx01_part_model`（NX01-16、後續）| 料號適配核心、戰略表 | 規格 / impl 全待建 |
| 被依賴（業務）| NX03 即時查詢 / NX02 採購 | 透過 part_model 間接 | — |

⭐ #22 鐵律揭露：NX01-15 三表 impl 未落地、Hank 寫 NX01-13 impl 時要先處理。

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- **階段 0（前置）**：NX01-15 三表 schema + controller + 空 seed apply
  - 對齊 NX01-15 v1.0 規格、Hank 自決拆軌
  - 預估子 commit：transmission / drivetrain / model_type 各 1 commit + UI 1 commit
- **階段 1**：nx01_model schema migration（含 5 FK）+ 空 seed apply
- **階段 2**：列表頁 + 編輯頁 UI（含 5 個下拉、carBrand 聯動篩選 engine / transmission）
- **階段 3**：年份範圍業務檢核（modelYearTo ≥ modelYearFrom）
- **階段 4**：下游驗證（NX01-16 part_model schema 含 model_id FK、留待 NX01-16 軌）

⭐ 本軌類似 NX01-12-IMPL-v2 三模組同軌範式（schema + impl 多表合一軌）、Hank 拆軌策略可參考。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12 / NX01-14 範式、11 段完整。
> ⭐ 本表是車輛分類核心、A 主檔、30 年資料承接核心、被 NX01-16 part_model 戰略引用。
> ⭐ Crown 業界 muscle memory：NEXORA 改革「備註欄自由文字」→「結構化雙欄位（code + name）+ 年份 INT」、解決業界無法數據分析痛點。
> ⭐ 5 個車輛分類 FK 全 nullable、對齊 Crown 業界揭露「詳細分類進階用戶選填」+ NX01-15 三表拍板。
> ⚠️ #22 鐵律觸發：NX01-15 三表 impl 未落地、Hank 寫 NX01-13 impl 時範圍會擴張。
