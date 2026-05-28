<!-- docs/_team/nx02-purchase-operation-manual.md -->

# NX02 進貨模組操作手冊（LITE 階段 1）

> 撰寫：Hank（Claude Code）
> 對應：feature/nx02-purchase-lite 整軌（M1~M3-redo-3b-2 + M4 + M5）
> 用途：Crown 親測進貨完整流程的操作指南
> 範式：對齊 docs/_team/nx01-master-operation-manual.md
>
> ⚠️ Hank 無法跑瀏覽器驗證、本手冊步驟為「依後端 API + UI 程式碼推導的預期行為」。
> Crown 實測有發現不對的、Hank 即改。

---

## 0. 開始前

### 0.1 啟動環境
```bash
# Terminal 1：後端
cd C:\NEXORA
pnpm --filter nx-api run start:dev

# Terminal 2：前端
pnpm --filter nx-ui run dev

# 瀏覽器：http://localhost:3000
```

### 0.2 登入測試租戶
- LITE：`tenantCode=TEST-LITE`、admin 帳號 `admin` / 密碼初始（seed 預設）
- PLUS：`TEST-PLUS`
- PRO：`TEST-PRO`

⚠️ 首次登入會被強制改密碼。

### 0.3 進貨模組入口
登入後從左側導覽列或直接訪問 `/dashboard/nx02`。看到「進貨管理 — 詢價→採購→進貨驗收→退貨」hub。

---

## 1. 詢價單 RFQ（核心新流程）

### 1.1 路徑
`/dashboard/nx02` → 詢價單 RFQ 卡片 → `/dashboard/nx01/rfq`

### 1.2 操作步驟

#### 1.2.1 建立詢價單
1. List 頁右上「+ 新增詢價」按鈕
2. 草稿狀態填寫：
   - 詢價日期、倉庫、聯絡人/電話（選填）
   - 加 line items：點「新增料件」、輸入料號搜尋、選料件、填數量
3. 存草稿（status=DRAFT）

#### 1.2.2 產生詢價文字（M3-redo-1）
1. 開 RFQ detail 頁
2. 右上「📋 產生詢價文字」按鈕
3. 系統彈出 inline panel：
   ```
   您好、想詢價以下零件：

   1. VAG-03H 115 562 H #DEU 機油芯 ×10
   2. ...

   麻煩報價謝謝
   ```
4. 點「複製」→ 已複製到剪貼簿
5. 業務貼到 LINE/Email 問供應商

⚠️ 開頭/結尾客套話從「客套話設定頁」帶來（見 §6）。

#### 1.2.3 並排比價（M3-redo-3b-1）
1. RFQ detail 頁「📊 並排比價」section
2. 點「📥 載入報價」（首次手動、之後可「🔄 重新整理」）
3. 業務收到供應商回價後、點 details「＋ 新增一筆報價」展開表單
4. 填 5 欄：供應商 ID / 單價 / 數量 / 交期天數 / 備註
5. 點「新增報價」
6. 系統按 quotedPrice 升冪排序、**最低價標 🏆 emerald 背景**
7. 重複 step 3-5 加多家報價

#### 1.2.4 採用最佳價建單（M3-redo-3b-2 核心）
1. 並排比價 table 中、選定的 Qt row 點「採用」
2. Confirm 對話框「將自動建立採購單／調貨單」
3. 系統依 rfqType 分流建單：
   - **rfqType=G 一般詢價（最常見）**：建 PO 採購單、alert「✅ 已建立採購單 PO-XXX」
   - rfqType=P 同行調貨（D4 translator stub 用）：建 TI 調貨單、alert「✅ 已建立調貨單 TI-XXX」
4. 連帶：其他兄弟 Qt 自動 status=REJECTED、RFQ status=CLOSED
5. 採購人員後續處理新建立的 PO/TI

### 1.3 預期結果
- RFQ list 看得到新建單
- Detail 頁可產生詢價文字 + 並排比價 + 採用建單
- 採用後：自動建 PO（rfqType=G）、RFQ → CLOSED

### 1.4 ⚠️ Follow-up
- RFQ form 三層欄位 retrofit（lite/expanded/all mode 切換）— **未做**
- 空畫面 audit / 全鍵盤 A/E/F/D/P/R/Q — **未做**
- 既有 RFQ detail 是「工作版」、Crown 可看到既有 list + 草稿編輯 + 並排比價 + 採用

---

## 2. 採購單 PO

### 2.1 路徑
- 從 RFQ 採用建出：自動建（見 §1.2.4）
- 直接建：`/dashboard/nx02` → 採購單 PO → `/dashboard/nx01/po`

### 2.2 操作步驟
1. List 頁看到 PO（rfqId 對應來源 RFQ）
2. 進 detail 看：
   - 表頭：supplier / RFQ / 付款條件 / 採購類型 D 國內
   - Items：partId / qty / unitCost / lineAmount
3. 業務確認後改 status=SENT（送出給供應商）

### 2.3 預期結果
- 從 RFQ 採用建出的 PO 預設 `purchaseType='D'` 國內、`paymentTermDomestic` 帶 supplier 預設
- 國外採購（purchaseType='I'）需手動建（本軌簡化版未做 RFQ→I 路徑）

### 2.4 ⚠️ Follow-up
- PO form 三層欄位 retrofit — **未做**
- 國外採購 RFQ→PO 路徑 — 業務手動建 PO + 改 purchaseType='I'

---

## 3. 進貨單 + 驗收 RR（含國外攤分）

### 3.1 路徑
`/dashboard/nx02` → 進貨單 + 驗收 RR → `/dashboard/nx01/rr`

### 3.2 操作步驟（國內進貨）

#### 3.2.1 建單
1. 從 PO 帶資料建（自動帶 supplier / items），或直接建
2. 草稿狀態填倉庫 / 庫位 / 實收數量

#### 3.2.2 驗收（合在進貨單）
1. status DRAFT → INSPECTING（倉管專員開始驗收）
2. 填每筆 item 的 actualQty（實收數量）
3. status INSPECTING → POSTED：
   - **自動入庫**：呼叫 `applyQtyInWithLedger`、寫 `nx03_stock_balance` + `nx03_stock_ledger`
   - **移動平均成本算對**：新均價 = (舊qty × 舊avg + 新qty × 新成本) ÷ (舊qty + 新qty)
   - **自動產生應付帳**：呼叫 `createApFromPostedRr`、寫 `nx05_ap_ledger`（sourceType=RR、dueDate 依 supplier paymentTerm）

### 3.3 操作步驟（國外進貨、M3-redo-3a）

#### 3.3.1 額外步驟（提貨單）
1. RR detail 頁上方多出「🛳️ 國外進貨資訊（提貨單）」block（rrImport != null 才顯示）
2. 顯示：
   - 買入匯率（鎖定）
   - 6 種費用：海運費 / 關稅 / 報關費 / 倉儲費 / 其他雜費 / 進口費用合計
   - 貿易條件（Incoterm）

#### 3.3.2 費用攤分（M2-a 拍板按金額比例）
- 公式：`allocatedImportFee = totalImportCost × (itemGoodsAmount ÷ totalGoodsAmount)`
- 貴的零件分攤多運費（不是按數量平均）
- 過帳時系統算完寫入：
  - `nx02_rr_item.original_unit_cost` = 原始外幣單價
  - `nx02_rr_item.allocated_import_fee` = 攤分到此料的費用
  - `nx02_rr_item.actual_unit_cost` = (originalUnitCost × exchangeRate × qty + allocatedImportFee) ÷ qty

#### 3.3.3 RR detail item table（國外多 2 欄）
- 「攤分費用」（blue）：每料按金額比例攤分結果
- 「入庫成本」（emerald, bold）：actualUnitCost、過帳移動平均用

### 3.4 預期結果
- RR POSTED 後 stock_balance 增加（移動平均 avgCost 算對）
- 同 transaction 內自動建 AP（nx05_ap_ledger 看得到）
- 國外 RR 攤分後 actualUnitCost 顯示正確

### 3.5 ⚠️ Follow-up
- RR form 三層欄位 retrofit — **未做**
- RR detail 既有 export panel 跟新加的「國外攤分」block 共存、未整合

---

## 4. 退貨單 PR

### 4.1 路徑
`/dashboard/nx02` → 退貨單 PR → `/dashboard/nx01/pr`

### 4.2 操作步驟
1. 從 RR 發起（驗收發現問題）
2. 填 returnMode（F=全退 / P=部分退 / A=折讓不退）
3. 過帳：扣 stock_balance + 寫 Allowance（折讓）or 沖 AP

### 4.3 ⚠️ Follow-up
- PR form 三層欄位 retrofit — **未做**
- PR UI 是既有「工作版」、本軌沒整修

---

## 5. 保固申請單（M2-d + M3-redo-2 + M3-redo-3b-1）

### 5.1 路徑
`/dashboard/nx02` → 保固申請單 → `/dashboard/nx02/warranty-claim`

### 5.2 操作步驟

#### 5.2.1 新建（兩型）
1. 右上「+ 新建保固申請」
2. **TieredFormToolbar 三段切換**（Alt+L）：lite（必要）/ expanded（含建議）/ all（含進階）
3. 選申請類型：
   - **CUST 客訴型**：必填 sourceSoId（⚠️ NX04 SO LITE 還沒做、暫填佔位 ID）+ 建議填 sourceSoNo
   - **SELF 自用型**：sourceSoId 區段不顯示
4. 必填：申請日期 / 供應商 ID / 零件 ID / 數量 / 問題描述
5. 進階（⚪、all mode 才顯示）：備註
6. 「建立（草稿）」status=D

#### 5.2.2 status 流轉（5 階段）
List row 每筆有動態按鈕：
- D=DRAFT → 點「送出」→ S=SUBMITTED
- S=SUBMITTED → 點「進入審核」→ R=REVIEWING
- R=REVIEWING → 填 inline：
  - 結果 dropdown：NEW=換新 / REF=退錢 / RPR=維修後還 / REJ=駁回
  - 審核回覆 input
  - 點「登記結果」→ C=COMPLETED
- D/S/R → 點「作廢」→ V=VOIDED（C 已完成不能作廢）

#### 5.2.3 附件上傳（M3-redo-3b-1）
每個 row inline 3 個 file input：
- 「行照 +」（accept image+pdf、≤ 5MB）
- 「照片 +」（accept image、≤ 10MB）
- 「影片 +」（accept video、≤ 100MB）

選檔後自動：
1. 前端 FileReader 讀 base64
2. POST `/nx02/warranty-claims/:id/attachments` { fileType, base64Content, origFilename, mimeType }
3. Backend：base64 → buffer → FileUploadService.upload → 拿 storageKey → 寫 attachment row
4. 即時提示：「讀檔中… → 上傳中… → ✅ 已上傳 N KB」

### 5.3 預期結果
- 5 階段 status badge 顏色不同（藍/琥珀/翠綠/紅）
- result 4 種登記後 list 顯示中文標籤
- 附件大小超過上限 → 400 錯誤訊息

### 5.4 ⚠️ Follow-up
- 附件 download endpoint — **未做**
- 附件刪除 UI — **未做**（後端 endpoint 已備）
- 客訴型 sourceSoId picker（連 NX04 SO）— **NX04 SO LITE 還沒做、預留 nullable 欄位**

---

## 6. 客套話設定（M3-redo-2 retrofit）

### 6.1 路徑
`/dashboard/nx02` → 客套話設定 → `/dashboard/nx02/rfq-greeting-template`

### 6.2 操作步驟
1. 進頁面自動 getOrCreate（首次帶 schema default）
2. **TieredFormToolbar** 三段切換（兩個欄位都 required、所以三段 UI 差異不大）
3. 編輯開頭客套話 + 結尾客套話（最多 500 字）
4. 預覽區即時顯示套用後實際文字
5. 「儲存」

### 6.3 預期結果
- 儲存後 RFQ「📋 產生詢價文字」會用新客套話

---

## 7. 供應商維護（鋼鐵星球範式 + M2-c 等級重算）

### 7.1 路徑
`/dashboard/nx02` → 往來對象主檔 → `/dashboard/base/partners`

### 7.2 操作步驟

#### 7.2.1 新建供應商
1. List 頁「+ 新增」
2. 填：
   - 對象代碼 / 對象名稱（必填）
   - 對象類型：選 **S 供應商**（六分類 C/O/S/T/B/V）
   - 國內付款條件：PREPAY / NET30 / NET60 / NET90
3. 存檔

#### 7.2.2 依付款條件重算供應商等級（M2-c / M3-redo-1）
1. Edit 既有 partner 進編輯 mode
2. 國內付款條件 section 下方「🏆 依付款條件重算供應商等級」按鈕
3. 點按鈕後 alert「已依付款條件 NET90 重算供應商等級 → A」
4. 映射規則：NET90→A / NET60→B / NET30→C / PREPAY→D
5. ⚠️ 簡化：reopen 才看得到完整 supplierGrade 顯示（form 沒這欄位、留 follow-up）

### 7.3 預期結果
- 供應商六分類顯示正確（保養廠 C / 同行 O / 供應商 S / 外包物流 T / 銀行 B / 一般廠商 V）
- 重算按鈕依付款條件正確 map 等級

---

## 8. 產品維護（鋼鐵星球範式 + M2-b 定價重算）

### 8.1 路徑
`/dashboard/nx02` → 零件主檔 → `/dashboard/base/parts`

### 8.2 操作步驟

#### 8.2.1 編輯既有產品
1. List 點 row 進 modal、Edit
2. 改成本（cost）

#### 8.2.2 依成本重算 ABCD（M2-b / M3-redo-1）
1. 編輯 mode 下「建議售價 ABCD」section 標題列「📊 依成本重算」按鈕
2. 點按鈕、後端：`price = cost × (1 + customer_grade.marginPct/100)`
3. fallback marginPct：A=12% / B=15% / C=18% / D=22%
4. 自動填入 form：priceA/B/C/D
5. 業務可手動微調覆寫
6. Save

### 8.3 預期結果
- 重算後 ABCD 對應 customer_grade.marginPct（per tenant）
- 安全量在 `nx03_part_stock_setting`（per warehouse、本軌未做專用 UI、CRUD 端點已備）

---

## 9. 共享待辦池（M4 新框架）

### 9.1 路徑
`/dashboard/nx02` → 共享待辦池 → `/dashboard/task-pool`

### 9.2 操作步驟

#### 9.2.1 切換 scope tab
- **我的待辦**（mine）：assignee = 當前 user
- **池中（未領）**（pool）：status=OPEN + assignee=null
- **全部**（all）：全部 status

#### 9.2.2 新建待辦
1. 右上「+ 新建待辦」
2. **TieredFormToolbar** Alt+L 切換：
   - lite：標題 + 分類（必要）
   - expanded：+ 優先級 / 截止日期 / 詳細說明（建議）
   - all：（本表單沒進階欄位）
3. 分類 10 種：PURCHASE_RECEIVE / SALES_PICK / FINANCE_AR_FOLLOW 等
4. 優先級：L/M/H

#### 9.2.3 業務動作
每 row 動態按鈕：
- OPEN → 點「領取」→ CLAIMED（assignee=user）
- CLAIMED → 「完成」→ DONE / 「放回池」→ OPEN（清 assignee）
- OPEN/CLAIMED → 「作廢」→ VOIDED

### 9.3 預期結果
- 跨模組通用框架（業務模組可 createTaskPool 自動產待辦、本軌僅 manual create）
- 優先級 + 截止日期顏色標示

### 9.4 ⚠️ Follow-up
- 業務模組自動產待辦（RR 建立→自動產 PURCHASE_RECEIVE）— **未做**
- RBAC enforce（主管才能 assign / EF 只能 claim）— **未做**
- 待辦 detail page — **未做**
- realtime push notify — **未做**

---

## 10. 三層欄位操作（M5 framework）

### 10.1 三段顯示模式（Alt+L 循環）

| Mode | 🟢 required | 🟡 recommended | ⚪ advanced |
|------|-----------|-------------|------------|
| **lite**（LITE 預設）| 顯示 | 摺疊（顯示「🟡 label（建議填、點開）」按鈕、點開展開）| 隱藏 |
| **expanded**（中度）| 顯示 | 展開 | 隱藏 |
| **all**（全顯示）| 顯示 | 展開 | 顯示 |

### 10.2 Alt+L 鍵盤切換
- 任何頁面有 `<TieredFormToolbar />` 都可按 Alt+L 三段循環
- 在 input / textarea / select 內按 skip（避免衝突業務輸入）

### 10.3 套用三層欄位的頁面
- ✅ /dashboard/nx02/warranty-claim 新建 form
- ✅ /dashboard/task-pool 新建 form
- ✅ /dashboard/nx02/rfq-greeting-template 整頁

### 10.4 Demo 頁
- `/dashboard/tiered-form-demo` — 給 Alex 看 framework 效果、11 個範例欄位

### 10.5 ⚠️ Follow-up
- RFQ / PO / RR / PR / Part / Partner form 三層欄位 retrofit — **未做**

---

## 11. 整軌 Follow-up 清單

下列功能本軌**未做**、Crown 測試時遇到請標、後續軌補：

### 11.1 三層欄位 retrofit
- RFQ list / detail form
- PO list / detail form
- RR list / detail form
- PR list / detail form
- Part edit modal
- Partner edit modal
- 共通：空畫面顯示 / 全鍵盤 A/E/F/D/P/R/Q

### 11.2 保固附件
- Download endpoint + 下載按鈕
- 刪除 UI 按鈕
- 客訴型 sourceSoId picker（連 NX04 SO 待做）

### 11.3 待辦池
- 業務模組 trigger 自動建待辦
- RBAC enforce
- Detail page
- Realtime / push notify

### 11.4 RR detail
- 國外攤分 block 跟既有 export panel 整合
- actualUnitCost 對應 stock_ledger 顯示

### 11.5 PR / 退貨流程
- UI 整修
- 國外退貨流程驗證

### 11.6 NX02 hub 連結
- `/dashboard/purchase/*` 舊路由（document-demo）是否廢棄
- `/dashboard/nx01/*` 跟 `/dashboard/nx02/*` 路由體系統一

---

## 12. 業務流程完整測試清單（給 Crown 親測）

### 12.1 詢價→採購流程
- [ ] 建 RFQ 草稿
- [ ] 加多筆料件
- [ ] 點「📋 產生詢價文字」→ 文字正確 → 複製成功
- [ ] RFQ「📊 並排比價」載入報價
- [ ] 「+ 新增報價」填 3 家供應商不同單價
- [ ] 排序按單價升冪、最低價標 🏆
- [ ] 採用最低價 → alert「已建立採購單 PO-XXX」（不是調貨單）
- [ ] 其他 Qt 自動 REJECTED、RFQ CLOSED

### 12.2 PO → RR → 入庫
- [ ] PO list 看到從 RFQ 採用建出的單
- [ ] 從 PO 建 RR
- [ ] RR 填實收 → 驗收 → POSTED
- [ ] stock_balance 對應 part 增加（透過 NX03 庫存頁查）
- [ ] AP 自動產生（NX05 AP 待做、查 DB 確認）

### 12.3 國外進貨
- [ ] 國外 PO（purchaseType='I'）
- [ ] 國外 RR + RrImport（提貨單）
- [ ] 填匯率 + 6 種費用
- [ ] RR detail 顯示「🛳️ 國外進貨資訊」block
- [ ] 過帳後 actualUnitCost 顯示「攤分費用」+「入庫成本」
- [ ] 驗證金額比例攤分（貴的料分多運費）

### 12.4 保固申請
- [ ] 新建客訴型 + 自用型各一筆
- [ ] 上傳行照 / 照片 / 影片 各一個檔
- [ ] 大小限制驗證（影片 >100MB 應 reject）
- [ ] 5 階段流轉：D→S→R→C
- [ ] 4 結果登記：NEW/REF/RPR/REJ

### 12.5 供應商 / 產品維護
- [ ] 新建供應商（六分類選擇對）
- [ ] 編輯 → 改付款條件 → 重算等級
- [ ] 新建零件 → 填成本 → 依成本重算 ABCD
- [ ] 手動微調 ABCD（可覆寫）

### 12.6 共享待辦池
- [ ] 新建待辦（lite/expanded/all 切換）
- [ ] 領取 / 完成 / 放回池 / 作廢

### 12.7 整體
- [ ] NX02 hub 連結都通、無 404
- [ ] 空殼狀態：新租戶開通、list 都顯示「點+新增第一筆」
- [ ] Alt+L 在每個 TieredForm 都能切換
- [ ] 三租戶 LITE/PLUS/PRO 都能登入跑

---

## 13. 整軌驗證紀錄

### 13.1 自動化驗證（Hank 跑過）
| 項目 | 結果 |
|------|------|
| `prisma migrate status` | ✅ 87 migrations、Database schema up to date |
| `pnpm --filter nx-api run build` | ✅ EXIT=0 |
| `pnpm --filter nx-ui run build` | ✅ EXIT=0 |
| `pnpm seed` 三租戶 | ✅（待 Crown 驗、本軌跑過） |

### 13.2 瀏覽器互動驗證
⚠️ Hank 無法跑、跳過。Crown 親測（見 §12 清單）。

---

> 本手冊持續更新。Crown 測試遇到落差、Hank 對齊真實行為更新。
> 對應 commit history：feature/nx02-purchase-lite 整軌 13 commits。
