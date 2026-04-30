<!-- docs/nx10/nx10-worklog.md -->

# NEXORA - NX10 - 遊戲化模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX10 遊戲化（checkin / exp / tasks / tasks-today / medals / leaderboard）+ NX10 主導的跨模組讀取（tasks 彙整 NX02~05）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 3 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ NX10 是 **「集大成型」worklog**（模組 worklog 收官）— 前面 9 份累積的範式在本日誌做最後總結（讀取側 3 變體 / 處理不可逆 3 策略 / 量化指標 2 模式）
- ⚠️ NX10 也是**老債揭露時機**（Crown 強調「不要再延後」）：medal_level 16 階 + A029 apply-checkin-reward 未建立、本日誌主題 1 揭露
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（過帳通用規則 / 公版 component / A002 schema drift / 接收側設計 5 個必備配對 / 跨模組測試基礎設施演進）
- ⭐ **末尾列「累計範式總表」**（給未來新對話 Hank + 已被 [_shared/worklog.md](../_shared/worklog.md) 複用、加新增第 8 分類「工程文化範式」）

---

## 主題 1｜v7_baseline + Phase5-NX10 第十批 API 落地（PRO + 跨方案例外 + 老債揭露）

> 子段落 1A 時區 util / 1B tasks-today 跨方案例外 / 1C medal_level 16 階老債 / 1D A029 apply-checkin-reward 未建立老債

### 起源

`spec_v7_baseline` 建好 NX10 schema（emp_medal / emp_exp_log / task_template / emp_task_log / medal_level 等）。Phase5「第十批 API」是最後一批、跟 NX08/NX09 同走 PRO 方案、但業務本質完全不同：**遊戲化是「累積式系統」**（exp 累積、streak 累積、勳章累積）、跟其他模組「業務動作 → 結果」模式不同。

> ⚠️ **NX10 沒 spec/intent、有 workflow/primary 2 份**（跟 NX05~09 同模式）：`nx10-w01-quest-system.md`（任務系統）+ `nx10-w02-job-class-system.md`（轉職系統 — ⚠️ 業務 spec 提到、schema 是否支援待 audit、見缺口 #5）。

### 設計決策

#### 後端結構

```
nx10/
├── nx10.module.ts
├── nx10-timezone.util.ts        ⭐ cross-cutting util（不在子目錄）
├── checkin/                      ← 每日簽到 + STREAK_D{n}
├── exp/                          ← 點數累積 + 跨閾值晉級 medal
├── leaderboard/                  ← week/month/all 排行榜
├── medals/                       ← 勳章查詢
└── tasks/
    ├── nx10-tasks.controller.ts       ← PRO-only 任務管理
    └── nx10-tasks-today.controller.ts ← 跨方案「今日待辦」（見 1B）
```

5 目錄 / 6 controller（tasks 含 2 controller）+ 1 PRO guard + 1 cross-cutting timezone util。

### 1A. `nx10-timezone.util.ts` 跨模組獨有設計

NX10 是 NEXORA 唯一需要跨模組共用時區邏輯的模組：
- **簽到日切**：00:00 是哪個時區的 00:00？租戶設台北時區、員工出差到 LA 簽到、是台北的 23:00 還是 LA 的 09:00？
- **streak 計算**：連續簽到 7 天、跨日判斷必須對齊租戶時區
- **leaderboard period**：「本週」是租戶時區的週一 ~ 週日

util 抽成 cross-cutting（在 `nx10/` 根目錄、不在子目錄）— 跟 [NX06 主題 1 dn-logistics service helper](../nx06/nx06-worklog.md) 同模式（多子模組共用、不適合放單一子目錄）。

**設計核心**：
- 所有時區計算統一走 util、避免 5 個子模組各自寫一份
- util 接 `tenantTimezone`（從 nx99_tenant 取）+ `clientTimezone`（fallback）
- 內部用 `Intl.DateTimeFormat` 不依賴外部 lib（如 moment-timezone）— Node.js 內建支援

### 1B. tasks-today 跨方案例外（版本 gate 反例）

NX10 整模組是 PRO-only、**但 `GET /nx10/tasks/today` 例外**：

```
GET /nx10/tasks/today    ← 僅 Jwt（LITE/PLUS/PRO 都能用）
GET /nx10/tasks          ← PRO 限定（任務系統管理）
PATCH /nx10/tasks/:id/done ← PRO 限定
```

**為什麼 tasks-today 例外**：「今日待辦」是員工每天進系統第一眼看的入口、業務上**必須對所有方案開放**。LITE 員工也要看「今天我要做哪些事」、不能因為 LITE 沒買遊戲化就看不到。

**揭露原則**：**版本 gate 不是模組層級、是 endpoint 層級**。整模組標 PRO 是「**預設 PRO**」、個別 endpoint 可降級開放。未來其他模組若有「全方案入口」例外、可參考此設計（如 NX08 daily-report 也有跨方案需求嗎？— 待 audit）。

### 1C. ⭐ 老債揭露：medal_level 16 階 vs 原 spec 20 階

實際 schema：**16 階**（4 tier × 4 rank）：
- 4 tier：BRONZE / SILVER / GOLD / PLATINUM
- 4 rank：IV → III → II → I

原 PROJECT_CONTEXT spec 寫 20 階、實際只有 16 階。差異來自 spec 寫得早、實作時收斂為 4×4 矩陣（更整齊）。

PROJECT_CONTEXT 已修為 16 階（[NX01 主題 4](../nx01/nx01-worklog.md) 提過、TASK-SEED-REFACTOR-01 0421 順手修）。本日誌是真相揭露完成、無後續處理。

### 1D. ⭐ 老債揭露：A029 apply-checkin-reward 從未建立

TASK-SEED-REFACTOR-01 Step 7「情境 A」決定 `apply-checkin-reward.ts` 先不做、舊邏輯保留在 `pre-53b900d` git history（`default/nx10_checkin_reward.ts`）。已登記 [system-architecture §G.5 A029](../_shared/team/system-architecture.md)。

未來處理路徑：**NX10 遊戲化正式啟用時、從 git history 撈回並參數化**（不是寫新邏輯、是復活舊邏輯）。

### 實作歷程

- 2026-04-13 `c210ce2` | SYS-DASH-P5 complete all backend API modules（NX10 含在內）
- 2026-04-13 `5866748` | SYS-DASH-P5：Phase 5 nx-api NX99-NX10 modules
- 2026-04-18（migration）`20260418120000_nx10_checkin_log` | 加 `nx10_checkin_log` 表 + `gen_nx10_checkin_log_id()` function（NX10CKLG 前綴）
- 2026-04-15 `fc09fab` | SYS-DASH-PRO add NX10 exp bar + left panel for PRO plan（前端視覺化）
- 2026-04-15 `3f0e960` | SYS-DASH-PRO checkin single btn / monthly KPI（前端、跨 NX08/NX10）
- 2026-04-21 `53b900d` | TASK-SEED-REFACTOR-01 Step 6+7：apply-checkin-reward 情境 A 決定先不做（A029 起源）

### 踩坑 / 學到的

- **時區計算「服務端統一 vs 客戶端各自處理」是核心抉擇**：第一版想客戶端傳 `clientTimezone` 服務端依此算 streak、結果跨裝置（手機 + 桌面）打卡 streak 對不齊。改服務端統一用**租戶時區**算 streak、客戶端時區只用於顯示。教訓：**業務時間（streak / period）一律服務端時區、UI 顯示才用客戶端時區**。
- **「整模組 PRO + endpoint 例外」是合法的**：第一版我以為「PRO guard 加在 module level 就要全 endpoint PRO」、Crown 拍板「**guard 在 controller method level 可覆寫 module level**」+ tasks-today 是業務必要例外。教訓：**版本 gate 設計要看業務需求、不要被「PRO 模組」字面綁死**。
- **「Phase5-NX10 是最後一批」不代表壓力小**：因為 NX10 是 PRO + 跨方案 + 跨模組讀取 + 時區、複雜度比前面任何一批都高。教訓：**Phase 編號是工程組織單位、業務複雜度看模組本質**（沿用 [NX09 主題 1](../nx09/nx09-worklog.md)「同批落地 ≠ 同類」認知）。

### Migration 列表（NX10 直接相關）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX10 schema 建立（medal_level / emp_medal / emp_exp_log / task_template / emp_task_log 等）|
| `20260418120000_nx10_checkin_log` | 加 nx10_checkin_log 表 + ID gen function（streak 計算用）|

### 對應文件

- 後端：[apps/nx-api/src/nx10/](../../apps/nx-api/src/nx10/) + [shared/nx10/nx10-pro-plan.guard.ts](../../apps/nx-api/src/shared/nx10/nx10-pro-plan.guard.ts)
- 業務流程：[docs/nx10/workflow/primary/nx10-w01-quest-system.md](workflow/primary/nx10-w01-quest-system.md) / `w02-job-class-system.md`
- 業務真相來源：[dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX10 段落
- **前端 SYS-DASH-PRO 系列**：0415 `fc09fab` exp bar / `3f0e960` checkin button / `306a1f3` attendance panel
- 對應架構債：A029（apply-checkin-reward 從未建立、見 [system-architecture §G.5](../_shared/team/system-architecture.md)）

---

## 主題 2｜跨模組讀取：tasks 彙整 NX02~05（讀取側第三種變體）

> ⭐ 跟 [NX08 主題 2 跨模組聚合層](../nx08/nx08-worklog.md) + [NX07 主題 3 主動側設計](../nx07/nx07-worklog.md) 對比、揭露 NEXORA **讀取側設計光譜**完整 3 變體。

### 起源

NX10 任務系統業務需求：「員工每天看到自己有哪些任務待辦」— 任務不是 NX10 自己定義（不是「打卡 +10 exp」這種）、而是**從業務模組挖**（採購人員看 RR 待驗收 / 業務看 SO 待出貨 / 倉管看 stock-take 待盤）。

問題：跨模組讀取怎麼設計？已知有兩種範式：
- **聚合層**（NX08）：純讀、不寫業務原始資料、不寫自己資料
- **主動側**（NX07）：寫業務原始資料（改 NX01 主檔）

NX10 都不適用：不能寫 NX02~05 業務模組（會破壞業務 ownership）、但又不能像 NX08 完全不寫（要 audit 員工完成任務、給 exp 計分）。

### 設計決策（讀取側第三種變體：讀+自寫）

| 變體 | 範例 | 寫業務原始資料？| 寫自己資料？| 判準 |
|------|------|----------------|------------|------|
| **聚合層** | NX08 monthly-report | ✗ | ✗ | 純讀視角組合、不需稽核獨立資料 |
| **主動側** | NX07 employee-change | ✓ | - | 業務語意 owner 是動作發起者 |
| **讀+自寫** ⭐ | NX10 tasks 彙整 | ✗ | ✓（nx10_emp_task_log）| **跨模組讀取 + 需自己 audit 紀錄** |

#### NX10 tasks 實作

```
GET /nx10/tasks/today
  ↓ controller (tasks-today.controller.ts、跨方案、僅 Jwt)
  ↓ service：跨模組 SELECT
    ├─ NX02 RR WHERE status='INSPECTING' AND assignee=user
    ├─ NX04 SO WHERE status='READY_TO_SHIP' AND salesperson=user
    ├─ NX03 stock-take WHERE status='COUNTING' AND assignee=user
    └─ NX10 emp_task_log WHERE user=user AND status='PENDING'  ← 自己的任務 log
  ↓ 組合回傳「員工今日待處理清單」

PATCH /nx10/tasks/:id/done
  ↓ controller (tasks.controller.ts、PRO)
  ↓ service：
    ├─ INSERT nx10_emp_task_log（標 status='DONE'、給 exp）
    └─ ⚠️ 不改業務模組原始單據狀態
```

**關鍵原則「不同模組的 audit 各自 owns」**：
- NX10 不寫 NX02 RR.status（業務狀態歸 NX02 業務流程）
- NX10 寫自己的 `nx10_emp_task_log`（遊戲化計分歸 NX10）
- 員工真的完成 NX02 RR 業務 → 走 NX02 業務流程改 RR.status；遊戲化角度認可任務完成 → 寫 NX10 task_log + 給 exp

兩條軌獨立、各自 audit、不互相寫表。

### 為什麼 NX10 不依賴業務模組做 audit

- **業務 audit ≠ 遊戲化 audit**：業務 audit 紀錄「RR 在何時被誰過帳」、遊戲化 audit 紀錄「員工何時完成何種任務拿到多少 exp」、視角不同
- **業務 schema 改動不該影響 NX10**：若 NX02 改 RR audit 欄位、NX10 不該被牽連
- **遊戲化規則可變動**：「完成 1 張 RR 給 10 exp」這種規則只在 NX10、業務模組不該知道
- **跨租戶遊戲化客製化**：未來 PRO 客戶要客製「完成 SO 給多少 exp」、改 NX10 規則、業務模組不動

### 實作歷程

- 2026-04-14 `c210ce2` 內 | tasks.controller + tasks-today.controller + service 跨模組 SELECT 邏輯

### 踩坑 / 學到的

- **「不寫業務原始資料 + 寫自己資料」是有效的第三種讀取側設計**：第一版有人提議「NX10 改 RR.status 順便給 exp」、Crown 拍板「**業務歸業務、遊戲化歸遊戲化**、兩條軌獨立」。教訓：**跨模組設計不是非黑即白（要嘛純讀要嘛寫業務）、有第三種「讀+自寫」**。
- **跨模組 SELECT 必須 N+1 防範**：tasks 彙整 4 個模組、每模組 SELECT 不 batched 會撞 N+1。沿用 [NX03 主題 4 B2 N+1 防範](../nx03/nx03-worklog.md) 同手法、`Promise.all` + 各模組各一次 IN。教訓：**跨模組讀取一律 batched、不 loop SELECT**。
- **跨模組讀取 read-only、不需 transaction**：tasks 跨 4 模組 SELECT、純讀、不需 prisma.$transaction（沿用 [NX08 主題 2](../nx08/nx08-worklog.md) 教訓）。

### 對應文件

- 後端：[apps/nx-api/src/nx10/tasks/](../../apps/nx-api/src/nx10/tasks/)
- 跨模組關聯：
  - [NX08 主題 2](../nx08/nx08-worklog.md)（聚合層、讀取側第一種變體）
  - [NX07 主題 3](../nx07/nx07-worklog.md)（主動側、寫業務模組）

---

## 主題 3｜累積式量化：exp + medal 晉級設計（append-only 累積鏈）

### 起源

遊戲化的核心是「累積式獎勵」：員工做事 → 拿 exp → 累積到閾值 → 晉級 medal。這跟前面模組的量化設計都不同：
- 不是 NX08 KPI 的 snapshot 數字（可改）
- 不是 NX05 paylog 的 sum + VOIDED 沖回（可逆）
- 不是 NX09 document 的版本演進（多筆紀錄、有 current）

是**單一方向累積**：exp 只能加、不能減（除作弊扣回極例外場景）。

### 設計決策

#### exp_log append-only 累積鏈

```
nx10_emp_exp_log（append-only）
  ├─ id
  ├─ userId
  ├─ amount        ← 一律正數
  ├─ source        ← TASK_DONE / CHECKIN / STREAK_D7 / ADMIN_AWARD
  ├─ refId         ← 來源 reference
  └─ created_at

nx10_emp_medal（current state）
  ├─ id
  ├─ userId
  ├─ medalLevelId  ← 當前勳章等級（指向 nx10_medal_level 16 階之一）
  └─ updated_at
```

`emp_exp_log` 是純 append、沒 update / delete。`emp_medal` 是 current state 表（每個 user 一筆）、晉級時 update 新 levelId。

#### 晉級邏輯

```
service.awardExp(userId, amount, source):
  1. INSERT nx10_emp_exp_log
  2. SELECT SUM(amount) FROM nx10_emp_exp_log WHERE userId=:userId  ← 累積總數
  3. 查 nx10_medal_level 找對應 level（依 expRequired）
  4. 若 level 比 emp_medal.currentLevel 高 → UPDATE emp_medal + 觸發晉級事件
```

每次 awardExp 重算 SUM 是 O(N) 但 N 不大（一個員工幾年也就幾千筆）— **「正確性 > 效能」設計選擇**（沿用 [NX08 主題 3 即時聚合](../nx08/nx08-worklog.md) 同精神）。未來慢可加 cache、不存 snapshot 欄位（避免 stale）。

### 累積式量化 vs NX08 KPI 量化指標 + NX10 累積鏈在「處理不可逆 3 策略」中的位置

#### A. 量化指標 2 模式對比（NX10 vs NX08）

| 維度 | NX08 KPI snapshot | NX10 exp 累積 |
|------|------------------|---------------|
| **資料模型** | snapshot（kpi_record upsert）| append-only（exp_log）|
| **可變性** | 可隨時改 | 不可逆、只加 |
| **業務本質** | 績效衡量（可校正）| 遊戲化獎勵（不可剝奪）|

#### B. NEXORA 處理不可逆的 3 策略對比集大成（補強 [NX09 主題 2](../nx09/nx09-worklog.md) 2 策略 → 3 策略）

| 策略 | 範例 | 業務本質 |
|------|------|---------|
| 配對沖回（雙紀錄）| NX05 paylog VOIDED | 結果可被消除 |
| 歷史鏈（多紀錄、header 指 current）| NX09 document version | 演進可追、回溯任意點 |
| **累積鏈**（append、單一方向）⭐新 | NX10 exp_log | **不可逆累積、只加不減** |

選哪種：看「**結果可逆 vs 演進可追 vs 不可逆累積**」業務本質。NX10 exp 是「**不可逆累積**」典型：給出去的 exp 不能拿回（除作弊扣回極例外）。

### 實作歷程

- 2026-04-14 `c210ce2` 內 | exp.service + emp_medal + emp_exp_log + 晉級邏輯
- 2026-04-15 `fc09fab` | 前端 exp bar 視覺化（PRO plan 首頁）

### 踩坑 / 學到的

- **「accumulate 不是 snapshot」設計選擇要在 schema 揭露**：第一版有人問「為什麼不在 emp_medal 加個 totalExp 欄位、每次 awardExp 直接 += 就好？」— 因為 stale 風險（多 worker 並發 += 會 race）+ audit 缺口（無法回查單筆 exp 來源）。教訓：**累積數字寫 log 表 + SUM 查、不寫 snapshot 欄位**（沿用 [NX08 主題 3](../nx08/nx08-worklog.md) 同精神）。
- **「不可逆」3 策略選擇看業務本質、不是技術完美**：3 策略各有適用場景、沒有「最好的策略」。教訓：**設計範式對偶 / 變體要看業務本質判準、不要默認套同一策略**（沿用 [NX09 主題 2](../nx09/nx09-worklog.md) 教訓）。
- **晉級事件可獨立成 webhook / event bus**（未來擴充）：當前只是 service 內 log 一行、未來若有 PRO 客戶想接「晉級通知 Slack」之類、晉級事件改成 event bus 即可、emp_exp_log 結構不需動。教訓：**append-only 結構對未來事件驅動擴充友善**。

### 對應文件

- 後端：[apps/nx-api/src/nx10/exp/](../../apps/nx-api/src/nx10/exp/) + `medals/`
- 跨模組對比：[NX08 主題 2](../nx08/nx08-worklog.md)（量化指標 snapshot）/ [NX05 主題 3](../nx05/nx05-worklog.md)（配對沖回）/ [NX09 主題 2](../nx09/nx09-worklog.md)（歷史鏈）

---

## 揭露的設計缺口（NX10 全部 5 個）

| # | 缺口 | 性質 | 處理路徑 |
|---|------|------|---------|
| 1 | A029 `apply-checkin-reward` 從未建立（見主題 1 1D）| 業務鏈缺口 | 遊戲化正式啟用時、從 git history 撈回（pre-`53b900d`）|
| 2 | `medal_level` 16 階 vs 原 spec 20 階（見主題 1 1C）| schema-spec 缺漏（已修 PROJECT_CONTEXT）| 真相揭露完成、無後續 |
| 3 | 沒 spec/intent 目錄（雖有 workflow/primary 2 份）| schema-spec 缺漏 | Alex 寫 NX10 業務 spec |
| 4 | tasks 彙整 NX02~05 跨模組依賴圖沒明確 spec | 業務鏈缺口 | Alex 規格書補設計 + 列依賴圖 |
| 5 | `nx10-w02-job-class-system.md` 提「轉職系統」、schema 是否支援待 audit | schema 缺漏 | audit schema → 補 migration（如缺）|

---

## 給未來新對話 Hank 的提示（NX10 新範式 + 累計範式總表）

### NX10 新建立的範式（3 條）

- ⚠️ **「讀取側 3 變體」範式集大成**（本日誌主題 2 建立）：
  | 變體 | 範例 | 判準 |
  |------|------|------|
  | 聚合層 | NX08 monthly-report | 純讀視角組合 |
  | 主動側 | NX07 employee-change | 業務語意 owner 是動作發起者 |
  | **讀+自寫** ⭐ | NX10 tasks 彙整 | 跨模組讀取 + 需自己 audit |
- ⚠️ **「NEXORA 處理不可逆的第三種策略：累積鏈」範式**（本日誌主題 3 建立、補強 [NX09 主題 2](../nx09/nx09-worklog.md) 2 策略 → 3 策略）：
  | 策略 | 範例 | 業務本質 |
  |------|------|---------|
  | 配對沖回 | NX05 paylog | 結果可被消除 |
  | 歷史鏈 | NX09 document version | 演進可追 |
  | **累積鏈** ⭐ | NX10 exp_log | 不可逆累積 |
- ⚠️ **「模組內局部跨方案 endpoint」範式**（本日誌主題 1 1B 建立）：版本 gate 不是模組層級、是 endpoint 層級。整模組標 PRO 是「預設 PRO」、個別 endpoint 可降級開放（如 NX10 tasks-today）。
- ⚠️ **「不同模組的 audit 各自 owns」原則**（本日誌主題 2 建立）：跨模組讀取時、不要寫業務模組原始資料、寫自己的 audit log；業務 audit ≠ 遊戲化 audit、視角不同、各自 owns。

### ⭐ 累計範式總表（NX01~NX10 全模組 worklog 範式索引）

> 本表為**模組 worklog 收官總表**、未來新對話 Hank 看 NX10 一份、即可掌握所有跨模組設計範式 + 範例位置。
> [_shared/worklog.md](../_shared/worklog.md) 已寫、複用本表 7 分類 + 新增第 8 分類「工程文化範式」（5 條 Phase 1 doc-restructure 累積）。

#### 跨模組設計範式（光譜對照）

| 範式 | 首次定義 | 第二次套用 | 集大成 |
|------|---------|----------|--------|
| 接收側設計 | NX05 主題 2 | NX06 主題 2 | _shared/worklog.md（5 必備配對統合）|
| 主動側設計 | NX07 主題 3 | NX08 主題 1 | NX10 主題 2 對比 |
| 主動側設計光譜內部分層（業務狀態 vs 量化指標）| NX08 主題 2 | — | — |
| 讀取側 3 變體（聚合層 / 主動側 / 讀+自寫）| NX10 主題 2 | — | NX10 主題 2 集大成 |
| 跨模組設計光譜 3 範式判準（接收側 / 主動側 / trigger）| NX07 給未來提示 | — | _shared/worklog.md |

#### 處理不可逆的策略（3 策略對偶）

| 策略 | 首次定義 | 範例 | 業務本質 |
|------|---------|------|---------|
| 配對沖回 | NX05 主題 3 | paylog VOIDED | 結果可被消除 |
| 歷史鏈 | NX09 主題 2 | document version | 演進可追 |
| 累積鏈 ⭐新 | NX10 主題 3 | exp_log | 不可逆累積 |

#### 量化指標模式（2 模式對偶）

| 模式 | 首次定義 | 範例 | 可變性 |
|------|---------|------|--------|
| snapshot 量化 | NX08 主題 2 | KPI record | 可改 / upsert |
| 累積式量化 ⭐新 | NX10 主題 3 | exp_log | 不可逆累積 |

#### 揭露缺口分性質（5 子類型）

| 子類型 | 首次定義 | 處理路徑 |
|--------|---------|---------|
| 業務鏈缺口 | NX06 給未來提示 | Alex 規格書補設計 |
| demo→prod 接面缺口 | NX06 給未來提示 | 真實工作台落地時 wire up |
| schema 缺漏 / spec 缺漏 | NX06 給未來提示 | 補 spec 或 schema migration |
| 規範不一致（含 schema vs 行為不一致）| NX06 + NX08（升級）| 進架構債、春酒後處理 |
| 跨模組整合缺口 ⭐ | NX09 主題 缺口 #3 | 補 wire up（不是補 spec / schema / 改架構）|

#### 穩定模組光譜（漸進、不二分）

| 模組 | follow-up migration | 業務本質 |
|------|--------------------|----------|
| NX09 | 0 | 知識管理（最純粹）|
| NX06 | 1 | 物流 |
| **NX10** | **1** | 遊戲化（業務複雜、但 schema 穩定）|
| NX05 | 2 | 財務 |
| NX01~04 | 多 | Phase 0 / 大塊重構持續演進 |

#### 法規驅動欄位設計（範例集合）

| 法規 | 模組 | 範例 |
|------|------|------|
| 電子簽章法 | NX06 主題 3D | DN 簽收 |
| 勞基法 | NX07 主題 4A | attendance / overtime / leave |
| 個資法 | NX07 主題 4B | payroll 雙層權限 + RESIGN 不刪帳號 |
| 性別工作平等法 | NX07 主題 4C | 產假 / 育嬰留停 ENUM |
| 勞健保條例 | NX07 主題 4D | insurance_base / 計算比例 |

#### 其他規則化認知

| 認知 | 來源 |
|------|------|
| 同批落地 ≠ 同類 | NX09 主題 1 |
| 跨模組不一致不一定是 bug | NX09 主題 1 |
| 3 個但相似度低、不抽 | NX09 主題 1（補強 NX02 主題 2）|
| 業務語意 vs 資料歸屬分離 | NX08 主題 1 |
| 資料分層脫敏 | NX07 主題 2 |
| v7_baseline 黃金窗口（unique constraint 漏寫）| NX01 + NX08 |
| 業務優先 + 維護成本是設計取捨黃金組合 | NX08 主題 3 |
| 設計取捨永遠看業務 ROI | 多份 worklog |
| single source of truth 比 redundancy 重要 | NX08 主題 2 |
| 模組內局部跨方案 endpoint ⭐新 | NX10 主題 1 1B |
| 不同模組的 audit 各自 owns ⭐新 | NX10 主題 2 |
| 漸進演化紀錄 | NX01 主題 5 / NX04 主題 3E |
| 跨 worklog 哲學同步 | NX03/NX04「中心=角色工作台」|
| 跨 worklog 視角差異化 | W2-mini（NX03 vs NX04）|

---

## 給未來新對話 Hank：本日誌的特殊性

NX10 是模組 worklog 收官（NX01~10 全完成、進度 10/10 = 100%、剩 _shared）：
- 集大成性質、不是純粹單模組紀錄
- 末尾累計範式總表是給後續 _shared/worklog.md 直接複用的索引
- 寫 _shared 時：(a) 跨模組統合範式（接收側 5 配對 / 公版 component / A002 drift / BUSINESS-RESTRUCTURE 大塊 1+2 / 過帳通用規則 / 跨模組測試基礎設施演進）(b) 從本日誌複製累計範式總表 + 加 _shared 自身範式

⛔ **不主動進 _shared/worklog.md、不主動接 PLUS / PRO seed**、等 Crown 拍板。

---

> 文件版本：v1.0（初版、3 主題 + 累計範式總表、~5500 字、模組 worklog 收官）
> 下次更新觸發：A029 apply-checkin-reward 撈回（NX10 正式啟用）/ tasks-today 跨方案 endpoint 演進 / NX10 出現新工作（先 audit 性質）/ [_shared/worklog.md](../_shared/worklog.md) 已寫、複用本日誌累計範式總表
