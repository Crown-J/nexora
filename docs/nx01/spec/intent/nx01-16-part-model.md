<!-- docs/nx01/spec/intent/nx01-16-part-model.md -->

# NEXORA NX01-16 料號車型適配（nx01_part_model）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-14
> 狀態：拍板版、Crown 拍 Q1~Q7（Q1/Q2/Q4/Q5/Q6/Q7=A、Q3=B）+ Crown 業界 muscle memory 揭露（年份範圍走 model 拍板）
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-16-PART-MODEL-SPEC-V1-01
> 性質：A 主檔（戰略表 ⭐⭐、Yaro 30 年知識結構化核心、NX01 17 份子規格書收尾）
> 拓樸位置：拓樸排序第 7 份（最後 1 份、12 → 15 → 14 → 13 → 07 → 05 → 17 → **16**）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_part_model` = NEXORA **料號 ↔ 車型適配關聯表**、業界料件對車型適配查詢的結構化核心。

業務情境：業務人員查「Golf 7 GTI 適配什麼機油濾芯」→ 走 part_model 反查 → 回出 N 個適配料件、附「原廠 / 副廠等效 / 通用替代」適配等級。

⭐ **戰略地位（overview §594~598 + Hank §2 揭露）**：

- **30 年知識結構化核心** ⭐⭐
- Yaro 戰略資產轉型關鍵（業務員 muscle memory → 系統 query）
- NX01 17 份子規格書最後 1 份、本軌落地後 NX01 主檔層收尾
- PRO tier Yaro 2028 開業前完成田驗證的關鍵戰略表

## 1.2 業界改革（v1.0 核心揭露）

⭐ **Crown 業界 muscle memory 揭露**：

| 業界現況 | NEXORA 改革 |
|---|---|
| 業務員 30 年腦中記憶 + 紙本筆記 | part_model 結構化關聯表 |
| 紙本筆記「G7 GTI 機油濾芯 06L 115 562」自由格式 | (partId, modelId) 結構化 + 適配等級 enum |
| 業務員離職 = 知識斷層 | 30 年知識系統化承接 |

⭐ Crown 業界 muscle memory 拍板（Q1=A 對應）：

**年份範圍走 NX01-13 model 那層**、不在 part_model 重複記。改款處理：拆 model（如 `G7-GTI-前期 2017~2019` vs `G7-GTI-後期 2020~2024`）、part_model 純關聯。

## 1.3 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 跨租戶 audit、罕用 | 罕用 |
| OWNER | 維護適配資料策略 | 偶爾 |
| **PURCHASING** | 建料件 → 建適配車型清單 | **每天高頻** |
| **SALES** | 客戶問適配 → 查 part_model | **每天高頻** |
| WAREHOUSE | 出貨確認適配 | 偶爾 |

## 1.4 跨模組引用

- `nx01_part`（NX01-05、已落地）：`part_model.part_id` FK、**必填**
- `nx01_model`（NX01-13、已落地）：`part_model.model_id` FK、**必填**
- `nx99_tenant`：tenant scoped、空表進、tenant 自加

⭐ Crown 拍板 Q5=A：seed 空表進、Yaro 30 年資料走獨立匯入軌（NX01-16 落地後另開 A 系列軌）

---

# § 2. UI 頁面

## 2.1 適配主檔列表頁（`/master/part-model`）⭐ Crown 拍板 Q2=A

- 顯示當前 tenant 全部適配關聯
- 表格欄位：料件代碼 / 料件名稱 / 車型代碼 / 車型全名 / 適配等級 / 排序 / 啟用狀態
- 動作：[新增] / [編輯] / [停用 / 啟用]
- 篩選：適配等級 / 車型品牌 / 啟用狀態
- 排序：依車型品牌（預設）→ 依料件代碼
- 搜尋：依料件 code / name / 車型 code / name 模糊搜尋
- 對齊既有 generic 框架（Nx00FlatMasterView 範式）

## 2.2 適配編輯頁

- 料件（partId、必填、下拉自 nx01_part isActive=true）
- 車型（modelId、必填、下拉自 nx01_model isActive=true）
- 適配等級（fitLevel、必填、SmallInt enum、Q3=B 拍板）
- 備註（remark、可空）
- 排序（sortNo、預設 0）
- 啟用狀態（isActive、預設 true）

## 2.3 反查 UI（Q7=A 拍板、單向）

⭐ Crown 拍板 Q7=A：本軌只做「**料件反查車型**」單向、車型反查料件留後續軌。

業務情境：業務員查「機油濾芯 06L 115 562 適配哪些車型」：

1. 進料件主檔（NX01-05）查到該料
2. 點 [檢視適配車型]
3. 跳轉 `/master/part-model?partId=NX01PART000123` 篩選頁
4. 看到該料適配 N 個車型清單

⚠️ 反向（model 反查 part）後續軌補（A072 候選編號、Hank 自決）。

## 2.4 part 編輯頁適配 section（Q4=A 拍板、本軌不做）

⭐ Crown 拍板 Q4=A：本軌不在料件編輯頁嵌入「適配車型 section」、業務人員走獨立 `/master/part-model` 頁面建立適配。

後續軌補（A073 候選編號、UX 升級）。

---

# § 3. 業務規則

## 3.1 PK + unique 範圍（Q1=A 拍板）

- PK = `id`
- unique = **`(tenantId, partId, modelId)`**：1 料件 + 1 車型 = 1 行

⭐ Crown 業界 muscle memory：改款處理走拆 model（NX01-13 已支援），part_model 純關聯、不混業務邏輯。

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離 |
| partId | ✅ | FK | 對應 part 必存在 + isActive=true + 同 tenant |
| modelId | ✅ | FK | 對應 model 必存在 + isActive=true + 同 tenant |
| fitLevel | ✅ | SmallInt | enum 1/2/3、Q3=B 拍板（見 §3.3）|
| remark | ❌ | VARCHAR(200) | 業務人員手記 |
| sortNo | ✅ | INT | 預設 0 |
| isActive | ✅ | bool | 預設 true |
| audit 5 | 系統自動 | - | - |

### 3.2.1 service 層業務檢核

- **跨 tenant 防護**：partId.tenantId === current tenant && modelId.tenantId === current tenant
- **isActive 檢核**：兩端 part 跟 model 都必 isActive=true
- **unique 衝突檢核**：(tenantId, partId, modelId) 已存在則拒絕

## 3.3 適配等級 fitLevel（Q3=B 拍板、SmallInt enum）

⭐ Crown 業界 muscle memory + Hank 推薦：

| code | 中文 | 業界場景 |
|------|------|---------|
| 1 | 原廠 | OEM 原廠件、最高適配（如 VAG 原廠機油濾芯）|
| 2 | 副廠等效 | 副廠生產、功能等效（如 MANN / MAHLE 副廠濾芯）|
| 3 | 通用替代 | 通用替代品、需業務人員確認規格 |

對齊 NEXORA 字母 enum → SmallInt 升級範式（NX01-14 fuelType / NX01-15 transmissionType / NX01-17 relationType 統一）。

## 3.4 跨主檔連動

- partId → nx01_part：part 停用後、part_model 隱藏不顯示、歷史保留
- modelId → nx01_model：model 停用後、part_model 隱藏不顯示、歷史保留
- 兩端 FK 都 ON DELETE RESTRICT（保護 reverse 引用）

## 3.5 軟刪除 vs 停用

- part_model isActive=false → 業務 UI 不顯示
- 未被引用（剛建錯）→ 可真刪
- 對齊 NX01-17 part_relation 同範式

---

# § 4. 欄位列表

## 4.1 業務欄位（6 個 + 5 audit）

| 群組 | 欄位 | type | nullable | default |
|------|------|------|---------|---------|
| 關聯 | partId | VARCHAR(15) FK | NN | 無 |
| 關聯 | modelId | VARCHAR(15) FK | NN | 無 |
| 屬性 | fitLevel | SmallInt | NN | 1 |
| 屬性 | remark | VARCHAR(200) | nullable | null |
| 屬性 | sortNo | INT | NN | 0 |
| 屬性 | isActive | bool | NN | true |
| 系統 | id + tenantId + audit 5 | 系統自動 | - | - |

## 4.2 ID prefix（Q6=A 拍板）

- prefix = **PAMO**（PArt MOdel、4 字英文）
- ID 格式：`NX01PAMO0000001`
- 對齊既有 PABR（part_brand）/ PAGR（part_group）/ PARE（part_relation）範式

## 4.3 系統 seed 策略（Q5=A 拍板）

⭐ 空表進、tenant 自加、Yaro 30 年資料走獨立匯入軌（後續軌補）。

---

# § 5. 工作流程

## 5.1 系統初始化

1. tenant 開通時、依賴的 2 個 FK 表必已 seed apply：
   - part（NX01-05、空表進、業務人員自建）
   - model（NX01-13、空表進、業務人員自建）
2. nx01_part_model 空表進、業務人員按需自建

## 5.2 業務人員建適配關聯（業界主流場景）

業界場景：PURCHASING 建好料件「機油濾芯 06L 115 562」後、建適配車型清單：

1. 進「適配主檔列表」→ [新增]
2. 選 partId = 機油濾芯 06L 115 562（下拉自 part isActive=true）
3. 選 modelId = G7-GTI（下拉自 model isActive=true）
4. 選 fitLevel = 1 原廠
5. 備註可空、預設排序 0、啟用
6. [儲存] → service 檢核（跨 tenant + isActive + unique）→ 寫入
7. 後續業務查「Golf 7 GTI 適配料」→ 出此筆

## 5.3 改款處理流程（Crown 業界 muscle memory）

業界場景：Golf 7 GTI 2020 年改款換引擎、適配料件變了：

**步驟 1：拆 model（在 NX01-13）**
1. 編輯既有 model `G7-GTI`：name 改 `Golf 7 GTI 前期`、modelYearTo 改 2019
2. 新建 model `G7-GTI-後期`：name `Golf 7 GTI 後期`、modelYearFrom = 2020、modelYearTo = 2024

**步驟 2：建適配（在本表）**
1. 機油濾芯 A → `G7-GTI` 前期、fitLevel = 1 原廠
2. 機油濾芯 B → `G7-GTI-後期`、fitLevel = 1 原廠

→ part_model 結構保持「1 料 + 1 車 = 1 行」、改款邏輯走 model 那邊。

## 5.4 業務員查適配反查場景（業務 muscle memory）

業務情境：客戶問「我的 2018 年 Golf 7 GTI 機油濾芯要買哪個」：

1. SALES 進「適配主檔列表」
2. 搜尋 modelId = G7-GTI（或 G7-GTI-前期、依改款拆 model 狀況）
3. 看到該車型適配 N 筆料件、依 fitLevel 排序：
   - fitLevel = 1 原廠 → 推薦顯示
   - fitLevel = 2 副廠等效 → 業務人員自決
   - fitLevel = 3 通用替代 → 確認規格後選

⭐ 對齊 Crown 業界 muscle memory：fitLevel 是業務日常戰略決策依據、結構化後業務員不用記、新人也能上手。

## 5.5 異常：嘗試重複建適配

- 業務人員建 part = A、model = B、發現已存在（不同 fitLevel 或同 fitLevel）
- service 拒絕：「相同料件 + 車型適配已存在」
- 業務人員需編輯既有適配、不可重建

## 5.6 異常：跨 tenant 引用

- 業務人員（不可能正常觸發、僅 SYSADMIN 跨租戶可能）試圖建跨 tenant 適配
- service 拒絕：「料件 / 車型必須屬於當前租戶」

## 5.7 異常：對停用料 / 停用車型建適配

- 業務人員選 part isActive=false 或 model isActive=false
- service 拒絕：「料件 / 車型已停用、不可建適配」

---

# § 6. 角色權限

| 角色 | 看 | 新增 | 改 | 停用 / 啟用 | 刪除 |
|------|---|------|---|-----------|------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| OWNER | ✅ 自租戶 | ✅ | ✅ | ✅ | ✅（未被引用時）|
| **PURCHASING** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SALES** | ✅ | ✅ | ✅ | ✅ | ✅ |
| WAREHOUSE | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |
| FINANCE / HR | ✅（read-only）| ❌ | ❌ | ❌ | ❌ |

⭐ PURCHASING / SALES 都可建適配、對齊 NX01-17 part_relation 範式（業務日常高頻使用）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看 part_model 列表 | ✅ | ✅ | ✅ |
| 建適配 CRUD | ✅ | ✅ | ✅ |
| 3 種 fitLevel 全開放 | ✅ | ✅ | ✅ |
| 反查料件 → 車型 | ✅ | ✅ | ✅ |
| Yaro 30 年資料匯入 | ❌ | ❌ | ✅（PRO tier 戰略） |

→ 基礎 CRUD 全 Tier 對等、Yaro 資料匯入是 PRO tier 戰略差異化（後續軌）

---

# § 8. 注音索引

❌ **不接入注音索引**。

⭐ 對齊既有範式：part_model 是純關聯表、業務人員不會搜尋 part_model 本身、走 part / model 反查（後者已有注音規格、本表透過 FK 引用）。

注音索引保留給中文密集主檔（part / partner / user）。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-14 | Alex | 初版拍板版、11 段完整。Crown 拍 Q1~Q7：Q1=A（unique = (tenantId, partId, modelId)）/ Q2=A（獨立列表頁 generic 框架）/ Q3=B（fitLevel SmallInt enum：1=原廠 / 2=副廠等效 / 3=通用替代）/ Q4=A（本軌不做 part 編輯頁適配 section、後續軌補）/ Q5=A（空表進、Yaro 資料獨立匯入軌）/ Q6=A（prefix PAMO）/ Q7=A（料件反查車型單向、雙向後續軌）。整合 Hank §1~§12 諮詢真相揭露：(1) NX01-16 是 17 份子規格書最後 1 份、上游 5 表全綠燈、無 #22 鐵律觸發。(2) Crown 業界 muscle memory 揭露：改款處理走拆 model、part_model 純關聯不混業務邏輯、年份範圍走 model 那邊。(3) 戰略地位：30 年知識結構化核心、Yaro 戰略資產轉型關鍵。(4) reference 3 處 drift（nx-table.csv / doc-number-rules.csv / field-definitions.csv 缺 part_model 條目、A067 family 順手補）。本規格書直接走 v1.0、未經 v0.1.0、依拓樸排序最後 1 份、Crown 業界 muscle memory + Hank audit 真相已沉澱可直接拍板。|

---

# § 10. 待 Hank grep 確認項

1. nx01_part_model schema 全建（Hank §1 verify 確認未建）
   - 對應本規格 §4.1 欄位 + (tenantId, partId, modelId) unique + 2 index（partId / modelId 反查）

2. fitLevel SmallInt 範式對齊（Q3=B、Crown 業界揭露）
   - 對齊 NX01-14 fuelType / NX01-15 transmissionType / NX01-17 relationType 既有 SmallInt + @Min/@Max class-validator 範式
   - service / DTO / UI 中文顯示對齊

3. ID prefix gen_nx01_part_model_id() 函式新建
   - prefix = PAMO、對齊既有命名範式（Hank §6）

4. controller + service + DTO（對齊 NX01-17 part_relation 範式）
   - service 業務檢核：跨 tenant / isActive / unique（§3.2.1）
   - 5 ROLE 權限（§6）

5. UI 接通（Q2=A、對齊 generic Nx00FlatMasterView 範式）
   - 列表頁 + 編輯頁
   - 反查單向（料件 → 車型、Q7=A）
   - part 編輯頁 section 不做（Q4=A）

6. reference 文件 drift 順手補（A067 family）
   - docs/_shared/reference/nx-table.csv 加 part_model row
   - docs/_shared/reference/doc-number-rules.csv 加 PAMO prefix
   - docs/nx01/reference/field-definitions.csv 加 part_model 欄位定義

7. Nx01Part / Nx01Model reverse 接線
   - Nx01Part 加 rev_Nx01PartModel_partId
   - Nx01Model 加 rev_Nx01PartModel_modelId
   - 對齊 schema 既有 reverse 範式

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 | impl 狀態 |
|------|------|------|----------|
| 依賴（前置）| `nx01_part`（NX01-05）| part_model.partId NN FK | ✅ 落地 |
| 依賴（前置）| `nx01_model`（NX01-13）| part_model.modelId NN FK | ✅ 落地 |
| 被依賴（戰略）| NX01-05 part 編輯頁適配 section | UX 升級 | 後續軌 A073 |
| 被依賴（戰略）| 車型反查料件 UI | 雙向反查 | 後續軌 A072 |
| 被依賴（戰略）| Yaro 30 年資料匯入 | PRO tier seed | 後續軌（NX01 全 closure 後啟動）|
| 被依賴（業務）| NX02 採購 / NX04 銷貨 | 業務員下單時依車型搜料 | 各業務軌接通 |
| 被依賴（業務）| NX08 經營分析「品牌零件覆蓋率」報表 | PRO tier 數據分析 | NX08 軌 |

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：

- **commit 1**：schema 新建（含 unique + 2 index）+ migration + gen_nx01_part_model_id() 函式
- **commit 2**：後端 controller + service + DTO（含 fitLevel SmallInt enum、業務檢核）
- **commit 3**：UI 接通（generic 框架 + 反查單向）
- **commit 4**：Nx01Part / Nx01Model reverse 接線
- **commit 5**：reference 3 處 drift 順手補（A067 family）

⭐ 本軌完成後 NX01 17 份子規格書 + impl 全 closure、Yaro 戰略田驗證所需 NX01 主檔層收尾。

---

> 本拍板版 v1.0 對齊 spec-template + NX01-12/14/15/13/07/05/17 範式、11 段完整、Crown 拍 Q1~Q7 落地。
> ⭐ NEXORA NX01 17 份子規格書最後 1 份、本軌落地後 NX01 主檔層全 closure。
> ⭐ Crown 業界 muscle memory：part_model 是 30 年知識結構化核心、Yaro 戰略資產轉型關鍵。
> ⭐ 改款處理走拆 model（NX01-13 已支援）、part_model 純關聯不混業務邏輯、年份範圍走 model 那邊。
> ⭐ fitLevel 3 級 enum（1 原廠 / 2 副廠等效 / 3 通用替代）= 業務日常戰略決策結構化。
> 📌 後續軌候選：A072（車型反查料件雙向 UI）/ A073（part 編輯頁適配 section UX 升級）/ Yaro 資料匯入軌（PRO tier）。
