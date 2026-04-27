<!-- B2 Stock Reverse Lookup API — 意圖版 -->
# B2 — Stock Reverse Lookup API 意圖

> 文件類型：意圖文件（Alex 寫，給 Hank 對照真實 codebase 寫具體 REST API）
> 撰寫者：Alex
> 日期：2026-04-27
> 對應計畫：plan v1.1 工作項目 B2
> 銜接文件：D3 意圖版 v1.1（雙帳設計）、D4 意圖版（translator）、B5 意圖版 v2（RFQ/QT API）
> 狀態：待 Crown 拍板 → 交給 Hank 對照真實 codebase 寫具體實作

---

## ⚠️ 文件性質聲明

這份是**意圖文件**，不是 API spec。

它說明：「業務想知道**料號的庫存被誰承諾了**這個業務需求 → API 要支援哪些動作」。
它不說明：REST endpoint 路徑、DTO 結構、HTTP status code、controller 寫法。

具體實作（路徑命名、payload 格式、validation pipe）由 Hank 對照 NestJS 慣例與既有 controller 結構寫。

---

## 1. 業務目標

D3 雙帳設計把庫存拆成「物理庫存（physical_stock）」跟「業務承諾（reserved_qty）」。但**寫進去看不到沒用**——業務需要能反查：

```
業務情境：
  業務 A 在 W2 工作台查料號 X 在 Z01 倉
       ↓
  系統顯示：
     物理庫存 50
     已承諾   30
     可承諾   20
       ↓
  業務 A 想：「30 個被誰拿去了？」按「展開」
       ↓
  系統列出：
     - 客戶 ABC（業務老王）訂 12 個、訂貨 4/25、預計出貨 5/01
       └ 來源：自倉（即將出貨）
     - 客戶 XYZ（業務小李）訂 18 個、訂貨 4/26、預計出貨 4/30
       └ 來源：同行調貨 → 已採用 D-O104 → TI-2604-00012 待收貨
       ↓
  業務 A 看完判斷：
     - 「客戶 XYZ 在等同行貨、不擋我下單」
     - 「客戶 ABC 跟我的客戶差 1 天交期、可調整或溝通」
       ↓
  繼續決策（要不要超賣 / 改 transferSource / 等等）
```

**設計目標一句話**：讓業務看到「reserved_qty 是哪些單據加總、各單據走到哪了」，作為下單決策的依據。

---

## 2. 為什麼不是純 list

B2 看起來是「列出 SO line item」的 list API，但業務真正需要的是「**接龍鎖**」——從 SO line item 看下去到 IT/TI/CO 各自的進度。

理由：reserved_qty 不會自己消失，要等補貨來源走完才會釋放。業務想知道「這 30 個的補貨各自走到哪」才能判斷急迫程度。

---

## 3. API 必須支援的 2 個業務動作

### 3.1 庫存總覽（Stock Summary）

業務情境：業務查料號 X 在 Z01 倉的當前狀態。

輸入：
- partId
- warehouseId

輸出：三個數字 + 元資料
- physical_stock（物理庫存，nx03_stock_balance.physicalQty）
- reserved_qty（已承諾，nx03_stock_balance.reservedQty）
- available_qty（可承諾，physical - reserved）
- updatedAt（最近異動時間）
- 其他 stock_balance 該有的欄位由 Hank 看真實 schema 補

這是輕量 endpoint、查詢頻率高（業務每次查料都會用到）。

### 3.2 承諾來源反查（Reservation Source Lookup）

業務情境：業務看完總覽想展開「30 個 reserved 是哪些單據」。

輸入：
- partId
- warehouseId

輸出：清單（含接龍鎖完整鏈）
- 每筆 = 1 個未完成的 SO line item
- 每筆附帶下接 IT/TI/CO 的當前狀態

詳細結構見 §5 核心邏輯。

---

## 4. 邊界與接口

### 4.1 「未完成」的定義

只列 `transferStatus != 'C' (completed)` **或** `fulfillStatus != delivered` 的 SO line item。

**為什麼這樣定義**：
- transferStatus = 'C' 但 fulfillStatus 還沒 delivered → 補貨完成、出貨還沒走 → 仍佔 reserved
- transferStatus = 'C' 且 fulfillStatus = delivered → 整筆完成、reserved 已釋放（trigger 自動處理）
- 列出已完成的對業務沒用、反而造成困惑

### 4.2 「點進去看詳情」的 UX 處理

業務拍板：清單顯示「見手心」的核心欄位、想看更多就點進 SO 詳情。

意思是：
- B2 反查清單**只回傳核心欄位**（客戶名、業務名、訂貨時間、quantity、transferStatus、預計出貨日、補貨來源接龍鎖）
- B2 不負責 SO 完整詳情（業務點 SO id 跳到既有 SO 詳情 API、那是別的 endpoint 的事）
- 不要為了「業務可能想看 X 欄位」就把 B2 回傳擴大

### 4.3 排序規則（Crown 拍板按預計出貨時間）

預設排序：**expectedDeliveryDate 升序（急件在上）**

**Null 處理**（必須在意圖版講清楚）：
- expectedDeliveryDate 是 nullable
- null 值的 SO line item 排在**最後**（不急、沒明確日期）
- null 值之間用 soDate（銷貨日）做次要排序，越早建的越前

具體 PostgreSQL 寫法：
```sql
ORDER BY 
  expected_delivery_date ASC NULLS LAST,
  so_date ASC
```

### 4.4 type='G' 同行調貨的中間態處理

B5-A 揭露的事實：type='G' SO line item 在 D4 stub 後到 B5 採用 QT 前，`tiId = null`。

**B2 反查必須處理這個中間態**：

```
type='G' SO line item 反查時：
  - 如果 tiId 有值 → 走 ti relation 反查 TI 狀態
  - 如果 tiId = null → 透過 rev_Nx02Rfq_sourceSoItemId 反查對應 RFQ
    然後看 RFQ.status：
      - pending  → 顯示「等同行回價」
      - quoted   → 顯示「已收 N 家報價、等採購採用」
      - completed → 異常（理論上 completed 後 SO line item.tiId 應該有值）
      - cancelled → 異常（cancelled RFQ 應該已通知業務改 transferSource）
```

這條複雜度真實存在，不能省。

### 4.5 B2 不負責的事

- 既有 stock_balance 主檔維護（屬 NX03 庫存模組）
- SO 完整詳情（屬既有 SO API）
- IT/TI/CO 完整詳情（屬各自模組 API）
- 跨倉查詢（B2 只查單一 warehouse）—— Phase 2 W2 完整版可能加
- 跨料號查詢（B2 只查單一 part）—— Phase 2 W2 完整版可能加
- 庫存歷史變動（屬 nx03_stock_ledger 反查、別的 task）

---

## 5. 核心邏輯（5 條意圖規格）

### 5.1 總覽 endpoint 直接讀 stock_balance

不要算、不要 join、不要做花俏的計算——physical / reserved / available 三個數字 nx03_stock_balance 表已經算好（D3 trigger 維護）。

直接 SELECT 即可。available_qty 可以用 SQL `physicalQty - reservedQty` 計算或 service 算（Hank 工程判斷）。

### 5.2 反查 endpoint 三層接龍鎖結構

每筆 SO line item 回傳結構意圖：

```
{
  // SO line item 自身
  soLineItem: {
    id, soId, partId, warehouseId,
    quantity,
    transferSourceType,      // S=self / T=transfer / G=inquiry / B=co
    transferStatus,          // P/I/C
    fulfillStatus,
    expectedDeliveryDate     // 可能 null
  },
  
  // SO header（精選欄位）
  so: {
    id, docNo, soDate,
    customerId, customerName,    // 客戶名（join nx00_partner.partner_name）
    creatorId, creatorName,      // 建單者（從 nx04_so.createdBy join nx01_user.fullName）
    status
  },
  // 注意：creator = 建單者，不一定等於業務歸屬。
  // 既有 nx04_so 沒 salespersonId FK 欄位，B2 回傳 createdBy lookup 得來的 user。
  // 未來若業務反映需區分「建單者 vs 業務歸屬」，起 schema patch task 加 salespersonId FK。
  
  // 接龍鎖：依 transferSourceType 帶不同子物件
  refreshmentDoc: {
    type: 'self' | 'transfer' | 'inquiry' | 'co' | 'inquiry_pending',
    
    // type='self' (S)：null（不需補貨）
    
    // type='transfer' (T)：自倉調撥
    transfer: {
      stId, docNo,
      fromWarehouseId, fromWarehouseName,
      status,                    // ST 自身的 status
      expectedArrivalDate
    },
    
    // type='inquiry' (G) 已採用 QT：tiId 有值
    inquiry: {
      tiId, docNo,
      inquiryPartnerId, inquiryPartnerName,
      agreedPrice,
      status,
      expectedArrivalDate
    },
    
    // type='inquiry_pending' (G) 還沒採用 QT：tiId = null
    inquiryPending: {
      rfqId, docNo,
      rfqStatus,                 // P/Q/X/D
      qtCount,                   // 已收幾筆 QT
      partnerCount               // 涉及幾家不同 partner
    },
    
    // type='co' (B)：客戶訂單（CO 是客戶向我們訂貨、不是我們向廠商訂貨）
    co: {
      coId, docNo,
      customerId, customerName,
      status,
      expectedArrivalDate
    }
  }
}
```

**重要**：上面是「**意圖結構**」，實際 DTO 命名 / 欄位細節由 Hank 工程判斷。

### 5.3 接龍鎖反查的 N+1 問題防範

如果反查 100 筆 SO line item、每筆又要分別查 IT/TI/CO/RFQ → N+1 查詢災難。

實作必須用 Prisma `.include` 或單一 join SQL 一次撈完。Hank 看著辦。

### 5.4 排序穩定性

按 expectedDeliveryDate ASC NULLS LAST + soDate ASC。

**穩定性保證**：兩筆 SO line item 都 null + 同一天 soDate → 怎麼處理？
- 加第三層排序：so.docNo ASC（保證 deterministic）

### 5.5 多租戶隔離

B2 必須在 query 內帶 tenantId 過濾。所有 SO / IT / TI / CO / RFQ 查詢都要 join tenant 隔離。

這條跟 NEXORA 既有 multi-tenant 慣例一致，由 Hank 對照既有 controller 怎麼做即可。

---

## 6. 開放問題（給 Hank 工程判斷）

### Q1：兩個 endpoint 還是一個 endpoint 含參數

選項：
- (a) 拆兩個 endpoint：`/stock-summary` + `/stock-reservations`
- (b) 一個 endpoint，用 query param `?expand=reservations` 控制是否帶反查
- (c) 其他

由 Hank 看 NestJS 慣例 + 業務使用模式（總覽用很多次 / 反查偶爾用）決定。

**Alex 傾向 (a)**，但你決定。

### Q2：分頁

反查清單可能很長（100+ 筆 reserved 來源）。要分頁嗎？

選項：
- (a) 不分頁（全部回傳）
- (b) 分頁 + cursor
- (c) 分頁 + offset/limit

**Alex 傾向 (a) 不分頁**——理由：單一料號單一倉的 reserved 來源實務上不會超過 50 筆、分頁反而讓業務看不到全貌。但你工程判斷。

### Q3：cache

stock_balance 異動頻繁（每筆 SO 建立都會更新 reserved_qty）。要 cache 嗎？

**Alex 傾向不 cache**——理由：業務查反查就是要最新數字、cache 容易給錯資訊。你工程判斷。

### Q4：access control

選項：
- (a) 開放給所有登入 user（業務 + 倉管 + 採購都用得到）
- (b) 只給特定 role
- (c) 視 endpoint 不同

**Alex 傾向 (a) 開放**——這是純查詢 API、沒寫入動作、開放最方便。你工程判斷。

---

## 7. 業務拍板紀錄

| 議題 | 拍板結果 | 對應章節 |
|---|---|---|
| 反查包含哪些 SO line item | 只列未完成（transferStatus != 'C' 或 fulfillStatus != delivered）| §4.1 |
| 每筆顯示多詳細 | 見手心欄位 + 點進 SO 詳情看更多 | §4.2 |
| 預設排序 | 按 expectedDeliveryDate 升序、急件在上、null 排最後 | §4.3 |
| 反查見什麼 | 完整接龍鎖（SO line item + IT/TI/CO/RFQ）| §5.2 |

---

## 8. 不在這份文件範圍

| 項目 | 對應文件 |
|---|---|
| Schema 細節 | D3 / B5 schema patch |
| Trigger 維護 reserved_qty | D3-trigger |
| Translator 建立 SO line item | D4 |
| RFQ/QT/TI lifecycle | B5 |
| SO 完整詳情 API | 既有 SO API |
| 跨倉/跨料號反查 | Phase 2 W2 完整版 |
| stock_ledger 歷史變動 | 別的 task |
| 庫存報表 | NX08 |
| 前端 W2-mini UI | Phase 1 W2-mini spec |

---

## 9. 對 Hank 的交付要求

完成 B2 實作時請產出：

- `docs/nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md`（實作 spec，含 endpoint 設計、DTO、控制流）
- 2 個 API endpoint 的 NestJS controller + service
- 對應的單元測試 + 整合測試（至少：
  - 總覽 endpoint 1 案
  - 反查 type='S' / 'T' / 'G' 已採用 QT / 'G' 中間態 / 'B' 各 1 案 = 5 案
  - 排序測試（含 null 處理）1 案
  - 多租戶隔離 1 案
  - 共 8 案）
- 確認本意圖文件 5 條核心邏輯全部滿足

如有業務邏輯疑慮 → 暫停回報 Crown。

---

## 10. 對 Hank 的提示

### 10.1 Controller / service 位置

B2 屬庫存反查、預計位置：`apps/nx-api/src/nx03/stock/`（看既有結構決定）。

也可能放在 NX04 因為主要 caller 是業務 W2 工作台——你工程判斷。

### 10.2 可重用的工具

D4 / B5 已寫好的：
- 多租戶隔離 helper
- error class 結構
- DTO 命名慣例

不需要新建獨立 advisory lock（B2 是純讀、沒並發寫入問題）。

### 10.3 既有 NX03 stock service 是否存在

`apps/nx-api/src/nx03/` 看看有沒有現成的 stock query service 可以升級。如果沒有就新建。

### 10.4 type='G' 中間態的設計重點

§4.4 描述的「tiId = null 時走 RFQ 反查」是 B2 最複雜的一塊。建議實作步驟：
1. 先寫 type='S' / 'T' / 'B' 三條（無中間態）
2. 寫 type='G' 已採用 QT 的（有 tiId）
3. 最後寫 type='G' 中間態（透過 rev_Nx02Rfq_sourceSoItemId 反查）

每一步都加測試確認，避免最後 debug 不知道哪層出錯。

---

## 11. 跟其他文件的關係

| 文件 | 關係 |
|---|---|
| D3 意圖版 v1.1 | reserved_qty 雙帳設計 |
| D3-trigger | reserved_qty 維護機制 |
| D4 意圖版 | SO line item 寫入點 |
| D4-impl spec | 可重用 multi-tenant helper / error class |
| B5 意圖版 v2 | RFQ/QT/TI lifecycle、type='G' 中間態邏輯來源 |
| B5-A schema patch | nx02_rfq.source_so_item_id（B2 反查 RFQ 路徑用）|
| Phase 1 W2-mini spec（未寫）| B2 是 W2-mini 主要 caller |

---

## 12. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版意圖文件，含 Crown 對 4 題拍板結果（未完成 / 見手心 / 急件在上 / 接龍鎖）|
| 2026-04-27 | 1.1 | B2-impl spec review 揭露兩處意圖版疏漏：(1) §5.2 salesperson 改 creator（既有 nx04_so 沒 salespersonId FK、改用 createdBy lookup user.fullName）；(2) §5.2 type='co' 對象從 vendorPartnerName 改 customerName（CO 業務語意修正：CO 是客戶訂單、非廠商訂單）|

---

*文件結束*
