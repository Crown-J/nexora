<!-- docs/nx04/spec/impl/d4-impl_translator.md -->
# D4 — SYS-C Translator 實作 spec

> 文件類型：實作 spec（Hank 對照真實 nx-api 寫，給自己照著實作 + 給 Alex review）
> 撰寫者：Hank
> 日期：2026-04-25
> 對應意圖：[../intent/translator-intent.md](../intent/translator-intent.md)
> 對照基準：`apps/nx-api/src/nx04/`（@ feature/wp-phase0-schema afa84d0）
> 狀態：待 Alex review → 拍板後才寫程式碼

---

## 0. 文件性質

把 D4 意圖版 5 條邏輯對應到**真實 NestJS service 結構** + 真實 Prisma schema（D3-impl 已落地）的實作藍圖。所有 class 名 / function 簽章 / import 路徑用既有 nx-api repo 的命名慣例。

---

## 1. 真實 nx-api 結構的關鍵發現（影響取捨）

寫這份前讀了 `apps/nx-api/src/nx04/` 既有結構：

### 1.1 既有 `SoService` 已包單一 transaction，但邏輯**不是翻譯器**

[so.service.ts:226-288](apps/nx-api/src/nx04/so/so.service.ts#L226-L288) 既有 `create(user, dto)` 結構：
- ✅ 整段在 `prisma.$transaction()` 內 — 對齊意圖 §3.1
- ✅ 含 `assertCustomerC()` 校驗 + `recalcSoTotals()` 重算 + audit log
- ❌ 沒做 advisory lock
- ❌ 沒做 retry
- ❌ `sourceType: 'S'` 寫死在 SO header（沒處理 line item 級的 `transferSourceType`）
- ❌ `itemStatus: 'WP'` 寫死在每個 line item（沒寫新雙段欄位）
- ❌ 沒建 IT / RFQ / CO 補貨單

換句話說，既有 `SoService.create()` 是「**手動建單**」的執行邏輯（業務在管理畫面手動 INSERT 一張 SO）— 跟 D4 翻譯器的「**業務送單後自動建補貨單 + 雙帳同步**」是不同職責。

### 1.2 共用工具齊全，可直接 reuse

`apps/nx-api/src/shared/nx04/` 已有：
- [`nx04-doc-no.ts`](apps/nx-api/src/shared/nx04/nx04-doc-no.ts) — `allocNx04DocNo(tx, tenantId, kind, warehouseCode)` 產 SO/QT/SR 編號
- [`nx04-state-machine.ts`](apps/nx-api/src/shared/nx04/nx04-state-machine.ts) — `SoStatus` enum + 轉移檢查
- [`nx04-location.ts`](apps/nx-api/src/shared/nx04/nx04-location.ts) — `requireDefaultLocationId()`

要新建：
- `nx04-doc-no.ts` 加 `'IT' | 'RFQ' | 'CO'` 三個 kind（或拆到 shared/nx02、shared/nx03）
- `nx04-translator-error.ts` — 自定 exception class
- `nx04-advisory-lock.ts` — pg_advisory_xact_lock 包裝

### 1.3 沒測試框架

`apps/nx-api/package.json` 沒裝 `jest` / `ts-jest` / `vitest`，整個 repo 沒一隻 `*.spec.ts`。意圖 §8 要求測試 — 我把這列為「先決條件」，建議跟 D4 service 同 commit 補上 vitest。詳見 §8。

### 1.4 既有 SO controller 路由結構

`@Controller('nx04/so')` + `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')`。新翻譯器走 `@Controller('nx04/so')` 同 prefix 不同子路徑（避免兩支 controller 撞 base path）。詳見 §4.5。

### 1.5 既有 SO 路由 sop-demo 已用，不能改

CLAUDE.md 多處提及「教學模式」、`sop-demo/Step8` 等仍在使用 — 既有 `POST /nx04/so` 路由不能改其行為，否則破壞教學模式。**新翻譯器走新路由 `POST /nx04/so/translate`**。

---

## 2. 5 個工程取捨決定（含 §5.4 既有 service 處置）

### 取捨 1（意圖 Q1）：service 結構 — 分層派 (b)

**4 個 class，各自單一職責**：

| Class | 職責 | 檔位 |
|---|---|---|
| `Nx04SoTranslatorService` | 翻譯主流程 + retry wrapper | `apps/nx-api/src/nx04/so/translator/translator.service.ts` |
| `TransferSourceResolver` | 解 `transferSourceRef` → 對應 warehouse / partner / co | `.../translator/transfer-source-resolver.ts` |
| `RefreshmentDocCreator` | 三種補貨單（IT/RFQ/CO）的策略派發 | `.../translator/refreshment-doc-creator.ts` |
| `AdvisoryLockManager` | `pg_advisory_xact_lock` + lock_timeout 包裝 | `apps/nx-api/src/shared/nx04/nx04-advisory-lock.ts` |

**理由**：意圖 §1 列出「翻譯」+「鎖管理」+「補貨單派發」+「來源解析」4 個明顯不同職責，分層讓單元測試容易（mock 任一層都能獨立測試）。

**放棄 (a) 單一 class**：所有邏輯擠進 `Nx04SoTranslatorService` 會超過 500 行，違反 NestJS 慣例。

**放棄 (c) 其他**：沒 better idea。

### 取捨 2（意圖 Q2）：retry 機制 — 主 service 內 (a)

**Translator 內部包 retryable wrapper**。

```typescript
// 偽碼示意
async translate(user, dto): Promise<TranslateResult> {
  return this.runWithRetry(async () => {
    return this.prisma.$transaction(async (tx) => {
      // ... 整段翻譯邏輯
    });
  });
}

private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  const backoffs = [50, 200, 800];
  let lastErr: unknown;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    try { return await fn(); }
    catch (e) {
      if (!this.isRetryable(e)) throw e;
      this.logger.warn(`Translate retry attempt=${attempt + 1} reason=${this.errCode(e)}`);
      await sleep(backoffs[attempt]);
      lastErr = e;
    }
  }
  throw new TranslatorBusyError({ cause: lastErr });
}

private isRetryable(e: unknown): boolean {
  // P2034 (serialization) / 40P01 (deadlock) / 55P03 (lock_not_available)
  // ...
}
```

**理由**：意圖 §3.4「retry 整個 transaction，不是只 retry 失敗的那一步」 — interceptor / decorator 不容易控 transaction 邊界（要在 transaction 外 retry，否則 retry 用的是炸過的 tx）。Controller 層 retry 違反關注點分離。

**放棄 (b) interceptor**：Prisma transaction 對外是個 single Promise，interceptor 看不到內部 deadlock 的真因（catch 到的是 PrismaClientKnownRequestError，但要回頭重新開 tx 太曲折）。

**放棄 (c) controller**：controller 應該只做 input 驗證 + 結果格式化，不該知道 retry 細節。

### 取捨 3（意圖 Q3）：advisory lock timeout — 5 秒（SET LOCAL）

```typescript
// 偽碼示意，AdvisoryLockManager 內部
async acquireXactLocks(tx, keys: { tenantId, partId, warehouseId }[]) {
  // PostgreSQL lock_timeout 設成 5 秒（這個 transaction 內有效）
  await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

  // 排序 keys 避免 deadlock（意圖 §3.3）
  const sorted = [...keys].sort((a, b) =>
    `${a.partId}:${a.warehouseId}`.localeCompare(`${b.partId}:${b.warehouseId}`)
  );

  for (const k of sorted) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${k.tenantId} || ':' || ${k.partId} || ':' || ${k.warehouseId}, 0)
      )
    `;
  }
}
```

**為什麼 5 秒**：
- < 1 秒：太短，正常 SO transaction 在大量 line item + trigger 觸發下可能 2~3 秒，會把正常情況誤判為超時
- 5 秒：足夠覆蓋正常 SO 完整 transaction 含 4 個 trigger（trg_nx04_so_item_reserved_sync 等）
- > 10 秒：業務體感差（按下「送出」等 10 秒沒回應 → 重複按）

**超時行為**：PostgreSQL 拋 `55P03 lock_not_available` → translator catch + retry（同取捨 2）。3 次都超時 → 拋 `TranslatorBusyError`（業務看「系統忙碌請重試」）。

**SET LOCAL 範圍**：只在當前 transaction 有效，不污染 connection pool。

### 取捨 4（意圖 Q4）：失敗訊息 — 三層 Exception

```
TranslatorBaseError (extends Error)
├── TranslatorInvalidInputError       // 輸入錯，業務友善訊息
│   ├── 'TRANSFER_SOURCE_REF_NOT_FOUND'  → 「補貨來源 'XXX' 不存在」
│   ├── 'PART_NOT_IN_TENANT'             → 「料號 'XXX' 不屬於目前租戶」
│   └── 'CUSTOMER_NOT_C_PARTNER'         → 「客戶 'XXX' 不是有效客戶」
├── TranslatorBusyError                 // 並發失敗
│   └── 統一訊息：「系統忙碌，請稍後再試」
└── TranslatorSystemError                // unknown / DB 斷
    └── 統一訊息：「系統錯誤，請聯絡管理員（錯誤碼 XXX）」
```

每個 Error 含：
- `code`: 機讀錯誤碼（給 log / monitor）
- `userMessage`: 給業務看（i18n key）
- `httpStatus`: 對應 HTTP status（400 / 503 / 500）

接 NestJS `@Catch(TranslatorBaseError)` exception filter 統一回應格式。

**底線（意圖 Q4）**：
- 不暴露 PostgreSQL errno / Prisma error code 給業務
- log 完整堆疊（含 cause chain）但 response 只給 userMessage

### 取捨 5（意圖 Q5）：log 策略 — 用 NestJS Logger，4 級別

```typescript
private readonly logger = new Logger(Nx04SoTranslatorService.name);

// INFO：成功翻譯一行
this.logger.log(
  `Translated SO ${so.docNo} tenant=${tenantId} items=${dto.lineItems.length} ` +
  `it=${itIds.length} rfq=${rfqIds.length} co=${coIds.length} elapsedMs=${elapsed}`
);

// WARN：retry 發生
this.logger.warn(`Translate retry attempt=${n} reason=${errCode} backoffMs=${ms}`);

// ERROR：3 次 retry 失敗 / unknown
this.logger.error(`Translate failed after retries`, err.stack);

// DEBUG（dev only）：lock 取得
this.logger.debug(`Acquired lock for ${tenantId}:${partId}:${warehouseId}`);
```

**為什麼用 NestJS Logger**：既有 service 全部用這個（grep `new Logger` 結果），保持一致。不引入第三方（pino / winston）— 範圍超出 D4。

**INFO 內容刻意精簡**：每筆翻譯一行 log，方便 grep / aggregate。不寫 lineItem 詳情（屬 audit log 範疇，[so.service.ts:275-285](apps/nx-api/src/nx04/so/so.service.ts#L275-L285) 既有 `Nx01AuditLogWriterService` 已處理）。

### 取捨 6（意圖 §5.4）：與既有 `SoService` 關係 — **不動既有，新建翻譯器**

**決定**：保留 `SoService.create()`，新建 `Nx04SoTranslatorService.translate()` 走新路由 `POST /nx04/so/translate`。

**理由**：
1. 既有 `SoService.create()` 服務 sop-demo / 銷貨單管理 UI 等多處，CLAUDE.md 多處提教學模式必須留 — 動既有 service 風險高、影響範圍模糊
2. 兩條 path 目標 audience 不同：
   - 既有：sales admin 在「銷貨單管理畫面」手動建 / 編輯 SO（含 audit log、量表單欄位）
   - 新的：業務在 W2 工作台快速送單，系統自動翻譯
3. 新 path 的 `translate()` 比 `create()` 簡單（沒手動編輯 line item 流程）— 各做各的，不互相耦合
4. 共享底層抽到 `shared/nx04/`（`allocNx04DocNo` 等已是這設計）

**Phase 3 收尾再評估**：當前端 W2 工作台穩定後，看是否把既有 `create()` 也改用 translator（讓兩條 path 收斂）。屆時另起 ADR。

### 取捨 7（schema 對齊）：既有 `nx04_so.source_type` 跟新 `transfer_source_type` 雙寫策略

D3-impl trigger 4（`trg_nx04_so_protect_source_type_t`）會把 `nx04_so.source_type` 強制設為 `'S'`（dev 模式 NOTICE，prod 模式 EXCEPTION）。

Translator INSERT SO 時：
- `source_type: 'S'`（被 trigger 4 強制套，所以給什麼值都會被 reset）
- 真正語意走 line item 的 `transfer_source_type`

`itemStatus`（既有舊欄位）會被 D3 trigger 3（`trg_nx04_so_item_dual_write`）自動依 `(transfer_status, fulfill_status)` 雙寫，translator INSERT line item 時**不需要寫 `itemStatus`**（trigger 會根據新雙段欄位自動算對應舊值）。

⚠️ 但 既有 `SoService.create()` 仍寫 `itemStatus: 'WP'`（[so.service.ts:324](apps/nx-api/src/nx04/so/so.service.ts#L324)）— trigger 3 是 BEFORE INSERT/UPDATE，會根據 `(transfer_status, fulfill_status)` 算出 itemStatus 並覆蓋傳入值。所以**既有寫 'WP' 也不會出錯**（trigger 用新雙段欄位的預設值 `('C', 'W')` 算出 `'WP'` — 跟既有寫的一樣，無 noisy 衝突）。

---

## 3. Service 結構詳細

### 3.1 模組註冊

`apps/nx-api/src/nx04/nx04.module.ts` 修：

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [QuoteController, SoController, SoTranslatorController, SalesReturnController],
  providers: [
    QuoteService, SoService, SalesReturnService,
    Nx04SoTranslatorService,
    TransferSourceResolver,
    RefreshmentDocCreator,
    // AdvisoryLockManager 不註冊為 provider，是 stateless utility
  ],
})
export class Nx04Module {}
```

### 3.2 主服務：`Nx04SoTranslatorService`

```typescript
// apps/nx-api/src/nx04/so/translator/translator.service.ts
@Injectable()
export class Nx04SoTranslatorService {
  private readonly logger = new Logger(Nx04SoTranslatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: TransferSourceResolver,
    private readonly docCreator: RefreshmentDocCreator,
  ) {}

  /** 翻譯入口：業務送 W2 工作台 SO 變成所有相關單據 */
  async translate(
    user: RequestUser,
    dto: TranslateSoDto,
  ): Promise<TranslateSoResult> {
    const tenantId = requireTenantId(user);
    const start = Date.now();
    const result = await this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // 1. 校驗客戶 / 倉 / 來源 ref
        await this.validateInputs(tx, tenantId, dto);

        // 2. 取 advisory locks（已排序 → 防 deadlock）
        const lockKeys = this.collectLockKeys(tenantId, dto);
        await Nx04AdvisoryLock.acquireXactLocks(tx, lockKeys);

        // 3. INSERT SO header
        const so = await this.insertSoHeader(tx, user, tenantId, dto);

        // 4. INSERT line items（initial status 依 transfer_source_type 決定）
        const items = await this.insertLineItems(tx, user, so.id, dto);

        // 5. 對 type != 'S' 的 line item 建補貨單
        const refreshments = await this.docCreator.createForLineItems(
          tx, user, tenantId, so, items, dto
        );

        // 6. trigger 已自動更新 reserved_qty（D3 trigger 1）

        return this.shapeResult(so, items, refreshments);
      }, { isolationLevel: PrismaNs.TransactionIsolationLevel.ReadCommitted })
    );

    const elapsed = Date.now() - start;
    this.logger.log(
      `Translated SO ${result.soNumber} tenant=${tenantId} items=${dto.lineItems.length} ` +
      `it=${result.itIds.length} rfq=${result.rfqIds.length} co=${result.coIds.length} elapsedMs=${elapsed}`
    );
    return result;
  }

  // ----- private helpers -----

  private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> { /* 取捨 2 */ }
  private isRetryable(e: unknown): boolean { /* P2034/40P01/55P03 */ }
  private async validateInputs(...) { /* 校驗 */ }
  private collectLockKeys(...) { /* 抽 (tenant, part, warehouse) 三元組 */ }
  private async insertSoHeader(...) { /* INSERT SO + sourceType 'S'（trigger 會 enforce）*/ }
  private async insertLineItems(...) { /* 含 initial transfer_status */ }
  private shapeResult(...) { /* 組 response */ }
}
```

### 3.3 `TransferSourceResolver`

```typescript
// .../translator/transfer-source-resolver.ts
@Injectable()
export class TransferSourceResolver {
  /**
   * 校驗 transferSourceRef 對應的目標真實存在於同租戶
   * - type='S'  → ref 應為 null
   * - type='T'  → ref 必為 nx01_warehouse.id（同租戶 + active）
   * - type='G'  → ref 必為 nx01_partner.id（partner_type='S' 同行）
   * - type='B'  → ref 應為 null（CO 是 translator 內部建，不是 ref 指既有 CO）
   */
  async resolveAll(
    tx: Prisma.TransactionClient,
    tenantId: string,
    items: TranslateLineItemDto[],
  ): Promise<ResolvedTransferSource[]> {
    // ...
  }
}
```

### 3.4 `RefreshmentDocCreator`

```typescript
// .../translator/refreshment-doc-creator.ts
@Injectable()
export class RefreshmentDocCreator {
  /**
   * 對每個 transferSourceType != 'S' 的 line item 建對應補貨單，
   * 並 UPDATE line item.{stId,tiId,coId} + transferStatus → 'I'
   */
  async createForLineItems(
    tx, user, tenantId, so, items, dto,
  ): Promise<RefreshmentResult> {
    const result = { itIds: [], rfqIds: [], coIds: [] };
    for (const item of items) {
      switch (item.transferSourceType) {
        case 'T': await this.createIt(tx, user, so, item, ...); break;
        case 'G': await this.createRfq(tx, user, so, item, ...); break;
        case 'B': await this.createCo(tx, user, so, item, ...); break;
        // 'S' 跳過
      }
    }
    return result;
  }

  private async createIt(...) { /* INSERT nx03_st + nx03_st_item with sourceSoItemId */ }
  private async createRfq(...) { /* INSERT nx02_rfq（簡化：先 stub，待 B5 spec）*/ }
  private async createCo(...) { /* INSERT nx04_co with sourceSoItemId */ }
}
```

⚠️ **注意：B5 RFQ/QT API 還沒 spec**。Phase 0 D4 範圍內 `createRfq()` 暫時走 stub（建一筆 nx02_rfq 含基本欄位 + nx02_rfq_item with sourceSoItemId 等同 spec），完整流程等 B5 spec 確定後再升級。**這個 stub 行為要在 D4-impl spec 內標 ⚠️ 給 Alex review 確認**。

### 3.5 `Nx04AdvisoryLock`（utility，不是 service）

```typescript
// apps/nx-api/src/shared/nx04/nx04-advisory-lock.ts
export class Nx04AdvisoryLock {
  /** 一次取多個 lock，自動排序避免 deadlock */
  static async acquireXactLocks(
    tx: Prisma.TransactionClient,
    keys: LockKey[],
    options?: { timeoutSeconds?: number },
  ): Promise<void> {
    const timeoutSec = options?.timeoutSeconds ?? 5;
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${timeoutSec}s'`);
    const sorted = [...keys].sort((a, b) => keyStr(a).localeCompare(keyStr(b)));
    for (const k of sorted) {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${k.tenantId} || ':' || ${k.partId} || ':' || ${k.warehouseId}, 0)
        )
      `;
    }
  }
}

function keyStr(k: LockKey) { return `${k.tenantId}:${k.partId}:${k.warehouseId}`; }
```

`SET LOCAL lock_timeout` 跟 `pg_advisory_xact_lock()` 都在 transaction 結束時自動釋放，不需手動 unlock。

### 3.6 DTO 跟回傳結構

```typescript
// .../translator/dto/translate-so.dto.ts
export class TranslateSoDto {
  @IsString() @Length(15, 15) customerId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TranslateLineItemDto)
  lineItems: TranslateLineItemDto[];

  // 出貨方式 / 幣別 / 稅率等沿用既有 SO 概念
  @IsString() deliveryType: string;  // 'D' | 'P' | 'C'
  @IsOptional() @IsString() currencyId?: string;
  @IsNumber() taxRate: number;
  @IsOptional() @IsString() remark?: string;
}

export class TranslateLineItemDto {
  @IsString() partId: string;
  @IsString() warehouseId: string;
  @IsNumber() qty: number;
  @IsNumber() unitPrice: number;
  @IsIn(['S', 'T', 'G', 'B']) transferSourceType: 'S' | 'T' | 'G' | 'B';
  @IsOptional() @IsString() transferSourceRef?: string;  // type='S' 時為 null
  @IsOptional() @IsString() remark?: string;
}

export interface TranslateSoResult {
  soId: string;
  soNumber: string;  // docNo
  status: 'CONFIRMED';  // translator 出來的 SO 直接 CONFIRMED
  lineItems: Array<{
    lineItemId: string;
    partId: string;
    warehouseId: string;
    transferSourceType: string;
    transferStatus: 'P' | 'I' | 'C';
    fulfillStatus: 'W';  // 翻譯時必為 W
    relatedItId: string | null;
    relatedTiId: string | null;
    relatedCoId: string | null;
  }>;
  itIds: string[];
  rfqIds: string[];
  coIds: string[];
}
```

### 3.7 Controller

```typescript
// apps/nx-api/src/nx04/so/translator/translator.controller.ts
@Controller('nx04/so')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SALES')  // 業務角色也能用
export class SoTranslatorController {
  constructor(private readonly svc: Nx04SoTranslatorService) {}

  @Post('translate')
  translate(@CurrentUser() user: RequestUser, @Body() dto: TranslateSoDto) {
    return this.svc.translate(user, dto);
  }
}
```

⚠️ 注意：這支 controller 跟既有 `SoController` 都 `@Controller('nx04/so')`，路徑分別是：
- 既有 `POST /nx04/so` → `SoController.create()`（手動建單）
- 新的 `POST /nx04/so/translate` → `SoTranslatorController.translate()`（翻譯器）

NestJS 同 base path 多 controller 是合法寫法。

---

## 4. 5 條意圖邏輯 — 對應到實作位置

| 意圖 §3 | 實作位置 |
|---|---|
| 3.1 單一 transaction（6 步驟） | `Nx04SoTranslatorService.translate()` `prisma.$transaction()` 包整段 |
| 3.2 advisory lock 鎖 (tenant, part, warehouse) | `Nx04AdvisoryLock.acquireXactLocks()` |
| 3.3 多 lineItem 鎖排序避 deadlock | `Nx04AdvisoryLock` 內 `keys.sort()`（按 `${partId}:${warehouseId}` 字典序）|
| 3.4 失敗 retry 3 次 exponential backoff | `Nx04SoTranslatorService.runWithRetry()` |
| 3.5 transferStatus 初始值規則 | `Nx04SoTranslatorService.insertLineItems()` + `RefreshmentDocCreator.createXxx()`（在同 tx 內 INSERT 補貨單後立刻 UPDATE `transferStatus = 'I'`）|

---

## 5. 邊界與接口（意圖 §4 對應實作）

### 5.1 輸入 — 來自前端 W2 工作台

`TranslateSoDto` 已在 §3.6 定義。class-validator 在 controller 自動校驗（NestJS 全局 ValidationPipe，per CLAUDE.md §15）。

### 5.2 輸出 — `TranslateSoResult`

§3.6 定義。包含成功時所有業務需要的資訊。

### 5.3 失敗 — Exception filter

```typescript
// apps/nx-api/src/shared/filters/translator-error.filter.ts
@Catch(TranslatorBaseError)
export class TranslatorErrorFilter implements ExceptionFilter {
  catch(exception: TranslatorBaseError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(exception.httpStatus).json({
      errorCode: exception.code,
      message: exception.userMessage,
    });
  }
}
```

註冊在 `Nx04Module`（local filter，避免影響其他模組）：

```typescript
@Module({
  // ...
  providers: [
    // ...
    { provide: APP_FILTER, useClass: TranslatorErrorFilter },
  ],
})
```

### 5.4 不負責的事（意圖 §4.3）

對齊。Translator 不做：
- 業務規則決策（例：客戶停權檢查在 `assertCustomerC()` 既有邏輯，不會改）
- UI 顯示
- 報表計算
- migration

---

## 6. 跟既有 schema 的互動細節

### 6.1 INSERT `nx04_so` 時

```typescript
const so = await tx.nx04So.create({
  data: {
    tenantId,
    docNo: await allocNx04DocNo(tx, tenantId, 'SO', wh.code),
    warehouseId: wh.id,
    soDate: new Date(),
    customerId: dto.customerId,
    deliveryType: dto.deliveryType,
    sourceType: 'S',  // trigger 4 會強制 'S' — 給什麼都被覆蓋
    currencyId: await resolveCurrencyId(tx, dto.currencyId),
    taxRate: new PrismaNs.Decimal(dto.taxRate),
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: SoStatus.CONFIRMED,  // 翻譯器出來的 SO 直接 CONFIRMED（跳過 DRAFT）
    paymentTerm: await assertCustomerC(tx, tenantId, dto.customerId),
    createdBy: user.sub,
    updatedBy: user.sub,
  },
});
```

### 6.2 INSERT `nx04_so_item` 時（D3 新欄位處理）

```typescript
await tx.nx04SoItem.create({
  data: {
    soId: so.id,
    lineNo,
    partId: item.partId,
    partNo: snap.partNo,
    partName: snap.partName,
    warehouseId: item.warehouseId,
    locationId: await requireDefaultLocationId(tx, tenantId, item.warehouseId),
    qty: new PrismaNs.Decimal(item.qty),
    unitPrice: new PrismaNs.Decimal(item.unitPrice),
    lineAmount: /* qty * unitPrice */,
    reservedQty: 0,  // 由 D3 trigger 1 算，這裡 0 即可
    transferSourceType: item.transferSourceType,
    transferStatus: item.transferSourceType === 'S' ? 'C' : 'P',  // §3.5 初始值
    fulfillStatus: 'W',
    // co_id / ti_id / st_id 等補貨單建立後再 UPDATE
    // itemStatus 不寫（trigger 3 會雙寫）
    createdBy: user.sub,
    updatedBy: user.sub,
  },
});
```

trigger 1 會自動算 reserved_qty。trigger 3 會自動雙寫 itemStatus。

### 6.3 建補貨單後 UPDATE line item（意圖 §3.5「立刻變」）

```typescript
// 在 RefreshmentDocCreator.createIt() 內
const st = await tx.nx03St.create({ data: { /* ... */ } });
const stItem = await tx.nx03StItem.create({
  data: {
    stId: st.id,
    sourceSoItemId: lineItem.id,  // D3 NOT NULL 已建立
    partId: lineItem.partId,
    qty: lineItem.qty,
    // ...
  }
});

// 立刻 UPDATE line item
await tx.nx04SoItem.update({
  where: { id: lineItem.id },
  data: {
    stId: st.id,
    transferStatus: 'I',  // pending → in_progress
  }
});
```

trigger 1 會在這個 UPDATE 觸發但不影響 reserved_qty（fulfill_status 沒變、qty 沒變、warehouse 沒變 → trigger 內所有 case 都不會 fire delta）。

### 6.4 結束 transaction

`prisma.$transaction()` 自然 COMMIT。所有 advisory lock 跟 SET LOCAL 自動釋放。

---

## 7. 錯誤處理具體 case 對應

| 場景 | 觸發點 | 拋出 | 業務看到 |
|---|---|---|---|
| customerId 不在租戶 | `validateInputs` 內 `assertCustomerC` 既有 | `BadRequestException`（既有）| 「customerId must be ... C」（既有訊息） |
| transferSourceRef = warehouse 不存在 | `TransferSourceResolver.resolveAll` | `TranslatorInvalidInputError('TRANSFER_SOURCE_REF_NOT_FOUND')` | 「補貨來源 'XXX' 不存在」 |
| advisory lock 5s 超時 | `acquireXactLocks` raw SQL | PostgreSQL 55P03 → catch retry | 3 次都失敗 → 「系統忙碌」 |
| trigger 內部 RAISE EXCEPTION | trigger 1 的 apply_reserved_delta（理論不應發生） | `PrismaClientKnownRequestError` → 不 retryable | 「系統錯誤」+ log stack |
| Prisma 40P01 deadlock（保險） | $transaction 內任何 INSERT | catch retry | 同上 |

---

## 8. 測試策略

### 8.1 ⚠️ 測試框架未建立 — 建議跟 D4 service 同 commit 補

`apps/nx-api/package.json` 沒裝 `jest` / `vitest`。建議用 **vitest**：
- 跟 NestJS 11 + ESM 友善
- 跑得比 jest 快（重要：translator 整合測試會跑真實 DB）
- 跟既有 db-core 共用 ts-node / tsx

需要新增的 dev dep：
```
vitest, @vitest/coverage-v8, supertest, @testcontainers/postgresql
```

`@testcontainers/postgresql` 給整合測試啟臨時 PostgreSQL 容器（不污染 dev DB）。

### 8.2 單元測試（5 案，意圖 §3 五條各一）

放 `apps/nx-api/src/nx04/so/translator/__tests__/`：

| 檔名 | 測什麼 |
|---|---|
| `translator-tx-atomic.spec.ts` | 意圖 3.1：故意讓建 IT 步驟拋錯，整段 SO + line item 都 ROLLBACK（mock RefreshmentDocCreator 拋 error，斷言 nx04_so 0 列）|
| `translator-lock-precision.spec.ts` | 意圖 3.2：mock acquireXactLocks，驗證傳入 keys 含 (tenant, part, warehouse) 三元組 |
| `translator-lock-order.spec.ts` | 意圖 3.3：傳入打亂順序的 keys，驗證 sort 後傳給 raw SQL 的順序固定 |
| `translator-retry.spec.ts` | 意圖 3.4：mock $transaction 第 1 次拋 P2034 / 第 2 次拋 40P01 / 第 3 次成功，驗證 backoff 間隔 + 最終成功 |
| `translator-status-init.spec.ts` | 意圖 3.5：傳入 4 種 type，驗證 INSERT 的 transferStatus 初始值正確（S→C, T→P, G→P, B→P；補貨單建好後立即 UPDATE 'I'）|

### 8.3 整合測試（2 案）

放 `apps/nx-api/src/nx04/so/translator/__tests__/integration/`：

| 檔名 | 測什麼 |
|---|---|
| `translator-happy-path.int-spec.ts` | 真實 PostgreSQL：建 1 SO 含 4 line item（S/T/G/B 各 1）、驗證 SO + line item + IT + RFQ + CO 都建立、reserved_qty 正確 |
| `translator-concurrent.int-spec.ts` | 起兩個 Promise 並發 translate 同 (part, warehouse)、驗證序列化（reserved_qty 最終 = 兩個 qty 和、無 race）|

### 8.4 不在範圍

- E2E（前端 → API → DB）→ Phase 1 W2-mini 開始時做
- 效能測試（高並發吞吐）→ Phase 2 上 prod 前做

---

## 9. ⚠️ 風險清單

| 風險 | 影響 | 處置 |
|---|---|---|
| RFQ 建立邏輯走 stub（B5 spec 還沒寫）| 中 | spec 內標記 ⚠️、給 Alex review；B5 完成時補完整邏輯 |
| 既有 `SoService.create()` 跟 translator 並存 → 有兩條路建 SO，未來 maintainability 變差 | 中 | Phase 3 收尾 ADR 重新評估是否合併 |
| trigger 3（itemStatus 雙寫）對 translator INSERT 不寫 `itemStatus` 的依賴 | 低 | trigger 3 已用 `IS DISTINCT FROM` 對 INSERT 也算 — translator 不寫 itemStatus 時走 default 'WP'，trigger 會根據新雙段欄位重算覆蓋 |
| 測試框架建立屬基礎設施決策 | 中 | 在 D4-impl spec 內提案 vitest，等 Alex / Crown 確認再裝 |
| `lock_timeout = 5s` 在 dev 容易測但 prod 流量大時可能不夠 | 低 | 設 ENV 可配（`TRANSLATOR_LOCK_TIMEOUT_SEC`），prod 上線時觀察調整 |

---

## 10. 完成定義（給 Hank 自己 check）

- [x] D4-impl spec（本檔）寫完
- [ ] Alex review 通過
- [ ] vitest 測試框架建立 + CI 跑得起來
- [ ] 4 個 class（Nx04SoTranslatorService / TransferSourceResolver / RefreshmentDocCreator / Nx04AdvisoryLock）寫完
- [ ] DTO + Controller + Exception filter 寫完
- [ ] 5 個單元測試 + 2 個整合測試全綠
- [ ] `pnpm build`（apps/nx-api）過
- [ ] 5 條意圖邏輯逐條打勾
- [ ] commit + push 到 feature/wp-phase0-schema

---

## 11. 不在範圍

- B5 RFQ/QT 完整 API（這次 stub）
- D5 navigation policy
- Phase 1 W2-mini 前端
- Phase 2 編輯 / 取消 SO 邏輯
- 既有 `SoService.create()` 收斂（Phase 3 ADR）

---

## 12. 對 Alex review 的請求

請特別 review：

1. **§2 取捨 6**：「不動既有 SoService、新建 translator 走 /so/translate」 — 跟你預期的「升級既有 service」哪個對？我認為兩條 path 並存比較安全，但會增加維護成本。
2. **§3.4 RFQ stub**：B5 還沒 spec，translator 內 createRfq() 走簡化版（建 nx02_rfq + nx02_rfq_item with sourceSoItemId）— 這個 stub 行為意圖上 OK 嗎？還是要等 B5 spec 一起做？
3. **§5.3 status: CONFIRMED**：翻譯器產出的 SO 直接跳過 DRAFT 進 CONFIRMED — 跟你的意圖一致嗎？業務按「送出」就是「確認」的意思。
4. **§8 vitest 測試框架**：跟 D4 service 同 commit 補上。如果 Crown 想另開 task 處理，請說。
5. **§9 lock_timeout 5 秒**：dev 機可能不夠（trigger 鏈跑久），prod 流量大時也可能不夠。我設 ENV 可調，預設 5s。

review 通過後我才動程式碼。

---

## 13. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版實作 spec，對照 nx-api 真實狀態，待 Alex review |

---

*文件結束*
