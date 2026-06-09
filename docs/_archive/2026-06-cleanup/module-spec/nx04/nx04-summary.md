<!-- docs/nx04/nx04-summary.md -->

# NX04 銷貨管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-18
> 撰寫：Hank（整合 TASK-NX04-IMPL-01 14 commit + AUDIT-01 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx04/spec/intent/nx04-overview.md` v0.1.0
> 戰略定位：NEXORA 業務模組第四軌（接 NX02 採購 / NX03 庫存 / AR 自動補貨）

---

# § 1. NX04 模組業務角色

## 1.1 模組定位

NX04 = **NEXORA 銷貨管理層**、銷售部門工作台、業務鏈起點。

```
上游：客戶詢價（電話 / line / 業務員開單）
        ↓
NX04 銷貨完整鏈：庫存查詢 → 報價/直接 SO → CONFIRMED 自動調撥 → 撿包出貨 → 應收
        ↓ 沒貨補貨路徑
        同行調貨（D3+D4 翻譯 → NX02 Rfq/Ti、SALES role 已開）
        客訂預約（Co、translator 自動建）
        自倉調撥（NX03 ST、autoCreateTransferFromSo 新建）
        ↓
下游：NX03 庫存（source=S/R）、NX05 應收/折讓、NX06 物流配送
```

**戰略意義**：
- ⭐⭐⭐ 業界改革候選：客戶授信擋單（4 機制 + 逾期 15 天自動轉現金）
- ⭐⭐⭐ 業界改革候選：客戶預設據點 + 自動調撥（最近倉 warehouse.sortNo asc）
- ⭐⭐⭐ 業界改革候選：客訂預估價系統算（歷史成本 × 客戶等級毛利）
- ⭐⭐ 業界改革候選：配送中部分鎖（量/地址鎖、備註可改）
- ⭐⭐ 業界改革候選：銷退 3 種並存（R 退錢 / D 折讓 / X 換新）

## 1.2 9 業務功能（範圍 A、對齊 overview §12.1）

1. 報價單（Quote + 等級定價 + minPrice 警示）
2. 銷貨單（SO 6 階流 + 雙段狀態 + 部分鎖）
3. 銷退單（SR 5 階流 + 3 種退法）
4. 客訂預約（Co + 預估價系統算）
5. 同行調貨翻譯（D3+D4、已 demo 8 spec）
6. 客戶授信擋單（含逾期自動轉現金）
7. 銷售業績追蹤（LITE/PLUS 毛利顯示）
8. 報價簽核純記錄（多業務員共享）
9. 銷退退款處理（NX05 Allowance bridge）

---

# § 2. Schema 真相

## 2.1 2 migration（A041 精確）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260518100000_nx04_impl_01_m1_partner_default_warehouse_id` | Nx01Partner +defaultWarehouseId FK（NX01 升版）|
| M2 | `20260518110000_nx04_impl_01_m2_tenant_credit_overdue_days_threshold` | Nx99Tenant +creditOverdueDaysThreshold default 15 |

DB：60 migrations applied、Database schema is up to date ✓

## 2.2 既有 7 model 完整（A041、audit-01）

| # | Model | Line | Table | 業務語意 |
|---|---|---|---|---|
| 1 | `Nx04Co`        | 3462 | nx04_co        | 客訂預約單 |
| 2 | `Nx04Quote`     | 3512 | nx04_quote     | 報價單表頭 |
| 3 | `Nx04QuoteItem` | 3575 | nx04_quote_item | 報價明細 |
| 4 | `Nx04So`        | 3627 | nx04_so        | 銷貨單表頭 |
| 5 | `Nx04SoItem`    | 3702 | nx04_so_item   | 銷貨明細（雙段狀態）|
| 6 | `Nx04Sr`        | 3785 | nx04_sr        | 銷退單表頭 |
| 7 | `Nx04SrItem`    | 3846 | nx04_sr_item   | 銷退明細 |

⭐ **NX04 schema 衝擊小**（既有 7 model 設計成熟、純加欄補配套）。

## 2.3 schema 升級 2

| 表 | 欄 | 業務 |
|---|---|---|
| Nx01Partner | `defaultWarehouseId` VarChar(15)? FK SET NULL | 客戶預設取貨據點（SO 建單自動帶入）|
| Nx99Tenant | `creditOverdueDaysThreshold` Int default 15 | 系統參數：逾期天數閾值（CreditGuardService 讀取）|

---

# § 3. Service 真相

## 3.1 既有 service 升級 3（Phase 3）

| service | 升級點 | commit |
|---|---|---|
| `so.service` | 4 接點：客戶預設據點 fallback + 授信擋單呼叫 + 配送中部分鎖（patchItem SHIPPED guard）+ 自動調撥（Phase 4b wire）| 3a + 4b |
| `quote.service` | 共享列表（tenant-wide、search 擴 4 欄 customer/items）+ 純記錄不簽核 | 3b |
| `sales-return.service` | returnAction R/D/X 分流（R/D 走 ledger + Allowance、X skip）| 3c + 4a |

translator 0 改 ✓（既有 Phase 0 D3+D4 8 spec 完整）

## 3.2 新增 service 3（Phase 2）

| service | 角色 | 主 method |
|---|---|---|
| `CreditGuardService` | 客戶授信 4 機制 guard | check（黑名單→額度→逾期→付款條件）|
| `SalesPerformanceService` | LITE/PLUS 業績查詢 | getStats（毛利 + 手動目標對比）|
| `CoEstimateService` | 客訂預估價系統算 | estimate（歷史成本 × 等級毛利 + 3 種 basis）|

## 3.3 跨模組 inline helper 2（Phase 4）

| helper | 路徑 | 用途 |
|---|---|---|
| `createAllowanceFromSalesReturn` | `shared/nx05/nx05-create-allowance-from-sr.ts` | SR returnAction R/D 寫 Nx05Allowance allowanceType='S'（仿 NX02 範式）|
| `autoCreateTransferFromSo` | `shared/nx03/nx03-auto-transfer-from-so.ts` | SO DRAFT→CONFIRMED 缺貨自動建 ST（最近倉 warehouse.sortNo asc）|

## 3.4 endpoints（A041 = 3 新）

| Method | Path | 功能 |
|---|---|---|
| POST | `/nx04/credit-guard/check` | 4 機制 guard 授信預檢 |
| GET | `/nx04/sales-performance/stats` | LITE/PLUS 業績查詢 |
| POST | `/nx04/co-estimate/estimate` | 客訂預估價系統算 |

既有 4 controllers + 3 new controllers = 7 controllers / 29 endpoints（既有 26 + 3 new）。

## 3.5 銷售 8 步 SOP 流程

```
Step 1：庫存查詢（NX03 stock_balance read）

Step 2：報價單（可跳過）
   POST /nx04/quote → 純記錄、多業務員共享

Step 3：銷貨單建立
   POST /nx04/so { customerId, warehouseId? fallback to customer.defaultWarehouseId, items }
   → CreditGuardService 4 機制 check（黑名單擋 / 額度擋 / 逾期轉現金 / 付款條件帶入）
   → 建 SO DRAFT

Step 4：CONFIRMED transit（自動調撥）
   PATCH /nx04/so/:id { status: 'CONFIRMED' }
   → autoCreateTransferFromSo scan SoItems → 缺貨建 NX03 ST（最近倉 sortNo asc、冪等）
   → SoItem 更新 stId / transferStatus='I' / transferSourceType='T'

Step 5：PICKING（NX03 撿包 SOP）

Step 6：SHIPPED transit
   PATCH /nx04/so/:id { status: 'SHIPPED' }
   → applySoShipping → applyQtyOutWithLedger source=S
   → 配送中部分鎖：patchItem SHIPPED 階段 ForbiddenException（量/地址/locationId 鎖）

Step 7：INVOICED transit
   → createArFromShippedSo（NX05 AR）
   → createDeliveryDnFromShippedSo（NX06 DN、deliveryType='D' 配送）

Step 8：必要時 SR 銷退
   POST /nx04/sales-return { soId, returnAction: 'R'/'D'/'X', items }
   PATCH /nx04/sales-return/:id { status: 'POSTED' }
   → R/D → applySrPosting（source=R）+ createAllowanceFromSalesReturn（NX05 Allowance type='S'）
   → X → skip ledger（業務員手動建新 SO 換新）
```

---

# § 4. 拓樸 4 層（plan §2 對齊 NX02/NX03/AR 範式）

```
L1 基礎層（schema + 主檔）：
  M1 Nx01Partner +defaultWarehouseId + M2 Nx99Tenant +creditOverdueDaysThreshold

L2 新建戰略 service 層：
  CreditGuardService（4 機制 guard）
  SalesPerformanceService（LITE/PLUS 業績）
  CoEstimateService（客訂預估價）

L3 既有 service 升級層：
  so.service 4 接點 + autoTransfer wire
  quote.service 共享列表
  sales-return.service returnAction R/D/X 分流

L4 跨模組接點 helper：
  nx05-create-allowance-from-sr inline helper
  nx03-auto-transfer-from-so inline helper
  跨模組接點 verify 報告（docs/nx04/spec/impl/nx04-impl-01-phase5-verify.md）
```

---

# § 5. 跨模組接點

## 5.1 上游接點（→ NX04 讀取）

| 上游 | 提供 | NX04 用途 |
|---|---|---|
| NX01 partner | 客戶主檔 + defaultWarehouseId（M1）+ creditLimit/creditStatus | Quote/SO/SR + 授信 |
| NX01 customer_grade | 客戶等級 + marginPct | Quote 等級定價、CoEstimate 算 |
| NX01 part | 料件主檔 + priceA~D fallback | CoEstimate basis |
| NX02 partner_part | 廠商↔料件主檔 | 同行調貨來源（藉 NX02 Qt/Ti）|
| NX02 PoItem | 歷史採購成本 90 天 | CoEstimate 歷史成本均價 |
| NX03 stock_balance | 即時庫存 + 預留量 | 自動調撥判斷 |
| NX05 ArLedger | 未付 AR + overdueDays | CreditGuard 額度 + 逾期 |
| NX99 Tenant | creditOverdueDaysThreshold（M2）| CreditGuard 逾期閾值 |

## 5.2 下游接點（NX04 →）

| 下游 | 接收 | NX04 觸發 |
|---|---|---|
| NX03 庫存 | source=S 出庫 / source=R 入庫 | SO SHIPPED / SR POSTED R/D |
| NX03 ST 調撥 | 自動建 ST DRAFT（stType='A' / triggerSource='S' / refSoId） | SO DRAFT→CONFIRMED transit |
| NX03 撿包 SOP | Pk/Pl/Parcel | SO CONFIRMED 後 NX03 接管 |
| NX02 採購 | Rfq stub（D4 翻譯）+ Ti（D3 同行調貨）+ Co（客訂預約） | translator 自動建 |
| NX05 AR | ArLedger sourceType='SO' | SO SHIPPED |
| NX05 Allowance | allowanceType='S'（銷貨折讓）| SR POSTED R/D |
| NX06 DN | 送貨單（deliveryType='D' 配送）| SO SHIPPED |

## 5.3 業務分工（非屬 NX04）

對齊 NX02-IMPL-01 + Crown 拍板：
- **同行調貨 schema 屬 NX02**、業務操作屬 NX04（SALES role 已開）
- **應收入帳屬 NX05**（NX04 通知、NX05 入帳）
- **物流配送屬 NX06**（NX04 觸發、NX06 執行）
- **ST 調撥過帳屬 NX03**（NX04 觸發建 ST DRAFT、NX03 ST service 過帳）

---

# § 6. NEXORA 戰略特色

## 6.1 客戶授信擋單 4 機制 ⭐⭐⭐（已落地）

- **業界改革**：4 機制 + 逾期 15 天自動轉現金（業界半月 standard）
- M2 Nx99Tenant +creditOverdueDaysThreshold（用戶可調）
- CreditGuardService 4 機制執行順序（Crown Q-C4=A）：
  1. 黑名單（creditStatus='F' frozen → 直接擋 Forbidden）
  2. 額度超額（SUM 未付 AR + soAmount > creditLimit → 擋）
  3. 逾期 check（overdueDays > tenant 閾值 → 轉 'CASH'）
  4. 付款條件（純帶入 partner.paymentTermDomestic）
- 對齊 overview §4 + Crown Q3 + Q7

## 6.2 客戶預設據點 + 自動調撥 ⭐⭐⭐（已落地）

- **業界改革**：客戶預設取貨倉 + CONFIRMED 階段自動最近倉調撥
- M1 Nx01Partner +defaultWarehouseId FK SET NULL
- so.service create：fallback dto.warehouseId → customer.defaultWarehouseId
- autoCreateTransferFromSo helper：DRAFT→CONFIRMED transit 自動建 ST
- 最近倉算法：warehouse.sortNo asc（業務手動指定排序、後續軌可升地理距離）
- 冪等：SoItem.stId 已存在 / transferStatus='C' 已完成 skip
- 對齊 overview §7 + Crown Q-NX04-A=B + Q-C1=C 兩階段

## 6.3 客訂預估價系統算 ⭐⭐⭐（已落地）

- **業界改革**：業務員不憑經驗、系統算建議價（可手動覆寫）
- CoEstimateService 公式（overview §9.2）：
  ```
  estimatedPrice = max(
    歷史採購成本均價 × (1 + 客戶等級 marginPct/100),
    part 等級對應 priceA~D（fallback）
  )
  ```
- 3 種 basis 標記：historical_cost_plus_margin / part_grade_price / no_data_available
- 對齊 overview §9 + Crown Q-NX04-C=B

## 6.4 配送中部分鎖 ⭐⭐（已落地）

- **業界改革**：4 項鎖 + 備註可改、避免送貨員已出發只能取消重建
- patchItem SHIPPED 階段 guard：禁改 qty / unitPrice / locationId（ForbiddenException）
- update SHIPPED 階段 guard：禁改 deliveryType / deliveryAddress（既有）
- 允許 remark + 業務員改
- 對齊 overview §8 + Crown Q-C2=A

## 6.5 銷退退款 3 種並存 ⭐⭐（已落地）

- **業界改革**：R 退錢 / D 折讓 / X 換新 並存
- DTO +returnAction R/D/X（純 in-memory、A026 backlog 列 schema 持久化）
- service 入口分流：
  - R 退錢 → applySrPosting source=R + createAllowanceFromSr disposalMethod='R'
  - D 折讓 → 同上、disposalMethod='D' 下次折抵
  - X 換新 → skip ledger + skip Allowance（業務員手動建新 SO）
- 對齊 overview §10 + Crown Q10 + Q-C3=A + 仿 NX02 returnMode F/P/A 範式

---

# § 7. 範圍 A closure 標準對齊（overview §12.2）

| 標準 | 狀態 |
|---|---|
| 9 業務功能 schema + service + endpoint 全落地 | ✅ Phase 5 verify §7 |
| 銷售完整 SOP（庫存→報價→SO→撿包出貨）接通 | ✅ |
| 跨模組接點 NX03 / NX02 / NX05 / NX06 service 層全接通 | ✅ Phase 5 verify §2-5 |
| 客戶預設據點 + 自動調撥邏輯落地 | ✅ M1 + Phase 4b autoTransfer |
| 配送中部分鎖 application guard 完整 | ✅ Phase 3a |
| 客訂預估價算法落地 | ✅ Phase 2c CoEstimateService |
| 逾期 15 天自動轉現金（用戶可調參數）| ✅ M2 + Phase 2a CreditGuardService |
| 銷售工作台 UI | 🟡 stub（Phase 6 + Crown Q-U1=c UI 獨立軌）|

⭐ **7/8 closure 標準滿足、UI 1 項 stub 留 TASK-NX04-IMPL-UI-01**（對齊 NX02 / AR 範式）。

---

# § 8. backlog（A026 子項、對齊 overview §13/14 + plan §5.3 + Phase 5 verify §8）

| # | 項目 | 推薦處置 |
|---|---|---|
| 1 | PRO 完整 KPI 業績管理（儀表板 / 提成 / 主管分潤）| **範圍 B 戰略軌** |
| 2 | 報價低於 minPrice 業績倒扣 | 範圍 B |
| 3 | 客戶分級補貨策略（VIP / A / B / C）| 後續軌 |
| 4 | 銷售前後場景管理（業務員手機現場）| PRO 候選 |
| 5 | 業績目標持久化（本軌 LITE/PLUS 純 in-memory）| 後續軌 |
| 6 | SR returnAction schema 持久化（本軌純 dto）| **A026 backlog 標明** |
| 7 | 退換貨換新流程自動化（X 路徑業務員手動建新 SO）| 後續軌 |
| 8 | CoEstimate 業務員手動覆寫持久化 | UI 軌 |
| 9 | TASK-NX04-IMPL-02-TEST 獨立軌（補 Quote/SO/SR/Co 4 業務 0 spec）| 對齊 NX02 範式 |
| 10 | TASK-NX04-IMPL-UI-01 UI 獨立軌（3 placeholder functional 化）| Crown Q-U1=c 拍板 |
| 11 | TASK-NX04-DEMO-CLEANUP（清 features/sale + sales + nx03/sales 3 namespace 殘留）| 對齊 NX02 範式 |
| 12 | 自動調撥地理距離算法（本軌純 warehouse.sortNo asc）| 後續軌 |
| 13 | Nx04SoItem.itemStatus / Nx04So.sourceType @deprecated 清理 | Phase 0 D3 trigger 雙寫範式、本軌 0 touch |

---

# § 9. 開工進度時間軸（14 commit）

| 階段 | commit 範圍 | 主軸 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0 |
| Phase 1 | 2 | M1 partner +defaultWarehouseId / M2 tenant +creditOverdueDaysThreshold |
| Phase 2 | 3 | L1 新 3 service：CreditGuard / SalesPerformance / CoEstimate |
| Phase 3 | 3 | L2 既有升：so 4 接點 / quote 共享 / sr returnAction 分流 |
| Phase 4 | 2 | L4 helper：nx05-create-allowance-from-sr + nx03-auto-transfer-from-so |
| Phase 5 | 1 | 跨模組 verify 報告 |
| Phase 6 | 1 | UI 3 stub + menu.nx04.ts drift 修 |
| Phase 7 | 2~3 | summary + worklog 主題 + 可能 audit-01 加註 |

**總計：14~15 commit / 2 migration / 命中 plan §4 估 14~17（合理）**

---

> 完整業務需求：`docs/nx04/spec/intent/nx04-overview.md` v0.1.0
> Phase 0 plan：`docs/nx04/spec/impl/nx04-impl-01-plan.md` v0.1.0
> Phase 5 verify：`docs/nx04/spec/impl/nx04-impl-01-phase5-verify.md`
> NX04-AUDIT-01：`docs/nx04/nx04-audit-01.md`
