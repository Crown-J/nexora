<!-- docs/spec/sale/S-W01_domestic-sale-actual.md -->
# S-W01 國內銷售實際流程（Actual）

> 這是「程式碼實際行為」的反向 spec，不是設計意圖。
> 產出日期：2026-04-24
> 產出者：Hank（讀 code 反推）
> 對照版本：commit `3e95fb8`（`feature/spec-reverse-sw01` 分支起點）

---

## 涵蓋範圍

完整交易鏈，依物理單據順序描述：

```
SOP 9 step（/dashboard/sale/sop-demo）
  ↓ STEP 2 查料遇到缺貨 → OutOfStockDialog
     ↓ 選項 A → RFQ 詢價單（/dashboard/sale/inquiry）
     ↓ 選項 B → CO 客戶訂單（無 UI）
  ↓ STEP 5 「考慮看看」→ createDirectQTs（每 item 一張 QT，source='direct'）
  ↓ STEP 8 createSO → SYS-C 四情境分流
     ↓ 情境 A → 直接建 PK
     ↓ 情境 B → 建 IT（他倉 → 本倉）
     ↓ 情境 C → 建 TI（同行 → 本倉）
     ↓ 情境 D → IT + TI 並行

備貨完成後（IT completed / TI completed）
  ↓ planSoAdvance 自動建 PK + SO → ready_to_pick
  ↓ completePicking  → BX 生成 + SO → packed
  ↓ completePacking  → DN 生成 + SO → delivering
  ↓ completeDelivery → SO → completed
```

兩條 SO 建立路徑：
- **SOP 路徑**：STEP 8 一次性把 `quoteItems` 丟進 `createSO`，所有 item 硬寫 `source='stock'`
- **QT 路徑**：目前 **未 wire**（MobileQTDetailPage 刻意不實作，見 ⚠️ 清單）

---

## 節點 1：SOP STEP 1 — 選客戶

**路徑**：`/dashboard/sale/sop-demo`（薄殼 → `MobileSaleSopPage`）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step1SelectCustomer.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step1SelectCustomer.tsx)

### 畫面元素
- 頂部 ProgressHeader（9 步進度條）
- 搜尋框（佔位文字「輸入客戶名稱、代碼或電話」）
- 「最近拜訪客戶」列表（來源 `MOCK_CUSTOMERS`，每筆卡片：代碼 + 名稱 + 等級 badge + 聯絡人/電話 + 地址）
- 選中後切換為「已選客戶詳情卡」：銷售實績 3 格（本日 / 本月 / 今年累計）、退貨率（近 3 個月）、最近 2 則備註、「← 改選其他客戶」連結
- 底部「下一步 → 查詢料號」（未選客戶時 disabled + 提示「請先選擇一位客戶」）

### 可執行操作
- **輸入搜尋關鍵字**：`useState` local `keyword`，同頁 `useMemo` filter，不觸發 reducer
- **點客戶列表卡**
  - 觸發 action：`SELECT_CUSTOMER`（payload: customer 物件）
  - 結果：reducer 把 `state.selectedCustomer` 設為該客戶，畫面切到詳情卡
- **點「改選其他客戶」**
  - 觸發 action：`CLEAR_CUSTOMER`
  - 結果：`selectedCustomer` → null，畫面切回列表
- **點「下一步」**
  - 觸發 `onNext()` → `setCurrentStep(s => s+1)`
  - 結果：進 STEP 2

### 備註
- 客戶資料純 mock，不接 API
- 不顯示 AR / 付款條件 / 逾期（刻意的業務權限切割）

---

## 節點 2：SOP STEP 2 — 查料 / 庫存

**路徑**：`/dashboard/sale/sop-demo`（step=2）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step2SearchParts.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step2SearchParts.tsx)

### 畫面元素
- 頂部已選客戶摘要條（代碼 + 名稱 + 等級 + 「自動套 X 級價」）
- 搜尋框、常用關鍵字 chips（剎車片 / 機油濾心 / 空氣濾心 / 火星塞）
- 掃描條碼 + 語音輸入按鈕（**🚧 純視覺，onClick 空 function**）
- 料號列表（手風琴，同時只一個展開）：
  - 每筆列：料號 + 品名 + 本倉數量 + 建議售價
  - 展開卡：**歷史記錄提醒卡 HistoryQuoteAlert**（若 `useHistoryRecord(customerCode, sku)` 命中）、**料號圖片**（可開 Lightbox）、適用車型、**多倉庫存 3 格**（本倉/新竹倉/台中倉）、**報價可編輯**（建議值 = 該客戶等級價）、**MarginAlert 毛利警覺性**、數量 stepper
- **三種底部按鈕狀態**：
  - 全公司庫存為 0 → 金色框「目前全公司無庫存」按鈕
  - 已加入清單 → 綠色提示「已加入報價清單 · 自動同步本卡變更」+ 旁邊「移除」
  - 其他 → 金色 CTA「加入報價清單」（本倉 + 他倉合計仍不夠時改為「缺貨無法下單」disabled）
- 「庫存不足救援建議」淡金卡（`qty > mainStock && 非全公司缺貨`時顯示：本倉 X 個 + 他倉調 Y 個 + ✓ 可完整出貨）
- 底部「下一步 → 報價清單（N 項）」

### 可執行操作
- **輸入關鍵字** → 本地 `useState` + `searchParts(kw)` filter
- **展開/收合料號**：本地 `expandedSku` state
- **調數量/單價**（詳情卡內）
  - 若已加入清單 → 觸發 `UPDATE_QUOTE_ITEM`（reducer）
  - 若未加入 → 只改本地 `localQty / localPrice`
- **點「加入報價清單」**
  - 觸發 action：`ADD_QUOTE_ITEM`（payload: `{ sku, quantity, unitPrice }`）
  - 結果：reducer 若該 sku 已存在則覆寫（exists branch），否則 push；**跳出 AddMoreDialog「還要查嗎？」**、收合詳情
- **點「移除」**
  - 觸發 action：`REMOVE_QUOTE_ITEM`
- **點「目前全公司無庫存」**
  - 本地 setState `setOosDialog({ part, qty })` → 彈出 `OutOfStockDialog`
- **點 HistoryQuoteAlert「查看詳情」**
  - type=rfq → `router.push('/dashboard/sale/inquiry/' + refId)`
  - type=qt → `router.push('/dashboard/sale/docs/quote/' + refId)`
  - type=quote → 顯示 toast「歷史報價 XXX，暫無詳情頁」
- **AddMoreDialog 選「繼續加料」**：`setKeyword('')` + 關 dialog
- **AddMoreDialog 選「結束查料」**：關 dialog + `onNext()` 直接跳 STEP 3

### OutOfStockDialog sub-flow
- **選項 A「向同行調貨」**
  - 呼叫 `useRFQStore.createRFQ({ customer, part, quantity })`
  - store 產生 RFQ：`rfqNumber = RFQ-YYMM-xxxxx`、`status='waiting'`、`vendorQuotes=[]`
  - Toast「已建立詢價單 RFQ-XXX,可至「同行調貨」處理」
- **選項 B「轉客戶訂單」**
  - 呼叫 `useRFQStore.createCustomerOrder(...)`
  - store 產生 CO：`orderNumber = CO-YYMM-xxxxx`、`status='waiting'`
  - Toast「已建立客戶訂單 CO-XXX,下次進貨時系統會提醒」

### 備註
- 🚧 「掃描條碼」「語音輸入」純視覺 mock（`onClick={() => {}}`）
- ⚠️ `QuoteItem` 型別沒有 `sourceRfqNumber / sourceQtNumber / source`，RFQ 建立後沒有任何機制把產出的 QT 拉回到同一張 SOP；SOP 流會繼續以 stock 模式走到 Step 8。缺貨料號要「從 RFQ → QT → SO」的回路 **未 wire**。
- CO（CustomerOrder）建立後沒有任何 UI 列表頁消費它（`/dashboard/sale/docs/orders` 是 PlaceholderPage）。

---

## 節點 3：SOP STEP 3 — 報價清單

**路徑**：`/dashboard/sale/sop-demo`（step=3）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step3QuoteList.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step3QuoteList.tsx)

### 畫面元素
- 客戶摘要條
- 報價明細列表（每筆：料號 + 品名 + 庫存資訊「本倉 X（足）」或「本倉 X + 調他倉 Y」 + 數量/單價/小計 3 格輸入）
- 「移除」按鈕（每筆）
- 總計區：小計、稅金 5%、總金額、預估毛利 NT$ + %、目標毛利（依客戶等級對應 `TIER_TARGET_MARGIN`）+ 達標/略低

### 可執行操作
- **改數量**：`UPDATE_QUOTE_ITEM`（quantity）
- **改單價**：`UPDATE_QUOTE_ITEM`（unitPrice）
- **移除**：`REMOVE_QUOTE_ITEM`
- **下一步 → 決定報價方式**：`onNext()`（items.length > 0 才 enable）

### 備註
- ⚠️ `TIER_TARGET_MARGIN` 在本檔用的是 `sop-workspace/mock-data/scenario.ts` 版本（A:35 / B:27 / C:22 / D:18），與 `inquiry/types.ts` 版本（A:22 / B:27 / C:32 / D:38）**數值相反**。見後續 ⚠️ 清單。

---

## 節點 4：SOP STEP 4 — 如何報價

**路徑**：`/dashboard/sale/sop-demo`（step=4）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step4QuoteMethod.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step4QuoteMethod.tsx)

### 畫面元素
- 2 個方式卡：
  - **口頭報價**（業界慣例）：麥克風 icon + 「客戶問『多少錢？』您口頭回覆即可」+ 「系統會記錄此次報價供日後查詢」
  - **列印報價單**（特殊情況）：印表機 icon + bullets「估車 / 保險公司請款 / 客戶堅持要書面」+ 「回公司列印 PDF 給客戶」

### 可執行操作
- **點卡片**
  - 觸發 action：`SET_QUOTE_METHOD`（method: 'verbal' | 'print'）
  - 結果：`state.quoteMethod` 更新，選中卡邊框轉金色

### 備註
- ⚠️ 「系統會記錄此次報價供日後查詢」的字面承諾 — 目前 code **沒有** 因為選了 verbal 就把這次報價存進 store（只是 reducer 的 state，重置後消失）。

---

## 節點 5：SOP STEP 5 — 客戶決定（5 選項 + 4 sub-flow）

**路徑**：`/dashboard/sale/sop-demo`（step=5）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx)

### 畫面元素
- 上方報價摘要卡（顯示前 3 項 + 「…另 N 項」+ 總金額 + 報價方式 label）
- 5 個決定選項卡：
  - **接受所有品項**（✓ 綠）：「好，就這樣」
  - **部分接受**（清單 金）：「我只要前面幾項」
  - **要求調整價格**（對話 金）：「可以便宜一點嗎？」
  - **考慮看看**（時鐘 藍）：「我再想想」
  - **全部不要**（叉 淡紅）：「先不要了」
- 底部「下一步：選擇出貨方式」（**只有 `decision === 'accept_all'` 才能按**，其他選項走彈窗）

### 可執行操作
- **點「接受所有品項」**
  - 觸發 action：`SET_CUSTOMER_DECISION`（decision: 'accept_all'）
  - 結果：底部按鈕 enable；業務按下一步才進 STEP 6（非自動 setTimeout，Phase 1 已修）
- **點「部分接受」** → 彈 `PartialAcceptDialog`
  - 勾選要的 sku 後 confirm：對未勾選的逐筆 `REMOVE_QUOTE_ITEM` + 關 dialog + `RESET_CUSTOMER_DECISION`（留在 STEP 5）
- **點「要求調整價格」** → 彈 `PriceAdjustDialog`
  - 調完 confirm：對每個 sku `UPDATE_QUOTE_ITEM`（unitPrice）+ 關 dialog + `RESET_CUSTOMER_DECISION` + `onGoToStep(4)`（跳回 STEP 4 重新報價）
- **點「考慮看看」** → 彈 `ConsiderDialog`
  - confirm（帶 trackingDays，**但參數 `_trackingDays` 目前未使用**）：
    - 呼叫 `useRFQStore.createDirectQTs({ customer, items[] })`
    - **每一個 item 各建一張 QT**（source='direct'，status='pending_customer'）
    - `onFinishSOP()` → `RESET` reducer + `router.push('/dashboard/sale')`
- **點「全部不要」** → 彈 `RejectReasonDialog`
  - confirm：**只 `console.info('[Phase 3] 客戶拒絕:', { reasons, note })`** → `onFinishSOP()`
- **底部「下一步」**：`onNext()` 進 STEP 6

### 備註
- 🚧 `RejectReasonDialog` 的原因 + note 沒存進任何 store（檔頭自己標 Demo 期）
- 🚧 ConsiderDialog 的 trackingDays 參數被接收但未使用（`_trackingDays` 前綴的下劃線明示）
- ⚠️ `createDirectQTs` 為每個 item 各建一張 QT（而非整張報價打包一張）— 註解說是「便於 useHistoryRecord 查單料號」

---

## 節點 6：SOP STEP 6 — 配送方式

**路徑**：`/dashboard/sale/sop-demo`（step=6）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step6DeliveryMethod.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step6DeliveryMethod.tsx)

### 畫面元素
- 客戶摘要卡（代碼 + 名稱 + 地址 + 類型）
- **系統推薦提示**（Info 淡金卡）：依客戶 `customerType === '同行'` → 客戶自取；`isRemote` → 物流寄送；其他 → 外務配送
- 3 個配送卡（外務配送 / 客戶自取 / 物流寄送），推薦那個有「推薦」badge

### 可執行操作
- **點卡**
  - 觸發 action：`SET_DELIVERY_METHOD`
- **回上一步**
  - `handleBack()` 偵測 `currentStep === 6` → `RESET_CUSTOMER_DECISION`（Phase 1 修復：避免 accept_all 的殘留 decision 把人再彈回來）

### 備註
- 無客戶時畫面顯示「缺少客戶資料，請回上一步重新選擇」（防呆，正常流程不會觸發）

---

## 節點 7：SOP STEP 7 — 簽單方式

**路徑**：`/dashboard/sale/sop-demo`（step=7）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step7SignMethod.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step7SignMethod.tsx)

### 畫面元素
- **OrderPreview 卡**：訂單號（顯示「**生成中…**」因為 `state.orderNumber` 此時還是 null）、客戶、項目清單、總金額、配送方式 label
- 2 個簽單卡：**電子簽名**（PenLine，現場完成，「訂單立刻成立」）、**紙本簽單**（FileText，回公司列印）
- 選電子簽後：**SignaturePadModal** 開啟；完成後主畫面顯示綠色「簽名已完成」+ 「重新簽名」
- 選紙本後：主畫面顯示 Info 卡「已登記『紙本簽單』... 回公司後系統自動：• 生成訂單 PDF • 外務帶紙本送貨 • 客戶現場簽名後外務帶回」

### 可執行操作
- **點「電子簽名」**
  - `SET_SIGN_METHOD`（electronic）→ 開 SignaturePadModal
- **點「紙本簽單」**
  - `SET_SIGN_METHOD`（paper）→ 不開 modal，直接留在主畫面
- **SignaturePadModal onComplete** → `COMPLETE_SIGNATURE`（`hasSigned=true`）+ 關 modal
- **SignaturePadModal onCancel** → `CLEAR_SIGN_METHOD`（`signMethod=null, hasSigned=false`）+ 關 modal
- **切換簽單方式**：reducer 的 `SET_SIGN_METHOD` 會把 `hasSigned` 重設為 false（避免先電子簽再改紙本卻留 true）
- **「下一步 → 訂單成立」**（canProceed 規則：`electronic` 需 `hasSigned`；`paper` 直接可；`null` disabled）

### 備註
- ⚠️ [sop-workspace/types.ts:111](apps/nx-ui/src/features/sale/ui/sop-workspace/types.ts#L111) 註解寫「訂單編號；進 STEP 7 時由 reducer 自動生成」，**實際 code 不是這樣**。reducer 的 `SET_ORDER_NUMBER` 只在 Step 8 `createSO` 成功後才 dispatch。因此 STEP 7 的 OrderPreview 永遠顯示「生成中…」。
- [MobileSaleSopPage.tsx:108](apps/nx-ui/src/features/sale/ui/sop-workspace/MobileSaleSopPage.tsx#L108) 的註解反而是對的（Phase 5 已改為 Step 8 注入）。

---

## 節點 8：SOP STEP 8 — 訂單成立（createSO + SYS-C）

**路徑**：`/dashboard/sale/sop-demo`（step=8）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx)

### 畫面元素
- OrderCompleteHeader（綠勾 + 「訂單已建立」+ 訂單號 + **備貨情境 badge**「備貨情境 A：本倉有貨,直接備貨」等 4 種）
- 「系統已自動處理」清單（FadeInItem 漸入，每項 delay 250ms）：
  - **第 1 項（情境動態標題）**：
    - 情境 A：「庫存已預留」「本倉 N 個已鎖定」
    - 情境 B：「**調撥單已建立**」「IT-YYMM-xxxxx\n新竹倉/台中倉 → 本倉 共 N 個」
    - 情境 C：「**調貨單已建立**」「TI-YYMM-xxxxx\n向 XX汽材行 取貨 共 N 個」
    - 情境 D：「**調撥 + 調貨並行**」列出 IT 與 TI 單號
  - **第 2 項（撿貨）**：情境 A → 「撿貨單已生成：PK-YYMM-xxxxx\n已通知倉管專員」；其他 → 「撿貨單：待備齊後自動生成」
  - **第 3 項（配送）**：依 `deliveryMethod` 顯示外務姓名 / BOX 編號 / 物流公司（**硬寫外務「王大偉」**）
  - **第 4 項（AR）**：「應收帳款已建立：NT$ X 月結 30 天（會計可見）」
  - **第 5 項（業績）**：「業績已記錄：本月業績 +NT$ X，本月毛利率更新:**28.3%**」（mock 固定字串，不隨實際毛利更新）
  - **第 6 項（偏好）**：「客戶偏好已更新：{客戶名}購買偏好已更新」
- 「業務您只做了 3 件事」金卡（選客戶 / 查料報價 / 建單）

### 可執行操作
- **進入 STEP 8 時（useEffect，didCreateRef.current guard 只跑一次）**
  - 把 `state.quoteItems` 映射成 `SOItem[]`（**硬寫 `source: 'stock'`**）
  - 呼叫 `useSalesStore.createSO({ customer, items })`
  - **結果**：
    1. 呼叫 `analyzeSO(items)`（SYS-C）得到 scenario + transferPlan + inquiryPlan
    2. 遞增 `sharedSeq`，用 `buildSharedDocNumbers(yymm, seq)` 產 SO/PK/BX/DN 共享單號
    3. 情境 B/D：依來源倉分組建 IT 單（每個 from-warehouse 合併成一張 IT）
    4. 情境 C/D：所有 inquiry 項目合併成一張 TI
    5. 建 SO：`status` 由 `initialStatusByScenario` 決定（A=`ready_to_pick` / B=`waiting_transfer` / C=`waiting_supplier` / D=`waiting_all`）
    6. 情境 A：直接建 PK（status='pending'）
    7. 回傳 `{ so, analysis, pk?, its, tis }`
  - `dispatch({ type: 'SET_ORDER_NUMBER', orderNumber: r.so.soNumber })`
  - 若 `createSO` throw（SYS-C 判斷全公司無貨）→ console.error（畫面 orderNumber 保持 null）
- **下一步 → 成交總結**：`onNext()` 進 STEP 9

### SYS-C 分支邏輯（[fulfillment/sysC.ts](apps/nx-ui/src/features/sale/ui/fulfillment/sysC.ts)）
```
for item in items:
  if item.source == 'inquiry':
    inquiryPlan.push(...)
    continue
  # 下面只處理 source='stock' 的
  if part.stocks.main >= item.quantity:
    continue
  # 本倉不夠 → 掃其他倉（hardcoded 順序 hsinchu → taichung）
  for wh in ['hsinchu', 'taichung']:
    ...（扣到夠為止）
  if remaining > 0:
    throw '[SYS-C] SO 含全公司無庫存的品項 X,應先走缺貨分流建 RFQ'

scenario = A (!transfer, !inquiry) / B (transfer, !inquiry) / C (!transfer, inquiry) / D (both)
```

### 備註
- ⚠️ **Step 8 對 `quoteItems` 硬寫 `source: 'stock'`**，導致 `inquiryPlan` 永遠為空、從 SOP 入口進來的 SO **永遠不會是情境 C / D**。情境 C / D 只在 mock 初始資料 + 未來的 QT → SO 路徑（未 wire）才會出現。
- ⚠️ 業績「本月毛利率更新:28.3%」是硬寫字串，不是計算值
- ⚠️ 外務姓名「王大偉」硬寫
- ⚠️ SYS-C 的多倉掃描順序 `OTHER_WAREHOUSES = ['hsinchu', 'taichung']` 是硬編碼（[sysC.ts:18](apps/nx-ui/src/features/sale/ui/fulfillment/sysC.ts#L18)），不依倉別距離/庫存量動態排序
- ⚠️ 單據編號格式 `SO-2604-00054`（[numbering.ts:19](apps/nx-ui/src/features/sale/ui/fulfillment/numbering.ts#L19) `formatDocNumber`），**缺中間的「倉庫/機構碼」**。CLAUDE.md 規定格式為 `[2碼類型]-[年月]-[倉庫/機構碼]-[5碼流水]`，即 `SO-202604-Z01-00054`（且年月是 4 碼 `YYYYMM`）。code 用 `YYMM`、無倉庫碼。
- 若 `!customer || quoteItems.length === 0` → useEffect early return，`orderNumber` 永遠保持 null，OrderCompleteHeader 顯示「—」。

---

## 節點 9：SOP STEP 9 — 完成總結

**路徑**：`/dashboard/sale/sop-demo`（step=9）
**元件檔**：[apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step9Summary.tsx](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step9Summary.tsx)

### 畫面元素
- **DealSummary 卡**（Trophy icon + 「成交！」）：客戶、項目（N 款共 M 個）、金額、毛利、耗時「約 5 分鐘（從掏手機）」
- **MonthlyPerformance 卡**：業績進度條（新累計 = `485,230 + 本次` vs 目標 600,000）、本月毛利率 28.3%、成交數、團隊排名 #3 / 8
- **NewcomerReminder 金卡**：給新業務的 4 個「不用」+ pitch 結語
- 底部固定操作列（不走 StepWrapper）：
  - 「再來一次」（淺邊框）→ `onReset()` → `RESET` + setCurrentStep(1)
  - 「回銷貨中心」（金色 CTA）→ `router.push('/dashboard/sale')`

### 可執行操作
- 僅 2 個按鈕（上述）
- **handleNext** 在 currentStep===9 的行為：`RESET` + `setCurrentStep(1)`（但底部沒有走 StepWrapper，所以這條 path 在 STEP 9 不會被觸發）

### 備註
- 無客戶 / 無 items 時 fallback「缺少訂單資料，請從頭開始流程」
- 🚧 `MonthlyPerformance` 的 mock 數字（`MOCK_SALES_PERSON_MONTHLY`）全部硬寫在 scenario.ts

---

## 節點 10：RFQ 詢價單列表

**路徑**：`/dashboard/sale/inquiry`（入口：銷售中心 → 工作站 → 同行調貨）
**元件檔**：[apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryListPage.tsx](apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryListPage.tsx)

### 畫面元素
- 標題「銷售中心 · 同行調貨」+ subtitle
- 狀態篩選 chips：全部 / 待回覆 / 已回覆 / 已採用
- 總筆數「共 N 筆」
- RFQ 列表（依 `createdAt` DESC，store 內維持）：每筆顯示 `InquiryListItem`（單號 + 客戶 + 料號 + 數量 + 狀態 badge）
- 空狀態「目前沒有符合篩選條件的詢價單」

### 可執行操作
- **切換 chip**：本地 `filter` state
- **點項目卡**：`router.push('/dashboard/sale/inquiry/' + rfq.id)`

### 備註
- store 初始 3 筆 mock（`INITIAL_MOCK_RFQS`）+ SOP STEP 2 新建的

---

## 節點 11：RFQ 詢價單詳情 + 採用生成 QT

**路徑**：`/dashboard/sale/inquiry/[rfqId]`
**元件檔**：[apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryDetailPage.tsx](apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryDetailPage.tsx)

### 畫面元素
- 返回「← 返回 同行調貨」
- RFQ 資訊卡：單號、建立於 N 天前、來源客戶（代碼/名稱/等級）、料號、數量；若已 `adopted`/`abandoned` 顯示結案註記
- 同行報價列表：每筆 `VendorQuoteItem`（vendorCode、vendorName、price、備註）+ 2 按鈕「採用」「移除」
- 空狀態「尚未有同行回覆，打電話給同行詢價後點下方『新增同行報價』記錄」
- 「+ 新增同行報價」虛線按鈕（非結案狀態才顯示）
- 「全部不採用，結案」按鈕（非結案狀態才顯示）

### 可執行操作
- **點「+ 新增同行報價」** → 開 `VendorQuoteInput`
  - 儲存：`useRFQStore.addVendorQuote(rfqId, { vendorCode, vendorName, price, notes })`
  - store：push 新 quote + RFQ 狀態 → `responded`
  - Toast「已記錄 {vendorName} 的報價」
- **點「移除」某個同行報價**
  - `useRFQStore.removeVendorQuote(rfqId, quoteId)`
  - store：filter 掉；若 `remaining.length === 0` → 狀態退回 `waiting`
- **點「採用」** → 開 `AdoptQuoteDialog`（核心業務決策彈窗）
  - 顯示：同行成本、等級目標毛利率、**建議售價 = cost × (1 + margin/100)**、**售價輸入**（可偏離建議）、即時毛利試算（達標綠、略低金）
  - 確認 → 呼叫 `useRFQStore.adoptVendorQuote(rfqId, vendorQuoteId, finalPrice)`
  - store mutation：
    - 建 QT：`qtNumber = QT-YYMM-xxxxx`、`source='inquiry'`、`sourceRFQNumber` + `status='pending_customer'`
    - RFQ 狀態 → `adopted`、記 `adoptedVendorId + relatedQtNumber`
  - Toast + `setTimeout(() => router.push('/dashboard/sale/inquiry'), 400)` 跳回列表
- **點「全部不採用,結案」** → 開 `ConfirmDialog`（destructive）
  - 確認 → `useRFQStore.abandonRFQ(rfqId)`（狀態 → `abandoned`）
  - Toast + `setTimeout(400ms)` 跳回列表

### 備註
- ⚠️ `TIER_TARGET_MARGIN` 在 AdoptQuoteDialog 使用的是 [inquiry/types.ts:27](apps/nx-ui/src/features/sale/ui/inquiry/types.ts#L27) 版本（A:22 / B:27 / C:32 / D:38），與 Step3/Step9 用的 `sop-workspace/mock-data/scenario.ts` 版本數值不一致（見 ⚠️ 清單）
- AdoptQuoteDialog 的「毛利率」算法是 `(finalPrice - vendor.price) / finalPrice`，用 **售價** 當分母（非成本）

---

## 節點 12：QT 報價單詳情（純顯示，無 mutation）

**路徑**：`/dashboard/sale/docs/quote/[qtId]`
**元件檔**：[apps/nx-ui/src/features/sale/ui/inquiry/MobileQTDetailPage.tsx](apps/nx-ui/src/features/sale/ui/inquiry/MobileQTDetailPage.tsx)

### 畫面元素
- 返回「← 返回狀態追蹤」（router 指向 `/dashboard/sale?section=status`）
- QT 基本資訊卡：單號、狀態 badge「等待客戶確認」、建立於 N 天前
- 客戶、料號、數量
- 成本/售價區：同行成本單價、建議售價、給客戶的售價
- 合計區：總成本、總售額、預估毛利（含毛利率 + ✓達標/⚠略低）
- 來源 RFQ（若 source='inquiry'）
- **「後續流程(未來實作)」Info 卡**：「1. 客戶確認報價 → 建立調貨單 TI / 2. 向同行調貨 → 貨進公司倉 / 3. 建立銷貨單 SO → 正常出貨」「此部分預計於春酒後 R9 實作」

### 可執行操作
- **純顯示頁**。無任何 mutation 按鈕。

### 備註
- 🚧 **QT → TI → SO 這條路徑完全未 wire**。檔頭註解明確寫「刻意不實作『客戶確認 → 轉 SO』的 mutation,這會動到庫存,違反 Phase 7 邊界」。
- ⚠️ 這代表 spec 涵蓋範圍中「QT 客戶接受 → SO 生成」的環節，code 目前沒有 path。從 RFQ 採用產生的 QT 永遠停在 `pending_customer` 狀態。

---

## 節點 13：IT 調撥清單（庫存中心）

**路徑**：`/dashboard/inventory/transfer`
**元件檔**：[apps/nx-ui/src/features/inventory/workstation/transfer/MobileTransferListPage.tsx](apps/nx-ui/src/features/inventory/workstation/transfer/MobileTransferListPage.tsx)

### 畫面元素
- 標題「庫存中心 · 調撥清單」+ subtitle「他倉 → 本倉調撥任務,完成後自動建立撿貨單」
- 狀態 chips：全部 / 待處理 / 調撥中 / 已完成
- 總筆數 + 「尚待處理 N 筆」
- IT 列表（依 `createdAt` DESC），每筆 `ITCard`：單號、狀態 badge、來源倉 → 本倉、共 N 個、逐項明細、關聯 SO 單號、動作按鈕

### 可執行操作
- **pending → 點「執行調撥」**
  - 觸發 action：`useSalesStore.executeTransfer(itId)`
  - store：IT status → `in_transit` + `startedAt = now`
- **in_transit → 點「完成入庫」**
  - 觸發 action：`useSalesStore.completeTransfer(itId)`
  - store：
    1. IT status → `completed` + `completedAt = now`
    2. 找到 IT 關聯的 SO，呼叫 `planSoAdvance(so, updatedIts, allTis)`
    3. 若 SO 所有 IT 都 completed 且所有 TI 都 completed → **自動建 PK**（pkNumber 用 SO 的 seq）+ SO status → `ready_to_pick` + SO.relatedPkNumber 填入
    4. 部分 completed → SO 過渡狀態（`waiting_supplier` / `waiting_all`）
- **completed**：顯示「完成於 N 分鐘前」（無按鈕）

---

## 節點 14：TI 調貨取貨清單（庫存中心）

**路徑**：`/dashboard/inventory/ti`
**元件檔**：[apps/nx-ui/src/features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx](apps/nx-ui/src/features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx)

### 畫面元素
- 標題「庫存中心 · 調貨取貨清單」+ subtitle
- 狀態 chips：全部 / 等待取貨 / 已取回 / 已完成
- TI 列表（依 `createdAt` DESC）
- 每筆：單號、向哪家同行、共 N 個、逐項明細、關聯 SO、動作按鈕

### 可執行操作
- **pending_pickup → 點「出發取貨」**
  - `useSalesStore.pickupInquiry(tiId)` → TI status → `picked_up` + `pickedUpAt = now`
- **picked_up → 點「完成入庫」**
  - `useSalesStore.completeInquiry(tiId)`
  - store：TI status → `completed` + `completedAt = now`
  - 同 IT 流程 → 呼叫 `planSoAdvance` → 達標則建 PK

### 備註
- 檔頭註解提到春酒 demo 可能由「配送調度」頁順路指派外務取貨（**🚧 配送調度與 TI 的合流演示未實作，Phase 11 才做**）

---

## 節點 15：PK 撿貨清單

**路徑**：`/dashboard/inventory/picking`
**元件檔**：[apps/nx-ui/src/features/inventory/workstation/picking/MobilePickingListPage.tsx](apps/nx-ui/src/features/inventory/workstation/picking/MobilePickingListPage.tsx)

### 畫面元素
- 狀態 chips：全部 / 待撿貨 / 撿貨中 / 已完成
- PK Card：單號、關聯 SO、客戶（代碼+名稱）、前 3 項明細（超過顯示「…另 N 項」）、「N 項 / M 件」摘要、動作按鈕

### 可執行操作
- **pending / picking → 點「完成撿貨」**
  - `useSalesStore.completePicking(pkId)`
  - store mutation：
    1. PK status → `completed` + `completedAt = now`
    2. **自動建 BX**（`bxNumber = BX-YYMM-xxxxx`，用 SO 的 seq）
    3. SO status → `packed` + `relatedBxNumber`
- **completed**：無按鈕

### 備註
- 🚧 檔頭提到「逐項掃條碼 + 庫位指引留給後續版本擴充」

---

## 節點 16：BX 包貨清單

**路徑**：`/dashboard/inventory/packing`
**元件檔**：[apps/nx-ui/src/features/inventory/workstation/packing/MobilePackingListPage.tsx](apps/nx-ui/src/features/inventory/workstation/packing/MobilePackingListPage.tsx)

### 畫面元素
- 狀態 chips：全部 / 待包貨 / 已完成（無「packing」chip，雖然 BXStatus 有）
- BX Card：單號、客戶、撿貨單關聯 + SO 關聯、動作按鈕

### 可執行操作
- **pending → 點「完成包貨」**
  - `useSalesStore.completePacking(bxId)`
  - store mutation：
    1. BX status → `completed` + `completedAt = now`
    2. **自動建 DN**（`dnNumber = DN-YYMM-xxxxx`，用 SO 的 seq，**初始 status = `delivering`**）
    3. SO status → `delivering` + `relatedDnNumber`

### 備註
- ⚠️ DN 建立時 status 直接是 `delivering`，跳過 `pending`（`DNStatus` 型別有 `pending` 但 completePacking 不用它）

---

## 節點 17：DN 送貨清單

**路徑**：`/dashboard/inventory/delivery`
**元件檔**：[apps/nx-ui/src/features/inventory/workstation/delivery/MobileDeliveryListPage.tsx](apps/nx-ui/src/features/inventory/workstation/delivery/MobileDeliveryListPage.tsx)

### 畫面元素
- 狀態 chips：全部 / 配送中 / 已簽收
- DN Card：單號、客戶、地址「配送中(地址略)」、包貨單關聯、動作按鈕

### 可執行操作
- **delivering → 點「客戶已簽收」**
  - `useSalesStore.completeDelivery(dnId)`
  - store mutation：
    1. DN status → `signed` + `deliveredAt = now`
    2. SO status → `completed`

### 備註
- 🚧 檔頭提到「順路取調貨指引 + 組長拖拉排序等擴充留給後續版本」

---

## 跨節點 state 流轉總覽

| 階段 | 觸發 action | SO 狀態 | 關聯單據 | IT / TI / PK / BX / DN 狀態 |
|---|---|---|---|---|
| Step 8 進入（情境 A） | `createSO` | `ready_to_pick` | PK 立即建 | PK=`pending` |
| Step 8 進入（情境 B） | `createSO` | `waiting_transfer` | IT 建 × N 倉 | IT=`pending` |
| Step 8 進入（情境 C） | `createSO` | `waiting_supplier` | TI 建 | TI=`pending_pickup` |
| Step 8 進入（情境 D） | `createSO` | `waiting_all` | IT + TI 並行 | — |
| IT 執行 | `executeTransfer` | （不變） | — | IT=`in_transit` |
| IT 完成（B，唯一 IT） | `completeTransfer` | `ready_to_pick` | **自動建 PK** | IT=`completed`, PK=`pending` |
| IT 完成（D，還有 TI 未完成） | `completeTransfer` | `waiting_supplier` | — | IT=`completed` |
| TI 取貨 | `pickupInquiry` | （不變） | — | TI=`picked_up` |
| TI 完成（C，唯一 TI） | `completeInquiry` | `ready_to_pick` | **自動建 PK** | TI=`completed`, PK=`pending` |
| TI 完成（D，還有 IT 未完成） | `completeInquiry` | `waiting_transfer` | — | TI=`completed` |
| PK 完成 | `completePicking` | `packed` | **自動建 BX** | PK=`completed`, BX=`pending`, SO.relatedBxNumber |
| BX 完成 | `completePacking` | `delivering` | **自動建 DN** | BX=`completed`, DN=`delivering`, SO.relatedDnNumber |
| DN 簽收 | `completeDelivery` | `completed` | — | DN=`signed` |

備註：
- `planSoAdvance` 會在 IT 或 TI status 變動後被呼叫；只有在「情境非 A」且「SO.relatedPkNumber 尚未填入」時才作用
- SO/PK/BX/DN 共享同一 `seq`（來自 SO 建立時的 `sharedSeq + 1`），IT / TI 各自獨立 seq

---

## 發現的不一致（⚠️）

1. **⚠️ 單據編號格式缺倉庫碼**
   - 程式碼行為：`SO-2604-00054`（格式 `PREFIX-YYMM-5flow`）
   - 設計意圖（CLAUDE.md 第 5 節）：`SO-202604-Z01-00054`（格式 `[2碼類型]-[年月]-[倉庫/機構碼]-[5碼流水]`，年月為 4 碼 `YYYYMM`）
   - 檔案位置：[apps/nx-ui/src/features/sale/ui/fulfillment/numbering.ts](apps/nx-ui/src/features/sale/ui/fulfillment/numbering.ts)（`formatDocNumber`、`getCurrentYYMM`）
   - 波及範圍：SO / PK / BX / DN / IT / TI / RFQ / QT / CO 全部

2. **⚠️ `TIER_TARGET_MARGIN` 兩份定義數值相反**
   - 程式碼行為：
     - `sop-workspace/mock-data/scenario.ts`: **A:35 / B:27 / C:22 / D:18**（A 級最高、D 級最低）
     - `inquiry/types.ts`: **A:22 / B:27 / C:32 / D:38**（A 級最低、D 級最高）
   - 使用場景：Step3QuoteList、Step9Summary 用 scenario.ts 版本；AdoptQuoteDialog、MobileQTDetailPage 用 types.ts 版本
   - 檔案位置：[apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/scenario.ts:11](apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/scenario.ts#L11) vs [apps/nx-ui/src/features/sale/ui/inquiry/types.ts:27](apps/nx-ui/src/features/sale/ui/inquiry/types.ts#L27)
   - 結果：同一個客戶在 SOP 報價的目標毛利率，跟在 RFQ 採用畫面看到的目標毛利率不同

3. **⚠️ STEP 7 OrderPreview 註解與實際行為不符**
   - 程式碼行為：`state.orderNumber` 到 Step 8 useEffect 才被設定；Step 7 的 `OrderPreview` 永遠顯示「生成中…」
   - 設計意圖（`sop-workspace/types.ts:111` 的註解）：「訂單編號；進 STEP 7 時由 reducer 自動生成」
   - 檔案位置：[apps/nx-ui/src/features/sale/ui/sop-workspace/types.ts:111](apps/nx-ui/src/features/sale/ui/sop-workspace/types.ts#L111)

4. **⚠️ SOP Step 8 硬寫 `source: 'stock'`，SYS-C 情境 C/D 從 SOP 入口永遠不可達**
   - 程式碼行為：[Step8OrderComplete.tsx:293-303](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx#L293-L303) 把所有 `quoteItems` 映射為 `source: 'stock'`；SYS-C 的 `if (item.source === 'inquiry')` 分支在 SOP 流中不可達
   - 設計意圖：SYS-C 的情境 C（同行調貨）與 D（調撥+調貨並行）應該要能從 SOP 流觸發
   - 實際觸發來源：只有 mock 初始資料 (`mock-data.ts`) 手動建的 SO

5. **⚠️ QT → TI → SO 路徑完全未 wire**
   - 程式碼行為：[MobileQTDetailPage.tsx:8](apps/nx-ui/src/features/sale/ui/inquiry/MobileQTDetailPage.tsx#L8) 檔頭明確寫「刻意不實作『客戶確認 → 轉 SO』的 mutation」；QT 永遠停在 `pending_customer`；`useRFQStore` 沒有 `acceptQt / createSoFromQt` 等 action
   - 設計意圖（SOP STEP 2 OOS 分流 + spec 涵蓋範圍）：缺貨 → RFQ → 採用同行 → QT → 客戶接受 → SO 成立 → TI 調貨 → 入庫 → PK
   - 範圍影響：情境 C/D SO 無法從真實業務流程產生（見上一項）；RFQ 功能有「採用同行」卻沒辦法把產出的 QT 變成銷售

6. **⚠️ SYS-C 多倉掃描順序硬編碼**
   - 程式碼行為：[sysC.ts:18](apps/nx-ui/src/features/sale/ui/fulfillment/sysC.ts#L18) `OTHER_WAREHOUSES = ['hsinchu', 'taichung']`
   - 設計意圖（sysC.ts 檔頭自己的註解）：「就近原則,未來可依倉別距離排序」
   - 目前無論 SOP 從哪個倉（本倉）出貨，永遠先掃新竹倉再掃台中倉

7. **⚠️ BX 完成 → DN 建立時跳過 `pending` 狀態**
   - 程式碼行為：[store.ts:460](apps/nx-ui/src/features/sale/ui/fulfillment/store.ts#L460) `completePacking` 建 DN 時 `status: 'delivering'`
   - 設計意圖（`DNStatus` 型別）：`'pending' | 'delivering' | 'signed' | 'cancelled'`，`pending` 是合法狀態
   - 可能的影響：配送清單的 `pending` chip 永遠是空的

8. **⚠️ Step 8「系統自動處理」清單中 mock 字串**
   - 程式碼行為：[Step8OrderComplete.tsx:170-191](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx#L170-L191)
     - 「本月毛利率更新:28.3%」硬寫
     - 外務姓名「王大偉」硬寫
   - 設計意圖：至少 demo 階段展示真實計算；目前是語意誤導
   - 影響：STEP 9 的 `MonthlyPerformance` 也是同一組 mock（`MOCK_SALES_PERSON_MONTHLY`）

9. **⚠️ 銷售中心狀態追蹤的 TodoGroup 不可點**
   - 程式碼行為：[StatusSection.tsx:187-201](apps/nx-ui/src/features/sale/ui/hub/sections/StatusSection.tsx#L187-L201) 三個 `TodoGroup` 均未傳 `onItemClick`
   - 設計意圖（[TodoGroup.tsx:27-33](apps/nx-ui/src/features/sale/ui/hub/components/TodoGroup.tsx#L27-L33) 註解）：「點擊單筆項目回呼（通常跳到對應單據詳情頁）」
   - 結果：SO/IT/TI 待辦點了沒反應，只有 Step 2 的歷史記錄提醒「查看詳情」有跳頁行為

10. **⚠️ 「單據管理」7 個入口全部 `enabled: false`（placeholder）**
    - 程式碼行為：[DocumentsSection.tsx:44-106](apps/nx-ui/src/features/sale/ui/hub/sections/DocumentsSection.tsx#L44-L106) 所有 7 項設 `enabled: false`；對應 7 個 page.tsx 都是 `PlaceholderPage`
    - 設計意圖：涵蓋範圍的「客戶訂單 CO」入口（`/dashboard/sale/docs/orders`）本來應該消費 Step 2 選項 B 建出來的 CO，但實際是佔位頁
    - 結果：CO 建完後沒任何 UI 可看

11. **⚠️ 銷售中心「國內銷售」與「同行調貨」存在名稱/語意邊界模糊**
    - 程式碼行為：[WorkstationSection.tsx:32-41](apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx#L32-L41)「國內銷售」路由為 `/dashboard/sale/sop-demo`（sop-demo 字樣保留在路徑）
    - 設計意圖：spec 涵蓋的是 S-W01 國內銷售工作流程，正規路徑理論上應該不帶 `sop-demo`

---

## 發現的半成品 / 死碼（🚧）

1. **🚧 Step 2「掃描條碼 / 語音輸入」純視覺 mock**
   - 位置：[Step2SearchParts.tsx:543-558](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step2SearchParts.tsx#L543-L558)
   - 現狀：`onClick={() => {}}` 空處理

2. **🚧 Step 5「全部不要」拒絕原因只 console.info，不存進任何 store**
   - 位置：[Step5CustomerDecide.tsx:217-223](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx#L217-L223)
   - 現狀：Phase 3 註解自己標「未來 R10 會有流失分析 store」

3. **🚧 Step 5「考慮看看」trackingDays 參數接收但未使用**
   - 位置：[Step5CustomerDecide.tsx:197](apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx#L197) `handleConsiderConfirm(_trackingDays: number)`
   - 現狀：下劃線前綴明示未用；QT 建立後沒有追蹤天數機制

4. **🚧 CustomerOrder（CO）建立後無消費路徑**
   - 位置：[inquiry/store.ts:132-146](apps/nx-ui/src/features/sale/ui/inquiry/store.ts#L132-L146) 建 CO；`/dashboard/sale/docs/orders/page.tsx` 為 PlaceholderPage
   - 現狀：CO 只在 state 中累積，無列表、無狀態推進、無「下次進貨時提醒」的實作

5. **🚧 SOP 流程中「調貨詢價 → 報價 → 銷貨」整條鏈未 wire**
   - 位置：見上述 ⚠️ #5（QT → SO 路徑未實作）
   - 現狀：[MobileQTDetailPage.tsx](apps/nx-ui/src/features/sale/ui/inquiry/MobileQTDetailPage.tsx) 只顯示「後續流程（未來實作）」說明文字

6. **🚧 庫存中心「逐項掃條碼 + 庫位指引」（PK）**
   - 位置：[MobilePickingListPage.tsx:14](apps/nx-ui/src/features/inventory/workstation/picking/MobilePickingListPage.tsx#L14)
   - 現狀：PKCard 的「完成撿貨」按鈕一鍵把整張 PK 標完成，沒有逐項勾選

7. **🚧 配送調度與 TI 順路取貨的合流演示**
   - 位置：[MobileInquiryPickupListPage.tsx:14-18](apps/nx-ui/src/features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx#L14-L18)、[MobileDeliveryListPage.tsx:9](apps/nx-ui/src/features/inventory/workstation/delivery/MobileDeliveryListPage.tsx#L9)
   - 現狀：檔頭註解說 Phase 11 才做拖拉排序 + TI 混入 DN 佇列

8. **🚧 銷售中心「國外銷售 / 銷退作業 / 保固申請」disabled**
   - 位置：[WorkstationSection.tsx:52-78](apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx#L52-L78)
   - 現狀：卡片 disabled + 「即將推出」badge

9. **🚧 舊 document-demo 的 `/dashboard/sale/so` + `/dashboard/sale/qt` 與新 sale feature 無連動**
   - 位置：[apps/nx-ui/src/app/dashboard/sale/so/page.tsx](apps/nx-ui/src/app/dashboard/sale/so/page.tsx) + [apps/nx-ui/src/app/dashboard/sale/qt/page.tsx](apps/nx-ui/src/app/dashboard/sale/qt/page.tsx) 使用 `@/features/document-demo/SoDocPage` 與 `QtDocPage`
   - 現狀：這兩個路由連舊 document-demo 元件，與 `useSalesStore` / `useRFQStore` 完全無關；是 demo 遺留路由

10. **🚧 銷售中心「狀態追蹤」4 種 chip 未接 `/dashboard/sale?section=status` query**
    - 位置：MobileQTDetailPage 返回按鈕 `router.push('/dashboard/sale?section=status')`
    - 現狀：sale hub 如何讀 `section` query 未包含在本次涵蓋範圍，但從 QT 詳情返回時會帶這個 query；反推時未找到對應的 `useSearchParams` 處理邏輯 — 可能依賴 sale hub 的 SectionTabs（屬 R7 Phase 2 區塊）

---

## 讀不懂 / 行為不確定（❓）

1. **❓ `abandonRFQ` 只修 status 不動 vendorQuotes；`status` 改回 `waiting` 的情境**
   - 位置：[inquiry/store.ts:167-179](apps/nx-ui/src/features/sale/ui/inquiry/store.ts#L167-L179) `removeVendorQuote`
   - 不確定：移除最後一個同行報價會把 `status` 從 `responded` 退回 `waiting`，但若 `status === 'adopted'` 時呼叫 `removeVendorQuote` 會發生什麼（`adopted` 的 `adoptedVendorId` 是否會變孤兒？）。UI 層面 `isFinalized` 會擋住按鈕，但 store 本身無防呆。

2. **❓ `INITIAL_MOCK_RFQS` 的內容是否會被測試/demo 資料污染 store**
   - 位置：[inquiry/store.ts:111](apps/nx-ui/src/features/sale/ui/inquiry/store.ts#L111) `rfqs: INITIAL_MOCK_RFQS`
   - 不確定：`INITIAL_MOCK_RFQS` 檔本次未讀；無法確認初始筆數、是否帶 `sourceCustomer` 與真實客戶一致。

3. **❓ `planSoAdvance` 對「情境 A 的 SO 再補 IT」的行為**
   - 位置：[store.ts:148](apps/nx-ui/src/features/sale/ui/fulfillment/store.ts#L148) `if (so.scenario === 'A') return null;`
   - 不確定：若外部手動 patch SO 到 `scenario='A'` 但又附了 IT，這條路不會推進 SO。SOP 流程不會觸發這情況，但型別上沒有阻擋。

---
