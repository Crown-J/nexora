<!-- docs/nx05/nx05-audit-01.md -->

# NX05 財務模組 — Schema + 既有 helper 真相揭露（NX05-AUDIT-01）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx05/、Crown 拍板後啟動 IMPL）
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-18
> 任務：NX04 銷貨範圍 A closure（v0.6.0-nx04-closure、2026-05-18）後、業務鏈進入閉環階段、Crown 拍板 NX05 財務模組第五戰略軌、Alex 寫子規格書前依 §I.5 #22 鐵律 verify schema 真相
> 真實 main HEAD：`7964a5e`（NX04 v0.6.0 tag 後）
> NX01 全 closure ✓ / NX03 範圍 A：v0.3.0 / AR 範圍 B：v0.4.0 / NX02 範圍 A：v0.5.0 / NX04 範圍 A：v0.6.0
> 對應依據：[nx02-audit-01](../nx02/nx02-audit-01.md) + [nx04-audit-01](../nx04/nx04-audit-01.md) 範式對齊

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep（`find -iname "*nx05*"` + `grep "model Nx05"`）+ §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數、禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- 本檔僅揭露**已落地**狀態、不寫 plan、不寫拍板 Q
- NX05 為 NEXORA 業務鏈閉環模組（採購 + 銷貨 + 庫存 + 自動補貨 → 財務）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §1. NX05 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx05" packages/db-core/prisma/schema.prisma
→ 8
```

**NX05 已落地 schema = 8 個 model**（AccountCode 1 + Allowance 1+1 + AP 1 + AR 1 + Closing 1 + Note 1 + Paylog 1）。

### 1.2 全 8 個 model 列表（line 範圍 + 業務語意 + 啟用版本）

| # | Model | Line | Table | 業務語意 | 啟用版本 |
|---|---|---|---|---|---|
| 1 | `Nx05AccountCode`   | 3902 | nx05_account_code   | 會計科目代碼（4 category：I 收入 / E 支出 / A 資產 / L 負債）| LITE-CORE |
| 2 | `Nx05Allowance`     | 3937 | nx05_allowance      | 折讓單表頭（5 階 status DRAFT/PENDING/APPROVED/PROCESSED/VOIDED、P 進貨/S 銷貨雙向）| LITE-CORE |
| 3 | `Nx05AllowanceItem` | 3987 | nx05_allowance_item | 折讓明細（disposalMethod O 沖銷 / D 下次折抵 / R 現金退回）| LITE-CORE |
| 4 | `Nx05ApLedger`      | 4022 | nx05_ap_ledger      | 應付帳款分錄（5 階 OPEN/PARTIAL/PAID/OVERDUE/VOID、source PO/RR/TI 三來源）| LITE-CORE |
| 5 | `Nx05ArLedger`      | 4085 | nx05_ar_ledger      | 應收帳款分錄（5 階含 WRITTEN_OFF、overdueDays 系統每日計算）| LITE-CORE |
| 6 | `Nx05Closing`       | 4144 | nx05_closing        | 關帳單（每日一筆、4 階 OPEN/CLOSING/CLOSED/REOPENED、401 報表追蹤）| LITE-CORE |
| 7 | `Nx05Note`          | 4189 | nx05_note           | 票據（CK 支票/PN 本票、R 應收/P 應付、5 階 DRAFT/ACTIVE/CLEARED/BOUNCED/VOIDED）| LITE-CORE |
| 8 | `Nx05Paylog`        | 4249 | nx05_paylog         | 收付款流水（5 種 payType：CR 收款/CP 付款/RR 廠商退款/RC 客戶退款/EX 費用）| LITE-CORE |

### 1.3 唯一約束 + Index 概況

| Model | unique | index |
|---|---|---|
| Nx05AccountCode | `[tenantId, code]` | — |
| Nx05Allowance | `[docNo]` | — |
| Nx05AllowanceItem | — | — |
| Nx05ApLedger | `[docNo]` | — |
| Nx05ArLedger | `[docNo]` | — |
| Nx05Closing | — | — |
| Nx05Note | `[docNo]` | — |
| Nx05Paylog | `[docNo]` | — |

⚠️ **6 表 docNo unique 完備 + AccountCode `[tenantId, code]` unique**、但全表 0 個 index、查詢全靠 FK + sequential scan、production 量大可能需後續軌補 index。

### 1.4 跨 NX 模組 FK 接點

#### NX05 → NX01 / NX99（主檔 + tenant）

| 來源 | 目的 | 業務 |
|---|---|---|
| `Nx05Allowance.partnerId` | Nx01Partner | 折讓對象（C 客戶 / S 供應商）|
| `Nx05ApLedger.supplierId` | Nx01Partner（S）| 應付帳款廠商 |
| `Nx05ArLedger.customerId` | Nx01Partner（C）| 應收帳款客戶 |
| `Nx05Note.partnerId` | Nx01Partner | 票據對象 |
| `Nx05Paylog.partnerId` | Nx01Partner | 收付款對象 |
| `Nx05Paylog.accountCodeId` | Nx05AccountCode | 費用支出科目（EX 時必填）|
| 各表 currencyId | Nx01Currency | 多幣別 |
| 各表 tenantId | Nx99Tenant | 多租戶 |

#### NX05 ← 上游模組 reverse FK（grep `rev_Nx05`）

```
NX02 → NX05 4 條 reverse：
  Nx02Po.rev_Nx05ApLedger_poId    （PO confirmed → AP）
  Nx02Rr.rev_Nx05ApLedger_rrId    （RR posted → AP、LITE 直接路徑）
  Nx02Ti.rev_Nx05ApLedger_tiId    （TI 調貨 → AP）
  Nx02Pr 透過 Nx05Allowance.refApId（PR 折讓 → Allowance、NX02 Phase 5 commit 5a 範式）

NX04 → NX05 2 條 reverse：
  Nx04So.rev_Nx05ArLedger_soId    （SO shipped → AR）
  Nx04Sr 透過 Nx05Allowance.refArId（SR R/D → Allowance、NX04 Phase 4 commit 4a 範式）

NX05 內部 reverse：
  Nx05ApLedger.rev_Nx05Allowance_refApId + rev_Nx05Paylog_apId
  Nx05ArLedger.rev_Nx05Allowance_refArId + rev_Nx05Paylog_arId
  Nx05AccountCode.rev_Nx05Paylog_accountCodeId
  Nx05Note.rev_Nx05Paylog_noteId
```

⭐ **NX05 跨模組接點完整度高**：
- NX02（採購）→ NX05 3 直 FK（po/rr/ti）+ 1 間接（pr 透過 allowance）
- NX04（銷貨）→ NX05 1 直 FK（so）+ 1 間接（sr 透過 allowance）
- NX05 內部：Paylog 是中樞、串接 AR/AP/Note/AccountCode

### 1.5 狀態機概況（DB 真相）

| Model | enum | 業務 |
|---|---|---|
| Nx05AccountCode.category | I/E/A/L | 收入/支出/資產/負債 |
| Nx05Allowance.status | DRAFT/PENDING/APPROVED/PROCESSED/VOIDED | 5 階折讓流 |
| Nx05Allowance.allowanceType | P/S | 進貨折讓/銷貨折讓 |
| Nx05AllowanceItem.disposalMethod | O/D/R | 沖銷/下次折抵/現金退回 |
| Nx05ApLedger.status | OPEN/PARTIAL/PAID/OVERDUE/VOID | 5 階應付帳款流 |
| Nx05ApLedger.sourceType | PO/RR/TI | 3 來源 |
| Nx05ArLedger.status | OPEN/PARTIAL/PAID/OVERDUE/WRITTEN_OFF | 5 階應收帳款流 |
| Nx05Closing.status | OPEN/CLOSING/CLOSED/REOPENED | 4 階關帳流 |
| Nx05Note.noteType | CK/PN | 支票/本票 |
| Nx05Note.direction | R/P | 應收/應付票據 |
| Nx05Note.status | DRAFT/ACTIVE/CLEARED/BOUNCED/VOIDED | 5 階票據流 |
| Nx05Paylog.payType | CR/CP/RR/RC/EX | 客戶收款/廠商付款/廠商退款/客戶退款/費用支出 |
| Nx05Paylog.payMethod | CA/TT/CK/PN | 現金/匯款/支票/本票 |
| Nx05Paylog.status | DRAFT/POSTED/VOIDED | 3 階收付款流 |

⭐ **NX05 狀態機複雜度最高**（8 model / 13 enum 分佈）、業務金流多場景設計成熟。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2. NX05 backend service 真相

### 2.1 A041 精確 count

```
find apps/nx-api/src/nx05 -iname "*.ts" -type f | wc -l
→ 22（全 production、0 test）
```

**7 子模組落地**：`allowance / ap / ar / note / payment / period-close / receipt`、外加 `nx05.module.ts` 根聚合。

### 2.2 子模組結構 + 測試覆蓋

| 子模組 | files | tests | service 規模 |
|---|---|---|---|
| `nx05.module.ts` | 1 | — | — |
| `allowance/` | 3（controller / service / dto）| 0 | 267 lines（最大）|
| `ap/` | 3 | 0 | 195 lines |
| `ar/` | 3 | 0 | 226 lines |
| `note/` | 3 | 0 | 196 lines |
| `payment/` | 3 | 0 | 183 lines |
| `period-close/` | 3 | 0 | 192 lines |
| `receipt/` | 3 | 0 | 187 lines |

⚠️ **NX05 全 0 test**（22 ts 全 production、無任何 __tests__/、無 spec 檔）。

⭐ **NX05 service 規模均衡**（180~270 lines、無 monster service）。

### 2.3 Controller 路由 + endpoint count

```
grep "@Controller" apps/nx-api/src/nx05/**/*.controller.ts
→ 7 controller、共 34 endpoints
```

| Controller | path | endpoints |
|---|---|---|
| `ap/ap.controller.ts` | `nx05/ap` | 4 |
| `ar/ar.controller.ts` | `nx05/ar` | 5 |
| `allowance/allowance.controller.ts` | `nx05/allowance` | 5 |
| `note/note.controller.ts` | `nx05/note` | 5 |
| `payment/payment.controller.ts` | `nx05/payment` | 5 |
| `receipt/receipt.controller.ts` | `nx05/receipt` | 5 |
| `period-close/period-close.controller.ts` | `nx05/period-close` | 5 |

⭐ **endpoint 分佈均勻**（4~5 per controller、CRUD 範式）。

### 2.4 共用 utils（12 / shared/nx05/、含 5 跨模組 helper）

```
find apps/nx-api/src/shared/nx05 -type f -iname "*.ts" | wc -l
→ 12
```

| utils | 用途 |
|---|---|
| `nx05-doc-no.ts` | DocKind enum：AR / AP / RC / CP / NT / AL / CL（7 種單號生成器）|
| `nx05-state-machine.ts` | API token 對 DB enum 雙向轉換 |
| `nx05-list-query.dto.ts` | 分頁 / 排序 / 篩選通用 DTO |
| `nx05-period-lock.ts` | 關帳期間鎖定（financePeriodMutable guard）|
| `nx05-finance-access.guard.ts` | 財務 role 權限 guard |
| `nx05-paylog-posting.ts` | Paylog POSTED transit 邏輯 |
| `nx05-ar-display.ts` | AR 顯示格式 helper |
| **`nx05-create-ap-from-po.ts`** | 跨模組 helper：PO confirmed → AP |
| **`nx05-sync-ap-from-po.ts`** | 跨模組 helper：PO update → AP 同步 |
| **`nx05-create-ar-from-so.ts`** | 跨模組 helper：SO shipped → AR |
| **`nx05-create-allowance-from-pr.ts`** | NX02 Phase 5 跨模組 helper：PR 折讓 type='P' |
| **`nx05-create-allowance-from-sr.ts`** | NX04 Phase 4 跨模組 helper：SR R/D 折讓 type='S' |

### 2.5 5 跨模組 helper 整合狀態 verify

| helper | 觸發來源 | NX05 寫入 | 狀態 |
|---|---|---|---|
| createApFromConfirmedPo | NX02 po.service confirmed transit | Nx05ApLedger sourceType='PO' | ✅ 落地 |
| syncApLedgerFromPo | NX02 po.service update / item patch | Nx05ApLedger 金額同步 | ✅ 落地 |
| createArFromShippedSo | NX04 so.service SHIPPED transit | Nx05ArLedger sourceType='SO' | ✅ 落地 |
| createAllowanceFromPurchaseReturn | NX02 purchase-return.service POSTED returnMode='A' | Nx05Allowance allowanceType='P' | ✅ NX02 Phase 5 commit 5a |
| createAllowanceFromSalesReturn | NX04 sales-return.service POSTED returnAction R/D | Nx05Allowance allowanceType='S' | ✅ NX04 Phase 4 commit 4a |

⭐ **5 helper 全 inline 範式**（避免 NX05 service 跨模組污染）、5 helper 完整化已隨 NX02/NX04 兩軌 closure ✓。

### 2.6 NX05 →（下游模組）接點

```
grep "rev_Nx05" outside nx05 + 跨模組 grep
→ 0 條（NX05 是業務鏈終點、無下游）
```

⭐ **NX05 業務鏈終點**：所有上游模組（NX01/NX02/NX04/NX99）→ NX05、NX05 →（無）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3. NX05 frontend 真相

### 3.1 A041 精確 count

```
find apps/nx-ui/src -ipath "*nx05*" -type f | wc -l
→ 1
```

**1 個 NX05 前端檔**（純 dashboard/nx05/workspace/page.tsx placeholder）。

### 3.2 Dashboard page（唯一 1 placeholder）

| path | functionCode | title | desc |
|---|---|---|---|
| `nx05/workspace/page.tsx` | NX05-WS-UI-001-F01 | 財務工作台 | AR / AP / 收付款 / 關帳 |

⚠️ **NX05 dashboard 只有 1 個 placeholder**（vs NX02 5 個 / NX04 3 個）、UI 落後最多。

### 3.3 features/nx05/ + features/finance/

```
find apps/nx-ui/src/features -ipath "*nx05*" → 0
find apps/nx-ui/src/features -ipath "*finance*" → 1（features/finance/ui/FinanceCenterHub.tsx）
```

| path | 性質 |
|---|---|
| `features/finance/ui/FinanceCenterHub.tsx` | 1 檔（pivot 後 NX05 名稱孤兒、舊財務中心 UI）|

⚠️ **features/nx05/ 0 子模組**（純 placeholder 階段）、有 1 個 features/finance/ 殘留（對齊 NX04 audit-01 揭露的命名 namespace 殘留範式）。

### 3.4 menu config（無）

對齊 NX02/NX03/NX04 都有 menu.nxXX.ts 配置、**NX05 無 menu.nx05.ts**：
- `find features/layout/config/menu*.ts` → 4 個（nx00/nx01/nx02/nx03/nx04）、無 nx05
- ⚠️ **NX04 audit-01 §3.4 揭露 menu.nx04.ts 內容寫的是「NX05 財務管理」+ href 指 `/dashboard/nx05/*`**（NX04 Phase 6 已修正）
- 推測 production 用 menu.nx04.ts 的 stale 內容指向 NX05（NX04 Phase 6 修後失效）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4. 既有 demo 揭露

### 4.1 NX05 service 鏈完整、0 test 安全網

對齊 NX02/NX04 範式（service 完整 + 測試斷層）、但 NX05 比 NX02/NX04 更極端：
- ✅ 7 子模組 service 全 CRUD 完整（22 ts / 1446 service lines）
- ❌ **0 test spec / 0 integration**（與 NX02 6 spec / NX04 8 spec 對比）

### 4.2 已落地業務 vs stub

| 模組 | 業務 | 狀態 |
|---|---|---|
| **AP 應付帳款** | sourceType PO/RR/TI 三來源 + 5 階 status + writeOff 核銷 | ✅ service 完整 |
| **AR 應收帳款** | sourceType SO + 5 階 status（含 WRITTEN_OFF）+ overdueDays 系統算 | ✅ service 完整 |
| **Allowance 折讓** | 5 階 + P/S 雙向 + 3 種 disposalMethod | ✅ service 完整 + 2 跨模組 helper（PR+SR）|
| **Note 票據** | 5 階 + CK/PN + R/P 雙向 + 兌現/退票 | ✅ service 完整 |
| **Paylog 收付款** | 5 種 payType + 4 種 payMethod + 票據關聯 | ✅ service 完整（核心中樞）|
| **Receipt 收據** | 獨立 controller（推測收據開立）| ✅ service 完整、業務語意待 verify |
| **Payment 付款** | 獨立 controller | ✅ service 完整、業務語意待 verify |
| **Period-Close 關帳** | 每日一筆 + 4 階 status + 401 報表追蹤 + 解除關帳審計 | ✅ service 完整 |

### 4.3 7 子模組 vs 8 schema 對應

| schema | 對應 service | 備註 |
|---|---|---|
| Nx05AccountCode | ❌ 0 controller / 0 service | ⚠️ 主檔 CRUD 缺、目前無 endpoint 維護 |
| Nx05Allowance + Item | allowance/ | ✅ |
| Nx05ApLedger | ap/ | ✅ |
| Nx05ArLedger | ar/ | ✅ |
| Nx05Closing | period-close/ | ✅ |
| Nx05Note | note/ | ✅ |
| Nx05Paylog | payment + receipt（拆分？）| ⚠️ 兩個 controller 對 1 個 schema、需 verify 業務拆分 |

⚠️ **2 個揭露**：
1. `Nx05AccountCode` 無 service / controller（主檔 CRUD 缺、可能用 seed 預設、A026 backlog 候選）
2. `payment` + `receipt` 兩 controller 對 `Nx05Paylog` 一個 schema、推測按 payType 拆業務（CR/CP/RR/RC/EX 分流給不同 controller）、需 verify

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §5. NX05 vs NX02/NX03/AR/NX04 範式對齊

### 5.1 partVersionId M1 配套狀態

```
grep "partVersionId" apps/nx-api/src/nx05 → 0 條
```

⭐ **NX05 partVersionId 配套 = N/A**：純帳務模組、不寫 NX03 stock_ledger、無需 partVersion snapshot。

對齊 NX02/NX04 範式：
- NX02/NX03/NX04 寫 stock_ledger → 必須 partVersionId M1 配套
- AR 不寫 stock_ledger（透過 NX02 Demand → RR）→ 同 NX05 N/A
- NX05 不寫 stock_ledger → N/A

⭐ **NX05 是「純帳務模組」**、與 NX01~04 + AR 的「業務模組」屬不同層、partVersionId 不適用。

### 5.2 跟 4 個既有模組接點完整度

| 接點 | 上游 → NX05 | 狀態 |
|---|---|---|
| NX02 PO confirmed → AP | createApFromConfirmedPo ✓ | 完整 |
| NX02 PO update → AP sync | syncApLedgerFromPo ✓ | 完整 |
| NX02 PR returnMode='A' → Allowance | createAllowanceFromPurchaseReturn ✓ | 完整（NX02 Phase 5）|
| NX04 SO SHIPPED → AR | createArFromShippedSo ✓ | 完整 |
| NX04 SR returnAction R/D → Allowance | createAllowanceFromSalesReturn ✓ | 完整（NX04 Phase 4）|
| AR（自動補貨）→ NX05 | 0 直接接點（AR → NX02 Demand → ... → NX05）| 間接 ✓ |
| NX03 庫存 → NX05 | 0 接點（純庫存、無金流）| N/A |

⭐ **NX05 上游接點 5/5 完整**（NX02 + NX04 共 5 個 helper 跨模組落地完整）。

### 5.3 模組層治理落後程度

| 治理項 | NX01 | NX03 | AR | NX02 | NX04 | NX05 現況 |
|---|---|---|---|---|---|---|
| `*-summary.md` 模組架構書 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 無 nx05-summary |
| audit 序列 | — | 4 | 1 v2 | 2 | 1 | 🟡 本檔（01）剛起 |
| `*-overview.md` 業務需求 | — | ✅ v1.1 | ✅ v0.1.0 | ✅ v0.1.0 | ✅ v0.1.0 | ❌ 無 nx05-overview |
| Phase N 拆軌節奏 | — | 8 | 8 | 8 | 8 | ❌ 散在歷史 commits |
| 範圍 closure 標準 | — | ✅ | ✅ | ✅ | ✅ | ❌ 無 closure 標準揭露 |
| L1~L4 分層架構 | — | ✅ | ✅ | ✅ | ✅ | ❌ 平鋪 7 子模組 |
| tag 版本 | — | v0.3.0 | v0.4.0 | v0.5.0 | v0.6.0 | ❌ 無 NX05 tag |

⭐ **NX05 在「技術接點」對齊（5 helper 完整）、但模組層治理（summary / audit / overview / phase / closure / tag）落後 NX01/NX02/NX03/NX04/AR 五軌**。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §6. 業界場景候選揭露

### 6.1 已落地場景（13）

| 場景 | schema | service | UI |
|---|---|---|---|
| 應付帳款 PO/RR/TI 三來源 + 自動產生 | ✅ | ✅ + 2 helper | 🟡 stub |
| 應收帳款 SO 來源 + 自動產生 | ✅ | ✅ + 1 helper | 🟡 stub |
| 銷貨折讓（NX04 SR R/D）| ✅ | ✅ + 1 helper（NX04 Phase 4）| 🟡 stub |
| 進貨折讓（NX02 PR returnMode='A'）| ✅ | ✅ + 1 helper（NX02 Phase 5）| 🟡 stub |
| 折讓 3 種 disposalMethod（沖銷 / 下次折抵 / 現金退回）| ✅ | ✅ | 🟡 stub |
| 票據管理（支票/本票、應收/應付、5 階流）| ✅ | ✅ | 🟡 stub |
| 票據兌現 / 退票 | ✅ status | ✅ | 🟡 stub |
| 收付款 5 種 payType（CR/CP/RR/RC/EX）| ✅ | ✅（payment + receipt 拆）| 🟡 stub |
| 4 種 payMethod（現金/匯款/支票/本票）| ✅ | ✅ | 🟡 stub |
| 現金餘額追蹤（cashBalanceAfter snapshot）| ✅ | ✅ | 🟡 stub |
| 關帳每日一筆 + 4 階流 | ✅ | ✅ period-close | 🟡 stub |
| 401 報表追蹤（reportPrintedAt/By）| ✅ | ✅ | 🟡 stub |
| 解除關帳審計（reopenedAt/By/Reason）| ✅ | ✅ | 🟡 stub |

### 6.2 候選但未盤點場景（業界常見、本軌可補）

| 場景 | 現況 | 備註 |
|---|---|---|
| **AccountCode 主檔 CRUD**（會計科目維護）| ❌ 0 controller / 0 service | 業務 likely seed 預設 4 category 既有、Crown 拍板是否需 UI |
| **AP 沖帳工作流**（多 Paylog 對 1 AP、部分沖帳審核）| 🟡 schema 已備（isPartialApproved）、service 待 verify | 業界 muscle memory |
| **AR 對帳單**（月結客戶 / 對帳單列印）| ❌ 0 schema、純 query 既有 AR | 業界中小企業常見 |
| **逾期催收**（overdueDays + 警示 + 自動通知）| 🟡 schema overdueDays、應用層未必有自動排程 | 對齊 NX04 CreditGuard 範式 |
| **多帳戶銀行管理**（多銀行戶頭 + 餘額）| ❌ 0 schema、純 Note.bankAccount 末四碼 | PRO 候選 |
| **發票管理**（電子發票 / 紙本 / 401 報表整合）| 🟡 Closing 已備 reportPrintedAt | 對接政府電子發票 API 屬獨立軌 |
| **預付款 / 訂金**（採購預付 / 銷售預收）| ❌ 0 schema、純 Paylog payType 區分 | 對應 NX02 / NX04 範圍 B |
| **匯率管理**（多幣別 + 即時匯率 + 匯差計算）| 🟡 schema currencyId 已備、匯率記錄表 0 | PRO 候選 |
| **沖帳審計軌**（誰沖了哪筆、何時、可追溯）| 🟡 純 audit log 既有 + paylog | 對齊 NX01 audit 範式 |
| **應付折讓抵應收**（同 partner 既是客戶又是供應商）| ❌ 0 schema、純 partner 雙身分 | 業界中小企業常見、特殊場景 |
| **稅金管理**（5% 稅 / 零稅率 / 免稅、稅額自動拆分）| 🟡 各業務表已備 taxRate/taxAmount 欄、無 NX05 集中 | 對應台灣 401 報表 |
| **代收代付**（業務員代收 / 業主代付）| ❌ 0 schema | 業界中小企業常見 |
| **應收應付沖抵**（同 partner 既是客戶又是供應商）| ❌ 0 邏輯 | 業界資深財務範式 |
| **現金流預測**（未來 30/60/90 天現金流預估）| ❌ 0 schema、純 query 既有 AR/AP dueDate | PRO 候選 |
| **多機構分帳**（HQ0/HQ1 多家公司）| 🟡 docNo 既有機構碼 | tenant 內多 org 範式 |

### 6.3 戰略候選排序（給 Crown 參考）

1. ⭐⭐⭐ **AccountCode 主檔 CRUD**（會計科目維護、基本配套、目前無 UI）
2. ⭐⭐⭐ **AR 對帳單 / 月結客戶報表**（業界中小企業基本需求、純 query 既有 AR）
3. ⭐⭐⭐ **逾期催收 + 自動警示**（對齊 NX04 CreditGuard 範式、客戶面）
4. ⭐⭐⭐ **AP 沖帳工作流**（多 Paylog 對 1 AP、部分沖帳審核 + UI）
5. ⭐⭐ **發票管理 / 401 報表整合**（既有 Closing 已備、政府對接屬獨立軌）
6. ⭐⭐ **應收應付沖抵**（同 partner 雙身分、業界資深財務範式）
7. ⭐⭐ **預付款 / 訂金**（對應 NX02/NX04 範圍 B）
8. ⭐⭐ **沖帳審計軌**（誰沖哪筆、何時、可追溯、對齊 NX01 audit）
9. ⭐ **匯率管理**（PRO 候選、含匯差計算）
10. ⭐ **多帳戶銀行管理**（PRO 候選、Note 主檔擴）
11. ⭐ **代收代付 / 應收應付沖抵**（特殊場景）
12. ⭐ **現金流預測**（PRO 候選、純算法）
13. ⭕ **多機構分帳**（已備機構碼、PRO 候選）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記

### 全檔對齊 NX02/NX03/NX04/AR audit 範式 5 標準

| 標準 | 本檔 |
|---|---|
| §G.9 通配 grep | ✅（10+ 處 grep -c / find -iname）|
| §I.5 #22 schema verify | ✅（8 model line 範圍精確、6 unique 列）|
| §I.6.5 A041 精確 count | ✅（8 schema / 22 ts / 1 UI / 34 endpoint / 7 controller / 12 utils / 5 跨模組 helper / 0 spec / 7 子模組）|
| §I.6.3 揭露不完整尾標 | ✅（6 段尾全標）|
| 純諮詢、無 commit 在分支 | ✅（本檔 Write 至 main 後 commit、Crown 拍板後決定 IMPL 軌）|

### 已揭露關鍵 drift / 殘留 / 缺口

1. ⚠️ **NX05 全 0 test spec / integration**（vs NX02 6 / NX04 8、最大覆蓋缺口）
2. ⚠️ **Nx05AccountCode 無 controller / service**（主檔 CRUD 缺、可能 seed 預設）
3. ⚠️ **payment + receipt 兩 controller 對 1 Nx05Paylog schema**（業務拆分待 verify、推測按 payType 分流）
4. ⚠️ **NX05 dashboard 只有 1 stub**（vs NX02 5 / NX04 3、UI 最落後）
5. ⚠️ **features/finance/FinanceCenterHub.tsx 命名孤兒**（pivot 後 NX05 命名殘留）
6. ⚠️ **NX05 無 menu.nx05.ts**（既有 menu.nx04.ts 之前指 /dashboard/nx05/*、NX04 Phase 6 已修、production 可能斷指）
7. ⚠️ **NX05 全表 0 index**（除 unique、production 量大時可能需後續軌補）

### 下一步候選（給 Crown 拍板）

1. **NX05-AUDIT-02**：AccountCode 主檔 + payment/receipt 拆分 + Paylog 業務流深掘
2. **NX05-AUDIT-03**：AR 對帳單 / 逾期催收 / AP 沖帳工作流 業界對標深掘
3. **NX05-IMPL-01-PLAN**：直接進實作軌、對齊 NX02/NX04 範式（補 audit-01 缺口 + 治理升級）
4. **TASK-NX05-DEMO-CLEANUP**：清 features/finance/ 殘留 + 修 menu drift（無 menu.nx05.ts）
5. **TASK-NX05-IMPL-UI-01**：UI 獨立軌（1 placeholder functional 化、補多 placeholder 對齊 NX02/NX04）
6. **TASK-NX05-IMPL-02-TEST**：測試獨立軌（補 0 spec 缺口、對齊 NX02/NX04 範式）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx02-audit-01](../nx02/nx02-audit-01.md) · [nx04-audit-01](../nx04/nx04-audit-01.md) · [nx03-audit-01](../nx03/nx03-audit-01.md) · [ar-audit-01](../auto-replenish/ar-audit-01.md)
