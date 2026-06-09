<!-- docs/_team/nexora-v1.2-alignment-g-intent.md -->

# v1.2 對齊軌 階段 G 手機版意圖書 v1.0

> 撰寫者：Hank
> 撰寫時間：2026-06-01
> 分支：`feature/v1.2-alignment-g`
> 規格：v1.2 §10 手機版 + audit §10 + blueprint §10.1~§10.6
> 上輪 closure：階段 H 報表 `v2.0.7-alignment-h-complete`

---

## §1. 總經理拍板（已內化、非待澄清）

✅ 做：
- 驗收 / 撿貨 / 包貨 / 盤點 4 工作站接真實 API（目前 mock、撿貨 FU-stock-lite-03 揭露）
- 包貨 + 包裹編號生成
- 盤點手機掃條碼模式
- 浮動功能鍵 ⊕（§10.4 抽屜、4 大分類、按權限過濾）
- 配送工作站「基本版」：清單 + 狀態更新（**不含**地圖路線）

🔜 不做、移下階段：
- 配送 Google Map 路線規劃（要金鑰 / 可能收費）
- Lalamove 等第三方物流串接（nx06/route-optimization / lalamove-integration）

---

## §2. P0 盤點結果

### 2.1 前端 4 工作站 UI 現況

| 工作站 | 元件 | 現況 | API 狀態 |
|--------|------|------|----------|
| 驗收 | — | 🔴 **完全沒做**、`/dashboard/inventory/receiving` 是 PlaceholderPage | 後端 nx03/inbound OK |
| 撿貨 | `MobilePickingListPage` | 🟡 UI 在、用 `useSalesStore` zustand mock | 後端 nx03/pk 完整 |
| 包貨 | `MobilePackingListPage` | 🟡 UI 在、用 `useSalesStore` mock | 後端 nx03/parcel 完整、含 `allocParcelNo` ✅ |
| 配送 | `MobileDeliveryListPage` | 🟡 UI 在、用 `useSalesStore` mock | 後端 nx06/delivery OK（list / detail / location / patch） |
| 盤點手機 | — | 🔴 **掃條碼模式完全沒做**、桌面 list / detail OK、`MobileStocktakeConfigPage` 是「設定頁」非掃條碼 | 後端 nx03/stocktake 完整（含 submit / decide） |

### 2.2 殼層元件現況

| 元件 | 現況 | 說明 |
|------|------|------|
| **底部 5 工作站 dock** | 🔴 未綁 | `NexoraBottomDock` 元件存在（6 slot、icon-only、lg:hidden）、但 dashboard layout 未掛 5 工作站 dock |
| **浮動功能鍵 ⊕** | 🔴 **完全沒做** | grep 無 FloatingActionButton / FloatingFab / Fab 元件 |
| 條碼掃描方案 | 🔴 **完全沒做** | grep 無 BarcodeDetector / html5-qrcode / @zxing / quagga 任何 lib |

### 2.3 後端 endpoint（全綠、本軌 0 schema 變動）

```
✅ nx03/pk        list + items + create + patch
✅ nx03/parcel    list + detail + create + patch（allocParcelNo: BX-YYYYMM-倉碼-NNNNN）
✅ nx03/stocktake list + items + create + submit-for-approval + decide-approval
✅ nx03/inbound   桌面已用、可沿用作手機驗收（grn / line items）
✅ nx06/delivery  list + detail + create + location + patch
🟡 nx06/route-optimization     存在但「不接 UI」（本軌不動）
🟡 nx06/lalamove-integration   存在但「不接 UI」（本軌不動）
🟡 nx06/driver-mobile          存在、可考慮沿用
```

### 2.4 第三方串接禁用範圍（本軌不碰）

- `/nx06/route-optimization/*` — 不接 UI
- `/nx06/lalamove-integration/*` — 不接 UI
- 不引入 `@google/maps` / `mapbox` / `leaflet` 等任何地圖 lib
- 配送頁面**只**做：清單 + 狀態更新（出發 / 抵達 / 簽收）+ 客戶聯絡

---

## §3. 4 個待澄清給 Alex（影響 phase 拆分）

### Q1：條碼掃描技術選型

掃條碼是盤點 + 撿貨（選用）的核心。三個方案：

**a. BarcodeDetector Web API（原生）**
- ✅ 零 bundle、Chrome / Edge / Android 原生支援
- ❌ iOS Safari 不支援、需 fallback
- bundle 增加：0KB

**b. `html5-qrcode` 套件**
- ✅ 跨平台 OK（Chrome / Safari / Android / iOS）、活躍維護
- ✅ 多種條碼格式（CODE128 / EAN / QR）
- bundle 增加：~80KB gzipped

**c. `@zxing/library` 套件**
- ✅ 跨平台、format 最多
- ❌ bundle 大、上手較重
- bundle 增加：~200KB gzipped

→ 我建議 **b. html5-qrcode**（iOS 倉庫員 / 司機可用、80KB 可接受）。

### Q2：浮動功能鍵 ⊕ 抽屜內容

blueprint §10.4 寫「4 大分類：進貨 / 銷貨 / 庫存 / 報表」、點任一展開該分類子頁面。

兩個實作方向：

**a. 抽屜直接列 4 個分類入口、點選跳該模組 hub**
- 簡單、3 層導航（⊕ → 分類 → 子頁）
- 跟桌面 BusinessTopNav 一致語意

**b. 抽屜列「常用功能」直達（不分類）**
- 譬如「新增報價」「新增採購」「查詢庫存」「個人月報」
- 2 層、體驗順、但需設計常用功能清單

→ 我建議 **a. 4 分類入口**（對齊 §10.4 blueprint、權限過濾規則明確）。

### Q3：底部 dock 5 工作站綁定範圍

**a. 全 `/dashboard/*` 路徑都顯示 dock**
- 跟 audit「dock 5 個工作站圖示所有員工都看到」對齊

**b. 只在 `/dashboard/inventory/*` 顯示**
- 跟業務語意對齊（5 工作站都屬倉庫流程）
- 其他模組頁面（NX02 採購、NX04 銷貨）不被夾擊

→ 我建議 **a. 全 dashboard** 對齊 blueprint §10.5「dock 全員工都看到」+ 點進去若無權限顯示「無權限」。

### Q4：驗收工作站業務語意

blueprint §10.3 寫「驗收：未驗收的進貨單品項清單、點進去掃條碼 / 點數量 / 完成驗收 → 自動入庫」。

需澄清：

**a. 驗收手機版 = 接 nx03/inbound 既有 grn 流程**
- 列「待驗收 GRN」、點開掃條碼確認品項數量、submit → 入庫
- 跟桌面 GRN 流程一致

**b. 驗收手機版 = 接 nx02/ti（進貨單）流程**
- 列「待驗收 TI」、TI 是進貨主檔、入庫經 GRN

→ 我建議 **a. 接 nx03/inbound GRN**（GRN 是「實體驗收動作」、TI 是「票單」、手機驗收人員看的是「貨到了驗一驗」）。

---

## §4. 建議 Phase 拆分（等 Alex Q1~Q4 拍板再敲定）

| Phase | 範圍 | 規模 | stop |
|-------|------|------|------|
| **P0** | 本意圖書落檔 + Alex Q1~Q4 拍板 | S | ✅（本檔） |
| **P1** | 殼層基礎：底部 5 工作站 dock 接 dashboard layout + 浮動 FAB ⊕ + 抽屜（4 分類 / 權限過濾框架） | M | ✅ stop |
| **P2** | 撿貨頁接真實 API（廢棄 useSalesStore mock、接 nx03/pk）| S | 與 P3 合併 review |
| **P3** | 包貨頁接真實 API + 包裹編號顯示（接 nx03/parcel + allocParcelNo）| S | ✅ stop（P2+P3 合並 review） |
| **P4** | 配送頁接真實 API（基本版、無地圖、接 nx06/delivery + 出發/抵達/簽收 patch）| S | 與 P5 合併 review |
| **P5** | 驗收頁新做（接 nx03/inbound、含掃條碼）| M | ✅ stop（P4+P5 合並 review） |
| **P6** | 盤點手機掃條碼模式（接 nx03/stocktake/:id/items POST + 掃條碼擇定品 + 點數量）| M | ✅ stop |
| **P7** | closure（handoff + git-state + tag `v2.0.8-alignment-g-complete` + memory）| S | ✅ stop |

⚠️ Q1 拍板會影響 P5/P6 的「掃條碼」實作（裝套件 + 抽 Scanner 元件）。建議 P1 開始前先把套件裝好、Scanner 元件抽到共用。

---

## §5. 不在本軌範圍（與 §1 不做清單對齊）

- ❌ Google Map 路線規劃 UI
- ❌ Lalamove webhook UI
- ❌ 配送地圖顯示
- ❌ 駕駛簽收圖（沿用既有照片上傳機制即可、不另做）
- ❌ 客戶端配送追蹤頁（B2C 範圍、LITE 不做）
- ❌ 推播通知（web-push controller 在、但不接 UI）

---

## §6. 0 schema 變動聲明

本軌純前端 + 接既有後端 endpoint、**0 schema 變動 / 0 migration / Railway 不需 deploy**。

Railway production migration 落後維持 91 支（本軌不影響）。

---

## §7. 等 Alex 拍板 → 接 P1
