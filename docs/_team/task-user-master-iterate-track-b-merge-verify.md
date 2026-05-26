<!-- docs/_team/task-user-master-iterate-track-b-merge-verify.md -->
# TASK-USER-MASTER-ITERATE-TRACK-B — Merge Main 上線風險揭露

> 軌：B（USER Stage 2 補完，§5 RolePicker / WarehousePicker 系列）
> 性質：frontend UI + 後端 API 接通
> 時間：2026-05-21
> 分支：`feature/task-user-master-iterate-track-b`
> 範圍：commit B1 ~ B5（5 commits、實際對齊 feasibility §5 預估「~7 commit / ~450 行」、merge B4+B5 後 6 commits）
> 紀律對齊：§I.6.3 揭露不完整尾標、§I.6.5 A041 精確 count、§III.8.7 G.9 通配 grep verify
> 狀態：Hank stop 揭露 final state、待 Crown 拍板 merge / 進軌 C

---

## §1 軌 B 落地總覽

### 1.1 commits（A041 精確）

| # | hash | scope | 動檔數 | +/- |
|---|---|---|---|---|
| B1 | `606bfc6` | EntityPickerDialog\<T\> 通用元件進 master-shell | 1 | +359 / -0 |
| B2 | `febadc6` | UserMasterPage 接 RolePicker（assignUserRole 真接 API）| 2 | +61 / -6 |
| B3 | `24bf2b1` | 擔任職務 row 操作（設為主要 / 移除）+ 極限驗證 | 2 | +151 / -11 |
| B4 | `0bc2a73` | UserMasterPage 接 WarehousePicker + 隸屬倉庫 row 移除（B4+B5 合併）| 1 | +124 / -11 |
| B5 | `92f6370` | selectionMode 批次啟用 / 停用 接 setUserActive 串聯 | 2 | +69 / -2 |
| **合計** | | | **5 unique files**（去重）| **+764 / -30** |

### 1.2 對齊 feasibility §5 預估

| 項目 | feasibility 預估 | 實際 |
|---|---|---|
| commits | 7 | 5（B4+B5 合併、無 setRolePrimary 獨立 commit）|
| 行數 | ~450 | +764 / -30（淨 +734、含 commits 訊息以外的 code + comments）|
| 時間 | 2~3 小時 | ~1.5 小時 |
| 規模符號 | ⭐⭐ 中 | ✅ 對齊 |

行數略多於預估：補了 RoleRowActions / WarehouseRowActions 兩內聯元件 + ConfirmDialog 整合 + assigned IDs useMemo + 註解。

---

## §2 變更檔案 audit

### 2.1 新增（master-shell）

#### `apps/nx-ui/src/features/master-shell/ui/EntityPickerDialog.tsx`（359 行，新增）

通用泛型 picker 對話框、跨主檔可重用。

- 泛型 `<T>`：caller 提供 getId / getLabel / getDescription mappers
- search prop：caller 給 `(q: string) => Promise<PagedResult<T>>`
- 內建 300ms search debounce
- 多選 Set<string> + Check icon
- 已禁用項自動 disabled + 顯示「已指派」chip（dup detection）
- onConfirm 接 T[]、async；onSuccess(count) 成功後 callback
- 失敗顯示錯誤於 dialog 底、不關閉
- ESC / backdrop 關閉、提交中禁用按鈕
- 鋼鐵風樣式對齊 ConfirmDialog / CreateUserDialog

### 2.2 改動（master-shell）

#### `apps/nx-ui/src/features/master-shell/ui/MasterDetail.tsx`（B3）

- `DetailTable` rows type：`string[][]` → `React.ReactNode[][]`
- 向後相容（string 是 ReactNode subtype，現有 callers 不需改）
- 補 JSDoc 說明：適合 row action button

#### `apps/nx-ui/src/features/master-shell/ui/ErpToolbar.tsx`（B5）

- 新增 onBatchEnable?: () => void / onBatchDisable?: () => void props
- selectionMode 兩按鈕加 onClick + enabled 加 `&& !!onBatchXxx`（未提供時 disabled）
- 對外仍 optional（未來其他 master 可不接、按鈕顯示為 noop disabled）

### 2.3 改動（user master 專用）

#### `apps/nx-ui/src/features/base/users/UserMasterPage.tsx`（B2-B5 累積）

- import：
  - `listRoles, RoleDto`（B2）
  - `revokeUserRole, setUserRolePrimary`（B3）
  - `listWarehouses, WarehouseDto`（B4）
  - `assignUserWarehouse, revokeUserWarehouse`（B4）
  - `Warehouse` icon（B4）
- state：
  - `rolePickerOpen`（B2）
  - `warehousePickerOpen`（B4）
- handlers / memos（共 ~11 個）：
  - B2：assignedRoleIds / handleRolePickerSearch / handleRolePickerConfirm / handleRolePickerSuccess
  - B3：handleSetRolePrimary / handleRevokeRole
  - B4：assignedWarehouseIds / handleWarehousePickerSearch / handleWarehousePickerConfirm / handleWarehousePickerSuccess / handleRevokeWarehouse
  - B5：handleBatchSetActive / handleBatchEnable / handleBatchDisable
- handleAddRole / handleAddWarehouse 從 mock toast 改為開 picker
- 新增 RoleRowActions 元件（內聯、B3）：「設為主要」+「移除」按鈕、isPrimary 邏輯
- 新增 WarehouseRowActions 元件（內聯、B4）：僅「移除」按鈕（warehouse 無 primary）
- UserDetailView props 加 onSetRolePrimary / onRevokeRole / onRevokeWarehouse
- 擔任職務 / 隸屬倉庫 sections 動態 headers（editMode 加「操作」欄）+ rows 含 ReactNode action
- ErpToolbar 補傳 onBatchEnable / onBatchDisable

---

## §3 業界範式對齊

### 3.1 EntityPickerDialog（B1）

- multi-select + search：Notion / Linear / Salesforce Lookup
- 已選 N 項 footer hint：Linear / GitHub
- ESC / backdrop 關閉：業界 modal 通用
- 提交中 disable：業界 form 通用

### 3.2 RolePicker / WarehousePicker（B2 / B4）

- dup detection：disabledIds + 「已指派」chip（前端先濾，後端 unique constraint 兜底）
- 多選一次 assign：減少 click（業界 SaaS 批次指派慣例）

### 3.3 setUserRolePrimary 業務規則（B3）

- 業界 SAP / Oracle ERP：使用者至少 1 主要職務
- 設為主要：原主要自動取消（後端邏輯，前端只送 setUserRolePrimary(id, true)）
- 移除主要職務：前端 disable 按鈕 + 提示「請先將其他職務設為主要」

### 3.4 軟刪除（B3 / B4）

- 對齊 NEXORA 軟刪除哲學（commit 62 memory 已記載）
- revokeUserRole / revokeUserWarehouse 為軟刪除 API（resource 不真刪）
- ConfirmDialog 文案說明「可於後台稽核還原」

### 3.5 批次操作錯誤分流（B5）

- 業界 SaaS：批次操作 success / failed 分流 toast（如 Notion bulk update）
- NEXORA 範式：success/failed count 分顯，全成功 success toast、有失敗 danger toast
- Failure-tolerant：個別失敗不中斷其他項目

---

## §4 風險評估

### 4.1 視覺 / UX regression 風險

| 場景 | 風險 | 緩解 |
|---|---|---|
| EntityPickerDialog 通用化 sharing | 中（未來 caller 多） | typecheck 嚴格泛型、無 any |
| RolePicker dup detection 與後端 unique constraint 不同步 | 低（前端 disabledIds 即時更新、後端錯誤前端錯誤顯示）| 後端 unique constraint 為兜底、實際應極少觸發 |
| 批次操作中斷（部分成功）| 中 → success/failed count 顯示 | 使用者可由「顯示停用」開關重新檢視 |
| 移除主要職務的 disable 防呆 | 低（button disabled + handler 內預警 toast 雙重保險） | 即使後端拒，前端 toast 友善 |

### 4.2 schema / API 風險

- 純 frontend wire 既有 API（無 schema migration）
- API endpoint 完整存在：assignUserRole / revokeUserRole / setUserRolePrimary / assignUserWarehouse / revokeUserWarehouse
- 後端 unique constraint 兜底（前端 disabledIds 偶爾可能 stale 但後端會拒）

### 4.3 testing 覆蓋

| 測試項目 | 狀態 |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0（5 commits 各 verify 一次）|
| Lint | 未跑（軌邊界紀律）|
| 手動驗證 | 待 Crown 跑（清單 §6）|

---

## §5 順手清理 / 揭露未動

對齊 §I.6.3 揭露不完整紀律。

### 5.1 ErpToolbar 完成選取按鈕無 prop check

selectionMode 「完成選取」按鈕（`onToggleSelection`）為原有 prop、未動。批次啟用 / 停用接 prop 後，三按鈕模式不對稱：
- 完成選取：總是 enabled
- 批次啟用 / 停用：`enabled && !!onBatchXxx`

未統一。**本軌不動**：完成選取是必備功能、不應 optional。對稱性問題可後續軌透過 hook / required prop 強化。

### 5.2 EntityPickerDialog 規模

359 行單檔，已含完整 picker UI。後續若多選 dropdown 樣式變化、可能再抽 sub-component（如 PickerListItem、PickerEmpty）。本軌維持單檔簡潔。

### 5.3 業務驗證業界改革 #25 候選

「至少 1 主要職務」是業界改革 #25 候選（業界 ERP 範式）。本軌僅做按鈕 disable 預防、未做後端強制 validation。**未動**：後端 setUserRolePrimary 邏輯應已含此規則（待 verify）。

---

## §6 手動驗證清單（給 Crown）

### 6.1 RolePicker（B1 + B2）

- [ ] /dashboard/base/users 選一筆使用者 → Alt+E 進編輯 → 「擔任職務」section 看到「+ 新增職務」按鈕
- [ ] 點按鈕 → picker 跳出、auto-focus 搜尋框
- [ ] 搜尋「FINANCE」/「SALES」→ 列表顯示符合職務
- [ ] 已指派的職務應 disabled + 顯示「已指派」chip
- [ ] 多選後按「新增 (N)」→ 依序 assignUserRole → success toast「已新增 N 個職務」
- [ ] picker 關閉、列表自動 reload、新職務出現

### 6.2 擔任職務 row 操作（B3）

- [ ] 編輯模式下、有多個職務的 user 詳細頁
- [ ] 主要職務 row：「主要」chip（琥珀、disabled）+「移除」灰色 disabled
- [ ] 非主要 row：「設為主要」可點 + 「移除」鋼鐵紅可點
- [ ] 點「設為主要」→ confirm 跳出 → 確認 → 該 row 主要欄變 ✓、原主要 row 變空白
- [ ] 點「移除」→ confirm danger → row 從列表消失（軟刪除）
- [ ] 試移除唯一主要職務 → 按鈕應 disabled（無法點）

### 6.3 WarehousePicker + row 移除（B4）

- [ ] 編輯模式下、「隸屬倉庫」section 看到「+ 新增倉庫據點」按鈕
- [ ] 點按鈕 → picker 跳出、auto-focus
- [ ] 搜尋倉庫代碼 / 名稱
- [ ] 已指派應 disabled
- [ ] 多選後新增 → success toast「已新增 N 個倉庫據點」
- [ ] 每 row「移除」按鈕（編輯模式才顯示）→ confirm danger → revoke + 從列表消失
- [ ] 倉庫 row 無「設為主要」按鈕（warehouse 無 primary 概念）

### 6.4 selectionMode 批次操作（B5）

- [ ] 列表點「選取」進 selectionMode → 表格第一欄變 checkbox
- [ ] 勾選 3 筆 → 工具列「已選 3 筆」+「批次啟用」/「批次停用」可點
- [ ] 點「批次停用」→ confirm dialog danger「將勾選的 3 筆使用者批次停用？」
- [ ] 確認 → 串聯 3 次 setUserActive(id, false) → 全成功 danger toast「已批次停用 3 筆」
- [ ] 列表 reload、退回瀏覽模式、checked 清空

### 6.5 regression 驗證（不應壞）

- [ ] 軌 A §1 + §2 仍正常（卡片降階 / Tab 切換工具列）
- [ ] USER 主檔 list / search / paging / create / update / 單筆停用啟用 / 詳細頁顯示職務倉庫 全部正常
- [ ] 編輯模式 form input / Alt+S / Alt+C 全部正常

---

## §7 紀律對齊

| 紀律 | 對齊 |
|---|---|
| §I.6.3 揭露不完整尾標 | §5 順手清理 + §8 補項 + 「未動 / 未 audit」明標 |
| §I.6.5 A041 精確 count | 5 commits、5 unique files、+764/-30、實際對齊 feasibility §5 預估 7 commits（B4+B5 合併揭露） |
| §III.8.7 G.9 通配 grep | EntityPickerDialog / DetailTable / ErpToolbar 改前皆 grep verify |
| Q-RHYTHM-2 軌邊界清楚 | ~1.5 小時、5 commits、scope 明確（roles + warehouses + batch）|
| §I.5 #16（Alex 寫需求 / Hank 寫實作）| Crown 給 3 需求 + 業界 muscle memory 自由度、Hank 提 EntityPickerDialog 通用化決策 |
| 順手修紀律 | B4+B5 合併揭露 + DetailTable rows type 放寬說明 |

---

## §8 軌 B closure → 軌 C 啟動條件

### 8.1 軌 B 完成判定

- ✅ commit B1 ~ B5：通用 picker + RolePicker + 職務 row 操作 + WarehousePicker + 倉庫 row 移除 + selectionMode 批次
- ✅ typecheck pass × 5
- ✅ merge-verify 文件產出（本檔）
- ⏳ 待 Crown 手動驗證（§6 清單）
- ⏳ 待 Crown 拍板 merge / tag / 進軌 C

### 8.2 軌 C 啟動條件

軌 C 範圍預定：feasibility §3 編輯模式 dirty state + 3-way confirm dialog（預估 3-4 commits / ~85-125 行）

軌 C 啟動前置：
- 軌 B merge main（或 Crown 確認分軌並行）
- Crown 拍板「3 選 1」中「不儲存」按鈕視覺定位（中性 grey vs danger 紅）
- Crown 拍板 Next.js beforeunload 攔截是否需要（瀏覽器原生對話框 UX 較差）

### 8.3 揭露可能不完整、需 Crown 補項

- 未確認：後端 setUserRolePrimary 是否強制驗證「至少 1 主要職務」（前端只做 button disable 預防）
- 未測試：批次操作大量資料（100+ 筆）效能 — 目前串行 await、未做 parallel / batch API
- 未 audit：EntityPickerDialog search 是否需要支援分頁（目前 pageSize: 50、超過則無法看到）
- 未確認：Crown 對「未動 ErpToolbar 完成選取按鈕 prop check 對稱性」是否接受
- 未 audit：USER Stage 1-B handoff 提到的「後端首次登入強制改密碼」邏輯狀態是否仍待 verify

---

_本 merge-verify 由 Hank（Claude Opus 4.7）於 2026-05-21 產出。對齊既有 task-user-master-iterate-track-a-merge-verify.md 範式。_
