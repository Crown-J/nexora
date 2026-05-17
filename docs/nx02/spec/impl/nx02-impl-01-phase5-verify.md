<!-- docs/nx02/spec/impl/nx02-impl-01-phase5-verify.md -->

# TASK-NX02-IMPL-01 Phase 5 — 跨模組接點 verify 報告（L4）

> 性質：純 verify、commit 1（commit 內含本文件）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Crown Phase 5=A 開工 + Q-5a-1=a inline helper + Q-5b-1=a 加 SALES
> 真實 main HEAD：`52af3e9`（NX02-AUDIT-02 後、Phase 0~5 未 merge）
> 分支：`feature/nx02-purchase`（ahead 14 commit）
> 對應依據：[nx02-overview](../intent/nx02-overview.md) + [nx02-impl-01-plan](./nx02-impl-01-plan.md)

---

## §1 採購 SOP 跨模組鏈完整 verify

### 1.1 完整業務鏈（NX02 是 P 鏈起點 + AR/SO 下游消費者）

```
上游觸發：
  AR 自動補貨 (demandType=S) ── 寫 Nx02Demand status='O' 待處理
  NX04 SO 客訂 (demandType=O) ── 寫 Nx02Demand
                ↓
NX02 採購 8 步 SOP：
  1. 採購建議單列表（PurchaseSuggestionService）✅ Phase 4 commit 4a
  2. 多家詢價 RFQ（rfq.service / RFQ 文字匯出）✅ Phase 3 commit 3c
  3. 比價分析 3 維度（PriceComparisonService）✅ Phase 4 commit 4b
  4. 採購單 + 主管審核（po.service 升 approvedAt/By）✅ Phase 3 commit 3a
  5. 寄 email 確認（純 manual、Q18 廠商不登入）
  6. 廠商確認 → 國外 6 階段流轉（PurchaseStageService）✅ Phase 4 commit 4c
  7. 進貨驗收（rr.service POSTED → applyQtyInWithLedger source=P/G）✅ NX03 Phase 4 已升
  8. 退貨 returnMode 分流（purchase-return.service）✅ Phase 3 commit 3b + Phase 5 commit 5a
                ↓
下游入帳：
  NX05 ApLedger（createApFromConfirmedPo + syncApLedgerFromPo）✅ 既有
  NX05 Allowance（createAllowanceFromPurchaseReturn）✅ Phase 5 commit 5a
  NX03 stock_balance + stock_ledger source=P/G/R ✅
```

⭐ **NX02 範圍 A 12 業務功能全 service 接通**（6 + 5 + UI 留 Phase 6 stub）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2 NX05 ApLedger / Allowance 接點 verify

### 2.1 既有 NX05 接點（Phase 5 前已落地）

| 觸發 | helper | NX05 寫入 |
|---|---|---|
| Po confirmed (DRAFT → CONFIRMED) | `createApFromConfirmedPo` | Nx05ApLedger sourceType='PO' status='OPEN' |
| Po update（金額變動）| `syncApLedgerFromPo` | Nx05ApLedger originalAmount/balanceAmount 同步 |
| Po item add/patch/remove | 同上 | 同上 |

### 2.2 新增 NX02 → NX05 接點（Phase 5 commit 5a 落地）

| 觸發 | helper | NX05 寫入 |
|---|---|---|
| PR returnMode='A' POSTED | `createAllowanceFromPurchaseReturn` | Nx05Allowance allowanceType='P' status='DRAFT' + N AllowanceItem disposalMethod='O' 沖銷 AP |

⭐ **NX02 → NX05 4 個接點全 helper 化**（inline 範式、無新 NX05 service、避免跨模組污染、Crown Q-5a-1=a）。

### 2.3 helper 範式對齊

```
apps/nx-api/src/shared/nx05/
├── nx05-create-ap-from-po.ts          ✅ 既有（PO confirmed）
├── nx05-sync-ap-from-po.ts            ✅ 既有（PO update）
├── nx05-create-ar-from-so.ts          ✅ 既有（SO 銷貨）
└── nx05-create-allowance-from-pr.ts   ⭐ Phase 5 commit 5a 新增（PR 折讓）
```

---

## §3 NX03 庫存接點 verify

### 3.1 NX02 → NX03 ledger 寫入鏈

| 觸發 | service | helper | sourceModule | sourceDocType |
|---|---|---|---|---|
| Rr POSTED (純採購) | `rr.service.applyRrPosting` | applyQtyInWithLedger | NX02 | **P** |
| Rr POSTED (同行調貨、tiId!=null) | 同上 | applyQtyInWithLedger | NX02 | **G** |
| Pr POSTED (returnMode=F/P) | `purchase-return.service.applyPrPosting` | applyQtyOutWithLedger | NX02 | **R** |
| Pr POSTED (returnMode=A 折讓) | 同上、A 分支 | **0 ledger 寫入**（貨保留原倉位）| — | — |

⭐ NX02 觸發 3 種 source 寫入（P / G / R）+ A 折讓不沖。

### 3.2 partVersionId M1 配套 verify

| service | partVersionId 帶入 | 範式 |
|---|---|---|
| rr.service.applyRrPosting | ✅ loadActivePartVersionId per item | NX03 Phase 4 commit 1 升級 |
| purchase-return.service.applyPrPosting | ✅ loadActivePartVersionId per item | NX03 Phase 5 commit 2 升級 |
| createAllowanceFromPurchaseReturn (A 路徑) | ❌ 不寫 ledger、無需 partVersionId | Phase 5 commit 5a |

⭐ **NX02 ledger 寫入路徑 partVersionId 全帶入** ✓（M1 配套完整）。

---

## §4 role_view 調整 verify（Crown Q-C4=A + Q-5b-1=a）

### 4.1 業務語意對齊

對齊 overview §2.1：
- **PURCHASING** = NX02 主操作（採購單 / 詢價 / 進貨 / 退貨 / 採購建議 / 比價 / 6 階段）
- **SALES** = 同行調貨業務歸屬（Qt / Ti、Crown Q2 揭露）
- **OWNER** = 跨角色 read + 主管審核（Po approve）
- **WAREHOUSE / FINANCE** = 跨模組消費者（驗收 / 付款）

### 4.2 5 controllers role 調整

| controller | 路徑 | 既有 @Roles | Phase 5 commit 5b 升級後 |
|---|---|---|---|
| `po.controller` | `nx02/po` | SYSADMIN/OWNER | 不動（PURCHASING 主操作）|
| `rfq.controller` | `nx02/rfq` | SYSADMIN/OWNER | 不動 |
| `rr.controller` | `nx02/rr` | SYSADMIN/OWNER | 不動 |
| `purchase-return.controller` | `nx02/purchase-return` | SYSADMIN/OWNER | 不動 |
| **`qt.controller`** | `nx02/{rfq,qt}` 混合 | SYSADMIN/OWNER/PURCHASING | **+SALES**（Q-C4=A、業務歸 NX04）|

新 controllers（Phase 2/4 落地）：
- `partner-part.controller` `nx02/partner-part` SYSADMIN/OWNER/PURCHASING ✓
- `purchase-suggestion.controller` `nx02/purchase-suggestion` SYSADMIN/OWNER/PURCHASING ✓
- `price-comparison.controller` `nx02/price-comparison` SYSADMIN/OWNER/PURCHASING ✓
- `purchase-stage.controller` `nx02/po/:id/stage` SYSADMIN/OWNER/PURCHASING ✓

### 4.3 SALES role 加註對齊

`qt.controller.ts` 4 個寫入 endpoint（addQt / adoptQt / rejectQt / cancelRfq）+SALES：
```
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
```

- **`list rfq/list-for-purchase`** 不變（無 @Roles 註解、任意登入 user）
- **未拆 QT service**（schema 仍在 nx02、Crown 拍板「業務歸 NX04、純權限調整」）
- **TI 沒獨立 controller**（透過 adoptQt 自動建、route 同 QT、role 隨 QT 升級）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §5 範圍 A closure 標準對齊（plan §1 12 業務功能）

| # | 業務功能 | schema | service | endpoint | UI |
|---|---|---|---|---|---|
| 1 | 採購需求單列表（按廠商過濾、客訂優先）| 既有 Nx02Demand ✓ | PurchaseSuggestionService ✅ | GET /nx02/purchase-suggestion ✅ | 🟡 Phase 6 stub |
| 2 | 多家詢價 RFQ（email 範式）| Nx02Rfq ✓ | rfq.service +exportRfq ✅ | GET /nx02/rfq/:id/export ✅ | 🟡 Phase 6 stub |
| 3 | 比價分析（歷史 + 新品/特價 + 量折）| 0 schema 動 | PriceComparisonService ✅ | GET /nx02/price-comparison/:partId ✅ | 🟡 Phase 6 stub |
| 4 | 採購單 + 主管審核 | 既有 Nx02Po.approvedAt/By ✓ | po.service +approvedAt 寫入 ✅ | PATCH /nx02/po/:id ✅ | 🟡 Phase 6 stub |
| 5 | 國內採購完整鏈（D 模式）| Po +paymentTermDomestic（M1）✅ | po.service +付款條件帶入 ✅ | POST /nx02/po ✅ | 🟡 Phase 6 stub |
| 6 | 國外採購 6 階段追蹤（I + RrImport）| Po +5 欄（M2）✅ | PurchaseStageService ✅ | PATCH /nx02/po/:id/stage ✅ | 🟡 Phase 6 stub |
| 7 | 掃貨採購（B 模式）| 既有 purchaseType ✓ | po.service +purchaseType dto ✅ | POST /nx02/po ✅ | 🟡 Phase 6 stub |
| 8 | 進貨驗收 | 既有 Nx02Rr ✓ | rr.service ✓（NX03 Phase 4 已升）| 既有 ✓ | — |
| 9 | 退貨範式（F/P/A 並存）| Pr +returnMode（M3）✅ | purchase-return.service 分流 ✅ + bridge ✅ | 既有 PATCH /nx02/purchase-return/:id ✅ | — |
| 10 | 付款條件（國內補齊）| Po +paymentTermDomestic ✅ | po.service +帶入 ✅ | 隨 PO 流 | — |
| 11 | partner ↔ part 混合範式 | Nx02PartnerPart 新表（M4）✅ | PartnerPartService CRUD ✅ + 推算 helper ✅ | 5 endpoints ✅ | 🟡 Phase 6 stub |
| 12 | NX05 應付帳款接點 | reverse FK 3 條 ✓ | createAp/syncAp/createAllowance ✅ | 隨 PO/PR 流 | — |

⭐ **12 / 12 範圍 A 業務功能 schema + service + endpoint 全落地**、UI Phase 6 stub（Crown Q-U1=c 對齊 AR Q-U1=A 範式、UI 獨立軌 backlog）。

---

## §6 範圍 A 不涵蓋 / backlog 揭露（plan §5.3 + overview §8.3）

對齊 nx02-overview §8.3 + §9 + §10：

1. **供應商評核（OTD / 良率 / 退貨率）**→ 範圍 B 戰略軌
2. **Nx08PurchaseCache 預計算優化**（Q-PP-4=b backlog、PriceComparisonService N+1 風險時啟動）
3. **採購 forecast / 預測單**（PRO 級候選、年度框架合約）
4. **採購預付款 / 訂金**（NX05 延伸）
5. **採購寄賣 / 跨倉採購批次**（PRO 級候選）
6. **stage_history 表**（國外 6 階段流轉歷史審計、本軌 audit log 已寫但無 dedicated table）
7. **TASK-NX02-IMPL-02-TEST 獨立軌**（單測 + 整測、對齊 NX03-IMPL-02-TEST 範式）
8. **TASK-NX02-DEMO-CLEANUP**（清 features/nx02/ 9 個 OLD 庫存殘留 + dashboard/nx02/ 13 個 OLD page）
9. **TASK-NX02-IMPL-UI-01**（採購工作台 5 placeholder functional 化、Crown Q-U1=c 拍板獨立軌）
10. **NX05Allowance 工作流**（status DRAFT → PENDING → APPROVED → PROCESSED 流轉、本軌僅建單）

---

## §7 後記（Phase 5 closure）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

下一步：commit 5b（本文件 + role_view 調整）→ Phase 6 UI 5 stub placeholder → Phase 7 收尾（summary + worklog + audit-01 §5.3 加註）。

---

> 對齊文件：[nx02-overview](../intent/nx02-overview.md) · [nx02-impl-01-plan](./nx02-impl-01-plan.md) · [nx03-impl-01-phase7-verify](../../../nx03/spec/impl/nx03-impl-01-phase7-verify.md) · [ar-impl-01-phase5-verify](../../../auto-replenish/spec/impl/ar-impl-01-phase5-verify.md)
