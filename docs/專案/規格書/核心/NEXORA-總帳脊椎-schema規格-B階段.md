<!-- docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md -->
<!-- 檔案版本：v0.2（✅ §5 五題已於 2026-08-01 全數照建議拍板；B1 實作中） -->
<!-- 檔案說明：B 階段——總帳脊椎本體（傳票／分錄／科目餘額）。
     上位依據：NEXORA-循環圖與過帳事件-0724討論.md（原子生成、紅字沖銷、過帳＝共用能力 三條原則）、
     NEXORA-模組重定義分析.md §4 缺口1、NEXORA-財會主檔-schema規格-A階段.md v1.4（主檔層已完成）。
     A 階段做完主檔層，本檔做「帳本本體」。 -->

# NEXORA 總帳脊椎 schema 規格（B 階段）

> **一句話**：A 階段把 **67 個交易代號、182 條分錄樣板**準備好了；
> B 階段要蓋的是**收這些分錄的帳本**——而它只需要 **3 張表**。

**版本** v0.2 ｜ **撰寫** Hank ｜ **日期** 2026-08-01 ｜ ✅ **§5 五題已全數照建議拍板**（執行長 2026-08-01）

---

## 0. 前提：地基已經在了（實測，非估算）

| 已完成（A 階段） | 數 |
|---|---|
| 過帳規則 `Nx05PostingRule` | **67 個交易代號** |
| 分錄樣板 `Nx05PostingRuleLine` | **182 條** |
| 會計科目（含財報三欄：`statement`／`statementSection`／`cashFlowType`）| 113 |
| 會計期間（含關帳四閘 ＋ `canClose`）| 表已建 |

**分錄樣板對維度的要求**（實測 182 條）：

| 需求 | 條數 |
|---|---|
| 需部門（成本中心）| **58** |
| 需往來對象 | **49** |
| 需銀行帳戶 | **39** |
| 對象可為員工（非往來對象）| 1 |
| 科目是樣板、過帳時才選（`6xxx`／`15x2`…）| 17 |
| 條件性出現（該行不一定發生）| 18 |

🔴 **這張表直接決定分錄行要長什麼欄位**——不是憑感覺開的。

---

## 1. 三條上位原則（0724 討論已定，本檔遵守不重新討論）

| # | 原則 | 對 schema 的約束 |
|---|---|---|
| 1️⃣ | **營運事件是因、會計分錄是果，同一筆交易原子產生**——沒有第二份數字，對帳從「計算」退化成「驗證」 | 傳票**不是人工打的**，是單據過帳時原子生成。傳票必須指得回來源單據 |
| 2️⃣ | **過帳前營運資料可改；過帳當下不可逆；過帳後要修正只能走沖銷／紅字** | 傳票沒有「編輯」，只有 `POSTED` 與 `VOIDED`；作廢＝產生一張反向傳票，原傳票留著 |
| 3️⃣ | **因果單向：營運自動流進會計，會計永不回頭寫營運** | ⛔ 總帳的 service 不得寫任何營運表。這是鐵律，不是慣例 |
| ⭐ | **過帳＝共用能力**（過帳之於總帳，等於撿包送之於庫存）| 過帳邏輯集中在一支 shared service，各劇本在自己的過帳點叫用；⛔ 不許每個模組自己寫一份 |

---

## 2. ⭐ 只要 3 張表（而 0724 §125 列了 5 項）

0724 討論列的下一步是：「傳票單頭、分錄行、總分類帳科目餘額、**試算表**、**財報結構**」。
逐項評估後，**後兩項不需要表**：

| 0724 列的 | 判定 | 理由 |
|---|---|---|
| 傳票單頭 | ✅ **建表** | — |
| 分錄行 | ✅ **建表** | — |
| 總分類帳科目餘額 | ✅ **建表** | 每期結轉要落定，且報表不能每次掃全部分錄 |
| 試算表 | ⛔ **不建表** | 試算表＝科目餘額的一個檢視（借方合計 vs 貸方合計）。**落表等於存一份會過期的複本**，違反原則 1️⃣「沒有第二份數字」 |
| 財報結構 | ⛔ **不建表** | ⭐ **A 階段已經把它埋在科目屬性裡**：`statement`（BS/PL）＋ `statementSection`（財報段落）＋ `cashFlowType`（O/I/F/C/N）。三張主要報表直接 group by 這三欄長出來，不必再開一張對映表 |

⚠ **這是刻意縮小範圍，不是漏做**。多開兩張表的代價是「同一個數字存在兩個地方」——
而那正是恆迎的病（對映表與科目主檔對不上、累積盈餘要重算才平）。

---

## 3. 逐表規格

> 沿用 A 階段的 NEXORA 慣例（`tenantId` ＋ `Nx99Tenant` 外鍵、四個時戳欄、`@@map`、`///` 註解、
> `gen_nx05_*_id()`）。以下只列業務欄位。

### 3.1 `Nx05Voucher` 傳票單頭 ﹝`NX05`+`VOUC`﹞

| 欄位 | 型別 | 說明 |
|---|---|---|
| `docNo` | VarChar(30) | 傳票號 `JV-[年月]-[機構碼]-[5碼流水]` |
| `voucherDate` | Date | 傳票日期（＝營運事件發生日，不是產生日）|
| `fiscalPeriodId` | FK → `Nx05FiscalPeriod` | 🔴 所屬會計期間。**該期 `status='CLOSED'` 時不得寫入**——這是關帳的硬閘 |
| `postingRuleId` | FK? → `Nx05PostingRule` | 依哪一條規則產生（人工傳票為 null）|
| `sourceDocType` | VarChar(10)? | 來源單據類型（`SO`／`RR`／`TI`／`PY`／`AL`…）|
| `sourceDocId` | VarChar(15)? | 來源單據 ID。⚠ 不設 FK——來源可能是 20 幾張不同的表 |
| `sourceDocNo` | VarChar(30)? | 來源單號（冗餘存一份，供查詢與列印，不必 join 20 張表）|
| `origin` | VarChar(10) | `AUTO` 單據自動產生／`MANUAL` 人工傳票／`BATCH` 期末批次（折舊、結轉）|
| `summary` | VarChar(200) | 摘要 |
| `totalDebit` `totalCredit` | Decimal(16,2) | 借貸合計。🔴 過帳時必須相等 |
| `status` | VarChar(10) | `DRAFT`／`POSTED`／`VOIDED` |
| `postedAt` `postedBy` | — | 過帳時間／人 |
| `reversalOfVoucherId` | FK? → self ＋ **`@@unique`** | 🔴 本張是哪一張的**紅字沖銷傳票**。<br>單一欄位即可雙向查（反向關聯給「我被誰沖銷了」）；`@@unique` 保證**一張傳票只能被沖銷一次**|
| `voidReason` | VarChar(200)? | 沖銷原因（必填）|

**約束**：`@@unique([tenantId, docNo])`、`@@index([tenantId, fiscalPeriodId, status])`、
`@@index([tenantId, sourceDocType, sourceDocId])`、`@@index([tenantId, voucherDate])`

⚠ **`sourceDocId` 為什麼不設 FK**：來源橫跨 20 幾張單據表，設 FK 要嘛開 20 個欄位、要嘛做多型關聯。
NEXORA 已有 `Nx98DocLink`（單據關聯）在處理跨單據串接——**若要強關聯，走 DocLink，不在傳票上開 20 個欄位**。⚠ 見 §5 Q3。

### 3.2 `Nx05VoucherLine` 分錄行 ﹝`NX05`+`VCLN`﹞

| 欄位 | 型別 | 說明 |
|---|---|---|
| `voucherId` | FK → `Nx05Voucher` | onDelete Cascade |
| `lineNo` | Int | 行號 |
| `drCr` | VarChar(1) | `D` 借／`C` 貸 |
| `accountCodeId` | FK → `Nx05AccountCode` | 🔴 **必填且必須 `isPostable=true`**。樣板科目（`6xxx`）在過帳當下已解析成實際科目 |
| `amount` | Decimal(16,2) | 金額（恆為正數；方向由 `drCr` 表達）|
| **四個維度**（由 A 階段 182 條樣板的實測需求決定）| | |
| `departmentId` | FK? → `Nx01Department` | 成本中心（58 條樣板要求）|
| `partnerId` | FK? → `Nx01Partner` | 往來對象（49 條要求）|
| `employeeUserId` | FK? → `Nx01User` | 🔴 對象是員工時用（代墊報支；`partnerScope='EMPLOYEE'/'EITHER'`）|
| `bankAccountId` | FK? → `Nx05BankAccount` | 🔴 銀行帳戶（39 條要求）。**沒有它，`BK-TRF` 借貸同科目同金額會看起來像沒發生任何事** |
| `taxCodeId` | FK? → `Nx05TaxCode` | 稅別（供 401 申報彙總）|
| `summary` | VarChar(200)? | 行摘要 |
| `postingRuleLineId` | FK? → `Nx05PostingRuleLine` | 🔴 這一行是照哪一條樣板產生的——**可稽核性的關鍵**：查得到「為什麼記這個科目」 |
| `sourceDocItemId` | VarChar(15)? | 來源單身 ID（毛利分析要追到料號層時用）|

**約束**：`@@unique([voucherId, lineNo])`、`@@index([tenantId, accountCodeId])`、
`@@index([tenantId, departmentId])`、`@@index([tenantId, partnerId])`、`@@index([tenantId, bankAccountId])`

⚠ **`amount` 恆為正、方向走 `drCr`**：不用正負號表達借貸。理由——負數金額在報表加總時極易出錯，
且「借方 −100」與「貸方 100」在語意上不是同一件事（沖銷要看得出來是沖銷）。

### 3.3 `Nx05GlBalance` 科目餘額 ﹝`NX05`+`GLBL`﹞

| 欄位 | 型別 | 說明 |
|---|---|---|
| `fiscalPeriodId` | FK → `Nx05FiscalPeriod` | 期間 |
| `accountCodeId` | FK → `Nx05AccountCode` | 科目 |
| `departmentId` | FK? → `Nx01Department` | 🔴 **唯一進餘額表的維度**（見下）|
| `openingDebit` `openingCredit` | Decimal(16,2) | 期初 |
| `periodDebit` `periodCredit` | Decimal(16,2) | 本期發生 |
| `closingDebit` `closingCredit` | Decimal(16,2) | 期末 |

**約束**：`@@unique([tenantId, fiscalPeriodId, accountCodeId, departmentId])`

🔴 **為什麼只有部門進餘額表**：
- **部門必須進**——不然「店的貢獻式損益」算不出來（會計政策第 11 項：不分攤、看貢獻）。
- **往來對象不進**——應收應付明細**已經有子帳**（`Nx05ArLedger`／`Nx05ApLedger`）。再進餘額表就是第二份數字。
- **銀行帳戶不進**——帳戶餘額走 `Nx05BankAccount` 的對帳，且 13 週現金預測要的是「按帳戶的未來」不是「按帳戶的期末」。
- ⚠ 進得越多，行數是乘法成長（科目 113 × 期間 × 部門 × 對象 4058 …）。**這一條是效能與正確性的交會點**，見 §5 Q1。

---

## 4. 不建表、但要有的三支能力（service 層）

| 能力 | 做法 | 屬性 |
|---|---|---|
| **過帳**（`postByRule`）| 吃「交易代號 ＋ 來源單據 ＋ 金額基礎的實際值 ＋ 維度」→ 查 `Nx05PostingRule` → 產傳票與分錄 → 驗借貸平衡 → 更新 `Nx05GlBalance` | ⭐ **共用能力**，一支，各劇本叫用 |
| **紅字沖銷**（`reverse`）| 產一張方向相反、金額相同的新傳票，雙向指 | 同上 |
| **試算表／三大報表** | 從 `Nx05GlBalance` ＋ 科目的 `statement`／`statementSection`／`cashFlowType` 三欄 group by 出來 | 純查詢，不落表 |

⚠ **`postByRule` 要處理 A 階段留下的三種特殊形狀**（實測 182 條裡就有）：
17 條**樣板科目**（`6xxx`／`15x2` 要在過帳當下決定實際科目）、
18 條**條件性行**（該行不一定出現，如「若尚有尾款未付」）、
1 條**借貸二選一**（`FX` 兌換差額：賺走貸方、賠走借方）。

---

## 5. ✅ 五題已拍板（2026-08-01・執行長「照你建議」）

| # | 題目 | ✅ 定案（＝原建議） |
|---|---|---|
| **Q1** | 科目餘額表維度 | **只帶部門**。往來對象已有 AR/AP 子帳、銀行帳戶走對帳——多帶就是第二份數字，且行數乘法成長 |
| **Q2** | 試算表與財報 | **不建表**，由科目的 `statement`／`statementSection`／`cashFlowType` 三欄長出來 |
| **Q3** | 傳票指回來源單據 | `sourceDocType` ＋ `sourceDocId` **弱關聯**（不設 FK）；需強關聯走既有 `Nx98DocLink`。⛔ 不開 20 個 FK 欄位 |
| **Q4** | 過帳顆粒度 | **一張單一張傳票**（原則 1️⃣ 原子產生）。彙總是將來的效能題，不是現在的設計題 |
| **Q5** | 子帳 vs 總帳 | **子帳不動、加一支「驗證」**：定期比對子帳合計 vs 總帳控制科目餘額，差額不為 0 報警。⛔ **不自動調整**，差額必須有人看 |

### 🔧 B1 實作時對 §3.1 做的一處修正（比原設計更一致）

**原設計**：`reversalOfVoucherId` ＋ `reversedByVoucherId` **兩個欄位雙向指**。
**改為**：只留 `reversalOfVoucherId`（沖銷傳票指向原傳票）＋ 加 **`@@unique`**。

⚠ **為什麼改**：兩個欄位存同一個關係，就是「同一個數字存在兩個地方」——**正是本檔原則 1️⃣ 要避免的事**，
而且兩邊可能不同步。單一欄位 ＋ 反向關聯一樣查得到兩個方向，
`@@unique` 還順便保證**一張傳票只能被沖銷一次**（雙欄位版本做不到這個保證）。

---

## 6. 動工順序（拍板後）

| 步 | 內容 | 性質 |
|---|---|---|
| B1 | 3 張表 ＋ migration（additive） | schema |
| B2 | `postByRule` 共用能力 ＋ 借貸平衡驗證 ＋ 關帳期硬閘 | service |
| B3 | 紅字沖銷 | service |
| B4 | `Nx05GlBalance` 結轉（期初→本期→期末） ＋ 年度結帳 `CLS`（3202→3201）| service |
| B5 | 試算表 ＋ 三大報表查詢 | 查詢層 |
| B6 | 接第一個劇本過帳點試跑（建議從 **`SO-CA` 現金銷貨**起——分錄最短、不牽帳期）| 串接 |
| B7 | 子帳 vs 總帳驗證 | 稽核 |

⚠ **B6 之前不接任何既有單據**——先讓總帳自己站得住（能開傳票、能平、能結轉、能出試算表），
再接第一條劇本。⛔ 一開始就接 20 張單據會變成「兩件事同時debug」。

---

## 7. 本階段**不做**什麼

- ⛔ 不動任何營運表（原則 3️⃣）
- ⛔ 不做多幣別總帳（`FX` 兌換差額的分錄樣板有了，但外幣重評價屬後續）
- ⛔ 不做合併報表、不做部門間交易沖銷（單一法人、無此需求）
- ⛔ 不做預算與差異分析（那是報表模組的事）
- ⚠ 不處理「借款契約主檔」（`LN-*` 的到期日分流依賴它）——屬融資軌
