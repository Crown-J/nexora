<!-- docs/nx04/nx04-audit-01.md -->

# NX04 銷貨模組 — Schema + 既有 demo 真相揭露（NX04-AUDIT-01）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx04/、Crown 拍板後啟動 IMPL）
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-17
> 任務：NX02 採購範圍 A closure（v0.5.0、2026-05-17）後、Crown 拍板 NX04 銷貨模組第四戰略軌、Alex 寫子規格書前依 §I.5 #22 鐵律 verify schema 真相
> 真實 main HEAD：`6e72258`（NX02 merge / v0.5.0-nx02-closure tag 後）
> NX01 全 closure：17/17 ✓ / NX03 範圍 A：✓（v0.3.0）/ AR 範圍 B：✓（v0.4.0）/ NX02 範圍 A：✓（v0.5.0）
> 對應依據：[nx02-audit-01](../nx02/nx02-audit-01.md) + [nx02-audit-02](../nx02/nx02-audit-02.md) 範式對齊

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep（`find -iname "*nx04*"` + `grep "model Nx04"`）+ §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數、禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- 本檔僅揭露**已落地**狀態、不寫 plan、不寫拍板 Q
- NX04 為 NEXORA 戰略主軸（pivot 後從舊 NX03 銷貨轉移）、本檔為下一階段重塑前置盤點

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §1. NX04 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx04" packages/db-core/prisma/schema.prisma
→ 7
```

**NX04 已落地 schema = 7 個 model**（報價 1+1 + 銷貨 1+1 + 銷退 1+1 + 客訂預約 1）。

### 1.2 全 7 個 model 列表（line 範圍 + 業務語意 + 啟用版本）

| # | Model | Line | Table | 業務語意 | 啟用版本 |
|---|---|---|---|---|---|
| 1 | `Nx04Co`        | 3462 | `nx04_co`         | **客訂預約單**（CO、待補貨追蹤、sourceSoItemId 反向追蹤、P/F/E/V status）| LITE-CORE |
| 2 | `Nx04Quote`     | 3512 | `nx04_quote`      | 報價單表頭（QT、customerGradeId 客戶等級、validUntil 有效期、rfqId 接 NX02 同行調貨）| LITE-CORE |
| 3 | `Nx04QuoteItem` | 3575 | `nx04_quote_item` | 報價明細（groupNo 多選項、minPrice 最低售價警示、isSelected 客戶選擇、transferredQty 分批轉單）| LITE-CORE |
| 4 | `Nx04So`        | 3627 | `nx04_so`         | 銷貨單表頭（SO、deliveryType D/P/C、paymentTerm 付款條件、6 階 status 流）| LITE-CORE |
| 5 | `Nx04SoItem`    | 3702 | `nx04_so_item`    | 銷貨明細（**雙段狀態 transfer/fulfill**、Phase 0 D3 重構、tiId/stId/coId 4 補貨來源）| LITE-CORE |
| 6 | `Nx04Sr`        | 3785 | `nx04_sr`         | 銷退單表頭（SR、returnMethod S/C/P、5 階 status、銷售組長核准 + 倉管收貨）| LITE-CORE |
| 7 | `Nx04SrItem`    | 3846 | `nx04_sr_item`    | 銷退明細（returnPolicy 快照 F/S/R/N/W、returnType N/E、returnReason 5 enum）| LITE-CORE |

### 1.3 唯一約束 + Index 概況

| Model | unique | index |
|---|---|---|
| Nx04Co | `[docNo]` | `[tenantId, customerId]` + `[tenantId, status]` + `[tenantId, sourceSoItemId]` |
| Nx04Quote | `[docNo]` | — |
| Nx04QuoteItem | — | — |
| Nx04So | `[docNo]` | （見 SoItem 5 index）|
| **Nx04SoItem** | — | **5 index**：`[partId, warehouseId]` + `[fulfillStatus]` + `[transferSourceType, stId]` + `[transferSourceType, tiId]` + `[transferSourceType, coId]` |
| Nx04Sr | `[docNo]` | — |
| Nx04SrItem | — | — |

⭐ **SoItem 5 index 最齊**（Phase 0 D3 雙段狀態查詢優化）、Co 表 3 index 對齊「客訂優先」業務語意。

### 1.4 跨 NX 模組 FK 接點（reverse 完整）

| 來源 | 目的 | relation 用途 |
|---|---|---|
| `Nx04Co.partId` | `Nx01Part` | 客訂料件 |
| `Nx04Co.customerId` | `Nx01Partner` (C) | 客戶 |
| `Nx04Co.sourceSoItemId` | `Nx04SoItem` | **D3 反向追蹤**：客訂預約來自哪張 SO |
| `Nx04Quote.customerId` + `customerGradeId` | `Nx01Partner` + `Nx01CustomerGrade` | 客戶 + 等級定價 |
| `Nx04Quote.rfqId` | `Nx02Rfq` | ⭐ **無庫存走同行調貨詢價流程**（NX02 接點）|
| `Nx04QuoteItem.discountCodeId` | `Nx01DiscountCode` | 折扣代碼 |
| `Nx04So.quoteId` | `Nx04Quote` | 報價轉銷貨 |
| `Nx04So.customerId` | `Nx01Partner` (C) | 客戶 |
| `Nx04SoItem.tiId` | `Nx02Ti` | ⭐ **同行調貨**（D3+D4 業務歸 NX04 SALES、Crown Q-C4=A 拍板）|
| `Nx04SoItem.stId` | `Nx03St` | 自倉調撥 |
| `Nx04SoItem.coId` | `Nx04Co` | 客訂預約 |
| `Nx04SoItem.warehouseId` | `Nx01Warehouse` | 跨倉銷售（可與表頭不同）|
| `Nx04Sr.soId` | `Nx04So` | 銷退來源 |
| `Nx04SrItem.soItemId` | `Nx04SoItem` | 銷退明細反追蹤 |
| `Nx04So → Nx05ArLedger` | reverse `Nx05ArLedger_soId` | 銷貨確認 → AR 應收 |
| `Nx04Sr → Nx06Dn` | reverse `Nx06Dn_sourceSrId` | 銷退 → NX06 配送（取件）|
| `Nx04SoItem → Nx03PkItem` | reverse `Nx03PkItem_refSoItemId` | 撿貨單反查 |
| `Nx04SoItem → Nx03StItem` | reverse `Nx03StItem_sourceSoItemId` | 調撥反追蹤 |

⭐ **NX04 跨模組接點數量最多**：NX01 主檔 3 條 + NX02 調貨/詢價 2 條 + NX03 庫存/撿貨 3 條 + NX05 應收 1 條 + NX06 配送 1 條 = **共 10 條 reverse**。

### 1.5 狀態機概況（DB 真相）

| Model | enum | 業務 |
|---|---|---|
| Nx04Co.status | P/F/E/V | 待補/已補完/過期/作廢（1-char enum）|
| Nx04Quote.status | DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED/CANCELLED | 6 階 token |
| Nx04So.status | DRAFT/CONFIRMED/PICKING/SHIPPED/INVOICED/CANCELLED | 6 階 token |
| Nx04SoItem.itemStatus | WA/TA/WG/TG/WP/WD/ID/WT/WB/WS/C | ⚠️ **@deprecated**（Phase 0 D3 改雙段、trigger 仍雙寫保留相容）|
| Nx04SoItem.transferStatus | P/I/C | 雙段第一段：補貨進度 |
| Nx04SoItem.fulfillStatus | W/PK/PL/D/F | 雙段第二段：出貨進度 |
| Nx04SoItem.transferSourceType | S/T/G/B | 補貨來源（S本倉/T調撥/G同行/B客訂）|
| Nx04Sr.status | DRAFT/INSPECTING/POSTED/REJECTED/CANCELLED | 5 階 token |
| Nx04SrItem.returnType | N/E | 一般退/業務通融 |
| Nx04SrItem.returnReason | C/D/W/Q/O | 客戶不需要/瑕疵/送錯料號/送錯數量/其他 |
| Nx04SrItem.returnPolicy | F/S/R/N/W | 從 part 主檔快照（自由/標準/限制/不可退/保固）|

⭐ **NX04 enum 分佈**：6 token + 6 字元、Phase 0 D3 重構新增雙段狀態（transferStatus + fulfillStatus）取代既有 itemStatus（標 @deprecated）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2. NX04 backend service 真相

### 2.1 A041 精確 count

```
find apps/nx-api/src/nx04 -iname "*.ts" -type f | wc -l
→ 24（含 8 test 檔）= 16 production + 8 test
```

**4 子模組落地**：`quote / sales-return / so / so/translator`（translator 是 so 子模組）、外加 `nx04.module.ts` 根聚合。

### 2.2 子模組結構 + 測試覆蓋

| 子模組 | files | tests | service 規模 |
|---|---|---|---|
| `nx04.module.ts` | 1 | — | — |
| `quote/` | 3（controller / service / dto）| 0 | 445 lines |
| `sales-return/` | 3 | 0 | 599 lines |
| `so/` | 3 + `translator/` 子目錄 | — | 655 lines（最大）|
| `so/translator/` | 6（含 translator-error / refreshment-doc-creator / transfer-source-resolver）| **8 spec**（5 unit + 2 integration + 1 helpers）| 357 lines |

⭐ **測試覆蓋集中 translator**（8 specs / 對齊 NX02 QT 6 specs demo 主軸範式）、其他 3 子模組 0 test。

### 2.3 Controller 路由 + endpoint count

```
grep "@Controller" apps/nx-api/src/nx04/**/*.controller.ts
→ 4 controller、共 26 endpoints
```

| Controller | path | endpoints |
|---|---|---|
| `quote/quote.controller.ts` | `@Controller('nx04/quote')` | 8 |
| `so/so.controller.ts` | `@Controller('nx04/so')` | 9 |
| `so/translator/translator.controller.ts` | `@Controller('nx04/so')` ⚠️ root path | 1（POST translate）|
| `sales-return/sales-return.controller.ts` | `@Controller('nx04/sales-return')` | 8 |

⚠️ **`Nx04Co` 0 endpoint**：CO 表存在但無獨立 controller、僅 `translator` 自動建（D3 客訂預約翻譯流）

⚠️ **translator 同 prefix `nx04/so`** 與 so.controller 共用、但 path `translate` 不衝突

### 2.4 共用 utils（5 / shared/nx04/）

```
find apps/nx-api/src/shared/nx04 -type f -iname "*.ts" | wc -l
→ 5
```

| utils | 用途 |
|---|---|
| `nx04-advisory-lock.ts` | PG advisory lock 防 race（translator 翻譯流多 SO 平行衝突）|
| `nx04-doc-no.ts` | DocKind enum：QT / SO / SR / CO（4 種單號前綴生成器）|
| `nx04-list-query.dto.ts` | 分頁 / 排序 / 篩選通用 DTO |
| `nx04-location.ts` | 庫位處理 helper |
| `nx04-state-machine.ts` | API token 對 DB enum 雙向轉換 + 雙段狀態流轉 |

### 2.5 業務升級點（最近軌附帶升級）

| 升級點 | 檔 | line |
|---|---|---|
| **SO POSTED → NX03 ledger source=S（出庫）** | `so/so.service.ts` | 186~197（含 partVersionId M1 配套 ✓）|
| **SR POSTED → NX03 ledger source=R（入庫）** | `sales-return/sales-return.service.ts` | 213~225（含 partVersionId M1 配套 ✓）|
| translator D3+D4 同行調貨翻譯 | `so/translator/translator.service.ts` | 357 lines、含 Nx04Co + Nx02Rfq + Nx02Ti 自動建 |

⭐ **NX04 → NX03 ledger 接點 2 種 source（S + R）+ partVersionId M1 配套完整**（grep verified）。

### 2.6 NX04 → NX03 ledger 寫入鏈

| 入口 | helper | source |
|---|---|---|
| `Nx04So.applyShipment`（CONFIRMED → PICKING/SHIPPED）| `applyQtyOutWithLedger` | sourceModule=NX04、sourceDocType=**S**（銷貨出庫）|
| `Nx04Sr.applyReturn`（INSPECTING → POSTED）| `applyQtyInWithLedger` | sourceModule=NX04、sourceDocType=**R**（銷退入庫）|

⭐ NX04 是「NX03 ledger source=S/R 主要寫入者」、與 NX02（P/G/R）並列為 NX03 主要上游。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3. NX04 frontend 真相

### 3.1 A041 精確 count

```
find apps/nx-ui/src -ipath "*nx04*" -type f | wc -l
→ 5
```

**5 個 NX04 前端檔**（含 3 dashboard placeholder + 1 layout + 1 menu config）。

### 3.2 Dashboard pages（3 個 NEW placeholder）

```
grep -l "NxWorkspacePlaceholder" apps/nx-ui/src/app/dashboard/nx04/ → 3 file
```

| 類別 | path | functionCode | 業務 |
|---|---|---|---|
| 銷售 NEW placeholder | `nx04/customer/page.tsx` | NX04-CU-UI-001-F01 | 客戶管理（開發、分級、需求回饋）|
| 銷售 NEW placeholder | `nx04/domestic/page.tsx` | NX04-SO-UI-001-F01 | 國內銷售作業工作台（查詢→報價→銷貨→出貨）|
| 銷售 NEW placeholder | `nx04/export/page.tsx` | NX04-EX-UI-001-F01 | 國外銷售作業工作台（PLUS 以上）|

⭐ **3 NEW placeholder 純標題、無 backend wire 提示**（相對 NX02 已 functional placeholder 含 API hint）。

### 3.3 features/nx04/* 子目錄揭露

```
find apps/nx-ui/src/features -ipath "*nx04*" -type d
→ 0 dirs
find apps/nx-ui/src/features -ipath "*nx04*" -type f
→ 1（menu.nx04.ts、在 layout/config/）
```

⚠️ **features/nx04/ 0 子模組**：NX04 純 placeholder 階段、無任何 UI feature 落地。

### 3.4 menu.nx04.ts ⚠️ 嚴重 drift

```
file: apps/nx-ui/src/features/layout/config/menu.nx04.ts
內容：NX05 財務管理側邊選單（不是 NX04 銷貨）
href: /dashboard/nx05/workspace
```

⚠️ **menu.nx04.ts 是 stale**：file 名 nx04 但內容全是 NX05 財務、所有 href 指向 `/dashboard/nx05/*`。
- pivot 後（NX04 = 銷貨）的 menu config drift
- 對應 NX02-AUDIT-01 揭露的「menu.nx02.ts half-migrated」類似問題、但 nx04 更嚴重（內容完全錯模組）

### 3.5 features/ sales/ 命名孤兒（NX03-IMPL-01 揭露延續）

```
find apps/nx-ui/src/features -ipath "*sales*" -o -ipath "*sale*" | head -10
```

| path | 性質 |
|---|---|
| `features/nx03/sales/SalesFlowHub.tsx` | NX03 殘留（1 檔）|
| `features/nx03/workflow/ui/Sales{DocumentsBrowse,OperationWorkspace,OrderWorkspace,WorkflowPage}.tsx` | 4 檔 NX03 殘留 |
| `features/sale/ui/{hub,sop-workspace,inquiry}/...` | 多檔（含 SalesHubMobile、MobileSaleSopPage、AdoptQuoteDialog 等）|
| `features/sales/ui/SalesCenterHub.tsx` | 1 檔 |
| `features/sale/ui/sop-workspace/mock-data/quote-history.ts` | mock data 殘留 |

⭐ **3 個命名 namespace 並存**：`features/sale/` + `features/sales/` + `features/nx03/sales/`、皆為舊 NX03（pivot 前）銷貨時代殘留、production 是否運作待 verify。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4. 既有 demo 揭露

### 4.1 demo 主軸：translator 同行調貨翻譯流（Phase 0 D3+D4）

**唯一深 demo 的子模組 = `so/translator/`**（8 spec 全集中於此）：

| spec | 測試類型 | 場景 |
|---|---|---|
| `translator-lock-order.spec.ts` | unit | advisory lock 順序（防 deadlock）|
| `translator-lock-precision.spec.ts` | unit | lock 精度（per-warehouse vs per-tenant）|
| `translator-retry.spec.ts` | unit | retry 機制（concurrent 衝突）|
| `translator-status-init.spec.ts` | unit | SO 初始狀態雙段 init |
| `translator-tx-atomic.spec.ts` | unit | transaction atomicity（多表寫入回滾）|
| `integration/translator-happy-path.int-spec.ts` | integration | 翻譯流完整鏈：SO → Rfq stub → Co 預約 |
| `integration/translator-concurrent.int-spec.ts` | integration | 多 SO 同時翻譯衝突 |
| `integration/test-helpers.ts` | fixture | Nx04Co + Nx02Rfq + Nx02Ti 自動建 helper |

⭐ **D3+D4 demo 核心**：銷售側「無庫存自動翻譯」業務流落地、與 NX02 QT B5「採購接同行報價」demo 對稱。

### 4.2 demo 覆蓋對照

| 模組 | demo 廣度 | 覆蓋業務 |
|---|---|---|
| Quote 報價 | ❌ 0 spec | DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED 6 階流 + customer 等級定價 |
| SO 銷貨 | ❌ 0 spec | 6 階流（DRAFT→CONFIRMED→PICKING→SHIPPED→INVOICED）+ 雙段狀態（transfer + fulfill）|
| **SO 翻譯流** | ✅ translator 8 spec 覆蓋 | D3 客訂預約 + D4 同行調貨 Rfq stub |
| SR 銷退 | ❌ 0 spec | 5 階流 + 銷售組長核准 + 倉管收貨 + 退貨政策快照 |
| Co 客訂預約 | ❌ 0 spec | 純隨 translator 自動建、P/F/E/V 4 階 |

⭐ **demo 集中 D3+D4 翻譯流**（業務難點：跨模組 SO + Rfq + Co + Ti 多表寫入原子性）、其他 4 業務深度 0 test。

### 4.3 service 鏈完整、但測試斷層（與 NX02 同範式）

NX04 完整 service 鏈確實落地：
```
Quote → QuoteItem → (轉) → SO → SoItem → (出庫 source=S) → NX03 ledger
                                ↓ 翻譯流
                                Co 客訂預約 (B 補貨)
                                Rfq stub (G 同行調貨、NX02 SALES role 接)
                                ST 調撥 (T 自倉)
                                ↓
                                SR 銷退 → (入庫 source=R) → NX03 ledger
                                NX05 AR 應收（既有 reverse FK ✓）
```
但僅 translator 環節有 test 安全網、其他環節為「demo 看流程能跑、但無回歸測試」。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §5. NX04 vs NX02/NX03/AR 範式對齊

### 5.1 partVersionId M1 配套狀態

```
grep "partVersionId" apps/nx-api/src/nx04 → ledger 寫入處全帶入
```

| 檔 | line | 範式 |
|---|---|---|
| `so/so.service.ts` | 197 | `partVersionId: partVersion?.id ?? null`（inline findFirst per item、NX03 Phase 5 commit 1 升級）|
| `sales-return/sales-return.service.ts` | 225 | 同上（NX03 Phase 4 commit 2 升級）|

⭐ **NX04 partVersionId M1 配套完整**（與 NX02/NX03/AR 同範式）、Q-S1=B 漸進對齊（partVersion 表為 null 也 OK）。

### 2.2 sourceModule + sourceDocType 落帳契約

| 觸發 | sourceModule | sourceDocType | helper |
|---|---|---|---|
| SO POSTED 出庫 | NX04 | **S** | applyQtyOutWithLedger |
| SR POSTED 入庫 | NX04 | **R** | applyQtyInWithLedger |

⭐ **NX04 是 NX03 ledger source=S/R 主要寫入者**、對齊 NX02（P/G/R）+ NX03（I/T/X/W/M/D）形成 10 種 source 完整覆蓋。

### 5.3 跨 NX02 同行調貨業務歸屬接點

對齊 NX02-IMPL-01 Phase 5 commit 5b（Crown Q-C4=A）：
- ✅ NX02 `qt.controller` 4 endpoint @Roles +SALES（業務歸 NX04、role_view 已調整）
- ✅ `Nx04SoItem.tiId` FK 接 `Nx02Ti`（D3 反向追蹤）
- ✅ `Nx04Quote.rfqId` FK 接 `Nx02Rfq`（D4 翻譯 stub）
- ✅ `Nx02Rfq.sourceSoItemId` reverse FK 接 `Nx04SoItem`（D4 反查）
- ✅ `Nx02TiItem.sourceSoItemId` reverse FK 接 `Nx04SoItem` 必填（D3）

⭐ **跨 NX02 schema + role 雙向接通完整**（NX02-IMPL-01 已 closure 階段同步調整）。

### 5.4 與 NX02/NX03/AR closure 範式對齊

| 範式 | NX03 | AR | NX02 | NX04 現況 |
|---|---|---|---|---|
| partVersionId M1 配套 | ✅ | ✅ | ✅ | ✅ 已升 |
| sourceModule + sourceDocType 落帳 | ✅ | ✅ | ✅ | ✅ S/R 完整 |
| L1~L4 分層架構 | ✅ | ✅ | ✅ | ❌ 平鋪 4 子模組、無 L 分層 |
| Phase N 拆軌節奏 | ✅ 8 | ✅ 8 | ✅ 8 | ❌ 散在 Phase 0 D3/D4 + 既有 service 落地 |
| `*-summary.md` 模組架構書 | ✅ | ✅ | ✅ | ❌ 無 nx04-summary.md（僅 nx04 目錄結構）|
| audit 序列 01~04 | ✅ 4 | ✅ 1 v2 | ✅ 2 | 🟡 本檔（01）剛起 |
| 範圍 closure 標準 | ✅ | ✅ | ✅ | ❌ 無 closure 標準揭露 |

⭐ **NX04 在「P 鏈技術契約」對齊（partVersionId / ledger 三維）、但模組層治理（summary / audit / phase / closure）落後 NX02/NX03/AR 三軌**。

### 5.5 partner 維度對齊（修正 NX02-AUDIT-02 揭露的 partnerType）

| 用途 | partnerType | NX04 引用 |
|---|---|---|
| 客戶 | `C` | Quote.customerId / So.customerId / Sr.customerId / Co.customerId |
| 供應商（同行調貨間接）| `S` | 無直接、透過 Nx02Ti.partnerId 間接 |

⭐ **NX04 純 C 客戶 partner 路徑**（採購側 S 供應商不直接引用、走 NX02 Qt/Ti FK）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §6. 業界場景候選揭露

### 6.1 已落地場景

| 場景 | schema | service | UI | demo |
|---|---|---|---|---|
| 報價單（含等級定價 + 多選項 + 最低售價警示）| ✅ | ✅ | ❌ | ❌ |
| 銷貨單（6 階流 + 雙段狀態 + 跨倉銷售）| ✅ | ✅ | ❌ | ❌ |
| 銷退單（5 階流 + 銷售組長核准 + 退貨政策快照）| ✅ | ✅ | ❌ | ❌ |
| 客訂預約（CO、待補貨追蹤、反向追蹤 SO 來源）| ✅ | 🟡（純 translator 自動建）| ❌ | ❌ |
| **同行調貨翻譯**（D3 反追蹤 + D4 Rfq stub）| ✅ | ✅ | ❌ | ✅ translator 8 spec |
| 出貨方式分流（D 配送/P 自取/C 寄貨）| ✅ schema | ✅ | ❌ | ❌ |
| 補貨來源 4 enum（S 本倉/T 調撥/G 同行/B 客訂）| ✅ | ✅（雙段狀態流）| ❌ | 🟡 部分 spec |
| 跨倉銷售（SoItem.warehouseId 可與表頭不同）| ✅ | ✅ | ❌ | ❌ |
| 折扣代碼（Quote/So item discountCodeId）| ✅ | ✅ | ❌ | ❌ |
| 客戶等級定價（customerGradeId）| ✅ | ✅ | ❌ | ❌ |
| 報價單分批轉銷貨（transferredQty）| ✅ | ✅ | ❌ | ❌ |
| NX05 AR 應收接點 | ✅ reverse FK | 🟡 部分（grep 待 verify）| ❌ | ❌ |
| 撿包 SOP 接點（Nx03Pk → SoItem）| ✅ reverse FK | 🟡 部分 | ❌ | ❌ |

### 6.2 候選但未盤點場景（業界常見、本軌可補）

| 場景 | 現況 | 備註 |
|---|---|---|
| **客戶分級補貨策略**（VIP/A/B/C 不同庫存優先）| ❌ 0 schema、純 customerGradeId 標記 | NX02-AUDIT-02 §6.3 候選 #9 已揭露、後續軌 |
| **銷售業績追蹤**（業務員業績 + 倒扣 / 報價低於 minPrice 紀錄）| 🟡 schema 已備 `belowMinReason`、業績計算 0 | PLUS 候選 |
| **報價單客戶簽核回傳**（accepted vs rejected 流程）| 🟡 schema status 已備、business flow 0 | 業界中小企業靠 line/email 確認、未必需系統 |
| **客戶授信額度 / 黑名單擋單**（既有 `Nx01Partner.creditLimit/creditStatus`）| 🟡 schema 已備、SO 建單時 0 校驗 | LITE-CORE 候選、改 so.service create 加 guard |
| **銷退退款處理**（既有 schema 0 退款路徑、純記錄）| 🟡 SR POSTED → 入庫、退款走 NX05 Allowance | 對齊 NX02-IMPL-01 Phase 5 Allowance bridge 範式 |
| **報價單比價對照**（既有 QuoteItem.groupNo 多選項）| ✅ schema 已備 | UI 顯示對照、service 0 邏輯 |
| **銷貨配送追蹤**（既有 NX06 DN 接點、實 service 待 verify）| ✅ reverse FK 接點 | NX06 模組獨立軌 |
| **銷售前後場景管理**（業務員手機操作、現場開單）| ❌ 0 schema、純 UI | 業界連鎖標配、PRO 候選 |
| **客戶定期報表 / 對帳單**（月結客戶）| ❌ 0 schema | NX05 月結延伸 |
| **銷售提成計算**（業務員提成 + 主管分潤）| ❌ 0 schema | NX08 報表延伸 |
| **銷售折扣審核**（折扣超出權限需主管核准）| ❌ 0 schema、純 belowMinReason 記錄 | 業界中小企業常見、可加 |
| **退換貨換新**（不是退款、是換新品）| ❌ 0 schema | 業界常見、可考慮 returnType 新 enum |

### 6.3 戰略候選排序（給 Crown 參考）

1. ⭐⭐⭐ **客戶授信額度 / 黑名單擋單**（既有 schema 已備、SO 建單時補 guard、業界基本需求）
2. ⭐⭐⭐ **銷售業績追蹤**（業界中小企業核心、業務員動機機制）
3. ⭐⭐ **報價單客戶簽核回傳**（純流程設計、無 schema 改）
4. ⭐⭐ **銷退退款處理**（對齊 NX02-IMPL-01 Phase 5 Allowance bridge 範式 / `Nx05Allowance allowanceType='S'`）
5. ⭐⭐ **報價單比價對照 UI**（schema 已備 groupNo、純 UI）
6. ⭐ **客戶分級補貨策略**（NX02-AUDIT-02 §6.3 #9 already disclosed）
7. ⭐ **銷售提成計算**（NX08 報表延伸、後續軌）
8. ⭕ **退換貨換新**（業界常見、可考慮 returnType 新 enum、討論）
9. ⭕ **銷售前後場景管理**（PRO 候選、不在 LITE 範圍）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記

### 全檔對齊 NX02/NX03/AR audit 範式 5 標準

| 標準 | 本檔 |
|---|---|
| §G.9 通配 grep | ✅（10+ 處 grep -c / find -iname）|
| §I.5 #22 schema verify | ✅（7 model line 範圍精確、4 unique / 7 index 列）|
| §I.6.5 A041 精確 count | ✅（7 schema / 24 ts / 5 UI / 26 endpoint / 4 controller / 5 utils / 3 placeholder / 8 spec）|
| §I.6.3 揭露不完整尾標 | ✅（6 段尾全標）|
| 純諮詢、無 commit、無分支 | ✅（本檔 Write 後 commit、Crown 拍板後決定 IMPL 軌）|

### 已揭露關鍵 drift / 殘留

1. ⚠️ **`menu.nx04.ts` 嚴重 drift**（內容全是 NX05 財務、href 指 /dashboard/nx05/*）
2. ⚠️ **3 個 sales 命名 namespace 並存殘留**（features/sale/ + features/sales/ + features/nx03/sales/）
3. ⚠️ **Nx04SoItem.itemStatus 既標 @deprecated**（Phase 0 D3 改雙段、trigger 仍雙寫保留相容）
4. ⚠️ **Nx04So.sourceType 標 @deprecated**（Phase 0 D3 改 line item transferSourceType、trigger 將防寫入）

### 下一步候選（給 Crown 拍板）

1. **NX04-AUDIT-02**：客戶授信 / 業績追蹤 / 報價簽核回傳 業界對標深掘
2. **NX04-AUDIT-03**：UI 殘留盤點（3 namespace + menu drift）+ NEW placeholder 細部需求
3. **NX04-IMPL-01-PLAN**：直接進實作軌、對齊 NX02/NX03/AR Phase 0 plan 範式
4. **TASK-NX04-DEMO-CLEANUP**：清 features/{sale,sales,nx03/sales}/ 多 namespace 殘留 + menu.nx04.ts 修

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx02-audit-01](../nx02/nx02-audit-01.md) · [nx02-audit-02](../nx02/nx02-audit-02.md) · [nx03-audit-01](../nx03/nx03-audit-01.md) · [ar-audit-01](../auto-replenish/ar-audit-01.md)
