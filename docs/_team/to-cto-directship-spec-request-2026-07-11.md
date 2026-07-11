<!-- docs/_team/to-cto-directship-spec-request-2026-07-11.md -->
<!-- 位置：docs/_team/（團隊工作檔、非規格） -->
<!-- 版本：v1.0（2026-07-11、Hank 起草、執行長指示轉 CTO） -->
<!-- 說明：請 CTO（Alex）出「同行直送客戶」系統規格的需求書。自足文件（含現狀事實、
     設計題、約束、期望交付），Alex 無 repo 存取、所有現狀均 Hank grep 核實。
     背景報告：docs/_team/directship-chain-gap-survey-2026-07-11.md -->

# 轉 CTO：同行直送客戶 規格需求（執行長指示 2026-07-11）

## 0. 一句話需求

**客戶下單缺貨 → 向同行調貨 → 同行直接把貨送到客戶手上（不經我方倉）**——
恆迎日常高頻情境。目前欄位面走不了、庫存過帳面沒有這條路。請出系統規格。

---

## 1. 現狀事實（Hank grep 核實、2026-07-11 main）

**同行調貨（調回我方倉再出）鏈已全通、明細級：**
- `Nx04SoItem.transferSourceType='G'` + `tiId` ↔ `Nx02TiItem.sourceSoItemId`（schema 必填）
- 詢價：`Nx02Rfq(rfqType=P).sourceSoItemId`（D4 translator 建 stub、B5 採用反查）
- 收貨：`Nx02Rr.tiId`；帳務：RR 過帳 → `createApFromPostedRr`（**執行長既拍板「帳跟貨走」：
  TI 不立應付、RR 過帳才認列**、sourceType 分 PO/RR/TI）
- SoItem 雙段狀態：`transferStatus`（P 待補/I 補貨中/C 補貨完成）+
  `fulfillStatus`（W 等貨/PK 撿貨/PL 包貨/D 配送/F 送達）
- TI 狀態鏈：D 草稿/S 已發出/R 已回覆/P 待驗收/C 已完成/V 作廢；`warehouseId` 必填（入庫倉）

**直送相關已有欄位：**
- PO（T7 2026-06-08）：`shipToPartnerId`（註解含「直送客戶現場、不進倉」）+
  `shipToAddressId` + `deliveryAddress`（自由文字覆寫）——**但只有欄位、無過帳配套**
- SO：`deliveryType`（D 配送/P 自取/C 寄貨）+ `deliveryAddress`
- AP 歸戶：`Nx05ApLedger.billToPartnerId` 已上（2026-07-11、承 PO 付款對象）

**缺（本規格要補的）：**
- TI 零個 shipTo 欄（同行直送表達不了）
- 進貨過帳（RR）一律入實倉、無「不進倉」分支（rr 模組 grep shipTo＝0 處）
- 直送情境的 SO 出貨側狀態推進規則（撿貨/包貨對直送無意義）

---

## 2. 設計題（請 CTO 逐題定案）

### Q1 庫存過帳語意（核心題）
直送＝貨實體不經我方倉。stock ledger 怎麼記？
- **a. 虛入虛出**：RR 過帳同 transaction 入庫＋出庫（同倉同量、淨變動 0）、
  ledger 留全軌、銷貨成本自然接上
- **b. 免庫存過帳**：直送單據完全不動 ledger、只走帳務（AP/AR）——最簡、
  但銷貨成本來源要另定義（毛利報表口徑）
- **c. 直送虛擬倉**：每租戶一個系統直送倉、過帳進虛擬倉再由 SO 出——
  帳面清楚、但多一個倉的維運概念
- Hank 傾向 a（ledger 完整、報表不缺段、不新增倉概念）；請定案＋定成本口徑
  （直送銷貨成本＝TI 明細 unit cost？）

### Q2 直送欄位放哪
- TI header 加 shipTo 三欄（對齊 PO T7 範式）？還是輕量化：TI 明細已綁 SO line、
  直送對象可從 SO 客戶推導 → header 只加 `isDirectShip` flag + 地址覆寫欄？
- ⚠️ 守則：欄位語意唯一、禁一欄多義（偉盟負面教材 #1）

### Q3 SO 出貨側
- 直送時 `fulfillStatus` 怎麼推進（W→?→F）：撿貨/包貨階段跳過？誰確認送達
  （同行回報/客戶簽收/我方業務）？
- `deliveryType` 要不要加「T=同行直送」值、還是沿用 D＋直送 flag？

### Q4 範疇
- 只做同行 TI 直送、或含一般供應商 PO 直送（PO 欄位已在、只缺過帳分支）一次解？
- Hank 建議一次解（Q1 的過帳設計兩者共用、二次動成本高）

### Q5 單據列印/客戶視角
- 直送時給客戶的單據（出貨單/簽收單）由誰的名義出？送貨單上的出貨人顯示我方
  （客戶不應看到同行資訊——商業敏感）？列印模板要不要直送變體？

---

## 3. 約束（規格必須守的既拍板）

1. **帳跟貨走**（執行長拍板）：TI 不立應付、RR 過帳才認列——直送設計不可繞開
2. **三版只差人數上限**、功能模組化不綁版本；TI 現為 LITE-CORE
3. 欄位語意唯一、需求來了開正式欄不借舊欄（偉盟負面教材 #1/#2）
4. 跨模組軟連結對齊 nx98 範式（不建 FK 的場景）
5. schema 變更走 db execute ＋ 追加 `packages/db-core/prisma/sql/pending-production.sql`
   （migrate dev 壞、執行長拍板的現行範式）
6. 客戶端 URL 不露 NX 代碼

## 4. 期望交付（給 Hank 可直接開工的格式）

- schema 變更清單（表/欄/型別/註解、含 DDL 要點）
- TI/RR/SO 狀態機變化 + 過帳規則（含 Q1 定案的 ledger 寫法、成本口徑）
- Service 層行為規格（建單/過帳/回寫、異常路徑：直送後客退怎麼走）
- UI 流程要點（哪些頁動、給 Hana 的介面需求另列）
- 驗收準則（Hank 據此寫 E2E）

## 5. 附帶轉 CTO 事項（非本規格、順帶帶到）

1. **currency_id 預設值觀察**（0711-C 發現 2）：nx04_so / nx02_rr 的 currency_id
   DB default 'TWD' 是幣別代碼、但 FK 指向 nx01_currency.id（NX01CURR…）——
   預設值本身違反 FK、靠應用層明填才沒炸。建議改 default 或移除
2. **銷售側帳款分離**（盤點缺口②後半）：SO 無 invoiceToPartnerId、AR 掛 customerId；
   「發票開總公司、貨送分店」需求與檢視 2.4 請款循環同題域、建議 NX05 對帳設計一併出
3. **pending-production.sql 流程告知**：db execute 範式下待上 production 的 DDL
   已建累積檔（全冪等）、production 部署 SOP 請納入
