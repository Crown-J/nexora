<!-- docs/nx04/spec/impl/nx04-impl-01-phase5-verify.md -->

# TASK-NX04-IMPL-01 Phase 5 — 跨模組接點 verify 報告（L4）

> 性質：純 verify、commit 1（commit 內含本文件）
> 撰寫者：Hank
> 日期：2026-05-18
> 觸發：Alex 拍板 Phase 5=開工（Q-RHYTHM-1=d 紀律、service phase Alex 守門）
> 真實 main HEAD：`6e72258`（NX02 v0.5.0 後、NX04 Phase 0~5 未 merge）
> 分支：`feature/nx04-sales`（ahead 11 commit / 2 migration）
> 對應依據：[nx04-overview](../intent/nx04-overview.md) + [nx04-impl-01-plan](./nx04-impl-01-plan.md)

---

## §1 銷售 SOP 跨模組鏈完整 verify

### 1.1 完整業務鏈（NX04 為 NEXORA 業務鏈起點）

```
上游觸發：
  客戶詢價（電話 / line / 業務員開單）
                ↓
NX04 銷售 8 步 SOP：
  1. 庫存查詢（NX03 stock_balance read）
  2. 報價單（quote.service 共享列表）✅ Phase 3 commit 3b
  3. 銷貨單建立（so.service + 客戶預設據點 + 授信擋單）✅ Phase 3 commit 3a
  4. CONFIRMED transit（自動調撥 ST）✅ Phase 4 commit 4b
  5. PICKING（NX03 撿包 SOP、既有）
  6. SHIPPED（applyQtyOutWithLedger source=S）✅ 既有 + partVersionId M1
  7. INVOICED（NX05 AR + NX06 DN 觸發）✅ 既有
  8. 必要時：SR 銷退（returnAction R/D/X 分流）✅ Phase 3 commit 3c + Phase 4 commit 4a
                ↓
下游：
  NX03 stock_balance + ledger source=S/R ✅
  NX05 ArLedger（既有 createArFromShippedSo）+ Allowance（新 createAllowanceFromSr）
  NX06 DN 配送單（既有 createDeliveryDnFromShippedSo）
```

⭐ **NX04 範圍 A 9 業務功能全 service 接通**（5 既有升級 + 3 新建 service + 2 inline helper、UI 留 Phase 6 stub）。

⚠️ 揭露可能不完整、Alex / Crown 想補的直接說。

---

## §2 NX04 → NX03 接點 verify

### 2.1 NX04 → NX03 ledger 寫入鏈

| 觸發 | service | helper | sourceModule | sourceDocType |
|---|---|---|---|---|
| SO POSTED 出庫 | `so.service.applySoShipping` | applyQtyOutWithLedger | NX04 | **S** |
| SR POSTED 入庫（R/D 路徑）| `sales-return.service.applySrPosting` | applyQtyInWithLedger | NX04 | **R** |
| SR POSTED 入庫（X 換新路徑）| skip ledger（貨未實際回到我方倉）| — | — | — |

### 2.2 NX04 → NX03 自動調撥接點（Phase 4b 新增）

| 觸發 | helper | 寫入 |
|---|---|---|
| SO DRAFT → CONFIRMED transit | `autoCreateTransferFromSo` | Nx03St（stType='A' / triggerSource='S' / refSoId）+ Nx03StItem（sourceSoItemId D3 反追蹤）|

⭐ Crown Q-C1=C 兩階段第二段（CONFIRMED 強制）落地、最近倉算法 = warehouse.sortNo asc。

### 2.3 NX04 → NX03 撿包 SOP 接點

| schema reverse | 用途 |
|---|---|
| `Nx04SoItem → Nx03PkItem.refSoItemId` | 撿貨單反查 SO line（既有 schema ✓）|
| 業務流：SO CONFIRMED 後 → NX03 Pk 接管 → Pl → Parcel | 既有 NX03 流程 ✓ |

### 2.4 partVersionId M1 配套 verify

| service | partVersionId 帶入 | 範式 |
|---|---|---|
| so.service.applySoShipping | ✅ inline findFirst per item（line 181~185）| NX03-IMPL-01 Phase 5 commit 1 升級 |
| sales-return.service.applySrPosting | ✅ inline findFirst per item（line 208~212）| NX03-IMPL-01 Phase 4 commit 2 升級 |
| autoCreateTransferFromSo | ❌ 不寫 ledger（純建 ST 草稿、ST 過帳由 NX03 ST service 處理時帶入 partVersionId）| ST 後續流 |
| createAllowanceFromSr | ❌ 不寫 ledger（純 Allowance 帳務、無 partVersion 需求）| 帳務範式 |

⭐ **NX04 ledger 寫入路徑 partVersionId 全帶入** ✓（M1 配套完整）。

---

## §3 NX04 → NX02 接點 verify（同行調貨業務歸屬）

### 3.1 schema 接點（既有完整）

| 關係 | 業務 |
|---|---|
| `Nx04Quote.rfqId` → Nx02Rfq | D4 翻譯流：無庫存走同行調貨詢價 |
| `Nx04SoItem.tiId` → Nx02Ti | D3 反追蹤：SO line 對應同行調貨單 |
| `Nx02Rfq.sourceSoItemId` → Nx04SoItem | D4 reverse 反查 |
| `Nx02TiItem.sourceSoItemId` → Nx04SoItem | D3 reverse 必填 |

### 3.2 既有 translator 翻譯流（0 改）

`apps/nx-api/src/nx04/so/translator/`：
- `translator.service.ts` ✓（357 lines、D3+D4 翻譯流完整）
- `refreshment-doc-creator.ts` ✓（自動建 ST / Rfq stub / Co 客訂預約）
- `transfer-source-resolver.ts` ✓
- **8 test specs** ✓（D3+D4 demo 主軸）

### 3.3 role_view SALES 已開（NX02 Phase 5 commit 5b）

對齊 NX02-IMPL-01 已落地：
- `nx02/qt/qt.controller` 4 endpoint @Roles +SALES ✓
- NX04 SALES 業務員可直接呼叫 NX02 QT endpoint（同行調貨業務歸 NX04）
- 本軌 0 動 role_view（NX02 已配套）

⭐ **NX04 ↔ NX02 schema + role 雙向接通完整**（無需本軌新建）。

---

## §4 NX04 → NX05 接點 verify

### 4.1 既有 NX05 接點

| 觸發 | helper | NX05 寫入 |
|---|---|---|
| SO SHIPPED transit | `createArFromShippedSo` ✓ | Nx05ArLedger sourceType='SO' status='OPEN' |

### 4.2 新增 NX04 → NX05 接點（Phase 4 commit 4a 落地）

| 觸發 | helper | NX05 寫入 |
|---|---|---|
| SR POSTED returnAction='R' | `createAllowanceFromSalesReturn` | Nx05Allowance allowanceType='S' + AllowanceItem disposalMethod='R' 現金退回 |
| SR POSTED returnAction='D' | 同上 | 同上、disposalMethod='D' 下次折抵 |
| SR POSTED returnAction='X' | skip Allowance | — |

### 4.3 NX05 helper 完整化（5 helper）

```
apps/nx-api/src/shared/nx05/
├── nx05-create-ap-from-po.ts            ✅ 既有（NX02 PO confirmed → AP）
├── nx05-sync-ap-from-po.ts              ✅ 既有（NX02 PO update → AP 同步）
├── nx05-create-ar-from-so.ts            ✅ 既有（NX04 SO shipped → AR）
├── nx05-create-allowance-from-pr.ts     ✅ NX02 Phase 5（PR 折讓 type='P'）
└── nx05-create-allowance-from-sr.ts     ⭐ NX04 Phase 4a（SR R/D 折讓 type='S'）
```

⭐ **NX02 + NX04 → NX05 5 helper 完整化**（all inline、無 NX05 service 跨模組污染）。

### 4.4 CreditGuardService NX05 query 接點

對齊 Phase 2 commit 2a 落地：
- CreditGuardService 機制 2（額度超額）query `Nx05ArLedger` SUM balanceAmount
- CreditGuardService 機制 3（逾期）query `Nx05ArLedger` overdueDays > tenant.creditOverdueDaysThreshold
- 純讀取、無寫入

---

## §5 NX04 → NX06 接點 verify

### 5.1 既有 NX06 接點

| 觸發 | helper | NX06 寫入 |
|---|---|---|
| SO SHIPPED transit（deliveryType='D' 配送）| `createDeliveryDnFromShippedSo` ✓ | Nx06Dn 配送單 |
| SR 取件（returnMethod='C' 外務取貨）| reverse FK `rev_Nx06Dn_sourceSrId` | NX06 取件 DN（schema 已備、service 待 verify）|

### 5.2 schema reverse 接點（既有）

| 關係 | 用途 |
|---|---|
| `Nx06Dn.sourceSoId` → Nx04So | SHIPPED 觸發配送 |
| `Nx06Dn.sourceSrId` → Nx04Sr | 銷退取件 |

⭐ **NX04 → NX06 接點 schema 完整、本軌 0 動**（既有 createDeliveryDnFromShippedSo 路徑）。

---

## §6 10 種 source 完整鏈 verify

對齊 NX03-IMPL-01 Phase 7 verify 揭露的 10 種 source：

| source | 業務 | service writer | NX04 關聯 |
|---|---|---|---|
| P | 進貨 | nx02/rr.service.applyRrPosting | NX04 不觸發（純 NX02）|
| G | 同行調貨 | rr.service (tiId!=null) | ⭐ NX04 觸發鏈起點：SO 無庫存 → D4 翻譯 → Rfq → Po → Rr → G |
| **S** | 銷貨 | **nx04/so.service.applySoShipping** | ⭐ NX04 主寫入者 ✓ |
| **R** | 退貨 | nx02/purchase-return + **nx04/sales-return** | ⭐ NX04 SR R/D 路徑寫入 ✓ |
| T | 盤點 | nx03/stocktake.service | NX04 不觸發 |
| I | 開帳 | nx03/init.service | NX04 不觸發 |
| X | 跨倉調撥 | nx03/transfer.service | ⭐ NX04 觸發鏈起點：SO CONFIRMED → autoCreateTransferFromSo → 建 ST 草稿（後續 ST 過帳 source=X）|
| W | 報廢 | nx03/disposal.service | NX04 不觸發 |
| M | 重組 | nx03/conversion.service | NX04 不觸發 |
| D | 分解 | 同上 | NX04 不觸發 |

⭐ **NX04 純 S 鏈主寫入者 + R 鏈寫入者 + G/X 鏈觸發者**：
- 直接寫入：source=S（SO 出貨）+ source=R（SR R/D 入庫）
- 間接觸發：source=G（D4 翻譯 → NX02 採購 → 入庫）+ source=X（自動調撥 → ST 過帳）

---

## §7 範圍 A closure 標準對齊（plan §1 9 業務功能）

| # | 業務功能 | schema | service | endpoint | UI |
|---|---|---|---|---|---|
| 1 | 報價單（Quote 等級定價 + minPrice）| 既有 ✓ | quote.service 升共享列表 ✅ Phase 3b | 既有 8 endpoints ✅ | 🟡 Phase 6 stub |
| 2 | 銷貨單（SO 6 階 + 雙段狀態 + 部分鎖）| 既有 ✓ | so.service 升 4 接點 + autoTransfer ✅ Phase 3a + 4b | 既有 9 endpoints ✅ | 🟡 Phase 6 stub |
| 3 | 銷退單（SR 5 階 + 3 種退法）| 既有 ✓ | sales-return.service 升 returnAction R/D/X ✅ Phase 3c | 既有 8 endpoints ✅ | — |
| 4 | 客訂預約（Co + 預估價系統算）| 既有 ✓ | translator 既有 + 新 CoEstimateService ✅ Phase 2c | POST /nx04/co-estimate/estimate ✅ | — |
| 5 | 同行調貨翻譯（D3+D4 已 demo）| 既有 ✓ | translator 0 改 ✓ | 既有 1 endpoint ✅ | — |
| 6 | **客戶授信擋單**（含逾期自動轉現金）| M1+M2 配套 ✅ | CreditGuardService ✅ Phase 2a | POST /nx04/credit-guard/check ✅ | 🟡 Phase 6 stub |
| 7 | **銷售業績追蹤**（LITE/PLUS 毛利顯示）| 0 schema 改 | SalesPerformanceService ✅ Phase 2b | GET /nx04/sales-performance/stats ✅ | 🟡 Phase 6 stub |
| 8 | **報價簽核純記錄**（多業務員共享）| 0 schema 改 | quote.service whereList tenant-wide + search 擴 ✅ Phase 3b | 既有 ✅ | — |
| 9 | **銷退退款處理**（NX05 Allowance bridge）| 0 schema 改 | createAllowanceFromSalesReturn ✅ Phase 4a + sr.service wire ✅ | 隨 SR 流 | — |

⭐ **9 / 9 範圍 A 業務功能 schema + service + endpoint 全落地**、UI Phase 6 stub（Crown Q-U1=c 對齊 NX02 範式、UI 獨立軌 backlog）。

---

## §8 範圍 A 不涵蓋 / backlog 揭露（plan §5.3 + overview §13/14）

對齊 nx04-overview §13 範圍 B + §14 後續軌 + plan §5.3：

1. **PRO 完整 KPI 業績管理系統**（業績儀表板 / 提成 / 主管分潤 / 目標對比）→ 範圍 B 戰略軌
2. **報價低於 minPrice 業績倒扣**（schema 已備 belowMinReason）→ 範圍 B
3. **業績獎金 / 提成計算**（業務員 + 主管分潤）→ 範圍 B 或 NX08 延伸
4. **客戶分級補貨策略**（VIP / A / B / C 庫存優先）→ 後續軌
5. **銷售前後場景管理**（業務員手機現場開單）→ PRO 候選
6. **業績目標持久化**（本軌 LITE/PLUS 純 in-memory dto.target、後續軌可新表）
7. **SR returnAction schema 持久化**（本軌純 dto、A026 backlog 標明）
8. **退換貨換新流程自動化**（X 路徑業務員手動建新 SO、可自動化）
9. **CoEstimate 業務員手動覆寫持久化**（本軌純 service 算建議價、UI 軌處理覆寫）
10. **TASK-NX04-IMPL-02-TEST 獨立軌**（補 Quote/SO/SR/Co 4 業務 0 spec）
11. **TASK-NX04-IMPL-UI-01 UI 獨立軌**（5 placeholder functional 化）
12. **TASK-NX04-DEMO-CLEANUP**（清 features/sale + features/sales + features/nx03/sales 3 namespace 殘留）
13. **menu.nx04.ts drift 修正**（本軌 Phase 6 順手修、audit-01 §3.4）
14. **自動調撥地理距離算法**（本軌純 warehouse.sortNo asc、後續軌可升地理距離計算）

---

## §9 後記（Phase 5 closure）

⚠️ 揭露可能不完整、Alex / Crown 想補的直接說。

下一步：commit 5 verify report → Phase 6 UI 3 stub + menu.nx04.ts drift 修 → Phase 7 收尾（summary + worklog）

⭐ **Phase 0~5 累計 11 commit / 2 migration / 9 service file（5 既有升 + 3 新建 + 2 inline helper）**

| Phase | commit 範圍 | sha 範圍 |
|---|---|---|
| 0 | 1 | 67538cb（plan v0.1.0）|
| 1 | 2 | 1a68956 / 290c151（M1+M2 schema）|
| 2 | 3 | 04b08b6 / cb619ee / 6479656（CreditGuard / SalesPerformance / CoEstimate）|
| 3 | 3 | 143a71f / 4d867e7 / 95fc313（so 4 接點 / quote 共享 / sr returnAction）|
| 4 | 2 | 76615b8 / 4bce139（Allowance bridge / autoTransfer）|
| 5 | 1 | （本 commit verify report）|

---

> 對齊文件：[nx04-overview](../intent/nx04-overview.md) · [nx04-impl-01-plan](./nx04-impl-01-plan.md) · [nx02-impl-01-phase5-verify](../../../nx02/spec/impl/nx02-impl-01-phase5-verify.md) · [nx03-impl-01-phase7-verify](../../../nx03/spec/impl/nx03-impl-01-phase7-verify.md)
