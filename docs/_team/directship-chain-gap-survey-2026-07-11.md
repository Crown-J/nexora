<!-- docs/_team/directship-chain-gap-survey-2026-07-11.md -->
<!-- 位置：docs/_team/（團隊工作檔、非規格） -->
<!-- 版本：v1.0（2026-07-11、Hank 盤點、家用機線） -->
<!-- 說明：偉盟檢視 2.7「代購/直送鏈」缺口盤點（P2 決策表「先盤缺口再定」的執行）。純盤點報告、未動工；供 CTO 定方案、執行長拍板。 -->

# 代購/直送鏈缺口盤點（偉盟檢視 2.7 續作）

> 偉盟原能力三件：①進貨可綁銷貨單（RORER＝為某張銷貨現金代購）②帳款對象≠交易對象
> ③指送對象/地址≠客戶。以下逐件 grep 核實我方現狀（引用處均為精確 count）。
> 對照原文：docs/_team/weimeng-design-review-nexora-gaps.md §2.7

---

## 結論一頁版

| # | 偉盟能力 | 我方現狀 | 缺口判定 |
|---|---|---|---|
| ① | 進貨綁銷貨（代購） | **同行調貨鏈全通且為明細級**（比偉盟單頭級更細） | ✅ 同行情境已蓋；🛠 一般供應商代購（PO 綁 SO）無欄 |
| ② | 帳款對象≠交易對象 | PO 有 `invoiceToPartnerId` 欄（語意註解含 AP 歸戶）＋ Partner 有 `parentPartnerId` 總公司 | 🛠 **有欄無帳**：AP 三支產生器全掛 supplierId、欄位未接；銷售側/AR 完全無對稱設計 |
| ③ | 指送/直送 | PO 指送三欄全有（含「直送客戶現場、不進倉」語意）；SO 有 deliveryType+deliveryAddress | 🛠 **直送的庫存/過帳流不存在**：RR 過帳一律入倉（rr 模組 grep shipTo＝0 處）；TI 無直送欄 |

📕 順帶訂正：原檢視 2.7 寫「Rr 無 sourceSoId」——以現有鏈看不缺在 RR 層（見 ①），
原文表述可更新。

---

## ① 進貨綁銷貨：同行鏈已全通、一般供應商鏈無欄

**已存在（grep 核實）：**
- `Nx02TiItem.sourceSoItemId`＝**schema 必填**（註解：反向追蹤這個 TI 明細為哪張 SO 哪個 line 存在；Phase 0 D3）
- `Nx04SoItem.tiId`（transferSourceType=G 時填）＝正向鏈；另有 stId（自倉調撥）/ coId（客訂）同範式
- `Nx02Rfq.sourceSoItemId`（rfqType=P 同行詢價 stub、B5 採用後反查）
- `Nx02Rr.tiId` → RR 知道自己從哪張調貨單來；`Nx05ApLedger.tiId`（sourceType=TI）
- 全鏈：SO line ↔ RFQ(P) ↔ TI item ↔ RR ↔ AP、雙向可追

**缺口 🛠（待拍板要不要做）：**
- `Nx02PoItem` 無 sourceSoItemId（schema grep 0 處）＝「為某張銷貨向**一般供應商**下採購」
  無法綁單。偉盟 RORER 不分同行/供應商。
- 恆迎實務問題（請執行長判斷）：客戶等貨時向原廠/大盤緊急叫貨、要不要在單據上綁住
  「這筆進貨是為了誰」？若同行調貨已涵蓋 9 成情境、此項可緩。
- 若做：建議 PoItem 加可空 sourceSoItemId（對齊 TiItem 範式）、RR 承接自 PO 免加欄。

## ② 帳款對象分離：採購側有欄無帳、銷售側全缺

**已存在：**
- `Nx02Po.invoiceToPartnerId`（T7 2026-06-08、註解明寫「發票對此 partner 開、
  AP 帳目對此 partner 歸戶」、母公司付款/集團代付語意）
- `Nx01Partner.parentPartnerId`（總公司 self-FK、CP1 2026-06-06）

**缺口 🛠：**
1. **AP 歸戶未接欄**：AP 產生器 3 支（nx05-create-ap-from-po / -rr / -ti）全部
   `supplierId: xx.supplierId`、invoiceToPartnerId 在 nx-api 僅 po.service/dto 5 處
   （CRUD 存取）、過帳鏈 0 處引用 → 填了付款對象、AP 還是掛原供應商。
   `Nx05ApLedger` 也無帳款對象欄（歸戶對象與交易對象分離需要加欄或改寫 supplierId 語意）。
2. **銷售側無對稱設計**：SO 無 invoiceToPartnerId（「發票開給總公司、貨送分店」的
   台灣連鎖月結常態）；AR 掛 customerId（快照自 SO）。
   替代路徑：AR 對帳單層用 parentPartnerId group（報表題、單據不加欄）——
   兩案取捨屬 NX05 對帳/請款設計、建議轉 CTO 一併定（與檢視 2.4 請款循環同一題域）。

## ③ 直送：單據欄位齊、實體流缺整段

**已存在：**
- PO：`shipToPartnerId`（分店收貨/直送客戶現場、**不進倉**）＋ `shipToAddressId` ＋
  `deliveryAddress`（自由文字、臨時工地）＝指送三欄全套（T7）
- SO：`deliveryType`（D 配送/P 自取/C 寄貨）＋ `deliveryAddress`

**缺口 🛠（本盤點最大實體缺口）：**
1. **直送庫存/過帳流不存在**：nx02/rr 模組 grep shipTo＝0 處——進貨過帳一律入
   `warehouseId` 實倉。PO 標了直送、貨實際沒進倉、帳上却入倉又要出倉 → 帳實不符。
   需 CTO 設計題：直送 RR 過帳走「虛入虛出」自動配對 SO 出貨？還是免庫存過帳模式？
   （牽動 stock ledger 口徑、成本計算、與 ③2 的 TI 直送同解）
2. **TI 無直送欄**：同行調貨單 0 個 shipTo 欄（warehouseId 必填＝一律調回我方倉再出）。
   「同行直送我方客戶」＝代購直送最高頻情境（恆迎日常）、目前走不了單。
3. SO 無指送對象 partner 欄（送到「客戶的客戶」只能寫地址文字、對象無主檔連結）——
   影響面小、列低優先。

---

## 建議優先序（供拍板、規模粗估）

1. **③2 TI 直送欄＋③1 直送過帳流**（一題、同解）：中大。動 TI schema＋TI/RR/SO
   過帳鏈、stock ledger 口徑要 CTO 定案。價值最高（恆迎日常情境）。
2. **② AP 接 invoiceToPartnerId**：小中。AP 產生器 3 支改歸戶邏輯＋ApLedger 加欄
   （或語意改寫）、對帳單 group 一併定。與 NX05 請款設計（檢視 2.4）同批做省二次動。
3. **① PoItem.sourceSoItemId**：小。先問執行長業務頻率、可緩。
4. **③3 SO 指送對象欄**：小。低優先、可與 1 同批。

⚠️ 本報告純盤點、零程式碼改動。所有「該補」項需執行長拍板 + CTO 出規格後才動工。
