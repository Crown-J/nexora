<!-- docs/_team/master-page-shell-範式.md -->

# 主檔頁範式（MasterPageShell）

**建立 2026-06-18**　**範本頁:`apps/nx-ui/src/features/nx01/org/user-zoned/UserZonedPage.tsx`**

執行長拍板的範式（員工頁完工後封存）。其他主檔頁採樣此範本、不要再各做各的。

---

## 0. 主檔分級（2026-06-23 執行長拍板）

22 主檔複雜度差異大、不該用同一範本：

| 級別 | 形態 | 範本 | 主檔 |
|---|---|---|---|
| **L0 純查表** | 列表 inline edit row（無 detail tab） | `InlineEditMasterPage` (`features/nx01/shell/inline-master/`) | country / region / department / phonetic-dictionary（4 個已套、2026-06-23）+ 候選：model-type / drivetrain / part-relation / part-model |
| **L1 名詞表** | 列表 + 右側抽屜 detail（drawer） | 未建（規劃中） | currency / team / role / customer-grade / supplier-grade / brand 候選 |
| **L2 中型** | 單頁長表 + 1-2 衛星 inline | UserZonedPage 縮減版 | warehouse / site / brand / location |
| **L3 重型** | UserZonedPage 完整 | UserZonedPage / PartnerMasterPage / PartZonedPage | user / partner / part |
| **特殊** | 圖表 / matrix | 各自 page | org-structure / role-view / location-structure / supplier-supply / universal-group |

### L0 InlineEditMasterPage 行為差異

- 取消 list/detail Tab、永遠 list 視圖
- row 雙擊 / Enter / Alt+E → 該 row in-place 變 input cells
- Tab/Shift+Tab 跳欄、Enter 存、Esc 取消（dirty 3-way confirm）
- A 新增 = 列頂插空白 editing row（非切到 detail tab）
- 工具列：A / F / D / R / O / T、無批次選取 / 排序 dropdown / 篩選面板
- 共用 EntityMasterConfig 不擴展、共用 entity-master/config.ts helper

---

## 1. 視覺結構（由上到下）

```
PageHeader（麵包屑 3 段 · 純文字 · count chip 右）
  ↓
MasterPageHead
  ├─ MasterTabs（資料瀏覽 Alt+1 / 詳細資料 Alt+2）
  ├─ detail 標題 + 副標（tab='detail' 時顯）
  └─ MasterQuickNav（分組 icon 翻頁、currentPageId 標亮）
  ↓
ErpToolbar（依模式切按鈕集）
  ├─ browse:⏮ ◀ N/M ▶ ⏭ | A E D | F M R | P O | T 垃圾桶
  ├─ edit:S 儲存 / C 取消
  └─ selection:完成選取 / 批次刪除
  ↓
SearchPanel（F 觸發、收合式）
  ↓
MasterTable（list tab）或 DetailPane（detail tab）
  ├─ MasterTable:wrapper bg-card/70 + rounded border
  │   ├─ thead 拖拉重排（dnd-kit、可選 opt-in）
  │   ├─ 偶數列斑馬紋、selected 金底 + 3px 左金條
  │   └─ footer:共 N 筆 + 顯示 M 筆 + 每頁切換
  └─ DetailPane:MasterDetailScroll + UserFormZoned + 衛星 inline
```

---

## 2. 共用元件清單（已有、直接 import）

| 元件 | 位置 | 用途 |
|---|---|---|
| `PageHeader` | `design/components/page-header/PageHeader.tsx` | 麵包屑 + count chip |
| `MasterTabs` | `features/nx01/shell/entity-master/MasterTabs.tsx` | 資料瀏覽 / 詳細資料 切換 |
| `MasterPageHead` | `features/nx01/shell/master-nav/MasterPageHead.tsx` | tabs + detail 標題 + 主檔快速入口（單一排） |
| `MasterQuickNav` | `features/nx01/shell/master-nav/MasterQuickNav.tsx` | 6 分區 icon 翻頁、固定 5 slot、framer 動畫 |
| `master-pages.ts` | `features/nx01/shell/master-nav/master-pages.ts` | 22 主檔 metadata（id/label/href/category/icon） |
| `ErpToolbar` | `features/nx01/shell/ui/ErpToolbar.tsx` | 工具列（browse/edit/selection 三模式） |
| `MasterTable` | `features/nx01/shell/ui/MasterTable.tsx` | 泛型主檔列表（含 dnd 表頭、placeholder rows） |
| `MasterDetailScroll` | `features/nx01/shell/ui/MasterDetail.tsx` | 詳細頁外殼 + scroll 回頂 |
| `FormField/FormInput/FormSelect` | `features/nx01/shell/ui/FormField.tsx` | 表單欄位（已 token 化、跟主題切） |
| `SearchPanel` | `features/nx01/shell/ui/SearchPanel.tsx` | 搜尋面板（F 觸發） |
| `ExportMenuButton` | `features/nx01/shell/ui/ErpToolbar.tsx` | O 匯出 dropdown（CSV/PDF） |
| `SortMenuButton` | `features/nx01/shell/ui/sort-config/SortMenuButton.tsx` | M 排序 dropdown（循環三態） |
| `useColumnsPref` | `features/nx01/shell/ui/columns-config/useColumnsPref.ts` | 欄位順序 localStorage hook |
| `useDirtyGuard / tryNavigate` | `design/hooks/useDirtyGuard.ts` | 全域 dirty 攔截 |
| `ConfirmDialog` | `features/nx01/shell/ui/ConfirmDialog.tsx` | 三按鈕確認對話框 |
| `ToastStack / useToasts` | `features/nx01/shell/ui/ToastStack.tsx` | 全域 toast |
| `UserAvatarSmall` | `features/shared/user-photo/UserPhotoManager.tsx` | 列表姓名前小頭像（已 token 化） |

---

## 3. 鍵盤快捷（執行長範式）

### browse 模式
| 鍵 | 功能 |
|---|---|
| Alt+1 / Alt+2 | 資料瀏覽 / 詳細資料 切換 |
| ↑ / ↓ | 切 row（row focused 時、由 MasterTable.handleTableKey 處理） |
| Enter | 進詳細頁 |
| Alt+A | 新增（切右側詳細頁 creating 模式、不開 modal） |
| Alt+E | 編輯 |
| Alt+D | 刪除（軟刪 isActive=false） |
| Alt+F | 搜尋面板開合 |
| Alt+M | 排序 dropdown（受控、點欄位循環 無→A-Z→Z-A→無） |
| Alt+R | 重新整理 + toast 反饋 |
| Alt+P | 列印預覽（不自動印、user 自己按列印） |
| Alt+O | 匯出 dropdown（受控、ESC 後 focus 回 row） |

### edit 模式
| 鍵 | 功能 |
|---|---|
| Alt+S | 儲存 |
| Alt+C | 取消 |
| ESC | 取消 |

### 共通範式
- mount / save / cancel 完成 → 自動 focus 第一筆 row
- dropdown 開啟時、↑↓/Enter 不攔（給 Radix 自己處理）
- ESC 關 dropdown 後、用 `onCloseAutoFocus` 攔截 + `preventDefault` + 手動 focus row

---

## 4. 後端 API 範式

| Query 參數 | 用途 |
|---|---|
| `page / pageSize` | 分頁 |
| `search` | F 查詢 |
| `isActive` | T 垃圾桶（false = 顯示已停用） |
| `sortBy / sortOrder` | M 排序（白名單守、`@IsIn(USER_SORTABLE_FIELDS)`） |

response 統一 `PagedResult<DTO>`:`{ items, page, pageSize, total }`。

---

## 5. localStorage 偏好 key 規範

| key | 內容 |
|---|---|
| `master-users:columns:v1` | 欄位順序 string[] |
| `master-{xxx}:columns:v1` | 其他主檔同範式 |

---

## 6. light theme tokens（執行長 2026-06-18 範式）

固定深黑 hex 走 `--nx-surface-input*` 系列 token、light 下變暖米白 + 淺金邊 + 深褐字。
按鈕固定 `#E8A020` 改 `primary` token、light 下變 gold（不變黑也不變橘）。

詳見:`apps/nx-ui/src/design/styles/tokens.css` line 337+

---

## 7. 採樣步驟（新主檔頁）

1. 複製 `UserZonedPage.tsx` 改名為 `XxxZonedPage.tsx`
2. 把 `UserDto`/`listUsers`/`createUser`/`updateUser`/`USER_FIELDS` 等替換成新主檔的 API + zone config
3. 改 `currentPageId='emp'` → 對應 master-pages.ts 內的 id
4. 改 `pageCategory` / `pageTitle` / `entityNoun`
5. 改 `COLUMN_ALL_KEYS` 對應新主檔欄位
6. 改 `SORT_OPTIONS` 對應後端 sortable 欄位
7. 後端 ListXxxQueryDto 加 `sortBy / sortOrder` + service `orderBy` 動態化
8. backend XXX_SORTABLE_FIELDS 白名單 + DTO `@IsIn` 守

---

## 8. 待辦（封存時 task #26 範圍）

其他 6 主檔頁套用此範式:
- part-zoned / PartZonedPage
- warehouse-zoned / WarehouseZonedPage
- partner-zoned / PartnerMasterPage
- entity-master / EntityMasterPage（含 dept/group/role/region/country/currency/brand/partgroup/zhuyin/sitebase/bin/custgrade/suppgrade）
- reverse-assign / ReverseAssignPage
- permission/role-view / RoleViewMatrixPage
