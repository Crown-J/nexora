<!-- docs/nx03/nx03-audit-04.md -->

# NX03-AUDIT-04 — 儲位 schema + AUDIT-03 表 C 衝突項深掘 + 驗收異常分派 UI 歸屬

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 docs/nx03/、Crown 拍板後再決定要不要 commit）
> 撰寫者：Hank
> 日期：2026-05-16
> 真實 main HEAD：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
> 對應前置：[AUDIT-01](nx03-audit-01.md) / [AUDIT-02](nx03-audit-02.md) / [AUDIT-03](nx03-audit-03.md)
> 觸發：Crown 拍 NX03 需求 13 題 closure、Alex 寫 overview 前最後一次 schema verify（§I.5 #22 鐵律）

---

## 任務 A：儲位 schema 真相

### A1. `Nx01Location` 完整揭露（line 647~697、共 51 行）

| 欄位 | 型別 | 必填 | 業務語意 |
|---|---|---|---|
| `id` | VarChar(15) | ✓ | NX01LOCA0000001 |
| `tenantId` | VarChar(15) | ✓ | 多租戶 FK |
| `warehouseId` | VarChar(15) | ✓ | **所屬倉庫 FK** |
| `code` | VarChar(30) | ✓ | **倉內唯一庫位代碼**（例：A-01-01、B2-03）|
| `name` | VarChar(100) | nullable | 庫位俗稱（例：靠門口、二樓左側）|
| `zone` | VarChar(20) | nullable | **區域**（例：A區、B區）|
| `rack` | VarChar(20) | nullable | **架號**（例：R01）|
| `levelNo` | Int | nullable | **層**（例：1、2、3）|
| `binNo` | VarChar(20) | nullable | **格**（例：01、02）|
| `remark` | VarChar(200) | nullable | 備註 |
| `sortNo` | Int | default 0 | 排序 |
| `isActive` | Boolean | default true | 停用不刪 |
| `createdAt/By, updatedAt/By` | — | ✓ | 多租戶必填 |

**業務語意推測（A041 證據鏈）**：

- ✅ 是「**倉內儲位**」（不是「公司營業據點」）。證據：
  - `warehouseId` 必填 → 庫位屬於倉、不是獨立地址
  - `zone / rack / levelNo / binNo` 4 欄完整覆蓋「**A 區 3 排 2 層 01 格**」3D 位置
  - 完全無 city / district / street / address 等地理欄位
- ✅ 公司營業據點地址另有 `Nx01Warehouse` 7 欄地址（cityId / districtId / streetId / lane / alley / buildingNo / buildingSubNo / floor / roomNo）已落地（schema line 1367~1384）
- ⭐ 結論：**Nx01Location 純倉內儲位、Nx01Warehouse 含倉的營業地址、兩者業務語意互補不重疊**

**Reverse 引用 NX03（A041 精確 count = 8 條、與 AUDIT-01 一致）**：

| # | Reverse | NX03 表 | 用途 |
|---|---|---|---|
| 1 | `rev_Nx03InitItem_locationId` | Nx03InitItem | 開帳明細的庫位 |
| 2 | `rev_Nx03PkItem_locationId` | Nx03PkItem | 撿貨明細的庫位 |
| 3 | `rev_Nx03StItem_fromLocationId` | Nx03StItem | 調撥**來源**庫位 |
| 4 | `rev_Nx03StItem_toLocationId` | Nx03StItem | 調撥**目標**庫位 |
| 5 | `rev_Nx03StockLedger_locationId` | Nx03StockLedger | 異動帳冊的庫位 |
| 6 | `rev_Nx03StockTakeItem_locationId` | Nx03StockTakeItem | 盤點明細的庫位 |
| 7 | `rev_Nx03InboundItem_locationId` | Nx03InboundItem | 入庫明細的庫位（Phase 5 殘留）|
| 8 | `rev_Nx03OutboundItem_locationId` | Nx03OutboundItem | 出庫明細的庫位（Phase 5 殘留）|

Nx01Location 全引用真實 = **13 條**（NX02 3 + NX03 8 + NX04 2）：
- NX02：PrItem / RrItem / TiItem（退貨 / 進貨 / 同行調貨 入庫庫位）
- NX04：SoItem / SrItem（銷貨 / 銷退 出庫庫位）

### A2. 既有「儲位」候選表盤點（grep 真相）

```
grep -n "^model.*Rack\|^model.*Shelf\|^model.*Bin\|^model.*Slot\|^model.*Position\|^model.*Storage" schema.prisma
→ 0 個獨立 model
```

⭐ **真相**：rack / shelf / bin / slot / position 4 個語意全部**已內化在 Nx01Location 欄位**（`rack / binNo / levelNo / zone`）、非獨立表。

「**A 區 3 排 2 層 01 格**」業界 muscle memory 覆蓋驗證：

| 業界語言 | Nx01Location 欄位 | 範例值 | 覆蓋狀態 |
|---|---|---|---|
| A 區 | `zone` | "A" | ✅ |
| 3 排 / R03 架號 | `rack` | "R03" | ✅ |
| 2 層 | `levelNo` | 2 | ✅ |
| 01 格 | `binNo` | "01" | ✅ |
| **整合代碼** | `code` | "A-R03-02-01" | ✅ 倉內 unique 強制 |

→ **100% 覆蓋**業界 3D 位置概念、再加 `code` 倉內唯一強制 + `name` 俗稱（靠門口）兼容老師傅口語。

### A3. 推薦階段

⭐ **結論：儲位主檔 Nx01Location 已完整、NX03 重塑階段直接使用、不需要在 NX01 升版補主檔。**

理由：
1. 4 個 3D 欄位 + code/name 共 6 欄、LITE 即提供（不是 PLUS/PRO 才有）
2. 業界 muscle memory 100% 覆蓋（zone/rack/level/bin）
3. 13 條反向引用已接通（採購 / 庫存 / 銷貨 全模組）
4. 唯一補強候選（**不在本期**、PRO 級戰略時再做）：
   - 「視覺化儲位地圖」UI（用 zone/rack/level 渲染 3D 地圖）
   - 「揀貨路徑優化」（基於 zone 鄰近 + path algorithm）
   - 「儲位熱度報表」（基於 stock_ledger by locationId 聚合到 NX08 cache）
   - 這些是 **derived view / cache / UI 層**、不需要新表

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 B：AUDIT-03 表 C 7 項衝突逐項深掘

| # | 衝突項 | 業務影響 | 重塑時處置建議 |
|---|---|---|---|
| **B1** | **codeRuleId NN**（新 NX01-05 強制必填）| NX03 庫存表全部用 `partId` FK + `partNo / partName` snapshot 字串、**0 條直接存 `partCode`**（grep verify = 0 在 NX03 backend）。NX03 不會被 codeRuleId NN 直接卡住。但若 init / stock-take UI 允許「自由輸入 partNo 後新增 part」、會繞過 codeRuleId NN guard。| **強制 part autocomplete → 選 partId、禁止自由輸入 partNo 後 auto-create part**。新 part 一律走 NX01-05 part 主檔流程（必填 codeRuleId）。NX03 init 明細 partId 必填、不接受 null。 |
| **B2** | **part_version snapshot**（NX01-17 範式）| `Nx01PartVersion` 已落地（schema line 6841、9 欄完整 snapshot：code/name/brandId/countryId/spec/priceA~D + changeReason）。但 `partVersionId` 在 NX03 schema **0 條引用**（grep verify）。NX03 ledger 只 snapshot `partNo / partName`（VarChar 200），無法回放「異動當下的料件版本」。| **重塑 `Nx03StockLedger` 補欄位**：`partVersionId String?`（FK to Nx01PartVersion）、過帳時 snapshot 當下版本 id（含 priceA~D 等完整 9 欄歷史）。Init / StockTakeItem / StItem 同步補。schema 改 + service 改 + tests 改、估 2 commit。 |
| **B3** | **6 倉 vs 4 type** | Crown 已揭露真相：H/W/S 3 種 + 多 H 擴展 = 業界 muscle memory。本項 close。| 不在 AUDIT-04 範圍、依 Crown 揭露執行。 |
| **B4** | **part_model 車型直查** | NX03 庫存表（balance/ledger/init/stock-take/transfer/shortage/setting/replenish）**0 條** 涉及 modelId / carBrandId / engineId（grep verify）。業務員「2018 Golf 7 GTI 機油濾芯查庫存」舊版完全做不到（AUDIT-03 已揭露）。| **balance / ledger UI 加「車型查料」入口**：基於 NX01-16 `Nx01PartModel` 戰略表、用「車型 → partId 集合 → 庫存查詢」。schema 無需改、只是 NX03 service 加 `findByModel(modelId)` API + UI 篩選器。這是業界第一個能做的事（AUDIT-03 Batch-R2 殺手級）。 |
| **B5** | **partner_type=T 外包物流** | `Nx03Parcel.toPartnerId` FK 已落地（schema line 2340）、但 **無 partner_type 強制**（schema 層只 FK 到 nx01_partner、不限 type）。任何 partner 都能填、缺 application 層 guard。`Nx01Partner.partnerType` 是 5 字元 VarChar（C/S/T/V/B）。| **Nx03Parcel 寫入 service 加 partner_type 校驗**：當 parcelType='C'（寄貨）時、toPartnerId 必須 partner_type 含 'T'（外包物流）；當 parcelType='D/P'（配送/自取）時、toPartnerId 必須 partner_type 含 'C'（客戶）。application-layer assertion、不動 schema。 |
| **B6** | **移動平均算法版本** | `apps/nx-api/src/shared/nx03/nx03-inventory.ts` 146 行 helper 已完整落地：`applyQtyInWithLedger` 入庫算 `(oldQ*oldA + qtyIn*unitCost) / newQ`、`applyQtyOutWithLedger` 出庫 throw `Insufficient on-hand` 校驗。算法本身對齊業界標準 ✓。但 **過帳時 unitCost 來源無 version snapshot**：unitCost 從 RR 帶（採購）或 SO 帶（銷貨），無 part_version 一致性 link。| **算法本身保留**、helper 加「**過帳時 snapshot 當下 part_version_id**」一筆參數、寫入 ledger.partVersionId。配合 B2 補 schema 欄位、不改算法本身。算法本身仍是業界第一個自動移動平均、業務員不再口算。 |
| **B7** | **location vs 7 欄地址** | A1 已校正：`Nx01Location` 純倉內儲位、`Nx01Warehouse` 7 欄地址是倉的營業地址。兩個本來就不同主檔、無衝突、AUDIT-03 表 C 此項標誤。| **無衝突、無動作**。AUDIT-03 表 C 第 7 項應撤回。 |

⚠️ B6 補充：helper 內 reserved / inTransit 已正確同步保留（不會被入庫沖掉）、算法品質高。
⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 任務 C：驗收異常分派 UI 歸屬建議

### C1. schema 真相揭露

驗收異常相關欄位 + 表（grep 真相）：

| 表 / 欄位 | line | 業務語意 |
|---|---|---|
| `Nx02RrItem.defectQty` | 2083 | 瑕疵品數量 |
| `Nx02RrItem.defectType` (D/F/W/O) | 2085 | D=外觀損壞/F=功能異常/W=規格不符/O=其他 |
| `Nx02RrItem.defectDesc` | 2087 | 瑕疵描述 |
| `Nx02RrItem.batchNo` | 2089 | 批號（供保固追蹤）|
| `Nx02RrItem.warrantyExpiredAt` | 2091 | 保固到期日（rr_date + warranty_months） |
| `Nx02RrItem.actualQty` | 2081 | 實際到貨數量 |
| `Nx02RrItem.expectedQty` | 2079 | 預計到貨數量 |
| `Nx01Part.warrantyMonths` | 752 | 保固月數、0=不保固 |
| `Nx01Part.returnPolicy` | 749 | F自由/S標準/R限制/N不可退/**W保固處理** |
| `Nx02Pr` model | 1632 | **採購退回單**（退供應商）|
| `Nx02PrItem` model | 1698 | 採購退回明細（含 returnReason E/D/F/W/O）|
| `Nx02PrItem.returnReason` | 1731 | E=數量多餘/D=外觀損壞/F=功能異常/W=規格不符/O=其他 |
| `Nx02Pr.paymentStatus` (U/P) | 1683 | 未付 → 沖 AP、已付 → 產生應收廠商退款（折讓概念）|

### C2. 三分流業務動線（schema 證據）

```
NX02 RR 驗收 → defectQty > 0 + 選 defectType (D/F/W/O)
                ↓
        ┌───────┼───────┐
        ↓       ↓       ↓
       退貨    折讓    保固
        ↓       ↓       ↓
   Nx02Pr   Nx02Pr      Nx02RrItem.warrantyExpiredAt
   (退供應商) (paymentStatus  + 後續保固索賠
              =P → 應收退款) (推測在 NX09 知識庫
                              或新表)
```

### C3. UI 歸屬建議：**屬 NX02 RR 驗收動線、不屬 NX03**

**理由（4 條）**：

1. **schema 證據**：`defectQty / defectType / defectDesc / batchNo / warrantyExpiredAt` 5 個異常欄位全部在 **Nx02RrItem 表**、不在 Nx03_* 表
2. **業務動作位置**：「驗收」是業務員在 **NX02 RR 過帳前** 的決策動作、不是 NX03 庫存被動接收
3. **三分流目的地**：
   - 退貨 → Nx02Pr（採購退回供應商）— 屬 NX02
   - 折讓 → Nx02Pr.paymentStatus + Nx05 AP 沖帳 — 屬 NX02 + NX05
   - 保固 → Nx02RrItem.warrantyExpiredAt + Nx09 索賠管理 — 屬 NX02 + NX09
   - 三分流目的地 **0 條屬 NX03**
4. **NX03 庫存的職責邊界**：只負責「過帳結果」（onHandQty += actualQty - defectQty）、不負責「分派決策」

### C4. 建議 UI 拓樸

```
NX02 RR 驗收 UI（在 NX02 採購模組）
├── RR 明細頁
│   ├── 預計數量 / 實際數量 input
│   ├── 瑕疵數量 input
│   ├── 瑕疵類型 select (D/F/W/O)
│   ├── 瑕疵描述 textarea
│   └── 【三分流按鈕區】← UI 在 NX02
│       ├── 「建立退貨單」→ 跳 NX02 Pr 新增 form（帶 batchNo / partId / defectQty）
│       ├── 「申請折讓」→ 建 Pr + 自動標 paymentStatus 處理（業務員填折讓金額）
│       └── 「歸保固」→ 寫 warrantyExpiredAt + 跳 NX09 保固管理建索賠
└── RR 過帳 (POST /post)
    └── 觸發 NX03 helper applyQtyInWithLedger
        └── qtyIn = actualQty - defectQty（淨值入庫）
            └── 寫 Nx03StockBalance + Nx03StockLedger(source=P)
```

⚠️ NX09 保固索賠表 schema 未深掘 verify、推測在 NX09 知識庫範圍、本檔不擴大查證。
⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 表 A：儲位主檔狀態（綜合）

| 項目 | 真相 | 結論 |
|---|---|---|
| 獨立儲位主檔 | Nx01Location（schema line 647~697）| 已落地 ✓ |
| 3D 位置覆蓋 | zone/rack/levelNo/binNo 4 欄 | 「A 區 3 排 2 層 01 格」100% 覆蓋 ✓ |
| 倉內 unique | code 倉內唯一 | 已強制 ✓ |
| 反向引用 NX03 | 8 條（InitItem / PkItem / StItem from+to / StockLedger / StockTakeItem / InboundItem / OutboundItem）| 已接通 ✓ |
| 總 reverse 引用 | 13 條（NX02 3 + NX03 8 + NX04 2）| 跨模組完整 ✓ |
| 推薦階段 | 直接用、不升版 | NX03 重塑階段直接使用 |

---

## 表 B：AUDIT-03 表 C 7 項衝突處置摘要

| # | 衝突項 | 影響等級 | 處置 |
|---|---|---|---|
| B1 | codeRuleId NN | 中 | NX03 UI 禁自由輸入 partNo、強制 autocomplete |
| B2 | part_version snapshot | 高 | NX03 ledger 補 partVersionId 欄、過帳時 snapshot |
| B3 | 6 倉 vs 4 type | — | Crown 已揭露 close |
| B4 | part_model 車型直查 | 高 ⭐ | NX03 service 加 findByModel API + UI 篩選（業界殺手級）|
| B5 | partner_type=T 外包物流 | 中 | Nx03Parcel 寫入加 application-layer partner_type guard |
| B6 | 移動平均算法版本 | 中 | helper 加 partVersionId 參數、算法本身保留 |
| B7 | location vs 7 欄地址 | 0 | AUDIT-03 表 C 此項撤回（非衝突）|

---

## 表 C：驗收異常分派 UI 歸屬

| 分流 | 目的地 schema | 業務動作位置 | UI 歸屬 |
|---|---|---|---|
| 退貨 | Nx02Pr / Nx02PrItem | NX02 採購退回流程 | **NX02** |
| 折讓 | Nx02Pr.paymentStatus + NX05 AP | NX02 + NX05 財務沖帳 | **NX02**（分派起點）|
| 保固 | Nx02RrItem.warrantyExpiredAt + NX09 | NX02 + NX09 知識庫 | **NX02**（分派起點）|
| **三分流分派 UI** | — | RR 驗收當下 | **NX02 RR 驗收 UI**（**不屬 NX03**）|

---

## 階段地圖

### 本期 NX03 重塑可直接做（高 ROI、無依賴新主檔）
- ✅ 直接使用 Nx01Location（儲位主檔已完備、不升版）
- ✅ B1 codeRuleId guard（前端強制 autocomplete）
- ✅ B4 part_model 車型直查（NX01-16 已 closure、可直接查）
- ✅ B5 partner_type guard（application-layer 加 assert）

### 本期 NX03 重塑配套（需 schema 改）
- ⭐ B2 + B6 part_version snapshot（重塑核心、ledger 改+helper 改）
  - schema: `Nx03StockLedger.partVersionId String?` + 同步 InitItem / StItem / StockTakeItem
  - helper: applyQtyInWithLedger / applyQtyOutWithLedger 接收 partVersionId 參數
  - estimate: 1 migration + 2 commit

### 不屬 NX03 重塑範圍（轉給 NX02 / NX09）
- ❌ 驗收異常分派 UI → NX02 RR 模組
- ❌ 保固索賠管理 → NX09 知識庫
- ❌ 折讓沖帳邏輯 → NX02 Pr + NX05 AP

### 後續期次（PRO 戰略級、本期不做）
- 視覺化儲位地圖（3D 地圖 UI）
- 揀貨路徑優化（zone 鄰近 + algorithm）
- 儲位熱度報表（NX08 cache）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記：本檔輸出紀律對齊

- 純諮詢、不開工任何 commit、不切分支、留 main ✓
- A041 精確 count：Nx01Location 13 反向引用、NX03 0 條 partVersionId 引用、helper 146 行 verify ✓
- §G.9 verify 通配 grep：`^model.*Rack/Shelf/Bin/Slot` + `partVersionId/codeRuleId/partCode` ✓
- §I.6.3 揭露不完整：每段尾 ⚠️ 註記 ✓
- 真實 main HEAD verify：`38077c8c71c42e3a2357c4dedc309836ca362a0c` ✓
- 本檔位置：`docs/nx03/nx03-audit-04.md`（諮詢產出、未 commit、Crown 拍板後再決定）

**下一步**：Alex 整合 AUDIT-01/02/03/04 → 寫 NX03 overview → 第一份子規格書起跑。
