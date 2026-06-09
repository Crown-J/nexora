<!-- docs/nx10/nx10-summary.md -->

# NX10 八角遊戲化 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v2.0（IMPL-02 closure、八角 8 角完整化、Q-RHYTHM-2 第八次落地）
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX10-IMPL-01 + IMPL-02 全 commit + AUDIT-01 + overview v1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx10/spec/intent/nx10-overview.md`
> 戰略定位：⭐⭐⭐ 八角 8 角完整化 + 3 跨模組 wire 業界改革（NX06 動態交接獎勵 ⭐⭐⭐ + NX04 業績排行 + NX07 醫章加碼）
> Q-RHYTHM-2 第八次落地：Crown + Alex 預批、Hank 全軌連跑

---

# § 1. NX10 模組業務角色

## 1.1 模組定位

⚠️ Crown 揭露設計哲學：NX10 = **Yu-kai Chou 八角框架（Octalysis Framework）**、不是 9 個隨機功能。

業務本質回答 1 個核心問題：**如何讓亞羅員工對企業認同度更高？**
→ 答案：八角框架完整落地（業界經典 gamification 設計）。

## 1.2 八角驅動力對應 NEXORA 落地

| # | 八角驅動力 | NEXORA 落地 | 落地軌 |
|---|---|---|---|
| 1 | **史詩意義與使命感** | **帶新人 + 轉職機制**（mentorship + promotion）| **IMPL-02 ✅** |
| 2 | **發展與成就** | **醫章 20 levels + 排行榜** | **IMPL-01 ✅** |
| 3 | **賦權與創造力** | **轉職 3 階審核** ⭐⭐⭐ | **IMPL-02 ✅** |
| 4 | **所有權與佔有** | **點數累積 + 醫章收集** | **IMPL-01 ✅** |
| 5 | **社交影響與關聯** | **團隊任務 + 帶新人 + 動態交接 wire** ⭐⭐⭐ | **IMPL-02 ✅** |
| 6 | **稀缺與渴望** | **衝刺（限時挑戰）** ⭐ | **IMPL-01 ✅** |
| 7 | **不可預期與好奇** | **驚喜寶箱** ⭐ | **IMPL-01 ✅** |
| 8 | **損失與避免** | **排名下降 + 任務過期** | **IMPL-01 ✅** |

⭐⭐⭐ IMPL-01 + IMPL-02 落地 **8/8 全部驅動力**、八角框架完整化。

## 1.3 7 業務功能（對齊 overview v0.1.0 §3.1）

1. 醫章 20 levels seed
2. 排行榜（純 verify）
3. 點數 / Exp（純 verify + A029 撈回）
4. TaskTemplate seed（5 cycle + 7 STREAK）
5. ⭐ 驚喜寶箱 service + endpoint（驅動力 #7）
6. ⭐ 衝刺 service + endpoint（驅動力 #6）
7. UI 6 placeholder + menu + wire + 治理檔補完

---

# § 2. Schema 真相

## 2.1 2 軌 migration（NX10-IMPL-01 Phase 1+4）

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx10_impl_01_m1_medal_and_task_seed` | 20 medal levels（5 tier × 4 rank）+ 5 TaskTemplate 系統範本 |
| M2 | `nx10_impl_01_m2_streak_task_templates_seed` | 7 STREAK_D{N} templates（A029 撈回 schema 部分）|

⭐ 既有 14 model 結構 **0 動**（Crown 拍板 + Q-RHYTHM-2 紀律）、純 INSERT seed × 2 軌、0 prisma drift（罕見、connect-the-dots seed）。

## 2.2 既有 14 model（audit-01 揭露、本軌不動）

對齊 audit-01 §1.2：EmpExpLog / CheckinLog / EmpMedal / EmpTaskLog / MedalLevel / MentorshipRecord / PromotionCriteria/Request / SprintTask/Log / SurpriseBoxLog / TaskTemplate / TeamTask/Log

⚠️ 9 schema-only model 本軌補 2（SurpriseBoxLog + SprintTask + SprintTaskLog 透過 service 直接寫入）、7 留 IMPL-02（TeamTask/Log + Mentorship + Promotion 全套）。

---

# § 3. Service 真相

## 3.1 既有 5 service / 11 endpoint（NX10-IMPL-01 前）

對齊 audit-01 §2.1：checkin / exp / leaderboard / medals / tasks（純 5 子模組）。

## 3.2 本軌新增 2 service / 2 controller / 7 endpoint

| service | controller | 路由 | endpoint 數 | 八角驅動力 |
|---|---|---|---|---|
| Nx10SurpriseBoxService ⭐ | controller | /nx10/surprise-box | 2（open + me）| **#7 不可預期** |
| Nx10SprintService ⭐ | controller | /nx10/sprint | 5（active + me + :id + POST + PATCH）| **#6 稀缺** |

⭐ A041 真實：**7 controller / 18 endpoint**（既有 5/11 + 本軌 2/7）。

## 3.3 既有 service 0 動 + 1 wire fix（A029 撈回）

對齊 Crown「既有 11 endpoint 100% 保留」：
- checkin / exp / leaderboard / medals / tasks 5 service 全 0 改
- ⚠️ `checkin.service.checkin()` 修一處：移除 `tenantId` filter from STREAK template lookup（schema `@@unique([code])` global、純按 code 查全 tenant 共享）
- 行為：純 additive、CheckinLog create 後自動 award Exp（既有 wire 終於可運作）

## 3.4 業界 gamification 核心：驚喜寶箱 + 衝刺

### SurpriseBox（驅動力 #7）
- 每日上限 3 個
- 隨機 boxType：30% 史詩 E / 30% 稀有 R / 40% 普通 N
- 隨機 Exp：N=10~30 / R=31~80 / E=81~200
- 內部 wire applyExpChange（自動 award Exp）

### Sprint（驅動力 #6）
- 3 sprintType：WS 週衝刺 (×2) / ME 月末衝刺 (×1.5) / QR 季度排行 (×3)
- listActive / getMyParticipation / HR_ADMIN createSprint + patchSprint
- 不可改 startDate / sprintType（資料一致性保護）

---

# § 4. A029 老債撈回（worklog 主題 1D）

⭐ **真相**：既有 `checkin.service.checkin()` 已實作 wire applyExpChange（line 91-99）、缺的是 STREAK_D1~D7 task_template seed + tenantId filter 不一致修正。

本軌完成：
- M2 seed 7 STREAK_D{N} templates（system tenant 持有、global code unique）
- checkin.service 移除 tenantId filter（schema 設計即支援全 tenant 共享）
- 純 additive：既有 checkin 流程 + 自動 Exp 累積 + 連續簽到累進

Exp 公式（plan §5 Q-H6 拍板）：D1~D4 +5 / D5~D6 +10 / D7+ +20

---

# § 5. UI 真相

## 5.1 既有 1 placeholder + 1 既有 ProNx10LeftPanel

- `/dashboard/nx10/workspace`（既有升 desc）
- `apps/nx-ui/src/features/sys-dashboard/ui/ProNx10LeftPanel.tsx`（既有 PRO panel、本軌 0 動）

## 5.2 本軌新增 5 placeholder + 1 menu + side-menu wire

- `/dashboard/nx10/medals` — 勳章系統（驅動力 #2 + #4）
- `/dashboard/nx10/leaderboard` — 排行榜（驅動力 #2 + #8）
- `/dashboard/nx10/tasks` — 任務系統 5 cycle
- `/dashboard/nx10/surprise-box` ⭐ — 驚喜寶箱（驅動力 #7）
- `/dashboard/nx10/sprint` ⭐ — 衝刺挑戰（驅動力 #6）

menu.nx10.ts（getNx10SideMenu）1 group / 6 items + side-menu.ts 加 nx10 路由。

⭐ Crown Q4=a 拍板：UI 純 stub、實作獨立軌 TASK-NX10-IMPL-UI-01。

---

# § 6. NX10-IMPL-01 commit 真相（7 commit / 6 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `b39de95` | overview v0.1.0 + plan v0.1.0（八角框架）|
| 1 schema | `414ed89` | M1 seed（20 medal + 5 TaskTemplate）|
| 2-4 合併 | `?` | M2 STREAK seed + A029 撈回 + SurpriseBox ⭐ + Sprint ⭐ + module wire |
| 5 UI | `?` | 5+1 placeholder + menu.nx10 + side-menu wire |
| 6 docs | （本 commit）| summary v1.0 + worklog 主題 4 + _team 主題 31 + merge-verify |
| 收尾 | merge / push / tag | v1.3.0-nx10-gamification-closure（待 Crown）|

⭐ 7 commit + 1 收尾 = 8、命中 plan 估 7-8 預算 ✓ + Crown 估 10-15 預算 60%。

---

# § 7. Q-RHYTHM-2 第七次落地對齊

| Q | Crown 拍板 | 實作對齊 |
|---|---|---|
| Q1 八角範圍 | a=完整落地 | ✅ 5 驅動力本軌 + 3 留 IMPL-02 |
| Q2 拆軌 | b=拆 2 軌 | ✅ IMPL-02 社交+使命 + 跨模組留後續軌 |
| Q3 跨模組 wire | a=IMPL-02 連核心 3 模組 | ✅ 本軌 0 跨模組 wire |
| Q4 UI 範圍 | a=純 stub | ✅ 5+1 placeholder + menu + wire |

---

# § 8. 後續軌（IMPL-02 + UI）

- **TASK-NX10-IMPL-02-SOCIAL-MISSION** ⭐⭐⭐ **✅ 已完成**：團隊任務 + 帶新人 + 轉職 + 跨模組 wire（NX06 動態交接獎勵 ⭐⭐⭐ + NX04 業績 + NX07 薪資加成）
- TASK-NX10-IMPL-UI-01：UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫
- TASK-NX10-IMPL-02-TEST：service + Sprint/SurpriseBox + Mentorship/Promotion unit test
- TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD：NX08 OwnerDashboard 加 NX10 員工成長 dashboard

---

# § 9. IMPL-02 升級揭露（v2.0 補章）

## 9.1 新增 3 service / 3 controller / 16 endpoint

| service | controller | 路由 | endpoint 數 | 八角驅動力 |
|---|---|---|---|---|
| Nx10TeamTaskService | controller | /nx10/team-task | 5（list / :id / me / POST / PATCH）| **#5 社交** |
| Nx10MentorshipService | controller | /nx10/mentorship | 4（me / POST + PATCH + issueReward）| **#5 + #1** |
| Nx10PromotionService ⭐⭐⭐ | controller | /nx10/promotion | 7（criteria + me + apply + recommend + review + execute + POST criteria）| **#3 + #2 + #1** |

⭐ A041 真實：**10 controller / 34 endpoint**（IMPL-01 7/18 + IMPL-02 3/16）。

## 9.2 新增 3 跨模組 helper（業界改革 ⭐⭐⭐）

| helper | file | wire 入 | 業務 |
|---|---|---|---|
| createRewardFromHandover ⭐⭐⭐ | shared/nx10/nx10-create-reward-from-handover.ts | nx06 dynamic-handover.service.updateStatus COMPLETED | fromDriver + toDriver 各 25 Exp 協作獎勵 |
| updateRankingFromPerformance | shared/nx10/nx10-update-ranking-from-performance.ts | nx04 so.service.update SHIPPED | tier-based Exp（>10萬+50 / >1萬+20 / 其他+5）|
| applyMedalBonusToSalary | shared/nx10/nx10-apply-medal-bonus-to-salary.ts | nx07 salary-accrual.service.applyKpiBonus end | 醫章 tier ×1~×1.2 薪資加碼 |

紀律：全部 try/catch wrap、helper 失敗不阻擋上游主流程、冪等 prefix 去重。

## 9.3 IMPL-02 commit 真相（5 commit / 5 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `b9476da` | plan v0.1.0（7-Phase + 8 functions + 0 migration）|
| 2-4 合併 | `d966358` | TeamTask + Mentorship + Promotion 3 階審核 + module wire |
| 5 wire | `ea479ec` | 3 helper + 3 wire（NX06/NX04/NX07）⭐⭐⭐ |
| 6 UI | `7661a9a` | 4 placeholder + menu.nx10 10 items + workspace desc |
| 7 docs | （本 commit）| summary v2.0 + worklog 主題 5 + _team 主題 32 + merge-verify |

⭐ 5 commit + 1 收尾 = 6、命中 plan 估 9-11 預算 55% + Crown 估 8-12 預算 50-75%。

## 9.4 IMPL-02 schema 0 動

5 schema-only model 既有 schema 100% 完整（TeamTask + Mentorship + PromotionCriteria + PromotionRequest + TeamTaskLog）、**IMPL-02 全軌 0 migration**、純 service + endpoint 升級。

---

> 文件版本：v2.0（IMPL-02 closure、八角 8 角完整化、Q-RHYTHM-2 第八次落地）
> 下次更新觸發：UI 真實 / unit test / NX08 cross-module dashboard 後續軌啟動
