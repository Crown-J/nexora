<!-- docs/nx05/nx05-summary.md -->

# NX05 財務管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-18
> 撰寫：Hank（整合 TASK-NX05-IMPL-01 12 commit + AUDIT-01 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx05/spec/intent/nx05-overview.md` v0.1.0
> 戰略定位：NEXORA 業務閉環模組（採購 + 庫存 + 銷貨 + 自動補貨 + **財務**）
> Q-RHYTHM-2 首次落地：Crown + Alex 預批、Hank 全軌連跑

---

# § 1. NX05 模組業務角色

## 1.1 模組定位

NX05 = **NEXORA 業務閉環最後一環**、財務部門工作台、跨模組接收 5+2 helper 完整化。

```
上游：
  NX02 採購 PO/RR/TI → AP 應付帳款（5 helper：createAp×3 + sync + createAllowanceFromPr）
  NX04 銷貨 SO/SR → AR 應收帳款（2 helper：createArFromShippedSo + createAllowanceFromSr）
        ↓
NX05 財務完整鏈：
   AccountCode 科目 → AP/AR 帳款 → Paylog 收付款 → Allowance 沖帳 → Closing 關帳 → Note 票據
        ↓ 衍生服務
        AR 月底自動對帳單（業界月結客戶）
        逾期催收警示（共享 NX04 tenant 閾值）
        ↓
業務閉環完成（採購 + 庫存 + 銷貨 + 自動補貨 + 財務）
```

**戰略意義**：
- ⭐⭐⭐ 業界改革候選：業界標準科目表 seed + 用戶可改可加（不從 0 key 204 科目）
- ⭐⭐⭐ 業界改革候選：AR 月底自動產對帳單（月結客戶必備）
- ⭐⭐⭐ 業界改革候選：逾期催收自動警示（共享 NX04 CreditGuard tenant 閾值、業務一致性）
- ⭐⭐ 業務閉環完整化（7 跨模組 helper 全乾淨）

## 1.2 9 業務功能（範圍 A、對齊 overview §12.1）

1. AccountCode 會計科目主檔（seed + CRUD）
2. AP 應付帳款（5 階流、3 來源 PO/RR/TI）
3. AR 應收帳款（5 階流含 WRITTEN_OFF、overdueDays 計算）
4. Allowance 折讓單（雙向、3 處置）
5. Closing 關帳單（每日、4 階）
6. Note 票據（記錄 + 沖帳）
7. Paylog 收付款（5 種 payType）
8. AR 月底自動對帳單
9. 逾期催收自動警示（共享 tenant 設定）

---

# § 2. Schema 真相

## 2.1 1 migration（A041 精確）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260518200000_nx05_impl_01_m1_account_code_seed` | AccountCode 業界標準科目 INSERT（約 95 科目、亞羅汽配業改編恆迎參考）|

DB：61 migrations applied、Database schema is up to date ✓

## 2.2 既有 8 model 完整（A041、audit-01）

| # | Model | Line | Table | 業務語意 |
|---|---|---|---|---|
| 1 | `Nx05AccountCode`   | 3902 | nx05_account_code   | 會計科目（4 category I/E/A/L）|
| 2 | `Nx05Allowance`     | 3937 | nx05_allowance      | 折讓單（5 階、P/S 雙向）|
| 3 | `Nx05AllowanceItem` | 3987 | nx05_allowance_item | 折讓明細（disposalMethod O/D/R）|
| 4 | `Nx05ApLedger`      | 4022 | nx05_ap_ledger      | 應付帳款（5 階、PO/RR/TI 三來源）|
| 5 | `Nx05ArLedger`      | 4085 | nx05_ar_ledger      | 應收帳款（5 階含 WRITTEN_OFF）|
| 6 | `Nx05Closing`       | 4144 | nx05_closing        | 關帳單（每日、4 階、401 報表追蹤）|
| 7 | `Nx05Note`          | 4189 | nx05_note           | 票據（CK/PN、R/P、5 階）|
| 8 | `Nx05Paylog`        | 4249 | nx05_paylog         | 收付款流水（5 種 payType）|

⭐ **NX05 schema 衝擊最小**（既有 8 model 設計成熟、僅需 seed 補主檔資料）。

---

# § 3. Service 真相

## 3.1 既有 7 子模組 service 完整（22 ts）

對齊 audit-01 §2.2：allowance / ap / ar / note / payment / period-close / receipt

## 3.2 新增 service 3（Phase 2~3）

| service | 角色 | 主 method |
|---|---|---|
| `AccountCodeService` | 會計科目 CRUD（主檔缺口補完）| list / getById / create / update / softDelete |
| `ArStatementService` | AR 月底對帳單（業界月結客戶必備）| getStatement（text + payload 雙格式）|
| `OverdueWatcherService` | 逾期催收警示（共享 NX04 tenant 閾值）| list（按 customer 分組統計）|

## 3.3 跨模組 inline helper 完整化（7 helper、本軌新增 2 + 補強 2）

```
shared/nx05/
├── nx05-create-ap-from-po.ts             ✅ 既有（PO confirmed → AP）
├── nx05-sync-ap-from-po.ts               ✅ 既有（PO update → AP 同步）
├── nx05-create-ar-from-so.ts             ✅ 既有（SO shipped → AR）
├── nx05-create-allowance-from-pr.ts      ✅ NX02 Phase 5 + 本軌 Phase 4 補 FinancePeriod
├── nx05-create-allowance-from-sr.ts      ✅ NX04 Phase 4 + 本軌 Phase 4 補 FinancePeriod
├── nx05-create-ap-from-rr.ts             ⭐ 本軌 Phase 4 新增（LITE 直接路徑）
└── nx05-create-ap-from-ti.ts             ⭐ 本軌 Phase 4 新增（同行調貨 → AP）
```

## 3.4 endpoints（A041 = 3 新 + 既有 34 = 37 total）

| Method | Path | 功能 |
|---|---|---|
| GET/POST/PATCH/DELETE | `/nx05/account-code` (5 endpoints) | AccountCode CRUD |
| GET | `/nx05/ar-statement/:customerId?year=&month=` | AR 月底對帳單（text + payload）|
| GET | `/nx05/overdue-watcher/list?customerId=` | 逾期催收警示 |

既有 7 controllers (34 endpoints) + 3 new controllers (7 endpoints) = 10 controllers / 41 endpoints total。

## 3.5 9 業務功能 + endpoint 對照

| 業務功能 | service | endpoint |
|---|---|---|
| AccountCode 主檔 | AccountCodeService（新）| GET/POST/PATCH/DELETE /nx05/account-code |
| AP 應付帳款 | ApService（既有）| /nx05/ap |
| AR 應收帳款 | ArService（既有）| /nx05/ar |
| Allowance 折讓單 | AllowanceService（既有）+ 2 helper 補 FinancePeriod | /nx05/allowance |
| Closing 關帳單 | PeriodCloseService（既有）| /nx05/period-close |
| Note 票據 | NoteService（既有）| /nx05/note |
| Paylog 收付款 | PaymentService + ReceiptService（既有）| /nx05/payment + /nx05/receipt |
| AR 月底對帳單 | ArStatementService（新）| GET /nx05/ar-statement/:customerId |
| 逾期催收警示 | OverdueWatcherService（新）| GET /nx05/overdue-watcher/list |

---

# § 4. 拓樸 4 層（plan §2 對齊 NX02/NX03/AR/NX04 範式）

```
L1 基礎層（schema seed + 主檔）：
  M1 AccountCode seed（~95 科目、改編恆迎）
  AccountCodeService CRUD（補主檔缺口）

L2 新建戰略 service 層：
  ArStatementService（月底對帳單、text + payload 仿 NX02 rfq.exportRfq）
  OverdueWatcherService（逾期催收、共享 NX04 tenant 閾值）

L3 既有 service 0 大改（本軌純文件揭露 note + period-close 升級點留後續軌）

L4 跨模組 helper 補完 + verify：
  2 新 helper：createApFromPostedRr + createApFromPostedTi
  2 既有補：createAllowanceFromPr/Sr 加 assertFinancePeriodMutable
  跨模組接點 verify 報告（docs/nx05/spec/impl/nx05-impl-01-phase5-verify.md... 留 merge verify）

UI 層（Phase 5）：
  workspace 升 desc + 4 新 placeholder（ap/ar/allowance/closing）
  menu.nx05.ts 建立（audit-01 §3.4 缺口補完）
```

---

# § 5. 跨模組接點

## 5.1 上游接點（7 helper 完整化）

| 上游 | 觸發 | NX05 寫入 | helper |
|---|---|---|---|
| NX02 PO CONFIRMED | AP create | sourceType=PO | createApFromConfirmedPo ✓ |
| NX02 PO update / item patch | AP sync 金額 | sourceType=PO | syncApLedgerFromPo ✓ |
| NX02 RR POSTED（LITE 直接、無 PO）| AP create | sourceType=RR | ⭐ createApFromPostedRr（本軌新）|
| NX02 TI 同行調貨過帳 | AP create | sourceType=TI | ⭐ createApFromPostedTi（本軌新）|
| NX02 PR returnMode='A' POSTED | Allowance create | type='P' | createAllowanceFromPurchaseReturn ✓（本軌補 FinancePeriod）|
| NX04 SO SHIPPED | AR create | sourceType=SO | createArFromShippedSo ✓ |
| NX04 SR R/D POSTED | Allowance create | type='S' | createAllowanceFromSalesReturn ✓（本軌補 FinancePeriod）|

⭐ 7 helper 完整化（NX02 4 + NX04 2 + 既有 1 NX05 內），業務閉環收口。

## 5.2 共享 tenant 設定（NX04 ↔ NX05）

| 設定 | 持有者 | NX04 使用 | NX05 使用 |
|---|---|---|---|
| Nx99Tenant.creditOverdueDaysThreshold | NX04 IMPL-01 M2 建 | CreditGuardService 4 機制 | OverdueWatcherService 警示 |

⭐ **業務一致性**：客戶逾期判定使用同 tenant 閾值（NX04 SO 建單擋 + NX05 催收警示）、避免兩處設定不一致導致業務混亂。

## 5.3 NX05 內部接點

- AP/AR ↔ Paylog（沖帳）
- AP/AR ↔ Allowance（折讓沖抵）
- AP/AR ↔ Note（票據沖帳、後續軌）
- Paylog ↔ AccountCode（EX 費用必填科目）
- 全表 ↔ Closing（已關帳期間 application 校驗）

## 5.4 不屬於 NX05 範圍

- 發票管理 / 401 報表政府對接：獨立技術軌
- 銀行對帳自動化：第三方 API 整合
- 預付款 / 訂金：對應 NX02/NX04 範圍 B

---

# § 6. NEXORA 戰略特色

## 6.1 業界標準科目表 seed ⭐⭐⭐（已落地）

- **業界改革**：不從 0 key 204 科目、改編恆迎為亞羅汽配業專用範本（95 科目精選）
- M1 INSERT INTO nx05_account_code（CROSS JOIN tenant + VALUES、ON CONFLICT DO NOTHING）
- 8 大分類：1xxx 資產 / 2xxx 負債 / 3xxx 業主權益 / 4xxx 營業收入 / 5xxx 營業成本 / 6xxx 營業費用 / 7xxx 營業外 / 8xxx 所得稅
- 汽配業特色：庫存零件 / 在途進口商品 / 車輛保險 / 油料費 / 過路費
- 用戶可改 name + remark + isActive、不可改 code/category、軟刪除

## 6.2 AR 月底自動對帳單 ⭐⭐⭐（已落地）

- **業界改革**：月結客戶必備、業務員不用手動產
- ArStatementService.getStatement（period 範圍、3 段彙整：本月新增 / 本月收款 / 期末未收）
- text + payload 兩格式（仿 NX02 rfq.exportRfq、業務員可 copy 寄客戶）
- cron 設計留 backlog（每月 1 號自動跑、外部 cron 觸發 endpoint）

## 6.3 逾期催收警示 ⭐⭐⭐（已落地）

- **業界改革**：共享 NX04 CreditGuard tenant 閾值（業務一致性）
- OverdueWatcherService.list（按 customer 分組統計）
- response 含 threshold + summary + customerSummary + arItems
- 排序：overdueDays desc + balanceAmount desc

## 6.4 業務閉環完整化 ⭐⭐（已落地）

- 7 跨模組 helper 全乾淨（NX02 4 + NX04 2 + NX05 內 1）
- 採購 + 庫存 + 銷貨 + 自動補貨 + 財務 五軌 closure
- 5 個 v0.X.0 tag 累計（v0.3 NX03 / v0.4 AR / v0.5 NX02 / v0.6 NX04 / v0.7 NX05）

---

# § 7. 範圍 A closure 標準對齊（overview §12.2）

| 標準 | 狀態 |
|---|---|
| 9 業務功能 schema + service + endpoint 全落地 | ✅ |
| 5 跨模組 helper 補完 NX02 RR/TI AP 接點 | ✅ 補 2 新 helper |
| AccountCode seed 業界標準範本（~95 科目）| ✅ M1 |
| AR 對帳單自動產（每月 1 號 cron）| 🟡 endpoint ✅、cron decorator 留 backlog（對齊 AR 範式）|
| 逾期催收警示共享 NX04 tenant 閾值 | ✅ |
| Closing 跟既有 NX02/NX04 Allowance bridge FinancePeriod 校驗整合 | ✅ 補強 2 Allowance helper |

⭐ **6/6 closure 標準滿足**（cron decorator 留 backlog、對齊 AR @nestjs/schedule 範式）。

---

# § 8. backlog（A026 子項、對齊 overview §13 + plan §5.3 + audit-01 §後記）

| # | 項目 | 推薦處置 |
|---|---|---|
| 1 | 401 報表政府對接 | **範圍 B 戰略軌**（封測後啟動）|
| 2 | 應收應付沖抵（同 partner 雙身分）| 範圍 B 戰略軌 |
| 3 | 預付款 / 訂金管理 | 範圍 B（對應 NX02/NX04 範圍 B）|
| 4 | 銀行對帳自動化 | 第三方 API 軌 |
| 5 | note.service CLEARED 觸發 Paylog | 後續軌 TASK-NX05-NOTE-PAYLOG（業務複雜、涉及既有 service 大改）|
| 6 | cron decorator 註冊（AR 對帳單每月 1 號）| 對齊 AR M1 範式、外部 cron / @nestjs/schedule |
| 7 | AccountCode application 層 seed-on-tenant-create | 後續軌（NEXORA tenant 開戶流配套）|
| 8 | 全表 0 index（除 unique）補強 | 量大後啟動 |
| 9 | 7 子模組全 0 test spec | TASK-NX05-IMPL-02-TEST 獨立軌 |
| 10 | features/finance/FinanceCenterHub.tsx 命名孤兒清理 | TASK-NX05-DEMO-CLEANUP |
| 11 | TASK-NX05-IMPL-UI-01 UI 獨立軌（5 placeholder functional 化）| Crown Q-U1=c 拍板 |
| 12 | 多帳戶銀行管理（PRO 候選）| Note 主檔擴 |
| 13 | 匯率管理（PRO 候選、含匯差）| schema currencyId 已備 |
| 14 | 現金流預測（PRO 候選）| 純算法 |

---

# § 9. 開工進度時間軸（12 commit、Q-RHYTHM-2 首次連跑）

| 階段 | commit 範圍 | 主軸 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（Q-RHYTHM-2 啟用）|
| Phase 1 | 1 | M1 AccountCode seed（~95 科目）|
| Phase 2 | 1 | L1 AccountCodeService CRUD（補主檔缺口）|
| Phase 3a | 1 | L2 ArStatementService（月底對帳單）|
| Phase 3b | 1 | L2 OverdueWatcherService（逾期催收）|
| Phase 4 | 1 | L4 2 新 helper（RR + TI → AP）+ 2 既有 Allowance helper FinancePeriod 補強 |
| Phase 5 | 1 | UI workspace 升 + 4 新 placeholder + menu.nx05.ts |
| Phase 6 | 3~4 | summary + worklog 主題 + merge verify report |

**總計：12~13 commit / 1 migration / 1~2 工作日**（Q-RHYTHM-2 連跑、比 NX02 17 / NX04 14 都少、schema 衝擊最小）

---

> 完整業務需求：`docs/nx05/spec/intent/nx05-overview.md` v0.1.0
> Phase 0 plan：`docs/nx05/spec/impl/nx05-impl-01-plan.md` v0.1.0
> NX05-AUDIT-01：`docs/nx05/nx05-audit-01.md`
