<!-- docs/nx10/nx10-audit-01.md -->

# NX10-AUDIT-01 — 遊戲化模組 schema + 既有狀態真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：NEXORA v1.2 EIP 重戰場升級（main HEAD `f138601`、10 tag）後、Crown 啟動 NX10 遊戲化（**最後一個業務模組、剩 NX10、進度 10/11 → 11/11**）前 verify
> 對齊：NX02 / NX03 / AR / NX04 / NX05 / NX06 / NX07 / NX08 / NX09 audit 範式 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §1 NX10 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx10" packages/db-core/prisma/schema.prisma
→ 14
```

⭐ **NEXORA 業務模組中 model 數第 2 多**（僅次於 NX07 16 model）。

### 1.2 14 個 Nx10* model（schema.prisma line 範圍 + 業務語意）

對齊 nxtable.csv 112-125 + worklog 揭露：

| # | Model | Line | Table | 業務語意 |
|---|---|---|---|---|
| 1 | `Nx10EmpExpLog`            | 5790 | nx10_emp_exp_log            | Exp 異動記錄（append-only、永久保存不可刪、6 來源 SIGNIN/KPI/MILESTONE/PUNISH/SURPRISE/TEAM）|
| 2 | `Nx10CheckinLog`           | 5820 | nx10_checkin_log            | 員工簽到紀錄（連續簽到累計、follow-up M2 加）|
| 3 | `Nx10EmpMedal`             | 5848 | nx10_emp_medal              | 員工當前勳章（per user one row、totalExp + currentLevelExp + demotionProtectUntil + lastCheckinDate + consecutiveCheckin）|
| 4 | `Nx10EmpTaskLog`           | 5880 | nx10_emp_task_log           | 員工每日/週/月任務執行記錄（系統自動寫）|
| 5 | `Nx10MedalLevel`           | 5909 | nx10_medal_level            | **勳章等級主檔 20 levels**（5 tier × 4 rank：BRONZE/SILVER/GOLD/PLATINUM/DIAMOND × IV/III/II/I）|
| 6 | `Nx10MentorshipRecord`     | 5949 | nx10_mentorship_record      | 帶新人記錄（師徒配對 + 帶新人 Exp 獎勵）|
| 7 | `Nx10PromotionCriteria`    | 5990 | nx10_promotion_criteria     | 轉職條件主檔（角色升遷、需勳章等級 + 年資 + KPI + 帶新人數）|
| 8 | `Nx10PromotionRequest`     | 6033 | nx10_promotion_request      | 轉職申請記錄（系統驗證 + 主管推薦 + 負責人審核）|
| 9 | `Nx10SprintTask`           | 6080 | nx10_sprint_task            | 限時衝刺任務主檔（週/月末/季度衝刺 + 獎勵倍率）|
| 10 | `Nx10SprintTaskLog`       | 6116 | nx10_sprint_task_log        | 衝刺任務參與記錄 |
| 11 | `Nx10SurpriseBoxLog`      | 6145 | nx10_surprise_box_log       | 驚喜寶箱紀錄（每日最多 3 個、3 等級 普通/稀有/史詩）|
| 12 | `Nx10TaskTemplate`        | 6171 | nx10_task_template          | 任務範本主檔（日/週/月/季/里程碑 + 適用職務 + Exp 獎勵）|
| 13 | `Nx10TeamTask`            | 6214 | nx10_team_task              | 門市團隊任務主檔（全勤率 / KPI / 日報率 + 門檻 + 週期）|
| 14 | `Nx10TeamTaskLog`         | 6251 | nx10_team_task_log          | 門市團隊任務記錄 |

⚠️ **Crown 記憶 vs schema drift 揭露**：
- Crown TASK prompt 提「16 medal tiers（4 tier × 4 rank）」
- schema 實際是 **20 levels**（BRONZE/SILVER/GOLD/PLATINUM/DIAMOND **5 tier** × 4 rank）
- 對齊 schema 真實值（sortNo doc「1=最低銅IV、20=最高鑽I」確認）

### 1.3 跟 NX01 主檔 FK 關係（A041 精確 = **8 reverse FK**）

| 來源 NX01 | NX10 model | 接點欄 | 行 |
|---|---|---|---|
| Nx01User | Nx10EmpExpLog        | userId              | 1220 |
| Nx01User | Nx10CheckinLog       | userId              | 1221 |
| Nx01User | Nx10EmpMedal         | userId              | 1222 |
| Nx01User | Nx10EmpTaskLog       | userId              | 1223 |
| Nx01User | Nx10MentorshipRecord | mentor/menteeId × 2 | 結構推斷 |
| Nx01User | Nx10PromotionRequest | userId              | 1226 |
| Nx01User | Nx10SprintTaskLog    | userId              | 1227 |
| Nx01User | Nx10SurpriseBoxLog   | userId              | 1228 |
| Nx01Role | Nx10PromotionCriteria | fromRoleId         | 1053 |
| Nx99Tenant | 全 14 model × tenantId | 14 reverse list   | 6733+ |

### 1.4 跟其他業務模組接點

⚠️ **重大揭露：NX10 沒有任何業務模組的直接 reverse FK**（純 NX01 主檔層）：
- NX02 採購 → ❌ 0 接點
- NX04 銷貨 → ❌ 0 接點（業績獎金 wire 走 NX07 SalaryComponent 中介）
- NX05 財務 → ❌ 0 接點
- NX06 物流 → ❌ 0 接點（動態交接獎勵候選但 schema 無 FK）
- NX07 人資 → ❌ 0 接點（KPI 加給 wire 走 NX07 KpiTemplate 中介）
- NX08 報表 → ❌ 0 接點
- NX09 EIP → ❌ 0 接點

⭐ **設計意涵**：NX10 是 **純獨立業務模組**（遊戲化 / 勳章 / Exp / 任務 / 帶新人）、業務鏈接點走 **NX01 主檔（User + Role）+ NX01 KpiTemplate 中介**、未直接 FK 業務單據。

### §I.6.3 §1 揭露不完整

- 未 verify Nx10 schema migration 拆軌數（worklog 主題 1 揭露「nx10_checkin_log 1 個 follow-up migration」、本 audit 未深 grep）
- 未 verify 14 model 完整欄位細節（SprintTask 獎勵倍率公式 / Mentorship 配對機制）
- 未 verify 20 medal levels 是否含 system seed（schema 揭露主檔、seed 落地狀態未 grep）

---

## §2 NX10 backend service 真相

### 2.1 既有 service 列表（A041 精確 = **5 service / 5 controller / 11 endpoint**）

```
apps/nx-api/src/nx10/
├── nx10.module.ts
├── nx10-timezone.util.ts           ← 時區計算 helper（簽到日期判斷）
├── checkin/   (2 endpoint：today + checkin)
├── exp/       (3 endpoint：me + award + by-user/:userId、含 DTO)
├── leaderboard/ (1 endpoint：list)
├── medals/    (2 endpoint：me + list)
└── tasks/     (3 endpoint：tasks list + today + done)
```

shared 層：`apps/nx-api/src/shared/nx10/nx10-pro-plan.guard.ts`（PRO 方案 guard、對齊 NX07/NX08/NX09）

### 2.2 11 endpoint 列表

| controller | endpoint | method |
|---|---|---|
| checkin    | `GET /nx10/checkin/today`     | get |
| checkin    | `POST /nx10/checkin`          | create |
| exp        | `GET /nx10/exp/me`            | get |
| exp        | `POST /nx10/exp/award`        | award |
| exp        | `GET /nx10/exp/:userId`       | get by user |
| leaderboard | `GET /nx10/leaderboard`      | list |
| medals     | `GET /nx10/medals/me`         | get my medal |
| medals     | `GET /nx10/medals`            | list（20 levels）|
| tasks      | `GET /nx10/tasks/today`       | today tasks |
| tasks      | `GET /nx10/tasks`             | list（含 query）|
| tasks      | `PATCH /nx10/tasks/:id/done`  | mark done |

### 2.3 14 model vs 5 controller 對應（A041 精確）

| controller | 對應 model（直接寫入）|
|---|---|
| checkin    | Nx10CheckinLog + Nx10EmpMedal.lastCheckinDate/consecutiveCheckin |
| exp        | Nx10EmpExpLog + Nx10EmpMedal.totalExp/currentLevelExp |
| leaderboard | read-only across Nx10EmpMedal + Nx10EmpExpLog |
| medals     | Nx10EmpMedal + Nx10MedalLevel（read）|
| tasks      | Nx10EmpTaskLog（系統自動寫?）+ Nx10TaskTemplate |

⚠️ **schema-only 沒 endpoint（9 model）**：
- Nx10SurpriseBoxLog（驚喜寶箱）
- Nx10TeamTask + Nx10TeamTaskLog（門市團隊任務）
- Nx10SprintTask + Nx10SprintTaskLog（限時衝刺）
- Nx10MentorshipRecord（帶新人）
- Nx10PromotionCriteria + Nx10PromotionRequest（轉職）

### 2.4 worklog 揭露的設計範式

對齊 `docs/nx10/nx10-worklog.md` 主題 1+2+3：
- ⭐ **「跨模組讀取側」第三種變體**（NX10 tasks/today 彙整 NX02-05、純 read 不寫業務模組）
- ⭐ **「累積式量化」append-only 設計**（exp + medal 晉級鏈、不可減少 / 升階時更新 currentLevelExp）
- ⭐ **「跨方案例外」endpoint**（tasks/today 跨方案、不裝 PRO guard）
- ⚠️ **A029 老債揭露**：apply-checkin-reward 已撈出（NX10 正式啟用後撈回、worklog 註）

### §I.6.3 §2 揭露不完整

- 未 verify exp/award 演算法（KPI 達成率計算 + medal 升階 trigger）
- 未 verify checkin 連續簽到 reward 機制（A029 老債）
- 未 verify leaderboard 排序欄（totalExp / 期間 exp / KPI）

---

## §3 NX10 frontend 真相

### 3.1 既有 app/dashboard/nx10（A041 精確 = **1 page**）

```
apps/nx-ui/src/app/dashboard/nx10/
└── workspace/
    └── page.tsx   (NX10-WS-UI-001-F01)
```

### 3.2 features/nx10 vs sys-dashboard ProNx10LeftPanel ⭐（既有 1 component）

```
find apps/nx-ui/src/features -ipath '*nx10*'
→ apps/nx-ui/src/features/sys-dashboard/ui/ProNx10LeftPanel.tsx
```

⭐ **既有 ProNx10LeftPanel component**（dashboard 左側遊戲化 panel、PRO 方案內建）。

### 3.3 menu.nx10.ts（A041 精確 = **不存在**）

```
ls apps/nx-ui/src/features/layout/config/menu.nx10*  → No such file
grep -n 'nx10\|Nx10' apps/nx-ui/src/features/layout/config/side-menu.ts  → 0 matches
```

⚠️ **side-menu.ts 0 wire nx10**（對比 menu.nx02-09 全在）。

### §I.6.3 §3 揭露不完整

- 未 verify ProNx10LeftPanel 實際呈現的 component 內容（grep ts 內 props + data flow）
- 未 verify ProNx10LeftPanel 是否實際接 nx10 endpoint or 純靜態 placeholder

---

## §4 既有 demo 揭露

### 4.1 從 codebase + worklog 推斷

- ✅ **真實落地（NX10-IMPL phase5 + checkin follow-up migration）**：5 controller × 11 endpoint backend（checkin / exp / leaderboard / medals / tasks）
- ✅ **真實落地**：20 medal levels schema + EmpMedal 累積 exp 鏈
- ✅ **真實落地**：tasks/today 跨方案 endpoint（worklog 主題 1 揭露）
- ✅ **真實落地**：ProNx10LeftPanel dashboard 左側 panel（PRO 方案）
- ⚠️ **schema-only 沒 endpoint（9 model）**：驚喜寶箱 + 團隊任務 + 衝刺任務 + 帶新人 + 轉職（schema 完整 / endpoint 0）
- ❌ **UI 0 真實 demo**：只有 1 placeholder + 1 left panel、無真實勳章 / 排行榜 / 任務列表 UI
- ❌ **A029 apply-checkin-reward 已撈出**（NX10 正式啟用時撈回）

### 4.2 對比其他模組 demo 狀態

| 模組 | 真實 demo backend | UI 落地 |
|---|---|---|
| NX02-06 + AR | ✅ 完整業務 demo | ⚠️ stub placeholder |
| NX07 | ✅ 47 endpoint（IMPL-01 後）| ⚠️ 8 placeholder |
| NX08 | ✅ 37 endpoint（IMPL-01 後）| ⚠️ 22 placeholder |
| NX09 | ✅ 26 endpoint（IMPL-01 後）| ⚠️ 6 placeholder |
| **NX10（本軌前）** | ✅ 11 endpoint（部分功能）+ 1 ProNx10LeftPanel ⭐ | ❌ 1 placeholder |

### §I.6.3 §4 揭露不完整

- 未 verify production 是否有真實 EmpMedal / ExpLog 資料
- 未 verify 20 medal_level seed 是否落地
- 未 verify TaskTemplate seed（日/週/月任務範本）

---

## §5 NX10 vs 10 軌範式對齊

### 5.1 partVersionId 配套

- ⭐ **N/A**：NX10 純遊戲化 / 無料件版本
- 對齊 NX05 / NX06 / NX07 / NX08 / NX09 純非 ledger 模組範式

### 5.2 跟其他業務模組接點完整度

| 接點 | 真相 |
|---|---|
| NX10 → NX01 User + Role | ✅ 9 reverse FK 在 |
| NX01 KpiTemplate → NX10 TaskTemplate | ❓ schema 推斷可能（task source_module 欄）|
| NX04 SO 業績 → NX10 排行榜 / 任務 | ❌ 0 直接 FK（tasks/today 跨模組讀範式）|
| NX06 DnHandover → NX10 動態交接獎勵 ⭐⭐⭐ | ❌ 0 schema（業界改革候選）|
| NX07 SalaryComponent → NX10 業績獎金加成 | ❌ 0 直接 FK（NX07 已 wire NX04→薪資、NX10 加成 wire 候選）|
| NX08 dashboard → NX10 統計 | ❌ 0（後續軌 NX08 加 NX10 dashboard 候選）|

### 5.3 模組層治理（summary / audit / phase / closure）落後程度

| 治理檔 | NX02 | NX03 | NX04 | NX05 | NX06 | NX07 | NX08 | NX09 | **NX10** |
|---|---|---|---|---|---|---|---|---|---|
| audit-01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **🆕 本檔**|
| overview spec | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| impl-01 plan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| summary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| merge verify | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| worklog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ v1.0（3 主題 + 累計範式總表、~5500 字、模組 worklog 收官）|

⚠️ **NX10 治理落後 2 階段**（同 NX07 / NX09 IMPL-01 前狀態）。worklog v1.0 已寫「模組 worklog 收官」+ 末尾累計範式總表（給 _team/worklog.md 直接複用的索引）。

### §I.6.3 §5 揭露不完整

- 未 verify nx10-worklog 末尾「累計範式總表」與 _team/worklog.md 重疊度

---

## §6 業界場景候選揭露 ⭐ Crown 拍板池

### 6.1 NX10 業務本質（對齊 nxtable.csv 112-125 + worklog）

**NX10 遊戲化系統 = 員工激勵 + 業績驅動 + 帶人成長三件套**：
- 勳章系統（20 levels = 5 tier × 4 rank、累積 Exp 升階、demotion 保護期）
- Exp 累積鏈（6 來源 SIGNIN/KPI/MILESTONE/PUNISH/SURPRISE/TEAM、append-only）
- 任務系統（5 種週期：日/週/月/季/里程碑 + 適用職務）
- 衝刺任務（限時、獎勵倍率）
- 團隊任務（門市層級、全員獎勵）
- 驚喜寶箱（每日最多 3 個、3 等級）
- 帶新人記錄（師徒 + Exp 獎勵）
- 轉職機制（系統驗證 + 主管推薦 + 負責人審核）

### 6.2 業界 muscle memory 候選池（業界遊戲化平台對標）

| # | 業務功能 | 業界範式 | 既有 schema | 既有 endpoint | ⭐ 評等 |
|---|---|---|---|---|---|
| 1  | **勳章系統 20 levels**（業界 ERP 罕見）| 既有 MedalLevel + EmpMedal | ✅ schema | ✅ medals 2 endpoint | ⭐⭐⭐ 已落地 |
| 2  | **連續簽到激勵**（業界遊戲化標配）| 既有 CheckinLog + EmpMedal.consecutiveCheckin | ✅ schema | ✅ checkin 2 endpoint（A029 撈出）| ⭐⭐⭐ 已落地 |
| 3  | **Exp 累積鏈**（append-only 不可減）| 既有 EmpExpLog | ✅ schema | ✅ exp 3 endpoint | ⭐⭐⭐ 已落地 |
| 4  | **業績排行榜**（個人 / 部門 / 公司 / 跨期間）| 既有 leaderboard | ⚠️ 1 endpoint（簡化版）| ⚠️ | ⭐⭐ |
| 5  | **任務系統**（5 種週期 + 適用職務）| 既有 TaskTemplate + EmpTaskLog | ✅ schema | ✅ tasks 3 endpoint | ⭐⭐⭐ 已落地 |
| 6  | **驚喜寶箱**（每日 3 個 + 3 等級）| 既有 SurpriseBoxLog | ✅ schema | ❌ 0 endpoint | ⭐⭐ 業界遊戲化常見 |
| 7  | **團隊任務**（門市層級 + 全員獎勵）| 既有 TeamTask + Log | ✅ schema | ❌ 0 endpoint | ⭐⭐ |
| 8  | **衝刺任務**（限時 + 獎勵倍率）| 既有 SprintTask + Log | ✅ schema | ❌ 0 endpoint | ⭐⭐ |
| 9  | **帶新人系統**（師徒 + Exp 獎勵）| 既有 MentorshipRecord | ✅ schema | ❌ 0 endpoint | ⭐⭐⭐ 業界罕見 |
| 10 | **轉職機制**（系統驗證 + 主管推薦 + 負責人）| 既有 PromotionCriteria + Request | ✅ schema | ❌ 0 endpoint | ⭐⭐⭐ 業界罕見 |
| 11 | **業績獎金加成**（接合 NX07）| 既有 NX07 SalaryComponent.kpiTemplateId | ❌ 0 schema 接點 | ❌ | ⭐⭐⭐ 業界改革候選（接合 NX04→NX07 wire）|
| 12 | **動態交接獎勵**（接合 NX06）⭐⭐⭐ | 既有 NX06 DnHandover | ❌ 0 schema 接點 | ❌ | ⭐⭐⭐ 業界第一（接合 NX06-IMPL-02 closure）|
| 13 | **客戶滿意度 / 簽收率成就**（接合 NX06）| 既有 NX06 Dn.signature | ❌ 0 schema | ❌ | ⭐⭐ |
| 14 | **A029 apply-checkin-reward**（worklog 揭露的已撈出老債）| 既有撈出 | ❌ 撈出 | ❌ 撈出 | ⭐⭐ 撈回候選 |
| 15 | **NX08 dashboard 整合**（員工 NX10 數據 dashboard）| 既有 NX08 OwnerDashboard | ❌ 0 wire | ❌ | ⭐ 後續軌 |

### 6.3 業界改革候選 ⭐⭐⭐

對齊 audit § 6.4 NX06/NX07/NX09 業界改革累積 + NX10 接合：

- ⭐⭐⭐ **NX06 DnHandover → NX10 動態交接獎勵**（業界第一個動態交接遊戲化）
- ⭐⭐⭐ **NX04 業績 → NX07 薪資加給 → NX10 排行榜**（業績獎金完整鏈、遊戲化驅動）
- ⭐⭐⭐ **轉職機制 schema 完整**（系統驗證 + 主管推薦 + 負責人審核、業界罕見）
- ⭐⭐ **帶新人 Exp 獎勵**（業界遊戲化罕見）

### 6.4 跨模組整合候選（後續軌）

- NX06 DnHandover → NX10 動態交接獎勵（業界第一 ⭐⭐⭐）
- NX04 業績 → NX10 排行榜（cross-source 計算）
- NX07 SalaryComponent → NX10 業績加成（薪資加成倍率）
- NX08 OwnerDashboard → NX10 員工成長 dashboard
- NX09 KmArticle → NX10 KM 貢獻 Exp 獎勵（員工寫 KM 累 Exp）

### §I.6.3 §6 揭露不完整

- 未 verify Crown 對 9 schema-only model（驚喜寶箱/團隊任務/衝刺/帶新人/轉職）endpoint 補齊優先級
- 未 verify Crown 對「業績獎金加成 + 動態交接獎勵 + 排行榜」wire 範圍 A vs B
- 未 verify A029 apply-checkin-reward 撈回時機

---

## §7 IMPL plan 預告（給 Alex 寫 overview 對齊用）

對齊 NX02~NX09 audit → IMPL-01 範式預告：

| Phase 候選 | 範圍 |
|---|---|
| Phase 0 plan | overview v0.1.0 + Q-RHYTHM-2 拍板 |
| Phase 1 schema | M1 可能 0 動 or 加業務模組接點 FK（NX06 DnHandover / NX04 SO / NX07 SalaryComponent → NX10）|
| Phase 2 service | 補 9 schema-only model 核心 endpoint（驚喜寶箱 / 團隊任務 / 衝刺 / 帶新人 / 轉職）|
| Phase 3 跨模組 wire | NX06→NX10 動態交接獎勵 / NX04→NX10 排行榜 / NX09→NX10 KM 貢獻 Exp |
| Phase 4 A029 撈回 | apply-checkin-reward 撈回（連續簽到獎勵 production wire）|
| Phase 5 UI stub | N placeholder + menu.nx10 + side-menu wire |
| Phase 6 docs | summary + worklog 主題 4 + _team 主題 31 + merge-verify |

**戰略題待 Crown 拍板**（推估 5-8 題）：
1. **9 schema-only model endpoint 補齊範圍**（A=全補 / B=分軌 / C=核心 only）
2. **跨模組 wire 範圍**（NX06 動態交接獎勵 ⭐⭐⭐ / NX04 業績 / NX07 薪資加成 / NX09 KM）
3. **A029 apply-checkin-reward 撈回**（A=本軌 / B=後續軌）
4. **20 medal level seed**（A=本軌 system seed / B=tenant 自定義 / C=後續軌）
5. **TaskTemplate seed**（5 週期任務範本、A=本軌 seed / B=後續軌）
6. **UI 範圍**（純 stub / 真實勳章 panel / 排行榜 chart / 任務列表）
7. **轉職機制完整**（系統驗證 + 主管推薦 + 負責人 3 階審核、A=本軌 / B=後續軌）
8. **帶新人系統**（師徒配對 + Exp 獎勵、A=本軌 / B=後續軌）

---

## §8 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / HR 補揭露：

1. **§1** Nx10 schema migration 拆軌數（worklog 揭露 follow-up 1 軌、本 audit 未深 grep）
2. **§1** 20 medal level seed 落地狀態 / 系統 seed vs tenant 自定義
3. **§2** exp/award 演算法 + medal 升階 trigger 邏輯
4. **§2** checkin 連續簽到 reward 機制（A029 老債）
5. **§2** leaderboard 排序欄
6. **§3** ProNx10LeftPanel component 內容 + 是否接 nx10 endpoint
7. **§4** production 真實資料量 + TaskTemplate seed 落地
8. **§5** nx10-worklog 末尾「累計範式總表」與 _team 重疊度
9. **§6** Crown 對 9 schema-only model / 跨模組 wire / A029 撈回 / 轉職 / 帶新人 拍板
10. **§7** 5-8 戰略題確切答案

---

## §9 與 nx10-worklog v1.0 對齊揭露

對齊 [docs/nx10/nx10-worklog.md](../nx10-worklog.md) 主題 1-3：

- 主題 1：v7_baseline + Phase5-NX10 第十批 API 落地（PRO + 跨方案例外 + 老債揭露 A029）
- 主題 2：跨模組讀取 — tasks 彙整 NX02-05（讀取側第三種變體）
- 主題 3：累積式量化 — exp + medal 晉級設計（append-only 累積鏈）+ 末尾累計範式總表

worklog 已揭露：
- 「累積式量化」append-only 範式
- 「跨方案例外 endpoint」範式（tasks/today 不裝 PRO guard）
- A029 老債（apply-checkin-reward 撈出）
- 「模組 worklog 收官」+ 累計範式總表索引

⭐ 本 audit-01 補揭：
- 14 model / 5 controller / 11 endpoint A041 精確
- 20 medal levels vs Crown 「16」記憶 drift 揭露
- 0 業務模組接點重大揭露（純獨立業務模組）
- 9 schema-only model（schema 完整 / endpoint 0）
- ProNx10LeftPanel 既有 component 揭露
- 15 業務候選池 + 業界改革候選（動態交接獎勵 + 業績鏈 + 轉職 + 帶新人）

---

> 文件版本：v1.0（NX10-AUDIT-01 純諮詢、9 段揭露 + 14 model schema + 11 endpoint + 1 placeholder + 1 既有 component + 15 業務功能候選池 + 4 業界改革 ⭐⭐⭐）
> 待 Crown 拍板 5-8 戰略題（§7 末段）→ Alex 寫 nx10-overview v0.1.0 → Hank 寫 nx10-impl-01-plan
> ⭐⭐⭐ 本軌 closure 後達 NEXORA 業務模組進度 11/11（100%）
