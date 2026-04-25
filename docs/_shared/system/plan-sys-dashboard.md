# PLAN_SYS_DASHBOARD — 首頁儀表板開發計畫書

> 存放位置：`nexora/docs/flows/PLAN_SYS_DASHBOARD_首頁儀表板.md`
> 對應規格：`docs/ui/SYS_DASHBOARD.md` / `docs/ui/SYS_LAYOUT.md`
> 路由：`/dashboard`
> 最低版本：LITE
> 建立日期：2026-04-13
> 狀態：📝 規劃中
> 路由對照：**一律依** [ROUTE_TABLE_v2.0_路由標準表](./ROUTE_TABLE_v2.0_路由標準表.md)（語意化 `/dashboard/*`，不使用 `nx01` 等路徑）

---

## 0. 概述

### 業務說明

首頁儀表板是使用者登入後的第一個畫面，依訂閱版本（LITE / PLUS / PRO）呈現不同的資訊密度與功能深度。它同時也是整個系統的「共用殼層（Shell）」基礎，包含 TOP BAR、KPI BAR、全域快捷鍵等所有頁面共用的元件。

### 涉及版本與角色

| 版本 | 顯示區塊 |
|------|---------|
| LITE | TOP BAR / 行事曆 / 今日事件 / 今日工作 |
| PLUS | + 今日上班人員 |
| PRO | + EXP BAR / LEFT PANEL（簽到/目標/日誌）|

### 依賴關係

- 本計畫書是所有其他模組的**前置基礎**
- 完成後將建立系統共用元件庫（TopBar、Layout Shell 等）
- 後續所有模組頁面直接複用這些共用元件

### 注意事項

- 本階段全部使用 **Mock Data**，不串接後端
- 首頁完成後必須先做**模組化優化（Phase 2）**，再進入下一個模組
- 三個版本的版型差異透過 `planCode` prop 控制，**不做三個獨立頁面**
- **Mock 導向路由、模組選單字母跳轉**：與 `ROUTE_TABLE_v2.0` 第十三章一致；實作若仍暫用舊 `/dashboard/nx**` URL，須列為「技術債」並在遷移完成後改連結
- **快捷鍵語意**：`Alt+字母` 為頂欄／全域（如 `Alt+A` 公告）；**模組選單（Alt+X）開啟後**為**單鍵字母**（不含 Alt）跳轉——與路由表第十三章不衝突

---

## Phase 1｜前端畫面（Mock Data）

### 1-1 目標

完成首頁所有視覺元件，使用假資料呈現完整的 PRO 版畫面（涵蓋最多元件），並透過 `planCode` 切換展示 LITE / PLUS 版的差異。

### 1-2 開發任務清單

#### Task 1：建立 Layout Shell（最優先）

> 所有頁面的外框，後續每個模組都會直接使用

**檔案：**
```
apps/nx-ui/src/
├── app/
│   └── dashboard/
│       └── layout.tsx          ← Dashboard 共用 Layout
├── components/
│   └── layout/
│       ├── TopBar.tsx
│       ├── KpiBar.tsx          ← PRO 限定
│       └── MainShell.tsx       ← 組合 TopBar + KpiBar + 頁面主體
```

**TopBar 內容：**
- 左側：Logo（NEXORA GRID 字樣）+ 版本 Badge（LITE/PLUS/PRO 金色外框）+ 當前模組名稱
- 中間：即時日期時間（`YYYY年M月D日 星期X / 下午HH:MM:SS`，每秒更新）
- 右側：公告按鈕（📢）/ 通知按鈕（🔔）/ 深淺模式（🌙）/ 使用者 Dropdown
- 公告 Dropdown 底部「查看所有公告」連結：`/dashboard/bulletin`（見路由標準表 §一）

**使用者 Dropdown 選項：**
```
個人設定
系統設定
──────
登出系統
```

**公告 Dropdown 結構（Mock）：**
```typescript
const mockBulletins = [
  { id: 1, type: 'URGENT', title: '系統維護通知', date: '2026-04-13', isRead: false },
  { id: 2, type: 'COMPANY', title: '4月份業績公告', date: '2026-04-12', isRead: false },
  { id: 3, type: 'SYSTEM', title: '新功能上線：行事曆', date: '2026-04-10', isRead: true },
]
```

**全域快捷鍵（在 Layout 層實作）：**

| 快捷鍵 | 功能 |
|--------|------|
| `Alt+X` | 開關模組選單 |
| `Alt+N` | 開關通知 Dropdown |
| `Alt+A` | 開關公告 Dropdown |
| `Alt+T` | 切換深淺模式 |
| `Alt+U` | 開關使用者 Dropdown |
| `/` | 聚焦全域搜尋（首頁限定）|

---

#### Task 2：EXP BAR（PRO 限定）

**檔案：**
```
components/dashboard/ExpBar/
├── ExpBar.tsx
└── MedalModal.tsx
```

**版面（左 → 右）：**
```
[頭像+等級圈]  [稱號 黃金大師 Lv.12 ★★★]  [████████░░ 3,200 / 4,500]  [金牌 II 按鈕]
```

**Mock Data：**
```typescript
const mockExpData = {
  currentLevel: 12,
  currentExp: 3200,
  nextLevelExp: 4500,
  medalName: '黃金大師',
  medalCode: 'GOLD',
  medalRank: 'II',
  userName: '林翰杰',
}
```

**MedalModal（點擊排位按鈕展開）：**
- Tab 1「牌位勳章」：顯示四個牌位（銅/銀/金/白金）解鎖進度
- Tab 2「排行榜」：本週 / 本月 / 總榜，我的排名固定置底金色高亮

---

#### Task 3：LEFT PANEL（PRO 限定）

**檔案：**
```
components/dashboard/LeftPanel/
├── CheckinCard.tsx
├── CheckinRewardModal.tsx
├── DailyGoalCard.tsx
├── MonthlyGoalCard.tsx
└── DailyReportBtn.tsx
```

**3-1 今日簽到卡（兩種狀態）：**

未簽到：
```
[●綠點] 今日簽到   [7天] [獎勵▼]
        開始您的工作日
[橘金色大按鈕：簽到]
```

已簽到：
```
[●綠點] 00:08:58   [7天] [獎勵▼]
        下午04:52 簽到
```

**3-2 本日目標卡：**
```
[●橘圓] 本日目標              70 / 125 XP

[✓] 完成5項工作任務           +50
[✓] 準時上班簽到              +20
[ ] 參與一場會議   ⏰10:00    +30
[ ] 填寫工作日誌              +25

已完成 2 / 4 項
```

**3-3 本月目標卡（三 Tab）：**
```
[●橘圓] 本月目標   [公司] [團隊] [個人]

月營收目標     850 / 1000萬   ↑
客戶滿意度     92 / 95%       ↑
新客戶開發     45 / 60 家

查看詳細目標 >
```

**3-4 填寫工作日誌按鈕：**
- 未填：橘金色大按鈕「📄 填寫工作日誌」
- 已填：綠色「✓ 今日日誌已完成 +25 XP」

---

#### Task 4：RIGHT PANEL — 行事曆 + 今日事件

**檔案：**
```
components/dashboard/RightPanel/
├── CalendarCard.tsx
├── TodayEventCard.tsx
└── TodayAttendanceCard.tsx     ← PLUS+
```

**行事曆（CalendarCard）：**
- 月曆格式，今日橘色方塊高亮
- 有事件的日期底部橘色小圓點
- `<` `>` 切換月份
- `+ 新增` 展開 Dropdown：申請排假 / 新增會議 / 新增活動

**Mock 行事曆事件：**
```typescript
const mockCalendarEvents = [
  { date: '2026-04-13', type: 'MEETING', title: '產品規劃會議', time: '10:00-11:30', location: '會議室A' },
  { date: '2026-04-13', type: 'EVENT', title: '團隊午餐', time: '12:00-13:30', requireRsvp: true },
  { date: '2026-04-18', type: 'DEADLINE', title: 'Q1 報表截止', time: '18:00' },
]
```

**今日事件卡（TodayEventCard）：**
- 事件類型顏色邊框：
  - MEETING：藍色 `#378ADD`
  - EVENT：橘色 `#E8A020`
  - LEAVE：綠色 `#1D9E75`
  - DEADLINE：紅色 `#E24B4A`
- `require_rsvp=TRUE` 的事件顯示 ✓ ✗ 回覆按鈕

**今日上班卡（PLUS+ / TodayAttendanceCard）：**
```
今日上班        5人
[WM●] [ML●] [DW●] [JH○] [ZH●]
```
- 綠點 = 已出勤 / 橘點 = 請假 / 灰點 = 未打卡
- 點擊頭像顯示 tooltip 狀態

---

#### Task 5：RIGHT PANEL — 今日工作（全版本）

**檔案：**
```
components/dashboard/RightPanel/
└── TodayTaskList.tsx
```

**版面：**
```
[💼 今日工作]                   1/5 完成  [+15 XP]（PRO 才顯示 XP）

[○] 審核本月銷售報表
    檢查並批准 Q1 銷售數據報表
    [緊急] [報表]  ⏰10:00                +30（PRO）

[✓] 更新庫存資料（刪除線 + 變暗）
    [一般] [庫存]  ⏰14:00                +15（PRO）

查看所有工作 >
```

**Mock Data：**
```typescript
const mockTasks = [
  { id: 1, title: '審核本月銷售報表', desc: '檢查並批准 Q1 銷售數據', priority: 'URGENT', category: '報表', deadline: '10:00', xp: 30, done: false, targetRoute: '/dashboard/report/workspace' },
  { id: 2, title: '回覆客戶抱怨郵件', desc: '', priority: 'URGENT', category: '客服', deadline: '11:30', xp: 20, done: false, targetRoute: '/dashboard/sales/customer' },
  { id: 3, title: '更新庫存資料', desc: '', priority: 'NORMAL', category: '庫存', deadline: '14:00', xp: 15, done: true, targetRoute: '/dashboard/inventory/workspace' },
  { id: 4, title: '參加團隊週會', desc: '', priority: 'NORMAL', category: '會議', deadline: '15:00', xp: 10, done: false, targetRoute: '/dashboard' },
]
```

---

#### Task 6：模組選單（Alt+X 展開）

**版面（字母與路由以 `ROUTE_TABLE_v2.0` §13 為準）：**
```
┌────────────────────────────────────────┐
│ 模組總覽                                │
│ [首頁] H                                │
│ [主檔] B    [採購] P                    │
│ [庫存] W    [銷售] S                    │
│ [財務] M    [經營分析] R                │
│（PRO 才顯示）[物流] L [人資] A [知識] K [遊戲化] G │
└────────────────────────────────────────┘
```

- 固定在畫面中央（或左側），按 `Alt+X` 開關
- **選單開啟後**按**單鍵**（H/B/P/W/S/M/L/A/R/K/G，不需 Alt）跳轉；詳見路由標準表
- **LITE / PLUS**：不顯示 L、A、R、K、G 五鍵（PRO 限定模組）

**目標路由範例：**

| 鍵 | 路由 |
|----|------|
| H | `/dashboard` |
| B | `/dashboard/base` |
| P | `/dashboard/purchase/domestic` |
| W | `/dashboard/inventory/workspace` |
| S | `/dashboard/sales/domestic` |
| M | `/dashboard/finance/workspace` |
| L | `/dashboard/logistics/workspace` |
| A | `/dashboard/hr/workspace` |
| R | `/dashboard/report/workspace` |
| K | `/dashboard/knowledge/workspace` |
| G | `/dashboard/game` |

---

#### Task 7：DashboardPage 組裝

**檔案：**`app/dashboard/page.tsx`

依 `planCode` 組合對應區塊：

```typescript
// 依版本決定顯示哪些區塊
const showExpBar = planCode === 'PRO'
const showLeftPanel = planCode === 'PRO'
const showAttendance = planCode === 'PLUS' || planCode === 'PRO'
const showXP = planCode === 'PRO'
```

---

### 1-3 Mock Data 彙整

**模擬登入使用者（`mockCurrentUser`）：**
```typescript
export const mockCurrentUser = {
  id: 'USR-001',
  name: '林翰杰',
  role: '系統管理員',
  planCode: 'PRO',      // 切換此值測試三種版型
  tenantName: '恆迎企業',
  avatarInitial: '林',
  unreadBulletins: 2,
  unreadNotifications: 5,
}
```

**建議做法：** 在 `src/mocks/dashboard.ts` 集中存放所有 Mock Data，方便後續串接時一次替換。

---

### 1-4 驗收標準（Phase 1）

Crown 確認以下項目後 Phase 1 完成：

- [ ] 切換 `planCode = 'LITE'`：只看到 TOP BAR / 行事曆 / 今日事件 / 今日工作
- [ ] 切換 `planCode = 'PLUS'`：加上今日上班卡
- [ ] 切換 `planCode = 'PRO'`：加上 EXP BAR + LEFT PANEL
- [ ] 日期時間每秒即時更新
- [ ] 公告 Dropdown 可展開，顯示 3 筆 Mock 公告，未讀 badge 顯示 2
- [ ] 使用者 Dropdown 可展開，顯示「個人設定 / 系統設定 / 登出」
- [ ] 今日簽到：可切換未簽到 ↔ 已簽到兩種狀態（點擊模擬）
- [ ] 今日工作：可點擊 checkbox 切換完成狀態（視覺變暗 + 刪除線）
- [ ] 深淺模式切換正常
- [ ] Alt+X 開關模組選單
- [ ] 行事曆可切換月份
- [ ] MedalModal 可開關，兩個 Tab 都能切換
- [ ] 響應式：縮小到 768px 以下，確認版面不爆版

---

## Phase 2｜前端模組化優化

> **必須在進入下一個模組前完成此 Phase**

### 2-1 可抽離的共用元件清單

完成 Phase 1 後，Hank 須逐一審視以下元件，確認是否可提升為系統共用層級：

| 元件 | 建議路徑 | 說明 |
|------|---------|------|
| `TopBar` | `components/shared/layout/TopBar.tsx` | 所有頁面共用 |
| `KpiBar` | `components/shared/layout/KpiBar.tsx` | PRO 所有模組共用 |
| `MainShell` | `components/shared/layout/MainShell.tsx` | Dashboard Layout 外框 |
| `Badge` | `components/shared/ui/Badge.tsx` | LITE/PLUS/PRO 版本 badge、優先度 badge |
| `ProgressBar` | `components/shared/ui/ProgressBar.tsx` | 金色漸層進度條（EXP BAR / KPI）|
| `AvatarInitial` | `components/shared/ui/AvatarInitial.tsx` | 姓名首字頭像 |
| `Modal` | `components/shared/ui/Modal.tsx` | 通用 Modal 殼層（含 Tab）|
| `Dropdown` | `components/shared/ui/Dropdown.tsx` | 通用 Dropdown 殼層 |
| `CheckboxTask` | `components/shared/ui/CheckboxTask.tsx` | 可打勾的任務列（今日工作用）|
| `CalendarGrid` | `components/shared/ui/CalendarGrid.tsx` | 月曆格（含圓點事件標記）|
| `useKeyboardShortcut` | `hooks/useKeyboardShortcut.ts` | 全域快捷鍵 hook |
| `useRealTimeClock` | `hooks/useRealTimeClock.ts` | 即時時鐘 hook |
| `useThemeToggle` | `hooks/useThemeToggle.ts` | 深淺模式切換 hook |

### 2-2 可抽離的 Util 函式

| 函式 | 建議路徑 | 說明 |
|------|---------|------|
| `formatTaiwanDateTime` | `lib/utils/datetime.ts` | 台灣格式日期時間（2026年4月13日 星期一）|
| `formatExp` | `lib/utils/exp.ts` | Exp 數字格式化（3,200 / 4,500）|
| `getPlanFeatures` | `lib/utils/plan.ts` | 依 planCode 回傳功能開關物件 |
| `getEventTypeColor` | `lib/utils/calendar.ts` | 事件類型 → 顏色代碼 |

### 2-3 顏色系統確認

確認以下 CSS 變數已定義在全域 CSS 或 Tailwind config：

```css
--color-primary: #E8A020;         /* 橘金主色 */
--color-primary-light: #F5C842;   /* 漸層亮色 */
--color-primary-bg: rgba(232,160,32,0.15);  /* 微金底色 */
--color-success: #1D9E75;         /* 綠色 */
--color-danger: #E24B4A;          /* 紅色 */
--color-meeting: #378ADD;         /* 會議藍 */
```

### 2-4 產出文件

完成模組化後，Hank 須產出：

**`docs/modules/MODULE_SHARED_UI.md`**

格式範例：
```markdown
# MODULE_SHARED_UI — 共用 UI 元件說明

## Badge
路徑：components/shared/ui/Badge.tsx
Props：variant ('lite'|'plus'|'pro'|'urgent'|'normal'), label: string
用途：版本標籤、優先度標籤

## ProgressBar
路徑：components/shared/ui/ProgressBar.tsx
Props：current: number, max: number, variant ('gold'|'green'|'red')
用途：EXP 進度條、KPI 進度條
...
```

**`docs/modules/MODULE_SHARED_HOOKS.md`**

格式範例：
```markdown
# MODULE_SHARED_HOOKS — 共用 Hook 說明

## useKeyboardShortcut
路徑：hooks/useKeyboardShortcut.ts
參數：key (string), callback (()=>void), deps?
用途：全域快捷鍵綁定

## useRealTimeClock
路徑：hooks/useRealTimeClock.ts
回傳：{ dateStr, timeStr }（台灣格式）
用途：TOP BAR 即時時鐘
...
```

---

## Phase 3｜Schema 確認

> 本計畫書的 Schema 確認僅列出首頁會用到的資料表，確認欄位無誤後才做 Seed

### 首頁涉及的資料表

| 資料表 | 用途 | 版本 |
|--------|------|------|
| `nx99_tenant` | 租戶名稱、planCode | ALL |
| `nx01_bulletin` | 公告清單 | ALL |
| `nx01_calendar_event` | 行事曆事件 | ALL |
| `nx10_user_exp` | EXP / 等級 / 勳章 | PRO |
| `nx10_medal_level` | 勳章稱號設定 | PRO |
| `nx10_checkin_log` | 簽到記錄 | PRO |
| `nx10_checkin_reward` | 簽到獎勵設定 | PRO |
| `nx10_task_log` | 當日任務清單 | PRO |
| `nx01_kpi_record` | KPI 達成值 | PRO |
| `nx01_kpi_target` | KPI 目標值 | PRO |
| `nx07_attendance` | 今日出勤 | PLUS+ |
| `nx08_daily_report` | 工作日誌是否已填 | PRO |

> 詳細欄位定義請參閱各模組 `_field_v1.csv`

---

## Phase 4｜Seed 資料

### 4-1 預設資料（系統初始必備）

| 資料表 | 說明 | 筆數 |
|--------|------|------|
| `nx10_checkin_reward` | 連續簽到獎勵設定（1天/2天/7天...）| 7 筆 |
| `nx10_medal_level` | 勳章等級設定（銅IV~白金I，共16階）| 16 筆 |
| `nx01_bulletin` | 系統歡迎公告 | 1 筆 |

### 4-2 測試資料

| 資料表 | 內容 | 筆數 |
|--------|------|------|
| `nx99_tenant` | 測試租戶「恆迎企業」，planCode = PRO | 1 筆 |
| `nx01_bulletin` | 不同類型公告（緊急/公司/系統）| 5 筆 |
| `nx01_calendar_event` | 本月各類事件（MEETING/EVENT/LEAVE/DEADLINE）| 8 筆 |
| `nx10_user_exp` | 測試使用者 EXP（Lv.12，3200/4500）| 1 筆 |
| `nx10_checkin_log` | 最近 30 天簽到記錄（含空缺天）| 30 筆 |
| `nx10_task_log` | 今日任務 4 筆（2完成/2未完成）| 4 筆 |
| `nx07_attendance` | 今日出勤 5 人（4出勤/1請假）| 5 筆 |

---

## Phase 5｜後端 API

### API 清單

| Method | Endpoint | 說明 | 版本 |
|--------|----------|------|------|
| GET | `/api/dashboard/summary` | 首頁彙整資料（公告/任務/行事曆）| ALL |
| GET | `/api/bulletins?unread=true&limit=5` | 未讀公告清單 | ALL |
| PATCH | `/api/bulletins/:id/read` | 標記公告已讀 | ALL |
| GET | `/api/calendar/events?date=YYYY-MM` | 當月行事曆事件 | ALL |
| GET | `/api/exp/me` | 當前使用者 EXP 資料 | PRO |
| GET | `/api/leaderboard?period=week` | 排行榜（week/month/all）| PRO |
| POST | `/api/checkin` | 執行今日簽到 | PRO |
| GET | `/api/checkin/today` | 今日簽到狀態 | PRO |
| GET | `/api/tasks/today` | 今日任務清單 | PRO |
| PATCH | `/api/tasks/:id/done` | 標記任務完成 | PRO |
| GET | `/api/kpi/summary?type=company` | 本月 KPI 摘要 | PRO |
| GET | `/api/attendance/today` | 今日出勤人員 | PLUS+ |
| GET | `/api/daily-report/today` | 今日日誌是否已填 | PRO |

---

## Phase 6｜前後端串接

| 元件 | 替換 Mock Data 的 API |
|------|----------------------|
| `TopBar` - 公告 badge | `GET /api/bulletins?unread=true` |
| `BulletinDropdown` | `GET /api/bulletins?unread=true&limit=5` + `PATCH read` |
| `ExpBar` | `GET /api/exp/me` |
| `MedalModal` Tab2 排行榜 | `GET /api/leaderboard?period=week` |
| `CheckinCard` | `GET /api/checkin/today` + `POST /api/checkin` |
| `DailyGoalCard` | `GET /api/tasks/today` |
| `MonthlyGoalCard` | `GET /api/kpi/summary` |
| `CalendarCard` | `GET /api/calendar/events` |
| `TodayEventCard` | 同上，過濾當日 |
| `TodayAttendanceCard` | `GET /api/attendance/today` |
| `TodayTaskList` | `GET /api/tasks/today` + `PATCH done` |

---

## Phase 7｜測試清單

> Crown 請依序執行以下測試，每項完成後截圖存入 `docs/screenshots/dashboard/`

### 7-1 版型切換測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T01 | LITE 版型 | 切換 planCode = LITE | 只顯示 TOP BAR / 行事曆 / 今日事件 / 今日工作，無 EXP BAR 與 LEFT PANEL |
| T02 | PLUS 版型 | 切換 planCode = PLUS | 加上今日上班卡，其餘同 LITE |
| T03 | PRO 版型 | 切換 planCode = PRO | 顯示全部區塊，包含 EXP BAR 和 LEFT PANEL |

### 7-2 TOP BAR 測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T04 | 即時時鐘 | 進入首頁，等待 3 秒 | 秒數即時跳動更新 |
| T05 | 公告 Dropdown | 點擊 📢 按鈕 | 展開公告列表，顯示 2 筆未讀（有紅色 badge）|
| T06 | 公告標記已讀 | 點擊某一公告的 `>` 箭頭 | 該公告標記已讀，badge 數字 -1 |
| T07 | 使用者 Dropdown | 點擊右上角使用者頭像 | 展開「個人設定 / 系統設定 / 登出」|
| T08 | 深淺模式 | 點擊 🌙，或按 Alt+T | 畫面切換深色/淺色模式，再按一次切回 |
| T09 | 鍵盤：Alt+A | 按 Alt+A | 開關公告 Dropdown |
| T10 | 鍵盤：Alt+U | 按 Alt+U | 開關使用者 Dropdown |

### 7-3 模組選單測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T11 | 開關選單 | 按 Alt+X | 出現模組選單，再按一次關閉 |
| T12 | 鍵盤跳轉 | 選單開啟後按 P | 跳轉至採購工作台 `/dashboard/purchase/domestic` |
| T13 | ESC 關閉 | 選單開啟後按 Esc | 選單關閉 |

### 7-4 行事曆測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T14 | 今日高亮 | 進入首頁 | 今日日期顯示橘色方塊 |
| T15 | 事件圓點 | 查看有事件的日期 | 日期下方顯示橘色小圓點 |
| T16 | 切換月份 | 點擊 `<` 或 `>` | 月份前後切換，日曆更新 |
| T17 | 新增 Dropdown | 點擊 `+ 新增` | 顯示「申請排假 / 新增會議 / 新增活動」|

### 7-5 今日事件測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T18 | 事件類型顏色 | 查看今日事件列表 | 會議=藍色邊框，活動=橘色邊框 |
| T19 | RSVP 回覆 | 點擊有 ✓ ✗ 的事件 | 可點擊確認或拒絕出席 |
| T20 | 事件詳情 | 點擊任一事件 | 開啟事件詳情 Modal |

### 7-6 EXP BAR 測試（PRO）

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T21 | EXP 進度條 | 查看 EXP BAR | 金色漸層進度條，顯示 3,200 / 4,500，「還需 1,300 經驗值」|
| T22 | 排位 Modal | 點擊右側金牌 II 按鈕 | 開啟 Modal，Tab 1 顯示牌位進度 |
| T23 | 排行榜 Tab | 在 Modal 切換到 Tab 2 | 顯示排行榜，本人排名金色高亮置底 |
| T24 | 榜單切換 | 點擊「本週 / 本月 / 總榜」| 排行榜資料切換 |

### 7-7 LEFT PANEL 測試（PRO）

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T25 | 簽到前狀態 | 進入首頁（未簽到）| 顯示橘金色大按鈕「簽到」|
| T26 | 執行簽到 | 點擊「簽到」按鈕 | 變為已簽到狀態，計時器開始計時 |
| T27 | 計時器運作 | 簽到後等待 3 秒 | 計時器秒數更新 |
| T28 | 簽到獎勵 | 點擊獎勵按鈕 | 開啟簽到獎勵 Modal，顯示連續簽到進度 |
| T29 | 任務打勾 | 點擊本日目標中未完成任務 | 任務變為打勾 + 刪除線，XP 累計增加 |
| T30 | 月目標切換 | 點擊公司 / 團隊 / 個人 Tab | 對應 KPI 資料切換顯示 |
| T31 | 工作日誌按鈕 | 點擊「填寫工作日誌」| 跳轉 `/dashboard/report/daily` |

### 7-8 今日工作測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T32 | 任務完成切換 | 點擊 checkbox | 整列變暗 + 刪除線，完成數 +1 |
| T33 | 已完成取消 | 再次點擊已完成任務 | 恢復未完成狀態 |
| T34 | 跳轉頁面 | 點擊任務列（非 checkbox）| 跳轉至對應模組頁面 |
| T35 | XP 顯示（PRO）| PRO 版查看今日工作 | 每個任務右側顯示 +XP 數字 |
| T36 | XP 不顯示（LITE）| LITE 版查看今日工作 | 無任何 XP 相關顯示 |

### 7-9 響應式測試

| # | 測試項目 | 操作步驟 | 預期結果 |
|---|---------|---------|---------|
| T37 | 平板版型 | 瀏覽器縮小至 900px | TOP BAR 縮略，PRO 的 LEFT PANEL 收合為 icon 欄 |
| T38 | 手機版型 | 瀏覽器縮小至 375px | 底部固定導覽列出現，內容單欄排列 |

---

## 附錄：相關文件

| 文件 | 路徑 |
|------|------|
| 路由標準表 v2.0 | `docs/flows/ROUTE_TABLE_v2.0_路由標準表.md` |
| 畫面規劃 | `docs/ui/SYS_DASHBOARD.md` |
| 共用版型規則 | `docs/ui/SYS_LAYOUT.md` |
| 共用元件說明（Phase 2 產出）| `docs/modules/MODULE_SHARED_UI.md` |
| 共用 Hook 說明（Phase 2 產出）| `docs/modules/MODULE_SHARED_HOOKS.md` |
| 截圖存放 | `docs/screenshots/dashboard/` |

---

## 完成記錄

> ⚠️ 每個 Phase 完成後由 Hank 當天填寫，Crown 驗收後填寫驗收結果。記錄一經建立不可刪除。

### Phase 1｜前端畫面（Mock Data）
- **完成時間**：2026-04-13 12:00
- **完成人**：Hank
- **本次修改摘要**：
  - `components/layout`：TopBar、MainShell、KpiBar；`components/dashboard/*`：ExpBar、LeftPanel、RightPanel、ModuleMenuOverlay
  - `features/sys-dashboard/ui/SysDashboardPage.tsx` + `app/dashboard/page.tsx`；Mock 集中 `src/mocks/dashboard.ts`
  - Demo 模式：`hooks/useDemoSession.ts`、`useSessionMe` 短路、`middleware.ts`；`.env.local` 範例變數（不進版控）
  - 路由：`next.config.ts` 將 `/base` 永久導向 `/dashboard/base`，並以 `rewrites` 對應既有 `app/base/*`；`app/dashboard/bulletin/page.tsx` 公告占位；TopBar 公告「查看全部」→ `/dashboard/bulletin`
  - `DashboardShell`：`/dashboard` 首頁全幅殼；`TopModuleTabs` HOME → `/dashboard`
- **已知問題 / 待確認**：
  - 其餘 v2 語意路徑（如 `/dashboard/purchase/domestic`）尚未全面建立，模組選單仍可能指向舊 URL 或待擴充 redirect/頁面
  - Next.js 對 `middleware` 慣例之 deprecation 提示仍可能出现（與本任務無直接關係）
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 2｜前端模組化優化
- **完成時間**：
- **完成人**：Hank
- **本次修改摘要**：
  -
- **已知問題 / 待確認**：
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 3｜Schema 確認
- **完成時間**：2026-04-13（本機 db-core：spec v7 baseline 已套用並與 `prisma/schema.prisma` 同步）
- **完成人**：Hank（Cursor）
- **本次修改摘要**：
  - `docs/spec` 驅動之 Prisma schema（含欄位 `///` 與「啟用最低需求版本」）與首包 migration `20260413120000_spec_v7_baseline`（內含 128 組 `gen_*_id()` + 全表 DDL）已於本機 `nexora_core` 驗證；`migrate deploy` / `migrate dev` / `validate` 通過。
- **已知問題 / 待確認**：
  - 生產／Railway 須另依流程執行 `migrate deploy`，**不可**在未備份下對生產庫使用 `DROP SCHEMA public CASCADE`。
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 4｜Seed 資料
- **完成時間**：2026-04-13
- **完成人**：Hank（Cursor）
- **本次修改摘要**：
  - 新增 `packages/db-core/prisma/seed/`：`index.ts`（`system` / `default` / `test`）、`system/nx01_view.ts` + `system/nx01_role_view.ts`（讀取 `prisma/seed-data/system/*.csv`，UTF-8 BOM 已處理）、`default/*` 租戶初始化模組、`test/lite|plus|pro` 占位。
  - `package.json`：`seed:system` / `seed:default` / `seed:test` / `seed:test:plus` / `seed:test:pro`；`prisma.config.ts` 的 `db seed` 指向 `default`。
  - 驗證：`nx01_view` 118 筆、`nx01_role_view` 826 筆；`SYSADMIN`（`NX01USER0000001`）`is_active=false`；租戶 admin（`NX01USER0000002`）`is_active=true`；恆迎企業 `NX99TANT0000001` 訂閱 `NEXORA-PRO`。
  - Schema 修正：`nx99_subscription.currency_id` 改為 `VARCHAR(15)`（migration `20260413140000_nx99_subscription_currency_id_len`），與 `nx01_currency.id` 對齊。
  - **說明**：規格中的 `nx10_checkin_reward` 表尚未存在於 v7 schema，連續簽到 7 筆獎勵以 `nx10_task_template`（代碼 `STREAK_D1`～`STREAK_D7`）寫入。
- **已知問題 / 待確認**：
  - `nx01_role` / `nx01_warehouse` 等表目前為 DB 層級 `code` 全域唯一（非 `tenant_id+code`）；多租戶正式上線前需 Crown 與 schema 一併檢視。
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 5｜後端 API
- **完成時間**：2026-04-14
- **完成人**：Hank（Cursor）
- **本次修改摘要**：
  - **NX01～NX10 後端 API 已全部落地**（儀表板 Phase 5 後端範圍）：`Nx01Module`～`Nx10Module` 皆已掛入 `AppModule`；各模組 fetch 驗證腳本見 `apps/nx-api/scripts/nx*-crud-fetch-test.mjs`（NX08+NX09 共用 `nx08-nx09-crud-fetch-test.mjs`）。
  - **NX10（PRO）**：`migration 20260418120000_nx10_checkin_log` 新增 `nx10_checkin_log`（`gen_nx10_checkin_log_id`）；EXP／勳章以 **`nx10_emp_medal` + `nx10_emp_exp_log`** 為準（規格名 `nx10_user_exp` 對應此設計）；連續簽到獎勵自 **`nx10_task_template`**（`STREAK_D1`～`STREAK_D7`）。
  - **路由**：`GET/POST /nx10/exp/*`、`/nx10/checkin/*`、`/nx10/tasks/*`（**`GET /nx10/tasks/today` 僅 Jwt**，LITE/PLUS 可讀模組彙整；其餘 NX10 路由 **`Nx10ProPlanGuard`**）、`/nx10/medals/*`、`GET /nx10/leaderboard`；簽到／任務完成／ADMIN 發放 EXP 寫 **`nx01_audit_log`（moduleCode: NX10）**。
  - **驗證**：`pnpm exec tsc --noEmit -p apps/nx-api`；`node apps/nx-api/scripts/nx10-crud-fetch-test.mjs`（含簽到 EXP、`STREAK_D1`、排行榜、`PATCH .../tasks/:id/done`）。
- **已知問題 / 待確認**：
  - 首頁 Phase 6 串接時，若採計畫書之 `/api/*` 語意路徑，需 **BFF 或 nx-ui rewrite** 對應現有 `/nx10/*` REST。
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 6｜前後端串接
- **完成時間**：
- **完成人**：Hank
- **本次修改摘要**：
  -
- **已知問題 / 待確認**：
- **Crown 驗收結果**：⏳ 待驗收

---

### Phase 7｜測試清單驗收
- **完成時間**：
- **完成人**：Crown
- **通過項目**：T01 ~ T38（共 38 項）
- **未通過項目**：
- **截圖存放位置**：`docs/screenshots/dashboard/`
- **最終驗收結果**：⏳ 待驗收
