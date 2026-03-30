# 銷貨「即時報價工作台」UI／互動規格

## 文件目的

將舊 ERP 多視窗流程收斂為 **NEXORA 單頁、四個滿版垂直區塊**，以 **捲動對齊（scrollIntoView）** 與 **網頁較不易衝突的快捷鍵** 支援鍵盤動線。本文件供產品／前端／後端對齊；正式建檔與 API 見 [05-sales-quote-so.md](./05-sales-quote-so.md)。

## 版面：四滿版區塊（垂直）

每區以 `id="nx03-wb-block-{1..4}"` 標示，建議 `min-height` 約 **50vh～70vh**，小螢幕單欄、大螢幕區塊內可用左右分欄。

| 區塊 | 快捷鍵 | 內容與行為 |
|------|--------|------------|
| **1 搜尋** | **F2** | 捲動至第一區並聚焦搜尋框。Enter 查詢：無結果顯示「沒有此料號」；有結果自動 **捲動至第二區** 並可預設選取第一筆通用件。 |
| **2 庫存** | **Alt+1** | 捲動至第二區。**左**：該零件線可通用料號列表（↑↓ 選列）。**右**：目前選中料號之 **各倉數量**（倉別摘要）。 |
| **3 價格** | **Alt+2** | 捲動至第三區並聚焦 **客戶搜尋框**（取代易與瀏覽器衝突的 Alt+F）。**左**：A～D 價與進價參考。**右**：上為客戶框，Enter 後焦點移至 **下方報價／銷貨紀錄**（依客戶篩選）；**不含訂單** 類型。紀錄區 ↑↓ 瀏覽；**Alt+A** 至第四區。 |
| **4 報價** | **Alt+A** | 捲動至第四區。帶入第三區客戶；若有選中紀錄則帶入單價。以 **數量** 為主；**第一次 Enter** 開啟確認對話框；**第二次 Enter**（確認鈕聚焦時）**建檔成功**（現況 mock）。 |

## 瀏覽器與快捷鍵

- **Alt+數字／Alt+字母** 仍可能被部分瀏覽器或 OS 攔截；實作於頁面內對可接受情境 `preventDefault()`，並建議文件與 `?` 說明中註明限制。
- **F2** 由 [SalesWorkflowPage](c:\nexora\apps\nx-ui\src\features\nx03\workflow\ui\SalesWorkflowPage.tsx) 切換至「實際銷貨操作」並觸發子元件 **捲動第一區**（與聚焦搜尋同步）。

### 快捷鍵一覽（實作目標）

| 按鍵 | 行為 |
|------|------|
| F2 | 第一區捲動 + 聚焦搜尋 |
| Alt+1 | 第二區捲動（可聚焦列表） |
| Alt+2 | 第三區捲動 + 聚焦客戶搜尋 |
| Alt+A | 第四區捲動 |
| ? / Shift+/ | 快捷鍵說明（不在文字輸入欄內時） |
| Esc | 關閉對話框 |

## 用語與庫存

- **倉別摘要**：第二區右側以倉別列示數量／可出（mock 衍生自 `stockByWarehouse`）。
- **本倉**：登入倉別於畫面標示（mock：`B 倉（北區）`）；本倉可出為 0 時第二區顯示提示。

## 與程式對齊

| 項目 | 路徑 |
|------|------|
| 工作台 UI | [apps/nx-ui/src/features/nx03/workflow/ui/SalesOperationWorkspace.tsx](../../apps/nx-ui/src/features/nx03/workflow/ui/SalesOperationWorkspace.tsx) |
| Mock 衍生 | [apps/nx-ui/src/features/nx03/workflow/mock/workbench.mock.ts](../../apps/nx-ui/src/features/nx03/workflow/mock/workbench.mock.ts) |
| 銷貨首頁 | [apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx](../../apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx) |

## 後端資料（概要）

比價 API 現況文件可僅列 **銷貨／報價**；訂單類型本畫面不顯示。

## 驗收檢查（摘要）

- [ ] F2 → 第一區可見並可搜尋；無料號有明確提示；有結果捲至第二區。
- [ ] Alt+1 → 第二區；左側 ↑↓ 換料號，右側倉別跟隨。
- [ ] Alt+2 → 第三區客戶框；Enter 進入紀錄區；僅報價／銷貨；Alt+A → 第四區。
- [ ] 第四區：Enter → 確認窗 → 再 Enter mock 建檔成功。
- [ ] 小寬度以垂直捲動為主，無三欄擠壓。

## 待產品拍板

1. 本倉是否可切換倉別。2. 第四區建檔接正式 API 或草稿。3. Alt 快捷鍵是否另提供 Ctrl 後備組合。

---

**文件版本**：四滿版區塊版；與實作並行更新。
