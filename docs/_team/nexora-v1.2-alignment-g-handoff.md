<!-- docs/_team/nexora-v1.2-alignment-g-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 G closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-06-01
> 對應分支：`feature/v1.2-alignment-g`
> 對應 tag：`v2.0.8-alignment-g-complete`
> 前棒：`docs/_team/nexora-v1.2-alignment-h-handoff.md`（階段 H 報表）
> 規格：v1.2 §10 手機版 + audit §10 + blueprint §10.1~§10.6

---

## §1. 本軌範圍 — P0~P7 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| P0 | 盤點 + 意圖書 v1.0 落檔（Alex Q1~Q4 拍板） | ✅ |
| P1 | 殼層：5 工作站 dock + 浮動功能鍵 ⊕ | ✅ |
| P2 | 撿貨頁接真實 nx03/pk API（棄 mock） | ✅ |
| P3 | 包貨頁接真實 nx03/pl API + 包裹編號（allocParcelNo） | ✅ |
| P4 | 配送頁接真實 nx06/delivery 基本版（無地圖） | ✅ |
| P5 | 驗收新做 + 掃條碼（接 nx03/inbound、html5-qrcode） | ✅ |
| P6 | 盤點手機掃條碼模式（共用 BarcodeScanner） | ✅ |
| P7 | closure（本檔 + tag + merge + memory + seed） | ✅ |

## §2. 8 commits 整軌

| Commit | 範圍 |
|--------|------|
| `3605f6f` | P0 意圖書 v1.0 落檔（Q1~Q4 待澄清）|
| `4ab4ea8` | P1 殼層：MobileWorkstationDock + MobileFab + DashboardShell 接入 |
| `b68594f` | P2+P3 撿貨 + 包貨頁接真實 API + 包裹編號 |
| `d8fcf7e` | P4+P5 配送基本版 + 驗收新做 + BarcodeScanner 共用元件 |
| `5b6eb86` | P6 盤點手機掃條碼模式 |
| （P7） | 本 commit：handoff + git-state + merge |

**整軌淨變動**：~2200 行新增（5 工作站頁 + scanner + api client + dock + fab）

---

## §3. 4 項 Alex 拍板（Q1~Q4）

### 3.1 Q1 條碼掃描技術選型 → html5-qrcode

```
html5-qrcode ^2.3.8
- 跨平台：iOS Safari / Chrome / Android（內建處理）
- 多格式：CODE128 / EAN / QR / Code39 / UPC
- bundle 影響：~80KB gzipped（dynamic import 不進 initial bundle）
```

### 3.2 Q2 浮動鍵抽屜 → a. 4 分類入口

```
進貨 / 銷貨 / 庫存 / 報表（無「財務」、blueprint §10.4）
- 按權限過濾（usePermissions + hasAny、與 BusinessTopNav 一致）
- 點分類跳該模組 hub
```

### 3.3 Q3 dock 綁定 → a. 全 dashboard

```
全 dashboard 路徑顯示 5 工作站 dock
- 所有員工都看到 5 個圖示
- 點進去若無權限頁面再擋（blueprint §10.5）
- dock 不過濾、避免「員工只看到 1 個圖示」的視覺尷尬
```

### 3.4 Q4 驗收業務語意 → a. 接 nx03/inbound GRN

```
驗收 = 倉管「貨到現場清點」實體驗收動作
接 nx03/inbound（GRN）、不接 nx02/ti（票據流程）
GRN 流程：DRAFT → INSPECTING → POSTED（觸發 applyInboundPosting 入庫過帳）
```

---

## §4. 5 工作站交付清單

### 4.1 驗收（/dashboard/inventory/receiving）

**新做**（取代既有 PlaceholderPage）：
- 清單頁 MobileReceivingListPage：list + 4 篩選 chip
- 詳情頁 MobileReceivingDetailPage（新路由 `/[id]`）
  - 顯示 line items（partNo / partName / qty）
  - 「掃條碼」開 BarcodeScanner
  - 連續掃（onScan 回 true）→ 比對 partNo/partId → 標 verified（前端 local Set）
  - 「完成驗收」按鈕 = sequential PATCH DRAFT→INSPECTING→POSTED

### 4.2 撿貨（/dashboard/inventory/picking）

**接真實 API**（FU-stock-lite-03 修補）：
- 棄 useSalesStore zustand mock
- 接 GET /nx03/pk、4 篩選 chip（P/C/F）
- 「完成撿貨」按鈕 = `completePicking` helper（sequential PATCH P→C→F）

### 4.3 包貨（/dashboard/inventory/packing）

**接真實 API + 包裹編號**：
- 接 GET /nx03/pl
- 「完成包貨並生編號」按鈕 = `completePackingAndCreateParcel` helper
  - sequential PATCH P→C→F
  - 自動 POST /nx03/parcel
  - **後端 `allocParcelNo` 生 `BX-YYYYMM-倉碼-NNNNN`**
- 完成後立刻顯示綠色提示條 + 包裹編號（記憶在 recentParcels state）

### 4.4 配送（/dashboard/inventory/delivery）

**基本版**（總經理拍板：地圖/Lalamove 移下階段、付費模組候選）：
- 接 GET /nx06/delivery
- 4 篩選 chip：全部 / 待派 / 配送中 / 已送達
- DRAFT → 「派車出發」按鈕（→ DISPATCHED）
- DISPATCHED → 「客戶簽收」(綠) + 「送貨失敗」(紅) 兩按鈕
- 副標明示「基本版：清單 + 狀態更新（地圖路線 / 第三方物流移下階段）」

### 4.5 盤點（/dashboard/inventory/stocktake/[id]/scan）

**手機掃條碼模式**：
- 進入自動 DRAFT → COUNTING（ensureCountingStatus helper）
- 3 統計卡：總項目 / 已盤 / 差異
- 「掃條碼盤點」→ BarcodeScanner（**單次掃**、命中關掃描器 + 開輸入 dialog）
- CountInputDialog：
  - 系統庫存對照 / 數量輸入（type=number autoFocus）
  - 即時差異（+/− 配色）
  - 差異 ≠ 0 時 4 原因 chip（S 被偷 / M 算錯 / B 破損 / U 不明）
  - 確認 → PATCH item.countedQty + varianceReasonCode
- 桌面 detail 加按鈕「📱 手機掃條碼模式」→ 跳 /scan

---

## §5. 新範式產出（後續軌可沿用）

### 5.1 features/layout/ui/MobileWorkstationDock.tsx
- 重用既有 NexoraBottomDock 元件（portal、bottom-0、56px、lg:hidden）
- 5 工作站固定 5 項、不過濾權限

### 5.2 features/layout/ui/MobileFab.tsx
- 右下浮動 ⊕（bottom-[72px] right-4、Plus icon 旋轉動畫）
- 底部 sheet 抽屜（slide-in-from-bottom、4 分類 grid-cols-2）
- 權限過濾（usePermissions + hasAny）+ createPortal
- ESC / 背景點關閉

### 5.3 features/inventory/workstation/shared/BarcodeScanner.tsx
- 全螢幕 modal、後鏡頭優先（facingMode: environment）
- dynamic import html5-qrcode（SSR 安全 + 縮 initial bundle）
- onScan callback 回 true 繼續掃 / 否則自動關閉
- 250×200 qrbox + fps=10 + 250×200 默認

### 5.4 features/inventory/workstation/api/index.ts
- nx03/pk + nx03/pl + nx03/parcel + nx03/inbound + nx03/stocktake + nx06/delivery
- 含完整型別 + helper（completePicking / completePackingAndCreateParcel / completeReceiving / ensureCountingStatus）
- state machine sequential PATCH helper 統一範式

---

## §6. 不在本軌範圍（總經理拍板移下階段）

- ❌ Google Map 路線規劃 UI
- ❌ Lalamove webhook UI
- ❌ 配送地圖顯示
- ❌ 駕駛簽收圖
- ❌ 客戶端配送追蹤頁
- ❌ 推播通知（web-push controller 在、不接 UI）

理由：第三方串接（需金鑰 / 可能收費 / 測試麻煩）+ 有機會獨立成加值付費模組。

---

## §7. 0 schema 變動聲明

本軌純前端 + 接既有後端 endpoint、**0 schema 變動 / 0 migration / Railway 不需 deploy**。

Railway production migration 落後維持 91 支（本軌不影響）。

---

## §8. 下一棒可選方向

| 方向 | 範疇 | 推估 |
|------|------|------|
| **v1.2 階段 I 補連線收尾** | LITE 最後階段、雜項收尾 | ⭐ 推薦下一棒 |
| **NX08 報表 v2 — 移動平均 COGS** | 個人月報銷貨成本用 lineItem cost snapshot | 小 |
| **NX08 報表 v2 — Excel 圖表嵌入** | 匯出時把 recharts 也嵌入 xlsx | 小 |
| **TASK-RAILWAY-ENV-SPLIT** | dev/prod env 分離 + 91 支 migration 上 Railway | 大、第一客戶簽約前必做 |
| **付費模組軌（不在 LITE）** | Google Map / Lalamove / 推播（總經理列加值模組候選） | 大 |

⚠️ **LITE 範圍僅剩階段 I**（下一棒應走階段 I 收尾、其他都是 LITE 之外）。

---

## §9. 三大提醒（給下一棒 Hank）

1. **`.env` 維持 localhost**：階段 G 0 schema 變動、Railway 不需碰。下次有 schema 變動仍需總經理拍板。
2. **html5-qrcode dynamic import**：~80KB gzipped、避免 SSR + 縮 initial bundle、勿改成靜態 import。
3. **driver-mobile / route-optimization / lalamove-integration controller 在但不接 UI**：本軌**故意**不動、屬付費模組候選。

---

## §10. 階段 G closure 驗收

- ✅ 8 commits 全 push
- ✅ build pass（nx-api + nx-ui）
- ✅ 0 schema 變動
- ✅ 5 工作站全交付（驗收/撿貨/包貨/配送/盤點）
- ✅ 浮動 FAB ⊕ + 5 工作站 dock 上線
- ✅ html5-qrcode 共用 BarcodeScanner 元件
- ✅ 對齊 Alex Q1~Q4 + 總經理拍板（含「不做」清單）

**handoff 結束、下一棒可挑階段 I 補連線收尾（LITE 最後）或非 LITE 軌。**
