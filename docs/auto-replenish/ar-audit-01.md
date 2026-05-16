<!-- docs/auto-replenish/ar-audit-01.md -->

# AR-AUDIT-01 v2 — 自動補貨 + 廠牌維度 schema 真相

> 性質：純諮詢、不開工、不 commit schema/service
> 撰寫者：Hank
> 日期：2026-05-16
> 真實 main HEAD：`50b53815`（NX03-IMPL-01 全 closure 後）
> 背景：自動補貨 B 軌啟動前 schema verify、Crown 揭露 9 題業務需求（含「同零件多廠牌」業界戰略）

---

## 任務 A：自動補貨既有 schema 真相

### A1. `Nx03AutoReplenish`（line 2217~2245）⚠️ 命名誤導

**業務本質 = 「跨倉補貨來源優先順序拓樸」**、非「自動補貨建議單」：
- 欄位：`fromWarehouseId` + `toWarehouseId` + `priority` Int default 1 + `isActive`
- 用途：PLUS 多倉拓樸下、目標倉缺貨時依優先序找來源倉調撥
- **0 service / 0 controller 引用**（AUDIT-01 verify、PLUS 0 落地）
- ⭐ **不能直接作為「自動補貨建議單」載體**、純配置表

### A2. `Nx03Shortage`（line 2607~2646）✅ 缺貨偵測核心

| 欄位 | 業務語意 |
|---|---|
| `partId / warehouseId` | unique [tenantId, partId, warehouseId] 三 key |
| `onHandQty / minQty` snapshot | 偵測當下快照 |
| `shortageQty = min - onHand` | 缺貨量計算欄 |
| `suggestOrderQty = max - onHand` | 建議訂購量 |
| `status` O/R/C/I | OPEN / RFQ已建立 / CLOSED / IGNORED |
| **`refRfqId`** | ✅ FK 連 Nx02Rfq（缺貨 → RFQ 路徑通）|

⭐ 既有路徑：onHand < min → 自動建 Shortage row → 轉 RFQ → refRfqId 回填

### A3. NX02 採購建議單既有 = `Nx02Demand`（line 1467~1512）✅ 完整

| 欄位 | 業務語意 |
|---|---|
| `docNo` (DR-YYYYMM-NNNNN) | 採購需求單號 |
| **`demandType` 1-char** | **S=庫存不足系統自動產生 / O=客訂由銷售專員登記** |
| `partId / warehouseId / qty` | 需求料件 + 倉 + 量 |
| `customerId?` | demandType=O 客訂時必填 |
| `expectedDate?` | 客戶期望到貨 |
| `status` O/P/C/I | 待處理/處理中/已完成/已忽略 |
| `ignoreReason?` | status=I 必填 |
| `refRfqId?` | 處理後關聯 RFQ |
| reverse | `rev_Nx02Rfq_demandId` + `rev_Nx02RfqItem_demandItemId` |

⭐ **業務鏈完整**：`Shortage → Demand (demandType=S) → Rfq (demand_id) → Qt → Po → Rr`

→ **自動補貨建議單 = `Nx02Demand with demandType='S'`**、不需新表！

### A4. `Nx03PartStockSetting`（line 2382~2412）⚠️ 缺彈性頻率

既有欄位：
- `minQty`（安全量）/ `maxQty`（最高量）/ `reorderQty`（建議補貨量）
- `isActive` / `remark`

⚠️ **0 個「彈性頻率」相關欄位**（grep verify `frequency / interval / period` 全在 NX08 cache 或 schedule 用、不在 PartStockSetting）

Crown 9 題若拍「彈性頻率」（如每週/每月偵測一次）、需新欄：
- `replenishFrequency` Int?（天數）or
- `replenishCron` String?（cron expression）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 B：NX02 進貨流程接點 verify

### B1. `Nx02Rfq` 既有狀態（line 1794~ ）✅ 完整

| 欄位 | 業務語意 |
|---|---|
| `docNo` (RF-YYYYMM-倉-NNNNN) / `supplierId` / `warehouseId` | 標準 |
| **`rfqType`** | G=一般詢價（採購專員）/ P=同行調貨詢價（銷售專員）|
| **`rfqReason`** 逗號分隔可複選 | **S=庫存不足** / O=客訂 / N=新品 / P=特價 / T=同行調貨 |
| `status` D/S/R/C/V | DRAFT/SENT/REPLIED/CLOSED/VOID |
| `validUntil` | 詢價有效期、過期不得建 PO |
| `demandId?` FK | 來源 Nx02Demand ✓（自動補貨鏈通）|
| `sourceSoItemId?` FK | D4 同行調貨 SO line 反查 |

### B2. 自動補貨 demo 流程（既有 schema 推導）

```
1. 系統定期掃 Nx03StockBalance × Nx03PartStockSetting
   WHERE onHandQty < minQty
   → 建立 Nx03Shortage（status='O' OPEN）

2. shortage 偵測批次後（或即時）建 Nx02Demand
   demandType='S' 庫存不足 / qty=suggestOrderQty
   → 寫入 Demand.refRfqId 暫空

3. 採購專員審 Demand → 建 Nx02Rfq
   rfqType='G' / rfqReason='S' / demandId=demand.id
   → 回填 Demand.refRfqId / Shortage.refRfqId (status→R)

4. RFQ → Qt（同行報價）→ Po（採購單）→ Rr（進貨單）→ NX03 入庫
   → Shortage status→C / Demand status→C
```

### B3. 建議單 → RFQ 接點推薦

⭐ **自動補貨 B 軌的「採購建議單」直接走既有 `Nx02Demand`、不新建表**：
- 對齊既有業務鏈（Shortage → Demand → RFQ）
- `demand_type='S'` 庫存不足語意完整
- `refRfqId` 雙向接通已有
- 採購專員「審/忽略」走 `status` O/P/C/I + `ignoreReason`

新增工作只在 **scheduler service**（定期掃 balance < setting.minQty + 建 Shortage + 建 Demand）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 C：⭐ 廠牌維度 schema 真相

### C1. NX01-05 part 跟廠牌的既有設計 = **選項 (a)**（多 part_id 各自獨立）

`Nx01Part` 廠牌相關欄位（line 705~810）：
- **`isOem` Boolean default true**（line 717、是否正廠件）
- **`partBrandId` String?** FK → `Nx01PartBrand`（line 733、零件品牌）
- `secCode` String?（line 719、副廠料號、對應 OE 料號）

⭐ **業務範式**：
- 「Golf 7 機油濾芯」正廠 = part_id_1（isOem=true、partBrand=VAG、code=06D 115 562）
- 同零件 febi 副廠 = part_id_2（isOem=false、partBrand=febi、code=FEBI-12345、secCode=06D 115 562）
- 同零件 Bosch 副廠 = part_id_3（isOem=false、partBrand=Bosch、code=BOSCH-F026）
- **3 個獨立 part_id、各自完整主檔 row**

→ **不是 b/c 兩層 part + part_variant、是 a「多 part_id + partBrandId 欄」**

### C2. OE / 副廠既有設計 = **`Nx01Part.isOem` Boolean 欄**（不是 type 軸）

| 欄位 | 軸 | enum |
|---|---|---|
| `isOem` Boolean | **OE / 副廠分類** ⭐ | true=正廠 / false=副廠 |
| `type` Int? @db.SmallInt | **零件結構分類** | 1=專用 / 2=通用 / 3=組合 / 4=拆解 |

⭐ **兩軸獨立**：
- OE 專用 part：isOem=true + type=1
- 副廠通用 part：isOem=false + type=2
- 副廠組合包：isOem=false + type=3

→ OE/副廠跟「專用/通用/組合/拆解」是兩條獨立分類軸。

### C3. 副廠品牌列表既有設計 = **`Nx01PartBrand` 獨立主檔**（line 815~847）

| 欄位 | 業務 |
|---|---|
| `id` (NX01PABR0000001) | |
| `code` VarChar(3) @@unique [tenantId, code] | 例：VAG / BMW / OEM / FEBI / BOSC |
| `name` VarChar(100) | 品牌名稱 |
| `countryId?` FK | 品牌國家 |
| `isActive` / `sortNo` / `remark` | |

⭐ **與 `Nx01Partner.partnerType` 雙軌獨立**：
- `Nx01PartBrand` = **零件品牌主檔**（含 OEM/VAG 正廠 + febi/Bosch 副廠所有品牌）
- `Nx01Partner.partnerType=S` = **零件供應商**（往來廠商、可能跨多品牌經銷）
- 業界對應：採購向「Bosch 經銷商」（partner_type=S）買「Bosch 牌」（partBrand）零件

→ 答 partnerType=S 範式？**否**、廠牌獨立主檔。

### C4. part_model 跟廠牌的關係（line 7165~7198）

`Nx01PartModel`：
- `partId` FK + `modelId` FK
- **`fitLevel` SmallInt（1=原廠 / 2=副廠等效 / 3=通用替代）⭐**
- unique `[tenantId, partId, modelId]`

⭐ **業務範式**：
- Golf 7 機油濾芯有 3 個 part_id（C1 揭露）
- part_model 對應 3 個 row：
  - part_id_1（正廠 VAG）× model_Golf7 → fitLevel=1（原廠）
  - part_id_2（febi 副廠）× model_Golf7 → fitLevel=2（副廠等效）
  - part_id_3（Bosch 副廠）× model_Golf7 → fitLevel=2（副廠等效）
- part_model 反查：1 model → N parts（含不同廠牌、各自 fitLevel）

⭐ **fitLevel 跟 isOem 雙重存在但不衝突**：
- isOem 在 part 主檔層、跟車型無關
- fitLevel 在 part-model 配對層、跟車型有關
- 業務上同 part 對不同 model 可能 fitLevel 不同（如同 febi 副廠對 Golf 7 是「等效」、對 Audi A3 也可能「等效」）

### C5. 銷貨數據能否跨品牌彙整（`Nx04SoItem`）✅ 可

```sql
-- 業務 query：某 model 跨品牌總銷貨量
SELECT pm.modelId, SUM(soi.qty) AS total_qty
FROM nx04_so_item soi
JOIN nx01_part p ON soi.partId = p.id
JOIN nx01_part_model pm ON pm.partId = p.id
WHERE pm.modelId = 'NX01MODE0000123' -- e.g. Golf 7
  AND soi.created_at >= '2026-01-01'
GROUP BY pm.modelId
```

⭐ **既有 schema 完整支援跨品牌彙整**：
- `Nx04SoItem.partId` → `Nx01Part` → `Nx01PartModel.partId` → `modelId`
- 也可分維度 group by `Nx01Part.isOem`（OE 銷貨量 vs 副廠銷貨量）
- 也可分維度 group by `Nx01Part.partBrandId`（按品牌細分銷貨）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 D：⭐ 自動補貨計算 D 解法可行性評估

對齊 Crown Q-AR-廠牌-2=d 混合解法：

### D1. part_model 維度算總量（解法 B）✅ 既有 schema 支援

如 C5 query、純 SQL join 即可、無需新表。

### D2. 配比規則 OE:副廠 = 2:2（解法 B）⚠️ 需新 schema

既有 schema **0 條** OE/副廠配比配置欄。需新建：

**選項 a**：擴 `Nx03PartStockSetting` 加 2 欄
- `oemRatio` Decimal? default 0.5（OE 採購比例）
- `aftermarketRatio` Decimal? default 0.5（副廠採購比例）

**選項 b**：新建 `Nx03BrandAllocationRule`（model 維度配置）
- `modelId` FK + `oemRatio` + `aftermarketRatio` + `validFrom/To`
- 跨同 model 多 parts 統一適用

**Hank 推薦選項 b**：對齊 Crown Q-AR-廠牌-2=d「part_model 維度」、配比是 model 級而非 part 級。

### D3. 副廠池內按銷貨比例分配（解法 C）✅ 既有 schema 支援

```sql
SELECT p.partBrandId, SUM(soi.qty) AS brand_qty
FROM nx04_so_item soi
JOIN nx01_part p ON soi.partId = p.id
JOIN nx01_part_model pm ON pm.partId = p.id
WHERE pm.modelId = ?
  AND p.isOem = false  -- 只算副廠池
GROUP BY p.partBrandId
```

→ 副廠池內各品牌銷貨比例計算、純 query、無需新表。

### D4. 替代品牌邏輯（Q-AR-廠牌-4=b 接受）✅ 既有 Nx01PartRelation

`Nx01PartRelation`（line 883~917）：
- `partIdFrom / partIdTo`
- `relationType` SmallInt（1=改號 / 2=同款 / 3=改版換周邊 / 4=組合包 / 5=拆解包）
- unique `[tenantId, partIdFrom, partIdTo, relationType]`

⭐ **業務語意**：「febi 對應 Bosch 同款」可建 part_relation row、relationType=2 同款。

⚠️ relationType 沒「替代品牌」字面、可能需要：
- 擴 relationType 加 6=替代品牌
- 或 application-layer 解：fitLevel=2 副廠等效 + 同 modelId 視為「替代池」

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 表 1：自動補貨 schema 真相摘要

| 表 | 業務角色 | 既有狀態 | 自動補貨 B 軌用法 |
|---|---|---|---|
| `Nx03PartStockSetting` | 安全量設定 | ✅ min/max/reorder | 彈性頻率欄需補 |
| `Nx03Shortage` | 缺貨偵測 | ✅ 含 refRfqId | scheduler 自動建 |
| `Nx03AutoReplenish` | 跨倉拓樸 | ⚠️ PLUS 0 落地、命名誤導 | **不用**（純配置） |
| `Nx02Demand` | 採購需求單 | ✅ demandType=S 自動建 | **核心載體** |
| `Nx02Rfq` | 詢價單 | ✅ demandId 接通 | RFQ→Qt→Po→Rr 鏈 |

## 表 2：NX02 進貨鏈接點

| 階段 | 表 | 觸發 | 對齊 |
|---|---|---|---|
| 偵測 | `Nx03Shortage` | scheduler 掃 balance<min | 新建 service |
| 建單 | `Nx02Demand` (demandType=S) | shortage 後自動建 | 既有 schema |
| 詢價 | `Nx02Rfq` (demandId 接通) | 採購專員建 | 既有 ✓ |
| 報價 | `Nx02Qt` / `Nx02Po` / `Nx02Rr` | 既有採購鏈 | 既有 ✓ |
| 入庫 | NX03 過帳 source=P | rr.service.applyRrPosting | 已落地 ✓ |

## 表 3：廠牌維度 schema 真相

| 維度 | schema | 答案 |
|---|---|---|
| 同零件多廠牌 | 多 `part_id` 各自獨立 | **選項 a**（不是 b/c）|
| OE/副廠分類 | `Nx01Part.isOem` Boolean | 獨立軸、不是 type |
| 副廠品牌主檔 | `Nx01PartBrand` 獨立 | 跟 Partner 雙軌 |
| 同型號跨廠牌 | `Nx01PartModel.fitLevel` 1/2/3 | 1 model → N parts |
| 銷貨跨品牌 query | SoItem → Part → PartModel | ✅ join + group |

## 表 4：D 解法可行性

| 解法 | 既有 schema | 需補 |
|---|---|---|
| D1 part_model 總量 | ✅ | 0 |
| D2 OE:副廠 2:2 配比 | ⚠️ 0 配置欄 | 新建 `Nx03BrandAllocationRule` 或擴 PartStockSetting |
| D3 副廠池銷貨比例 | ✅ | 0 |
| D4 替代品牌 | 🟡 part_relation 部分 | 擴 relationType 或 application-layer 解 |

---

## 階段地圖

```
本期不動 schema（純 verify、本 audit）：
  - 揭露 schema 真相
  - 給 Alex 寫 B 軌 overview

Phase 1 schema（推薦 1~2 migration）：
  - PartStockSetting 加 replenishFrequency 欄（彈性頻率）
  - 新建 Nx03BrandAllocationRule（D2 配比規則、可選）
  - 既有 schema 已支援其他需求

Phase 2 service（推薦 3~4 commit）：
  - scheduler: shortage 偵測 service
  - shortage → demand auto-create service
  - 配比計算 service（D1/D2/D3 整合）
  - 替代品牌建議 service（D4）

Phase 3 整合（推薦 1~2 commit）：
  - UI demand 審 / 忽略
  - 採購專員工作台對接

估總計：6~8 commit、1~2 migration、3~5 工作日
```

---

## 後記

- 真實 main HEAD：`50b53815` ✓
- 本檔位置：`docs/auto-replenish/ar-audit-01.md`
- 純諮詢、schema 0 動、未 commit code
- **本 audit 報告 commit**（依 Crown 指示「諮詢產出 commit」）

下一步：Alex 整合本 audit + Crown 9 題拍板 → 寫自動補貨 B 軌 overview → Hank impl plan + 落地。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
