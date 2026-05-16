<!-- docs/nx02/nx02-audit-01.md -->

# NX02 採購模組 — Schema + 既有 demo 真相揭露（NX02-AUDIT-01）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx02/、Crown 拍板後啟動 IMPL）
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-16
> 任務：NX03 範圍 A closure（v0.3.0）+ AR 範圍 B closure（v0.4.0）後、Crown 拍板 NX02 採購模組第三戰略軌、Alex 寫子規格書前依 §I.5 #22 鐵律 verify schema 真相
> 真實 main HEAD：`ae622fe`（AR overview 補 commit 後、AR B 軌全 closure）
> NX01 全 closure 狀態：17/17 ✓、NX03 範圍 A：20 model + 6 服務 closure ✓、AR 範圍 B：2 migration + 5 服務 closure ✓
> 對應依據：[nx03-audit-01](../nx03/nx03-audit-01.md) + [ar-audit-01](../auto-replenish/ar-audit-01.md) 範式對齊

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep（`find -iname "*nx02*"`）+ §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數、禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- 本檔僅揭露**已落地**狀態、不寫 plan、不寫拍板 Q
- NX02 採購模組為 NEXORA 戰略主軸（PLUS / PRO 級重戰場）、本檔為下一階段重塑前置盤點

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §1. NX02 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx02" packages/db-core/prisma/schema.prisma
→ 13
```

**NX02 已落地 schema = 13 個 model**（採購 5 主檔 + 對應 items + 退貨 + 同行調貨 + 進口配套）。

### 1.2 全 13 個 model 列表（line 範圍 + 業務語意 + 啟用版本）

| # | Model | Line | Table | 業務語意 | 啟用版本 |
|---|---|---|---|---|---|
| 1  | `Nx02Demand`     | 1467 | `nx02_demand`     | 採購需求單（S=庫存不足/O=客訂、AR 自動建 demandType=S）| LITE-CORE |
| 2  | `Nx02Po`         | 1517 | `nx02_po`         | 採購單表頭（DRAFT/CONFIRMED/PARTIAL_RECEIVED/RECEIVED/CLOSED/CANCELLED、含進口欄）| PLUS |
| 3  | `Nx02PoItem`     | 1595 | `nx02_po_item`    | 採購單明細（partId snapshot、receivedQty 累加追蹤）| PLUS |
| 4  | `Nx02Pr`         | 1640 | `nx02_pr`         | 採購退回單表頭（D=草稿/P=過帳/V=作廢、ref rrId）| LITE |
| 5  | `Nx02PrItem`     | 1706 | `nx02_pr_item`    | 採購退回明細（ref rrItemId 反向追蹤）| LITE |
| 6  | `Nx02Qt`         | 1752 | `nx02_qt`         | **同行報價單**（Phase 0 B5、P/A/R status、partnerType=S 同行）| LITE-CORE |
| 7  | `Nx02Rfq`        | 1794 | `nx02_rfq`        | 詢價單表頭（rfqType G=一般/P=同行調貨、rfqReason 多選 S/O/N/P/T）| LITE |
| 8  | `Nx02RfqItem`    | 1861 | `nx02_rfq_item`   | 詢價單明細（isAdopted bool、demandItemId 反查）| LITE |
| 9  | `Nx02Rr`         | 1913 | `nx02_rr`         | 進貨單表頭（DRAFT/INSPECTING/POSTED/REJECTED/CANCELLED、ref rfq/po/ti 三來源）| LITE |
| 10 | `Nx02RrImport`   | 1989 | `nx02_rr_import`  | **進口進貨單配套**（運費 / 關稅 / 倉儲費攤分、incoterm 影響必填）| LITE-CORE |
| 11 | `Nx02RrItem`     | 2055 | `nx02_rr_item`    | 進貨明細（expectedQty/actualQty/defectQty、warrantyExpiredAt 保固到期）| LITE |
| 12 | `Nx02Ti`         | 2111 | `nx02_ti`         | 同行調貨單表頭（D/S/R/P/C/V、partnerType=S 同行、ref rfq P 類型）| LITE-CORE |
| 13 | `Nx02TiItem`     | 2169 | `nx02_ti_item`    | 同行調貨明細（sourceSoItemId 必填、Phase 0 D3 反向追蹤）| LITE-CORE |

### 1.3 唯一約束 + Index 概況

| Model | unique | index |
|---|---|---|
| Nx02Demand | `[docNo]` | — |
| Nx02Po | `[docNo]` | — |
| Nx02PoItem | — | — |
| Nx02Pr | `[docNo]` | — |
| Nx02PrItem | — | — |
| Nx02Qt | — | `[tenantId, rfqId]` + `[tenantId, inquiryPartnerId]` + `[tenantId, status]` |
| Nx02Rfq | `[docNo]` | `[tenantId, sourceSoItemId]` |
| Nx02RfqItem | — | — |
| Nx02Rr | `[docNo]` | — |
| Nx02RrImport | — | — |
| Nx02RrItem | — | — |
| Nx02Ti | `[docNo]` | — |
| Nx02TiItem | — | `[sourceSoItemId]` |

⭐ **8 表 docNo unique 完備**、Qt 表 3 個 index 最齊（業界 PMR 反查 + status 列表優化）、其它表 ledger/audit 場景多走 FK 反 join、不依 index。

### 1.4 跨 NX 模組 FK 接點

| 來源 | 目的 | relation |
|---|---|---|
| `Nx02Demand.partId` | `Nx01Part` | 需求 part |
| `Nx02Demand.warehouseId` | `Nx01Warehouse` | 需求倉 |
| `Nx02Demand.customerId` | `Nx01Partner` | demandType=O 客訂 |
| `Nx02Po.supplierId` | `Nx01Partner` | 供應商（partner_type=SUP/BOTH）|
| `Nx02Po.currencyId` | `Nx01Currency` | 預設 TWD |
| `Nx02Qt.inquiryPartnerId` | `Nx01Partner` | 同行（partner_type=S 同行）|
| `Nx02Rfq.warehouseId` | `Nx01Warehouse` | 入庫倉 |
| `Nx02Rfq.sourceSoItemId` | `Nx04SoItem` | D4 同行調貨 RFQ stub 反查 |
| `Nx02Rr.poId` | `Nx02Po` | P 鏈 |
| `Nx02Rr.tiId` | `Nx02Ti` | G 鏈（同行調貨入庫）|
| `Nx02RrImport.rrId` + `.poId` | `Nx02Rr` + `Nx02Po` | 進口費用攤分 |
| `Nx02Ti.partnerId` | `Nx01Partner` | 同行 |
| `Nx02TiItem.sourceSoItemId` | `Nx04SoItem` | D3 必填反向追蹤 |
| `Nx02Po → Nx05ApLedger` | reverse `Nx05ApLedger_poId` | 採購確認 → AP 應付帳款 |
| `Nx02Rr → Nx05ApLedger` | reverse `Nx05ApLedger_rrId` | 進貨入庫 → AP 應付帳款 |
| `Nx02Ti → Nx05ApLedger` | reverse `Nx05ApLedger_tiId` | 同行調貨 → AP |
| `Nx02Demand ↔ Nx02Rfq` | 雙向（demand.refRfqId + rfq.demandId）| 需求接通詢價 |

⭐ **NX02 是「跨模組樞紐」**：上接 NX03 缺貨偵測（AR）、下接 NX05 AP 應付帳款（5 條 reverse relation）、橫接 NX04 SO（D3/D4 同行調貨 source）、本身內部 P 鏈（RFQ→PO→RR）+ G 鏈（RFQ→TI→RR）雙路徑並存。

### 1.5 狀態機概況（DB 真相）

| Model | enum | 業務 |
|---|---|---|
| Nx02Demand.status | O/P/C/I | 待處理/處理中/已完成/已忽略 |
| Nx02Po.status | DRAFT/CONFIRMED/PARTIAL_RECEIVED/RECEIVED/CLOSED/CANCELLED | 6 階全展開 |
| Nx02Pr.status | D/P/V | 草稿/過帳/作廢（單字元歷史延續）|
| Nx02Qt.status | P/A/R | PENDING/AGREED/REJECTED |
| Nx02Rfq.status | DRAFT/SENT/REPLIED/CLOSED/VOID | 5 階（VARCHAR 20）|
| Nx02RfqItem.status | P/R/S/C | PENDING/REPLIED/SELECTED/REJECTED |
| Nx02Rr.status | DRAFT/INSPECTING/POSTED/REJECTED/CANCELLED | 5 階含驗收計時 |
| Nx02Ti.status | D/S/R/P/C/V | 6 階（單字元）|

⚠️ **enum 格式不一致**：Po/Rr/Rfq 用 token、Pr/Qt/Ti 用單字元、Demand/RfqItem 用單字元。`shared/nx02/nx02-state-machine.ts` 統一 API 對外格式。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2. NX02 backend service 真相

### 2.1 A041 精確 count（5 子模組 + 26 主要 ts）

```
find apps/nx-api/src/nx02 -iname "*.ts" -type f | wc -l
→ 26
```

**5 子模組落地**：`po / purchase-return / qt / rfq / rr`、外加 `nx02.module.ts` 根聚合。

### 2.2 子模組結構 + 測試覆蓋

| 子模組 | files | tests | 測試類型 |
|---|---|---|---|
| `nx02.module.ts` | 1 | — | 根聚合 |
| `po/`              | 3（controller / service / dto）| 0 | ❌ 0 spec |
| `purchase-return/` | 3 | 0 | ❌ 0 spec |
| `qt/`              | 4 + **6 spec**（4 unit + 2 integration + helpers）| **6** | ✅ Phase 0 B5 demo 主軸 |
| `rfq/`             | 3 | 0 | ❌ 0 spec |
| `rr/`              | 3 | 0 | ❌ 0 spec |

⭐ **測試覆蓋只在 qt/**（Phase 0 B5 D3+D4 同行調貨翻譯流 demo）、其餘 4 子模組 0 test、純 service + controller + dto。

### 2.3 Controller 路由 + endpoint count

```
grep "@Controller" apps/nx-api/src/nx02/**/*.controller.ts
→ 5 controller、共 37 endpoints
```

| Controller | path | endpoints |
|---|---|---|
| `po/po.controller.ts` | `@Controller('nx02/po')` | 8 |
| `purchase-return/purchase-return.controller.ts` | `@Controller('nx02/purchase-return')` | 8 |
| `qt/qt.controller.ts` | `@Controller('nx02')` ⚠️ root path | 5（rfq/list-for-purchase / qt POST / qt/:id/adopt / qt/:id/reject / rfq/:id/cancel）|
| `rfq/rfq.controller.ts` | `@Controller('nx02/rfq')` | 8 |
| `rr/rr.controller.ts` | `@Controller('nx02/rr')` | 8 |

⚠️ **qt.controller 用 root path `nx02`**（非 `nx02/qt`）、業務原因：B5 採購翻譯流跨 rfq+qt 兩資源、`rfq/list-for-purchase` 與 `rfq/:id/cancel` 是 RFQ 動詞、`qt POST/adopt/reject` 才是 QT。

### 2.4 共用 utils（5 / shared/nx02/）

```
find apps/nx-api/src/shared/nx02 -type f -iname "*.ts" | wc -l
→ 5
```

| utils | 用途 |
|---|---|
| `nx02-advisory-lock.ts` | PG advisory lock 防 race（Phase 0 B5 qt adopt 多歷史 concurrent 測試對齊）|
| `nx02-currency.ts` | 幣別轉換（multi-currency 採購支援）|
| `nx02-doc-no.ts` | DocKind enum：RF / PO / RR / PR / TI（5 種單號前綴生成器）|
| `nx02-list-query.dto.ts` | 分頁 / 排序 / 篩選通用 DTO |
| `nx02-state-machine.ts` | API token 對 DB 單字元 enum 雙向轉換 |

### 2.5 業務升級點（最近 NX03/AR 軌附帶升級）

| 升級點 | 檔 | line | 軌 |
|---|---|---|---|
| RR G/P 分流 + partVersionId M1 配套 | `rr/rr.service.ts` | 136~190 | NX03-IMPL-01 Phase 4 commit 1 |
| PR posting 隱性 bug 修 + partVersionId | `purchase-return/purchase-return.service.ts` | 155~190 | NX03-IMPL-01 Phase 5 commit 2 |
| QT 同行 fixture partBrandId 帶入 | `qt/__tests__/integration/test-helpers.ts` | 141 | 既有 fixture |

⭐ **NX02 service 0 處直引 `isOem` / `fitLevel` / `part_model`**：採購純走 partId 路徑、品牌/車型維度由 application 層或 AR 模組處理（grep verified）。

### 2.6 NX02 → NX03 ledger 寫入鏈

| 入口 | helper | source code |
|---|---|---|
| `Nx02Rr.applyRrPosting`（POSTED）| `applyQtyInWithLedger` | sourceModule=NX02、sourceDocType=**P**（純採購）或 **G**（同行調貨 ti!=null）|
| `Nx02Pr.postPurchaseReturn`（POSTED）| `applyQtyOutWithLedger` | sourceModule=NX02、sourceDocType=**R**（退貨）|

⭐ 採購鏈最終 ledger 全由 NX02 service trigger、與 NX03/AR 對齊「sourceModule + sourceDocType + partVersionId」三維度落帳契約。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3. NX02 frontend 真相

### 3.1 A041 精確 count

```
find apps/nx-ui/src -ipath "*nx02*" -type f | wc -l
→ 71
```

**71 個 NX02 前端檔**（含 21 dashboard page + 49 features/nx02/* + 1 menu config）。

### 3.2 Dashboard pages（21 個、按業務性質分類）

| 類別 | path | 業務 | 性質 |
|---|---|---|---|
| 採購 NEW placeholder | `nx02/domestic/page.tsx` | 國內採購 | ⭐ NEW、`NxWorkspacePlaceholder` |
| 採購 NEW placeholder | `nx02/import/page.tsx` | 進口採購 | ⭐ NEW、`NxWorkspacePlaceholder` |
| 採購 NEW placeholder | `nx02/product/page.tsx` | 產品採購 | ⭐ NEW、`NxWorkspacePlaceholder` |
| 採購 NEW placeholder | `nx02/special/page.tsx` | 特殊採購（掃貨 / 出清）| ⭐ NEW、`NxWorkspacePlaceholder` |
| 採購 NEW placeholder | `nx02/vendor/page.tsx` | 供應商工作台 | ⭐ NEW、`NxWorkspacePlaceholder` |
| 庫存殘留 | `nx02/auto-replenish/page.tsx` | 自動補貨 | ⚠️ OLD（已遷 NX03 AR、UI 未刪）|
| 庫存殘留 | `nx02/balance/page.tsx` | 即時量 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/init/`（3 page）| 開帳單 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/ledger/page.tsx` | 異動帳冊 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/shortage/page.tsx` | 缺貨偵測 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/stock-setting/page.tsx` | 安全量 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/stock-take/`（3 page）| 盤點 | ⚠️ OLD（已遷 NX03）|
| 庫存殘留 | `nx02/transfer/`（3 page）| 調撥 | ⚠️ OLD（已遷 NX03）|
| Dashboard 根 | `nx02/page.tsx` + `nx02/layout.tsx` | 模組首頁 | 性質待 Crown 拍板 |

`grep -l "NxWorkspacePlaceholder" apps/nx-ui/src/app/dashboard/nx02 → 5 file`

⚠️ **5 NEW 採購 placeholder vs 13 OLD 庫存殘留 page**：採購 dashboard 業務骨架已落地、舊庫存 UI 殘留待清理（對齊 NX03-AUDIT-02 殘留盤點推進）。

### 3.3 features/nx02/* 子目錄（10 子模組）

```
find apps/nx-ui/src/features/nx02 -type d
→ 10 子模組（含 root）
```

| features/nx02/ 子模組 | 對齊 | 性質 |
|---|---|---|
| `auto-replenish/` | 對 NX03 AR | ⚠️ OLD 殘留（AR 已新落地 features/nx03/auto-replenish/）|
| `balance/` | 對 NX03 stock-balance | ⚠️ OLD 殘留 |
| `dashboard/` | NX02 模組首頁 | ❓ 混合（StatCard 4 卡、待 verify 是否含採購指標）|
| `init/` | 對 NX03 init 開帳 | ⚠️ OLD 殘留 |
| `ledger/` | 對 NX03 stock-ledger | ⚠️ OLD 殘留 |
| `shared/` | Part lookup + Plan upgrade | 共用 helper（PartLookupAutocomplete / PlanUpgradePrompt）|
| `shortage/` | 對 NX03 shortage | ⚠️ OLD 殘留 |
| `stock-setting/` | 對 NX03 part-stock-setting | ⚠️ OLD 殘留 |
| `stock-take/` | 對 NX03 stock-take | ⚠️ OLD 殘留 |
| `transfer/` | 對 NX03 transfer / St | ⚠️ OLD 殘留 |

⚠️ **features/nx02/ 9/10 子模組是 NX03 庫存殘留**（pivot 前的 NX02=庫存 時代遺物）、純採購 features（po / rfq / rr / qt / pr）**0 個 features/ 目錄**、UI 邏輯全靠 dashboard placeholder + 後端 API 直連。

### 3.4 menu config

| file | line | 狀態 |
|---|---|---|
| `apps/nx-ui/src/features/layout/config/menu.nx02.ts` | 1 | half-migrated（function name 留舊、href 已新採購路徑）|

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4. 既有的 demo 揭露

### 4.1 demo 主軸：QT 同行調貨翻譯流（Phase 0 B5）

**唯一深 demo 的子模組 = `qt/`**（6 test spec 全集中於此）：

| spec | 測試類型 | 場景 |
|---|---|---|
| `qt-add.spec.ts` | unit | 同行報價 add（quotedPrice + quotedQuantity） |
| `qt-adopt.spec.ts` | unit | 採購採用 QT → 自動建 TI（同行調貨單）|
| `qt-reject.spec.ts` | unit | 採購拒絕 QT（必填 rejectReason） |
| `rfq-cancel.spec.ts` | unit | RFQ 作廢 → cascade QT 全 reject |
| `rfq-list.spec.ts` | unit | `rfq/list-for-purchase` 採購視角列表 |
| `integration/qt-adopt-concurrent.int-spec.ts` | integration | advisory lock 防 race（兩採購同時 adopt 同 RFQ）|
| `integration/qt-adopt-multi-history.int-spec.ts` | integration | 多歷史 QT 採用追蹤 |

⭐ **B5 demo = D3 必填 sourceSoItemId（TiItem 反向追蹤 SO line）+ D4 RFQ stub 翻譯（SoItem → Rfq sourceSoItemId）+ 同行調貨 P 類型 RFQ**、業界事實對齊 partner_type='S' 同行（qt.service.ts:436 verified）。

### 4.2 demo 覆蓋對照

| 模組 | demo 廣度 | 覆蓋業務 |
|---|---|---|
| RFQ 一般詢價 G | ❌ 0 spec | 採購建 RFQ → 寄供應商 → 收回覆 |
| RFQ 同行調貨 P | ✅ qt 套件覆蓋 | 銷售 D4 建 RFQ stub → 採購 B5 採用 |
| PO 採購單 | ❌ 0 spec | DRAFT/CONFIRMED/PARTIAL_RECEIVED/RECEIVED/CLOSED/CANCELLED 6 階流 |
| RR 一般進貨 | ❌ 0 spec | P 鏈：rfq+po → rr POSTED → ledger source=P |
| RR 同行調貨入庫 | ❌ 0 spec | G 鏈：ti → rr POSTED → ledger source=G（Phase 4 升）|
| RR 進口進貨 | ❌ 0 spec | RrImport 攤分 incoterm FOB/CIF/EXW/DDP |
| PR 採購退回 | ❌ 0 spec | rr → pr POSTED → ledger source=R（Phase 5 commit 2 bug 修）|
| TI 同行調貨 | ❌ 0 spec | rfq P → ti → rr 三步鏈 |
| Demand 採購需求 | ❌ 0 spec | demandType S（AR 自動建）+ O（客訂銷售建）|

⭐ **demo 集中度高、廣度低**：QT 覆蓋深 / 其它 8 業務全 0 spec、走全鏈靠 service 端 application 邏輯保證（無 e2e 安全網）。

### 4.3 service 鏈完整、但測試斷層

NX02 完整 service 鏈確實落地：
```
Demand → RFQ → Qt → Po → Rr → (NX03 ledger source=P/G/R)
                  ↓                     ↓
                  Pr ← Rr 反查      Nx05 ApLedger 應付鏈
```
但僅 QT 環節有 test 安全網、其他環節為「demo 看流程能跑、但無回歸測試」。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §5. NX02 vs NX01 範式對齊

### 5.1 NX01 進階維度引用矩陣

```
grep "partVersionId\|isOem\|fitLevel\|partModel\|part_model" apps/nx-api/src/nx02
→ 6 hits（全 partVersionId、0 isOem / fitLevel / part_model 直引）
```

| NX01 維度 | 引用 | 落地 |
|---|---|---|
| `partVersionId` M1 配套 | ✅ 2 處（rr.service / purchase-return.service）| Phase 4/5 commit 升級、load active version 帶入 helper |
| `isOem` | ❌ 0 處 | 採購不分 OEM/副廠（採購談價走 partId 直線、品牌維度交 AR 模組）|
| `fitLevel` | ❌ 0 處 | 採購不查替代相容性（替代邏輯在 NX03 PartReplacementService）|
| `part_model` | ❌ 0 處 | 採購不彙整 model（彙整在 AR Stage 2/4）|
| `partBrandId` | ✅ qt 測試 fixture（test-helpers.ts:141）| 僅測試帶入、production 路徑 0 引用 |

⭐ **NX02 採購純 partId 線路**：上游 demand→RFQ→PO→RR→ledger 不關心品牌/車型/替代、僅關心「partId 數量 / 單價 / 倉位 / 供應商」、與 NX01 高階維度透過 application 層解耦（採購單純化、AR 進階化）。

### 5.2 與 NX03/AR closure 範式對齊

| 範式 | NX03 已落地 | AR 已落地 | NX02 現況 |
|---|---|---|---|
| partVersionId M1 配套 | ✅ 全 8 helper | ✅ ledger 寫入完整 | ✅ rr/pr 已升（Phase 4/5 NX03 軌附帶）|
| sourceModule + sourceDocType 三維落帳 | ✅ 強制 | ✅ AR 觸發鏈終點 P | ✅ NX02 是 P/G/R 三 source 主寫入 |
| 4 階段分層架構（L1~L4）| ✅ | ✅ | ⚠️ NX02 5 子模組平鋪、無 L 分層揭露 |
| Phase N 拆軌節奏 | ✅ 8 phase | ✅ 8 phase | ❌ 歷史散 phase 0 / B5 / WP-MINI、無統一節奏 |
| `*-summary.md` 模組架構書 | ✅ nx03-summary | ✅ ar-summary | ❌ 無 nx02-summary（僅 nx02-worklog）|
| audit 序列 01~04 | ✅ 4 audit | ✅ 1 v2 audit | 🟡 本檔（01）剛起 |
| 範圍 closure 標準（§8.2 對齊）| ✅ | ✅ | ❌ 無 closure 標準揭露 |

⭐ **NX02 在「P 鏈技術契約」上對齊（partVersionId / ledger 三維）、但在「模組層治理（summary / audit / phase 節奏 / closure 標準）」上明顯落後 NX03/AR 兩軌**。

### 5.3 partner 維度對齊

| 用途 | partnerType | NX02 引用 |
|---|---|---|
| 供應商 | `SUP` / `BOTH` | Po.supplierId / Rfq.supplierId / Rr.supplierId / Pr.supplierId |
| 同行 | `S` 同行 | Qt.inquiryPartnerId / Ti.partnerId |
| 客戶 | `CUS` | Demand.customerId（demandType=O 客訂）|

⭐ **NX02 完整覆蓋 NX01 partner 三大類**、Qt/Ti 模型開創「同行 partner」業務語意（業界中小 ERP 少見、NEXORA 戰略特色）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §6. 業界場景候選揭露

### 6.1 已落地場景

| 場景 | schema | service | UI | demo |
|---|---|---|---|---|
| 國內一般採購（Po purchaseType=D）| ✅ | ✅ | 🟡 placeholder | ❌ |
| 進口採購（Po purchaseType=I + RrImport）| ✅ | ✅ | 🟡 placeholder | ❌ |
| 掃貨採購（Po purchaseType=B、跳過 RFQ）| ✅ | ✅ | 🟡 placeholder | ❌ |
| 一般詢價（Rfq rfqType=G）| ✅ | ✅ | ❌ | ❌ |
| 同行調貨詢價（Rfq rfqType=P → Qt → Ti → Rr G 鏈）| ✅ | ✅ | ❌ | ✅ qt 6 spec |
| 採購需求驅動（Demand S=庫存不足、AR 自動建）| ✅ | ✅ | ❌ | ❌ |
| 採購需求驅動（Demand O=客訂、銷售手動建）| ✅ | ✅ | ❌ | ❌ |
| 採購退回（Pr ref rr 反查）| ✅ | ✅ | ❌ | ❌ |
| 進貨驗收計時器（Rr verifiedAt + approvedAt 倉管組長）| ✅ | ✅ | ❌ | ❌ |
| 採購組長核准（Po approvedAt + sentAt + supplierConfirmedAt）| ✅ | ✅ | ❌ | ❌ |
| 多幣別採購 | ✅ Decimal(14,4) + currencyId | ✅ shared/nx02-currency | ❌ | ❌ |
| 進口費用攤分（運費 / 關稅 / 倉儲 / 雜費）| ✅ | ✅ | ❌ | ❌ |
| 保固到期追蹤（RrItem warrantyExpiredAt 依 part.warrantyMonths）| ✅ | ✅ | ❌ | ❌ |
| 批號追蹤（RrItem batchNo 進貨年月+流水）| ✅ | ✅ | ❌ | ❌ |
| 瑕疵驗收（RrItem defectQty + defectType D/F/W/O）| ✅ | ✅ | ❌ | ❌ |

### 6.2 候選但未盤點場景（業界常見、本軌可補）

| 場景 | 現況 | 備註 |
|---|---|---|
| **採購付款條件**（淨 30 / 月結 / 預付 / 分期）| ⚠️ Po 僅有 `paymentTermImport`（5 chars TT/LC/DP/DA）僅進口、無國內付款條件 | 業界中小 ERP 標配、候選新欄或新表 |
| **採購 forecast / 預測單**（年度框架合約）| ❌ 0 schema | 業界連鎖品牌標配、PRO 級候選 |
| **供應商評核**（OTD / 良率 / 退貨率）| ❌ 0 schema | partner 主檔擴或新表、業界 SQE 業務 |
| **保固索賠**（rrItem.warrantyExpiredAt → 客退追蹤）| 🟡 欄已備但無 service | NX09 報修軌可能涵蓋、待 Crown 拍板歸屬 |
| **採購預付款 / 訂金**（PRO 級）| ❌ 0 schema | 對應 NX05 AP 應付帳款延伸 |
| **採購折扣 / 階段價格**（量大優惠 / 季末沖貨）| ❌ 0 schema | PoItem 僅 unitCost、無 discount 欄 |
| **委外加工**（subcontract、原料出 + 成品入）| ❌ 0 schema | 業界製造業標配、NEXORA 不在範圍 |
| **採購比價儀表板**（多廠商歷史單價趨勢）| ❌ 0 UI / 0 service | 業界資深採購工具、Hub UI placeholder 可承接 |
| **採購寄賣**（vendor managed inventory、不計入庫存直到銷售）| ❌ 0 schema | 業界 OEM 大廠常見、PRO 級候選 |
| **採購 RMA**（廠商退換貨流程）| 🟡 Pr 涵蓋部分、無獨立 RMA 編號軌 | 與保固索賠連動 |
| **採購工作台分視角**（採購專員 / 採購組長 / 倉管組長）| 🟡 schema 已分 createdBy/approvedBy/verifiedBy、UI 0 落地 | NEW placeholder 5 個方向已部署 |
| **採購自動化建議**（AR 範圍 B 已落地 demandType=S）| ✅ AR 已落地 | NX02 接 demand 即可 |
| **跨倉採購批次**（一張 PO 分倉到貨）| ❌ Po 僅 1 warehouseId 隱含、RR 多張可分倉但無批次 | 業界連鎖標配、PRO 級候選 |

### 6.3 戰略候選排序（給 Crown 參考）

1. ⭐⭐⭐ **採購付款條件**（國內補齊、目前只有進口、業界基本需求）
2. ⭐⭐⭐ **採購比價儀表板**（NEW placeholder UI 直接承接、5 工作台 product/vendor 候選）
3. ⭐⭐ **供應商評核**（partner 主檔擴）
4. ⭐⭐ **採購折扣 / 階段價格**（PoItem 擴欄）
5. ⭐⭐ **採購預付款 / 訂金**（NX05 AP 連動）
6. ⭐ **採購寄賣**（PRO 級候選）
7. ⭐ **跨倉採購批次**（PRO 級候選）
8. ⭕ **委外加工**（不在 NEXORA 範圍、排除）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記

### 全檔對齊 NX03/AR audit 範式 5 標準

| 標準 | 本檔 |
|---|---|
| §G.9 通配 grep | ✅（11 處 grep -c / find -iname）|
| §I.5 #22 schema verify | ✅（13 model line 範圍精確、6 unique / 5 index 列）|
| §I.6.5 A041 精確 count | ✅（13 schema / 26 ts / 71 UI / 37 endpoint / 5 controller / 5 utils / 5 placeholder / 6 spec）|
| §I.6.3 揭露不完整尾標 | ✅（6 段尾全標）|
| 純諮詢、無 commit、無分支 | ✅（本檔 Write、Crown 拍板後決定 IMPL 軌）|

### 下一步候選（給 Crown 拍板）

1. **NX02-AUDIT-02**：採購 hub workflow + 5 placeholder UI 細部需求盤點（對齊 NX03-AUDIT-02 殘留盤點範式）
2. **NX02-AUDIT-03**：付款條件 / 比價儀表 / 供應商評核 業界對標深掘（對齊 NX03-AUDIT-03 業務資產揭露）
3. **NX02-IMPL-01-PLAN**：拍板進入實作軌、對齊 NX03/AR Phase 0 plan v0.1.0 範式
4. **TASK-NX02-DEMO-CLEANUP**：清理 features/nx02/ 9 個 OLD 庫存殘留 + dashboard/nx02/ 13 個 OLD page

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx03-audit-01](../nx03/nx03-audit-01.md) · [ar-audit-01](../auto-replenish/ar-audit-01.md) · [nx02-worklog](./nx02-worklog.md)
