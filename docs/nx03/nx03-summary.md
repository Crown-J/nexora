<!-- docs/nx03/nx03-summary.md -->

# NX03 庫存管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-16
> 撰寫：Hank（整合 TASK-NX03-IMPL-01 26 commit + AUDIT-01~04 + overview v1.1 → 壓縮）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx03/spec/intent/nx03-overview.md` v1.1（本機 Cursor 讀、不上傳 Claude.AI）

---

# § 1. NX03 模組業務角色

## 1.1 模組定位

NX03 = **NEXORA 庫存管理層**、實體流通的物理樞紐、所有業務動作的真實對應。

```
NX02 採購（RR 進貨 / PR 退供） ↘
NX04 銷貨（SO 出貨 / SR 退入） ↘
NX03 庫存（stock_balance + stock_ledger 強制溯源）→ NX06 物流（DN 配送接管）
NX03 內部（Init / StockTake / Transfer / Disposal / Conversion） ↗
                                                            → NX08 InventoryCache（PRO 報表快取）
```

**戰略意義**：
- ⭐⭐ Yaro 倉管部門工作台、實體進銷存核心
- ⭐ #13 強制溯源：10 種 source 完整覆蓋、業界第一個能查「這顆料從哪來、為什麼動」
- ⭐ 動態盤點不凍結業務（snapshot + delta 公式回推）、業界改革核心

## 1.2 11 業務情境（範圍 A、自動補貨拆 B 軌）

```
入庫 4 種：進貨(P) / 銷退(R) / 調撥(X) / 調貨(G)
出庫 4 種：銷貨(S) / 調撥(X) / 退貨(R) / 報廢(W)
轉換 2 種：重組(M) / 分解(D)
盤點 1 種：動態盤點(T)
————————————————————————
範圍 B（戰略軌、本軌不含）：自動補貨建議單
```

---

# § 2. Schema 真相（v1.1 final）

## 2.1 NX03 model 完整 list（A041 = 24 個）

新增 4 model（IMPL-01 落地）：
- `Nx03Disposal` + `Nx03DisposalItem`（M3、報廢單）
- `Nx03Conversion` + `Nx03ConversionInput` + `Nx03ConversionOutput`（M4、重組分解）

原有 20 model 升級（M1 + M2）：
- M1 4 表加 `partVersionId String?` FK：`Nx03StockLedger` / `Nx03InitItem` / `Nx03StItem` / `Nx03StockTakeItem`
- M2 `Nx03StockTake` 加 `snapshotStartedAt` / `snapshotEndedAt`
- M2 `Nx03StockTakeItem` 加 `snapshotQty` / `deltaQty` / `formulaExpectedQty` / `realDiffQty`

## 2.2 4 migration 軌（A041 精確）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260516100000_nx03_impl_01_m1_part_version_snapshot_columns` | 4 表加 partVersionId FK |
| M2 | `20260516130000_nx03_impl_01_m2_dynamic_stocktake_snapshot_delta` | StockTake 動態盤點 6 欄 |
| M3 | `20260516110000_nx03_impl_01_m3_disposal_doc_create` | Disposal 2 表 |
| M4 | `20260516120000_nx03_impl_01_m4_conversion_doc_create` | Conversion 3 表 |

DB：52 migrations applied、Database schema is up to date ✓

---

# § 3. Service 真相（10 service writers）

## 3.1 NX03 內部 service（A041 = 12 controllers）

| service | endpoints | 業務 | source |
|---|---|---|---|
| stock-balance | 4 (list + by-part + summary + dashboard) | 即時量 | — |
| stock-ledger | 1 (list) | 異動帳冊 | — |
| stock-reservation | 既有 | 預留量 | — |
| part-stock-setting | 4 (CRUD + isActive) | 安全量 | — |
| init | 8 | 開帳 | I |
| disposal | 8 | 報廢 | W |
| conversion | 5 (共用 M/D 分派) | 重組/分解 | M / D |
| pk | 8 | 撿貨單（不寫 ledger）| — |
| pl | 6 | 包貨單（不寫 ledger）| — |
| parcel | 5 (三選一分流) | 包裹 | — |
| stocktake | 既有升級 M2 | 動態盤點 | T |
| transfer | 既有升級 partVersionId | 跨倉調撥 | X |

## 3.2 跨模組 service（4 個寫 NX03 stock_ledger）

| service | 模組 | source |
|---|---|---|
| nx02/rr.service.applyRrPosting | NX02 | P（tiId=null）/ G（tiId!=null）|
| nx02/purchase-return.service.applyPrPosting | NX02 | R（**Phase 5 修隱性 bug 補建**）|
| nx04/so.service.applyShipment | NX04 | S |
| nx04/sales-return.service | NX04 | R |

## 3.3 10 種 source 完整覆蓋（overview §3.2 + Phase 7 verify ✓）

```
P 進貨 → nx02/rr (tiId=null)
G 同行調貨 → nx02/rr (tiId!=null)
S 銷貨 → nx04/so
R 退貨 → nx02/purchase-return + nx04/sales-return
T 盤點調整 → nx03/stocktake (realDiffQty≠0)
I 開帳 → nx03/init
X 跨倉調撥 → nx03/transfer (out+in)
W 報廢 → nx03/disposal
M 重組 → nx03/conversion (merge path)
D 分解 → nx03/conversion (disassemble path)
```

⭐ **10/10 source 完整鏈、partVersionId M1 配套 10/10 service**。

---

# § 4. 拓樸 4 層（plan §2 對齊 NX01 範式）

```
L1 基礎層：
  StockBalance / StockLedger / PartStockSetting + nx03-inventory.ts helper

L2 實體單據層：
  Init / StockTake（M2 升級）

L3 工作流層：
  入庫 4 種 service / 出庫 4 種 service / 撿包 SOP (Pk + Pl + Parcel) /
  調撥 / 報廢 / 轉換（重組+分解）

L4 戰略接點層：
  verify NX02 RR / NX04 SO / NX02 PR / NX04 SR / NX06 DN / NX08 Cache
  application-layer guard 補強（RR.tiId supplier='S' / Parcel.toPartner='T')
```

---

# § 5. 跨模組接點

## 5.1 上游觸發（→ NX03 過帳）

| 上游 | service | source |
|---|---|---|
| NX02 RR 進貨 / 同行調貨 | rr.service.applyRrPosting | P / G |
| NX02 PR 退供應商 | purchase-return.service.applyPrPosting | R |
| NX04 SO 銷貨 | so.service.applyShipment | S |
| NX04 SR 銷退入庫 | sales-return.service | R |

## 5.2 下游接點

| 下游 | 接點 | 狀態 |
|---|---|---|
| NX06 DN 送貨單 | `Nx06DnItem.parcelId` FK | schema ✓、NX06 query 後建 DN |
| NX08 InventoryCache | `partId / warehouseId / period` | schema ✓、重算屬 NX08 範圍 |

## 5.3 退貨例外（v1.1 校正）

退貨（PR / SR）**不走撿包 SOP**、直接 helper 過帳：
- 對應 schema：`Nx03Pk.triggerSource` enum 只 S/T 兩種
- 業界做法：退貨給供應商物流由 NX06 處理
- 對齊 #13 強制溯源：source=R 寫 ledger 即可

---

# § 6. NEXORA 戰略特色（業界改革候選）

## 6.1 強制資料溯源 ⭐⭐⭐（已落地）

10 種 source 完整覆蓋、partVersionId M1 配套、業界第一個能查「這顆料從哪來、為什麼動」。

## 6.2 動態盤點 snapshot + delta ⭐⭐（已落地）

業界傳統：盤點凍結業務、卡營運節奏。
NEXORA 範式：**不凍結**、`snapshotStartedAt` 鎖基準、期間 stock_ledger 持續寫入、`snapshotEndedAt` 後 application 層即時聚合 deltaQty、`realDiffQty = countedQty - (snapshotQty + deltaQty)`、誤差才寫 source=T。

## 6.3 重組 / 分解庫存轉換 ⭐⭐（已落地）

- 重組 M：`output.unitCost = Σ (input.unitCost × input.qty) / output.qty`（加權公式）
- 分解 D auto：按 `part.priceA × output.qty` 比例分攤 inputTotalCost
- 分解 D manual：人工指定 costRatio override（Σ = 1.0 強制校驗）

## 6.4 撿包出貨 SOP 三選一分流 ⭐（已落地）

- 自取 P：客戶報 BX 編號取貨、無物流
- 寄貨 C：`partner_type='T'` 物流外包 + 第三方追蹤號
- 配送 D：產生 NX06 DN（NX06 接管）

## 6.5 自動補貨建議單 🔵（範圍 B 戰略軌、本軌不含）

對齊 overview §3.3 #12、獨立 Phase B 落地。

---

# § 7. 範圍 A closure 標準對齊（overview §8.2 v1.1）

| 標準 | 狀態 |
|---|---|
| 11 業務情境全 schema + service + endpoint | ✅ |
| 撿包出貨 SOP 全接通（退貨除外）| ✅ |
| 跨模組接點 service 層全接通 | ✅ |
| 強制溯源 10 種 source 全 service writer | ✅（test fixture 列獨立軌）|
| 動態盤點機制完整落地 | ✅ M2 |
| 重組 / 分解成本算法完整落地 | ✅ M 加權 + D auto/manual |

⭐ **6/6 closure 標準滿足**（test fixture 列 TASK-NX03-IMPL-02-TEST 獨立軌、不阻擋本軌）。

---

# § 8. A026 backlog（NX03 範圍）

| # | 項目 | 推薦處置 |
|---|---|---|
| 1 | Nx03Inbound / Outbound 4 表 + service + controller 整批廢棄 | M5 backlog、Phase 5 殘留、production 0 row、source enum 衝突 |
| 2 | TASK-NX03-IMPL-02-TEST 獨立軌 | test fixture 30+ files / ~1500 行（Crown Q-Phase7-commit3=C）|
| 3 | partVersionId 既有歷史 row 回填策略 | Q-S1=B 留 null、後續評估 |
| 4 | partner_type schema 註解 drift 全面掃描 | Phase 4 commit 1 揭露、跨模組 |
| 5 | StItem create 路徑加 partVersionId snap | Q-S1=B 漸進完整化 |
| 6 | RR 狀態流支援「TI 來源 RR」application-layer guard | NX02 範圍延伸 |
| 7 | 配送 D → NX06 DN 自動 trigger hook | NX06 範圍 |

---

# § 9. 開工進度時間軸

| 階段 | commit 範圍 | 主軸 |
|---|---|---|
| Day-1 | commit 1~2 | 依據文件落地 + 拓樸/migration 計畫 |
| Day-2 | commit 3~7 | M1/M2/M3/M4 schema + helper |
| Phase 2 | commit 1~2 | L1 service（StockBalance/Ledger/PartStockSetting）|
| Phase 3 | commit 1~2 | L2 service（Init + StockTake M2 升級）|
| Phase 4 | commit 1~3 | L3 入庫 4 種（rr/sr/transfer + Q-MV1 推 d）|
| Phase 5 | commit 1~6 | L3 出庫 4 種 + 撿包 SOP（含 PR 修隱性 bug）|
| Phase 6 | commit 1~2 | L3 轉換（共用 service、M 加權 + D auto/manual）|
| Phase 7 | commit 1~2 | L4 跨模組 verify + guard 補強 |
| Phase 8 | commit 1~2 | overview v1.1 + summary + worklog |

**總計：26 commit / 4 migration / 6~8 工作日**（plan §4 估 21~25 + Phase 5 拍 6 commit = 命中）

---

> 完整子規格：`docs/nx03/spec/intent/nx03-overview.md` v1.1
> 完整 audit：`docs/nx03/nx03-audit-01.md` ~ `04.md`
> Phase 4/5/7 verify：`docs/nx03/spec/impl/nx03-impl-01-*-verify.md`
> impl plan：`docs/nx03/spec/impl/nx03-impl-01-plan.md`
