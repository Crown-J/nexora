<!-- docs/nx01/spec/intent/nx01-07-base-catalog.md -->

# NEXORA NX01-07 基礎型錄管理（5 表合一）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q4 全 A + 揭露 5 表既有真相
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-07-BASE-CATALOG-SPEC-V1-01
> 性質：B 型錄合一規格書（5 表混合 2 種範式：全域型錄 + tenant scoped、含 3 個戰略欄位）
> 對應資料表：nx01_part_brand / nx01_warehouse_type / nx01_customer_grade / nx01_currency / nx01_part_group

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_part_brand` / `nx01_warehouse_type` / `nx01_customer_grade` / `nx01_currency` / `nx01_part_group` = NEXORA **5 個基礎型錄**、橫向支撐 NX01-05 part / NX01-06 warehouse / NX01-03 partner 等多個核心主檔。

5 表合一規格書理由：

- 業務語意都是「型錄級基礎資料」
- 5 表本身沒互相 FK 引用（彼此獨立）
- 統一拍板「型錄維護權限」+「全域 vs tenant scoped 範式」+「戰略欄位處理」

⭐ **Crown 業界 muscle memory 拍板（v1.0 核心揭露）**：

5 表非單純型錄、藏 3 個戰略欄位：

| 表 | 戰略欄位 | 業務影響 |
|---|---|---|
| warehouse_type | `flowMode`（C 集中 / D 分倉）| 控制進貨後自動調撥邏輯、對齊 6 倉模型 HW1+MW1+BW1~4 |
| customer_grade | `marginPct`（最低毛利率 %）| 售價檢核「不得低於 成本×(1+marginPct/100)」 |
| currency | `decimalPlaces` / `symbol` | 影響業務單據金額顯示精度（TWD=0 / USD=2）|

5 表混合 2 種範式：

| 範式 | 表 | 維護權 |
|---|---|---|
| 全域型錄（無 tenantId、unique by code）| warehouse_type / currency | SYSADMIN 維護、tenant read-only / 部分 CRUD |
| tenant scoped（unique by (tenantId, code)）| part_brand / customer_grade / part_group | OWNER 維護 |

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 維護全域型錄（warehouse_type / currency 系統 seed）| 罕用 |
| OWNER | 維護 tenant 自家型錄（part_brand / customer_grade / part_group）| 開店初期 + 偶爾擴充 |
| PURCHASING / SALES / WAREHOUSE | 建主檔 / 查資料時、下拉選型錄 | 每天（隱性高頻使用）|

## 1.3 跨模組引用（reverse 真相揭露）

| 表 | 被引用點 | 戰略意義 |
|---|---|---|
| currency | 10 個（Partner + Quote + So + ApLedger + ArLedger + Note + Paylog + Subscription + RfqItem + RrImport + Ti）| ⭐ 戰略型錄、影響全業務模組 |
| customer_grade | 2（Partner / Quote）| 影響客戶分級 + 報價毛利檢核 |
| part_brand | 2（Part / Nx03StItem）| 影響料號 + 調撥單品牌追溯 |
| part_group | 1（Part）| 影響料號分類 |
| warehouse_type | 1（Warehouse）| 影響倉庫類型分流 + 自動調撥 |

⭐ currency 是 NEXORA 戰略型錄、本表設計變動影響全 9 個業務模組。

## 1.4 5 表特性對照

| 維度 | part_brand | warehouse_type | customer_grade | currency | part_group |
|------|-----------|---------------|----------------|----------|------------|
| 範式 | tenant scoped | 全域 | tenant scoped | 全域 | tenant scoped |
| seed 層 | template | system | template | system | template |
| 業務分類 | B 型錄 | B 型錄（含 flowMode 戰略）| B 型錄（含 marginPct 戰略）| B 型錄（含 decimalPlaces 戰略）| B 型錄 |
| seed 量級 | 10 筆（業界德國品牌主流）| 4 筆（H/M/W/S）| 4 筆（A/B/C/D + marginPct）| 4 筆（TWD/USD/EUR/JPY）| 6 筆（ENGINE/BRAKE/FILTER/ELECTRIC/BODY/OTHER）|
| OWNER 維護權 | ✅ CRUD | ❌ 全域固定 | ✅ 改 marginPct、code 鎖定 | ✅ CRUD（保現況）| ✅ CRUD |
| 需注音索引 | ❌（業界英文縮寫）| ❌（量小、英文代碼）| ❌（量小、英文代碼）| ❌（ISO 4217 英文）| ❌（業界英文分類）|

⭐ 對齊 Crown 業界 muscle memory：全 5 表不接注音、對齊「車輛分類軸不接注音」同範式擴展到「橫向型錄軸」。

---

# § 2. UI 頁面

## 2.1 part_brand（零件品牌型錄）

### 2.1.1 列表頁（`/master/part-brand`）

- 顯示當前 tenant 可用的所有零件品牌
- 表格欄位：品牌代碼 / 品牌名稱 / 原產國 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：原產國 / 啟用狀態
- 排序：依 sortNo

### 2.1.2 編輯頁

- 品牌代碼（VARCHAR(3) 緊縮、業界 3 字元慣例、如 BOS / MAN / NGK）
- 品牌名稱（如 BOSCH / Mann / NGK）
- 原產國（下拉時依據【國家檔】之設定、可空）
- 備註
- 排序 / 啟用狀態

⭐ 系統 seed 10 個業界主流品牌（VAG / BOS / HEL / MAN / MAH / LEM / SAC / ATE / NGK / GEN、反映 Yaro / 恆迎 VAG 經銷商視角）、tenant 可自加擴充。

## 2.2 warehouse_type（倉庫類型型錄）

### 2.2.1 列表頁（`/master/warehouse-type`）

- 顯示系統 4 種倉別類型（全域、所有 tenant 共用）
- 表格欄位：代碼 / 名稱 / 流模式（C 集中 / D 分倉）/ 排序 / 啟用狀態
- 動作：[編輯]（僅啟用 / 停用 / 排序 + 描述）、**無新增** ⭐

### 2.2.2 編輯頁

- 代碼（H / M / W / S、唯讀、SYSADMIN 設定）
- 名稱（總部集中倉 / 主倉 / 分倉 / 衛星倉）
- **流模式**（C 集中管理 / D 分倉管理、戰略欄位、控制進貨後自動調撥邏輯、唯讀對 OWNER）
- 描述
- 排序 / 啟用狀態

⭐ Crown 業界 muscle memory 拍板 Q2 = A：6 倉模型 H/M/W/S 是 NEXORA 戰略設計、tenant 不可新增（避免破壞 flowMode 自動調撥邏輯）。

## 2.3 customer_grade（客戶等級型錄）

### 2.3.1 列表頁（`/master/customer-grade`）

- 顯示當前 tenant 可用的客戶等級（系統 seed 4 級 A/B/C/D）
- 表格欄位：等級代碼 / 等級名稱 / 最低毛利率（%）/ 排序 / 啟用狀態
- 動作：[編輯]（僅啟用 / 停用 / 排序 + 名稱 + marginPct）、**無新增、code 鎖定** ⭐
- 排序：依 sortNo

### 2.3.2 編輯頁

- 等級代碼（A / B / C / D、唯讀、code 鎖定保護下游引用穩定）
- 等級名稱（A 級 / B 級 / C 級 / D 級、tenant 可改）
- **最低毛利率 marginPct**（Decimal(5,2)、戰略欄位、業務檢核「售價 ≥ 成本×(1+marginPct/100)」、tenant 可改）
- 排序 / 啟用狀態

⭐ Crown 業界 muscle memory 拍板 Q1 = A：marginPct 業務日常會調（不同客戶等級毛利策略不同）、tenant 可改、但 code 鎖定避免下游 reverse 引用斷裂。

## 2.4 currency（幣別型錄）

### 2.4.1 列表頁（`/master/currency`）

- 顯示系統可用幣別（全域、4 筆 seed TWD/USD/EUR/JPY）
- 表格欄位：幣別代碼 / 名稱 / 符號 / 小數位 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]

### 2.4.2 編輯頁

- 幣別代碼（ISO 4217、如 TWD / USD / EUR / JPY）
- 幣別名稱（新台幣 / 美元 / 歐元 / 日圓）
- 符號（NT$ / $ / € / ¥）
- **小數位**（decimalPlaces INT、預設 2、戰略欄位、TWD=0 / USD=2 / JPY=0）
- 排序 / 啟用狀態

⭐ Crown 業界 muscle memory 拍板 Q4 = A：保現況 OWNER CRUD、避免範式遷移擾動本軌。

## 2.5 part_group（料群型錄）

### 2.5.1 列表頁（`/master/part-group`）

- 顯示當前 tenant 可用的料群（系統 seed 6 大類）
- 表格欄位：料群代碼 / 名稱 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]

### 2.5.2 編輯頁

- 料群代碼（如 ENGINE / BRAKE / FILTER / ELECTRIC / BODY / OTHER）
- 料群名稱（引擎系統 / 煞車系統 / 濾清油水 / 電系 / 車身底盤 / 其他）
- 備註
- 排序 / 啟用狀態

⭐ Crown 業界 muscle memory 拍板 Q3 = A：本軌補建 part_group 後端 controller（既有 UI 已建但後端 0）、接通真實後端。

## 2.6 下拉選單（隱性使用、跨多個畫面）

5 表透過下拉支撐其他主檔建立流程：

- part_brand：NX01-11 brand_code_rule 編輯（料號編碼規則對應零件品牌、注意：car_brand 跟 part_brand 業務語意不同、car_brand 是車廠）
- warehouse_type：NX01-06 warehouse 編輯（倉庫類型、決定 flowMode 自動調撥）
- customer_grade：NX01-03 partner 編輯（客戶等級）/ NX02 報價（毛利檢核）
- currency：NX01-03 partner 編輯（往來幣別）/ NX02 採購單 / NX04 銷貨單 / 全業務模組
- part_group：NX01-05 part 編輯（料號分類）

---

# § 3. 業務規則

## 3.1 PK + unique 範圍

| 表 | PK | unique 範圍 |
|---|---|---|
| part_brand | id | (tenantId, code) |
| warehouse_type | id | (code) 全域 |
| customer_grade | id | ⚠️ schema 無 unique、業務層保護「tenant 內 A/B/C/D 不重複」（A 系列候選） |
| currency | id | (code) 全域 |
| part_group | id | (tenantId, code) |

對齊 NX01-12 / NX01-14 / NX01-15 範式：tenant scoped 表跨租戶代碼撞名不檢查。

## 3.2 業務檢核（戰略欄位重點）

### 3.2.1 warehouse_type.flowMode（戰略）

- C = 集中管理（進貨後自動調撥到下游分倉、典型主倉範式）
- D = 分倉管理（進貨後保留本倉、不自動調撥）
- ⭐ 對齊 6 倉模型：H 總部集中倉 = C / M 主倉 = C / W 分倉 = D / S 衛星倉 = D
- OWNER 不可改、SYSADMIN 維護

### 3.2.2 customer_grade.marginPct（戰略）

- Decimal(5,2)、範圍 0~99.99（%）
- 業務檢核：建報價 / 銷貨單時、售價必滿足 `售價 ≥ 成本 × (1 + marginPct/100)`
- 系統 seed 4 級：A 12% / B 15% / C 18% / D 22%
- OWNER 可改 marginPct、code 鎖定不可改

### 3.2.3 currency.decimalPlaces（戰略）

- INT、預設 2、業界範圍 0~4
- 影響業務單據金額顯示：TWD=0（NT$1,234）/ USD=2（$12.34）/ JPY=0
- OWNER 可改（保現況）

## 3.3 跨主檔連動

對齊 §1.3 reverse 引用真相：

- currency 變動影響 10 個業務模組（最高戰略影響）
- customer_grade.marginPct 變動立即影響業務檢核（既有報價單不重算、新建單套用新 marginPct）
- warehouse_type.flowMode 變動影響進貨後調撥邏輯（極罕、SYSADMIN 維護）

## 3.4 軟刪除 vs 停用

- 5 表 isActive=false → 下拉不顯示
- 已建主檔引用保留（不阻擋歷史資料）
- 被引用 → 不可刪、只能停用
- 未被引用 → 可真刪
- 系統 seed（warehouse_type 4 / currency 4 / customer_grade 4 / part_brand 10 / part_group 6）可停用、不可刪除

---

# § 4. 欄位列表

## 4.1 nx01_part_brand 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `code` | 品牌代碼 VARCHAR(3) | ✅ | 無 |
| `name` | 品牌名稱 | ✅ | 無 |
| `countryId` | 原產國 FK | ❌ | null |
| `remark` | 備註 | ❌ | null |
| `sortNo` | 排序 | ✅ | 0 |
| `isActive` | 啟用 | ✅ | true |
| tenantId / audit 5 | 系統自動 | - | - |

⚠️ code VARCHAR(3) 業界縮寫慣例（vs car_brand VARCHAR(30)）、業界 muscle memory 限制（A022 family 已揭露）。

## 4.2 nx01_warehouse_type 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `code` | 倉別代碼 VARCHAR(1) | ✅ | 無（系統 seed H/M/W/S）|
| `name` | 倉別名稱 | ✅ | 無 |
| `flowMode` | 流模式 VARCHAR(1) ⭐ 戰略 | ✅ | 無（C / D）|
| `description` | 描述 | ❌ | null |
| `sortNo` | 排序 | ✅ | 0 |
| `isActive` | 啟用 | ✅ | true |

⚠️ 全域型錄、無 tenantId、無 audit 5 欄。

## 4.3 nx01_customer_grade 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `code` | 等級代碼 VARCHAR(10) | ✅ | 無（系統 seed A/B/C/D 鎖定）|
| `name` | 等級名稱 VARCHAR(50) | ✅ | 無 |
| `marginPct` | 最低毛利率 Decimal(5,2) ⭐ 戰略 | ✅ | 無 |
| `sortNo` | 排序 | ✅ | 0 |
| `isActive` | 啟用 | ✅ | true |
| tenantId / audit 5 | 系統自動 | - | - |

## 4.4 nx01_currency 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `code` | 幣別代碼 VARCHAR(3) ISO 4217 | ✅ | 無 |
| `name` | 幣別名稱 VARCHAR(100) | ✅ | 無 |
| `symbol` | 符號 VARCHAR(5) | ❌ | null |
| `decimalPlaces` | 小數位 INT ⭐ 戰略 | ✅ | 2 |
| `sortNo` | 排序 | ✅ | 0 |
| `isActive` | 啟用 | ✅ | true |
| audit 5 | 系統自動 | - | - |

⚠️ 全域型錄、無 tenantId。

## 4.5 nx01_part_group 欄位

| 欄位 | 業務語意 | 必填 | 預設值 |
|------|---------|-----|-------|
| `code` | 料群代碼 VARCHAR(30) | ✅ | 無 |
| `name` | 料群名稱 VARCHAR(100) | ✅ | 無 |
| `sortNo` | 排序 | ✅ | 0 |
| `isActive` | 啟用 | ✅ | true |
| tenantId / audit 5 | 系統自動 | - | - |

## 4.6 系統 seed 完整真相

### part_brand seed（10 筆、業界主流德國品牌、tenant 開通時 apply）

| code | name | countryId |
|------|------|-----------|
| VAG | Volkswagen AG | DEU |
| BOS | Bosch | DEU |
| HEL | Hella | DEU |
| MAN | Mann | DEU |
| MAH | Mahle | DEU |
| LEM | Lemfoerder | DEU |
| SAC | Sachs | DEU |
| ATE | ATE | DEU |
| NGK | NGK | JPN |
| GEN | Generic | (空)|

⭐ 反映 Yaro / 恆迎 VAG 經銷視角、tenant 可自加 Toyota / Honda / Hyundai 等亞洲品牌副廠。

### warehouse_type seed（4 筆、全域、SYSADMIN 維護、對齊 6 倉模型）

| code | name | flowMode |
|------|------|----------|
| H | 總部集中倉 | C 集中 |
| M | 主倉 | C 集中 |
| W | 分倉 | D 分倉 |
| S | 衛星倉 | D 分倉 |

### customer_grade seed（4 筆、tenant 開通時 apply）

| code | name | marginPct |
|------|------|-----------|
| A | A 級 | 12.00 |
| B | B 級 | 15.00 |
| C | C 級 | 18.00 |
| D | D 級 | 22.00 |

⭐ marginPct 由 SYSADMIN seed 預設、tenant 可改、code 鎖定。

### currency seed（4 筆、全域、SYSADMIN 維護）

| code | name | symbol | decimalPlaces |
|------|------|--------|---------------|
| TWD | 新台幣 | NT$ | 0 |
| USD | 美元 | $ | 2 |
| EUR | 歐元 | € | 2 |
| JPY | 日圓 | ¥ | 0 |

### part_group seed（6 筆、業界料件 6 大類、tenant 開通時 apply）

| code | name |
|------|------|
| ENGINE | 引擎系統 |
| BRAKE | 煞車系統 |
| FILTER | 濾清油水 |
| ELECTRIC | 電系 |
| BODY | 車身底盤 |
| OTHER | 其他 |

---

# § 5. 工作流程

## 5.1 系統初始化（5 表 seed apply）

1. 系統建立新 tenant 時：
   - **全域 seed**（warehouse_type 4 / currency 4）：跨 tenant 共用、不 apply
   - **template seed**（part_brand 10 / customer_grade 4 / part_group 6）：tenant 開通時 apply、各 tenant 各自 copy
2. tenant 啟用後業務可使用

## 5.2 OWNER 新增 tenant scoped 型錄條目（part_brand / part_group）

業務 muscle memory：

- VAG 專營店補 Audi / Skoda / Porsche 子品牌
- 多品牌綜合店補 Toyota / Honda / Hyundai 副廠
- 料件 group 補「輪胎」「冷氣」等業界次分類

流程：

1. OWNER 進對應型錄列表 → [新增]
2. 填代碼 / 名稱 / 排序
3. [儲存] → 該 tenant 新條目啟用

## 5.3 OWNER 改 customer_grade marginPct（業務戰略場景）

業務 muscle memory：經銷商按市場策略調整毛利門檻：

- 競爭激烈 → A 級毛利率調 10%（鬆綁業務）
- 高毛利策略 → 全 4 級調高（拉高市場定位）

流程：

1. OWNER 進「客戶等級型錄列表」→ 編輯 A 級
2. 改 marginPct = 10.00
3. [儲存] → 後續報價 / 銷貨單套用新 marginPct
4. 既有單據保留歷史 marginPct（不重算）

⭐ code 鎖定不可改（A/B/C/D 保護下游 partner / quote 引用）。

## 5.4 SYSADMIN 改 warehouse_type / currency 全域型錄（罕用）

業務真相：全域型錄極少改、SYSADMIN 介面預留：

- 新增業界稀有幣別（如 CNY / KRW）
- 調整 flowMode（極罕、會影響全 tenant 自動調撥）

流程：SYSADMIN 後台介面進場、本規格書不詳列（NX99 系統管理範圍）。

## 5.5 異常：嘗試刪除被引用的型錄條目

- currency TWD 已被 10 個業務模組引用
- SYSADMIN 點 [刪除]
- 系統拒絕：「TWD 被 N 筆 partner / quote / so 引用、不可刪除、僅可停用」

## 5.6 異常：嘗試改 seed 鎖定欄位

- OWNER 編輯 customer_grade A → 嘗試改 code = AAA
- 系統拒絕：「系統預設等級代碼不可修改、僅可調整名稱 / 毛利率 / 排序」

---

# § 6. 角色權限

## 6.1 part_brand（tenant scoped）

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅ read-only | ❌ | ❌ | ❌ | ❌ |

## 6.2 warehouse_type（全域、Q2=A 拍板）

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ read-only | ❌ | ❌ 改名稱 / sortNo 視 SYSADMIN 開放 | ❌ | ❌ |
| 其他角色 | ✅ read-only | ❌ | ❌ | ❌ | ❌ |

⭐ 6 倉模型固定、tenant 不可加、flowMode 戰略保護。

## 6.3 customer_grade（tenant scoped、Q1=A 拍板）

| 角色 | 看 | 新增 | 改 marginPct / 名稱 / 排序 | 改 code | 停用 / 啟用 | 刪除 |
|------|---|------|--------------------------|---------|-----------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅（罕用）| ✅ | ✅ |
| OWNER | ✅ 自租戶 | ❌（系統 4 級固定）| ✅ | ❌（code 鎖定）| ✅ | ❌ |
| 其他角色 | ✅ read-only | ❌ | ❌ | ❌ | ❌ | ❌ |

⭐ marginPct 開放、code 鎖定、4 級數量固定（A/B/C/D）、對齊 NX01-12 seed code lock 範式。

## 6.4 currency（全域、Q4=A 拍板保現況）

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ | ✅ | ✅ | ✅ | ❌（系統 seed 鎖定）|
| 其他角色 | ✅ read-only | ❌ | ❌ | ❌ | ❌ |

⭐ 保現況 OWNER CRUD、避免範式遷移擾動本軌（A059 後續軌處理）。

## 6.5 part_group（tenant scoped）

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| 其他角色 | ✅ read-only | ❌ | ❌ | ❌ | ❌ |

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看 5 表（read-only）| ✅ | ✅ | ✅ |
| 系統 seed 28 筆（10+4+4+4+6）| ✅ | ✅ | ✅ |
| OWNER 新增 part_brand / part_group / currency（無上限）| ✅ | ✅ | ✅ |
| OWNER 改 customer_grade marginPct | ✅ | ✅ | ✅ |
| warehouse_type tenant 不可加 | ❌ | ❌ | ❌ |
| 注音快搜 | ❌ | ❌ | ❌ |

→ 5 表核心功能全 Tier 對等支援、無 Tier 差異
→ 對齊 NX01-12 / NX01-14 / NX01-15 拍板：型錄基礎功能不是訂閱差異化欄位

---

# § 8. 注音索引

❌ **5 表全部不接入注音索引**。

⭐ 對齊 Crown 業界 muscle memory 拍板（NX01-12 / NX01-14 / NX01-15 同範式擴展）：

| 表 | 業界搜尋習慣 |
|---|---|
| part_brand | 英文縮寫（BOS / MAN / NGK）|
| warehouse_type | 英文代碼（H / M / W / S）|
| customer_grade | 英文代碼（A / B / C / D）|
| currency | ISO 4217（TWD / USD）|
| part_group | 英文分類（ENGINE / BRAKE）|

注音索引保留給中文密集主檔（part / partner / user）。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-12 | Alex | 初版拍板版、11 段完整。Crown 拍 Q1~Q4 全 A + Hank audit 揭露 6 個關鍵真相：(1) 5 表混合 2 種範式（全域 2 + tenant scoped 3）、權限矩陣分軌(2) 戰略欄位揭露：warehouse_type.flowMode / customer_grade.marginPct / currency.decimalPlaces(3) Q1=A customer_grade marginPct 開放 OWNER 編輯、code 鎖定保護下游(4) Q2=A warehouse_type 全域固定、tenant 不可加（保護 6 倉模型 flowMode 自動調撥）(5) Q3=A 本軌補建 part_group 後端 controller（既有 UI 已建 / 後端 0）(6) Q4=A currency 保現況 OWNER CRUD（避免範式遷移擾動本軌）。本規格書直接走 v1.0、未經 v0.1.0、依拓樸排序第 5 份、Hank audit 真相 + Crown 業界 muscle memory 已沉澱可直接拍板。|

---

# § 10. 待 Hank grep 確認項

1. 5 表 schema 既有狀態揭露（Hank audit 已 verify、無需重 grep）
   - part_brand line 801~833 / warehouse_type line 1423~1442 / customer_grade line 417~445 / currency line 375~412 / part_group line 838~864
   - customer_grade schema 缺 unique（A 系列候選、Hank §6.3 揭露）、本軌補 `@@unique([tenantId, code])`

2. part_group 後端 controller 補建（Q3=A 拍板）
   - 新建 apps/nx-api/src/nx01/part-group/ controller + service + DTO + module
   - 對齊既有 part_brand 範式（CRUD + audit log）
   - 接通既有前端 UI（取代 mock-data.ts）

3. customer_grade controller 升級（Q1=A 拍板）
   - 既有只 GET、補 PATCH（改 marginPct / 名稱 / 排序）
   - code 鎖定 guard（service.update 拒絕改 code if 系統 seed）
   - 不開放 POST（4 級固定）
   - 不開放 DELETE（4 級固定、僅停用）

4. customer_grade marginPct 業務檢核接線
   - 接點：NX02 報價 / NX04 銷貨單建立時、檢核售價 ≥ 成本 × (1 + marginPct/100)
   - 本軌只在 customer_grade.service 揭露 marginPct getter、實際業務檢核接線由下游軌（NX02 / NX04）處理

5. part_group UI 從 mock-data 切換真實後端
   - 既有 BasePartGroupApiMasterView.tsx / BasePartGroupMasterView.tsx / mock-data.ts
   - 改 API client 打 /nx01/part-groups 真實 endpoint
   - 對齊 NX01-12 範式

6. currency endpoint 命名 drift（A025/A059 family）
   - 既有 /nx01/currency 單數（vs /nx01/part-brands 複數慣例）
   - 本軌不改（影響全 9 業務模組前端引用）、A059 後續軌統一處理

7. warehouse_type seed 業務 muscle memory verify
   - 既有 seed H/M/W/S 4 筆 + flowMode、規格書內容對齊 PROJECT_RULES.md §I.1.2 6 倉模型
   - Hank verify 既有 seed flowMode 對應跟規格書 §4.6 一致

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 | impl 狀態 |
|------|------|------|----------|
| 依賴（前置）| `nx01_country`（NX01-09）| part_brand.countryId FK、可空 | ✅ 既有 |
| 被依賴（戰略）| `nx01_part`（NX01-05、後續）| part.part_brand_id + part_group_id FK | 規格 / impl 待 |
| 被依賴（戰略）| 全業務模組 | currency 被 10 個模組引用、customer_grade marginPct 戰略 | 既有 / 部分待 |
| 被依賴（核心）| `nx01_warehouse`（NX01-06）| warehouse.warehouse_type_id FK、flowMode 控制調撥 | ✅ 既有 |
| 被依賴（核心）| `nx01_partner`（NX01-03）| partner.customer_grade_id / currency_id FK | ✅ 既有 |

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- **階段 1**：customer_grade schema 補 unique（A 系列候選清理）
- **階段 2**：part_group 後端 controller + service + DTO（接通既有 UI）
- **階段 3**：customer_grade controller 升級（補 PATCH + code lock guard）
- **階段 4**：customer_grade / part_group UI 完整 CRUD（既有 / 新建）
- **階段 5**：warehouse_type SYSADMIN 維護介面（NX99 範圍、本軌可選）
- **階段 6**：marginPct 業務檢核接線揭露（service 提供 getter、下游軌使用）

⭐ 對齊 NX01-15 / NX01-13 多模組同軌範式、Hank 自決精煉。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12 / NX01-14 / NX01-15 / NX01-13 範式、11 段完整。
> ⭐ 5 表合一規格書、混合 2 種範式（全域 2 + tenant scoped 3）、含 3 個戰略欄位（flowMode / marginPct / decimalPlaces）。
> ⭐ Crown 業界 muscle memory：型錄基礎功能全 Tier 對等、戰略欄位開放編輯但 seed code 鎖定保護下游引用。
> ⭐ Hank audit 揭露 6 個關鍵真相（範式分軌 / 戰略欄位 / part_group 後端缺 / customer_grade unique 缺 / currency endpoint 單數命名 drift）、規格書全部處理或揭露。
> ⚠️ 本軌範圍：part_group controller 新建（Q3=A）+ customer_grade controller 升級（Q1=A）+ customer_grade unique 補（A 系列）、其他保現況。
