<!-- docs/nx02/nx02-audit-02.md -->

# NX02 採購模組 — partner ↔ part 關係 + 採購建議單 UI 範式 verify（NX02-AUDIT-02）

> 性質：純諮詢、不開工、不 commit、不切分支
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-16
> 任務：Crown 業務需求討論揭露「採購建議單列表可按廠商篩顯示對應零件」、需 verify 既有 schema 是否支援 partner ↔ part 關係
> 真實 main HEAD：`ce36376`（NX02-AUDIT-01 後、本檔 commit 前）
> 對應依據：[nx02-audit-01](./nx02-audit-01.md) §1.4 跨 NX FK 接點 + §5.3 partner 維度對齊

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep（`find -iname`、`grep partner_part / supplier_part / vendor_part`）+ §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數、禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- 本檔僅揭露**既有 schema 真相**、不寫業務拍板 Q、不寫 plan
- 一併修正 NX02-AUDIT-01 §5.3 partner 維度小錯誤（見 §3.5）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §1. partner ↔ part 既有 schema 真相

### 1.1 中間表 grep 結論（A041 = 0）

```
grep -E "partner_part|supplier_part|vendor_part|part_supplier|part_partner|part_vendor|PartSupplier|PartnerPart|PartVendor|VendorPart|SupplierPart" packages/db-core/prisma/schema.prisma
→ 0 hits
```

**❌ schema 0 個 partner ↔ part 中間表**：無 `PartnerPart` / `PartSupplier` / `SupplierPart` / `VendorPart` 等業界常見廠商-料件主檔關聯表。

### 1.2 三主檔關係矩陣（A041 = 46 Nx01 model 全 verify）

```
grep -c "^model Nx01" packages/db-core/prisma/schema.prisma → 46
grep -E "^model Nx01Partner|^model Nx01Part\b|^model Nx01PartBrand" → line 705 / 815 / 922
```

| 主檔 | line | FK 出 | reverse 進 |
|---|---|---|---|
| `Nx01Part` | 705 | partBrandId → `Nx01PartBrand`、partGroupId → `Nx01PartGroup`、countryId → `Nx01Country`、codeRuleId → `Nx01BrandCodeRule` | 28 條 reverse（NX02/03/04/06/08 + PartVersion / PartModel / PartRelation）|
| `Nx01PartBrand` | 815 | countryId → `Nx01Country` | 2 條 reverse（Nx01Part / Nx03StItem）|
| `Nx01Partner` | 922 | customerGradeId / salesUserId / defaultCurrencyId | 22 條 reverse（NX02 7 條 / NX04 4 條 / NX05 5 條 / NX08 2 條 / 地址 2 條 / NX06 1 條）|

⭐ **三主檔之間 0 直接 FK**：Partner ↔ Part 0 條、Partner ↔ PartBrand 0 條、Part ↔ Partner 0 條。**三者透過交易單據鏈才會接線**。

### 1.3 Nx01Partner 主檔欄位概況

| 欄 | 業務 | 與料件關聯 |
|---|---|---|
| `partnerType` VarChar(1) default 'C' | 角色類型 C/S/T/V/B | ❌ 無 |
| `paymentTermDomestic` default 'NET30' | 國內付款條件 | ❌ 無 |
| `paymentTermImport` default 'TT' | 進口付款條件 | ❌ 無 |
| `incoterm` default 'FOB' | 預設貿易條件 | ❌ 無 |
| `creditLimit` Decimal(15,2) | 信用額度（客戶用）| ❌ 無 |
| `creditStatus` N/W/F | 信用狀態 | ❌ 無 |
| `defaultCurrencyId` | 預設交易幣別 | ❌ 無 |
| `salesUserId` | 業務歸屬 | ❌ 無 |

⚠️ **Partner 主檔 0 欄位指向 part / partBrand**：無「主供應品牌」、無「主供應料件群」、無「優先料件 default」、無「廠商代碼 ↔ 我們 partNo 對應表」。

### 1.4 partnerType 5 enum 真相（修正 audit-01 §5.3）

```
line 932：partnerType String @default("C") @db.VarChar(1)
註解：C=客戶 / S=零件供應商 / T=外包物流 / V=一般廠商 / B=銀行
```

| code | 業務 | NX02 用途 |
|---|---|---|
| `C` | 客戶 | Demand.customerId（demandType=O 客訂）、NX04 SO/Co/Sr |
| `S` | **零件供應商**（本檔重點）| **雙重身分**：Po/Rfq/Rr/Pr.supplierId（純供應商）+ Qt.inquiryPartnerId / Ti.partnerId（同行供應商）|
| `T` | 外包物流 | NX03 Parcel.toPartnerId 配送商 |
| `V` | 一般廠商 | 雜支 / 服務廠商 |
| `B` | 銀行 | NX05 paylog 對接 |

⚠️ **partnerType=S 沒有細分**：「純供應商」與「同行供應商」**共用 'S' 代碼**、語意僅靠開單模組區分（PO.supplierId 視為純供應商、QT.inquiryPartnerId 視為同行）。**業務真相**：採購建議單按廠商篩時、partner_type='S' 過濾即可、但「純供應商 vs 同行」需另立識別軌（candidate 在 §3.4）。

### 1.5 主檔層「料件 vs 廠商」對應總結

| 業界常見需求 | schema 是否支援 |
|---|---|
| 廠商可供應料件清單 | ❌ 主檔無、靠 §2 採購歷史反推 |
| 料件可採購廠商清單 | ❌ 主檔無、靠 §2 採購歷史反推 |
| 廠商料號 vs 我方料號對應 | ❌ 0 欄位 |
| 優先供應商標記（per part）| ❌ 0 欄位 |
| 廠商料件單價快照 | ❌ 0 欄位（單價只在 PoItem snapshot）|
| 廠商料件 leadDays 預設 | ❌ 0 欄位（leadDays 只在 RfqItem / Qt 每張單）|
| 廠商料件 MOQ（最小訂購量）| ❌ 0 欄位 |
| 廠商代理品牌列表 | ❌ 0 欄位 |

⭐ **NEXORA schema 將「廠商-料件」關係留給歷史交易單據（implicit）、未走主檔層 explicit 路徑**。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2. 採購歷史推算供應關係

### 2.1 Nx01Part ↔ Nx02 reverse 路徑（8 條）

```
grep "rev_Nx02.*partId" packages/db-core/prisma/schema.prisma → 6 條
grep "rev_Nx02.*supplierId|rev_Nx02.*partnerId" → 5 條（從 Partner 側）
```

從 **Nx01Part 反推 NX02 使用過的歷史**：

| reverse | 從 part 看 | 業務語意 |
|---|---|---|
| `rev_Nx02Demand_partId` | 該料件曾被需求過幾次 | 含 AR 自動 + 客訂 |
| `rev_Nx02RfqItem_partId` | 該料件曾詢價過幾次 | 含 G/P 兩類型 |
| `rev_Nx02PoItem_partId` | 該料件曾採購過幾次 | **核心：歷史採購來源**|
| `rev_Nx02RrItem_partId` | 該料件曾進貨過幾次 | 實際入庫 |
| `rev_Nx02PrItem_partId` | 該料件曾退貨過幾次 | 退供應商 |
| `rev_Nx02TiItem_partId` | 該料件曾同行調貨過幾次 | G 鏈 |

從 **Nx01Partner 反推 NX02 開過的單**（5 條）：

| reverse | 從 partner 看 |
|---|---|
| `rev_Nx02Po_supplierId` | 該廠商曾被下過幾張 PO |
| `rev_Nx02Rfq_supplierId` | 該廠商曾被詢過幾次價 |
| `rev_Nx02Rr_supplierId` | 該廠商曾交貨幾次 |
| `rev_Nx02Pr_supplierId` | 該廠商曾被退貨幾次 |
| `rev_Nx02Qt_inquiryPartnerId` + `rev_Nx02Ti_partnerId` | 同行報價/調貨單 |

### 2.2 「廠商曾供應過哪些料件」query path（核心可行性）

✅ **schema 支援、SQL 路徑明確**：

```sql
-- path A：經 PO 完整流（含未進貨的）
SELECT DISTINCT
  poi.part_id,
  po.supplier_id,
  COUNT(*) AS po_count,
  SUM(poi.qty) AS total_purchased_qty,
  AVG(poi.unit_cost) AS avg_unit_cost,
  MAX(po.po_date) AS last_purchase_date
FROM nx02_po po
JOIN nx02_po_item poi ON poi.po_id = po.id
WHERE po.tenant_id = $1
  AND po.supplier_id = $2
  AND po.status NOT IN ('CANCELLED')
GROUP BY poi.part_id, po.supplier_id;

-- path B：經 RR 實際進貨流（更嚴格、只算實到貨）
SELECT DISTINCT
  rri.part_id,
  rr.supplier_id,
  COUNT(*) AS rr_count,
  SUM(rri.actual_qty) AS total_received_qty,
  MAX(rr.rr_date) AS last_received_date
FROM nx02_rr rr
JOIN nx02_rr_item rri ON rri.rr_id = rr.id
WHERE rr.tenant_id = $1
  AND rr.supplier_id = $2
  AND rr.status = 'POSTED'
GROUP BY rri.part_id, rr.supplier_id;
```

⭐ **「採購建議單按廠商篩」業務需求技術可行**：query Nx02Po + Nx02PoItem（或 Nx02Rr + Nx02RrItem 更嚴）反推、不需新表。

### 2.3 反推路徑限制揭露

| 限制 | 影響 |
|---|---|
| 無 `is_primary` 標記 | 無法分「主要供應商」vs「臨時補貨供應商」、需 application 自定排序（如「最近 90 天進貨次數 desc」）|
| 無主檔層 default `unitCost` | 每次採購單價可能差距大（時效性 / 量大優惠）、需 query 歷史平均或最新單價 |
| 無主檔層 `leadDays` | 同 leadDays 散落在歷次 RfqItem.leadTimeDays / Qt.leadDays、需 query AVG 或 MAX |
| 無「停售」狀態 | partner 主檔 isActive 一停、所有歷史關聯失效（但歷史單據還在）|
| 跨 tenantId | 反推時須帶 tenantId 過濾、不能跨租戶污染 |
| 大量資料 N+1 | 反推經多 join、廠商多時需 cache（候選 `Nx08PurchaseCache_supplierId` 已 reverse、line 1005 已備）|

### 2.4 既有 Nx08PurchaseCache 接點揭露

```
line 1005：rev_Nx08PurchaseCache_supplierId Nx08PurchaseCache[]
```

⭐ **Nx08 cache 模組已備「採購快取」反向關聯**、可用於採購建議單列表的「廠商-料件」高頻反推預計算（schema 已備、service/UI 未必落地、需另查）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3. 廠商 vs 品牌關係

### 3.1 partBrand 主檔真相

```
line 815：model Nx01PartBrand
@@unique([tenantId, code])
```

| 欄 | 業務 |
|---|---|
| `code` VarChar(3) | 品牌代碼（例：VAG、BMW、OEM）|
| `name` VarChar(100) | 品牌名稱顯示 |
| `countryId` | 品牌國家（VAG → DE 德國、MANN → DE 德國）|
| `sortNo` | 下拉顯示順序 |

⭐ **partBrand = 料件本身的品牌**（汽車品牌 OE 件如 VAG/BMW、副廠件如 MANN/MEYLE）、**不是「供應商品牌」**。

### 3.2 partBrand reverse 揭露（只 2 條）

```
line 842：rev_Nx01Part_partBrandId        → 該品牌有哪些料件
line 843：rev_Nx03StItem_partBrandId      → 該品牌曾被同行調貨過哪些
```

⚠️ **partBrand 主檔 0 條 reverse 指向 Nx01Partner**：品牌-供應商完全脫鉤、無「該品牌的代理商列表」、無「該品牌的優先供應商」。

### 3.3 同一料件多廠商供應業界場景

| 場景 | NEXORA schema 支援 |
|---|---|
| 同 partId 多廠商 PO 歷史 | ✅ Po.supplierId 多元、PoItem.partId 同一個 |
| 同 partId 比價（同期多廠商 RFQ）| ✅ Rfq + RfqItem + Qt 三表並存 |
| 同 partId「主供應商」標記 | ❌ 0 欄、需 application 推算 |
| 同 partId 「次要供應商」備援 | ❌ 0 欄、需業務手動指定 |
| 同 partBrand 多代理商 | ⚠️ 純靠 PoItem.partId → Part.partBrandId 反推「過去採購某品牌的廠商列表」、無主檔 |
| 同廠商代理多品牌 | ⚠️ 純靠 PoItem.partId → Part.partBrandId 反推、無主檔 |

### 3.4 partBrand vs partner 關係結論

⭐ **NEXORA 採「兩維度獨立模型」**：
```
料件維度：Nx01Part.partBrandId → Nx01PartBrand（汽車品牌 / OE 副廠分類）
廠商維度：Nx01Partner.partnerType=S（零件供應商）
                ↓
                ↓ 唯一連結：歷史交易單據（PO / RR / PR / RFQ / QT / TI）
                ↓
廠商-品牌關係 = 該廠商歷史單據 join Part.partBrandId 反推得出
```

**業界對標**：
- 部分大型 ERP（SAP / Oracle）走「Vendor Catalog」主檔（供應商料件型錄、含優先順位 + 單價 + leadDays + MOQ）
- NEXORA 走「歷史驅動」路徑（schema 輕量、推算複雜度交給 application 層）

### 3.5 audit-01 §5.3 partner 維度小錯誤修正

| audit-01 §5.3 寫的 | schema 真相 |
|---|---|
| 供應商 `SUP` / `BOTH` | 應為 `S` 零件供應商（無 SUP / BOTH、Nx01Partner.partnerType 5 enum：C/S/T/V/B）|
| 同行 `S` 同行 | 確實是 'S'、但與「零件供應商」共用同 code（無細分）|
| 客戶 `CUS` | 應為 `C` 客戶 |

⚠️ **audit-01 §5.3 用英文縮寫描述、應修正為 schema 真實 1-char enum 'C/S/T/V/B'**。本檔此處留 verify 修正、audit-01 不回改（既存事實留檔、修正記錄在 audit-02）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記：採購建議單 UI 範式可行路徑揭露

### 路徑 A：純歷史推算（schema 0 改、純 service / UI）

```
GET /nx02/purchase-suggestion?supplierId=xxx
  → query Nx02Po + Nx02PoItem（or Nx02Rr + Nx02RrItem）反推
  → SELECT DISTINCT part_id, last_purchase_date, avg_unit_cost
  → join AR shortage candidate（PartStockSetting onHand < minQty）
  → 顯示「該廠商歷史供應 + 當前缺貨」交集
```

| 優 | 缺 |
|---|---|
| 0 schema 改動、最低風險 | 反推 query 複雜、N+1 風險（廠商多時）|
| 對齊現有設計（schema 輕量）| 無主檔層「優先供應商」標記、純歷史排序 |
| 與 AR 自動補貨 demand 鏈無縫 | 新廠商無歷史 → 採購建議單空白 |

### 路徑 B：補主檔層中間表（schema 加表）

候選新表（純揭露、不開工）：

```prisma
model Nx02PartnerPart {
  id              String   @id @default(dbgenerated("..."))
  tenantId        String   @map("tenant_id")
  partnerId       String   @map("partner_id")    // FK Nx01Partner partner_type=S
  partId          String   @map("part_id")        // FK Nx01Part
  isPrimary       Boolean  @default(false)        // 主要供應商標記
  supplierPartNo  String?  @map("supplier_part_no")  // 廠商料號（雙料號對應）
  defaultUnitCost Decimal? @map("default_unit_cost") @db.Decimal(14,4)
  defaultLeadDays Int?     @map("default_lead_days")
  moq             Decimal? @db.Decimal(14,4)      // 最小訂購量
  source          String   @default("S") @db.VarChar(1)  // S=system/M=manual（仿 AR Q-S1=A）
  validFrom       DateTime?
  validTo         DateTime?
  isActive        Boolean  @default(true)
  // audit 7 標準欄
  @@unique([tenantId, partnerId, partId, validFrom])
  @@index([tenantId, partnerId])
  @@index([tenantId, partId])
  @@map("nx02_partner_part")
}
```

| 優 | 缺 |
|---|---|
| 業界 SAP/Oracle Vendor Catalog 對標 | schema +1 表、需 IMPL + migration |
| 「主要供應商」「廠商料號」「leadDays default」全 explicit | 主檔需業務維護、漂移風險 |
| 採購建議單可純主檔篩、極快 | 與歷史推算雙來源、需校驗一致性 |
| 與 AR BrandAllocationRule 範式對齊（source S/M）| 新增業務管理介面 |

### 路徑 C：混合（推薦候選）

| 階段 | 內容 |
|---|---|
| **L1 主檔層** | Nx02PartnerPart 中間表（路徑 B、isPrimary / supplierPartNo / defaultUnitCost）|
| **L2 推算層** | 採購建議單列表先讀主檔、無主檔則 fallback 歷史推算（路徑 A）|
| **L3 同步層** | nightly job 將「最近 90 天歷史 PO」自動寫入主檔（source='S' 系統建議）、業務可 source='M' 手動覆寫 |

⭐ **完美對齊 AR BrandAllocationRule v0.1.0 已落地的「source S/M 雙來源」範式**（Crown Q-S1=A）。

### Crown 拍板候選 Q

| Q | 候選 | 對齊 |
|---|---|---|
| Q-PP-1：採購建議單 partner ↔ part 策略 | a=路徑 A（純歷史）/ b=路徑 B（補主檔）/ c=路徑 C（混合）| 與 AR Q-S1 雙來源範式對齊 |
| Q-PP-2：partner_type=S 是否細分 | a=不改、語意靠開單模組 / b=拆 S=純供應商 + Q=同行 | 與 NX02-AUDIT-01 §5.3 修正連動 |
| Q-PP-3：supplierPartNo 廠商料號必填性 | a=nullable（按需建）/ b=主檔強制（業界對標 SAP）| 影響業務 onboarding 流 |
| Q-PP-4：Nx08PurchaseCache 是否啟動 | a=AR backlog（後續軌）/ b=本軌一起 | 影響反推 query 效能 |

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx02-audit-01](./nx02-audit-01.md) · [nx03-audit-04](../nx03/nx03-audit-04.md)（雙視角揭露範式）· [ar-summary](../auto-replenish/ar-summary.md)（source S/M 範式）· [nx02-worklog](./nx02-worklog.md)
