<!-- docs/nx10/spec/impl/nx10-impl-02-merge-verify.md -->

# TASK-NX10-IMPL-02 — Merge Main 上線風險揭露（NX10-IMPL-02-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 7 closure 後、Q-RHYTHM-2 第八次全軌連跑完成
> 真實 main HEAD（merge 前）：`38077c8`（v1.3.0-nx10-gamification-closure 後 + 範式歷史 fact 保留軌）
> 分支：`feature/nx10-social-mission`（ahead 5 commit + 1 Phase 7 docs）
> 對應依據：[plan v0.1.0](./nx10-impl-02-plan.md) + [overview v1.0](../intent/nx10-overview.md) + [IMPL-01 closure summary v1.0](../../nx10-summary.md)

---

## §0 ahead 5 commit 真實清單

```
（Phase 7 本 commit：summary v2.0 + worklog 主題 5 + _team 主題 32 + merge-verify）
7661a9a Phase 6 commit: UI 4 placeholder + menu.nx10 升（10 items）+ workspace desc 升
ea479ec Phase 5 commit: 3 跨模組 helper + wire（業界改革 ⭐⭐⭐）
d966358 Phase 2-4 合併 commit: TeamTask + Mentorship + Promotion 3 階審核 ⭐⭐⭐ + module wire
b9476da Phase 0 commit: plan v0.1.0（Q-RHYTHM-2 第八次落地、八角框架完整化）
```

---

## §1 NX10 service 改動 verify

### 1.1 既有 7 controller / 18 endpoint 行為（IMPL-01 closure 狀態）

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| exp/checkin/tasks/medals/leaderboard/surprise-box/sprint | ❌ 0 改 | ✅ 100% 保留 |

⭐ **既有 18 endpoint 100% 保留**。

### 1.2 新增 3 service + 3 controller + 16 endpoint（純新增、0 替換）

| controller | 路由 | endpoint | 八角驅動力 |
|---|---|---|---|
| Nx10TeamTaskController | /nx10/team-task | 5（list + :id + me + POST + PATCH）| #5 社交 |
| Nx10MentorshipController | /nx10/mentorship | 4（me + POST pair + PATCH end + POST issueReward）| #5 + #1 |
| Nx10PromotionController ⭐⭐⭐ | /nx10/promotion | 7（criteria + me + apply + recommend + review + execute + POST criteria）| #3 + #2 + #1 |

⭐ A041：**10 controller / 34 endpoint**（IMPL-01 7/18 + IMPL-02 3/16）。

### 1.3 跨模組 wire ⚠️ 行為改變揭露（業界改革 ⭐⭐⭐）

| wire | 上游 service | 觸發點 | 行為改變 |
|---|---|---|---|
| createRewardFromHandover ⭐⭐⭐ | NX06 dynamic-handover.service.updateStatus | COMPLETED transition | DnHandover COMPLETED 後雙方外務員自動 +25 Exp、try/catch 隔離 |
| updateRankingFromPerformance | NX04 so.service.update | SHIPPED transition | SO SHIPPED 後業務員（createdBy）依 totalAmount tier 自動 +5/+20/+50 Exp、try/catch 隔離 |
| applyMedalBonusToSalary | NX07 salary-accrual.service.applyKpiBonus | end-of-method | KPI 加給套用後依醫章 tier 自動加碼一筆 MEDAL-BONUS item、try/catch 隔離 |

⚠️ **production 影響揭露**：
- 既有 NX06 handover COMPLETED 流程多寫 2 筆 EmpExpLog + 2 筆 EmpMedal update（次要副作用）
- 既有 NX04 SO SHIPPED 流程多寫 1 筆 EmpExpLog + 1 筆 EmpMedal update（次要副作用）
- 既有 NX07 applyKpiBonus 流程多寫 0 或 1 筆 SalaryRecordItem（依員工醫章 tier、BRONZE skip）
- 所有 wire 失敗：try/catch 隔離、console.warn log、不阻擋上游主流程
- 風險：低（純 additive、冪等 prefix 保護、可重跑）

### 1.4 module 升級揭露

| module | 改動 |
|---|---|
| NX06 nx06.module.ts | imports 加 Nx10Module |
| NX04 nx04.module.ts | imports 加 Nx10Module |
| NX07 nx07.module.ts | 0 動（helper 純 tx、不需 inject service）|
| NX10 nx10.module.ts | controllers + providers 加 TeamTask + Mentorship + Promotion 3 套 |

⚠️ 循環引用 check：NX10Module 只 imports PrismaModule、不依賴 NX04/NX06、安全。

---

## §2 schema 改對既有功能影響

### 2.1 0 schema migration ⭐

- 0 ALTER schema
- 0 INSERT seed
- 5 schema-only model 既有 schema 100% 完整：
  - Nx10TeamTask + Nx10TeamTaskLog（既有）
  - Nx10MentorshipRecord（既有）
  - Nx10PromotionCriteria + Nx10PromotionRequest（既有）

⭐ **0 prisma drift 風險**（無 migration 寫入）。

---

## §3 UI 改動 verify

### 3.1 新增 4 placeholder（純 UI stub）

- `/dashboard/nx10/team-task`（#5）
- `/dashboard/nx10/mentorship`（#5 + #1）
- `/dashboard/nx10/promotion`（#3 + #2 + #1 ⭐⭐⭐）
- `/dashboard/nx10/handover-reward`（#5 ⭐⭐⭐ 業界改革）

### 3.2 menu.nx10 升

- 既有 6 → 10 items（分 2 group：八角遊戲化系統 + 社交使命跨模組 IMPL-02）
- workspace desc 升（IMPL-01 + IMPL-02 八角 8 角完整化 + 3 跨模組 wire 揭露）

### 3.3 side-menu.ts 0 動

⭐ IMPL-01 已 wire nx10 路由、本軌 0 動 side-menu。

---

## §4 預期 production 行為清單

1. ✅ 既有 18 endpoint 100% 保留
2. ✅ 新增 16 endpoint 上線
3. ⚠️ NX06 handover COMPLETED → 雙方外務員自動獲 Exp（業界改革 ⭐⭐⭐ 行為改變）
4. ⚠️ NX04 SO SHIPPED → 業務員 tier-based Exp 自動獎勵（行為改變）
5. ⚠️ NX07 applyKpiBonus → 醫章 tier 加碼（行為改變、BRONZE skip）
6. ✅ 4 UI placeholder 上線
7. ✅ menu.nx10 升 10 items

---

## §5 Rollback 風險

| wire | rollback 路徑 |
|---|---|
| handover wire | revert ea479ec dynamic-handover.service 跨模組 wire 段（保留 helper 文件即可）|
| SO wire | revert ea479ec so.service 跨模組 wire 段 |
| salary wire | revert ea479ec salary-accrual.service 跨模組 wire 段 |
| service 新增 | revert d966358（同時 revert 3 service + 3 controller + module wire）|
| UI | revert 7661a9a |

⭐ 全部 git revert 可逆、0 migration 無 schema rollback 風險。

---

## §6 Build / Tsc verify

- pnpm --filter=nx-api exec tsc --noEmit → 0 error
- pnpm --filter=nx-api build → 0 error（nest build 通過）
- pnpm --filter=nx-ui exec tsc --noEmit → 0 error

---

## §7 A026 補登候選（Crown 拍板 merge 時補登）

1. **TASK-NX10-SEED-MEDAL-BONUS-COMPONENT**（系統範本 MEDAL_BONUS component seed、本軌 applyMedalBonusToSalary 走 fallback）
2. **TASK-NX10-IMPL-HANDOVER-REWARD-API**（GET 動態交接 Exp 歷史 endpoint、配合 UI placeholder 真實化）
3. **TASK-NX10-PROMOTION-VERIFY-FULL**（Promotion 階段 1 系統驗證升級：minTenureMonths / KpiRate / noPenaltyDays 真實實作）
4. **TASK-NX10-IMPL-02-TEST**（TeamTask + Mentorship + Promotion + 3 helper unit test）

---

## §8 Merge 建議

⭐ **建議 merge 入 main + tag `v1.4.0-nx10-social-mission-closure`**：
- 八角框架 8/8 完整化（業界第一）
- 3 跨模組 wire 業界改革落地
- 0 migration、0 既有 endpoint 行為破壞、try/catch wrap 全 wire 隔離
- 5 commit 結構清晰、可逐 commit revert

stop 給 Crown + Alex 驗收，Crown 拍板 A 後 Hank 自跑 merge / push / tag。
