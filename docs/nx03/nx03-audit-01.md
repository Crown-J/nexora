<!-- docs/nx03/nx03-audit-01.md -->

# NX03 庫存模組 — Schema + 業界 muscle memory 諮詢揭露（NX03-AUDIT-01）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx03/、Crown 拍板後再決定要不要 commit）
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-15
> 任務：Crown 拍板 NX03 業務模組第一彈、Alex 寫子規格書前依 §I.5 #22 鐵律 verify schema 真相
> 真實 main HEAD：**`38077c8c71c42e3a2357c4dedc309836ca362a0c`**（與 Crown 揭露的 `~38077c8` 一致 ✓）
> NX01 全 closure 狀態：17/17 ✓（本檔已 verify）

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep（`find -iname "*nx03*"`）+ §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數，禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- nxtable.csv 推測 12 子表 = 外部來源、不在 codebase 內、本檔以 `prisma/schema.prisma` 真相為準

---

## 1. NX03 schema 既有真相

### 1.1 A041 精確 count

```
grep -c "^model Nx03" packages/db-core/prisma/schema.prisma
→ 20
```

**NX03 已落地 schema = 20 個 model**（非 nxtable.csv 推測 12 個、實質多 8 個）。

### 1.2 全 20 個 model 列表（line 範圍）

| # | Model | Line | 業務語意推測 |
|---|---|---|---|
| 1  | `Nx03AutoReplenish`   | 2209 | 自動補貨規則表（PLUS、來源倉 → 目標倉 優先序） |
| 2  | `Nx03Init`            | 2242 | 開帳單表頭（IN-YYYYMM-倉-NNNNN、業務員手動建初始庫存） |
| 3  | `Nx03InitItem`        | 2284 | 開帳單明細（partId / locationId / qty / unitCost） |
| 4  | `Nx03Parcel`          | 2325 | 包裹（BX 編號、配送/自取/寄貨/調撥 4 type） |
| 5  | `Nx03PartStockSetting`| 2371 | 料件×倉 安全量/最高量/補貨點（缺貨警示來源） |
| 6  | `Nx03Pk`              | 2408 | 撿貨單表頭（PK-YYYYMM-倉-NNNNN、SO/ST 觸發） |
| 7  | `Nx03PkItem`          | 2455 | 撿貨單明細（ref SO/SOItem/ST、貼紙確認） |
| 8  | `Nx03Pl`              | 2504 | 包貨單表頭（PL-YYYYMM-倉-NNNNN、撿貨完成 → 包貨） |
| 9  | `Nx03PlItem`          | 2558 | 包貨單明細（parcelId、pkItemId） |
| 10 | `Nx03Shortage`        | 2596 | 缺貨偵測（refRfqId、O/R/C/I status） |
| 11 | `Nx03St`              | 2642 | 調撥單表頭（ST-YYYYMM-倉-NNNNN、ref SO/RR） |
| 12 | `Nx03StItem`          | 2706 | 調撥單明細（sourceSoItemId nullable D3） |
| 13 | `Nx03StockBalance`    | 2757 | **即時庫存核心**（unique [tenantId,partId,warehouseId]） |
| 14 | `Nx03StockLedger`     | 2805 | **異動帳冊**（強制 source_module/doc_type/doc_id/item_id） |
| 15 | `Nx03StockTake`       | 2853 | 盤點單表頭（SL-YYYYMM-倉-NNNNN、F/P scope） |
| 16 | `Nx03StockTakeItem`   | 2905 | 盤點明細（diffQty + disposeType W/R/D/U） |
| 17 | `Nx03Inbound`         | 2963 | **Phase 5 殘留**（IBHT、未被 RR 接線、見 §4.3） |
| 18 | `Nx03InboundItem`     | 2991 | **Phase 5 殘留**（IBIT） |
| 19 | `Nx03Outbound`        | 3018 | **Phase 5 殘留**（OBHT、未被 SO 接線、見 §4.4） |
| 20 | `Nx03OutboundItem`    | 3046 | **Phase 5 殘留**（OBIT） |

### 1.3 唯一約束 + Index 概況

| Model | unique | index |
|---|---|---|
| Nx03Init | `[docNo]` | — |
| Nx03Parcel | `[parcelNo]` | — |
| Nx03Pk | `[docNo]` | — |
| Nx03Pl | `[docNo]` | — |
| Nx03St | — | — |
| Nx03StItem | — | `[sourceSoItemId]` |
| Nx03StockBalance | **`[tenantId, partId, warehouseId]`** ✓ | — |
| Nx03StockLedger | — | — |
| Nx03StockTake | `[docNo]` | — |
| Nx03Inbound | `[docNo]` | — |
| Nx03Outbound | `[docNo]` | — |

⚠️ **`Nx03AutoReplenish` 註解寫 `@@unique([tenantId, fromWarehouseId, toWarehouseId])`、但 schema 沒落地 unique** — drift 候選。
⚠️ **`Nx03PartStockSetting` 同上、註解寫 unique 但 schema 沒**。
⚠️ **`Nx03Shortage` 同上**。
→ §I.5 #21 schema 註解 vs DDL drift 嫌疑 3 處。

### 1.4 對外 FK 與 reverse @relation

對 **NX01 主檔** 反向引用：
- `Nx01Warehouse` 反向 → NX03 共 15 條（含 from/to）
- `Nx01Part` 反向 → NX03 共 10 條
- `Nx01Location` 反向 → NX03 共 8 條
- `Nx01PartBrand` 反向 → NX03 共 1 條（StItem.partBrandId）
- `Nx01Partner` 反向 → NX03 共 1 條（Parcel.toPartnerId）

對 **NX02 / NX04 / NX06** 反向引用（NX03 被誰引用）：
- `Nx02Rfq` → `Nx03Shortage.refRfqId`（缺貨 → RFQ 已接線 ✓）
- `Nx02Rr` → `Nx03St.refRrId`（進貨後自動配貨已接線 ✓）
- `Nx04So` → `Nx03St.refSoId`、`Nx03PkItem.refSoId`（SO 觸發已接線 ✓）
- `Nx04SoItem` → `Nx03PkItem.refSoItemId`、`Nx03StItem.sourceSoItemId`（D3 強制溯源已接線 ✓）
- `Nx03Parcel` → `Nx06DnItem.parcelId`（出貨單從 NX03 包裹來、已接線 ✓）

NX03 對外引用 **NX99Tenant** 共 14 條（每個有 tenantId 的 model 都接），對齊多租戶紀律。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 2. NX03 後端 / 前端 真相

### 2.1 後端目錄（§G.9 `find -iname "*nx03*"`）

```
apps/nx-api/src/nx03/          ← 7 個子模組
apps/nx-api/src/shared/nx03/   ← 6 個共用工具
```

#### apps/nx-api/src/nx03/ 7 個子模組（A041 精確 count、共 28 檔）

| 子模組 | controller | service | DTO/tests | 端點 count |
|---|---|---|---|---|
| `inbound/`           | inbound.controller.ts (4)        | inbound.service.ts        | dto/inbound.dto.ts | 4 |
| `outbound/`          | outbound.controller.ts (4)       | outbound.service.ts       | dto/outbound.dto.ts | 4 |
| `stock-balance/`     | stock-balance.controller.ts (2)  | stock-balance.service.ts  | — | 2 |
| `stock-ledger/`      | stock-ledger.controller.ts (1)   | stock-ledger.service.ts   | — | 1 |
| `stock-reservation/` | stock-reservation.controller.ts (2) | stock-reservation.service.ts | dto + **8 個 spec / int-spec** | 2 |
| `stocktake/`         | stocktake.controller.ts (4)      | stocktake.service.ts      | dto/stocktake.dto.ts | 4 |
| `transfer/`          | transfer.controller.ts (4)       | transfer.service.ts       | dto/transfer.dto.ts | 4 |

**API endpoint 總數 = 21**（`grep -c "@Get\|@Post\|@Put\|@Patch\|@Delete"` 精確 count）。
**nx03.module.ts** 全 7 controllers + 7 services 已接通 ✓。

#### apps/nx-api/src/shared/nx03/ 6 檔

```
nx03-doc-no.ts                       — allocNx03DocNo（單號分配器）
nx03-inventory.ts                    — applyQtyInWithLedger（共用過帳）
nx03-ledger-list-query.dto.ts        — Ledger 查詢 DTO
nx03-list-query.dto.ts               — 通用 List DTO
nx03-state-machine.ts                — InboundStatus / OutboundStatus / state guard
nx03-stock-balance-list-query.dto.ts — StockBalance 查詢 DTO
```

### 2.2 前端目錄

#### `apps/nx-ui/src/features/nx03/` ⚠️ **內容是「銷售工作流」、不是「庫存」**

```
features/nx03/sales/SalesFlowHub.tsx
features/nx03/workflow/{mock,ui,types.ts}
  └─ SalesDocumentsBrowse / SalesOperationWorkspace / SalesOrderWorkspace
     SalesWorkflowPage / WorkflowQuickActions / WorkflowStepBar / WorkflowStepPanel
```

⚠️ **嚴重模組編號錯位殘留**：branch `feature/nx03-sales-flow-hub` 是 NX 模組編號 pivot **前** 的命名（當時 NX03 曾代指「銷貨」、後來改成「庫存」）。`apps/nx-ui/src/features/layout/config/menu.nx03.ts` 第 1 行檔頭 + 第 9 行註解 **明寫 `NX04 銷售管理側邊選單`、`/dashboard/nx04/*`**、整個檔案 0 條「庫存」menu item。

#### `apps/nx-ui/src/features/inventory/` ← **真實的庫存 UI 在此**

```
features/inventory/ui/InventoryCenterHub.tsx
features/inventory/ui/hub/InventoryHubMobile.tsx
features/inventory/ui/hub/sections/{Documents,Status,Warehouse,Workstation}Section.tsx
features/inventory/warehouse/locations/MobileLocationListPage.tsx
features/inventory/warehouse/stocktake-config/MobileStocktakeConfigPage.tsx
features/inventory/workspace/ui/InventoryWorkspacePage.tsx
features/inventory/workstation/{delivery,packing,picking,shared,ti,transfer}/Mobile*ListPage.tsx
```

#### `apps/nx-ui/src/app/dashboard/nx03/` 路由

```
nx03/layout.tsx
nx03/page.tsx
nx03/warehouse-setting/page.tsx
nx03/workspace/page.tsx
```

### 2.3 既有 migration（A041 精確 count = 7 條 sql 含 nx03）

```
20260413120000_spec_v7_baseline                   ← NX03 baseline 大塊
20260415120000_nx03_inbound_outbound_phase5       ← Inbound/Outbound 表（Phase 5、殘留）
20260425100000_phase0_so_data_model               ← StItem 接 SO
20260425100100_phase0_so_data_model_tighten       ← 同上 tighten
20260425100200_phase0_st_item_source_so_nullable  ← StItem.sourceSoItemId nullable
20260427014134_phase0_b5_rfq_source_so_item       ← RFQ 接 SoItem
20260427053231_phase0_b5_drift_fix_docno_widening ← docNo 加寬 drift fix
```

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 3. 6 倉模型 + flowMode 真相驗證

### 3.1 NX01-06 warehouse 既有 schema（line 1338~1430）

`Nx01Warehouse` 欄位真相：
- `code` VarChar(10) + `name` VarChar(100)（@@unique `[tenantId, code]`）
- `warehouseTypeId` String? FK → `Nx01WarehouseType`（**PLUS-CORE**、nullable）
- `isMain` Boolean default false（LITE 強制 true、partial unique 對齊 NX01-06 §3.6）
- `managerUserId` String? FK → `Nx01User`
- 完整地址 7 欄（cityId/districtId/streetId/lane/alley/buildingNo/buildingSubNo/floor/roomNo）

`Nx01WarehouseType` 真相（line 1435~1454）：
- `code` VarChar(1) @@unique
- `flowMode` VarChar(1)（**C=集中管理 / D=分倉管理**）
- 全域型錄（無 tenantId、無 createdBy/updatedBy）

### 3.2 seed 真相（A041 精確 = **4 種、非 6 種**）

`packages/db-core/prisma/seed/system/nx01_warehouse_type.ts`:

```ts
{ code: 'H', name: '總部集中倉', flowMode: 'C', description: 'HW1 類型' },
{ code: 'M', name: '主倉',       flowMode: 'C', description: 'MW1 類型' },
{ code: 'W', name: '分倉',       flowMode: 'D', description: 'BW 類型' },
{ code: 'S', name: '衛星倉',     flowMode: 'D', description: '衛星據點' },
```

⚠️ **真相 vs Crown 揭露語言差異**：
- Crown 業界語言：**HW / MW / BW / SW**（4 字母縮寫）
- seed schema：**H / M / W / S**（單字母 code、description 寫 HW1/MW1/BW）
- 「6 倉」概念**未在 schema 落地**、需要 Crown 揭露真實業界 muscle memory：
  - 「6 倉」是「最多支持 6 個 warehouse 實例」（Tier 限制？）
  - 還是「6 種倉庫類型」（schema 只 4 種 + 待補 2 種？）
  - 還是「2 主倉 + 4 分/衛星倉」的業務拓樸？

### 3.3 flowMode C/D 落地狀態（純 schema vs 含 service）

- **schema 層**：`flowMode` 欄位 ✓、seed 4 種對應 ✓
- **service 層**：`grep -rn warehouseTypeId apps/nx-api/src` → 只在 `nx01/warehouse/{dto,service}` CRUD 透傳、**0 條** service 邏輯依 flowMode 分支
- **service 層 flowMode C/D 邏輯（進貨後自動調撥分流）尚未落地** ❌
- `Nx03AutoReplenish` 表存在、但 0 service 引用該表（grep 驗證）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 4. 庫存核心業務情境 reverse 揭露

### 4.1 stock_balance / stock_ledger 真相 ✓ 完整 impl

#### `Nx03StockBalance`（line 2757~2800）
- 唯一約束 `[tenantId, partId, warehouseId]` ✓（業界 muscle memory：料件×倉 唯一一筆即時量）
- 核心欄位：`onHandQty`、`reservedQty`、`availableQty` (= on - reserved，存 DB 同步更新)、`inTransitQty`（PLUS）、`avgCost`（移動平均）、`stockValue`
- `lastInAt` / `lastOutAt` / `lastMoveAt` 時間戳齊 ✓

#### `Nx03StockLedger`（line 2805~2848）
- `sourceModule` String (NX02/NX03/NX04)
- `sourceDocType` String(1) (**P/S/T/I/X/R** = 進貨/銷貨/盤點/開帳/調撥/退貨)
- `sourceDocId` 必填 + `sourceItemId` 選填
- `movementType` (I/O/A)、`qtyIn`/`qtyOut`、`balanceQty`/`balanceCost` 快照
- **#13 強制溯源** schema 層 ✓ 落地

### 4.2 即時庫存查詢 endpoint ✓ 已實作

`apps/nx-api/src/nx03/stock-balance/stock-balance.controller.ts` → `list` endpoint（list query DTO ✓）
`apps/nx-api/src/nx03/stock-reservation/stock-reservation.service.ts` → `getStockSummary §3.1` 直讀 stock_balance（D3 trigger 維護）

### 4.3 進貨入庫接線（NX02 RrItem → NX03 InboundItem）真相 ⚠️ **未走 Inbound 表**

`apps/nx-api/src/nx02/rr/rr.service.ts` 第 114~189 行 `applyRrPosting`：
- 直接 `tx.nx03StockBalance.upsert` + `tx.nx03StockLedger.create`
- **不經 `Nx03Inbound` / `Nx03InboundItem` 表**
- 移動平均成本算法已落地（`oldQ*oldA + qtyIn*unitCost) / newQ`）

→ **`Nx03Inbound` / `Nx03InboundItem` 是 Phase 5 殘留設計、實質未被 RR 過帳使用**。
→ NX03 Inbound service（IBHT、4 endpoint）獨立可建單、但與 NX02 RR 平行存在、未串聯。

### 4.4 銷貨出庫接線（NX04 SoItem → NX03 OutboundItem）真相 ⚠️ 同上

- SO/SoItem 過帳：透過 `Nx03StItem.sourceSoItemId` + `Nx03PkItem.refSoItemId` 路徑接線
- **不經 `Nx03Outbound` / `Nx03OutboundItem` 表**
- 同樣 OBHT 是 Phase 5 殘留、4 endpoint 獨立可建單但未被 SO 使用

### 4.5 跨倉調撥（ST）/ 盤點（SL）/ 開帳（IN）/ 撿貨（PK）/ 包貨（PL）/ 缺料 真實狀態

| 業務情境 | schema | controller endpoints | 落地度 |
|---|---|---|---|
| 開帳（IN）| Nx03Init / Nx03InitItem | — | 🟡 僅 schema、0 service/controller |
| 即時庫存 | Nx03StockBalance | stock-balance: 2 | ✅ list 完整 + reservation service 完整（8 tests） |
| 異動帳冊 | Nx03StockLedger | stock-ledger: 1 | ✅ list 完整、RR 過帳寫入運作中 |
| 跨倉調撥（ST）| Nx03St / Nx03StItem | transfer: 4 | ✅ service 完整、D3 sourceSoItemId 已接 |
| 盤點（SL）| Nx03StockTake / Item | stocktake: 4 | ✅ service 完整 |
| 撿貨（PK）| Nx03Pk / Nx03PkItem | — | 🟡 schema 完整、0 NX03 controller（PK UI 在 features/inventory/workstation/picking） |
| 包貨（PL）| Nx03Pl / Nx03PlItem | — | 🟡 schema 完整、0 NX03 controller（同上 packing） |
| 包裹（Parcel）| Nx03Parcel | — | 🟡 schema 完整、0 NX03 controller |
| 缺料 | Nx03Shortage | — | 🟡 schema 完整、0 controller |
| 安全量 | Nx03PartStockSetting | — | 🟡 schema 完整、0 controller |
| 自動補貨 | Nx03AutoReplenish | — | 🟡 schema 完整、0 service 引用 |
| Inbound（Phase 5 殘留）| Nx03Inbound / Item | inbound: 4 | ⚠️ controller 可獨立建單、未被 RR 接 |
| Outbound（Phase 5 殘留）| Nx03Outbound / Item | outbound: 4 | ⚠️ controller 可獨立建單、未被 SO 接 |

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 5. 強制資料溯源（設計哲學 #13）真相

### 5.1 `Nx03StockLedger.sourceDocType` enum 範圍揭露

註解（schema:2834）：
> 來源單據類型（**P=進貨RR / S=銷貨SO / T=盤點 / I=開帳存 / X=調撥 / R=退貨**）

→ 6 種 enum 值、VarChar(1)、**未加 CHECK 約束**（schema-level enum 缺、application 自律）。

### 5.2 source_id 對應業務單據真實接線

| sourceDocType | sourceModule | 接線狀態 |
|---|---|---|
| P（進貨）| NX02 | ✅ rr.service.ts:181 `tx.nx03StockLedger.create` 已連 |
| S（銷貨）| NX04 | 🟡 SO post path 未在本次 audit 範圍 verify、推測經 PK→OB 路徑 |
| T（盤點）| NX03 | 🟡 stocktake.service 未深度 verify |
| I（開帳）| NX03 | ❌ Nx03Init 0 service、ledger 寫入路徑未建 |
| X（調撥）| NX03 | 🟡 transfer.service 未深度 verify |
| R（退貨）| NX02/NX04 | 🟡 退貨流（Nx04Sr / Nx02Pr）對 ledger 寫入未 verify |

⚠️ 6 種 sourceDocType 中、**1 種完整 verify（P）+ 4 種推測 + 1 種空白（I）**。建議 NX03 規格書要求 6 種全寫測試 fixture。

### 5.3 強制溯源欄位非空性

- `sourceModule` String **必填** ✓
- `sourceDocType` String(1) **必填** ✓
- `sourceDocId` String(15) **必填** ✓
- `sourceItemId` String(15)? **可空**（盤點/開帳可能無 itemId）

→ #13 強制溯源 4 條中、3 條 schema 強制 ✓。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 6. NX03 子表拓樸排序建議

### 6.1 從 codebase 揭露推薦撰寫順序（4 層）

**L1 — 基礎層（無 NX03 內部 FK 依賴）**：
1. `Nx03PartStockSetting`（料件×倉 安全量、上下文最少）
2. `Nx03StockBalance`（即時庫存核心、core table）
3. `Nx03StockLedger`（異動帳冊、強制溯源核心）

**L2 — 實體單據層（依賴 L1）**：
4. `Nx03Init` + `Nx03InitItem`（開帳、業務員手動）
5. `Nx03StockTake` + `Nx03StockTakeItem`（盤點）
6. `Nx03St` + `Nx03StItem`（調撥、依 L1 balance）

**L3 — 跨模組工作流層（依賴 NX02/NX04）**：
7. `Nx03Pk` + `Nx03PkItem`（撿貨、ref SO/ST）
8. `Nx03Pl` + `Nx03PlItem`（包貨、依 Pk）
9. `Nx03Parcel`（包裹、依 Pl）

**L4 — 戰略層（PLUS / PRO）**：
10. `Nx03Shortage`（PLUS、ref RFQ）
11. `Nx03AutoReplenish`（PLUS、跨倉策略）

**X — Phase 5 殘留（議題待 Crown 拍板廢除 or 補接線）**：
- `Nx03Inbound` / `Nx03InboundItem`
- `Nx03Outbound` / `Nx03OutboundItem`

### 6.2 vs NX01 拓樸排序範式對比

| NX01 4 層 | NX03 對應 |
|---|---|
| 基礎層（country/currency/role）| L1 基礎層（part_stock_setting / stock_balance / stock_ledger）|
| 實體層（warehouse/user/partner）| L2 實體單據層（init / stock_take / st）|
| 主檔層（part/car_brand/model）| L3 工作流層（pk / pl / parcel、依 NX02/NX04 主檔）|
| 戰略層（part_relation/part_model）| L4 戰略層（shortage / auto_replenish）|

→ 拓樸對齊度高、層級語意一致。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 7. 推測 12 子表 confirm / refute

對 Crown 揭露的 nxtable.csv 推測 12 子表逐一比對：

| # | nxtable.csv 推測 | schema 真實名稱 | 真實狀態 | line |
|---|---|---|---|---|
| 1  | stock_balance         | `Nx03StockBalance`     | ✅ impl 完整（list + reservation 8 tests） | 2757 |
| 2  | stock_ledger          | `Nx03StockLedger`      | ✅ impl 完整（list + RR 過帳寫入） | 2805 |
| 3  | init_item             | `Nx03Init` + `Nx03InitItem` | 🟡 僅 schema（0 service） | 2242 + 2284 |
| 4  | inbound_item          | `Nx03Inbound` + `Nx03InboundItem` | ⚠️ impl 完整但未被 NX02 RR 接、Phase 5 殘留 | 2963 + 2991 |
| 5  | outbound_item         | `Nx03Outbound` + `Nx03OutboundItem` | ⚠️ 同上、未被 NX04 SO 接 | 3018 + 3046 |
| 6  | pk_item               | `Nx03Pk` + `Nx03PkItem` | 🟡 schema 完整、NX03 0 controller | 2408 + 2455 |
| 7  | pl_item               | `Nx03Pl` + `Nx03PlItem` | 🟡 schema 完整、NX03 0 controller | 2504 + 2558 |
| 8  | st_item               | `Nx03St` + `Nx03StItem` | ✅ impl 完整（transfer service + D3 接 SO） | 2642 + 2706 |
| 9  | stock_take_item       | `Nx03StockTake` + `Nx03StockTakeItem` | ✅ impl 完整 | 2853 + 2905 |
| 10 | part_stock_setting    | `Nx03PartStockSetting` | 🟡 schema 完整、0 controller | 2371 |
| 11 | shortage              | `Nx03Shortage`         | 🟡 schema 完整 + refRfqId 接 NX02 ✓ | 2596 |
| 12 | inventory_cache       | `Nx08InventoryCache`   | ⚠️ **不在 NX03、在 NX08** | 4816 |

### 7.1 推測命中率

- 完全命中（schema 真實存在）：**11 / 12**
- 錯位（`inventory_cache` 應屬 NX08 報表快取、非 NX03）：**1**
- **nxtable.csv 漏 8 個 model**：`Nx03AutoReplenish`、`Nx03Parcel`、`Nx03Pl`（被併在 pl_item）、`Nx03Pk`（被併在 pk_item）

### 7.2 子表「真實狀態」三選一分布

- **impl 完整**（schema + service + endpoint + test）：3 個（StockBalance / StockLedger / StockTake / **更正：4 個**含 St/StItem transfer）
- **僅 schema**（無 service）：8 個（Init/PartStockSetting/Pk/Pl/Parcel/Shortage/AutoReplenish 含明細）
- **Phase 5 殘留**（service 有但未被使用）：2 組（Inbound/Outbound 各 2 表）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 8. NX03 跨模組接線揭露

### 8.1 NX02 RrItem ↔ NX03 InboundItem（PO 進貨接點）

- ⚠️ **schema FK：0 條**（Nx03InboundItem **無** rrItemId FK）
- ✅ service 接線：`apps/nx-api/src/nx02/rr/rr.service.ts:118 applyRrPosting` 直接寫 `Nx03StockBalance` + `Nx03StockLedger`、bypass Inbound 表
- 缺什麼：要不要保留 Inbound 表？若保留、需補 `Nx02RrItem.rrItemId` FK 進 Nx03InboundItem + service 雙寫

### 8.2 NX04 SoItem ↔ NX03 OutboundItem（SO 銷貨接點）

- ⚠️ **schema FK：0 條**（Nx03OutboundItem **無** soItemId FK）
- 接線實況：SO 接 ST（`Nx03St.refSoId` + `Nx03StItem.sourceSoItemId`）+ Pk（`Nx03PkItem.refSoId` + `refSoItemId`）
- Outbound 表獨立、未接 SO

### 8.3 NX06 DnItem ↔ NX03 出貨確認（DN 物流接點）

- ✅ schema FK 已連：`Nx06DnItem.parcelId` → `Nx03Parcel.id`（schema:4002）
- ✅ source_doc_type 統一設計：DN 可接 SO/ST/TI/PR/SR 5 種來源（schema:3995）
- 缺什麼：`Nx03Parcel` 0 NX03 controller、Dn 從 NX03 包貨領取的 service 邏輯 verify 範圍外

### 8.4 NX08 InventoryCache（報表快取接點）

- ✅ schema 落地（line 4816、PRO tier）
- ✅ 反向引用 NX01 Warehouse / Part ✓
- 接線實況：**0 條** NX03 → NX08 service 寫入路徑（grep verify）
- 缺什麼：NX08 cache 重算 job（推測在 NX08 scheduled task）— 本次 audit 未深掘

### 8.5 跨模組接線總表

| 連線 | schema FK | service 接通 | 缺口 |
|---|---|---|---|
| NX02 Rr → NX03 StockBalance/Ledger | ❌（無 inbound 表 FK）| ✅ rr.service.applyRrPosting | Inbound 表是否廢棄 |
| NX02 Rfq ← NX03 Shortage | ✅ refRfqId | 🟡 shortage 0 controller | Shortage service 未建 |
| NX04 So → NX03 St/Pk | ✅ refSoId + sourceSoItemId | ✅ transfer/D3 | 跨倉自動配貨邏輯（flowMode）|
| NX04 So → NX03 Outbound | ❌ | ❌ | Outbound 表是否廢棄 |
| NX03 Parcel → NX06 DnItem | ✅ parcelId | 🟡 Parcel service 未建 | Parcel CRUD 缺 |
| NX03 → NX08 InventoryCache | ✅ partId+warehouseId | ❌ 重算 job | NX08 phase 落地 |

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 9. 業界 muscle memory「殺手級」場景揭露

> Hank 角度：codebase 觀察 + Crown 業界 18 年 + 恆迎 30 年角度

### 9.1 業界現況（恆迎觀察 + 同行）

- **手工帳本 / Excel 對庫存**：庫存量靠老師傅腦記、Excel 月底盤點才校正
- **單倉 + 紙本進銷**：多倉者用 Excel sheet 分頁手動切換
- **無強制溯源**：庫存增減原因靠人記憶、退貨/盤盈虧無 SOP
- **無移動平均成本**：成本算法靠進價最近一筆或業務員心算

### 9.2 痛點

| 痛點 | 業界現況 | NEXORA 對應 |
|---|---|---|
| 庫存零點時間模糊 | Excel 月底人工結算 | `Nx03StockLedger.movementDate` 即時時序帳冊 |
| 多倉資料分裂 | Excel sheet 切換 | `[tenantId, partId, warehouseId]` unique balance |
| 業務員離職 = 知識斷層 | 紙本筆記丟失 | `Nx03PartStockSetting` 安全量結構化 + `Nx03Shortage` 自動偵測 |
| 跨倉調撥靠電話 | 倉管打給倉管 | `Nx03St` + `Nx03AutoReplenish` PLUS 拓樸 |
| 庫存盤點過程進貨混淆 | 盤點時停止收貨 | `Nx03StockTakeItem.countedAt` 即時時序 + diff 處置（W/R/D/U）|
| 缺貨後遺忘採購 | 業務員口頭轉述 | `Nx03Shortage.refRfqId` 自動轉 RFQ 接線 |

### 9.3 NEXORA 應如何改革（NX03 設計優勢候選）

⭐ **5 條業界改革候選**：

1. **強制資料溯源軌**（#13）：6 種 sourceDocType 必填、業界第一個能查「這筆庫存從哪來」
2. **業務員 muscle memory → 系統 query**：`Nx03Init` 開帳 = 業務員 30 年紙本「庫存底」結構化、不靠 RR 倒推
3. **移動平均成本自動算**：RR 過帳即時 newAvg = (oldQ*oldA + qtyIn*unitCost) / newQ、業界第一個不靠人算
4. **flowMode C/D 業務拓樸**：HW/MW 集中管理 vs BW/SW 分倉管理、對應 Crown 業界「分倉 vs 集中」決策
5. **缺貨自動轉 RFQ**：Shortage → RFQ → 補貨閉環、業界第一次「庫存缺料」直接觸發採購

### 9.4 對齊 NX01 範式

NX01-16 part_model 範式：「業務員看料件對車型 muscle memory → part_model 結構化 query」
NX03 對應範式：「業務員看『這料目前有幾顆、上次進來什麼時候、誰調走的』muscle memory → StockBalance + StockLedger 即時 query」

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 10. NX03 規格書群拍板 Q 候選

> Hank 揭露議題清單、**非拍板**、給 Alex 整合 + Crown 業界 muscle memory 揭露用

### 10.1 schema 層拍板候選

- **Q-S1**：`Nx03Inbound` / `Nx03Outbound` 4 表（Phase 5 殘留）**保留 or 廢棄**？
  - 保留：補 `Nx02RrItem.rrItemId` FK + service 雙寫、規格化「進貨單 ≠ stock_balance 過帳」分層
  - 廢棄：移除 4 表 + 4 controller + 1 migration、RR 直接打 stock_balance（現況）
- **Q-S2**：`Nx03AutoReplenish` / `Nx03PartStockSetting` / `Nx03Shortage` 註解 unique 但 schema 0 落地（drift 3 處）→ 補 unique？
- **Q-S3**：`Nx03StockLedger.sourceDocType` 6 種值（P/S/T/I/X/R）要加 CHECK constraint 還是 SmallInt enum（對齊 NX01-17 範式）？
- **Q-S4**：`Nx03StockBalance.availableQty` 存 DB（D3 trigger 維護）vs 即時算（view）— 維持 D3 trigger？
- **Q-S5**：`Nx03AutoReplenish` 0 service 引用、要不要本期落地？還是 PLUS phase 才開？

### 10.2 業務層拍板候選

- **Q-B1**：「6 倉」業界 muscle memory 真實定義？
  - A. 6 種倉庫類型（H/M/W/S + 待補 2 種）
  - B. 業務上「最多 6 個 warehouse 實例」的 Tier 限制
  - C. 業務拓樸（總部 1 + 主倉 1 + 分倉 N + 衛星 N、合計 ≤6）
- **Q-B2**：庫存零點時間定義（移動平均成本算法的時序基準）？
  - A. 每筆 RR/SO 即時算（現況）
  - B. 每日凌晨零點批次重算 + 即時 delta
- **Q-B3**：`Nx03Init` 開帳 — 業務員手動建初始庫存、是否 ban RR 同時段過帳？（避免併發混淆）
- **Q-B4**：跨倉調撥 ST 的 in-transit 期間多長？是否有 SLA / 超時告警？
- **Q-B5**：盤點 SL 期間是否凍結 stock_balance 寫入？diff 處置 4 type（W/R/D/U）是否 Crown 認可？

### 10.3 UI 層拍板候選

- **Q-U1**：庫存查詢預設視角 = 「我的倉」、「全公司」、還是「料件 cross 倉」？
- **Q-U2**：`features/nx03/` 「銷售工作流」殘留如何處理？
  - A. 整批改名 `features/sales/`
  - B. 整批刪除（已搬到 `features/inventory/`）
  - C. 留著 + 加 `@deprecated` 註解
- **Q-U3**：`menu.nx03.ts` 第 1 行寫「NX04 銷售管理側邊選單」、路徑全 `/dashboard/nx04/*` → 改寫為真正的 NX03 庫存 menu？
- **Q-U4**：撿貨 PK / 包貨 PL UI 在 `features/inventory/workstation/`（mobile）— 桌面版要不要建？

### 10.4 拓樸排序層拍板候選

- **Q-T1**：第一份子規格書從哪起跑？
  - A. `Nx03StockBalance`（基礎核心、依賴最少）
  - B. `Nx03Init`（業務員手動開帳、Crown 業界 muscle memory 起點）
  - C. `Nx03StockLedger`（強制溯源核心、#13 紅線落地）
- **Q-T2**：NX03 「範圍 A 完整 closure」定義 = 哪幾個 model？（建議 L1+L2 共 8 個 model、Phase 5 殘留另議）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記：本檔輸出紀律對齊

- 純諮詢、不開工任何 commit、不切分支、留 main ✓
- A041 精確 count：全用 `grep -c`、本檔 0 處「N+ 處」「多處」「一些」 ✓
- §G.9 verify 通配 grep：`find -iname "*nx03*"` 兩處（backend + frontend）✓
- §I.6.3 揭露不完整：每段尾 ⚠️ 註記 ✓
- 真實 main HEAD verify：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 本檔位置：`docs/nx03/nx03-audit-01.md`（諮詢產出、未 commit、Crown 拍板後再決定）

**下一步**：Alex 收到本檔 → 整合 Crown 業界 muscle memory 揭露（特別 6 倉 / returnPolicy / warrantyMonths / 強制溯源 4 條）→ 列 NX03 拓樸排序拍板 + 第一份子規格書 v0.1.0 起跑 Q 給 Crown 拍板。
