<!-- D4 SYS-C Translator — 意圖版 -->
# D4 — SYS-C Translator 意圖

> 文件類型：意圖文件（Alex 寫，給 Hank 對照真實 schema 與 service 結構實作）
> 撰寫者：Alex
> 日期：2026-04-25
> 對應計畫：plan v1.1 工作項目 Y1, Y2, B1（service 部分）
> 狀態：Crown 拍板 OK，交給 Hank 對照真實 codebase 寫具體實作
> 銜接文件：D3 意圖版（schema 結構）、D3-impl spec（Hank 寫的具體 schema）

---

## ⚠️ 文件性質聲明

這份是**意圖文件**，不是 service spec。

它說明：「為了讓業務在工作台『送出 SO』後系統做對的事，**翻譯器要負責什麼業務邏輯**」。
它不說明：NestJS service 結構、function 簽章、TypeScript 型別、實際 import 路徑。

具體實作（service 檔位、class 結構、依賴注入、錯誤處理寫法）由 Hank 對照 repo 真實狀態寫。

---

## 1. 業務目標

業務在工作台送出一張 SO 時，系統必須**自動**完成下面這串動作，業務不應該知道也不應該關心：

業務在工作台填好：
  - 客戶
  - 5 個料號 + 數量 + 結構化備註（self / Z02 / D-O104 / co）
  - 按「送出」
       ↓
  系統幕後做的事（翻譯器負責）：
       ↓
  ✅ 建一張 SO + 5 個 lineItem
  ✅ self 的 3 項：直接 transferStatus = completed（本倉夠不用補）
  ✅ Z02 的 1 項：自動建 IT 調撥單通知倉管
  ✅ D-O104 的 1 項：自動建 RFQ 詢價單通知採購
  ✅ committed_stock 雙帳即時更新
  ✅ 並發控制：兩個業務同時搶最後 5 個料號不會重複賣
       ↓
  畫面回業務「SO-2604-00061 已建立」+ 5 個 lineItem 的狀態顯示

設計目標一句話：**把業務的「結構化意圖」翻譯成系統內所有相關單據與庫存變動**。

---

## 2. 為什麼叫「翻譯器」而不是「執行器」

這個命名有意義。理解它影響很多後續取捨。

**翻譯器（translator）**：
- 業務送的是「我要賣 5 個 X 給客戶 Y，其中 1 個從 Z02 調」這種**業務語言**
- 翻譯器把它**翻譯成**「INSERT SO + INSERT lineItem ×5 + INSERT IT + UPDATE committed_stock」這種**系統語言**
- 翻譯器**不決定要不要做**——業務說做就做

**執行器（executor）**：
- 會包含「決策邏輯」（這個情境該不該建 IT、該不該觸發審核）
- 我們**不要**這種

兩者差別：
- 翻譯器：純粹的「結構化語言 ↔ 系統動作」對應
- 執行器：摻雜業務規則決策

**SYS-C 是純翻譯器**。業務規則該擋的（例如某客戶不能賒帳），是業務邏輯層的責任，不是翻譯器的責任。

---

## 3. 5 個關鍵邏輯

### 3.1 寫入順序必須一致（避免半成品狀態）

翻譯器**必須**在單一 transaction 內完成所有寫入。**禁止**分多個 transaction：

正確順序（同一個 transaction）：
  1. 取所有相關 (tenant, part, warehouse) 的 advisory lock
  2. INSERT SO（status = waiting_supply 或對應狀態）
  3. INSERT 所有 lineItem
  4. 對 transferSourceType != 'self' 的 lineItem：
     - transfer：INSERT IT、UPDATE lineItem.itId
     - inquiry：INSERT RFQ、UPDATE lineItem.tiId（TI 等同行報價回來才補）
     - co：INSERT CO、UPDATE lineItem.coId
  5. trigger 自動更新 committed_stock
  6. COMMIT

**為什麼禁止分 transaction**：
- 萬一中途失敗（例如建 IT 失敗），SO 已經建了但 IT 沒建 → committed_stock 算錯
- 倉管會看到一張 SO 在等貨但找不到對應 IT → 困惑

**結果**：要嘛全部成功、要嘛全部回滾、業務看到「成功」或「失敗」單一結果，沒有中間態。

### 3.2 並發控制：advisory lock 鎖到「料號 + 倉」精度

兩個業務同時搶同料號的真實場景：

時間 T1：業務 A 開始建 SO，要 5 個料號 X（本倉只剩 3 個）
時間 T1：業務 B 開始建 SO，要 4 個料號 X
時間 T2：A 跟 B 都讀到「committed = 0、本倉 3」
時間 T3：A 跟 B 都決定「我超賣 N 個沒問題」
時間 T4：A 跟 B 都 INSERT SO 成功
時間 T5：committed_stock 變成 -6（A 超 2 + B 超 4）

問題：兩個業務都不知道對方先了

**翻譯器解法**：建 SO 前先鎖 (tenant, part, warehouse)。第二個業務的 transaction 等待第一個 commit/rollback 才能繼續。

**鎖的精度**：
- 鎖 tenant 級：太粗（同一租戶所有 SO 互鎖，效能差）
- 鎖 part 級：偏粗（同料號不同倉互鎖，沒必要）
- 鎖 (tenant, part, warehouse) 級：剛好 ✅
- 鎖 lineItem 級：太細（無法防多 SO 搶同料）

由 Hank 用 `hashtextextended('${tenant}:${part}:${warehouse}', 0)` 算 lock key（D3 v1 review C-06 已表態）。

### 3.3 多 lineItem 鎖獲取順序：避免 deadlock

兩個 SO 同時建，各含多個料號，會有 deadlock 風險：

SO A：要鎖 (part_X, part_Y) 兩個 lock
SO B：要鎖 (part_Y, part_X) 兩個 lock
       ↓
A 鎖了 X，等 Y
B 鎖了 Y，等 X
       ↓
deadlock，PostgreSQL 會 abort 其中一個

**翻譯器解法**：在同一個 SO 內，**取 lock 前先排序 lineItem**（例如按 partId 字典序）。所有 SO 都用同樣的順序取鎖 → 永遠不會循環等待 → 沒 deadlock。

SO A：lineItem 排序後 → 鎖 (part_X, part_Y)
SO B：lineItem 排序後 → 鎖 (part_X, part_Y)（即使業務輸入順序不同）
       ↓
B 老老實實等 A 完成 → 沒 deadlock

### 3.4 失敗 retry 策略

即使有排序鎖，仍可能在 PostgreSQL serialization 層出錯（罕見但存在）。翻譯器必須處理：

- 捕捉 `P2034`（Prisma serialization failure）/ `40P01`（PostgreSQL deadlock）
- exponential backoff 重試 3 次：50ms / 200ms / 800ms
- 3 次都失敗 → 回業務「系統忙碌請重試」（不要假裝成功）

**重要**：retry 的是**整個 transaction**，不是只 retry 失敗的那一步。

### 3.5 lineItem 的 transferStatus 初始值

每個 lineItem 在 INSERT 時 transferStatus 初始值依 transferSourceType 決定：

| transferSourceType | transferStatus 初始值 | 理由 |
|---|---|---|
| self | `completed` | 本倉夠，不需補貨，直接進入 fulfillStatus 流 |
| transfer | `pending` → 立刻變 `in_progress`（IT 建好後）| 等倉管完成 IT |
| inquiry | `pending` → 立刻變 `in_progress`（RFQ 建好後）| 等同行報價、確認 TI |
| co | `pending` → 立刻變 `in_progress`（CO 建好後）| 等補貨 |

「立刻變」指：在同一個 transaction 內，INSERT IT/RFQ/CO 完成後立即 UPDATE lineItem.transferStatus。

**業務效果**：業務送單後馬上看到狀態，沒有「pending」這個閃爍的中間狀態。

---

## 4. 邊界與接口

### 4.1 翻譯器的「輸入」是什麼

翻譯器是後端 service，輸入來自前端（W2 工作台送出 SO）的 API 請求。**請求結構**意圖：

{
  customer: { id }
  lineItems: [
    {
      partId,
      warehouseId,        // 出貨倉
      quantity,
      unitPrice,
      transferSourceType,  // self / transfer / inquiry / co
      transferSourceRef    // 對應倉/同行/co 的 ID（self 時為 null）
    },
    ...
  ]
}

**前端不負責**：
- 不算 committed_stock
- 不決定該建 IT 還是 RFQ
- 不算狀態
- 不做任何「翻譯」

**前端只負責**：
- 收集業務輸入
- 結構化校驗（必填欄位、數字範圍）
- 送 request

### 4.2 翻譯器的「輸出」是什麼

成功時：

{
  soNumber,
  soId,
  lineItems: [
    {
      lineItemId,
      transferStatus,
      fulfillStatus,
      relatedItId / relatedTiId / relatedCoId  // 對應的補貨單 ID
    },
    ...
  ]
}

失敗時：清楚的錯誤碼與訊息，業務可以理解：

| 失敗原因 | 業務看到的訊息 |
|---|---|
| 系統忙碌 retry 失敗 | 「系統忙碌，請稍後再試」 |
| transferSourceRef 找不到對應倉/同行 | 「補貨來源 'Z99' 不存在，請重新選擇」 |
| 業務規則擋住（例如客戶停權）| 對應業務訊息 |

### 4.3 翻譯器**不**負責的事

- 業務規則決策（這客戶能不能賒帳、這料號能不能賣）→ 業務邏輯層
- UI 顯示邏輯 → 前端
- 報表計算 → 報表 service
- 既有資料 migration → migration script

---

## 5. 對 Hank 的幾個提示

### 5.1 翻譯器 service 位置

意圖位置：跟 NX04 SO 模組相關 service 同層（你看 `apps/nx-api/src/nx04/` 既有結構決定具體檔位）。

### 5.2 翻譯器**只在後端**（重申 D3 v1 review B-02）

絕對禁止：
- 前端有任何「翻譯」邏輯
- 前端決定建什麼補貨單
- 前端直接寫 committed_stock

前端只送 lineItems 帶結構化備註，後端翻譯。

### 5.3 既有 application-layer 維護 reservedQty 的邏輯

D3-impl spec 已經處理（升級成 trigger）。翻譯器**不需要**手動維護 reservedQty——trigger 會在 lineItem INSERT 時自動算。

但翻譯器要驗證：完成 transaction 後，相關 (part, warehouse) 的 committed_stock 數字符合預期（單元測試或斷言層級）。

### 5.4 跟既有 Translator-like 程式的關係

如果 repo 內既有「處理 SO 建立」的 service（例如 `Nx04SoService.create()`），新翻譯器要不要取代它？由你工程判斷：
- 既有 service 邏輯複雜且難拆 → 新翻譯器寫一條新 path、舊 path 留給教學模式
- 既有 service 簡單 → 升級既有 service

決定後在 D4-impl spec 內記錄理由即可。

---

## 6. 開放問題（給 Hank 工程判斷）

### Q1：service 結構 — 單一 class 還是分層

選項：
- (a) 單一 `SoTranslatorService` 含所有邏輯
- (b) 分層：`SoTranslator` + `TransferSourceResolver` + `LockManager` 各自負責
- (c) 其他

由 Hank 看 NestJS 慣例與既有 service 風格決定。

### Q2：retry 機制放哪裡

選項：
- (a) Translator 內部包 try-catch + retry loop
- (b) 抽到 NestJS interceptor / decorator
- (c) 放在 caller 層（API controller）

### Q3：advisory lock 的 timeout

如果第一個 transaction 跑很久（例如卡 trigger），第二個業務要等多久才放棄？預設 PostgreSQL 是無限等。建議設 5~10 秒上限，超時回業務「系統忙碌」。

### Q4：失敗訊息對業務的暴露程度

- 系統錯誤（DB 連線斷）→ 籠統「系統錯誤」
- 業務輸入錯誤（ref 不存在）→ 具體錯誤
- 並發失敗 → 「系統忙碌請重試」

**底線**：不暴露技術細節（不要把 PostgreSQL 錯誤碼丟給業務看）。

### Q5：log 程度

翻譯器是核心邏輯，每筆翻譯應該記什麼 log？建議：
- INFO：成功翻譯（含 SO id、lineItem 數、補貨單數）
- WARN：retry 發生
- ERROR：所有失敗

但 log 太多會炸 → 由 Hank 看既有 log 規範決定。

---

## 7. 不在這份文件範圍

| 項目 | 對應文件 |
|---|---|
| Schema 細節（表/欄位/index）| D3 意圖版 + D3-impl |
| Trigger 詳細實作 | D3-trigger（Hank 寫）|
| 跨工作台傳遞資料 | D5 navigation policy（Alex 寫）|
| RFQ/QT REST API | B5（Hank 寫）|
| 前端 W2 工作台 UI | Phase 1 W2-mini spec |
| translator 怎麼處理 SO 編輯（建單後改明細）| Phase 2 W2 完整版範疇 |
| translator 怎麼處理 SO 取消 | Phase 2 範疇 |

---

## 8. 對 Hank 的交付要求

完成 Phase 0 翻譯器實作時，請產出：

- `docs/nx04/spec/impl/d4-impl_sys-c-translator.md`（實作 spec，含 service 結構、function 簽章、retry 邏輯、log 策略）
- 翻譯器 service 程式碼（位置由你決定）
- 對應的單元測試 + 整合測試（至少涵蓋 5 個邏輯各一個案例）
- 確認本意圖文件 5 條邏輯全部滿足，逐條 check

如有業務邏輯疑慮（不是工程取捨）→ 暫停實作回報 Crown。

---

## 9. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版意圖文件 |

---

*文件結束*
