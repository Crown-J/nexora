<!-- docs/_team/nexora-v1.2-alignment-i-intent.md -->

# v1.2 對齊軌 階段 I 補連線收尾意圖書 v1.0

> 撰寫者：Hank
> 撰寫時間：2026-06-01
> 分支：`feature/v1.2-alignment-i`
> 範圍：LITE 最後一棒、audit §314 補連線四項
> 上輪 closure：階段 G 手機版 `v2.0.8-alignment-g-complete`

⭐ **階段 I closure = LITE 完整版完成、回報總經理「可開始完整實測」**

---

## §1. 總經理拍板（已內化）

四項補連線收尾：
1. **退貨 → 保固連線**：PR 退貨選「走保固」→ 自動產保固申請單（帶料件/數量/供應商/來源單號、進既有保固理賠流程）
2. **採購需求 3 來源**：銷貨缺貨自動寫入 + 手動新增 UI（AR 那條既有已通、不重做）
3. **國外進貨 UI**：提貨單階段畫面、串既有後端（6 階段 + parcel）
4. **整體 closure**：hub 無空連結 + 權限檢查 + 後續軌清單 + 完整實測動線文件

⚠️ audit 文件是早期版本、財務/報表/手機版/雙精靈已 closure，**本軌不回頭重做**。

---

## §2. P0 盤點結果（依 §8 四方向）

### 2.1 退貨 → 保固

| 項目 | 現況 |
|------|------|
| PR DTO `warrantyOption` / `dispositionFlag` | 🔴 **無** |
| `Nx02PurchaseReturn` schema 走保固欄 | 🔴 **無** |
| `Nx02WarrantyClaim` `sourcePrId` / `sourcePrItemId` | 🔴 **無** |
| PR service 自動建 warranty-claim hook | 🔴 **無** |
| warranty-claim 主流程（D/S/R/C/V + 4 result）| 🟢 **OK**（NX02 LITE M2-d 完成）|
| PR UI「走保固」按鈕 | 🔴 **無** |

→ 結論：**完全沒做**、需後端 schema 變動 + service hook + 前端按鈕。

### 2.2 採購需求 3 來源（demandType S/O）

| 來源 | 對應 | 現況 |
|------|------|------|
| AR 自動（庫存不足）| `demandType=S` | 🟢 **已通**（nx03/auto-replenish/ar-suggestion-writer.service） |
| 銷貨缺貨自動（客訂）| `demandType=O` | 🔴 **無寫入點**（schema 有 demandType + customerId、但 SO 無 hook）|
| 手動新增 | `POST /nx02/demand` | 🔴 **無 endpoint**（只有 GET /purchase-suggestion list）|

→ 結論：**1/3 已通**、需後端 POST endpoint + SO hook + 前端手動表單。

### 2.3 國外進貨

| 項目 | 現況 |
|------|------|
| 後端 6 階段 PATCH `/nx02/po/:id/stage` | 🟢 **OK**（1=備貨/2=要付款/3=待出貨/4=出貨上船/5=到港/6=驗收）|
| 後端 `Nx06IntlShipping` CRUD | 🟢 **OK**（list/detail/create/patch）|
| 後端 `Nx03Parcel` 包裹 | 🟢 **OK**（allocParcelNo 自動生 BX 編號）|
| 前端 `/dashboard/purchase/foreign` 入口 | 🔴 **無** |
| 6 階段視覺化 UI | 🔴 **無** |
| 提貨單畫面 | 🔴 **無** |

→ 結論：**後端齊、前端零**、純前端工作。

### 2.4 hub 空連結 + 權限

掃描 `/dashboard/**` PlaceholderPage 共 **11 處**、全在 `/sale/customer/*` + `/sale/docs/*`：

```
/sale/customer/analysis     客戶分析報表
/sale/customer/grading      客戶分級管理
/sale/docs/inquiry          調貨詢價管理
/sale/docs/orders           客戶訂單管理
/sale/docs/quote            報價單據管理
/sale/docs/return           銷退單據管理
/sale/docs/sales            銷售單據管理
/sale/docs/transfer         調貨單據管理
... (3 more)
```

這些是 **NX04 sales lite 軌之前的舊版 route 占位**、實際業務已遷到 `/dashboard/nx04/*`。
→ 需處理：redirect 到 NX04 對應頁、或從 hub 拿掉入口。

---

## §3. 4 個待澄清給 Alex

### Q1：退貨→保固 schema 變動方式

**a. 加 schema 欄位（建議）**
- `Nx02PurchaseReturn.dispositionFlag VarChar(1)`：G=好品退、B=壞品退、W=走保固
- `Nx02WarrantyClaim.sourcePrId VarChar(15)` + `sourcePrItemId VarChar(15)`：來源 PR 追蹤
- 清晰可查、可 BI 分析

**b. 不動 schema、用 remark 文字標記**
- PR 在 remark 寫「走保固」標記
- warranty-claim 用既有 remark
- 0 schema 變動、但**無法可靠查詢「哪些 PR 走了保固」**

→ 我建議 **a**（清晰、可審計、後續報表能用）。**需總經理 STOP-1 拍板**（2 個 schema 變動）。

### Q2：銷貨缺貨 demand 自動寫入觸發點

SO 階段流：DRAFT → APPROVED → CONFIRMED → ... 哪個階段寫 demand？

**a. SO 開單即時（DRAFT 階段）**
- 業務開單時若庫存不足、即時建 demand
- 採購方早知需要進貨

**b. SO 審核通過後（APPROVED）**
- 確認單會出單才建 demand
- 避免「客戶詢價沒下單也建 demand」

**c. 不自動、銷售員手動「轉採購需求」按鈕**
- 業務自己決定
- 不會誤建

→ 我建議 **a + b 混合**：DRAFT 即時建（status=O 待處理），SO 若 cancel 則 demand 自動 → status=I 已忽略。對齊「銷貨缺貨自動」業務語意（總經理拍板「自動」）。

### Q3：國外進貨頁版型

**a. 獨立路徑 `/dashboard/purchase/foreign`（建議）**
- 跟既有 PO 區分（國外有自己的 6 階段 + 提貨流程）
- 操作不混淆

**b. 整合到既有 `/dashboard/purchase/po` 加 tab**
- 同頁切「國內」/「國外」
- UI 較緊湊但功能複雜

→ 我建議 **a**（業務語意分離、PO 列表 + 國外 6 階段 + 提貨單 3 子頁清楚）。

### Q4：11 個 placeholder 處理

**a. 全刪入口（從 sale hub 拿掉這些卡片、placeholder 檔保留 404）**
- hub 變乾淨、不誤導使用者

**b. 全部 redirect 到對應 NX04 已實作頁**
- 譬如 `/sale/docs/quote` → `/dashboard/nx04/qt`
- 既有書籤/連結不死

**c. 升級提示頁（顯示「請走 NX04 銷貨工作台」 + 連結）**
- 過渡期友善

→ 我建議 **b**（redirect 不破壞既有連結 + 0 摩擦）。

---

## §4. 建議 Phase 拆分（等 Alex Q1~Q4 拍板再敲）

| Phase | 範圍 | 規模 | stop |
|-------|------|------|------|
| **P0** | 本意圖書 + Alex Q1~Q4 拍板 | S | ✅（本檔） |
| **P1** | schema 變動（Q1=a 拍板後 STOP-1 給總經理）：PR.dispositionFlag + WarrantyClaim.sourcePrId/sourcePrItemId | S | ⚠️ STOP-1 |
| **P2** | 退貨→保固：PR service 加 createWarrantyFromPr helper + PR UI「走保固」按鈕 + warranty 詳情頁顯示來源 | M | ✅ stop |
| **P3** | 採購需求 3 來源：POST /nx02/demand + SO service hook（缺貨自動）+ UI 手動新增 dialog | M | ✅ stop |
| **P4** | 國外進貨 UI（3 頁、串既有 6 階段 + intl-shipping + parcel）| L | ✅ stop |
| **P5** | hub 連結整理：11 placeholder → redirect 到 NX04 對應頁 + sale hub 卡片清理 | S | 與 P6 合並 |
| **P6** | closure 7 步（handoff + git-state + merge + tag v2.0.9-alignment-i-complete + memory + seed + 回報「LITE 完整版完成、可實測」）| S | ✅ stop |

⚠️ P1 需總經理 STOP-1 拍板 schema 變動（2 個 migration）。

---

## §5. 不在本軌範圍

- ❌ Google Map / Lalamove / 推播（總經理拍板付費模組候選）
- ❌ 主檔分區編輯重做（v1.2 §11 §6.4、屬未來軌）
- ❌ RBAC 重做（v1.2 §12.2、屬未來軌）
- ❌ Railway production migration 上線（屬 TASK-RAILWAY-ENV-SPLIT）
- ❌ 任何 LITE 之外的模組（NX06 物流深化 / NX07 工務 / NX09~10）

---

## §6. Schema 變動聲明

本軌**預計 2 個 schema 變動**（P1、Q1=a 拍板後執行）：
1. `Nx02PurchaseReturn` 加 `dispositionFlag VarChar(1)`（G/B/W）
2. `Nx02WarrantyClaim` 加 `sourcePrId VarChar(15)` + `sourcePrItemId VarChar(15)`（皆可空）

→ Railway production migration 累計落後將 91 → 93。觸發時機仍對齊 TASK-RAILWAY-ENV-SPLIT。

---

## §7. 等 Alex 拍板 → 接 P1（含 STOP-1 給總經理）

P0 完成、進入 review。等 Q1~Q4 拍板後執行 P1 schema 變動 + STOP-1。
