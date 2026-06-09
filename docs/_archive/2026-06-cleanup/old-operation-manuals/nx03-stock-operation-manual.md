<!-- docs/_team/nx03-stock-operation-manual.md -->

# NX03 庫存模組操作手冊（LITE 階段 2）

> 撰寫：Hank（Claude Code）
> 對應：feature/nx03-stock-lite 整軌（M1 + M2-A/B/C/E/F + M3-1 + M3-2 + M3-3a + M3-3b + M4）
> 用途：Crown 親測庫存完整流程的操作指南
> 範式：對齊 docs/_team/nx02-purchase-operation-manual.md
>
> ⚠️ Hank 無法跑瀏覽器驗證、本手冊步驟為「依後端 API + UI 程式碼推導的預期行為」。
> Crown 實測有發現不對的、Hank 即改。

---

## 0. 開始前

### 0.1 啟動環境
```bash
# Terminal 1：後端
cd C:\nexora
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

### 0.3 庫存模組入口
登入後左側導覽「庫存中心」或直接訪問 `/dashboard/inventory`。
看到 5 個 section（桌面版）：
- 主檔管理：庫位設定 / 產品設定
- 庫存查詢與異常處置：庫存查詢 / 異常回報 / 重組分解
- 盤點：盤點工作台
- 出貨：撿貨 / 包貨 / 送貨（M3-3 不含、銷貨階段做）
- 進貨：驗貨 / 上架（M3-3 不含、進貨已做）

⚠️ Hub 桌面版維持原 4 section + LITE 補的「庫存查詢與異常處置」共 5 section、
手機版用 InventoryHubMobile 4 分區架構（FU-stock-lite-03：mobile 用 mock data、未接真實 API）。

---

## 1. 模組概觀

| # | 功能 | 路徑 | 後端 module |
|---|------|------|-------------|
| 1 | 盤點工作台 | `/dashboard/inventory/stocktake` + `/[id]` | `nx03/stocktake` |
| 2 | 庫存查詢三維度 | `/dashboard/inventory/stock-query` | `nx03/stock-query` |
| 3 | 異常回報 | `/dashboard/inventory/issue-report` + `/[id]` | `nx03/issue-report` |
| 4 | 重組 / 分解 | `/dashboard/inventory/conversion` + `/[id]` | `nx03/conversion` |
| 5 | 庫位設定 | `/dashboard/inventory/warehouse/locations` | `features/shared/master/location` |
| 6 | 產品設定（庫存維度）| `/dashboard/inventory/part-stock-setting` | `nx03/part-stock-setting` |
| 7 | 補貨通知（被動）| `/dashboard/task-pool` | `nx98/task-pool` |

「被動」= 不直接操作、盤點 POSTED 自動寫待辦。

---

## 2. 盤點工作台

### 2.1 路徑
`/dashboard/inventory` → 盤點工作台卡片 → `/dashboard/inventory/stocktake`

### 2.2 狀態流轉

```
DRAFT ─(1)→ COUNTING ─(2)→ ADJUSTING ─(3)→ (送審) ─(4)→ POSTED
   ↓               ↓                  ↓                ↑
   └─ CANCELLED ───┘                  └─ (核可 A/R 簽核) ┘
                                       └─ approvalStatus 流轉 N→P→A/R
```

| approvalStatus | 意義 |
|---------------|------|
| N | 未送審（DRAFT/COUNTING/ADJUSTING） |
| P | 等簽核（送審後超過小門檻） |
| A | 已核可（autoPass 或主管按通過） |
| R | 已退回（主管按退回、回 ADJUSTING） |

⚠️ POSTED 強制 `approvalStatus='A'`、不允許跳過送審（即使 smallTol=0 + 零差異也要走一次 submitForApproval auto-pass）。

### 2.3 操作步驟

#### 2.3.1 建立盤點單（DRAFT）
1. List 頁右上「+ 新增盤點單 (N)」（或按鍵盤 N）
2. 填 4 欄：
   - 🟢 倉庫 ID *
   - 🟢 盤點日期 *（預設今日）
   - 🟡 核可小門檻 NT$（差異成本 ≤ 此值倉管自過、超過要 G 簽核）
   - ⚪ 備註
3. 「建立並進入」→ 跳 detail 頁、status=DRAFT

#### 2.3.2 加盤點明細
1. detail 頁下方 inline form
2. 填 4 欄：partId / locationId / 初盤量（可空）/ 備註
3. 「新增明細」→ 行加入 table、systemQty 自動帶 stock_balance
4. 重複加多筆

⚠️ 目前 partId / locationId 是文字輸入（FU-stock-lite-01 主檔 picker 未做）。

#### 2.3.3 啟動盤點（DRAFT → COUNTING）
detail 頁「1️⃣ 啟動盤點」→ status=COUNTING、`snapshotStartedAt` 自動記錄
動態盤點開始：snapshot 鎖、後續 inbound/outbound 不影響本盤、
formulaExpectedQty = snapshotQty + deltaQty 自動算

#### 2.3.4 進入調整（COUNTING → ADJUSTING）
1. 在 COUNTING 階段填每行的 countedQty（盤點實際量）
2. realDiffQty = countedQty - formulaExpectedQty 自動算
3. 對有差異的行選「差異原因」（S 被偷 / M 算錯 / B 破損 / U 不明）
4. 點「2️⃣ 進入調整」→ status=ADJUSTING、`snapshotEndedAt` 自動記錄

#### 2.3.5 送審（ADJUSTING + N/R）
1. 點「3️⃣ 送審」→ 後端 submitForApproval
2. 即時計算：maxItemDiffCost = max(abs(realDiffQty × unitCost)) over items
3. 比對 smallToleranceQty：
   - `maxItemDiffCost ≤ smallTol` → autoPass=true、approvalStatus='A'、可直接過帳
   - `maxItemDiffCost > smallTol` → approvalStatus='P'、等主管簽核
4. UI 跳出「送審結果」訊息

#### 2.3.6 核可決定（ADJUSTING + P，主管動作）
1. 主管在 detail 頁看到「✅ 核可通過」與「❌ 退回」兩鈕
2. 通過 → approvalStatus='A'、可進入過帳
3. 退回 → approvalStatus='R'、回到 ADJUSTING 階段、倉管修明細再送

⚠️ 目前任何 user 都可按通過 / 退回（FU-stock-lite-04 盤點核可 RBAC 未做）。

#### 2.3.7 過帳（ADJUSTING + A → POSTED）
1. 點「4️⃣ 過帳」→ status=POSTED、`postedAt` 記錄
2. 後端動作：
   - 對每行的 realDiffQty 寫 stock_ledger（IN 或 OUT、依差異正負）
   - 更新 stock_balance.onHandQty + avgCost
   - **檢查所有 (partId, warehouseId) 組合的 PartStockSetting.minQty**
   - 低於安全量 → 寫 nx98_task_pool 補貨通知（OPEN、category=STOCK_REPLENISH、priority=H）
3. POSTED 後唯讀

### 2.4 預期結果
- POSTED 盤點寫 ledger、balance 對齊真實量
- 缺料自動產補貨待辦（庫存查詢看到 onHandQty 降低 + 待辦池看到任務）

### 2.5 ⚠️ Follow-up
- FU-stock-lite-04 盤點核可 RBAC enforce（決定簽核權限對應 ABCD/EF 主管）— **未做**

---

## 3. 庫存查詢三維度

### 3.1 路徑
`/dashboard/inventory` → 庫存查詢 → `/dashboard/inventory/stock-query`

### 3.2 三 tab

| Tab | endpoint | 維度 |
|-----|---------|------|
| by-part | GET `/nx03/stock-query/by-part?partId=...` | 單一料號 × 多倉庫聚合 |
| by-location | GET `/nx03/stock-query/by-location?warehouseId=...` | 單倉庫 × 多庫位（純從 ledger groupBy aggregate） |
| by-warehouse | GET `/nx03/stock-query/by-warehouse?warehouseId=...` | 單倉庫 × 多料號聚合 |

### 3.3 操作步驟

#### 3.3.1 by-part（料號維度）
1. 切到 by-part tab
2. 輸入 partId → 查詢
3. 顯示該料號在所有倉庫的 onHandQty / availableQty / avgCost

#### 3.3.2 by-location（庫位維度）
1. 切到 by-location tab
2. 輸入 warehouseId → 查詢
3. 顯示該倉庫每個 location 的庫存狀況
4. **aggregate 純從 stock_ledger.groupBy 算**（Crown 拍板 B = 方案 C、不改 balance schema）
5. per-location avgCost ≡ per-warehouse avgCost（同倉同料同成本、balance schema 拍板）

#### 3.3.3 by-warehouse（倉庫維度）
1. 切到 by-warehouse tab
2. 輸入 warehouseId → 查詢
3. 顯示該倉庫所有料號的庫存狀況

### 3.4 預期結果
- 三個維度都能讀到 stock_balance 對齊的數字
- 盤點 POSTED 後刷新查詢、看到 onHandQty 對齊調整量

### 3.5 ⚠️ Follow-up
- FU-stock-lite-01 partId / warehouseId autocomplete（目前文字輸入）— **未做**

---

## 4. 異常回報

### 4.1 路徑
`/dashboard/inventory` → 異常回報 → `/dashboard/inventory/issue-report`

### 4.2 狀態流轉

```
DRAFT ──(report)──→ REPORTED ──(dispose)──→ PROCESSING ──(close)──→ CLOSED
   │                    │                          │
   └────────────────────┴──── (cancel) ────────────┴───→ CANCELLED
```

### 4.3 5 異常 × 5 處置

**issueType（5 異常）**：
| 代號 | 中文 | locationId |
|------|------|-----------|
| D | 損毀 | 選填 |
| E | 過期 | 選填 |
| S | 數量短缺 | 選填 |
| L | 放錯庫位 | **必填**（前後端對齊） |
| O | 其他 | 選填 |

**dispositionType（5 處置）軟連結**：
| 代號 | 中文 | relatedDocId 軟連結到 |
|------|------|---------------------|
| R | 退貨 | Nx02Rr |
| W | 保固 | Nx02WarrantyClaim |
| C | 重組分解 | Nx03Conversion |
| D | 報廢 | Nx03Disposal |
| N | 未處置 | 無 |

⚠️ relatedDocId 不強制（軟連結特性、UI 可後補）。

### 4.4 操作步驟

#### 4.4.1 建立異常（DRAFT）
1. List 頁右上「+ 新增異常 (N)」（或按 N）
2. 填 7 欄：
   - 🟢 倉庫 ID * / 庫位 ID（issueType=L 時 *）
   - 🟢 料號 ID * / 數量 *
   - 🟢 異常類型 *（5 選 1、選 L 庫位變必填）
   - 🟡 回報日 *
   - ⚪ 描述
3. 「建立並進入」→ detail 頁、status=DRAFT、dispositionType 預設='N'

#### 4.4.2 編輯（DRAFT / REPORTED 階段）
detail 頁下方「編輯」form、可改 issueType / qty / locationId / reportDate / description。
PROCESSING / CLOSED / CANCELLED 唯讀。

#### 4.4.3 提交（DRAFT → REPORTED）
detail 頁「1️⃣ 提交」→ status=REPORTED、向倉管 / 主管出聲。

#### 4.4.4 處置分流（REPORTED → PROCESSING）
1. detail 頁「2️⃣ 處置分流」section
2. 選 dispositionType（5 選 1）
3. 填 relatedDocId（如 NX02RR... / NX03CV...、軟連結可後補）
4. 「送出處置」→ status=PROCESSING、dispositionType + relatedDocId 寫入

#### 4.4.5 結案（PROCESSING → CLOSED）
1. detail 頁「3️⃣ 結案備註」
2. 填處置結果 / 客戶溝通 / 後續追蹤
3. 「結案」→ status=CLOSED、closedAt 記錄、備註會用 `[結案備註]` 前綴追加到 description

#### 4.4.6 作廢（任意 → CANCELLED）
detail 頁右上「作廢」、確認對話 → status=CANCELLED（誤報 / 撤銷）。

### 4.5 預期結果
- 5 異常 × 5 處置矩陣覆蓋全異常場景
- 處置分流 audit log 寫入（actor / before / after / summary）
- closed 後 description 含結案備註、可追溯

### 4.6 ⚠️ Follow-up
- 跨模組 trigger 自動建異常單（如進貨退貨自動回報損毀）— **未做**

---

## 5. 重組 / 分解

### 5.1 路徑
`/dashboard/inventory` → 重組 / 分解 → `/dashboard/inventory/conversion`

### 5.2 兩 mode

| conversionType | 中文 | inputs | outputs | 成本算法 |
|---------------|------|--------|---------|---------|
| M | 重組 | N 行 | 1 行（鎖） | output.unitCost = Σ (input.qty × input.avgCost) / output.qty |
| D | 分解 | 1 行（鎖） | N 行 | output.unitCost 按 priceA 或 costRatio 分攤 |

### 5.3 D 分解兩種 cost 模式（service 自律）

- **auto mode**（outputs.costRatio 全空）：按 part.priceA × output.qty 比例分攤
- **manual mode**（outputs.costRatio 全填）：unitCost = inputTotalCost × costRatio / output.qty、**Σ costRatio 必須 = 1.0**
- **mixed**（部分填、部分空）→ 後端 BadRequest 擋下

### 5.4 操作步驟

#### 5.4.1 建立轉換單（DRAFT）
1. List 頁右上「+ 新增轉換單 (N)」（或按 N）
2. 表單頂部選 conversionType（M / D）、warehouseId、conversionDate、備註
3. inputs 區（M 可多行、D 鎖 1 行）：每行 partId / locationId / qty / 備註
4. outputs 區（M 鎖 1 行、D 可多行）：每行 partId / locationId / qty / costRatio（D 才顯示）/ 備註
5. 「建立並進入（DRAFT）」

⚠️ **建單後 inputs / outputs 不可改**（後端 update DTO 不支援、要改作廢重建）。

#### 5.4.2 過帳（DRAFT → POSTED）
1. detail 頁「✅ 過帳」、確認對話
2. 後端動作：
   - **M 重組**：
     - 每行 input 走 applyQtyOutWithLedger（source=M、helper 用當下 avgCost）
     - 累計 totalInputCost = Σ (input.qty × avgCost)
     - output 走 applyQtyInWithLedger（source=M、unitCost = totalInputCost / output.qty）
   - **D 分解**：
     - input 走 applyQtyOutWithLedger（source=D）+ 算 inputTotalCost = input.qty × avgCost
     - outputs：依 auto / manual mode 算每行 unitCost、走 applyQtyInWithLedger（source=D）
3. POSTED 後唯讀、unitCost / totalCost 更新到 inputs / outputs table

#### 5.4.3 作廢（DRAFT → VOIDED）
1. detail 頁右上「作廢」、確認
2. status=VOIDED、不可恢復、要做就新建

### 5.5 預期結果
- M 重組：inputs 全扣、output 入庫、加權成本對齊
- D 分解：input 扣、outputs 入庫、cost mode 對應算法
- stock_ledger 寫入完整、可從庫存查詢驗證量變化

### 5.6 ⚠️ Follow-up
- Conversion 草稿改明細（後端要開新 endpoint：addInput/removeInput/addOutput/removeOutput）— **不做**（Alex 拍板「建單定型」是 LITE 可接受）
- FU-stock-lite-01 partId / locationId autocomplete — **未做**

---

## 6. 庫位設定

### 6.1 路徑
`/dashboard/inventory` → 倉位 / 庫位管理 → `/dashboard/inventory/warehouse/locations`

### 6.2 操作步驟
1. List 顯示所有 location（含 warehouse / area / row / col / level / capacityM3）
2. 新增 / 編輯：fill 倉庫 + 庫位 code/name + 物理座標 + 容量
3. 「停用」（軟刪除 isActive=false）+ PowerOff icon（系統不刪資料規範）

### 6.3 ⚠️ 注意
- 庫位 code 在同 warehouse 內 unique
- 「停用」後不會在 issue-report / stocktake / part-stock-setting 的下拉出現、但既有引用仍可讀

---

## 7. 產品設定（庫存維度）

### 7.1 路徑
`/dashboard/inventory` → 產品設定 → `/dashboard/inventory/part-stock-setting`

### 7.2 三大欄位

| 欄位 | 用途 | warnings |
|------|------|---------|
| minQty | 安全量、低於發補貨通知 | — |
| maxQty | 最高量、補貨建議補到此量 | safety > max 時警示 |
| defaultLocationId | 預設庫位、進貨上架建議 | 必屬同 warehouse |

### 7.3 操作步驟
1. List 顯示所有 (part × warehouse) 設定
2. 新增 / 編輯：選料件 + 倉庫 + 填 minQty / maxQty / defaultLocationId
3. 存檔時若 minQty > maxQty → 顯示警示（不擋、純提醒）
4. 「停用」（軟刪）

### 7.4 suggestLocation endpoint（被動）
進貨上架 / 異常處置時可呼叫 `GET /nx03/part-stock-setting/suggest-location?partId=&warehouseId=` 拿到預設庫位 ID（無則回 null）。

### 7.5 預期結果
- 盤點 POSTED 後 minQty 比對觸發 nx98 待辦
- 進貨上架（NX02 RR + 階段 3 銷貨入庫）取 defaultLocationId 為建議

---

## 8. 補貨通知（盤點 → nx98 task-pool 自動寫入）

### 8.1 觸發時機
盤點過帳（POSTED）on transaction、stocktake.service.ts:807 `writeReplenishTasks`。

### 8.2 寫入條件
對 stocktake 涉及的每個 (partId, warehouseId) 唯一組合：
1. PartStockSetting.minQty > 0
2. stock_balance.onHandQty < minQty
3. 同 stocktake 同 part+warehouse 無 OPEN / CLAIMED 任務（避免重複）

### 8.3 寫入內容
```
sourceModule: 'nx03'
sourceDocType: 'stock-take'
sourceDocId: <stockTakeId>
sourceDocNo: <docNo>
title: 補貨通知：{partNo} {partName}（庫存 X < 安全量 Y）
description: ...含 partId:... + warehouseId:... + 缺料量 + 建議補貨量
category: 'STOCK_REPLENISH'
priority: 'H'
status: 'OPEN'
```

建議補貨量算法：
- 有 maxQty 設定 → `target.sub(onHand)` = maxQty - onHandQty
- 無 maxQty → 補到剛好 = shortage = minQty - onHandQty

### 8.4 觀察方式
1. 跑完盤點 POSTED
2. 訪問 `/dashboard/task-pool` → 「池中（未領）」tab
3. 看到剛產生的補貨任務（priority=H 標紅）

### 8.5 業務流轉
- 採購人員「領取」→ status=CLAIMED、assignee=自己
- 完成補貨建單後「完成」→ DONE
- 誤報「作廢」→ VOIDED

### 8.6 ⚠️ Follow-up
- FU-05 待辦池業務模組自動 trigger（保固 / RR 建立等）— 與 NX02 共用、**未做**
- FU-06 待辦池 RBAC enforce — **未做**
- FU-07 待辦池 detail page — **未做**
- FU-08 待辦池 realtime — **未做（PLUS）**

---

## 9. 三層欄位操作

### 9.1 現況
NX03 LITE 各 UI **內聯 🟢🟡⚪ icon 標示欄位層級**、但**未走 TieredFormProvider**（FU-stock-lite-02）。

### 9.2 三層意義（沿用 NX02 framework）
- 🟢 必要：核心欄位、永遠顯示（必填）
- 🟡 建議：業務常用、本軌仍顯示但用色提示
- ⚪ 進階：罕用、本軌仍顯示但用色提示

### 9.3 Alt+L 鍵盤切換
- ⚠️ NX03 LITE 表單不接受 Alt+L（未走 Provider）
- 想體驗 framework 請去 `/dashboard/tiered-form-demo`

### 9.4 ⚠️ Follow-up
- FU-stock-lite-02 NX03 LITE UI 整合 TieredFormProvider（盤點 / 異常 / 重組 / 庫位 / 產品設定 form 改用 Provider + Toolbar）— **未做**

---

## 10. 整軌 Follow-up 清單

下列功能本軌**未做**、Crown 測試時遇到請標、後續軌補：

### 10.1 NX03 LITE 軌內留下（M3 中途登記）
| 編號 | 項目 | 影響 |
|------|------|------|
| FU-stock-lite-01 | 主檔 picker（partId / warehouseId / locationId autocomplete）| 中、目前文字輸入 |
| FU-stock-lite-02 | UI 整合 TieredFormProvider | 小、Alt+L 切換不能用 |
| FU-stock-lite-03 | Mobile 版整合（InventoryHubMobile + MobileLocationListPage 用 mock data、未接真實 API）| 中 |
| FU-stock-lite-04 | 盤點核可 RBAC enforce（決定簽核權限對應 ABCD/EF 主管）| 中 |

### 10.2 Conversion 草稿改明細
- **不做**（Alex 拍板）：建單即定型、要改作廢重建
- 若未來客戶反映打字打太久 → 才開後端 addInput/removeInput/addOutput/removeOutput endpoint

### 10.3 待辦池（與 NX02 共用、跨軌）
- FU-05 業務模組自動 trigger（保固 / RR 建立等）
- FU-06 RBAC enforce
- FU-07 detail page
- FU-08 realtime（PLUS）

### 10.4 跨模組落差（待後續模組補）
- Inbound / Outbound 表保留但本軌不開 UI（Alex 拍板、進貨改走 applyQtyInWithLedger 直入、銷貨階段 3 才接點 Outbound）

---

## 11. 業務流程完整測試清單（給 Crown 親測）

### 11.1 盤點完整流程
- [ ] 建盤點單 DRAFT（填倉庫 + 日期 + 小門檻）
- [ ] 加 3-5 筆明細（部分 systemQty != countedQty）
- [ ] 啟動盤點 DRAFT → COUNTING、snapshotStartedAt 記錄
- [ ] 填 countedQty 看 realDiffQty 自動算
- [ ] 選差異原因（S/M/B/U 各 1 筆）
- [ ] 進入調整 COUNTING → ADJUSTING、snapshotEndedAt 記錄
- [ ] 送審：
  - [ ] smallTol=0 + 零差異 → autoPass=true、approvalStatus='A'
  - [ ] smallTol=100 + maxItemDiffCost=200 → approvalStatus='P'、等簽
- [ ] 主管按通過 → A，按退回 → R 回 ADJUSTING
- [ ] 過帳 ADJUSTING+A → POSTED、postedAt 記錄
- [ ] 確認 stock_balance 對齊（庫存查詢看 onHandQty）
- [ ] 確認 nx98 task-pool 寫入補貨通知（缺料條件）

### 11.2 庫存查詢三維度
- [ ] by-part 輸 partId 看多倉聚合
- [ ] by-location 輸 warehouseId 看每庫位
- [ ] by-warehouse 輸 warehouseId 看多料聚合
- [ ] 三維度 onHandQty 對齊盤點後的調整量

### 11.3 異常回報 5 處置矩陣
- [ ] 5 異常各建一筆（D 損毀 / E 過期 / S 短缺 / L 放錯 / O 其他）
  - [ ] L 放錯不填 locationId → 後端 BadRequest 擋下
- [ ] 5 處置流程各跑一輪（R 退貨 / W 保固 / C 重組 / D 報廢 / N 未處置）
  - [ ] 帶 relatedDocId（如 NX02RR... NX03CV...）
- [ ] 結案後 description 含結案備註
- [ ] 作廢一筆 → status=CANCELLED

### 11.4 重組 / 分解
- [ ] M 重組：2-3 inputs → 1 output、過帳、檢查 output.unitCost = 加權成本
- [ ] D 分解 auto：1 input → 3 outputs、costRatio 全空 → 按 priceA 比例分攤
- [ ] D 分解 manual：1 input → 3 outputs、costRatio 全填 [0.5, 0.3, 0.2]、Σ = 1.0
- [ ] D 分解 mixed：1 個有 costRatio、其他無 → 後端 BadRequest 擋下
- [ ] 過帳後庫存查詢驗 inputs 扣、outputs 入
- [ ] 作廢一筆未過帳的單

### 11.5 庫位 / 產品設定
- [ ] 新建 location、停用一個
- [ ] 新建 PartStockSetting：填 minQty=10 / maxQty=50 / defaultLocationId
  - [ ] minQty > maxQty 時警示
- [ ] 從盤點觸發補貨：故意盤點到 onHand < minQty → POSTED → task-pool 看到任務

### 11.6 待辦池整合
- [ ] 盤點觸發補貨任務後、訪問 task-pool 「池中」tab 看到
- [ ] 領取 / 完成 / 放回池 / 作廢 4 動作
- [ ] 連續兩次同 stocktake 過帳 → 不重複寫待辦（duplicate-check 邏輯）

### 11.7 整體
- [ ] 庫存中心 hub 5 入口都通、無 404
- [ ] 三租戶 LITE/PLUS/PRO 都能登入跑庫存
- [ ] 桌面版 5 section 顯示正常
- [ ] 手機版（InventoryHubMobile）顯示正常（資料是 mock）

---

## 12. 整軌驗證紀錄

### 12.1 自動化驗證（Hank 跑過）
| 項目 | 結果 |
|------|------|
| `prisma migrate status` | ✅ 88 migrations + 1 lock = 89 dirs、Database schema up to date |
| `pnpm --filter nx-api run build` | ✅ EXIT=0 |
| `pnpm --filter nx-ui run build` | ✅ EXIT=0、4 組新路由（stocktake / stock-query+設定 / issue-report / conversion） |
| `pnpm seed` 三租戶 | ✅ SYSTEM + LITE/PLUS/PRO 全綠、role-view 708 × 3 |
| 5 張新表 dev DB | ✅ nx03_issue_report / nx03_conversion / nx03_conversion_input / nx03_conversion_output / nx98_task_pool |

### 12.2 跨模組接點驗證（讀 service code）
| 接點 | 位置 | 狀態 |
|------|------|------|
| 盤點 POSTED → nx98 task-pool | stocktake.service.ts:807 writeReplenishTasks | ✅ 同 tx、避重 |
| IssueReport dispose 5 處置軟連結 | issue-report.service.ts STATUS_EDGES | ✅ 5 dispositionType 完整、relatedDocId 軟連結 |
| Conversion 過帳寫 ledger | conversion.service.ts applyMergePosting / applyDisassemblePosting | ✅ 13 處 applyQtyIn/OutWithLedger 呼叫 |
| nx03.module wire | nx03/nx03.module.ts | ✅ IssueReport/Conversion/StockQuery/PartStockSetting 4 新 controller+service 都註冊 |

### 12.3 瀏覽器互動驗證
⚠️ Hank 無法跑、跳過。Crown 親測（見 §11 清單）。

---

## 13. 對應 commit 與環境

### 13.1 整軌 commit history（feature/nx03-stock-lite）
```
M1     19b4c10 schema: 1 新表 + 4 欄位 + AutoReplenish 標 deprecated
M2-A/B 3bdb4c0 盤點核可流轉 + POSTED→nx98 補貨通知
M2-F   dce38fc PartStockSetting + suggestLocation + warning
M2-E   fde6862 庫存查詢三維度 aggregate
M2-C   c749f43 IssueReport 跨模組異常回報 + 5 處置分流
M3-1   877d236 hub + 盤點工作台 UI
M3-2   62df415 庫存查詢三維度 + 庫位設定 + 產品設定 UI
M3-3a  3beb654 異常回報 UI
M3-3b  4a9d2b7 重組 / 分解 UI
M4     c798910 整合驗證（empty commit、驗證寫 message）
M5     <本 commit> 操作手冊
```

### 13.2 環境提醒
- **Prisma 7**：`migrate dev` / `migrate reset` 不會自動跑 seed、要手動 `pnpm seed`
- **GitHub CLI 沒裝**：PR 要 Crown 手動開
- **Railway production**：累計落後 88 支（A077、本軌不動、真實客戶簽約前 2~4 週才同步）

---

> 本手冊持續更新。Crown 測試遇到落差、Hank 對齊真實行為更新。
> 對應 commit history：feature/nx03-stock-lite 整軌 11 commits（M1~M5）。
