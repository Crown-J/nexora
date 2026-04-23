# [TASK-BUSINESS-RESTRUCTURE-01] 業務流程完整重構

> 發件人：Alex（PM AI）
> 收件人：Hank（Cursor AI）
> 版本：v1
> 日期：2026-04-23 下午
> 緊急程度：🔥 HIGH（Crown 親自設計的真實業界流程）
> 分支：`feature/demo-emergency`
> 專案路徑：`nexora/docs/spec/TASK-BUSINESS-RESTRUCTURE-01.md`
> 前置：R7 Phase 7 完成（commit bf8ef8e）

---

## 📋 Spec 版本歷史

| 版本 | 日期 | 變更重點 |
|------|------|----------|
| v1 | 2026-04-23 下午 | 原始 spec |
| v1.1 | 2026-04-23 | 大塊 1 完成(Phase 1~4)回填 commit hash 7847be8 |
| v1.2 | 2026-04-23 | 大塊 2 Phase 5 完成:fulfillment 模組 + SYS-C 分流 + SalesStore 骨架 |
| v1.3 | 2026-04-23 | 大塊 2 Phase 6 完成:IT executeTransfer / completeTransfer + 手機版調撥清單 |
| v1.4 | 2026-04-23 | 大塊 2 Phase 7 完成:TI 取貨 + PK/BX/DN 連動 + StatusSection 接 store + 庫存中心 hub stub(5 清單) |
| v1.5 | 2026-04-23 | 大塊 3 Phase 8 完成:庫存中心 4 分區架構 InventoryHubMobile + 4 sections |
| v1.6 | 2026-04-23 | 大塊 3 Phase 9 完成:inventory-mobile 遷到 /dashboard/inventory/* + 進貨/盤點 placeholder |

---

## 📊 Phase 進度追蹤

| Phase | 狀態 | Commit | 內容 |
|-------|------|--------|------|
| Phase 1 | ✅ 完成 | 7847be8 (大塊 1) | STEP 5 上一步迴圈 bug 修復(handleBack 從 STEP 6 回時 RESET_CUSTOMER_DECISION)|
| Phase 2 | ✅ 完成 | 7847be8 (大塊 1) | 歷史報價機制 useHistoryRecord hook + HistoryQuoteAlert + MarginAlert(毛利警覺性)|
| Phase 3 | ✅ 完成 | 7847be8 (大塊 1) | STEP 5 重構 5 選項 + 4 sub-flow dialogs + AddMoreDialog 追加品項 |
| Phase 4 | ✅ 完成 | 7847be8 (大塊 1) | StatusSection 待辦改為 銷售進行中 / 調貨進行中 / 保固(詢/報已移除)|
| Phase 5 | ✅ 完成 | 1f55579 (大塊 2) | SO 備貨 4 情境分流 SYS-C + SalesStore 骨架 + Step8 建立真實 SO |
| Phase 6 | ✅ 完成 | 77b99aa (大塊 2) | 調撥單 IT executeTransfer / completeTransfer + 手機版調撥清單 |
| Phase 7 | ✅ 完成 | 4ef0cb2 (大塊 2) | 跨中心連動 SO→PK→BX→DN + TI 取貨 + StatusSection 接 SalesStore + 庫存中心 hub stub |
| Phase 8 | ✅ 完成 | a6cb00c (大塊 3) | 庫存中心 4 分區重構:InventoryHubMobile + StatusSection/WorkstationSection/DocumentsSection/WarehouseSection |
| Phase 9 | ✅ 完成 | TBD (大塊 3) | 庫存中心工作站:大塊 2 的 /dashboard/inventory-mobile/* 遷到 /dashboard/inventory/* + 進貨/盤點 placeholder |
| Phase 10 | ⏳ 待做 | - | 倉管 KPI + 庫位管理 + 盤點設定 |
| Phase 11 | ⏳ 待做 | - | 組長拖拉排序儀表板 |
| Phase 12 | ⏳ 待做 | - | 整合測試 + Mock 資料完善 |

---

## 🎯 本任務一句話摘要

把 NEXORA 從「業務 SOP 跑得通」升級到「真實業界完整流程」：客戶回應 5 種分流、清單追加品項、歷史報價提醒、SO 備貨 4 情境、調撥/調貨完整單據鏈、庫存中心 4 分區重構、組長拖拉排序——讓對方老闆看到 Crown「真的懂這行」的硬功夫。

---

## 💎 戰略背景

### Crown 親自描述的真實業務流程（2026-04-23 下午）

> 「實際想一下狀況，A1001 跟我詢問 X 零件報價，我報了之後，他說 OK，所以我就按下客戶接受並下單，這時他又說那 Y 零件呢？我應該要可以再去查下一個零件，等他全部都講過一遍...」

這段話揭露了真實業務的**碎片化詢問模式**：
- 客戶不會一次列完所有要的料
- 每報完一項，可能臨時想到下一項
- 業務需要「邊報邊累積」直到客戶說「就這些」
- **系統必須支援這種非線性流程**

### Crown 親自描述的庫存哲學（2026-04-23 中午）

> 「我不希望我的系統庫存出現負數。」

延伸到備貨情境：
- SO 不能直接生成（因為可能要先調貨/調撥）
- 必須先確認貨齊（本倉撿/他倉調撥/同行調貨）才能扣庫存
- 全程庫存 >= 0

### Crown 對追蹤清單的設計修正（2026-04-23 下午）

> 「追蹤清單只需要追蹤未完成的銷貨單及調貨單，詢價和報價就不追蹤了，但是詢價跟報價一樣，若是一個月內有相同對象相同品項都要跳出提醒。」

**重要設計變更**：
- 原 R7 Phase 7 把詢價/報價放進待辦清單 → **移除**
- 改成「業務查料時自動跳提醒」→ **更精準的 UX**
- 追蹤清單只放「真正需要採取行動」的單（SO/TI）

理由：
- 一天可能幾十張報價，全追蹤會爆炸
- 真正關鍵的是「正在進行的交易」（SO/TI）
- 報價/詢價的查詢需求 → 業務查料時主動推播 + 單據管理可查

---

## 🏗️ 關鍵設計原則

### 原則 1：單據鏈完整性

```
完整的單據鏈（依物理順序）：

詢價階段（可選）：
  RFQ 調貨詢價單 → QT 報價單

確認階段：
  QT 報價單 → 客戶確認 → SO 銷貨單

備貨階段（依情境分流）：
  情境 A：SO → PK 撿貨單（本倉直接撿）
  情境 B：SO → IT 調撥單 → PK 撿貨單（他倉調撥到本倉）
  情境 C：SO → TI 調貨單 → PK 撿貨單（同行調貨進本倉）
  情境 D：SO → IT + TI 並行 → PK 撿貨單

出貨階段：
  PK 撿貨單 → BX 包貨單 → DN 送貨單 → 客戶簽收

帳款階段：
  DN 已送達 → AR 應收帳款（會計端）
```

### 原則 2：「中心 = 角色工作台」延伸

R7 已確立「業務的中心 = 銷售中心」。本次延伸：
- **倉管的中心 = 庫存中心**
- 倉管不接觸客戶（沒有「客戶維護」分區）
- 倉管的第 4 分區 = 庫位管理 + 盤點設定

### 原則 3：跨中心連動的單據流

```
銷售中心建單 → 系統自動連動 → 庫存中心出現任務

例：
  業務在 SOP 完成 SO-2604-00054
  ↓
  SYS-C 判斷情境（A/B/C/D）
  ↓
  自動產生對應單據（PK 或 IT 或 TI）
  ↓
  該單據出現在庫存中心對應清單
  
業務看不到撿貨/包貨/送貨流程（那是倉管的世界）
倉管也看不到報價/詢價（那是業務的世界）
```

---

## 🎨 風格延續

延續 R7 確立的穩重風格：

```
✅ 全部 lucide-react，零 emoji
✅ 金色 #E8A020 = CTA + 當前狀態 + 淡金邊（/60）
✅ 綠色 #1D9E75 = 成功/採用/達標
✅ 紅色 #E24B4A = 缺貨/逾期/警告
✅ 藍色 #4D8FE8 = 提示/資訊（新增，用於歷史報價提醒）
✅ Badge 一律 bg-white/10 text-white/80 text-xs
✅ Card 一律 border-white/10 bg-white/5 rounded-lg
✅ 字型只有 3 級：text-lg / text-sm / text-xs
✅ 無 font-bold，無 text-xl+
✅ 數字使用 tabular-nums
✅ 料號用 font-mono
```

---

# 📦 PART 1：Phase 1 - Bug 修復（STEP 5 上一步迴圈）

## 1.1 問題描述

R6 SOP STEP 5「客戶回應」設計問題：

```
情境：
  業務點「接受並下單」
  → 300ms setTimeout 觸發 onNext → 進 STEP 6
  → 業務想看回 STEP 5 → 點上一步
  → 回到 STEP 5
  → customerDecision state 仍是 'accept'
  → 又觸發 setTimeout
  → 再次進 STEP 6（無限迴圈）
```

## 1.2 修復方法

兩個方向，Hank 自選：

### 方向 A：上一步時清除 decision

```tsx
// MobileSaleSopPage.tsx 的 handlePrev
const handlePrev = () => {
  if (currentStep === 6) {
    // 從 STEP 6 回 STEP 5 時，清除上次的客戶決定
    dispatch({ type: 'RESET_CUSTOMER_DECISION' })
  }
  dispatch({ type: 'PREV_STEP' })
}
```

### 方向 B：STEP 5 setTimeout 加 guard

```tsx
// Step5CustomerDecision.tsx
const [hasTriggeredNext, setHasTriggeredNext] = useState(false)

useEffect(() => {
  if (decision === 'accept' && !hasTriggeredNext) {
    setHasTriggeredNext(true)
    setTimeout(() => onNext(), 300)
  }
}, [decision, hasTriggeredNext, onNext])
```

**Alex 推薦 A**，因為更乾淨（state 重置一致）。

## 1.3 注意

修這個 bug 之後，Phase 3 還會大幅重構 STEP 5（5 選項客戶回應），所以 bug 修復可能只用幾分鐘，不要花太多時間優化。

---

# 📦 PART 2：Phase 2 - 歷史報價機制（SYS-A）

## 2.1 業務需求

業務在 S03 查料號時，系統自動檢查「該客戶 + 該料號」在一個月內的歷史記錄：

```
情境 1：有歷史報價（同客戶同料號 1 個月內）
  顯示：「2026-04-15 您給此客戶報過 NT$ 600（毛利 25%）」
  業務可：
    - 一鍵套用舊報價（快速成交）
    - 重新報價（如果情況變了）

情境 2：有未結案 RFQ（正在幫他找貨）
  顯示：「正在向同行詢價中（RFQ-2604-00087，等待 2 天）」
  業務可：
    - 進入該 RFQ 查看
    - 取消（取消詢價）

情境 3：有未結案 QT（已報過考慮中）
  顯示：「已報過 NT$ 620 待客戶確認（QT-2604-00032，3 天前）」
  業務可：
    - 跟客戶確認是否要這個價格
    - 重新報價（修改 QT）

情境 4：無記錄
  正常流程，無提醒
```

## 2.2 「毛利警覺性」的核心設計

Crown 強調：**要顯示建議報價及毛利，讓業務有警覺性**。

### 視覺規格

```
S04 輸入售價時：

┌─────────────────────────────────────┐
│ 數量：[ 2 ]                          │
│                                     │
│ 售價：[NT$ 580 ]                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 系統建議：NT$ 580（毛利 22.4%）  │ │
│ │ B 級客戶目標毛利：27%            │ │
│ │ ✓ 達標                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [加入報價清單]                       │
└─────────────────────────────────────┘

毛利狀態染色：
  ✓ 達標 → 綠色（#1D9E75）
  ⚠ 略低 → 金色（#E8A020）
  ✗ 過低 → 紅色（#E24B4A）

業務改價時即時更新：
  輸入 NT$ 500 → 即時計算 → 顯示「毛利僅 10%、✗ 過低」
  輸入 NT$ 700 → 即時計算 → 顯示「毛利 35.7%、✓ 達標」
```

### 計算邏輯

```ts
const cost = part.cost  // 進貨成本（從料號主檔取）
const targetMargin = TIER_TARGET_MARGIN[customer.tier]  // 客戶等級目標毛利率
const suggestedPrice = Math.round(cost * (1 + targetMargin / 100))

const actualMargin = ((finalPrice - cost) / finalPrice) * 100

const status = 
  actualMargin >= targetMargin ? 'good' :
  actualMargin >= targetMargin - 5 ? 'warning' :
  'danger'
```

## 2.3 元件實作

```tsx
// 新增 components/HistoryQuoteAlert.tsx

interface HistoryRecord {
  type: 'quote' | 'rfq' | 'qt'
  date: Date
  amount?: number  // 售價或同行報價
  margin?: number  // 毛利率
  docNumber: string  // QT/RFQ 號
  status?: string
  daysAgo: number
}

function HistoryQuoteAlert({ history, onApply, onView }: Props) {
  const Icon = 
    history.type === 'rfq' ? Search :
    history.type === 'qt' ? FileText :
    History
  
  const colorClass = 
    history.type === 'rfq' ? 'text-[#E8A020]' :
    history.type === 'qt' ? 'text-[#4D8FE8]' :
    'text-white/60'
  
  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-3 
                    flex items-start gap-2">
      <Icon className={cx('w-4 h-4 mt-0.5 shrink-0', colorClass)} />
      <div className="flex-1 text-xs space-y-1">
        <div className="text-white/80">
          {history.type === 'quote' && (
            <>{history.daysAgo} 天前曾報過 NT$ {history.amount?.toLocaleString()}</>
          )}
          {history.type === 'rfq' && (
            <>正在向同行詢價中（{history.docNumber}，等待 {history.daysAgo} 天）</>
          )}
          {history.type === 'qt' && (
            <>已報過 NT$ {history.amount?.toLocaleString()} 待客戶確認</>
          )}
        </div>
        
        {history.margin !== undefined && (
          <div className="text-white/50">
            毛利 {history.margin}%
          </div>
        )}
        
        <div className="flex gap-2 pt-1">
          {history.type === 'quote' && (
            <button
              onClick={onApply}
              className="text-[#E8A020] hover:underline"
            >
              套用此價格
            </button>
          )}
          <button
            onClick={onView}
            className="text-white/60 hover:underline"
          >
            查看詳情
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 2.4 Mock 資料新增

```ts
// scenario.ts 加入歷史報價 mock

export interface QuoteHistory {
  customerCode: string
  partSku: string
  amount: number
  margin: number
  date: Date
  qtNumber: string  // 對應的 QT 單號
}

export const MOCK_QUOTE_HISTORY: QuoteHistory[] = [
  // B0213 台北保養廠 對 SKU-001 的歷史報價（10 天前）
  {
    customerCode: 'B0213',
    partSku: 'SKU-001',
    amount: 600,
    margin: 25,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    qtNumber: 'QT-2604-00012',
  },
  // A0087 新竹汽材行 對 SKU-021 的歷史報價（5 天前）
  {
    customerCode: 'A0087',
    partSku: 'SKU-021',
    amount: 320,
    margin: 23,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    qtNumber: 'QT-2604-00018',
  },
]

// 查詢函式
export function findHistoryRecord(
  customerCode: string,
  partSku: string
): HistoryRecord | null {
  // 查 RFQ store
  const activeRFQ = rfqStore.rfqs.find(
    r => r.sourceCustomer.code === customerCode && 
         r.part.sku === partSku &&
         (r.status === 'waiting' || r.status === 'responded')
  )
  if (activeRFQ) {
    return {
      type: 'rfq',
      docNumber: activeRFQ.rfqNumber,
      daysAgo: daysBetween(activeRFQ.createdAt, new Date()),
    }
  }
  
  // 查 QT store
  const activeQT = rfqStore.qts.find(
    q => q.customer.code === customerCode &&
         q.part.sku === partSku &&
         q.status === 'pending_customer'
  )
  if (activeQT) {
    return {
      type: 'qt',
      docNumber: activeQT.qtNumber,
      amount: activeQT.finalPrice,
      daysAgo: daysBetween(activeQT.createdAt, new Date()),
    }
  }
  
  // 查歷史報價
  const history = MOCK_QUOTE_HISTORY.find(
    h => h.customerCode === customerCode && 
         h.partSku === partSku &&
         daysBetween(h.date, new Date()) <= 30
  )
  if (history) {
    return {
      type: 'quote',
      docNumber: history.qtNumber,
      amount: history.amount,
      margin: history.margin,
      daysAgo: daysBetween(history.date, new Date()),
    }
  }
  
  return null
}
```

---

# 📦 PART 3：Phase 3 - SOP STEP 5 重構（5 選項客戶回應）

## 3.1 現況問題

R6 STEP 5 只有 3 選項：
- 接受並下單
- 要求調整
- 不下單

問題：
- 沒有「部分接受」（實際上很常發生）
- 沒有「考慮看看」（業務界常見的延遲決策）
- 「不下單」沒記錄拒絕原因（流失分析無資料）

## 3.2 新設計：5 選項

```
┌─────────────────────────────────────┐
│ 已向客戶報價                         │
│ SKU-001 剎車片 VW Golf MK7 × 1      │
│ 總金額：NT$ 578                      │
│ 報價方式：口頭報價                   │
├─────────────────────────────────────┤
│ 客戶回應                             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✓ 接受所有品項                   │ │
│ │ 「好，就這樣」                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✓✗ 部分接受                     │ │
│ │ 「我只要前面 2 項」              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✎ 要求調整價格                   │ │
│ │ 「可以便宜一點嗎？」             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⏰ 考慮看看                       │ │
│ │ 「我再想想」                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✗ 全部不要                      │ │
│ │ 「先不要了」                     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 3.3 各選項的後續流程

### 選項 A：接受所有品項

```tsx
const handleAcceptAll = () => {
  // 不再用 setTimeout 自動下一步！
  // 改成業務手動點底部「下一步」
  dispatch({ type: 'SET_CUSTOMER_DECISION', payload: 'accept_all' })
  // 底部按鈕變成「下一步：選擇出貨方式」
}
```

### 選項 B：部分接受

```tsx
const handlePartialAccept = () => {
  dispatch({ type: 'SET_CUSTOMER_DECISION', payload: 'partial_accept' })
  // 跳到 S06' 編輯清單頁
  // 業務勾選「客戶要這個」「不要這個」
  // 完成後回 STEP 5 確認剩下的、再點接受
}
```

部分接受的編輯清單畫面：

```
┌─────────────────────────────────────┐
│ 請勾選客戶要的品項                   │
├─────────────────────────────────────┤
│ ☑ SKU-001 剎車片 VW Golf × 1         │
│   NT$ 578                           │
├─────────────────────────────────────┤
│ ☑ SKU-021 機油濾心 Audi A4 × 2       │
│   NT$ 520                           │
├─────────────────────────────────────┤
│ ☐ SKU-031 空氣濾心 Skoda × 1         │
│   NT$ 320（客戶不要）                │
├─────────────────────────────────────┤
│ 小計：NT$ 1,098（2 項）              │
│                                     │
│ [取消] [確認，繼續下單]              │
└─────────────────────────────────────┘
```

### 選項 C：要求調整價格

```tsx
const handlePriceAdjust = () => {
  dispatch({ type: 'SET_CUSTOMER_DECISION', payload: 'price_adjust' })
  // 跳回 STEP 6'（修改清單單價頁）
  // 業務跟客戶協商後改單價
  // 改完點「重新報價」回 STEP 4 → STEP 5
}
```

修改單價頁：

```
┌─────────────────────────────────────┐
│ 客戶要求調整價格                     │
│ 請逐項調整單價                       │
├─────────────────────────────────────┤
│ SKU-001 剎車片 VW Golf               │
│ 原單價：NT$ 578                      │
│ 新單價：[NT$ 550]                    │
│ ⚠ 毛利從 22% 降至 18%                │
├─────────────────────────────────────┤
│ SKU-021 機油濾心 Audi A4             │
│ 原單價：NT$ 260                      │
│ 新單價：[NT$ 240]                    │
│ ⚠ 毛利從 23% 降至 17%                │
├─────────────────────────────────────┤
│ 新總金額：NT$ 1,030                  │
│ 整體毛利：18.5%（B 級目標 27%）⚠     │
│                                     │
│ [取消] [重新報價]                    │
└─────────────────────────────────────┘
```

### 選項 D：考慮看看 🆕

```tsx
const handleConsider = () => {
  dispatch({ type: 'SET_CUSTOMER_DECISION', payload: 'consider' })
  // 跳到「記錄為待回覆」頁
}
```

考慮看看的處理：

```
┌─────────────────────────────────────┐
│ 客戶考慮中                           │
├─────────────────────────────────────┤
│ 系統將記錄此次報價，                  │
│ 客戶後續若要購買，                    │
│ 您查詢相同料號時系統會自動提醒。      │
│                                     │
│ 報價有效期：30 天                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 客戶 B0213 台北保養廠            │ │
│ │ 共 3 項報價，總額 NT$ 1,418     │ │
│ │ SKU-001 NT$ 578                 │ │
│ │ SKU-021 NT$ 520                 │ │
│ │ SKU-031 NT$ 320                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 預計追蹤天數：[ 7 ] 天                │
│ （超過天數系統會提醒您追蹤）          │
│                                     │
│ [上一步] [完成記錄]                   │
└─────────────────────────────────────┘
```

完成記錄後：
- 自動產生 QT 報價單（status: 'pending_customer'）
- 不在追蹤清單顯示（依 Crown 新規則）
- 但業務下次查相同料號 → 自動跳提醒

### 選項 E：全部不要

```tsx
const handleReject = () => {
  dispatch({ type: 'SET_CUSTOMER_DECISION', payload: 'reject' })
  // 跳到「填寫拒絕原因」頁
}
```

拒絕原因頁：

```
┌─────────────────────────────────────┐
│ 客戶不下單                           │
│ 請選擇拒絕原因（可多選）              │
├─────────────────────────────────────┤
│ ☐ 價格太貴                           │
│ ☐ 沒有需要的料號                     │
│ ☐ 已向其他廠商購買                   │
│ ☐ 客戶資金問題                       │
│ ☐ 等下次需要再聯絡                   │
│ ☐ 其他                               │
│                                     │
│ 備註：                               │
│ [_____________________]             │
│                                     │
│ [上一步] [送出記錄]                   │
└─────────────────────────────────────┘
```

送出後：
- 記錄到「客戶流失分析」（未來 R10 可做報表）
- SOP 結束

## 3.4 追加品項機制（❓03）

⚠️ **STEP 5 之前**還有個重要修改：查料循環的「結束時機」。

R6 設計：
- 業務查完一個料號 → 加入清單 → 再點「上一步」回 STEP 2 查下一個
- 沒有明確的「結束查料」節點

新設計：
- 業務查完一個料號 → 加入清單 → 系統問「還要查嗎？」
- 業務點「還要」→ 回 STEP 2 查下一個
- 業務點「沒了」→ 進 S06 確認清單 → STEP 5 客戶回應

**實作位置**：在 STEP 4（加入清單後）加一個確認節點：

```tsx
// Step4QuoteList.tsx 改寫
function Step4QuoteList() {
  const [showAddMoreDialog, setShowAddMoreDialog] = useState(false)
  
  const handleAddedToCart = () => {
    // 加入清單後問業務
    setShowAddMoreDialog(true)
  }
  
  return (
    <>
      {/* 清單顯示 */}
      <QuoteList items={quoteItems} />
      
      {/* 底部按鈕 */}
      <button onClick={onNext}>確認清單，向客戶報價</button>
      
      {/* 加完料的詢問 */}
      {showAddMoreDialog && (
        <AddMoreDialog
          onAddMore={() => {
            setShowAddMoreDialog(false)
            // 回 STEP 2 查下一個
            dispatch({ type: 'GO_TO_STEP', payload: 2 })
          }}
          onFinish={() => {
            setShowAddMoreDialog(false)
            // 已經在 STEP 4，業務點「確認清單」進 STEP 5
          }}
        />
      )}
    </>
  )
}

function AddMoreDialog({ onAddMore, onFinish }: Props) {
  return (
    <Dialog>
      <div className="text-base text-white">已加入清單</div>
      <div className="text-xs text-white/60 mt-1">
        客戶還要查其他品項嗎？
      </div>
      
      <div className="space-y-3 mt-4">
        <button
          onClick={onAddMore}
          className="w-full h-11 border border-[#E8A020]/60 text-[#E8A020] rounded-lg
                     flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>還要查其他料號</span>
        </button>
        
        <button
          onClick={onFinish}
          className="w-full h-11 bg-[#E8A020] text-black rounded-lg"
        >
          沒了，向客戶報價
        </button>
      </div>
    </Dialog>
  )
}
```

---

# 📦 PART 4：Phase 4 - Phase 7 待辦清單調整

## 4.1 變更說明

R7 Phase 7 把詢價/報價放進待辦清單，本次依 Crown 新規則調整：

```
原 Phase 7 設計：
  狀態追蹤 → 待辦：
    詢價待回覆（3 筆）
    待確認報價（1 筆）
    銷售待出貨（4 筆）
    保固待結果（1 筆）

新設計：
  狀態追蹤 → 待辦：
    銷售待出貨（4 筆）→ 改成：未完成銷貨單
    調貨進行中（N 筆）→ 新增：未完成調貨單 TI
    保固待結果（1 筆）

詢價/報價移除追蹤清單，但：
  ✓ 仍存在系統內（單據管理可查）
  ✓ 業務 S03 查料時自動跳提醒（PART 2 的歷史報價機制）
```

## 4.2 元件改動

```tsx
// StatusSection.tsx 改寫
function StatusSection() {
  const { activeSOs, activeTIs } = useSalesStore()  // 新 store
  const warrantyTodos = MOCK_WARRANTY_TODOS  // 暫保留 mock
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white">待辦追蹤</span>
        </div>
        <span className="text-xs text-white/50">
          共 {activeSOs.length + activeTIs.length + warrantyTodos.length} 筆
        </span>
      </div>
      
      <TodoGroup 
        title="銷售進行中"
        items={activeSOs.map(soToTodoItem)}
        emptyText="目前沒有進行中的銷貨單"
      />
      
      <TodoGroup 
        title="調貨進行中"
        items={activeTIs.map(tiToTodoItem)}
        emptyText="目前沒有進行中的調貨單"
      />
      
      <TodoGroup 
        title="保固待結果"
        items={warrantyTodos}
        emptyText="目前沒有待處理的保固"
      />
    </div>
  )
}
```

## 4.3 RFQ/QT 列表頁保留

工作站「同行調貨」頁面**保留**（Phase 7 已做完）：
- 業務需要主動進入處理 RFQ
- 但不再從待辦清單跳轉（清單已移除）
- 業務只能從「工作站 → 同行調貨」進入

QT 詳情頁也保留，但：
- 不從待辦清單跳轉
- 業務在 S03 查料時看到「已報過 QT-xxx」提醒 → 點提醒進入

---

# 📦 PART 5：Phase 5 - SO 備貨 4 情境分流

## 5.1 4 情境完整定義

業務在 SOP S08 「成立銷貨單」後，系統判斷該 SO 的備貨情境：

### 情境 A：全部本倉有貨

```
條件：
  SO 中所有品項，本倉庫存 >= 數量
  
流程：
  SO 生成
  → SYS-C 判斷情境 A
  → 自動生成 PK 撿貨單
  → PK 進「庫存中心 → 撿貨清單」
  → 倉管去撿貨
```

### 情境 B：本倉不足，他倉調撥可滿足

```
條件：
  SO 中至少 1 項本倉不足，但他倉合計 >= 缺額
  且不需向同行調貨

流程：
  SO 生成
  → SYS-C 判斷情境 B
  → 自動生成 IT 調撥單（從他倉調到本倉）
  → IT 進「庫存中心 → 調撥清單」
  → 倉管執行調撥（他倉出 → 本倉入）
  → IT 完成 → 自動生成 PK 撿貨單
  → 進撿貨流程

關鍵：
  - SO 狀態：'waiting_transfer'（等調撥完成）
  - 客戶看到的：「處理中」
  - 業務看到的：SO 在「調貨進行中」清單
```

### 情境 C：部分本倉有 + 部分需同行調貨

```
條件：
  SO 是從 RFQ → QT → 客戶確認 → 自動建立的
  含兩種品項：
    - 本倉原本就有的品項
    - 需向同行調貨的品項

流程：
  QT 客戶確認 → 自動生成 SO + TI
  → SYS-C 判斷情境 C
  → SO 狀態：'waiting_supplier'（等同行送貨）
  → TI 進「庫存中心 → 調貨取貨清單」
  → 倉管組長指派外務去同行取
  → 取回入庫 → TI 完成 → 自動生成 PK 撿貨單
  → 進撿貨流程
```

### 情境 D：混合（需調撥 + 需調貨）

```
條件：
  情境 B + 情境 C 混合

流程：
  SO 生成
  → SYS-C 判斷情境 D
  → 同時生成 IT 調撥單 + TI 調貨單
  → SO 狀態：'waiting_all'（等全部備齊）
  → 兩條線並行：
    線 1：IT 流程（他倉 → 本倉）
    線 2：TI 流程（同行 → 本倉）
  → 兩條都完成 → 自動生成 PK 撿貨單
  → 進撿貨流程
```

## 5.2 SYS-C 判斷邏輯

```tsx
// systems/sysC-supply-routing.ts

interface SOSupplyAnalysis {
  scenario: 'A' | 'B' | 'C' | 'D'
  needsTransfer: boolean  // 需調撥（他倉 → 本倉）
  needsInquiry: boolean   // 需調貨（同行）
  transferItems: TransferItem[]  // 調撥明細
  inquiryItems: InquiryItem[]    // 調貨明細
}

export function analyzeSO(so: SO): SOSupplyAnalysis {
  let needsTransfer = false
  let needsInquiry = false
  const transferItems: TransferItem[] = []
  const inquiryItems: InquiryItem[] = []
  
  for (const item of so.items) {
    const part = getPart(item.partSku)
    const mainStock = part.stocks.main
    const otherStock = part.stocks.hsinchu + part.stocks.taichung
    
    if (item.source === 'inquiry') {
      // 從 RFQ 路徑下來的，需要調貨
      needsInquiry = true
      inquiryItems.push({
        partSku: item.partSku,
        quantity: item.quantity,
        adoptedVendorId: item.adoptedVendorId,
      })
    } else if (mainStock >= item.quantity) {
      // 本倉夠
      // 不需特殊處理
    } else if (mainStock + otherStock >= item.quantity) {
      // 本倉不夠，但全公司夠
      needsTransfer = true
      const shortage = item.quantity - mainStock
      transferItems.push({
        partSku: item.partSku,
        quantity: shortage,
        fromWarehouses: pickFromWarehouses(part, shortage),
      })
    } else {
      // 全公司都不夠，這不應該發生（業務應該在 SOP 缺貨分流走 RFQ）
      throw new Error('SO 含全公司無庫存品項')
    }
  }
  
  const scenario = 
    !needsTransfer && !needsInquiry ? 'A' :
    needsTransfer && !needsInquiry ? 'B' :
    !needsTransfer && needsInquiry ? 'C' : 'D'
  
  return {
    scenario,
    needsTransfer,
    needsInquiry,
    transferItems,
    inquiryItems,
  }
}
```

## 5.3 SO 狀態機

```ts
type SOStatus = 
  | 'waiting_transfer'   // 等調撥（情境 B）
  | 'waiting_supplier'   // 等同行送貨（情境 C）
  | 'waiting_all'        // 等全部（情境 D）
  | 'ready_to_pick'      // 可撿貨（情境 A 直接這個狀態）
  | 'picking'            // 撿貨中
  | 'packed'             // 已包貨
  | 'delivering'         // 配送中
  | 'completed'          // 已完成
```

---

# 📦 PART 6：Phase 6 - 調撥單 IT 完整流程

## 6.1 IT 資料結構

```ts
interface InventoryTransfer {
  id: string
  itNumber: string  // IT-YYMM-xxxxx
  fromWarehouse: string  // 來源倉
  toWarehouse: string    // 目標倉（一般是本倉）
  items: ITItem[]
  relatedSO: string      // 關聯的 SO
  status: 'pending' | 'in_transit' | 'completed'
  createdAt: Date
}

interface ITItem {
  partSku: string
  quantity: number
}
```

## 6.2 IT 流程

```
SO 觸發 IT 建立
  ↓
IT 進「庫存中心 → 調撥清單」
  ↓
倉管接單 → 點「執行調撥」
  ↓
他倉出貨：
  - 系統扣他倉庫存（-N）
  - IT 狀態：'in_transit'
  ↓
本倉入庫：
  - 系統加本倉庫存（+N）
  - IT 狀態：'completed'
  ↓
SYS-D 檢查：是否所有 IT 都完成
  ↓
是 → 自動生成 PK 撿貨單
否 → 等其他 IT
```

## 6.3 調撥清單畫面（庫存中心）

```
┌─────────────────────────────────────┐
│ 庫存中心 · 調撥清單                  │
│ 共 3 筆待處理                        │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ IT-2604-00012                   │ │
│ │ 新竹倉 → 本倉                    │ │
│ │ SKU-001 × 2                     │ │
│ │ 關聯：SO-2604-00054              │ │
│ │ [執行調撥]                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ IT-2604-00013                   │ │
│ │ 台中倉 → 本倉                    │ │
│ │ SKU-021 × 1                     │ │
│ │ [調撥中]                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ IT-2604-00011                   │ │
│ │ 新竹倉 → 本倉                    │ │
│ │ ✓ 已完成 2 小時前                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

# 📦 PART 7：Phase 7 - 跨中心連動（SO → PK → BX → DN）

## 7.1 完整連動流程

```
銷售中心：業務完成 SOP
  ↓ 自動連動
庫存中心：對應任務出現
  
具體：
  業務 SOP 完成 SO-2604-00054
  ↓ SYS-C 分析
  ↓ 情境 A（本倉有貨）
  ↓ 自動生成 PK-2604-00054
  ↓ PK 出現在「庫存中心 → 撿貨清單」
  ↓
  倉管完成撿貨
  ↓ 自動生成 BX-2604-00054
  ↓ BX 出現在「包貨清單」
  ↓
  倉管完成包貨
  ↓ 自動生成 DN-2604-00054
  ↓ DN 出現在「送貨清單」
  ↓
  外務完成送貨 + 客戶簽收
  ↓ DN 標記「已送達」
  ↓ SO 標記「已完成」
  ↓ 自動生成 AR 應收帳款
```

## 7.2 單據編號規則

```
所有相關單據共用同一流水號（方便追蹤）：

SO-2604-00054
PK-2604-00054
BX-2604-00054
DN-2604-00054
AR-2604-00054

業務一眼看到單號就知道是同一筆交易。
```

## 7.3 跨中心 store 設計

```ts
// 全域 sales store（連動所有單據）
interface SalesStore {
  sos: SO[]
  pks: PK[]
  bxs: BX[]
  dns: DN[]
  its: IT[]  // 調撥
  
  // Actions
  createSO: (so: Omit<SO, 'id' | 'createdAt' | 'status'>) => SO
  // 內部：依情境分流，自動建 PK 或 IT 或 TI
  
  completePicking: (pkId: string) => BX
  // 撿貨完成 → 自動建 BX
  
  completePacking: (bxId: string) => DN
  // 包貨完成 → 自動建 DN
  
  completeDelivery: (dnId: string, signature: SignatureData) => void
  // 送貨完成 → SO 標記完成、AR 生成
}
```

---

# 📦 PART 8：Phase 8 - 庫存中心 4 分區重構

## 8.1 套用銷售中心架構範本

```
庫存中心 4 分區：

1. 📊 狀態追蹤（預設）
   - 倉管 PRO KPI（出入庫效率 + 誤差率）
   - 待辦追蹤（撿貨待處理 / 包貨待處理 / 送貨待處理）

2. 🛠 工作站
   - 撿貨作業
   - 包貨作業
   - 送貨作業（外務專用）
   - 調撥作業
   - 進貨作業
   - 盤點作業

3. 📋 單據管理
   - 撿貨單管理
   - 包貨單管理
   - 送貨單管理
   - 調撥單管理
   - 調貨取貨單管理
   - 進貨單管理
   - 盤點單管理

4. 📦 倉位管理 ← 取代「客戶維護」
   - 庫位管理（建議安全/最高量）
   - 盤點設定（週期）
```

## 8.2 路由結構

```
/dashboard/inventory                     → 預設「狀態追蹤」
/dashboard/inventory?section=status      → 狀態追蹤
/dashboard/inventory?section=workstation → 工作站
/dashboard/inventory?section=documents   → 單據管理
/dashboard/inventory?section=warehouse   → 倉位管理

工作站子功能：
/dashboard/inventory/picking             → 撿貨作業
/dashboard/inventory/packing             → 包貨作業
/dashboard/inventory/delivery            → 送貨作業
/dashboard/inventory/transfer            → 調撥作業
/dashboard/inventory/receiving           → 進貨作業
/dashboard/inventory/stocktake           → 盤點作業

單據管理子功能：
/dashboard/inventory/docs/picking        → 撿貨單管理
/dashboard/inventory/docs/packing        → 包貨單管理
/dashboard/inventory/docs/delivery       → 送貨單管理
/dashboard/inventory/docs/transfer       → 調撥單管理
/dashboard/inventory/docs/inquiry-pickup → 調貨取貨單管理
/dashboard/inventory/docs/receiving      → 進貨單管理
/dashboard/inventory/docs/stocktake      → 盤點單管理

倉位管理子功能：
/dashboard/inventory/warehouse/locations → 庫位管理
/dashboard/inventory/warehouse/stocktake-config → 盤點設定
```

## 8.3 元件結構

```
apps/nx-ui/src/features/inventory/ui/
  ├─ InventoryHubMobile.tsx
  ├─ sections/
  │   ├─ StatusSection.tsx              倉管 KPI + 待辦
  │   ├─ WorkstationSection.tsx         6 個作業項目
  │   ├─ DocumentsSection.tsx           7 個單據項目
  │   └─ WarehouseSection.tsx           2 個倉位項目
  ├─ components/
  │   ├─ InventoryKPICard.tsx           出入庫效率 + 誤差率
  │   ├─ TaskGroup.tsx                  待辦群組（撿/包/送）
  │   └─ TaskItem.tsx                   待辦項目
  └─ mock-data/
```

---

# 📦 PART 9：Phase 9 - 庫存中心工作站

## 9.1 撿貨作業頁面

```
路由：/dashboard/inventory/picking
元件：MobilePickingWorkPage.tsx

畫面流程：
  1. 顯示待撿貨清單（PK 列表）
  2. 倉管點某張 PK → 進入該 PK 的撿貨流程
  3. 系統顯示要撿的料號 + 數量 + 庫位
  4. 倉管掃條碼或手動勾選撿到
  5. 全部撿完 → 系統標記 PK 完成 → 自動建 BX
  6. 回 PK 列表（少了一筆）
```

```
┌─────────────────────────────────────┐
│ 撿貨作業                             │
│ 共 3 筆待撿                          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PK-2604-00054                   │ │
│ │ SO-2604-00054 / B0213 台北      │ │
│ │ 3 項 / 6 件                      │ │
│ │ 建立 30 分鐘前      [開始撿貨]   │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
└─────────────────────────────────────┘
```

點「開始撿貨」進入：

```
┌─────────────────────────────────────┐
│ < PK-2604-00054                     │
│ 撿貨中（1/3）                        │
├─────────────────────────────────────┤
│ ☐ SKU-001 剎車片 VW Golf MK7         │
│   數量：2                            │
│   庫位：A-01-03                      │
│                                     │
│ ☑ SKU-021 機油濾心 Audi A4           │
│   數量：2                            │
│   庫位：B-02-01                      │
│   ✓ 已撿 2 個                        │
│                                     │
│ ☐ SKU-031 空氣濾心 Skoda Superb     │
│   數量：2                            │
│   庫位：C-01-05                      │
│                                     │
├─────────────────────────────────────┤
│ [掃描條碼]  [手動完成]                │
└─────────────────────────────────────┘
```

## 9.2 包貨作業頁面

```
路由：/dashboard/inventory/packing
類似撿貨頁面，但介面是：
  - 確認撿到的東西
  - 選包裝材料
  - 列印出貨標籤
```

## 9.3 送貨作業頁面（外務專用）

```
路由：/dashboard/inventory/delivery
功能：
  - 看今天要送的 DN 清單（已由組長排優先順序）
  - 點某張 DN → 進入送貨流程
  - 送達 → 客戶簽收（電子簽 / 紙本記錄）
  - 標記完成

順路取調貨：
  - 如果今天有 TI 調貨任務在路線上
  - 系統提示「順路可取 TI-xxx」
  - 外務確認順路 → 取貨完成 → TI 標記完成
```

## 9.4 調撥作業頁面

```
路由：/dashboard/inventory/transfer
功能：
  - 顯示待調撥的 IT 清單
  - 倉管執行調撥（他倉出 → 本倉入）
  - 完成 → IT 標記完成 → 觸發 PK 生成
```

## 9.5 進貨作業 + 盤點作業（先 placeholder）

```
路由：/dashboard/inventory/receiving
路由：/dashboard/inventory/stocktake

這兩個今天先 placeholder（不在春酒重點）
```

---

# 📦 PART 10：Phase 10 - 倉管 KPI + 庫位管理 + 盤點設定

## 10.1 倉管 PRO KPI

依 Crown 規格：**出入庫效率 + 誤差率**

```tsx
// InventoryKPICard.tsx

const MOCK_INVENTORY_KPI = {
  warehouse_staff: {  // 倉管員個人
    pickingSpeed: { actual: 18, target: 15, unit: '分鐘/單' },  // 越低越好
    pickingAccuracy: { actual: 99.2, target: 99 },  // %
    packingSpeed: { actual: 8, target: 10, unit: '分鐘/單' },
    deliveryOnTime: { actual: 96.5, target: 95 },  // %
    errorRate: { actual: 0.8, target: 1 },  // % 越低越好
  },
  warehouse_leader: {  // 倉管組長
    teamEfficiency: { actual: 105, target: 100 },  // 團隊效率指數
    dispatchCompletion: { actual: 98 },  // 調度完成率
    transferAccuracy: { actual: 99.5 },  // 調撥準確率
  },
  warehouse_manager: {  // 倉管主管
    overallOnTime: { actual: 96.5, target: 95 },  // 整體準時率
    inventoryTurnover: { actual: 6.5, target: 6 },  // 庫存週轉率
    stocktakeAccuracy: { actual: 99.8 },  // 盤點差異率
  },
}
```

KPI 卡片設計：

```
┌─────────────────────────────────────┐
│ 倉管員 · 個人 KPI · 4 月             │
│                                     │
│ ┌──────┬──────┬──────┐              │
│ │撿貨  │包貨  │誤差  │              │
│ │18 min│8 min │0.8%  │              │
│ │目標15│目標10│目標<1│              │
│ │⚠ 略慢│✓ 達標│✓ 良好│              │
│ └──────┴──────┴──────┘              │
└─────────────────────────────────────┘
```

## 10.2 庫位管理頁面

依 Crown 規格：
- 建議安全/最高量（倉管最清楚坪效）
- 實際安全/最高量由採購設定
- 哪些東西放哪個庫位

```
路由：/dashboard/inventory/warehouse/locations

┌─────────────────────────────────────┐
│ 庫位管理                             │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ A-01-03                         │ │
│ │ 目前存放：SKU-001 剎車片         │ │
│ │ 庫存：5 件 / 上限 30 件          │ │
│ │                                 │ │
│ │ 安全量建議：8（採購設定 10）     │ │
│ │ 最高量建議：30（採購設定 30）    │ │
│ │ ✓ 設定一致                       │ │
│ │                                 │ │
│ │ [調整建議]  [更換存放品]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ B-02-01                         │ │
│ │ 目前存放：SKU-021 機油濾心       │ │
│ │ 庫存：12 件 / 上限 50 件         │ │
│ │                                 │ │
│ │ 安全量建議：15（採購設定 10）⚠   │ │
│ │ 最高量建議：50（採購設定 50）    │ │
│ │ ⚠ 安全量需與採購討論             │ │
│ │                                 │ │
│ │ [調整建議]  [通知採購]           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 10.3 盤點設定頁面

依 Crown 規格：盤點週期設定

```
路由：/dashboard/inventory/warehouse/stocktake-config

┌─────────────────────────────────────┐
│ 盤點設定                             │
├─────────────────────────────────────┤
│ 盤點週期                             │
│ ○ 每月                               │
│ ● 每季                               │
│ ○ 每半年                             │
│ ○ 每年                               │
│                                     │
│ 下次盤點日期：2026-06-30             │
│                                     │
│ ─────────────────────────────       │
│                                     │
│ 分區盤點（不停業務）                 │
│ ☑ A 區                               │
│ ☑ B 區                               │
│ ☐ C 區                               │
│                                     │
│ 高價品盤點頻率（A 級料號）            │
│ ● 每月一次                           │
│                                     │
│ [儲存設定]                           │
└─────────────────────────────────────┘
```

---

# 📦 PART 11：Phase 11 - 組長拖拉排序儀表板

## 11.1 設計核心

依 Crown 規格：
- 不是分配外務（系統不替倉管組長決定誰送）
- 是排優先順序（哪張 DN/TI 先做）
- Trello 式拖拉

## 11.2 畫面結構

```
路由：/dashboard/inventory/dispatch
元件：MobileDispatchPage.tsx（組長專用）

┌─────────────────────────────────────┐
│ 倉管組長 · 配送調度                  │
│ 今日待配送 + 調貨取貨                │
├─────────────────────────────────────┤
│                                     │
│ 拖拉以調整優先順序                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⠿ 1.  DN-2604-00054             │ │
│ │       B0213 台北保養廠           │ │
│ │       3 項 / 6 件                │ │
│ │       [緊急]                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⠿ 2.  DN-2604-00056             │ │
│ │       A0087 新竹汽材行           │ │
│ │       2 項 / 4 件                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⠿ 3.  TI-2604-00012             │ │
│ │       桃園汽材取貨               │ │
│ │       SKU-031 × 3                │ │
│ │       [調貨取貨]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⠿ 4.  DN-2604-00057             │ │
│ │       D0542 桃園合興汽車         │ │
│ │       1 項 / 2 件                │ │
│ │       [一般]                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ─────────────────────────────       │
│                                     │
│ 排序完成 → 自動依序派給外務          │
│                                     │
│ [儲存排序]                           │
└─────────────────────────────────────┘
```

## 11.3 拖拉實作

使用 `@dnd-kit/core` 或 `react-beautiful-dnd`：

```tsx
// MobileDispatchPage.tsx

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function MobileDispatchPage() {
  const [items, setItems] = useState<DispatchItem[]>(MOCK_DISPATCH_ITEMS)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )
  
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }
  
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg text-white">配送調度</div>
        <div className="text-xs text-white/50 mt-0.5">
          拖拉以調整優先順序
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item, index) => (
              <SortableDispatchItem
                key={item.id}
                item={item}
                priority={index + 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <button
        onClick={handleSave}
        className="w-full h-11 bg-[#E8A020] text-black rounded-lg"
      >
        儲存排序
      </button>
    </div>
  )
}

function SortableDispatchItem({ item, priority }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-white/10 bg-white/5 rounded-lg p-4
                 flex items-start gap-3"
    >
      {/* 拖拉把手 */}
      <button
        {...attributes}
        {...listeners}
        className="text-white/40 mt-1 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      {/* 優先順序 */}
      <div className="text-sm text-[#E8A020] font-mono shrink-0 mt-0.5">
        {priority}.
      </div>
      
      {/* 內容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-white/70">
            {item.docNumber}
          </span>
          {item.type === 'TI' && (
            <span className="text-xs bg-[#E8A020]/15 text-[#E8A020] px-1.5 py-0.5 rounded">
              調貨取貨
            </span>
          )}
          {item.urgency === 'urgent' && (
            <span className="text-xs bg-[#E24B4A]/15 text-[#E24B4A] px-1.5 py-0.5 rounded">
              緊急
            </span>
          )}
        </div>
        
        <div className="text-sm text-white">
          {item.targetName}
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          {item.summary}
        </div>
      </div>
    </div>
  )
}
```

## 11.4 套件安裝

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

# 📦 PART 12：Phase 12 - 整合測試 + Mock 資料完善

## 12.1 完整 Demo 路徑（春酒最強版）

```
【完整流程演示】

== 第一段：業務 SOP 含追加品項 ==

1. 登入 TEST-PRO → 進銷售中心 → 狀態追蹤
   看到：「銷售進行中 4 / 調貨進行中 2 / 保固 1」
   （詢價/報價已不在清單，依新規則）

2. 工作站 → 國內銷售
3. STEP 1 選 B0213 台北保養廠
4. STEP 2 搜「剎車片」→ SKU-001 → 系統提示：
   「10 天前曾報過 NT$ 600（毛利 25%）」
   → 業務「啊上次給他這個價」
5. STEP 3 數量 2、套用舊價 600 → 加入清單
6. 系統問「還要查嗎？」→ 業務點「還要」
7. 回 STEP 2 搜「機油濾心」→ SKU-021 → 加入清單
8. 系統問「還要查嗎？」→ 業務點「還要」
9. 回 STEP 2 搜「空氣濾心」→ SKU-031（缺貨）
   → 出現缺貨分流彈窗
10. 業務選「向同行調貨」→ toast 建立 RFQ
    （此時清單仍是 2 項：SKU-001 + SKU-021）
11. 系統問「還要查嗎？」→ 業務點「沒了」

== 第二段：客戶 5 選項回應 ==

12. 進 S06 確認清單（2 項，總額 NT$ 1,720）
13. STEP 4 選擇報價方式 → 口頭
14. STEP 5 客戶回應 5 選項出現
15. 業務按「考慮看看」（demo 第一次走這條）
    → 跳到「記錄為待回覆」頁
    → 設定追蹤天數 7 天 → 完成記錄
    → SOP 結束（QT 已建立、暫不追蹤）

== 第三段：考慮看看後的回頭 ==

16. （假裝 3 天後）業務又開 SOP，選 B0213
17. STEP 2 搜「剎車片」→ SKU-001
    → 系統提示：「3 天前已報過 NT$ 600 待客戶確認」
    → 業務「啊客戶說要了」
18. 業務點提醒 → 進 QT 詳情
19. QT 上方顯示「客戶確認，建立銷貨單」按鈕
20. 點下去 → 系統建立 SO（情境 A：本倉有貨）
21. SO 出現在「銷售進行中」+ 庫存中心「撿貨清單」

== 第四段：庫存中心倉管視角 ==

22. 切換到庫存中心 → 狀態追蹤
    看到倉管 KPI（撿貨 18 分/件、誤差 0.8%）
    看到撿貨清單 +1
23. 工作站 → 撿貨作業
24. 點 PK-2604-xxx → 進撿貨流程
25. 撿完 → 自動建 BX → 進包貨清單
26. 包貨完 → 自動建 DN → 進送貨清單

== 第五段：組長排序 ==

27. 切換到「配送調度」（組長視角）
28. 看到 DN-001/002/003 + TI-005（同行取貨）
29. 拖拉排序：
    - DN-001 緊急 → 第 1
    - DN-002 + TI-005（順路）→ 第 2、3
    - DN-003 → 第 4
30. 儲存排序 → 通知外務

== 第六段：備貨 4 情境 ==

31. （示範情境 B 調撥）
    打開另一張 SO（B0156 台中順達）
    SO 內容：本倉 1 件 + 新竹倉 2 件
    SYS-C 自動建 IT 調撥單
    倉管執行調撥 → 完成 → 自動建 PK

32. （示範情境 C 同行調貨）
    點 RFQ-2604-00091 → 詳情頁
    輸入 3 家報價、採用最便宜 → 建 QT
    模擬「客戶確認」→ 建 SO + TI
    TI 進「調貨取貨清單」
    倉管組長指派順路取（拖拉到 DN 旁邊）

33. （示範情境 D 混合）
    最複雜的範例
    SO 同時觸發 IT + TI

== 第七段：報表 ==
（可選，看時間）

切換到報表分區 → 看本月銷售/庫存週轉等

== Demo 結束 ==

對方老闆心想：
  「這 ERP 真的懂業界，每個細節都對」
  「業務的痛、倉管的痛、組長的痛、會計的痛
   全部考慮到了」
```

## 12.2 Mock 資料設計原則

```
讓 demo 路徑「保證能走」：

1. SKU-001 剎車片
   - B0213 有 10 天前的歷史報價（觸發提示）
   - 本倉庫存 5（情境 A 可用）

2. SKU-016 全 0 庫存（觸發缺貨分流）

3. SKU-021 機油濾心
   - 本倉 1、新竹 2（情境 B 可用）

4. SKU-031 空氣濾心
   - 本倉 0、新竹 0、台中 0（觸發缺貨）
   - 已有 RFQ-2604-00087 進行中（觸發 RFQ 提醒）
```

---

# 🚨 嚴格紀律

## 必須遵守

```
✅ 每個 Phase commit 同步更新本 spec（標記完成、修正過時措辭）
✅ 不破壞 R7 + R7 Phase 7 已驗收的東西
✅ 庫存哲學：全程庫存 >= 0
✅ 跨中心連動使用統一單號（SO/PK/BX/DN 共用流水）
✅ 倉管中心套用銷售中心架構範本（4 分區）
✅ 倉管中心第 4 分區 = 倉位管理（不是客戶維護）
✅ 維持風格一致（穩重、零 emoji）
```

## 禁止

```
❌ 不要動 R6 SOP 的 STEP 6~9（外務配送、簽收、訂單成立、業績總結）
   ⚠️ 注意：STEP 5 是要重構的（5 選項）
❌ 不要動 R5 採購 SOP
❌ 不要動首頁
❌ 不要動桌面版（手機優先）
❌ 不要假裝實作所有頁面（placeholder 是 OK 的）
```

---

# 📋 開發順序（建議）

```
Phase 1：Bug 修復（30 分鐘，最快）
Phase 2：歷史報價機制（90 分鐘）
Phase 3：SOP STEP 5 重構（120 分鐘，5 選項複雜）
Phase 4：Phase 7 待辦清單調整（45 分鐘）
Phase 5：SO 備貨 4 情境分流（180 分鐘）
Phase 6：調撥單 IT（90 分鐘）
Phase 7：跨中心連動（120 分鐘）
Phase 8：庫存中心 4 分區（120 分鐘）
Phase 9：庫存中心工作站（180 分鐘）
Phase 10：倉管 KPI + 庫位 + 盤點（120 分鐘）
Phase 11：組長拖拉排序（120 分鐘）
Phase 12：整合測試 + Mock 完善（90 分鐘）
```

可以分大塊 commit：
- 大塊 1：Phase 1~4（業務 SOP 重構）
- 大塊 2：Phase 5~7（備貨流程 + 跨中心連動）
- 大塊 3：Phase 8~10（庫存中心建立）
- 大塊 4：Phase 11~12（組長 + 整合）

---

# 📋 完成回報格式（每 Phase）

```markdown
## TASK-BUSINESS-RESTRUCTURE-01 Phase X 完成回報

### Phase X code 改動
- [x] ...

### Spec 同步
- [x] Phase 進度表更新 X 狀態
- [x] 過時措辭修正：（列出）

### 偏差說明（如有）

### Commit hash

### Crown 驗收路徑
git fetch origin && git pull
pnpm --filter nx-ui dev

驗收項目：
1. ...
```

---

# 🎯 春酒 Demo 最終 pitch（完整版完成後）

```
Crown：「這個系統是設計給真實業界使用的。
       我做這行 N 年，我知道每個環節的痛。
       
       業務的痛 — 客戶碎片化詢問、考慮看看、缺貨救援
       倉管的痛 — 多倉調撥、撿包送、調貨取貨
       組長的痛 — 排程優化、順路取貨
       會計的痛 — 應收帳款、毛利分析
       
       NEXORA 把這些痛都做進系統了。
       不是『我們設計這樣很好用』
       是『業界本來就這樣做，我們把它變成系統』。
       
       這就是 NEXORA 跟其他 ERP 的差別。」
```

---

# 🚀 開工

這是 NEXORA 專案至今最大的 spec。

完成後 NEXORA：
- 從「業務 SOP demo」進化到「真實業界完整流程」
- 涵蓋業務 + 倉管 + 組長三個角色
- 銷售中心 + 庫存中心兩個中心套用同一套架構範本
- 春酒對方老闆會看到「這真的能用」的硬功夫

開工！🫡
