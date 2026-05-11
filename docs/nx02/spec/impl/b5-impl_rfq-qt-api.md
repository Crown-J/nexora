<!-- docs/nx02/spec/impl/b5-impl_rfq-qt-api.md -->
# B5 — RFQ / QT API 實作 spec

> 文件類型：實作 spec（Hank 對照真實 nx-api 寫，給自己照著實作 + 給 Alex review）
> 撰寫者：Hank
> 日期：2026-04-27
> 對應意圖：[../intent/rfq-qt-api-intent.md](../intent/rfq-qt-api-intent.md) v2
> 對照基準：`apps/nx-api/src/nx02/`、`apps/nx-api/src/nx04/so/translator/`（@ feature/wp-phase0-schema c7b9ebe）
> 銜接：D3 schema（c80dee2 落地的 nx02_qt）、D4 translator（已建 RFQ stub 的 refreshment-doc-creator.ts）
> 狀態：**待 Alex review** → 拍板後才寫程式碼

---

## 0. 文件性質

把意圖 v2 的 5 個業務動作 + 5 條核心邏輯對應到**真實 NestJS service 結構** + 真實 Prisma schema 的實作藍圖。所有 class 名 / function 簽章 / import 路徑用既有 nx-api repo 的命名慣例。

跟 D3-impl / D4-impl 同節奏：先列**讀真實 codebase 的關鍵發現**（影響取捨），再列**工程取捨拍板**，最後給**程式碼骨架 + 測試 + DoD**。

---

## 1. 真實 nx-api 結構的關鍵發現（影響取捨）

寫這份前讀了 [apps/nx-api/src/nx02/](apps/nx-api/src/nx02/) 跟 [apps/nx-api/src/nx04/so/translator/](apps/nx-api/src/nx04/so/translator/) 既有結構。以下 6 點直接影響取捨，**含 4 個 Alex 必須拍板的點**。

### 1.1 既有 `RfqService` CRUD 已備齊，但**不含 QT 邏輯**

[rfq.service.ts](apps/nx-api/src/nx02/rfq/rfq.service.ts) 既有：
- ✅ `list / getById / create / update / softDelete / addItem / patchItem / removeItem` — RFQ header + RFQ items 的 CRUD
- ✅ 用 `requireTenantId(user)` 做租戶隔離
- ✅ 用 `Nx01AuditLogWriterService.write()` 寫稽核
- ❌ 沒有 QT 表的任何 query／write
- ❌ `update()` 內 `assertRfqStatusTransition()` 用既有 state machine（DRAFT/SENT/REPLIED/CLOSED/CANCELLED）

**結論**：B5 不該動 RfqService。新增 `Nx02QtService` 處理 §3.1~§3.5 的 5 個動作，必要時 inject RfqService 或共用 helper。

### 1.2 既有 Nx02Module 沒註冊 QT 相關 controller / service

[nx02.module.ts](apps/nx-api/src/nx02/nx02.module.ts) 只有 4 組（Rfq / Po / Rr / PurchaseReturn）。B5 要新增 QtController + QtService 進 module。

### 1.3 D4 共用工具 reuse 評估

[apps/nx-api/src/shared/nx04/](apps/nx-api/src/shared/nx04/) 的：
- ✅ `Nx04AdvisoryLock.acquireXactLocks()` — 但 key 是 `(tenantId, partId, warehouseId)` 三元組，**B5 要鎖的是 `rfqId`**（單一鍵）。**不能直接 reuse**，要自寫一個 `lockRfqId(tx, tenantId, rfqId)`（同 hash 邏輯，不同 key 結構）。
- ✅ `TranslatorBaseError` / `TranslatorBusyError` / `TranslatorInvalidInputError` / `TranslatorSystemError` — class 名綁 D4「Translator」概念，B5 不該直接 reuse 命名。但**這 4 個 class 的結構本身（code/userMessage/httpStatus）是通用的**，可以提升成 shared base 或讓 B5 自己寫一組對應的（簡單但會重複）。

→ **取捨點 §2.1**（Alex review）：lock 工具放哪？error class 是否提升 shared？

### 1.4 D4 已建好的 RFQ stub status 是 `'DRAFT'`

[refreshment-doc-creator.ts:157](apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts#L157)：
```typescript
const rfq = await tx.nx02Rfq.create({
  data: { ..., status: 'DRAFT', rfqType: 'P', rfqReason: 'T', ... }
});
```

但既有 `RFQ_EDGES`（[nx02-state-machine.ts:34-40](apps/nx-api/src/shared/nx02/nx02-state-machine.ts#L34-L40)）只允許：
```
DRAFT     → {SENT, CANCELLED}
SENT      → {REPLIED, CANCELLED}
REPLIED   → {CLOSED, CANCELLED}
CLOSED    → {}
CANCELLED → {}
```

意圖 §3.2 要求：「(add QT 時) 把 RFQ.status 從 pending 推到 quoted（如果這是第一個 QT）」。對應到既有 state machine 是 **DRAFT → REPLIED 或 SENT → REPLIED**。但 DRAFT → REPLIED **沒這條邊**。

意圖 §3.3 要求：「採用 QT 後 RFQ.status = completed」。對應 REPLIED → CLOSED ✓ 已支援。

→ **取捨點 §2.2**（Alex review）：要動 D4 既有 stub status（改成 'SENT'）還是加 state machine 邊（DRAFT → REPLIED）？

### 1.5 PURCHASE_ADMIN role 不存在

意圖 §6 Q5 要求「寫入限 PURCHASE_ADMIN role」。但 [apply-role.ts:8-17](packages/db-core/prisma/seed/template/apply-role.ts#L8-L17) 只 seed 了 8 個 role：ADMIN / **PURCHASE** / SALES / WAREHOUSE / FINANCE / LOGISTICS / HR / HR_ADMIN — 沒有 PURCHASE_ADMIN。
<!-- A034/A040/A042 closure 後：8 role → 7 role（SYSADMIN/OWNER/PURCHASING/SALES/WAREHOUSE/FINANCE/HR、移除 LOGISTICS/HR_ADMIN、補 OWNER）。本段保留歷史 fact list 描述 Phase 0 寫此 spec 時的真相。 -->

既有 nx02 controller 都用 `@Roles('SYSADMIN', 'OWNER')`，沒任何子模組做更細的角色控制。

→ **取捨點 §2.3**（Alex review）：B5 寫入 endpoint 用既有 `@Roles('SYSADMIN', 'OWNER', 'PURCHASING')` 還是新增 PURCHASE_ADMIN role？

### 1.6 `allocDocNo` 不支援 'TI'

[shared/nx02/nx02-doc-no.ts](apps/nx-api/src/shared/nx02/nx02-doc-no.ts) 的 `DocKind` 只有 `'RF' | 'PO' | 'RR' | 'PR'`。**沒 TI**。意圖 §3.3「採用 QT 後系統自動建 TI」需要 TI 單號。

D4 內 [refreshment-doc-creator.ts:217-222](apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts#L217-L222) 自己實作了 `allocRfqDocNo()` 私有 helper（給 G stub 用）— 沒走 shared 工具。B5 可比照辦理，但**比較乾淨的做法是把 'TI' 加進 shared/nx02/nx02-doc-no.ts**（D4 G stub 將來 B5 收尾後也應該收斂走 shared）。

→ **取捨點 §2.4**（Alex review）：擴 `allocDocNo` kind 加 'TI' 還是 service 內自己包？

---

## 2. 工程取捨（4 個給 Alex 拍）

### 取捨 1（§1.3）：error class + advisory lock 工具放哪 — **採方案 a（B5 自寫，命名解耦 D4）**

**方案 a（推薦）**：B5 自己寫 `qt-error.ts`（對應四層 error）+ `nx02-advisory-lock.ts`（鎖 rfqId 的 helper），不複用 D4 命名。

**方案 b**：把 D4 的 error class rename 成 `Nx02BaseError`/`Nx02InvalidInputError` 等提升到 shared，D4 + B5 共用。

**方案 c**：B5 直接 import D4 的 error class（語意不對：B5 不是 translator，命名不該綁 Translator）。

**選 a 理由**：
- 業務語意分離：D4 是 SO 翻譯，B5 是 RFQ→QT→TI 流程，兩者錯誤碼不重疊（B5 會有 `RFQ_NOT_FOUND` / `QT_ALREADY_AGREED` / `RFQ_ALREADY_CLOSED` / `QT_REJECT_REASON_REQUIRED` 等 D4 沒有的）。共用 base 會逼錯誤碼 enum 互相污染。
- Phase 1 後若多模組都用「自定 error → filter 轉 HTTP」模式，再起一支 ADR 提升 base 到 shared，現在不過早抽象。
- B5 advisory lock 鎖的維度不同（rfqId 單鍵 vs D4 三元組），程式碼自然分支，硬塞同 class 反而難讀。

**取捨後檔位**：
- `apps/nx-api/src/nx02/qt/qt-error.ts`
- `apps/nx-api/src/shared/nx02/nx02-advisory-lock.ts`（給 B5 用，D4 將來收斂時也能移到此處）

### 取捨 2（§1.4）：RFQ stub status 對齊 — **採方案 a（加 state machine 邊 DRAFT → REPLIED）**

**方案 a（推薦）**：在 `RFQ_EDGES` 加邊 `DRAFT → REPLIED`，不動 D4 stub 程式。

**方案 b**：改 D4 [refreshment-doc-creator.ts:157](apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts#L157) 的 stub status 為 `'SENT'`（已對外詢價語意更貼切）。

**選 a 理由**：
- D4 已 commit 落地（46823bb 的 26 + 6 個測試已綠）— 動 D4 等於要連 D4 的測試 fixture 一起改，影響面廣。
- 業界語意上 D4 stub 一建出來代表「採購已知道要對外詢這個料」≈ DRAFT 草稿狀態，採購打第一通電話拿到 QT 時才推到 REPLIED — 跟「採購輸入第一個 QT 時推進狀態」直覺一致。
- 加一條邊在 state machine 是純加法，不影響既有任何 caller（既有 update() 走 assertRfqStatusTransition 也不會破，因為加邊不刪邊）。
- 即便採 a，將來 W4 工作台真的需要中間 SENT 狀態，可再加 SENT → REPLIED（已存在）跟 DRAFT → SENT（已存在），不矛盾。

**注意**：意圖 §3.2 「第一個 QT 進來推 RFQ 到 quoted」對應 DRAFT/SENT → REPLIED。實作時 service 要看當前 RFQ.status 決定是否 transition：
- 若 RFQ.status 已是 REPLIED：第二個 QT 進來不再推進，只 insert QT。
- 若 RFQ.status 是 CLOSED / CANCELLED：reject add（不能再加 QT 進已關閉的 RFQ）。

### 取捨 3（§1.5）：PURCHASE_ADMIN role — **採方案 b（用既有 PURCHASING + SYSADMIN+OWNER、A040+A042 closure 後升級）**

**方案 a**：新增 `PURCHASE_ADMIN` role 進 apply-role.ts。
**方案 b（推薦）**：B5 寫入 endpoint 用 `@Roles('SYSADMIN', 'OWNER', 'PURCHASING')`，list endpoint 不加 @Roles（任何登入者可看）。

**選 b 理由**：
- 跟意圖 §6 Q5「視 endpoint 不同：查 list 開放、寫入限 PURCHASE_ADMIN」精神一致 — Phase 0 不引入新 role，避免 seed / 權限矩陣同步成本。
- 既有 nx02 全部用 `@Roles('SYSADMIN', 'OWNER')` 寫得太緊（採購人員根本進不去 RFQ controller），B5 比照「SYSADMIN/OWNER + PURCHASING」也算順手把採購人員放進來。RolesGuard 第 56-58 行有 SYSADMIN/OWNER 全通行邏輯，所以實際 effect 是「採購 + 系管」可寫。
- 將來真的需要區分「採購主管」vs「採購助理」（例如「只有採購主管能採用 QT」），再起 ADR 加 PURCHASE_ADMIN，B5 先不過度設計。

⚠️ 反過來推：「需不需要在這次同 PR 把既有 RfqController 從 `@Roles('SYSADMIN', 'OWNER')` 放寬到 `@Roles('SYSADMIN', 'OWNER', 'PURCHASING')`」？我傾向**不動既有 RfqController**（不在 B5 範圍）— 但給 Alex 確認。

### 取捨 4（§1.6）：TI 單號分配 — **採方案 a（擴 `allocDocNo` 加 'TI'）**

**方案 a（推薦）**：把 [shared/nx02/nx02-doc-no.ts](apps/nx-api/src/shared/nx02/nx02-doc-no.ts) 的 `DocKind` 加 `'TI'`，新增 `tx.nx02Ti.findFirst` 分支。
**方案 b**：B5 service 內自己寫一支 `allocTiDocNo()` private helper（仿 D4 refreshment-doc-creator）。

**選 a 理由**：
- 集中 — Phase 0 之後 NX02 還會有更多單據（NT 票據、AL 折讓 etc），單號集中管理比每個 service 自己包好維護。
- D4 內的 `allocRfqDocNo` 是當時意圖避免擴 shared 的副作用（D4 已 commit 不動），B5 若也走方案 b 會讓 shared 越來越孤立。
- shared/nx02/nx02-doc-no.ts 加一個分支是純加法（4 → 5 種 kind），不會破壞既有 RFQ/PO/RR/PR 的 allocator。

---

## 3. 程式碼結構

### 3.1 模組註冊

[apps/nx-api/src/nx02/nx02.module.ts](apps/nx-api/src/nx02/nx02.module.ts) 修：

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [
    RfqController, PoController, RrController, PurchaseReturnController,
    QtController,         // ← 新增
  ],
  providers: [
    RfqService, PoService, RrService, PurchaseReturnService,
    QtService,            // ← 新增
    { provide: APP_FILTER, useClass: Nx02ErrorFilter },  // ← 新增（B5 自定 error → HTTP）
  ],
})
export class Nx02Module {}
```

### 3.2 檔位配置

```
apps/nx-api/src/nx02/qt/
├── qt.controller.ts
├── qt.service.ts
├── qt-error.ts                            // 4 層 Exception class
├── dto/
│   └── qt.dto.ts                          // CreateQtDto / AdoptQtDto / RejectQtDto / CancelRfqDto / ListRfqQueryDto
└── __tests__/
    ├── qt-add.spec.ts                     // §3.2 unit
    ├── qt-adopt.spec.ts                   // §3.3 + §5.5 unit
    ├── qt-reject.spec.ts                  // §3.4 unit
    ├── rfq-cancel.spec.ts                 // §3.5 unit
    ├── rfq-list.spec.ts                   // §3.1 unit（partner-group）
    └── integration/
        ├── test-helpers.ts                // 重用 nx04 的 loadLiteSeed + cleanup
        ├── qt-adopt-tx.int-spec.ts        // §5.2 atomic transaction
        ├── qt-adopt-concurrent.int-spec.ts// §5.3 並發控制
        └── qt-adopt-multi-history.int-spec.ts // §5.5 同 partner 多 QT 採用

apps/nx-api/src/shared/nx02/
├── nx02-advisory-lock.ts                  // 新增：lockRfqId(tx, tenantId, rfqId)
├── nx02-doc-no.ts                         // 修：DocKind 加 'TI'
└── nx02-state-machine.ts                  // 修：RFQ_EDGES 加 DRAFT → REPLIED 邊

apps/nx-api/src/shared/filters/
└── nx02-error.filter.ts                   // 新增：catch Nx02BaseError → HTTP
```

### 3.3 主服務：`Nx02QtService`

```typescript
// apps/nx-api/src/nx02/qt/qt.service.ts
@Injectable()
export class Nx02QtService {
  private readonly logger = new Logger(Nx02QtService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** §3.1 RFQ list — 不需 lock / transaction，純 read */
  async listRfqsForPurchase(user, query): Promise<RfqListResult> {
    const tenantId = requireTenantId(user);
    // 走 prisma.nx02Rfq.findMany + groupBy QT 統計
    // 回傳：rfq + qtCount + distinctPartnerCount + linkedSoCustomer
  }

  /** §3.2 add QT — insert 新筆，不 update 舊；推 RFQ DRAFT/SENT → REPLIED */
  async addQt(user, dto: CreateQtDto): Promise<QtRow> {
    const tenantId = requireTenantId(user);
    return this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const rfq = await this.loadRfqOrThrow(tx, tenantId, dto.rfqId);
        if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED' || rfq.voidedAt) {
          throw new RfqAlreadyClosedError(rfq.id, rfq.status);
        }
        await this.assertPartnerIsInquiry(tx, tenantId, dto.inquiryPartnerId);
        const qt = await tx.nx02Qt.create({
          data: { tenantId, rfqId: dto.rfqId, ..., status: 'P', createdBy: user.sub, updatedBy: user.sub },
          select: QT_SEL,
        });
        // 推 RFQ status：DRAFT/SENT → REPLIED（first QT in）
        if (rfq.status === RfqStatus.DRAFT || rfq.status === RfqStatus.SENT) {
          assertRfqStatusTransition(rfq.status, RfqStatus.REPLIED); // 取捨 2 加邊後可通過
          await tx.nx02Rfq.update({
            where: { id: rfq.id },
            data: { status: RfqStatus.REPLIED, updatedBy: user.sub },
          });
        }
        await this.audit.write({ ..., action: 'CREATE', entityTable: 'nx02_qt', entityId: qt.id });
        return qt;
      })
    );
  }

  /** §3.3 + §5.5 adopt QT — 原子操作，含並發鎖 + 連帶 reject 兄弟 QT + 建 TI */
  async adoptQt(user, dto: AdoptQtDto): Promise<AdoptQtResult> {
    const tenantId = requireTenantId(user);
    return this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // 取 advisory lock 鎖整個 RFQ（並發控制 §5.3）
        const qt = await this.loadQtOrThrow(tx, tenantId, dto.qtId);
        await Nx02AdvisoryLock.lockRfqId(tx, tenantId, qt.rfqId);
        // 拿鎖後重 load（拿鎖前可能被別人改）
        const qtLocked = await this.loadQtOrThrow(tx, tenantId, dto.qtId);
        if (qtLocked.status === 'A') throw new QtAlreadyAgreedError(qtLocked.id);
        if (qtLocked.status === 'R') throw new QtAlreadyRejectedError(qtLocked.id);
        const rfq = await this.loadRfqOrThrow(tx, tenantId, qtLocked.rfqId);
        if (rfq.status === RfqStatus.CLOSED || rfq.status === RfqStatus.CANCELLED) {
          throw new RfqAlreadyClosedError(rfq.id, rfq.status);
        }
        // 1. 該 QT → AGREED
        await tx.nx02Qt.update({
          where: { id: qtLocked.id },
          data: { status: 'A', updatedBy: user.sub },
        });
        // 2. 同 RFQ 其他 status='P' 的 QT → REJECTED（含同 partner 較舊）
        const siblingReason = `因採用 QT-${qtLocked.id}`;
        await tx.nx02Qt.updateMany({
          where: { rfqId: qtLocked.rfqId, status: 'P', id: { not: qtLocked.id } },
          data: { status: 'R', rejectReason: siblingReason, updatedBy: user.sub },
        });
        // 3. RFQ → CLOSED
        assertRfqStatusTransition(rfq.status, RfqStatus.CLOSED);
        await tx.nx02Rfq.update({
          where: { id: rfq.id },
          data: { status: RfqStatus.CLOSED, updatedBy: user.sub },
        });
        // 4. 建 TI（用 QT 的 partner / price / quantity）
        const ti = await this.createTiFromQt(tx, user, tenantId, rfq, qtLocked);
        // 5. 找對應 SO line item（透過 rfq → so_item.transferSourceType='G' 反查）
        // ⚠️ 反查設計細節見 §3.4 — 這裡是業務邏輯關鍵點
        await this.linkTiToSoItem(tx, user, rfq.id, ti.id);
        // 6. audit
        await this.audit.write({ ..., action: 'UPDATE', entityTable: 'nx02_qt', entityId: qt.id, summary: '採用同行報價' });
        return { qtId: qt.id, rfqId: rfq.id, tiId: ti.id, rejectedSiblings: ... };
      })
    );
  }

  /** §3.4 reject single QT — reason 必填（schema partial CHECK 強制）*/
  async rejectQt(user, dto: RejectQtDto): Promise<QtRow> {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const qt = await this.loadQtOrThrow(tx, tenantId, dto.qtId);
      if (qt.status === 'A') throw new QtAlreadyAgreedError(qt.id);
      if (qt.status === 'R') throw new QtAlreadyRejectedError(qt.id);
      if (!dto.rejectReason?.trim()) throw new RejectReasonRequiredError();
      const updated = await tx.nx02Qt.update({
        where: { id: qt.id },
        data: { status: 'R', rejectReason: dto.rejectReason.trim(), updatedBy: user.sub },
        select: QT_SEL,
      });
      // 不動 RFQ status — 還可以收新 QT
      await this.audit.write({ ..., action: 'UPDATE', entityTable: 'nx02_qt', entityId: qt.id });
      return updated;
    });
  }

  /** §3.5 cancel RFQ — 連帶 reject 所有 pending QT */
  async cancelRfq(user, dto: CancelRfqDto): Promise<{ rfqId: string; cancelledQtCount: number }> {
    const tenantId = requireTenantId(user);
    if (!dto.cancelReason?.trim()) throw new CancelReasonRequiredError();
    return this.prisma.$transaction(async (tx) => {
      const rfq = await this.loadRfqOrThrow(tx, tenantId, dto.rfqId);
      if (rfq.status === RfqStatus.CLOSED || rfq.status === RfqStatus.CANCELLED) {
        throw new RfqAlreadyClosedError(rfq.id, rfq.status);
      }
      assertRfqStatusTransition(rfq.status, RfqStatus.CANCELLED);
      // 1. 所有 status='P' QT → R（含 reject_reason）
      const cancelReason = `因 RFQ 取消：${dto.cancelReason.trim()}`;
      const result = await tx.nx02Qt.updateMany({
        where: { rfqId: rfq.id, status: 'P' },
        data: { status: 'R', rejectReason: cancelReason, updatedBy: user.sub },
      });
      // 2. RFQ → CANCELLED
      await tx.nx02Rfq.update({
        where: { id: rfq.id },
        data: { status: RfqStatus.CANCELLED, updatedBy: user.sub },
      });
      // 不動 SO line item（意圖 §3.5 明示）
      await this.audit.write({ ..., action: 'UPDATE', entityTable: 'nx02_rfq', entityId: rfq.id, summary: '取消詢價單' });
      return { rfqId: rfq.id, cancelledQtCount: result.count };
    });
  }

  // ----- private helpers -----
  private async loadRfqOrThrow(tx, tenantId, rfqId): Promise<...> { ... }
  private async loadQtOrThrow(tx, tenantId, qtId): Promise<...> { ... }
  private async assertPartnerIsInquiry(tx, tenantId, partnerId): Promise<void> { ... }
  private async createTiFromQt(tx, user, tenantId, rfq, qt): Promise<TiRow> { ... }
  private async linkTiToSoItem(tx, user, rfqId, tiId): Promise<void> { ... }
  private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> { /* P2034/40P01/55P03 */ }
}
```

### 3.4 反查 SO line item — **B5 關鍵設計點**

意圖 §3.3 步驟 5：「更新對應 SO line item.relatedTiId、transferStatus = completed」。

**反查路徑**：`adoptQt(qtId)` 時知道 `rfqId`，需要找到所有「以這 RFQ 為來源的 SO line item」。

D3 schema 設計：
- `nx04_so_item.transferSourceType = 'G'` 代表這一行是同行調貨
- `nx04_so_item.transferSourceRef` （在 `nx04_so_item` 之中？需要查）— 不在 schema，**這個欄位沒有！**
- 但 D4 RFQ stub 建立時，`nx02_rfq` 跟 `nx04_so_item` 之間**沒直接 FK**

詳查 [refreshment-doc-creator.ts:141-179](apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts#L141-L179)：D4 建 RFQ stub 後**不寫回 SO line item.tiId**（because tiId 此時還沒有 — TI 是 B5 採用 QT 時才建）。也**沒寫 rfqId** 到 so_item — schema 沒這欄位。

→ **反查路徑只能透過 RFQ docNo 或某個間接欄位。檢查 schema：**

[nx02_rfq.demandId](packages/db-core/prisma/schema.prisma) 是「來源採購需求單ID」— 不是 SO 的反向追蹤。
[nx02_ti.rfqId](packages/db-core/prisma/schema.prisma) 是 TI 對 RFQ 的反向追蹤 — 是 B5 建 TI 時要填的，但反查路徑是反向。

**結論**：D4 建 RFQ stub 沒留 SO 反查欄位 → **這是 D4 stub 漏掉的事，B5 要決定怎麼補**。

→ **取捨點 §3.4-A**（Alex review）：四個方案

**方案 i（推薦）**：在 `nx02_rfq` 加一欄 `source_so_item_id String? @db.VarChar(15)`（FK to nx04_so_item），D4 stub 建 RFQ 時填入；B5 採用 QT 時透過此欄位反查。
- 對應 schema patch：類似 D3 patch A3（純 nullable，application 層自律）。
- 影響：要新建 migration、改 D4 stub、改 D3 schema。**Phase 0 範圍內最乾淨**。

**方案 ii**：在 `nx04_so_item` 加 `rfq_id` 欄位（D4 stub 建 RFQ 後寫回 so_item.rfqId）。
- 對應 schema patch：類似方案 i 但放在 so_item 端。
- 缺點：so_item 已經有 stId/tiId/coId 三個補貨單反查欄，再加 rfqId 變 4 個 — 反查語意有點亂。

**方案 iii**：用 `nx02_rfq.docNo` + 某個自訂 convention（如 RFQ remark 寫 SO docNo）反查。
- 缺點：用 string match 反查 fragile，schema 沒 enforce。

**方案 iv**：不反查 — B5 採用 QT 時不更新 SO line item，留給將來「TI 收貨流程」處理。
- 缺點：違反意圖 §3.3 步驟 5「transferStatus = completed」。

**推薦方案 i**，理由跟 D3 加 `source_so_item_id` 同精神（單向 nullable FK）。

⚠️ **如果採方案 i / ii**，B5 範圍會擴大成 schema patch + D4 stub 升級。建議拆成 **B5-impl 子任務**：
- B5-A：schema patch（加 nx02_rfq.source_so_item_id + 升級 D4 stub）
- B5-B：QT API 5 個 endpoint + tests

**如果採方案 iv**，B5 範圍縮小、可一次落地，但意圖 §3.3 步驟 5 要 amend。

→ **Alex 拍板選哪個方案，並 amend 意圖 §3.3 步驟 5（如選 iv）**。

### 3.5 Advisory lock for RFQ adopt — `Nx02AdvisoryLock.lockRfqId`

```typescript
// apps/nx-api/src/shared/nx02/nx02-advisory-lock.ts
export const Nx02AdvisoryLock = {
  /**
   * 在當前 transaction 內鎖定 (tenantId, rfqId)。
   * 兩個採購同時對同 RFQ 採用不同 QT → 第二個會等第一個 commit/rollback。
   * - 同 hash 邏輯（hashtextextended）跟 D4 advisory lock 一致
   * - SET LOCAL lock_timeout 5s
   * - lock 在 transaction 結束自動釋放
   */
  async lockRfqId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rfqId: string,
    options?: { timeoutSeconds?: number },
  ): Promise<void> {
    const timeoutSec = options?.timeoutSeconds ?? 5;
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${timeoutSec}s'`);
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${tenantId} || ':rfq:' || ${rfqId}, 0)
      )
    `;
  },
};
```

⚠️ **跟 D4 lock 的 namespace 隔離**：D4 用 `tenant:part:warehouse`，B5 用 `tenant:rfq:rfqId` — hash 不會撞（namespace 不同）。`:rfq:` 是 sentinel literal 區隔。

### 3.6 retry wrapper

跟 D4 同邏輯（catch P2034/40P01/55P03 → exponential backoff [50, 200, 800]ms）。建議**抽到 shared**（D4 retry 是 service 內 private — 可以提升成 shared utility 給 D4 + B5 共用），但這是 D4 重構，**不在 B5 範圍**。B5 service 內**獨立寫一份 runWithRetry**，將來收斂時再統一。

→ **取捨點 §3.6**（Alex review）：Phase 0 收尾時起一支 ADR 把 retry 抽 shared？B5 暫時複製貼上？

### 3.7 DTO

```typescript
// apps/nx-api/src/nx02/qt/dto/qt.dto.ts

export class CreateQtDto {
  @IsString() @MaxLength(15) rfqId!: string;
  @IsString() @MaxLength(15) inquiryPartnerId!: string;
  @IsNumber() quotedPrice!: number;
  @IsNumber() quotedQuantity!: number;
  @IsOptional() @IsInt() leadDays?: number;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class AdoptQtDto {
  @IsString() @MaxLength(15) qtId!: string;
}

export class RejectQtDto {
  @IsString() @MaxLength(15) qtId!: string;
  @IsString() @MaxLength(200) rejectReason!: string;  // partial CHECK 強制
}

export class CancelRfqDto {
  @IsString() @MaxLength(15) rfqId!: string;
  @IsString() @MaxLength(200) cancelReason!: string;
}

export class ListRfqQueryDto {
  @IsOptional() @IsString() status?: string;          // pending / quoted / completed / cancelled mapping
  @IsOptional() @IsString() rfqType?: string;         // 'P' 同行調貨；'G' 一般
  @IsOptional() @IsBoolean() includeQts?: boolean;    // 是否帶 QT 清單
  @IsOptional() @IsBoolean() groupByPartner?: boolean;// 採購工作台用
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}
```

### 3.8 Controller

```typescript
// apps/nx-api/src/nx02/qt/qt.controller.ts
@Controller('nx02')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QtController {
  constructor(private readonly svc: Nx02QtService) {}

  // §3.1 list — 開放給所有登入 user（取捨 3 方案 b）
  @Get('rfq/list-for-purchase')
  list(@CurrentUser() user, @Query() q: ListRfqQueryDto) {
    return this.svc.listRfqsForPurchase(user, q);
  }

  // §3.2 add QT — 寫入限 SYSADMIN/OWNER/PURCHASING
  @Post('qt')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING')
  addQt(@CurrentUser() user, @Body() dto: CreateQtDto) {
    return this.svc.addQt(user, dto);
  }

  // §3.3 adopt QT
  @Post('qt/:id/adopt')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING')
  adoptQt(@CurrentUser() user, @Param('id') qtId: string) {
    return this.svc.adoptQt(user, { qtId });
  }

  // §3.4 reject QT
  @Post('qt/:id/reject')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING')
  rejectQt(@CurrentUser() user, @Param('id') qtId: string, @Body() dto: { rejectReason: string }) {
    return this.svc.rejectQt(user, { qtId, rejectReason: dto.rejectReason });
  }

  // §3.5 cancel RFQ
  @Post('rfq/:id/cancel')
  @Roles('SYSADMIN', 'OWNER', 'PURCHASING')
  cancelRfq(@CurrentUser() user, @Param('id') rfqId: string, @Body() dto: { cancelReason: string }) {
    return this.svc.cancelRfq(user, { rfqId, cancelReason: dto.cancelReason });
  }
}
```

⚠️ **Route 命名取捨**：
- `POST /nx02/qt` 新增 QT
- `POST /nx02/qt/:id/adopt` / `reject` 動作 endpoint（非純 CRUD，動詞）
- `POST /nx02/rfq/:id/cancel` 不撞既有 `DELETE /nx02/rfq/:id`（softDelete 同義 cancel — 既有實作確實已標 status CANCELLED + voidedAt，**動作上跟 B5 cancelRfq 重疊**）

→ **取捨點 §3.8**（Alex review）：B5 的 `cancelRfq` 跟既有 `RfqService.softDelete` 是同一件事嗎？合併還是分開？

我傾向**分開**：既有 softDelete 沒處理「連帶 reject pending QT」邏輯（B5 §3.5 要做的）。但 amend 意圖時要說清楚這兩條 path 的關係 — 或乾脆讓既有 softDelete 也走 B5 的新 cancel 邏輯（更乾淨，Hank 在實作時順手對齊）。

### 3.9 Error class（§2.1 取捨後）

```typescript
// apps/nx-api/src/nx02/qt/qt-error.ts
export type Nx02ErrorCode =
  // 業務輸入錯誤（HTTP 400）
  | 'RFQ_NOT_FOUND'
  | 'QT_NOT_FOUND'
  | 'PARTNER_NOT_INQUIRY_TYPE'
  | 'REJECT_REASON_REQUIRED'
  | 'CANCEL_REASON_REQUIRED'
  // 業務狀態衝突（HTTP 409）
  | 'RFQ_ALREADY_CLOSED'
  | 'QT_ALREADY_AGREED'
  | 'QT_ALREADY_REJECTED'
  // 並發失敗（HTTP 503）
  | 'NX02_BUSY'
  // 系統錯誤（HTTP 500）
  | 'NX02_SYSTEM_ERROR';

export class Nx02BaseError extends Error { /* 同 D4 結構 */ }
export class Nx02InvalidInputError extends Nx02BaseError { /* 400 */ }
export class Nx02ConflictError extends Nx02BaseError { /* 409 */ }
export class Nx02BusyError extends Nx02BaseError { /* 503 */ }
export class Nx02SystemError extends Nx02BaseError { /* 500 */ }

// 具名 error 子類
export class RfqNotFoundError extends Nx02InvalidInputError { ... }
export class QtAlreadyAgreedError extends Nx02ConflictError { ... }
// ...
```

### 3.10 Exception Filter

`apps/nx-api/src/shared/filters/nx02-error.filter.ts` — catch `Nx02BaseError` → HTTP response。跟 D4 [translator-error.filter.ts](apps/nx-api/src/shared/filters/translator-error.filter.ts) 同模板。註冊在 nx02.module.ts 的 APP_FILTER。

---

## 4. 測試案例（意圖 §8 要求 7+ 案）

### 4.1 Unit tests（mock prisma）

| # | 測試名 | 對應意圖 | 重點 |
|---|---|---|---|
| 1 | `qt-add.spec.ts > add first QT pushes RFQ status to REPLIED` | §3.2 | RFQ DRAFT → REPLIED |
| 2 | `qt-add.spec.ts > add second QT does not change RFQ status` | §3.2 | 第二個 QT 不再 transition |
| 3 | `qt-add.spec.ts > add QT to CLOSED RFQ throws RfqAlreadyClosedError` | §3.2 邊界 | 拒絕 add to closed RFQ |
| 4 | `qt-adopt.spec.ts > adopt QT marks siblings rejected with system reason` | §3.3 + §5.5 | 兄弟 QT 連帶處理 |
| 5 | `qt-adopt.spec.ts > adopt already-agreed QT throws QtAlreadyAgreedError` | §3.3 邊界 | 防重複採用 |
| 6 | `qt-reject.spec.ts > reject QT requires reason` | §3.4 + §5.4 | reason 必填 |
| 7 | `qt-reject.spec.ts > reject does not change RFQ status` | §3.4 | RFQ 仍可收新 QT |
| 8 | `rfq-cancel.spec.ts > cancel RFQ marks all pending QTs rejected` | §3.5 | 連帶處理 |
| 9 | `rfq-cancel.spec.ts > cancel RFQ requires reason` | §3.5 + §5.4 | reason 必填 |
| 10 | `rfq-list.spec.ts > list returns qtCount + distinctPartnerCount` | §3.1 | partner-group 邏輯 |

### 4.2 Integration tests（INTEGRATION_DB=1，hit 真 DB）

| # | 測試名 | 對應意圖 | 重點 |
|---|---|---|---|
| 11 | `qt-adopt-tx.int-spec.ts > adopt is atomic, fails fully roll back` | §5.2 | 原子性（mock TI insert 故意拋錯，QT/RFQ status 應原狀） |
| 12 | `qt-adopt-concurrent.int-spec.ts > two adopts on same RFQ — one wins, other gets RfqAlreadyClosedError` | §5.3 | advisory lock 防搶 |
| 13 | `qt-adopt-multi-history.int-spec.ts > adopt newest QT for partner X — both X's older QT and other partners' QTs are rejected` | §5.5 | 同 partner 多筆歷史 + 跨 partner 連帶處理 |

**滿足意圖 §8 要求**：5 個 endpoint 各 ≥ 1 案（# 1/4/6/8/10）+ 並發 1 案（# 12）+ 同 partner 多筆 QT 採用 1 案（# 13）= **總 13 案**，超過下限 7 案。

### 4.3 共用 helpers

`apps/nx-api/src/nx02/qt/__tests__/integration/test-helpers.ts` 重用 D4 的 `loadLiteSeed()` + `disconnectPrisma()`，加 B5 專用的：
- `seedRfqStub(prisma, tenantId, partId, warehouseId)`：建一個 D4 stub 風格的 RFQ
- `cleanupRfq(prisma, rfqId)`：刪 QT + RFQ + TI
- 必要時也 reuse `cleanupSo()`（如果測試牽涉 SO 反查）

⚠️ **§3.4 取捨確定後**：若採方案 i / ii（schema patch），integration test 可串到 SO 反查驗證；若採方案 iv（不反查），integration test 不需 cleanup SO。

---

## 5. 風險點 + 待確認

### 5.1 給 Alex 拍板的取捨清單（共 6 個）

| # | 取捨 | 章節 | 推薦 | 影響 |
|---|---|---|---|---|
| 1 | error class + advisory lock 命名解耦 D4 | §2.1 | 方案 a（B5 自寫 nx02-* 命名）| 程式碼配置 |
| 2 | RFQ stub status 對齊 — 加 state machine 邊 | §2.2 | 方案 a（加 DRAFT → REPLIED 邊）| state-machine.ts |
| 3 | PURCHASE_ADMIN role | §2.3 | 方案 b（用 SYSADMIN + OWNER + PURCHASING）| controller @Roles |
| 4 | TI 單號分配 | §2.4 | 方案 a（擴 allocDocNo 加 'TI'）| shared/nx02 |
| 5 | **SO 反查路徑（B5 關鍵）** | §3.4 | 方案 i（加 nx02_rfq.source_so_item_id + 升級 D4 stub）| **schema patch + D4 升級** |
| 6 | RfqService.softDelete vs B5 cancelRfq | §3.8 | 分開（既有 softDelete 不動）| controller route |

### 5.2 範圍外的事

- D4 既有 stub 的 source_so_item_id 補欄（如選 §3.4 方案 i）→ 視為 **B5-A schema patch 子任務**
- retry wrapper 抽 shared → **Phase 0 收尾 ADR**（不在 B5）
- W4 採購工作台 UI → **Phase 2**（不在 B5）
- TI 收貨流程 → **NX02 採購收貨範圍**（不在 B5）
- TI 取消反悔 → **NX02 採購收貨範圍**（不在 B5）

### 5.3 schema 對齊檢查（自核對）

| 意圖描述 | DB schema 實狀 | 一致？ |
|---|---|---|
| QT.status = pending | 'P' (VARCHAR(1) CHECK 限 P/A/R) | ✅ 對應 |
| QT.status = agreed | 'A' | ✅ 對應 |
| QT.status = rejected | 'R' | ✅ 對應 |
| QT 無 unique constraint | schema 無 unique | ✅ |
| QT.reject_reason 必填 when status='R' | partial CHECK ✅ | ✅ |
| RFQ.status = pending/quoted/completed/cancelled | 'DRAFT'/'SENT'/'REPLIED'/'CLOSED'/'CANCELLED' | ⚠️ **mapping**（取捨 2 處理）|
| TI 必填欄位 | tenantId/warehouseId/partnerId/currencyId/taxRate/subtotal/taxAmount/totalAmount | ✅（B5 採用 QT 時要全填）|

---

## 6. DoD（Definition of Done）

B5 本任務算完成需要：

- [ ] 此 spec 拿到 Alex review 拍板（含 6 個取捨點）
- [ ] schema patch（如 §3.4 方案 i 拍板）+ D4 stub 升級（**B5-A**）
- [ ] `Nx02QtService` 5 個方法落地（**B5-B**）
- [ ] DTO 5 組（CreateQtDto / AdoptQtDto / RejectQtDto / CancelRfqDto / ListRfqQueryDto）
- [ ] `QtController` 5 個 endpoint
- [ ] `Nx02BaseError` 4 層 + 具名子類 + filter
- [ ] `Nx02AdvisoryLock.lockRfqId` shared utility
- [ ] `RFQ_EDGES` 加 DRAFT → REPLIED 邊
- [ ] `allocDocNo` 加 'TI' 支援
- [ ] 13 個測試案例（10 unit + 3 integration），全綠
- [ ] commit + push 到 `feature/wp-phase0-schema`

---

## 7. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版實作 spec，對齊意圖 v2，列 6 個 Alex 拍板點 |

---

*文件結束。等 Alex review 拍板後才進 §3 程式碼實作。*
