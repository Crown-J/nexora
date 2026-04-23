# [TASK-DEMO-EMERGENCY-R7-PHASE-7] 缺貨分流完整實作 + RFQ 同行比價流程

> 發件人：Alex（PM AI）
> 收件人：Hank（Cursor AI）
> 日期：2026-04-23 下午
> 版本：v1
> 緊急程度：🔥 HIGH（春酒 demo 進階展示）
> 預估時間：6~7 小時
> 分支：`feature/demo-emergency`
> 專案路徑：`nexora/docs/spec/DEMO-EMERGENCY-R7-PHASE-7.md`
> 前置：R7 Phase 5+6 完成（commit 514cc9a）

---

## 📋 Spec 版本歷史

| 版本 | 日期 | 變更重點 |
|------|------|----------|
| v1 | 2026-04-23 下午 | 原始 spec |

---

## 📊 Phase 進度追蹤

| Phase | 狀態 | Commit | 說明 |
|-------|------|--------|------|
| Phase 7-1 | ✅ 完成 | d08810a | 缺貨按鈕改 OutOfStockDialog（A=建 RFQ、B=建 CO，寫入 store）|
| Phase 7-2 | ✅ 完成 | d08810a | 工作站加「同行調貨」項目（可用，enabled=true）|
| Phase 7-3 | ✅ 完成 | d08810a | Zustand store + RFQ types + 3 筆初始 mock + 列表頁 + StatusSection 整合 |
| Phase 7-4 | ✅ 完成 | TBD (7-4~7-6) | RFQ 詳情頁（VendorQuoteInput / VendorQuoteItem / AdoptQuoteDialog / ConfirmDialog）|
| Phase 7-5 | ✅ 完成 | TBD (7-4~7-6) | 採用生成 QT + StatusSection 待確認報價群組 + QT 詳情頁 + TodoGroup onItemClick |
| Phase 7-6 | ✅ 完成 | TBD (7-4~7-6) | 靜態整合測試 + 最終 spec sync |

**注意**：Phase 7 是 R7 的延伸階段，不是重啟 R7。建議一個大 commit 完成所有 7-1 ~ 7-6（約 6 小時），或分兩個 commit（7-1~7-3 為一個、7-4~7-6 為一個）。

---

## 🎯 本任務一句話摘要

把「料號全公司無庫存」從目前的「反灰按鈕卡住」升級成「主動分流決策 + 完整的詢價→比價→採用→生成報價單」流程，讓業務在手機上能處理真實業界的「幫客戶找貨」場景。

---

## 💎 戰略背景（Crown 親自教導）

### Crown 的庫存哲學

> 「我不希望我的系統庫存出現負數。」

這不是偏好，是**物理定律**：
- 庫存 >= 0 是物理世界的事實
- ERP 系統必須反映物理世界
- 任何讓庫存變負的設計 = 系統脫離現實

### 正確的單據鏈（Crown 修正了 Alex 的錯誤）

```
Alex 原本錯誤的設計：
  詢價採用同行 → 直接生成銷貨單 ❌
  → 會導致庫存預留但貨還沒到 → 違反物理

Crown 教導的正確單據鏈：

階段 1：RFQ（調貨詢價單）
  觸發：客戶詢問缺貨 → 業務選「向同行調貨」
  內容：客戶編號 + 料號 + 等待同行回覆
  狀態：待回覆、已回覆（部分或全部）、已採用、已放棄

階段 2：QT（報價單）
  觸發：RFQ 採用某家同行 → 系統自動生成
  內容：客戶 + 料號 + 售價（= 同行成本 × 客戶等級毛利率）
  狀態：等待客戶確認
  重點：這時候貨還沒調，只是「知道有貨源、可以賣多少錢」

階段 3：TI（調貨單）
  觸發：客戶確認 QT 報價 → 系統建立
  動作：向採用的同行調貨 → 貨進公司倉 → 庫存 +N
  重點：這時才真的有貨在公司

階段 4：SO（銷貨單）
  觸發：TI 完成、庫存到位 → 走正常 SOP
  動作：從庫存扣貨 → 出給客戶 → 庫存 -N（回到原本的 0）
  重點：全程庫存 >= 0 ✅

R7 Phase 7 範圍：只做階段 1 + 階段 2
階段 3 + 階段 4 的實作留給春酒後的 R9
```

### 為何 Phase 7 只做 RFQ + QT

```
春酒要展示的核心：
  「業界真實的『幫客戶找貨』流程」
  ↓
  這個流程的精華在 RFQ（詢價比價）
  客戶確認 QT 後的調貨出貨 = 走正常 SOP，不是展示重點

做到「採用同行 → 生成 QT」：
  ✓ 完整展示了缺貨分流邏輯
  ✓ 展示了帶客戶來源的詢價單
  ✓ 展示了多同行比價採用機制
  ✓ 展示了 QT 的產生（但不執行後續調貨）
  → 對方看到完整的業務邏輯
  → 不會糾結「那後面調貨怎麼做」（他們看得懂流程）
```

---

## 🎨 風格延續

延續 R7 v2 確立的穩重風格：

```
✅ 全部 lucide-react，零 emoji
✅ 金色 #E8A020 只用於 CTA + 當前狀態 + 淡金邊（/60）
✅ 綠色 #1D9E75 只用於成功/採用/達標
✅ 紅色 #E24B4A 只用於缺貨/逾期警示
✅ Badge 一律 bg-white/10 text-white/80 text-xs
✅ Card 一律 border-white/10 bg-white/5 rounded-lg
✅ 字型只有 3 級：text-lg / text-sm / text-xs
✅ 無 font-bold，無 text-xl+
✅ 數字使用 tabular-nums
✅ 料號用 font-mono
```

---

# 📦 PART 1：Phase 7-1 缺貨按鈕改選單

## 1.1 現況

Step2SearchParts.tsx 內，當業務選中缺貨料號，底部按鈕目前是：

```
反灰「請先加入至少一項料號」
```

這不 make sense：
- 這料號全公司都沒貨，根本加不了
- 業務看到反灰按鈕會卡住
- UX 死胡同

## 1.2 新設計

把底部按鈕改成**分流選單入口**：

### 當料號缺貨時（totalStock === 0）

```
底部按鈕變成：
  ┌─────────────────────────────┐
  │ 金色邊框按鈕                  │
  │ 「目前全公司無庫存」          │
  │ （點擊展開選單）              │
  └─────────────────────────────┘

點擊後彈出對話框：
  ┌─────────────────────────────┐
  │ 此料號全公司無庫存            │
  │ 請選擇處理方式                │
  │                             │
  │ ┌─────────────────────────┐ │
  │ │ 🔍 向同行調貨            │ │
  │ │ 業務幫客戶找貨           │ │
  │ │ 系統建立詢價單供日後比價 │ │
  │ └─────────────────────────┘ │
  │                             │
  │ ┌─────────────────────────┐ │
  │ │ 📅 轉客戶訂單            │ │
  │ │ 客戶願意等下次進貨       │ │
  │ │ 系統記錄預訂，進貨時通知 │ │
  │ └─────────────────────────┘ │
  │                             │
  │        [取消]                │
  └─────────────────────────────┘
```

## 1.3 兩個選項的後續動作

### 選項 A：向同行調貨

```tsx
const handleInquiry = () => {
  // 關閉對話框
  setShowDialog(false)
  
  // 建立 RFQ（加入全域 Mock 狀態）
  const newRFQ = {
    id: generateId(),
    rfqNumber: generateRFQNumber(),  // 例：RFQ-2604-00095
    sourceCustomer: currentCustomer,  // 當下 SOP 選的客戶
    part: currentPart,
    quantity: currentQuantity,
    vendorQuotes: [],  // 還沒輸入同行報價
    status: 'waiting',
    createdAt: new Date(),
  }
  addRFQToTodos(newRFQ)  // 加入 RFQ 全域狀態（Mock）
  
  // Toast 提示
  showToast({
    type: 'success',
    message: `已建立詢價單 ${newRFQ.rfqNumber}，可至「同行調貨」處理`,
  })
  
  // 業務繼續 SOP（停在 STEP 2）
}
```

### 選項 B：轉客戶訂單

```tsx
const handleCustomerOrder = () => {
  setShowDialog(false)
  
  // 建立客戶訂單（Mock）
  const newOrder = {
    id: generateId(),
    orderNumber: generateOrderNumber(),  // 例：CO-2604-00012
    customer: currentCustomer,
    part: currentPart,
    quantity: currentQuantity,
    status: 'waiting',
    createdAt: new Date(),
  }
  addCustomerOrder(newOrder)
  
  showToast({
    type: 'success',
    message: `已建立客戶訂單 ${newOrder.orderNumber}，下次進貨時系統會提醒`,
  })
  
  // 業務繼續 SOP
}
```

## 1.4 元件實作

```tsx
// InquiryDialog.tsx 要重新改寫（原本的 A+B 語意變了）

function OutOfStockDialog({ 
  part, 
  customer, 
  quantity,
  onInquiry, 
  onCustomerOrder, 
  onCancel 
}: Props) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 
                   rounded-t-2xl sm:rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E24B4A]" />
            <div className="text-base text-white">此料號全公司無庫存</div>
          </div>
          <div className="text-xs text-white/60">
            <span className="font-mono">{part.sku}</span> {part.name}
          </div>
          <div className="text-xs text-white/50 mt-2">
            請選擇處理方式
          </div>
        </div>
        
        {/* 選項 A：向同行調貨 */}
        <button
          onClick={onInquiry}
          className="w-full text-left border border-white/10 bg-white/5 
                     rounded-lg p-4 hover:border-white/20 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 
                            flex items-center justify-center shrink-0">
              <Search className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-1">向同行調貨</div>
              <div className="text-xs text-white/60">
                業務幫客戶找貨
              </div>
              <div className="text-xs text-white/40 mt-1">
                系統建立詢價單供日後向同行比價
              </div>
            </div>
          </div>
        </button>
        
        {/* 選項 B：轉客戶訂單 */}
        <button
          onClick={onCustomerOrder}
          className="w-full text-left border border-white/10 bg-white/5 
                     rounded-lg p-4 hover:border-white/20 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 
                            flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-1">轉客戶訂單</div>
              <div className="text-xs text-white/60">
                客戶願意等下次進貨
              </div>
              <div className="text-xs text-white/40 mt-1">
                系統記錄預訂，下次進貨時通知業務
              </div>
            </div>
          </div>
        </button>
        
        {/* 取消按鈕 */}
        <button
          onClick={onCancel}
          className="w-full h-10 text-sm text-white/50 hover:text-white/70"
        >
          取消
        </button>
      </div>
    </div>
  )
}
```

## 1.5 主按鈕區的三個狀態

Step2SearchParts.tsx 的 PartDetailExpanded 底部要處理三種情境：

```tsx
// 狀態 1：缺貨（totalStock === 0）
{isOutOfStock && (
  <button
    onClick={() => setShowDialog(true)}
    className="w-full h-11 border border-[#E8A020]/60 text-[#E8A020] 
               rounded-lg hover:bg-[#E8A020]/10 transition-colors
               flex items-center justify-center gap-2"
  >
    <AlertCircle className="w-4 h-4" />
    <span>目前全公司無庫存</span>
  </button>
)}

// 狀態 2：有貨 + 已加入報價清單
{!isOutOfStock && isInQuote && (
  <div className="border border-[#1D9E75]/40 bg-[#1D9E75]/5 rounded-lg p-3
                  flex items-center gap-2">
    <CheckCircle2 className="w-4 h-4 text-[#1D9E75]" />
    <div className="text-xs text-white/80">已加入報價清單</div>
  </div>
)}

// 狀態 3：有貨 + 未加入
{!isOutOfStock && !isInQuote && (
  <button
    onClick={addToQuote}
    className="w-full h-11 bg-[#E8A020] text-black font-medium rounded-lg
               hover:bg-[#E8A020]/90 transition-colors"
  >
    加入報價清單
  </button>
)}
```

---

# 📦 PART 2：Phase 7-2 工作站加「同行調貨」項目

## 2.1 更新 WorkstationSection

```tsx
// WorkstationSection.tsx
const items = [
  {
    id: 'domestic',
    icon: Package,
    title: '國內銷售',
    subtitle: '9 步驟 SOP 流程',
    description: '從選客戶到訂單成立',
    route: '/dashboard/sale/sop-demo',
    enabled: true,
  },
  {
    id: 'inquiry',  // 🆕 新增
    icon: Search,
    title: '同行調貨',
    subtitle: '向同行詢價、比價、採用',
    description: '處理缺貨料號的調貨流程',
    route: '/dashboard/sale/inquiry',
    enabled: true,  // 🆕 可用（非 placeholder）
  },
  {
    id: 'export',
    icon: Globe,
    title: '國外銷售',
    subtitle: '12 步驟（含報關/物流）',
    description: '出口銷售完整流程',
    route: '/dashboard/sale/export',
    enabled: false,
  },
  {
    id: 'return',
    icon: Undo2,
    title: '銷退作業',
    subtitle: '客戶退貨處理流程',
    description: '退貨入庫與帳款處理',
    route: '/dashboard/sale/return',
    enabled: false,
  },
  {
    id: 'warranty',
    icon: Shield,
    title: '保固申請',
    subtitle: '客戶保固送修流程',
    description: '送原廠或同行處理',
    route: '/dashboard/sale/warranty',
    enabled: false,
  },
]
```

## 2.2 同行調貨的路由結構

```
/dashboard/sale/inquiry                   RFQ 列表頁
/dashboard/sale/inquiry/[rfqId]           RFQ 詳情頁（輸入同行報價、採用）
```

**檔案位置**：
```
apps/nx-ui/src/app/dashboard/sale/inquiry/
  ├─ page.tsx                     列表頁入口
  └─ [rfqId]/
      └─ page.tsx                 詳情頁入口

apps/nx-ui/src/features/sale/ui/inquiry/
  ├─ MobileInquiryListPage.tsx    列表頁主元件
  ├─ MobileInquiryDetailPage.tsx  詳情頁主元件
  ├─ components/
  │   ├─ InquiryListItem.tsx      列表項
  │   ├─ VendorQuoteInput.tsx     新增同行報價彈窗
  │   ├─ VendorQuoteItem.tsx      已輸入的同行報價行
  │   └─ AdoptQuoteDialog.tsx     採用後確認報價單對話框
  └─ types.ts
```

---

# 📦 PART 3：Phase 7-3 RFQ Mock 資料結構 + 列表頁

## 3.1 Mock 資料結構

```ts
// features/sale/ui/inquiry/types.ts

export interface VendorQuote {
  id: string
  vendorName: string          // 例：'同行 A 汽材行'
  vendorCode: string          // 例：'V001'（供應商編號）
  price: number               // 同行給的單價
  quotedAt: Date              // 回報時間
  notes?: string              // 備註（例：「3 天內可到」）
}

export interface RFQ {
  id: string
  rfqNumber: string           // RFQ-YYMM-xxxxx
  sourceCustomer: {
    code: string              // A1001
    name: string              // 台北保養廠
    tier: 'A' | 'B' | 'C' | 'D'
  }
  part: {
    sku: string               // SKU-016
    name: string              // 剎車片 Skoda Superb
  }
  quantity: number
  vendorQuotes: VendorQuote[] // 多家同行報價（可為空陣列）
  status: 'waiting' | 'responded' | 'adopted' | 'abandoned'
  adoptedVendorId?: string    // 採用的同行 ID
  relatedQtNumber?: string    // 採用後生成的 QT 報價單號
  createdAt: Date
  createdBy: string           // 業務員
}
```

## 3.2 Mock 狀態管理

**使用 Zustand 或 React Context 管理全域 RFQ 狀態**：

```ts
// features/sale/ui/inquiry/store.ts
import { create } from 'zustand'

interface RFQStore {
  rfqs: RFQ[]
  qts: QT[]  // 採用後生成的報價單（同時也要管理）
  
  addRFQ: (rfq: RFQ) => void
  updateRFQ: (id: string, updates: Partial<RFQ>) => void
  addVendorQuote: (rfqId: string, quote: VendorQuote) => void
  removeVendorQuote: (rfqId: string, quoteId: string) => void
  adoptVendorQuote: (rfqId: string, vendorId: string) => QT  // 回傳生成的 QT
}

export const useRFQStore = create<RFQStore>((set, get) => ({
  rfqs: INITIAL_MOCK_RFQS,  // 預載 2~3 筆 demo 用
  qts: [],
  
  addRFQ: (rfq) => set((state) => ({ rfqs: [...state.rfqs, rfq] })),
  
  updateRFQ: (id, updates) => set((state) => ({
    rfqs: state.rfqs.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  
  addVendorQuote: (rfqId, quote) => set((state) => ({
    rfqs: state.rfqs.map(r => 
      r.id === rfqId 
        ? { 
            ...r, 
            vendorQuotes: [...r.vendorQuotes, quote],
            status: 'responded' as const,
          } 
        : r
    )
  })),
  
  removeVendorQuote: (rfqId, quoteId) => set((state) => ({
    rfqs: state.rfqs.map(r => 
      r.id === rfqId 
        ? { ...r, vendorQuotes: r.vendorQuotes.filter(q => q.id !== quoteId) }
        : r
    )
  })),
  
  adoptVendorQuote: (rfqId, vendorId) => {
    const rfq = get().rfqs.find(r => r.id === rfqId)!
    const vendor = rfq.vendorQuotes.find(v => v.id === vendorId)!
    const tierMargin = TIER_TARGET_MARGIN[rfq.sourceCustomer.tier]
    const suggestedPrice = Math.round(vendor.price * (1 + tierMargin / 100))
    
    const qt: QT = {
      id: generateId(),
      qtNumber: generateQTNumber(),
      customer: rfq.sourceCustomer,
      part: rfq.part,
      quantity: rfq.quantity,
      vendorCost: vendor.price,
      suggestedPrice,
      finalPrice: suggestedPrice,  // 預設用建議，業務可改
      source: 'inquiry' as const,  // 來源：同行調貨
      sourceRFQNumber: rfq.rfqNumber,
      status: 'pending_customer' as const,
      createdAt: new Date(),
    }
    
    set((state) => ({
      rfqs: state.rfqs.map(r => 
        r.id === rfqId 
          ? { 
              ...r, 
              status: 'adopted' as const,
              adoptedVendorId: vendorId,
              relatedQtNumber: qt.qtNumber,
            }
          : r
      ),
      qts: [...state.qts, qt],
    }))
    
    return qt
  },
}))
```

## 3.3 初始 Mock RFQ 資料

```ts
// features/sale/ui/inquiry/mock-data.ts

export const INITIAL_MOCK_RFQS: RFQ[] = [
  // 1 筆：已有 2 家同行回報，還在等第 3 家（給業務點進去比價）
  {
    id: 'rfq-1',
    rfqNumber: 'RFQ-2604-00087',
    sourceCustomer: {
      code: 'A0087',
      name: '新竹汽材行',
      tier: 'A',
    },
    part: {
      sku: 'SKU-031',
      name: '空氣濾心 Skoda Superb',
    },
    quantity: 3,
    vendorQuotes: [
      {
        id: 'vq-1',
        vendorName: '桃園汽材',
        vendorCode: 'V012',
        price: 380,
        quotedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: '3 天內可到',
      },
      {
        id: 'vq-2',
        vendorName: '台中源豐',
        vendorCode: 'V023',
        price: 420,
        quotedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
    status: 'responded',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdBy: '王小明',
  },
  
  // 2 筆：剛建立、還沒同行回報（給業務點進去輸入第一家）
  {
    id: 'rfq-2',
    rfqNumber: 'RFQ-2604-00091',
    sourceCustomer: {
      code: 'B0156',
      name: '台中順達汽車',
      tier: 'B',
    },
    part: {
      sku: 'SKU-042',
      name: '火星塞 VW Golf',
    },
    quantity: 4,
    vendorQuotes: [],
    status: 'waiting',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdBy: '王小明',
  },
  
  // 3 筆：久未處理（給業務看到「逾期」染紅）
  {
    id: 'rfq-3',
    rfqNumber: 'RFQ-2604-00094',
    sourceCustomer: {
      code: 'C0421',
      name: '高雄修車場',
      tier: 'C',
    },
    part: {
      sku: 'SKU-055',
      name: '方向盤 BMW E46',
    },
    quantity: 1,
    vendorQuotes: [],
    status: 'waiting',
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    createdBy: '王小明',
  },
]
```

**跟狀態追蹤的整合**：這些 mock RFQ 要同時顯示在：
1. 狀態追蹤 → 詢價待回覆群組（顯示 3 筆）
2. 同行調貨 → RFQ 列表頁（顯示 3 筆 + 可能新增）

所以 `MOCK_INQUIRY_TODOS` 應該由 `useRFQStore` 動態衍生，而不是獨立的 mock data。Phase 2 的 MOCK_INQUIRY_TODOS 要改成從 store 讀取。

## 3.4 RFQ 列表頁

```
路由：/dashboard/sale/inquiry
元件：MobileInquiryListPage.tsx

畫面：

┌─────────────────────────────────────┐
│ TopBar                              │
├─────────────────────────────────────┤
│                                     │
│ 銷售中心 · 同行調貨                  │
│ 處理缺貨料號的詢價比價               │
│                                     │
│ [狀態篩選 ▼]                         │
│   全部 / 待回覆 / 已回覆 / 已採用    │
│                                     │
│ 共 3 筆                              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ RFQ-2604-00087                  │ │
│ │ A0087 新竹汽材行 (A 級)         │ │
│ │ SKU-031 空氣濾心 Skoda          │ │
│ │ 數量：3 · 已 2 家回覆            │ │
│ │ 建立 2 天前            [處理 →] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ RFQ-2604-00091                  │ │
│ │ B0156 台中順達汽車 (B 級)        │ │
│ │ SKU-042 火星塞 VW Golf          │ │
│ │ 數量：4 · 尚未有同行回覆         │ │
│ │ 建立 5 天前  [等待中]  [處理 →] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ RFQ-2604-00094                  │ │
│ │ C0421 高雄修車場 (C 級)         │ │
│ │ SKU-055 方向盤 BMW E46          │ │
│ │ 數量：1 · 尚未有同行回覆         │ │
│ │ 建立 9 天前  [逾期!]   [處理 →] │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ 4 分區 Tab（工作站當前選中）          │
└─────────────────────────────────────┘
```

實作：

```tsx
function MobileInquiryListPage() {
  const { rfqs } = useRFQStore()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'waiting' | 'responded' | 'adopted'>('all')
  
  const filteredRFQs = useMemo(() => {
    if (filter === 'all') return rfqs
    return rfqs.filter(r => r.status === filter)
  }, [rfqs, filter])
  
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 overflow-y-auto pb-[80px] p-4 space-y-4">
        {/* 標題 */}
        <div>
          <div className="text-lg text-white">銷售中心 · 同行調貨</div>
          <div className="text-xs text-white/50 mt-0.5">
            處理缺貨料號的詢價比價
          </div>
        </div>
        
        {/* 狀態篩選 */}
        <FilterPills value={filter} onChange={setFilter} />
        
        <div className="text-xs text-white/50">
          共 {filteredRFQs.length} 筆
        </div>
        
        {/* RFQ 列表 */}
        <div className="space-y-3">
          {filteredRFQs.map((rfq) => (
            <InquiryListItem
              key={rfq.id}
              rfq={rfq}
              onClick={() => router.push(`/dashboard/sale/inquiry/${rfq.id}`)}
            />
          ))}
        </div>
      </main>
      
      {/* 4 分區 Tab（銷售中心內） */}
    </div>
  )
}

function InquiryListItem({ rfq, onClick }: Props) {
  const daysSinceCreated = Math.floor(
    (Date.now() - rfq.createdAt.getTime()) / (24 * 60 * 60 * 1000)
  )
  
  // 等待天數染色
  const waitBadgeClass = 
    daysSinceCreated < 3 ? 'bg-white/10 text-white/70' :
    daysSinceCreated <= 7 ? 'bg-[#E8A020]/15 text-[#E8A020]' :
    'bg-[#E24B4A]/15 text-[#E24B4A]'
  
  // 狀態標籤
  const statusLabel = 
    rfq.status === 'waiting' ? '等待中' :
    rfq.status === 'responded' ? `已 ${rfq.vendorQuotes.length} 家回覆` :
    rfq.status === 'adopted' ? '已採用' : '已放棄'
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-white/10 bg-white/5 
                 rounded-lg p-4 hover:border-white/20 transition-all"
    >
      {/* 第一行：RFQ 號 + 狀態 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-white/70">
          {rfq.rfqNumber}
        </span>
        <span className={cx('text-xs px-2 py-0.5 rounded', waitBadgeClass)}>
          {daysSinceCreated >= 7 ? '逾期！' : `${daysSinceCreated} 天前`}
        </span>
      </div>
      
      {/* 客戶 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono text-white/40">
          {rfq.sourceCustomer.code}
        </span>
        <span className="text-sm text-white">
          {rfq.sourceCustomer.name}
        </span>
        <span className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
          {rfq.sourceCustomer.tier} 級
        </span>
      </div>
      
      {/* 料號 */}
      <div className="text-xs text-white/60 mb-2">
        <span className="font-mono">{rfq.part.sku}</span> {rfq.part.name}
      </div>
      
      {/* 數量 + 狀態 */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-white/50">
          數量：{rfq.quantity} · {statusLabel}
        </div>
        <div className="flex items-center gap-1 text-[#E8A020]">
          <span>處理</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  )
}
```

---

# 📦 PART 4：Phase 7-4 RFQ 詳情頁（核心）

這是整個 Phase 7 最複雜、最關鍵的頁面。

## 4.1 頁面整體結構

```
路由：/dashboard/sale/inquiry/[rfqId]
元件：MobileInquiryDetailPage.tsx

畫面：

┌─────────────────────────────────────┐
│ TopBar                              │
├─────────────────────────────────────┤
│ < 返回 同行調貨                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ RFQ-2604-00087                  │ │ 詢價單資訊
│ │ 建立於 2 天前                    │ │
│ ├─────────────────────────────────┤ │
│ │ 來源客戶                         │ │
│ │ A0087 新竹汽材行 (A 級)         │ │
│ │                                 │ │
│ │ 料號                             │ │
│ │ SKU-031 空氣濾心 Skoda Superb   │ │
│ │                                 │ │
│ │ 數量                             │ │
│ │ 3 個                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 同行報價（2 家已回覆）               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ V012 桃園汽材                    │ │
│ │ NT$ 380              2 天前      │ │
│ │ 備註：3 天內可到                  │ │
│ │                  [採用] [刪除]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ V023 台中源豐                    │ │
│ │ NT$ 420              1 天前      │ │
│ │                  [採用] [刪除]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ + 新增同行報價 ]                   │
│                                     │
│ ──────────────────────────────────  │
│                                     │
│ 其他動作：                           │
│                                     │
│ [× 全部不採用，結案]                 │
│                                     │
└─────────────────────────────────────┘
```

## 4.2 上半部：RFQ 資訊卡

```tsx
function RFQInfoCard({ rfq }: Props) {
  const daysSince = Math.floor(
    (Date.now() - rfq.createdAt.getTime()) / (24 * 60 * 60 * 1000)
  )
  
  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-4 space-y-3">
      {/* RFQ 號 + 建立時間 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-white/80">
          {rfq.rfqNumber}
        </span>
        <span className="text-xs text-white/50">
          建立於 {daysSince} 天前
        </span>
      </div>
      
      <div className="h-px bg-white/10" />
      
      {/* 來源客戶 */}
      <div>
        <div className="text-xs text-white/50 mb-1">來源客戶</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">
            {rfq.sourceCustomer.code}
          </span>
          <span className="text-sm text-white">
            {rfq.sourceCustomer.name}
          </span>
          <span className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
            {rfq.sourceCustomer.tier} 級
          </span>
        </div>
      </div>
      
      {/* 料號 */}
      <div>
        <div className="text-xs text-white/50 mb-1">料號</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">
            {rfq.part.sku}
          </span>
          <span className="text-sm text-white">
            {rfq.part.name}
          </span>
        </div>
      </div>
      
      {/* 數量 */}
      <div>
        <div className="text-xs text-white/50 mb-1">數量</div>
        <div className="text-sm text-white tabular-nums">
          {rfq.quantity} 個
        </div>
      </div>
    </div>
  )
}
```

## 4.3 中段：同行報價列表

```tsx
function VendorQuoteList({ rfq }: Props) {
  const { removeVendorQuote, adoptVendorQuote } = useRFQStore()
  const router = useRouter()
  const [adoptTargetId, setAdoptTargetId] = useState<string | null>(null)
  
  const handleAdopt = (vendorId: string) => {
    // 開啟確認對話框
    setAdoptTargetId(vendorId)
  }
  
  const handleAdoptConfirm = () => {
    if (!adoptTargetId) return
    const qt = adoptVendorQuote(rfq.id, adoptTargetId)
    setAdoptTargetId(null)
    showToast({
      type: 'success',
      message: `已採用 ${getVendor(adoptTargetId)?.vendorName}，已建立報價單 ${qt.qtNumber}`,
    })
    // 回到列表頁
    router.push('/dashboard/sale/inquiry')
  }
  
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-white">
            同行報價
          </div>
          <div className="text-xs text-white/50">
            {rfq.vendorQuotes.length > 0 
              ? `${rfq.vendorQuotes.length} 家已回覆`
              : '尚未有回覆'
            }
          </div>
        </div>
        
        {rfq.vendorQuotes.length === 0 ? (
          <div className="border border-white/10 rounded-lg p-6 text-center">
            <div className="text-xs text-white/40 mb-2">
              尚未有同行回覆
            </div>
            <div className="text-xs text-white/50">
              打電話給同行詢價後，點下方「新增同行報價」記錄
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rfq.vendorQuotes.map((quote) => (
              <VendorQuoteItem
                key={quote.id}
                quote={quote}
                onAdopt={() => handleAdopt(quote.id)}
                onRemove={() => removeVendorQuote(rfq.id, quote.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* 採用確認對話框 */}
      {adoptTargetId && (
        <AdoptQuoteDialog
          rfq={rfq}
          vendorQuoteId={adoptTargetId}
          onConfirm={handleAdoptConfirm}
          onCancel={() => setAdoptTargetId(null)}
        />
      )}
    </>
  )
}

function VendorQuoteItem({ quote, onAdopt, onRemove }: Props) {
  const daysAgo = Math.floor(
    (Date.now() - quote.quotedAt.getTime()) / (24 * 60 * 60 * 1000)
  )
  
  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-4 space-y-3">
      {/* 同行編號 + 名稱 + 時間 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">
            {quote.vendorCode}
          </span>
          <span className="text-sm text-white">
            {quote.vendorName}
          </span>
        </div>
        <span className="text-xs text-white/50">
          {daysAgo} 天前
        </span>
      </div>
      
      {/* 金額 */}
      <div className="text-lg text-white tabular-nums">
        NT$ {quote.price.toLocaleString()}
      </div>
      
      {/* 備註（如有） */}
      {quote.notes && (
        <div className="text-xs text-white/60 border-l-2 border-white/20 pl-2">
          {quote.notes}
        </div>
      )}
      
      {/* 操作按鈕 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onAdopt}
          className="flex-1 h-9 bg-[#1D9E75] text-white text-sm rounded
                     hover:bg-[#1D9E75]/90 transition-colors
                     flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>採用此家</span>
        </button>
        <button
          onClick={onRemove}
          className="h-9 px-3 border border-white/10 text-white/60 text-sm rounded
                     hover:border-[#E24B4A]/60 hover:text-[#E24B4A] transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  )
}
```

## 4.4 「新增同行報價」按鈕 + 彈窗

```tsx
function AddVendorQuoteButton({ rfq }: Props) {
  const [showDialog, setShowDialog] = useState(false)
  
  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="w-full h-11 border border-dashed border-white/20 
                   text-white/70 rounded-lg hover:border-white/40 transition-colors
                   flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span>新增同行報價</span>
      </button>
      
      {showDialog && (
        <VendorQuoteInput
          rfqId={rfq.id}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  )
}

function VendorQuoteInput({ rfqId, onClose }: Props) {
  const { addVendorQuote } = useRFQStore()
  const [vendorCode, setVendorCode] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  
  const canSubmit = vendorCode && vendorName && price && Number(price) > 0
  
  const handleSubmit = () => {
    addVendorQuote(rfqId, {
      id: generateId(),
      vendorCode,
      vendorName,
      price: Number(price),
      notes: notes || undefined,
      quotedAt: new Date(),
    })
    showToast({
      type: 'success',
      message: `已記錄 ${vendorName} 的報價`,
    })
    onClose()
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 
                   rounded-t-2xl sm:rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base text-white">新增同行報價</div>
        
        {/* 同行編號 */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">同行編號</label>
          <input
            type="text"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            placeholder="例：V001"
            className="w-full bg-white/5 border border-white/10 rounded 
                       px-3 py-2 text-sm text-white
                       focus:border-[#E8A020]/60 focus:outline-none"
          />
        </div>
        
        {/* 同行名稱 */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">同行名稱</label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="例：桃園汽材"
            className="w-full bg-white/5 border border-white/10 rounded 
                       px-3 py-2 text-sm text-white
                       focus:border-[#E8A020]/60 focus:outline-none"
          />
        </div>
        
        {/* 報價金額 */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">
            報價金額（單價）
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
              NT$
            </span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded 
                         pl-10 pr-3 py-2 text-sm text-white tabular-nums
                         focus:border-[#E8A020]/60 focus:outline-none"
            />
          </div>
        </div>
        
        {/* 備註（選填） */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">
            備註（選填）
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例：3 天內可到、需先付款"
            className="w-full bg-white/5 border border-white/10 rounded 
                       px-3 py-2 text-sm text-white
                       focus:border-[#E8A020]/60 focus:outline-none"
          />
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-white/20 text-white/80 
                       rounded-lg hover:border-white/40"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cx(
              'flex-[2] h-11 rounded-lg font-medium transition',
              canSubmit
                ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            )}
          >
            送出
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 4.5 採用後的確認對話框（核心互動）

這是 Phase 7 最戲劇性的時刻：業務選了便宜的同行，系統要產生 QT 報價單。

```tsx
function AdoptQuoteDialog({ rfq, vendorQuoteId, onConfirm, onCancel }: Props) {
  const vendor = rfq.vendorQuotes.find(v => v.id === vendorQuoteId)!
  const tierMargin = TIER_TARGET_MARGIN[rfq.sourceCustomer.tier]
  const suggestedPrice = Math.round(vendor.price * (1 + tierMargin / 100))
  
  const [finalPrice, setFinalPrice] = useState(suggestedPrice)
  
  const margin = finalPrice - vendor.price
  const marginRate = (margin / finalPrice) * 100
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 
                   rounded-t-2xl sm:rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-[#1D9E75]" />
            <div className="text-base text-white">
              採用 {vendor.vendorName}
            </div>
          </div>
          <div className="text-xs text-white/60">
            系統將自動建立報價單給 {rfq.sourceCustomer.name}
          </div>
        </div>
        
        {/* 成本資訊 */}
        <div className="border border-white/10 bg-white/5 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">同行成本</span>
            <span className="text-white tabular-nums">
              NT$ {vendor.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">
              {rfq.sourceCustomer.tier} 級目標毛利率
            </span>
            <span className="text-white tabular-nums">
              {tierMargin}%
            </span>
          </div>
        </div>
        
        {/* 售價編輯 */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">
            給客戶的報價（可調整）
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
              NT$
            </span>
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(Number(e.target.value))}
              className="w-full bg-white/5 border border-[#E8A020]/60 rounded 
                         pl-10 pr-3 py-3 text-base text-white tabular-nums
                         focus:outline-none"
            />
          </div>
          <div className="text-xs text-white/40 mt-1">
            系統建議：NT$ {suggestedPrice.toLocaleString()}（{tierMargin}% 毛利）
          </div>
        </div>
        
        {/* 即時毛利試算 */}
        <div className="border border-white/10 bg-white/5 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-white/50">預估毛利</span>
            <span className="text-white/80 tabular-nums">
              NT$ {margin.toLocaleString()} ({marginRate.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{rfq.sourceCustomer.tier} 級目標</span>
            <span className={cx(
              marginRate >= tierMargin ? 'text-[#1D9E75]' : 'text-[#E8A020]'
            )}>
              {tierMargin}%
              {marginRate >= tierMargin ? ' ✓ 達標' : ' ⚠ 略低'}
            </span>
          </div>
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 border border-white/20 text-white/80 
                       rounded-lg hover:border-white/40"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(finalPrice)}  // 傳最終價格
            className="flex-[2] h-11 bg-[#1D9E75] text-white font-medium rounded-lg
                       hover:bg-[#1D9E75]/90"
          >
            確認建立報價單
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 4.6 「全部不採用，結案」按鈕

```tsx
function AbandonButton({ rfq }: Props) {
  const { updateRFQ } = useRFQStore()
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  
  const handleAbandon = () => {
    updateRFQ(rfq.id, { status: 'abandoned' })
    showToast({
      type: 'success',
      message: `已結案 ${rfq.rfqNumber}（全部不採用）`,
    })
    router.push('/dashboard/sale/inquiry')
  }
  
  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full h-11 border border-white/10 text-white/50 
                   rounded-lg hover:border-[#E24B4A]/40 hover:text-[#E24B4A]
                   transition-colors"
      >
        全部不採用，結案
      </button>
      
      {showConfirm && (
        <ConfirmDialog
          title="確定要結案嗎？"
          message="結案後這張詢價單將不再出現在待辦清單。"
          onConfirm={handleAbandon}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

---

# 📦 PART 5：Phase 7-5 採用後生成 QT + 狀態追蹤新分類

## 5.1 QT 型別定義

```ts
// types.ts
export interface QT {
  id: string
  qtNumber: string            // QT-YYMM-xxxxx
  customer: {
    code: string
    name: string
    tier: 'A' | 'B' | 'C' | 'D'
  }
  part: {
    sku: string
    name: string
  }
  quantity: number
  vendorCost: number          // 採用的同行成本
  suggestedPrice: number      // 系統建議售價
  finalPrice: number          // 業務最終決定售價
  source: 'inquiry' | 'direct'  // 來源：同行調貨 / 直接報價
  sourceRFQNumber?: string    // 來源 RFQ（如有）
  status: 'pending_customer' | 'accepted' | 'rejected' | 'expired'
  createdAt: Date
}
```

## 5.2 狀態追蹤加「待確認報價」群組

StatusSection.tsx 的 TodoSection 要加第 4 個群組：

```tsx
function TodoSection() {
  const { rfqs, qts } = useRFQStore()
  
  const inquiryTodos = useMemo(() => 
    rfqs
      .filter(r => r.status === 'waiting' || r.status === 'responded')
      .map(rfqToTodoItem),
    [rfqs]
  )
  
  const qtTodos = useMemo(() => 
    qts
      .filter(q => q.status === 'pending_customer')
      .map(qtToTodoItem),
    [qts]
  )
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white">待辦追蹤</span>
        </div>
        <span className="text-xs text-white/50">
          共 {inquiryTodos.length + qtTodos.length + MOCK_SALES_TODOS.length + MOCK_WARRANTY_TODOS.length} 筆
        </span>
      </div>
      
      <TodoGroup 
        title="詢價待回覆"
        items={inquiryTodos}
        emptyText="目前沒有等待回覆的詢價"
      />
      
      {/* 🆕 新增：採用詢價後產生的 QT */}
      <TodoGroup 
        title="待確認報價"
        items={qtTodos}
        emptyText="目前沒有等待客戶確認的報價"
      />
      
      <TodoGroup 
        title="銷售待出貨"
        items={MOCK_SALES_TODOS.map(soToTodoItem)}
        emptyText="目前沒有待出貨的銷售單"
      />
      
      <TodoGroup 
        title="保固待結果"
        items={MOCK_WARRANTY_TODOS.map(wrToTodoItem)}
        emptyText="目前沒有待處理的保固"
      />
    </div>
  )
}
```

## 5.3 QT 點進去 placeholder

`/dashboard/sale/docs/quote/[qtId]/page.tsx` 可以是簡單的 placeholder 頁，顯示 QT 的基本資訊，但不實作「客戶確認 → 轉 SO」流程（那是 R9 的事）：

```tsx
function QTDetailPage() {
  const { qtId } = useParams()
  const qt = useRFQStore((s) => s.qts.find(q => q.id === qtId))
  
  if (!qt) return <NotFoundPage />
  
  return (
    <div className="min-h-dvh flex flex-col p-4 space-y-4">
      {/* QT 基本資訊 */}
      <div className="border border-white/10 bg-white/5 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono text-white/80">{qt.qtNumber}</span>
          <span className="text-xs bg-[#E8A020]/15 text-[#E8A020] px-2 py-0.5 rounded">
            等待客戶確認
          </span>
        </div>
        
        {/* 客戶 / 料號 / 數量 / 售價 */}
        ...
        
        {/* 來源：同行調貨 */}
        {qt.source === 'inquiry' && (
          <div className="border-l-2 border-white/20 pl-3 text-xs text-white/60">
            來源：同行調貨 {qt.sourceRFQNumber}
          </div>
        )}
      </div>
      
      {/* Placeholder 說明 */}
      <div className="border border-white/10 bg-white/5 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-white/60" />
          <div className="text-sm text-white">後續流程（未來實作）</div>
        </div>
        <div className="text-xs text-white/60 pl-6 space-y-1">
          <div>客戶確認報價 → 建立調貨單 TI</div>
          <div>向同行調貨 → 貨進公司（庫存 +）</div>
          <div>建立銷貨單 SO → 正常出貨（庫存 -）</div>
        </div>
        <div className="text-xs text-white/40 pl-6 pt-2">
          此部分預計於春酒後 R9 實作
        </div>
      </div>
    </div>
  )
}
```

**QT 點進去至少能看到「這張報價從哪來、要給誰、多少錢」**。後續「確認 → 調貨 → 出貨」則明白標註「未來實作」。

---

# 📦 PART 6：Phase 7-6 整合測試 + 最終清理

## 6.1 完整 Demo 路徑走一遍

從 SOP 缺貨到產生 QT，完整路徑：

```
1. /dashboard/sale → 狀態追蹤（預設）
   看到：詢價待回覆 3 筆 + 待確認報價 0 筆 + 銷售 4 + 保固 1

2. 工作站 → 國內銷售 → 進 SOP
3. STEP 1 選 B0213 台北保養廠
4. STEP 2 搜「剎車片」→ 展開 SKU-016 → 數量 2
   看到：「目前全公司無庫存」金色按鈕
5. 點按鈕 → 出現兩個選項
6. 選「向同行調貨」→ toast：「已建立詢價單 RFQ-2604-00098，可至『同行調貨』處理」
   → 繼續在 STEP 2

7. 退出 SOP → 回 /dashboard/sale → 狀態追蹤
   看到：詢價待回覆 4 筆（新增了 RFQ-2604-00098）

8. 切「工作站」→ 點「同行調貨」
   → 看到 RFQ 列表 4 筆
   
9. 點 RFQ-2604-00098 → 詳情頁
   看到：來源客戶 B0213、料號 SKU-016、數量 2、同行報價 0 家

10. 點「+ 新增同行報價」→ 填：
    同行編號：V001
    同行名稱：桃園汽材
    金額：500
    備註：3 天內可到
    送出 → toast：「已記錄桃園汽材的報價」

11. 再點「+ 新增同行報價」→ 填：V002 台中源豐 / 480
12. 再點「+ 新增同行報價」→ 填：V003 高雄聯欣 / 450

13. 現在有 3 家報價，業務看 V003 最便宜
    點 V003 旁邊「採用此家」
    → 出現採用對話框：
      同行成本 NT$ 450
      B 級毛利 27%
      建議售價：NT$ 572（可改）
    → 業務調成 NT$ 600 （多賺一點）
    → 即時毛利試算：NT$ 150 (25.0%) ⚠ 略低
    → 算了還是用 572 吧，改回 572
    → 毛利 NT$ 122 (21.4%) ⚠ 略低（嗯這個太低）
    → 改成 600：毛利 NT$ 150 (25.0%) 還是不達標
    → 改成 620：毛利 NT$ 170 (27.4%) ✓ 達標 ← 業務決定這個
    → 點「確認建立報價單」
    → toast：「已採用桃園汽材，已建立報價單 QT-2604-00032」
    → 自動回 RFQ 列表

14. 回狀態追蹤
    看到：詢價待回覆 3 筆（RFQ-2604-00098 消失了）
         待確認報價 1 筆（QT-2604-00032）← 🆕

15. 點 QT-2604-00032 → 看 QT 詳情 placeholder
    看到：B0213 / SKU-016 / 數量 2 / 售價 NT$ 620
    看到：來源：同行調貨 RFQ-2604-00098
    看到：「後續流程（未來實作）」說明

16. Demo 結束
```

## 6.2 反向驗收

```
確認沒破壞的東西：
  ✅ R6 SOP 9 step 完整走完（除了缺貨救援的新分流）
  ✅ R5 採購 SOP 未受影響
  ✅ 首頁自定義快捷鍵未受影響
  ✅ 桌面版銷售中心未受影響
```

## 6.3 型別檢查

```
pnpm --filter nx-ui exec tsc --noEmit
```

---

# 🚨 嚴格紀律

## 必須遵守

```
✅ 庫存哲學：全程庫存 >= 0（不產生 SO、不扣庫存）
✅ 單據鏈：RFQ → QT（不跳過階段）
✅ 來源追蹤：QT 要記錄 sourceRFQNumber
✅ 穩重風格延續（零 emoji、金色收斂）
✅ 數字用 tabular-nums
✅ 料號用 font-mono
✅ commit 同步更新 R7 v2 spec 檔案
```

## 禁止

```
❌ 不要跳 RFQ 直接做 SO（違反你的庫存哲學）
❌ 不要實作 TI 調貨單（R9 再做）
❌ 不要改 R6 SOP 內部流程（只改 Step2 底部按鈕區）
❌ 不要改其他中心
❌ 不要動桌面版
```

---

# 📋 開發順序

```
Phase 7-1（30 分鐘）：缺貨按鈕改選單
Phase 7-2（15 分鐘）：工作站加項目
Phase 7-3（90 分鐘）：RFQ Mock + 列表頁 + Zustand store
Phase 7-4（180 分鐘）：RFQ 詳情頁（新增報價、採用對話框、毛利試算）
Phase 7-5（60 分鐘）：QT 生成邏輯 + 狀態追蹤新分類
Phase 7-6（45 分鐘）：整合測試 + spec sync

總估：7 小時
```

可以分兩個 commit：
- 7-1~7-3（約 2.5 小時，基礎建設）
- 7-4~7-6（約 4.5 小時，核心互動）

---

# 📋 完成回報格式

```markdown
## R7 Phase 7-X 完成回報

### Phase 7-X code 改動
- [x] ...

### Spec 同步
- [x] Phase 進度表更新 7-X 狀態
- [x] R7 主 spec 的 Part 8 / Part 9 如有過時請同步修正

### 偏差說明（如有）

### Commit hash

### Crown 驗收路徑
git fetch origin && git pull
pnpm --filter nx-ui dev

驗收項目：
1. /dashboard/sale/sop-demo STEP 2 選 SKU-016 → 底部改成金色「目前全公司無庫存」
2. 點按鈕 → 出現 A/B 選項彈窗
3. 選 A → toast 提示 + 新 RFQ 建立
4. 狀態追蹤：詢價待回覆數字 +1
5. 工作站 → 同行調貨 → 看到 RFQ 列表
6. 點 RFQ → 詳情頁，輸入 3 家同行
7. 點「採用」最便宜 → 試算毛利 + 售價可改 → 確認
8. toast：「已建立報價單 QT-xxx」
9. 狀態追蹤：待確認報價 +1
10. 點 QT → 詳情頁 placeholder
```

---

# 🎯 春酒 Demo Pitch 最強版（完整 Phase 7 後）

```
Crown：「我示範最硬核的業務場景 — 客戶問的零件，全公司都沒貨。」

（在 SOP 打 SKU-016 → 缺貨分流出現）

Crown：「傳統做法，業務就說『對不起沒貨』，這單沒了。
       NEXORA 給業務兩條活路。」

（點向同行調貨）

Crown：「業務按一下 → 系統記下：『這客戶要這個零件』。
       業務繼續現場流程，不打斷客戶。」

（回銷售中心 → 狀態追蹤）

Crown：「回公司，業務點待辦 → 看到剛剛那張詢價單。」

（點 RFQ → 輸入 3 家同行 → 看到比價）

Crown：「業務打電話問 3 家同行，邊問邊記。
       V001 五百、V002 四百八、V003 四百五。
       V003 最便宜，點採用。」

（採用對話框出現，毛利試算）

Crown：「看這裡，系統自動算好：
       同行成本 450 × B 級毛利 27% = 建議售價 572
       業務可以改，想多賺改高，客戶難搞改低。
       即時看到毛利率有沒有達標。」

Crown：「確認 → 系統自動建報價單 QT，寄給客戶。
       這張報價單帶著『來源 RFQ-2604-00098』的標記。
       未來看歷史可以追溯『這張賣的零件是從哪家同行調來的』。」

（回狀態追蹤）

Crown：「詢價少一筆、報價多一筆。流程清清楚楚。」

Crown：「最後重點 — 這時候我還沒調貨、還沒扣庫存。
       因為客戶還沒確認價格。
       系統庫存永遠 >= 0，這是 ERP 的基本功。
       客戶確認了才去跟同行調貨、才出貨給客戶。」

對方老闆：「...這個真的很硬，每個細節都對。」
Crown：「對，因為我是做這行的。」
```

---

# 🚀 開工

Phase 7 是 R7 的真正收官戰。完成後：
- 春酒 demo 可展示「SOP + 缺貨分流 + 同行調貨 + 生成報價單」完整真實業界流程
- NEXORA 在「懂業界」這個維度徹底勝出

**前置檢查**：
- 在 `feature/demo-emergency` 分支
- pull 最新（應是 commit 514cc9a）
- 確認 Zustand 已安裝（如果沒有，`pnpm add zustand` 在 nx-ui workspace）

開工！🫡
