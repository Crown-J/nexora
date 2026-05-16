<!-- docs/nx03/spec/impl/nx03-impl-01-phase7-verify.md -->

# TASK-NX03-IMPL-01 Phase 7 — 跨模組接點 verify 報告

> 性質：純 verify、commit 1（commit 內含本文件）
> 撰寫者：Hank
> 日期：2026-05-16
> 觸發：Crown Q-Phase7=b
> 真實 main HEAD：`38077c8c` ✓ / 分支 `feature/nx03-redesign` ahead 23 commit

---

## §1 10 種 source 完整覆蓋 verify

對齊 overview §3.2 強制溯源 10 種 source、verify 每個 source 都有 service writer：

| source | 業務 | service writer（檔案:行）| 狀態 |
|---|---|---|---|
| **P** | 進貨 NX02 RR (tiId=null) | `nx02/rr/rr.service.ts:applyRrPosting` const sourceDocType | ✅ Phase 4 commit 1 |
| **G** | 同行調貨 NX02 RR (tiId!=null) | 同上、`tiId ? 'G' : 'P'` 分流 | ✅ Phase 4 commit 1 |
| **S** | 銷貨 NX04 SO | `nx04/so/so.service.ts:194` | ✅ Phase 5 commit 1 |
| **R** | 退貨（退供 + 銷退）| `nx02/purchase-return/purchase-return.service.ts:187` + `nx04/sales-return/sales-return.service.ts:222` | ✅ Phase 5 commit 2（PR 補建）+ Phase 4 commit 2（SR）|
| **T** | 盤點調整 | `nx03/stocktake/stocktake.service.ts:250,264` | ✅ M2 升級 Phase 3 commit 2 |
| **I** | 開帳 | `nx03/init/init.service.ts:280` | ✅ Phase 3 commit 1 |
| **X** | 內部跨倉調撥 | `nx03/transfer/transfer.service.ts:149,164`（out + in 對稱）| ✅ Phase 4 commit 3 |
| **W** | 報廢 | `nx03/disposal/disposal.service.ts:292` | ✅ Phase 5 commit 3 |
| **M** | 重組 merge | `nx03/conversion/conversion.service.ts:553,584` | ✅ Phase 6 commit 1 |
| **D** | 分解 disassemble | `nx03/conversion/conversion.service.ts:416,493` | ✅ Phase 6 commit 2 |

⭐ **10 / 10 source 全覆蓋 ✓**。每個 source 都有對應的 service 寫 stock_ledger。

---

## §2 partVersionId M1 配套 verify

verify 每個 service 過帳時帶入 partVersionId（M1 配套 + Q-S1=B 漸進）：

| service | partVersionId 帶入 | Phase |
|---|---|---|
| rr.service.applyRrPosting | ✅ loadActivePartVersionId per item | 4 commit 1 |
| sales-return.service | ✅ inline findFirst per item | 4 commit 2 |
| transfer.service | ✅ inline findFirst per partId（out+in 共用）| 4 commit 3 |
| so.service | ✅ inline findFirst per item | 5 commit 1 |
| purchase-return.service | ✅ loadActivePartVersionId per item | 5 commit 2 |
| disposal.service | ✅ partVersionId snap in createInputTx（item 已存）| 5 commit 3 |
| init.service | ✅ partVersionId snap in createInputTx（item 已存）| 3 commit 1 |
| stocktake.service | ✅ partVersionId backfill DRAFT→COUNTING + posting 用 item.partVersionId | 3 commit 2 |
| conversion.service M | ✅ partVersionId snap input/output items + helper 帶入 | 6 commit 1 |
| conversion.service D | ✅ 同上 | 6 commit 2 |

⭐ **10 / 10 service partVersionId 全覆蓋 ✓**。Q-S1=B 漸進範式對齊：新 row 帶入、既有歷史 row 留 null。

---

## §3 NX02 / NX03 / NX04 跨模組過帳鏈 verify

### 3.1 上游接點（NX02 / NX04 → NX03 stock_balance/ledger）

| 上游模組 | 業務動作 | 觸發 NX03 過帳 | sourceModule | sourceDocType | 狀態 |
|---|---|---|---|---|---|
| NX02 RR (PO 採購進貨) | DRAFT→POSTED transition | applyQtyInWithLedger | NX02 | P | ✅ |
| NX02 RR (TI 同行調貨) | 同上 + tiId!=null | applyQtyInWithLedger | NX02 | G | ✅ |
| NX02 PR (退供應商) | DRAFT→POSTED transition | applyQtyOutWithLedger | NX02 | R | ✅（Phase 5 commit 2 修隱性 bug 補建）|
| NX04 SO (銷貨) | shipment | applyQtyOutWithLedger | NX04 | S | ✅ |
| NX04 SR (銷退入庫) | 過帳 | applyQtyInWithLedger | NX04 | R | ✅ |

### 3.2 NX03 內部接點

| 業務 | service | sourceModule | sourceDocType | 狀態 |
|---|---|---|---|---|
| 開帳 | Init | NX03 | I | ✅ |
| 動態盤點誤差 | StockTake (realDiffQty≠0) | NX03 | T | ✅ |
| 跨倉調撥（出+入） | Transfer | NX03 | X | ✅ |
| 報廢 | Disposal | NX03 | W | ✅ |
| 重組 | Conversion (M) | NX03 | M | ✅ |
| 分解 | Conversion (D) | NX03 | D | ✅ |

### 3.3 下游接點

#### NX06 DN 接點

- schema：`Nx06DnItem.parcelId String? FK → Nx03Parcel(id)` ✅ 既有
- schema：`Nx06DnItem.sourceDocType VarChar(2)` enum `SO/ST/TI/PR/SR`（**2 字元命名空間、與 stock_ledger 1 字元獨立**）
- `apps/nx-api/src/nx06/dn-logistics.service.ts` 真實用 user-provided sourceDocType（非 hard-coded）、彈性對接多種來源
- **NX03 Parcel.service 不主動建 DN**（對齊 overview §5.4「NX06 物流接管」、Crown Phase 5 commit 6 設計）
- 業務流：包貨完成 → NX03 export Parcel info → NX06 service query 後建 DN

⭐ NX06 接點 schema 通 + service 通、僅是業務上分工：NX03 export、NX06 接管。

#### NX08 InventoryCache 接點

- schema：`Nx08InventoryCache` table 既有（AUDIT-01 line 4816、PRO tier）
- 接點欄位：`partId / warehouseId / partial_period statistics`
- **0 條** trigger 自動重算（grep verify）
- 屬 NX08 範圍 backlog（NX03-IMPL-01 範圍 A 不含）

---

## §4 ⚠️ Phase 5 殘留發現的衝突（A026 backlog）

verify grep 揭露兩處既有 sourceDocType 衝突、屬 Phase 5 殘留（AUDIT-01 揭露 Nx03Inbound/Outbound 被 RR/SO bypass）：

### 4.1 `Nx03Inbound.service` 寫 sourceDocType='I'（衝突）

```
apps/nx-api/src/nx03/inbound/inbound.service.ts:119: sourceDocType: 'I',
```

⚠️ 衝突：
- **Init service** 寫 source=I（開帳、Phase 3 commit 1）✅ 對齊 overview §3.2
- **Inbound service** 也寫 source=I ❌ 業務語意衝突（Inbound 不是「開帳」）
- 影響：若 Inbound service 真被使用、ledger 會有 source=I 雙寫者（Init + Inbound 混淆）

實況：Nx03Inbound 為 Phase 5 殘留、被 RR bypass、production 0 條 row → 0 條 ledger source=I from Inbound。

### 4.2 `Nx03Outbound.service` 寫 sourceDocType='O'（enum 外）

```
apps/nx-api/src/nx03/outbound/outbound.service.ts:137: sourceDocType: 'O',
```

⚠️ 衝突：
- overview §3.2 10 種 source = `P/S/R/T/I/X/G/W/M/D`、**0 個 O**
- Outbound service 寫的 'O' 不在 enum 範圍
- 影響：若 Outbound service 真被使用、ledger 會有 invalid source 字母

實況：Nx03Outbound 同 Phase 5 殘留、被 SO bypass、production 0 條 row。

### 4.3 處置建議（A026 backlog 子項）

| 選項 | 處置 |
|---|---|
| 廢棄 Nx03Inbound/Outbound 4 表 + service + controller | 對齊 AUDIT-01 M5 backlog、徹底清除衝突 |
| 補修 source 字母 | 改 Inbound→其他字母 / Outbound→廢棄 'O' → 業務上應該還是 P/S？業務語意不清 |
| 保留 + 文件警告 | 維持 Phase 5 殘留、commit message + worklog 註記「prefer Init/Disposal/etc」|

**Hank 推薦：A 廢棄 4 表 + service**（M5 backlog、不在本軌處置、待 NX03-IMPL-02 或獨立軌）。

---

## §5 application-layer guard verify

### 5.1 既有 guard

| 模組 | guard 內容 | 落地 phase |
|---|---|---|
| Parcel C 寄貨 | toPartnerId.partnerType 含 'T' 物流外包 | 5 commit 6 |
| Parcel T 調撥 | toWarehouseId 必填 + tenant 內 | 5 commit 6 |
| Parcel P 自取 | toWarehouseId/toPartnerId/logisticsTrackingNo 必空 | 5 commit 6 |
| Pk triggerSource | S→refSoId+refSoItemId 必填、T→refStId 必填、互斥 | 5 commit 4 |
| Pl plType | 必對齊 pk.deliveryType | 5 commit 5 |
| Disposal disposalReason='D' | disposalRemark 必填 | 5 commit 3 |
| Pk item status='M' | notFoundReason 必填 | 5 commit 4 |
| Conversion M | outputs.length===1 + output.costRatio 必空 | 6 commit 1 |
| Conversion D | inputs.length===1 | 6 commit 1 |
| Conversion D mode | 全 manual / 全 auto / mixed throw | 6 commit 2 |
| Conversion D manual | Σ costRatio≈1.0 容差 0.000001 | 6 commit 2 |
| Init/Disposal locationId | 過帳前 assert 非空（schema nullable）| 3 / 5 commit |
| stocktake snapshotEndedAt | posting 前必填 | 3 commit 2 |
| Pl F→S transition | logisticsTrackingNo 必填 | 5 commit 5 |

### 5.2 待補 guard（commit 2 範圍）

⚠️ **RR.tiId != null 時、supplier partnerType 必須 = 'S' 同行**：
- Phase 4 commit 1 升 rr.service 判 tiId='G' 但未校驗 supplier 真是同行
- 業務風險：若 RR.tiId 引用了非同行 supplier（partner_type 不是 S）、source=G 寫入會語意混淆
- 對齊 AUDIT-04 + Phase 4 commit 1 列 backlog 項目

實作：rr.service.applyRrPosting 內 / 或 RR create 階段 / 或 TI→RR 路徑 加 guard。

---

## §6 結論：範圍 A closure 標準對齊

對齊 overview §8.2 範圍 A closure 標準：

| 標準 | 狀態 |
|---|---|
| 11 業務情境全 schema + service + endpoint | ✅ 10/10 + Init/Disposal/Conversion 全新 |
| 撿包出貨 SOP 全接通 | ✅ Pk+Pl+Parcel 三選一分流 |
| 跨模組接點（NX02/NX04/NX06） service 層全接通 | ✅ verify ✓ |
| 強制溯源 10 種 source 全測試 fixture | ⚠️ 0 條新 test（commit 3 評估） |
| 動態盤點機制完整落地 | ✅ M2 schema + service 升級 |
| 重組 / 分解成本算法完整落地 | ✅ M 加權 + D auto/manual |

**closure 標準 5/6 滿足、test fixture 1 項待 commit 3 評估**。

---

## §7 commit 3 test fixture 評估

評估範圍：
- 10 種 source 全 fixture：~20+ test files（每 service ~2 test）
- 動態盤點 snapshot+delta 完整 test：~3~5 test
- 重組/分解 auto/manual 雙模式 test：~4 test
- 加上 controller 層 e2e test
- = ~30+ test files、估計 ~1500 行 test code

**Hank 推薦：列 backlog、commit 3 跳過**：
1. test 完整補 = 範圍極大、超出 Phase 7 估「1~2 commit 彈性升 3」邊界
2. 既有 service 透過 helper 行為一致、用 existing stock-reservation 8 tests 覆蓋部分 helper 邏輯
3. tsc + prisma validate 已驗 schema/type 一致性
4. production-blocker 是 PR 隱性 bug（已修）+ source enum 衝突（A026 backlog）
5. Crown 拍板「視需要」、保留 backlog 選項
6. 後續可獨立 task TASK-NX03-IMPL-02-TEST（專注 test 補完整）

→ Phase 7 = **commit 1 (verify report) + commit 2 (RR supplier guard) = 2 commits**、test 列 backlog。

---

## 後記

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

下一步：commit 1 落地（本檔）→ commit 2 RR supplier guard → stop 回報 → 等 Crown 拍板 commit 3 / 收尾。
