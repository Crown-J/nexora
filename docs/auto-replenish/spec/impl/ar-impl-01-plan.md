<!-- docs/auto-replenish/spec/impl/ar-impl-01-plan.md -->

# TASK-AR-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、待 Alex/Crown review 拍板後才動 schema
> 撰寫者：Hank
> 日期：2026-05-16
> 分支：`feature/ar-auto-replenish`（自 main HEAD `8743de0` 切出）
> 對應依據：[ar-overview v0.1.0](../intent/ar-overview.md) + [ar-audit-01.md](../../ar-audit-01.md)
> 紀律：對齊 NX03-IMPL-01 範式（§II.1.1 拓樸決策先送 review + §I.5 #22 schema verify + §I.6.5 A041 精確）

---

## §0 計畫文件性質

本檔是 AR 自動補貨 B 軌開工第一份產出、「**做什麼 + 什麼順序**」的決策稿、**不含實際 schema 改動**。

文件邊界：
- ✅ 列拓樸排序、依業務依賴
- ✅ 列 migration 拆軌（含每軌範圍 + 風險）
- ✅ 列 commit 策略（每軌幾 commit、commit 標題範式）
- ✅ 列 review 拍板 Q
- ❌ 不寫 .prisma 任何一行
- ❌ 不跑 `prisma migrate dev`
- ❌ 不改任何既有 service / controller

**Hank 紀律承諾**：本計畫送 review 拍板前、**不動 schema、不跑 migrate、不 push**。

---

## §1 範圍 B 8 業務功能（對齊 overview §8.1）

| # | 業務功能 | 依賴 |
|---|---|---|
| 1 | 自動計算引擎（4 階段：偵測 / 計算 / 分類 / 分配）| Stock balance/ledger + PartStockSetting + BrandAllocationRule + Part isOem/partBrandId + PartModel |
| 2 | 倉層級彈性頻率設定 | PartStockSetting 新欄 |
| 3 | 兩層分類 + 配比規則 | BrandAllocationRule 主檔（新表）|
| 4 | 副廠池銷貨比例分配 | SoItem 既有 + groupBy 計算（純 service）|
| 5 | 替代品牌邏輯（application 層）| 既有 PartModel.fitLevel + Part.isOem（schema 0 動）|
| 6 | 建議單管理 UI | Demand 既有 + AR 計算結果 |
| 7 | 倉管 / 產品手動介入 | Demand status + UI |
| 8 | 詢價接點（NX02 Demand）| NX02 Demand 既有路徑 |

---

## §2 拓樸排序 4 層（對齊 NX01 + NX03 範式）

### L1 — 基礎層（schema + 主檔 service）

- 升級 `Nx03PartStockSetting`：加 `calculationFrequency` Int? 欄（天數）+ `lastCalculatedAt` DateTime?（最後計算時間）
- 新建 `Nx03BrandAllocationRule` 主檔（modelId × OE 比例 + 副廠比例 + 配比來源 system/manual + 生效期間）
- service：`brand-allocation-rule` CRUD（list / getById / create / update / softDelete）

### L2 — 計算引擎 service（4 階段）

⭐ **計算引擎核心**、對齊 overview §3.2：

- **Stage 1 偵測**：scan stock_balance × part_stock_setting WHERE onHand < safetyQty → 候選池
- **Stage 2 計算**：對 part_model 維度撈近 N 天 stock_ledger（source=S 純銷貨、排除 X 調撥）→ 平均出貨 × lead time
- **Stage 3 兩層分類**：總需求 × OE/副廠配比 → 拆 OE 量 + 副廠量
- **Stage 4 副廠池分配**：副廠量 × 各品牌銷貨比例 → 拆各品牌量
- **application 層替代邏輯**：缺正廠 → 套 fitLevel=2 推副廠（service 內部 helper）

### L3 — 建議單管理 service

- `Nx02Demand` auto-create service（從 AR 計算結果寫入、demandType='S'、AR 計算 batchId 帶入 remark）
- 倉管調整：`PATCH /nx02/demand/:id` 改 qty（既有路徑）
- 產品決策：`PATCH /nx02/demand/:id` 改 status 接到 RFQ（既有路徑）
- 業界場景：一張 AR batch 算出 N 個 Demand row、產品可批次處理

### L4 — 整合 + UI 接點

- scheduler service（定期跑計算引擎、按倉頻率設定）
- 手動觸發 endpoint（POST /nx03/ar/trigger?warehouseId=）
- 跨模組接點 verify（AR → Demand → RFQ）
- UI：本軌只 stub placeholder、實際 UI 視 Crown 拍板（PWA 手機 vs 桌面）

---

## §3 Migration 拆軌策略（A041 精確 = **2 軌**）

### M1 — `nx03_part_stock_setting_add_calculation_frequency`

範圍：
- `nx03_part_stock_setting` ADD COLUMN `calculation_frequency` INT NULL（天數、null=每天）
- `nx03_part_stock_setting` ADD COLUMN `last_calculated_at` TIMESTAMP(3) NULL（最後 AR 計算時間）

風險：低（純加欄、nullable、無破壞）
commit 數：1（schema + migration 同 commit）

### M2 — `nx03_brand_allocation_rule_create`

範圍：
- 新建 `Nx03BrandAllocationRule` 表
- 欄位：id / tenantId / modelId FK / oemRatio Decimal(5,4) / aftermarketRatio Decimal(5,4) /
  source 'S'system/'M'manual / validFrom Date / validTo Date? / isActive / remark / audit
- unique [tenantId, modelId, validFrom]（同 model 同生效起期唯一、支援歷史版本）
- index [tenantId, modelId]
- FK：tenant / model
- reverse @relation：Nx99Tenant + Nx01Model

風險：低（純新表、無破壞）
commit 數：1

### Migration 軌總計

- M1 + M2 = **2 軌、2 commit**

---

## §4 commit 拆軌策略（A041 估計）

| 階段 | commit 數 | 範圍 |
|---|---|---|
| Phase 0 — 計畫 review | 1 | plan 文件（本 commit）|
| Phase 1 — schema migration | 2 | M1 frequency 欄 / M2 BrandAllocationRule |
| Phase 2 — L1 主檔 service | 1 | BrandAllocationRule CRUD service + endpoint |
| Phase 3 — L2 計算引擎 | 2~3 | Stage 1+2 偵測+計算 / Stage 3+4 分類+分配 / application 替代 helper（拆 2 或 3 視 commit 大小）|
| Phase 4 — L3 建議單管理 | 1~2 | Demand auto-create + scheduler 觸發 |
| Phase 5 — L4 跨模組 verify + manual trigger | 1 | endpoint + verify report |
| Phase 6 — UI stub | 1 | stub placeholder（實 UI 視拍板）|
| Phase 7 — 收尾 | 1 | summary + worklog 主題 |

**總計估計：10~12 commit / 2 migration / 3~5 工作日**（對齊 AR-AUDIT-01 估「6~8 commit」、本 plan 較細拆）

---

## §5 紀律對齊承諾（必履行）

### 5.1 對齊 NX03 範式

- Q-impl=B Phase 完成 stop（不逐 commit、不全階段）
- 遇 schema/業務語意衝突立即 stop 回報
- migration SQL 寫好先 stop review、Crown 拍板後 Hank 自跑（memory NX03 範式）
- tsc 0 error 每 commit 基準
- A041 精確 count、不模糊
- §G.9 通配 grep、不單檔 ls

### 5.2 schema vs 業務語意衝突處置

對齊 ar-overview §0：
- 遇衝突立即 stop、寫入 stop 報告
- 不擅自推進、等 Alex/Crown 拍板

### 5.3 不擅自處理範圍外

- 預測性補貨（範圍 B 不含、§10.1 backlog）
- 跨倉自動調撥建議（NX03 範圍）
- 客戶分級補貨（後續軌）

---

## §6 拍板 Q（送 Alex/Crown review）

### Q-T1 拓樸排序 4 層分層認可？

A. ✅ 認可（L1 基礎 → L2 計算引擎 → L3 建議單 → L4 整合）
B. ⚠️ 重排（Crown 補建議）

### Q-M1 2 軌 migration 拆軌認可？

A. ✅ 認可（M1 PartStockSetting 加欄 + M2 BrandAllocationRule 新表）
B. ⚠️ 合併為 1 軌（一 migration 包兩個變動）
C. ⚠️ 拆細

### Q-C1 計算引擎觸發策略？⭐ 戰略

A. **scheduled 為主**（cron 按倉頻率自動跑、Hank 推薦）
B. on-demand 為主（純手動觸發）
C. event-driven（銷貨/進貨後即時算）
D. **混合 A+B**（cron 主軸 + 手動觸發補強、業界常見）

Hank 推薦 **D**：
- cron 滿足「系統自動算」業務需求
- 手動觸發滿足「倉管/產品介入」業務需求
- event-driven 風險高（每筆 SO/RR 都算、效能負擔）

### Q-C2 計算引擎輸出流程？

A. 偵測缺貨後 **直接** 寫 Nx02Demand（demandType=S、status=O 待處理）
B. 先生 staging suggestion table、產品確認後才寫 Demand
C. 兩階段：staging 列「系統建議」+ 產品按鈕「轉 Demand」

Hank 推薦 **A**：
- 既有 Nx02Demand.status (O/P/C/I) 已支援「待處理」+「忽略 + ignoreReason」
- 不需 staging 中間態（重複 schema）
- 對齊 overview §3.2 階段 5「寫入 Nx02Demand demandType='S'」
- 「產品決策」走 Demand status 變更（既有路徑）

### Q-B1 BrandAllocationRule 配比維度層級？

A. **modelId 級**（同 model 配比一致、Hank 推薦）
B. partId 級（每 part 各自配比、最細）
C. partGroupId 級（按零件族群配比）
D. 混合（先看 modelId、無則 fallback partGroupId）

Hank 推薦 **A**：
- 對齊 overview §3.3「part_model 維度算總量」
- 業務上「Golf 7 三角架」（model 級）即可、無需細到 partId
- model 級 row 數少、UI 管理簡單

### Q-S1 system/manual 配比規則優先策略？

A. manual 覆寫 system（既有 manual rule 優先）
B. system 覆寫 manual（cron 重算 system 會蓋 manual）
C. 兩條並存、UI 顯示「系統建議：X / 手動覆寫：Y」、計算用 manual

Hank 推薦 **A**：
- system rule 是「動態算」、manual rule 是「業務拍板」
- 業務優先（採購策略 / 季節 / 新品試銷）
- 對齊 overview §5.2「手動為輔」精神

### Q-B2 平均出貨量計算窗口？

A. 固定 90 天（業界常見）
B. 動態看 cron 頻率（每天算 = 看 7 天、每月算 = 看 90 天）
C. 系統設定 PartStockSetting.lookbackDays 欄
D. Hank 自決

Hank 推薦 **A** 固定 90 天（簡單、業界對齊、之後升 C 屬 backlog）

### Q-U1 UI 拓樸範圍

A. **本軌 stub placeholder、UI 留 Phase 8 獨立軌 backlog**（Hank 推薦）
B. 本軌做完整 UI（建議單列表 + 倉管調整 + 產品決策）
C. 本軌做最小 UI（純 list、調整走既有 Demand UI）

Hank 推薦 **A** 對齊 NX03 範式（NX03 也是 service 為主、UI backlog 獨立軌）

### Q-M2 BrandAllocationRule 配比欄精度？

A. Decimal(5,4)（0.0000~9.9999、4 位小數、推薦）
B. Decimal(3,2)（百分比 0.00~9.99、2 位小數）
C. Int（整數比例 1:1 / 2:1、需 normalize）

Hank 推薦 **A** Decimal(5,4)：對齊 conversion costRatio 精度範式（Decimal(8,6)）但稍寬鬆。

---

## §7 風險與停下點

### 7.1 主要風險

1. **計算引擎效能**：scan stock_balance × part_stock_setting 大量 row 時可能 slow
   - 對策：按倉切批、cron 分時段跑、index 補強
2. **配比規則歷史版本**：modelId × validFrom unique 確保不重疊、但 validTo 重疊邊界需 application 校驗
3. **手動覆寫 vs cron 重算衝突**：Q-S1=A 拍板後策略明確、但需 UI 提示
4. **平均出貨量公式**：純 SUM/days 還是加權（如最近 30 天權重高）？本軌純 simple、後續可升

### 7.2 預設停下點

依紀律承諾、以下情境必停下回報：
- 任一 migration 跑前、先 stop 給 Alex/Crown review schema diff
- 任一新表設計、先 stop 列 schema diff + 業務語意對應
- 任何 schema 跟業務語意衝突、立即 stop
- Crown Q-X 拍板含模糊區、Hank 不擅自解、stop 列細項拍板

---

## §8 下次接續工作建議

待 Alex/Crown review §6 拍板 Q 後：

1. **如全部 ✅ 認可** → 進 Phase 1 M1（PartStockSetting frequency 欄 migration）
2. **如有 ⚠️ 重排** → 修正本計畫 v0.2.0、再次送 review
3. **如新增情境揭露** → 評估是否影響 8 業務功能拓樸、必要時加 audit-02

---

## 後記

- 真實 main HEAD：`8743de04220fffae32e3448d989ef9ec32d5a047` ✓
- 真實 branch：`feature/ar-auto-replenish`（從 main 切出、無新 commit、無 push）
- 本檔位置：`docs/auto-replenish/spec/impl/ar-impl-01-plan.md`
- 本檔 commit 後送 review、拍板前 Hank 不動 schema、不跑 migrate、不 push

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
