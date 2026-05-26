<!-- docs/_team/master-shell-handoff-2026-05-21.md -->
# Master Shell 範式同步：使用者主檔（鋼鐵星球）

> 對象：Alex（PM AI）
> 時間：2026-05-21
> 分支：`feature/task-master-table-polish`
> 範圍：commit 41 ~ 71（共 41 個 commit）
> 狀態：使用者主檔範式探索 → shell 抽離 → production 部署 → API 全接通，**Stage 1 完成可驗收**

---

## 0. TL;DR（一分鐘版）

1. **重做使用者主檔 UI 範式**：放棄舊 `BaseUserMasterView`（1640 行 modal 範式），改鋼鐵星球視覺 + 舊 ERP ABCDEF 工具列範式（CRUD 鍵盤快捷）
2. **抽 7 個共用 shell 元件 + 1 個 hook 進 `features/master-shell/`**：所有主檔可套（為零件主檔 / 職務主檔等預備）
3. **新範式上線到 `/dashboard/base/users`**：舊 view 暫留 codebase 觀察期、無 import
4. **完整接通 user master API**：list / search / paging / create / update / setActive / listUserRoles / listUserWarehouses
5. **建立兩條跨主檔設計規則**：
   - 系統不能刪除資料（D 鍵 = 軟刪除 = `setActive(false)`，UI 用「停用」不用「刪除」）
   - 預設密碼建立 `nexora@2026`、使用者首次登入強制改

---

## 1. 背景與目標

Crown 在 lab 沙盒（`/lab/users`）反覆迭代「使用者主檔」範式 16 次（commit 41 起），確認「鋼鐵星球 + ERP 工具列」方向後，決定推到 production 取代既有 `BaseUserMasterView`（modal 範式）。

目標：
- **單一頁範式驗證可重用**：抽 shell 後其他主檔（職務 / 零件 / 客戶 / 倉庫 ...）皆可快速套
- **保留現有 API**：不動 nx01/user backend、只動 frontend UI + API client wrapper
- **漸進、可回滾**：每步都 commit + typecheck pass，shell 抽離過程 lab 頁不間斷可用

---

## 2. 階段時間線（41 commits）

| 階段 | commits | 主軸 |
|---|---|---|
| **A 範式探索（lab）** | 41 ~ 48 | 在 `/lab/users` 沙盒迭代鋼鐵星球範式、UX 細節打磨 |
| **B Shell 抽離** | 49 ~ 55 | 抽 7 個共用元件 + 1 hook 進 `features/master-shell/` |
| **C 推到 production** | 56 ~ 58 | lab 接 API、`/dashboard/base/users` 換新範式 |
| **D API 全接通** | 59 ~ 69 | search / paging / setActive / updateUser / createUser / userRoles / userWarehouses 8 個 stage |
| **E bug fix** | 70 ~ 71 | 修 400 錯誤顯示「[object Object]」+ create/update body 欄位名對齊 |

---

## 3. 範式設計拍板紀錄（重要決策）

### 3.1 鋼鐵星球視覺系統

> commit 44 ~ 44.3 拍板

- **取消 light/dark/system 主題切換**，鎖定深灰 + 琥珀單一質感
- **4 階灰色階**（hex 寫死、不依賴主題變數）：
  - `#0A0A0C` base（頁面底）
  - `#131316` surface（sidebar / card / toolbar 底）
  - `#1A1A1F` elevated（hover / dropdown）
  - `#2A2A30` border
  - `#3A3A42` border-hi（hover/focus 加強）
- **4 階文字**：`#E8E8EB` primary / `#B8B8C0` secondary / `#888892` muted / `#5A5A60` dim
- **琥珀 accent**：`#E8A020` + 透明階（/8 /10 /12 /15 /20 /30 /40）
- **狀態色**：
  - 啟用 `#22D88F` 綠燈（含 ping 脈衝）
  - 未啟用 `#E26060` 紅燈（含 ping 脈衝）
  - Danger 鋼鐵紅 `#C84A4A` 字 + `#1F1212` 底 + `#5A2A2A` 邊
- **金屬高光**：sidebar / toolbar / thead 全部用 linear-gradient + inset top highlight (rgba(255,255,255,0.04)) 模擬鋼板邊緣
- **頁面 radial-gradient**（`#11111A` 頂 → `#06060A` 底）給「鋼鐵 + 太空」深度感

### 3.2 ERP 工具列 + Alt 快捷鍵

> commit 43 + 44.4 拍板

| 按鈕 | Letter | 行為 | 模式 |
|---|---|---|---|
| 新增 | A | 跳出 CreateUserDialog | 瀏覽 |
| 更正 | E | 進入編輯模式（Tab 切到詳細資料）| 瀏覽（有選列）|
| 查詢 | F | 開啟 SearchPanel inline 搜尋條 | 瀏覽 |
| 停用 / 啟用 | D | 軟刪除（context-aware：選啟用列 = 停用、選停用列 = 啟用）| 瀏覽（有選列）|
| 匯出 | P | dropdown：CSV / PDF / 列印 | 瀏覽 |
| 重新整理 | R | refetch list | 瀏覽 |
| 結束 | Q | 焦點移至左側 sidebar | 瀏覽 |
| 存檔 | S | confirm → updateUser → 回瀏覽 | 編輯 |
| 取消 | C | 丟棄變更 → 回瀏覽 | 編輯 |
| 選取 | — | toggle 批次模式（顯示 checkbox + 批次工具列）| 瀏覽 |
| 顯示停用 | — | toggle 列表 filter（含/不含停用使用者）| 瀏覽 |

**Tab 切換快捷鍵**：
- `Alt+1` → 資料瀏覽
- `Alt+2` → 詳細資料
- 編輯模式禁用切換

**鍵盤導航**：
- 表格列 `↑↓` 切列、`Enter` 進編輯
- Sidebar `↑↓` 切 nav item、`Enter` 返回表格 + 第一筆

### 3.3 NEXORA 不能刪除資料（軟刪除原則）

> commit 62 拍板，已寫入 memory

- 後端不提供 hard delete endpoint，只有 `setUserActive`
- 所有 master 的 D 按鈕 UI 用「停用」（icon: `PowerOff`），不用「刪除」（icon: ~~`Trash2`~~）
- ConfirmDialog 文案「軟刪除，可由系統管理員重新啟用」
- 預設列表 filter `isActive: true`，停用後從列表消失、資料保留
- selectionMode 批次只有「批次啟用 / 批次停用」，**移除批次刪除**
- 程式內部 callback 名 `onDelete` / `handleDelete` 保留（通用簽名），只動 UI label

### 3.4 預設密碼 + 首次登入強制改

> commit 67 拍板

- 建立使用者不需要管理員填密碼
- 統一預設密碼：`nexora@2026`
- 使用者首次登入時系統會要求修改（**此邏輯由後端 / 登入頁負責、本次 UI 不處理**）
- CreateUserDialog 顯示琥珀 hint 條：「初始密碼：nexora@2026，使用者首次登入時系統會要求修改」

> ⚠️ Alex 同步：請確認「首次登入強制改密碼」後端 / 登入頁是否已實作；若無需評估補強。

### 3.5 詳細頁陳列：滿版滾動 + 章節分隔

> commit 47.3 拍板（YAGNI 推進）

- **不用 tab**（會變複雜）、**不用左側索引**（小規模主檔多餘）
- 詳細頁滿版單欄滾動，章節間 1px 細分隔線
- 章節 header：琥珀小圓點 + 標題 + count badge + 英文副標題 + 右側 action
- 編輯模式才顯示「新增職務 / 新增倉庫據點」按鈕（瀏覽模式 = read-only）
- **擴充策略**：當某主檔關聯表 ≥ 6+ 個時，再評估加回左側 sticky 索引（git history 有完整實作可還原）

### 3.6 模式語意（瀏覽 / 編輯 / 選取 / 新增）

> commit 47.1 拍板

| 模式 | 觸發 | 表單欄位 | 工具列 |
|---|---|---|---|
| 瀏覽（browse）| 預設 | read-only FormField | 9 個 ERP 按鈕 |
| 編輯（edit）| Alt+E / 雙擊 | FormInput / FormSelect 可改 | 只剩 S / C |
| 選取（selection）| 點「選取」按鈕 | 第一欄變 checkbox | 批次啟用 / 批次停用 / 完成選取 |
| 新增 | Alt+A | — | — （走 modal）|

新增不採用 mode 切換而採 modal，原因：
- createUser 需要 username + password 必填（updateUser 不需要）
- modal 與 detail view 解耦、UX 清楚

### 3.7 derived 欄位：jobTitle / warehouse / username

> commit 65 + 68 + 69 拍板

- 後端 `updateUser` 不接受 username / jobTitle / warehouse
  - username 為 unique key 不可改
  - jobTitle 從 `user_role` 關聯 derived
  - warehouse 從 `user_warehouse` 關聯 derived
- 詳細頁編輯模式下這 3 欄永遠 read-only
- 之後若要改 jobTitle / warehouse，於「擔任職務 / 隸屬倉庫」區塊用 assignUserRole / assignUserWarehouse 處理（Stage 1-B 範圍外、待 Stage 2 推進）

---

## 4. 元件清單

### 4.1 features/master-shell/ui/（7 元件 + 1 hook，跨主檔可重用）

| 檔案 | 元件 / 匯出 | 行數 | 說明 |
|---|---|---|---|
| `FormField.tsx` | FormField / FormInput / FormSelect | 117 | 4 tone（amber/green/red/muted）+ read-only/input/select 三變體 |
| `ToastStack.tsx` | ToastStack + `useToast()` hook | 73 | 右上角 2.4s 自動消失、3 色（info/success/danger）|
| `ConfirmDialog.tsx` | ConfirmDialog + ConfirmState type | 90 | default / danger 兩變體、backdrop click 關閉 |
| `ErpToolbar.tsx` | ErpToolbar 主元件 + ToolbarButton + PaginationButton + ExportMenuButton + ToolbarSeparator | 284 | 三分支（browse / edit / selection）+ ToolbarButton 支援 `pressed` 狀態 |
| `MasterTable.tsx` | MasterTable\<T\> 泛型 + MasterTableColumn\<T\> + PageSizeSelector | 253 | 自動序號欄、選取模式 checkbox、zebra、鍵盤導航、sticky thead |
| `MasterDetail.tsx` | MasterDetailScroll + SectionHeader + SectionAddButton + DetailTable + EmptyDetail | 136 | 滿版滾動 + 切 user 時自動 scroll 回頂 |
| `MasterShell.tsx` | MasterShell + MasterSidebar + MasterTopHeader + PlanetModuleMenu + TopHeaderIconButton + 型別 | 469 | 外殼（radial-gradient）+ sidebar（資料驅動配置）+ TopHeader（日期時間 live clock）|
| `SearchPanel.tsx` | SearchPanel | 73 | inline 搜尋條、auto-focus、ESC 關閉 |

**合計 ~1495 行，7 個元件 1 個 hook、純展示元件、無業務邏輯耦合。**

### 4.2 features/base/users/（user master 專用）

| 檔案 | 元件 | 說明 |
|---|---|---|
| `UserMasterPage.tsx` | UserMasterPage | 使用者主檔組合元件（共用於 `/lab/users` + `/dashboard/base/users`）|
| `CreateUserDialog.tsx` | CreateUserDialog | 新增使用者 modal（5 欄 + 預設密碼 hint）|
| ~~`BaseUserMasterView.tsx`~~ | （deprecated）| 暫留 codebase、無 import、觀察一週後可刪 |

### 4.3 受影響的全域檔案

- `features/layout/ui/DashboardShell.tsx`：加路徑 bypass，當 `pathname === '/dashboard/base/users'` 時跳過 chrome（讓 UserMasterPage 自帶 MasterShell 主導）
- `shared/api/http.ts`：`extractHttpErrorMessage` 補處理 NestJS ValidationError 物件陣列（修「[object Object]」顯示）
- `features/base/api/user.ts`：`createUser` / `updateUser` body 內部 transform 欄位名（username → userAccount、displayName → userName）

### 4.4 後端（無動）

- `nx-api/src/nx01/user/`：全部維持，包含 CreateUserDto / UpdateUserDto / controller / service

---

## 5. API 整合狀態

### 5.1 已接通（Stage 1-B）

| API | 觸發 | 落地 commit |
|---|---|---|
| `listUsers({ q, page, pageSize, isActive })` | 進入頁面 / 切頁 / 搜尋 / 顯示停用 | 56, 59, 60, 63 |
| `setUserActive(id, isActive)` | D 停用 / D 啟用（context-aware）| 61 |
| `updateUser(id, body)` | S 存檔 | 65 |
| `createUser(body)` | A 新增對話框送出 | 66, 67, 71 |
| `listUserRoles({ userId, isActive })` | 進詳細頁時自動載入 | 68 |
| `listUserWarehouses({ userId, isActive })` | 進詳細頁時自動載入 | 69 |

### 5.2 尚未接通（Stage 1-B 範圍外，待 Stage 2）

- `assignUserRole` / `revokeUserRole` / `setUserRolePrimary` — 新增職務 / 撤銷 / 切換主要職務（需 RolePicker UI）
- `assignUserWarehouse` / `revokeUserWarehouse` — 新增倉庫 / 撤銷（需 WarehousePicker UI）
- selectionMode 批次操作（「批次啟用 / 批次停用」按鈕目前還是 noop）

---

## 6. 已知問題 / 待辦

### 6.1 影響使用體驗

1. **email / phone 無法清空**：後端 UpdateUserDto 不接 null，client 內部把 null 過濾掉、保留原值。UI 上把欄位清空提交後值不變。
   - 對策方向：後端開放 null、或前端加「清除 email」按鈕送特殊值
2. **首次登入強制改密碼邏輯未驗證**：commit 67 假設後端 / 登入頁有此邏輯。Alex 請確認。
3. **批次操作 mock 中**：selectionMode 下「批次啟用 / 批次停用」是 noop。需 Stage 2 接 API。

### 6.2 技術債

1. **lab/users 與 production 同源但雙路徑並存**：`/lab/users` + `/dashboard/base/users` 都引用 UserMasterPage。lab 作為沙盒備援，未來可考慮收掉。
2. **BaseUserMasterView 暫留**：無人 import，觀察一週後可刪（features/base/users/BaseUserMasterView.tsx + mock-data.ts）。
3. **SidebarConfig 寫死在 UserMasterPage**：sidebar 6 個 section 的配置直接寫死。其他 master 推進時要思考是否抽出全域配置（建議：features/base/config/master-sidebar.ts）。
4. **HeaderConfig.countBadge.text 寫死「5 位使用者」**：實際應該綁 `total` state 動態計算。

### 6.3 視覺 / UX 細節

1. SearchPanel 與 ErpTabBar 之間沒有明確分隔（搜尋面板開啟時略顯擁擠）
2. ConfirmDialog 的 onConfirm 是同步呼叫，async API call 在背景跑（dialog 已關），失敗只能用 toast 提示
3. CreateUserDialog 內 email / phone 順序 vs UserDetailView 不一致（前者 信箱/電話 後排，後者 信箱/電話 中排）

---

## 7. 跨主檔擴充範式（給 Stage 2 推進用）

要把鋼鐵星球範式套到下一個 master（如 職務主檔 / 零件主檔），照下面 5 步即可：

```tsx
// features/base/roles/RoleMasterPage.tsx（職務主檔範例）
'use client';

import { MasterShell, type SidebarConfig, type HeaderConfig } from '@/features/master-shell/ui/MasterShell';
import { ErpToolbar } from '@/features/master-shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/master-shell/ui/MasterTable';
import { MasterDetailScroll, SectionHeader, ... } from '@/features/master-shell/ui/MasterDetail';
import { SearchPanel, ConfirmDialog, useToast, ToastStack } from '@/features/master-shell/ui/...';
import { listRoles, ... } from '@/features/base/api/role';

// 1. 定義 SIDEBAR_CONFIG / HEADER_CONFIG
const SIDEBAR_CONFIG: SidebarConfig = { ... };
const HEADER_CONFIG: HeaderConfig = { category: '帳號與權限', title: '職務主檔', ... };

// 2. 定義 RoleRow type + dtoToRoleRow mapper
type RoleRow = { id: string; code: string; name: string; ... };
function dtoToRoleRow(r: RoleDto): RoleRow { ... }

// 3. 定義欄位（buildRoleColumns）
function buildRoleColumns(): MasterTableColumn<RoleRow>[] { ... }

// 4. 寫詳細頁（RoleDetailView）— 用 MasterDetailScroll + SectionHeader 包章節
function RoleDetailView({ role, ... }) { ... }

// 5. 組合 → 同 UserMasterPage 的結構：
export function RoleMasterPage() {
  // listUsers → listRoles
  // useToast / state / handlers 全照搬
  return (
    <>
      <MasterShell sidebarConfig={...} headerConfig={...} ...>
        <ErpToolbar ... />
        <ErpTabBar ... />
        {tab === 'list' ? <MasterTable<RoleRow> ... /> : <RoleDetailView ... />}
      </MasterShell>
      <ConfirmDialog ... />
      <ToastStack ... />
    </>
  );
}
```

DashboardShell.tsx 同步加 bypass：
```tsx
const isMasterShellBypass =
  pathname === '/dashboard/base/users' ||
  pathname === '/dashboard/base/roles';  // 新增
```

---

## 8. 下一步建議（給 Crown / Alex 討論）

依 Crown 之前拍板的「分段進行」順序：

| Phase | 範圍 | 預估 |
|---|---|---|
| **Phase 1 收尾** | 補 user master 缺漏：assignUserRole / Warehouse + batch ops + 後端 email null 評估 | 4-8 commits |
| **Phase 2** | 職務主檔（roles）— 套同 shell、難度低 | 5-8 commits |
| **Phase 3** | 產品（零件主檔、汽車/零件廠牌）— 零件主檔關聯表多，可能需要左側索引 | 8-15 commits |
| **Phase 4** | 車型（引擎、車型主檔）| 5-8 commits |
| **Phase 5** | 組織（倉庫主檔）+ 交易對象（客戶）| 5-8 commits |
| **Phase 6** | 系統設定（基礎設定）| 3-5 commits |
| **Phase 後** | 設定類頁面（使用者職務 / 據點 / 權限設定）— 範式不同（雙欄關聯指派）| 待規劃 |

**Alex 同步建議重點**：
1. 確認後端「首次登入強制改密碼」邏輯狀態（見 3.4）
2. 評估「email / phone 後端是否開放 null」（見 6.1.1）
3. 拍板下一個推進的主檔（建議：職務主檔，因為跟使用者主檔強相關）
4. 評估是否要把 `BaseUserMasterView` 直接刪除（觀察期一週後）

---

## 9. Appendix：完整 commit 列表（41 → 71）

### 9.1 Lab 範式探索（commit 41 ~ 48）

```
1738842  41   lab/users v2 — 移除卡片 + 簡化色 + ERP 範式 tab/工具列/明細
1fdf238  42   lab/users 5 改革（星球選單 + 分頁 + 序號欄 + 選取 toggle）
c41e3dc  43   工具列 10 改革 + 瀏覽/編輯模式 + Alt 快捷鍵
de5c4b5  43.1 工具列補 Toast 可見反饋
72c3b68  43.2 Q-Exit / Enter-Return 雙向焦點修正
556c786  43.3 表格鍵盤導航（↑↓ 切換列 + Enter 進編輯）
34c271a  44   鋼鐵星球主題色升級（灰階 + 琥珀點綴）
20477bc  44.1 鋼鐵質感大幅升級（gradient + 金屬高光 + 動效）
d0fc0ff  44.2 啟用狀態改 綠燈/紅燈（科技感）
adbdd80  44.3 表格 zebra striping
04fa11f  44.4 Alt+1 / Alt+2 Tab 切換快捷鍵
c1a6113  45   TopHeader 重寫（移除放大鏡 + 通知/公告/日期時間）
b6e0539  46   表頭明顯化 + 詳細資料質感升級 + sub-tab 區隔
b8ce3f6  47   詳細資料改左側索引 + 滿版滾動（為零件主檔奠基）
db860d4  47.1 模式語意修正（瀏覽=read-only / 編輯=write）
410528e  47.2 DetailNav 簡化（拿掉冗餘層次）
d657ded  47.3 移除左側索引列（YAGNI / 滿版單欄）
917f177  47.4 新增按鈕統一寬度
7390769  48   移除左側 sidebar 「通知/最近操作」項目
```

### 9.2 Shell 抽離（commit 49 ~ 55）

```
5626ebb  49   抽 FormField / FormInput / FormSelect 為 master-shell
30386cb  50   抽 ToastStack + useToast hook
e5ca0b4  51   抽 ConfirmDialog
0d9c40f  52   抽 ErpToolbar 家族（Toolbar/Pagination/Export/Separator/ToolbarButton）
c088234  53   抽 MasterTable 泛型列表（zebra + 鍵盤 + sortable）
dd51179  54   抽 MasterDetail 詳細頁元件家族
6ea2c94  55   抽 MasterShell 外殼 + lab/users 完全套用
```

### 9.3 推到 Production（commit 56 ~ 58）

```
b173891  56   lab/users 接 listUsers API（取代 mock USERS）
7271134  57   抽 lab/users 內容為 features/base/users/UserMasterPage 共用元件
54b2fa7  58   /dashboard/base/users 換為 UserMasterPage（取代 BaseUserMasterView）+ DashboardShell bypass
```

### 9.4 API 全接通（commit 59 ~ 69）

```
0d61c9c  59   接搜尋（Alt+F SearchPanel + 300ms debounce）
9e592d6  60   接 pageSize 選擇器（10/20/50/100）
5ee94ad  61   接 setUserActive（D 軟刪除）
b24d2b4  62   D 按鈕語意統一為「停用」（系統不能刪除資料）
192b547  63   「顯示停用」toggle + D 按鈕 context-aware
710c024  64   「顯示停用」toggle 從 ErpTabBar 搬到 ErpToolbar
e60114f  65   接 updateUser（S 存檔真寫回 API）
9651e58  66   接 createUser（A 新增對話框）
832cd3e  67   CreateUserDialog 改用預設密碼建立
f168ecf  68   接 listUserRoles（詳細頁顯示真實擔任職務）
d3f8ae3  69   接 listUserWarehouses（詳細頁顯示真實隸屬倉庫）
```

### 9.5 Bug Fix（commit 70 ~ 71）

```
8354151  70   修正 HTTP 400 error 顯示「[object Object]」
3a48d71  71   user API client 對齊後端 CreateUserDto/UpdateUserDto 欄位名
```

---

## 10. 驗收清單（給 Crown / 其他驗收人）

請於 `/dashboard/base/users` 依序測試：

**列表 / 過濾**
- [ ] 看到真實使用者列表（不是 mock 的 admin/finance1/...）
- [ ] `Alt+F` → 搜尋面板開啟，自動 focus
- [ ] 輸入「admin」→ 300ms 後過濾正確
- [ ] 右下角「每頁 20 筆」→ 切到 10 / 50 / 100，列表筆數正確改變
- [ ] 工具列「顯示停用」toggle → 紅燈使用者出現

**操作（CRUD）**
- [ ] `Alt+A` → 新增對話框（5 欄 + 預設密碼 hint）→ 建立成功 + 列表 reload
- [ ] 選一筆 → `Alt+E` → 進編輯（form 變 input）→ 改欄位 → `Alt+S` → confirm → 存檔成功
- [ ] 選啟用列 → `Alt+D` → confirm 停用 → 該筆消失
- [ ] 顯示停用 ON → 選停用列 → D 變「啟用」+ Power icon → `Alt+D` → confirm 啟用 → 紅燈變綠燈

**詳細頁**
- [ ] 雙擊或選列後 `Alt+2` → 「擔任職務」顯示真實角色（admin 應有 SYSADMIN）
- [ ] 「隸屬倉庫」顯示真實倉庫，沒有則顯示「尚未指派倉庫據點」

**鍵盤導航**
- [ ] 表格 `↑↓` 切列、`Enter` 進編輯
- [ ] `Alt+Q` → 焦點跳左側 sidebar
- [ ] sidebar `↑↓` 切 nav item、`Enter` 回表格 + 第一筆

**視覺 / 質感**
- [ ] 鋼鐵風主題（深灰 + 琥珀點綴 + 金屬光澤）
- [ ] 啟用 chip 綠燈 + 脈衝、未啟用 chip 紅燈 + 脈衝
- [ ] 表格 zebra 條紋、選列琥珀漸層 + 3px 左條

---

_本同步文件由 Claude Opus 4.7 整理於 2026-05-21。詳細實作請查 commit history。_
