<!-- docs/nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md -->
# B2 — Stock Reverse Lookup API 實作 spec

> 文件類型：實作 spec（Hank 對照真實 nx-api 寫，給自己照著實作 + 給 Alex review）
> 撰寫者：Hank
> 日期：2026-04-27
> 對應意圖：[../intent/stock-reverse-lookup-api-intent.md](../intent/stock-reverse-lookup-api-intent.md) v1.0
> 對照基準：`apps/nx-api/src/nx03/`、Prisma schema（@ feature/wp-phase0-schema 78f9db3）
> 銜接：D3 雙帳設計 + B5-A 反查路徑（Nx02Rfq.sourceSoItemId）+ D4 translator
> 狀態：**待 Alex review** → 拍板後才寫程式碼

---

## 0. 文件性質

把意圖 v1.0 的 2 個 endpoint + 5 條核心邏輯對應到**真實 NestJS service 結構** + 真實 Prisma schema 的實作藍圖。所有 class 名 / function 簽章 / import 路徑用既有 nx-api repo 的命名慣例。

跟 D3-impl / D4-impl / B5-impl 同節奏：先列**讀真實 codebase 的關鍵發現**（影響取捨），再列**4 個開放問題拍板**，最後給**程式碼骨架 + 測試 + DoD**。

---

## 1. 真實 nx-api 結構的關鍵發現

### 1.1 既有 `Nx03/stock-balance/` 已有純查詢 service

[stock-balance.service.ts](apps/nx-api/src/nx03/stock-balance/stock-balance.service.ts) 提供：
- ✅ `list(user, q)` — 全租戶 stock_balance 列表（分頁）
- ✅ `listByPart(user, partId)` — 單料號跨倉

但**不含 (partId, warehouseId) 二元查詢的單筆 endpoint**（B2 §3.1 總覽剛好需要這個），也不含 reserved 來源反查。

[stock-balance.controller.ts](apps/nx-api/src/nx03/stock-balance/stock-balance.controller.ts) 用 `@Roles('ADMIN')` — B2 拍板開放給所有登入 user，**不應加進此 controller**（會被既有 ADMIN 約束）。

**結論**：B2 應**新建獨立 module/folder**，不動既有 stock-balance。

### 1.2 既有 nx03 模組結構

[apps/nx-api/src/nx03/](apps/nx-api/src/nx03/) 有：
- `stock-balance/` — 純 stock_balance 表查詢（純讀）
- `stock-ledger/` — 庫存歷史變動（純讀）
- `inbound/` `outbound/` `stocktake/` `transfer/` — 寫入操作

B2 屬於「跨表反查」純讀 API，跟 `stock-balance` / `stock-ledger` 同類。建議命名：`stock-reservation/`（業務語意 = reserved 來源反查），跟意圖 §3.2「Reservation Source Lookup」對齊。

### 1.3 schema 對 B2 反查的支援度

| 反查路徑 | schema 欄位 | 狀態 |
|---|---|---|
| SO line item → SO header | `Nx04SoItem.so` relation | ✅ 直接 |
| SO header → 客戶 | `Nx04So.customer` relation | ✅ 直接 |
| SO line item → IT (T) | `Nx04SoItem.st` (relation `R_Nx04SoItem_stId`) | ✅ 直接 |
| SO line item → TI (G adopted) | `Nx04SoItem.ti` (relation `R_Nx04SoItem_tiId`) | ✅ 直接 |
| SO line item → CO (B) | `Nx04SoItem.co` (relation `R_Nx04SoItem_coId`) | ✅ 直接 |
| SO line item → RFQ (G pending, tiId=null) | `Nx04SoItem.rev_Nx02Rfq_sourceSoItemId[]` | ✅ B5-A 已加 |
| RFQ → QT 統計（qtCount + partnerCount） | `Nx02Rfq.rev_Nx02Qt_rfqId[]` | ✅ 直接 |

→ **schema 完全準備好**，B2 不需要 schema patch（B5-A 已預先補完反查路徑）。

### 1.4 ⚠️ 缺：SO 沒 salesperson 欄位/FK

意圖 §5.2 寫「salespersonId, salespersonName」要回傳——但 [Nx04So](packages/db-core/prisma/schema.prisma) header **沒**這個欄位。最接近的是 `createdBy`（`String @db.VarChar(15)`），但 schema **沒**寫 user FK relation（`createdBy` 沒接 `Nx01User`）。

→ **取捨點 §2.5**：Hank 三個方案，建議方案 b（service-side 二段 query lookup）。

### 1.5 D4 / B5 的 multi-tenant + error helper 可重用

- `requireTenantId(user)` — [shared/nx01/require-tenant.ts](apps/nx-api/src/shared/nx01/require-tenant.ts)
- `Nx02BaseError` 系列 — B2 純讀沒寫入，**可能不需要**自定 error class（標準 NotFoundException 即可）
- 不需要 advisory lock（純讀）
- 不需要 retry wrapper（純讀無並發衝突）

### 1.6 reserved_qty「未完成」判定

意圖 §4.1 「`transferStatus != 'C'` 或 `fulfillStatus != delivered`」對應到 schema：
- `transferStatus`: P/I/C（D3 §2.1 三段值）
- `fulfillStatus`: W/PK/PL/D/F（W=等貨/PK=撿貨中/PL=包貨中/D=配送中/F=已送達）

「未完成」= `transferStatus != 'C' OR fulfillStatus != 'F'` → Prisma where:
```typescript
OR: [
  { transferStatus: { not: 'C' } },
  { fulfillStatus: { not: 'F' } },
]
```

---

## 2. 工程取捨（5 個給 Alex 拍）

### 取捨 1（意圖 §6 Q1）：兩個 endpoint 還是一個 — **採 (a) 拆兩個**

**方案**：
- (a) 拆兩個：`GET /nx03/stock/summary?partId=X&warehouseId=Y` + `GET /nx03/stock/reservations?partId=X&warehouseId=Y`
- (b) 一個 endpoint + `?expand=reservations`
- (c) 其他

**選 a 理由**：
- 業務使用模式不同：總覽**很多次**呼叫（每查料就用），反查**偶爾**才展開
- HTTP cache friendliness 不同（將來如果加 cache，總覽可以高 TTL、反查不能 cache）
- NestJS 慣例：endpoint = 動作，總覽跟反查是兩個語意動作
- 拆開 service method 各自單一職責、單元測試切得乾淨

⚠️ Alex 在意圖 §6 Q1 也傾向 (a)，採同方案。

### 取捨 2（意圖 §6 Q2）：分頁 — **採 (a) 不分頁**

**選 a 理由**：
- 業務語意：單一料號單一倉的 reserved 來源實務上 ≤ 50 筆（一個倉一個料 100 個未完成 SO 是異常 — 真碰到先警告 monitor 再加分頁）
- 前端 W2-mini 需要看「全貌」做決策（分頁切斷接龍鎖判斷）
- 每筆 row size 不大（接龍鎖 ~10 個欄位 + 子物件）
- 將來如果發現某料號超過 100 筆 → 加 hard limit 報錯 + 加分頁，先不過早優化

⚠️ Alex 同傾向 (a)。

### 取捨 3（意圖 §6 Q3）：cache — **不 cache**

**選不 cache 理由**：
- stock_balance 異動頻率高（每筆 SO 建立都更新 reserved_qty）— cache TTL 設多短都會撞 stale
- 業務「反查」場景就是要看最新數字（cache 給錯比沒 cache 嚴重）
- Phase 0 階段流量小，DB 直查 latency 可接受
- 將來如果壓測發現 hot path → 用 Redis cache 加 invalidation hook（trigger 端 publish event）

⚠️ Alex 同傾向不 cache。

### 取捨 4（意圖 §6 Q4）：access control — **採 (a) 開放給所有登入 user**

**選 a 理由**：
- 純查詢 API、無寫入 / 無破壞性動作
- 業務（W2 工作台）+ 倉管（庫存查詢）+ 採購（避免重複下 RFQ）都會用
- 庫存資訊在 NEXORA 是租戶內共享的 read-only 資料（已被 multi-tenant tenantId 隔離保護）
- 不加 @Roles 但仍走 @UseGuards(JwtAuthGuard)（任何登入即可、未登入仍擋）

⚠️ 注意這跟既有 [stock-balance.controller.ts](apps/nx-api/src/nx03/stock-balance/stock-balance.controller.ts) 的 `@Roles('ADMIN')` 政策**不一致**。但既有 stock-balance 的 ADMIN-only 寫法太緊（業務也應該能看自己的庫存），是另一個 issue。**B2 不動既有 controller**，按拍板開放給登入 user。如果 Alex 想趁機把 stock-balance 也放寬，另起 task。

### 取捨 5（§1.4）：建單者名稱從哪拿 — **採 (b) service-side 二段 lookup + 命名改 creatorId/creatorName**

**方案**：
- (a) schema patch：加 `Nx04So.salespersonId String? + creator Nx01User? @relation(...)` → 為 B2 動 schema 太重
- (b) service-side 二段 query：第一查 SoItem + relations → 收集 createdBy ids → 第二查 user.findMany IN → service 端 map 進結果（非 N+1，是 2 round-trip）
- (c) 暫不回，spec 標 TODO

**選 b 理由**：
- 不動 schema（B2 範圍乾淨）
- 不是 N+1（用 `where: { id: { in: [...] } }` 一次抓所有 user）
- 為「建單者名稱」這個 nice-to-have 動 schema 不划算

**⚠️ 命名改 `creatorId` / `creatorName`（Crown 拍板附帶 1）**：

不叫 `salespersonId` / `salespersonName`，理由：
- 實務 `createdBy` 不一定是「業務歸屬」（代建單 / 主管建單場景常見）
- 「業務看到 creator 知道是建單者，不會誤以為是業務歸屬」
- 「業務歸屬」是另一個業務語意，將來真要顯示得另起 schema patch task

→ 意圖 §5.2 的 `salespersonId` / `salespersonName` 在實作層**改為 `creatorId` / `creatorName`**，跟 schema `createdBy` 語意精準對齊。意圖版這條命名屬於業務理解疏漏，spec 內以實作命名為準。

---

## 3. 程式碼結構

### 3.1 模組註冊

[apps/nx-api/src/nx03/nx03.module.ts](apps/nx-api/src/nx03/nx03.module.ts) 修：

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [
    // 既有...
    StockReservationController,  // ← 新增
  ],
  providers: [
    // 既有...
    Nx03StockReservationService,  // ← 新增
  ],
})
export class Nx03Module {}
```

### 3.2 檔位配置

```
apps/nx-api/src/nx03/stock-reservation/
├── stock-reservation.controller.ts
├── stock-reservation.service.ts
├── dto/
│   └── stock-reservation.dto.ts          // GetStockSummaryQueryDto / GetReservationsQueryDto
└── __tests__/
    ├── stock-summary.spec.ts             // §3.1 unit (1 case)
    ├── reservations-self.spec.ts         // §3.2 type='S' unit
    ├── reservations-transfer.spec.ts     // §3.2 type='T' unit
    ├── reservations-inquiry-adopted.spec.ts  // §3.2 type='G' adopted unit
    ├── reservations-inquiry-pending.spec.ts  // §3.2 type='G' middle unit
    ├── reservations-co.spec.ts           // §3.2 type='B' unit
    ├── reservations-sort.spec.ts         // §4.3 排序 unit
    └── integration/
        └── reservations-tenant-isolation.int-spec.ts  // 多租戶隔離 integration
```

### 3.3 主服務：`Nx03StockReservationService`

```typescript
// apps/nx-api/src/nx03/stock-reservation/stock-reservation.service.ts
@Injectable()
export class Nx03StockReservationService {
  constructor(private readonly prisma: PrismaService) {}

  /** §3.1 庫存總覽 — 直接讀 nx03_stock_balance（D3 trigger 已維護好三個數字） */
  async getStockSummary(user: RequestUser, partId: string, warehouseId: string) {
    const tenantId = requireTenantId(user);
    const balance = await this.prisma.nx03StockBalance.findFirst({
      where: { tenantId, partId, warehouseId },
      select: {
        id: true,
        partId: true,
        warehouseId: true,
        onHandQty: true,
        reservedQty: true,
        availableQty: true,
        inTransitQty: true,
        avgCost: true,
        stockValue: true,
        lastInAt: true,
        lastOutAt: true,
        lastMoveAt: true,
        part: { select: { code: true, name: true } },
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!balance) throw new NotFoundException(`stock_balance not found for part=${partId} warehouse=${warehouseId}`);
    return balance;
  }

  /** §3.2 承諾來源反查 — 接龍鎖完整鏈 */
  async getReservations(user: RequestUser, partId: string, warehouseId: string) {
    const tenantId = requireTenantId(user);

    // Step 1: 一次撈 SoItem + 所有可能的反查 relations（避免 N+1）
    const items = await this.prisma.nx04SoItem.findMany({
      where: {
        partId,
        warehouseId,
        so: { tenantId }, // tenantId 在 SO header
        OR: [
          { transferStatus: { not: 'C' } },
          { fulfillStatus: { not: 'F' } },
        ],
      },
      orderBy: [
        { so: { expectedDeliveryDate: { sort: 'asc', nulls: 'last' } } },
        { so: { soDate: 'asc' } },
        { so: { docNo: 'asc' } },
      ],
      select: {
        id: true,
        soId: true,
        partId: true,
        warehouseId: true,
        qty: true,
        transferSourceType: true,
        transferStatus: true,
        fulfillStatus: true,
        stId: true,
        tiId: true,
        coId: true,
        so: {
          select: {
            id: true,
            docNo: true,
            soDate: true,
            status: true,
            expectedDeliveryDate: true,
            createdBy: true, // 業務 user id（取捨 5 方案 b）
            customer: { select: { id: true, name: true } },
          },
        },
        st: {
          select: {
            id: true, docNo: true, status: true, stDate: true, postedAt: true, receivedAt: true,
            fromWarehouse: { select: { id: true, code: true, name: true } },
            toWarehouse: { select: { id: true, code: true, name: true } },
          },
        },
        ti: {
          select: {
            id: true, docNo: true, status: true, tiDate: true,
            partner: { select: { id: true, name: true } },
            subtotal: true,
          },
        },
        co: {
          select: {
            id: true, docNo: true, status: true, coDate: true, expectedFulfillDate: true,
            customer: { select: { id: true, name: true } },
          },
        },
        rev_Nx02Rfq_sourceSoItemId: {
          select: {
            id: true, docNo: true, status: true,
            rev_Nx02Qt_rfqId: { select: { inquiryPartnerId: true, status: true } },
          },
        },
      },
    });

    if (items.length === 0) return { partId, warehouseId, items: [] };

    // Step 2: 收集 createdBy → 抓 user.name（取捨 5 方案 b）
    const userIds = [...new Set(items.map((it) => it.so.createdBy))];
    const users = await this.prisma.nx01User.findMany({
      where: { id: { in: userIds }, tenantId },
      select: { id: true, fullName: true }, // ← 看 schema 實際欄位（fullName / name 等）
    });
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    // Step 3: 把 raw row 轉成接龍鎖結構（§5.2 意圖）
    const shaped = items.map((it) => this.shapeReservationItem(it, userMap));
    return { partId, warehouseId, items: shaped };
  }

  // ----- private helpers -----

  private shapeReservationItem(raw: RawSoItemWithRelations, userMap: Map<string, string>) {
    const refreshmentDoc = this.shapeRefreshmentDoc(raw);
    return {
      soLineItem: {
        id: raw.id,
        soId: raw.soId,
        partId: raw.partId,
        warehouseId: raw.warehouseId,
        qty: raw.qty.toString(),
        transferSourceType: raw.transferSourceType,
        transferStatus: raw.transferStatus,
        fulfillStatus: raw.fulfillStatus,
      },
      so: {
        id: raw.so.id,
        docNo: raw.so.docNo,
        soDate: raw.so.soDate,
        status: raw.so.status,
        expectedDeliveryDate: raw.so.expectedDeliveryDate,
        customerId: raw.so.customer.id,
        customerName: raw.so.customer.name,
        creatorId: raw.so.createdBy,
        creatorName: userMap.get(raw.so.createdBy) ?? null,
      },
      refreshmentDoc,
    };
  }

  private shapeRefreshmentDoc(raw: RawSoItemWithRelations) {
    switch (raw.transferSourceType) {
      case 'S':
        return { type: 'self', detail: null };
      case 'T':
        return raw.st ? { type: 'transfer', detail: { /* st snapshot */ ... } } : { type: 'transfer', detail: null };
      case 'G':
        if (raw.ti) {
          // 已採用 QT
          return { type: 'inquiry', detail: { /* ti snapshot */ ... } };
        }
        // 中間態（tiId=null）— 走 RFQ 反查
        const rfq = raw.rev_Nx02Rfq_sourceSoItemId[0]; // 1 SoItem ↔ 1 RFQ stub
        if (!rfq) return { type: 'inquiry_pending', detail: null }; // 異常容錯
        const partnerSet = new Set(rfq.rev_Nx02Qt_rfqId.map((q) => q.inquiryPartnerId));
        return {
          type: 'inquiry_pending',
          detail: {
            rfqId: rfq.id,
            docNo: rfq.docNo,
            rfqStatus: rfq.status,
            qtCount: rfq.rev_Nx02Qt_rfqId.length,
            partnerCount: partnerSet.size,
          },
        };
      case 'B':
        return raw.co ? { type: 'co', detail: { /* co snapshot */ ... } } : { type: 'co', detail: null };
      default:
        return { type: 'unknown', detail: null };
    }
  }
}
```

### 3.4 Controller

```typescript
// apps/nx-api/src/nx03/stock-reservation/stock-reservation.controller.ts
@Controller('nx03/stock')
@UseGuards(JwtAuthGuard) // ⚠️ 取捨 4：開放，不加 @Roles
export class StockReservationController {
  constructor(private readonly svc: Nx03StockReservationService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser, @Query() q: GetStockSummaryQueryDto) {
    return this.svc.getStockSummary(user, q.partId.trim(), q.warehouseId.trim());
  }

  @Get('reservations')
  getReservations(@CurrentUser() user: RequestUser, @Query() q: GetReservationsQueryDto) {
    return this.svc.getReservations(user, q.partId.trim(), q.warehouseId.trim());
  }
}
```

### 3.5 DTO

```typescript
// apps/nx-api/src/nx03/stock-reservation/dto/stock-reservation.dto.ts
export class GetStockSummaryQueryDto {
  @IsString() @MaxLength(15) partId!: string;
  @IsString() @MaxLength(15) warehouseId!: string;
}

export class GetReservationsQueryDto {
  @IsString() @MaxLength(15) partId!: string;
  @IsString() @MaxLength(15) warehouseId!: string;
}
```

兩個 DTO 結構相同但**保持分開**（將來各自可能加參數，例如 reservations 加 `?includeCancelled=true`）。

### 3.6 Route 設計

| Method | Path | Service method | 取捨 |
|---|---|---|---|
| GET | `/nx03/stock/summary?partId=X&warehouseId=Y` | `getStockSummary` | 取捨 1 (a) |
| GET | `/nx03/stock/reservations?partId=X&warehouseId=Y` | `getReservations` | 取捨 1 (a) |

選 `/nx03/stock/*` 而非 `/nx03/stock-reservation/*` 因為 summary 不算「reservation」query — 用 `stock` 作 prefix 對齊「stock 模組」概念。

---

## 4. N+1 防範策略（意圖 §5.3 重點）

### 4.1 一次性 findMany + 完整 include

主 query 一次撈 `Nx04SoItem.findMany` 含全部 relations（so/st/ti/co/rev_Nx02Rfq_sourceSoItemId/rev_Nx02Qt_rfqId）。Prisma 7 用 raw SQL 帶 LEFT JOIN，總共 **1 次 round-trip**。

### 4.2 二段 query（user lookup）

第二輪 `nx01_user.findMany({ where: { id: { in: createdByIds } } })` 取 user.name，**不是 N+1**（一次 IN 查全部）。如果 N 筆 reservation 帶 K 個 distinct user，總共 **2 次 round-trip**（不論 N 大小）。

### 4.3 不需要的反查路徑

- 不查 nx02_qt 的細節（只在 G middle state 算 count + distinct partner，已含在 RFQ relation 內）
- 不查 nx03_stock_ledger 歷史（屬另一 task）
- 不查 nx02_ti_item / nx03_st_item / nx02_rfq_item 細節（只看 header 狀態夠了）

---

## 5. 排序穩定性（意圖 §4.3 / §5.4）

### 5.1 SQL 排序語法

PostgreSQL：
```sql
ORDER BY 
  so.expected_delivery_date ASC NULLS LAST,
  so.so_date ASC,
  so.doc_no ASC
```

Prisma 7：
```typescript
orderBy: [
  { so: { expectedDeliveryDate: { sort: 'asc', nulls: 'last' } } },
  { so: { soDate: 'asc' } },
  { so: { docNo: 'asc' } },
]
```

### 5.2 三層排序保證 deterministic

兩筆 row 完全相等的可能性：
- 同 `expectedDeliveryDate`（含都 null）
- 同 `soDate`
- 同 `docNo` ← 不可能，schema `@@unique([docNo])`

→ 三層排序保證 100% deterministic（不會 row order 亂跳）。

---

## 6. 業務語意對應（schema → 意圖回傳）

| 意圖 §5.2 欄位 | schema 對應 | 備註 |
|---|---|---|
| soLineItem.id/soId/partId/warehouseId/quantity | Nx04SoItem.id/soId/partId/warehouseId/qty | 直接 |
| soLineItem.transferSourceType | Nx04SoItem.transferSourceType | S/T/G/B |
| soLineItem.transferStatus/fulfillStatus | Nx04SoItem.transferStatus/fulfillStatus | P/I/C, W/PK/PL/D/F |
| soLineItem.expectedDeliveryDate | **Nx04So.expectedDeliveryDate**（不在 SoItem） | header level |
| so.id/docNo/soDate/status | Nx04So.\* | 直接 |
| so.customerId/customerName | Nx04So.customer.id/name | join nx01_partner |
| so.creatorId/creatorName | Nx04So.createdBy → nx01_user lookup | 取捨 5 方案 b（命名改 creator*）|
| refreshmentDoc.transfer.\* | Nx04SoItem.st.\* | join nx03_st |
| refreshmentDoc.inquiry.\* | Nx04SoItem.ti.\* | join nx02_ti |
| refreshmentDoc.inquiry.inquiryPartnerName | Nx04SoItem.ti.partner.name | join nx01_partner |
| refreshmentDoc.inquiryPending.\* | Nx04SoItem.rev_Nx02Rfq_sourceSoItemId[0] + count QT | B5-A 反查路徑 |
| refreshmentDoc.co.\* | Nx04SoItem.co.\* | join nx04_co |
| refreshmentDoc.co.vendorPartnerName | Nx04SoItem.co.customer.name | join nx01_partner |

⚠️ 意圖 §5.2 寫 `vendorPartnerId` for type='B'，但 [Nx04Co](packages/db-core/prisma/schema.prisma) 的對象欄位是 `customerId`（CO = 客戶訂單，partner=customer）。**spec 內 DTO 用 `customerId`/`customerName` 對齊 schema 語意**，意圖版的 `vendorPartner*` 是命名疏漏。

---

## 7. 測試案例（意圖 §9 要求 8+ 案）

### 7.1 Unit tests（mock prisma + 假資料）

| # | 測試名 | 對應意圖 | 重點 |
|---|---|---|---|
| 1 | `stock-summary.spec.ts > returns physical/reserved/available three numbers + part/warehouse meta` | §3.1 / §5.1 | 直接讀 stock_balance |
| 2 | `stock-summary.spec.ts > throws NotFoundException when stock_balance not exists` | §3.1 邊界 | 沒建過該 (part,warehouse) row |
| 3 | `reservations-self.spec.ts > type='S' returns refreshmentDoc.type='self' with null detail` | §5.2 | 本倉夠不需補貨 |
| 4 | `reservations-transfer.spec.ts > type='T' returns transfer detail with from/to warehouse` | §5.2 | ST 反查 |
| 5 | `reservations-inquiry-adopted.spec.ts > type='G' with tiId returns inquiry detail with partner` | §5.2 | TI 反查 |
| 6 | `reservations-inquiry-pending.spec.ts > type='G' with tiId=null returns inquiry_pending with qtCount + partnerCount` | §4.4 / §5.2 | RFQ 反查中間態 |
| 7 | `reservations-co.spec.ts > type='B' returns co detail with customer` | §5.2 | CO 反查 |
| 8 | `reservations-sort.spec.ts > sorts by expectedDeliveryDate ASC NULLS LAST + soDate + docNo` | §4.3 / §5.4 | 排序穩定性（含 null） |
| 9 | `reservations-sort.spec.ts > excludes items with transferStatus='C' AND fulfillStatus='F'` | §4.1 | 已完成 row 不列 |

### 7.2 Integration test（INTEGRATION_DB=1，重用 B5 fixture）

| # | 測試名 | 對應意圖 | 重點 |
|---|---|---|---|
| 10 | `reservations-tenant-isolation.int-spec.ts > tenant A's reservations not visible to tenant B` | §5.5 | 多租戶隔離 + 接龍鎖 end-to-end |

**滿足意圖 §9 下限 8+**：8 unit + 1 integration = **9 案**（多 1 個 fulfillStatus='F' filter 確認）。

### 7.3 共用 helpers

Reuse B5 的 `loadOrCreateB5Fixture()`（已建 part/warehouse/customer/inquiryPartner/etc）+ `buildRfqScenario()` 衍生出 B2 fixture。新增 helper：
- `buildSoLineItemScenario(prisma, fixture, transferSourceType)`：給 4 種 type 各建一個 SoItem 測試骨架
- 對 type='G' middle state：用 `buildRfqScenario` 建 SO + RFQ stub（不採用 QT）
- 對 type='G' adopted：用 `buildRfqScenario` + `svc.adoptQt()` 走 B5 正常流程
- cleanup：cleanupSo + cleanupScenario（已有）

⚠️ Integration test 只 1 案是因為核心邏輯都 unit 測完了，integration 主要驗 multi-tenant 隔離 + Prisma `.include` + sort 在真 DB 行為一致（unit 用 mock 沒辦法測 SQL ORDER BY NULLS LAST 真實行為）。

---

## 8. 風險點 + 待確認

### 8.1 給 Alex 拍板的取捨清單（共 5 個）

| # | 取捨 | 章節 | 推薦 | 影響 |
|---|---|---|---|---|
| 1 | endpoint 拆 vs 合 | §2.1 | (a) 拆兩個 | route 結構 |
| 2 | 分頁 | §2.2 | (a) 不分頁 | service 簽章 |
| 3 | cache | §2.3 | 不 cache | 觀察將來壓測再評估 |
| 4 | access control | §2.4 | (a) 開放 + JwtAuthGuard | controller @Roles |
| 5 | salespersonName 從哪拿 | §2.5 | (b) service-side 二段 lookup | service 多一次 query |

### 8.2 範圍外的事

- `stock-balance.controller` 既有 `@Roles('ADMIN')` 是否放寬 → **不在 B2 範圍**（另起 task 評估）
- 跨倉/跨料號反查 → Phase 2 W2 完整版
- stock_ledger 歷史 → 另一 task

### 8.3 未來 task 線索（Crown 拍板附帶 2）

**TODO（記給未來 W2-mini 上線後評估）**：

> 如果 W2-mini 上線後業務反映「需要看到實際業務歸屬（vs 建單者）」場景——
> 例如業務小李代主管建單給老王的客戶、或夜班代日班建單——B2 回傳的
> `creatorId/creatorName`（= `Nx04So.createdBy`）會無法準確反映業務歸屬。
>
> 對應方案：起 schema patch task 加 `nx04_so.salespersonId VARCHAR(15) NOT NULL FK to nx01_user`，
> 從 SO 建單流程強制要求選擇業務歸屬，並在 B2 回傳新增獨立 `salespersonId` /
> `salespersonName` 欄位（跟 `creatorId` / `creatorName` 並存）。
>
> 觸發信號：W2-mini 用戶回饋「creator 不是我要看的人」、或 NX04 業務績效報表
> 開始要算個人業績時。
>
> 此線索**不影響 B2 落地**，是給後續觀察用。

意圖版 §5.2 原命名 `salespersonId` / `salespersonName` 是上述「業務歸屬」概念，但 Phase 0
schema 沒有這個欄位、實務上跟 createdBy 也不一定相同——所以 B2 落地用 `creatorId` /
`creatorName` 老實對齊 schema，將來真要拆業務歸屬語意再起新 task。

**意圖版命名修正紀錄**：
- §5.2 `vendorPartnerName` for type='B'：CO schema 用 `customerId`（CO = 客戶訂單、不是廠商訂單）→ spec 用 `customerName` 對齊
- §5.2 `salespersonId/Name`：schema 沒此欄位 → spec 用 `creatorId/Name` 對齊 createdBy 真實語意

### 8.3 schema 對齊檢查（自核對）

| 意圖描述 | DB schema 實狀 | 一致？ |
|---|---|---|
| 預設排序 expectedDeliveryDate ASC NULLS LAST | Nx04So.expectedDeliveryDate DateTime? | ✅ |
| reserved_qty 來源是 SO line item 加總 | D3 trigger 維護 | ✅（B2 不算、直接讀 stock_balance）|
| type='G' 中間態走 rev_Nx02Rfq_sourceSoItemId | B5-A schema patch 已加 | ✅ |
| salespersonId/salespersonName | **schema 沒有 salesperson 欄位** | ⚠️ 取捨 5 方案 b 解決 |
| co.vendorPartnerId | schema 是 `customerId` | ⚠️ 命名疏漏，spec 用 customer* |

---

## 9. DoD（Definition of Done）

- [ ] 此 spec 拿到 Alex review 拍板（含 5 個取捨點）
- [ ] `Nx03StockReservationService` 2 個 method 落地（getStockSummary + getReservations）
- [ ] DTO 2 組（GetStockSummaryQueryDto + GetReservationsQueryDto）
- [ ] `StockReservationController` 2 個 endpoint
- [ ] 9 個測試案例（8 unit + 1 integration）全綠
- [ ] commit + push 到 `feature/wp-phase0-schema`
- [ ] 沒動既有 stock-balance / stock-ledger（B2 範圍乾淨）

---

## 10. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版實作 spec，對齊意圖 v1.0，列 5 個 Alex 拍板點 |

---

*文件結束。等 Alex review 拍板後才進 §3 程式碼實作。*
