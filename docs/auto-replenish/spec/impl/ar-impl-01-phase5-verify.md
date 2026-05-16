<!-- docs/auto-replenish/spec/impl/ar-impl-01-phase5-verify.md -->

# TASK-AR-IMPL-01 Phase 5 — 跨模組接點 verify 報告（L4）

> 性質：純 verify、commit 1（commit 內含本文件）
> 撰寫者：Hank
> 日期：2026-05-16
> 觸發：Crown Q-Phase5-7=a 收尾 3 commit 連跑
> 真實 main HEAD：`8743de0`（AR-AUDIT-01 後、Phase 1~4 未 merge）
> 對應依據：[ar-overview](../intent/ar-overview.md) + [ar-impl-01-plan](./ar-impl-01-plan.md)

---

## §1 AR → Demand → 採購鏈完整 verify

### 1.1 完整業務鏈（AR 為 P 鏈起點）

```
AR Stage 1~4 計算
   ↓ ArSuggestionWriter.runForWarehouse
   ↓ tx.nx02Demand.create × N（OE row + 副廠各品牌 row）
Nx02Demand (demandType='S' 庫存不足、status='O' 待處理)
   ↓ 採購專員審 / 忽略 / 改 qty（既有 demand path）
   ↓ POST → 建 RFQ（demand.refRfqId 串接）
Nx02Rfq (rfqType='G' 一般詢價、rfqReason 含 'S' 庫存不足、demandId 接通)
   ↓ 詢價回報
Nx02Qt (供應商報價)
   ↓ 採購比價選定 → 建 PO
Nx02Po (採購單)
   ↓ 到貨驗收
Nx02Rr (進貨單、應用 partVersionId)
   ↓ rr.service.applyRrPosting → applyQtyInWithLedger
Nx03StockBalance + Nx03StockLedger (sourceDocType='P' 進貨入庫、sourceModule='NX02')
   ↓
NX03 庫存補回 → 下次 AR Stage 1 偵測時 onHand >= safetyQty → shortage 消失
```

⭐ **AR 是 P 鏈的「上游觸發者」、不是 stock_ledger 直接 writer**。AR 寫入 Demand、後續 RFQ→Qt→Po→Rr 鏈最終由 rr.service.applyRrPosting 寫 source=P。

### 1.2 接點 schema 完整 verify

| 階段 | schema | 接點欄位 | 狀態 |
|---|---|---|---|
| AR → Demand | `Nx02Demand` | demandType='S' + partId + warehouseId + qty | ✅ 既有完整 |
| Demand → RFQ | `Nx02Rfq.demandId` FK | 雙向接通（Demand.refRfqId + Rfq.demandId）| ✅ |
| Rfq → Qt → Po | 既有 NX02 採購鏈 | NX02 既有 service | ✅ |
| Po → Rr | 既有 | rr.service.applyRrPosting | ✅ |
| Rr → NX03 ledger | `rr.service.applyRrPosting` | applyQtyInWithLedger source=P | ✅ |

⭐ **AR B 軌 0 新增跨模組 schema、純 service 層串接**（對齊 AR-AUDIT-01 v2 §B3 推薦：走既有 Nx02Demand 不新建）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2 10 種 source 接點 verify（AR 在 P 鏈位置）

對齊 NX03-IMPL-01 Phase 7 verify 揭露的 10 種 source：

| source | 業務 | service writer | AR 關聯 |
|---|---|---|---|
| **P** | 進貨 | `nx02/rr.service.applyRrPosting`（tiId=null）| ⭐ **AR 觸發鏈終點**：AR Demand → RFQ → Po → Rr → P |
| G | 同行調貨 | rr.service (tiId!=null) | AR 不觸發（同行調貨非 AR 範圍）|
| S | 銷貨 | so.service | AR 讀（Stage 2 平均出貨）|
| R | 退貨 | sales-return / purchase-return | AR 不觸發 |
| T | 盤點 | stocktake | AR 讀（onHand 來自 balance、ledger 不直 read）|
| I | 開帳 | init | AR 不觸發 |
| X | 跨倉調撥 | transfer | AR 不觸發、Stage 2 排除（overview §3.2 拍板）|
| W | 報廢 | disposal | AR 不觸發 |
| M | 重組 | conversion | AR 不觸發 |
| D | 分解 | conversion | AR 不觸發 |

⭐ **AR 純 P 鏈觸發者 + S 鏈消費者**：
- 寫入：透過 Demand 鏈最終觸發 source=P
- 讀取：Stage 2 撈 source=S 算平均出貨（排除 X 調撥對齊拍板）

---

## §3 partVersionId M1 配套 verify

AR 不直寫 stock_ledger、partVersionId 由下游 service 帶入：

| 階段 | partVersionId 處理 |
|---|---|
| AR ArSuggestionWriter | ❌ 不寫 ledger、無 partVersionId 處理 |
| Demand → RFQ → Po → Rr | NX02 既有路徑、Demand/Rfq/Po 本身不存 partVersionId（這些是「未實際發生」階段）|
| Rr.applyRrPosting | ✅ Phase 4 commit 1 升級已含 partVersionId（load active version 帶入 helper）|
| applyQtyInWithLedger | ✅ ledger.create.data.partVersionId 寫入 |

⭐ **AR 鏈最終 ledger 寫入時 partVersionId 完整帶入**（M1 配套保留、漸進 Q-S1=B）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4 範圍 B closure 標準對齊（overview §8.2）

| 標準 | 狀態 |
|---|---|
| 4 階段計算引擎落地（偵測 / 計算 / 分類 / 分配）| ✅ Phase 3 commit 1~2 |
| 倉層級頻率設定 + 排程 | ✅ M1 calculationFrequency + Phase 4 commit 2 scheduler |
| BrandAllocationRule 主檔 schema + service | ✅ M2 + Phase 2 |
| 銷貨比例自動算 + 手動覆寫 | ✅ Stage 4 自動 + Q-S1=A manual 覆寫 system |
| application 層替代邏輯（fitLevel 套用）| ✅ Phase 3 commit 3 PartReplacementService |
| 建議單管理 UI（倉管 / 產品雙視角）| 🟡 stub placeholder（Phase 6、UI 獨立軌 backlog）|
| NX02 Demand 接點完整 | ✅ Phase 4 commit 1 ArSuggestionWriter |

⭐ **6/7 closure 標準滿足、UI 1 項 stub 留獨立軌**（對齊 Crown Q-U1=A）。

---

## §5 backlog 揭露（不阻擋本軌 closure）

對齊 ar-overview §10 + 本 phase 揭露：

1. **@nestjs/schedule cron decorator 註冊**：本軌純 HTTP trigger、留外部 cron / k8s CronJob
2. **per-setting calculationFrequency 細粒度 due 判斷**：本軌按倉統一 frequency
3. **ArRunResult 持久化 batch log**：本軌純 in-memory return、無 batch 表
4. **N+1 query 優化**（Stage 1 per setting / Stage 4 per aftermarket part）：plan §7 已揭露、對策按倉切批 + index
5. **leadTimeDays schema 0 欄**：預設 7 天常數、Crown 後續可加 schema
6. **TASK-AR-IMPL-02-TEST** 獨立軌（單測 + 整測 fixture、對齊 NX03-IMPL-02-TEST 範式）
7. **預測性補貨**（範圍 B 不含、§10.1 backlog）
8. **跨倉自動調撥建議**（NX03 範圍 backlog）
9. **客戶分級補貨**（後續軌）

---

## 後記

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

下一步：commit 2 UI stub placeholder → commit 3 summary + worklog 主題 25 → stop → Crown merge main + push + tag v0.4.0-ar-closure
