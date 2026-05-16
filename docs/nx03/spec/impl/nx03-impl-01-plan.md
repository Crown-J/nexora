<!-- docs/nx03/spec/impl/nx03-impl-01-plan.md -->

# TASK-NX03-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、待 Alex/Crown review 拍板後才動 schema
> 撰寫者：Hank
> 日期：2026-05-16
> 分支：`feature/nx03-redesign`（自 main HEAD `38077c8c` 切出）
> 對應依據：[overview v1.0](../intent/nx03-overview.md) + [AUDIT-01](../../nx03-audit-01.md) ~ [AUDIT-04](../../nx03-audit-04.md)
> 紀律：§II.1.1（拓樸決策先送 review）+ §I.5 #22（schema 真相 verify）+ §I.6.5 A041（精確 count）

---

## §0 計畫文件性質

本檔是 NX03 重塑開工第一份產出、是「**做什麼 + 什麼順序**」的決策稿、**不含實際 schema 改動**。

文件邊界：
- ✅ 列拓樸排序 4 層、按業務依賴
- ✅ 列 migration 拆軌策略（含每軌的範圍 + 風險）
- ✅ 列 commit 策略（每軌幾 commit、commit 標題範式）
- ✅ 列 review 拍板 Q（哪些決策需要 Alex/Crown 拍板）
- ❌ 不寫 .prisma 任何一行
- ❌ 不跑 `prisma migrate dev`
- ❌ 不改任何既有 service / controller

**Hank 紀律承諾**：本計畫送 review 拍板前、**不動 schema、不跑 migrate、不 push**。

---

## §1 範圍 A 11 業務情境拓樸（對齊 overview §3.1）

| # | 情境 | source | 依賴模組 | 入/出/轉/盤 |
|---|---|---|---|---|
| 1 | 進貨入庫 | P | 上游 NX02 RR | 入 |
| 2 | 銷售退回入庫 | R | 上游 NX04 SR | 入 |
| 3 | 調撥入庫 | X | NX03 內部跨倉 | 入 |
| 4 | 調貨入庫 | **G** | NX02 同行 partner_type=C 反向 | 入 |
| 5 | 銷售出庫 | S | 上游 NX04 SO + 下游 NX06 DN（配送分流時）| 出（含撿包 SOP）|
| 6 | 調撥出庫 | X | NX03 內部 + 下游 NX06（配送他倉時）| 出（含撿包 SOP）|
| 7 | 退貨出庫 | R | 下游 NX02 PR / 同行退調 | 出（含撿包 SOP）|
| 8 | 報廢出庫 | **W** | NX03 獨立 | 出（直接沖、不走撿包）|
| 9 | 重組（A+B → C）| **M** | NX01-05 part.type 3 組合件 | 轉 |
| 10 | 分解（X → A+B+C）| **D** | NX01-05 part.type 4 拆解件 | 轉 |
| 11 | 動態盤點 | T | NX03 獨立（snapshot + delta）| 盤 |

10 種 source 字母：`P / S / R / T / I / X / G / W / M / D`（I=開帳、範圍 A 之外但 schema 必含）

---

## §2 拓樸排序 4 層（對齊 NX01 範式）

### L1 — 基礎層（無 NX03 內部 FK 依賴）

- `Nx03StockBalance` ⭐（即時量核心、unique [tenant, part, warehouse] 已 ✓）
- `Nx03StockLedger` ⭐（強制溯源核心、補 `partVersionId` 欄）
- `Nx03PartStockSetting`（安全量 / 最高量、shortage 偵測基礎）
- `nx03-inventory.ts` helper 升級（applyQtyInWithLedger / applyQtyOutWithLedger 加 partVersionId 參數）

### L2 — 實體單據層（依賴 L1）

- `Nx03Init` + `Nx03InitItem`（開帳、`source=I`、業務員手動建底）
- `Nx03StockTake` + `Nx03StockTakeItem`（**動態盤點 snapshot + delta 升級**）

### L3 — 工作流層（依賴 L1/L2 + 跨模組）

入庫 4 種 service：
- 1. **進貨入庫**（NX02 RR 接點、`source=P`）— 已有 helper 用 RR.applyRrPosting、補 partVersionId
- 2. **銷售退回入庫**（NX04 SR 接點、`source=R`）
- 3. **調撥入庫**（NX03 內部接 ST 完成、`source=X`）
- 4. **調貨入庫**（同行 NX02 partner_type=C 反向、`source=G`）— **新 service + 可能新表**

出庫 4 種 service + 撿包 SOP：
- 5. **銷售出庫**（NX04 SO 接點、`source=S`、走撿包 SOP）
- 6. **調撥出庫**（NX03 內部、`source=X`、走撿包 SOP 含配送他倉）
- 7. **退貨出庫**（NX02 PR / 同行退調、`source=R`、走撿包 SOP）
- 8. **報廢出庫**（`source=W`、**新表 Nx03Disposal + Item**、不走撿包）

撿包 SOP（既有 schema 已完整、impl 層自決接點）：
- `Nx03Pk + Nx03PkItem` 撿貨單（既有 ✓）
- `Nx03Pl + Nx03PlItem` 包貨單（既有 ✓）
- `Nx03Parcel` 包裹（既有 ✓、補 partner_type=T application guard）

調撥（出+入串聯）：
- `Nx03St + Nx03StItem`（既有 ✓、impl 層補 in_transit 狀態流）

轉換 2 種：
- 9. **重組** = `Nx03Conversion + Item`（**新表**、`source=M`、A+B → C 成本相加）
- 10. **分解** = 同上 + flag（`source=D`、X → A+B+C 按市價比例分攤、例外人工指定）

### L4 — 戰略接點層（verify、無新 schema）

- NX02 RR → NX03 進貨入庫（既有 applyRrPosting verify partVersionId）
- NX04 SO → NX03 銷售出庫（既有 SO post path verify + Pk 接通）
- NX06 DN → NX03 包貨完成 → 配送分流產生 DN
- NX08 InventoryCache 重算 trigger（推測 NX08 cron job、本軌只 verify 不改）

---

## §3 Migration 拆軌策略（A041 精確 = **5 軌**）

### M1 — `nx03_part_version_snapshot_columns`（part_version 配套 ⭐ AUDIT-04 B2+B6）

範圍：
- `Nx03StockLedger.partVersionId String? VarChar(15)` + FK
- `Nx03InitItem.partVersionId String? VarChar(15)` + FK
- `Nx03StItem.partVersionId String? VarChar(15)` + FK
- `Nx03StockTakeItem.partVersionId String? VarChar(15)` + FK
- 任何後續新增明細表（Disposal/Conversion）一併納入規範

風險：低（純加欄、nullable、回填 backfill 不阻擋）
回填策略：歷史 row 用 Nx01PartVersion 該 partId 的最新版本 versionId backfill（或留 null、上線後新 row 才填）
commit 數：1（schema + migration + helper 同 commit）

### M2 — `nx03_dynamic_stock_take_snapshot_delta`（動態盤點機制 ⭐ overview §3.3 #11）

範圍：
- `Nx03StockTake` 加 `snapshotStartedAt DateTime?` + `snapshotEndedAt DateTime?`（盤點期間時間範圍）
- `Nx03StockTakeItem` 加：
  - `snapshotQty Decimal`（盤點啟動瞬間 balance.onHandQty 快照、現有 `systemQty` 改為「公式 = snapshotQty + deltaQty」）
  - `deltaQty Decimal default 0`（盤點期間異動加總、計算欄）
  - `formulaExpectedQty Decimal`（snapshotQty + deltaQty、應有量）
  - `realDiffQty Decimal`（countedQty - formulaExpectedQty、真實誤差、寫帳基準）

風險：中（既有 `systemQty` 語意調整、需處理 backfill）
commit 數：1（schema + migration + StockTake service 同 commit）

### M3 — `nx03_add_disposal_doc`（報廢出庫表）

範圍：
- 新增 `Nx03Disposal`（DSHD、報廢單表頭、warehouseId / disposalDate / status / 駁回原因 / 過帳人 / 作廢）
- 新增 `Nx03DisposalItem`（DSIT、明細 partId / locationId / qty / unitCost / disposalReason A/B/C/D、A=損壞/B=過期/C=瑕疵/D=其他）
- ID 生成器 `gen_nx03_disposal_id()` + `gen_nx03_disposal_item_id()`
- 反向引用：tenant / warehouse / part / location / partVersion

風險：中（純新表、無破壞）
commit 數：1

### M4 — `nx03_add_conversion_doc`（重組 / 分解轉換表）

範圍：
- 新增 `Nx03Conversion`（CVHD、表頭 conversionType: M=merge / D=disassemble、warehouseId / conversionDate / status）
- 新增 `Nx03ConversionInput`（CVIN、輸入明細 partId / qty / unitCost、重組是 N row 輸入、分解是 1 row 輸入）
- 新增 `Nx03ConversionOutput`（CVOUT、輸出明細 partId / qty / unitCost、重組是 1 row 輸出、分解是 N row 輸出、含 `costRatio Decimal?` 分解時市價比例）
- ID 生成器 3 個

風險：中（純新表、無破壞、但 input/output 兩表設計需 review）
commit 數：1

### M5 — `nx03_phase5_remnant_cleanup`（Phase 5 殘留處置 ⭐ AUDIT-01 #17~#20）

範圍：
- 評估廢棄 `Nx03Inbound` / `Nx03InboundItem` / `Nx03Outbound` / `Nx03OutboundItem` 4 表（AUDIT-01 揭露 Phase 5 殘留、被 RR 直接 bypass）
- 議題：保留 + 接 RR/SO？廢棄 + drop 表？
- **建議：M5 拆出獨立軌、本期 IMPL-01 不執行**（避免破壞既有 controller、影響面太大）
- 列 backlog 給 Crown 拍板（保留 or 廢棄）

風險：高（drop 表會破壞既有 Inbound/Outbound controller）
commit 數：0（本期不執行、列 backlog）

### Migration 軌總計

- 本期 IMPL-01 跑：**M1 + M2 + M3 + M4 = 4 軌、4 migration、4 commit（含 schema 改動）**
- M5 列 backlog、Crown 拍板後另起 task

---

## §4 commit 拆軌策略（A041 精確）

| 階段 | commit 數估計 | 範圍 |
|---|---|---|
| Phase 0 — 計畫 review | 2 | (1) 依據文件落地（AUDIT 4 + overview 1）（2) 計畫 + dailylog |
| Phase 1 — schema migration | 4 | M1 / M2 / M3 / M4 各 1 commit |
| Phase 2 — L1 基礎層 service | 2 | (1) StockBalance/Ledger 升級（含 helper 加 partVersionId）（2) PartStockSetting controller |
| Phase 3 — L2 實體單據層 | 2 | (1) Init service + endpoint + tests（2) StockTake 升級（動態盤點）|
| Phase 4 — L3 入庫 4 種 | 3~4 | 進貨入庫升級 / 銷售退回入庫 / 調撥入庫 / 調貨入庫（同行）|
| Phase 5 — L3 出庫 4 種 + 撿包 SOP | 4~5 | 銷售出庫 / 調撥出庫 / 退貨出庫 / 報廢出庫 + 撿包接通 |
| Phase 6 — L3 轉換 2 種 | 2 | Conversion service M 重組 / D 分解 |
| Phase 7 — L4 跨模組 verify | 1~2 | NX02 RR / NX04 SO / NX06 DN service 接通 verify |
| Phase 8 — 收尾 | 1~2 | worklog 主題 + nx03-summary 更新 |

**總計估計：21~25 commit、4 個 migration、~6~8 個工作日**

---

## §5 紀律對齊承諾（必履行）

### 5.1 每日 dailylog

`docs/_team/dailylog/YYYYMMDD.md`、含：
- 當日已完成（commit list）
- 當日待辦（下次開機接續）
- 衝突/疑問（送 Alex/Crown 拍板）
- 真實 HEAD 對齊

### 5.2 schema vs 業務語意衝突處置

對齊 overview §0 + Crown 紀律：
- 遇衝突立即 stop、寫入 dailylog「衝突回報」段
- 不擅自推進 schema、等 Alex/Crown 拍板
- 例：若調貨入庫（source=G）schema 需新表、會先 stop 列拍板 Q

### 5.3 不擅自處理範圍外

- 自動補貨建議單 = 範圍 B（戰略軌）、本軌 0 touch
- features/nx03/sales 12 檔孤兒 = 後續軌、本軌 0 touch
- 舊 NX02 庫存 frontend 在 main 保留 = 本軌 0 touch
- M5 Phase 5 殘留處置 = 本軌列 backlog、0 執行

### 5.4 §G.9 / §G.4 / #22 對齊

- §G.9 通配 grep：每次新表 / 新 service 前 `find -iname` 揭露既有資源
- §G.4 範式歷史 fact 保留：既有 spec 「田驗證 / 試點」等字眼 0 改動（規範類 vs 歷史 fact 分軌）
- §I.5 #22：每次引用「NX0X-YY v1.0」必先 grep verify

---

## §6 拍板 Q（送 Alex/Crown review）

### Q-T1 拓樸排序 4 層分層認可？

A. ✅ 認可（L1 基礎 → L2 單據 → L3 工作流 → L4 接點）
B. ⚠️ 重排（Crown 補建議）

### Q-M1 4 軌 migration 拆軌認可？

A. ✅ 認可（M1 part_version snapshot / M2 動態盤點 / M3 報廢 / M4 重組分解）
B. ⚠️ 合併或拆細

### Q-M5 Phase 5 殘留 4 表（Inbound/Outbound）處置？

A. 本軌 0 touch、列 backlog（Hank 推薦）
B. 本軌一併 drop（風險高）
C. 本軌保留並補 RR/SO 接線（額外 1 軌 + 2 commit）

### Q-C1 commit 拆軌估計 21~25 個認可？

A. ✅ 認可（按 Phase 階段拆）
B. ⚠️ 要再拆細 / 合併

### Q-B1 報廢表 Nx03Disposal 表頭設計需要簽核機制嗎？

A. 不要簽核、倉管直接過帳（LITE 範圍）
B. 要簽核（OWNER 或 PURCHASING approve）
C. 看金額閾值（LITE 不簽 / PLUS 以上簽）

### Q-B2 重組 / 分解輸出 cost 算法落地確認？

- 重組：C unitCost = avgCost_A + avgCost_B（已對齊 overview §3.3 #9 ✓）
- 分解：A/B/C unitCost = X.totalCost × 各自市價 / Σ 市價（按 priceA 還是 priceB？Crown 拍板）
- 例外：允許人工指定 costRatio（手動編輯欄、儲存後 rebalance）

### Q-B3 動態盤點 deltaQty 計算來源？

A. application 層即時聚合 stock_ledger 查詢
B. DB trigger（盤點期間每筆 ledger 寫入 → 即時更新 stock_take_item.deltaQty）
C. 過帳前批次計算（snapshotEndedAt 時 query 一次）

### Q-S1 part_version snapshot 回填策略？

A. 既有歷史 row 用 partId 最新版本 backfill（一致性高、有解釋成本）
B. 既有歷史 row 留 null、上線後新 row 才填（漸進式、查 ledger 歷史會看到 null）
C. 既有歷史 row 用 partId 第一版 backfill（保守、但不準）

### Q-S2 動態盤點 systemQty 欄位處置？

A. 保留 + 新增 snapshotQty/deltaQty/formulaExpectedQty 並存（漸進、業務雙寫）
B. 重新解釋既有 systemQty = snapshotQty（語意換軌、不加欄）
C. 廢棄既有 systemQty、改用 formulaExpectedQty（破壞性、需 backfill）

---

## §7 風險與停下點

### 7.1 主要風險

1. **part_version snapshot 回填**：歷史 ledger 量大時 backfill SQL 性能（M1 跑前評估）
2. **動態盤點 systemQty 語意調整**：既有 stocktake service 已用 systemQty、需 service + tests 同步改（M2 風險）
3. **重組 / 分解新表設計**：input/output 兩表 vs 1 表 + 方向 enum 的設計取捨（M4 review 拍板）
4. **撿包 SOP 接通**：Pk/Pl/Parcel 既有 schema 完整、但 0 NX03 controller、impl 工作量未估準

### 7.2 預設停下點

依紀律承諾、以下情境必停下回報：
- 任一 migration 跑前、先 stop 給 Alex/Crown review schema 變更（不 push）
- 任一新表設計、先 stop 列 schema diff + 業務語意對應
- 任何 schema 跟業務語意衝突、立即 stop

---

## §8 下次接續工作建議（Day-2 開始）

待 Alex/Crown review §6 拍板 Q 後：

1. **如全部 ✅ 認可** → 進 Phase 1 M1（part_version snapshot 配套 migration）
2. **如有 ⚠️ 重排** → 修正本計畫 v0.2.0、再次送 review
3. **如新增情境揭露** → 評估是否影響 11 業務情境拓樸、必要時加 audit-05

---

## 後記

- 真實 main HEAD：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 真實 branch HEAD：`feature/nx03-redesign`（從 main 切出、無新 commit、無 push）
- 本檔位置：`docs/nx03/spec/impl/nx03-impl-01-plan.md`
- 本檔將於 day-1 commit 2 一起進入分支歷史
- **本檔送 review 拍板前、Hank 不動 schema、不跑 migrate、不 push**

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
