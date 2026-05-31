<!-- docs/_team/nexora-v1.2-alignment-e-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 E closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-31
> 對應分支：`feature/v1.2-alignment-e`
> 對應 tag：`v2.0.5-alignment-e-complete`
> 前棒：`docs/_team/nexora-v1.2-alignment-d-handoff.md`

---

## §1. 本軌範圍 — P1~P6 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| P1 | master-zones framework（4 主檔 zone 定義 + 意圖書 v1.1 落檔）| ✅ |
| P2 | partner 分區編輯（4 模組頁面 + 主檔中心動態 zones）| ✅ |
| P3 | part 分區編輯（3 模組頁面 + 補 sale.product.* 權限）| ✅ |
| P4 | warehouse + user 主檔中心 zoned 範式（並存 demo）| ✅ |
| P5 | 衛星表「預設+展開看全部」共用範式 + 5/2 主檔接合 | ✅ |
| P6 | closure（含總經理 STOP-1：補完客戶功能+清 DEMO/admin+砍舊版+統一範式）| ✅ |

## §2. 8 commits 整軌

| Commit | 範圍 | Insertions / Deletions |
|--------|------|------------------------|
| `de042db` | P1 framework + 意圖書 v1.1 | — |
| `7f08b0d` | P2 partner（4 入口頁 + zoned namespace）| +1520 / -30 |
| `6707eeb` | P3 part（3 入口頁 + zoned namespace + sale.product.* seed）| +1272 / -25 |
| `bdb7e91` | P4 warehouse + user zoned 並存 | +2297 / -11 |
| `5a67d7a` | P5 SatelliteSection + 5/2 主檔接合 | +292 / -22 |
| `7d7d2fc` | P6 STEP-2：清 DEMO + 已定案項目落地 | +49 / -3520 |
| `546a64e` | P6 A1~A4：PartZonedPage 補 4 功能 + 砍舊版 PartMasterPage | +505 / -675 |
| `96b3a25` | P6 B1~B5：UserZonedPage 補 5 功能 + 清 admin + 砍舊版 UserMasterPage | +759 / -3444 |

**整軌淨變動**：53 files changed、+7192 / -7574（**淨減少 382 行**、舊版/DEMO/admin 大幅清理）

---

## §3. 三個重點決策（intent v1.1）

### 3.1 決策一：partner 編輯頁依「身分類別」動態顯示分區

對照表（Alex 認可、PARTNER_TYPE → 可見 zones）：

| partnerType | 含義 | 可見 zones |
|-------------|------|-----------|
| C / O | 保養廠 / 同行 | basic + sales + delivery + finance |
| S | 供應商 | basic + delivery + finance |
| B | 銀行 | basic + finance |
| T | 物流 | basic + delivery |
| V | 一般廠商 | basic + finance |

落實位置：`features/master-zones/partner-zones.ts` 第 79~97 行 `visibleZonesByPartnerType()` + `PartnerFormZoned.tsx` 動態 zone tabs。

主檔中心**不**受身分限制、永遠顯示全 4 zone（誰能進主檔中心由 `master.partner.*` 權限控制）。

### 3.2 決策二（v1.1 修正版）：成本保密靠「兩道天然屏障」、不做欄位級隔離

| 屏障 | 落實位置 |
|------|----------|
| 屏障 1：模組權限 | 進貨頁 = `purchase.product.*` 含 cost、銷貨頁 = `sale.product.*` 含 priceA~D（本軌補 6 個 seed） |
| 屏障 2：主檔中心存取權限 | `master.product.*` 既有 6 動作（PRE-P3 grep 確認顆粒度夠細） |

**v1.1 修正撤銷**：原 v1.0 要做 service 層欄位級 RBAC、v1.1 撤回、改靠「進不去那一頁」達成、不是「頁面藏欄位」。落實在 `partDraftToBody(editableZones)` 過濾 + 各模組頁 `editableZones` 限定。

### 3.3 決策三：衛星表「預設 + 展開看全部」

`SatelliteSection` 共用元件、4 狀態（`loading` / `empty` / `backend-missing` / `ready`），預設摺疊主筆 summary、點「展開全部」inline 展開 expandedContent（不開 modal、不跳頁）。

7 衛星接合（5 ready + 2 backend-missing）：
- part：oemCodes ready（整批 PATCH）+ relations / models / versions / stockSettings ready（endpoint hint 範式骨架）
- partner：shippingAddresses / billingAddress backend-missing（後端 module 待建）
- warehouse：locations ready（endpoint 已備）
- user：roles ready（B2~B5 已 inline 編輯）+ teams backend-missing（PRO 啟用）

---

## §4. 10 頁面交付清單

| # | 路徑 | 範式元件 | editable zones |
|---|------|---------|----------------|
| 1 | `/dashboard/base/partners` | PartnerMasterPage | 無（動態 by partnerType）|
| 2 | `/dashboard/base/parts` | PartZonedPage | 無（全 4 zone）|
| 3 | `/dashboard/base/warehouses` | WarehouseZonedPage | 無（全 3 zone）|
| 4 | `/dashboard/base/users` | UserZonedPage | 無（全 4 zone、含 B1~B5 RBAC）|
| 5 | `/lab/users` | UserZonedPage | 同上（sandbox 共用範式）|
| 6 | `/dashboard/sale/customer/info` | PartnerMasterPage | basic + sales、filter C/O |
| 7 | `/dashboard/sale/product/master` | PartZonedPage | basic + sales（含 A3 依成本重算）|
| 8 | `/dashboard/purchase/product` | PartZonedPage | basic + purchase + inventory |
| 9 | `/dashboard/purchase/vendor` | PartnerMasterPage | basic + finance、filter S |
| 10 | `/dashboard/nx03/product-maintenance` | PartZonedPage | basic + inventory |
| 11 | `/dashboard/finance/account` | PartnerMasterPage | basic + finance |

---

## §5. P6 STOP-1 清除清單（總經理拍板 A）

「補完新版客戶功能再砍舊版、admin/DEMO/死碼全清」。

**清掉**：
- DEMO：`PurchaseProductManagementView`（含 mock）+ `PurchaseVendorManagementView`（1099 行 + mock）
- 舊版：`PartMasterPage`（660 行）+ `UserMasterPage`（1725 行）+ `BaseUserMasterView`（1640 行）
- 雙路徑：`/master` 子路徑 3 條 + `/zoned` 子路徑 2 條
- admin UI：UserMasterPage 內 `isAdmin` 標記 + 「系統管理員擁有所有權限」UI（隨檔案刪除清掉）
- 技術債：MARGINS hard-code（part 售價毛利率 hard-code 12/15/18/22% → 改讀 customer-grades.marginPct）+ user master 過期 hard delete vs soft delete 註解

**保留（好設計）**：
- RolePicker 過濾 SYSADMIN code（防客戶誤指派 Innova admin 職務）

**補的新版功能（PartZonedPage A1~A3）**：
| 步驟 | 內容 |
|------|------|
| A1 | 編碼規則預覽 + 分段 SEG 輸入（debounce 250ms 接 `previewPartCode`、依 `ruleSegLengths` 字數限）|
| A2 | 正廠對應料號 inline 編輯（`OemCodesInlineEditor` 取代 SatelliteSection readonly、整批 PATCH）|
| A3 | 依成本重算 ABCD（讀 `customer-grades.marginPct`、取代舊版 hard-code、缺哪級提示「請至《客戶分級基本資料》設定 A/B/C/D 毛利率」）|

**補的新版功能（UserZonedPage B1~B5）**：
| 步驟 | 內容 |
|------|------|
| B1 | 新增使用者（接既有 CreateUserDialog 帶預設密碼）|
| B2 | 指派職務 / 角色（staged ops + EntityPickerDialog<RoleDto> + SYSADMIN 過濾保留）|
| B3 | 指派隸屬倉庫（staged ops + EntityPickerDialog<WarehouseDto>）|
| B4 | 撤銷職務 / 倉庫（軟刪除、主要職務不可撤、staged toggle undo）|
| B5 | 主要職務切換（staged setPrimary、effectivePrimaryId = staged 覆蓋）|

UserFormZoned permission zone：roles 衛星 → RolesInlineSection、permission zone 末尾固定渲染 WarehousesInlineSection（warehouse 不在 USER_FIELDS）。staged 新增用反向高亮（琥珀色）標「待存檔」。

---

## §6. closure 後續軌（不在本軌 scope）

| 項目 | 工作量 | 觸發時機 |
|------|--------|---------|
| partner-shipping-address 後端 module | 1~1.5 天 | 客戶有第二筆送貨地址需求時 |
| partner-billing-address 後端 module | 1 天 | 同上 |
| 5 個 part 衛星 CRUD UI（relations / models / versions / stockSettings + oemCodes 已 ready）| 2~3 天 | 客戶有需求或 PRO 階段 |
| city/district/street picker 後端 + UI | 1~1.5 天 | PRO 階段（warehouse 結構化地址要可選） |
| user security/hr zone DTO 擴 + UI | 1.5 天 | PRO 階段 |
| user teams 衛星 + 部門/職務 | 2 天 | PRO 啟用 |
| master.logistics.* 6 個權限補 seed | 5 分鐘 | 客戶有獨立物流商管理需求時 |
| **mock-data.ts 技術債清理** | 0.5 天 | 8 個舊版 BaseXxxMasterView 清理時一併處理（Alex 登記） |

---

## §7. 後端擴欄統計

P2、P4 兩次 partner / warehouse DTO 擴欄（schema 既有、DTO/SEL/service lag）：

| 主檔 | 補的欄 |
|------|--------|
| partner (P2) | shortName / nameEn / fax / website / serviceLocation（basic）+ defaultWarehouseId / salesUserId（sales）+ defaultCurrencyId（finance）|
| warehouse (P4) | isMain / managerUserId / cityId / districtId / streetId / lane / alley / buildingNo / buildingSubNo / floor / roomNo |
| part (P5) | oemCodes Type（DTO 已支援、types lag）|

新增關聯顯示欄（`mapRow`）：
- partner：customerGradeCode/Name、supplierGradeCode/Name、defaultWarehouseCode/Name、salesUserAccount/Name、defaultCurrencyCode/Name
- warehouse：siteCode/Name、warehouseTypeCode/Name、managerUserAccount/Name

---

## §8. seed 異動

`packages/db-core/prisma/seed/system/nx01_permission.ts` 新增 6 個權限項目（純 upsert、不 reset）：

```
sale.product.list / view / create / edit / delete / export
```

對應 Alex 拍板的「v1.1 §3.2 屏障 1：售價只放銷售頁、業務不必拿主檔中心 key 也能維護售價」。

---

## §9. schema 變動：無

階段 E 全程 0 schema 變動。所有後端擴欄都是對齊 schema 既有欄位、DTO/service/UI 補對齊。`STOP-2`（破壞性 migration）規範無觸發。

---

## §10. 對齊「總經理當第一個真客戶實測」需求

| 需求 | 落實 |
|------|------|
| 測試動線不能出現假 DEMO 頁 | 採購→產品 / 採購→供應商 DEMO 全清 |
| 測試動線不能出現 Innova admin 後台功能 | UserMasterPage isAdmin UI 隨檔案刪除清掉 |
| 客戶第一次登入要自己做的事必須完整保留 | A1~A3（編碼規則 / 正廠子表 / 重算）+ B1~B5（建帳號 / 指派角色 / 指派倉庫 / 撤銷 / 主要切換）全移植進新版 |
| 改參數要生效（驗算對得起來）| MARGINS hard-code 修為讀 customer-grades.marginPct、客戶在主檔改毛利率立刻生效 |
| 路徑不能有雙路徑混淆 | /master 子路徑 3 條 + /zoned 子路徑 2 條全清、主路徑收斂 |

---

## §11. 給下棒 Hank 的 known 議題

1. **mock-data.ts 技術債未清**（features/base/users/mock-data.ts）：仍被 8 個舊版 BaseXxxMasterView 引用 `formatAuditPersonLabel` / `MOCK_CURRENT_OPERATOR_NAME`。等那 8 個視圖清理時一併處理（Alex 登記為後續軌技術債）。

2. **WAREHOUSE_MASTER config 已成死碼**：`features/base/master-config/catalog-masters.ts` 第 215 行的 `WAREHOUSE_MASTER` 已不被引用（warehouse 走 WarehouseZonedPage）。catalog-masters 還有其他 master 引用、不一併清。

3. **`/dashboard/sale/product/master` hub 入口**：已加進 sale hub `MasterSection`（桌面版）。`SalesHubMobile` 無「主檔管理」section、未加（mobile 範式不同）。

4. **5 個 part 衛星 CRUD UI 是後續軌**：oemCodes 已 ready（整批 PATCH）、其他 4 個（relations / models / versions / stockSettings）SatelliteSection 顯示「endpoint 路徑 hint」+ readonly 範式骨架、CRUD UI 列入 closure 後續軌。

5. **city/district/street picker 未接**：warehouse 結構化地址 cityId/districtId/streetId 暫用文字輸入（注「暫文字、PRO picker」）、後端無對應 endpoint。

---

## §12. tag + memory

- tag：`v2.0.5-alignment-e-complete`（merge commit + handoff 落定後打）
- memory：`project_v1_2_alignment_e_closure.md`（待寫）

---

✅ **closure 完成。等下棒接 v1.2 §15 階段 F NX05 財務或其他軌**。
