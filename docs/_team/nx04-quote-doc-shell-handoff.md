<!-- docs/_team/nx04-quote-doc-shell-handoff.md -->
<!-- 位置：docs/_team/nx04-quote-doc-shell-handoff.md -->
<!-- 版本：v1（2026-06-30 交接） -->
<!-- 說明：報價單 QT 進傳統外殼（單據模板首發）交接文件。下一棒 Hank 起手讀本檔 + git log。 -->

# 報價單 QT 進傳統外殼 — 交接文件（2026-06-30）

> ⚠️ **2026-07-02 更新：本檔的「設計定案」已被取代,只保留實作/檔案/infra 紀錄參考。**
> 報價/定價的**設計真相**以 **`docs/_team/nx04-quote-pricing-architecture.md`** 為準。
> 本檔 §6 舊定案(即時=單行、正式不可部分)**已作廢**、勿再引用;§7 待續多數已做或方向已改。
> 仍準確可用的是:§1~§5(分支/已做/檔案地圖/infra 警告)、§8(範式)。

## 0. 一句話
報價單（QT）已從 LITE 舊樣式重做進傳統 ERP 外殼六層、當「**單據模板**」首發試點；列表/詳情/查詢/新增 inline + 客戶 F4 注音選擇器都已落地，**尚未 merge、尚未 push**。

## 1. 分支 / Git 狀態
- 分支：`feature/nx04-quote-doc-shell`（**未 merge 到 main、未 push 遠端**；push 須執行長拍板）
- main：`c7afa79f`（平行的恆迎零件匯入軌）
- 本軌 23 commits（commit 訊息軌標 `[NX04-QT-SHELL]`，見 `git log main..HEAD`）
- 工作區乾淨

## 2. 這軌做了什麼（已完成）
**整體**：報價單收成單頁 `QuoteWorkbench`，六層完整（偉盟模型）。
- **資料瀏覽（列表）**：用主檔同款 `MasterTable`（邊到邊、預設選第一筆、序號欄隱藏、Excel 式拉欄寬 + 拖拉排序、欄寬/序存 localStorage、斑馬紋）。欄位：單號/狀態/建單日期/報價日期/客戶編號/客戶名稱/建單人員/項目數/未稅/總金額/有效日期。單號預設大到小。
- **狀態**：純有效期三態 **有效 / 失效(逾有效日) / 作廢(voidedAt)**；退役 接受/拒絕。
- **查詢**：彈跳視窗（單號/建單/報價三區間「只填起=該值單一」+ 狀態 + 客戶編號 + 客戶名稱 + 建單人員(員編 userAccount 或姓名 userName) + 料號）；伺服器端;移除篩選/排序鈕（欄頭點擊排序仍在）。
- **詳情**：左右兩塊。左＝表頭 Form（標籤:輸入框一欄一列滿版：單號/單據狀態/報價日期/客戶編號/客戶名稱/幣別/建單人員/建單日期/有效日期/備註）。右＝明細 Table（序號/基準料號/廠牌料號/廠牌/品名/數量/單價/小計/稅額/總價）+ tfoot 合計（小計/稅額/總價對齊欄位、sticky 底）；動態空白列填滿、橫/縱捲動、斑馬紋、明細列 ↑↓ 可選。
- **工作列三狀態**：瀏覽（⏮◀ N/M ▶⏭｜A新增 E編輯 D刪除(作廢)｜F查詢 R重整 P列印 O匯出）／編輯表頭（S存檔 C取消）／編輯明細（S存檔 A新增項目 E編輯項目 D移除項目 C取消）。Alt 字母快捷皆 preventDefault（Alt+F 不再開 Chrome 選單）。
- **新增 inline**（不彈窗）：`QuoteCreatePanel`，鎖右編左，單號/狀態/報價日自動，游標停客戶；`CustomerPicker`（關鍵字下拉 + **F4 注音首碼**：英文鍵碼→注音，如 we→ㄊㄍ→太古）；Enter 串接 客戶→幣別→存檔確認→建單→進詳情。倉庫後端自動帶（使用者隸屬倉 user_warehouse isPrimary → 租戶主倉 isMain → 任一倉）。
- **有效期甲案卡控**：建單自動帶 validUntil=報價日+租戶 quoteDefaultValidityDays(預設30)；業務只能縮短、延長需 `sale.quote.extend-validity` 權限；SO 拉報價擋過期（既有）。
- **選單**：解除「銷售作業(W)」comingSoon 暫緩。

## 3. 關鍵檔案
- 前端：`apps/nx-ui/src/features/nx04/quote/ui/{QuoteWorkbench,QuoteDetailView,CustomerPicker}.tsx`
  （QuoteDetailView 內含 `QuoteDetailPanel`＋`QuoteCreatePanel`＋`ItemsSection`＋`AddItemDialog`＋`QuoteSearchDialog`）
- 共用：`features/nx01/shell/ui/MasterTable.tsx`（新增選用 props：`hideSerial` / `columnWidths`+`onColumnWidthChange` 拉寬，**預設關、不影響主檔頁**）
- 路由：`app/dashboard/sale/qt/page.tsx`、`qt/[id]/page.tsx`（都指向 QuoteWorkbench、深連結開詳情）
- 後端：`apps/nx-api/src/nx04/quote/{quote.service,quote.controller,dto/quote.dto}.ts`
- api client：`data/endpoints/nx04/quote/api/quote.ts`（查詢參數）、`data/endpoints/shared/master/partner/api/partner.ts`（加 phonetic）
- 型別：`data/types/nx04/quote.ts`

## 4. Schema 改動（additive）
- `nx04_quote` 加 `sales_person_id`(FK nx01_user, SET NULL)、`customer_ref_no`(VARCHAR50)。migration 檔：`packages/db-core/prisma/migrations/20260629000000_nx04_quote_salesperson_customerref/`（**手動 db execute 套的、未走 migrate dev**）。
- createQuote 的 warehouseId 改選填（DTO + 前端型別）。

## 5. ⚠️ 重要注意（infra）
- **本機 migration 追蹤表壞**（dump 還原沒帶 `_prisma_migrations`、145 migration 全列未套、shadow DB 卡 6/22 user_warehouse 舊 migration）→ **`prisma migrate dev` 不能用**；schema 改動改 `prisma db execute` 手動套 + `prisma generate`。⛔ 不可 `migrate reset`（黑名單+洗資料）。⛔ 整包 `db push` 會誤砍 part_stock_setting 部分唯一鍵(PRZ-01)＋改一堆 FK 名，只能外科手術。詳見 [[feedback_prisma7_quirks]]。
- **後端多次改動需重啟 nx-api 才生效**（NestJS 不熱載）：客戶名/業務員名/建單人員/項目數/明細料號廠牌、查詢、有效期自動帶、倉庫自動帶。下一棒先確認執行長已重啟。
- 本機 dev 驗收：`pnpm dev` 跑著時用 lint + `tsc --noEmit`，**不要 pnpm build**（撞 .next/HMR）。
- 測試資料：恆迎租戶（TW-100001 / NX99TANT9900004）有 6 筆測試報價單（手動 seed）。

## 6. 設計定案 —— ⛔ 已作廢（2026-07-02 被架構文件取代，勿引用）
> 舊定案（即時報價=F2 單行快建 / 正式報價不部分成交、整張匯入 / 明細不拆逐行成交狀態）
> **已於 2026-07-02 討論後推翻**。改為：兩單（報價紀錄表 + 正式報價單）、報價數量=量價條件、
> 銷貨引用報價價、**部分轉拉「已選定」行**（用 is_selected/transferred_qty）。
> 詳見 **`docs/_team/nx04-quote-pricing-architecture.md`**。
> （唯一仍有效的一句：列表狀態只看有效期 有效/失效/作廢。）

## 7. 待續（下一棒接手）
1. **建單後自動進「編輯明細」**（目前建單後回瀏覽；需 QuoteDetailPanel 支援 initialMode）。
2. **未加項目就取消 → 視同作廢**提示（表頭已存、單號已生；在 editItems 的 C 取消處理）。
3. **編輯項目（E）對話框**（目前 stub；AddItemDialog 擴成 Add/Edit）。
4. **料號 picker**（明細新增的料號仍手 key；AddItemDialog 接 `PartSearchSelect` 或仿 CustomerPicker）。
5. 列印(P)/匯出(O) 詳情頁目前 placeholder。
6. **來源(正式/即時)旗標** + 即時報價(F2)入口 + 銷貨單自動帶/匯入 → 一起做。
7. 列表破百筆要分頁/載入更多（現一次抓上限 100）。
8. 收尾後：merge `feature/nx04-quote-doc-shell` → main（執行長拍板）、補正規 migration（待修壞的 migration 追蹤）。

## 8. 範式產出（可供其他單據重用）
- 「單據型頁面」雛形：六層 + L4 同頁分頁 + 三狀態工作列 + 左右兩塊。銷貨 SO / 銷退 SR / 採購進貨單之後可抽共用模板（執行長：第一張先做扎實、第二張再抽）。
- `CustomerPicker`（關鍵字 + F4 注音）可升級成共用 picker；`MasterTable` 拉寬/隱序號已通用化。

關聯記憶：[[project_nx04_quote_doc_shell]]、[[project_trad_shell_pivot]]、[[feedback_prisma7_quirks]]、[[feedback_no_build_when_dev_running]]
