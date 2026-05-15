<!-- docs/nx01/spec/intent/nx01-10-phonetic-search.md -->

# NEXORA NX01-10 注音快搜系統（nx01_phonetic_dictionary + nx01_phonetic_index）子規格書

> 文件版本：v1.0
> 最後更新：2026-05-06
> 狀態：拍板版、Crown 拍 Q1~Q5 全部對齊 Alex 推薦
> 撰寫：Alex（Claude PM AI）
> 對應 task：TASK-PHASE2-NX01-10-PHONETIC-SPEC-V1-01
> 性質：跨模組基礎設施（B 型錄字典 + D 索引）

---

# § 1. 子模組定位

## 1.1 子模組是什麼

NX01-10 注音快搜系統 = NEXORA **業務人員 muscle memory 級快搜基礎設施**、由兩張表組成：

- `nx01_phonetic_dictionary`（B 型錄、全域字典）：漢字 → 注音對照表（約 10000 字）
- `nx01_phonetic_index`（D 索引、每租戶）：主檔 → 注音碼快搜索引、trigger 自動同步

業務情境：業務 / 倉管打「ㄅㄓㄑ」+ F4 → 列出「避震器 / 避震器上座 / 避震器底座」、不必打全名、業界 muscle memory 級。

對齊 [PROJECT_CONTEXT 工程模式 #4](PROJECT_CONTEXT.md)：「trigger 做 invariant」、跨主檔索引一致性由 DB 層保證、不靠 application 層維持。

## 1.2 業務人員視角

| 角色 | 用此子模組做什麼 | 多常用 |
|------|---------------|-------|
| 業務 / 倉管 / 採購 | 打注音碼快搜 part / partner / user | 每天、業界 muscle memory 級 |
| 業務 / 倉管 | 處理多音字主檔（如「金屬剎車片」改注音） | 每月 1~2 次 |
| SYSADMIN | 維護全域 phonetic_dictionary（加字 / 修錯） | 不常 |
| OWNER / HR | 不直接用、但所有主檔操作都觸發 trigger 同步 | 隱性每天 |

## 1.3 跨模組引用

- `nx01_part`（料號）：第一階段主檔、phonetic_index 監聽
- `nx01_partner`（客戶 / 供應商）：第一階段主檔、phonetic_index 監聽
- `nx01_user`（user 主檔）：第二階段主檔、phonetic_index 監聽（NX01-01 v1.0 §8 已落地）
- `nx01_bulletin`（公告）：未來階段、依賴本軌（NX01-08 v1.0 §8 已預期）
- `nx99_tenant`：phonetic_index 多租戶隔離（dictionary 是全域）

---

# § 2. UI 頁面

## 2.1 全域 F4 快搜浮層（跨頁面共用元件）

- 任一主檔列表頁 / 表單頁、按 **F4** 觸發快搜浮層
- 浮層搜尋框輸入注音碼（如 ㄅㄓㄑ）
- Hybrid 結果展開（Crown 拍 Q2）：
  - 階段 1：先列 N 筆嚴格前綴匹配（如 ㄅㄓㄑ 完全對應）
  - 階段 2：N 筆不夠時、展開全前綴匹配（含 ㄅㄓ / ㄅ 開頭）
- 結果含「主檔類型 / 名稱 / code」三欄、點即跳該主檔
- 鍵盤導航：上下鍵選擇、Enter 跳轉、Esc 關閉

## 2.2 字典維護頁（`/master/phonetic-dictionary`、SYSADMIN 限定）

- 顯示全域 phonetic_dictionary 字典（10000 漢字 → 注音）
- 表格欄位：漢字 / 預設注音 / 多音注音清單 / 修改人 / 修改時間
- 動作：[新增字] / [編輯注音] / [批次匯入]
- 篩選：注音首碼 / 漢字部首

## 2.3 主檔注音碼修改（嵌入主檔編輯頁）

- 對齊 Q4 拍板：業務人員可在主檔編輯頁直接改該主檔注音碼
- 不動全域 dictionary、只蓋當前主檔的 phonetic_index
- 例：主檔「金屬剎車片」trigger 預生 ㄐㄕㄆ（剎 = ㄕㄚˋ）、業務人員手動改 ㄐㄕㄔ（剎 = ㄔㄚˋ）
- 主檔表單：注音碼 readonly + [編輯] 按鈕 → 開 modal 改

## 2.4 注音碼預覽 Modal（主檔編輯時觸發）

- 業務人員按 [編輯注音碼] → 開 modal
- modal 顯示：
  - 系統建議注音（程式預生）
  - 多音字提示（如「剎」可選 ㄕㄚˋ / ㄔㄚˋ）
  - 業務人員手動輸入欄
- 動作：[確定] / [取消] / [還原系統建議]
- 確定後寫 phonetic_index 該主檔記錄

## 2.5 注音搜索熱區（dashboard 統計、SYSADMIN）

- 顯示哪些注音碼搜尋頻率高、命中 / 未命中比例
- 用於辨識 dictionary 缺字（搜尋失敗 → SYSADMIN 補字典）

---

# § 3. 業務規則

## 3.1 PK（unique 範圍）

**`nx01_phonetic_dictionary`**：
- PK = `id`
- unique = `(character)` 全域唯一（單字元漢字）
- 不含 tenantId（全域字典、跨租戶共用）

**`nx01_phonetic_index`**：
- PK = `id`
- unique = `(tenantId, source_table, source_id)`（每筆主檔一筆索引）
- 對齊 [PROJECT_RULES.md §III.2](../../../PROJECT_RULES.md) 命名規則：跨主檔索引、tenant scoped

## 3.2 業務檢核

**`nx01_phonetic_dictionary`**：

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| character | ✅ | 單一漢字（1 字元）| 全域 unique |
| primary_phonetic | ✅ | 注音符號（單字注音、如 ㄅㄧˋ）| 必為合法注音 |
| alt_phonetics | ❌ | 注音符號陣列（多音字）| 0~5 個替代音 |
| primary_initial | ✅ | 聲母碼（如 ㄅ）| 從 primary_phonetic 自動算 |

**`nx01_phonetic_index`**：

| 欄位 | 必填 | 格式 | 業務檢核 |
|------|-----|------|---------|
| source_table | ✅ | 表名（part / partner / user 等）| enum |
| source_id | ✅ | 主檔 FK ID | 必對應現存主檔 |
| source_field | ✅ | 來源欄位名（name / display_name 等）| enum |
| source_text | ✅ | 來源文字（如「避震器」）| 從主檔 trigger 自動帶 |
| phonetic_code | ✅ | 聲母碼（如 ㄅㄓㄑ）| trigger 自動算、可業務人員覆蓋 |
| phonetic_full | ✅ | 完整注音（如 ㄅㄧˋ ㄓㄣˋ ㄑㄧˋ）| trigger 自動算、可業務人員覆蓋 |
| is_manual | ✅ | 是否業務人員手動改 | 預設 false、改後 true |

跨欄位驗證：
- `is_manual=true` 時、trigger 不再覆蓋 phonetic_code / phonetic_full（保護人工修正）
- `is_manual=false` 時、主檔 update 觸發 trigger 重算

## 3.3 跨主檔連動

**dictionary 引用：**
- 不引用其他 NX01 主檔（純全域字典）

**index 引用：**
- 引用 `nx99_tenant`（多租戶隔離）
- 引用各主檔（part / partner / user 等）via source_id 軟連結（不用 FK constraint、避免跨表 cascade 複雜度）
- 主檔刪除 → trigger 同步刪 phonetic_index 對應筆

## 3.4 跨業務模組連動

- 所有支援注音快搜的主檔模組依賴本軌
- 第一階段：part / partner（NX01-05 / NX01-03）
- 第二階段：user（NX01-01）
- 第三階段（未來）：warehouse / bulletin / 業務單據（quote / so / po）

→ 本軌是基礎設施、其他規格書「§8 注音索引」段落都引用本軌設計。

## 3.5 軟刪除 vs 停用

**`nx01_phonetic_dictionary`**：
- SYSADMIN 加錯字 → 可真刪（趁早處理）
- 已被 phonetic_index 引用 → 不可刪（影響既有快搜）、只能停用（isActive=false）

**`nx01_phonetic_index`**：
- 主檔刪除 → 同步刪（trigger 自動處理）
- 主檔停用 → index 不刪（停用主檔仍可被搜到、UI 層過濾）

---

# § 4. 欄位列表

## 4.1 nx01_phonetic_dictionary 業務欄位（全域字典）

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `character` | 漢字（單字元）| ✅ | 無 | SYSADMIN 填 |
| `primary_phonetic` | 主要注音（如 ㄅㄧˋ）| ✅ | 無 | SYSADMIN 填、批次匯入 |
| `alt_phonetics` | 替代注音陣列（多音字）| ❌ | [] | SYSADMIN 填 |
| `primary_initial` | 主要聲母（如 ㄅ）| ✅ | 系統算 | trigger 從 primary_phonetic 抽 |
| `usage_freq` | 使用頻率（用於多音字優先序）| ❌ | 0 | 系統統計 |
| `isActive` | 是否啟用 | ✅ | true | SYSADMIN 可停用錯字 |

## 4.2 nx01_phonetic_index 業務欄位（每租戶索引）

| 欄位 | 業務語意 | 必填 | 預設值 | 來源 |
|------|---------|-----|-------|------|
| `tenantId` | 多租戶隔離 | ✅ | 自動帶 | 系統 |
| `source_table` | 來源表名（enum）| ✅ | 無 | trigger 寫入 |
| `source_id` | 來源主檔 ID | ✅ | 無 | trigger 寫入 |
| `source_field` | 來源欄位（enum：name / display_name / title 等）| ✅ | 無 | trigger 寫入 |
| `source_text` | 來源文字（快搜時顯示用）| ✅ | 無 | trigger 從主檔帶 |
| `phonetic_code` | 聲母碼（如 ㄅㄓㄑ、用於前綴匹配）| ✅ | trigger 算 | trigger / 業務人員覆蓋 |
| `phonetic_full` | 完整注音（顯示用）| ✅ | trigger 算 | trigger / 業務人員覆蓋 |
| `is_manual` | 是否業務人員手動改 | ✅ | false | 業務人員改後 true |

## 4.3 系統自動欄位（兩表共用、不可改）

| 欄位 | 業務語意 |
|------|---------|
| `id` | 系統 ID |
| `createdAt` / `updatedAt` | 系統時間戳 |
| `createdBy` / `updatedBy` | 操作者（dictionary = SYSADMIN、index = trigger 標記 'system' 或業務人員） |

## 4.4 索引設計（DB 層 performance）

`nx01_phonetic_index` 必要索引：
- `(tenantId, phonetic_code)` — 嚴格前綴匹配主索引（Hybrid 階段 1）
- `(tenantId, source_table, source_id)` — 主檔反查 / 同步用（unique）
- `(tenantId, phonetic_code text_pattern_ops)` — 全前綴匹配（Hybrid 階段 2、PostgreSQL LIKE 前綴）

---

# § 5. 工作流程

## 5.1 主檔 INSERT 觸發 trigger 寫 index（核心流程）

1. 業務 / HR 在主檔表（part / partner / user）建新紀錄
2. trigger `phonetic_index_on_insert` 觸發：
   - 讀主檔 source_text（如 part.name = 「避震器」）
   - 逐字 query phonetic_dictionary（避 → ㄅ、震 → ㄓ、器 → ㄑ）
   - 組 phonetic_code = ㄅㄓㄑ、phonetic_full = ㄅㄧˋ ㄓㄣˋ ㄑㄧˋ
   - INSERT phonetic_index、is_manual = false
3. 主檔頁面更新「注音碼」readonly 顯示

## 5.2 業務人員手動改主檔注音（多音字場景）

1. 業務 part「金屬剎車片」、trigger 預生 phonetic_code = ㄐㄕㄆ（剎 = ㄕㄚˋ 高頻讀音）
2. 業務發現業界俗稱讀 ㄔㄚˋ（剎車）、進主檔編輯頁
3. 點「注音碼」旁的 [編輯] → 開 modal（§2.4）
4. modal 顯示：
   - 系統建議：ㄐㄕㄆ
   - 多音字提示：剎（ㄕㄚˋ / ㄔㄚˋ）
   - 業務人員選 ㄔㄚˋ → 手動寫 ㄐㄔㄆ
5. [確定] → UPDATE phonetic_index、is_manual = true
6. 之後主檔 update name 不再 trigger 覆蓋（保護人工修正）

## 5.3 主檔 UPDATE 觸發 trigger 重算（自動模式）

1. 業務改 part.name「避震器」→「避震器總成」
2. trigger `phonetic_index_on_update` 觸發、檢查 is_manual：
   - is_manual = false：重算 phonetic_code = ㄅㄓㄑㄗㄔ、UPDATE
   - is_manual = true：不動、保留人工修正
3. 主檔頁面更新顯示

## 5.4 F4 快搜流程（Hybrid 拍板 Q2）

1. 業務在 part 列表頁按 F4 → 開快搜浮層
2. 業務打 ㄅㄓㄑ
3. 系統 query：
   - 階段 1：phonetic_index WHERE tenantId = 當前 + phonetic_code = 'ㄅㄓㄑ' LIMIT 20
   - 結果不足 5 筆 → 階段 2：phonetic_code LIKE 'ㄅㄓ%' LIMIT 20
   - 仍不足 → 階段 2 再退 phonetic_code LIKE 'ㄅ%' LIMIT 20
4. 結果列表：「主檔類型 / 名稱 / code」
5. 業務點選 → 跳該主檔詳情頁

## 5.5 主檔 DELETE 觸發 trigger 清 index

1. 業務刪 part「過期料號」
2. trigger `phonetic_index_on_delete`：DELETE phonetic_index WHERE source_table='part' AND source_id=該 ID
3. F4 快搜不再出現此筆

## 5.6 異常：dictionary 缺字（罕用字）

1. 業務建 part「鏨刀」、trigger 找不到「鏨」（dictionary 沒此字）
2. trigger 容錯：phonetic_code 留空白佔位（如 ㄉ?）、寫 audit log
3. SYSADMIN 在 §2.5 熱區看到「鏨」搜尋失敗、補字典
4. 補字後、業務人員手動 [還原系統建議] 觸發重算、或下次 update 自動觸發

---

# § 6. 角色權限

| 角色 | F4 快搜 | 改主檔注音 | 維護全域 dictionary | 看搜尋熱區 |
|------|--------|-----------|------------------|----------|
| SYSADMIN | ✅ 全租戶 | ✅ | ✅ | ✅ |
| OWNER | ✅ | ✅（自己權限主檔）| ❌ | ❌ |
| HR | ✅ | ✅（user 主檔）| ❌ | ❌ |
| SALES | ✅ | ✅（自己負責的 partner / part）| ❌ | ❌ |
| PURCHASING | ✅ | ✅（自己負責的 partner / part）| ❌ | ❌ |
| WAREHOUSE | ✅ | ✅（自己負責的 part）| ❌ | ❌ |
| FINANCE | ✅ | ❌（不直接維護主檔） | ❌ | ❌ |

「改主檔注音」權限對齊主檔本身的維護權限（不獨立設、跟主檔同源）。

---

# § 7. Tier 差異

| 功能 | LITE | PLUS | PRO |
|------|------|------|-----|
| F4 注音快搜 | ✅ | ✅ | ✅ |
| 第一階段主檔（part / partner）索引 | ✅ | ✅ | ✅ |
| 第二階段主檔（user）索引 | ✅ | ✅ | ✅ |
| 業務人員手動改注音碼 | ✅ | ✅ | ✅ |
| Hybrid 搜尋（嚴格 + 全前綴）| ✅ | ✅ | ✅ |
| 字典維護（SYSADMIN 跨租戶）| 系統級、Tier 無關 | 系統級 | 系統級 |
| 搜尋熱區統計 | ❌ | ❌ | ✅ |
| 第三階段主檔擴充（warehouse / bulletin / 業務單據）| 未來軌 | 未來軌 | 未來軌 |

→ 本軌核心功能 LITE 即支援、Tier 差異主要在進階分析（搜尋熱區）
→ 跨 Tier 限制由 application 層判斷、index 表結構不變

---

# § 8. 注音索引（本軌自身）

## 8.1 是否需注音索引

❌ 不需要、本軌**就是**注音索引基礎設施、不再對自己建索引（避免循環依賴）。

`nx01_phonetic_dictionary` 由 SYSADMIN 維護、查詢用漢字而非注音。

## 8.2 跨主檔注音索引覆蓋清單（v1.0 範圍）

| 主檔表 | source_field | 索引階段 | 觸發時機 |
|-------|------------|--------|---------|
| `nx01_part` | `name` | 階段 1 | INSERT / UPDATE / DELETE |
| `nx01_partner` | `name` | 階段 1 | INSERT / UPDATE / DELETE |
| `nx01_user` | `display_name` | 階段 2 | INSERT / UPDATE / DELETE |

## 8.3 trigger 設計範式（DB 層 invariant）

對齊 PROJECT_CONTEXT 工程模式 #4「trigger 做 invariant」：

```
觸發時機：主檔 INSERT / UPDATE source_field / DELETE
trigger 邏輯：
  1. 讀主檔 source_text
  2. 逐字 query nx01_phonetic_dictionary
  3. 組 phonetic_code（聲母）+ phonetic_full（完整）
  4. UPSERT nx01_phonetic_index（若 is_manual=false 才覆蓋）
保證：phonetic_index 跟主檔最終一致、不靠 application 層
```

詳細 trigger SQL 由 Hank impl 階段設計、本規格書不展開。

---

# § 9. Document Control Log

| 版本 | 日期 | 撰寫 | 變更摘要 |
|------|------|------|---------|
| v0.1.0 | 2026-05-06 | Alex | 初版草稿、9 段完整、§10 列 5 個 Q 給 Crown 拍 |
| v1.0 | 2026-05-06 | Alex | Crown 拍 Q1~Q5 全部對齊 Alex 推薦：(1) trigger 同步、對齊工程模式 #4 (2) dictionary 走 Hybrid（教育部 + 業界覆蓋）(3) F4 結果階段 1=10 / 階段 2=10 (4) 多音字主音 + alt 陣列範式 (5) is_manual 保護 + 主檔改 name 提醒機制 |

---

# § 10. 待 Hank grep 確認項

（v1.0 升版後此段取代原 §10 待拍 Q）

1. `nx01_phonetic_dictionary` schema 既有狀態揭露（已建未實作）
2. `nx01_phonetic_index` schema 既有狀態揭露
3. NX01-01 v1.0 §8 user 注音索引落地真實情況（軌 G 之後有無實作）
4. 業界開源注音資料庫推薦（Q2 拍 Hybrid、Hank 揭露教育部國語辭典 / Unicode CJK 等可用資料來源）
5. PostgreSQL trigger 設計範式：使用 PL/pgSQL 還是改走 application 層 + DB constraint
6. text_pattern_ops 索引在中文注音 LIKE 前綴的 performance 揭露
7. 多音字 (C) 主音 + alt 陣列的 query 範式（unnest 陣列 / GIN index、Q4 拍板後的最佳實踐）
8. is_manual 保護機制（Q5 拍板）的 trigger 邏輯範式：
   - is_manual=true → 主檔 UPDATE 不覆蓋、但發 application event 給前端提醒
   - 提醒 UI 範式由前端模組決定、本規格書不展開
9. Hybrid 階段化搜尋（Q3 拍 10/10）的 query plan 揭露：
   - 階段 1：phonetic_code = ? LIMIT 10
   - 階段 2：phonetic_code LIKE ?% LIMIT 10
   - 結果合併去重 + 排序範式

---

# § 11. 跨軌依賴

NX01-10 v1.0 實作依賴與被依賴：

| 方向 | 對象 | 關係 |
|------|------|------|
| 依賴（前置）| 無 | 本軌是基礎設施、不依賴其他主檔模組 |
| 被依賴（後續）| `nx01_part`（NX01-05）| 第一階段、part 主檔 trigger 接 phonetic_index |
| 被依賴 | `nx01_partner`（NX01-03）| 第一階段、partner 主檔 trigger 接 phonetic_index |
| 被依賴 | `nx01_user`（NX01-01）| 第二階段、NX01-01 v1.0 §8 已預期 |
| 被依賴 | `nx01_bulletin`（NX01-08）| 未來階段、NX01-08 v1.0 §8 已預期 |
| 被依賴 | 其他主檔（warehouse / 業務單據）| 第三階段、未來軌 |

實作切點建議（給 Hank impl 階段參考、本規格書不拍）：
- 階段 1：dictionary 表 + index 表 + trigger 機制 + part / partner trigger
- 階段 2：user trigger（接 NX01-01 §8 預期）
- 階段 3：F4 快搜前端浮層 UI
- 階段 4：字典維護頁 + 主檔注音改 modal + 搜尋熱區（PRO）

字典初始資料來源（Q2 拍 Hybrid）：
- 基礎層：教育部國語辭典 / Unicode CJK 開放資料（覆蓋 ~10000 漢字）
- 覆蓋層：汽車零件業常用詞匯（~2000 字、含業界俗稱、Hank impl 階段揭露具體來源）

---

> 本拍板版 v1.0 對齊 spec-template v1.0、11 段完整（§1~§9 + §10 Hank grep 待確認 + §11 跨軌依賴）、Crown 拍 Q1~Q5 全部對齊 Alex 推薦、跨主檔注音索引基礎設施定案。
