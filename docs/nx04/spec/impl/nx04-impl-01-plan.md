<!-- docs/nx04/spec/impl/nx04-impl-01-plan.md -->

# TASK-NX04-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、待 Alex review + Crown 拍板拍板 Q 後才動 schema
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx04-sales`（自 main HEAD `6e72258` 切出、tag v0.5.0-nx02-closure 後）
> 對應依據：[nx04-overview v0.1.0](../intent/nx04-overview.md) + [nx04-audit-01](../../nx04-audit-01.md)
> 紀律：對齊 NX02/NX03/AR-IMPL-01 範式 + Q-RHYTHM-1=d 新節奏（service phase Alex 守門）

---

## §0 計畫文件性質

本檔是 NX04 銷貨重塑開工第一份產出、「**做什麼 + 什麼順序**」的決策稿、**不含實際 schema 改動**。

文件邊界：
- ✅ 列拓樸排序 4 層（對齊 NX02/NX03/AR L1~L4 範式）
- ✅ 列 migration 拆軌（含每軌範圍 + 風險）
- ✅ 列 commit 拆軌策略
- ✅ 列 review 拍板 Q（schema 題 → Crown、service 題 → Alex）
- ❌ 不寫 .prisma 任何一行
- ❌ 不跑 `prisma migrate dev`
- ❌ 不改任何既有 service / controller

**Hank 紀律承諾**：本計畫送 review 拍板前、**不動 schema、不跑 migrate、不 push**。

---

## §⭐ 新紀律啟用（Crown Q-RHYTHM-1=d）

從本軌起 service impl phase 紀律調整：

| 階段 | 紀律 |
|---|---|
| schema migration | Hank stop → **Crown** review → Crown 拍 A → Hank 自跑（不變）|
| service impl phase | Hank stop → **Alex** review → Alex 直接給 Hank 進下一 phase |
| 跨 phase 戰略題 | Alex stop 整合 → Crown 拍板 |
| Final merge verify | Hank stop → Alex review → Crown 拍板 merge |

⭐ Crown 不再每 phase 介入、節奏 Alex 接手守門。Hank 對 schema/業務語意衝突仍立即 stop（不分 Alex/Crown、Alex 判斷是否升 Crown）。

---

## §1 範圍 A 9 業務功能（對齊 overview §12.1）

| # | 功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | 報價單（Quote + 等級定價 + minPrice）| ✅ | 0 | quote.service 升 0 / 純標準化驗收 | 🟡 stub |
| 2 | 銷貨單（SO 6 階流 + 雙段狀態 + **部分鎖**）| ✅ | 0 | so.service 升 部分鎖 guard + 客戶預設據點帶入 + 自動調撥 + 授信擋單 | 🟡 stub |
| 3 | 銷退單（SR 5 階流 + **3 種退法**）| ✅ + returnType N/E ✓ | 0 | sales-return.service 升 returnAction 分流（換新 / 退錢 / 折讓）| — |
| 4 | 客訂預約（Co + **預估價系統算**）| ✅ | 0 | 新建 CoEstimateService（歷史成本 × 等級毛利）| — |
| 5 | 同行調貨翻譯（D3+D4 已 demo）| ✅ + 8 spec | 0 | translator 0 改 | — |
| 6 | **客戶授信擋單**（含逾期自動轉現金）| ✅ creditLimit/creditStatus | M2 系統參數欄 | 新建 CreditGuardService | — |
| 7 | **銷售業績追蹤**（LITE/PLUS 毛利顯示）| ✅ belowMinReason | 0 | 新建 SalesPerformanceService | 🟡 stub |
| 8 | **報價簽核純記錄**（多業務員共享）| ✅ Quote.status | 0 | quote.service 升 共享 list 過濾 | — |
| 9 | **銷退退款處理**（NX05 Allowance bridge）| ✅ + Nx05Allowance ✓ | 0 | 新建 inline helper `nx05-create-allowance-from-sr` 仿 NX02 | — |

---

## §2 拓樸排序 4 層（對齊 NX02/NX03/AR 範式）

### L1 — 基礎層（schema + 主檔 service）

- 升級 `Nx01Partner`：加 `defaultWarehouseId` FK（客戶預設據點、overview §7）
- 升級 `Nx99Tenant`：加 `creditOverdueDaysThreshold` Int default 15（系統參數、overview §4.2）
- service：partner.service 升 dto +defaultWarehouseId（CRUD 既有結構直接擴）

### L2 — 新建戰略 service 層

⭐ **新建 3 service**：

- **CreditGuardService**（客戶授信擋單核心）
  - input：tenantId / customerId / soAmount
  - 4 機制 guard：
    1. 額度超額 check（creditLimit vs 未付 AR + 本 SO）
    2. 黑名單 check（creditStatus='F' frozen）
    3. 逾期 check（既有 AR 超過 tenant.creditOverdueDaysThreshold）
    4. 付款條件 check（含預期未付自動轉現金邏輯）
  - 對齊 overview §4 + Crown Q7
- **SalesPerformanceService**（業績追蹤、LITE/PLUS）
  - input：userId / period（month/year）
  - logic：SUM SO totalAmount + 毛利計算（unitPrice - 歷史成本）+ 手動目標對比
  - 對齊 overview §5 + Crown Q8、PRO 完整 KPI 留範圍 B
- **CoEstimateService**（客訂預估價）
  - input：customerId / partId / qty
  - logic：歷史採購成本均價（近 90 天 PoItem）× (1 + 客戶等級毛利率)、max minPrice
  - 對齊 overview §9 + Crown Q-NX04-C=B

### L3 — 既有 service 升級層

⭐ **既有 4 子模組升級**：

- **so.service 升 5 接點**：
  1. 客戶預設據點帶入（建單時 fallback `customer.defaultWarehouseId`）
  2. 自動調撥（預設據點無庫存 → 建 ST 調撥單、overview §7.3）
  3. 配送中部分鎖（status=SHIPPED 時 application guard、overview §8）
  4. 授信擋單呼叫 CreditGuardService（建單前 4 機制 check）
  5. 客訂預估價呼叫 CoEstimateService（無庫存走客訂時帶入）
- **quote.service 升 共享列表**：
  - 多業務員共享 list（移除 createdBy 過濾、overview §6.1）
  - 純記錄、不簽核（business flow 0 改、純標準化）
- **sales-return.service 升 returnAction 分流**：
  - DTO +returnAction 欄（R 退錢 / D 折讓 / X 換新）
  - service 入口分流：R/D 走 NX05 Allowance bridge、X 走新 SO 連動
- **translator 0 改**（既有 D3+D4 已落地）

### L4 — 跨模組接點 helper + role_view + UI 接口

- **新建 inline helper** `nx05-create-allowance-from-sr.ts`（仿 NX02 Phase 5 範式、allowanceType='S'）
- **NX05 ApLedger / ArLedger 接點 verify**（既有 createArFromShippedSo / Nx05Allowance service 並存）
- **NX03 庫存接點 verify**（既有 source=S/R 寫入完整 ✓）
- **NX02 同行調貨 verify**（既有 NX02 Phase 5 commit 5b 已開 SALES role ✓）
- **NX06 物流 verify**（DN 接點觸發、實 service 待確認）

### UI stub 層（Phase 6）

- 3 placeholder（customer / domestic / export）升 desc + API hint
- 修 `menu.nx04.ts` 嚴重 drift（audit-01 §3.4、內容全 NX05、href 指 /dashboard/nx05/*）
- 對齊 NX02 Phase 6 範式（functional UI 留獨立軌 backlog）

---

## §3 Migration 拆軌策略（A041 精確 = **2 軌**）

### M1 — `nx01_partner_default_warehouse_id`（NX01 升版、客戶預設據點）

範圍：
- `nx01_partner` ADD COLUMN `default_warehouse_id` VARCHAR(15) NULL
- ADD FOREIGN KEY `nx01_partner_default_warehouse_id_fkey` REFERENCES `nx01_warehouse(id)` ON DELETE SET NULL ON UPDATE CASCADE
- ADD INDEX `[tenant_id, default_warehouse_id]`（optional、看 query 頻率決定）

風險：低（純加欄、nullable、SET NULL on delete 不阻擋 warehouse 主檔刪除）
commit 數：1（schema + migration 同 commit）

⚠️ **NX01 升版**：本軌動 NX01 主檔、需在 Nx01Partner reverse @relation 補對應 `rev_Nx01Warehouse_defaultPartnerId`、不破壞既有業務（partner.service CRUD 既有 dto 擴）。

### M2 — `nx99_tenant_credit_overdue_days_threshold`（系統參數）

範圍：
- `nx99_tenant` ADD COLUMN `credit_overdue_days_threshold` INT NOT NULL DEFAULT 15
- 用 NOT NULL + default 15（業界半月 standard、Crown Q3 拍板）

風險：低（純加欄、有 default 自動套既有 row、無 backfill 需求）
commit 數：1

### Migration 軌總計

- 本期 IMPL-01 跑：**M1 + M2 = 2 軌、2 migration、2 commit**

⭐ **NX04 schema 衝擊小**（既有 7 model 設計成熟、純加欄補配套），介於 AR（2 軌）與 NX02（4 軌）之間。

---

## §4 commit 拆軌策略（A041 估計）

| 階段 | commit 數 | 範圍 | 守門 |
|---|---|---|---|
| Phase 0 | 1 | plan 文件（本 commit）| Crown 拍板 Q |
| Phase 1 | 2 | M1 partner +defaultWarehouseId / M2 tenant +creditOverdueDaysThreshold | **Crown** review SQL |
| Phase 2 | 3 | L2 新 3 service：CreditGuard / SalesPerformance / CoEstimate | **Alex** review |
| Phase 3 | 3~4 | L3 既有升：so.service 5 接點 / quote.service 共享 / sales-return returnAction 分流 / translator 0 改 | Alex review |
| Phase 4 | 1 | L4 inline helper `nx05-create-allowance-from-sr.ts` | Alex review |
| Phase 5 | 1 | 跨模組 verify report + role_view（多無新改、純 verify）| Alex review |
| Phase 6 | 1 | UI 3 stub placeholder 升 desc + menu.nx04.ts drift 修 | Alex review |
| Phase 7 | 2 | nx04-summary + worklog 主題 7 | Alex review |

**總計估計：14~15 commit / 2 migration / 4~6 工作日**（介於 AR 10~12 與 NX02 17~19 之間、合理）

---

## §5 紀律對齊承諾（必履行）

### 5.1 對齊 NX02/NX03/AR 範式

- Q-impl=B Phase 完成 stop（**送 Alex 不送 Crown**、Q-RHYTHM-1=d 拍板）
- 遇 schema/業務語意衝突立即 stop 回報（Alex 判斷是否升 Crown）
- migration SQL 寫好先 stop **Crown** review、拍板後 Hank 自跑（不變）
- tsc 0 error 每 commit 基準
- A041 精確 count、不模糊
- §G.9 通配 grep、不單檔 ls

### 5.2 schema vs 業務語意衝突處置

對齊 nx04-overview §0：
- 遇衝突立即 stop、寫 stop 報告
- 不擅自推進、等 Alex 整合
- 如屬戰略題、Alex 升 Crown

### 5.3 不擅自處理範圍外

- PRO 完整 KPI 業績管理系統 = 範圍 B 戰略軌、本軌 0 touch
- 客戶分級補貨策略 = 後續軌、本軌 0 touch
- 業績獎金 / 提成計算 = 範圍 B 或 NX08 延伸
- audit-01 揭露 4 個 drift / 殘留 = 本軌僅修 menu.nx04.ts（純文件、Phase 6 順手）、3 個 sales namespace 殘留留 TASK-NX04-DEMO-CLEANUP 獨立軌
- @deprecated `itemStatus` + `sourceType` 留 Phase 0 D3 trigger 雙寫範式、本軌 0 touch

### 5.4 §G.9 / §G.4 / #22 對齊

- §G.9 通配 grep：每次新表 / 新 service 前 `find -iname` 揭露既有資源
- §G.4 範式歷史 fact 保留：既有 spec 「Phase 0 D3/D4」等字眼 0 改動
- §I.5 #22：每次引用「NX04-AUDIT-0X」必先 grep verify

---

## §6 拍板 Q（送 Alex review、戰略題 Alex 升 Crown）

### Q-T1 拓樸排序 4 層分層認可？（→ Alex）

A. ✅ 認可（L1 schema+主檔 → L2 新 3 service → L3 既有 4 子模組升 → L4 跨模組 helper + role_view + UI）
B. ⚠️ 重排

### Q-M1 2 軌 migration 拆軌認可？（→ Crown）

A. ✅ 認可（M1 partner +defaultWarehouseId / M2 tenant +creditOverdueDaysThreshold）
B. ⚠️ 合併（如 M1+M2 合為「NX04 配套升級包」）
C. ⚠️ 拆細（如 M2 改用獨立 tenant_settings 表）

Hank 推薦 **A**：2 軌獨立、每軌業務範圍清楚。M2 直接加 Nx99Tenant 欄最簡（單一系統參數、不需獨立 settings 表）。

### Q-S1 客戶預設據點 FK on delete 行為？（→ Crown）

A. **SET NULL**（Hank 推薦、warehouse 主檔本不刪、刪除時客戶 fallback 系統選倉）
B. RESTRICT（嚴格、warehouse 不可刪除若有客戶引用）
C. CASCADE（warehouse 刪除自動清客戶設定、危險）

Hank 推薦 **A** 對齊 NX01 既有 partner 多個 FK 範式（如 customerGradeId 也是 SET NULL）。

### Q-S2 逾期天數閾值是否需細粒度（per customer vs per tenant）？（→ Crown 戰略）

A. **tenant 層級**（Hank 推薦、簡單、業界 standard）
B. per customer（每客戶獨立閾值、增加 partner schema +overdue_days_override 欄）
C. 混合（tenant default + per customer override、複雜）

Hank 推薦 **A** 本軌、B 留後續軌（PRO 候選）。

### Q-C1 自動調撥觸發策略？（→ Alex）

A. **SO CONFIRMED 時 application 偵測**（Hank 推薦、業務閘門明確）
B. SO 建單 DRAFT 即時偵測（業務員看到提示、可手動干預）
C. 兩階段（DRAFT 提示 + CONFIRMED 強制建 ST）

Hank 推薦 **C** 兩階段、業務 UX 友善 + 系統閘門守、對齊 overview §7.3 業務語意。

### Q-C2 配送中部分鎖 application guard 範圍？（→ Alex）

A. **量/地址/取貨方式/客戶 4 項鎖、備註+業務員可改**（Hank 推薦、對齊 overview §8.2）
B. 全鎖、只能取消重建（保守、無彈性）
C. 只鎖量、其他都可改

Hank 推薦 **A** 對齊 Crown Q-NX04-B=B 部分鎖拍板。

### Q-C3 銷退退款 3 種分流策略？（→ Alex）

A. **dto +returnAction R/D/X**（Hank 推薦、3 種顯式分流）
B. 用既有 returnType N/E + 業務手記推算（隱式、易混淆）
C. 拆 3 個 endpoint POST /sr/:id/refund-cash / refund-allowance / replace

Hank 推薦 **A** 對齊 NX02 returnMode F/P/A 範式（同 1-char enum、application 分流）。

### Q-C4 客戶授信擋單 4 機制執行順序？（→ Alex）

A. **黑名單 → 額度 → 逾期 → 付款條件**（Hank 推薦、依嚴重度排序）
B. 4 機制平行 check、全 fail 才擋
C. 用戶可調順序（複雜）

Hank 推薦 **A**：黑名單最重（直接擋）→ 額度超（擋）→ 逾期（轉現金）→ 付款條件（純帶入）。

### Q-U1 UI 拓樸範圍（→ Alex）

A. 本軌 3 placeholder 全 functional
B. 本軌部分 functional
**C. ✅ 本軌全 stub、UI 留獨立軌**（對齊 NX02 Q-U1=c 範式、Hank 推薦）

Hank 推薦 **C** 對齊 NX02 / AR 範式（service 為主、UI 獨立軌 backlog）。

### Q-X1 audit-01 揭露 4 個 drift / 殘留處理時機？（→ Alex）

| drift | Hank 建議 |
|---|---|
| 1. menu.nx04.ts 嚴重 drift（內容全 NX05）| ✅ 本軌 Phase 6 順手修（純文件、低風險）|
| 2. 3 sales namespace 殘留（features/sale + sales + nx03/sales）| 留 TASK-NX04-DEMO-CLEANUP 獨立軌 |
| 3. Nx04SoItem.itemStatus @deprecated | 留 Phase 0 D3 trigger 雙寫範式、本軌 0 touch |
| 4. Nx04So.sourceType @deprecated | 同上、本軌 0 touch |

Hank 推薦組合 **「修 1、其餘留獨立軌」**。

---

## §7 風險與停下點

### 7.1 主要風險

1. **自動調撥邏輯複雜**：
   - 風險：「最近倉庫」計算（依倉庫地址 / 自定排序）需業務拍板算法
   - 對策：本軌走「業務手動指定排序」（warehouse.sortNo 既有）+ application 條件式選最近、後續軌升地理距離計算
2. **CreditGuardService 跨模組 query 效能**：
   - 風險：每 SO 建單前 query 客戶所有未付 AR + 計算超額、N+1 風險
   - 對策：按 customerId 切批 + cache、Nx08 PRO cache 候選
3. **CoEstimateService 歷史成本資料缺失**：
   - 風險：新料件 0 歷史 PoItem、預估價無法算
   - 對策：fallback to part.priceA/B/C/D（既有 schema）+ 業務員手動覆寫
4. **配送中部分鎖 guard 與既有 update endpoint 衝突**：
   - 風險：既有 PATCH /nx04/so/:id 可改 status、新 guard 可能誤擋
   - 對策：guard 入口分流（status=SHIPPED 才 check、其他狀態保留）
5. **menu.nx04.ts drift 修正可能影響既有 production UI**：
   - 風險：既有 menu config 用戶在 /dashboard/nx05/* 路徑、改 nx04.ts 不影響但需確認
   - 對策：純改 menu 對應 NX04 路徑、不刪既有檔

### 7.2 預設停下點

依紀律承諾、以下情境必停下回報：
- 任一 migration 跑前、先 stop 給 Crown review schema diff
- 任一新 service 設計、先 stop 列 service shape + 業務語意對應
- 任何 schema 跟業務語意衝突、立即 stop
- Phase 完成、stop（Q-RHYTHM-1=d 送 Alex）
- Alex 判斷需升 Crown 的戰略題、Alex 自行整合升

---

## §8 下次接續工作建議

待 Alex review §6 拍板 Q 後（schema 題 Alex 升 Crown）：

1. **如全部 ✅ 認可** → 進 Phase 1 M1（partner +defaultWarehouseId migration）
2. **如有 ⚠️ 重排** → 修正本計畫 v0.1.1、再次送 Alex review
3. **如新增情境揭露** → 評估是否影響 9 業務功能拓樸、必要時加 audit-02

---

## 後記

- 真實 main HEAD：`6e72258`（NX02 merge / tag v0.5.0-nx02-closure 後）
- 真實 branch HEAD：`feature/nx04-sales`（從 main 切出、無新 commit、無 push）
- 本檔位置：`docs/nx04/spec/impl/nx04-impl-01-plan.md`
- 本檔 commit 後送 Alex review、拍板前 Hank 不動 schema、不跑 migrate、不 push

⚠️ 揭露可能不完整、Alex / Crown 想補的直接說。

---

> 對齊文件：[nx04-overview v0.1.0](../intent/nx04-overview.md) · [nx04-audit-01](../../nx04-audit-01.md) · [nx02-impl-01-plan](../../../nx02/spec/impl/nx02-impl-01-plan.md) · [ar-impl-01-plan](../../../auto-replenish/spec/impl/ar-impl-01-plan.md)
