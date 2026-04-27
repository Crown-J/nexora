<!-- docs/nx04/spec/impl/w2-mini-impl_workstation.md -->
# W2-mini 實作 spec — 國內銷貨工作台（雙平台 Pilot）

> 文件類型：實作 spec（Hank 對照真實 codebase 寫，給自己照著實作 + 給 Alex review）
> 撰寫者：Hank
> 日期：2026-04-27
> 對應意圖：[../intent/w2-mini-intent.md](../intent/w2-mini-intent.md) v1.0
> 對照基準：盤點清單 [_alex-prep_w2-existing-inventory.md](../intent/_alex-prep_w2-existing-inventory.md) + Phase 0 D4/B5/B2 落地
> 狀態：**待 Alex review** → 拍板後才寫程式碼

---

## 0. 文件性質

把 W2-mini 意圖 v1.0 的 7 個桌面節點 + 3 個手機節點 + 5 個 API 串接 + 5 條核心邏輯，對應到**真實 nx-ui codebase 結構** + Phase 0 落地的後端 API 的實作藍圖。

跟 D3-impl / D4-impl / B5-impl / B2-impl 同節奏：先列**真實 codebase 關鍵發現**（含意圖版 4 個 catch 點），再列**5 個工程取捨拍板**，再列 **store 升級對照表**（Crown 附加要求），最後給程式碼骨架 + 4 sub-phase + 測試 + DoD。

---

## 1. 真實 codebase 的關鍵發現（4 個 catch 點來源）

### 1.1 ⚠️ 意圖 §5.2 + §11.1「進駐 WorkstationSection」概念混淆

意圖寫「W2-mini 進駐 R7 既有 `WorkstationSection.tsx`」+ §11.1「桌面版可能掛在 WorkstationSection.tsx 內或子資料夾」。

**問題**：聽起來像 in-place rendering（W2-mini 直接 render 在 WorkstationSection 內），但 in-place 會：
- WorkstationSection 變超重（單 component 包整個工作台）
- W2-mini 沒 deeplink（業務無法 bookmark `/dashboard/sale/w2`）
- URL 跟 `?section=workstation` 耦合（業務按 back 退出整個 hub）

→ **取捨點 §2.1**：路由實體獨立 + WorkstationSection 加連結卡

### 1.2 ⚠️ 意圖 §5.4「既有 store actions 命名也對齊後端」過度樂觀

實際對照 client store actions vs Phase 0 後端 endpoint，**至少 5 處 mismatch**：

| Client action 簽章 | 後端對應 | 主要差異 |
|---|---|---|
| `useSalesStore.createSO({ customer, items, createdBy })` | D4 `POST /nx04/so/translate` | client 用 `customer`/`items` 簡化結構，server 用 `TranslateSoDto` 含 `customerId/lineItems[]/deliveryType/taxRate/currencyId/warehouseId`；client 沒帶 transferSourceType / transferSourceRef |
| `useSalesStore` 內部 `analyzeSO()` (sysC.ts) | D4 `Nx04SoTranslatorService.translate()` | client SYS-C 是純 client 邏輯（含 advisory lock 模擬），server 含真 advisory lock + retry + 4 trigger 觸發 |
| `useRFQStore.adoptVendorQuote(rfqId, vendorQuoteId, finalPrice)` | B5 `POST /nx02/qt/:id/adopt` | client 三參數、server 一參數（qtId）；finalPrice 在 server 不需要（用 quotedPrice）；vendorQuoteId 跟 nx02_qt.id 對應關係要重新規劃 |
| `useRFQStore.createCustomerOrder({ customer, part, quantity })` | D4 自動建 nx04_co | client 是業務直接呼、server 是 D4 translator type='B' 自動建。**業務不直接呼 createCustomerOrder** |
| `useRFQStore.createRFQ({ customer, part, quantity })` | D4 自動建 nx02_rfq stub | client 業務直接呼、server 是 D4 type='G' 自動建。**業務不直接呼 createRFQ** |

→ **§3 完整對照表**（Crown 附加要求）

### 1.3 桌面/手機 routing 策略（catch #3）

意圖 §5.3 提案 (a) 兩份獨立 component + 共享 store + API client。但**沒講清楚是路由分流還是同 page responsive**。

既有模式：
- `/dashboard/sale/page.tsx` 同檔案內桌面手機混合（responsive class 切）
- `/dashboard/sale/sop-demo/page.tsx` 是 mobile-only 薄殼（直接 render `<MobileSaleSopPage />`）

→ **取捨點 §2.2**：採同 page.tsx responsive 切（對齊 sale page.tsx 既有模式）

### 1.4 sysC.ts 處置（catch #4）

意圖 §11.3「不刪、不改、保留給 sop-demo」是對的，但測試案 §10「並存 sop-demo 不互相影響」實作起來無從驗證（兩個 page 本來就不共用 state）。

→ **取捨點 §2.5**：改成 lint check「W2-mini 內部沒 import sysC.ts」

### 1.5 既有 sale page.tsx 桌面區塊（W2-mini 桌面入口要掛這裡）

[apps/nx-ui/src/app/dashboard/sale/page.tsx](apps/nx-ui/src/app/dashboard/sale/page.tsx)：
- 桌面區塊用 `ModuleHubSection` + `HubLinkCard` 排版
- Phase 6 註解寫「桌面版維持原樣（待後續重構）」
- 手機版直接 render `<SalesHubMobile />`

W2-mini 桌面入口加在桌面區塊（跟 STEP 1~5 占位卡並列），手機入口加在 `WorkstationSection.tsx` 的 cards array。

---

## 2. 工程取捨（5 個給 Alex 拍板）

### 取捨 1（catch #1）：路由實體位置 — **獨立路由 + 連結卡**

```
路由實體：    /dashboard/sale/w2/page.tsx                    ← W2-mini 主入口（新建）
            apps/nx-ui/src/features/sale/ui/w2-mini/*       ← 元件（新建）

入口 1（手機）：apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx
              加 1 張 HubLinkCard 連結到 /dashboard/sale/w2

入口 2（桌面）：apps/nx-ui/src/app/dashboard/sale/page.tsx 桌面 ModuleHubSection
              加 1 張 HubLinkCard 連結到 /dashboard/sale/w2

不動：       /dashboard/sale/sop-demo/                      ← R6 demo（client mock）
            /dashboard/sale/page.tsx 手機版整體結構
            /dashboard/sale/inquiry/                       ← R7 Phase 7 詢價工作台
            /dashboard/nx04/* placeholder                   ← v2 命名空間
```

**選獨立路由理由**：
- W2-mini 可獨立 deeplink（業務 bookmark / 桌面捷徑）
- WorkstationSection 保持輕量（只有連結卡）
- URL 跟 `?section=workstation` 解耦
- 業務按 back 退到 hub（不退出整個 dashboard）

**避開 in-place rendering 方案**理由：見 §1.1。

### 取捨 2（catch #3）：桌面/手機切換 — **同 page.tsx responsive 切**

```typescript
// apps/nx-ui/src/app/dashboard/sale/w2/page.tsx
'use client';
import { W2DesktopWorkstation } from '@/features/sale/ui/w2-mini/desktop/W2DesktopWorkstation';
import { W2MobileWorkstation } from '@/features/sale/ui/w2-mini/mobile/W2MobileWorkstation';

export default function W2MiniPage() {
  return (
    <>
      <div className="hidden md:block">
        <W2DesktopWorkstation />
      </div>
      <div className="md:hidden">
        <W2MobileWorkstation />
      </div>
    </>
  );
}
```

**理由**：
- 對齊 sale page.tsx 既有模式（同 page 桌面手機混合）
- 兩個 component 完全獨立（意圖 §5.3 (a)）但共享 store + API client
- 不需要 next.js routing 分流
- 業務手機/桌面 URL 一致（同一 deeplink 兩個版本都看得到）

### 取捨 3：store 升級策略 — **既有 store + adapter 層 + feature flag**

**方案**：
- (a) 新建 W2-mini 專用 store（隔離）
- (b) 升級既有 store + feature flag 切 mock vs real
- (c) 既有 store 廢棄、重新發明

**選 (b) 變體：既有 store 結構保留、actions 內部加 adapter 層**

```typescript
// 偽碼示意
useSalesStore = create((set, get) => ({
  createSO: async (input) => {
    if (USE_REAL_API) {
      const result = await fetch('/api/nx04/so/translate', { ... });
      // adapter: server response → client SO shape
      return adaptServerSoToClient(result);
    } else {
      // 既有 sysC.ts 路徑（保留給 sop-demo）
      return analyzeSO(input);
    }
  },
}))
```

**理由**：
- 既有 store 結構（SO/IT/TI/PK/BX/DN 6 種單據）對齊 W2-mini 需求
- adapter 層處理 server↔client schema 不一致（§3 對照表）
- feature flag 讓 sop-demo 走舊路徑、W2-mini 走新路徑
- 若整體切完成、feature flag 砍掉、adapter 變唯一路徑

**取捨 4 一起決定 feature flag 機制**。

### 取捨 4（意圖 §8 Q3）：feature flag 機制 — **環境變數 `NEXT_PUBLIC_W2_USE_REAL_API`**

選項：
- (a) URL query param `?mock=1`
- (b) 環境變數 `NEXT_PUBLIC_W2_USE_REAL_API`
- (c) 路由本身分流（路徑就決定走哪個）

**選 (b) 理由**：
- 跟 next.js 環境變數慣例一致
- 不污染 URL（業務 bookmark / 分享連結不會含 flag）
- 開發 vs 生產可在 .env / Vercel env 切換
- (c) 路由分流跟取捨 1（獨立路由 + sop-demo 並存）已經做到了，不需 store 層再分流

⚠️ **預設值**：`NEXT_PUBLIC_W2_USE_REAL_API=true` 在生產 / dev 環境（W2-mini 走真 API）。**只有 sop-demo 內部**走舊 sysC.ts 路徑（透過 adapter 內 import 既有 sysC）。

### 取捨 5（catch #4）：sop-demo 並存驗證 — **lint check 替代 e2e 測試**

意圖 §10 「並存 sop-demo 不互相影響 1 案」改成：
- ESLint rule：W2-mini 元件目錄（`features/sale/ui/w2-mini/**`）禁止 import `sysC.ts`
- ESLint rule：sop-demo 元件目錄（`features/sale/ui/sop-workspace/**`）禁止 import W2-mini 內部 module（避免反向耦合）

**理由**：
- e2e 測「兩個 page 不互相影響」trivially true（state 本來就不共用）
- lint 檢查可在 CI 執行、開發時即時 catch
- sop-demo 的「保留並存」由 lint 結構性保證，不是 runtime 偶然

---

## 3. Store 升級對照表（Crown 附加要求）

### 3.1 useSalesStore (fulfillment) 完整對照

| 既有 action | 簽章 | 後端對應 | 處理方式 |
|---|---|---|---|
| `createSO` | `({ customer, items, createdBy }) => CreateSOResult` | D4 `POST /nx04/so/translate` | **rename + 改實作**：保留 `createSO` 名稱，內部呼 D4。adapter 層把 client `customer/items` 轉成 server `customerId/lineItems[]/deliveryType/taxRate/currencyId/warehouseId/transferSourceType/transferSourceRef`。回傳值 adapter 把 server `TranslateSoResult.lineItems[]` 轉回 client `SO/IT/TI/PK` shape。|
| `executeTransfer` | `(itId) => void` | NX03 ST 出庫（**未實作後端**）| **保留 client mock**：Phase 1 W2-mini 不負責 ST 出貨，留 client 模擬。Phase 2 W6 工作台時對接 |
| `completeTransfer` | `(itId) => void` | NX03 ST 入庫（**未實作後端**）| 同上 |
| `pickupInquiry` | `(tiId) => void` | TI 收貨（**屬 NX02 採購收貨範圍**，未實作後端）| 同上 |
| `completeInquiry` | `(tiId) => void` | TI 完成（同上）| 同上 |
| `completePicking` | `(pkId) => void` | NX03 picking（**未實作後端**）| **保留 client mock**：W2-mini 節點 5 出貨追蹤是純讀取、不寫入。Phase 2 真接通 |
| `completePacking` | `(bxId) => void` | NX03 packing（同上）| 同上 |
| `completeDelivery` | `(dnId) => void` | NX06 delivery（同上）| 同上 |

**核心結論**：**只有 `createSO` 需要對接後端**，其他 7 個 actions 對應的後端 service 都還沒實作（Phase 2+ 範圍），W2-mini Phase 1 保留 client mock 處理。

### 3.2 useRFQStore (inquiry) 完整對照

| 既有 action | 簽章 | 後端對應 | 處理方式 |
|---|---|---|---|
| `createRFQ` | `({ customer, part, quantity, createdBy }) => RFQ` | D4 type='G' **自動建** RFQ stub（業務不直接呼）| **廢棄**：W2-mini 業務不直接建 RFQ，由 D4 translator 在 createSO 時自動建。client 此 action 留給 sop-demo 用 |
| `createCustomerOrder` | `({ customer, part, quantity, createdBy }) => CustomerOrder` | D4 type='B' **自動建** nx04_co（業務不直接呼）| **廢棄**：同上邏輯 |
| `addVendorQuote` | `(rfqId, input) => void` | B5 `POST /nx02/qt`（採購輸入同行報價）| **rename + 移責任**：W2-mini 業務不輸入同行報價（屬 W4 採購工作台）。client 此 action 留給 sop-demo |
| `removeVendorQuote` | `(rfqId, quoteId) => void` | 後端無對應（B5 不允許刪 QT，只允許 reject）| **廢棄**：sop-demo 客戶端概念，W2-mini 不需 |
| `adoptVendorQuote` | `(rfqId, vendorQuoteId, finalPrice) => QT` | B5 `POST /nx02/qt/:id/adopt`（**屬 W4 採購工作台**）| **rename + 移責任**：W2-mini 業務不採用 QT。W2-mini 只「等」採購採用、polling 看到 TI 已建 |
| `abandonRFQ` | `(rfqId) => void` | B5 `POST /nx02/rfq/:id/cancel` | **rename + 改實作**：W2-mini 節點 2「取消詢價」對應這個。adapter 把 client `abandonRFQ` 轉成 server cancelRfq + cancelReason |
| `createDirectQTs` | `({ customer, items }) => void` | 沒有對應後端（client-only 直接報價場景）| **廢棄**：sop-demo 場景，W2-mini 不需 |

**核心結論**：W2-mini 業務只負責 RFQ 的「建（自動）」「取消」「list 看狀態」三件事；採用 QT、輸入同行報價屬 W4 採購工作台（Phase 2）。

### 3.3 sysC.ts 處置矩陣

| 處理對象 | 是否動 | 原因 |
|---|---|---|
| `apps/nx-ui/src/features/sale/ui/fulfillment/sysC.ts` | **不動** | 保留給 sop-demo 用（Crown Q3 拍板「並存」） |
| `apps/nx-ui/src/features/sale/ui/sop-workspace/*` | **不動** | sop-demo 主力，意圖 §11.3 寫死「保留」 |
| W2-mini 內部 import sysC | **lint 禁止** | 取捨 5 lint check |

### 3.4 升級 vs 廢棄決策矩陣

| 場景 | useSalesStore | useRFQStore |
|---|---|---|
| sop-demo 走 client mock | 走既有路徑（feature flag false） | 走既有路徑 |
| W2-mini 走真 API | createSO 經 adapter 呼 D4，其他 actions 留 client mock | 業務只用 cancelRfq 對應 abandonRFQ；其他 actions 廢棄不用（store 內保留供 sop-demo） |

**adapter 層位置**：
- `apps/nx-ui/src/features/sale/ui/w2-mini/api/sales-adapter.ts`（新建）— 處理 createSO request/response 轉換
- `apps/nx-ui/src/features/sale/ui/w2-mini/api/rfq-adapter.ts`（新建）— 處理 abandonRFQ + RFQ list 反查

⚠️ **adapter 不放進既有 store 內**，避免污染 sop-demo 用的 store。store action 內透過 USE_REAL_API flag 條件 import adapter。

---

## 4. 程式碼結構

### 4.1 路由結構

```
apps/nx-ui/src/app/dashboard/sale/
├── page.tsx                    ← 既有（不動，桌面區塊加 W2 連結卡 1 行）
├── sop-demo/page.tsx           ← 既有（不動）
├── inquiry/                    ← 既有（不動）
└── w2/                         ← 新建
    └── page.tsx                ← responsive 切桌面/手機 component
```

### 4.2 桌面版 component 樹

```
apps/nx-ui/src/features/sale/ui/w2-mini/desktop/
├── W2DesktopWorkstation.tsx           ← 主容器（節點切換器）
├── nodes/
│   ├── StockQueryNode.tsx              ← 節點 1 查庫存（串 B2 summary）
│   ├── InquiryNode.tsx                 ← 節點 2 詢價（看 RFQ list、可 cancel）
│   ├── QuoteNode.tsx                   ← 節點 3 報價（看 QT 後加毛利）
│   ├── SalesNode.tsx                   ← 節點 4 銷貨（送 SO，串 D4）
│   ├── ShipmentNode.tsx                ← 節點 5 出貨追蹤（純讀，串 B2 reservations）
│   ├── CompletedNode.tsx               ← 節點 6 完成池（純讀）
│   └── CrossWorkstationLink.tsx        ← 節點 7 跳 W6 / W4（串 D5）
├── components/
│   ├── NodeNavigation.tsx              ← 7 節點切換 tab
│   ├── StockSummaryCard.tsx            ← 三個數字 + 可承諾
│   ├── ReservationDrawer.tsx           ← 反查 reserved 來源（B2 reservations）
│   ├── LineItemEditor.tsx              ← 編輯 SO line item + transferSourceType 選擇
│   ├── PendingInquiryStatus.tsx        ← type='G' 中間態狀態顯示
│   └── TypeGStateBadge.tsx             ← 「等同行回價」/「TI 已建」狀態標
└── hooks/
    ├── useStockSummary.ts              ← 串 B2 summary
    ├── useReservations.ts              ← 串 B2 reservations
    ├── useCreateSO.ts                  ← 串 D4 translate（透過 adapter）
    ├── useRfqList.ts                   ← 串 B5 list-for-purchase
    └── usePollTypeGStatus.ts           ← polling type='G' 中間態（取捨 6 細節）
```

### 4.3 手機版 component 樹

```
apps/nx-ui/src/features/sale/ui/w2-mini/mobile/
├── W2MobileWorkstation.tsx            ← 主容器（3 節點切換）
├── nodes/
│   ├── StockQueryMobile.tsx            ← 節點 1 觸控優先 search
│   ├── CreateSoMobile.tsx              ← 節點 2 簡化 SO 建單（1~2 line items only）
│   └── StatusListMobile.tsx            ← 節點 3 看本人最近 5 筆 SO 狀態
└── components/
    ├── ComplexOrderFallback.tsx        ← Q5 複雜訂單 fallback 提示
    └── 共用 desktop 的 StockSummaryCard / TypeGStateBadge（responsive friendly）
```

### 4.4 共用 utils + API client

```
apps/nx-ui/src/features/sale/ui/w2-mini/
├── api/
│   ├── client.ts                  ← fetch wrapper（含 JWT、tenantId、error mapping）
│   ├── sales-adapter.ts           ← createSO request/response 轉換（§3.4）
│   ├── rfq-adapter.ts             ← cancelRfq + list 轉換
│   ├── stock-adapter.ts           ← B2 summary + reservations 轉換
│   └── types.ts                   ← server DTO + client model 對照型別
├── feature-flags.ts               ← USE_REAL_API（取捨 4）
└── types.ts                       ← W2-mini 自有 type（不污染既有 store）
```

### 4.5 既有檔案改動清單

| 檔 | 改動 | 影響範圍 |
|---|---|---|
| `apps/nx-ui/src/app/dashboard/sale/page.tsx` | 桌面區塊加 1 張 W2 連結卡 | + ~5 行 |
| `apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx` | cards array 加 1 筆 W2 entry | + ~3 行 |
| `apps/nx-ui/src/features/sale/ui/fulfillment/store.ts` | createSO 內加 USE_REAL_API 分支 | + ~10 行 |
| `apps/nx-ui/src/features/sale/ui/inquiry/store.ts` | abandonRFQ 內加 USE_REAL_API 分支 | + ~10 行 |
| `.eslintrc.*` | 加 sysC.ts import 限制 rule | + ~5 行 |

**既有 sop-demo / R7 sections / sysC.ts 完全不動**。

---

## 5. 4 個 sub-phase 拆分（對齊意圖 §11.5）

### Phase 1A（~1 週）— 桌面骨架

目標：W2-mini 桌面入口可進、能跑「查庫存 → 送 SO → 看狀態」最小完整鏈。

交付：
- 路由 `/dashboard/sale/w2/page.tsx` + responsive 殼
- WorkstationSection / sale page.tsx 加連結卡
- 桌面節點 1（StockQueryNode）+ 串 B2 summary
- 桌面節點 4（SalesNode）+ 串 D4 translate（簡化版：只支援 type='S'）
- 桌面節點 5（ShipmentNode）+ 串 B2 reservations 純讀
- store adapter 層（sales-adapter + stock-adapter）
- USE_REAL_API feature flag

**完成驗證**：業務從 sale hub 點 W2 進去，查料號 → 送 SO type='S' → 看到 SO 進入「已送出」狀態。

### Phase 1B（~1 週）— 桌面完整節點

目標：補齊 type='T'/'G'/'B' + 節點 2/3/6 + 跳 W6/W4。

交付：
- LineItemEditor 支援 transferSourceType 選擇（S/T/G/B）
- D4 translate 帶 transferSourceRef 參數
- type='G' 中間態：PendingInquiryStatus + usePollTypeGStatus（5 秒 polling RFQ list 看 status 變化）
- 節點 2 InquiryNode（B5 list-for-purchase + cancelRfq）
- 節點 3 QuoteNode（從 list 取 QT、加毛利、純展示用）
- 節點 6 CompletedNode（B2 reservations filter 已完成 SO）
- 節點 7 CrossWorkstationLink（D5 navigation policy 串）
- store adapter rfq-adapter

**完成驗證**：業務送 SO type='G' → 看到 RFQ stub 已建 → 採購（手動模擬）採用 QT → polling 看到 TI 已建 → SO line item.transferStatus='C'。

### Phase 1C（~1 週）— 手機精簡

目標：手機版 3 節點（查庫存 / 簡化送 SO / 看狀態）。

交付：
- W2MobileWorkstation 主容器
- 節點 1 StockQueryMobile（觸控優化）
- 節點 2 CreateSoMobile（限 1~2 line items + 預設 type='S'）
- 節點 3 StatusListMobile（業務本人最近 5 筆 SO）
- ComplexOrderFallback（Q5）：當業務 line items > 2 或 type !='S' 時顯示「這個訂單需要詢價，要繼續嗎」+ 確認後仍可送（採意圖 §8 Q5 (b)）
- 共用桌面版 store + adapter

**完成驗證**：手機端業務跑「查料號 → 送 SO（self） → 看狀態」全流程順暢。

### Phase 1D（~1 週）— 整合測試 + Crown 親測

目標：達到 Crown Q4 完成標準「親自跑 5~10 次都順」。

交付：
- 所有 sub-phase 整合 e2e 測試
- 桌面版 7 節點各 1 e2e 測試 = 7 案
- 手機版 3 節點各 1 e2e 測試 = 3 案
- 跨工作台跳轉 D5 1 案
- ESLint sysC.ts import 限制 rule + lint pass
- 共 11 案測試（取代意圖 §10 的 12 案，以 lint check 替代並存測試）
- DEMO-02 三租戶 mock data 跑通
- Crown 親測 5~10 次反饋修 bug

**完成驗證**：Crown 拍板「Phase 1 W2-mini 完成」。

---

## 6. 測試規劃

### 6.1 Unit tests（vitest，前端）

| # | 測試 | 對應 |
|---|---|---|
| 1 | sales-adapter: client createSO input → server TranslateSoDto | §3.1 createSO 對照 |
| 2 | sales-adapter: server TranslateSoResult → client SO shape | §3.1 createSO 對照 |
| 3 | rfq-adapter: client abandonRFQ → server cancelRfq + reason | §3.2 abandonRFQ 對照 |
| 4 | stock-adapter: B2 summary response → client StockSummaryCard model | §3 |
| 5 | feature-flags: USE_REAL_API 開關 mock vs real path | §2 取捨 4 |

### 6.2 e2e tests（Playwright，已建議裝）

| # | 測試 | 平台 | 對應節點 |
|---|---|---|---|
| 6 | 桌面：查庫存 → 三個數字顯示 | desktop | 節點 1 |
| 7 | 桌面：送 SO type='S' → 完成 | desktop | 節點 4 |
| 8 | 桌面：送 SO type='T' → 看 IT 建立 | desktop | 節點 4 |
| 9 | 桌面：送 SO type='G' → 看 RFQ stub + polling 等 TI | desktop | 節點 4 + polling |
| 10 | 桌面：送 SO type='B' → 看 CO 建立 | desktop | 節點 4 |
| 11 | 桌面：節點 2 cancel RFQ → 連帶 reject pending QT | desktop | 節點 2 |
| 12 | 桌面：跳 W6 highlight 剛建的 ST | desktop | 節點 7（D5）|
| 13 | 手機：查庫存觸控 search | mobile | 節點 1 |
| 14 | 手機：送 SO type='S'（簡化） | mobile | 節點 2 |
| 15 | 手機：複雜訂單 fallback dialog | mobile | 節點 2 邊界 |
| 16 | 手機：看狀態 list 顯示本人 SO | mobile | 節點 3 |

### 6.3 ESLint check（取代意圖 §10「並存」測試）

| # | rule | 路徑限制 |
|---|---|---|
| 17 | no-import-syscC-in-w2 | features/sale/ui/w2-mini/** 禁 import sysC |
| 18 | no-cross-import-w2-sopdemo | features/sale/ui/sop-workspace/** 禁 import w2-mini |

**總計：5 unit + 11 e2e + 2 lint = 18 案**（超過意圖 §10 下限 12+）。

---

## 7. 風險點 + DoD

### 7.1 給 Alex 拍板的取捨清單（共 5 個）

| # | 取捨 | 章節 | 推薦 |
|---|---|---|---|
| 1 | 路由實體位置 | §2.1 | 獨立 `/dashboard/sale/w2/` + 連結卡 |
| 2 | 桌面/手機切換 | §2.2 | 同 page.tsx responsive |
| 3 | store 升級策略 | §2.3 | 既有 store + adapter + feature flag |
| 4 | feature flag 機制 | §2.4 | env `NEXT_PUBLIC_W2_USE_REAL_API` |
| 5 | sop-demo 並存驗證 | §2.5 | ESLint 取代 e2e |

### 7.2 範圍外的事

- W4 採購工作台（採用 QT、輸入同行報價）→ Phase 2
- NX03 picking / packing / delivery 後端對接 → Phase 2
- TI 收貨流程後端 → 屬 NX02 採購收貨範圍、Phase 2
- 銷退 / 保固 / 調貨詳情 → W2 完整版 Phase 2
- 前端通用元件升級 → 不在範圍

### 7.3 schema 對齊檢查

| W2-mini 概念 | Phase 0 schema | 對齊？ |
|---|---|---|
| StockSummaryCard 三個數字 | nx03_stock_balance.{onHandQty,reservedQty,availableQty} | ✅ |
| ReservationDrawer 反查 | B2 reservations response（接龍鎖）| ✅ |
| LineItem transferSourceType | nx04_so_item.transferSourceType S/T/G/B | ✅ |
| type='G' 中間態 | nx02_rfq.sourceSoItemId（B5-A 加） | ✅ |
| 跳 W6 highlight ST | D5 navigation policy + nx04_so_item.stId | ✅ |

---

## 8. DoD（Definition of Done）

W2-mini Phase 1 算完成需要：

- [ ] 此 spec 拿到 Alex review 拍板（含 5 個取捨點）
- [ ] 路由 `/dashboard/sale/w2/page.tsx` + responsive 切桌面/手機
- [ ] sale page.tsx 桌面 + WorkstationSection 加 W2 連結卡
- [ ] 桌面 7 節點 + 手機 3 節點全部落地
- [ ] adapter 層 3 個檔（sales / rfq / stock）
- [ ] USE_REAL_API feature flag
- [ ] 18 個測試（5 unit + 11 e2e + 2 lint）全綠
- [ ] DEMO-02 三租戶 mock data 跑得通 W2-mini 全流程
- [ ] **Crown 親自跑 5~10 次都順**（Q4 完成標準）
- [ ] 既有 sop-demo / R7 sections / sysC.ts 完全不動（lint pass）
- [ ] commit + push 到 `feature/wp-phase1-w2-mini`

---

## 9. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版實作 spec，對齊意圖 v1.0；收斂 4 個 catch 點；含 store mismatch 完整對照表（Crown 附加要求）|

---

*文件結束。等 Alex review 拍板 5 個取捨後 Hank 進 Phase 1A 桌面骨架。*
