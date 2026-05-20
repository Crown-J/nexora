<!-- docs/_team/task-master-table-polish-merge-verify.md -->

# TASK-MASTER-TABLE-POLISH — Merge Main 上線風險揭露（業界改革 #22 v1.2）

> 性質：純諮詢、stop 給 Crown final merge 拍板（Q-RHYTHM-2 第 13 次穩定預備）
> 撰寫：Hank
> 日期：2026-05-20
> 觸發：Crown 拍板 5 需求 + Q-RHYTHM-2 自主全軌信任授權 6 commit 連跑完成
> 分支：`feature/task-master-table-polish`（ahead 6 commit + 本 merge-verify commit）
> 對應依據：Crown 訊息 5 需求 + 業界改革 #22 v1.2 戰略
> 業界改革承載：**#22 主檔分區範式 v1.2 表格內部 UX 落地** ⭐⭐⭐

---

## §0 ahead 6 commit 真實清單

```
（本 commit：merge-verify 9 段揭露）
0aebec5 commit 5：backend nx01-user-role module 新建（解 /user-role 404）
922df91 commit 4：user 主檔表格 reference（表頭 nowrap + Toggle filter）
a657736 commit 3：IncludeInactiveToggle 共用元件 + useIncludeInactive hook
8bcf7bb commit 2：audit person 顯示優化 + hover tooltip 範式
e4172d5 commit 1：DropdownMenu z-index 50 → 60（解被表格覆蓋）
```

**Vs main 總改動**：+518 / -38 行 / 8 檔
- 新檔 4：backend user-role module 3 + frontend IncludeInactiveToggle 1
- 改檔 4：nx01.module.ts / dropdown-menu / BaseUserMasterView / mock-data
- 跳過 commit 6（前端 endpoint 已對齊 backend）

---

## §1 5 需求落地對照表

| # | 需求 | 戰略選 | 落地 | commit |
|---|------|--------|------|--------|
| 1 | 表頭固定寬度（不換行）| user 主檔 reference + rollout 軌 | ✅ user reference 落地、20 主檔列 backlog | 4 |
| 2 | 建立/修改人員顯示優化 | 共用函數 + tooltip | ✅ formatAuditPersonLabel display only name + formatAuditPersonTooltip + user cell title | 2 |
| 3 | 狀態 Dropdown → Toggle | 共用元件 + user reference | ✅ IncludeInactiveToggle + useIncludeInactive hook + user view 替換 | 3 + 4 |
| 4 | Dropdown z-index 修 | 共用元件 | ✅ z-50 → z-[60]（全 21 主檔同步） | 1 |
| 5 | user-role API 404 修 | backend 新建 module | ✅ 6 endpoint controller + service + dto + module register | 5 |

⭐ 5 需求 100% 落地。

---

## §2 數量真相揭露（A041 精確 count）

### 2.1 改動範圍

```
backend：1 新 module（user-role）= 3 新檔 + 1 改檔（nx01.module.ts）
frontend：1 共用元件改（dropdown z-index）+ 1 新共用元件（IncludeInactiveToggle）+ 1 共用函數改（formatAuditPersonLabel） + 1 view reference（user）
docs：1 merge-verify（本檔）
```

### 2.2 共用元件影響倍數（同步生效）

| 改動 | 影響範圍 | 倍數 |
|------|---------|------|
| DropdownMenu z-[60] | 全站 DropdownMenu 使用點 | **× 全站** |
| formatAuditPersonLabel | 21 主檔 view 共用 import | **× 21** |
| IncludeInactiveToggle | 預備供 rollout | × 21（待 rollout 軌）|

### 2.3 backend user-role module endpoint count

```
6 endpoint：
  GET    /user-role          list（核心、解 Alex 截圖 404）
  GET    /user-role/:id      getById
  POST   /user-role          assign
  PATCH  /user-role/:id/revoke   revoke
  PATCH  /user-role/:id/primary  setPrimary
  PATCH  /user-role/:id/active   setActive
```

---

## §3 user 主檔 reference 範式落地

### 3.1 需求 1 表頭 nowrap

```tsx
// 前：<th key={key} className="px-2 py-2.5">
// 後：<th key={key} className="whitespace-nowrap px-2 py-2.5">
//     <button className="... whitespace-nowrap font-medium ...">
```

- 「隸屬倉庫」「電話」等表頭永不換行
- 視窗縮小 → DataTableShell horizontal scroll（既有範式保留）
- tableMinW 計算保留（基於欄位數 × 112px）

### 3.2 需求 3 ActiveFilter Dropdown → IncludeInactiveToggle

```tsx
// 前：30 行 DropdownMenu 範式（'all' | 'active' | 'inactive' 3 選 1）
// 後：4 行 Toggle 範式（boolean）
<IncludeInactiveToggle
  value={activeFilter === 'all'}
  onChange={(next) => setActiveFilter(next ? 'all' : 'active')}
/>
```

- 既有 activeFilter state 型別保留（向後相容）
- 'inactive' 狀態退役（無 UI 入口）
- 視覺：amber accent toggle + 「包含已停用」label

### 3.3 需求 2 audit person tooltip

```tsx
// 前：<td>{row.createdByPerson}</td>
// 後：<td title={formatAuditPersonTooltip(row.createdByUsername, row.createdByName)}>
//       {row.createdByPerson}
//     </td>
```

- display：「系統管理員（SYSADMIN）」（only name、formatAuditPersonLabel 改）
- hover tooltip：「sysadmin 系統管理員（SYSADMIN）」（完整、formatAuditPersonTooltip）
- 對齊 GitHub / Linear / Notion progressive disclosure 範式

---

## §4 backend user-role module 真相揭露

### 4.1 verify 起點

```
§G.9 grep before：
  - apps/nx-ui/src/features/base/api/user-role.ts:37 → apiFetch('/user-role')
  - apps/nx-ui/src/features/nx00/user-role/api/user-role.ts:52 → apiFetch('/user-role')
  - nx-api 完全沒 user-role module（grep @Controller 無 user-role）
  - schema 有 nx01_user_role（line 1241-1265）+ seed 落地
```

### 4.2 落地架構

```
apps/nx-api/src/nx01/user-role/
├── dto/user-role.dto.ts            5 DTO（List/Assign/Revoke/SetPrimary/SetActive）
├── user-role.controller.ts         6 endpoint + JWT Guard + Roles('SYSADMIN', 'OWNER')
└── user-role.service.ts            mapRow（含 join role/user/assignedBy）+ tenant scope
```

### 4.3 service 行為摘要

```
list：
  - tenant scope（requireTenantId）
  - query: userId / roleId / isActive 可選
  - orderBy: isPrimary desc, assignedAt desc
  - 回傳：{ page, pageSize, total, items[] }
  - items 含 roleCode / roleName / userDisplayName / assignedByName

assign：
  - 檢查同 user+role+tenant active 不可重複（ConflictException）
  - assignedBy = JWT user.sub
  - isPrimary 預設 false、isActive 預設 true

revoke：
  - soft delete（isActive=false + revokedAt=now）

setPrimary：
  - 設 true 時、同 user 其他 primary 自動 false（business invariant）

setActive：
  - 切換 isActive、revokedAt 對應同步
```

### 4.4 路由前綴紀律邊界揭露

```
⚠️ 用 @Controller('user-role') 而非 @Controller('nx01/user-role')
理由：對齊既有前端兩個 api file（不動前端 = 本軌邊界乾淨）
代價：違反 nx01/ 範式紀律（21 主檔 controller 皆 nx01/<entity>）
後續軌：TASK-API-NAMESPACE-NORMALIZE 統一範式（前後端同步改）
```

---

## §5 紀律邊界揭露

### 5.1 跨軌邊界對齊

```
✅ 純 frontend UI iterate + backend 新 module（無 schema migration）
✅ 無 destructive 命令（無 migrate reset / no rm）
✅ 對齊 §I.5 #16（Alex 寫需求、Hank 寫實作）
✅ 對齊 §I.5 #22「verify 真相後再行動」（先 grep 確認 backend 沒 module 才寫）
✅ Q-RHYTHM-2 自主全軌信任授權連跑 6 commit、無中斷
```

### 5.2 範式選擇紀律

```
✅ 21 主檔表格不共用單一 BaseMasterTable → 不強行重構（避免大爆炸）
✅ 共用層全改（dropdown / audit / toggle）= 一處改、21 主檔生效
✅ 個別 view 改：user 主檔 reference 落地（業務截圖揭露主場景）
✅ 其他 20 主檔 rollout 列後續軌 TASK-MASTER-TABLE-ROLLOUT
```

### 5.3 後續軌 backlog（A026 累積）

⭐ 業界改革級：
| 軌 ID | 業界改革 # | 內容 | 優先 |
|-------|----------|------|------|
| TASK-MASTER-DETAIL-TABS-V2 | #22 v1.3 | Modal 加 TAB 結構 | P1 |
| TASK-PARTNER-SPLIT-V2 | #25 | partner 5 type 拆 | P1 |
| TASK-FILTER-BUILDER-V1 | #24 | 彈性 Filter（Crown v0）| P2 |
| TASK-API-NAMESPACE-NORMALIZE | – | nx01/user-role 統一範式 | P3 |

🔵 polish 後續軌：
| 軌 ID | 內容 | 優先 |
|-------|------|------|
| TASK-MASTER-TABLE-ROLLOUT | 20 主檔 rollout 需求 1+3（表頭 nowrap + Toggle filter）| P1 |
| TASK-MASTER-TABLE-ROLLOUT-TOOLTIP | 20 主檔 rollout 需求 2（audit person tooltip）| P2 |
| TASK-MASTER-TABLE-COLUMN-CUSTOMIZE | 欄位自訂顯示 | P3 |
| TASK-MASTER-TABLE-BULK-ACTIONS | 表格 bulk 操作 | P3 |
| TASK-MASTER-TABLE-STICKY | 表頭 / 左欄 sticky | P3 |
| TASK-MOCK-CLEANUP | demo mode 配置清理 | P3 |

---

## §6 typecheck 真相

```
commit 1：nx-ui tsc ✓ TYPECHECK OK
commit 2：nx-ui tsc ✓ TYPECHECK OK
commit 3：nx-ui tsc ✓ TYPECHECK OK
commit 4：nx-ui tsc ✓ TYPECHECK OK
commit 5：nx-api tsc ✓ BACKEND TYPECHECK OK
```

5 次 typecheck 連續通過、無 type error。

---

## §7 Crown 本機驗證 step

### 7.1 backend hot reload（Crown nx-api dev server 自動 picked up）

```powershell
# nx-api dev 應該自動 reload（tsx watch）、新 user-role module 自動註冊
# 看 console 應有：
#   [Nest] LOG ... UserRoleController {/user-role}: ...
#   [Nest] LOG ... Mapped { GET, /user-role } route
#   ...（6 routes）
```

### 7.2 frontend pull 後重啟（拿到 polish 改動）

```powershell
# Crown 本機：
git pull              # 拿到本軌 6 commit
cd apps/nx-ui
# nx-ui dev 應該 HMR 自動 picked up、若無，重啟：
# Ctrl+C → pnpm dev
```

### 7.3 瀏覽器驗證

```
1. 開 http://localhost:3000/dashboard/base/users
2. 表頭驗證：
   - 「隸屬倉庫」「電話」等不換行 ✓
3. 狀態 filter 驗證：
   - 應該是 Toggle「包含已停用」（不是 Dropdown 3 選 1）✓
   - 預設關（只顯示啟用）✓
4. audit person 驗證：
   - cell 顯示「系統管理員（SYSADMIN）」（不再含 sysadmin 前綴）✓
   - hover cell → tooltip 顯示「sysadmin 系統管理員（SYSADMIN）」✓
5. 欄位 Dropdown 驗證：
   - 點「欄位」按鈕、Dropdown 不被覆蓋 ✓
6. user 詳細頁驗證：
   - 雙擊任一 user row 開明細
   - 「擔任職務」section 應正常載入、不再 404 紅字 ✓
```

---

## §8 業界改革 #22 v1.2 完整 closure ⭐⭐⭐

### 8.1 v1.0 → v1.1 → v1.2 累積對齊

```
v1.0（IMPROVE、v1.5.x）：Hub 6 分區 + 23 卡 + 版本可見性
v1.1（POLISH、v1.5.2）：Hub UX polish + /pricing + PlanChip + 字級 110%
v1.2（本軌、v1.5.3 預備）：表格內部 UX（表頭 nowrap / Toggle / tooltip / Dropdown z-index / backend user-role）
```

### 8.2 業界對標升級

| 元素 | v1.1 NEXORA | v1.2 NEXORA | 業界對標 |
|------|-------------|-------------|---------|
| 表頭範式 | 自動換行 | nowrap 固定 | Excel / Airtable / Notion ✓ |
| 狀態 filter | Dropdown 3 選 1 | Toggle 「包含已停用」 | Linear / Notion / GitHub ✓ |
| audit person | 「帳號 姓名」 | 「姓名」+ hover tooltip | GitHub / Linear / Notion ✓ |
| Dropdown z | z-50（被覆蓋）| z-[60]（最上層）| shadcn / Radix 強化版 |
| user-role API | 404 | 6 endpoint 完整 | RESTful 範式 |

### 8.3 Crown 戰略「客戶友善 = 容易上手」對齊

```
✅ 表頭固定（業務員 muscle memory：欄位位置穩定）
✅ Toggle 一鍵切換（業務員 daily 操作減少）
✅ 姓名優先（業務員看人主要看名字）
✅ Dropdown 不被覆蓋（操作無干擾）
✅ user 詳細頁完整（業務員可看擔任職務真實資料）
```

---

## §9 Hank 自我審查（pre-merge checklist）

- [x] typecheck pass（5 次連續通過、無 type error）
- [x] commit message 格式對齊 `[TASK-MASTER-TABLE-POLISH] commit N：...`
- [x] Co-Authored-By 簽名完整
- [x] 無 destructive 命令（無 migrate reset / no rm / no force push）
- [x] 無 schema migration（nx01_user_role table 已存在）
- [x] 對齊規範 §I.6.3 揭露不完整每段尾標
- [x] 對齊 §G.9 通配 grep 已驗證
- [x] 對齊 [[feedback_workflow]] 漸進式 commit 群
- [x] 5 需求 100% 落地（包含 Crown 訊息列 1~5）
- [x] Crown 自主全軌信任授權 6 commit 連跑、無中斷
- [x] 後續軌 backlog 完整（4 業界改革級 + 6 polish 後續）

⭐ Q-RHYTHM-2 第 13 次穩定預備、業界改革 #22 v1.2 落地。

---

**等 Crown final merge 拍板**（Q-RHYTHM-2 Final merge 介入點）

戰略意義：
- Crown 業界差異化載體 v1.5.3 beta 預備
- 業界改革候選累積 v1.7 預備（10 候選累積、本軌 #22 v1.2 落地）⭐⭐⭐
- Hub（v1.0 v1.1）+ 表格（v1.2）= NEXORA 使用者面對 UX 完整對齊

---

## §10 補揭露：commit 7 BaseMasterMobileDock（Crown 補揭露指令）

對齊 Crown「補揭露上輪指令」訊息、polish 軌一站式收尾、加 commit 7：

### 10.1 真相揭露

```
觸發：Crown 真實業務測試後揭露手機 icon bar 範式
拍板：Bottom Dock + 左右滑動 swipe scroll（對齊既有 hub MobileSectionTabs）
範圍：主檔子頁（BaseMasterSubPageLayout 範圍下 21 主檔）
```

### 10.2 落地檔案

```
新檔：apps/nx-ui/src/features/base/shell/BaseMasterMobileDock.tsx（103 行）
改檔：apps/nx-ui/src/features/base/shell/BaseMasterPageHeader.tsx（QuickNav 手機隱藏）
改檔：apps/nx-ui/src/features/base/shell/BaseMasterSubPageLayout.tsx（加 dock + pb-16）
```

### 10.3 設計範式對齊（一致性紀律）

| 元素 | MobileSectionTabs（hub）| BaseMasterMobileDock（子頁）|
|------|------------------------|----------------------------|
| 位置 | fixed bottom-0 | fixed bottom-0 |
| 高度 | 56px + safe-area | 56px + safe-area |
| 背景 | bg-black/95 backdrop-blur | bg-black/95 backdrop-blur |
| 高亮 | text-[#E8A020] + 底部橫槓 | text-[#E8A020] + 底部橫槓 |
| 排列 | flex-1 平均（6 section）| overflow-x-auto swipe（25 主檔）|
| 額外 | – | 當前主檔自動 scrollTo 中央（smooth）|

### 10.4 vs Crown 拒絕的範式 A/B/C

| 範式 | Crown 拒絕理由 |
|------|----------------|
| A 抽屜 | 需點 trigger 才出、業務員 daily 慢 |
| B 漢堡 | 3 條線 icon、不顯眼 |
| C 其他 | 未對齊既有設計系統 |
| **D Bottom Dock** | ✅ **業界 iOS Dock / Android Bottom Nav 範式 + 對齊既有 hub** |

### 10.5 業界改革累積真相

```
#17 手機介面 = NEXORA 亮點 ← 累積中（本 commit 主檔子頁 dock 落地）
#22 v1.2 表格內部 UX ← 完整 closure（含本補揭露）
```

### 10.6 ahead 8 commit 真實清單更新

```
（merge-verify 本檔已含 §10 補揭露）
15c5530 commit 7：BaseMasterMobileDock 手機 dock + swipe scroll
2a1340b commit 6（原收尾）：merge-verify 9 段揭露
0aebec5 commit 5：backend nx01-user-role module
922df91 commit 4：user 主檔表格 reference
a657736 commit 3：IncludeInactiveToggle 共用元件
8bcf7bb commit 2：audit person 顯示優化 + tooltip
e4172d5 commit 1：DropdownMenu z-index 50 → 60
```

**最終 vs main**：9 檔、+627 / -38 行（含 §10 補揭露）、6 次 typecheck 連續 OK。

---

## §11 補揭露：commit 9 + 10 + 11 統一 dock 範式（Crown 截圖揭露）

對齊 Crown 截圖揭露真相：3 個 dock 元件範式不一致、統一成 NexoraBottomDock：

### 11.1 真相揭露

```
Crown 截圖 3 圖：
  圖一首頁：home/dock.tsx isDashboardHome 分支、5 個 + 文字
  圖二 hub：MobileSectionTabs、6 section、icon-only ✅ Crown 期望範式
  圖三主檔頁：BaseMasterMobileDock（commit 7）、25 主檔、有文字 ⚠️

Crown 戰略：統一成圖二範式（6 slot、icon-only、超過 swipe）
```

### 11.2 commit 9 補正 Dock 掛點

```
root cause：commit 7 把 dock 加在 BaseMasterSubPageLayout
但 21 主檔 page.tsx 直接 render BaseMasterPageHeader（不經 SubPageLayout）
→ Dock 從未渲染

修法：dock 改放 BaseMasterPageHeader（21 主檔共用點）+ Fragment 範式
```

### 11.3 commit 10 + 11 統一範式

```
新檔（commit 10）：shared/ui/NexoraBottomDock.tsx（147 行）
  - DockItem type：{ id, icon, label, href?, onClick?, active? }
  - <= 6 items：flex-1 均分（無 scroll）
  - > 6 items：overflow-x-auto + min-w-[64px] swipe + active scrollTo 中央
  - icon-only h-6 w-6、aria-label / title 提供無障礙
  - active：amber #E8A020 + 底部小橫槓

Refactor 4 處（commit 11）：
  ✅ home/dock.tsx isDashboardHome 分支（38 行 → 8 行）
  ✅ home/dock.tsx HOME_DOCK_ITEMS 分支（line 519 早 return null、為死碼、保留供 revert）
  ✅ MobileSectionTabs（80 行 → 50 行）
  ✅ BaseMasterMobileDock（commit 7 103 行 → 36 行、移除文字、scrollTo 邏輯移到 NexoraBottomDock 共用）

附加：dashboardQuickShortcuts.ts 加 SHORTCUT_Y_PLACEHOLDER（5 → 6 個）
  - key='y'、label='更多功能'、href='/dashboard/coming-soon'
  - 後續軌 TASK-DASHBOARD-QUICK-Y-IMPL Crown 拍板實際功能
```

### 11.4 數量真相揭露

```
共用元件影響倍數（一處改、全站生效）：
  - NexoraBottomDock 視覺改 → 4 處 dock 同步
  - DockItem type 改 → 4 處 dock 同步
  - scrollTo / overflow / flex 邏輯改 → 4 處 dock 同步

行數淨變化：
  - commit 9 (fix)：+34 / -27 = +7
  - commit 10 (新)：+147
  - commit 11 (refactor)：+55 / -172 = -117
  - 淨變化：+37 行（含全部 4 處 refactor）
```

### 11.5 業界改革累積真相

```
業界改革 #22 v1.2：主檔分區範式 + 表格內部 UX（本軌主軸）
業界改革 #17：手機介面 = NEXORA 亮點（Bottom Dock 統一範式 = 累積落地）
業界對標：iOS Dock + Android Bottom Nav + 對齊 NEXORA dark theme amber 範式
```

### 11.6 ahead 11 commit 真實清單最終

```
（merge-verify §11 補揭露在此 commit）
116162c commit 11：refactor 3 dock 使用點 + 首頁 5→6
ae6c720 commit 10：NexoraBottomDock shared 元件
16e230c commit 9（fix）：MobileDock 掛點從 SubPageLayout 移到 PageHeader
4d177ac commit 8：merge-verify §10 補揭露
15c5530 commit 7：BaseMasterMobileDock 範式（commit 11 refactor 為共用元件）
2a1340b commit 6：merge-verify 9 段揭露
0aebec5 commit 5：backend nx01-user-role module
922df91 commit 4：user 主檔表格 reference
a657736 commit 3：IncludeInactiveToggle 共用元件
8bcf7bb commit 2：audit person 顯示優化 + tooltip
e4172d5 commit 1：DropdownMenu z-index 50 → 60
```

**最終 vs main**：12 檔、+664 / -210 行（淨 +454 行）、9 次 typecheck 連續 OK。

⭐ 業界改革 #22 v1.2 + #17 完整收尾、Crown 戰略「設計系統一致性」紀律對齊。

---

## §12 補揭露：commit 13 + 14 + 15 表格 Excel-like 範式（Crown 真實業務 iterate）

對齊 Crown 連續揭露 3 個 dock / table 議題、polish 軌持續 iterate：

### 12.1 commit 13 swipe 固定 visible 6（Crown 截圖「不是一列六個」）

```
Root cause：min-w-[64px] / 414px viewport = 6.47 個 → visible 6+1 截斷
修法：w-[calc(100vw/6)] shrink-0 → 任何 viewport 都精準 6 完整
```

### 12.2 commit 14 React Portal 解 backdrop-filter ancestor（Crown 截圖「沒貼底部」）

```
Root cause（CSS spec 真相）：
  ancestor 含 backdrop-filter / transform / filter / will-change / contain 屬性
  → position: fixed 的 containing block 從 viewport 改為該 ancestor
  → fixed bottom-0 不再相對 viewport、看起來「沒貼底」

NEXORA globals.css 多處 backdrop-filter：
  .nx-home-topbar          blur(10px)
  .glass-card              blur(12px)  ← BaseUserMasterView 多處用
  .glass-card.nx-glass-raised  blur(12px)

修法：createPortal(dock, document.body)
  - SSR：mounted=false 不渲染（避免 hydration mismatch）
  - CSR：dock 永遠在 body 末端、無 ancestor 影響、永遠相對 viewport

業界範式：Radix UI Dialog/Tooltip/DropdownMenu 全用 Portal 同樣理由。
```

### 12.3 commit 15 user 表格 Excel-like + pageSize selector

```
Crown 拍板：
  - 桌面表格像 Google 試算表（網格線、欄位邊界清楚）
  - 不要試算表的座標列（A B C / 1 2 3）
  - 信箱 / 電話 / 隸屬倉庫塞不下 → 加欄位 min-width
  - 超過螢幕用滾輪滑動（既有 DataTableShell 已支援）
  - 每頁筆數選擇器（10/20/50/100、預設 20）

落地：
  1. PAGE_SIZE_OPTIONS = [10, 20, 50, 100]、DEFAULT_PAGE_SIZE = 20
  2. SERVER_PAGE_SIZE=50 → pageSize state（4 處替換、setPageSize 同時 setListPage(1)）
  3. COL_WIDTH_CLASS map：12 欄各定 min-w
     * 信箱 220 / 電話 140 / 倉庫 180（Crown 揭露塞不下）
     * 其餘按內容類型給寬
  4. thead <th> 加 border-r border-b border-border/30
  5. tbody <td> 13 處加 border-r border-border/30（replace_all 'px-2 py-2.5'）
  6. UI 加 DropdownMenu「每頁 N 筆」selector
```

### 12.4 ahead 15 commit 真實清單最終

```
03a7d54 commit 15：user 表格 Excel-like + pageSize selector reference
44c6c97 commit 14（fix）：React Portal 渲染解 backdrop-filter
51fc265 commit 13（fix）：swipe 固定 visible 6
2a18189 commit 12：merge-verify §11 補揭露
116162c commit 11：refactor 3 dock + 首頁 5→6
ae6c720 commit 10：NexoraBottomDock shared
16e230c commit 9（fix）：Dock 掛點
4d177ac commit 8：merge-verify §10
15c5530 commit 7：BaseMasterMobileDock
2a1340b commit 6：merge-verify 9 段
0aebec5 commit 5：backend user-role
922df91 commit 4：user 表格 reference
a657736 commit 3：IncludeInactiveToggle
8bcf7bb commit 2：audit person + tooltip
e4172d5 commit 1：Dropdown z-index 60
```

### 12.5 後續軌 backlog 補加

```
TASK-MASTER-TABLE-ROLLOUT-EXCEL（P1、20 view rollout commit 15 範式）：
  - 每 view 加 COL_WIDTH_CLASS map（按欄位類型）
  - thead + tbody border-r 套用
  - PageSize selector 整合
  - 規模：20 view × 30-50 行 = 約 800 行

TASK-USER-PREF-PAGESIZE（P3、localStorage 持久化 pageSize）：
  - 抽 useUserPagePref hook
  - sessionStorage / localStorage 範式
```

⭐ Crown 戰略「桌面表格 Google 試算表範式 + 客戶友善欄寬 + 自選每頁筆數」完整對齊。
