<!-- docs/_team/nx04-sales-operation-manual.md -->

# NX04 銷貨 LITE — 操作手冊

> 範圍：LITE 階段 3 銷貨模組（NX04-M1 ~ NX04-M6）
> 對應 merge：`feature/nx04-sales-lite` 整軌 → main
> 對應 tag：`v1.4.0-nx04-sales-lite-closure`
> 撰寫時機：2026-05-29 M5 落地
> 使用情境：總經理親測 + 業務員 / 倉管日常使用

---

## §1 模組概觀

### 1.1 7 大工作台

| # | 工作台 | 路徑 | 主要使用者 |
|---|--------|------|----------|
| 1 | 銷貨模組首頁（hub） | `/dashboard/nx04` | 全員 |
| 2 | 報價單 QT | `/dashboard/nx04/quote` | 業務員 |
| 3 | 銷貨單 SO | `/dashboard/nx04/sales-order` | 業務員 + 撿貨人員 |
| 4 | 銷退單 SR | `/dashboard/nx04/sales-return` | 業務員 + 倉管 |
| 5 | 同行調貨 IT-O 觸發 | SO detail modal | 業務員 |
| 6 | 客戶等級變更 | `/dashboard/nx04/partner-grade-history` | 業務員（申請）|
| 7 | 待核可清單（OWNER）| `/dashboard/owner/grade-approvals` | G 主管 / 老闆 |

跨單據共用：每個 detail 頁右上「🚨 問題回報」按鈕（QT/SO/SR）→ 寫 Nx03IssueReport

### 1.2 全鍵盤範式

| 鍵 | 動作 |
|----|------|
| `N` | 新增一筆 |
| `R` | 重新整理列表 |
| `Esc` | 關閉 modal（點 backdrop 同效）|

⚠️ 在 INPUT / SELECT / TEXTAREA 內按鍵不觸發、避免打字搶鍵。

### 1.3 LITE 階段已知限制

- 所有 ID 欄位（partnerId / partId / warehouseId / locationId / customerGradeId）為純文字輸入、未補 picker → FU-sales-lite-11
- TieredFormProvider 形式對齊、未真分層欄位 → FU-sales-lite-12
- Mobile 端銷貨 features（features/sale/{hub,inquiry,sop-workspace,fulfillment}）不在本軌範圍 → FU-sales-lite-08
- 部分原因 / 取消原因用 `window.prompt`、非 modal → 視覺粗、功能正確、FU 後續軌統一改

---

## §2 報價單工作台 QT

### 2.1 路徑

| 操作 | 路徑 |
|------|------|
| 列表 | `/dashboard/nx04/quote` |
| 詳情 | `/dashboard/nx04/quote/[id]` |

### 2.2 業務流程

```
DRAFT（草稿、業務開單）
  → SENT（已寄出給客戶）
    → ACCEPTED（被 SO 採用、自動）
    → REJECTED（客戶拒絕）
    → EXPIRED（已過期）
  → CANCELLED（任一階段作廢）
```

### 2.3 開立 QT（業務員）

1. `/dashboard/nx04/quote` 按 **N** 或「新增報價 (N)」
2. 填倉庫 ID / 客戶 ID / 客戶等級 ID / 報價日 / 有效至 / 稅率 / 備註
3. 「建立並進入」→ 跳詳情頁
4. 詳情頁「新增明細」表單：填料號 ID + 數量 + 單價
5. 按 📜 圖示先查該客戶歷史價（自動帶上一次單價、可改）
6. 提交「新增明細」→ 明細表多一行
7. 重複 4~6 加多行
8. 按「寄出 → SENT」（紅黃色按鈕、僅 DRAFT 可見）

### 2.4 毛利警告

- 系統檢查 `unitPrice < minPrice`（依客戶等級 marginPct 計算）→ 顯示紅字 + 警示
- 業務員若仍要送出、必填「低於最低售價原因」欄位
- 警示不擋送單、純提醒（業務判斷）

### 2.5 採用後失效

- 業務員在 SO 拉用 QT 後、系統自動把該客戶同料件的舊 QT 標 `CANCELLED`（cascade）
- 同 QT 全行採用 → 整張 `ACCEPTED`
- 部分採用 → 拉光的 line `transferredQty=qty`、整張仍 `SENT`

### 2.6 Crown 親測 checklist

- [ ] 新增 QT、加 2~3 明細、寄出、確認 status 變 SENT
- [ ] 查歷史價 📜 按鈕、確認該客戶過往同料件記錄
- [ ] 試輸入低於最低售價 + 帶原因 → 加成功
- [ ] 試輸入低於最低售價 + 不帶原因 → 應被擋下提示
- [ ] 作廢 QT、輸入原因 → status 變 CANCELLED

---

## §3 銷貨單工作台 SO ⭐（M3 最複雜）

### 3.1 路徑

| 操作 | 路徑 |
|------|------|
| 列表 | `/dashboard/nx04/sales-order` |
| 詳情 | `/dashboard/nx04/sales-order/[id]` |
| 舊 placeholder | `/dashboard/nx04/domestic` → redirect 至 `sales-order` |

### 3.2 業務流程

```
DRAFT（草稿）
  → CONFIRMED（已確認、自動觸發調撥）
    → PICKING（撿貨中）
      → SHIPPED（已出貨、扣帳 + 建 AR + 建 DN + 寫排行榜）
        → INVOICED（已開立）
      → CANCELLED
    → CANCELLED
  → CANCELLED
```

### 3.3 開立 SO（業務員）

1. `/dashboard/nx04/sales-order` 按 **N**
2. 填倉庫 / 客戶 / 銷貨日 / 交貨方式（P 自取 / D 配送 / S 寄送）/ 稅率
3. 「建立並進入」→ 跳詳情頁

### 3.4 拉舊報價（核心特色 1）

1. SO detail 按「📜 拉客戶舊報價」展開 panel
2. panel 顯示該客戶所有 OPEN 報價行（DRAFT / SENT / ACCEPTED + isSelected=true + 還有剩餘量）
3. 勾選要拉的行（多選）、各別調整本次數量（預設剩餘量）+ 補貨來源（S/T/G/B）
4. 按「加入 N 行到 SO」→ 批次加進 SO + 累加 quoteItem.transferredQty
5. 可同時搭配下方「新增明細（純新行、未拉報價）」加新料件
6. 全部加完 → SO 推進至 CONFIRMED

⚠️ 補貨來源說明：
- **S 本倉現貨** — 系統不額外調撥、transferStatus 直接 C
- **T 自倉調撥** — 從其他倉支援、CONFIRMED 時自動建 NX03 調撥單
- **G 同行調貨** — 向同行買貨、UI 警示橫條 + 手動建 IT-O（§3.6）
- **B 客戶訂單** — 客訂特殊料、業務手動處理

### 3.5 雙段狀態組合顯示（核心特色 2）

每行有 2 個獨立狀態欄、合併顯示給業務員看：

| transferStatus | fulfillStatus | 顯示 |
|---------------|---------------|------|
| P 待補 | W 等貨 | 「等貨」（黃）|
| I 補貨中 | * | 「補貨中」（藍）|
| C 補貨完成 | W 等貨 | 「等撿貨」（紫）|
| * | PK 撿貨中 / PL 包裝中 | 「撿包中」（靛）|
| * | D 已出貨 / F 已完成 | 「已出貨」（綠）|

明細表「細節」欄位另外明細顯示兩段原始狀態、給好奇心強的人看。

### 3.6 IT-O 同行調貨觸發（核心特色 3）

1. SO 任一行 `transferSourceType='G' + transferStatus='P' + tiId=null` 存在
2. SO detail 頂端自動顯示 ⚠️ amber 警示橫條：「此銷貨單有 N 行需向同行調貨」
3. 按「建調貨單 →」打開 modal
4. modal 顯示所有待調貨行（預設全選）
5. 業務員輸入同行對象 partnerId（必須是 partner_type='O' 或 canTransferStock=true）
6. 確認 → 後端：
   - 建 NX02 TI 草稿（status='D'、unitCost=0）
   - 每行對應一個 TiItem（sourceSoItemId 連結）
   - SO line 更新：`transferStatus='I'`（補貨中）+ `tiId` 連結
7. modal 自動跳轉 NX02 TI detail 頁
8. 業務員在 NX02 回填 unitCost 後 POSTED → 觸發 RR 入庫
9. RR POSTED 後（FU-sales-lite-10 待 NX02 那邊串）回沖 SO line → `transferStatus='C'`

### 3.7 狀態推進

| 從 | 至 | 觸發 | 後端動作 |
|----|-----|------|---------|
| DRAFT | CONFIRMED | 「推進 → CONFIRMED」 | autoCreateTransferFromSo 自動調撥 |
| CONFIRMED | PICKING | 「推進 → PICKING」 | 無 |
| PICKING | SHIPPED | 「推進 → SHIPPED」 | applyQtyOutWithLedger 扣帳 + AR + DN + 排行榜 |
| SHIPPED | INVOICED | 「推進 → INVOICED」 | 無 |
| * | CANCELLED | 「取消 → CANCELLED」+ 原因 | 記錄 cancelReason |

⚠️ SHIPPED 階段、SO line 鎖：禁改 qty / unitPrice / locationId（量/地址鎖）、只允許改 remark

### 3.8 Crown 親測 checklist

- [ ] 新增 SO 純新行、CONFIRMED → PICKING → SHIPPED、確認扣帳成功
- [ ] 開新 QT 兩行、寄出；再開新 SO「拉舊報價」勾這兩行、混合一行純新行、加入 → 確認 SO 共 3 行、舊 QT cascade CANCELLED
- [ ] 拉報價時把某行設成「G 同行調貨」→ 確認 SO detail 出現警示橫條
- [ ] 點警示按鈕、輸入同行 partnerId、勾選行、確認 → 跳轉 NX02 TI detail
- [ ] 雙段狀態組合顯示：每行右側出現中文「等貨 / 補貨中 / 等撿貨 / 撿包中 / 已出貨」
- [ ] 取消 SO + 帶原因 → status=CANCELLED

---

## §4 銷退單工作台 SR

### 4.1 路徑

| 操作 | 路徑 |
|------|------|
| 列表 | `/dashboard/nx04/sales-return` |
| 詳情 | `/dashboard/nx04/sales-return/[id]` |
| 舊 placeholder | `/dashboard/nx04/export` → redirect 至 `sales-return` |

### 4.2 業務流程

```
DRAFT（業務員開單）
  → INSPECTING（送驗收、倉管收貨 + 填好品/壞品）
    → POSTED（過帳：好品入主倉 / 壞品寫異常 + NX05 沖帳）
    → REJECTED（駁回）
  → CANCELLED
```

### 4.3 開立 SR（業務員）

1. `/dashboard/nx04/sales-return` 按 **N**
2. 填來源 SO ID（必填）/ 銷退日 / 退款方式（R 退錢 / D 折讓 / X 換新）/ 稅率
3. 「建立並進入」→ 跳詳情頁、客戶自動從 SO 帶入
4. 詳情頁「新增退貨明細」：
   - 填 SO 明細 ID（必填、決定退哪行）
   - 填退貨數量（不可超過 SO 該行剩餘可退量）
   - 退貨原因（D 品質 / E 客戶不要 / W 規格 / O 其他）
   - 退貨類型（N 一般 / E 折讓、若 E 必填折讓理由）
5. 加完所有行 → 按「送驗收 → INSPECTING」

### 4.4 倉管收貨流程（INSPECTING 階段）

1. 倉管打開該 SR、看到「待倉管檢驗」警示橫條
2. 每行右側欄位 inline 編輯：
   - 好品 / 壞品 select（G/B）
   - 入庫庫位 ID（必填）
3. 編輯後出現「儲存」按鈕、按下儲存
4. 全部行填完 → 「過帳 → POSTED」按鈕啟用
5. 過帳時 prompt 「returnAction（R/D/X）」
6. 過帳後系統：
   - G 好品 → applyQtyInWithLedger 入主倉
   - B 壞品 → 寫 Nx03IssueReport（issueType='D' 損毀）
   - returnAction R/D → NX05 Allowance bridge（沖 AR）
   - returnAction X → 跳過庫存沖帳（業務手動建新 SO）

⚠️ returnMethod=X（換新）時可跳過 dispositionFlag 必填、過帳按鈕直接啟用

### 4.5 駁回

- INSPECTING 階段、倉管 / 主管可駁回（瑕疵嚴重 / 客戶說不退了 / 退錯料件）
- 點「駁回 → REJECTED」+ prompt rejectReason
- 駁回後 SR 不沖庫存、不沖財務

### 4.6 Crown 親測 checklist

- [ ] 開新 SR、加 2 行、送驗收 → 確認禁推進過帳（warn 倉管未檢驗）
- [ ] INSPECTING 階段填 G + locationId、儲存、確認另一行未填 → 過帳禁用
- [ ] 兩行都填 G 完成、過帳 returnAction='R' → 確認入庫成功
- [ ] 開新 SR、其中一行設 B（壞品）+ 過帳 → 確認 Nx03IssueReport 有新筆
- [ ] 開新 SR returnMethod='X'、不填 dispositionFlag → 確認可直接過帳
- [ ] 駁回 + rejectReason → 顯示在 SR detail

---

## §5 客戶等級變更

### 5.1 路徑

| 操作 | 路徑 |
|------|------|
| 全部變更歷史 + 申請 | `/dashboard/nx04/partner-grade-history` |
| OWNER 待核可 inbox | `/dashboard/owner/grade-approvals` |

兩個路徑共用同一個 View component、不同 props 配置。

### 5.2 業務流程

```
PENDING（業務員申請、寫入 history snapshot oldGradeId）
  → APPROVED（G 主管核可、同 tx 更新 partner.customerGradeId）
  → REJECTED（G 主管退回 + rejectReason、partner 等級不變）
```

### 5.3 申請（業務員）

1. `/dashboard/nx04/partner-grade-history` 按 **N**
2. 填客戶 ID / 新等級 ID / 申請原因（必填、業務脈絡描述）
3. 「送出申請」→ status=PENDING、進入待核可清單

⚠️ 前置條件：
- 客戶必須先設過 customerGradeId（沒設過要先在 partner 主檔指派）
- 不允許同客戶重複 PENDING（後端 validate、第二次申請會被擋下）
- 新等級不可等於舊等級

### 5.4 核可 / 退回（G 主管）

1. `/dashboard/owner/grade-approvals` 預設過濾 PENDING、看到 inbox
2. 每筆 row 顯示：客戶 / 舊→新等級 / 申請原因 / 申請人時間
3. 「核可」按鈕：confirm 對話框「影響後續 QT 毛利率」→ 確認
   - 後端同 tx：history.status=APPROVED + partner.customerGradeId=newGradeId
4. 「退回」按鈕：prompt rejectReason → 提交
   - 後端：history.status=REJECTED + rejectReason 記錄、partner 不變

### 5.5 核可後的連動

- 該客戶後續開的新 QT 自動套用新 customerGradeId 的 marginPct
- 既有 QT 不受影響（QT 已 snapshot customerGradeId）
- 既有 SO 不受影響（業務鎖價）
- 既有 SR 不受影響

### 5.6 Crown 親測 checklist

- [ ] 業務員身份申請等級變更 → 看到 PENDING row
- [ ] 同客戶第二次申請 → 應被擋下（後端 throw）
- [ ] OWNER 身份進 grade-approvals、看到 PENDING、核可 → status=APPROVED、partner 等級變
- [ ] 核可後開新 QT → 確認毛利警示 minPrice 基於新等級
- [ ] 另一筆申請 → 退回 + rejectReason → status=REJECTED、partner 不變

---

## §6 跨單據問題回報

### 6.1 觸發位置

| 來源 | 位置 |
|------|------|
| QT detail header | 右上「🚨 問題回報」按鈕 |
| SO detail header | 右上「🚨 問題回報」按鈕 |
| SR detail header | 右上「🚨 問題回報」按鈕 |

### 6.2 5 異常類型 + 5 處置方式

| 異常 | 處置 |
|------|------|
| D 損毀 | R 退貨 |
| E 過期 | W 保固 |
| S 數量短缺 | C 重組分解 |
| L 放錯庫位（locationId 必填）| D 報廢 |
| O 其他 | N 未處置（預設） |

⚠️ L 放錯庫位時、locationId 自動切必填、UI 提示。

### 6.3 操作步驟

1. 在任一單據 detail header 點「🚨 問題回報」按鈕
2. modal 開啟、選異常類型 + 處置方式（可空）
3. 填料號 ID + 數量 + 庫位 ID（L 必填）+ 詳細說明
4. 「送出問題回報」→ 後端寫 Nx03IssueReport：
   - sourceModule='NX04' 自動帶
   - sourceDocType + sourceDocId 軟連結回原單據
   - 進到倉管 / 主管的異常清單（NX03 issue-report 工作台）

### 6.4 Crown 親測 checklist

- [ ] 在 QT detail 點問題回報、填 D 損毀 + R 退貨 + 描述 → 提交
- [ ] 切到 `/dashboard/inventory/issue-report` 確認有新筆、source 標 QT
- [ ] 在 SR detail 點問題回報、選 L 放錯庫位 → 確認 locationId 必填
- [ ] 在 SO detail 重複測試一次

---

## §7 跨模組接點對照

### 7.1 NX01 主檔

- partner_type='C' 保養廠 / 'O' 同行：客戶選單 `IN ('C','O')`
- partner_type='S' 供應商：不出現在客戶選單
- partner.canTransferStock=true：可作為同行調貨對象
- partner.customerGradeId：QT 毛利警告基準
- partner.defaultWarehouseId：SO 倉庫 fallback
- partner.creditLimit / creditStatus：CreditGuard 4 機制
- part / location：所有 line item 主檔來源

### 7.2 NX02 進貨

- SO → IT-O：呼叫 `createTiFromSoLines` 建 NX02 TI 草稿
- NX02 RR POSTED → 回沖 SO line transferStatus（FU-sales-lite-10、待 NX02 那邊串）
- 保固客訴型 sourceSoId picker：NX02 FU-04、SO 出來後可回頭補

### 7.3 NX03 庫存

- SO SHIPPED → applyQtyOutWithLedger 扣帳（sourceModule='NX04' sourceDocType='S'）
- SR POSTED 好品 → applyQtyInWithLedger 入主倉
- SR POSTED 壞品 → Nx03IssueReport 寫一筆（issueType='D'）
- 問題回報 → Nx03IssueReport 共用表（sourceModule='NX04'）

### 7.4 NX05 財務

- SO SHIPPED → createArFromShippedSo（產生應收）
- SR POSTED + returnAction='R' → NX05 Allowance（退錢）
- SR POSTED + returnAction='D' → NX05 ArLedger 沖帳（折讓）

### 7.5 NX06 物流

- SO SHIPPED + deliveryType='D' → createDeliveryDnFromShippedSo（建出貨單）
- SR POSTED → createReturnPickupFromPostedSr（建退貨運送單）

### 7.6 NX10 員工激勵

- SO SHIPPED → updateRankingFromPerformance（業績排行榜 Exp）

---

## §8 schema 改動（M1）

### 8.1 新表 nx01_partner_grade_history

ID prefix `PGHI`、範例 `NX01PGHI0000001`、10 欄位 + 4 FK + 2 index

| 欄位 | 用途 |
|------|------|
| partnerId | 客戶 FK |
| oldGradeId | 變更前等級（snapshot from partner.customerGradeId） |
| newGradeId | 變更後等級 |
| status | PENDING / APPROVED / REJECTED |
| requestedBy / requestedAt | 申請人 / 時間 |
| reason | 申請原因 |
| approvedBy / approvedAt | 核可人 / 時間 |
| rejectReason | 退回原因 |

### 8.2 Nx04SrItem 加欄位

| 欄位 | 用途 |
|------|------|
| dispositionFlag VARCHAR(1) nullable | G 好品 / B 壞品、過帳前必填（returnAction='X' 除外） |

### 8.3 對應 migration

`20260529100000_nx04_sales_lite_m1_schema`（M1 schema commit `a3f20eb`）

---

## §9 Follow-up 清單

### 9.1 FU 押後（不影響 closure）

| FU ID | 內容 | 阻擋 |
|-------|------|------|
| FU-sales-lite-04 | partner-grade-history `approve` 應 OWNER only RBAC enforce | 無、可隨時補 |
| FU-sales-lite-08 | Mobile 銷貨 LITE（features/sale/* 既有 mobile UI 不動） | 無 |
| FU-sales-lite-09 | SO `createFromQuote` 1:1 路徑沒串 `cascadeOnSoAdopt` | 無 |
| FU-sales-lite-10 | NX02 RR POSTED → 回沖 SO line transferStatus（須改 NX02 service） | 無、本軌不動 NX02 |
| FU-sales-lite-11 | 所有 ID 欄位補 picker（partnerId / partId / locationId / customerGradeId）| 無 |
| FU-sales-lite-12 | TieredFormProvider 真分層（QT / SO / SR detail）| 無 |
| FU-sales-lite-13 | 問題回報按鈕套到 partner-grade-history row 級別 | 無 |
| FU-sales-lite-14 | window.prompt 替代（取消原因 / 駁回原因 / 申請原因 / 問題回報多層次）| 無 |
| FU-sales-lite-15 | 翻譯 / i18n、目前全繁中 hard-code | 無 |

### 9.2 接其他模組的 FU

- partner 主檔 → 加變更歷史分頁 + 申請按鈕（features/shared/master/partner 結構待 audit）
- NX02 保固客訴型 sourceSoId picker（FU-04 解鎖）

---

## §10 操作手冊外的隱性規則

### 10.1 SO_ITEM_SEL projection 擴展（C2 自行判斷項）

`so.service.ts` SO_ITEM_SEL 多了 `transferSourceType / transferStatus / fulfillStatus / tiId` 4 欄位 SELECT。純加 projection、無業務邏輯改動。UI 雙段狀態 + IT-O 橫條依賴這 4 欄位。

### 10.2 partner_grade_history validate

- 同 partner 已有 PENDING request → 第二次 throw（avoid 排隊歧義）
- newGradeId === oldGradeId → throw
- partner 從未設 customerGradeId → throw（要先在 partner 主檔指派）

### 10.3 qt.service cascadeOnSoAdopt isSelected 假設

cascade 只看 `isSelected=true` 的 quote line 是否耗盡來決定整張 quote 變 ACCEPTED 還是 CANCELLED。業務若允許 isSelected=false 也被拉、會錯。

### 10.4 既有 NX04 service 比意圖書「成熟」

- SoItem 已是雙段狀態（transferStatus + fulfillStatus + transferSourceType）— 不是 lineStatus 3 段
- 既有 `applyQtyOut/InWithLedger` 已串接
- 既有 NX05 Allowance / NX06 DN pickup 已串接

UI 不要重新發明既有後端業務語意、直接 call endpoint。

---

> 收尾：本手冊對應 `feature/nx04-sales-lite` 整軌 + `v1.4.0-nx04-sales-lite-closure` tag。
> 總經理親測時遇 bug 直接列、新 Hank 接 follow-up 軌統一處理。
