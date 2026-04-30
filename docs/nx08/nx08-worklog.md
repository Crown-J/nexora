<!-- docs/nx08/nx08-worklog.md -->

# NEXORA - NX08 - 報表分析模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX08 報表分析（daily-report / monthly-report / kpi-target / kpi-record）+ NX08 主導的跨模組讀取（NX01 KPI 表 / NX07 attendance）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 3 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ NX08 是 **PRO-only 模組** + **跨模組資料聚合層**（SaaS BI 雛形）、業務本質跟 NX01~07 不同
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（過帳通用規則 / 公版 component / 大塊 3 倉管 KPI 屬 NX03 / A002 schema drift）

---

## 主題 1｜v7_baseline + Phase5-NX08 第九批 API 落地（PRO + 跨模組讀寫）

### 起源

`spec_v7_baseline` 建好 NX08 schema（daily_report / monthly_report 主表）+ NX01 KPI schema（kpi_template / kpi_target / kpi_record — 注意 KPI 表在 NX01 不在 NX08）。Phase5「第九批 API」NX08 落地時、要決定「KPI 操作 endpoint 放哪？」— 結論是放 NX08（業務語意是報表）、但 Prisma model 是 `Nx01KpiTarget` / `Nx01KpiRecord`。

> ⚠️ **NX08 沒 spec/intent 目錄、有 workflow/primary**（跟 NX05~07 同模式）：Alex 寫過業務流程、業務真相在 [dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX08/NX09 段落。

### 設計決策

#### 4 子模組 + 跨模組同步點

```
nx08/
├── nx08.module.ts
├── daily-report/      ← 自表（nx08_daily_report）+ unique 每人每日一筆
├── monthly-report/    ← 表存在但實際不寫入、即時聚合（見主題 3）
├── kpi-target/        ← 操作 nx01_kpi_target（schema 在 NX01）
└── kpi-record/        ← upsert nx01_kpi_record（schema 在 NX01）
```

跨模組同步點：
- **`daily-report.complete` → 同步 NX07 `attendance.clock_out_at`** — 已寫 [NX07 主題 3B](../nx07/nx07-worklog.md#3b-nx07--nx08-attendance-同步)、本日誌不重述、僅交叉引用

#### 1 個共用 utils（shared/nx08/）

| Util | 用途 |
|------|------|
| `nx08-pro-plan.guard.ts` | PRO 版本 gate（thin wrapper、re-export `nexora-pro-plan`、跟 NX07/NX09 同 source）|

#### daily-report 每人每日一筆 unique

migration `20260417100000_nx08_daily_monthly_unique_fix` 加：
- `daily_report (tenantId, userId, reportDate)` 複合 unique
- 防止同一員工同一天填兩份日報、業務語意錯誤

⚠️ **這個 unique 是 0417 補的、不是 v7_baseline**：揭露「v7_baseline 漏了 daily-report unique」、Phase5 落地後跑業務測試才發現有人能填兩份日報、補 migration 修。教訓：**unique constraint 漏寫是 v7_baseline 常見漏洞**（跟主題 1 NX01 tenant_code_unique 補洞同模式、見 [NX01 主題 1](../nx01/nx01-worklog.md)）。

### 實作歷程

- 2026-04-13 `c210ce2` | SYS-DASH-P5 complete all backend API modules（NX08 含在內）
- 2026-04-14 dailylog | Phase5-NX08 落地（daily-report / monthly-report / kpi-target / kpi-record + Nx08ProPlanGuard）
- 2026-04-17（migration）`20260417100000_nx08_daily_monthly_unique_fix` | daily-report 每人每日一筆 unique 補洞

### 踩坑 / 學到的

- **「KPI 操作 endpoint 放 NX08、Prisma model 在 NX01」是業務語意 vs 資料歸屬的分離**：第一版我以為 model 在哪邊 endpoint 就放哪、Crown 拍板「**業務語意決定 endpoint 位置**」（KPI 是報表業務、屬 NX08）、「**資料生命週期決定 model 位置**」（KPI 跟員工 / 部門關聯緊密、屬 NX01 主檔範圍）。教訓：**API 設計分業務語意 + 資料歸屬兩層、不要混為一談**。
- **A002 跨模組 drift 涉及 NX08 `nx08_monthly_report.status` 的 default mismatch**：Migration 3（`20260421152710_fix_schema_drift`）含 NX08 修正、屬全跨模組 drift、本日誌 migration 列表帶過、詳見 [_shared/worklog.md](../_shared/worklog.md)。
- **unique constraint 漏寫是 v7_baseline 常見漏洞**：NX01 tenant_code_unique 補洞、NX08 daily-report 補 unique — 兩者 pattern 一樣。教訓：**v7_baseline 後 1~2 週業務測試是「揭露 unique 漏寫」黃金窗口**、未來新 schema 落地後要主動跑「同 user 多筆 / 同 docNo 多筆」的 happy path 反向測試。

### Migration 列表（NX08 直接相關 + 跨模組受影響）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX08 schema 建立（daily_report / monthly_report）+ NX01 KPI schema（kpi_template / target / record）|
| `20260417100000_nx08_daily_monthly_unique_fix` | daily-report 每人每日一筆 unique 補洞 |
| `20260421152710_fix_schema_drift` | A002 修復含 nx08_monthly_report.status default mismatch（**屬 _shared 跨模組 drift、見 [_shared/worklog.md](../_shared/worklog.md)**）|

### 對應文件

- 後端：[apps/nx-api/src/nx08/](../../apps/nx-api/src/nx08/) + [shared/nx08/nx08-pro-plan.guard.ts](../../apps/nx-api/src/shared/nx08/nx08-pro-plan.guard.ts)
- 業務流程：[docs/nx08/workflow/primary/](workflow/primary/)（Alex 寫的）
- 業務真相來源：[dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX08/NX09 段落
- **前端 SYS-DASH-PRO 系列**（PRO 方案首頁視覺化）：
  - 0415 `306a1f3` circular KPI + attendance panel
  - 0415 `3f0e960` checkin single btn + monthly KPI
  - 0420 `d8eb7a0` 報表中心卡片頁 `/dashboard/report`
  - ⚠️ 屬前端 hub UI、不是 NX08 後端主軸、僅紀錄 hooking 點
- 跨模組關聯：[NX07 主題 3B](../nx07/nx07-worklog.md)（daily-report → attendance 同步、本日誌不重述）/ [NX03 主題 3](../nx03/nx03-worklog.md)（大塊 3 倉管 KPI 屬庫存中心、本日誌不重述）

---

## 主題 2｜跨模組資料源管理（NX08 是聚合層、不擁有原始資料）

### NX08 vs 其他模組根本差異（先講清楚定位）

| 模組類型 | 業務本質 | 資料 ownership | 範例 |
|---------|---------|---------------|------|
| **NX01~07 業務模組** | 擁有自己的業務原始資料 | 資料 + endpoint 一體 | NX02 採購擁有 PO/RR、NX04 銷售擁有 SO、NX07 人資擁有 attendance |
| **NX08 聚合層** ⭐ | **read-only 聚合 + 篩選 + 視角組合** | **不擁有業務原始資料** | KPI 表在 NX01、attendance 在 NX07、業務數字在 NX02/03/04、NX08 是「**跨模組視角組合**」 |

**NX08 是 NEXORA 的 SaaS BI 工具雛形**：給上述跨模組資料一個報表入口、不重複儲存、永遠跟業務模組 source-of-truth 對齊。

### 起源

NX08 落地時面臨核心設計問題：「報表的資料**從哪來、怎麼組合、誰寫入**？」3 個方案對焦：

| 方案 | 做法 | 取捨 |
|------|------|------|
| i | NX08 自己存所有報表資料、用 ETL 從 NX01~07 同步 | 永遠 stale、ETL 維護成本高 |
| ii | NX08 完全不存資料、所有 endpoint read-only 聚合 | KPI 等需要寫入的場景做不到 |
| **iii** ⭐ | **NX08 只擁有「報表動作資料」（daily_report 自表）、跨模組資料 read NX01~07** | NX08 寫的是「使用者跟報表的互動」、不是「業務數字本身」|

### 設計決策（資料源依賴圖）

#### NX08 endpoint 對應的資料源

| NX08 endpoint | 主資料源 | 跨模組 R/W | 業務語意 |
|---------------|---------|-----------|---------|
| `GET /nx08/daily-report` | NX08 `daily_report` 自表 | — | 員工填的日報、自身擁有 |
| `PATCH .../complete` | NX08 自表 + **W: NX07 `attendance.clock_out_at`** | 主動側寫 NX07 | 完成日報順帶下班打卡（見 [NX07 主題 3B](../nx07/nx07-worklog.md)）|
| `GET/POST /nx08/kpi-target` | **NX01 `kpi_target`** | upsert NX01 | KPI 目標設定、操作 NX01 表 |
| `POST /nx08/kpi-record` | **NX01 `kpi_record`** | upsert NX01（含主動寫量化指標）| KPI 實績紀錄 |
| `GET /nx08/monthly-report .../summary` | **聚合 NX01 `kpi_record`** | read NX01（即時、見主題 3）| 月報摘要、不寫入 |

NX08 自己擁有的只有 `daily_report` 主表（員工跟報表互動的紀錄）— 其他全是跨模組讀寫。

#### 對比 NX07 主動側 vs NX08 主動側（細分主動側設計光譜）

> Alex 觀察：「主動側設計」內部可細分「業務狀態 vs 量化指標」、強化範式分層。

| 維度 | NX07 主動側（業務狀態）| NX08 主動側（量化指標）|
|------|---------------------|---------------------|
| **改的對象** | NX01 user 主檔（role / department / is_active）| NX01 KPI 數字（kpi_target / kpi_record）|
| **業務本質** | 員工生命週期變動（HIRE/TRANSFER/RESIGN）| 績效衡量數字累積 |
| **改動頻率** | 低（人事異動每月幾次）| 高（KPI 每天更新）|
| **可逆性** | 需審批、不可隨意改 | upsert 直接覆寫、操作即生效 |
| **設計考量** | 狀態機 + transaction + audit | 簡單 upsert + audit |

**判準延伸**：「主動側設計」適用兩種子範式：
- **業務狀態主動側**：審批驅動、低頻、有狀態機（NX07）
- **量化指標主動側**：操作驅動、高頻、無狀態機（NX08）

選哪種：看「**改的是業務生命週期還是業務衡量**」。

### 實作歷程

- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit | kpi-target / kpi-record controller 操作 NX01 model
- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit | daily-report controller + complete endpoint 同步 NX07

### 踩坑 / 學到的

- **「不擁有資料」是 NX08 設計核心、不是缺點**：第一版有人質疑「為什麼 NX08 不存自己的數據備份？萬一 NX01 跨租戶查詢慢」、Crown 拍板「**single source of truth 比 redundancy 重要**」+「**真的慢就改 NX01 query**、不是在 NX08 複製一份」。教訓：**聚合層的價值是視角組合、不是資料備份；資料備份用 read replica / cache 處理、不是業務模組複製**。
- **跨模組 read 不需要 transaction、跨模組 write 必須**：NX08 monthly-report summary 是 read-only、SELECT FROM nx01_kpi_record、不需 tx；但 daily-report.complete 寫 NX07 attendance 必須 `prisma.$transaction` 內完成（沿用 NX07 主題 3 教訓）。教訓：**跨模組資料動作要分 read vs write、規則不同**。
- **「業務語意 vs 資料歸屬」分離是聚合層必備認知**：API 設計時 endpoint 放業務語意所在模組、Prisma model 放資料生命週期歸屬模組、兩者可分離。教訓：**聚合層特別需要這個分離思維、不要被「endpoint=model 同模組」直覺綁住**。

### 對應文件

- 後端：[apps/nx-api/src/nx08/kpi-target/](../../apps/nx-api/src/nx08/kpi-target/) / `kpi-record/` / `daily-report/`
- 跨模組對比：[NX07 主題 3](../nx07/nx07-worklog.md)（主動側設計第一次定義 + 員工生命週期主動側）
- ⚠️ 接收側設計光譜（NX05/NX06）vs 主動側（NX07/NX08）的完整對比 → 待寫 [_shared/worklog.md](../_shared/worklog.md)

---

## 主題 3｜monthly-report 即時聚合 vs 寫入表的設計取捨

### 起源

`nx08_monthly_report` 表 schema 存在（v7_baseline 建立）、但 Phase5 落地時實作 `GET /nx08/monthly-report .../summary` endpoint 用**即時聚合 SQL**從 `nx01_kpi_record` 計算、**完全不寫入 `nx08_monthly_report` 表**。

這是 schema 跟行為的不一致 — 是設計取捨還是缺口？

### 4 維度對比（即時聚合 vs 寫入表）

| 維度 | 寫入表（pre-compute）| 即時聚合（NX08 採用）| 取捨 |
|------|---------------------|--------------------|------|
| **報表速度** | 快（read 已 compute 結果、< 50ms）| 慢一點（每次跑聚合 SQL、~ 200~500ms）| 月報每月看一次、慢可接受 |
| **資料新鮮度** | KPI 改了 → stale until 重算 | 永遠 fresh、改 KPI 後立刻反映 | NX08 選新鮮度優先 |
| **補資料正確性** | 需 backfill job（補歷史月）| 自動正確（任意時間點查詢都對）| 即時聚合無補資料問題 |
| **設計複雜度** | 高（需 trigger / cron job）| 低（just SELECT）| 即時聚合維護成本低 |

NX08 選即時聚合的核心理由：**業務優先 + 維護成本**。

### 設計決策

1. **`monthly-report` 不寫入表**：endpoint 只 read、用 SQL `GROUP BY` + `SUM/AVG` 即時聚合 `nx01_kpi_record`
2. **schema 表保留但不寫**：`nx08_monthly_report` 表暫時保留、但實際無資料
3. **`nx08_daily_report` 自表照寫**：daily-report 是「員工跟報表互動」、是動作資料、必須寫入（跟 monthly-report 即時聚合不同性質）
4. **未來如果月報慢到不可接受**：考慮加 cache layer（Redis）、不重新啟用 `nx08_monthly_report` 寫入

### 實作歷程

- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit | `GET /nx08/monthly-report` + `GET .../summary` 即時聚合實作

### 踩坑 / 學到的

- **「schema vs 行為不一致」是設計味道、需明確處理**：第一版我以為「schema 留著沒事、未來可能用」、Crown 拍板「**schema 跟行為不一致是技術債、不是 nice-to-have**」、要嘛刪表、要嘛補寫入邏輯。教訓：**schema 跟行為分歧時要明確標 ⚠️、不要默認「未來會處理」**。
- **「業務優先 + 維護成本」是設計取捨黃金組合**：純技術視角會選「pre-compute 報表更快」、業務視角會選「資料新鮮 + 維護便宜」。教訓：**設計取捨永遠看業務 ROI、不是純技術完美**。
- **快取的位置是工具選擇、不是設計決策**：未來如果月報慢到不可接受、用 Redis cache 解、不重新啟用 `nx08_monthly_report` 寫入（兩個方案差別：cache 容易 invalidate、寫入表的 stale 問題回來）。教訓：**「太慢了」不等於「要存進表裡」、cache 是更輕量的解法**。

### ⚠️ 待 Crown 拍板：schema vs 行為不一致缺口處理

依 Alex 觀察 #3 + Crown 提示、本主題末尾明列 2 選項待後續拍：

| 選項 | 做法 | 評估 |
|------|------|------|
| **A** | **刪 `nx08_monthly_report` 表**（schema 對齊行為）| 簡潔、未來月報速度問題用 cache 解 — Hank 推薦 |
| **B** | **補寫入邏輯 + cron 重算**（行為對齊 schema）| 跟著 schema 走、但增加維護成本 + stale data 風險 |

→ 等 Crown 拍板（不阻塞、本日誌寫完先 push）。

### 對應文件

- monthly-report：[apps/nx-api/src/nx08/monthly-report/](../../apps/nx-api/src/nx08/monthly-report/)
- 跨模組關聯：[NX05 主題 3](../nx05/nx05-worklog.md)（過帳設計對齊業務本質、本主題同精神：設計對齊業務需求、不對齊技術完美）

---

## 揭露的設計缺口（NX08 全部 4 個、按處理路徑分性質）

| # | 缺口 | 性質 | 處理路徑 |
|---|------|------|---------|
| 1 | KPI 計算 helper 沒寫（schema 有 / 實際聚合靠 SQL inline）| **業務鏈缺口** | Alex 規格書補設計 |
| 2 | `nx08_monthly_report` 表 schema 有 / 行為不寫入 — schema vs 行為不一致 | **規範不一致 / schema 缺漏** ⭐**新類型** | 主題 3 末列 A/B 2 選項待 Crown 拍 |
| 3 | BCG / TOWS / HPA 等高階分析（[CLAUDE.md §三] 提到 NX08 涵蓋）schema 沒做 | **schema 缺漏** | Alex 寫高階分析 spec → 補 schema migration |
| 4 | 沒 spec/intent 目錄（跟 NX05~07 同模式）| **schema-spec 缺漏** | Alex 寫 NX08 業務 spec |

⭐ **缺口 #2 是「揭露缺口分性質」範式新發現的子類型**：「**規範不一致**」原本指「規範跨模組不一致」（如 A021）、本日誌揭露「**schema vs 行為不一致**」也屬此類、規範升級。

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/nx01-worklog.md) ~ [NX07](../nx07/nx07-worklog.md) worklog 五段式結構
- ⚠️ **「跨模組聚合層」範式**（NX08 首例）：當模組業務本質是「視角組合 + read-only 聚合 + 不擁有業務原始資料」時、走 NX08 範式（SaaS BI 雛形）。NX09 知識管理 / NX10 遊戲化雖也跨模組讀、但**擁有自己的業務資料**（KM 文件 / medal/exp 紀錄）、不算聚合層。
- ⚠️ **「主動側設計光譜內部分層」新範式**（本日誌建立）：主動側設計細分兩子範式：
  | 子範式 | 改的對象 | 業務本質 | 範例 |
  |--------|---------|---------|------|
  | **業務狀態主動側** | 主檔狀態（user / role / is_active）| 審批驅動、低頻、有狀態機 | NX07 employee-change → NX01 user |
  | **量化指標主動側** | 主檔指標（kpi_target / record 數字）| 操作驅動、高頻、無狀態機 | NX08 kpi-target/record → NX01 kpi |
  選哪種：看「改的是**業務生命週期**還是**業務衡量**」。
- ⚠️ **「業務語意 vs 資料歸屬」分離**範式（本日誌建立、主題 1）：API 設計時 endpoint 放業務語意所在模組、Prisma model 放資料生命週期歸屬模組、兩者可分離。聚合層 NX08 特別需要這個分離思維。
- ⚠️ **「揭露缺口分性質」範式升級**（本日誌主題 3）：「**規範不一致**」性質擴展、不只「跨模組規範不一致」（A021）、也含「**schema vs 行為不一致**」（本日誌缺口 #2）。
- ⚠️ **「unique constraint 漏寫是 v7_baseline 黃金窗口揭露」範式**（本日誌主題 1 + 對齊 [NX01 主題 1](../nx01/nx01-worklog.md)）：v7_baseline 後 1~2 週業務測試是揭露 unique 漏寫的黃金窗口、新 schema 落地後主動跑「同 user 多筆 / 同 docNo 多筆」反向測試。
- 跨模組或公版（過帳通用規則 / 公版 component / A002 schema drift / 大塊 3 倉管 KPI 已寫 NX03 / 接收側設計 5 個必備配對 / 跨模組測試基礎設施演進）**不寫進本日誌**、之後寫 `_shared/worklog.md` 統合
- 下一輪預期：[docs/nx09/nx09-worklog.md](../nx09/nx09-worklog.md)（NX09 知識管理、PRO 模組、article/document/meeting、預期工作量偏小、可能第三個「穩定模組真誠揭露」案例）

---

> 文件版本：v1.0（初版、3 主題、~5200 字、跨模組聚合層 + SaaS BI 雛形）
> 下次更新觸發：Crown 拍 Q3 末選項 A/B（刪表 vs 補寫入）/ KPI 計算 helper 補上 / BCG/TOWS/HPA 高階分析 schema / NX08 出現新工作（先 audit 性質）
