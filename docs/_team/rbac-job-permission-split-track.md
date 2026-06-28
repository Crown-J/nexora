<!-- docs/_team/rbac-job-permission-split-track.md -->
# 專軌規格：職務 ↔ 權限等級 拆分（RBAC 核心重構）

> 位置：docs/_team/rbac-job-permission-split-track.md
> 版本：v2 輕量版（2026-06-28 設計定案 + 同日實作 Step1~6）
> 狀態：✅ **已實作 Step1~6**（commit 標 `[NX-RBAC-SPLIT]`）；破壞性收舊保守留（見 §6）
>
> **實作摘要（2026-06-28）**：
> - Step1 `nx01_permission_level` 表 + `nx01_user.permission_level_id`（加性 migration）
> - Step2 `nx01_permission_level_permission` / `nx01_permission_level_view` 連結表
> - Step3 後端 `nx01/permission-levels` 模組（CRUD + 權限設定 + 畫面權限矩陣 get/set；內建 S 鎖定）
> - Step4 資料遷移：每租戶建內建 **S**（全權限）、負責人配 S
> - Step5 前端：權限等級主檔走 EntityMasterPage（與使用者基本資料同款表格）；
>   「權限設定」= 矩陣頁（/settings/permission-settings：左選等級、右勾各畫面 6 旗標、模組批勾、Alt+1/2、S 唯讀）
> - Step6 守衛過渡雙認：jwt.strategy 帶 `permissionLevelCode`、RolesGuard + permissions/mine 認 `S`=全通行；
>   使用者主檔加「權限等級」1:1 下拉
> - ⚠️ 本機 DB 已 migrate；後端改動需 **重啟 nx-api** 生效
> - ⏸ 未做（保守）：破壞性收舊（移除舊 role_permission/role_view）、229細權限 vs 畫面矩陣 gating 整合（見 §6）
> 說明：role 留作「職務主檔」、只把權限那半抽成「權限等級（permission_level）」。
> 比初版（草案 v1 重案：新建 job_position + 5~7 表大遷移）輕很多——role 表不動、權限等級 1:1 落 user 欄位。
> schema 變更（新 1 表 + 1 欄 + 2 表 rename/改 FK）+ 資料遷移 + guard 過渡雙認。實作前每步 verify、遷移先拍板。

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

## 3. 目標設計（執行長 2026-06-28 定案 · 輕量版）

**核心：role 原地不動＝職務；只把「權限那半」抽出成權限等級。**

| 概念 | 表 | 動作 | 說明 |
|---|---|---|---|
| 職務（組織） | `nx01_role`（保留） | **不動**（語意收斂為純職務） | code/name/level/teamId/departmentId；org 四欄第三層續用 |
| 權限等級（RBAC） | `nx01_permission_level`（**新**） | 建表 | code/name/isSystem/isActive/sortNo；內建 **S=全權限** |
| 細權限目錄 | `nx01_permission`（保留 229 項） | **不動** | 名稱保留 permission（不撞名） |
| 等級×細權限 | `nx01_permission_level_permission`（role_permission 改名 + FK roleId→levelId） | 改 FK | 「權限設定」詳細權限掛這 |
| 等級×畫面 | `nx01_permission_level_view`（role_view 改名 + FK roleId→levelId） | 改 FK | 畫面矩陣 R/C/U/D/Export/Approve |
| 使用者→權限等級 | `nx01_user.permissionLevelId`（**新欄、1:1**） | 加欄 | **一人一等級**；職務仍走 `nx01_user_role` |

**內建 S（執行長拍板）**：全權限等級 **code = `S`**、isSystem、鎖定。
⚠️ guard（roles.guard / is-sysadmin）**過渡期同時認 `S` 與舊 `SYSADMIN/OWNER`**，確認無誤再收舊碼（A034 教訓：guard 常數亂改會讓 production 守衛失效）。

**不再需要**（相對前一版重案）：job_position 新表、user_job_position、user_permission_level 指派表——
因 role 留作職務、且權限等級 1:1 落在 user 欄位。

---

## 4. 遷移計畫（輕量版）

1. **Schema**：建 `nx01_permission_level`；`nx01_user` 加 `permissionLevelId`；
   `role_view`→`permission_level_view`、`role_permission`→`permission_level_permission`（rename + FK 改指 level）。
2. **資料遷移**（關鍵：現 role 兼權限 → 拆出等級）：
   - 建內建 **S** 等級（= 現 SYSADMIN/OWNER 全權限那級）；
   - 既有「有掛權限」的 role → 各生成對應 permission_level，搬 role_permission/role_view；
   - 每個 user 依其 user_role「主要角色」帶出 `permissionLevelId`（1:1）。
3. **後端**：permission_level 模組（CRUD + 權限設定端點）；guard/seed 切換（過渡雙認 S）；role 模組移除權限職責、保留職務。
4. **前端**：`/settings/roles`→權限等級頁(permission_level、表格化、code 可設、S 鎖定列)；
   `/master/roles` 職務頁拿掉權限編輯；user 主檔加「權限等級」1:1 下拉。
5. **驗證 + 收舊**：確認 guard 改吃 S 無誤後，移除舊 SYSADMIN/OWNER 雙認與 role 殘留權限欄。

⚠️ migration/資料遷移屬危險命令、**必先執行長拍板**；先備份；漸進 step + 每步 verify（PRZ 規則）。

---

## 5. 過渡期現狀（拆分前）

- 拆分前 `/settings/roles`（權限等級頁）維持現狀可用（2026-06-28 已修 rows/items bug）。
- 選單「權限等級」暫接 /settings/roles；新增時後端仍 teamId 必填（拆分後解除）。
- 此頁的「改表格樣式 / 代碼可設 / 內建 S」等微調 **併入本軌一起做**、不在過渡期單獨改（避免做白工）。
