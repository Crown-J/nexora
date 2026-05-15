<!-- docs/nx04/spec/impl/d3-impl_so-schema.md -->
# D3 — SO Data Model 實作 spec

> 文件類型：實作 spec（Hank 對照真實 repo 寫，給自己照著實作 + 給 Alex review）
> 撰寫者：Hank
> 日期：2026-04-25
> 對應意圖：[../intent/so-data-model-intent.md](../intent/so-data-model-intent.md)
> 對照基準：`packages/db-core/prisma/schema.prisma`（main @ 950bf32）
> 狀態：待 Alex review → 拍板後才 prisma migrate dev

---

## 0. 文件性質

這份是把 D3 意圖版 5 條需求對應到**真實 schema** 的實作藍圖。所有表名 / 欄位 / DSL / index 全用 [`packages/db-core/prisma/schema.prisma`](../../../../../packages/db-core/prisma/schema.prisma) 已存在的命名慣例（`gen_*_id()` 函式、`@map("snake_case")`、tenant/creator/updater 三條關聯鐵律等）。

trigger 詳細實作另寫 [`./d3-trigger.md`](./d3-trigger.md)。

---

## 1. 真實 schema 的關鍵發現（會修正 D3 v1 review 的部分判斷）

寫這份前重新讀了一遍 schema.prisma 1825~3700 行（NX02/03/04/06 相關 model），發現 D3 v1 review 時對既有結構**估計不足**，下面三點要先說清楚：

### 1.1 1:N 出貨鍊已存在，不需新建表

真實 schema 的 SO → PK → PL → Parcel → DN 結構：

```
nx04_so (1) ──── (1:1) ──→ nx03_pk
                              │
                              └─(1:N)──→ nx03_pl ─(1:N)──→ nx03_parcel
                                            │                   │
                                            └─ nx03_pl_item ────┤
                                                  │             │
                                                  ▼             ▼
                                            nx03_pk_item    nx06_dn_item.parcel_id
                                                  │
                                                  └─ ref_so_item_id ──→ nx04_so_item
```

**對應 D3 意圖版**：
- 「SO 對 BX 包貨單 1:N」= 真實 PL（一張 PK 拆多張 PL）
- 「BX 對 lineItem 多對多」= 真實 `pl_item.pkItemId → pk_item.refSoItemId → so_item`（中介表派，已實作）
- 「DN 反查 SO」= 真實 `Nx06Dn.sourceSoId`（既有 nullable 欄位）+ `Nx06DnItem.sourceDocType/sourceDocId`（既有，行 3602-3605）

**結論**：D3 v1 講的「nx04_bx 新建表 + relatedLineItemIds[] 陣列」全部不需要。**意圖規格 3.4 已被既有 schema 完整滿足**。

### 1.2 `availableQty` 已經是會計庫存

[`Nx03StockBalance`](../../../../../packages/db-core/prisma/schema.prisma#L2457)（行 2457-2499）既有三欄：
- `onHandQty Decimal(14,4) @default(0)` — 物理庫存（comment 寫「可為負值」但業務上不該負）
- `reservedQty Decimal(14,4) @default(0)` — 已開 SO 但未出庫
- `availableQty Decimal(14,4) @default(0)` — = onHandQty − reservedQty（DB 持久化）

加上 `Nx04SoItem.reservedQty`（行 2978-2979）的註解：「SO建立時立即寫入 stock_balance.reserved_qty」— 既有 application layer 已經在維護「會計庫存」概念。

**意圖規格 3.2「committed_stock」與既有 `availableQty/reservedQty` 業務語意 99% 重疊**：兩者都是「業務看的可承諾量 = 物理 − 已承諾未出」。

D3 v1 review 我表態「拆獨立 `nx03_stock_committed` 表」是基於沒讀清楚現況；現在更務實的做法見 §3.2。

### 1.3 既有 `nx04_so_item.tiId / stId` 已是「補貨來源指標」雛形

[`Nx04SoItem`](../../../../../packages/db-core/prisma/schema.prisma#L2951)（行 2951-3007）：
- `tiId String? @db.VarChar(15) @map("ti_id")` 行 2995 — 同行調貨單 FK
- `stId String? @db.VarChar(15) @map("st_id")` 行 2997 — 自倉調撥單 FK
- `itemStatus String @db.VarChar(2) @default("WP")` 行 2992-2993 — 11 值單欄狀態

D3 意圖版的「補貨來源 4 種」對應：
- self → 兩個 FK 都 NULL
- transfer → stId NOT NULL
- inquiry → tiId NOT NULL
- co → 新增 `coId` NOT NULL（CO 表新建）

**結論**：意圖規格 3.1 走「多欄 FK + type 判別欄」派，跟既有結構完全對齊。

---

## 2. 對 7 個開放問題的工程決定

| # | 意圖版 §6 開放問題 | 我的決定 | 理由（一句） |
|---|---|---|---|
| 1 | transferSource 兩欄 vs 多欄 vs 單欄 polymorphic | **多欄 + 1 型別判別欄** | 既有 stId/tiId 已是多欄派；新增 coId 與 transfer_source_type 一致對齊 |
| 2 | committed stock 同表 vs 拆表 | **同表（升級既有 reservedQty/availableQty）** | 既有 99% 重疊；新表會造兩套迷惑 |
| 3 | BX ↔ lineItem：陣列 vs 中介表 | **中介表派（既有 pl_item ↔ pk_item ↔ so_item 已實作）** | 不需動 |
| 4 | deprecated 欄位保留多久 | **trigger 防寫，不刪欄位** | 刪 column 不可逆；trigger 成本低 |
| 5 | 明細狀態匯總邏輯放哪一層 | **application service（Translator）** | 彈性最高、可單元測試 |
| 6 | race condition：advisory lock hash key | **`pg_advisory_xact_lock(hashtextextended('${tenantId}:${partId}:${warehouseId}', 0))`** | 64-bit、(tenant, part, warehouse) 三元組精準 |
| 7 | migration 順序：兩段 schema vs 全程手動 SQL | **全程手動 SQL（`prisma migrate diff` 產出後手動編輯）** | 一個 migration 含 nullable→backfill→tighten 三段，原子 |

---

## 3. 5 條意圖規格 — 真實 schema 對應實作

下面 1:1 對應意圖版 §3 的 5 條規格。每條包含：影響的表、欄位變更、Prisma DSL 草案、index、breaking change。

### 3.1 銷貨明細補貨來源（意圖規格 3.1）

#### 影響表
- [`nx04_so_item`](../../../../../packages/db-core/prisma/schema.prisma#L2951) — 加 4 欄（含 1 個型別判別欄 + 1 新 FK + 2 雙段狀態）+ 標 itemStatus deprecated
- 新建 [`nx04_co`](#33-新建-nx04_co-客戶訂單表) — 客戶訂單
- [`nx02_ti`](../../../../../packages/db-core/prisma/schema.prisma#L1825) — 加 2 欄反向追蹤（source_so_item_id NOT NULL after backfill）
- [`nx03_st`](../../../../../packages/db-core/prisma/schema.prisma#L2348) — 同 ti 加 2 欄反向追蹤

#### `nx04_so_item` 新增欄位

```prisma
// 既有 model Nx04SoItem 末段，relations 之前 —— 加：

/// 補貨來源類型（S=本倉/T=自倉調撥/G=同行調貨/B=客戶訂單）。新邏輯起點，取代 nx04_so.source_type。；啟用最低需求版本：LITE-CORE
transferSourceType String @db.VarChar(1) @map("transfer_source_type") @default("S")

/// 補貨進度（P=待補/I=補貨中/C=補貨完成）。雙段狀態之第一段。；啟用最低需求版本：LITE-CORE
transferStatus String @db.VarChar(1) @map("transfer_status") @default("C")

/// 出貨進度（W=等貨/PK=撿貨中/PL=包貨中/D=配送中/F=已送達）。雙段狀態之第二段。；啟用最低需求版本：LITE-CORE
fulfillStatus String @db.VarChar(2) @map("fulfill_status") @default("W")

/// 關聯客戶訂單ID（transfer_source_type=B時填入，FK nx04_co）。；啟用最低需求版本：LITE-CORE
coId String? @db.VarChar(15) @map("co_id")
```

#### `nx04_so_item.itemStatus` 處置
- **不刪欄位**，加 `///` 三斜線註解標 `@deprecated v1.1：改用 (transfer_status, fulfill_status) 雙段`
- 加 trigger（見 D3-trigger §3）：BEFORE INSERT/UPDATE 時若 itemStatus 跟新雙段不一致 → 自動同步雙寫，避免既有讀路徑（庫存中心 5 頁等）立刻壞
- Phase 3 收尾再評估正式刪

#### Prisma DSL 草案（變更段，非完整 model）

```prisma
model Nx04SoItem {
  // ... 既有欄位（id, soId, partId, qty, ...）保留不動

  // 新增：4 欄
  transferSourceType String  @db.VarChar(1) @map("transfer_source_type") @default("S")
  transferStatus     String  @db.VarChar(1) @map("transfer_status")      @default("C")
  fulfillStatus      String  @db.VarChar(2) @map("fulfill_status")       @default("W")
  coId               String? @db.VarChar(15) @map("co_id")

  // 既有 itemStatus 標 deprecated
  /// @deprecated 2026-04-25：改用 (transfer_status, fulfill_status) 雙段。trigger 仍會雙寫。
  itemStatus String @db.VarChar(2) @map("item_status") @default("WP")

  // 新增關聯
  co Nx04Co? @relation("R_Nx04SoItem_coId", fields: [coId], references: [id])

  // 既有 relations（so / quoteItem / part / warehouse / location / discountCode / ti / st）保留不動
  // ...

  // 新增 index（committed 反查 + planSoAdvance 掃描 + translator 找對應補貨單）
  @@index([tenantId, partId, warehouseId], map: "nx04_so_item_committed_lookup_idx")
  @@index([tenantId, fulfillStatus],       map: "nx04_so_item_fulfill_status_idx")
  @@index([tenantId, transferSourceType, stId], map: "nx04_so_item_xfer_st_idx")
  @@index([tenantId, transferSourceType, tiId], map: "nx04_so_item_xfer_ti_idx")
  @@index([tenantId, transferSourceType, coId], map: "nx04_so_item_xfer_co_idx")
}
```

#### `nx04_so.source_type` 處置
- 既有行 2895-2896 `sourceType VARCHAR(1) DEFAULT 'S'`（6 值 S/O/T/G/M/B）保留 + 標 deprecated
- 新邏輯讀 `transfer_source_type` 從 line item 匯總（不同 line 不同來源時 SO header 沒有單一意義 → header 此欄不再具語意）
- trigger 防新寫（INSERT/UPDATE 時 sourceType != 'S' raise warning，prod 改 raise exception）

#### Enum 值映射（既有 → 新）

舊 `nx04_so.source_type`（6 值）→ 新 `transfer_source_type`（4 值）：

| 舊 | 舊意義 | 新值 | 新意義 |
|---|---|---|---|
| S | 本倉庫存 | S | self |
| O | 他倉 | T | transfer（合併）|
| T | 調撥 | T | transfer |
| G | 同行調貨 | G | inquiry |
| M | 混合 | （由 line item 各自決定，header 無對應）| — |
| B | 客訂預約 | B | co |

「混合（M）」在新邏輯不存在 SO header 上 — line item 自己各自有 type，整張 SO 自然支援混合。Backfill 時舊 M 的 SO，每個 line item 按實際情況分別填 S/T/G/B。

#### 為什麼選 `VARCHAR(1)` 而不是 PostgreSQL `enum`

既有 schema 一律用 `VARCHAR(1)` + 註解描述值，**沒有任何 PostgreSQL `CREATE TYPE ... AS ENUM`**。為跟既有風格一致採 VARCHAR + CHECK constraint：

```sql
ALTER TABLE nx04_so_item
  ADD CONSTRAINT chk_xfer_source_type
  CHECK (transfer_source_type IN ('S', 'T', 'G', 'B'));
ALTER TABLE nx04_so_item
  ADD CONSTRAINT chk_transfer_status
  CHECK (transfer_status IN ('P', 'I', 'C'));
ALTER TABLE nx04_so_item
  ADD CONSTRAINT chk_fulfill_status
  CHECK (fulfill_status IN ('W', 'PK', 'PL', 'D', 'F'));
```

---

### 3.2 雙帳：物理 vs 會計（意圖規格 3.2）

#### 採用方式
**升級既有 `Nx03StockBalance.reservedQty / availableQty`，不新增表。**

#### 既有結構（不動）
```
nx03_stock_balance.on_hand_qty      ← 物理庫存（永遠 >= 0，倉管維護）
nx03_stock_balance.reserved_qty     ← 已承諾未出（>= 0，由系統維護）
nx03_stock_balance.available_qty    ← = on_hand_qty - reserved_qty（可為負）
nx03_stock_balance.in_transit_qty   ← 調撥中（PLUS）
```

#### 變更
- **應用層不再直接寫 `reserved_qty / available_qty`**：由 trigger 接管（見 D3-trigger §1）
- `Nx04SoItem.reservedQty` 欄位（行 2978）保留，但**移除應用層寫入邏輯**，改由 trigger 在 `nx04_so_item` INSERT/UPDATE 時自動同步到 `nx03_stock_balance.reserved_qty`
- 加防寫 trigger：`nx03_stock_balance.reserved_qty` 跟 `available_qty` 直接被 application layer UPDATE 時 RAISE EXCEPTION（除非 SET LOCAL 某個 session 變數標示「我是 trigger」）

#### Prisma DSL 草案（變更段）

```prisma
model Nx03StockBalance {
  // 既有欄位全部保留不動
  // ...

  /// @deprecated 應用層寫入 v1.1 起改由 trigger 維護；保留欄位給讀者。
  /// 已承諾未出（>= 0，由 trigger 自動維護）。
  reservedQty Decimal @db.Decimal(14,4) @map("reserved_qty") @default(0)

  /// @deprecated 應用層寫入 v1.1 起改由 trigger 維護；保留欄位給讀者。
  /// 可承諾數 = on_hand_qty - reserved_qty（可為負）。
  availableQty Decimal @db.Decimal(14,4) @map("available_qty") @default(0)

  // 新增：committed_stock 反查專用 index（既有 @@unique 已涵蓋三元組，但加額外的 expression index 給負值反查加速）
  @@index([tenantId, partId, warehouseId, availableQty(sort: Asc)], map: "nx03_stock_balance_negative_avail_idx")
}
```

#### Race condition 處理（意圖規格 3.2 + 開放問題 6）

`nx04_so_item` 的 INSERT/UPDATE 觸發 trigger 更新 `nx03_stock_balance.reserved_qty` 時，必須避免兩個並發 SO 同時改同一個 (part, warehouse) 列造成 race。

**作法**：
- Translator service 在開 transaction 後、INSERT so_item 前，對每個 lineItem 取 advisory lock：
  ```sql
  SELECT pg_advisory_xact_lock(
    hashtextextended('${tenantId}:${partId}:${warehouseId}', 0)
  );
  ```
- 多 lineItem 場景按 `(partId, warehouseId)` 排序後依序鎖（避免 deadlock）
- isolation level：`READ COMMITTED`（不升級）
- Translator catch deadlock errno（40P01）：3 次 exponential backoff retry（50ms / 200ms / 800ms）

詳見 D4 翻譯器 spec（Alex 平行寫）。

---

### 3.3 反查能力（意圖規格 3.3）+ 新建 nx04_co 客戶訂單表

#### 反查 SQL（給 Phase 0 B2 API 用）

```sql
-- 給定 (tenantId, partId, warehouseId)，列出造成負 available_qty 的 so_item 清單
SELECT
  soi.id           AS so_item_id,
  so.id            AS so_id,
  so.doc_no        AS so_no,
  c.id             AS customer_id,
  c.name           AS customer_name,
  u.id             AS sales_user_id,
  u.name           AS sales_user_name,
  soi.qty,
  soi.transfer_status,
  soi.fulfill_status,
  so.created_at
FROM nx04_so_item soi
JOIN nx04_so so ON so.id = soi.so_id AND so.tenant_id = soi.tenant_id
JOIN nx01_partner c ON c.id = so.customer_id
JOIN nx01_user u ON u.id = so.created_by
WHERE soi.tenant_id = $1
  AND soi.part_id = $2
  AND soi.warehouse_id = $3
  AND soi.fulfill_status != 'F'  -- 排除已送達
ORDER BY so.created_at;
```

加 index `nx04_so_item_committed_lookup_idx (tenantId, partId, warehouseId)` 已在 §3.1 列出。

#### 新建 `nx04_co` 客戶訂單表

意圖規格 3.1 第 4 種來源「客戶訂單」需要新表。對應 CLAUDE.md §16 還沒列入 `nx_table_v7.csv`，⚠️ migration 之後 Alex 要補進 `_reference/nx-table.csv`。

```prisma
/// =======================================================
/// Nx04Co — DB table `nx04_co`（客戶訂單）
/// =======================================================
model Nx04Co {
  /// [NX04]+[COHD]+[7碼流水號]，EX : NX04COHD0000001
  id              String   @id @default(dbgenerated("gen_nx04_co_id()")) @db.VarChar(15)
  tenantId        String   @db.VarChar(15) @map("tenant_id")
  warehouseId     String   @db.VarChar(15) @map("warehouse_id")
  /// 客戶訂單號（唯一），[CO]+[年月]+[倉別]+[5碼流水號]，EX：CO-202604-Z01-00001
  docNo           String   @db.VarChar(20) @map("doc_no")
  coDate          DateTime @db.Date @map("co_date")
  customerId      String   @db.VarChar(15) @map("customer_id")
  partId          String   @db.VarChar(15) @map("part_id")
  qty             Decimal  @db.Decimal(14,4)
  expectedFulfillDate DateTime? @db.Date @map("expected_fulfill_date")
  /// 狀態（P=待補/F=已補完/E=過期/V=作廢）
  status          String   @db.VarChar(1) @default("P")
  remark          String?  @db.VarChar(200)
  createdAt       DateTime @map("created_at") @default(now())
  createdBy       String   @db.VarChar(15) @map("created_by")
  updatedAt       DateTime @map("updated_at") @updatedAt
  updatedBy       String   @db.VarChar(15) @map("updated_by")
  /// 來源銷貨明細 ID（必填，反向追蹤）
  sourceSoItemId  String   @db.VarChar(15) @map("source_so_item_id")

  tenant   Nx99Tenant     @relation("R_Nx04Co_tenantId", fields: [tenantId], references: [id])
  warehouse Nx01Warehouse @relation("R_Nx04Co_warehouseId", fields: [warehouseId], references: [id])
  customer Nx01Partner    @relation("R_Nx04Co_customerId", fields: [customerId], references: [id])
  part     Nx01Part       @relation("R_Nx04Co_partId", fields: [partId], references: [id])
  creator  Nx01User       @relation("R_Nx04Co_creator", fields: [createdBy], references: [id])
  updater  Nx01User       @relation("R_Nx04Co_updater", fields: [updatedBy], references: [id])
  sourceSoItem Nx04SoItem @relation("R_Nx04Co_sourceSoItemId", fields: [sourceSoItemId], references: [id])

  rev_Nx04SoItem_coId Nx04SoItem[] @relation("R_Nx04SoItem_coId")

  @@unique([docNo])
  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@index([tenantId, sourceSoItemId])
  @@map("nx04_co")
}
```

#### 對應的 ID 生成函式（migration 內建）

```sql
CREATE OR REPLACE FUNCTION gen_nx04_co_id() RETURNS VARCHAR(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT nextval('nx04_co_seq') INTO next_seq;
  RETURN 'NX04COHD' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS nx04_co_seq START 1;
```

⚠️ 跟既有 `gen_nx04_so_id()` 等命名一致（看真實 schema 的 prefix 慣例都是 `gen_<table>_id()` + 對應 sequence）。

---

### 3.4 SO → 包貨 → 送貨 1:N（意圖規格 3.4）

**✅ 既有 schema 完整支援，無需改動。**

對照表：

| 意圖版概念 | 真實 schema |
|---|---|
| SO → PK 1:1 | `Nx03Pk.soId @unique` ✅ |
| PK → BX 包貨單 1:N | `Nx03Pl.pkId`（FK 到 PK，1:N）✅ |
| BX 包貨單 → BX 包裹 1:N | `Nx03Parcel.plId` ✅ |
| BX → DN N:1 | `Nx06DnItem.parcelId`（一張 DN 可承載多包裹）✅ |
| BX 記錄哪幾個 lineItem | `Nx03PlItem.pkItemId → Nx03PkItem.refSoItemId` ✅ |

意圖規格 3.4「每張包貨單記錄裝了 SO 的哪些明細」 → 既有 `nx03_pl_item.pkItemId → nx03_pk_item.ref_so_item_id` 即支援。

#### 例：給定 SO，列出所有相關包貨單與其裝載的 lineItem

```sql
SELECT
  pl.id   AS pl_id,
  pl.doc_no AS pl_no,
  pl.status AS pl_status,
  ARRAY_AGG(soi.id ORDER BY soi.line_no) AS so_item_ids,
  ARRAY_AGG(pli.qty) AS qtys_in_this_pl
FROM nx03_pl pl
JOIN nx03_pk pk ON pk.id = pl.pk_id
JOIN nx03_pl_item pli ON pli.pl_id = pl.id
JOIN nx03_pk_item pki ON pki.id = pli.pk_item_id
JOIN nx04_so_item soi ON soi.id = pki.ref_so_item_id
WHERE pk.so_id = $1 AND pl.tenant_id = $2
GROUP BY pl.id, pl.doc_no, pl.status;
```

無需新建表、無需改 schema。

---

### 3.5 明細狀態雙段（意圖規格 3.5）

#### 兩段欄位（已在 §3.1 加）

| 欄位 | 值域 | 意義 |
|---|---|---|
| `transfer_status` (1 byte) | `P` 待補貨 / `I` 補貨中 / `C` 補貨完成 | 補貨段 |
| `fulfill_status` (2 bytes) | `W` 等貨 / `PK` 撿貨中 / `PL` 包貨中 / `D` 配送中 / `F` 已送達 | 出貨段 |

合法狀態組合（CHECK constraint）：

```sql
ALTER TABLE nx04_so_item
  ADD CONSTRAINT chk_status_combination
  CHECK (
    -- self 來源：補貨段直接 completed
    (transfer_source_type = 'S' AND transfer_status = 'C')
    OR
    -- 其他來源：補貨段任意，但 fulfill 只能在 transfer = C 時離開 W
    (transfer_source_type IN ('T','G','B') AND
       (fulfill_status = 'W' OR transfer_status = 'C'))
  );
```

#### SO header 狀態匯總（Translator service，不放 DB）

依開放問題 5 決定，匯總邏輯放 Translator service。SQL 視圖只給「即時查詢」用：

```sql
CREATE OR REPLACE VIEW nx04_so_status_summary AS
SELECT
  so.id           AS so_id,
  so.tenant_id,
  COUNT(*) FILTER (WHERE soi.fulfill_status = 'F') AS delivered_count,
  COUNT(*) FILTER (WHERE soi.fulfill_status IN ('PK','PL','D')) AS in_progress_count,
  COUNT(*) FILTER (WHERE soi.fulfill_status = 'W') AS waiting_count,
  COUNT(*) AS total_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE soi.fulfill_status = 'F') = COUNT(*) THEN 'F'  -- delivered
    WHEN COUNT(*) FILTER (WHERE soi.fulfill_status IN ('PK','PL','D')) > 0 THEN 'P'  -- preparing
    WHEN COUNT(*) FILTER (WHERE soi.fulfill_status = 'W') > 0 THEN 'W'  -- waiting_supply
    ELSE 'D'  -- draft（理論上不到）
  END AS aggregate_status
FROM nx04_so so
JOIN nx04_so_item soi ON soi.so_id = so.id
GROUP BY so.id, so.tenant_id;
```

#### `nx04_so.status` 處置
- 既有 11 字元 string status（`DRAFT/CONFIRMED/PICKING/SHIPPED/INVOICED/CANCELLED`）保留
- 新邏輯由 Translator 在每次推進時讀 view 並 sync 到 header
- INVOICED / CANCELLED 兩值不由 view 推導（屬財務 / 業務取消的人為決定）

---

## 4. Migration 策略（開放問題 7：手動 SQL）

### 4.1 Migration 順序（單一 migration 檔，原子 SQL）

```
prisma/migrations/2026XXXX_phase0_so_data_model/migration.sql

步驟（單檔內順序）：

1. CREATE TYPE / SEQUENCE / FUNCTION
   - gen_nx04_co_id() + nx04_co_seq

2. CREATE TABLE
   - nx04_co + indexes + FKs

3. ALTER TABLE — 加 nullable 新欄位
   - nx04_so_item: ADD COLUMN transfer_source_type, transfer_status, fulfill_status, co_id (all nullable + DEFAULT)
   - nx02_ti:     ADD COLUMN source_so_item_id (nullable)
   - nx03_st:     ADD COLUMN source_so_item_id (nullable)

4. Backfill 既有資料
   - nx04_so_item: 對每筆推導 transfer_source_type
     - tiId 非 NULL → 'G'
     - stId 非 NULL → 'T'
     - sourceType (header) = 'B' → 'B'  (此情況需先建 CO 單)
     - 其他 → 'S'
   - nx04_so_item: itemStatus → (transfer_status, fulfill_status) 映射
     - WP/WD → ('C', 'W')
     - WA/TA → ('I', 'W')
     - WG/TG → ('I', 'W')
     - ID → ('C', 'D')
     - WB/WS → ('C', 'PL')
     - WT → ('C', 'PK')
     - C → ('C', 'F')
   - nx02_ti / nx03_st: 自動推導 source_so_item_id
     - 透過 (part_id, qty, warehouse_id) 三元組精確匹配
     - 推不出的標 sentinel ID '_LEGACY_ORPHAN_'（migration 內先建一筆 sentinel SO）

5. DROP DEFAULT + ALTER COLUMN ... SET NOT NULL
   - nx04_so_item: transfer_source_type / transfer_status / fulfill_status NOT NULL
   - nx02_ti / nx03_st: source_so_item_id NOT NULL

6. ADD CONSTRAINT
   - chk_xfer_source_type / chk_transfer_status / chk_fulfill_status / chk_status_combination

7. CREATE INDEX
   - nx04_so_item_committed_lookup_idx
   - nx04_so_item_fulfill_status_idx
   - nx04_so_item_xfer_st_idx / xfer_ti_idx / xfer_co_idx
   - nx03_stock_balance_negative_avail_idx

8. CREATE TRIGGER
   - 詳見 d3-trigger.md（reservedQty 維護 / itemStatus 雙寫 / 防寫 deprecated 欄位）

9. CREATE VIEW
   - nx04_so_status_summary

10. COMMENT ON COLUMN（標 deprecated）
    - nx04_so.source_type
    - nx04_so_item.item_status
    - nx04_so_item.reserved_qty
    - nx03_stock_balance.reserved_qty
    - nx03_stock_balance.available_qty
```

### 4.2 Migration 產出方式

- 用 `prisma migrate diff --from-schema-datamodel ... --script` 產基底 SQL
- 手動編輯加入步驟 4（backfill）+ 步驟 8（trigger）+ 步驟 9（view）
- 不分多個 migration（避免中間態 schema 跟最終 schema 不一致導致 Prisma 抱怨 drift）

### 4.3 Rollback 策略

每個操作對應的 down migration 寫在 `migration.sql` 的 SQL comment 內（Prisma 不自動跑，但人工執行用）。生產環境直接 down 是高風險，預期 rollback 走「正向 fix migration」而非反向。

---

## 5. 既有資料 backfill 風險清單（給 Crown 看的）

| 風險 | 機率 | 影響 | 處置 |
|---|---|---|---|
| `nx02_ti` / `nx03_st` 既有資料推不出 source_so_item_id | 中 | 中 | 標 sentinel orphan，不擋 migration；Phase 3 人工 review |
| `nx04_so_item.itemStatus = 'WP'`（11 種裡最少對應的）映射不準 | 低 | 低 | WP 統一映射為 (C, W)，等同已預設值，不影響 |
| `nx04_so.source_type = 'M'` 混合情境 | 中 | 中 | 需查每張 SO 的所有 lineItem，按 stId/tiId 各自決定 — 寫 backfill SQL 時 per-item 推導 |
| 新建 `nx04_co` 時部分 SO 既有實際是「客訂預約」但無對應 CO 表記錄 | 高 | 中 | Migration 內建一筆 LEGACY_CO sentinel，這類 so_item.coId 全指向它；Phase 3 整理 |
| `Nx03StockBalance.reservedQty` 既有應用層維護的值跟 trigger 重新算的不一致 | 高 | **高** | Migration 內 trigger 啟用前先 RECALCULATE 一次：把所有非 'F' 狀態 so_item.qty 加總、寫回 reservedQty。這個可能跟既有不同 — 屬意料中 |
| `Nx04So.sourceType = 'B'` 客訂預約但 line item 沒對應 CO | 中 | 中 | 同上，指向 LEGACY_CO sentinel |

⚠️ **`reservedQty` 重算這條是 high impact 風險** — 既有應用層可能在某些情境忘記減 reservedQty（出貨完未減、銷退時不增等 bug），trigger 啟用後一次 RECALCULATE 會「修正」但也可能讓某些 stock 報表變動。**這條我建議在 dev 機跑完後請 Crown 跟 Alex 抽樣比對，確認沒踩到業務地雷再上 prod**。

---

## 6. 完成定義（給 Hank 自己 check）

- [ ] D3-impl spec（本檔）+ d3-trigger.md 都寫完
- [ ] Alex review 通過（避免再來一次 D3 v1 失準）
- [ ] schema.prisma 改完，`prisma format` + `prisma validate` 過
- [ ] migration.sql 在本機 Docker（port 5433）跑得起來
- [ ] 跟 Crown 報備「我要跑 migrate dev」（破壞性指令協議）
- [ ] 跑完後 sanity check：
  - 既有 SO 都有預設 (transfer_source_type, transfer_status, fulfill_status)
  - reservedQty 重算後跟既有差異 < 5%
  - committed 反查 SQL 在 mock 資料上正確回傳負值來源
- [ ] 5 條意圖規格逐條打勾：
  - 3.1 銷貨明細補貨來源 ☐
  - 3.2 雙帳追蹤 ☐
  - 3.3 反查能力 ☐
  - 3.4 SO → BX/DN 1:N ☐ (已支援，免改)
  - 3.5 明細狀態雙段 ☐

---

## 7. 不在這份 spec 範圍

- Trigger 詳細實作 → [`./d3-trigger.md`](./d3-trigger.md)
- Translator service（建 SO 流程、deadlock retry、planSoAdvance 邏輯）→ Alex 寫的 D4 spec
- B2 反查 API REST 路由設計 → 後續 spec
- B5 RFQ/QT API → 後續 spec
- 前端 UI 規格 → Phase 1 W2-mini spec
- Seed 重整對應的 backfill SQL → Phase 0 完成後做
- `nx_table_v7.csv` 加入 nx04_co 條目 → Alex 整合後補

---

## 8. 對 Alex review 的請求

請特別 review：

1. **§1.2 對既有 reservedQty 重新詮釋**：跟你寫的意圖版「committed 由 trigger 自動維護」精神對齊嗎？我傾向不新建 nx03_stock_committed 表，理由是業務語意 99% 重疊。
2. **§3.1 enum 值映射**：「混合（M）」拆成 line item 各自決定 — 這個對 LITE 級客戶（單一 SO 通常單一來源）OK 嗎？
3. **§5 reservedQty 重算風險**：你覺得這條需要 Crown 預先看 mock 資料抽樣再決定要不要做嗎？還是 dev 機跑完後再評估？
4. **§3.3 新建 nx04_co 表**：這個是真新增，要進 nx_table_v7.csv。我有寫 ⚠️ 標記，麻煩 Phase 0 結束時補。
5. 其他 7 個工程決定有任何業務角度的反對嗎？

review 後若無重大反對，我才動 schema.prisma 跟 migration.sql。

---

## 9. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版實作 spec，對照 schema.prisma 真實狀態，待 Alex review |

---

*文件結束*
