<!-- docs/spec/nx04/D3_so-data-model.md -->
# D3 — SO Data Model Spec

> 模組：NX04 銷貨
> 階段：Workstation Pivot Phase 0
> 文件類型：Schema 設計契約（不是 ADR、不是 plan）
> 撰寫者：Alex
> 日期：2026-04-25
> 狀態：草案 → 待 Crown 拍板 → 進入 Hank 實作

---

## 0. 文件 metadata

### 0.1 文件定位

這份是 **Phase 0 SO data model 的設計契約**。Hank 寫 Prisma schema、寫 migration、寫 trigger 的時候，所有結構性決定都要對著這份走。

不是 ADR（不論述「為什麼」）、不是 plan（不排時序）、不是 review 文件。**只回答「長什麼樣」這一件事**。

### 0.2 對應 plan v1.1 工作項目

| Plan 項目 | 涵蓋章節 |
|---|---|
| S1 transferSource 兩欄 | 第 2.1、3.2 |
| S2 committed_stock 雙帳 | 第 3.9、引用 D3-trigger |
| S3 BX/DN 改 1:N | 第 3.3、3.4 |
| S4a IT/TI 既有欄位加 NOT NULL | 第 3.6、3.7 |
| S4b CO 新增 relatedSoNumber + relatedLineItemId | 第 3.8 |
| S5 lineItem 加 fulfillStatus | 第 2.3、3.2 |
| B1 SO 建立 API（schema 契約部分） | 第 8 |

### 0.3 適用範圍

- ✅ NX04 銷貨模組相關表格（SO/PK/BX/DN/IT/TI/CO/SO_LINE_ITEM）
- ✅ NX03 庫存表的 committed_stock 部分（**只動 committed 部分**）
- ❌ NX03 庫存表的物理層（既有不動）
- ❌ 其他 NX 模組

### 0.4 與其他文件交叉引用

| 文件 | 關係 |
|---|---|
| `docs/plans/2026-04-24_workstation-pivot-plan.md` v1.1 | Plan 上層 |
| `docs/decisions/2026-04-24_workstation-pivot.md` | 決策上層 |
| `CLAUDE.md` | ID 欄位規則（VARCHAR(15)）、命名慣例 |
| `D3-trigger.md`（同步產出） | committed_stock trigger 詳細作法 |
| `D4_sys-c-translator.md`（同步產出） | translator service 邏輯 |
| `D5_navigation-context-policy.md`（同步產出） | 跨工作台傳遞規則 |
| `nx_table_v7.csv` | 既有表格定義基準 |
| `nx04_field_v1.csv` | 既有欄位定義基準 |

---

## 1. 設計總覽

### 1.1 設計目標一句話

> **支援超賣 + 結構化補貨 + 雙帳追蹤的 SO 資料模型**。

### 1.2 核心觀念三點

1. **lineItem 是新邏輯的中心，不是 SO header**
   - 舊邏輯：SO 整張一個狀態
   - 新邏輯：每個 lineItem 各自走自己的補貨/撿/包/送進度，SO 整張狀態由 lineItem 匯總

2. **lineItem 有兩段狀態**
   - `transferStatus`：管「補貨那段」（IT/TI/CO 是否完成）
   - `fulfillStatus`：管「出貨那段」（撿/包/送）
   - 兩段串接：transferStatus = completed → fulfillStatus 才能離開 waiting_supply

3. **庫存有兩本帳**
   - `physicalStock`：物理庫存（永遠 >= 0，反映倉庫真實盒子數）
   - `committedStock`：會計庫存（可為負，= physical - 已承諾未出）
   - 業務看 committed（知道能不能再賣）、倉管看 physical（知道實際有多少）

### 1.3 ER 關係總覽

```
                    ┌─────────────────┐
                    │   nx04_so       │
                    │   (銷貨主檔)     │
                    └────────┬────────┘
                             │ 1
                             │
                    ┌────────┴───────────┬───────────┬──────────┐
                    │ N                  │ 1         │ N        │ N
                    ▼                    ▼           ▼          ▼
        ┌───────────────────┐    ┌──────────┐  ┌─────────┐ ┌─────────┐
        │ nx04_so_line_item │    │ nx04_pk  │  │ nx04_bx │ │ nx04_dn │
        │ (銷貨明細,核心)    │    │ (撿貨單) │  │ (包貨單)│ │ (送貨單)│
        └─────────┬─────────┘    └──────────┘  └────┬────┘ └────┬────┘
                  │                                  │           │
       ┌──────────┼──────────┐                       │ N:N       │
       │          │          │                       └───────────┘
       │ 0:1      │ 0:1      │ 0:1               (透過 BX.relatedDnId)
       ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │nx04_it │ │nx04_ti │ │nx04_co │
  │(調撥)  │ │(調貨)  │ │(客單)  │
  └────────┘ └────────┘ └────────┘

  (反查路徑)
  nx03_warehouse_stock.committedStock
       ↑
       └── 由 trigger 維護，反查源頭：
           SELECT li FROM nx04_so_line_item li
           WHERE li.partId = ? AND li.warehouseId = ?
                 AND li.fulfillStatus != 'delivered'
```

---

## 2. Enum 定義

放在表結構之前，因為下面的表會引用。

### 2.1 TransferSourceType

對應 plan S1。**4 值靜態**，新增倉庫/同行**不**動 enum。

```prisma
enum TransferSourceType {
  self      // 本倉夠，不需補貨
  transfer  // 自倉調撥（搭配 ref = 來源倉 ID）
  inquiry   // 同行調貨（搭配 ref = 同行 partner ID）
  co        // 客戶訂單（搭配 ref = CO ID，先記後補）
}
```

**對應的 ref 欄位** (`transferSourceRef`)：

| transferSourceType | transferSourceRef 內容 | 範例 |
|---|---|---|
| `self` | `null` | — |
| `transfer` | nx01_warehouse.id | `NX01WH00000003`（Z02 新莊倉）|
| `inquiry` | nx00_partner.id（partner_type='S' 同行）| `NX00PART0000104`（D-O104 同行）|
| `co` | nx04_co.id | `NX04CO00000088`（CO 單）|

### 2.2 TransferStatus

管 lineItem 的「補貨那段」進度。

```prisma
enum TransferStatus {
  pending      // 等待補貨單建立（剛建 SO 時的初始狀態，僅 1 個 tick）
  in_progress  // IT/TI/CO 已建、執行中
  completed    // IT/TI/CO 完成、貨到本倉
}
```

**自動推進規則**（由 translator + trigger 維護）：

- 建 SO 後，self lineItem 的 transferStatus 直接 `completed`（自家有貨不需補）
- transfer/inquiry/co lineItem 在 IT/TI/CO 建立完成 → `in_progress`
- IT/TI/CO 標記 done → `completed`

### 2.3 FulfillStatus

管 lineItem 的「出貨那段」進度。**Plan v1.1 補的層**。

```prisma
enum FulfillStatus {
  waiting_supply  // 等貨（transferStatus 還未 completed）
  in_picking      // 撿貨中（已分入 PK）
  in_packing      // 包貨中（已撿完，分入某張 BX）
  in_delivery     // 配送中（BX 已包好，分入某張 DN）
  delivered       // 已送達（DN 簽收）
}
```

**自動推進規則**：

- 初始 = `waiting_supply`
- transferStatus 進 `completed` + PK 啟動 → `in_picking`
- PK 對該 lineItem 標記撿完 + 分入某張 BX → `in_packing`
- BX 完成 + 分入某張 DN → `in_delivery`
- DN 簽收 → `delivered`

### 2.4 SoStatus

SO 整張的狀態，由 lineItem 推進匯總。

```prisma
enum SoStatus {
  draft           // 建立中（尚未送出）
  waiting_supply  // 任何 lineItem 還在 waiting_supply
  preparing       // 任何 lineItem 在 in_picking / in_packing / in_delivery
  delivered       // 全部 lineItem 都 delivered
  cancelled       // 取消
}
```

**匯總邏輯**（在 D4 translator 的 `planSoAdvance` 實作）：

```
所有 lineItem 都 delivered → SO = delivered
任何 lineItem 在 in_delivery / in_packing / in_picking → SO = preparing
任何 lineItem 在 waiting_supply → SO = waiting_supply
否則 = draft（建立中）
```

### 2.5 其他單據 status

| Enum | 值 | 說明 |
|---|---|---|
| PkStatus | pending / in_progress / completed | 撿貨單 |
| BxStatus | pending / packed / cancelled | 包貨單 |
| DnStatus | pending / in_transit / signed / failed | 送貨單 |
| ItStatus | pending / in_transit / received / cancelled | 調撥單 |
| TiStatus | pending / inquired / quoted / agreed / received / cancelled | 同行調貨單 |
| CoStatus | pending / fulfilled / expired / cancelled | 客戶訂單 |

### 2.6 Enum 命名規則

- 全部走 PostgreSQL enum（不用 string + check constraint）
- 名稱全小寫底線（`waiting_supply` 不是 `WaitingSupply`）
- Prisma DSL 用 `enum` block，自動產 PostgreSQL TYPE
- 註解全用中文（給 Crown / 未來自己看）

---

## 3. 表結構詳細

### 3.1 nx04_so（銷貨主檔）

**定位**：銷貨單的 header，含客戶、日期、總金額等。新邏輯下不再持有單一 BX/DN 編號（因為 1:N）。

```prisma
model Nx04So {
  id              String     @id @db.VarChar(15)              // NX04SO + 9 位數字
  tenantId        String     @db.VarChar(15)
  soNumber        String     @db.VarChar(20)                  // 顯示用單號，例 SO-2604-00061
  customerId      String     @db.VarChar(15)
  status          SoStatus   @default(draft)
  totalAmount     Decimal    @db.Decimal(12, 2)
  createdById     String     @db.VarChar(15)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // 📝 v1.1 deprecated（保留 1 release 週期給教學模式）
  /// @deprecated 改用 BX.findMany({ where: { relatedSoNumber } })
  relatedBxNumber String?    @db.VarChar(20)
  /// @deprecated 改用 DN.findMany({ where: { relatedSoNumber } })
  relatedDnNumber String?    @db.VarChar(20)

  // 關聯
  lineItems       Nx04SoLineItem[]
  pk              Nx04Pk?                                      // 1:1
  bxList          Nx04Bx[]                                     // 1:N（v1.1 新邏輯）
  dnList          Nx04Dn[]                                     // 1:N（v1.1 新邏輯）

  @@unique([tenantId, soNumber])
  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@map("nx04_so")
}
```

**欄位變更說明**：

| 欄位 | 變更 | 說明 |
|---|---|---|
| status | enum 化 | 原 string，改 SoStatus |
| relatedBxNumber | deprecated | 標 @deprecated 但不刪，等 1 release 後 Phase 3 才正式移除 |
| relatedDnNumber | deprecated | 同上 |
| bxList / dnList | 新增關聯 | 1:N 反向，由 BX/DN 的 relatedSoNumber 反查 |

---

### 3.2 nx04_so_line_item（銷貨明細）

**定位**：本次改寫的核心表。新邏輯一切從 lineItem 出發。

```prisma
model Nx04SoLineItem {
  id                  String              @id @db.VarChar(15) // NX04SOLI + 7 位
  tenantId            String              @db.VarChar(15)
  soId                String              @db.VarChar(15)
  partId              String              @db.VarChar(15)
  warehouseId         String              @db.VarChar(15)     // 出貨倉
  quantity            Int                                      // 銷貨數量
  unitPrice           Decimal             @db.Decimal(10, 2)
  subtotal            Decimal             @db.Decimal(12, 2)

  // 📝 v1.1 新增：transferSource 兩欄（取代字串拼接）
  transferSourceType  TransferSourceType  @default(self)
  transferSourceRef   String?             @db.VarChar(15)     // FK to warehouse / partner / co（polymorphic, app-layer constraint）

  // 📝 v1.1 新增：兩段狀態
  transferStatus      TransferStatus      @default(pending)
  fulfillStatus       FulfillStatus       @default(waiting_supply)

  // 📝 v1.1 新增：補貨單反向關聯
  relatedItId         String?             @db.VarChar(15)
  relatedTiId         String?             @db.VarChar(15)
  relatedCoId         String?             @db.VarChar(15)

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  // 關聯
  so                  Nx04So              @relation(fields: [soId], references: [id])
  part                Nx01Part            @relation(fields: [partId], references: [id])
  warehouse           Nx01Warehouse       @relation(fields: [warehouseId], references: [id])
  it                  Nx04It?             @relation(fields: [relatedItId], references: [id])
  ti                  Nx04Ti?             @relation(fields: [relatedTiId], references: [id])
  co                  Nx04Co?             @relation(fields: [relatedCoId], references: [id])

  @@index([tenantId, soId])
  @@index([tenantId, partId, warehouseId])                     // committed_stock 反查用
  @@index([tenantId, transferSourceType, transferSourceRef])   // translator scan 用
  @@index([tenantId, fulfillStatus])                            // planSoAdvance 用
  @@map("nx04_so_line_item")
}
```

**欄位變更說明**：

| 欄位 | 變更 | 說明 |
|---|---|---|
| transferSourceType | 新增 | 4 值 enum，靜態不變 |
| transferSourceRef | 新增 | VARCHAR(15)，依 type 不同指向不同表，application-layer FK |
| transferStatus | 新增 | 補貨進度 enum |
| fulfillStatus | 新增 | 出貨進度 enum |
| relatedItId / relatedTiId / relatedCoId | 新增 | 反向追蹤這個 lineItem 對應哪張補貨單 |

**為什麼 transferSourceRef 是 application-layer FK 而不是 DB FK**：

PostgreSQL 不支援 polymorphic FK（一個欄位指向多張表）。三條路：

- (a) 三個欄位 `transferTargetWarehouseId` / `transferInquiryPartnerId` / `transferCoId` 各自是真 FK — 太囉嗦、查詢 join 麻煩
- (b) 單一 `transferSourceRef` VARCHAR + application-layer 校驗 — 簡潔、但 DB 不擋 ref 寫錯
- (c) 走中介表 `nx04_transfer_source` 包一層 — 過度設計

**選 (b)**。理由：translator 是唯一寫入這欄的程式，型別不會錯。應用層校驗成本低於 schema 複雜度。

### 3.3 nx04_bx（包貨單，1:N 改寫核心）

**定位**：實體包裹單據。一張 SO 可能因包裝體積拆成多張 BX。

```prisma
model Nx04Bx {
  id                    String     @id @db.VarChar(15)         // NX04BX + 9 位
  tenantId              String     @db.VarChar(15)
  bxNumber              String     @db.VarChar(20)             // BX-2604-00061
  status                BxStatus   @default(pending)
  packedAt              DateTime?
  packedById            String?    @db.VarChar(15)

  // 📝 v1.1 新增：1:N 反向關聯欄位
  relatedSoNumber       String     @db.VarChar(20)              // 必填
  relatedLineItemIds    String[]   @db.VarChar(15)              // PostgreSQL 陣列：哪幾項裝在這張 BX

  // DN 對應（一張 BX 通常對一張 DN，但允許 null 例如改派）
  relatedDnId           String?    @db.VarChar(15)

  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  // 關聯（透過 relatedSoNumber 反查 SO）
  so                    Nx04So     @relation(fields: [relatedSoNumber], references: [soNumber])
  dn                    Nx04Dn?    @relation(fields: [relatedDnId], references: [id])

  @@unique([tenantId, bxNumber])
  @@index([tenantId, relatedSoNumber])
  @@index([tenantId, status])
  @@map("nx04_bx")
}
```

**欄位變更說明**：

| 欄位 | 變更 | 說明 |
|---|---|---|
| relatedSoNumber | 新增（必填） | 反向關聯 SO，取代 SO.relatedBxNumber 的單值結構 |
| relatedLineItemIds | 新增 | PostgreSQL `VARCHAR(15)[]` 陣列。記錄這張 BX 裝了 SO 的哪幾項 |
| relatedDnId | 新增 | DN 通常 1:1 對應 BX，但允許 null 處理改派 |

**為什麼用 PostgreSQL 陣列而不是中介表**：

選項：

- (a) `nx04_bx_line_item_link` 中介表 — 標準正規化做法
- (b) `relatedLineItemIds VARCHAR[]` 陣列欄位 — PostgreSQL 原生支援

**選 (b)**。理由：

- 一張 BX 對應的 lineItem 數量小（通常 < 20）
- 永遠是「整批讀取」，不會用「找 lineItem X 在哪張 BX」的反查（因為 lineItem 自己有 fulfillStatus 知道進度）
- 中介表多一張表、多一次 JOIN，效能反而差
- PostgreSQL 陣列查詢可用 `@>` 包含運算子，足夠

### 3.4 nx04_dn（送貨單）

**定位**：實際配送的派工單據。通常一張 BX 對一張 DN，但拆批配送可能多張 DN。

```prisma
model Nx04Dn {
  id                    String     @id @db.VarChar(15)         // NX04DN + 9 位
  tenantId              String     @db.VarChar(15)
  dnNumber              String     @db.VarChar(20)
  status                DnStatus   @default(pending)
  deliveryDate          DateTime?
  signedAt              DateTime?
  driverId              String?    @db.VarChar(15)

  // 📝 v1.1 新增：1:N 反向關聯
  relatedSoNumber       String     @db.VarChar(20)              // 必填
  relatedLineItemIds    String[]   @db.VarChar(15)

  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  so                    Nx04So     @relation(fields: [relatedSoNumber], references: [soNumber])
  bxList                Nx04Bx[]   // 反向：一張 DN 可承載多張 BX

  @@unique([tenantId, dnNumber])
  @@index([tenantId, relatedSoNumber])
  @@index([tenantId, status])
  @@index([tenantId, driverId])
  @@map("nx04_dn")
}
```

**設計原則同 BX**：relatedSoNumber + relatedLineItemIds[] 兩欄結構。

### 3.5 nx04_pk（撿貨單）

**定位**：倉管的撿貨工單。**維持 1:1 對 SO**（一張 SO 一次撿完所有 lineItem，包貨才會拆批）。

本次**不改 schema**，僅確認既有結構即可。

```prisma
model Nx04Pk {
  id              String     @id @db.VarChar(15)
  tenantId        String     @db.VarChar(15)
  pkNumber        String     @db.VarChar(20)
  status          PkStatus   @default(pending)
  pickedById      String?    @db.VarChar(15)
  pickedAt        DateTime?

  // 既有 1:1 對 SO（既有設計，不改）
  soId            String     @unique @db.VarChar(15)
  so              Nx04So     @relation(fields: [soId], references: [id])

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([tenantId, pkNumber])
  @@index([tenantId, status])
  @@map("nx04_pk")
}
```

**不需要 relatedLineItemIds[]**：因為 PK 對應整張 SO 的全部 lineItem，從 `so.lineItems` 直接讀就好。

### 3.6 nx04_it（調撥單）

**定位**：自倉之間調撥的單據。Phase 0 加強反向關聯必填。

```prisma
model Nx04It {
  id                    String     @id @db.VarChar(15)
  tenantId              String     @db.VarChar(15)
  itNumber              String     @db.VarChar(20)
  status                ItStatus   @default(pending)
  fromWarehouseId       String     @db.VarChar(15)
  toWarehouseId         String     @db.VarChar(15)
  partId                String     @db.VarChar(15)
  quantity              Int

  // 📝 v1.1：既有欄位加 NOT NULL（原本可空）
  relatedSoNumber       String     @db.VarChar(20)              // 必填（強制反向追蹤）

  // 📝 v1.1 新增：反向追蹤到具體 lineItem
  relatedLineItemId     String     @db.VarChar(15)              // 必填

  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  // 反向關聯
  lineItems             Nx04SoLineItem[]                         // 雖然 IT:lineItem 是 1:1（一張 IT 對一個 lineItem），但 Prisma 反向關聯結構

  @@unique([tenantId, itNumber])
  @@index([tenantId, relatedSoNumber])
  @@index([tenantId, status])
  @@map("nx04_it")
}
```

**變更說明**：

| 欄位 | 變更 | 說明 |
|---|---|---|
| relatedSoNumber | 加 NOT NULL | 既有欄位但原本可空，新邏輯強制 |
| relatedLineItemId | 新增 | 必填，反向追蹤具體 lineItem |

### 3.7 nx04_ti（同行調貨單）

```prisma
model Nx04Ti {
  id                    String     @id @db.VarChar(15)
  tenantId              String     @db.VarChar(15)
  tiNumber              String     @db.VarChar(20)
  status                TiStatus   @default(pending)
  inquiryPartnerId      String     @db.VarChar(15)              // 同行 partner
  partId                String     @db.VarChar(15)
  quantity              Int
  agreedPrice           Decimal?   @db.Decimal(10, 2)

  // 📝 v1.1：同 IT
  relatedSoNumber       String     @db.VarChar(20)
  relatedLineItemId     String     @db.VarChar(15)

  // 對應的 RFQ/QT（如果走詢價流程）
  relatedRfqId          String?    @db.VarChar(15)
  relatedQtId           String?    @db.VarChar(15)

  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  lineItems             Nx04SoLineItem[]

  @@unique([tenantId, tiNumber])
  @@index([tenantId, relatedSoNumber])
  @@index([tenantId, inquiryPartnerId])
  @@index([tenantId, status])
  @@map("nx04_ti")
}
```

### 3.8 nx04_co（客戶訂單）

**定位**：當業務「先記，等補貨再說」時建立的訂單。

```prisma
model Nx04Co {
  id                    String     @id @db.VarChar(15)
  tenantId              String     @db.VarChar(15)
  coNumber              String     @db.VarChar(20)
  status                CoStatus   @default(pending)
  customerId            String     @db.VarChar(15)
  partId                String     @db.VarChar(15)
  quantity              Int
  expectedFulfillDate   DateTime?

  // 📝 v1.1 新增（不是約束既有欄位，是真新增）
  relatedSoNumber       String     @db.VarChar(20)              // 必填
  relatedLineItemId     String     @db.VarChar(15)              // 必填

  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  lineItems             Nx04SoLineItem[]

  @@unique([tenantId, coNumber])
  @@index([tenantId, relatedSoNumber])
  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@map("nx04_co")
}
```

**特別說明**：CO 跟 IT/TI 不同——CO 原本就**沒有** relatedSoNumber 欄位（看 inquiry/types.ts 證實），所以是「真新增」不是「加約束」。對應 Hank S2 review 拆兩行的處理。

### 3.9 nx03_warehouse_stock（庫存表，雙帳改寫）

**定位**：每個倉的每個料號庫存。新增 committed_stock 欄位實現雙帳。

```prisma
model Nx03WarehouseStock {
  id                String     @id @db.VarChar(15)
  tenantId          String     @db.VarChar(15)
  warehouseId       String     @db.VarChar(15)
  partId            String     @db.VarChar(15)

  // 既有：物理庫存（永遠 >= 0）
  physicalStock     Int        @default(0)

  // 📝 v1.1 新增：會計庫存（可為負）
  /// 由 trigger 維護，應用層不直接寫
  committedStock    Int        @default(0)

  // 既有其他欄位省略
  safetyStock       Int        @default(0)
  maxStock          Int?

  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  warehouse         Nx01Warehouse  @relation(fields: [warehouseId], references: [id])
  part              Nx01Part       @relation(fields: [partId], references: [id])

  @@unique([tenantId, warehouseId, partId])
  @@index([tenantId, partId, warehouseId])                       // 給 advisory lock 用
  @@map("nx03_warehouse_stock")
}
```

**重要規則**：

1. `physicalStock`：原欄位保留、不改名。倉管動。永遠 >= 0。
2. `committedStock`：新欄位。**由 trigger 自動維護**（細節在 D3-trigger.md），應用層**不直接寫**。可為負（負數 = 業務承諾比實際庫存多）。
3. 業務看「可承諾數量」 = `physicalStock + committedStock`（committed 是負數時相加會減少）
4. 倉管看 physical（看實際盒子數）
5. 財務 / 報表看 committed（看會計帳）

**❓ 開放問題**：committedStock 是加在 nx03_warehouse_stock 同表（如上設計）還是另開 nx03_warehouse_stock_committed？我傾向同表（簡單），但留給 Hank 評估有沒有工程理由要拆（見第 11 區）。

---

## 4. 關聯關係總圖

### 4.1 完整 ER 圖

```
┌──────────────────────────────────────────────────────────────┐
│                     SO 完整關聯網                             │
└──────────────────────────────────────────────────────────────┘

nx01_user ──┐
            │ createdBy
            ▼
       nx04_so ─────────────────────────────┐
            │                                │
   ┌────────┴────────┬─────────────┬────────┴────────┐
   │ 1:N             │ 1:1         │ 1:N             │ 1:N
   ▼                 ▼             ▼                 ▼
nx04_so_line_item   nx04_pk    nx04_bx──────────► nx04_dn
   │                                │ N:1（透過 BX.relatedDnId）
   │
   │ 0:1 (依 transferSourceType)
   │
   ├──► nx04_it（自倉調撥）
   ├──► nx04_ti（同行調貨）─── 0:1 ──► nx04_rfq
   │                       └─── 0:1 ──► nx04_qt
   └──► nx04_co（客戶訂單）

nx04_so_line_item ──N:1──► nx01_part
                        ──► nx01_warehouse

nx03_warehouse_stock ◄── trigger ── nx04_so_line_item
       (physicalStock + committedStock)
```

### 4.2 關聯邏輯說明

**為什麼 SO ↔ PK 是 1:1**：撿貨是「把該拿的東西全部從庫位拿到打包區」，一次動作。

**為什麼 SO ↔ BX 是 1:N**：包裝因體積會拆批（Crown 業界事實，1 SO 5 個料號可能拆 2 張 BX）。

**為什麼 SO ↔ DN 是 1:N**：通常跟 BX 對應（1 BX = 1 DN），但拆批配送可能再拆。

**為什麼 BX ↔ DN 是 N:1**（透過 BX.relatedDnId）：一張 DN 可以承載多張 BX 一起送。

### 4.3 反查路徑示範

**情境：業務想知道「料號 056 115 561G 在 Z01 倉的可出貨量為什麼是 -18」**

```sql
-- Step 1: 查 committed_stock 確認
SELECT physicalStock, committedStock
FROM nx03_warehouse_stock
WHERE partId = 'NX01PART...561G' AND warehouseId = 'NX01WHZ01';
-- 結果：physical=2, committed=-20 → 可出 = 2 + (-20) = -18 ✓

-- Step 2: 反查負數來源
SELECT li.id, li.quantity, so.soNumber, c.name AS customer
FROM nx04_so_line_item li
JOIN nx04_so so ON so.id = li.soId
JOIN nx00_partner c ON c.id = so.customerId
WHERE li.partId = 'NX01PART...561G'
  AND li.warehouseId = 'NX01WHZ01'
  AND li.fulfillStatus != 'delivered'
ORDER BY so.createdAt;
-- 結果：列出 5 張 SO 共 18 個未出，業務一目了然
```

這個查詢就是 plan v1.1 B2「committed_stock 反查 API」的後端實作。

---

## 5. 索引設計

### 5.1 查詢索引

| 索引 | 表 | 用途 |
|---|---|---|
| `[tenantId, partId, warehouseId]` | nx04_so_line_item | committed_stock 反查 |
| `[tenantId, fulfillStatus]` | nx04_so_line_item | planSoAdvance 掃描 |
| `[tenantId, transferSourceType, transferSourceRef]` | nx04_so_line_item | translator 找對應 IT/TI/CO |
| `[tenantId, customerId]` | nx04_so | 客戶歷史查詢 |
| `[tenantId, status]` | nx04_so / bx / dn / it / ti / co | 工作台 list 篩選 |
| `[tenantId, createdAt]` | nx04_so | 時間範圍查詢 |
| `[tenantId, relatedSoNumber]` | nx04_bx / dn / it / ti / co | 反向關聯查詢 |

### 5.2 並發控制相關索引

| 索引 | 表 | 用途 |
|---|---|---|
| `[tenantId, partId, warehouseId]` | nx03_warehouse_stock | advisory lock + SELECT FOR UPDATE |
| `(tenantId, partId)` 複合鍵 | nx03_warehouse_stock | advisory lock hash key |

**advisory lock 使用模式**（給 D4 translator 參考）：

```typescript
// 在 translator service 內，建 SO 前對 (tenantId, partId) 加鎖
await prisma.$queryRaw`
  SELECT pg_advisory_xact_lock(
    hashtext(${tenantId} || ':' || ${partId})
  )
`;
// 鎖在 transaction 結束自動釋放
```

---

## 6. 與既有 schema 的 breaking change 清單

### 6.1 表結構 breaking change

| 表 | 欄位 | 變更 | 影響 |
|---|---|---|---|
| nx04_so | relatedBxNumber | deprecated | 教學模式仍可讀，新邏輯不用 |
| nx04_so | relatedDnNumber | deprecated | 同上 |
| nx04_so | bxList / dnList | 新增關聯 | 新邏輯走這條 |
| nx04_so_line_item | transferSourceType / Ref | 新增 | 教學模式不存在這欄，預設 self 不影響 |
| nx04_so_line_item | transferStatus / fulfillStatus | 新增 | 預設值對教學模式不影響 |
| nx04_so_line_item | relatedItId / TiId / CoId | 新增 | 預設 null |
| nx04_bx | relatedSoNumber | 新增 NOT NULL | **教學模式既有 BX 必須 migration 補值** |
| nx04_bx | relatedLineItemIds[] | 新增 | 預設空陣列，教學模式不影響 |
| nx04_dn | relatedSoNumber | 新增 NOT NULL | 同 BX |
| nx04_it | relatedSoNumber | nullable → NOT NULL | **既有空值要先 migration 補** |
| nx04_it | relatedLineItemId | 新增 NOT NULL | **既有資料要 migration 推導補值** |
| nx04_ti | relatedSoNumber / LineItemId | 同 IT | 同 |
| nx04_co | relatedSoNumber / LineItemId | 真新增 NOT NULL | **既有 CO 必須 migration 補關聯** |
| nx03_warehouse_stock | committedStock | 新增 | 預設 0，trigger 之後維護 |

### 6.2 應用層 breaking change

| 既有讀取方式 | 新讀取方式 |
|---|---|
| `so.relatedBxNumber` | `prisma.bx.findMany({ where: { relatedSoNumber: so.soNumber } })` |
| `so.relatedDnNumber` | `prisma.dn.findMany({ where: { relatedSoNumber: so.soNumber } })` |
| 假設 SO 整張一個 status | 改看 lineItem.fulfillStatus 匯總 |
| 假設 BX 對應整張 SO | 看 BX.relatedLineItemIds 知道實際包了哪幾項 |

### 6.3 影響範圍清單（呼應 Hank B3 review）

對應反推 spec 列出的 7 個 useSalesStore consumer：

| 檔案 | 影響 | Phase 處理 |
|---|---|---|
| `features/inventory/workstation/transfer/MobileTransferListPage.tsx` | 改讀新 API | Phase 2b W6 |
| `features/inventory/workstation/ti/MobileInquiryPickupListPage.tsx` | 改讀新 API | Phase 2b W7 |
| `features/inventory/workstation/picking/MobilePickingListPage.tsx` | 改讀新 API | Phase 2b W8 |
| `features/inventory/workstation/packing/MobilePackingListPage.tsx` | 改讀新 API | Phase 2b W9 |
| `features/inventory/workstation/delivery/MobileDeliveryListPage.tsx` | 改讀新 API | Phase 2b W10 |
| `features/sale/ui/hub/sections/StatusSection.tsx` | 改讀新 API | Phase 2b W11 |
| `features/sale/ui/sop-workspace/components/Step8OrderComplete.tsx` | 不動（保留教學模式）| Phase 3 加 banner |

---

## 7. Migration 策略 + 實際 SQL 示範

### 7.1 Migration 順序

Phase 0 的 migration 必須**嚴格按序執行**，否則資料炸鍋：

```
Step 1: Schema migration（加新欄位、加 enum、加 index）
        prisma/migrations/2026XXXX_phase0_schema/migration.sql

Step 2: Trigger migration（committed_stock 自動維護）
        prisma/migrations/2026XXXX_phase0_committed_trigger/migration.sql
        詳見 D3-trigger.md

Step 3: Data migration（補既有資料）
        prisma/migrations/2026XXXX_phase0_data_backfill/migration.sql

Step 4: Constraint tightening（NOT NULL、deprecated 標註）
        prisma/migrations/2026XXXX_phase0_tighten/migration.sql
```

### 7.2 實際 SQL 示範

#### 範例 1：補既有 mock SO 的 transferSource（v1.0 plan 答應）

```sql
-- 既有 mock data 全部標 self（保守起點）
UPDATE nx04_so_line_item
SET transfer_source_type = 'self',
    transfer_source_ref = NULL,
    transfer_status = 'completed',
    fulfill_status = 'delivered'
WHERE created_at < '2026-04-25';

-- DEMO 用的 4 筆情境 C/D mock 手工標對應值
-- 假設 SO_DEMO_001 的 lineItem_X 是 inquiry 來源
UPDATE nx04_so_line_item
SET transfer_source_type = 'inquiry',
    transfer_source_ref = 'NX00PART0000104',  -- D-O104 同行
    transfer_status = 'in_progress',
    fulfill_status = 'waiting_supply'
WHERE id = 'NX04SOLI0DEMO_X';
```

#### 範例 2：把單一 BX 結構改寫成 1 SO : N BX

```sql
-- 既有 SO.relatedBxNumber 對應的單一 BX，遷移到新 BX.relatedSoNumber 結構
-- Step 1: 對既有 BX 補 relatedSoNumber
UPDATE nx04_bx bx
SET related_so_number = so.so_number,
    related_line_item_ids = (
      -- 一張 BX 對應該 SO 的全部 lineItem
      SELECT array_agg(li.id)
      FROM nx04_so_line_item li
      WHERE li.so_id = so.id
    )
FROM nx04_so so
WHERE so.related_bx_number = bx.bx_number;

-- Step 2: 確認沒有遺漏
SELECT bx.id, bx.bx_number
FROM nx04_bx bx
WHERE bx.related_so_number IS NULL;
-- 應該回傳 0 列

-- Step 3: 加 NOT NULL 約束（在 tighten migration 做）
ALTER TABLE nx04_bx
  ALTER COLUMN related_so_number SET NOT NULL;
```

#### 範例 3：補 IT 的 relatedSoNumber + relatedLineItemId

```sql
-- IT 既有可能有空值，Phase 0 要強制補
-- 邏輯：IT 來自於某個 SO 的調撥需求，關聯通常透過時間/數量比對
-- 由於既有 mock IT 可能無法精確對到 lineItem，採保守作法：

-- Step 1: 嘗試自動推導（如果 IT 跟某 SO 有 fromWarehouse + partId + quantity 完全吻合）
UPDATE nx04_it it
SET related_so_number = matched.so_number,
    related_line_item_id = matched.line_item_id
FROM (
  SELECT
    it2.id AS it_id,
    so.so_number,
    li.id AS line_item_id
  FROM nx04_it it2
  JOIN nx04_so_line_item li ON li.part_id = it2.part_id
                            AND li.quantity = it2.quantity
                            AND li.warehouse_id = it2.to_warehouse_id
  JOIN nx04_so so ON so.id = li.so_id
  WHERE it2.related_so_number IS NULL
  -- 可能 1:N 對應，取最早建立的
  ORDER BY so.created_at
  LIMIT 1
) matched
WHERE it.id = matched.it_id;

-- Step 2: 對推導不出的 IT，標為 _orphan_ 並紀錄
UPDATE nx04_it
SET related_so_number = '_ORPHAN_LEGACY_'
WHERE related_so_number IS NULL;
-- 後續 Phase 3 收尾時人工 review 這批
```

#### 範例 4：標 deprecated 欄位（純註解，不影響執行）

```sql
COMMENT ON COLUMN nx04_so.related_bx_number IS
  '@deprecated v1.1：改用 BX.related_so_number 反查。保留 1 release 週期給教學模式。';

COMMENT ON COLUMN nx04_so.related_dn_number IS
  '@deprecated v1.1：改用 DN.related_so_number 反查。';
```

### 7.3 Migration 失敗 rollback 策略

每個 migration 必須有對應的 down script：

```sql
-- migration.sql（up）
ALTER TABLE nx04_so_line_item ADD COLUMN transfer_source_type TransferSourceType DEFAULT 'self';

-- 對應的 down 邏輯（記錄在 README 或 docs，Prisma 不自動跑）
-- ALTER TABLE nx04_so_line_item DROP COLUMN transfer_source_type;
```

**注意**：Prisma v7 的 `migrate reset` 會把整個 DB 砍掉重建，等於自然 rollback。但生產環境不能 reset，所以 down script 要明確寫在 docs。

### 7.4 跟兩台機器（Home Docker 5432 + Office Docker 5433）的對應

- migration 在哪台跑都一樣（Prisma migration 是 deterministic）
- 但 seed 後的測試資料可能因執行順序不同有差異 → 用 fixed seed 確保一致
- Hank 在 Home / Office 切換時：
  - `git pull`
  - `pnpm prisma migrate dev`（套用新 migration）
  - `pnpm seed`（補測試資料）

---

## 8. Translator 對 schema 的使用契約

不寫 translator 邏輯細節（D4 的事），只寫**translator 會怎麼讀寫這個 schema**。

### 8.1 寫入路徑

translator 收到 lineItems 後：

```
1. 開 transaction（isolation level: READ COMMITTED）
2. 對每個 lineItem.partId，取 advisory_xact_lock
3. INSERT nx04_so + nx04_so_line_item（多筆）
4. 對每個 transferSourceType != 'self' 的 lineItem：
   - transfer：INSERT nx04_it，UPDATE so_line_item.relatedItId
   - inquiry：INSERT nx04_rfq，UPDATE so_line_item.relatedTiId（TI 暫時 null，等 RFQ 完）
   - co：INSERT nx04_co，UPDATE so_line_item.relatedCoId
5. trigger 自動更新 nx03_warehouse_stock.committedStock
6. COMMIT
```

### 8.2 讀取路徑

`planSoAdvance` 邏輯：

```typescript
// 找出某 SO 的整體狀態
const lineItems = await prisma.nx04SoLineItem.findMany({
  where: { soId: so.id },
  select: { fulfillStatus: true }
});

if (lineItems.every(li => li.fulfillStatus === 'delivered')) {
  return SoStatus.delivered;
}
if (lineItems.some(li => ['in_picking', 'in_packing', 'in_delivery'].includes(li.fulfillStatus))) {
  return SoStatus.preparing;
}
if (lineItems.some(li => li.fulfillStatus === 'waiting_supply')) {
  return SoStatus.waiting_supply;
}
return SoStatus.draft;
```

### 8.3 不允許的操作

- ❌ 應用層直接 `prisma.nx03WarehouseStock.update({ committedStock: ... })`
  → committed_stock 由 trigger 維護
- ❌ 應用層直接 `INSERT nx04_it` 不寫 relatedSoNumber + relatedLineItemId
  → DB 會擋（NOT NULL）
- ❌ 在 transaction 外建立 SO + IT
  → 會造成 race condition 跟 committed_stock 不一致

---

## 9. Seed 資料對應

### 9.1 mock data 在新 schema 下的長相

既有 seed 三層架構（system / template / test）的 SO 資料，全部走 `transferSourceType = 'self'`、`transferStatus = 'completed'`、`fulfillStatus = 'delivered'`（已成歷史單據）。

### 9.2 LITE/PLUS/PRO 三租戶的 SO 資料

延續 TASK-SEED-DEMO-02 規劃：

- LITE：50 SKU × 8 客戶 × 6 個月活動 → 估約 200 張 SO
- PLUS：200 SKU × 40 客戶 × 6 個月 → 估約 1000 張 SO
- PRO：400 SKU × 120 客戶 × 6 個月 → 估約 3500 張 SO

新增的 transferSource 分布建議（DEMO 演示用）：

- self：85%（一般情況本倉夠）
- transfer：10%（需自倉調撥）
- inquiry：4%（同行調貨）
- co：1%（先記後補）

### 9.3 跟 TASK-SEED-DEMO-02 的銜接

如果 DEMO 規劃時跟本 spec 有衝突，**以本 spec 為準**。DEMO 規劃要相應調整。

---

## 10. 不在這份 spec 範圍的事

| 範圍 | 對應文件 |
|---|---|
| committed_stock trigger 詳細實作 | D3-trigger.md（同步產出） |
| Translator service 邏輯（建 SO 流程）| D4_sys-c-translator.md |
| navigation context 機制 | D5_navigation-context-policy.md |
| RFQ/QT REST API 設計（B5）| 後續單獨 spec（B5_rfq-qt-api.md） |
| 前端 W2-mini UI 規格 | Phase 1 開始前產出 |
| 其他 NX 模組的 schema 改動 | 不在本計畫範圍 |

---

## 11. 開放問題（給 Hank 寫 code 前先問）

### Q1：committedStock 加在 nx03_warehouse_stock 還是另開表？

**Alex 傾向**：加在同表（如本 spec 設計）

**理由**：簡單、查詢一次就拿到 physical + committed、避免 join

**Hank 視角可能反對的理由**：
- 同表會讓 trigger 在主表 INSERT/UPDATE 時也觸發，可能影響原有 stock 寫入效能
- 拆成 nx03_warehouse_stock_committed 讓 trigger 影響範圍更隔離

**請 Hank 評估後給意見**。

### Q2：transferSourceRef 的 FK 限制要不要 DB 層做？

**Alex 傾向**：應用層校驗，不做 DB FK

**理由**：PostgreSQL 不支援 polymorphic FK，做了會變超複雜

**Hank 視角可能補充的理由**：
- 加 trigger 在 INSERT/UPDATE 時校驗 ref 對應的表是否存在
- 或在 Prisma middleware 層做

**請 Hank 評估**。

### Q3：deprecated 欄位的「保留 1 release 週期」具體是多久？

**Alex 傾向**：到 Phase 3 收尾時正式刪除

**理由**：Phase 3 預估 3~4 週後，足夠教學模式有人發現問題

**Hank 視角可能反對**：
- 如果有未來還沒想到的 consumer，3 週可能不夠
- 建議改「永遠保留但加 trigger 防寫入」

**請 Hank 評估**。

### Q4：translator 的 transaction isolation level 用什麼？

**Alex 傾向**：READ COMMITTED + advisory lock（如本 spec 第 8.1）

**Hank 視角**：請從工程實作角度確認可行性。

### Q5：committed_stock 反查 API（B2）回傳結構

本 spec 沒定義 B2 API 回傳長相（那是 D4 範圍）。但 schema 必須支援這個查詢，已在第 4.3 用 SQL 示範。

---

## 12. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版，Alex 起草，待 Crown 拍板 + Hank 工程審查 |

---

*文件結束*
