<!-- docs/nx04/spec/intent/_alex-prep_w2-existing-inventory.md -->
# W2-mini Alex Prep — 既有 W2 相關資源盤點

> 撰寫者：Hank
> 日期：2026-04-27
> 用途：給 Alex 寫 W2-mini 意圖版前的「真實 codebase 對照基準」
> 規矩：純盤點、不動 code；防止 Alex 再寫出脫離既有結構的意圖版（B5 v1 / D3 v1 教訓）

---

## ⚠️ 給 Alex 的關鍵提醒

寫 W2-mini 意圖版前**必先確認以下 5 件事**，否則會撞既有資產或重新發明輪子：

1. **routing 命名雙存**：`/dashboard/sale/*`（R6/R7 demo 主力）vs `/dashboard/nx04/*`（v2 placeholder）— Crown Q3 拍板「保留並存」
2. **features 雙資料夾**：`features/sale/`（R6/R7 demo 主力）vs `features/sales/`（舊 SalesCenterHub）— 命名疏漏，**寫意圖時用 `features/sale/`**
3. **R7 4 分區架構已落地**：手機版 `SalesHubMobile` 走 status/workstation/documents/customer，**W2-mini 應該掛進「workstation 分區」而非新建 hub**
4. **Zustand store 已有 sales fulfillment + inquiry**：W2-mini 不該重新發明，應該擴增或對接
5. **既有 mock data 全 client-side**：W2-mini 真接後端時要 replace mock-data 檔案，store actions 內部 SYS-C 邏輯要改成呼叫 D4 translator endpoint

---

## 1. Routing 結構

### 1.1 雙重命名空間（Crown Q3 拍板：保留並存）

```
apps/nx-ui/src/app/dashboard/
├── sale/                    ← R6/R7 demo 主力，所有實際畫面在這
│   ├── page.tsx             ← Sales Hub（桌面舊版 + 手機 R7 版混合）
│   ├── sop-demo/page.tsx    ← R6 SOP demo 入口（薄殼，跳到 MobileSaleSopPage）
│   ├── inquiry/             ← 同行詢價工作台（R7 Phase 7）
│   │   ├── page.tsx
│   │   └── [rfqId]/page.tsx
│   ├── customer/            ← 客戶子頁
│   │   ├── analysis/page.tsx
│   │   ├── grading/page.tsx
│   │   └── info/page.tsx
│   ├── docs/                ← 單據管理子頁
│   │   ├── inquiry/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── quote/page.tsx + [qtId]/page.tsx
│   │   ├── return/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── transfer/page.tsx
│   │   └── warranty/page.tsx
│   ├── qt/page.tsx          ← 報價單
│   ├── so/page.tsx          ← 銷貨單
│   ├── return/page.tsx      ← 銷退
│   ├── warranty/page.tsx    ← 保固
│   └── export/page.tsx      ← 出口（跟 customer/docs 等並存）
│
└── nx04/                    ← v2 命名（Crown Q3「保留並存」對應的另一條路）
    ├── layout.tsx           ← 共用 layout（簡單 wrapper）
    ├── domestic/page.tsx    ← NxWorkspacePlaceholder 占位
    ├── customer/page.tsx    ← placeholder
    └── export/page.tsx      ← placeholder
```

### 1.2 Alex 要決定的事

W2-mini 入口路由放哪？三個方向：
- A. **掛在既有 `/dashboard/sale/page.tsx` 的 workstation 分區**（最少架構動作，對齊 R7 4 分區）
- B. **新路由 `/dashboard/sale/w2-mini`**（獨立入口，跟 sop-demo 並存）
- C. **掛 `/dashboard/nx04/domestic`**（取代現有 placeholder，正式進駐 v2 命名空間）

⚠️ Crown Q3 拍板「sop-demo + R7 保留並存」 → 不能動 sop-demo。但 R7 hub 的 workstation 分區是否要加新 entry，是 Alex 該對焦的開放題。

---

## 2. R6 SOP Demo（不要動，要保留並存）

### 2.1 實作位置

```
apps/nx-ui/src/features/sale/ui/sop-workspace/
├── MobileSaleSopPage.tsx       ← 主容器，useReducer 9 步流程
├── types.ts                    ← SaleSopState / SaleSopAction
├── mock-data/
│   ├── customers.ts            ← 客戶 mock
│   ├── parts.ts                ← 料號 mock
│   ├── quote-history.ts        ← 報價歷史
│   └── scenario.ts             ← 場景設定
└── components/
    ├── ProgressHeader.tsx      ← 頂部進度條
    ├── StepWrapper.tsx         ← 通用 step 包裝
    ├── Step1SelectCustomer.tsx ← 選客戶
    ├── Step2SearchParts.tsx    ← 搜尋料號 + 缺貨分流
    ├── Step3QuoteList.tsx      ← 報價清單
    ├── Step4QuoteMethod.tsx    ← 報價方式
    ├── Step5CustomerDecide.tsx ← 客戶決定
    ├── Step6DeliveryMethod.tsx ← 配送方式
    ├── Step7SignMethod.tsx     ← 簽收方式
    ├── Step8OrderComplete.tsx  ← 訂單完成
    ├── Step9Summary.tsx        ← 結算
    ├── StepPlaceholder.tsx     ← 占位
    └── 各種 dialog（11 個）：AddMore / Consider / FloatingToast / HistoryQuoteAlert /
       ImageLightbox / MarginAlert / OutOfStockDialog / PartialAccept / PriceAdjust /
       RejectReason / SignaturePadModal
```

### 2.2 重點邏輯

- 9 個 Step 的線性流程（reducer-driven）
- TASK-BUSINESS-RESTRUCTURE Phase 5: Step 8 呼叫 `useSalesStore.createSO` 注入訂單編號
- Step 2 缺貨分流（選項 A 開 RFQ / 選項 B 客戶預訂）

W2-mini 是這個 SOP 的「精緻化版本」（含後端真實接通）。Crown 拍板「保留並存」 = sop-demo 不動，W2-mini 是 sibling 工作台。

---

## 3. R7 Sales Hub 4 分區架構（W2-mini 該對接的入口）

### 3.1 主元件位置

```
apps/nx-ui/src/features/sale/ui/hub/
├── SalesHubMobile.tsx          ← R7 主元件，URL ?section= 切分區
├── components/
│   ├── PlaceholderPage.tsx     ← 占位（DEPRECATED 跡象）
│   ├── ProKPICard.tsx          ← KPI 卡
│   └── TodoGroup.tsx           ← 待辦群組
├── mock-data/
│   └── scenario.ts             ← R7 場景 mock
└── sections/                   ← 4 分區實際內容
    ├── StatusSection.tsx       ← 狀態追蹤（含當下 todo / 進度）
    ├── WorkstationSection.tsx  ← 工作站（W2-mini 該掛這裡）
    ├── DocumentsSection.tsx    ← 單據管理
    └── CustomerSection.tsx     ← 客戶維護
```

### 3.2 共用 module-hub primitives

```
apps/nx-ui/src/features/layout/ui/module-hub/
├── hub-primitives.tsx          ← HubLinkCard / ModuleHubSection / HubStepBadge / hubShellMotion()
└── MobileHubSectionTabs.tsx    ← 4 分區底部 Tab 切換器
```

W2-mini 掛 hub 時可重用 `MobileHubSectionTabs`。

### 3.3 桌面 vs 手機並存

`/dashboard/sale/page.tsx` 同檔案內：
- 桌面版：用 `ModuleHubSection` + `HubLinkCard` 排版（5 大區塊）
- 手機版：直接 render `<SalesHubMobile />`

判斷依靠 Tailwind responsive class（`md:hidden` / `hidden md:block` 等模式）。**W2-mini 雙版本 = Crown Q2 拍板**，Alex 寫意圖時要兩個版本都規格化。

---

## 4. Inquiry 工作台（R7 Phase 7，W2-mini 銜接 B5 RFQ/QT API）

### 4.1 實作位置

```
apps/nx-ui/src/features/sale/ui/inquiry/
├── MobileInquiryListPage.tsx    ← RFQ 列表
├── MobileInquiryDetailPage.tsx  ← RFQ 詳情（含 QT 列表）
├── MobileQTDetailPage.tsx       ← QT 詳情
├── store.ts                     ← useRFQStore (Zustand)
├── types.ts                     ← RFQ / QT / VendorQuote / CustomerOrder
├── mock-data.ts                 ← 初始 3 筆 mock RFQ
└── components/
    ├── AdoptQuoteDialog.tsx     ← 採用報價
    ├── ConfirmDialog.tsx
    ├── InquiryListItem.tsx
    ├── VendorQuoteInput.tsx     ← 輸入同行報價
    └── VendorQuoteItem.tsx
```

### 4.2 store 介面（已寫好的 actions）

```typescript
useRFQStore:
  - rfqs: RFQ[]                       // 含初始 3 筆 mock
  - qts: QT[]
  - customerOrders: CustomerOrder[]   // 缺貨分流選項 B
  - createRFQ(input)                  // Step2 缺貨分流選項 A 觸發
  - createCustomerOrder(input)        // 缺貨分流選項 B
  - adoptVendorQuote(rfqId, vendorQuoteId, finalPrice)  // 採用 → 自動生 QT + 更新 RFQ
```

### 4.3 ⚠️ B5 後端 API 已落地，W2-mini 要把這 store **接通真實 API**

對照表：

| Store action | 對應 B5 endpoint | 對齊 |
|---|---|---|
| `createRFQ` | D4 translator `POST /nx04/so/translate`（含 transferSourceType='G' 自動建 RFQ stub） | ⚠️ 直接走 SO translator，不是獨立 createRFQ |
| 同行報價輸入 | `POST /nx02/qt`（B5 §3.2） | 對齊 |
| `adoptVendorQuote` | `POST /nx02/qt/:id/adopt`（B5 §3.3） | 對齊（B5 自動建 TI + 反查 SO line item） |
| RFQ list | `GET /nx02/rfq/list-for-purchase`（B5 §3.1） | 對齊 |
| RFQ cancel | `POST /nx02/rfq/:id/cancel`（B5 §3.5） | 對齊 |
| 拒絕單筆 QT | `POST /nx02/qt/:id/reject`（B5 §3.4） | 對齊 |

⚠️ **語意對齊**：
- 既有 store 的 `qts` 對應後端 nx02_qt（採用後生成 → B5 是「採購輸入」生成、之後採用變 `status='A'`），有點偏差
- 既有 store 的 `customerOrders` 對應後端 nx04_co（D4 type='B'）

---

## 5. Sales Fulfillment Store（W2-mini 主要對接的 SO 流程）

### 5.1 實作位置

```
apps/nx-ui/src/features/sale/ui/fulfillment/
├── store.ts                ← useSalesStore (Zustand)，SO/IT/TI/PK/BX/DN 6 種單據
├── types.ts                ← 6 種單據型別
├── mock-data.ts            ← 初始 mock SOs/ITs/TIs/PKs/BXs/DNs
├── numbering.ts            ← buildSharedDocNumbers / formatDocNumber / getCurrentYYMM
└── sysC.ts                 ← analyzeSO（client-side SYS-C，跟後端 D4 translator 同精神）
```

### 5.2 store 介面

```typescript
useSalesStore:
  - createSO(input)                     // 建 SO + SYS-C 自動建 IT/TI/PK
  - executeTransfer(itId)               // IT 出庫
  - completeTransfer(itId)              // IT 入庫
  - completePicking(pkId) → 自動建 BX
  - completePacking(bxId) → 自動建 DN
  - completeDelivery(dnId)
```

### 5.3 ⚠️ W2-mini 要對接後端 D4 translator + B5 + B2

對照表：

| Store concept | 對應 Phase 0 後端 | 對齊 |
|---|---|---|
| `createSO` 內 `analyzeSO` (sysC.ts) | D4 `Nx04SoTranslatorService.translate()` | ⚠️ **client-side sysC.ts 應該移除、改呼 server**|
| `createSO` 自動建 IT | D4 type='T' 自動建 nx03_st | 對齊 |
| `createSO` 自動建 TI（同行調貨）| D4 type='G' 自動建 RFQ stub（B5-A 含 sourceSoItemId）| ⚠️ **語意對齊：D4 建的是 RFQ stub，TI 是 B5 採用 QT 後才有** |
| `createSO` 自動建 PK | NX03 picking module（未實作） | TODO |
| 庫存查詢 | B2 `GET /nx03/stock/summary` | W2-mini 全新對接 |
| 反查「reserved 來源」 | B2 `GET /nx03/stock/reservations` | W2-mini 全新對接 |

⚠️ **語意 mismatch 重點**：客戶端 sysC 認為 G 直接建 TI，但後端是先建 RFQ stub、採購採用 QT 才建 TI。Alex 寫意圖時要對齊後端模型（不是 client mock 模型）。

---

## 6. UI 共用 lib（Alex 寫意圖要 reference 的）

```
apps/nx-ui/src/shared/lib/
├── cx.ts                    ← className merging（CLAUDE.md §15: 不用 clsx，用 cx）
└── hubCardDimensions.ts     ← hubCardShellBaseClass

apps/nx-ui/src/features/layout/ui/
├── module-hub/              ← R7 4 分區 primitives（見 §3.2）
├── CenterHubFlowCard.tsx    ← 桌面版舊「群組+流程卡+Step」（apps/nx-ui/src/features/sales/ui/SalesCenterHub.tsx 用這個）
└── NxWorkspacePlaceholder.tsx  ← v2 命名占位元件（nx04/* 用）
```

---

## 7. 命名疏漏 / 既存 schema drift（Alex 要避開）

### 7.1 `features/sale/` vs `features/sales/`
兩個資料夾並存：
- `features/sale/`（單數）= R6/R7 demo 主力，所有實際畫面
- `features/sales/`（複數）= 舊 SalesCenterHub.tsx（NX04-DASH-UI-001 桌面版）

**不要把它們搞混**。Alex 寫意圖時用「`features/sale/`」（單數）對齊主力。

### 7.2 Hub 雙版本並存
`/dashboard/sale/page.tsx` 同檔案內桌面版 + 手機版混合，將來桌面版要重構（page.tsx 註解寫「桌面版維持原樣（待後續重構）」）。

W2-mini Crown Q2 拍板「桌面 + 手機都做」 → Alex 寫意圖時要明確兩個版本的 UX 差異。

### 7.3 Zustand store 命名跟後端 API 對齊
- `useSalesStore`（fulfillment）對應 nx04_so + nx02_ti + nx03_st + nx04_co
- `useRFQStore`（inquiry）對應 nx02_rfq + nx02_qt + nx04_co
- 兩 store 之間沒有共用 type（CustomerRef 在 inquiry/types.ts，fulfillment 從這裡 import）

⚠️ Alex 寫意圖時若 W2-mini 牽涉跨 store 操作（例如 SO 內建 RFQ → 採用 QT → 更新 SO），要說明兩 store 怎麼協調。

---

## 8. 給 Alex 寫 W2-mini 意圖版的 checklist

寫意圖前自我確認：

- [x] W2-mini 路由位置已決定（**Hank 工程判斷見 §8.5**，Crown 授權）
- [ ] 桌面版 + 手機版兩個版本的 UX 差異講清楚（Crown Q2）— 寫意圖時遇到再問 Crown
- [ ] 跟既有 sop-demo 的並存邊界劃清楚（哪些畫面共享、哪些獨立）
- [ ] 跟 R7 4 分區的關係定位（**Hank 已定為 workstation 分區的子畫面**）
- [ ] 後端 API 對接清單列完整（D4 translator + B5 5 endpoint + B2 2 endpoint）
- [ ] client-side sysC.ts 跟後端 D4 translator 的取捨講清楚（**Alex/Hank 對焦時決定**）
- [ ] Zustand store 該擴增 vs 重新發明的邊界
- [ ] mock-data 替換策略（漸進切後端 / 全切 / 並存 feature flag）

### 8.5 Hank 工程判斷：W2-mini 路由位置（Crown 授權）

**最終選擇**：方案 A 變體 — sale 命名空間下、跟 sop-demo 平級、入口掛 R7 hub workstation 分區

```
路由實體：    /dashboard/sale/w2/                       ← W2-mini 主入口
            apps/nx-ui/src/app/dashboard/sale/w2/page.tsx (新建)
            apps/nx-ui/src/features/sale/ui/w2-mini/* (新建)

入口 1：     R7 sale hub workstation 分區
            apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx
            （加 1 張 HubLinkCard 連結到 /dashboard/sale/w2）

入口 2：     桌面版 sale hub
            apps/nx-ui/src/app/dashboard/sale/page.tsx 桌面區塊
            （加同連結，Crown Q2「兩版都做」要求）

不動：       /dashboard/sale/sop-demo/                  ← R6 demo 主力，並存
            /dashboard/sale/page.tsx 手機版 SalesHubMobile 整體結構
            /dashboard/sale/inquiry/                   ← R7 Phase 7 同行詢價
            /dashboard/nx04/domestic/                  ← v2 命名 placeholder
```

**選擇理由**：
1. **對齊 CLAUDE.md 既有 sale 命名空間**：業務從 sale hub 進來邏輯一致、不跨命名空間跳轉
2. **不動既有 sop-demo / R7 sections 程式**：只在 WorkstationSection 加 1 張卡片連結，最小侵入
3. **跟 sop-demo 兩個 sibling entry 並存**：R6 demo（手機 9 步 SOP）+ W2-mini Phase 1（後端真接通版）和諧並存——對齊 Crown Q3「保留並存、測試都過再考慮刪舊版」
4. **nx04/* placeholder 不動**：v2 命名空間整體重整不在 Phase 1 範圍，避免提前耦合

**避開的方案**：
- ❌ 方案 C（進駐 nx04/domestic）：跨命名空間跳轉造成「sale 跟 nx04 邊界模糊」，且若 v2 命名重整時需動 W2-mini 風險高
- ❌ 純方案 B（獨立 `/dashboard/sale/w2-mini` 沒掛 hub 入口）：業務找不到入口，跟 R7 4 分區架構脫離

**Alex 寫意圖時要對齊的點**：
- 元件目錄命名建議：`features/sale/ui/w2-mini/*`（沿用 R6/R7 在 features/sale 下的慣例）
- 不建議命名 `features/sale/ui/w2/`（避免跟「W2 工作台」這個概念名稱混淆——「mini」字尾標明 Phase 1 範圍）
- 桌面版 desktop entry 加在 sale page.tsx 的 ModuleHubSection 內、跟既有 STEP 1~5 占位卡並列（Phase 6 註解寫桌面版「待後續重構」，W2-mini 入口先掛上、後續重構時順手收斂）

---

## 9. 不在這份盤點範圍

- Phase 0 已落地的 D4/B5/B2 endpoint 細節（看各自 spec）
- 前端通用元件（按鈕、表單、Dialog 等 shadcn/ui 既有 primitive）
- TopBar / 五大中心 nav 結構（W2-mini 不該動）
- Auth / login flow（既有）

---

## 10. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版盤點，給 Alex 寫 W2-mini 意圖版用 |

---

*盤點結束。Alex 看完這份再寫意圖版才不會撞既有資產。*
