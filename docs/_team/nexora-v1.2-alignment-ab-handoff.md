<!-- docs/_team/nexora-v1.2-alignment-ab-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 A+B closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應分支：`feature/v1.2-alignment-ab`
> 對應 tag：`v2.0.0-alignment-ab`
> 對應 audit：`docs/_team/nexora-lite-v1.2-alignment-audit.md`

---

## §1. 階段 A+B 範圍與交付

**主目標**：v1.2 §12.2 用戶自定義 RBAC 框架 + 新 nav 結構基礎。

### 1.1 已交付（10 commits）

| Commit | 範圍 | 內容 |
|--------|------|------|
| `f4d1f49` | M1 schema | `Nx01Permission` + `Nx01RolePermission` 兩張表 + migration |
| `82fc4e2` | M2 seed | 229 筆系統權限目錄（7 模組 × CRUD + 特殊動作）|
| (M3) | 後端 framework | `@Permission` decorator + `PermissionsGuard` + 管理 API |
| `6902518` | M4a NX04 | 5 controllers 遷移（so/quote/sales-return/partner-grade-history/issue-report）|
| `69aea17` | M4b NX02 | 4 controllers 遷移（rfq/po/rr/warranty-claim）|
| `e723185` | M4c NX03 | 2 controllers 遷移（stocktake/issue-report）|
| (M5+M6) | 前端 hook + UI | `useHasPermission` + 設定中心 + 角色與權限 UI |
| `a897655` | M7a | side-menu drift 修（audit W1）|
| `624f119` | M7a-add | NX04 menu 補設定入口 |

### 1.2 範式建立

**後端**：
- `@Permission('sale.quote.list')` 細粒度權限
- `PermissionsGuard` 跟 `RolesGuard` 並存
  - 過渡期：兩個都掛、`@Roles('SYSADMIN','OWNER')` 提供 safety bypass
  - SYSADMIN/OWNER 在兩個 guard 內都自動全通行（雙重保險、避免鎖死）

**前端**：
- `useHasPermission('sale.quote.create')` hook
- `useHasAnyPermission([...])` for nav / 卡片可見性
- 模組級快取、登出 `clearPermissionsCache()`

**設定中心**：
- `/dashboard/settings` 5 卡片 hub（4 個未做標 dashed）
- `/dashboard/settings/roles` 角色 list + 新增 / 停用
- `/dashboard/settings/roles/[id]` 樹狀勾權限 + 折疊 / 全選此區

---

## §2. 還沒做、屬本階段 FU 的事

### 2.1 後端 controller 遷移殘留

| 模組 | 已遷 | 未遷 | 預估規模 |
|------|------|------|---------|
| NX04 | 5 / 9 | co-estimate / credit-guard / sales-performance / so/translator | XS（屬內部支援、權限不嚴格、可保留 @Roles）|
| NX02 | 4 / 11 | partner-part / price-comparison / purchase-return / purchase-stage / purchase-suggestion / qt / rfq-greeting-template | S |
| NX03 | 2 / 19 | conversion / part-stock-setting / location / stock-query 4 主要 + auto-replenish / brand-allocation-rule / disposal / inbound / init / outbound / parcel / pk / pl / stock-balance / stock-ledger / stock-reservation / transfer 13 internal/legacy | M（主要 4 個）+ S（13 internal）|

FU 識別：`FU-align-ab-01` (NX02) / `FU-align-ab-02` (NX03 主要) / `FU-align-ab-03` (NX03 internal)

### 2.2 兩套並存 UI 整合（M7 未做完）

audit W3：3 套並存
- `/purchase` vs `/nx02` 
- `/sale` vs `/nx04`
- `/inventory` vs `/nx03`

階段 A+B 只解了 W1 drift（side-menu 把 /nx04 對到正確的新 menu）。完整整合是 L 規模、屬獨立 task。

### 2.3 主導覽改業務語意（M5 nav restructure 未做）

v1.2 §4.2 描述「NEXORA \| 進貨 銷貨 庫存 財務 報表 \| 主檔中心 設定 \| 王經理▼」橫排 nav。

目前用「頂欄星球 + 左 SubNav」（NEXORA team 早期範式）。改成 v1.2 業務語意 nav 屬大改造、列 FU。

### 2.4 「按權限顯示分類」

`useHasAnyPermission` hook 已就緒、但既有 nav / hub 卡片**沒掛上**。Crown 親測時所有 nav 仍然全顯示。

掛上方法（FU）：
```tsx
const showSales = useHasAnyPermission(['sale.quote.list', 'sale.so.list', 'sale.sr.list']);
if (!showSales) return null;
```

每個 nav entry / hub 卡片掛一個、屬機械化工作、大概 S 規模。

---

## §3. ⚠️ 注意事項給接手者

### 3.1 角色與權限的 OWNER seed 已存在

每個租戶有預設 OWNER 角色（schema 從 NX01-USER-ROLE-SCHEMA-EXTEND-01 起就有）。
建議：
- OWNER 角色不掛任何 permission（service throw Forbidden 不讓改）
- 一般 user 不應掛 OWNER 角色（OWNER 是負責人專屬）
- 一般 user 掛自定義角色（透過 `Nx01UserRole`）

### 3.2 v1.2 §13 提的「系統預設角色範本」

```
❌ 系統預設角色範本（用戶完全從零建）
```

目前 seed 還有 SALES / PURCHASING / WAREHOUSE / FINANCE / HR 5 個預設角色（從 `20260506091854_nx01_role_align_spec_v1_0` migration 來）。
v1.2 要求「完全從零建」、這 5 個應清掉、屬 FU。

⚠️ **不要立即清！** 因為現有 NX02/03/04 controller 還有用 `@Roles('SYSADMIN','OWNER','SALES'/'PURCHASING')`。
要先全套 controller 改完 `@Permission`、再清 seed 預設角色。

### 3.3 既有 Nx01RoleView 怎麼辦

目前共存：
- `Nx01RoleView`（畫面 × 權限矩陣、舊範式、`/dashboard/base/role-view` 還用）
- `Nx01RolePermission`（角色 × 系統權限、新範式、`/dashboard/settings/roles`）

過渡建議：
- 兩套並存到 NX02/03 全套遷完
- 完整遷完後、`Nx01RoleView` deprecate（schema 留、UI 退場）

### 3.4 SYSADMIN / OWNER bypass 風險

兩個 guard 都自動全通行 SYSADMIN / OWNER。**這是 safety net、但也代表：**
- 任何掛 SYSADMIN / OWNER 的 user 無視 `@Permission` 細分
- 測試時要 logout SYSADMIN / OWNER、用自定義角色 user 才能驗證 PermissionsGuard 真的拒絕

---

## §4. 驗證

- ✅ prisma migrate deploy（91 migrations）
- ✅ pnpm --filter db-core seed（system 跑、229 筆 permission 寫入）
- ✅ pnpm --filter nx-api build
- ✅ pnpm --filter nx-ui build（含新 /dashboard/settings 路由）

---

## §5. 下一階段建議（v1.2 §14 階段 C～I）

按 audit §X.2 推薦順序：
1. **階段 C：開戶後台 + 匯入精靈**（XL、需立項評估 Excel 套件）
2. **階段 D：設定精靈框架**（L、要 schema `user_page_guide`）
3. **階段 E：主檔分區編輯**（L、各模組編輯只顯示自己角度欄位）
4. **階段 F：NX05 財務作業**（L、整模組）
5. **階段 G：手機版補齊**（L、5 dock 接真實 API + 包裹編號 + 路線）
6. **階段 H：NX08 報表**（L+、含三大財報）
7. **階段 I：補連線收尾**

⚠️ 進階段 C 前、建議先解 A+B FU（controller 遷移殘留 + 權限 nav 過濾 + role 預設清掉）、避免持續累積債。

---

> 階段 A+B closure 完成。v1.2 §12.2 用戶自定義 RBAC 框架已基礎落地。
> tag `v2.0.0-alignment-ab` 已 push、可進階段 C。
