<!-- docs/nx10/spec/impl/nx10-impl-01-plan.md -->

# TASK-NX10-IMPL-01 — 八角基礎軌 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx10-gamification`（自 main HEAD `5c346a4` 切出、v1.2.0-nx09-eip-closure + NX10-AUDIT-01 後）
> 對應依據：[nx10-overview v0.1.0](../intent/nx10-overview.md) + [nx10-audit-01](../../nx10-audit-01.md)
> 紀律：對齊 NX02~NX09 範式（Q-RHYTHM-2 第七次落地、業務模組最後 1 軌）

---

## §0 計畫文件性質

⚠️ **NX10 設計哲學：Yu-kai Chou 八角框架（Octalysis Framework）**：
- 9 schema-only model 對應 8 角驅動力（非隨機功能）
- 本軌（IMPL-01）對應驅動力 **#2 #4 #6 #7 #8**（成就 / 佔有 / 稀缺 / 好奇 / 損失）
- 下軌（IMPL-02）對應驅動力 #1 #3 #5（使命 / 賦權 / 社交）+ 跨模組 wire

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v0.1.0 沒提到的新需求）
- 既有 11 endpoint 需動到（屬重大破壞、Crown 拍板）
- A029 apply-checkin-reward 老債處理衝突
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 10 業務功能（對齊 overview v0.1.0 §3.1）

| # | 功能 | 八角驅動力 | 既有狀態 | 本軌動作 |
|---|---|---|---|---|
| 1 | 醫章 20 levels seed | #2 #4 | ✅ schema + service / ❌ seed | Phase 1：M1 seed 20 levels |
| 2 | 排行榜（個人/部門/公司）| #2 #8 | ✅ service simple | 純 verify、0 動 |
| 3 | 點數 / Exp 系統 | #4 | ✅ service | 純 verify、0 動 |
| 4 | TaskTemplate seed（5 cycle）| #2 #8 | ⚠️ schema / 0 seed | Phase 1：M1 seed 範例任務 |
| 5 | 驚喜寶箱 service ⭐ | #7 | 🟡 schema-only | Phase 2：新建 service + controller |
| 6 | 衝刺 service ⭐ | #6 | 🟡 schema-only | Phase 3：新建 service + controller |
| 7 | A029 apply-checkin-reward 撈回 | - | ❌ 老債 | Phase 4：checkin → exp auto wire |
| 8 | 20 medal seed | - | ❌ | Phase 1 含 |
| 9 | UI placeholder + menu + wire | - | 1 placeholder | Phase 5 |
| 10 | 治理檔補完 | - | ❌ 落後 2 階段 | Phase 6 |

---

## §2 拓樸排序 5 層

### L1 — schema + seed（Phase 1）

⭐ **Hank Q-H1 自決**：既有 14 model 結構 **0 動**（Crown「既有 11 endpoint 0 改」+ Q-RHYTHM-2 紀律）。本軌 schema 變動：

- **M1 seed migration**：20 medal levels + TaskTemplate 範例（日/週/月/季/里程碑各 1 範本）
- 既有 14 model 結構 **0 ALTER**
- 預期 0 prisma drift（純 INSERT seed）

### L2 — 驚喜寶箱 service ⭐ 驅動力 #7（Phase 2）

對齊 Crown 業界改革候選 + Hank Q-H2：

- **Nx10SurpriseBoxService**：
  - openBox（驗證每日 ≤ 3 + 隨機 boxType N/R/E + 隨機 Exp by 範圍）
  - listMyBoxes（個人歷史）
  - triggerBox（升階 / 里程碑時系統自動觸發、internal method、後續軌用）
- **Nx10SurpriseBoxController** `/nx10/surprise-box`：
  - POST /open（手動開箱）
  - GET /me（我的開箱歷史）

⚠️ 業界 gamification 經典範式：boxType N=10~30 / R=31~80 / E=81~200 隨機 Exp。

### L3 — 衝刺 service ⭐ 驅動力 #6（Phase 3）

- **Nx10SprintService**：
  - listActive（當前進行中衝刺、員工可看）
  - getById（衝刺詳情）
  - createSprint（HR_ADMIN 管理）
  - patchSprint（HR_ADMIN）
  - getMyParticipation（我的衝刺參與紀錄、跨 Nx10SprintTaskLog）
- **Nx10SprintController** `/nx10/sprint`：
  - GET /active
  - GET /:id
  - POST /（HR_ADMIN）
  - PATCH /:id（HR_ADMIN）
  - GET /me（個人參與紀錄）

⚠️ expMultiplier 倍率設計（週衝刺 ×2 / 月末 ×1.5 / 季度 ×3）— overview §3 揭露。

### L4 — A029 apply-checkin-reward 撈回（Phase 4）

⭐ **老債撈回**（worklog 主題 1D 揭露：TASK-SEED-REFACTOR-01 Step 7 情境 A 決定先不做）：

- 升級 `Nx10CheckinService.checkin`：CheckinLog create 成功後自動 award Exp
  - 連續簽到天數 → Exp 累進（1 天 +5 / 7 天 +20 / 30 天 +50 / 100 天 +200）
  - 走既有 `Nx10ExpService.award`（內部 method、不暴露新 endpoint）
- 升級 EmpMedal.lastCheckinDate + consecutiveCheckin auto update
- ⚠️ 既有 checkin endpoint 行為改變（plan §6 邊界揭露）

### L5 — UI + menu + wire（Phase 5）

- `apps/nx-ui/src/app/dashboard/nx10/` 加 6 placeholder：
  - workspace（既有升級 desc）
  - medals（勳章展示）
  - leaderboard（排行榜）
  - tasks（任務列表）
  - surprise-box（驚喜寶箱）⭐
  - sprint（衝刺挑戰）⭐
- **menu.nx10.ts** 建立（getNx10SideMenu、1 group 7 items）
- **side-menu.ts** 加 nx10 路由 → getNx10SideMenu()

---

## §3 Migration 拆軌策略（A041 估 = **1 軌 seed + 0 drift 預期**）

### M1 — `nx10_impl_01_m1_medal_level_and_task_template_seed`

範圍：純 INSERT seed（0 ALTER、0 schema 結構變更）：

```sql
-- 20 medal levels（5 tier × 4 rank）
INSERT INTO nx10_medal_level (tenant_id, level_code, level_name, tier, rank, sort_no, exp_threshold, created_by, updated_at, updated_by) VALUES
  (?, 'BRONZE_IV',   '銅IV',     'BRONZE',   4,  1,     0, 'SYS', NOW(), 'SYS'),
  (?, 'BRONZE_III',  '銅III',    'BRONZE',   3,  2,   100, 'SYS', NOW(), 'SYS'),
  ... × 18 more ...
  (?, 'DIAMOND_I',   '鑽I',      'DIAMOND',  1, 20, 100000, 'SYS', NOW(), 'SYS')
ON CONFLICT (tenant_id, level_code) DO NOTHING;

-- TaskTemplate 5 範例（每 cycle 各 1）
INSERT INTO nx10_task_template (tenant_id, code, name, task_cycle, exp_base, exp_formula, is_system, ...) VALUES
  (?, 'DAILY_CHECKIN', '每日簽到', 'D', 5, '固定+5', true, ...),
  (?, 'WEEKLY_SALES_KPI', '週銷售KPI達成', 'W', 100, '達成率×100', true, ...),
  (?, 'MONTHLY_GOAL', '月度目標', 'M', 500, '達成率×500', true, ...),
  (?, 'QUARTERLY_PERF', '季度績效', 'Q', 2000, '績效等級×500', true, ...),
  (?, 'MILESTONE_FIRST_SO', '首單成就', 'O', 50, '固定+50（一次性）', true, ...)
ON CONFLICT (tenant_id, code) DO NOTHING;
```

⚠️ 因 tenant_id NOT NULL、seed 需 default tenant or 跑時動態填入。本軌：用 application-level seed script 或 PRO test tenant 補（避免 M1 寫死特定 tenant_id）。

⭐ **Hank 自決**：本軌 M1 走 prisma seed script（既有 `packages/db-core/prisma/seed/`）而非 raw SQL migration、避免 tenant_id 寫死問題、由 application 端讀 tenant 列表後 idempotent insert。

→ **M1 可能改為 0 schema migration + 1 seed script**（Hank Phase 1 verify 既有 seed 機制後決定）。

---

## §4 commit 拆軌（A041 估 = **8~10 commit**、命中 Crown 估 10-15 預算 60-80%）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本檔）|
| Phase 1 | 1 | M1 seed migration（20 medal levels + TaskTemplate 5 範例）|
| Phase 2 | 1 | SurpriseBox service + controller（驅動力 #7）|
| Phase 3 | 1 | Sprint service + controller（驅動力 #6）|
| Phase 4 | 1 | A029 apply-checkin-reward 撈回（CheckinService 升級）|
| Phase 5 | 1 | UI 6 placeholder + menu.nx10 + side-menu wire |
| Phase 6 | 1 | summary + worklog 主題 4 + _team 主題 31 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push（待 Crown）|

**估計**：7 commit + 1 收尾 = 8、命中 plan 估 8-10 下界 ✓ 命中 Crown 估 10-15 預算 60%。

---

## §5 拍板 Q 對齊 overview v0.1.0

| Q | Crown 拍板 | 影響 |
|---|---|---|
| Q1 八角範圍 | a=完整落地（9 schema-only model 補完整、不拆碎）| 本軌 IMPL-01 補 5 模型（驚喜寶箱+衝刺、其餘留 IMPL-02）|
| Q2 拆軌 | b=拆 2 軌 | IMPL-02 社交+使命+跨模組 wire 留後續軌 |
| Q3 跨模組 wire | a=IMPL-02 連核心 3 模組（NX06+NX04+NX07）| 本軌 0 跨模組 wire |
| Q4 UI 範圍 | a=純 stub | 6 placeholder + menu + wire |

**本軌 Hank 自決 Q-H**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 既有 14 model 處置 | 結構 0 動 | Crown「既有 11 endpoint 0 改」+ Q-RHYTHM-2 紀律 |
| Q-H2 SurpriseBox endpoint 範圍 | open + me（手動 + 個人歷史）、internal trigger 留 IMPL-02 | 對齊 Q3=a「跨模組 wire 留後續軌」|
| Q-H3 Sprint endpoint 範圍 | active + get + create/patch（HR_ADMIN）+ me | 完整管理 + 員工 self-view |
| Q-H4 M1 schema vs seed | seed script（避免 tenant_id 寫死）or SQL with default tenant | Phase 1 verify 既有 seed 機制 |
| Q-H5 A029 撈回範式 | CheckinService 升級（內部 wire Nx10ExpService.award）、不暴露新 endpoint | 對齊「既有 endpoint 100% 保留」（行為 additive、純加 Exp 累計）|
| Q-H6 連續簽到 Exp 公式 | 1 天 +5 / 7 天 +20 / 30 天 +50 / 100 天 +200 | 業界 gamification 標準累進 |
| Q-H7 寶箱隨機 Exp 範圍 | N=10~30 / R=31~80 / E=81~200 | 對齊 schema 註解 |
| Q-H8 衝刺 expMultiplier | 週 ×2 / 月末 ×1.5 / 季度 ×3 | 對齊 overview §3 揭露 |

---

## §6 邊界守住

- ✅ **既有 5 controller + 11 endpoint 100% 保留**（checkin / exp / leaderboard / medals / tasks）
- ⚠️ **CheckinService.checkin 升級（A029 撈回）**：CheckinLog create 後自動 award Exp（純 additive、不破壞 status 流轉）
- ✅ **既有 14 model 結構 0 動**
- ✅ **既有 ProNx10LeftPanel sys-dashboard panel 0 動**（audit § 3.2 揭露既有 component）
- ⚠️ **2 新 controller**（SurpriseBox + Sprint）= +N endpoint
- ⚠️ **20 medal level seed + 5 TaskTemplate seed**（首次落地、application-level idempotent）

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| seed tenant_id 寫死問題 | 高 | 中 | 用 seed script 跨 tenant idempotent insert（非 SQL 寫死）|
| A029 撈回 CheckinService 行為改變影響既有 checkin 流程 | 中 | 中 | try/catch wrap、Exp award 失敗 0 阻擋 CheckinLog create（plan §6 邊界揭露）|
| SurpriseBox 隨機 Exp 公平性質疑 | 低 | 小 | 範圍固定 + 每日 3 個上限（不破壞排行公平）|
| Sprint expMultiplier 與既有 Exp 加成衝突 | 低 | 小 | Sprint 期間 award 時 multiply、單純資料計算 |
| Prisma migrate drift（NX06+NX08+NX07+NX09 連 4 軌）| 中 | 低 | 若 M1 用 seed 而非 schema 變更、預期 0 drift；若有 drift 沿用 NX09 範式 |

---

## §8 後續軌預告

對齊 audit § 7 + overview § 3.2 (IMPL-02)：

- **TASK-NX10-IMPL-02-SOCIAL-MISSION**：團隊任務 + 帶新人 + 轉職 + 跨模組 wire（NX06 動態交接獎勵 ⭐⭐⭐ + NX04 業績 + NX07 薪資加成）
- TASK-NX10-IMPL-UI-01：UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫
- TASK-NX10-IMPL-02-TEST：service + Sprint/SurpriseBox unit test
- TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD：NX08 OwnerDashboard 加 NX10 員工成長 dashboard

---

> 文件版本：v0.1.0（IMPL-01 plan 初版、Q-RHYTHM-2 第七次落地、八角框架完整落地最後 1 軌）
> 待 plan commit 後 → Phase 1 schema 開工
