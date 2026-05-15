<!-- docs/nx01/spec/intent/nx01-12-car-brand.md -->

# NEXORA NX01-12 汽車品牌型錄（nx01_car_brand）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-12
> 狀態：拍板版、Crown 拍 Q1~Q5 + 揭露關鍵業界真相（品牌全 Tier 無上限 / seed 修改僅鎖 code）
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-12-CAR-BRAND-SPEC-V1-01
> 性質：B 型錄 + 戰略上游表（車輛分類最上層 entry point、NX01-11 / NX01-13 / NX01-16 依賴本表）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_car_brand` = NEXORA **車型品牌主檔**、記錄哪家車廠造的車（VW / Audi / Toyota / BMW…）。

業務情境：業務查料時先選車型品牌 → 再選車型（Golf / A4 / Camry）→ 再看引擎變速箱年份。所以「車型品牌」是車輛分類的**最上層 entry point**、所有車輛相關資料都從這裡展開。

對齊接力文件揭露的「4 主流預設品牌」業界 muscle memory：VAG / POR / BMW / BEN 由 SYSADMIN seed apply 到所有 tenant、PLUS / PRO tenant 可加自家經營的其他品牌（Toyota / Honda / Audi / Skoda / Ford 等）。

對齊 [PROJECT_CONTEXT 工程模式 #23](PROJECT_CONTEXT.md) 擴充性原則：seed 預設不寫死、tenant scoped 設計支援副廠 / 海外品牌擴充。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 維護全域預設品牌（seed VAG / POR / BMW / BEN） | 加新主流品牌時、不常 |
| OWNER | 新增自家經營的副廠 / 海外品牌、調整品牌排序 | 開店初期 + 偶爾擴充 |
| PURCHASING / SALES / WAREHOUSE | 建料號 / 查料時、下拉選車型品牌 | 每天（隱性使用） |

## 1.3 跨模組引用

- `nx01_brand_code_rule`（NX01-11、已 v1.0）：規則依本表 car_brand_id FK
- `nx01_model`（NX01-13、後續落地）：車型 model.car_brand_id FK
- `nx01_part`（NX01-05、後續落地）：透過 brand_code_rule 間接引用本表
- `nx01_country`（NX01-09 階段 D）：品牌原產國 countryId FK（可空）
- `nx99_tenant`：tenant scoped、系統 seed 4 個主流品牌 apply 所有 tenant

---

# § 2. UI 頁面

## 2.1 車型品牌列表頁（`/master/car-brand`）

- 顯示當前 tenant 可用的所有車型品牌（含系統 seed 4 個 + tenant 自加）
- 表格欄位：品牌代碼 / 品牌中文名 / 品牌英文名 / 原產國 / 排序 / 啟用狀態
- 動作：[新增品牌] / [編輯] / [停用 / 啟用]
- 篩選：原產國 / 啟用狀態
- 排序：依 sortNo（預設）/ 依品牌代碼 / 依品牌中文名

⭐ 業務人員看到的下拉選單順序 = 本頁 sortNo 順序

## 2.2 品牌編輯頁（`/master/car-brand/:id/edit`）

**基本資訊：**

- 品牌代碼（業界慣用縮寫、如 VAG / TOY / BMW / BEN）
- 品牌中文名（業務看得懂的名稱、如「福斯」「豐田」）
- 品牌英文名（國際對照用、如 Volkswagen / Toyota）
- 原產國（下拉時依據【國家檔】之設定、可空）
- 品牌 Logo（schema 欄位預留、v1.0 UI 不渲染、v2.0+ 業務有需求再開）
- 備註（集團註記、停產說明等）

**呈現設定：**

- 排序（預設 0、由小到大）
- 啟用狀態（啟用 / 停用）

**系統預設品牌限制：**

- 4 個系統 seed 品牌（VAG / POR / BMW / BEN）僅「品牌代碼」鎖定不可改（保障下游 brand_code_rule / model / part 引用一致性）
- 其他欄位（中文名 / 英文名 / 原產國 / Logo / 排序 / 啟用狀態）tenant 完全可調整
- 對齊 NX01-11 brand_code_rule 範式：tenant 可改呈現、不可改核心代碼
- 業務 muscle memory：tenant 想換自家 logo / 自家風格中文名 / 自家原產國認知、皆允許

## 2.3 品牌下拉選單（隱性使用、跨多個畫面）

業務人員以下情境會看到本表的下拉選單：

- NX01-11 品牌規則編輯頁（選車型品牌）
- NX01-13 車型編輯頁（選車型所屬品牌、後續落地）
- NX01-05 料號編輯頁（透過 NX01-11 規則間接觸發）
- NX03 即時查詢工作站（依車型品牌篩選料）
- NX02 採購工作站（依品牌篩選供應商料）

下拉只顯示 `isActive = true` 的品牌、依 sortNo 排序。

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

- PK = `id`
- unique = `(tenantId, code)`（每租戶內、品牌代碼唯一）
- 對齊 [PROJECT_RULES.md §III.2](../../../PROJECT_RULES.md) 命名規則：tenant scoped
- 系統 seed 4 個主流品牌（VAG / POR / BMW / BEN）apply 到所有 tenant
- 跨租戶代碼撞名不檢查（業界 muscle memory 對齊 NX01-11：恆迎 18 年沒發生過、不過度防呆）

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離（系統自動帶當前租戶） |
| code | ✅ | 字串 | tenant 內 unique、英數縮寫、大寫慣例 |
| name | ✅ | 字串 | 業務看得懂的中文名稱 |
| nameEn | ❌ | 字串 | 國際對照、跨國採購單據引用 |
| countryId | ❌ | FK | 對應 country 必存在、跨國集團可空 |
| logoUrl | ❌ | 字串 | UI 顯示用 |
| remark | ❌ | 字串 | 備註 |
| sortNo | ✅ | INT | 預設 0、由小到大 |
| isActive | ✅ | bool | 預設 true |

## 3.3 跨主檔連動

- 被引用 `nx01_brand_code_rule`（NX01-11、已 v1.0、rule.car_brand_id FK）
- 被引用 `nx01_model`（NX01-13、後續落地、model.car_brand_id FK）
- 引用 `nx01_country`（countryId FK、v1.0 階段 D 表、可空）

## 3.4 跨業務模組連動

- NX01-11 brand_code_rule（直接依賴、規則對應品牌）
- NX01-05 part 主檔（透過 brand_code_rule 間接依賴）
- NX02 採購 / NX03 銷售 / NX05 倉儲（透過 part 主檔間接依賴）

→ 本表是「上游戰略表」、定錯品牌影響全車輛分類體系

## 3.5 軟刪除 vs 停用

- 品牌 isActive=false → 下拉選單不顯示、不能用此品牌建新規則 / 新車型 / 新料號
- 已建關聯資料（規則 / 車型 / 料號）保留（不阻擋歷史資料顯示）
- 真刪品牌：被 brand_code_rule / model / part 引用 → 不可刪、只能停用
- 真刪品牌：未被引用（剛建錯）→ 可真刪
- 系統 seed 4 個品牌不可刪（避免誤刪斷下游引用）、只能停用

---

# § 4. 欄位列表

## 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 品牌代碼 | ✅ | 無 | SYSADMIN / OWNER 填、業界縮寫慣例 |
| `name` | 品牌中文名 | ✅ | 無 | SYSADMIN / OWNER 填 |
| `nameEn` | 品牌英文名 | ❌ | null | SYSADMIN / OWNER 填 |
| `countryId` | 原產國 FK | ❌ | null | SYSADMIN / OWNER 選、可空（業界 muscle memory：跨國集團如 Stellantis 不好分、漸進演化、v2.0+ 業務有「依原產國篩選」需求再嚴格化） |
| `logoUrl` | 品牌 Logo | ❌ | null | SYSADMIN / OWNER 上傳 |
| `remark` | 備註 | ❌ | null | SYSADMIN / OWNER 填 |
| `sortNo` | 排序 | ✅ | 0 | SYSADMIN / OWNER 設、下拉顯示順序 |
| `isActive` | 啟用狀態 | ✅ | true | SYSADMIN / OWNER 切換 |

## 4.2 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離（系統自動帶當前租戶） |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者 |

## 4.3 系統 seed 4 個主流品牌

對齊 NX01-11 brand_code_rule v1.0 拍板：

| code | name | nameEn | countryId | sortNo |
|------|------|--------|-----------|--------|
| VAG | 福斯集團 | Volkswagen AG | DEU | 1 |
| POR | 保時捷 | Porsche | DEU | 2 |
| BMW | BMW | BMW | DEU | 3 |
| BEN | 賓士 | Mercedes-Benz | DEU | 4 |

- 4 個品牌 SYSADMIN seed apply 到所有 tenant
- tenant 可改 name / nameEn / sortNo / isActive、不可改 code
- 對齊 NX01-11 範式：seed 後 tenant 內 4 筆 row 各自獨立、tenant A 改 sortNo 不影響 tenant B

⚠️ 系統 seed apply 機制由 Hank 自決（對齊 #12 技術實作分工）、預期沿用 NEXORA 既有 seed 三層架構（system / template / test）。

---

# § 5. 工作流程

## 5.1 SYSADMIN seed 系統預設品牌（系統初始化）

1. 系統建立新 tenant 時、自動 apply 4 個主流品牌（VAG / POR / BMW / BEN）
2. 4 筆 row 寫入 nx01_car_brand、tenantId = 新 tenant
3. tenant 啟用後業務人員即可使用

對齊 NX01-11 seed 範式、本表跟 brand_code_rule 配套 apply（NX01-11 4 條規則對應本表 4 個品牌）。

## 5.2 OWNER 新增自家經營副廠品牌（全 Tier 適用）

業界 muscle memory 場景：經銷商除了 4 主流品牌、會經營副廠 / 海外品牌：

- Toyota / Honda（日系）
- Audi / Skoda（VAG 集團下子品牌、但業務常獨立列）
- Ford / Chevrolet（美系）
- FEBI / 一些 OEM 廠（副廠通路）

流程：

1. OWNER 進「車型品牌列表」→ [新增品牌]
2. 填 code = TOY、name = 豐田、nameEn = Toyota、countryId = JPN、sortNo = 5
3. [儲存] → 該 tenant 新品牌啟用
4. 後續可在 NX01-11 brand_code_rule 替此品牌定義料號編碼規則

⭐ 全 Tier（LITE / PLUS / PRO）一律可新增、不設上限
⭐ 業務 muscle memory：單店修車廠（LITE 客群）可能專營 Toyota / Honda、4 主流不是主力、不該強制只能用預設

## 5.3 OWNER 調整品牌呈現順序（業界 muscle memory 場景）

業界真相：不同經銷商主推品牌不同：

- VAG 專營店 → VAG 排第 1、POR / BMW / BEN 後排
- 多品牌綜合店 → 依業績排序

流程：

1. OWNER 進「車型品牌列表」
2. 編輯各品牌的 sortNo
3. 下拉選單即時反映新順序

## 5.4 停用品牌（已被引用場景）

- 品牌 X 已被 N 筆 brand_code_rule + M 筆 model + K 筆 part 引用
- OWNER 點 [停用]
- 系統提示：「品牌 X 被 N 條規則 + M 個車型 + K 個料號引用、停用後下拉不再顯示、但歷史資料保留。確認停用？」
- OWNER [確認] → isActive = false

## 5.5 異常：嘗試刪除被引用品牌

- 品牌 Y 已被 brand_code_rule 引用
- OWNER 點 [真刪]
- 系統拒絕：「品牌 Y 已被引用、不可刪除、僅可停用」

## 5.6 異常：嘗試修改系統 seed 品牌代碼

- OWNER 編輯 VAG → 嘗試改 code = VWG
- 系統拒絕：「系統預設品牌代碼不可修改、僅可調整名稱 / 排序 / 狀態」

---

# § 6. 角色權限

| 角色 | 看品牌列表 | 新增品牌 | 改 seed 品牌欄位（除 code）| 改 seed 品牌代碼 | 停用 / 啟用 | 刪除 |
|------|---------|---------|------------------------|---------------|-----------|------|
| SYSADMIN（跨租戶）| ✅ 全租戶 | ✅ | ✅ | ✅（罕用）| ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅（全 Tier 無上限）| ✅ | ❌ | ✅ | ✅（未被引用時）|
| PURCHASING / SALES / WAREHOUSE / FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ | ❌ |

⭐ tenant scoped 設計：OWNER 改自家品牌不影響其他 tenant
⭐ 系統 seed 4 個主流品牌僅代碼受保護、其他欄位（含原產國 / Logo）tenant 完全可調

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看品牌列表（read-only）| ✅ | ✅ | ✅ |
| 系統 seed 4 主流品牌（VAG / POR / BMW / BEN）| ✅ | ✅ | ✅ |
| OWNER 改 seed 品牌欄位（除 code）| ✅ | ✅ | ✅ |
| OWNER 新增自家副廠 / 海外品牌（無上限）| ✅ | ✅ | ✅ |
| 注音快搜（依品牌中文名搜尋）| ✅ | ✅ | ✅ |

→ 本表核心功能全 Tier 對等支援、無 Tier 差異
→ 業務 muscle memory：車型品牌是車輛分類最上層基礎、不該成為訂閱差異化欄位
→ 系統 seed 4 主流品牌全 Tier 可用、tenant 不可刪只能停用

---

# § 8. 注音索引

## 8.1 是否需注音索引

✅ 需要、本表 `name` 欄位接入 nx01_phonetic_index（對齊 NX01-10 v1.0）。

業務情境：業務人員在下拉選單打「ㄈㄕ」應該能搜到「福斯」、打「ㄕㄊㄐ」應該能搜到「保時捷」。雖然品牌數量不多（4~20 個量級）、但下拉選單注音快搜是 NEXORA 一致性 UX。

## 8.2 索引監聽欄位

- `nx01_car_brand.name`（中文名、主要快搜欄位）
- `nx01_car_brand.nameEn`（英文名、選用、業界英文縮寫已可直接打 code）

trigger 機制由 Hank 自決、對齊 NX01-10 既有實作範式。

## 8.3 對齊範式

對齊 NX01-10 注音快搜系統設計：A 主檔 / B 型錄類表只要業務人員有快搜需求、就接入 phonetic_index。本表雖屬 B 型錄、但業務人員每天透過下拉使用、納入注音索引合理。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-12 | Alex | 初版草稿、11 段完整、§10 列 4 個 Q + 1 個 Q5（seed 修改範圍）給 Crown 拍。對齊 NX01-11 brand_code_rule v1.0 拍板範式（4 主流品牌 seed / tenant scoped）|
| v1.0 | 2026-05-12 | Alex | Crown 拍 Q1~Q5 + 揭露關鍵業界真相：(1) logoUrl schema 預留、v1.0 UI 不渲染、v2.0+ 再開（Q1 拍 B）(2) 品牌全 Tier 無上限、LITE / PLUS / PRO 一致、車型品牌不是訂閱差異化欄位（Q2 拍、Crown 揭露業界 muscle memory：LITE 單店可能專營 Toyota / Honda、4 主流不是主力）(3) 跨租戶代碼撞名不檢查、對齊 NX01-11 + Alex #13 失誤紀錄（Q3 拍 A）(4) countryId 可空 + 明示漸進演化路徑、業務有「依原產國篩選」需求再嚴格化（Q4 拍 C）(5) seed 品牌 tenant 修改範圍僅鎖 code、其他欄位（含原產國 / Logo）完全可調（Q5 拍 B）|

---

# § 10. 待 Hank grep 確認項

（v1.0 升版後此段取代原 §10 待拍 Q）

1. nx01_car_brand schema 既有狀態揭露（Hank 諮詢回報 line 300 已建、verify 欄位 diff）
   - 對照本規格 §4.1 / §4.2 欄位列表、揭露缺漏 / 多餘欄位
   - logoUrl 欄位是否已建、未建則新增（Q1 拍 B：schema 預留）
2. 系統 seed 4 個主流品牌（VAG / POR / BMW / BEN）apply 機制
   - 對齊 NEXORA seed 三層架構（system / template / test）
   - 跟 NX01-11 brand_code_rule v1.0 配套 apply（4 品牌 + 4 規則）
3. nx01_country schema 既有狀態揭露（NX01-09 階段 D 真實實作情況）
   - countryId FK 可空策略確認、不阻塞本軌
4. nx01_phonetic_index trigger 機制接入 car_brand.name
   - 對齊 NX01-10 v1.0 既有實作範式、Hank 自決 trigger 寫法
5. 品牌已被引用判斷邏輯（停用時提示 N 條規則 + M 個車型 + K 個料號）
   - 依下游 FK reverse query 實作、Hank 自決

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 |
|------|------|------|
| 依賴（前置、可空）| `nx01_country`（NX01-09）| 原產國 FK、可空、不阻塞本軌 |
| 依賴（基礎設施）| `nx01_phonetic_index`（NX01-10、已 v1.0）| name 接注音索引 |
| 被依賴（核心）| `nx01_brand_code_rule`（NX01-11、已 v1.0）| 規則對應品牌 FK |
| 被依賴（戰略）| `nx01_model`（NX01-13、後續）| 車型對應品牌 FK |
| 被依賴（業務）| `nx01_part`（NX01-05、後續）| 透過 brand_code_rule 間接引用 |

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- 階段 1：schema 既有狀態 audit + 補欄位（含 logoUrl）+ 4 個 seed apply 機制
- 階段 2：列表頁 + 編輯頁 UI（含 seed 品牌代碼鎖定邏輯、其他欄位開放）
- 階段 3：新增品牌 UI（全 Tier 適用、無上限）
- 階段 4：注音索引 trigger 接線（對齊 NX01-10）
- 階段 5：下游驗證（NX01-11 brand_code_rule 引用本表 FK 路徑通）

NX01-13 model / NX01-05 part 後續落地後、本表才完整接通車輛分類體系。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-11 範式、11 段完整、Crown 拍 Q1~Q5 落地。
> ⭐ 戰略上游定位：車輛分類最上層 entry point、NX01-11 / NX01-13 / NX01-16 直接依賴。
> ⭐ 業界 muscle memory：車型品牌不是訂閱差異化欄位、全 Tier 對等支援。
