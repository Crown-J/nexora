<!-- B5 RFQ/QT API — 意圖版 v2 -->
# B5 — RFQ / QT API 意圖（v2）

> 文件類型：意圖文件（Alex 寫，給 Hank 對照真實 codebase 寫具體 REST API）
> 撰寫者：Alex
> 日期：2026-04-27
> 對應計畫：plan v1.1 工作項目 B5
> 銜接文件：D3 意圖版 v1.1（schema RFQ/QT/TI 結構）、D4 意圖版（translator 自動建 RFQ stub）、D3 補丁 c80dee2（nx02_qt 表落地）
> 狀態：待 Crown 拍板 → 交給 Hank 對照真實 codebase 寫具體實作

---

## ⚠️ 文件性質聲明

這份是**意圖文件**，不是 API spec。

它說明：「同行詢價/報價/調貨的**業務流程是什麼**、**API 要支援哪些動作**」。
它不說明：REST endpoint 路徑、DTO 結構、HTTP status code、controller 寫法。

具體實作（路徑命名、payload 格式、validation pipe）由 Hank 對照 NestJS 慣例與既有 controller 結構寫。

---

## ⚠️ 跟 v1 的差異（Crown 看完 v1 拍板後產生）

v1 寫於 2026-04-25 上午，當時 Alex 沒讀既有 nx02_rfq schema 就憑業界直覺寫，被 Hank 抓出地基級偏離。Crown 在拍板過程中揭露關鍵業界事實「採購視角 + 需求視角兩種詢價模式都會發生」，最終決定方案 B（新建 nx02_qt 獨立表）。

v2 改寫重點：
1. **對齊 c80dee2 落地的 nx02_qt 真實結構**（14 欄、status 三值、無 unique、含 partial CHECK）
2. **每次報價 insert 新筆 QT，不 update**——保留報價歷史
3. **採用 QT 時，同 RFQ 內所有未 agreed 的 QT 全部 rejected**（含同 partner 較舊歷史 QT）
4. 加 §6 業務取捨拍板紀錄（Crown 已拍 6 題明確列出）

---

## 1. 業務目標

D4 翻譯器建立 SO 時，遇到「同行調貨」明細會自動建一個 **RFQ stub**（空殼詢價單）。但完整的詢價→報價→調貨流程還沒實作。B5 補完這塊。

完整業務流程：

```
業務 A 在 W2 建 SO，含 1 項「同行調貨」明細
  ↓
D4 translator 自動建 RFQ stub（含：partId、quantity；尚未指定哪家同行）
  ↓
[此時 B5 接手]
  ↓
採購收到通知，打電話/LINE 問同行：
  「料號 X 還有 5 個嗎？多少錢？」
  ↓
同行回：「有 5 個，每個 800 元，明天可以送」
  ↓
採購在 NEXORA 採購工作台 insert 新 QT 筆紀錄
  （每次報價都 insert 新筆，不更新舊筆 → 保留歷史）
  ↓
採購可能繼續問其他同行、或同一家同行隔天又給新報價
  ↓
採購比較完所有 QT，按「採用某筆」
  ↓
系統自動（單一 transaction）：
  - 該 QT.status = agreed
  - 同 RFQ 內所有其他 QT（未 agreed 的）全部 rejected
  - RFQ.status = completed
  - 建 TI 同行調貨單
  - 更新 SO line item.relatedTiId
  - SO line item.transferStatus = completed
  ↓
TI 收貨流程進場（屬 NX02 採購收貨範圍，不是 B5 範疇）
```

設計目標一句話：**讓「電話問價」這個離線動作在系統內留下完整稽核軌跡（含報價歷史），並自動串接到後續調貨**。

---

## 2. 為什麼不是純 CRUD

RFQ/QT 看起來是「建單、改單、查單」CRUD，但實際業務有 4 個非 CRUD 邏輯：

### 2.1 兩種詢價心智都會發生（Crown 業界拍板）

業界 muscle memory 揭露：採購對「料號缺貨」的應對有兩種模式，都合法：

**情境 a（採購視角，線性問價）**：
- 採購打給 D-O104：「800 元」→ 建 QT 第 1 筆
- 沒貨/不滿意 → 採購打給 D-K207：「750 元」→ 建 QT 第 2 筆
- 系統內：1 個 RFQ、2 個 QT、各自不同 partner

**情境 b（需求視角，廣撒網問價）**：
- 採購同時聯絡 3 家同行
- D-O104 報 800、D-K207 報 750、D-M309 沒貨
- 採購比較選最划算
- 系統內：1 個 RFQ、3 個 QT、各自不同 partner

**schema 必須兼容兩種** → nx02_qt 設計成獨立表、1 RFQ : N QT，不限制 partner（v1 失誤就是限制了）。

### 2.2 報價歷史本身有價值（Crown 業界拍板）

同一家同行可能多次報價：
- 早上 D-O104 報 800、下午又電話來說「漲到 850」
- 兩筆 QT 都保留（不 update 覆蓋）
- 採購未來可看「D-O104 過去 6 個月報價趨勢」

**schema 沒有 unique constraint** → 允許同 RFQ 同 partner 多筆 QT。

### 2.3 採用 QT 才會建 TI

**QT 不會自動產生 TI**。採購要明確按「採用此報價」才產 TI。
- 如果都不滿意 → 全部 QT 標 rejected、RFQ 重新詢

### 2.4 RFQ 可能逾時無人回應

業務情境：採購發出 RFQ、過了一週都沒人有合適的貨。
- 採購可以放棄這個 RFQ（cancel）→ 通知業務 A：「這項調不到，要不要改方案？」

---

## 3. API 必須支援的 5 個業務動作

下面 5 個是業務真正會做的事，REST endpoint 命名由 Hank 對照既有 controller 慣例決定。

### 3.1 查 RFQ list（採購工作台用）

業務情境：採購早上開系統，要看「我有哪些 RFQ 還沒處理」。

回傳清單應含：
- RFQ id、建立時間、partId、quantity
- 對應 SO 是哪張、客戶是誰、業務是誰（讓採購知道急不急）
- 已經有幾筆 QT、幾家不同 partner 報過
- 狀態（pending / quoted / completed / cancelled）

排序：通常按建立時間倒序，但 Hank 看既有 list API 慣例決定。

### 3.2 對某 RFQ 新增 QT（採購輸入同行報價）

業務情境：採購打完電話，把同行答的內容輸進系統。

**重要：每次報價都 insert 新筆，不 update 舊筆**（schema 已支援、無 unique constraint）。

輸入：
- rfqId（綁定哪個 RFQ）
- inquiryPartnerId（哪家同行）
- quotedPrice（單價）
- quotedQuantity（同行可供應的數量，可能 < RFQ 要求的數量）
- leadDays（多久能到貨，採購跟同行口頭問的，可選填）
- notes（採購自己寫的備註，例：「這家最近 cash flow 緊，可能要先匯款」）

系統自動：
- 建 QT row、status = pending（schema default 'P'）
- 把 RFQ.status 從 pending 推到 quoted（如果這是第一個 QT 的話）

**注意**：同一家同行重新報價也走這個 API，**不要**設計「update QT」endpoint。重新報價 = 新增一筆新 QT、舊 QT 維持原狀。

### 3.3 採用某 QT（採購做最終決定）

業務情境：採購比較完所有 QT，按「採用 D-O104 那筆 800 元」。

輸入：
- qtId（要採用的那筆 QT）

系統自動（在單一 transaction 內，跟 D4 translator 同精神）：
- 取 advisory lock（避免採購同時按兩筆「採用」）
- 該 QT.status = agreed
- **同 RFQ 內所有其他 QT（status != agreed 的）全部標 rejected**
  - 含同 partner 的較舊歷史 QT
  - reject_reason 自動填入「因採用 QT-XXX」之類的系統訊息（避免 partial CHECK 失敗）
- RFQ.status = completed
- 建 TI 同行調貨單（含正確的 inquiryPartnerId、agreedPrice = quoted_price、agreedQuantity = quoted_quantity 等）
- 更新對應 SO line item.relatedTiId
- 更新對應 SO line item.transferStatus = completed（同行答應了 = 補貨確認）

**重要（Q1 拍板）：部分數量採用也算 completed**

如果同行報價 quotedQuantity < RFQ.quantity（例：要 5 個、同行只報得出 3 個），採購採用後：
- TI 建 3 個（依照 quotedQuantity）
- SO line item.transferStatus = completed
- 業務 A 自己看 SO 還缺多少（5-3=2），自己決定下一步（改 transferSource 找其他來源 / 取消缺的部分 / etc）
- 系統不自動再開 RFQ 補差額

### 3.4 拒絕某 QT（採購覺得不划算）

業務情境：採購覺得某筆報價太貴或交期太長，想標 rejected 但不採用任何一筆。

輸入：
- qtId
- rejectReason（必填，schema partial CHECK 會擋空值）

系統自動：
- QT.status = rejected
- 不影響 RFQ 狀態（RFQ 仍在等其他 QT 或新一輪 QT）

**注意**：拒絕單筆 QT 不影響同 partner 的其他 QT。

### 3.5 取消整個 RFQ（採購放棄）

業務情境：採購問了一輪都沒人有貨/價格不合理/業務改變主意。

輸入：
- rfqId
- cancelReason（必填）

系統自動：
- RFQ.status = cancelled
- 該 RFQ 下所有未 agreed 的 QT 全部標 rejected（reject_reason 自動填「因 RFQ 取消：{cancelReason}」）
- 通知業務 A：「這項調不到」（通知機制由前端負責）
- **不更新 SO line item**——留給業務 A 決定下一步（例：改 transfer 改 co 改取消整張 SO）

---

## 4. 邊界與接口

### 4.1 跟 D4 translator 的關係

D4 建 RFQ stub 時：
- 建 nx02_rfq row（status = pending、partId、quantity 等已填）
- **不建任何 QT**（nx02_qt 完全空）
- SO line item.transferStatus = in_progress

B5 接手後：
- 採購輸入 QT → 系統推進 RFQ.status
- 採購採用某 QT → 系統建 TI、更新 SO line item.transferStatus

**B5 不修改 D4 已寫進 DB 的 RFQ stub 結構**，只在它的基礎上往後推進。

### 4.2 跟 Phase 2 採購工作台 W4 的關係

W4 是 Phase 2 才做的「同行詢價工作台」。B5 的 5 個 API 是 W4 的後端基礎。

**B5 階段不做前端**——只做 API。W4 是 Phase 2 的事。

但 B5 設計時要想 W4 真正會用什麼，避免 API 設計完 W4 進場才發現缺東少西。

特別考慮：W4 會展示「同 partner 的報價歷史趨勢」，B5 list API 要支援按 partner group by。

### 4.3 跟 NX02 採購收貨流程的關係

採用 QT 後系統自動建 TI。**TI 後續的「同行送貨到、我家簽收、入庫」屬 NX02 採購收貨範疇，不是 B5 範圍**。

B5 只負責「建 TI」，不負責「TI 收貨流程」。

### 4.4 採用後反悔（Crown Q2 拍板）

**不允許反悔**。採購按「採用 QT」=最終決定。

業務情境：採購按了「採用 D-O104」，5 分鐘後同行打來說「抱歉算錯了，價格要 1000 不是 800」。

處理方式：
- 走「TI 取消單」流程（屬 NX02 採購範圍，B5 不負責）
- TI 取消後 SO line item.transferStatus 狀態如何回退由 NX02 取消單流程處理

理由：
- 保持狀態機單純（agreed 是終點不是中間態）
- 避免「半夜把單退掉再重建」的 audit 災難
- 反悔本身要留 audit trail（透過 TI 取消單機制）

### 4.5 B5 不負責的事

- 同行 partner 主檔管理（屬 NX01 主檔）
- TI 收貨流程（屬 NX02）
- TI 取消流程（屬 NX02）
- 報表（屬 NX08）
- 前端工作台 UI（屬 Phase 2 W4）
- 通知業務 A 的機制（屬前端 / 通知 service）

---

## 5. 核心邏輯（5 條意圖規格）

### 5.1 RFQ : QT = 1 : N（N 含同 partner 多筆歷史）

一個 RFQ 對多個 QT。schema 已建 nx02_qt 表（c80dee2）支援此結構。

**沒有 unique constraint 限制 (rfqId, partnerId)**——同 partner 可多筆 QT 作為報價歷史。

API 設計：
- 查 RFQ 時可選擇是否帶回 QT list、是否按 partner group
- 新增 QT 時必須指定 rfqId
- QT 不能跨 RFQ（一個 QT 只屬於一個 RFQ）

### 5.2 採用 QT 必須是原子操作

採用 QT 涉及多筆 DB 寫入（QT 狀態 + 兄弟 QT 狀態 + RFQ 狀態 + 建 TI + 更新 SO line item）。
這些必須在單一 transaction 內完成，跟 D4 translator 同精神。

失敗時必須完整 rollback：要嘛全成功、要嘛全沒做。

### 5.3 採用 QT 的並發控制

兩個採購同時對同一個 RFQ 的不同 QT 按「採用」，會搶。

解法：對 rfqId 加 advisory lock。第二個採購的 transaction 等第一個 commit/rollback。

第二個會看到 RFQ.status 已是 completed → 回「此 RFQ 已採用其他報價，請刷新」。

### 5.4 拒絕單筆 QT vs 取消整個 RFQ

兩個動作不同：
- **拒絕單筆 QT**：只標那筆 QT、其他 QT/RFQ 不動。**rejectReason 必填**（schema partial CHECK 強制）。
- **取消整個 RFQ**：放棄整個詢價案，所有未 agreed 的 QT 全 rejected、RFQ cancelled。**cancelReason 必填**。

「必填 reason」是業務需求——以後查為什麼放棄某筆生意，要看得到原因。schema partial CHECK 已強制（status='R' → reject_reason NOT NULL & len > 0）。

### 5.5 採用 QT 時的「兄弟 QT 連帶處理」

採用某筆 QT 時，**同 RFQ 內所有 status != agreed 的其他 QT 全部標 rejected**。

包含：
- 同 partner 較舊的 QT（避免歷史 row 殘留 pending 狀態）
- 其他 partner 的 QT（採購已選定家了）

reject_reason 自動填系統訊息（避免 partial CHECK 失敗）：
- 例：`"因採用 QT-XXX（另一筆 D-O104 報價）"`
- 例：`"因採用 QT-YYY（D-K207 報價）"`

採購不需要逐筆按拒絕——「採用某筆」這個動作隱含「拒絕所有其他」。

---

## 6. 業務取捨拍板紀錄（給 Hank 直接照做）

| 議題 | 拍板結果 | 對應章節 |
|---|---|---|
| Q1：同行報價數量 < RFQ 要求 | (a) 部分採用算 completed，業務 A 自己處理缺額 | §3.3 已寫進 |
| Q2：QT 採用後能反悔嗎 | (a) 不能反悔，要走 TI 取消單流程 | §4.4 已寫進 |
| Q3：RFQ 逾期機制 | Phase 0 不做，採購自己手動 cancel 即可 | 不做 |
| Q4：歷史 RFQ/QT 保留 | 永久保留，未來看 DB 大小再決定 archive | 不做 |
| Q5：API access control | 視 endpoint 不同：查 list 開放、寫入限 PURCHASE_ADMIN role | 由 Hank 實作時對應既有 auth 慣例 |
| Q6：QT 是覆蓋 update 還是堆疊 insert（v2 新增）| 堆疊 insert 保留歷史（schema 已無 unique）| §3.2 / §5.1 已寫進 |

---

## 7. 不在這份文件範圍

| 項目 | 對應文件 |
|---|---|
| RFQ stub 建立 | D4 translator |
| TI 收貨流程 | NX02 採購收貨 |
| TI 取消流程 | NX02 採購收貨 |
| 同行 partner 主檔 | NX01 主檔 |
| 報表 | NX08 |
| W4 同行詢價工作台 UI | Phase 2 |
| 通知業務 A 的機制 | 前端 / 通知 service |
| 業務 A 收到「調不到」後的後續決策 | 業務 A 自己 + W2 工作台流程 |
| RFQ 逾期自動標記 | 不做（Phase 0 範圍外）|
| 歷史 archive 機制 | 不做（Phase 0 範圍外）|
| QT 報價趨勢分析 | NX08 報表（Phase 2+）|

---

## 8. 對 Hank 的交付要求

完成 B5 實作時請產出：

- `docs/nx02/spec/impl/b5-impl_rfq-qt-api.md`（實作 spec，含 endpoint 設計、DTO、控制流）
- 5 個 API 的 NestJS controller + service
- 對應的單元測試 + 整合測試（5 個動作各至少 1 案 + 並發控制 1 案 + **同 partner 多筆 QT 採用 1 案** = 7 個測試案例至少）
- 確認本意圖文件 5 條核心邏輯全部滿足

如有業務邏輯疑慮（不是工程取捨）→ 暫停回報 Crown。

---

## 9. 對 Hank 的提示

### 9.1 Controller / service 位置

B5 屬 NX02 採購模組，預計位置：`apps/nx-api/src/nx02/rfq/`（既有已有 rfq/ 資料夾，看裡面結構決定加在哪）。

考慮新建 `apps/nx-api/src/nx02/qt/` 子資料夾——因為 B5 主要是 QT 相關的新動作。

### 9.2 跟 D4 translator 共用的工具

D4 已經寫好的 `Nx04AdvisoryLock`、`runWithRetry`、`TranslatorBaseError` 等可以重用。

特別是「採用 QT」的並發控制（§5.3）跟 D4 §3.2 同源——advisory lock + retry。

### 9.3 既有 RFQ controller 是否存在

`apps/nx-api/src/nx02/rfq/` 已存在。**先 grep 看裡面有什麼、避免重複造輪子**。如果既有已有部分功能，升級它而不是新建。

### 9.4 Q5 access control 實作提示

按拍板結果：
- 查 list（§3.1）：開放給所有登入 user
- 新增 QT / 採用 QT / 拒絕 QT / 取消 RFQ（§3.2~3.5）：限 PURCHASE_ADMIN role

對應既有 auth middleware / role guard 機制決定怎麼實作。

### 9.5 「採用 QT 連帶 reject 兄弟 QT」的實作提示

§5.5 描述的「採用某筆 QT 時自動 reject 所有兄弟 QT」需要在同一 transaction 內：
1. UPDATE 該 QT status='A'（不需 reject_reason）
2. UPDATE 所有 same rfqId 且 status != 'A' 的 QT：
   - status = 'R'
   - reject_reason = '因採用 QT-{採用的 qtId}'

注意 partial CHECK chk_nx02_qt_reject_reason_when_rejected：status='R' 時 reject_reason 必填。Bulk UPDATE 時要確保每筆都填入。

---

## 10. 跟其他文件的關係

| 文件 | 關係 |
|---|---|
| D3 意圖版 v1.1 | RFQ/TI schema 結構在這裡 |
| D3 意圖版 v1.1 §2.1 邊界補充 | RFQ 必由 SO 觸發、TI 也是（B5 不處理「採購主動建 TI」場景）|
| D3 補丁 c80dee2 | nx02_qt 表落地（B5 直接用此表）|
| D4 意圖版 | translator 建 RFQ stub 的部分 |
| D4-impl spec | translator 程式碼可以重用（advisory lock、retry、exception）|
| Phase 2 W4 spec（未寫）| B5 是 W4 的後端基礎 |

---

## 11. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版意圖文件，含 Crown 對 Q1~Q5 5 題拍板結果 |
| 2026-04-27 | 2.0 | 對齊 nx02_qt 真實 schema（c80dee2 落地後）。改寫重點：(1) §3.2 改「每次報價 insert 新筆」（v1 假設 update）;（2) §3.3 + §5.5 補「採用 QT 時同 RFQ 所有未 agreed QT 連帶 rejected」;（3) §6 加 Q6 拍板紀錄;（4) §9.5 補 partial CHECK 實作提示 |

---

*文件結束*
