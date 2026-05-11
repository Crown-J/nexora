<!-- docs/nx01/spec/intent/nx01-11-brand-code-rule.md -->

# NEXORA NX01-11 品牌編碼規則（nx01_brand_code_rule）子規格書

> 文件版本：v1.0
> 最後更新:2026-05-06
> 狀態：拍板版、Crown 拍 Q1~Q5 + 揭露 tenant scoped 真相 + 跨品牌 unique 不存在
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-11-BRAND-CODE-RULE-SPEC-V1-01
> 性質：B 型錄 + 結構定義引擎（戰略核心、part_code_2 結構由此表定義）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

`nx01_brand_code_rule` = NEXORA **part_code_2 結構化編碼的規則定義表**、業界戰略核心。

業務情境：建料號「VAG 變速箱輸入軸」、part_code_2 = `VAG-1K0·129·620·A #VALDEU`、其中：
- `VAG` = 車型品牌（從 NX01-12 car_brand）
- `1K0·129·620·A` = 5 個 SEG（依品牌規則組成）
- `VALDEU` = 來源代碼（VAL = VALEO 廠商 + DEU = Germany 產地）

不同品牌 SEG 結構不同（VAG / BMW / Toyota 各有業界料號慣例）、本表定義各品牌規則、part 主檔依此組 part_code_2。

對齊 [PROJECT_CONTEXT 工程模式 #4](PROJECT_CONTEXT.md)：「規則即資料、不寫死 enum」、品牌規則可加新品牌不動 schema。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| SYSADMIN | 維護品牌規則（新增品牌、調 SEG 結構） | 加新品牌時、不常 |
| OWNER / PURCHASING | 看品牌規則、確認 part_code_2 結構是否對齊業界 | 偶爾、品牌談判時 |
| PURCHASING / WAREHOUSE | 建料號時、UI 自動依品牌規則組 part_code_2 | 每天（隱性使用） |

## 1.3 跨模組引用

- `nx01_car_brand`（NX01-12）：規則對應的車型品牌 FK
- `nx01_part`（NX01-05）：part_code_2 產生依本表規則
- `nx01_country`（NX01-09 階段 D）：產地 ISO 3 碼（DEU / CHN / TWN）
- `nx99_tenant`：tenant scoped、系統 seed 4 個主流品牌（VAG / POR / BMW / BEN）給所有 tenant、tenant 可調整呈現格式 + 加副廠規則

---

# § 2. UI 頁面

## 2.1 品牌規則列表頁（`/master/brand-code-rule`、SYSADMIN 限定）

- 顯示所有已定義品牌規則
- 表格欄位：車型品牌（FK car_brand）/ SEG 數量 / SEG 結構描述 / 來源代碼格式 / 範例 / 狀態
- 動作：[新增規則] / [編輯] / [預覽範例] / [複製成新規則]
- 篩選：車型品牌 / 啟用狀態

## 2.2 規則編輯頁（`/master/brand-code-rule/:id/edit`）

- 表單分區：

**基本資訊：**
- 車型品牌 FK（從 NX01-12 下拉）
- 規則名稱 / 描述
- 來源代碼格式（v1.0 固定 3+3 = 6 碼 = 廠商 3 + 產地 ISO 3、不可改）
- ⭐ tenant 可改：分隔符（123-456-789 vs 123·456·789 vs 123 456 789 等）
- ⭐ tenant 可加：副廠自訂規則（系統 seed 4 個外、tenant 自建）

**SEG 結構定義（動態 N 個 SEG）：**

| SEG 編號 | 業務語意 | 長度限制 | 字元類型 | 必填 | 範例 |
|---------|---------|---------|---------|-----|------|
| SEG1 | 主類別代碼 | 3 碼 | 數字 | ✅ | 1K0 |
| SEG2 | 系統代碼 | 3 碼 | 數字 | ✅ | 129 |
| SEG3 | 部品代碼 | 3 碼 | 數字 | ✅ | 620 |
| SEG4 | 版本碼 | 1 碼 | 英數 | ❌ | A |
| SEG5 | 廠商區隔碼 | 2 碼 | 英數 | ❌ | （空白） |

- SEG 數量：1~10（動態）
- 每個 SEG 可設：長度上下限、字元類型（數字 / 英文 / 英數 / 任意）、必填、業界語意說明

**分隔符設定：**
- SEG 之間分隔符（預設 `·`、可改 `-` / `.` / 空白）
- 來源代碼前綴（預設 `#`、可改）

**範例預覽：**
- 填入測試值、即時組 part_code_2 預覽
- 範例：VAG → `VAG-1K0·129·620·A #VALDEU`

**狀態：**
- 啟用 / 停用（停用後 part 主檔不能用此品牌建新料號）

## 2.3 規則預覽 Modal（part 主檔編輯時觸發）

- 業務人員在 part 主檔選車型品牌 = VAG 後
- 系統 query nx01_brand_code_rule WHERE car_brand_id = VAG
- 開 modal 顯示 VAG 規則 + 各 SEG 輸入欄
- 業務人員填值 → 即時組 part_code_2 預覽
- 寫入 part 主檔 part_code_2 欄位

## 2.4 品牌規則衝突檢查（v2.0 戰略後續、不在 v1.0 範圍）

- 不同品牌 part_code_2 可能撞 unique（雖品牌 prefix 不同）
- v2.0 加全域 unique check 邏輯
- v1.0 純結構定義、衝突檢查留 NX01-05 part 處理

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

- PK = `id`
- unique = `(tenantId, car_brand_id)` （每租戶內、一個品牌一條規則）
- 對齊 [CLAUDE.md §五](CLAUDE.md) 命名規則：tenant scoped
- system seed 4 個主流品牌（VAG / POR / BMW / BEN）apply 到所有 tenant、tenant 可調呈現格式 + 加副廠規則

## 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| tenantId | ✅ | FK | 多租戶隔離（系統自動帶當前租戶） |
| car_brand_id | ✅ | FK | 對應 car_brand 必存在 + isActive=true |
| rule_name | ✅ | 字串（最長 50） | 描述用 |
| seg_count | ✅ | INT（1~10） | 範圍檢核 |
| seg_definitions | ✅ | JSON 陣列 | 長度 = seg_count、每筆含 length/charset/required/description |
| separator | ✅ | 字元（1） | 預設 `·`、enum: `·` / `-` / `.` / ` ` |
| source_code_prefix | ✅ | 字元（1） | 預設 `#`、可改 |
| isActive | ✅ | bool | 預設 true |

跨欄位驗證：
- `seg_definitions` 長度必 = `seg_count`
- 每個 SEG length 必 1~10
- source code 格式固定（廠商 3 + 產地 ISO 3 = 6 碼、v1.0 不可改）

## 3.3 跨主檔連動

- 引用 `nx01_car_brand`（必須先建車型品牌、才能定義此品牌規則）
- 被引用 `nx01_part`（part 主檔依此組 part_code_2）
- 被引用 `nx01_country`（v1.0 階段 D 表、未啟用時 source_code 產地碼可暫用字串）

## 3.4 跨業務模組連動

- NX01-05 part 主檔（核心依賴、本表是 part_code_2 的結構定義源）
- NX02 採購（依 part 主檔的 part_code_2 引用、間接依賴本表）
- NX03 銷售（同 NX02）
- NX05 倉儲（依 part 主檔 part_code_2）

→ 本表是「上游戰略表」、定錯規則影響全 NEXORA 料號

## 3.5 軟刪除 vs 停用

- 規則 isActive=false → part 主檔不能用此品牌建**新**料號
- 已建料號 part_code_2 保留（依當時規則）
- 真刪規則：被 part 主檔引用 → 不可刪、只能停用
- 真刪規則：未被引用（剛建錯）→ 可真刪

---

# § 4. 欄位列表

## 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `car_brand_id` | 車型品牌 FK | ✅ | 無 | SYSADMIN 選 |
| `rule_name` | 規則名稱 | ✅ | 無 | SYSADMIN 填 |
| `description` | 規則描述 | ❌ | null | SYSADMIN 填 |
| `seg_count` | SEG 數量（1~10）| ✅ | 5 | SYSADMIN 設 |
| `seg_definitions` | SEG 定義陣列（JSON） | ✅ | 預設 5 個 SEG 範本 | SYSADMIN 設 |
| `separator` | SEG 分隔符 | ✅ | `·` | SYSADMIN 設 |
| `source_code_prefix` | 來源代碼前綴 | ✅ | `#` | SYSADMIN 設 |
| `source_code_format` | 來源代碼結構（v1.0 固定）| ✅ | `BRAND3+COUNTRY3` | 系統寫死、不可改 |
| `example_part_code` | 範例 part_code_2 | ❌ | null | SYSADMIN 填、UI 預覽用 |
| `isActive` | 啟用狀態 | ✅ | true | SYSADMIN 切換 |

## 4.2 seg_definitions JSON 結構（核心）

```json
[
  {
    "seg_no": 1,
    "name": "主類別代碼",
    "length_min": 3,
    "length_max": 3,
    "charset": "numeric",
    "required": true,
    "description": "VAG 車型大類（如 1K0 = Golf MK6）"
  },
  {
    "seg_no": 2,
    "name": "系統代碼",
    "length_min": 3,
    "length_max": 3,
    "charset": "numeric",
    "required": true,
    "description": "VAG 系統分類（如 129 = 進氣系統）"
  },
  ...
]
```

charset 枚舉值：
- `numeric` = 0-9
- `alpha` = A-Z
- `alphanumeric` = 0-9 + A-Z
- `any` = 任意 ASCII

## 4.3 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離（系統自動帶當前租戶） |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（SYSADMIN） |

## 4.4 來源代碼結構（v1.0 固定、不寫進 schema）

```
來源代碼 = [廠商縮寫 3 碼] + [產地 ISO 3 碼] = 6 碼
範例：
  VALDEU = VALEO Germany（VAL + DEU）
  VALCHN = VALEO China（VAL + CHN）
  BOSDEU = BOSCH Germany（BOS + DEU）
  DENCHN = DENSO China（DEN + CHN）
```

- 廠商縮寫由業務人員建料號時填入（不在本表）
- 產地 ISO 3 碼對齊 NX01-09 country 設計（避免 ISO 2 / ISO 3 drift）
- v1.0 寫死格式、不開放各品牌規則自訂來源代碼格式
- v1.0 產地用 varchar(3)、NX01-09 country 表完成後對接 FK（不阻塞本軌）
- v2.0+ 若有業務需求、可加 source_code_format 欄位開放自訂

---

# § 5. 工作流程

## 5.1 SYSADMIN 建立新品牌規則（VAG 為例）

1. 進「品牌規則列表」→ [新增規則]
2. 選車型品牌 = VAG（必須先在 NX01-12 建好）
3. 填規則名稱 = 「VAG 標準料號結構」
4. 設 seg_count = 5
5. 編輯 seg_definitions：
   - SEG1：主類別、3 碼數字、必填、「車型大類」
   - SEG2：系統、3 碼數字、必填、「系統分類」
   - SEG3：部品、3 碼數字、必填、「部品代碼」
   - SEG4：版本、1 碼英數、非必填、「料號版本」
   - SEG5：廠商區隔、2 碼英數、非必填、「廠商區隔」
6. 分隔符 = `·`、來源代碼前綴 = `#`
7. 填範例 = `VAG-1K0·129·620·A #VALDEU`
8. [儲存] → isActive = true、可被 part 主檔引用

## 5.2 業務人員建料號（依品牌規則組 part_code_2）

1. 進 part 主檔 → [新增料號]
2. 選車型品牌 = VAG
3. 系統 query nx01_brand_code_rule WHERE car_brand_id = VAG
4. UI 動態顯示 VAG 5 個 SEG 輸入欄（依 seg_definitions）
5. 業務填：SEG1 = 1K0、SEG2 = 129、SEG3 = 620、SEG4 = A、SEG5 = （空）
6. 廠商 = VALEO（自動帶 VAL）、產地 = Germany（自動帶 DEU）
7. 系統組 part_code_2 = `VAG-1K0·129·620·A #VALDEU`
8. part_code_2 唯一性檢查（NX01-05 範圍）→ 儲存

## 5.3 tenant 自訂分隔符（業務 muscle memory 場景）

業界真相：不同公司料號呈現偏好不同：
- 恆迎習慣：`VAG-1K0·129·620·A #VALDEU`（`·` 分隔）
- 業界 A 客戶：`VAG-1K0-129-620-A #VALDEU`（`-` 分隔）
- 業界 B 客戶：`VAG-1K0 129 620 A #VALDEU`（空白分隔）

流程：
1. tenant SYSADMIN（或 OWNER）進「品牌規則列表」
2. 編輯 VAG 規則（系統 seed 預設 `·`）
3. 改 separator = `-`
4. 全租戶 VAG 料號顯示自動改成 `-` 分隔（既有資料即時生效、純呈現層）

⭐ 規則本身不變、只是呈現格式調整

## 5.4 tenant 加副廠規則（業務 muscle memory 場景）

業界真相：副廠（aftermarket / OEM）有自己的料號編碼、不在系統 seed 4 個主流品牌內。

流程：
1. NX01-12 先建 car_brand = 「FEBI」（副廠品牌）
2. tenant SYSADMIN 進「品牌規則列表」→ [新增規則] → 選 FEBI
3. 依 FEBI 業界料號結構設 seg_definitions
4. 儲存 → 該 tenant 的 FEBI 規則啟用（不影響其他 tenant）

⭐ tenant scoped 設計支援此場景

## 5.5 異常：已啟用規則想改 SEG 數量

- 規則 isActive=true 且已被 part 主檔引用 N 筆
- SYSADMIN 想改 seg_count = 5 → 6
- 系統提示：「此規則已被 N 筆料號引用、改 SEG 數量會影響歷史料號顯示、建議停用後建新版規則」
- v1.0 不支援 versioning（Q4 拍）、SYSADMIN 須評估影響後手動處理

## 5.6 異常：產地 ISO 碼不在 NX01-09 country 表

- 業務人員建料號填產地 = XYZ（不存在的 ISO 3 碼）
- 系統檢核：產地必須是 NX01-09 country 表的有效 isoCode3
- 提示：「產地 XYZ 不存在、請聯絡 SYSADMIN 加入 country 型錄」

---

# § 6. 角色權限

| 角色 | 看規則 | 改呈現格式（分隔符）| 加副廠規則 | 啟用 / 停用 | 用規則建料號 |
|------|-------|-----------------|---------|-----------|------------|
| SYSADMIN（跨租戶）| ✅ 全租戶 | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ 自租戶 | ✅ | ✅（PRO tier）| ✅ | ✅ |
| PURCHASING | ✅ | ❌ | ❌ | ❌ | ✅ |
| WAREHOUSE / SALES / FINANCE / HR | ✅ | ❌ | ❌ | ❌ | ❌ |

⭐ tenant scoped 設計：OWNER 可改自家分隔符 + 加副廠規則、不影響其他 tenant
⭐ 系統 seed 4 個主流品牌不可刪、只能改呈現格式（避免誤刪斷 part 主檔）

「用規則建料號」對應 part 主檔權限（依 PURCHASING role）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| 看品牌規則（read-only）| ✅ | ✅ | ✅ |
| 建料號依規則組 part_code_2 | ✅ | ✅ | ✅ |
| 系統 seed 4 個主流品牌（VAG / POR / BMW / BEN）| ✅ | ✅ | ✅ |
| OWNER 改呈現格式（分隔符 `·` / `-` / 空白）| ✅ | ✅ | ✅ |
| OWNER 加副廠規則（自家貼牌 / FEBI 等 aftermarket）| ❌ | ✅ 上限 5 個 | ✅ 無上限 |
| SYSADMIN 跨租戶維護 | 系統級、Tier 無關 | 系統級 | 系統級 |

→ 本表核心功能 LITE 即支援
→ Tier 差異主要在「加副廠規則上限」（PRO 加值）
→ 系統 seed 4 主流品牌全 Tier 可用、tenant 不可刪只能改呈現

---

# § 8. 注音索引

## 8.1 是否需注音索引

❌ 不需要、品牌規則是 SYSADMIN 維護的型錄、F4 快搜場景不適用。

業務人員建料號時是「先選 car_brand 才看規則」、不是「打注音搜規則」。

## 8.2 對齊範式

對齊 NX01-10 注音快搜系統設計：B 型錄類表（非主檔）通常不需注音索引、除非業務人員有快搜需求。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-06 | Alex | 初版草稿、9 段完整、§10 列 5 個 Q 給 Crown 拍 |
| v1.0 | 2026-05-06 | Alex | Crown 拍 Q1~Q5 + 揭露關鍵業界真相：(1) seed 4 個主流品牌 VAG/POR/BMW/BEN（不是 6 個）(2) tenant scoped + 系統 seed apply（不是全域、業務真相揭露：tenant 改呈現格式 + 加副廠規則）(3) 產地 v1.0 用 varchar、NX01-09 完成後對接 FK (4) seg_definitions 儲存方式 Hank 自決（Alex 失誤 #12：技術實作不該問 Crown）(5) 跨品牌 unique 不做檢查（恆迎 18 年業界 muscle memory：不會發生、Alex 失誤 #13：過度防呆）|

---

# § 10. 待 Hank grep 確認項

（v1.0 升版後此段取代原 §10 待拍 Q）

1. nx01_brand_code_rule schema 既有狀態揭露（schema 是否已建）
2. nx01_car_brand schema 既有狀態揭露（依賴、NX01-12 預期實作）
3. nx01_country schema 既有狀態揭露（NX01-09 階段 D 真實實作情況、確認本軌 varchar 階段策略）
4. seg_definitions 儲存方式 Hank 自決（JSON 陣列 / 子表 / Hybrid）
   - Hank 依 PostgreSQL JSONB 既有用法 / NEXORA 既有範式自決
   - 揭露選擇理由（依工作流規則 #12：技術實作 Hank 自決）
5. v1.0 系統 seed 4 個品牌業界料號結構（VAG / POR / BMW / BEN）
   - Hank 諮詢揭露業界資料來源（廠商技術手冊 / OEM catalog / Yaro Crown 提供）
   - 各品牌 seg_count + seg_definitions 詳細結構待 Crown 補真相或 Hank 諮詢
6. 產地 ISO 3 碼 seed 主要清單（v1.0 varchar 階段、後續 NX01-09 對接）
   - 至少含：DEU / TWN / CHN / JPN / USA / FRA / ITA / GBR / KOR / THA
7. tenant scoped seed apply 範式（system seed → 每 tenant 啟用時 copy）
   - 對齊 NEXORA 既有 seed 三層架構（system / template / test）

---

# § 11. 跨軌依賴

| 方向 | 對象 | 關係 |
|------|------|------|
| 依賴（前置）| `nx01_car_brand`（NX01-12）| 必須先建車型品牌、才能定義此品牌規則 |
| 依賴（v1.0 varchar 階段）| `nx01_country`（NX01-09）| 產地 ISO 3 碼參考、NX01-09 完成後對接 FK |
| 被依賴（核心）| `nx01_part`（NX01-05）| part_code_2 結構由本表定義、戰略核心依賴 |
| 被依賴（業務）| NX02 採購 / NX03 銷售 / NX05 倉儲 | 透過 part 主檔間接依賴 |

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：
- 階段 1：建 schema + 4 個品牌 seed（VAG / POR / BMW / BEN）
- 階段 2：規則編輯頁 UI（OWNER 改分隔符）
- 階段 3：副廠規則新增 UI（PLUS / PRO tier 加值）
- 階段 4：part 主檔整合（依規則組 part_code_2、NX01-05 範圍）

NX01-12 / NX01-05 完成後本表才完整接通業務流。

---

> 本拍板版 v1.0 對齊 spec-template v1.0、11 段完整、Crown 拍 Q1~Q5 + 揭露 tenant scoped 業界真相 + 跨品牌 unique 不存在落地。
> ⭐ 戰略核心定位：part_code_2 結構由本表定義、NEXORA 全料號上游表。
