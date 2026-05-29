<!-- docs/nx04/nx04-sales-lite-gap-audit.md -->

# NX04 銷貨 LITE 落差盤點報告（STEP-0）

> 撰寫者：Hank（Cursor IDE / Claude Code、NEXORA 工程師）
> 撰寫時間：2026-05-29
> 對應分支：`feature/nx04-sales-lite`（從 main HEAD `7f8b150` 起手）
> 對齊文件：`docs/_team/nx04-sales-lite-intent.md`（Alex 意圖書）
> 範本對齊：NX02 / NX03 LITE STEP-0 落差盤點範式
> 文件性質：給 Alex / Crown 對齊用的現況與意圖書落差表

---

## §0. 結論摘要（給 Alex / Crown 速讀）

**好消息**：NX04 schema + 後端 service 比 Alex 意圖書描述的「成熟很多」。
- Schema 7 個模型（`Nx04Co/Quote/QuoteItem/So/SoItem/Sr/SrItem`）全部既有
- 後端 `quote/` `so/` `sales-return/` 3 個 LITE 必要 module 既有
- 跨模組接點（`Nx02TiItem.sourceSoItemId` / `Nx03IssueReport` / `applyQtyOut/InWithLedger` / `tiered-form`）全在
- `Nx04SoItem` 已是 Phase 0 D3 重構過的**雙段狀態 + transferSourceType 分流**架構（比意圖書 §2.2C 的 3 狀態 lineStatus **更精密**）

**要做的事**：
- ✅ 新建 `customer_grade_history` 表（意圖書 §2.5）
- ✅ 新建 QT / SO / SR list + detail 工作台 UI（dashboard/nx04 既有 4 placeholder、實作零）
- ✅ 新建跨單據「問題回報」按鈕 → 寫 `Nx03IssueReport`
- ✅ SO 觸發 IT-O 入口（schema 接點齊、缺 UI 入口邏輯）
- ⚠️ 後端 service 內部商業邏輯需要逐一比對是否完整（M2 階段做）

**衝突議題**：有 **7 個業務語意決定**需 Alex / Crown 拍板（§5），影響 M1 schema 是否要動既有欄位/狀態流。

**建議**：請 Alex 看完 §5 七個議題、給拍板後、再進 M1 schema。

---

## §1. 既有 Schema 全貌（7 個 Nx04 模型）

### 1.1 Nx04Quote（報價單表頭）— line 3709

| 欄位 | 既有狀態 | 對齊意圖書 §2.1 |
|------|---------|----------------|
| `customerGradeId` | ✅ 既有（snapshot 客戶等級） | 對齊「報價時帶當下等級」 |
| `validUntil` | ✅ 既有 | 對齊「過期 EXPIRED」 |
| `subtotal/taxRate/taxAmount/totalAmount` | ✅ 既有 | 對齊 |
| `status` | ✅ 既有 6 段 | ⚠️ 跟意圖書 5 段不對齊（§5-Q3） |
| `rfqId` | ✅ 既有（FK Nx02Rfq、同行調貨詢價來源） | 對齊「同行詢價簡化」 |
| `voidedAt/voidedBy/voidReason` | ✅ 既有 | 對齊作廢流程 |

**狀態流既有**：`DRAFT / SENT / ACCEPTED / REJECTED / EXPIRED / CANCELLED`
**意圖書 §2.1 要求**：`DRAFT → SENT → ADOPTED / REPLACED / EXPIRED`

⚠️ **議題 Q3**：ADOPTED ≈ ACCEPTED（拉走採用）、REPLACED ≈ CANCELLED（被新 QT 取代）。建議沿用既有 6 段、語意對齊靠 service 層判斷、不動 schema。

### 1.2 Nx04QuoteItem（報價明細）— line 3772

| 欄位 | 既有狀態 | 對齊意圖書 §2.1 |
|------|---------|----------------|
| `partId/partNo/partName` snapshot | ✅ 既有 | 對齊 |
| `qty/unitPrice/lineAmount` | ✅ 既有 | 對齊 |
| `minPrice` | ✅ 既有（成本×毛利%快照） | **對齊「毛利警告」基準** |
| `belowMinReason` | ✅ 既有（< minPrice 時必填） | 對齊 §2.1C 毛利警告 |
| `transferredQty` | ✅ 既有（已轉銷貨數量） | **對齊「同 QT 可分批轉 SO」** |
| `isSelected` | ✅ 既有（多選項時客戶確認） | 多 group 機制（超出 LITE 但無害） |
| `discountCodeId` | ✅ 既有 | 對齊 |
| ⚠️ `sourceType`（庫存/供應商/同行） | 🔴 **沒這欄位** | 意圖書 §2.1D 要的「來源註記」缺 |

⚠️ **議題 Q4**：QT 行沒有 sourceType 欄位、但 SO line 既有 `transferSourceType(S/T/G/B)`。建議用 SO 層判斷、QT 不加欄位（也可選擇用 QuoteItem.remark 暫存）。

### 1.3 Nx04So（銷貨單表頭）— line 3824

| 欄位 | 既有狀態 | 對齊意圖書 §2.2 |
|------|---------|----------------|
| `quoteId` | ✅ 既有（可空、即時報價直接開單） | 對齊「拉報價或補新行」 |
| `deliveryType`（D/P/C） | ✅ 既有（配送/自取/寄貨） | 對齊「交貨方式三選一」 |
| `sourceType` | ⚠️ **既有但已 deprecated**（Phase 0 D3） | header 此欄已無語意、由 line `transferSourceType` 取代 |
| `status` | ✅ 既有 6 段 | ⚠️ 跟意圖書 5 段不對齊（§5-Q1） |
| `paymentTerm` | ✅ 既有 snapshot | 對齊 AR 接點預埋 |
| `expectedDeliveryDate` | ✅ 既有 | 對齊 |
| `cancelReason/cancelledAt/cancelledBy` | ✅ 既有 | 對齊作廢 |
| `completedAt` | ✅ 既有 | 對齊「全部 DELIVERED 完成」 |

**狀態流既有**：`DRAFT / CONFIRMED / PICKING / SHIPPED / INVOICED / CANCELLED`
**意圖書 §2.2 要求**：`DRAFT → CONFIRMED → PROCESSING → COMPLETED / VOIDED`

⚠️ **議題 Q1**：既有 6 段比意圖書 5 段更精密、且涵蓋語意：
- PICKING = 撿貨中 = 部分待出貨的「進行中」狀態
- SHIPPED = 已出貨完成（單張單純全出）
- INVOICED = 已開立發票（AR 接通才會用）

建議沿用既有、PROCESSING 對應 PICKING、COMPLETED 對應 SHIPPED/INVOICED、VOIDED 對應 CANCELLED。

### 1.4 Nx04SoItem（銷貨明細）— line 3899

⭐ **這是最關鍵的落差**：既有設計比意圖書描述更精密。

| 欄位 | 既有狀態 | 對齊意圖書 §2.2 |
|------|---------|----------------|
| `quoteItemId` | ✅ 既有 | 對齊「拉報價來源」 |
| `transferSourceType` | ✅ **既有 S/T/G/B**（Phase 0 D3 新增） | **對齊意圖書 sourceType 庫存/供應商/同行** |
| `transferStatus` | ✅ **既有 P/I/C**（雙段第一段：補貨進度） | 對齊「等貨/補貨中/補完」 |
| `fulfillStatus` | ✅ **既有 W/PK/PL/D/F**（雙段第二段：出貨進度） | 對齊「等貨/撿/包/送/到」 |
| `itemStatus` | ⚠️ **既有但已 deprecated**（Phase 0 D3、trigger 仍雙寫保留相容） | — |
| `tiId` | ✅ 既有 FK Nx02Ti | **對齊 IT-O 同行調貨接點** |
| `stId` | ✅ 既有 FK Nx03St（自倉調撥） | 對齊 |
| `coId` | ✅ 既有 FK Nx04Co（客戶訂單預約） | 對齊「客訂預約」 |
| `reservedQty` | ✅ 既有（SO 建立即預留庫存） | 對齊 |
| `belowMinReason` | ✅ 既有 | 對齊 |

⚠️ **議題 Q2**：意圖書 §2.2C 要的「lineStatus（WAIT/PARTIAL/DELIVERED）3 狀態」**比既有雙段狀態退化**。建議：
- 用既有 `transferStatus + fulfillStatus` 雙段、不退回 3 狀態
- UI 上把雙段組合顯示成業務員看得懂的「等貨 / 部分撿貨 / 全部出貨」
- 不動 schema

### 1.5 Nx04Sr（銷退單表頭）— line 3982

⚠️ **命名澄清**：意圖書 §2.4 已 Alex 拍板「用 SR」、業務口語可叫 CO 銷退、實際表名/編碼一律 SR。**SR 不衝突 Nx04Co**（Co 是客戶訂單預約、Sr 是銷退、完全不同語意）。

| 欄位 | 既有狀態 | 對齊意圖書 §2.4 |
|------|---------|----------------|
| `soId` | ✅ 必填 FK | 對齊「來源 SO」 |
| `returnMethod`（S/C/P） | ✅ 既有（客戶送回/外務取回/寄回） | 對齊（超 LITE 也無害） |
| `status` | ✅ 既有 5 段（DRAFT/INSPECTING/POSTED/REJECTED/CANCELLED） | 對齊核可流程 |
| `approvedBy/approvedAt` | ✅ 既有 | 對齊「銷售組長核可」 |
| `rejectReason` | ✅ 既有 | 對齊 |
| `receivedAt/receivedBy` | ✅ 既有（倉管收貨確認） | 對齊「好品入庫」前提 |

⚠️ 意圖書 §2.4D 提的「approvalStatus 範式」**沿用 NX03 stocktake** — Nx04Sr 用 status 流（DRAFT→INSPECTING→POSTED）已涵蓋。**不需要新增 approvalStatus 欄位**、語意對齊靠 service 層判斷。

### 1.6 Nx04SrItem（銷退明細）— line 4043

| 欄位 | 既有狀態 | 對齊意圖書 §2.4 |
|------|---------|----------------|
| `soItemId` | ✅ 必填 FK | 對齊 |
| `returnPolicy`（F/S/R/N/W） | ✅ 既有 snapshot | 對齊（超 LITE 也無害） |
| `returnType`（N=一般/E=業務通融） | ✅ 既有 | 對齊「通融旗標」 |
| `returnReason`（C/D/W/Q/O） | ✅ 既有（客戶不需要/商品瑕疵/送錯料/送錯量/其他） | 對齊「退貨原因」 |
| `concessionReason` | ✅ 既有 | 對齊 |
| `locationId` | ✅ 既有（倉管入庫填） | 對齊「好品入庫」 |
| ⚠️ 「好品 / 壞品」明確旗標 | 🔴 **沒這欄位** | 意圖書 §2.4B 要分流 |

⚠️ **議題 Q5**：意圖書 §2.4B 要「每行勾好品或壞品 → 好品入庫 / 壞品進 IssueReport」。既有 `returnReason='D'`（商品瑕疵）已可間接判斷。建議：
- 方案 A：用既有 `returnReason='D'` 推、不新增欄位（最輕量、可能誤判 W/Q 也歸入壞品）
- 方案 B：新增 `dispositionFlag`（G=好品入庫 / B=壞品進 IssueReport）由倉管收貨時填（最明確）

### 1.7 Nx04Co（客戶訂單預約）— line 3659

⚠️ **重要提醒給 Alex**：
- `Nx04Co` **不是**意圖書誤以為的「銷退（Customer Order / CO 銷退）」
- 既有語意是「**客戶訂單預約**」、`status=P/F/E/V`（待補/已補完/過期/作廢）
- 由 SoItem `transferSourceType='B'` + `coId` 觸發
- 跟 Nx04Sr（銷退）完全不同語意
- 意圖書 §2.4 的「CO 銷退命名衝突」其實**不存在**、Alex 拍板用 SR 正確

LITE 本軌**不動 Nx04Co**、保留既有。

### 1.8 缺的表

🔴 **`customer_grade_history`**（或 `partner_grade_history`）— 意圖書 §2.5 客戶等級變更歷史。

建議欄位（給 Alex 對齊用）：

```text
partnerId        FK nx01_partner  必填
oldGradeId       FK nx01_customer_grade  必填
newGradeId       FK nx01_customer_grade  必填
status           PENDING / APPROVED / REJECTED  預設 PENDING
requestedBy      FK nx99_user  必填
requestedAt      DateTime  必填
reason           VarChar(200)  必填
approvedBy       FK nx99_user  可空（APPROVED 後填）
approvedAt       DateTime  可空
rejectReason     VarChar(200)  可空（REJECTED 後填）
```

---

## §2. 既有後端 NX04 module 全貌

```text
apps/nx-api/src/nx04/
├── co-estimate/        ← 不在 LITE 範圍、保留
├── credit-guard/       ← 不在 LITE 範圍、保留
├── quote/              ← LITE 必要、既有
│   ├── quote.controller.ts
│   ├── quote.service.ts
│   └── dto/quote.dto.ts
├── sales-performance/  ← 不在 LITE 範圍、保留
├── sales-return/       ← LITE 必要、既有
│   ├── sales-return.controller.ts
│   ├── sales-return.service.ts
│   └── dto/sales-return.dto.ts
├── so/                 ← LITE 必要、既有
│   ├── so.controller.ts
│   ├── so.service.ts
│   ├── dto/so.dto.ts
│   └── translator/     ← Phase 0 D3 重構過、SO 來源解析
│       ├── translator.controller.ts
│       ├── translator.service.ts
│       ├── transfer-source-resolver.ts
│       ├── refreshment-doc-creator.ts
│       └── __tests__/  ← integration + unit 7 個測試檔
└── nx04.module.ts
```

**既有跨模組接點 service 層使用**：
- `so.service.ts` 用 `applyQtyOutWithLedger` ✅
- `sales-return.service.ts` 用 `applyQtyInWithLedger` ✅
- 後端**沒有**寫入 `Nx03IssueReport`（意圖書 §2.4B 壞品 + §2.6 跨單據問題回報入口都要）🔴

---

## §3. 既有前端 NX04 結構

### 3.1 既有檔案分布

```text
apps/nx-ui/src/app/dashboard/nx04/
├── customer/page.tsx   ← placeholder
├── domestic/page.tsx   ← placeholder
├── export/page.tsx     ← placeholder（menu.nx04.ts 對應「銷退處理工作台」）
└── layout.tsx

apps/nx-ui/src/features/sale/ui/
├── hub/                ← Sales Hub Mobile（業務員 KPI + 待辦）
├── inquiry/            ← Mobile 詢價列表 + 詳細 + QT detail
├── sop-workspace/      ← Mobile 銷售 SOP 8 Step（含 HistoryQuoteAlert/MarginAlert/OutOfStockDialog）
└── fulfillment/        ← Mobile 履行流程
```

### 3.2 落差判斷

⚠️ **既有 features/sale 全是 Mobile 流程 + mock-data**、跟 LITE 工作台範式（list + detail）**方向不同**。

建議：
- LITE 本軌**新建** `features/sale/lite/` 走工作台範式（對齊 NX02/NX03 lite 範式）
- 既有 Mobile 流程**保留不動**（M3 不接觸）、列 FU-sales-lite-08「Mobile 版銷貨」
- 業務組件（HistoryQuoteAlert / MarginAlert / OutOfStockDialog 等）**可參考設計**、不直接 import

🔴 **缺的工作台**：
- QT 工作台（list + 開單 + 拉歷史 + detail）
- SO 工作台（list + 拉 QT 建單 + sourceType 警示 + detail）
- SR 工作台（list + 來源 SO picker + 好品/壞品勾選 + detail）
- 客戶等級變更 UI（features/shared/master/partner 加按鈕）
- 跨單據問題回報按鈕（QT/SO/SR detail 右上）

---

## §4. 跨模組接點對齊表

| # | 接點 | 既有狀態 | 備註 |
|---|------|---------|------|
| 1 | `partnerType IN ('C','O')` | ✅ 既有 | 客戶選單同行兼客戶 |
| 2 | `partnerType='O' OR canTransferStock=true` | ✅ 既有 | IT-O 調貨對象 |
| 3 | `customer_grade.marginPct` | ✅ 既有 | QT 毛利警告依據（QuoteItem.minPrice snapshot 已存） |
| 4 | `stock_balance.avgCost` | ✅ 既有（NX03） | QT 成本來源 |
| 5 | `applyQtyOutWithLedger` | ✅ 既有 helper | so.service.ts 已用 |
| 6 | `applyQtyInWithLedger` | ✅ 既有 helper | sales-return.service.ts 已用 |
| 7 | `Nx03IssueReport` | ✅ 既有表 + sourceModule/sourceDocType/sourceDocId 預留 | 🔴 後端 service 還沒寫入 |
| 8 | `Nx02Ti` 同行調貨單 | ✅ 既有（NX02 階段 1 已建） | |
| 9 | `Nx02TiItem.sourceSoItemId` | ✅ 既有 @relation `R_Nx02TiItem_sourceSoItemId` | 反查 SO line OK |
| 10 | `nx98 task-pool` | ✅ 既有 | IT 到貨通知 SO |
| 11 | `features/shared/tiered-form` | ✅ 既有 TieredFormProvider | QT/SO/SR 表單三層欄位 |
| 12 | `Nx03Pk` 撿貨單 | ✅ 既有（含 refSoId + refSoItemId） | SO 部分出貨自動建撿貨 |
| 13 | `Nx05ArLedger` AR ledger | ✅ 既有 @relation `R_Nx05ArLedger_soId` | 預留接點（LITE 不真寫） |
| 14 | `Nx06Dn` 送貨單 + `sourceSoId` / `sourceSrId` | ✅ 既有 | 配送/寄送類型銷貨 + 銷退寄回 |
| 15 | `sourceSoId`（NX02 保固客訴型） | ✅ 既有 @relation FK | NX02 FU-04 picker、本軌完成可補 |

**結論**：跨模組 schema 接點**全部到位**、只差 service 層串接與 UI 入口。

---

## §5. 給 Alex / Crown 拍板的 7 個議題

| # | 議題 | 我的建議 | 影響 |
|---|------|---------|------|
| Q1 | SO `status` 流：既有 6 段 vs 意圖書 5 段 | 沿用既有 6 段（PICKING ≈ PROCESSING、SHIPPED ≈ COMPLETED） | M1 不動 schema、M2 service 對齊語意 |
| Q2 | SO line 用既有雙段（transferStatus + fulfillStatus）vs 退化成 3 狀態 lineStatus | 沿用既有雙段、UI 顯示時組合成業務員看得懂的 3 狀態 | M1 不動 schema、M3 UI 設計負擔 |
| Q3 | QT `status` 流：既有 6 段 vs 意圖書 5 段（ADOPTED/REPLACED） | 沿用既有 6 段：ADOPTED→ACCEPTED、REPLACED→CANCELLED | M1 不動 schema |
| Q4 | QT line sourceType（庫存/供應商/同行）要不要加欄位 | 不加 QT line 欄位、在 SO line 用既有 `transferSourceType(S/T/G/B)` 解決 | M1 不動 QT、M2 service 在「拉報價」時帶 |
| Q5 | SR item 好品/壞品要不要新增明確旗標 | 建議方案 B：新增 `dispositionFlag(G/B)` 由倉管收貨時填、避免誤判 W/Q | M1 新增 1 欄位 |
| Q6 | `customer_grade_history` 表 9 欄位設計 | 對齊 §1.8 建議 | M1 新增 1 表 |
| Q7 | 既有 Mobile `features/sale/*` 怎麼處理 | LITE 本軌不動、新建 `features/sale/lite/`、Mobile 列 FU-sales-lite-08 | M3 範圍清楚切割 |

---

## §6. 修正版 M1 schema 範圍（Q5/Q6 拍板後對齊）

假設 Alex 拍板 Q5 方案 B + Q6 對齊我的建議、M1 schema 範圍：

🟢 **不動既有欄位 / 狀態流**（Q1/Q2/Q3/Q4 沿用既有）：
- `Nx04Quote` / `Nx04QuoteItem` 完全不動
- `Nx04So` / `Nx04SoItem` 完全不動
- `Nx04Sr` 完全不動

🔴 **M1 schema 異動**：
1. `Nx04SrItem` 新增 `dispositionFlag` VarChar(1)（G=好品 / B=壞品 / 預設 G）
2. 新建 `Nx01PartnerGradeHistory` 表（§1.8 建議 9 欄位）
3. 對應 migration（規模約 30~50 行 SQL）

⚠️ **如果 Alex 拍板 Q5 方案 A**（不新增欄位、用 returnReason 推）→ M1 schema 範圍只剩**新建 1 表**。

---

## §7. 修正版 M2 / M3 / M4 / M5 / M6 範圍預估

對齊 NX02 14 commits / NX03 14+ commits 範式、**預估 14~18 commits**（比意圖書 §8 估的 16~22 略少、因為 schema 異動極小）：

### M2 backend service（5~7 commits）
- QT service：歷史價查詢 + 毛利計算（minPrice 既有）+ 拉走後自動失效（用 transferredQty / status 流轉）
- SO service：拉報價 API + transferSourceType 偵測 + fulfillStatus 流轉 + 部分出貨撿貨
- IT-O 觸發 service：SO line 偵測 `transferSourceType='G'` → 自動建 TI 草稿 / 跳 picker
- SR service：dispositionFlag 分流 → 好品 applyQtyInWithLedger / 壞品寫 Nx03IssueReport
- 客戶等級核可 service：變更請求 + G 核可 + 寫 PartnerGradeHistory
- 跨單據問題回報 service：寫 Nx03IssueReport（sourceModule='NX04'）

### M3 frontend UI（5~7 commits）
- QT 工作台（list + detail + 開單 + 拉歷史價）
- SO 工作台（list + 拉 QT 建單 + 雙段狀態顯示 + IT-O 觸發 banner）
- SR 工作台（list + 來源 SO picker + 好品/壞品勾選 + 核可流轉）
- 客戶主檔等級變更（features/shared/master/partner 加按鈕 + 變更歷史 list）
- 4 個跨單據「問題回報」按鈕（QT/SO/SR + 等級變更歷史）
- **新建** `features/sale/lite/`（不重用 Mobile features/sale）
- 套 `features/shared/tiered-form` Provider（不內聯 icon、避免 NX03 FU-stock-lite-02 覆轍）

### M4 整合驗證（1 commit）
- `prisma migrate status`
- `nx-api build` / `nx-ui build`
- 三租戶 seed 重跑
- smoke：開 QT → 拉到 SO → fulfillStatus 部分出貨 → SR 退一行（好品 + 壞品各一）不爆

### M5 操作手冊（1 commit）
- `docs/_team/nx04-sales-operation-manual.md` 對齊 NX03 13 章節範式

### M6 closure（2 commits、含 git-state 更新）
- merge + tag `v1.4.0-nx04-sales-lite-closure`
- git-state update + memory closure

---

## §8. 給 Alex 的對齊提醒

```text
1. 我提的 7 個議題（§5）請逐一拍板
   特別是 Q1/Q2/Q3 — 既有狀態流比意圖書描述更精密、
   建議「對齊既有、不退化」、避免 schema 重來

2. Nx04Co 是客戶訂單預約、不是銷退
   意圖書 §2.4 的「CO 銷退命名衝突」其實不存在
   Alex 拍板用 SR 完全正確

3. SoItem 雙段狀態 + transferSourceType 是 Phase 0 D3 重構結果
   意圖書 §2.2C 提到的 lineStatus 3 狀態跟既有架構不同
   建議用 UI 層組合顯示、schema 不動

4. Nx04SrItem 好品/壞品分流是唯一明確要動 schema 的點
   方案 A（用 returnReason 推）省事但可能誤判
   方案 B（新增 dispositionFlag）明確但要動 schema + migration

5. 既有 Mobile features/sale/* 跟 LITE 工作台方向不同
   建議完全切割、新建 features/sale/lite/、Mobile 列 FU

6. 既有 features/shared/tiered-form 直接套 Provider
   QT/SO/SR 表單三層欄位用統一範式

7. AR ledger 接點預埋（@relation 已建）、LITE 不真寫
   commit 標 ⚠️「待 NX05 接通」
```

---

## §9. 下一步

⏳ **等 Alex 對齊 §5 七個議題** → 確認後進 M1：
1. M1 schema：依 §6 範圍寫 migration（規模極小、可能 1~2 個 commit 結束）
2. 進 M2 backend service

🚫 **不在落差盤點階段做的事**：
- 不改既有 schema
- 不寫 service 邏輯
- 不建 UI 元件
- 不動 features/sale 既有 Mobile

---

> 本文件 = NX04 銷貨 LITE 落差盤點報告（STEP-0）。
> 產出時間 2026-05-29、commit 在 `feature/nx04-sales-lite` 分支。
> 待 Alex / Crown 對齊 §5 後進 M1。
