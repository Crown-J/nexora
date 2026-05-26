<!-- docs/_team/task-user-master-iterate-track-c-merge-verify.md -->
# TASK-USER-MASTER-ITERATE-TRACK-C — Merge Main 上線風險揭露

> 軌：C（USER 編輯模式紀律：staged write + dirty state + hard delete 揭露 + picker label 純化）
> 性質：純 frontend（UI + state machine 重構），無 schema / 後端 migration
> 時間：2026-05-26
> 分支：`feature/task-user-master-iterate-track-c`（堆疊在 Track B 之上、merge 將一起進 main）
> 範圍：commit C1 ~ C4（4 commits、實際 vs feasibility 預估「5-8 commits / ~150-250 行 / 2-3 小時」）
> 紀律對齊：§I.6.3 揭露不完整尾標、§I.6.5 A041 精確 count、§III.8.7 G.9 通配 grep verify
> 狀態：Hank stop 揭露 final state、待 Crown 拍板 merge

---

## §1 軌 C 落地總覽

### 1.1 commits（A041 精確）

| # | hash | scope | 動檔數 | +/- |
|---|---|---|---|---|
| C1 | `1a57190` | staged write 架構（軌 B 重大 bug 修正：Picker 確認 → 不即時寫入）| 1 | +216 / -94 |
| C2 | `bdeb1df` | dirty state + 4 攔截點 + 3-way ConfirmDialog | 2 | +248 / -93 |
| C3 | `1948135` | hard delete 紀律 known issue 揭露（backend stays soft、frontend wording 改撤銷）| 1 | +18 / -11 |
| C4 | `619c272` | Role / Warehouse picker 移除英文代碼前綴 | 1 | +6 / -4 |
| **合計** | | | **2 unique files**（去重）| **+488 / -202** |

### 1.2 對齊 feasibility 預估

| 項目 | 預估 | 實際 |
|---|---|---|
| commits | 5-8 | 4（C0 backend verify 屬調查、不計 commit）|
| 行數 | ~150-250 | +488 / -202（淨 +286）|
| 時間 | 2-3 小時 | ~2 小時 |
| 規模符號 | ⭐⭐ 中 | ✅ 對齊（C2 dirty state 攔截點較預估略多、整體在範圍內）|

### 1.3 動檔（去重）

| 檔案 | 性質 | C 段累積 +/- |
|---|---|---|
| `apps/nx-ui/src/features/base/users/UserMasterPage.tsx` | 改 | +463 / -202 |
| `apps/nx-ui/src/features/master-shell/ui/ConfirmDialog.tsx` | 改（擴 secondaryAction）| +25 / -0 |

---

## §2 變更檔案 audit

### 2.1 改動（master-shell）

#### `apps/nx-ui/src/features/master-shell/ui/ConfirmDialog.tsx`（C2、+25 行）

- 擴充 `ConfirmState` 型別：新增 `secondaryAction?: { label, onClick, variant?: 'default' | 'danger' }`
- 渲染 3 按鈕列：`[取消] [secondary] [confirm]`（secondaryAction 提供時、否則維持 2 按鈕）
- secondary danger 變體用鋼鐵紅（如「丟棄變更」）、default 用中性 grey
- 元件本身向後相容：未提供 secondaryAction 時行為與軌 B 結束時一致

### 2.2 改動（user master 專用）

#### `apps/nx-ui/src/features/base/users/UserMasterPage.tsx`（C1-C4 累積）

**C1 staged write 架構（重大 bug 修正）：**

- 新增 `RoleOp` / `WarehouseOp` union 型別：`{ kind: 'add' | 'remove' | 'setPrimary', ... }`
- 新增 `pendingRoleOps` / `pendingWarehouseOps` state（編輯模式 staged 累積、退出編輯時清空）
- 5 個 derived useMemo：`stagedRemovedRoleIds` / `stagedPrimaryRoleId` / `stagedAddedRoles` / `stagedRemovedWarehouseIds` / `stagedAddedWarehouses`
- 4 handlers 改 staged：`handleRolePickerConfirm` / `handleSetRolePrimary` / `handleRevokeRole` / `handleWarehousePickerConfirm` / `handleRevokeWarehouse`
- Toggle 模式：再次點同一筆 remove / setPrimary = 取消 staged op（無需再進新 staged）
- 業務規則：主要職務不可撤銷（依 stagedPrimaryRoleId 衍生計算）
- `handleSave` → 重構為 `performSave`（純執行）+ `handleSave` 含 confirm 包裝
- `performSave` 順序 apply：updateUser → role ops → warehouse ops，逐個成功計數、失敗計數
- Save 後清空所有 staged ops、重整三條 reloadTick

**C2 dirty state + 4 攔截點：**

- `isDirty` useMemo（編輯模式下）：表單欄位 diff OR pendingRoleOps.length>0 OR pendingWarehouseOps.length>0
- `performCancel` 抽出：reset mode/editForm/pendingOps
- `handleCancel`：clean → 直接 cancel；dirty → 3-way confirm（儲存後離開 / 丟棄變更 / 取消）
- `attemptTabChange(nextTab)`：取代 ErpTabBar onTabChange 直接 setTab + Alt+1/2 handler；dirty → 3-way confirm
- `attemptReturnToTable`：取代舊 `handleReturnToTable`、邏輯 inline；dirty → 3-way confirm
- `ErpTabBar editMode={false}`：移除「編輯模式 Tab 鎖死」、改由 attemptTabChange 動態處理 dirty
- ESC keyboard listener（編輯模式）→ 走 handleCancel 流程（dirty 自動跳 confirm）
- `beforeunload` listener：dirty 時關閉/重新整理瀏覽器 → 原生 confirm 攔截

**C3 hard delete 紀律 known issue 揭露（純 wording）：**

- import block 上方加 `⚠️ known issue` 註解：標示 revokeUserRole / revokeUserWarehouse 後端為 soft delete
- 「移除」→「撤銷」（語意對齊 soft delete）：
  - `RoleRowActions` / `WarehouseRowActions` button label + tooltip
  - 主要職務不可撤銷 toast
  - stagedRole / stagedWarehouse 待存檔 badge：「移除 N」→「撤銷 N」+「（按 S 才寫入；撤銷為軟刪除）」副標
- 主檔 `handleDelete`（USER 啟用/停用）未動：原本就明確標示為「軟刪除/可由顯示停用恢復」、與關聯表 known issue 分離

**C4 picker 主標純化：**

- RolePicker `getLabel`：`${code} · ${name}` → `name`（只顯示「系統管理員」）
- RolePicker `getDescription`：`description` → `${code} · ${description}`（英文代碼降為副標小灰字）
- WarehousePicker 同步對齊
- 搜尋仍可用英文代碼：backend `role.service.whereList` 已 `OR { code, name, description }`、warehouse.service 同（C0 已 verify）

---

## §3 設計決策 / 範式（軌 C 新增）

### 3.1 Staged write 範式（C1）

- 編輯模式 4 個關聯操作（assign/revoke role、setPrimary、assign/revoke warehouse）全改 staged，僅 `performSave` 統一 apply
- 修正軌 B 的重大 bug：原本 Picker 確認 / row action 即時打 API，按 C 取消後資料庫已寫入無法復原
- 切 user / 退出編輯時 useEffect 自動清空 staged ops（避免 leak）
- Toggle 模式：再次點同一 staged op = undo（避免 staged 列表暴增、UX 直觀）
- Add ops 不支援 toggle undo（簡化 UI 不渲染 staged-add row）；使用者反悔可按 C 取消整批

### 3.2 Dirty state 紀律（C2）

- isDirty 來源：表單欄位 diff + staged ops 數量
- 4 攔截點完整覆蓋：Tab 切換 / 左欄返回 / ESC / beforeunload
- 3-way confirm：明確讓使用者選擇「儲存後離開 / 丟棄變更 / 取消（保持編輯）」、避免 2-way confirm 的「OK 是什麼意思」歧義
- beforeunload 用瀏覽器原生 confirm（無法客製文案、為 W3C 規範）、4 攔截點中唯一例外

### 3.3 Hard delete 紀律 known issue（C3）

- 真實情況：user-role service 為 soft delete（isActive=false + revokedAt）、user-warehouse 後端缺失（軌 B B4 hidden bug、僅 dist/nx00 殘留）
- Crown 需求 3 為 hard delete；本軌不改後端（屬 Hank scope）、純 frontend 誠實揭露
- Hank 後端調整完成後本 frontend 無需動：API 介面（assign/revoke）不變、僅 backend service 改為 `prisma.delete()`
- 已加 import block 上方註解供未來追蹤

### 3.4 Picker label 純化（C4）

- 主標只顯示中文名稱（如「系統管理員」）、英文代碼降副標
- 搜尋仍可用英文代碼（backend whereList OR）
- DetailTable 未動：屬 read-only 資料明細、與 picker 互動 UX 屬不同情境

---

## §4 風險揭露 — Hank stop 完整 final state

### 4.1 typecheck

- C1 / C2 / C3 / C4 均通過 `npx tsc --noEmit -p tsconfig.json`（exit 0、無 warning）
- 4 commits 各自 typecheck 後才 commit、無中途中斷狀態

### 4.2 已知未動 / Hank backend scope（C5 後續追蹤）

- **`user-role.service.revoke()` 仍為 soft delete**：Crown 需求 3 hard delete 需 Hank 後端改 `prisma.nx01UserRole.delete()`；前端 wording 已對齊「撤銷」、待後端真改 hard delete 後 wording 可再升級為「移除」
- **user-warehouse 後端 module 不存在**：軌 B B4 引入 hidden bug（僅 dist 殘留、src/nx01 缺 module）；前端呼叫 `revokeUserWarehouse` 會 404；C3 已揭露於 import block 註解
- **批次啟用/停用（B5）**：仍直接調 setUserActive、無 staged 化（B5 屬批次工具情境、不在編輯模式內、刻意不納入 staged 紀律）

### 4.3 未測（手動驗證待 Crown）

- 4 攔截點實機驗證：Tab 切換 / 左欄返回 / ESC / beforeunload，各自 dirty / clean 兩種狀態下行為
- 3-way confirm dirty 狀態下三按鈕（儲存後離開 / 丟棄 / 取消）流程
- staged ops toggle 模式（再點 = undo）
- staged badge 顯示（「待存檔：新增 N · 撤銷 N · 變更主要職務」+「（按 S 才寫入；撤銷為軟刪除）」）
- Picker 中英搜尋（輸入「SYSADMIN」應仍能找到「系統管理員」）

### 4.4 風險評估

| 風險點 | 級別 | 說明 |
|---|---|---|
| beforeunload listener leak | 低 | useEffect cleanup 正確 removeEventListener |
| performSave 中途失敗 → 部分 staged 已 apply | 中 | 已揭露於 toast「部分變更失敗：職務 X/Y、倉庫 X/Y」、Crown 可手動補救；未來可考慮 transaction |
| user-warehouse 404 | 中 | C3 已揭露、屬 Hank backend bug、不在本軌 scope |
| 切 user 時 staged 未提示丟棄 | 低 | useEffect 自動清空、UX 上等同直接捨棄；可改進為「切 user 也觸發 dirty 攔截」（後續軌）|

---

## §5 軌 C 範式建立（供後續主檔重用）

- **編輯模式紀律完整化**：staged write + dirty state + 3-way confirm + 4 攔截點，已成完整範式
- **isDirty useMemo 模式**：form diff + staged ops count，可直接複用於 NX01-08 零件主檔、NX01-12 客戶主檔等
- **3-way ConfirmDialog**：secondaryAction prop 已加入 master-shell 共用元件、任何主檔可直接使用
- **Picker label 純化**：主中文 + 副代碼 範式可作為所有 EntityPickerDialog 預設

---

## §6 後續

- C5（本文件 + Hank stop）→ 待 Crown merge / 進下一軌
- Hank backend scope：
  - user-role.service revoke 改 hard delete
  - user-warehouse 後端 module 補完（軌 B 遺漏）
- 未來 D 軌候選（feasibility 未列）：
  - 切 user 時 staged 攔截（目前自動清空、無 confirm）
  - performSave transaction（避免中途失敗 partial apply）
  - staged-add row 渲染 +「取消新增」按鈕
