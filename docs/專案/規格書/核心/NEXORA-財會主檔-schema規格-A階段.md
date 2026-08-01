<!-- docs/專案/規格書/核心/NEXORA-財會主檔-schema規格-A階段.md -->
<!-- 檔案版本：v0.2（✅ §7 七題已於 2026-08-01 全數照建議拍板；v0.1 為待決草案） -->
<!-- v0.1→v0.2 變更：①§7 七題全數拍板、②補「動手前三個 grep」的實測結果、③§3.6 稅率型別依 Q6 定為 Decimal(5,2)。
     ⚠ 歷史保留：v0.1 的「待拍板」措辭改為「已拍板」，但建議內容一字未改（拍板＝照建議）。 -->
<!-- 檔案說明：A 階段交付物——把亞羅《核心主檔 v1》的 14 張財會主檔轉譯成 NEXORA 的 schema 規格。
     上位依據：NEXORA-策略骨架.md §4（核心 vs 行業皮）、NEXORA-模組重定義分析.md §4 缺口1（總帳脊椎）、
     NEXORA-循環覆蓋對照-亞羅v10.md §5（轉譯要做的三件事）＋§3 三題拍板（2026-08-01）。
     本檔只做「主檔層」。傳票／分錄／日記帳／總分類帳／試算表／財報結構屬 B 階段，見 §8。 -->

# NEXORA 財會主檔 schema 規格（A 階段・轉譯自亞羅核心主檔 v1）

> **一句話**：亞羅那 14 張表不是照抄就好——**其中 11 張可以直接進核心，1 張是台灣法規皮，1 張是汽配皮（該移出財務），1 張是架構決策題**。
> 本檔把它們逐張定案成 NEXORA 的表與欄位，並補了亞羅用 Excel 公式頂著、進了系統就必須成表的 3 張。

**版本** v0.2 ｜ **撰寫** Hank ｜ **日期** 2026-08-01 ｜ ✅ **§7 七題已全數照建議拍板（執行長 2026-08-01）**

---

## 0. 來源與盤點方法

| 側 | 依據 | 實測 |
|---|---|---|
| 亞羅 | `C:\autoparts\亞羅\規劃\亞羅核心主檔-v1.xlsx` | **33 分頁**（逐頁讀取、非依記憶）|
| 亞羅 | `C:\autoparts\亞羅\規劃\亞羅營運循環-v10.xlsx` | **64 分頁**，含 5 張分循環交易科目對映 ＋「回頭要補的」**89 列** |
| NEXORA | `packages/db-core/prisma/schema.prisma` | `^model Nx05` → **10 個 model**；全庫 `[模組]+[4 碼]` ID 代號 **188 組**（本檔 17 個新代號已逐一 grep，**碰撞 0**）|

**實測到的精確數字**（取代原對照書的概述）：

- 交易科目對映：彙總表 **43 個交易代號**／131 列；5 張分循環分頁另有 **20 個交易代號尚未併入彙總**（融資 6、人資 5、固資與資訊 9）→ **全域共 63 個交易代號**。
- 會計科目 **139 列**、代碼參數表 **170 列**、資產主檔 **62 列 × 26 欄**、會計政策 **14 項**。
- 「回頭要補的」實際 **89 列**（檔頭寫 90）：已結案 43（42 標「已補」＋1 標「已驗證」）、**未結案 46**。其中**直接影響本批 14 張表的未結案項有 12 條**，逐條處置見 §7。

---

## 1. 三個先決判斷（⚠ 需執行長拍板才實作）

### 判斷 1️⃣ 模組歸屬：**全部歸 NX05，不新開模組**

| | |
|---|---|
| **決定** | 14 張（＋我補的 3 張）全部進 `Nx05*` 命名空間，`gen_nx05_*_id()` |
| **理由** | ① 這批是**總帳脊椎的前置主檔**——沒有科目類別、會計期間、過帳規則，傳票根本開不出來。脊椎是命脈（策略骨架 §6 硬事實），**不能是可不訂閱的模組**<br>② 唯一像「可獨立賣」的是固定資產。但它的分錄（`FA-DEP` 折舊提列）一樣要進總帳、一樣吃會計期間與科目表——**表拆出去只會多一條跨模組耦合** |
| **⭐ 與產品鐵則的關係** | 鐵則說「功能全模組化」，模組化的掛點是 **controller 的 `@RequiresModule`**，不是 schema。<br>將來固定資產若要獨立收費，做法是新開 `NX11 固定資產` 模組代號並在 controller 標註，**表不用搬**。這正是 2026-07-31 把 21 個 planCode 閘門改綁模組訂閱時確立的分工 |

### 判斷 2️⃣ ⭐ 核心 vs 皮：這 14 張裡有 **1 張是台灣法規皮、1 張是汽配皮**

策略骨架 §4 說「每一個焊進核心的『恆迎專用』假設都是未來擴張的地雷」。逐張過一次，發現**皮不只一層**：

| 表 | 這一層是什麼 | 處置 |
|---|---|---|
| **發票字軌** | 🔴 **台灣皮**（統一發票配號：字軌兩碼、每兩月一期、跨期不得續用、空白也要申報）——換到日本／越南／新加坡完全不適用 | 表照建、但**結構寫成「憑證編號區段管理」的中性形狀**（見 §3.12），台灣專屬規則走 seed 與 service，不焊進欄位 |
| **稅別** | 🟡 **半台灣皮**：`稅率／進銷項／可否扣抵／對映稅額科目` 四個屬性是 VAT 通則（歐盟、東南亞同構）；但 `S53 三聯式／S52 二聯式／PND 不得扣抵` 的**值域**是台灣的 | 表進核心（結構中性）、**值域全部走 seed**，不寫成 enum |
| **零件類型加成率** | 🔴 **汽配皮 ＋ 放錯房間**——它是**定價主檔不是財會主檔**（公司定價＝真實成本×(1＋加成率)），而且掛在「零件類型」＝汽配專屬概念 | ⛔ **本批移出**。改歸 NX04 定價、正名為「品類加成率」掛中性品類。理由見 §6 |
| 其餘 11 張 | 會計期間／科目類別／科目表／過帳規則／銀行帳戶／收付方式／付款條件／定期費用／應收票據／資產／會計政策 | ✅ 通路業 ERP 核心，任何行業任何國家都要 |

⭐ **這是本次轉譯最重要的發現**：策略骨架只談了「行業皮」（汽配 vs 五金 vs 醫材），**沒談「國別皮」**。財會是第一個撞上它的模組——因為稅制與憑證制度是按國家走的，不是按行業走的。⚠ 建議策略骨架下一版補這一層。

### 判斷 3️⃣ 代碼參數表：**不做全域參數池，只做「租戶可自訂值域」的收容表**

亞羅那張 170 列的參數表立了兩條好判準（>50 個值＝資料不是參數；帶其他屬性＝主檔不是參數）。但直接搬進 NEXORA 會出事：

- NEXORA 現況是**值域寫在欄位註解 ＋ VarChar**（例：`status String @default("DRAFT") @db.VarChar(30)`，註解寫「DRAFT / PENDING / APPROVED / PROCESSED / VOIDED」）。
- 把 192 張表的值域全搬進參數池 ＝ 全庫級重構，**風險遠大於總帳脊椎本身**，而且違反「漸進式、不一次大改」。

| | |
|---|---|
| **決定** | 建 `Nx01Param`，但**限定用途**：只收「租戶可自行增刪、且不影響狀態機的分類型值域」 |
| **⛔ 不收** | 單據狀態機（DRAFT/APPROVED/VOIDED…）、方向旗標（借/貸、進項/銷項）、任何被 `switch` 判斷的值 —— **這些留在程式碼**，因為它們一改程式就要改，放 DB 只是製造「改得動但改了會壞」的假象 |
| **A 階段實際進池的** | 亞羅參數表 170 列裡，扣掉已升格成主檔的（稅別、收付方式、銀行帳戶類型、資產類別）與屬狀態機的，**實收 9 類**：現金流量分類、費用核准路徑、定期費用頻率、現金預測確定性、未達帳項類型、處分方式、資本支出類別、資產狀態、折舊方法 |
| ⚠ **待拍板** | 這 9 類要不要真的走參數表，還是各自寫欄位註解？我建議走參數表——因為它們**每一個都會被客戶改**（不同客戶的費用核准路徑不一樣），而狀態機不會 |

---

## 2. 對照總表：亞羅 → NEXORA 落點

| # | 亞羅分頁 | 規模 | NEXORA 落點 | 性質 |
|---|---|---|---|---|
| 1 | 會計政策 | 14 項 | 🆕 `Nx05AccountingPolicy` | 新表 |
| 2 | 會計期間 | 33 列 | 🆕 `Nx05FiscalPeriod` | 新表（⚠ 與既有 `Nx05Closing` 是兩件事，見 §3.2）|
| 3 | 科目類別 | 8 列 | 🆕 `Nx05AccountClass` | 新表 |
| 4 | 會計科目 | 139 列 | 🔧 `Nx05AccountCode` **擴 11 欄** | 改既有 |
| 5 | 交易科目對映 | 43＋20 代號 | 🆕 `Nx05PostingRule` ＋ `Nx05PostingRuleLine` | 新表 ×2 ⭐ |
| 6 | 銀行帳戶 | 4 列 | 🆕 `Nx05BankAccount` | 新表 |
| 7 | 稅別 | 7 列 | 🆕 `Nx05TaxCode` | 新表 |
| 8 | 收付方式 | 6 列 | 🆕 `Nx05PayMethod` | 新表 |
| 9 | 付款條件範本 | 8 範本 | 🆕 `Nx05PaymentTerm` ＋ `Nx05PaymentTermLine` | 新表 ×2 |
| 10 | 定期費用排程 | 9 列 | 🆕 `Nx05RecurringExpense` | 新表 |
| 11 | 發票字軌 | 2 列 | 🆕 `Nx05InvoiceTrack` | 新表（台灣皮、結構中性化）|
| 12 | 應收票據登錄 | 1 範例 | 🔧 `Nx05Note` **擴 6 欄** | 改既有（NEXORA 已有雙向票據表）|
| 13 | 資產主檔 | 62×26 | 🆕 `Nx05AssetClass` ＋ `Nx05Asset` | 新表 ×2 |
| 14 | 代碼參數表 | 170 列 | 🆕 `Nx01Param`（限定用途、實收 9 類）| 新表 ⚠ 見判斷 3️⃣ |
| — | 零件類型加成率 | 3 範例 | ⛔ **移出本批** → NX04 定價 | 見 §6 |

### ⭐ 我判定「該有但亞羅沒成表」的 3 張（CLAUDE.md §4：要問系統該不該有、不只有沒有）

| # | 表 | 為什麼亞羅沒有 | 為什麼 NEXORA 非有不可 |
|---|---|---|---|
| 15 | 🆕 `Nx05NoteBook` 票據簿 | 亞羅**有**這張（核心主檔第 27 分頁），但沒被列進「14 張」 | 支票是連號的，**每一張空白支票＝一張空白授權**。NEXORA 目前 `Nx05Note` 只管單張票，沒有「哪一本、用到哪一號、跳號沒有」——這是最常見的財務漏洞之一 |
| 16 | 🆕 `Nx05AssetDepreciation` 折舊提列明細 | 亞羅用 Excel 公式即時算（`已提月數` 依「結算基準日」那一格） | 🔴 **Excel 可以每次重算，資料庫不行**——折舊要產生分錄（`FA-DEP` 借 6401／貸 15x2），分錄一旦過帳就不可重算。**必須逐月落一列**，否則關帳後改耐用年數會把歷史分錄改掉 |
| 17 | 🆕 `Nx05AssetClass` 資產類別 | 亞羅 v10 把它放在「值域新增－固資與資訊」待補（第 77 項未結案），資產主檔那一欄目前是自由文字 | 它帶著**兩個屬性**（對映科目、累計折舊科目）→ 依亞羅自己的判準二「帶其他屬性就是主檔」，它本來就該升格。⭐ 用亞羅的規則糾正亞羅的表 |

**合計**：新增 **16 個 model**（Nx05 ×15、Nx01 ×1）、修改既有 **2 個 model**（`Nx05AccountCode`、`Nx05Note`）。

---

## 3. 逐表 schema 規格

> **全表共用的 NEXORA 慣例**（不在各表重複列）：
> `id` `@db.VarChar(15)` `@default(dbgenerated("gen_nx05_xxx_id()"))`；`tenantId` `@db.VarChar(15)` ＋ `Nx99Tenant` 外鍵；
> `createdAt/createdBy/updatedAt/updatedBy`；主檔一律 `isActive Boolean @default(true)`（**軟刪除、不硬刪**）；
> `@@unique([tenantId, code])`；`@@map("nx05_xxx")`；每欄 `///` 三斜線註解（會被 `gen-table-comments.mjs` 轉成 DB COMMENT）。

### 3.1 `Nx05AccountClass` 科目類別 ﹝`NX05`+`ACLS`﹞

亞羅 8 列值域（1 資產 … 8 營業外支出）。**它決定借貸方向與財報歸屬，科目表靠編號第一碼自動查到這裡。**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(1) | 首碼 1–8 |
| `name` | VarChar(50) | 資產／負債／權益／營業收入／營業成本／營業費用／營業外收入／營業外支出 |
| `increaseSide` | VarChar(1) | `D`=增加記借方／`C`=增加記貸方 |
| `statement` | VarChar(2) | `BS`=資產負債表／`PL`=損益表 |
| `statementSection` | VarChar(30) | 財報段落（資產／負債／權益／營業收入／營業成本／營業費用／營業外損益）|
| `sortNo` `remark` `isActive` | — | — |

⚠ **這張表是值域、只有 8 列、不給租戶新增**——`isSystem` 恆為 true。恆迎的反面教材：科目分類表 43 筆、六個代碼只對應三個名稱，且「資　產」有全形空格版與無空格版兩種寫法，統計時被算成兩類。
→ 落地做法：`code` 加 `@@check(code IN ('1'..'8'))` 由 migration 建 CHECK 約束；名稱以 seed 寫入、UI 不給編輯。

### 3.2 `Nx05FiscalPeriod` 會計期間 ﹝`NX05`+`FSPD`﹞

⚠ **這不是既有的 `Nx05Closing`**。實測 `Nx05Closing` 是**每日一筆的日結＋401 申報期鎖定**（`closingDate @db.Date`、`reportPeriod` YYYY-EE）；亞羅這張是**年度×月份的會計期間**（狀態機 未開放→開帳中→已關帳）。兩張並存、關係見表末。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `fiscalYear` | Int | 年度 |
| `periodNo` | Int | 期別 1–12（⚠ 保留 13 給年度調整期，見待拍板 Q3）|
| `code` | VarChar(7) | 期間代碼 `YYYY-MM`，`@@unique([tenantId, code])` |
| `startDate` `endDate` | Date | 起日／迄日 |
| `status` | VarChar(10) | `PENDING` 未開放 / `OPEN` 開帳中 / `CLOSED` 已關帳 |
| `closedAt` `closedBy` | — | 關帳日／關帳人 |
| `isYearEnd` | Boolean | 是否年度結帳期（12 月）→ 觸發 `CLS` 結轉 3202→3201 |
| **關帳四閘**（🔴 亞羅 v1 的核心設計）| | |
| `gateBankRecDiff` | Decimal(14,2) | 銀行對帳差額，必須 0 |
| `gatePettyCashDiff` | Decimal(14,2) | 零用金盤點差額，必須 0 |
| `gateLandedCostBalance` | Decimal(14,2) | `1122 進貨附加成本` 期末餘額，必須趨近 0 |
| `gateAssetDiff` | Decimal(14,2) | 🆕 固定資產帳帳相符差額，必須 0（亞羅第 75 項待補、我直接補上——它全自動、加它成本是零）|
| `canClose` | Boolean | 四閘全 0 才 true。**由 service 算、不給人工改** |

⭐ **這一格是資金循環五道人造紀律裡四道的掛點**：不對帳 → 不能關帳 → 不能申報營業稅 → 國稅局會罰。
⚠ **與 `Nx05Closing` 的關係**：`Nx05Closing`（日結／401 期）是**營業稅申報軌**，`Nx05FiscalPeriod`（月期）是**帳務軌**——亞羅自己也寫了「營業稅每兩個月申報，與會計期間的月結是兩回事，不要混」。兩張各管各的，**不合併**；但 `Nx05FiscalPeriod.status='CLOSED'` 要成為傳票寫入的硬閘。

### 3.3 `Nx05AccountingPolicy` 會計政策 ﹝`NX05`+`ACPO`﹞

亞羅 14 項（存貨制度／存貨計價／收入認列／折舊方法／殘值／折舊起算／資本化門檻／呆帳／會計年度／營業稅申報／部門費用分攤／報價含稅慣例／外幣換算／存貨評價）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(30) | 政策代號，例 `INVENTORY_COSTING` |
| `name` | VarChar(100) | 政策項目 |
| `selectedValue` | VarChar(50) | 本租戶採用值 |
| `allowedValues` | VarChar(300) | 可選值（`\|` 分隔）|
| `changePolicy` | VarChar(20) | `FREE` 可改 / `CAUTION` 不建議 / `APPROVAL` 需申請（向國稅局）|
| `lockedAt` | DateTime? | 🔴 **開帳後鎖定時間**——非 null 即不可改，要改必須留變更紀錄 |
| `effectiveFrom` | Date | 生效期間起 |
| `remark` | Text | 影響與理由（亞羅那一欄的文字很有價值，全部帶進來）|

🔴 **這張表不是文件、是會被程式讀的**：`INVENTORY_COSTING`（移動平均／個別認定）直接決定 `Nx03StockLedger` 的成本算法；`CAPITALIZE_THRESHOLD`（8 萬）決定資產是否入 `Nx05Asset`；`DEPRECIATION_START`（取得次月）決定 `Nx05AssetDepreciation` 第一列的月份。
⚠ 亞羅第 5 項的例外（同行調貨採個別認定、不進移動平均池）→ 這不是「一個政策一個值」裝得下的，**需要 `Nx05AccountingPolicyException` 子表或 `selectedValue` 放 JSON**。⚠ 待拍板 Q4。

### 3.4 ⭐ `Nx05PostingRule` 過帳規則（交易科目對映）﹝`NX05`+`PSTR`﹞

> **這是缺口 1 的核心資產**。0724 討論檔 §7 說「逐事件定案借貸科目 → 這就是總帳脊椎的正式規格」，亞羅做完了。

**表頭 `Nx05PostingRule`**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(12) | 交易代號，例 `SO-CR` `PO-IMP` `FA-DEP`（**全域 63 個**）|
| `name` | VarChar(50) | 交易類型，例「銷貨（賒銷）」 |
| `cycleCode` | VarChar(10) | 🔴 所屬循環（`SALES`/`PURCHASE`/`INVENTORY`/`FUND`/`FINANCE`/`HR`/`FIXEDASSET`/`IT`/`PRODUCT`）|
| `legalCycleCode` | VarChar(10) | 🔴 **對映回內控九大的法定循環**——決策 3️⃣ 的落地（見 §5）|
| `sourceDocType` | VarChar(10) | 觸發此規則的單據類型（`SO`/`RR`/`TI`/`PY`…），可空（期末批次類無單據）|
| `isAuto` | Boolean | 是否由單據自動產生分錄（false=人工傳票選用）|
| `status` | VarChar(10) | `ACTIVE` / `PENDING`（🔴待決，如 `IWD` 存貨跌價）/ `INACTIVE` |
| `isSystem` `sortNo` `remark` `isActive` | — | — |

**表身 `Nx05PostingRuleLine` 分錄行 ﹝`NX05`+`PSTL`﹞**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `ruleId` | FK → `Nx05PostingRule` | onDelete Cascade |
| `lineNo` | Int | 序 |
| `drCr` | VarChar(1) | `D` 借／`C` 貸 |
| `accountCodeId` | FK? → `Nx05AccountCode` | 固定科目時填 |
| `accountPattern` | VarChar(10) | 🔴 **可變科目樣板**，例 `6xxx`（依費用性質）、`15x2`（依資產類別）——與 `accountCodeId` **二擇一必填** |
| `amountBasis` | VarChar(20) | 🔴 **金額基礎**：`GROSS` 含稅總額／`NET` 未稅金額／`TAX` 稅額／`COST` 銷貨成本／`FACE` 票面金額／`DIFF` 差異金額／`ALLOC` 分攤金額… |
| `requireDept` | Boolean | 需部門（成本中心）|
| `requirePartner` | Boolean | 需往來對象 |
| `partnerScope` | VarChar(10) | 🔴 `PARTNER` / `EMPLOYEE` / `EITHER` —— 亞羅第 37 項：`2111 應付費用` 的對象可能是**員工**（代墊報支），而員工不在往來對象主檔 |
| `requireBankAccount` | Boolean | 🔴 **需銀行帳戶維度** —— 亞羅第 40 項（⚠部分・未結案），我在此定案為欄位。理由見下 |
| `isOptional` | Boolean | 該行是否條件性出現（例 `PO-RCV` 的第 4 行「若尚有尾款未付」）|
| `condition` | VarChar(200) | 條件說明（人可讀；程式判斷走 service）|
| `remark` | Text | — |

🔴 **`requireBankAccount` 為什麼非要不可**：`BK-TRF` 帳戶間調撥（軋票撥款）是 **借 1102／貸 1102、同科目同金額**——若銀行帳戶不是傳票的一個維度，這組分錄會看起來像什麼都沒發生。恆迎用 `1113 轉入現金`／`1114 轉出現金` 兩個科目繞路，科目表因此膨脹。⭐ 同構的還有 `TRF` 倉庫調撥（借 1121／貸 1121，靠部門維度分辨）。
→ **推論到 B 階段**：傳票分錄行的維度至少要有 **部門、往來對象／員工、銀行帳戶** 三個，缺一組分錄就會消失。

**約束**：`@@unique([ruleId, lineNo])`、`@@index([tenantId, code])`；⚠ **平衡檢查（借方合計＝貸方合計）不做在 DB 層**——因為 `amountBasis` 是符號不是數字，平衡要在過帳當下用實際金額驗，屬 B 階段 service。

### 3.5 `Nx05BankAccount` 銀行帳戶 ﹝`NX05`+`BKAC`﹞

⚠ **這張表是「銀行帳戶不做成會計科目」的落地。** 恆迎 `1112 銀行存款` 底下掛 24 個子科目，其中 18 個近三年沒動，「外匯活存(馬克)」躺了 24 年沒人敢刪。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(10) | 帳戶代號 B01… |
| `bankName` `branchName` | VarChar(100)/(100) | 銀行／分行 |
| `accountNo` | VarChar(30) | 帳號 |
| `accountType` | VarChar(2) | `SA` 活存／`CH` 支存（甲存）／`FX` 外幣／`LN` 貸款專戶 |
| `currencyId` | FK → `Nx01Currency` | 幣別（既有表）|
| `purpose` | VarChar(50) | 用途 |
| `accountCodeId` | FK → `Nx05AccountCode` | 對映科目（通常 1102；貸款專戶對 2151）|
| `openedDate` `closedDate` | Date? | 開戶／結清 |
| `isPrimaryReceipt` | Boolean | 主要收款戶（13 週現金預測的「期初現金」抄這戶）|
| `canIssueCheck` | Boolean | 可開票（＝是，才能在票據簿領支票簿）|
| `sweepSourceAccountId` | FK? → self | 🔴 **軋票來源帳戶**：甲存不足時從哪個活存撥（亞羅第 39 項）|
| `netBankOwner` | VarChar(50) | 網銀權限人 |
| `status` | VarChar(10) | `ACTIVE` 啟用／`RESERVED` 預留／`CLOSED` 已結清 |

① **帳戶不刪只改狀態**——歷史分錄還指著它。② 🔴 `sweepSourceAccountId` 自我參照要防環（service 檢查）。

### 3.6 `Nx05TaxCode` 稅別 ﹝`NX05`+`TXCD`﹞

⚠ 結構中性（VAT 通則）、**值域走 seed**（台灣的 S53/S52/P5/PND/Z0/EX/NA 是一份 seed，不是 enum）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(10) | 稅別代號 |
| `name` | VarChar(50) | 稅別名稱 |
| `taxRate` | Decimal(5,2) | 稅率、**存百分數**（5.00 ＝ 5%）⚠ 對齊既有 7 處寫法；亞羅 xlsx 存 0.05 是小數，匯入要 ×100。見 §7 待拍板 Q6 |
| `direction` | VarChar(2) | `IN` 進項／`OUT` 銷項／`NA` 不適用 |
| `deductible` | Boolean? | 可否扣抵（進項才有意義；null=不適用）|
| `documentType` | VarChar(50) | 適用憑證（三聯式／二聯式／電子發票…）⚠ 台灣值 |
| `taxAccountCodeId` | FK? → `Nx05AccountCode` | 對映稅額科目（2121／1133；`PND` 為 null＝併入費用）|
| `includeInCost` | Boolean | 🔴 稅額是否併入費用／成本（`PND` 不得扣抵＝true）|
| `status` | VarChar(10) | `ACTIVE` / `RESERVED`（Z0 零稅率、EX 免稅 先建不啟用）|

### 3.7 `Nx05PayMethod` 收付方式 ﹝`NX05`+`PYMT`﹞

⭐ **「多久才真的入帳」那一欄，是 13 週現金預測的關鍵。**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(10) | `CASH`/`BANK`/`CHQR`/`CHQP`/`CARD`/`OFFS` |
| `name` | VarChar(50) | — |
| `applyTo` | VarChar(2) | `R` 收／`P` 付／`B` 收與付 |
| `accountCodeId` | FK? → `Nx05AccountCode` | 對映科目（`OFFS` 抵帳為 null）|
| `isImmediate` | Boolean | 即時入帳 |
| `settleLagDays` | Int? | 入帳延遲天數（信用卡 10；支票 null＝依票到期日）|
| `useNoteDueDate` | Boolean | 🔴 依票到期日（取代延遲天數）|
| `requireNoteInfo` | Boolean | 需票據資訊 |
| `feeAccountCodeId` | FK? → `Nx05AccountCode` | 手續費科目（6406）|
| `affectsCash` | Boolean | 🔴 是否動現金（`OFFS` 抵帳＝false）|

⭐ 抵帳（OFFS）這一列證明「往來對象合一」是對的：同一家同行既是客戶也是供應商，NEXORA 的 `Nx01Partner` 本來就合一（`partnerType='O'` 同行 ＋ `canTransferStock`），**抵帳直接沖同一對象的應收與應付，不必像恆迎那樣另開 4 個專屬科目繞路**。→ ✅ **這一條是 NEXORA 現況已經對的地方**。

### 3.8 `Nx05PaymentTerm` 付款條件範本 ﹝`NX05`+`PYTM`﹞＋ `Nx05PaymentTermLine` ﹝`NX05`+`PYTL`﹞

⭐ 執行長 7/30 對亞羅說「恆迎的廠商太多，沒辦法給你一個明確的答案」——這句話本身就是答案：不問「帳期幾天」，問「哪四個維度」。

**表頭**：`code`（PT-A…）／`name`／`applyTo`（`AP` 付款條件／`AR` 收款條件／`BOTH`）／`isDefault`／`remark`／`isActive`
**表身**：`termId` FK／`lineNo`／`triggerPoint` VarChar(3)（`ORD` 下單核准／`RDY` 備貨完成通知／`SHP` 出貨／`RCV` 到貨驗收／`MTH` 月結日）／`percentage` Decimal(5,2)／`daysAfterTrigger` Int／`payMethodId` FK → `Nx05PayMethod`／`noteDays` Int?（票期天數）／`remark`

**約束**：同一範本 `SUM(percentage) = 100`（service 驗）；`@@unique([termId, lineNo])`。

⚠ **對既有表的衝擊**：`Nx01Partner` 現有 `paymentTermDomestic String @default("NET30") @db.VarChar(10)` 與 `paymentTermImport String? @default("TT") @db.VarChar(5)` 是**字串常數不是 FK**。要接上範本必須新增 `paymentTermId`／`paymentTermImportId` 兩個 FK 欄。
→ **建議做法**：新欄 additive 加上、舊欄保留一段過渡期並標 deprecated，**不在 A 階段刪**（避免 breaking）。⚠ 待拍板 Q5。

### 3.9 `Nx05RecurringExpense` 定期費用排程 ﹝`NX05`+`RCEX`﹞

🔴 **這張表是「費用申請門檻」那一題的答案**，也是資金循環唯一的事前核准點：**唯一的事前核准點＝新增或變更這張表的一列，不論金額**——因為它承諾的是未來每個月的錢（5,000 元月訂閱一年 6 萬，比一次性花 3 萬更該審）。任何單一金額門檻都會把這兩者判反。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(10) | FS01… |
| `name` | VarChar(100) | 費用項目 |
| `accountCodeId` | FK → `Nx05AccountCode` | 科目 |
| `frequency` | VarChar(1) | `M`月／`Q`季／`H`半年／`Y`年 |
| `dayOfPeriod` | Int | 每期第幾日付 |
| `payMethodId` | FK → `Nx05PayMethod` | — |
| `estimatedAmount` | Decimal(14,2) | 每期暫估金額 |
| `annualizedAmount` | Decimal(14,2) | 🔴 **年化金額（衍生欄）——核准畫面必須顯示這個數字**，訂閱制是「金額門檻會判反」的典型 |
| `approvalPath` | VarChar(1) | `A` 合約與法定固定／`B` 計量後結算（不審、異常偵測）／`C` 小額零星／`D` 一次性與資本支出／`E` 出貨量連動耗材 |
| `approvalStatus` | VarChar(20) | `APPROVED` / `NOT_REQUIRED`（法定）/ `PENDING` / `WAITING_EVENT` |
| `approvedBy` `approvedAt` | — | — |
| `anomalyMultiplier` | Decimal(4,2)? | 🔴 異常偵測倍數（B 類：超過近 6 期平均 ×1.3 → **提示，不擋**）|
| `partnerId` | FK? → `Nx01Partner` | 收款對象 |
| `nextDueDate` | Date | 下次應付日（供 13 週現金預測抓「高確定性」線）|

⚠ **年繳要能攤到各月的現金預測**（雇主意外責任險 18,000/年），不是只在繳費那個月出現——這是 `frequency='Y'` 的預測邏輯，屬 B 階段。

### 3.10 `Nx05Asset` 資產主檔 ﹝`NX05`+`ASST`﹞＋ `Nx05AssetClass` ﹝`NX05`+`ASCL`﹞

**`Nx05AssetClass` 資產類別**（🆕 我升格的、見 §2）：`code`（`EQP`生財器具／`ITE`資訊設備／`VEH`運輸設備／`LHI`租賃改良物／`SEC`安全設備）／`name`／`assetAccountCodeId` FK／`accumDepAccountCodeId` FK／`defaultUsefulLife` Int／`sortNo`／`isActive`

⚠ 每類資產各自一個累計折舊科目，**不再另設「累計折舊-全部」**——恆迎兩套並存，沒人知道該記哪個。

**`Nx05Asset` 資產主檔**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `code` | VarChar(20) | 資產編號 A001… |
| `name` | VarChar(100) | 資產名稱 |
| `assetClassId` | FK → `Nx05AssetClass` | 🔴 取代亞羅的自由文字欄（第 74 項待補）|
| `acquireDate` | Date | 取得日 |
| `partnerId` `invoiceNo` | FK?/VarChar(30) | 廠商／發票號碼 |
| `acquireCost` `unitPrice` `qty` | Decimal(14,2)/(14,2)/Int | 取得成本／單價／數量 |
| `usefulLifeYears` | Int | 耐用年數 |
| `isCapitalized` | Boolean | 資本化？（依會計政策第 7 項門檻）|
| `capitalizeBatchKey` | VarChar(60)? | 🔴 **整批判定鍵＝同廠商×同日×同資產類別**（亞羅第 73 項：逐列判定會把 8 台×2.5 萬電腦全判成費用化，合起來 20 萬）|
| `depreciationMethod` | VarChar(2) | `SL` 平均法（1-a 只用這一種）|
| `salvageValue` | Decimal(14,2) | 殘值＝成本÷(耐用年數＋1) |
| `depStartMonth` | VarChar(7) | 折舊起算月（取得次月）|
| `departmentId` | FK → `Nx01Department` | 所屬部門 |
| `locationText` | VarChar(100) | 存放位置 ⚠ 見下 |
| `custodianUserId` | FK? → `Nx01User` | 保管人 |
| `status` | VarChar(1) | `A`在用／`P`預定（尚未取得、不折舊）／`I` 🔴**停用但未處分（仍要折舊、仍要盤到）**／`D`已處分 |
| `disposalDate` `disposalMethod` `disposalReason` | Date?/VarChar(4)?/VarChar(200)? | 處分日／`SELL`出售(要開發票)／`SCRP`報廢(要留證明)／`LOSS`盤點短少(🔴要寫原因) |
| `policyNo` `leaseNo` | VarChar(50)? | 🆕 保單編號／租約編號（亞羅第 74 項）→ 供保單到期日曆與租約剩餘攤提年限 |

⚠ **`locationText` 為什麼是文字不是 FK**：亞羅寫「貨架的實體管理已由庫位表覆蓋——同一個實體兩個視角：資產表管它值多少錢，庫位表管它裝什麼貨，各記各的不重複」。NEXORA 有 `Nx01Location`，但**資產的存放位置不一定是庫位**（辦公區、店面）→ 保持文字，不強綁。
🔴 **資產不刪**。處分或報廢填 `disposalDate` ＋ 改狀態，歷史折舊要留著。

**`Nx05AssetDepreciation` 折舊提列明細 ﹝`NX05`+`ASDP`﹞**（🆕 我補的、見 §2）
`assetId` FK／`periodCode` VarChar(7)（YYYY-MM）／`depAmount` Decimal(14,2)／`accumDepAmount` Decimal(14,2)／`netBookValue` Decimal(14,2)／`postedAt` DateTime?／`voucherId` VarChar(15)?（B 階段接傳票）
**約束**：`@@unique([assetId, periodCode])` —— 同一資產同一期只能提列一次。

### 3.11 🔧 `Nx05AccountCode` 會計科目（**擴 11 欄**）

現況只有 8 個業務欄（code/name/category/isSystem/isActive/remark ＋ 4 個時戳）。`category` 是 `VarChar(1)`、值域 `I=收入/E=支出/A=資產/L=負債` —— **只有 4 類，撐不起財報**（沒有權益、沒有分營業/營業外、沒有借貸方向）。

| 新增欄位 | 型別 | 說明 |
|---|---|---|
| `accountClassId` | FK → `Nx05AccountClass` | 🔴 由 `code` 第一碼自動帶出，人不用填 |
| `level` | Int | 階層 1=大類／2=中類／3=明細 |
| `parentId` | FK? → self | 上層科目 |
| `isPostable` | Boolean | 🔴 **可記帳**（大類／中類皆 false，不可記帳）|
| `cashFlowType` | VarChar(1) | `O`營業／`I`投資／`F`籌資／`C`現金及約當現金／`N`不適用 —— ⭐ 標好這欄，現金流量表就能自動出 |
| `requireDept` | Boolean | 需部門（成本中心）|
| `requirePartner` | Boolean | 需往來對象 |
| `partnerScope` | VarChar(10) | `PARTNER`/`EMPLOYEE`/`EITHER` —— 2111 應付費用要能指向員工 |
| `defaultTaxCodeId` | FK? → `Nx05TaxCode` | 預設稅別 |
| `sortNo` | Int | — |
| `statementSection` | VarChar(30)? | 財報段落覆寫（多數由 class 帶出，少數例外如 1122 歸「存貨」段）|

⚠ **`category` 舊欄怎麼辦**：保留、由 `accountClassId` 衍生回填（1→A、2→L、3→L(權益暫併)、4→I、5–8→E），標 deprecated。**A 階段不刪**——先 grep 確認 `category` 的實際使用點再決定，見 §7 待辦。
⚠ **`code` 目前 `VarChar(10)`**：亞羅最長 4 碼、恆迎有 `6143.002` 這種 7 碼帶點的，10 碼夠用。✅ 不動。

### 3.12 `Nx05InvoiceTrack` 發票字軌 ﹝`NX05`+`INVT`﹞（台灣皮・結構中性化）

⚠ 這跟「單號規則」是兩件事：單號是自己編的，字軌是**主管機關配發**——跨期不得續用、用不完要作廢、必須申報使用明細。

| 欄位 | 型別 | 中性名 → 台灣意義 |
|---|---|---|
| `periodCode` | VarChar(7) | 期別 `2026-0708`（台灣：每兩個月一期）|
| `fiscalYear` | Int | 年度 |
| `trackCode` | VarChar(10) | 字軌 `AB`（中性：憑證序號前綴）|
| `startNo` `endNo` | VarChar(20) | 起號／迄號（**用字串不用 Int**——他國憑證號可能含字母）|
| `allocatedCount` | Int | 配號張數 |
| `issuedToNo` | VarChar(20) | 已開立至 |
| `issuedCount` `voidedCount` `unusedCount` | Int | 已開立／作廢／空白未用 |
| `filedAt` `filedBy` | — | 申報日／申報人 |
| `status` | VarChar(20) | `UNALLOCATED` 未配號／`IN_USE` 使用中／`CLOSED` 已結束 |

🔴 **對帳鐵律**：`issuedCount + voidedCount + unusedCount = allocatedCount`（主管機關按配號張數對帳）→ service 檢查。
⛔ **不要把「每兩個月一期」寫進欄位或 CHECK**——`periodCode` 是自由字串，台灣的兩月一期走 seed 與 service 規則。

### 3.13 🔧 `Nx05Note` 票據（**擴 6 欄**）＋ 🆕 `Nx05NoteBook` 票據簿 ﹝`NX05`+`NTBK`﹞

✅ **好消息**：NEXORA 的 `Nx05Note` 已經是**雙向**的（`direction` R=應收／P=應付），亞羅要的「應收票據登錄」**不必新開表**——這是 NEXORA 現況比亞羅好的地方（亞羅是先有票據簿、v1 才發現客票沒地方登錄）。

| 新增欄位 | 型別 | 說明 |
|---|---|---|
| `drawerName` | VarChar(100) | 🔴 發票人（客票的開票人，可能非 partner 本人）|
| `payingBankName` | VarChar(100) | 付款行 |
| `receivedDate` | Date? | 收票日（direction=R）|
| `collectionDate` | Date? | 託收日 |
| `collectionBankAccountId` | FK? → `Nx05BankAccount` | 託收帳戶 |
| `noteBookId` | FK? → `Nx05NoteBook` | direction=P 時指向票據簿 |

⚠ **狀態值域要對齊**：現況 `status` = `DRAFT/ACTIVE/CLEARED/BOUNCED/VOIDED`。亞羅收票側要 `H庫存/C託收中/D已兌現/NG退票/T轉讓`、開票側要 `I已開出/D已兌現/V作廢/S止付`。
→ **建議**：`status` 補 `IN_COLLECTION`（託收中）與 `STOP_PAYMENT`（止付）兩值，`T轉讓` **不做**（亞羅自己也標停用：票據轉讓會讓責任鏈複雜且難追）。⚠ 這是既有 enum 擴充、要 grep 所有 switch，見 §7。
🔴 `BOUNCED` 已存在 ✅——退票要能觸發 `CQ-NG` 分錄（借 1111／貸 1112）與客戶信用狀態降級（鎖貨）。

**`Nx05NoteBook` 票據簿**：`code`（CB01）／`bankAccountId` FK／`noteType`（支票／本票）／`startNo` `endNo` VarChar(20)／`totalCount` Int／`issuedToNo` VarChar(20)／`issuedCount` `voidedCount` `remainingCount` Int／`receivedDate` Date／`custodianUserId` FK／`status`／`remark`
① **每一張空白支票都是一張空白授權**。保管人只能有一個，而且不該是開票的人。② 作廢支票不可丟棄、要登記張數。③ **剩餘空白低於 5 張要提示申請新簿**（參數，不寫死）。

### 3.14 `Nx01Param` 代碼參數表 ﹝`NX01`+`PARM`﹞（⚠ 限定用途、見判斷 3️⃣）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `categoryCode` | VarChar(30) | 參數類別 |
| `code` | VarChar(20) | 代碼 |
| `name` | VarChar(50) | 顯示名稱 |
| `sortNo` | Int | 排序 |
| `attr1` `attr2` | VarChar(50)? | 附屬值 1／2 |
| `isSystem` | Boolean | 系統內建（租戶不可刪）|
| `isActive` `remark` | — | — |

**約束**：`@@unique([tenantId, categoryCode, code])`、`@@index([tenantId, categoryCode, sortNo])`
⚠ **紀律（寫進註解、也要進 code review）**：一個值域超過 50 個值 → 它是資料不是參數，獨立成主檔；一個值域每個值都帶其他屬性 → 也是主檔。
（恆迎違反的代價：這張表 11,615 筆裡 10,383 筆是零件族群、365 筆是郵遞區號 —— **89% 是誤塞的資料**。）

---

## 4. 循環映射表（決策 3️⃣ 的落地）

對照書 §3 決策 3️⃣ 拍板：**資金循環獨立保留、映射做在行為層（27 行逐個標）**，理由是資金是「一條拆進兩條」（收款段→銷售及收款、付款段→採購及付款），循環層表達不了。

**A 階段的落地方式**：映射不另開表，直接落在 `Nx05PostingRule` 的兩個欄位——

| 欄位 | 內容 | 用途 |
|---|---|---|
| `cycleCode` | 內部切法（含 `FUND` 資金）| ⭐ 內部用能長出洞察的切法 |
| `legalCycleCode` | 內控九大的法定循環 | ⭐ 對外用法定框架的名字 |

**映射範例**（`FUND` 這一條怎麼拆進兩條）：

| 交易代號 | `cycleCode` | `legalCycleCode` | 說明 |
|---|---|---|---|
| `RC-CA` `RC-CQ` `RC-CD` `CQ-NG` | `FUND` | `SALES_RECEIPT` 銷售及收款 | 收款段 |
| `PY-CA` `PY-CQ` `PY-CD` | `FUND` | `PURCHASE_PAYMENT` 採購及付款 | 付款段 |
| `BK-TRF` `PC-ADV` `PC-EXP` | `FUND` | `TREASURY`（🔴 不完全屬任一條）| 帳戶調撥、零用金 |
| `VAT` `WHT` `TAX-PP` `TAX-FS` | `FUND` | `TREASURY` | 稅務 |
| `EMP-EXP` | `FUND` | `PAYROLL` 薪工 | 員工代墊 |

⚠ **`TREASURY` 這個值是我加的**——內控九大裡沒有它。決策 3️⃣ 說「資金若被拆進兩條循環，沒有人會站在能看見它的位置」，那對外報告時這幾條要掛哪裡？**兩個選項**：(a) 掛「電腦化資訊系統」以外的第九條「其他」；(b) 老實標 `TREASURY` 並在 COSO 說明書寫「本公司另設資金循環，涵蓋跨循環的現金紀律」。**我建議 (b)**——⚠ 待拍板 Q7。

⭐ **正名的落地**（決策 1️⃣2️⃣）：`cycleCode` 的顯示名稱走 seed，`HR`→「人資（法定：薪工）」、`PRODUCT`→「商品開發／選品（法定：研發）」、`FUND`→「資金（法定：拆入銷售及收款／採購及付款）」。⚠ 亞羅自己在人資那條已經示範過這個寫法，本次推廣到另外兩條。

---

## 5. Seed 與中性化

| Seed 包 | 內容 | 性質 |
|---|---|---|
| `seed/system/account-class.ts` | 8 個科目類別 | ⛔ **系統固定**、租戶不可改 |
| `seed/template/tw-account-code.ts` | 台灣通路業科目範本（亞羅 139 列為基礎）| 🟡 **範本**、開帳時複製給租戶、之後租戶自己維護 |
| `seed/template/tw-tax-code.ts` | S53/S52/P5/PND/Z0/EX/NA | 🔴 **台灣皮** |
| `seed/template/posting-rule.ts` | 63 個交易代號 ＋ 分錄行 | 🟡 範本（⚠ 科目引用要跟著科目範本走）|
| `seed/template/accounting-policy.ts` | 14 項政策 | 🟡 範本 |
| `seed/system/param.ts` | 9 類參數 | 🟡 部分 isSystem |

🔴 **科目表中性化的三個必改**（對照書 §6 已警告「科目表是恆迎口徑、作為公版產品要檢查是否夠中性」，逐條看過的結果）：

1. **`1901 開辦費` 要刪**（亞羅第 72 項）——現行商業會計處理準則已刪除開辦費的遞延資產屬性，應於發生時列費用。⭐ 這是「範本裡有一個過時科目」的實例，公版產品絕不能帶著它出貨。
2. **科目編號體例要標明是「範本」不是「規格」**——`1102 銀行存款` 這種 4 碼制是台灣中小企業慣例，不是 IFRS 規定。⚠ 現在 `Nx05AccountCode.code` 是 `VarChar(10)` 自由字串 ✅ 已經夠彈性，只要**不要有任何程式寫死 `'1121'` 這種字面值**——一律走 `Nx05PostingRule` 查。
3. **不設「現金-台北／新莊」「應收-保養廠／同行」這類子科目**——店別走部門維度、客戶類別走往來對象類別，報表再切。這是亞羅最值得抄的一條紀律，✅ 也與 NEXORA 現況一致。

---

## 6. ⛔ 從本批移出的一張：零件類型加成率

| | |
|---|---|
| **判定** | 它**不是財會主檔**，是**定價主檔**：公司定價 ＝ 真實成本 ×（1 ＋ 加成率），而公司定價是**內部轉撥價**（業務看到的成本是公司定價，所以他永遠看不到真實成本）|
| **⭐ 這一層設計很強** | 加成率有數學上限 `r_max = g/(1−g)`（g＝該類毛利率）。低毛利品類（機油 g≈4.6% → r_max 只有 4.8%）**幾乎沒有加成空間 → 業務賣它拿不到貢獻額 → 他自然不想賣**。制度自動實現「拒做單品低毛利成交」，不需要另訂規則 |
| **⚠ 兩個問題** | ① **放錯房間**：它跟總帳脊椎無關，硬塞 Nx05 會讓「財務模組」變成雜物間（NX01 的老毛病）<br>② **是汽配皮**：掛在「零件類型」＝汽配專屬。中性化後應該是「**品類加成率**」掛在中性品類上 |
| **建議去處** | NX04 定價（`Nx04CategoryMarkup`），與既有 `Nx01CustomerGrade.marginPct`、`Nx04PriceScheme` 一起設計 —— **另開一軌**，不混進 A 階段 |
| ⚠ **不做會怎樣** | 不影響總帳脊椎。但**它是「業務貢獻額」的分母**，而貢獻額是獎金基礎（超額抽成 8%）→ 做 NX07 薪資或 NX04 定價時一定會回頭要它 |

---

## 7. ✅ 七題已拍板（2026-08-01・執行長「照你建議」）

| # | 題目 | ✅ 定案（＝原建議） |
|---|---|---|
| **Q1** | 模組歸屬 | **全歸 NX05、不新開模組**；固定資產若要獨立收費走 controller `@RequiresModule`，表不搬 |
| **Q2** | 代碼參數表範圍 | **限定用途**：只收 9 類租戶可自訂值域；狀態機／方向旗標留程式碼 |
| **Q3** | 會計期間第 13 期 | **保留**（`periodNo` 允許 1–13）——年度調整分錄不擠進 12 月，12 月月報才對得上 |
| **Q4** | 會計政策的例外 | **開 `Nx05AccountingPolicyException` 子表**（政策 × 適用情境 × 例外值），不塞 JSON |
| **Q5** | Partner 付款條件 | **新欄 additive 加、舊欄留過渡標 deprecated**，A 階段不刪 |
| **Q6** | 稅率型別 | **`Decimal(5,2)` 存百分數**，對齊既有 7 處；亞羅 xlsx 的 0.05 匯入時 ×100 |
| **Q7** | 資金循環對外掛哪條 | **老實標 `TREASURY`** ＋ COSO 說明書寫明理由，不硬塞進九大 |

### ✅ 動手前三個 grep 的實測結果（2026-08-01・精確 count）

| # | 查什麼 | 實測 | 對規格的影響 |
|---|---|---|---|
| 1 | `Nx05AccountCode.category` 使用點 | 引用 `accountCode` 的檔 **12 個**；`category` 實際讀寫點在 `account-code.service.ts`（6 處）、`account-code.dto.ts`（4 處、型別寫死 `'I'\|'E'\|'A'\|'L'`）、`nx08 finance-dashboard.service.ts`（依 `category='E'` 抓營業費用）、seed `apply-account-code.ts`（**12 列科目資料**）| ✅ **保留 `category` 標 deprecated 是對的**——四個地方都還在用，硬砍會斷 nx08 損益表。<br>⚠ **新發現**：seed 那 12 列用的是 `4100/5100/6132/6200` 舊編號體例，與亞羅範本的 `4101/5101/6201/6101` **對不上** → 換範本要一起換，列 §7 待辦 |
| 2 | `Nx05Note.status` 的 switch／字面值 | 引用 `nx05Note` 的檔僅 **5 個**；狀態機集中在 `shared/nx05/nx05-state-machine.ts`（`NoteApiStatus` ＋ `NOTE_EDGES`），另 `note.service.ts` 轉換、`nx-ui/features/nx05/ui/common.tsx` 配色 | ✅ **乾淨、可以擴**。加 `IN_COLLECTION`／`STOP_PAYMENT` 只需動 3 個檔（狀態機、service、UI 配色），無散落的 switch |
| 3 | `Nx01Partner.paymentTermDomestic` / `paymentTermImport` | **85 處**（已排除 `generated/prisma`），跨 nx01／nx02（po/qt）／nx04（so/quote/credit-guard/translator）／nx05（ar-statement／4 支 create-ap/ar）／sys-admin／nx-ui 共 20 餘檔 | 🔴 **Q5 的決定被實測完全證實**：直接改成 FK 會一次動到 85 處、橫跨 5 個模組。**新欄 additive、舊欄不刪** 是唯一安全解 |

### ⚠ 亞羅那邊仍未結案、會影響本批的 12 條（引用前必看）

| 亞羅編號 | 影響 | A 階段處置 |
|---|---|---|
| 40 銀行帳戶必須是傳票維度 | `Nx05PostingRuleLine` | ✅ **已定案為 `requireBankAccount` 欄位** |
| 48 權益科目 | 科目範本 | ⚠ **亞羅自己的標記過時了**：v1 科目表實際已有 `3101 股本`／`3201 累積盈餘`／`3202 本期損益`，但待補項寫的是「3101 股本、3201 資本公積、3301 保留盈餘」——**兩套編號體例**。⚠ 範本採用哪一套要問記帳士 |
| 53 融資 6 組對映未併入彙總 | `Nx05PostingRule` seed | ✅ 已納入我算的 63 個代號（`LN-DRAW`/`LN-REPAY`/`LN-GUAR`/`NT-DISC`/`NT-DISC-NG`/`EQ-IN`）|
| 54 缺 `2115 應付特休假薪資` | 科目範本 | ⭐ 建議直接補進範本（勞基法 2017 修法後未休特休一律折發工資，是逐月累積、年底一次爆發的負債）|
| 70 缺 `6411 什項購置` | 科目範本 | ⭐ 建議補（否則 8 萬以下設備只能塞 `6409 什項支出`，而 6409 有 2% 品質閘）|
| 71 缺 `7103 財產交易利益` | 科目範本 | ⭐ 建議補。⭐ 亞羅順帶給了一條可複用的檢查：**凡是有損失科目而沒有對稱利益科目的地方，遲早會有一筆錢無處可放** |
| 72 `1901 開辦費` 該刪 | 科目範本 | ⭐ 建議刪、標記帳士確認（見 §5）|
| 73 資本化整批判定 | `Nx05Asset` | ✅ **已定案為 `capitalizeBatchKey` 欄位** |
| 74 資產缺 3 欄 | `Nx05Asset` | ✅ **已補**（`assetClassId` / `policyNo` / `leaseNo`）|
| 75 會計期間第四閘 | `Nx05FiscalPeriod` | ✅ **已補 `gateAssetDiff`** |
| 77 固資與資訊 8 類值域 | `Nx01Param` seed | ✅ 已納入（資產類別升格主檔、其餘進參數表）|
| 88 缺 `2116 應付獎金（獎金池）` | 科目範本 | ⭐ 建議補（⛔ 不可塞 2111，那格已給員工代墊用）|

### 🛠 由 grep 新長出來的待辦（不在原規格內）

| 待辦 | 內容 | 排程 |
|---|---|---|
| **科目 seed 換代** | `packages/db-core/prisma/seed/template/apply-account-code.ts` 現有 **12 列**科目用 `4100/5100/6132/6200/7100/7200/1100/1200/2100` 舊體例；亞羅範本是 `4101/5101/6201/6101/7101/8101/1101/1111/2101`。**兩套不能並存** | ⚠ A 階段末、換範本時一起做；換之前要先看有沒有既有租戶資料指著舊科目 |
| **Note 狀態擴充** | `nx05-state-machine.ts` 的 `NoteApiStatus` ＋ `NOTE_EDGES` 加 `IN_COLLECTION`／`STOP_PAYMENT`，`note.service.ts` 轉換、UI 配色跟上 | A 階段（schema 欄位先加、狀態值後補）|
| **Partner 付款條件過渡** | 新欄 `paymentTermId`／`paymentTermImportId` 加上後，85 處讀舊欄的程式**一處都不動**；等範本有資料再逐模組切 | A 階段只加欄，切換另排一軌 |

---

## 8. 本檔沒做什麼（B 階段邊界）

⛔ **以下不在 A 階段，本檔一個字都沒定**：

| 屬 B 階段 | 為什麼分開 |
|---|---|
| 傳票單頭 `Nx05Voucher` / 分錄行 `Nx05VoucherLine` | 主檔沒定案，傳票的 FK 指不到地方 |
| 日記帳、總分類帳、科目餘額表 | 是傳票的衍生，先有傳票 |
| 試算表、資產負債表、損益表、現金流量表結構 | 靠 `Nx05AccountCode` 的 `statement`/`statementSection`/`cashFlowType` 三欄長出來——**A 階段已把地基埋好** |
| 各單據（SO/RR/TI/PY…）的過帳觸發 | 要接 `Nx05PostingRule`，但那是 service 不是 schema |
| 13 週現金預測、軋票日曆、銀行對帳、零用金盤點 | 資金循環的**功能**，吃本批主檔但不是主檔 |
| 融資循環（借款契約主檔、擔保品清冊）| 亞羅第 49/50 項也還沒做；且對照書 §1 判定「亞羅補上」——是**另一批**轉譯 |

✅ **A 階段做完的判準**：`Nx05PostingRule` 的 63 個交易代號全部能查到有效科目、`Nx05FiscalPeriod` 四閘能算出 `canClose`、`Nx05Asset` 能算出每月折舊列——**這三件成立，B 階段的傳票就有東西可寫。**
