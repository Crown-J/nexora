<!-- docs/_team/session-handoff-2026-07-10.md -->
<!-- 位置：docs/_team/session-handoff-2026-07-10.md -->
<!-- 版本：v1（2026-07-10 收尾）-->
<!-- 說明：本輪對話總交接。新對話起手讀本檔 + git log + CLAUDE.md。 -->

# 本輪交接（2026-07-10）— 單據模板 + 偉盟設計檢視

> 新對話請先讀本檔，再 `git log --oneline main..HEAD`。分支 `feature/nx04-quote-doc-shell`、
> 本輪 22 commits（`a6d98a26`→`2b44d17d`）、**未 push、未 merge**（push/merge 須執行長拍板）。工作區乾淨。

## ⚠️ 最優先：nx-api 要重啟
本輪動了多次 schema + service，執行長最後一次重啟後尚未驗收 SO/SR/調撥。**新對話第一件事：確認執行長已重啟 nx-api**，否則名稱欄/新欄位不生效。

---

## 0. 三十秒摘要
本輪做了三大塊，全部 tsc + eslint 綠、commit 完成、待執行長實機驗收：
1. **偉盟歷史匯入續作**（已完成）：早年銷貨+進貨+銷退全匯。交接 `docs/_team/weimeng-import-handoff.md`。
2. **單據模板軌**：報價→**銷貨SO→銷退SR→調撥ST** 四張單全進同一套傳統外殼。
3. **偉盟設計檢視**：報告 `docs/_team/weimeng-design-review-nexora-gaps.md` + P1 五項全處理。

---

## 1. 單據模板軌（本輪重點）
報價單外殼（`features/nx04/quote/ui/QuoteWorkbench`）為範式，複製到三張單。每張＝
`XxWorkbench.tsx`（列表六層外殼）+ `XxDetailView.new.tsx`（詳情左右兩塊+三狀態工作列+內嵌明細+新增精靈）。

| 單 | 檔案 | route | 狀態動作 | 特殊 |
|---|---|---|---|---|
| 銷貨 SO | `features/nx04/so/ui/{SoWorkbench,SoDetailView.new}` | `/dashboard/sale/so` | — | 拉報價、實際出貨料號、自動帶價 |
| 銷退 SR | `features/nx04/sales-return/ui/{SrWorkbench,SrDetailView.new}` | `/dashboard/sale/return` | 送驗收/過帳/駁回 | 從銷貨單帶入、好壞品處置 |
| 調撥 ST | `features/nx03/transfer/ui/{StWorkbench,StDetailView.new}` | `/dashboard/inventory/transfer` | 出庫/收貨過帳 | 倉對倉無客戶、出/入庫位、桌機手機響應式分流 |

**後端 enrich 範式（三張都做了）**：各 service 的 `SEL` 加 customer/warehouse/… 關聯 select、
`flattenXxRefs` 攤平成 `*Code/*Name`、`list` 補 `createdByName`(批次查 user)+`itemCount`(_count)、`getById` 補 `createdByName`、`whereList` search 加客戶。

**共用元件（未動、直接復用）**：`ErpToolbar`/`MasterTable`/`MasterPageHead`/`ToolbarPortal`/`CustomerPicker`/`PartPicker`。

### 🔎 順手修到的 bug
調撥舊前端 client 打 `/nx02/transfer`（**無對應 controller、早已 404**）；新 client 打真路徑 `/nx03/transfer`。舊調撥桌面頁本來就壞、現修好。

### 待辦（單據模板軌）
- [ ] 執行長實機驗收 SO/SR/調撥（重啟 nx-api 後）。
- [ ] **舊 view 清理**：`SoListView`/`SoDetailView`/`SalesReturnListView`/`SalesReturnDetailView`/`TransferListView`/`TransferFormView`/`useTransfer` 都**暫留未刪**、驗收後可移除（`CreateTiFromSoModal` 要保留：IT-O 建同行調貨單，新殼尚未接）。
- [ ] **抽真正共用模板**：目前三份是複製體（各自 ~600+ 行 Workbench 高度雷同）。第四張單（進貨 Nx02Rr）要套時，把 Workbench 抽成泛型 `DocWorkbench<T>`（執行長範式：第二張複製、抽象時機看第四張）。
- [ ] 各單「列印/匯出 PDF」目前 placeholder；SR 的「從銷貨單帶入」超退量靠後端擋（前端未預檢）。
- [ ] SO 實際出貨料號：撿貨/出貨工作站流程掛接自動寫入（現只有手動＋顯示）。

---

## 2. 偉盟設計檢視軌
報告：`docs/_team/weimeng-design-review-nexora-gaps.md`（✅12 我方已做對 / 🛠 加強 / ⛔10 避免守則）。
素材源：`C:\wellan`（偉盟 AT52SS 全庫分析、274 表+155 程式物件）。

**P1 五項全處理（2026-07-10）**：
| 項 | 結果 | commit |
|---|---|---|
| P1-2 發票抬頭 | ✅ 新做（`Nx01Partner.invoiceTitle`+`Nx01PartnerAddress.invoiceTitle`）| 3033c915 |
| P1-3 免開發票 | 📕 早已實作（0/2/3）、僅修註解 | 3e0dd762 |
| P1-4 每月結帳日 | ✅ 新做（`Nx01Partner.statementDay` 1~31）| 67be6003 |
| P1-1 前次售價帶價 | 📕 早已實作（`getPriceIntel` live 查詢）| 62e24e52 |
| P1-5 實際出貨料號 | ✅ 新做（`Nx04SoItem.actualPartId/actualPartNo`）| e4db0c58 |

> ⚠️ 教訓（P1-1/P1-3 連兩次）：判「我方缺」前**必查 DTO/service 層、不能只看 schema/註解**。

**待拍板/待排**：P2 條碼對照/代購直送鏈/批次調價、P3 料號合併工具(1.3萬占位料號收斂會用)/進口屬性。細節在報告決策表。

**偉盟財會餘額公式**（另案、未解）：算法在 AC57 Delphi、線索 `fnAC57CollectSACMData` 年結列 `CASE DAY(SAYMM)<>1`；要拿偉盟報表數字對錨。詳 `C:\wellan\00_索引_START_HERE.md` §4。

---

## 3. Schema 改動（本輪、都 db execute 手動套 + generate）
| migration 檔 | 內容 |
|---|---|
| `20260710000001_partner_invoice_title` | nx01_partner + nx01_partner_address 加 invoice_title |
| `20260710000002_partner_statement_day` | nx01_partner 加 statement_day |
| `20260710000003_so_item_actual_part` | nx04_so_item 加 actual_part_id(FK) + actual_part_no |
| （續作階段）`銷退 soId/soItemId 可空` | nx04_sr/nx04_sr_item DROP NOT NULL |

⚠️ **本機 migration 追蹤表壞、migrate dev 不能用**（見 [[feedback_prisma7_quirks]]）：一律 `prisma db execute --file <sql>` 手動套 + `prisma generate`。⛔ 不可 migrate reset / 整包 db push。

---

## 4. 🛠 給 Alex 的候選（本輪發現）
- `nx04_so_item` 缺 `so_id` 單獨索引 → 刪 SO 時對 41 萬列 seq scan 極慢（匯入清理時建臨時索引繞過）。建議永久補；`nx02_rr_item.rr_id`/`nx04_sr_item.sr_id` 同理。

---

## 5. 環境注意
- dev server 跑中：驗收用 lint + `tsc --noEmit`、**不要 pnpm build**（[[feedback_no_build_when_dev_running]]）。
- 後端改動需重啟 nx-api（NestJS 不熱載）。
- 本機租戶 TW-100001（NX99TANT9900004）；⛔ Railway 不碰。
- eslint/tsc 從各 app 目錄跑（`cd apps/nx-ui` 再 npx，否則 PATH 抓不到）。

## 6. 關聯
- 偉盟匯入：`docs/_team/weimeng-import-handoff.md`
- 設計檢視：`docs/_team/weimeng-design-review-nexora-gaps.md`
- 偉盟全庫分析：`C:\wellan\00_索引_START_HERE.md`
- 記憶：[[project_nx04_quote_doc_shell]]、[[project_weimeng_import]]、[[project_weimeng_design_review]]
