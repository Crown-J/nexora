<!-- docs/_team/nexora-v1.2-alignment-ab-fu-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 A+B FU 收尾 closure

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應分支：`feature/v1.2-alignment-ab-fu`
> 對應 tag：`v2.0.1-alignment-ab-complete`
> 前棒 handoff：`docs/_team/nexora-v1.2-alignment-ab-handoff.md`
> 對應 audit：`docs/_team/nexora-lite-v1.2-alignment-audit.md`

---

## §1. 本軌範圍 — FU-01 ~ FU-07

A1 子階段（RBAC 完成）：
- ✅ FU-01 NX02 剩餘 7 controllers
- ✅ FU-02 NX03 主要 4 controllers
- ✅ FU-03 NX03 internal 12 controllers + stock-reservation 不動
- ✅ FU-07 seed 清預設 5 角色（+ RolesGuard defer 修正）

A2 子階段（UI 收尾）：
- ✅ FU-04 兩套並存 UI 整合（9 redirects）
- ✅ FU-05 主導覽改業務語意（BusinessTopNav 新元件）
- ✅ FU-06 既有 nav/卡片掛 useHasPermission（BusinessTopNav 內建過濾）

## §2. 7 commits 整軌

| # | Commit | 範圍 |
|---|--------|------|
| 1 | `0fd76c7` | FU-01 NX02 7 controllers |
| 2 | `b0a29ad` | FU-02 NX03 主要 4 controllers |
| 3 | `8191335` | FU-03 NX03 internal 12 controllers |
| 4 | `b468d99` | FU-07 seed 清預設 5 角色 + RolesGuard defer 修正 |
| 5 | `4fe0193` | FU-04 兩套並存 UI 整合（9 redirects） |
| 6 | `ab52528` | FU-05+FU-06 業務語意主導覽 + 權限過濾 |
| 7 | 本檔 | M8 handoff |

## §3. 重點技術決策

### 3.1 RolesGuard defer 機制

**問題**：兩個 guard 並用、`@Roles('SYSADMIN','OWNER')` + `@Permission('xxx')` 並存時、自定義角色 user 即使有 permission 也被 RolesGuard 擋下。

**解法**：RolesGuard 偵測到同時有 `@Permission` 時直接 `return true`、交給 PermissionsGuard 處理。
```ts
if (requiredPermissions && requiredPermissions.length > 0) {
  return true; // PermissionsGuard 會接手
}
```

**安全保障**：兩個 guard 內都有 SYSADMIN/OWNER bypass、即使有 bug 也不會鎖死系統。

### 3.2 seed 預設角色清理

**之前**：每個租戶 7 角色（SYSADMIN/OWNER/HR/SALES/PURCHASING/WAREHOUSE/FINANCE）
**之後**：每個租戶 2 角色（SYSADMIN/OWNER）

**自動清理機制**（給已存在 dev/staging 環境）：
- `apply-role.ts` 在每次 seed 時自動 `deleteMany` 掉 deprecated 5 角色
- 連同 `nx01_role_permission` / `nx01_user_role` / `nx01_role_view` 引用一起清

**測試用戶調整**：
- LITE 4 個測試員工 → 不指派角色（負責人手動建）
- PLUS 5 個測試員工 → 同上
- PRO 7 個測試員工 → 同上

### 3.3 兩套並存 UI redirect 策略

| 退場路徑 | 目的路徑 | 理由 |
|---------|---------|------|
| `/nx02/{domestic,import,special,product,vendor}` | `/purchase/*` | NX02 5 stubs → /purchase hub 主場 |
| `/nx03/workspace` | `/inventory` | LITE 庫存中心主場 |
| `/nx03/warehouse-setting` | `/inventory/warehouse/locations` | LITE 庫位管理 |
| `/sale/qt` | `/nx04/quote` | LITE 報價 |
| `/sale/so` | `/nx04/sales-order` | LITE 銷貨 |
| `/sale/return` | `/nx04/sales-return` | LITE 銷退 |

**未動的**：
- `/sale` hub 本身（mobile SOP 入口、保留）
- `/nx02/{stock-take,transfer,balance,ledger,init,warranty-claim,...}` LITE 新功能（跟採購中心不重疊）
- `/sale/customer/*` 客戶管理子頁面
- `/dashboard/base/*` 主檔中心鋼鐵星球範式

### 3.4 BusinessTopNav 元件

對齊 v1.2 §4.2 描述的 7 entry 業務語意 nav：
- 5 業務分類：進貨 / 銷貨 / 庫存 / 財務 / 報表
- 2 secondary：主檔中心 / 設定
- 內建 `usePermissions` 過濾（v1.2 §4.1）
- 用 `pathname.startsWith` 判斷 active highlight

**整合範式**：跟既有 HomeTopBar 星球 nav 並存、不取代。元件放在 DashboardShell 子頁面頂部、`/dashboard` root 不渲染。

## §4. 驗證

- ✅ `prisma migrate deploy`（91 migrations）
- ✅ `pnpm --filter db-core seed`（三租戶全綠、SYSADMIN admin 指派、員工未綁角色）
- ✅ `pnpm --filter nx-api build`
- ✅ `pnpm --filter nx-ui build`

## §5. v1.2 §14 階段 A+B 真 closure

階段 A+B 預期目標：
- ✅ 主導覽改業務語意（v1.2 §4.1 §4.2、BusinessTopNav）
- ✅ 兩套並存 UI 整合（v1.2 §4 5 大語意分類、9 redirects）
- ✅ RBAC 用戶自定義系統（v1.2 §6 + §12.2、229 筆權限目錄 + 角色管理 UI）
- ✅ NX02/03/04 controllers 全套改 @Permission（NX04 9 / NX02 11 / NX03 18）
- ✅ 既有功能維持（SYSADMIN/OWNER safety bypass + RolesGuard defer）
- ✅ 三租戶 seed 重跑全綠（員工未綁角色、對齊 v1.2 §12.2 從零建）

## §6. 下一階段建議（v1.2 §14 階段 C～I）

按 audit 推薦順序：
1. 階段 C：開戶後台 + 匯入精靈（XL、立項）
2. 階段 D：設定精靈框架（L）
3. 階段 E：主檔分區編輯（L）
4. 階段 F：NX05 財務（L）
5. 階段 G：手機補齊（L）
6. 階段 H：NX08 報表（L+）
7. 階段 I：補連線收尾

階段 A+B 已 closure、可進階段 C。

## §7. 收尾觀察 / 未來方向（FU-after-AB）

階段 A+B closure 完成後仍可能有的觀察：

**FU-after-AB-01**：BusinessTopNav 跟 HomeTopBar 星球 nav 雙存
- 兩個並存可能對用戶造成視覺混亂
- 建議在下個階段（C / D）決定退場哪一個

**FU-after-AB-02**：Hub 卡片內部過濾
- 目前只過濾頂層 nav entry（顯示 / 不顯示）
- 各模組 hub 內部的卡片（例如 /dashboard/purchase 的多個 section / card）未掛 useHasAnyPermission
- 屬細節打磨、可在用戶實際測試後再做

**FU-after-AB-03**：登入後預設首頁
- 目前進系統預設 /dashboard（sys-dashboard）
- v1.2 §4.3 描述業務 dashboard 帶「今日提醒 / 快速入口 / 本月概況」
- 需建新 dashboard 元件、屬階段 E / F 範圍

**FU-after-AB-04**：`Nx01RoleView` 全套遷完後 deprecate
- 既有 `/dashboard/base/role-view` 仍用舊 view × permission 矩陣
- 跟新 `/dashboard/settings/roles` 觀念衝突
- 階段 E 主檔重整時順手處理

---

> 階段 A+B 真 closure 完成。tag `v2.0.1-alignment-ab-complete`。
> v1.2 §12.2 用戶自定義 RBAC 框架 + §4 主導覽業務語意 + §13 從零建範式全部落地。
> 可進階段 C 開戶後台 + 匯入精靈。
