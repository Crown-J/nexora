<!-- docs/_team/rbac-job-permission-split-track.md -->
# 專軌規格：職務 ↔ 權限等級 拆分（RBAC 核心重構）

> 位置：docs/_team/rbac-job-permission-split-track.md
> 版本：草案 v1（2026-06-28 盤點）
> 狀態：⏸ **排程中、較後面做**（執行長 2026-06-28 拍板「完整拆表」、但非現在）
> 說明：把「職務（job title，組織架構用）」與「權限等級（permission level，RBAC 用）」
> 從目前共用的 `nx01_role` 一表兩用，拆成兩個獨立概念。schema breaking + 資料遷移 + 動 RBAC 核心。

---

## 1. 為什麼拆

現在 `nx01_role` 一表兩用：
- **職務面**（組織）：`code + level + teamId + departmentId`，是 org-structure「部門→組別→職務→成員」四欄樹第三層。
- **權限面**（RBAC）：`nx01_role_permission`（229 權限）+ `nx01_role_view`（畫面矩陣）+ RolesGuard 全通行。

執行長原則：**部門→組別→職務 只是組織架構；權限走「權限等級」、與組織分開**。
職務會很多（每組別各有業務員…），權限等級通常少數（S/管理/主管/一般）；人事異動不該動權限。

---

## 2. 現狀影響地圖（盤點 2026-06-28）

**核心表**（schema.prisma）：
- `nx01_role`（:1123）混合職務+權限：id/tenantId/code/name/description/**level/teamId/departmentId**/isSystem/isActive/sortNo；唯一鍵 [tenantId,code]；索引 [tenantId,teamId]。
- `nx01_user_role`（:1516）user↔role 指派：isPrimary/isActive/assignedAt…；唯一鍵 [tenantId,userId,roleId]。
- `nx01_role_view`（:1178）職務×畫面：canRead/Create/Update/Delete/Export/Approve。
- `nx01_role_permission`（:1252）職務×細權限 m:n；唯一鍵 [roleId,permissionId]。
- `nx01_permission`（:1220）229 項權限目錄（無 tenant scope、系統字典）。
- `nx01_view`（:1664）畫面目錄。
- `nx01_user`（:1322）已有 **`jobTitle`（純文字、2026-06-21、不掛權限）** 與 `roleId`（hrRole 同步）。

**全通行邏輯（不可亂動，A034 教訓）**：
- RolesGuard（shared/guards/roles.guard.ts）：`SUPER_ROLES = {SYSADMIN, OWNER}` 全通行。
- is-sysadmin.ts：`SYSADMIN_ROLE_CODE = 'SYSADMIN'` 寫死常數。
- PermissionService.listMine() 對 SYSADMIN/OWNER 回 `['*']`。
- RoleViewService / PermissionService.setForRole() 禁改 SYSADMIN/OWNER。

**後端模組（~50 檔）**：nx01/role、nx01/permission、nx01/role-view、nx01/user-role、nx01/user、shared/guards、seed（nx01_permission 229 項 / SYSADMIN+OWNER 預設 / nx01_view / nx01_role_view）。

**前端（~89 檔）**：
- `/master/roles`（職務、EntityMasterPage + ROLE_MASTER config）
- `/settings/roles`（權限/角色、RolesListView + [id] RoleDetailView）— ⚠️ 與 /master/roles **共用同一個 /nx01/roles 端點**
- `/master/role-view`（職務×畫面矩陣）
- `/master/org-structure`（四欄樹、第三層用 role）
- user-zoned / CreateUserDialog（指派角色 user-role）
- API：data/endpoints/{nx01/api/role, user-role, role-view, settings/roles/api, shared/master/role}

---

## 3. 目標設計（草案、實作前需執行長再 review）

| 概念 | 新表 | 端點 | 中文 |
|---|---|---|---|
| 職務（組織） | `nx01_job_position`（code/name/level/teamId/departmentId） | /nx01/job-positions | 職務 |
| 權限等級（RBAC） | `nx01_permission_level`（code/name/isSystem） | /nx01/permission-levels | 權限等級 |
| 細權限目錄 | `nx01_permission`（不變、229 項） | /nx01/permissions | 權限項目 |
| 使用者職務指派 | `nx01_user_job_position` | /nx01/user-job-positions | — |
| 使用者權限指派 | `nx01_user_permission_level` | /nx01/user-permission-levels | — |
| 等級×細權限 | role_permission 改指 permission_level | … | — |
| 職務×畫面 | role_view 改指 job_position（或保留給等級） | … | — |

**內建 S（執行長拍板）**：內建全權限等級 **code = `S`**、isSystem、鎖定不可改。
⚠️ guard 的 `SUPER_ROLES`/`SYSADMIN_ROLE_CODE` 常數**併入 S 時要極小心**——
建議：guard 同時認 `S` 與舊 `SYSADMIN/OWNER`（過渡期並存），確認無誤再收舊碼，避免 production 守衛失效。

---

## 4. 遷移計畫（草案）

1. **Schema 準備**：建 job_position / permission_level / 兩張指派表（不刪舊表）。
2. **資料複製**：
   - role.isSystem(SYSADMIN/OWNER) → permission_level（建 S）；
   - role(teamId 非空) → job_position；
   - user_role 依 role 性質分流到兩張新指派表；
   - role_permission/role_view 重指 FK。
3. **後端切換**：service/guard/seed 指向新表（guard 過渡期雙認）。
4. **前端切換**：拆 /master/roles(職務) 與 /settings/permission-levels(權限等級)；org 四欄第三層改職務新表；user 指派拆兩個 satellite。
5. **驗證 + 廢舊**：舊 role/user_role 改 _legacy 保留追溯。

⚠️ 危險命令（migration/遷移）必先執行長拍板；先備份；漸進式 step + 每步 verify（PRZ 規則）。

---

## 5. 過渡期現狀（拆分前）

- 拆分前 `/settings/roles`（權限等級頁）維持現狀可用（2026-06-28 已修 rows/items bug）。
- 選單「權限等級」暫接 /settings/roles；新增時後端仍 teamId 必填（拆分後解除）。
- 此頁的「改表格樣式 / 代碼可設 / 內建 S」等微調 **併入本軌一起做**、不在過渡期單獨改（避免做白工）。
