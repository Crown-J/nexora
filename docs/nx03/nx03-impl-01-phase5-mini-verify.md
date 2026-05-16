<!-- docs/nx03/nx03-impl-01-phase5-mini-verify.md -->

# TASK-NX03-IMPL-01 Phase 5 mini-verify — Pk/Pl/Parcel schema 揭露

> 性質：mini-verify、commit 4 前 stop 給 Alex/Crown 對齊 overview §5
> 撰寫者：Hank
> 日期：2026-05-16
> 觸發：Crown Q-Phase5-3=a、Hank commit 4 前 mini-verify Pk/Pl/Parcel
> 真實 main HEAD：`38077c8c` ✓ / 分支 `feature/nx03-redesign` ahead 17 commit

---

## §1 Pk 撿貨單 schema 真相（line 2419~2461）

### 1.1 Nx03Pk 表頭

| 欄位 | 業務語意 |
|---|---|
| `tenantId` / `warehouseId` / `docNo` (PK-YYYYMM-倉-NNNNN) | 標準 |
| **`triggerSource` VarChar(1)** | **S=銷貨單SO / T=調撥單ST**（**0 個 R=退貨**）|
| `deliveryType` VarChar(1) | D=配送 / P=自取 / C=寄貨 / T=調撥 |
| `status` VarChar(1) default 'P' | P=待撿貨 / C=撿貨中 / F=已完成 / V=作廢 |
| `pickupCode` VarChar(20)? | 自取 BX 編號（deliveryType=P 才產生）|
| `startedAt` / `completedAt` / `completedBy` | 計時器 + 完成人 |

### 1.2 Nx03PkItem 明細

| 欄位 | 業務語意 |
|---|---|
| `pkId` / `lineNo` / `partId+No+Name` snapshot | 標準 |
| **`refSoId` String?** | trigger_source=S 時填入 |
| **`refSoItemId` String?** | trigger_source=S 時填入 |
| **`refStId` String?** | trigger_source=T 時填入 |
| **0 個 refSrId / refPrId** | 退貨來源無 FK |
| `locationId` String?（nullable）| 撿貨庫位 |
| `qty` Decimal(14,4) | 應撿數量 |
| `status` VarChar(1) default 'P' | P=待撿 / C=已完成 / M=找不到貨 |
| `notFoundReason` String?(200) | status=M 必填 |
| `labelChecked` Boolean | 貼紙確認（return_policy）|

---

## §2 Pl 包貨單 schema 真相（line 2515~2563）

`Nx03Pl` 表頭：
- `pkId` String FK（包貨來源撿貨單、1:1 或 1:N？schema 顯示 1 pkId 對 N pl 可能）
- `plType` VarChar(1) D/P/C/T（對齊 Pk.deliveryType）
- `status` VarChar(1) default 'P' = P=待包貨 / C=包貨中 / F=已完成 / S=已寄出 / V=作廢
- `logisticsProvider` String? + `logisticsTrackingNo` String? + `shippedAt` + `shippedBy`（寄貨第三方）
- 計時器 startedAt / completedAt / completedBy

`Nx03PlItem` 明細：
- `plId` / `parcelId` String?（包裹分配）/ `pkItemId` String（撿貨來源）/ `partId+No+Name` / `qty`

⭐ 關鍵：**pkItem → plItem 對應、Pl 不直接 ref SO/ST/SR**（透過 pkItem 間接）。

---

## §3 Parcel 包裹 schema 真相（line 2336~2415）

`Nx03Parcel`：
- `plId` String FK（包裹屬於哪張包貨單）
- `parcelNo` String VarChar(30) @@unique（BX-YYYYMM-倉-NNNNN）
- `parcelType` VarChar(1) D/P/C/T
- `fromWarehouseId` String FK
- `toWarehouseId` String? FK（**調撥**時填入）
- `toPartnerId` String? FK（**寄貨**時填入、應 partner_type=T 物流外包、application 自律）
- `logisticsTrackingNo` String? VarChar(50)
- `weightKg` Decimal(8,2)?
- reverse:
  - `rev_Nx03PlItem_parcelId`（明細）
  - `rev_Nx06DnItem_parcelId`（**NX06 送貨單接點 ✓**）

⭐ NX06 接點：`Nx06DnItem.parcelId` 已 FK 連通（AUDIT-01 line 4002）、配送分流產生 DN 時引用 Parcel。

---

## §4 ⚠️ schema 衝突揭露 — 退貨來源缺支援

### 4.1 衝突真相

overview §5.1 撿包出貨 SOP 圖：
```
觸發單據（銷貨 / 調撥 / 退貨）
   ↓
撿貨單 → 包貨單 → 三選一分流（自取 / 寄貨 / 配送）
```

overview §3.3 #7 退貨出庫業務語意：
> 觸發：退給供應商（NX02 PR）/ 退調貨來源（同行）
> 動作：**撿貨 + 包貨 + 退送**
> source = R

實際 schema：
- `Nx03Pk.triggerSource VarChar(1)` enum 註解只 **S=銷貨單SO / T=調撥單ST**（line 2431）
- `Nx03PkItem` 0 條 `refSrId / refPrId` FK（line 2466~2509）
- → **schema 不支援退貨來源**

### 4.2 衝突影響

若 Phase 5 commit 4~6 撿包 SOP service 落地、會遇：
- 退貨出庫（PR / SR 反向 / 同行退調）**無法走撿包 SOP**
- 強行用 `triggerSource='R'` 違反 schema 註解 enum、又無 ref FK
- → 退貨出庫必須走別路徑（直接 applyQtyOutWithLedger、跳過撿包）

實際上、Phase 5 commit 2（PR 過帳）已落地「直接 applyQtyOutWithLedger」、跳過撿包 ✓。Phase 4 commit 2（SR 入庫）也是直接 helper、跳過撿包。

→ **既有 service 已暗自跳過撿包、撿包 SOP 真實只覆蓋 SO + ST 兩種觸發**。

### 4.3 拍板 Q（送 Alex/Crown）

**Q-Phase5-MV1 退貨撿包支援策略**：

| 選項 | 範圍 | 業務影響 |
|---|---|---|
| **A** | 補 schema：`triggerSource` 加 'R'、PkItem 加 `refSrId/refPrId` FK + reverse | 新 M5 migration、3~4 commit |
| **B** | overview §5.1 修正：退貨**不**走撿包 SOP、直接 helper 出庫（對齊既有 service）| 文件修、無 schema 動 |
| **C** | 拆分：PR / SR / 同行退調 三種退貨各自決定（如同行退調走撿包、PR 直接出）| 中、需 Alex 細化業務 |
| **D** | Hank 揭露其他 | — |

**Hank 推薦 B**：
- 既有 service 早已跳過撿包（無 break）
- 退貨業務上「退給供應商 = 物流由 NX06 處理、不需要 NX03 倉內撿包流程」、實際業界做法
- overview §5.1 「退貨」字眼可能是過度泛化、實際業務未必需要 NX03 撿包
- 對齊 #13 強制溯源原則：source=R 寫 ledger 即可、撿包是 fulfillment 細節
- 撿包 SOP service 範圍 = SO + ST 兩種觸發即可、commit 4~6 範圍縮但乾淨

### 4.4 Q-Phase5-MV2 撿包 SOP commit 範圍確認

依 Crown 拍 MV1 結果：

| Q-MV1 結果 | commit 4~6 範圍 |
|---|---|
| **A** 補 schema | commit 4 前先 M5 migration、commit 4~6 涵蓋 SO/ST/SR/PR 4 種 |
| **B** 不補（推薦）| commit 4~6 涵蓋 SO/ST 2 種、退貨保持既有直接出庫 |
| **C** 拆分 | Alex 細化後決定 |

---

## §5 mini-verify 結論

### 5.1 schema 充足度

| 業務情境 | schema 支援 | 備註 |
|---|---|---|
| SO 撿貨/包貨/配送（D/P/C 分流）| ✅ Pk.refSoId/refSoItemId + Pl + Parcel + DN 接點 | 完整 |
| ST 撿貨/包貨/配送他倉 | ✅ Pk.refStId + Pl + Parcel (toWarehouseId) | 完整 |
| 退貨撿包（PR/SR）| ❌ 0 FK 支援 | **Q-MV1 拍板**|

### 5.2 NX06 DN 接點

✅ 已通：`Nx06DnItem.parcelId` FK 既有

### 5.3 自取/寄貨/配送三選一分流

✅ 三 type 都在 `parcelType / pkDeliveryType / plType` enum：
- 自取 P → 不涉 NX06、用 pickupCode (BX) 客戶報號取貨
- 寄貨 C → `toPartnerId` FK 第三方物流（partner_type=T、application 自律）+ logisticsTrackingNo
- 配送 D → 產生 `Nx06Dn` + `Nx06DnItem.parcelId` 接通 ✓

---

## §6 stop 報告

依 Crown 紀律「若 mini-verify 揭露 schema 不足 → Hank stop、列拍板 Q」。

**stop 等待**：
- Q-Phase5-MV1 退貨撿包支援策略（A/B/C/D）
- Q-Phase5-MV2 commit 4~6 範圍確認（依 MV1 結果）

**等 Crown 拍板** → 進 commit 4 Pk service。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
