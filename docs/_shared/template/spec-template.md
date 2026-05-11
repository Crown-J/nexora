<!-- docs/_shared/template/spec-template.md -->

# NEXORA - 子規格書範本基準檔

> 文件版本：v1.0
> 最後更新：2026-05-04
> 撰寫者：Alex（Claude PM AI）
> 狀態：v1.0 拍板版、所有模組子規格書對齊此範本

---

## 文件定位

本文件是 **NEXORA 全模組子規格書的範本基準檔**、用於統一 NX01 ~ NX10 各模組子規格書的結構與深度。

**使用方式：**

1. 寫子規格書（如 NX01-03 客戶/供應商主檔工作站）時、對齊本範本 9 段結構
2. 每段深度對齊本範本的「假範例」展示
3. 不必每段都寫（如不涉及 Tier 差異、§7 寫「無差異、全 tier 共用」）
4. 但段落順序 / 標題不可改、保持結構一致性

**為什麼需要範本：**

- 16+ 份子規格書要對齊（NX01-01 ~ NX01-16 + 其他模組）
- 結構不一致 → 跨對話讀文件易困惑
- 深度不一致 → Hank 實作時拿到的資訊密度不對齊

**📚 工程規範索引：**

- 主檔規格書範本：見各模組 `nxXX-overview.md` 第一份範本（如 [docs/nx01/spec/intent/nx01-overview.md](docs/nx01/spec/intent/nx01-overview.md)）
- 命名規則：見 [CLAUDE.md](CLAUDE.md) §五
- 多租戶隔離：見 [CLAUDE.md](CLAUDE.md) §七
- 設計哲學：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) §💎
- 擴充性原則：見 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) § 工程模式 #23

---

## 範本說明

下方 9 段是子規格書的標準結構。

每段含 2 部分：

```
【撰寫指引】     ← 該寫什麼方向、寫多深、注意什麼
【假範例】       ← 用 nx01_color_palette（汽車顏色型錄、NEXORA 沒實作的假設子模組）展示
```

**假範例業務語意：**
- `nx01_color_palette`（汽車顏色型錄）= 維護汽車零件可用顏色（如「珍珠白 / 寶石藍 / 烏木黑」）
- 業務情境：part 主檔可標多個顏色變體（如同一料號有 3 種顏色）
- NEXORA **沒有**這個子模組、純粹當範本展示用

---

# § 1. 子模組定位

## 撰寫指引

- 業務人員視角：這子模組是給誰用的？做什麼任務？
- 在 NX01 整體扮演什麼角色？（主檔型 / 型錄型 / 通知型 / 索引型）
- 跨模組依賴：哪些業務模組（NX02~NX10）會引用此主檔？
- 字數：1~2 段、共 100~300 字

---

## 假範例（nx01_color_palette 顏色型錄）

### 1.1 子模組是什麼

`nx01_color_palette`（顏色型錄）= 系統管理員 / BUSINESS_OWNER 維護的「**汽車零件顏色型錄**」。

業務人員（採購 / 倉管 / 業務）在維護料號（part）時、從顏色型錄下拉選顏色變體、不打字。

### 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| BUSINESS_OWNER | 設定公司可賣的顏色清單 | 每年 1~2 次 |
| 採購 | 建料號時下拉選顏色 | 每天 |
| 業務 | 報價時用顏色篩選料號 | 每天 |

### 1.3 跨模組引用

- `nx01_part`（料號主檔）：每個 part 可標多個 color_palette_id
- `nx04_so`（銷貨單）：銷貨明細顯示顏色（從 part 帶出）
- `nx08_report`（報表）：按顏色維度統計銷售

---

# § 2. UI 頁面

## 撰寫指引

- 列出主要頁面（列表 / 詳細 / 搜尋 / 編輯）
- 每個頁面的核心功能（不列所有按鈕、列關鍵動作）
- 如有特殊互動（注音搜尋 F4 / 跨頁面切換 / 拖拉排序），標明
- 字數：每頁面 50~150 字

---

## 假範例（nx01_color_palette）

### 2.1 列表頁（`/master/color-palette`）

- 顯示當前租戶所有顏色（含 isActive 狀態）
- 表格欄位：code / name / 色票（hex 顏色預覽）/ 引用次數 / 狀態
- 動作：[新增] / [編輯] / [停用] / [批次匯入]
- 注音搜尋：F4 注音碼快搜（ㄓㄓㄅ → 珍珠白）

### 2.2 編輯頁（`/master/color-palette/:id/edit`）

- 表單欄位：code / name / 色票（hex picker）/ 排序順位 / 備註
- 系統欄位（不可改）：tenantId / createdAt / createdBy / 引用次數
- 動作：[儲存] / [取消] / [刪除]（如未被引用）/ [停用]（如已被引用）

### 2.3 批次匯入頁（`/master/color-palette/import`）

- 上傳 CSV（業界標準色票檔）
- 預覽 → 對照既有 → 衝突解決 → 匯入

---

# § 3. 業務規則

## 撰寫指引

- 5 個子段、不可漏（PK / 業務檢核 / 跨主檔連動 / 跨模組連動 / 軟刪除語意）
- 每段重點寫「業務真相」、不寫技術實作（schema / API 細節）
- 跨主檔連動 = 此主檔會「引用其他主檔」嗎？
- 跨模組連動 = 「哪些業務單據會引用此主檔」？
- 字數：5 子段共 300~600 字

---

## 假範例（nx01_color_palette）

### 3.1 PK（unique 範圍）

- `code` unique 範圍 = `(tenantId, code)`（多租戶 scoped）
- 對齊 [CLAUDE.md §五](CLAUDE.md) 命名規則
- 全域 unique = `(tenantId, code)`，不是 `(code)`

### 3.2 業務檢核

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| code | ✅ | 大寫英文 + 數字（3~10 字元）| `(tenantId, code)` unique |
| name | ✅ | 中/英文（最長 50 字元） | 不可全空白 |
| hex | ✅ | `#XXXXXX`（6 位 16 進位）| 必為合法色碼 |
| 排序順位 | ✅ | 整數 | 預設 0、業務人員可改 |

跨欄位驗證：無

### 3.3 跨主檔連動

- 引用 `nx99_tenant`（多租戶隔離）
- 不引用其他 NX01 主檔（型錄主檔、被引用、不引用其他）

### 3.4 跨業務模組連動

哪些業務單據會引用 `color_palette`：

- `nx01_part.color_palette_ids`（多對多、part 可標多色）
- `nx04_so_line` 顯示顏色（從 part 帶出）
- `nx08_report` 按顏色維度統計

→ 一旦此型錄被引用、不可真刪、只能停用。

### 3.5 軟刪除 vs 停用

對齊 [nx01-overview.md §3.2](docs/nx01/spec/intent/nx01-overview.md)：

- 未被引用：可真刪（純 metadata error 修正）
- 已被引用：只能停用（`isActive = false`）
  - 既有 part 仍顯示此顏色
  - 新增 part 不可選此顏色

---

# § 4. 欄位列表

## 撰寫指引

- 表格格式：欄位名 / 業務語意 / 必填 / 預設值 / 來源
- 系統自動欄位（tenantId / createdAt / 等）加註「系統自動」、不展開
- 業務必填欄位逐一列出
- 字數：依欄位數（10~30 個欄位通常 200~600 字）

---

## 假範例（nx01_color_palette）

### 4.1 業務欄位

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `code` | 顏色代碼（如 `PEARL-WHITE`）| ✅ | 無 | 業務人員填 |
| `name` | 顏色名稱（如「珍珠白」）| ✅ | 無 | 業務人員填 |
| `hex` | 色票 hex 碼（如 `#F8F8FF`）| ✅ | `#FFFFFF` | 業務人員 hex picker 選 |
| `sort_order` | 排序順位（列表呈現用）| ✅ | 0 | 業務人員填 |
| `note` | 備註（如「金屬漆」）| ❌ | null | 業務人員填 |
| `isActive` | 是否啟用 | ✅ | true | 業務人員可停用 |

### 4.2 系統自動欄位（不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `tenantId` | 多租戶隔離（自動帶當前租戶） |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（從登入 user 帶） |

### 4.3 注音索引欄位（系統自動同步）

phonetic_code（聲母碼如「ㄓㄓㄅ」）、phonetic_full（完整注音）由 trigger 自動寫入 `nx01_phonetic_index`、不在主檔表內。

---

# § 5. 工作流程

## 撰寫指引

- 主要工作流（新增 / 編輯 / 刪除 / 批次匯入 / 跨角色協作）
- 跨角色工作流：A 角色建 vs B 角色用、流程差異
- 異常處理：撞 unique / 跨主檔引用衝突 / 等
- 字數：每流程 50~200 字

---

## 假範例（nx01_color_palette）

### 5.1 BUSINESS_OWNER 建立顏色（標準流程）

1. 進列表頁
2. 點 [新增]
3. 填 code / name / hex / 排序
4. 儲存
5. 系統自動寫 phonetic_index
6. 返列表、新顏色出現在頂端（排序 = 0）

### 5.2 採購建料號時下拉選顏色

1. 採購建 part
2. 顏色欄位 → 下拉選 color_palette
3. 可多選（同一料號多色）
4. 系統自動帶 part.color_palette_ids

### 5.3 異常：撞 unique

業務人員 code 撞既有顏色（如 `PEARL-WHITE` 已存在）：

- UI 即時驗證、紅字提示「此 code 已被使用」
- 不可儲存、業務改 code 或停用既有

### 5.4 異常：被引用的顏色想刪除

業務人員試圖真刪「珍珠白」、但已有 5 筆 part 引用：

- UI 跳警告「此顏色已被 5 筆 part 引用、不可真刪、是否改為停用？」
- 業務確認 → `isActive = false`
- 既有 part 仍顯示「珍珠白」（歷史可查）
- 新增 part 不可選此顏色

---

# § 6. 角色權限

## 撰寫指引

- 簡表：角色 × 動作 矩陣
- 對齊主檔規格書 §4 業務角色 vs 子模組權限
- 字數：50~150 字

---

## 假範例（nx01_color_palette）

| 角色 | 看 | 改 | 新增 | 停用 | 真刪 |
|------|---|---|------|------|------|
| SYSADMIN | ✅（跨租戶）| ✅ | ✅ | ✅ | ✅ |
| BUSINESS_OWNER | ✅（自己租戶） | ✅ | ✅ | ✅ | ❌ |
| HR | ✅ | ❌ | ❌ | ❌ | ❌ |
| 採購 / 倉管 | ✅（下拉選用）| ❌ | ❌ | ❌ | ❌ |
| 業務 | ✅（下拉選用）| ❌ | ❌ | ❌ | ❌ |

---

# § 7. Tier 差異

## 撰寫指引

- LITE / PLUS / PRO 在此子模組的差異
- 對齊主檔規格書 §5 LITE/PLUS/PRO Tier 差異
- 如無差異、寫「無差異、全 tier 共用」
- 字數：50~200 字

---

## 假範例（nx01_color_palette）

```
LITE:
  - 顏色數限制 5 個（系統預設、不可自訂）
  - 預設色:白 / 黑 / 銀 / 紅 / 藍

PLUS:
  - 顏色數限制 30 個
  - 可自訂

PRO（Yaro 主場）:
  - 顏色數無限
  - 可自訂
  - 批次匯入業界標準色票檔（如 RAL / Pantone）
```

→ Tier 限制由 Plan Guard 強制（[CLAUDE.md §八](CLAUDE.md)）。

---

# § 8. 注音索引

## 撰寫指引

- 是否需 trigger 同步 `phonetic_index`？
- 如需、列出哪些欄位 → phonetic_code 來源
- 對齊主檔規格書 §3.6 注音快搜跨主檔機制
- 字數：50~150 字

---

## 假範例（nx01_color_palette）

### 8.1 是否需注音索引

✅ 需要（業務人員 / 採購會打注音搜顏色）

### 8.2 trigger 來源欄位

| 主檔欄位 | → 注音索引 |
|---------|-----------|
| `name`（如「珍珠白」）| `phonetic_code = 'ㄓㄓㄅ'` |
| `name` | `phonetic_full = 'ㄓㄣ ㄓㄨ ㄅㄞˊ'` |

### 8.3 trigger 觸發時機

- INSERT `nx01_color_palette` → 自動寫 phonetic_index
- UPDATE `nx01_color_palette.name` → 自動更新 phonetic_index
- DELETE `nx01_color_palette` → 自動刪除 phonetic_index 對應紀錄

對齊 [PROJECT_CONTEXT 工程模式 #4](PROJECT_CONTEXT.md)「trigger 做 invariant」。

---

# § 9. Document Control Log

## 撰寫指引

- 標準格式（版本 / 日期 / 撰寫者 / 變更摘要）
- 第一次撰寫 = v0.1.0
- Crown 拍板 = v1.0
- 後續累積 v1.1 / v1.2 / v2.0 ...
- 字數：依版本數

---

## 假範例

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v0.1.0 | YYYY-MM-DD | Alex | 初稿 |
| v1.0 | YYYY-MM-DD | Alex | Crown review 通過、正式版 |
| v1.1 | YYYY-MM-DD | Alex | 加 §X.X 業務規則細節 |

---

## 範本維護紀錄（spec-template.md 自身）

| 版本 | 日期 | 撰寫者 | 變更摘要 |
|------|------|-------|---------|
| v1.0 | 2026-05-04 | Alex | 初版、Crown 拍 B+C（位置 _shared/template/ + 結構 + 假範例 nx01_color_palette）|

---

*範本結束。所有 NEXORA 子規格書對齊此範本結構、深度。*
