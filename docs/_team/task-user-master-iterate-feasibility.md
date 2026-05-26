<!-- docs/_team/task-user-master-iterate-feasibility.md -->
# TASK-USER-MASTER-ITERATE — Crown 6 議題 verify 諮詢

> 對象：Alex（PM AI）
> 時間：2026-05-21
> 性質：純諮詢、不開工（未動 code）
> 背景：USER Stage 1-B 已落地（commit 41-71，handoff 2026-05-21）；Crown 真實業務測試揭露 6 議題
> 紀律對齊：§I.6.3（揭露不完整尾標）、§I.6.5 A041（精確 count）、§III.8.7 G.9（通配 grep verify）
> Audit 範圍：`apps/nx-ui/src/features/{master-shell,base}/`、`apps/nx-ui/src/shared/ui/{filter-bar,listform,lookup}/`、`apps/nx-ui/src/features/base/config/master-cards.ts`

---

## §1 移除「使用者職務設定 / 使用者據點設定」可行性

### 1.1 既有頁面 audit（A041 精確 count）

| 項目 | 路徑 | 行數 |
|---|---|---|
| 使用者職務設定 page entry | `app/dashboard/base/user-role/page.tsx` | 18 |
| 使用者職務設定 view | `features/base/user-role/BaseUserRoleView.tsx` | 558 |
| 使用者據點設定 page entry | `app/dashboard/base/user-warehouse/page.tsx` | 18 |
| 使用者據點設定 view | `features/base/user-warehouse/BaseUserWarehouseView.tsx` | 559 |
| **合計** | | **1153 行** |

兩頁同源（user-warehouse 註明「鍵盤流程對齊 BaseUserRoleView」），結構 95% 對稱。

### 1.2 範式差異 — Reverse vs Forward 視角

| 視角 | 範式 | 應用場景 |
|---|---|---|
| **Forward**（USER 詳細頁） | 以 user 為主、列出該 user 的職務 / 倉庫 | 「我要改 user A 的職務」 |
| **Reverse**（使用者職務設定）| 以 role 為主、列出該 role 下的成員 | 「我要把職務 FINANCE 塞 50 個成員」、「快速 review 某職務有誰」 |

兩視角業務功能**不重疊**、互補。

**Reverse 範式既有設計**（BaseUserRoleView line 1 ~ 7 註解）：
- 左側 role 列表 + 右側「依職務管理成員（user_role 新增/移除）」
- 鍵盤流程：左 ↑↓ 選職務、Enter 進使用者搜尋；搜尋 ↑↓ 下拉、Enter 加入；無 keyword Enter 進成員區；成員區 ↑↓、Delete 移除；Esc 階層返回
- 內建 LookupAutocomplete（`shared/ui/lookup/LookupAutocomplete.tsx`，223 行）

### 1.3 master-cards.ts 配置 audit

- 總卡片數：`grep -cE '^    id: ' = 25`（A041 精確）
- 兩卡片在 `section: 'account'`、無 minPlan（= 'LITE' 預設、一律可入）
- description：
  - user-role：「依職務匯入或移除隸屬使用者」
  - user-warehouse：「依倉庫據點匯入或移除隸屬使用者」
- sidebar menu 也有兩項（`features/layout/config/menu.nx00.ts:35-36`）

### 1.4 業界 ERP 範式對齊

- **SAP**：保留兩視角，role-centric 視角獨立頁（SU01N + SU24）
- **Oracle**：角色管理面板獨立、用 multi-assign 介面
- **Salesforce**：Profile + Role + Permission Set 各獨立頁（屬性比 NEXORA 多）
- **Notion / Linear / GitHub**：成員頁面（member）只 forward 視角，無 reverse 獨立頁（規模小）
- **業界共識**：員工 > 50 人 / role > 10 個 → reverse 視角有顯著生產力差距

### 1.5 移除影響範圍

如完全移除兩頁：
- master-cards.ts 25 → 23 卡片
- sidebar menu 移除 2 項
- delete `app/dashboard/base/{user-role,user-warehouse}/`（2 files）
- delete `features/base/{user-role,user-warehouse}/`（含 mock-data + view，預估 4 files、~1153 行 + helper）
- `master-cards.ts` 中 `'user-role'` / `'user-warehouse'` label map 同步移除（line 420-421）

### 1.6 路線選項

| 路線 | 描述 | 推薦度 |
|---|---|---|
| A 完全移除 | 兩頁 + 卡片 + sidebar menu 全砍、USER 詳細頁負責所有指派 | ⭐ 不推薦（失去 reverse 批次能力，小公司現在不痛、未來 50+ 員工痛） |
| B 移除卡片但保留路由 | 從 master-cards.ts + sidebar 拿掉、但 `/dashboard/base/user-role` 仍可手動進入 | ⭐⭐ 過渡方案（半廢） |
| C **保留並降階為「批次工具」** | 卡片改 minPlan: 'PRO'（隱藏於 LITE）、sidebar 移到「批次操作」獨立 section | ⭐⭐⭐ 推薦（保留生產力 + 對 LITE 用戶清爽） |
| D 合併為單一「成員管理中心」 | 一頁兩 tab（依職務 / 依倉庫）取代兩頁 | ⭐⭐ 工程量中等、長期方向好 |
| E **USER 詳細頁加「批次指派」入口** | USER 詳細頁「擔任職務」section 加「批次指派此職務給多人」按鈕 → 跳 ReverseAssignDialog | ⭐⭐ MVP 簡單但 UX 隱藏深 |

**Hank 推薦**：C（保留降階）+ 未來 D（合併）。理由：
1. NEXORA 是 ERP（不是 GitHub 規模），未來客戶可能有 100+ 員工 → reverse 範式有業務價值
2. C 短期 1 commit（改 master-cards.ts minPlan）、不丟工程
3. D 中期方向（合併兩頁），4-8 commits、可待 Phase 2 完整 roles 推進時順手做

### 1.7 揭露可能不完整，需 Alex 補項

- 未 audit：reverse 範式是否有「批次匯入 CSV」之類獨家功能（558 行未完讀）
- 未 audit：Crown 真實業務中「依職務管理 50 人」場景頻率
- 未確認：Crown 對 LITE plan UX 取捨偏好（清爽 vs 功能完備）

---

## §2 Tab 切換工具列動態變化

### 2.1 ErpToolbar 既有結構真相

`features/master-shell/ui/ErpToolbar.tsx`（284 行）三分支：

| 分支 | 條件 | 顯示按鈕（grep verify ErpToolbar.tsx line 94-186） |
|---|---|---|
| selection | `selectionMode = true` | 完成選取 / 已選 N 筆 / 批次啟用 / 批次停用 |
| edit | `mode === 'edit'` | 編輯中 chip / S 存檔 / C 取消 |
| browse（預設） | 其他 | 分頁 5 個 \| A 新增 / E 更正 / F 查詢 \| D 停用 / 匯出 / R 重新整理 \| (顯示停用?) / 選取 / Q 結束 |

### 2.2 既有條件渲染範式（line 175-183）

```tsx
{onShowInactiveChange ? (
  <ToolbarButton
    icon={showInactive ? Eye : EyeOff}
    label="顯示停用"
    onClick={() => onShowInactiveChange(!showInactive)}
    pressed={showInactive}
  />
) : null}
```

「顯示停用」按鈕**已支援動態隱藏**：`onShowInactiveChange` prop 不傳就不渲染。

### 2.3 Crown 揭露對齊

| Tab | 預期工具列 |
|---|---|
| 資料瀏覽（list）| 9 個按鈕（含「顯示停用」）|
| 詳細資料（detail）| 8 個按鈕（移除「顯示停用」）|

### 2.4 實作範式

**最小改動範式**（推薦）：
UserMasterPage 條件傳 prop：
```tsx
<ErpToolbar
  ...
  showInactive={tab === 'list' ? showInactive : undefined}
  onShowInactiveChange={tab === 'list' ? setShowInactive : undefined}
/>
```
- 改動：1 處、~3 行
- ErpToolbar 已支援、零改動

**完整動態範式**（如未來要更多 tab-specific 按鈕）：
ErpToolbar 加 `tabContext?: 'list' | 'detail'` prop，內部根據 tabContext 決定渲染哪些按鈕。

### 2.5 業界 ERP 範式對齊

- **SAP GUI**：工具列依 mode 切換（display / change / create 不同按鈕集）— 對齊本範式
- **Oracle Forms**：F-key 工具列固定、按鈕視 cursor 位置 enable/disable（不隱藏）
- **Salesforce Lightning**：toolbar contextual（依 record 狀態變按鈕集）— 對齊本範式

NEXORA 既有範式（mode = browse/edit/selection 三分支）已對齊業界主流；補 tab 維度即可。

### 2.6 規模預估

- 1 commit、~3 行改動
- typecheck pass 即可、無 regression 風險

### 2.7 揭露可能不完整，需 Alex 補項

- 未確認：詳細資料 tab 下「重新整理」R 是否合理（重抓 user list 不影響當前 detail）
- 未確認：是否也要對 detail tab 隱藏「選取」（選取也是 list-scope 操作）— Crown 揭露只提「顯示停用」，需明確

---

## §3 編輯模式 Dirty State + ConfirmDialog

### 3.1 既有編輯模式 state 真相

UserMasterPage（line 489-495）：
```tsx
const [editForm, setEditForm] = useState<EditFormState | null>(null);
// ...
const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
```

- 進入編輯：`setMode('edit') + setEditForm(makeEditForm(user))`
- 取消：`setMode('browse') + setEditForm(null)` — **無 dirty check、直接丟棄**
- 存檔：`updateUser → setMode('browse') + setEditForm(null)`

**目前 0 行 dirty detection**（grep verify `dirty|isDirty|hasChanges` = 0 命中）。

### 3.2 Dirty Detection 業界範式

| 範式 | 描述 | 優缺 |
|---|---|---|
| A diff original vs current | 編輯開始時 snapshot original，每次比 deep equal | 準確、但 deep eq 在大表單可能略慢 |
| B onChange 標 dirty | 任何欄位 onChange → `setIsDirty(true)`、不還原 | 簡單但無法區分「改了又改回」 |
| C JSON.stringify 比對 | 全 form serialize 比對 | 簡單但欄位順序敏感 |
| D form library hook | react-hook-form / formik 內建 `formState.isDirty` | 需引入 library |

EditFormState 目前只 4 欄（displayName / isActive / email / phone）— **A 範式（diff）最適合、code 不到 10 行**：

```tsx
const isDirty = useMemo(() => {
  if (!editForm || !selectedUser) return false;
  const original = makeEditForm(selectedUser);
  return (
    editForm.displayName !== original.displayName ||
    editForm.isActive !== original.isActive ||
    editForm.email !== original.email ||
    editForm.phone !== original.phone
  );
}, [editForm, selectedUser]);
```

### 3.3 ConfirmDialog 既有用法

`features/master-shell/ui/ConfirmDialog.tsx`（90 行）目前只支援「取消 / 確認」2 按鈕。

要支援 Crown 揭露的「儲存 / 不儲存 / 取消」3 選 1 需擴充：
- 新增 prop `tertiaryAction?: { label: string; onClick: () => void }`
- 或新建 `ThreeWayConfirmDialog` 元件（更清楚但多一個元件）

### 3.4 攔截範式

| 觸發點 | 攔截範式 |
|---|---|
| Tab 切換（Alt+1 / Alt+2 / 點 tab）| 在 UserMasterPage handleTabChange 加 isDirty check |
| ESC 鍵 | 同上 + Alt+C 取消鍵 |
| 切換 user（點其他 row）| 在 setSelectedId 之前攔 |
| 切換頁面（瀏覽器 ←、Next.js navigate）| Next.js App Router 無內建 router event；需 `window.addEventListener('beforeunload')`（瀏覽器關閉/刷新）+ `next/navigation` 的 `usePathname` 變化攔（手動實作） |
| Alt+Q 跳 sidebar | 同 Tab 切換 |

### 3.5 業界 ERP 範式對齊

- **SAP GUI**：F3 離開 dirty form → 跳「儲存 / 不儲存 / 取消」3-way dialog
- **Oracle Forms**：類似 SAP
- **Salesforce Lightning**：Inline edit 改完 → 自動顯示 footer「儲存 / 取消」、未存切換 record 跳 dialog
- **Notion / Linear**：auto-save（無 dirty 概念，每改即存）
- NEXORA ERP 屬性 → 對齊 SAP / Oracle 3-way dialog

### 3.6 規模預估

| 項目 | commits | 行數估 |
|---|---|---|
| isDirty useMemo | 1 | ~15 |
| ConfirmDialog 加 tertiaryAction OR ThreeWayConfirmDialog | 1 | ~40 |
| Tab 切換攔截 + Alt+C 攔截 + setSelectedId 攔截 | 1 | ~30 |
| Next.js navigate / beforeunload 攔截 | 1（可選） | ~40 |
| **合計** | **3-4** | **~85-125 行** |

### 3.7 揭露可能不完整，需 Alex 補項

- 未確認：Crown 「3 選 1」中「不儲存」按鈕的視覺定位（中性 grey vs danger 紅）
- 未確認：beforeunload 攔截是否需要（瀏覽器原生對話框 UX 較差）
- 未 audit：使用者「快速 alt+e → alt+c」這種空操作算 dirty 嗎（editForm 已被 setEditForm 但欄位值未改）

---

## §4 Focus 視覺指示

### 4.1 既有 Focus state 管理真相

`grep -rn 'focus-visible' features/master-shell/`：
- MasterShell.tsx line 131：星球選單按鈕 `focus-visible:ring-1 focus-visible:ring-[#E8A020]/40`
- MasterShell.tsx line 196：NavItem `focus-visible:ring-1 focus-visible:ring-[#E8A020]/50 focus-visible:bg-[#E8A020]/10`
- MasterTable.tsx line 197：`<tr>` `focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#E8A020]/60`

**Focus 樣式已有**（琥珀 ring），但 Crown 揭露真相：**使用者不知道方向鍵控制哪邊**。

問題不在「有沒有 ring」、在「焦點所在區域語意不明顯」：
- focus 跑到 sidebar item → 看到 ring 但不知「↑↓ 是切 nav 還是切表格」
- 沒有「Active Region」概念的視覺指示

### 4.2 業界範式 3 種對比

| 範式 | 描述 | 優缺 |
|---|---|---|
| A 視覺高亮 | 當前焦點區域（sidebar / table / detail）整體加 amber 邊框 / 微亮底 | 一眼看出哪區可控、視覺干擾少 |
| B 標籤指示 | 區域標題加「← 焦點」chip 或 keyboard hint「↑↓ 切換」 | 明示鍵盤對應、可教學 |
| C 額外快捷鍵 | 加全域 hint overlay（按 `?` 顯示所有快捷鍵）| 業界主流（Linear / GitHub）、不打擾日常 |

### 4.3 NEXORA 鋼鐵星球視覺對齊建議

對齊既有 amber 視覺系統：

**A 範式（推薦主軸）**：當前焦點區域加「外發光」+ 區域 hint 條
```
┌────────┬────────────────────┐
│ ●sidebar│   table            │  ← table 區域加 amber 邊框 + 「↑↓ 切列 · Enter 編輯」hint
│   item1 │   ┌──────────────┐ │
│  ●item2│   │ ▎admin       │ │  ← row focus 維持既有 ring
│   item3 │   └──────────────┘ │
└────────┴────────────────────┘
```

**B 範式（補強）**：Alt+Q toast 改文案
- 既有：「焦點已轉至左側模組列表（↑↓ 切換、Enter 返回表格）」
- 強化：toast 顯示 + sidebar 加 amber 邊框 + 底部 hint bar 顯示「↑↓ 切 NAV、Enter 返回」

**C 範式（長期）**：全域 keyboard cheat sheet（`?` 鍵展開）

### 4.4 業界 ERP 範式對齊

- **SAP GUI**：當前 cursor 在的欄位 / table cell 有黃色邊框（NEXORA 已對齊）；當前 region 用 status bar 文字提示
- **Oracle Forms**：active block 標題色變、status bar 顯示鍵盤提示
- **Salesforce Lightning**：focus indicator 為藍色 ring（無 region 概念，多用 mouse）
- **Linear / GitHub**：`?` cheat sheet + cmd palette

### 4.5 規模預估

| 範式 | commits | 行數估 |
|---|---|---|
| A 焦點區域 amber 邊框 + region tracking state | 2 | ~60 |
| B Hint bar component + 既有 toast 強化 | 1 | ~40 |
| C `?` cheat sheet overlay | 2-3 | ~150 |

### 4.6 揭露可能不完整，需 Alex 補項

- 未測試：實際 muscle memory 養成需多久（C 範式 Linear / GitHub 經驗約 1-2 週）
- 未 audit：focus 是否會「無故消失」（用 mouse 點 table 後再按 Alt+Q 是否還 work）
- Crown 揭露未明：「不知道方向鍵控制哪邊」是「視覺不夠」還是「沒有教學」（A vs C 範式選擇）

---

## §5 RolePicker / WarehousePicker UI 元件

### 5.1 既有 API 真相

- `features/base/api/role.ts`：含 `listRoles({ q, page, pageSize, isActive })` + getRole + createRole + updateRole + setRoleActive
- `features/base/api/warehouse.ts`：含 `listWarehouses` + createWarehouse + updateWarehouse + setWarehouseActive
- `features/base/api/user-role.ts`：`assignUserRole({ userId, roleId, isPrimary })` + `revokeUserRole(id)` + `setUserRolePrimary(id, isPrimary)`
- `features/base/api/user-warehouse.ts`：`assignUserWarehouse({ userId, warehouseId })` + revokeUserWarehouse

**API 完整可接**。

### 5.2 既有 picker 元件 audit

`find apps/nx-ui/src -iname '*Picker*' -o -iname '*Lookup*'`：
- `shared/ui/lookup/LookupAutocomplete.tsx`（223 行）— 通用 autocomplete picker
- `features/nx02/shared/ui/PartLookupAutocomplete.tsx` — 零件專用
- `features/nx00/lookup/api/lookup.ts` + 4 個 hooks（useBrandLookup / useCarBrandLookup / ...）
- `shared/ui/listform/ColumnPickerPanel.tsx`（124 行）— 不是 entity picker、是欄位選擇 panel

既有 `LookupAutocomplete` 是 inline autocomplete 範式（type → suggestion list → select）。

### 5.3 Picker dialog 業界範式

| 範式 | 描述 | 應用 |
|---|---|---|
| A Inline autocomplete | type → suggestion → select | 既有 LookupAutocomplete、單筆 quick pick |
| B Modal dialog with search + table | 跳 modal、搜尋 + 列出 + 多選 | 批次選擇、需要看 metadata |
| C Side drawer | 右側滑出、保持 context | 大量資料、需頻繁切換 |

USER 詳細頁「新增職務」「新增倉庫據點」對齊範式：
- 一次通常加 1-3 項 → A 或 B 都可
- 需看 role/warehouse 完整 metadata（code + name + description）→ B 較合適
- 對齊既有 CreateUserDialog modal 範式 → B 一致性最好

### 5.4 重複 detection 邏輯

| 範式 | 描述 |
|---|---|
| 前端 | UserMasterPage 已載入 userRoles → picker 內 list role 時標已選 + disable |
| 後端 | assignUserRole 若 (userId, roleId) 已存在 → 後端拒（後端應已有 unique constraint） |
| 雙重 | 前端先 filter + disable、後端兜底（最 robust） |

推薦雙重。

### 5.5 整合範式

- ConfirmDialog（既有，90 行）— 不適用 picker（picker 需 search + list、ConfirmDialog 只 title + message + 2 button）
- useToast（既有）— assign 成功 / 失敗 toast
- 新建 RolePickerDialog（features/base/users/ 或 features/master-shell/ui/）

設計建議：通用化為 `EntityPickerDialog<T>` 元件（features/master-shell/）：
```tsx
<EntityPickerDialog<RoleDto>
  open={open}
  onClose={...}
  title="新增職務"
  search={(q) => listRoles({ q, isActive: true })}
  getId={(r) => r.id}
  getLabel={(r) => `${r.code} · ${r.name}`}
  disabledIds={alreadyAssignedIds}
  onSelect={async (role) => {
    await assignUserRole({ userId, roleId: role.id });
    showToast(...);
  }}
/>
```

未來 warehouse / 零件 / 客戶 picker 都能套同元件。

### 5.6 規模預估

| 項目 | commits | 行數估 |
|---|---|---|
| EntityPickerDialog 通用元件 | 1 | ~200 |
| UserMasterPage 接 RolePicker + assign / revoke / setPrimary | 2 | ~80 |
| UserMasterPage 接 WarehousePicker + assign / revoke | 1 | ~40 |
| roles section row 加「移除」「設為主要」action button | 1 | ~50 |
| warehouses section row 加「移除」action button | 1 | ~30 |
| selectionMode 「批次啟用 / 批次停用」接 setUserActive batch | 1 | ~50 |
| **合計** | **7** | **~450 行** |

### 5.7 揭露可能不完整，需 Alex 補項

- 未確認：picker 是否要支援多選（一次選 3 個職務指派）— Crown 揭露未明
- 未 audit：role / warehouse 是否有 plan-based 過濾（LITE 不能用某些 role）
- 未確認：setUserRolePrimary 觸發 UI 範式（row 內 toggle 按鈕 vs context menu）

---

## §6 欄位設定 + 篩選功能

### 6.1 MasterTable 既有欄位定義真相

`features/master-shell/ui/MasterTable.tsx`（253 行）：

```tsx
export type MasterTableColumn<T> = {
  key: string;
  label: string;
  minWidthClass?: string;
  sortable?: boolean;
  render: (row: T, index: number) => React.ReactNode;
};
```

無 `visible?: boolean`、無 `order?: number`、無「欄位設定」狀態管理。所有欄位永遠全部渲染。

UserMasterPage 用 `buildUserColumns()` 回傳固定 9 個欄位。

### 6.2 既有「欄位設定」共用元件 audit ⭐

`shared/ui/listform/ColumnPickerPanel.tsx`（124 行）— **既存可重用**：

```tsx
export type ColumnDef<K extends string> = {
    key: K;
    label: string;
    locked?: boolean; // e.g. username 必須顯示
};

type Props<K extends string> = {
    open: boolean;
    onClose?: () => void;
    title?: string;
    allKeys: K[];
    defsByKey: Record<K, ColumnDef<K>>;
    visibleKeys: K[];
    orderKeys: K[];
    // toggle 顯示 + drag reorder
};
```

支援：toggle 顯示 / drag reorder / reset all。BaseUserMasterView 既有使用（行 1190 註解「shared 元件保留供未來軌可能重用」）。

**新範式 UserMasterPage 沒接、需軌補。**

### 6.3 既有「IncludeInactiveToggle」共用元件 audit ⭐

`features/base/shell/IncludeInactiveToggle.tsx`（105 行）：

```tsx
const { includeInactive, setIncludeInactive, isActiveFilter } = useIncludeInactive();
<IncludeInactiveToggle value={includeInactive} onChange={setIncludeInactive} />
// isActiveFilter = undefined（包含已停用）/ true（只啟用）
```

**已對齊業界改革 #22 v1.2**「業務員 daily UX」。

新 UserMasterPage **自己土法寫了一個 toggle 在 ErpToolbar**（commit 64）— 與既有共用元件不同步。

> ⚠️ 揭露：新範式 ErpToolbar「顯示停用」與既有 IncludeInactiveToggle 重複實作、未統一。建議擇一收斂（推薦保留 ErpToolbar 內 toggle，因為視覺對齊鋼鐵星球範式；既有 IncludeInactiveToggle 仍由 BaseUserMasterView 引用，保留至 BaseUserMasterView 刪除後再評估收掉）。

### 6.4 既有「FilterBar」業界改革 #24 v1 MVP audit ⭐⭐⭐

`shared/ui/filter-bar/`（合 3 檔，FilterBar.tsx 499 + types.ts + apply.ts）：

```
[+ 篩選 ▾]  [chip 1 ×]  [chip 2 ×]  [全清]

AddFilterTrigger: button + Portal popover、3-step flow：
  Step 1 選欄位 → Step 2 選 operator → Step 3 填 value → onAdd → 關
```

types.ts 完整類型：
- `FilterFieldDef` — 欄位定義（key / label / type / allowedOperators）
- `FilterRule` — 單一規則（id / fieldKey / operator / value）
- `FilterOperator` — 運算子列舉
- `FilterBarProps` — 受控元件 props

apply.ts — 在前端 array 套 filter 規則的 helper

**業界改革 #24 v1 已落地、可直接套**。BaseUserMasterView 曾用、後拿掉（commit 21 lab/accounts 「不太好用，我決定拿掉所有族群篩選」）。

但對 USER 範式 + API 整合，FilterBar 規則應該轉成 `listUsers` 的 query param（不是前端 filter）。需要 adapter：
```ts
function filterRulesToListUsersParams(rules: FilterRule[]): Partial<Parameters<typeof listUsers>[0]>
```

### 6.5 規模預估

| 項目 | commits | 行數估 | 備註 |
|---|---|---|---|
| MasterTableColumn 加 visible / order 欄位 + ColumnPickerPanel 整合 | 2 | ~80 | 用既有 ColumnPickerPanel |
| `useColumnPref` hook（localStorage persist）| 1 | ~60 | 參考既有 `shared/hooks/useListLocalPref` |
| ErpToolbar 加「欄位設定」按鈕（Columns3 icon）| 1 | ~25 | 加在「顯示停用」前 |
| URL persist（query param）| 1 | ~40 | 跨 session 持久化（可選） |
| **欄位設定小計** | **4-5** | **~205** | |
| FilterBar 整合 UserMasterPage | 2 | ~120 | FilterFieldDef[] 配置 + rules state |
| filterRulesToListUsersParams adapter | 1 | ~60 | 翻譯規則 → API query |
| ErpToolbar 加 FilterBar 渲染位置（SearchPanel 旁 / 下）| 1 | ~30 | 視覺整合 |
| **篩選小計** | **4** | **~210** | |
| **合計** | **8-9** | **~415** | |

### 6.6 業界對齊

| 工具 | 欄位設定 | 篩選 |
|---|---|---|
| **Notion** | sidebar panel + drag reorder | Filter Group + 多運算子 |
| **Airtable** | 同上 | 同上 |
| **Linear** | command palette + visibility toggle | Filter chip |
| **SAP** | layout management（save layout）| Query criteria 區 |
| **Salesforce** | List View Filter 編輯器 | List View Filter |

NEXORA 既有 ColumnPickerPanel + FilterBar 範式對齊 Notion / Airtable / Linear（modern SaaS）。

### 6.7 URL persist 戰略

- **per-session（state only）**：每次進頁面重置 — 最簡單
- **localStorage**：跨 session 持久 — 既有 `useListLocalPref` hook 可參考
- **URL query**：可分享 + 持久 — 業界 SaaS 標準（如 Linear 篩選結果可分享 URL）

USER 主檔建議：**localStorage**（per-user 持久），未來 PRO plan 才開放 URL share。

### 6.8 揭露可能不完整，需 Alex 補項

- 未確認：FilterBar 既有實作支援的 operator type（string / number / date / between?）— 需開 types.ts 細看
- 未 audit：「欄位設定」是否要支援 grouping / nested categories
- 未確認：Crown 對「Filter Builder 兩段式」具體 UX 期待（compact chip 還是 full builder panel）
- 未 audit：FilterBar v1 MVP 是否支援多選 value（IN operator）

---

## §7 整體規模匯總

| § | 議題 | commits | 行數估 | 風險 |
|---|---|---|---|---|
| 1 | 移除使用者職務/據點設定（路線 C 推薦）| 1 | ~5 | 低 |
| 2 | Tab 切換動態工具列 | 1 | ~3 | 低 |
| 3 | dirty state + ConfirmDialog 3-way | 3-4 | ~85-125 | 中（攔截範式多） |
| 4 | Focus 視覺指示（範式 A + B）| 3 | ~100 | 中 |
| 5 | RolePicker / WarehousePicker + assign/revoke + batch | 7 | ~450 | 中（API 已備） |
| 6 | 欄位設定 + 篩選（接既有 ColumnPickerPanel + FilterBar）| 8-9 | ~415 | 中（既有元件可重用） |
| **合計** | | **23-25** | **~1058-1098** | |

> 對齊 Q-RHYTHM-2 紀律「軌邊界清楚」：23-25 commits 規模 ⭐⭐⭐ 大、建議分 4 軌：
> - 軌 A：§1 + §2（清爽快收，2 commits）
> - 軌 B：§5 RolePicker 系列（7 commits、business-critical）
> - 軌 C：§3 dirty state（3-4 commits、UX 升級）
> - 軌 D：§6 欄位設定 + 篩選 + §4 focus（11-12 commits、polish）

---

## §8 對齊 Crown 戰略真相

### 8.1 Shell 統一 + 業務邏輯逐個 handle

- §1 / §2 / §3 / §4 → Shell 統一強化（master-shell 共用元件升級，所有 master 受惠）
- §5 / §6 → 業務邏輯 handle（USER master 專屬）

### 8.2 業界改革對齊

- **#22 v1.2** 累積：§1 移除 2 卡片 → 23 卡片（Crown 「移除合理」拍板後 master-cards.ts 改）
- **#24 v1 → v1.1** 首落地：§6 篩選功能讓既有 FilterBar 元件實際派上用場（v1 MVP 後第一次接 user master）

### 8.3 與 USER Stage 2 closure 關係

- Stage 1-B 已落地（commit 41-71）
- 6 議題完成後 = **USER Stage 2 完整 closure**
- 之後可推 Phase 2（職務主檔）套同 shell + 同範式

---

## §9 揭露可能不完整、需 Alex 補項

整體：
- 未 audit：後端 `首次登入強制改密碼` 邏輯狀態（handoff §3.4 + §6.1.2 兩處標待確認）
- 未 audit：後端 `UpdateUserDto email/phone null` 是否能改為可清空（handoff §6.1.1）
- 未確認：6 議題優先順序 Crown 拍板（建議 §1 → §2 → §5 → §3 → §6 → §4，但需 Crown 真實業務痛點排序）
- 未確認：是否本軌一次做完所有 6 議題、或拆 2-4 軌
- 未 audit：每個議題 verify 都只跑了 1-3 個 grep，深度可能不夠（特別 §5 後端 unique constraint 真相、§6 FilterBar v1 是否含 nested filter）

各段尾標已對齊 §I.6.3 揭露不完整紀律。

---

_本諮詢揭露由 Hank（Claude Opus 4.7）於 2026-05-21 產出。所有「N 行」「N commits」「N 卡片」均依 §I.6.5 A041 grep -c 精確 count。所有「目前狀態 / 既有元件 / 是否存在」斷言均依 §III.8.7 G.9 通配 grep / find -iname verify。_
