<!-- docs/nx01/spec/intent/nx01-06-warehouse.md -->

# NX01-06 - 倉庫主檔工作站子規格書

> 文件版本：v1.0（Crown 拍 5 個 Q、Alex 修訂後正式版）
> 最後更新：2026-05-05
> 撰寫者：Alex（Claude PM AI）
> 審核者：Crown Lin
> 狀態：v1.0 正式版、待 Hank push 到 docs/nx01/spec/intent/nx01-06-warehouse.md

---

## 文件定位

NX01-06 = NX01 主檔模組的「**倉庫主檔工作站**」子規格書。

對齊 [docs/_shared/template/spec-template.md](docs/_shared/template/spec-template.md) 9 段範本結構。

**範圍：**
- `nx01_warehouse`（倉庫主檔）
- 不含倉別類型型錄（歸 NX01-07 基礎型錄管理、`nx01_warehouse_type`）
- 不含庫存帳（歸 NX03 庫存模組、`warehouse_stock`）
- 不含調撥業務邏輯（歸 NX03 庫存模組）

**戰略意義：**

對齊 [CLAUDE.md §四「版本方案」](CLAUDE.md) Tier 設計核心：
- LITE：單倉（MW1）
- PLUS：多倉（MW1+BW1）
- PRO：5 倉（HW1+MW1+BW1~4）

→ 倉庫主檔是 NEXORA Tier 差異最明顯的設計、對應業界從單店到連鎖經銷的擴展路徑。

**📚 工程規範索引：**
- 主檔規格書：見 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎

---

## § 1. 子模組定位

### 1.1 子模組是什麼

`nx01_warehouse`（倉庫主檔）= **NEXORA 庫存實體儲存單位**、所有「東西放哪」的紀錄都引用此主檔。

**業務語意：**
- 1 warehouse = 1 個獨立倉庫（含實體地址、容量、負責人）
- 倉庫類型由 `nx01_warehouse_type` 型錄定義（總倉 / 主倉 / 分倉）
- 同 part 跨多倉、各倉庫存量分開算（NX03 庫存模組）

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| OWNER | 設定倉庫策略、新增 / 廢除倉庫 | 不常 |
| 倉管 | 改部分欄位（倉庫負責人 / 容量）| 偶爾 |
| 採購 | read-only、選預設倉庫 | 偶爾 |
| 業務 | read-only、看送貨倉庫 | 不常 |
| HR / FINANCE | read-only | 不常 |

### 1.3 跨模組引用

| 業務模組 | 引用方式 |
|---------|---------|
| NX02 採購 | PO 收貨倉庫 |
| NX03 庫存 | warehouse_stock 庫存帳 ⭐ |
| NX04 銷貨 | DN 出貨倉庫 |
| NX05 財務 | 庫存盤點對帳 |
| NX01-05 part | part 預設倉庫 |
| NX01-15 part_model | 之後可能用（適車型 vs 倉庫關係）|

→ 倉庫改動可能影響全 NEXORA 庫存帳、走擴充原則 #23。

### 1.4 ID 範圍標準

對齊既有 ID 慣例：

```
nx01_warehouse.id 命名規則:NX01WHSE + 7 位數字
  - NX01WHSE0000001 ~ 0899999    = 真實客戶 warehouse
  - NX01WHSE9900001 ~ 9999999    = 測試租戶 warehouse
```

### 1.5 Tier 倉庫類型對應（對齊 CLAUDE.md §四）

```
LITE 單倉（1 個）:
  MW1 = Main Warehouse 1（主倉）

PLUS 多倉（3 個、PLUS-S/M/L 級可不同）:
  MW1 = Main Warehouse 1（主倉）
  BW1 = Branch Warehouse 1（分倉 1）

PRO 5 倉:
  HW1 = Head Warehouse 1（總倉）
  MW1 = Main Warehouse 1（主倉）
  BW1~BW4 = Branch Warehouse 1~4（分倉 1~4）
```

→ 「HW1 / MW1 / BW1~4」是 warehouse_code 命名範式（對應業界從單店到連鎖經銷）。
→ 業務人員自由命名也可、走範式對齊既有 NX02 採購單號規則（[CLAUDE.md line 116](CLAUDE.md)）。

---

## § 2. UI 頁面

### 2.1 列表頁（`/master/warehouse`）

**顯示內容：**
- 表格欄位：warehouse_code / name / 類型 / 地址 / 負責人 / 庫存品項數 / 狀態
- 預設排序：sort_order ASC（業務人員自定排序）
- 預設過濾：isActive = true

**互動功能：**
- 注音搜尋 F4：打「ㄓㄘ」+ F4 → 列出「總倉 / 主倉 / 分倉」
- 一般搜尋：warehouse_code / name / 地址
- 動作：[新增] / [編輯] / [停用] / [批次匯入]

### 2.2 詳細頁（`/master/warehouse/:id`）

**顯示內容：**
- 主資訊區：warehouse_code / name / 類型 / 倉庫負責人
- 地址區：階層下拉（city/district/street + 6 巷弄門牌欄位、對齊 NX01-04 §4.6）
- 容量區：總容量 / 目前使用率 / 安全庫存閾值
- 庫存統計：總品項數 / 總庫存價值（連結 NX03）
- 操作紀錄：建立 / 編輯歷史

**動作：**
- [編輯]
- [停用] / [啟用]
- [真刪除]（僅未被引用且零庫存時）

### 2.3 編輯頁（`/master/warehouse/:id/edit`）

**表單分區：**
- 基本資訊：warehouse_code / name / 類型（下拉 nx01_warehouse_type）
- 地址資訊：階層下拉（對齊 NX01-04 §4.6 巷弄門牌結構化）
- 業務資訊：倉庫負責人（FK to nx01_user）/ 總容量 / 安全庫存閾值
- 排序：sort_order

---

## § 3. 業務規則

### 3.1 PK（unique 範圍）

- `id` UNIQUE（系統 ID）
- `(tenantId, warehouse_code)` UNIQUE（同租戶內 warehouse_code 唯一）

對齊 [CLAUDE.md §五](CLAUDE.md) 命名規則 + 多租戶隔離。

### 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| `warehouse_code` | ✅ | 大寫英文 + 數字（最長 10 字元）| (tenantId, warehouse_code) unique、推薦 HW1/MW1/BW1~4 範式 |
| `name` | ✅ | 中/英文（最長 50 字元）| 顯示用 |
| `warehouse_type_id` | ✅ | FK to nx01_warehouse_type | 倉別類型 |
| `manager_user_id` | ❌ | FK to nx01_user | 倉庫負責人 |
| `is_main` | ✅ | boolean | 同 tenant 只能 1 個 is_main=true |
| `total_capacity` | ❌ | 數字（容量單位、待 NX03 定義）| ≥ 0 |
| `sort_order` | ✅ | 整數 | 業務排序 |
| `note` | ❌ | 字串 | 備註 |
| `isActive` | ✅ | boolean | true |

地址欄位（對齊 NX01-04 §4.6 結構化）：

| 欄位 | 必填 | 業務語意 |
|------|-----|---------|
| `city_id` | ✅ | FK to nx01_city |
| `district_id` | ✅ | FK to nx01_district |
| `street_id` | ✅ | FK to nx01_street |
| `lane` | ❌ | 巷（純數字）|
| `alley` | ❌ | 弄（純數字）|
| `building_no` | ✅ | 號（純數字、必填）|
| `building_sub_no` | ❌ | 號的子號（純數字）|
| `floor` | ❌ | 樓層（容納 B1/3F）|
| `room_no` | ❌ | 室號 |

### 3.3 跨主檔連動

| 引用主檔 | 用途 | 必填 |
|---------|------|-----|
| `nx01_warehouse_type` | 倉別類型 | ✅ |
| `nx01_user` | 倉庫負責人 | ❌ |
| `nx01_city / district / street` | 地址 | ✅ |
| `nx99_tenant` | 多租戶 | ✅ |

### 3.4 跨業務模組連動

詳見 §1.3 跨模組引用表。

→ 一旦 warehouse 被 NX03 庫存帳引用、不可真刪、只能停用。

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview §3.2](docs/nx01/spec/intent/nx01-overview.md)：

- **未被引用 + 零庫存**：可真刪
- **有庫存或被單據引用**：只能停用（`isActive = false`）

⭐ Q3 拍板（A）：倉庫停用前必須清空庫存（轉移到其他倉庫）、保護資料完整性

### 3.6 主倉唯一性（is_main）

- 同租戶只能有 1 個 is_main=true 的倉庫
- 對應「主倉是預設交易倉庫」業務情境
- LITE 單倉自動 is_main=true
- PLUS / PRO 主倉手動指定

⭐ Q5 拍板（A）：LITE 單倉強制 is_main=true、不可改（單倉沒得選）

---

## § 4. 欄位列表

### 4.1 業務欄位

詳見 §3.2 業務檢核表（已含完整欄位 + 必填 + 格式）。

### 4.2 系統自動欄位（不可改）

對齊 [CLAUDE.md §六](CLAUDE.md)：

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID（NX01WHSE + 7 位數）|
| `tenantId` | 多租戶隔離 |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者 |

### 4.3 注音索引欄位（系統自動同步）

`phonetic_code`（聲母碼如「ㄓㄘ」）、`phonetic_full`（完整注音）由 trigger 自動寫入 `nx01_phonetic_index`、不在主檔表內。

對齊 [nx01-overview §3.6 注音快搜跨主檔機制](docs/nx01/spec/intent/nx01-overview.md)。

第二階段擴展主檔（warehouse 屬此階段）：
- 第一階段:nx01_part / nx01_partner（已對齊）
- 第二階段:nx01_warehouse / nx01_user（含 short_name）

---

## § 5. 工作流程

### 5.1 OWNER 新增倉庫（標準流程）

```
1. OWNER 進列表頁、點 [新增]
2. 填基本資訊（warehouse_code 推薦範式 / name）
3. 選倉別類型（下拉 nx01_warehouse_type）
4. 填地址（階層下拉 city/district/street + 巷弄門牌）
5. 選倉庫負責人（下拉 nx01_user）
6. 設 is_main（同租戶 1 個）
7. [儲存]
8. 系統自動:
   - 寫 phonetic_index
   - 寫 audit log
   - 通知該倉庫負責人（之後 NX01-08 公告系統）
9. 返列表
```

### 5.2 倉管改部分欄位

```
1. 倉管進倉庫詳細頁
2. 點 [編輯]
3. 系統檢查倉管權限:
   - 開放:total_capacity / 安全庫存閾值 / sort_order
   - 不開放:warehouse_code / name / 類型 / is_main（OWNER 主導）
4. [儲存]
5. 系統自動寫 audit log
```

### 5.3 異常：warehouse_code 撞 unique

OWNER 試圖填 warehouse_code = `MW1`、但同租戶已存在：

- UI 即時驗證、紅字提示「此倉庫代碼已被使用」
- 不可儲存、OWNER 改 code

### 5.4 異常：停用倉庫但仍有庫存（Q3 拍板後落地）

```
1. OWNER 試圖停用「MW1 主倉」
2. 系統檢查 NX03 庫存帳:此倉庫有 500 筆 part 庫存
3. 跳警告:「此倉庫有 500 筆庫存、停用前請先清空庫存（轉移其他倉庫）」
4. OWNER 確認:
   - 選項 1:取消停用、先做庫存調撥（NX03 模組）
   - 選項 2:強制停用（業務風險、需 OWNER 二次確認）
```

### 5.5 異常：改主倉

```
1. OWNER 在 PLUS 多倉場景、想把主倉從 MW1 改為 MW2
2. 點編輯 MW2、勾選 is_main = true
3. 系統警告:「主倉變更會影響預設出貨倉庫、確認嗎?」
4. OWNER 確認:
   - 系統自動 MW1.is_main = false
   - MW2.is_main = true
   - 寫 audit log（誰改的）
   - 通知相關業務 / 倉管（之後 NX01-08）
```

---

## § 6. 角色權限

對齊 NX01-02 §6 看 vs 改分離 + Crown 拍 OWNER 階層繼承（Q3）：

| 角色 | 看 | 改完整 | 改部分 | 新增 | 停用 | 真刪 |
|------|---|-------|-------|------|------|------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅（自己租戶全部）| ✅ ⭐ | ✅ | ✅ | ✅ | ❌ |
| 倉管 | ✅（自己租戶全部）| ❌ | ✅ ⭐（容量 / 閾值 / sort）| ❌ | ❌ | ❌ |
| 採購 / 業務 / 財務 | ✅（read-only）| ❌ | ❌ | ❌ | ❌ | ❌ |
| HR | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**關鍵權限規則：**

⭐ **OWNER 是倉庫主檔的主要維護人**：
- 對應業界做法（倉庫策略屬高層決策）
- 不開放給倉管（避免擅自改倉庫類型）

⭐ **倉管改部分欄位**：
- 開放：總容量 / 安全庫存閾值 / sort_order
- 不開放：warehouse_code / name / 類型 / is_main

⭐ **OWNER 階層繼承**：
- OWNER 自動有倉管所有權限

---

## § 7. Tier 差異（對齊 CLAUDE.md §四 版本方案）

⭐ 對齊 [CLAUDE.md §四「版本方案」](CLAUDE.md) + line 86~88 既有 Tier 倉庫設計。

### LITE（基礎版、單店）

- **倉庫數：1 個**（強制 MW1 主倉、is_main=true）
- 倉別類型：1 種（MW 主倉）
- 多倉調撥：❌ 不開放

### PLUS（進階版、中型）

- **倉庫數：3 個**（PLUS-S/M/L 級可不同）
- 倉別類型：2 種（MW 主倉 + BW 分倉）
- 範式:MW1 + BW1（+ BW2 if PLUS-L）
- 多倉調撥：✅ 開放（NX03 庫存模組）

### PRO（專業版、大型 / Yaro 主場）

- **倉庫數：5 個**
- 倉別類型：3 種（HW 總倉 + MW 主倉 + BW 分倉）
- 範式:HW1 + MW1 + BW1~4
- 多倉調撥：✅ 開放
- 跨倉庫存查詢：✅ 完整
- ⭐ 對應業界連鎖經銷（恆迎反面教材揭露的 5 倉模型）

→ Tier 限制由 Plan Guard 強制（[CLAUDE.md §八](CLAUDE.md)）。

---

## § 8. 注音索引

### 8.1 是否需注音索引

✅ 需要（業務 / 倉管打倉庫名搜尋、第二階段擴展主檔）

### 8.2 trigger 來源欄位

| 主檔欄位 | → 注音索引 |
|---------|-----------|
| `name`（如「總倉」/「主倉」/「分倉 1」）| `phonetic_code` + `phonetic_full` |
| `warehouse_code`（如「HW1」）| ❌ 不建（純英數、業務直接打）|

### 8.3 trigger 觸發時機

- INSERT / UPDATE name → 自動寫 phonetic_index
- DELETE → 自動刪除 phonetic_index 對應紀錄

---

## § 9. Document Control Log

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | 2026-05-05 | Alex | 初稿（NX01 第七份子規格書、對齊 spec-template + CLAUDE.md §四 Tier 倉庫設計）|
| v1.0 | 2026-05-05 | Alex | Crown 拍 5 個 Q、修訂後正式版 |

**v1.0 主要變更（vs v0.1.0）：**

對應 Crown 拍板的 5 個 Q：

- **Q1（倉庫類型代碼）**：A 維持既有範式（HW/MW/BW、對齊 CLAUDE.md line 86~88）
- **Q2（多倉調撥規則）**：A 任意倉到任意倉（細節歸 NX03 庫存模組）
- **Q3（倉庫停用庫存處理）**：A 停用前必須清空（§3.5 落地）
- **Q4（地址結構化）**：A 維持（對齊 NX01-04 §4.6 6 巷弄門牌欄位）
- **Q5（LITE 單倉強制 is_main）**：A 強制 is_main=true、不可改（§3.6 落地）

---

## § 10. 待 Hank grep 確認項

⚠️ 以下事項 Hank push 前主動確認:

A. 既有 nx01_warehouse schema 確認:
   - id 欄位範圍規則對齊（NX01WHSE + 7 位數）
   - warehouse_code composite unique 含 tenantId
   - is_main partial unique（同 tenant 只 1 個 is_main=true）
   - manager_user_id FK to nx01_user

B. 地址欄位確認（對齊 NX01-04 §4.6）:
   - city_id / district_id / street_id FK to NX01-09 三表
   - 6 巷弄門牌欄位（lane / alley / building_no / building_sub_no / floor / room_no）
   - 是否已有（軌 D 已補 NX01-04、warehouse 是否同步補?）
   - 如缺 → 開新 task TASK-PHASE2-NX01-WAREHOUSE-SCHEMA-EXTEND-01

C. 既有 6 筆 warehouse seed 對齊 Tier 設計:
   - CLAUDE.md line 314 寫「ALL/PLUS/PRO 混合（6 筆）」
   - 確認是否對齊本規格書 §7 Tier 倉庫設計（LITE 1 / PLUS 3 / PRO 5）
   - 如 drift → 揭露給 Crown 拍處理時機

→ 此項由 Hank push 時主動揭露、不阻塞規格書落地。

---

*文件結束。NX01-06 子規格書 v1.0 完成、待 Hank push docs/nx01/spec/intent/nx01-06-warehouse.md。*
