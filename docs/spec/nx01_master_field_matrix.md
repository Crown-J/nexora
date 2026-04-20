# NX01 主檔欄位對照矩陣（Schema ↔ nx-api ↔ nx-ui）

> 產出說明：對齊 [`packages/db-core/prisma/schema.prisma`](../../packages/db-core/prisma/schema.prisma) 的 `Nx01*` 模型、[`apps/nx-api/src/nx01`](../../apps/nx-api/src/nx01) 的 REST 與 DTO、[`apps/nx-ui`](../../apps/nx-ui) 主檔中心 `/dashboard/base` 與相關 `features/base`、`features/nx00` 型別／表單。  
> 狀態欄：`Y`＝已暴露且可編輯（或唯讀顯示）；`P`＝部分（唯讀或僅 create）；`-`＝刻意不暴露（安全／非主檔 UI）；`N`＝尚未對齊。

## 1. 路由與檔案對照（主檔畫面）

| Prisma 模型 | DB 表 | nx-api Controller | nx-ui 路由 / 元件 |
|---------------|--------|-------------------|-------------------|
| Nx01User | nx01_user | `nx01/users` | `/dashboard/base/users` → `BaseUserMasterView` |
| Nx01Role | nx01_role | `nx01/roles` | `/dashboard/base/roles` → `BaseRoleMasterView` |
| Nx01UserRole | nx01_user_role | （未實作 REST，UI 仍呼叫 `/user-role`） | `/dashboard/base/user-role` |
| Nx01UserWarehouse | nx01_user_warehouse | （未實作 REST） | `/dashboard/base/user-warehouse` |
| Nx01RoleView | nx01_role_view | （legacy：`/role-view` 等，非 nx01 前綴） | `/dashboard/base/role-view` |
| Nx01View | nx01_view | 同上（seed） | 內嵌於權限矩陣 |
| Nx01Part | nx01_part | `nx01/parts` | `/dashboard/base/parts` → `BasePartMasterView` |
| Nx01PartBrand | nx01_part_brand | `nx01/part-brands` | `/dashboard/base/part-brand`（`listBrand` 客戶端） |
| Nx01CarBrand | nx01_car_brand | **未實作** | `/dashboard/base/car-brand`（多為 mock／舊 path） |
| Nx01BrandCodeRule | nx01_brand_code_rule | **未實作** | `/dashboard/base/brand-code-rule` |
| Nx01PartGroup | nx01_part_group | **未實作** | `/dashboard/base/part-group` |
| Nx01PartRelation | nx01_part_relation | **未實作** | `/dashboard/base/part-relation` |
| Nx01Country | nx01_country | **未實作** | `/dashboard/base/country`（`BasePartMasterView` 曾用 `/country`） |
| Nx01Currency | nx01_currency | `nx01/currencies` | `/dashboard/base/currency` |
| Nx01Warehouse | nx01_warehouse | `nx01/warehouses` | `/dashboard/base/warehouses` |
| Nx01WarehouseType | nx01_warehouse_type | `nx01/warehouse-types`（唯讀 list） | 建議內嵌於倉庫表單 |
| Nx01Location | nx01_location | **未實作** | `/dashboard/base/location` |
| Nx01Partner | nx01_partner | `nx01/partners` | `/dashboard/base/partners` |
| Nx01CustomerGrade | nx01_customer_grade | `GET nx01/customer-grades`（唯讀 list） | Partner 表單下拉；獨立 CRUD 頁**未做** |
| Nx01WarehouseType | nx01_warehouse_type | `GET nx01/warehouse-types`（唯讀 list） | 倉庫表單可下拉；無單獨維護頁 |
| Nx01Bulletin | nx01_bulletin | `nx01/bulletins` | `/dashboard/base/bulletins`（唯讀列表） |
| Nx01DiscountCode | nx01_discount_code | **未實作** | 建議後續 base 或 NX04 |
| Nx01Department | nx01_department | **未實作** | 建議 NX07／組織 |
| Nx01Team / Nx01UserTeam | nx01_team, nx01_user_team | **未實作** | 建議 LITE-CORE 後補 |
| Nx01CalendarEvent | nx01_calendar_event | **未實作** | 建議行事曆模組 |
| Nx01KpiTemplate 等 | nx01_kpi_* | **未實作** | 建議 NX08 |
| Nx01AuditLog | nx01_audit_log | 寫入由 `Nx01AuditLogWriterService` | 不進主檔維護 |

## 2. Nx01Part（nx01_part）

| 欄位 (Prisma) | nx-api DTO / Service | nx-ui PartDto / 表單 |
|---------------|----------------------|----------------------|
| id | list/get 回傳 | Y |
| tenantId | 內部 | - |
| codeRuleId | Create/Update | Y |
| code | Create；Update 可擴充 | Y |
| name | Y | Y |
| isOem | Create；Update | Y |
| secCode | Create；Update | Y |
| seg1～seg5 | Create；Update | Y |
| countryId | Create；Update | Y |
| partBrandId | Create；Update | Y |
| type（零件類型 A/B/C/D） | Create/Update 以 `partType` 傳輸；API mapRow 輸出 `partType` | Y |
| partGroupId | Create；Update | Y |
| spec, uom, isActive | Y | Y |
| returnPolicy | Create；Update | Y（表單可選） |
| warrantyMonths | Create；Update | Y |
| priceA～priceD | Create；Update；JSON 以字串表示 Decimal | Y（表單／列表可選） |
| priceUpdatedAt, priceUpdatedBy | 唯讀；變更價格時由 service 寫入 | P（顯示） |
| created/updated* | 回傳 | Y（列表） |

## 3. Nx01Partner（nx01_partner）

| 欄位 | nx-api | nx-ui |
|------|--------|-------|
| code, name, partnerType | Create/Update | Y |
| contactName, phone, mobile, email, address, remark | Create/Update | Y |
| taxId | Create/Update | Y |
| paymentTermDomestic | Create/Update | Y |
| customerGradeId | Create/Update + `GET nx01/customer-grades` | Y（下拉） |
| creditLimit | Create/Update | Y |
| creditStatus | Create/Update | Y |
| paymentTermImport, incoterm | Create/Update | Y（客戶／供應商情境） |
| isActive | Y | Y |

## 4. Nx01Warehouse（nx01_warehouse）

| 欄位 | nx-api | nx-ui |
|------|--------|-------|
| warehouseTypeId | Create/Update | `WarehouseDto` 含欄位；表單可接 `GET nx01/warehouse-types` |

## 5. Nx01RoleView（nx01_role_view）

| 欄位 | 說明 |
|------|------|
| canApprove | Prisma 有欄位；目前 UI 矩陣仍以五維（含 `canToggleActive`↔`can_delete`）為主；**後端若補 role-view REST，需一併擴充** |

## 6. 延後／歸其他模組的主檔（僅記錄於矩陣）

| 模型 | 建議 |
|------|------|
| Nx01DiscountCode | 報價／銷售邏輯用，後續可掛 NX04 或 base 子頁 |
| Nx01Department / Nx01Team / Nx01UserTeam | 組織與遊戲化，掛 NX07 或 LITE-CORE 擴充 |
| Nx01CalendarEvent | 行事曆／儀表板模組 |
| Nx01Kpi* | NX08 經營分析 |
| Nx01RoleView.canApprove | 待 role-view REST 與 UI 矩陣一併擴充 |

## 7. 前端 API 路徑約定（2026-04 對齊）

- 主檔 REST 一律 **`/nx01/<resource>`**（與 Nest `@Controller('nx01/...')` 一致；`NEXT_PUBLIC_API_URL` 指向 nx-api 根）。
- 列表查詢參數與後端 `Nx01ListQueryDto` 一致：**`search`**（非 `q`）；分頁 `page` / `pageSize`。
- 後端分頁回傳鍵名為 **`rows`** 時，nx-ui client 正規化為 **`items`** 以符合 `PagedResult<T>`。

---

維護：Schema 變更時請同步更新本檔與對應 DTO／表單。
