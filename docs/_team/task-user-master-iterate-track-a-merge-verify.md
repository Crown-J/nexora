<!-- docs/_team/task-user-master-iterate-track-a-merge-verify.md -->
# TASK-USER-MASTER-ITERATE-TRACK-A — Merge Main 上線風險揭露

> 軌：A（清爽快收，§1 + §2）
> 性質：UX iterate + 業界改革 #22 累積調整
> 時間：2026-05-21
> 分支：`feature/task-master-table-polish`
> 範圍：commit A1 (`8509ba5`) + commit A2 (`3994f73`)
> 紀律對齊：§I.6.3（揭露不完整尾標）、§I.6.5 A041（精確 count）、§III.8.7 G.9（通配 grep verify）
> 狀態：Hank stop 揭露 final state、待 Crown 拍板 merge / 進軌 B

---

## §1 軌 A 落地總覽

### 1.1 commits

| # | hash | scope | 動檔數 | +/- |
|---|---|---|---|---|
| A1 | `8509ba5` | §1 使用者職務/據點設定 降階為「批次工具」| 3 | +14 / -8 |
| A2 | `3994f73` | §2 Tab 切換工具列動態變化 | 1 | +4 / -2 |
| **合計** | | | **4 unique files** | **+18 / -10** |

### 1.2 對齊 feasibility 揭露（commit `e6fd1df`）

| feasibility § | 推薦 | 軌 A 實作 | 對齊 |
|---|---|---|---|
| §1 移除使用者職務/據點設定 | 路線 C：降階為「批次工具」⭐⭐⭐ | minPlan: 'PRO' + sidebar 移除 | ✅ |
| §2 Tab 切換工具列 | 最小範式（條件傳 prop）| `tab === 'list' ? showInactive : undefined` | ✅ |

預估規模 vs 實際：
- feasibility §1 預估：1 commit / ~5 行 → 實際 1 commit / 22 行（+14/-8）— 預估略低估（含註解）
- feasibility §2 預估：1 commit / ~3 行 → 實際 1 commit / 6 行（+4/-2）— 對齊
- **總計符合「清爽快收 < 1 小時」目標**

---

## §2 變更檔案 audit（A041 精確）

### 2.1 commit A1（3 檔）

#### 2.1.1 `apps/nx-ui/src/features/base/config/master-cards.ts`

- user-role 卡片：加 `minPlan: 'PRO'`、description 補「reverse 視角，PRO 進階批次工具」
- user-warehouse 卡片：同上
- 加 5 行區塊註解說明降階範式與業界改革 #22 v1.2 累積關係

**影響**：
- LITE / PLUS 用戶主檔中心 hub 看不到兩卡片
- PRO 用戶卡片仍可見可入
- 卡片總數仍 25（grep -cE '^    id: ' 結果不變）、LITE 可見 23

#### 2.1.2 `apps/nx-ui/src/features/layout/config/menu.nx00.ts`

- 「帳號與權限」group 移除 `base.user-role` / `base.user-warehouse` 兩項
- 加 2 行註解說明降階與 PRO 入口

**影響**：
- 所有 dashboard 子頁（除 `/dashboard/base/users`，因 MasterShell bypass）的 DashboardSubNav 不再顯示這兩項
- 「帳號與權限」group items 從 7 項 → 5 項

#### 2.1.3 `apps/nx-ui/src/features/base/users/UserMasterPage.tsx`

- `SIDEBAR_CONFIG.sections[0].items`（帳號與權限）移除 user-role / user-warehouse 兩項（5 項 → 3 項）
- 加 3 行區塊註解
- 移除 `UserCog` / `MapPin` icon import（已無人用，順手清理）

**影響**：
- USER 主檔頁左側 sidebar 「帳號與權限」section 從 5 項 → 3 項（使用者 / 職務主檔 / 職務權限設定）
- 對 PRO 用戶：USER 頁 sidebar 仍無 user-role 入口、需從主檔中心 hub 卡片進

### 2.2 commit A2（1 檔）

#### 2.2.1 `apps/nx-ui/src/features/base/users/UserMasterPage.tsx`

ErpToolbar 渲染處 showInactive / onShowInactiveChange 兩 prop 改為條件傳值：
```tsx
showInactive={tab === 'list' ? showInactive : undefined}
onShowInactiveChange={tab === 'list' ? setShowInactive : undefined}
```

**影響**：
- 資料瀏覽 tab → 工具列顯示「顯示停用」按鈕（9 個工具列按鈕）
- 詳細資料 tab → 「顯示停用」按鈕隱藏（8 個工具列按鈕）

**未動 ErpToolbar 元件本身**：features/master-shell/ui/ErpToolbar.tsx line 175-183 早已支援 `onShowInactiveChange` 未提供時不渲染（commit 64 v1）。

---

## §3 風險評估

### 3.1 視覺 / UX regression 風險（低）

| 場景 | 風險 | 緩解 |
|---|---|---|
| LITE 用戶找不到「使用者職務設定」 | 中 → 業務員 daily 改於 USER 詳細頁管理（forward 視角已落地） | 對齊 Crown 戰略「業務邏輯逐個 handle」 |
| PRO 用戶找不到 sidebar 入口 | 低 → 仍可從主檔中心 hub 卡片進入 | 卡片 description 已標「PRO 進階批次工具」 |
| 直接 URL 訪問 /dashboard/base/user-role | 無 → 路由 + view 完整保留 | 觀察期可由 menu.nx00 移除前後 GA 比對 |
| Tab 切換工具列閃爍 | 無 → 純 React props 條件 render、無 setTimeout | typecheck pass |

### 3.2 schema / API 風險（無）

- 純 frontend UI iterate
- 無 schema migration
- 無 API endpoint 動
- 後端 user-role / user-warehouse endpoint 完整保留（assignUserRole / revokeUserRole 仍可呼叫）

### 3.3 testing 覆蓋

| 測試項目 | 狀態 |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0（commit A1 + A2 各 verify 一次）|
| Lint | 未跑（軌邊界紀律：lint 應於 CI 跑、軌不爆掃）|
| 手動驗證 | 待 Crown 跑（清單於 §5）|

---

## §4 順手清理機會揭露（未動）

對齊 §I.6.3：揭露可能不完整，需 Crown 補項。

### 4.1 IncludeInactiveToggle 重複實作

| 項目 | 行數 | 引用方 |
|---|---|---|
| `features/base/shell/IncludeInactiveToggle.tsx` | 105 | BaseUserMasterView（1640 行 deprecated）|
| ErpToolbar 內「顯示停用」按鈕（commit 64）| ~10 | UserMasterPage（production）|

兩套實作未統一。**本軌不動**理由：
- IncludeInactiveToggle 仍由 BaseUserMasterView 引用
- 收掉需先處理 BaseUserMasterView 整體刪除
- BaseUserMasterView 1640 行 + mock-data.ts + 附屬 helper → 規模 > 3 commits
- 違反軌邊界紀律「< 1 小時清爽快收」

**建議**：留待後續軌（如 BaseUserMasterView 刪除軌或 Phase 1 收尾軌）順手收。

### 4.2 master-cards.ts label map

`master-cards.ts:420-421` 仍有 `'user-role'` / `'user-warehouse'` label map（用途未 audit）。
**本軌不動**：未 verify 是否影響其他渲染（hub overview 統計等）。

### 4.3 deprecated 檔案

| 檔 | 行數 | 狀態 |
|---|---|---|
| `features/base/users/BaseUserMasterView.tsx` | 1640 | 無人 import（commit 58 後）|
| `features/base/users/mock-data.ts` | 未 audit | BaseUserMasterView 引用 |
| `features/base/users/hooks/` | 未 audit | BaseUserMasterView 引用 |

handoff 2026-05-21 §6.2.2 已提「觀察一週後可刪」。**本軌不動**對齊。

---

## §5 手動驗證清單（給 Crown）

### 5.1 LITE 帳號驗證

- [ ] 訪問 `/dashboard/base`（主檔中心 hub）→ 「帳號與權限」section 應只剩 5 卡片（無 user-role / user-warehouse）
- [ ] 訪問 `/dashboard/base/parts`（任意非 users 子頁）→ 上方 DashboardSubNav 「帳號與權限」應只剩 5 項
- [ ] 訪問 `/dashboard/base/users` → 左側 sidebar「帳號與權限」應只剩 3 項（使用者 / 職務主檔 / 職務權限設定）
- [ ] 直接訪問 `/dashboard/base/user-role` → 仍可看到 BaseUserRoleView（路由保留）

### 5.2 PRO 帳號驗證

- [ ] 訪問 `/dashboard/base`（主檔中心 hub）→ 「帳號與權限」section 應有 7 卡片（含降階後的 user-role / user-warehouse）
- [ ] sidebar 同 LITE（5 項 sub-nav / 3 項 USER sidebar）— sidebar 不依 plan 過濾
- [ ] 從 hub 卡片進 `/dashboard/base/user-role` → 可正常使用 reverse 範式批次操作

### 5.3 Tab 切換工具列驗證

- [ ] `/dashboard/base/users` 預設「資料瀏覽」tab → 工具列右側看到「顯示停用」按鈕（共 9 個 ToolbarButton）
- [ ] 點選一筆 user → Alt+2 切「詳細資料」tab → 「顯示停用」按鈕應消失（共 8 個 ToolbarButton）
- [ ] Alt+1 切回「資料瀏覽」tab → 「顯示停用」按鈕應回來
- [ ] 工具列切換**無閃爍、無延遲**（純 React 條件 render）
- [ ] 詳細資料 tab 下其他按鈕仍可正常運作（A 新增 / D 停用 / 選取 / Q 結束）

### 5.4 regression 驗證（不應壞）

- [ ] USER 詳細頁「擔任職務」/「隸屬倉庫」section 仍正常顯示
- [ ] 編輯模式 / 新增 / 停用 / 搜尋 / 分頁 全部正常
- [ ] LITE 帳號從主檔中心 hub 找不到 user-role 卡片**但** PRO 帳號看得到（需切 plan 測）

---

## §6 對齊紀律

| 紀律 | 對齊 |
|---|---|
| §I.6.3 揭露不完整尾標 | §4 順手清理 + §6 補項 + 各小節「未動 / 未 audit」清楚標 |
| §I.6.5 A041 精確 count | 卡片數 25 / 7 / 5 / 3、items 5→3、commits 2、行數 +14/-8 + +4/-2 全 grep -c |
| §III.8.7 G.9 通配 grep | menu.nx00 / master-cards / UserMasterPage 三處改前皆 grep verify |
| 軌邊界清楚（Q-RHYTHM-2） | < 1 小時、2 commit、4 unique files、+18/-10 行 |
| 順手修紀律 | UserCog / MapPin import 清理於 commit A1 註明 |
| 不擴張 scope | IncludeInactiveToggle / BaseUserMasterView 揭露但不動，留後續軌 |

---

## §7 軌 A closure → 軌 B 啟動條件

### 7.1 軌 A 完成判定

✅ commit A1：§1 降階落地（3 處改）
✅ commit A2：§2 Tab 動態工具列落地（1 處改）
✅ typecheck pass × 2
✅ merge-verify 文件產出（本檔）
⏳ 待 Crown 手動驗證（§5 清單）
⏳ 待 Crown 拍板 merge main

### 7.2 軌 B 啟動條件對齊

軌 B 範圍預定：§5 RolePicker / WarehousePicker + assignUserRole/Warehouse + revoke + setPrimary + batch ops（feasibility §5 揭露 7 commits / ~450 行）。

軌 B 啟動前置：
- 軌 A merge main（或 Crown 確認可分軌並行）
- Crown 拍板「通用 EntityPickerDialog<T>」是否進 master-shell（feasibility §5.5 建議）
- Crown 拍板 picker 是否支援多選（feasibility §5.7 未確認項）

### 7.3 揭露可能不完整，需 Crown 補項

- 軌 A 未測試多 plan 視覺差異（PRO 主檔中心 hub 卡片是否確實顯示）— 需 Crown 切 plan 驗證
- 未 audit：master-cards.ts:420-421 label map 用途
- 未 audit：DashboardSubNav 是否有 plan-based 隱藏邏輯（如果有，PRO 用戶 sub-nav 也應該顯示降階兩項；本軌均強制移除 sub-nav）

---

_本 merge-verify 由 Hank（Claude Opus 4.7）於 2026-05-21 產出，對齊 task-master-table-polish-merge-verify.md 既有範式。_
