<!-- docs/nx02/spec/impl/nx02-impl-01-plan.md -->

# TASK-NX02-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、待 Alex/Crown review 拍板後才動 schema
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx02-purchase`（自 main HEAD `52af3e9` 切出）
> 對應依據：[nx02-overview v0.1.0](../intent/nx02-overview.md) + [nx02-audit-01](../../nx02-audit-01.md) + [nx02-audit-02](../../nx02-audit-02.md)
> 紀律：對齊 NX03-IMPL-01 / AR-IMPL-01 範式（§II.1.1 拓樸決策先送 review + §I.5 #22 schema verify + §I.6.5 A041 精確）

---

## §0 計畫文件性質

本檔是 NX02 採購重塑開工第一份產出、「**做什麼 + 什麼順序**」的決策稿、**不含實際 schema 改動**。

文件邊界：
- ✅ 列拓樸排序 4 層（對齊 NX03/AR L1~L4 範式）
- ✅ 列 migration 拆軌（含每軌範圍 + 風險）
- ✅ 列 commit 拆軌策略（每軌幾 commit、commit 標題範式）
- ✅ 列 review 拍板 Q
- ❌ 不寫 .prisma 任何一行
- ❌ 不跑 `prisma migrate dev`
- ❌ 不改任何既有 service / controller

**Hank 紀律承諾**：本計畫送 review 拍板前、**不動 schema、不跑 migrate、不 push**。

---

## §1 範圍 A 12 業務功能（對齊 overview §8.1）

| # | 業務功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | 採購需求單列表（按廠商過濾、客訂優先）| Nx02Demand ✓ | partner_part 中間表 ⭐ | 新 PurchaseSuggestionService | placeholder vendor/page.tsx 接 |
| 2 | 多家詢價 RFQ（email 範式）| Nx02Rfq + RfqItem ✓ | 0 | 既有 rfq.service 升級（PDF/text 產出）| placeholder product/page.tsx 接 |
| 3 | 比價分析（歷史 + 新品 + 特價 + 量折）| 0 | 0（純 service 計算）| 新 PriceComparisonService | placeholder product/page.tsx 接 |
| 4 | 採購單 + 主管審核（量/單價可改、不可換廠商）| Nx02Po.approvedAt/By ✓ | 0 | 既有 po.service 升 PATCH 改量單價 + guard 不可換廠商 | placeholder domestic/page.tsx 接 |
| 5 | 國內採購完整鏈（D 模式）| Nx02Po purchaseType=D ✓ | Nx02Po +paymentTermDomestic 欄 | 既有 po/rfq/rr 既有 | placeholder domestic/page.tsx |
| 6 | 國外採購 6 階段追蹤（I 模式 + RrImport）| Nx02Po purchaseType=I + vesselNo/eta ✓ + Nx02RrImport ✓ | Nx02Po +purchaseStage enum + 4 時間欄（requestedPaymentAt / paidAt / shippedAt / arrivedAt）| 新 PurchaseStageService（階段流轉）+ rr.service 升 | placeholder import/page.tsx |
| 7 | 掃貨採購（B 模式）| Nx02Po purchaseType=B ✓ | 0 | 既有 po.service（跳過 RFQ）| placeholder special/page.tsx |
| 8 | 進貨驗收 | Nx02Rr verifiedAt/By + approvedAt/By ✓ | 0 | 既有 rr.service ✓（Phase 4 commit 1 已升 G/P 分流 + partVersionId）| - |
| 9 | 退貨範式（全部退 / 部分退 / 折讓不退）| Nx02Pr + paymentStatus ✓ | Nx02Pr +returnMode enum（F=全退/P=部分退/A=折讓不退）| 既有 purchase-return.service 升 + Nx05 Allowance 接點 | - |
| 10 | 付款條件（國內補：淨 30 / 月結 / 預付 / 分期）| Nx01Partner.paymentTermDomestic default NET30 ✓ | Nx02Po +paymentTermDomestic 欄（從 partner 帶入）| 既有 po.service 升 | - |
| 11 | partner ↔ part 混合範式（主檔 + 歷史推算）| 0 | Nx02PartnerPart 新表（audit-02 path C）| 新 PartnerPartService（CRUD）+ PurchaseSuggestionService fallback 歷史 | placeholder vendor/page.tsx |
| 12 | NX05 應付帳款接點 | reverse FK 3 條 ✓（Po/Rr/Ti → ApLedger）| 0 | 新 PurchaseToApBridge（純事件呼叫、ApLedger 寫入交 NX05）| - |

---

## §2 拓樸排序 4 層（對齊 NX03/AR 範式）

### L1 — 基礎層（schema + 主檔 service）

- 升級 `Nx02Po`：加 `paymentTermDomestic` VARCHAR(10) NULL（國內付款條件、從 partner 帶入）
- 升級 `Nx02Po`：加 6 階段配套欄（`purchaseStage` SmallInt + 4 時間欄）
- 升級 `Nx02Pr`：加 `returnMode` VARCHAR(1) default 'P'（F 全退 / P 部分退 / A 折讓不退）
- 新建 `Nx02PartnerPart` 中間表（audit-02 path C、source S/M 雙來源範式仿 AR BrandAllocationRule）
- service：`PartnerPartService` CRUD（list / getById / create / update / softDelete）

### L2 — 工作流升級層（依賴 L1）

⭐ 既有 5 子模組升級（PO / RFQ / RR / PR / QT）：

- **po.service 升 3 接點**：
  1. 接 partner.paymentTermDomestic / paymentTermImport 自動帶入
  2. PATCH 主管審核改量/單價 + guard「不可換廠商」（service 層校驗 supplierId 不可變）
  3. 國外採購：建單時 purchaseStage 預設 1 備貨中
- **rfq.service 升 RFQ 文字/PDF 產出 endpoint**（email 範式、廠商不登入）
- **rr.service 0 改**（既有 Phase 4 已升 G/P 分流 + partVersionId）
- **purchase-return.service 升退貨類型分流**：returnMode=F/P 走既有 ledger 沖、returnMode=A 折讓走 Nx05Allowance bridge（不沖庫存）
- **qt.service 0 改**（既有 Phase 0 B5 6 spec 完整、業務歸 NX04 SALES role_view 調整純權限）

### L3 — 新建 service 層

⭐ **新建 3 service**：

- **PurchaseSuggestionService**（採購建議單列表核心）
  - input：tenantId、warehouseId?、supplierId?、demandTypeFilter?
  - logic：
    1. query Nx02Demand WHERE status='O' 待處理（客訂優先排序 demandType=O → S）
    2. 若 supplierId 過濾：query Nx02PartnerPart 主檔 → 找不到則 fallback Nx02PoItem 歷史推算
    3. 合併輸出 SuggestionRow[]（partId、demandType、qty、source=主檔/歷史、recommendedSupplier）
  - 對齊 overview §3.3 + Crown Q20「列表式仿撿貨單」
- **PriceComparisonService**（比價分析核心）
  - input：partId、tenantId
  - logic：
    1. query 歷史 PoItem.unitCost AVG / MIN / MAX（最近 90 天）
    2. query 廠商「新品 / 特價」（candidate 從 Qt.notes 業務手記 / PartnerPart.remark）
    3. 量大彈性折扣推算（PoItem 按 qty 切階分析）
  - 輸出 ComparisonResult（歷史均價 / 各廠商最近報價 / 量折建議）
  - 對齊 overview §3.4 + Crown Q12 拍板
- **PurchaseStageService**（國外 6 階段流轉）
  - input：poId、targetStage、actor、timestamp
  - logic：guard 階段順序（不可跳階）、寫 Nx02Po purchaseStage 欄、寫對應時間欄
  - 業界 muscle memory：報關行 email 通知「已到港」→ 採購員手動標 stage=5
  - 對齊 overview §3.7 + Crown Q14 揭露

### L4 — 跨模組接點 verify + role_view 調整

- **NX05 ApLedger 接點 verify**：
  - Po CONFIRMED → 通知 NX05 建 ApLedger
  - Rr POSTED → 通知 NX05 更新 ApLedger（實際金額）
  - Pr POSTED returnMode=A → 通知 NX05 沖帳（Allowance）
  - 對齊既有 reverse FK 3 條（line 1586 / 1980 / 2160）
- **NX03 庫存接點 verify**：
  - Rr POSTED → applyQtyInWithLedger source=P/G（已升 ✓）
  - Pr POSTED → applyQtyOutWithLedger source=R（Phase 5 commit 2 已升 ✓）
- **role_view 調整**：
  - PO / RFQ / RR / PR endpoint → PURCHASING role
  - QT / TI endpoint → SALES role（業務歸 NX04、Crown Q2 拍板）
- **採購建議單 endpoint**：POST /nx02/purchase-suggestion/list

### UI 層（最後一軌）

- 5 placeholder 對應拓樸：
  - `domestic/page.tsx` → 國內採購工作台（接 PO + RR + 建議單）
  - `import/page.tsx` → 國外採購工作台（接 PO + 6 階段 + RrImport）
  - `special/page.tsx` → 掃貨工作台（接 PO purchaseType=B 跳 RFQ）
  - `product/page.tsx` → 比價分析 + RFQ 詢價工作台
  - `vendor/page.tsx` → 供應商管理 + PartnerPart 維護工作台

---

## §3 Migration 拆軌策略（A041 精確 = **4 軌**）

### M1 — `nx02_po_payment_term_domestic`（國內付款條件補齊）

範圍：
- `nx02_po` ADD COLUMN `payment_term_domestic` VARCHAR(10) NULL（從 partner 主檔帶入、可手動覆寫）
- backfill：null 不填、新 row 建單時自動帶 partner.paymentTermDomestic

風險：低（純加欄、nullable、無破壞）
commit 數：1（schema + migration 同 commit）

### M2 — `nx02_po_purchase_stage_columns`（國外採購 6 階段配套）

範圍：
- `nx02_po` ADD COLUMN `purchase_stage` SMALLINT NULL（1~6、null=非國外採購）
  - 1=備貨中 / 2=要求付款 / 3=待出貨（已付款）/ 4=出貨上船 / 5=已到港 / 6=驗收完成
- `nx02_po` ADD COLUMN `requested_payment_at` TIMESTAMP(3) NULL（廠商要求付款時間）
- `nx02_po` ADD COLUMN `paid_at` TIMESTAMP(3) NULL（實際付款時間）
- `nx02_po` ADD COLUMN `shipped_at` TIMESTAMP(3) NULL（上船時間）
- `nx02_po` ADD COLUMN `arrived_at` TIMESTAMP(3) NULL（實際到港時間、相對既有 eta 預計）

風險：低（純加欄、全 nullable、purchase_stage 應用層 guard 而非 CHECK constraint）
commit 數：1

### M3 — `nx02_pr_return_mode`（退貨類型 enum 補齊）

範圍：
- `nx02_pr` ADD COLUMN `return_mode` VARCHAR(1) NOT NULL DEFAULT 'P'（F=全退 / P=部分退 / A=折讓不退）
- backfill：既有 row default 'P'（業界常態、影響面小）

風險：低（純加欄、有 default、無破壞）
commit 數：1

### M4 — `nx02_partner_part_create`（partner ↔ part 中間表）

範圍：
- 新建 `Nx02PartnerPart` 主檔（audit-02 path C 詳列）
- 欄位（精確）：
  - `id` VARCHAR(15) PK（gen_nx02_partner_part_id() 生成器）
  - `tenantId` VARCHAR(15) NOT NULL
  - `partnerId` VARCHAR(15) NOT NULL（FK Nx01Partner、application 層 guard partner_type='S'）
  - `partId` VARCHAR(15) NOT NULL（FK Nx01Part）
  - `isPrimary` BOOLEAN default false（主要供應商標記）
  - `supplierPartNo` VARCHAR(50) NULL（廠商料號、Q-PP-3=b 選填）
  - `defaultUnitCost` DECIMAL(14,4) NULL
  - `defaultLeadDays` INT NULL
  - `moq` DECIMAL(14,4) NULL（最小訂購量）
  - `source` VARCHAR(1) default 'S'（S=system / M=manual、仿 AR BrandAllocationRule 範式）
  - `validFrom` DATE NULL（生效起期）
  - `validTo` DATE NULL（結束期、null=現役）
  - `isActive` BOOLEAN default true
  - `remark` VARCHAR(200) NULL
  - audit 7 標準欄（createdAt/By + updatedAt/By）
- unique `[tenantId, partnerId, partId, validFrom]`（同廠商同料件同生效期唯一、支援歷史版本）
- index `[tenantId, partnerId]` + `[tenantId, partId]` + `[tenantId, isPrimary]`
- FK：tenant / partner（ON DELETE RESTRICT）/ part（ON DELETE RESTRICT）
- reverse @relation：Nx99Tenant / Nx01Partner / Nx01Part

風險：低（純新表、無破壞、無 backfill）
commit 數：1

### Migration 軌總計

- 本期 IMPL-01 跑：**M1 + M2 + M3 + M4 = 4 軌、4 migration、4 commit**

---

## §4 commit 拆軌策略（A041 估計）

| 階段 | commit 數 | 範圍 |
|---|---|---|
| Phase 0 — 計畫 review | 1 | plan 文件（本 commit）|
| Phase 1 — schema migration | 4 | M1 国内付款 / M2 國外 6 階段 / M3 退貨類型 / M4 partner_part 新表 |
| Phase 2 — L1 主檔 service | 1 | PartnerPartService CRUD（list/getById/create/update/softDelete + endpoint）|
| Phase 3 — L2 既有 service 升級 | 2~3 | (1) po.service 升 3 接點（paymentTerm 帶入 + 主管審核 + 6 階段預設）（2) purchase-return.service 升 returnMode 分流（3) rfq.service 升 PDF/text endpoint |
| Phase 4 — L3 新 service | 3 | (1) PurchaseSuggestionService（採購建議單、含 partner_part fallback）（2) PriceComparisonService（比價分析）（3) PurchaseStageService（國外 6 階段流轉）|
| Phase 5 — L4 跨模組 verify + role_view | 2 | (1) NX05 ApLedger 接點 verify + bridge service（2) NX03 verify + role_view 調整（QT/TI → SALES）|
| Phase 6 — UI 層（5 placeholder 承接）| 2~3 | (1) domestic + import + special（採購工作台 3 視角）（2) product（比價 + RFQ）（3) vendor（partner_part 維護）|
| Phase 7 — 收尾 | 1~2 | nx02-summary 新建 + worklog 主題 + Phase 5 verify report |

**總計估計：16~20 commit / 4 migration / 5~8 工作日**（介於 NX03 21~25 與 AR 10~12 之間、合理）

---

## §5 紀律對齊承諾（必履行）

### 5.1 對齊 NX03 / AR 範式

- Q-impl=B Phase 完成 stop（不逐 commit、不全階段一氣呵成）
- 遇 schema/業務語意衝突立即 stop 回報
- migration SQL 寫好先 stop review、Crown 拍板後 Hank 自跑（memory NX03 範式）
- tsc 0 error 每 commit 基準
- A041 精確 count、不模糊
- §G.9 通配 grep、不單檔 ls

### 5.2 schema vs 業務語意衝突處置

對齊 nx02-overview §0：
- 遇衝突立即 stop、寫 stop 報告
- 不擅自推進、等 Alex/Crown 拍板

### 5.3 不擅自處理範圍外

- 同行調貨業務歸 NX04（Qt/Ti schema 0 touch、純 role_view 調整）
- 供應商評核 = 範圍 B 戰略軌、本軌 0 touch
- Nx08PurchaseCache 預計算 = Q-PP-4=b backlog、本軌 0 touch
- 採購 forecast / 預付款 / 寄賣 / 跨倉 = PRO 級 backlog、本軌 0 touch
- audit-01 揭露 features/nx02/ 9 個 OLD 庫存殘留 = 跟主軌脫鉤、本軌 0 touch（獨立軌 TASK-NX02-DEMO-CLEANUP）

### 5.4 §G.9 / §G.4 / #22 對齊

- §G.9 通配 grep：每次新表 / 新 service 前 `find -iname` 揭露既有資源
- §G.4 範式歷史 fact 保留：既有 spec 「Phase 0 B5 / WP-MINI」等字眼 0 改動
- §I.5 #22：每次引用「NX02-AUDIT-0X」必先 grep verify

---

## §6 拍板 Q（送 Alex/Crown review）

### Q-T1 拓樸排序 4 層分層認可？

A. ✅ 認可（L1 schema+主檔 → L2 既有 service 升級 → L3 新 3 service → L4 跨模組+UI）
B. ⚠️ 重排（Crown 補建議）

### Q-M1 4 軌 migration 拆軌認可？

A. ✅ 認可（M1 國內付款 / M2 國外 6 階段 / M3 退貨類型 / M4 partner_part 新表）
B. ⚠️ 合併（如 M1+M2 合為「Po 升級包」、M3+M4 合為「退貨+主檔」）
C. ⚠️ 拆細

Hank 推薦 **A**：4 軌獨立、每軌業務範圍清楚、出問題易回滾。

### Q-S1 國外 6 階段 purchaseStage 欄資料型別？

A. **SmallInt 1~6**（Hank 推薦、與 NX01-17 SmallInt enum 範式對齊）
B. VARCHAR(1) enum '1'~'6'（既有 Pr/Ti 風格）
C. VARCHAR(20) token 'PREPARING/REQUESTING_PAYMENT/PAID/SHIPPED/ARRIVED/INSPECTED'（最人類可讀）

Hank 推薦 **A** 對齊 NX01-17 範式（partType/relationType 已升 SmallInt）。

### Q-S2 退貨類型 returnMode 欄資料型別 + 預設值？

A. **VARCHAR(1) default 'P' 部分退**（Hank 推薦、業界常態）
B. VARCHAR(1) default 'F' 全退（保守、強制業務指定）
C. SmallInt 1=全退/2=部分退/3=折讓不退

Hank 推薦 **A** 對齊既有 Pr/Po/Qt 1-char enum 風格、default 'P' 業界使用率最高。

### Q-S3 PartnerPart 主檔 unique 範圍？

A. **`[tenantId, partnerId, partId, validFrom]`**（Hank 推薦、支援歷史版本、仿 AR BrandAllocationRule）
B. `[tenantId, partnerId, partId]`（一張、不支援歷史）
C. `[tenantId, partnerId, partId, isPrimary]`（同對僅一筆 primary、其它可多筆 secondary）

Hank 推薦 **A** 與 AR `[tenantId, modelId, validFrom]` 範式完美對齊（M 軌升級 / 政策變動歷史保留）。

### Q-C1 採購建議單列表客訂優先實作策略？

A. **service 層 ORDER BY demandType DESC 純標記**（Hank 推薦、demandType='O' 排前、'S' 排後）
B. UI 層高亮（service 不排序、UI 視覺區分）
C. 兩者並用（service 排序 + UI 高亮）

Hank 推薦 **C** 兩者並用、對齊 Crown Q11+Q17 拍板「客訂優先純標記」、純標記不擋業務手動排序。

### Q-C2 PriceComparisonService 比價 3 維度落地深度？

A. **全 3 維**（歷史 + 新品/特價 + 量折、Hank 推薦）
B. 先 2 維（歷史 + 新品特價、量折下軌）
C. 先 1 維（純歷史均價、最簡）

Hank 推薦 **A** 對齊 overview §3.4 + Crown Q12「業界改革候選 ⭐⭐」、本軌全落地避免重塑。

### Q-C3 國外 6 階段 stage 流轉策略？

A. **strict 順序**（不可跳階、guard 1→2→3→4→5→6、Hank 推薦）
B. flexible（允許跳階、業務手動標）
C. 部分 strict（前段 strict、後段 flexible：1→2→3 嚴格、4/5/6 可跳）

Hank 推薦 **A** strict 順序 + 例外允許「stage 回退」（業務修錯）、業界 muscle memory 不會跳階。

### Q-C4 同行調貨 role_view 調整範圍？

A. **QT 5 endpoint + TI 相關全 SALES role**（Hank 推薦、業務歸 NX04）
B. 純 QT endpoint 移 SALES、TI 留 PURCHASING（保守）
C. 全留 PURCHASING、role 不調整（過渡）

Hank 推薦 **A** 對齊 Crown Q2 揭露 + overview §2.1「同行調貨歸銷售」。

### Q-U1 UI 拓樸範圍

A. **本軌 5 placeholder 全 functional**（Hank 推薦、Phase 6 落地）
B. 本軌 3 個 functional + 2 個 placeholder（vendor + product 較複雜延後）
C. 本軌全 placeholder、UI 留獨立軌（對齊 AR Q-U1=A）

Hank 推薦 **B** 折衷：domestic / import / special 3 個採購工作台 functional（核心 SOP）、product 比價 + vendor 主檔 留 stub（後續軌）。

⭐ **B 推薦原因**：5 個 functional 估 commit 數溢出、影響本軌 closure 時程。對齊 AR Q-U1=A 保守策略。

### Q-X1 NX02-AUDIT-01 §5.3 partner 維度錯誤修正時機？

A. **本軌 Phase 7 收尾一併修**（順手、Hank 推薦）
B. 獨立 commit 早修（Phase 0 後）
C. 留 audit-02 揭露備案、audit-01 不回改（既存事實留檔）

Hank 推薦 **C** 對齊 audit-02 §3.5 已揭露策略（歷史 fact 保留、修正記錄在 audit-02）、本軌 0 touch。

---

## §7 風險與停下點

### 7.1 主要風險

1. **partner_part 主檔 vs 歷史推算雙來源一致性**：
   - 風險：主檔定義「A 廠商供應 X」但歷史 0 紀錄、PurchaseSuggestionService 如何呈現
   - 對策：source S=系統建議（從歷史）、M=手動建主檔、UI 顯示 source 標記
2. **國外 6 階段 strict 流轉的業務例外**：
   - 風險：業務修錯需「stage 回退」、guard 是否允許
   - 對策：allow rollback 但寫 stage_history（candidate 後續軌）、本軌 strict 簡化
3. **退貨 returnMode=A 折讓不沖庫存**：
   - 風險：既有 purchase-return.service 預設沖庫存、需 branch 邏輯避免重複扣
   - 對策：service 入口 returnMode 分流、A 路徑不呼叫 applyQtyOutWithLedger
4. **role_view 調整影響面**：
   - 風險：QT/TI 既有 6 test spec 跑 SALES role 可能掉測
   - 對策：Phase 5 commit 2 同步升 test fixture + role guard
5. **PriceComparisonService N+1 query**：
   - 風險：每料件 query 所有歷史 PoItem + Qt + PartnerPart 嚴重 slow
   - 對策：按 partId 切批 + index、後續 Nx08PurchaseCache 預計算（Q-PP-4=b backlog）

### 7.2 預設停下點

依紀律承諾、以下情境必停下回報：
- 任一 migration 跑前、先 stop 給 Alex/Crown review schema diff
- 任一新表設計、先 stop 列 schema diff + 業務語意對應
- 任何 schema 跟業務語意衝突、立即 stop
- Crown Q-X 拍板含模糊區、Hank 不擅自解、stop 列細項拍板
- Phase 完成、stop（Q-impl=B、不逐 commit）

---

## §8 下次接續工作建議

待 Alex/Crown review §6 拍板 Q 後：

1. **如全部 ✅ 認可** → 進 Phase 1 M1（國內付款條件補齊 migration）
2. **如有 ⚠️ 重排** → 修正本計畫 v0.2.0、再次送 review
3. **如新增情境揭露** → 評估是否影響 12 業務功能拓樸、必要時加 audit-03

---

## 後記

- 真實 main HEAD：`52af3e9`（NX02-AUDIT-02 後、本檔 commit 前）
- 真實 branch HEAD：`feature/nx02-purchase`（從 main 切出、無新 commit、無 push）
- 本檔位置：`docs/nx02/spec/impl/nx02-impl-01-plan.md`
- 本檔 commit 後送 review、拍板前 Hank 不動 schema、不跑 migrate、不 push

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx02-overview v0.1.0](../intent/nx02-overview.md) · [nx02-audit-01](../../nx02-audit-01.md) · [nx02-audit-02](../../nx02-audit-02.md) · [nx03-impl-01-plan](../../../nx03/spec/impl/nx03-impl-01-plan.md) · [ar-impl-01-plan](../../../auto-replenish/spec/impl/ar-impl-01-plan.md)
