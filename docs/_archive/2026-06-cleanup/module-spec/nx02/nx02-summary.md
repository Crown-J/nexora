<!-- docs/nx02/nx02-summary.md -->

# NX02 採購管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX02-IMPL-01 17 commit + AUDIT-01 + AUDIT-02 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx02/spec/intent/nx02-overview.md` v0.1.0
> 戰略定位：NEXORA 業務模組第三軌（接 NX03 範圍 A closure / AR 範圍 B closure）

---

# § 1. NX02 模組業務角色

## 1.1 模組定位

NX02 = **NEXORA 採購管理層**、產品部門工作台、跨模組樞紐。

```
上游：AR 自動補貨建議單 (demandType=S) + NX04 SO 客訂 (demandType=O)
        ↓
NX02 採購 8 步 SOP：建議單 → RFQ 詢價 → 比價 → PO + 主管審核 → email 廠商 → 6 階段追蹤 → RR 驗收 → PR 退貨
        ↓
下游：NX03 庫存 (source=P/G/R)、NX05 應付帳款 (AP + Allowance)、NX06 物流（國外採購到貨配送）
```

**戰略意義**：
- ⭐⭐ 業界改革候選：partner ↔ part 混合範式（主檔 + 90 天歷史 fallback）
- ⭐⭐ 業界改革候選：國外採購 6 階段追蹤（業界中小 ERP 少見系統化）
- ⭐⭐ 業界改革候選：比價分析含新品 + 特價 + 量大彈性折扣
- ⭐ 退貨 3 種並存（全退 / 部分退 / 折讓不退）

## 1.2 12 業務功能（範圍 A、對齊 overview §8.1）

1. 採購需求單列表（按廠商過濾、客訂優先純標記）
2. 多家詢價 RFQ（email 範式、廠商不登入）
3. 比價分析（歷史 + 新品/特價 + 量折 3 維度）
4. 採購單 + 主管審核（量/單價可改、不可換廠商）
5. 國內採購完整鏈（D 模式）
6. 國外採購 6 階段追蹤（I 模式 + RrImport）
7. 掃貨採購（B 模式、跳 RFQ）
8. 進貨驗收
9. 退貨範式（F 全退 / P 部分退 / A 折讓不退）
10. 付款條件（國內補：淨 30 / 月結 / 預付 / 分期）
11. partner ↔ part 混合範式（主檔 + 歷史推算 fallback）
12. NX05 應付帳款接點

---

# § 2. Schema 真相

## 2.1 4 migration（A041 精確）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260517100000_nx02_impl_01_m1_po_payment_term_domestic` | Nx02Po +國內付款條件欄 |
| M2 | `20260517110000_nx02_impl_01_m2_po_purchase_stage_columns` | Nx02Po +5 國外 6 階段配套欄 |
| M3 | `20260517120000_nx02_impl_01_m3_pr_return_mode` | Nx02Pr +退貨類型 enum 欄 |
| M4 | `20260517130000_nx02_impl_01_m4_partner_part_create` | Nx02PartnerPart 中間表 |

DB：58 migrations applied、Database schema is up to date ✓

## 2.2 新增 model 1（A041）

`Nx02PartnerPart`（PNPT、LITE-CORE）：
- partnerId + partId 級主檔（Crown Q-PP-1=C 混合範式）
- isPrimary boolean（採購建議單排序）
- supplierPartNo nullable（Q-PP-3=b 廠商料號選填）
- defaultUnitCost / defaultLeadDays / moq（採購預設值）
- source S/M 雙來源（Crown Q-PP-2 + AR Q-S1=A 範式）
- validFrom/validTo 支援歷史版本
- unique [tenantId, partnerId, partId, validFrom]（Q-S3=A 仿 AR）

## 2.3 schema 升級 2（Nx02Po + Nx02Pr）

| 表 | 欄 | 業務 |
|---|---|---|
| Nx02Po | `paymentTermDomestic` VarChar(10)? | 國內付款條件、從 partner 帶入 |
| Nx02Po | `purchaseStage` SmallInt? | 國外 6 階段 enum 1~6 |
| Nx02Po | `requestedPaymentAt` DateTime? | stage=2 觸發時間欄 |
| Nx02Po | `paidAt` DateTime? | stage=3 觸發 |
| Nx02Po | `shippedAt` DateTime? | stage=4 觸發 |
| Nx02Po | `arrivedAt` DateTime? | stage=5 觸發（相對既有 eta） |
| Nx02Pr | `returnMode` VarChar(1) default 'P' | F=全退 / P=部分退 / A=折讓不退 |

---

# § 3. Service 真相

## 3.1 既有 service 升級 3（Phase 3）

| service | 升級點 | commit |
|---|---|---|
| `po.service` | supplier 付款條件帶入 + 主管審核寫 approvedAt/By + 國外 stage=1 預設 + dto +purchaseType D/I/B | 3a |
| `purchase-return.service` | returnMode F/P/A 入口分流（A 折讓不沖庫存、走 NX05 Allowance bridge）| 3b |
| `rfq.service` | +exportRfq method + GET /:id/export endpoint（text + JSON 兩格式）| 3c |

## 3.2 新增 service 4（Phase 2 + 4）

| service | 角色 | 主 method |
|---|---|---|
| `PartnerPartService` | partner ↔ part 主檔 CRUD | list / getById / create / update / softDelete |
| `PurchaseSuggestionService` | 採購建議單列表核心 | list（混合範式 supplierId 過濾、客訂優先排序）|
| `PriceComparisonService` | 比價分析 3 維度 | compareByPartId（D1 歷史均價 / D2 新品特價 / D3 量折）|
| `PurchaseStageService` | 國外 6 階段流轉 | transit（strict 推進 + 任意回退、寫對應時間欄）|

## 3.3 NX05 跨模組 helper 1（Phase 5）

| helper | 路徑 | 用途 |
|---|---|---|
| `createAllowanceFromPurchaseReturn` | `shared/nx05/nx05-create-allowance-from-pr.ts` | returnMode='A' 寫 Nx05Allowance allowanceType='P' 進貨折讓（inline、冪等）|

## 3.4 endpoints（A041 = 14 新）

| Method | Path | 功能 |
|---|---|---|
| GET | `/nx02/partner-part` | list（6 篩選欄、isPrimary 排序）|
| GET | `/nx02/partner-part/:id` | detail（含 partner + part snapshot）|
| POST | `/nx02/partner-part` | create（3 層 guard + dup 校驗）|
| PATCH | `/nx02/partner-part/:id` | update |
| DELETE | `/nx02/partner-part/:id` | softDelete |
| GET | `/nx02/rfq/:id/export` | RFQ 文字/JSON 匯出（email 範式）|
| GET | `/nx02/purchase-suggestion` | 採購建議單列表（混合範式 + 客訂優先）|
| GET | `/nx02/price-comparison/:partId` | 比價分析 3 維度 |
| PATCH | `/nx02/po/:id/stage` | 國外 6 階段流轉（推進 strict + 任意回退）|

既有 5 controllers（po/purchase-return/qt/rfq/rr）+ 4 new controllers = 9 controllers / 38 endpoints（既有 37 + 1 export）+ Phase 4/5 9 endpoints = 46+。

## 3.5 採購 8 步 SOP 流程

```
Step 1：採購建議單列表
   GET /nx02/purchase-suggestion?warehouseId=&supplierId=&demandType=
   → 待處理 Nx02Demand（客訂 O 排前 → AR S 排後）

Step 2：多家詢價
   POST /nx02/rfq → 建 RFQ
   GET /nx02/rfq/:id/export → 取得 email 內文

Step 3：比價分析
   GET /nx02/price-comparison/:partId?lookbackDays=90&recentDays=30
   → D1 歷史均價 / D2 新品特價 / D3 量折

Step 4：建採購單 + 主管審核
   POST /nx02/po { supplierId, purchaseType: 'D/I/B', items }
   PATCH /nx02/po/:id { status: 'CONFIRMED' } → 自動寫 approvedAt/By

Step 5：寄 email 廠商確認（純 manual、廠商不登入）

Step 6：國外採購 6 階段流轉
   PATCH /nx02/po/:id/stage { targetStage: 2~6, note }

Step 7：進貨驗收（既有 rr.service POSTED → NX03 source=P/G）

Step 8：退貨 returnMode 分流
   POST /nx02/purchase-return { returnMode: 'F/P/A', items }
   PATCH /nx02/purchase-return/:id { status: 'POSTED' }
   - F/P → applyQtyOutWithLedger source=R
   - A → createAllowanceFromPurchaseReturn → Nx05Allowance
```

---

# § 4. 拓樸 4 層（plan §2 對齊 NX01/NX03/AR 範式）

```
L1 基礎層（schema + 主檔）：
  M1 Nx02Po +國內付款條件 + M2 Nx02Po +6 階段欄 + M3 Nx02Pr +returnMode + M4 Nx02PartnerPart 新表
  PartnerPartService CRUD + 5 endpoints

L2 工作流升級層（既有 5 子模組升級）：
  po.service 3 接點升 + purchase-return.service returnMode 分流 + rfq.service +exportRfq
  qt.service 0 改 + rr.service 0 改（NX03 Phase 4/5 已升）

L3 新建 service 層：
  PurchaseSuggestionService（混合範式 + 客訂優先）
  PriceComparisonService（3 維度比價 + PartnerPart meta）
  PurchaseStageService（6 階段流轉 strict 推進 + 任意回退）

L4 跨模組接點 + role_view：
  NX02 → NX03 ledger source=P/G/R + partVersionId 完整
  NX02 → NX05 4 helper（createAp / syncAp / createAllowance + 既有 createAr）
  qt.controller @Roles +SALES（Crown Q-C4=A 業務歸 NX04）
  verify 報告：docs/nx02/spec/impl/nx02-impl-01-phase5-verify.md
```

---

# § 5. 跨模組接點

## 5.1 上游接點（→ NX02 讀取）

| 上游 | 提供 | NX02 用途 |
|---|---|---|
| AR 自動補貨 | Demand demandType=S | 採購建議單來源 |
| NX04 SO | Demand demandType=O | 客訂優先建議單 |
| NX01 part / part_brand | 料件主檔 | RFQ / Po 選料、partBrand 維度 |
| NX01 partner (partner_type=S) | 供應商主檔 | PO/RFQ/RR/PR.supplierId |
| Nx02PartnerPart 主檔 | 廠商-料件關係 | PurchaseSuggestion 混合範式 |

## 5.2 下游接點（NX02 →）

| 下游 | 接收 | NX02 提供 |
|---|---|---|
| NX03 stock_balance + ledger | source=P/G 入庫、source=R 退貨 | Rr POSTED / Pr POSTED F/P |
| NX05 ApLedger | sourceType='PO' AP | Po confirmed → createApFromConfirmedPo |
| NX05 Allowance | allowanceType='P' 進貨折讓 | Pr POSTED returnMode=A → createAllowanceFromPurchaseReturn |
| NX06 DN | 國外採購到貨配送 | RrImport 完整流（既有 schema）|
| NX08 PurchaseCache | 採購快取 | 後續軌（Q-PP-4=b backlog）|

## 5.3 業務分工（非屬 NX02）

| 業務 | 歸屬 | NX02 角色 |
|---|---|---|
| 同行調貨（Qt / Ti） | NX04 SALES | schema 仍在 nx02、role_view +SALES（Crown Q-C4=A）|
| 驗收異常分派 | WAREHOUSE | NX02 schema 範圍、執行屬 WAREHOUSE |
| 應付帳款付款執行 | NX05 FINANCE | NX02 觸發建單、執行屬 NX05 |

---

# § 6. NEXORA 戰略特色

## 6.1 partner ↔ part 混合範式 ⭐⭐（已落地）

- **業界改革**：主檔 explicit 定義 + 歷史推算 fallback（與 SAP/Oracle Vendor Catalog 對標、但輕量化）
- M4 Nx02PartnerPart 主檔 + Phase 4 resolveSupplierPartIds 推算
- source S/M 雙來源（仿 AR BrandAllocationRule 範式、Crown Q-PP-1=C）
- 採購建議單按廠商過濾「該廠商可供應料件」業務需求落地

## 6.2 國外採購 6 階段追蹤 ⭐⭐（已落地）

- **業界改革**：中小 ERP 少見系統化、靠電話/email 也能落系統
- M2 Nx02Po +5 配套欄（purchaseStage SmallInt + 4 時間欄）
- Phase 4 PurchaseStageService strict 推進 + 任意回退（Crown Q-C3-detail=b 業務修錯）
- 報關行 email「已到港」→ 採購員手動標 stage=5

## 6.3 比價分析含新品/特價/量折 ⭐⭐（已落地）

- **業界改革**：資深採購工具、中小 ERP 第一個整合進主流程
- Phase 4 PriceComparisonService 3 維度（D1 歷史均價 + D2 新品/特價 + D3 量折分桶 1-99/100-499/500+）
- PartnerPart meta 補充（採購員快速參考 defaultUnitCost）

## 6.4 退貨 3 種並存 ⭐（已落地）

- F=全退 / P=部分退（業界常態 default）/ A=折讓不退（廠商折讓現金）
- A 路徑寫 Nx05Allowance（業界折讓單獨立流）、貨保留原倉位
- Crown Q19=d 多種並存對齊業界真實場景

---

# § 7. 範圍 A closure 標準對齊（overview §8.2）

| 標準 | 狀態 |
|---|---|
| 12 業務功能 schema + service + endpoint 全落地 | ✅ Phase 5 verify §5 |
| 8 步 SOP 全 SOP 接通 | ✅ |
| 跨模組接點 NX03 / NX05 service 層全接通 | ✅ Phase 5 verify §3 |
| 國外 6 階段狀態流完整落地 | ✅ M2 + Phase 4 commit 4c |
| 比價分析 3 維度完整（歷史 + 新品特價 + 量折）| ✅ Phase 4 commit 4b |
| partner ↔ part 混合範式（主檔層 + fallback）| ✅ M4 + Phase 4 commit 4a |
| 採購工作台 UI | 🟡 stub（Phase 6 + Crown Q-U1=c UI 獨立軌）|

⭐ **6/7 closure 標準滿足、UI 1 項 stub 留 TASK-NX02-IMPL-UI-01**（對齊 AR Q-U1=A 範式）。

---

# § 8. backlog（A026 子項、對齊 overview §10 + plan §5.3）

| # | 項目 | 推薦處置 |
|---|---|---|
| 1 | 供應商評核（OTD / 良率 / 退貨率）| **範圍 B 戰略軌** |
| 2 | Nx08PurchaseCache 預計算優化 | Q-PP-4=b backlog、PriceComparisonService N+1 風險時啟動 |
| 3 | 採購 forecast / 預測單（年度框架合約）| PRO 級候選 |
| 4 | 採購預付款 / 訂金 | NX05 延伸 |
| 5 | 採購寄賣（VMI）/ 跨倉採購批次 | PRO 級候選 |
| 6 | stage_history 表（6 階段流轉歷史審計）| 本軌僅 audit log、後續可加 dedicated table |
| 7 | TASK-NX02-IMPL-02-TEST 獨立軌 | 對齊 NX03-IMPL-02-TEST 範式 |
| 8 | TASK-NX02-IMPL-UI-01 UI 獨立軌 | 5 placeholder functional 化 |
| 9 | TASK-NX02-DEMO-CLEANUP | 清 features/nx02/ 9 個 OLD 庫存殘留 + dashboard/nx02/ 13 個 OLD page |
| 10 | NX05Allowance 工作流（DRAFT→PROCESSED）| 本軌僅建單、流轉留 NX05 |

---

# § 9. 開工進度時間軸（17 commit）

| 階段 | commit 範圍 | 主軸 |
|---|---|---|
| Phase 0 | 2 commit | overview 落地 + plan v0.1.1（拍板更新）|
| Phase 1 | 4 commit | M1 國內付款 / M2 國外 6 階段 / M3 退貨類型 / M4 PartnerPart 新表 |
| Phase 2 | 1 commit | L1 PartnerPartService CRUD + 5 endpoints |
| Phase 3 | 3 commit | L2 既有 5 子模組升級（po +付款條件 / pr +returnMode 分流 / rfq +exportRfq）|
| Phase 4 | 3 commit | L3 新 3 service（PurchaseSuggestion / PriceComparison / PurchaseStage）|
| Phase 5 | 2 commit | L4 NX05 Allowance bridge + role_view + verify report |
| Phase 6 | 1 commit | UI 5 stub placeholder（Q-U1=c、UI 獨立軌 backlog）|
| Phase 7 | 1~3 commit | summary + worklog + audit-01 §5.3 加註（本 commit 系列）|

**總計：17~19 commit / 4 migration / 命中 plan §4 估 14~17 略上界**

---

> 完整業務需求：`docs/nx02/spec/intent/nx02-overview.md` v0.1.0
> Phase 0 plan：`docs/nx02/spec/impl/nx02-impl-01-plan.md` v0.1.1
> Phase 5 verify：`docs/nx02/spec/impl/nx02-impl-01-phase5-verify.md`
> NX02-AUDIT-01：`docs/nx02/nx02-audit-01.md`
> NX02-AUDIT-02：`docs/nx02/nx02-audit-02.md`
