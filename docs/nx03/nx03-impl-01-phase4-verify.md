<!-- docs/nx03/nx03-impl-01-phase4-verify.md -->

# TASK-NX03-IMPL-01 Phase 4 預 verify — 調貨入庫 schema 真相揭露

> 性質：純諮詢、不開工、不 commit
> 撰寫者：Hank
> 日期：2026-05-16
> 觸發：Crown Q-Phase4-1=d、Hank 先 verify 既有 schema 真相再拍方案
> 真實 main HEAD：`38077c8c` ✓ / 分支 `feature/nx03-redesign` ahead 12 commit

---

## §1 既有「調貨」schema grep 揭露

### 1.1 目錄通配（procurement / peer / outside / inquiry）

```
find . -type d -iname "*procurement*" -o "*peer*" -o "*outside*" -o "*inquiry*"
→
apps/nx-ui/src/app/dashboard/sale/docs/inquiry      （UI inquiry 詢價）
apps/nx-ui/src/app/dashboard/sale/inquiry            （UI inquiry 詢價）
apps/nx-ui/src/features/nx01/procurement             （NX01 採購首頁 hub、AUDIT-02 殘留）
apps/nx-ui/src/features/sale/ui/inquiry              （UI sale inquiry）

→ 0 個 backend service 目錄含 peer/outside、0 個 schema model 名稱含這些字
```

### 1.2 schema 註解搜「同行 / peer / outside」（A041 = 13 處 hit）

關鍵 hit：

| line | 表 | 業界 code | 內容摘要 |
|---|---|---|---|
| 1750 | `Nx02Qt`           | — | **同行報價單**（Phase 0 B5 新建）|
| 1759 | `Nx02Qt.partnerId` | `partner_type=S` ⚠️ | 「同行供應商」 |
| 1827 | `Nx02Rfq.rfqType`  | `P=同行調貨詢價` | RFQ type P 由銷售專員建立 |
| 1829 | `Nx02Rfq.rfqReason`| `T=同行調貨` | 詢價原因 T 固定 |
| 1837 | `Nx02Rfq.sourceSoItemId` | — | D4 translator 同行調貨 RFQ stub |
| 2122 | `Nx02Ti.partnerId` | `partner_type=C` ⚠️ | 「同行供應商」（與 1759 矛盾）|
| 2188 | `Nx02TiItem`       | — | 「調貨單價（同行報價）」 |
| 3436 | `Nx02Ti.rfqId`     | — | 同行調貨詢價流程 |
| **3524** | `Nx04SoItem.transferSourceType` | **`G=同行調貨`** | enum: `S/O/T/G/M/B` |
| **3629** | `Nx04SoItem.transferSourceType` | **`G=同行調貨`** | D3 新增、補貨來源 |
| 4313 | `Nx06DnStop.partnerId` | — | 「客戶或同行」（單一欄混用）|

⚠️ **partner_type 註解 drift**：line 1759（Qt 同行=S）vs line 2122（Ti 同行=C）vs line 3352/3402/3517（NX04 客戶=C）— schema 註解對「同行」字母不一致、Crown 拍板需求一致化（屬 A026 backlog drift、不阻擋本軌）。

⭐ **`G=同行調貨` 已是 schema 內既有 code**（line 3524 + 3629）、跟 overview §3.2 10 種 source 對齊 ✓。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2 NX03 schema 是否含「同行調貨」入庫表

### 2.1 `Nx03Inbound` 完整欄位（line 2995~3018、AUDIT-04 後 line 移）

```
id / tenantId / docNo / warehouseId / inboundDate / status (DRAFT default)
remark / voided{At,By} / posted{At,By} / created/updated{At,By}
relations: tenant + warehouse + reverse items
```

`Nx03InboundItem` 完整欄位（line 3023~3046）：
```
id / inboundId / lineNo / partId / partNo / partName / locationId
qty / unitCost / lineAmount / remark / created/updated{At,By}
relations: inbound + part + location
```

⭐ **Nx03Inbound 真相**：
- **0 source / sourceDocType / partnerId / partner_type 欄位** ← 完全中性
- **0 區分機制**（P / G / X / R 都不能區分）
- **0 partner FK**（無法綁定供應商或同行）
- Phase 5 殘留性質、AUDIT-01 揭露被 RR bypass、`rr.service.applyRrPosting` 直接打 stock_balance/ledger 跳過 Inbound

### 2.2 既有「同行調貨」schema = `Nx02Ti` + `Nx02TiItem`（完整 ✓）

`Nx02Ti` 表頭（line 2111~2164）：
- `partnerId` (FK Nx01Partner、業務語意「同行供應商」)
- `rfqId` (FK Nx02Rfq、來源詢價、rfq_type=P)
- `currencyId` / `status` (D/S/R/P/C/V) / 稅金欄位
- 反向：`rev_Nx02Rr_tiId` / `rev_Nx02TiItem_tiId` / `rev_Nx04SoItem_tiId` / `rev_Nx05ApLedger_tiId`

`Nx02TiItem` 明細：
- partId / partNo / partName snapshot
- 「調貨單價（同行報價）」(line 2188)
- locationId / qty 等標準入庫欄位

### 2.3 ⭐ 既有同行調貨入庫路徑：**TI → RR**（已通暢）

`Nx02Rr.tiId String?`（line 1961）+ `Nx02Rr.ti Nx02Ti?` relation（line 1975）

→ **業務鏈**：
```
RFQ (rfq_type=P) → QT (同行報價) → TI (同行調貨單) → RR (with tiId) → 過帳入庫
```

`Nx02Rr` 同時涵蓋：
- 採購進貨：`Nx02Rr.tiId = null`（從 PO 來）
- 同行調貨進貨：`Nx02Rr.tiId != null`（從 TI 來）

⭐ **既有 schema 已支援「TI → RR → 過帳」路徑、不需新表！**

### 2.4 partner_type=C 反向關係的 NX03 入庫路徑

- NX03 schema 反向引用 `Nx01Partner` 真實 count = **1 條**（AUDIT-01 揭露）：
  - `Nx03Parcel.toPartnerId`（出庫類、寄貨對象）
- **NX03 入庫類 0 條** 直接 partner FK
- 入庫進來的 partner 資訊全部走 NX02 上游（RR.partnerId / TI.partnerId）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3 4 種入庫共用模型可行性分析

### 3.1 4 種入庫業務語意對比

| 入庫類型 | 觸發單據 | source | 上游 service 既有 | partner 對象 |
|---|---|---|---|---|
| 1. 進貨入庫 P | `Nx02Rr (tiId=null)` | P | ✅ `rr.service.applyRrPosting` | 供應商（V/S）|
| 2. 銷退入庫 R | `Nx04Sr` | R | ✅ `sales-return.service` | 客戶（C）|
| 3. 調撥入庫 X | `Nx03St` | X | ✅ `transfer.service` | 內部（無 partner）|
| 4. 調貨入庫 G | `Nx02Rr (tiId!=null)` | G | 🟡 `rr.service` 需升 if tiId 判斷 | 同行（C 或 S、註解 drift）|

### 3.2 共用 helper 已存在

`applyQtyInWithLedger` (`apps/nx-api/src/shared/nx03/nx03-inventory.ts`)：
- 接 `sourceModule / sourceDocType / sourceDocId / sourceItemId / partVersionId`
- 4 種上游 service 全用同一 helper、只是 sourceDocType 字母不同
- M1 配套 partVersionId 已升級

→ **4 種入庫的物理過帳邏輯本來就共用 helper、不需新建表**。

### 3.3 單一表 + sourceDocType 區分的可行性 vs 分表

| 方案 | 評估 |
|---|---|
| **共用單一表**（如 Nx03Inbound + sourceDocType 欄）| ❌ 不可行：4 種上游業務 schema 已固化（RR/SR/ST/RR 各自表頭明細結構不同、unique constraints 不同、簽核流程不同）。強用單一表會把 4 個業務 schema 壓扁、破壞既有業務語意 |
| **分表獨立**（每種獨立 model）| ✅ 既有狀態：Rr / Sr / St 已 3 表獨立、業務 schema 完整。調貨 G 用既有 Rr (tiId!=null) 即可、不需第 4 表 |
| **共用 stock_ledger source 區分** | ✅ 既有狀態：4 種 source 在 stock_ledger.sourceDocType 那層區分（10 種 enum）、各上游 service 自決 |

⭐ **既有 schema 已是「分表 + helper 共用 + ledger source 區分」3 層架構**、完全充足。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4 結論建議：選項 **d**（Hank 揭露）

### 4.1 推薦方案 d 內容

**完全不動 schema、不新建表、不複用 transfer**。

具體做法：
- **升級 `rr.service.applyRrPosting`**：判斷 `rr.tiId != null` → `sourceDocType='G'`（同行調貨）；否則 `sourceDocType='P'`（採購進貨）
- **升級 `rr.service.applyRrPosting`**：補 `partVersionId` 帶入 helper（M1 配套、目前傳 null）
- **不新建** Nx03 入庫表（Nx03Inbound 4 表維持 Phase 5 殘留 backlog A 不動）
- **不複用** transfer / 採購 with flag（既有已分清楚）

### 4.2 排除其他選項理由

| 選項 | 排除理由 |
|---|---|
| a. 新建獨立表 | ❌ 重複既有 Nx02Ti、增加 schema 複雜度、業務鏈斷裂 |
| b. 複用 NX02 採購 + flag | ✅ **就是既有狀態**（Nx02Rr.tiId 已存在）、只需 service 升級 |
| c. 複用 transfer + 外部來源 flag | ❌ transfer 是內部跨倉、業務語意完全不同（無 partner、無 RFQ/QT 鏈、無稅金）、複用會壓扁兩個業務 |
| **d. Hank 揭露** | ✅ **不動 schema、升 service 兩處（rr 寫 sourceDocType 判 tiId + partVersionId 帶入）** |

### 4.3 Phase 4 範圍建議

| commit | 範圍 | 估改檔 |
|---|---|---|
| Phase 4 commit 1 | 升級 `nx02/rr/rr.service.applyRrPosting`：partVersionId + sourceDocType 判 tiId | 1 |
| Phase 4 commit 2 | 升級 `nx04/sales-return/sales-return.service`：partVersionId 帶入（sourceDocType='R' 已對）| 1 |
| Phase 4 commit 3 | 升級 `nx03/transfer/transfer.service`：partVersionId 帶入（sourceDocType='X' 已對）| 1 |
| Phase 4 commit 4 | （視需要）NX02 RR 升級狀態流支援「TI 來源 RR」的 application-layer guard | 1 |

**估 commit 數：3~4**（對齊 plan §4 Phase 4 估 3~4）

### 4.4 不在 Phase 4 範圍

- 「進貨入庫」獨立的 NX03 controller / endpoint（Phase 5 殘留 Nx03Inbound 維持 backlog A026）
- Nx02Rr 整體升 partner_type drift（A026 backlog、跨模組）
- 「調貨入庫」獨立 controller（不需要、用既有 Nx02Rr 入口）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 附錄：4 種入庫對應上游表

```
進貨 P：NX02 Rfq → Po → Rr (tiId=null) → rr.service.applyRrPosting → stock_ledger(P)
調貨 G：NX02 Rfq (rfqType=P) → Qt → Ti → Rr (tiId!=null) → rr.service.applyRrPosting → stock_ledger(G)
銷退 R：NX04 So → Sr → sales-return.service → stock_ledger(R)
調撥 X：NX03 St → transfer.service (both in+out) → stock_ledger(X)
```

→ NX02 Rr 同時涵蓋 P + G 兩種、只是 `tiId` 區分。

---

## 後記

- 真實 main HEAD：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 真實分支：`feature/nx03-redesign` ahead 12 commit、未 push
- 本檔位置：`docs/nx03/nx03-impl-01-phase4-verify.md`
- 純 verify、schema 0 動、未 commit（待 Crown 拍板後 commit + 進 Phase 4 impl）

**下一步**：等 Crown 拍 Q-Phase4-1 a/b/c/d → 進 Phase 4 service 升級。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
