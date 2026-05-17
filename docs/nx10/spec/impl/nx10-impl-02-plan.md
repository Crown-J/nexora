<!-- docs/nx10/spec/impl/nx10-impl-02-plan.md -->

# TASK-NX10-IMPL-02 — 社交+使命+跨模組 wire 軌 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx10-social-mission`（自 main HEAD `8e6e103` 切出、v1.3.0-nx10-gamification-closure 後）
> 對應依據：[nx10-overview v1.0 §3.2 + §5 + §6 + §7](../intent/nx10-overview.md)
> 紀律：對齊 NX02~NX10-IMPL-01 範式（Q-RHYTHM-2 第八次落地、深化期第一軌）

---

## §0 計畫文件性質

⭐ **本軌戰略意義**：
- 八角框架剩 3 角（#1 #3 #5）完整落地
- 3 業界改革候選最強落地（NX06 動態交接獎勵 ⭐⭐⭐ / 轉職 3 階審核 ⭐⭐⭐ / 帶新人 Exp 獎勵 ⭐⭐⭐）
- NX10 IMPL-01 + IMPL-02 全 closure = NX10 模組完整化第一個

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v1.0 §3.2 沒提到的新需求）
- 跨模組 wire 衝擊上游既有業務（如 NX06 DnHandover COMPLETED 流程改變、需 Crown 拍板）
- 轉職 / 帶新人 3 階審核流程設計衝突
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 8 業務功能（對齊 overview v1.0 §3.2）

| # | 功能 | 八角驅動力 | 既有狀態 | 本軌動作 |
|---|---|---|---|---|
| 1 | TeamTask service ⭐ | #5 社交影響 | 🟡 schema-only（TeamTask + Log）| Phase 2：新 service + controller |
| 2 | Mentorship service ⭐ | #5 + #1 | 🟡 schema-only | Phase 3：新 service + controller |
| 3 | Promotion 3 階審核 ⭐⭐⭐ | #3 + #2 | 🟡 schema-only（Criteria + Request）| Phase 4：新 service + controller |
| 4 | NX06 DnHandover → 動態交接獎勵 helper ⭐⭐⭐ | #5 | ❌ 0 wire | Phase 5：helper + wire NX06 |
| 5 | NX04 SalesPerformance → 排行榜 helper | #2 | ❌ 0 wire | Phase 5：helper + wire NX04 |
| 6 | NX07 SalaryAccrual → 醫章加碼 helper | #4 + #1 | ❌ 0 wire | Phase 5：helper + wire NX07 |
| 7 | UI 4 placeholder 補完 | - | - | Phase 6 |
| 8 | 治理檔補完 | - | - | Phase 7 |

---

## §2 拓樸排序 4 層

### L1 — 既有 schema 驗證（Phase 1）

⭐ **Hank Q-H1 自決**：本軌**完全不動 schema**（5 schema-only model schema 已完整 + Crown「既有 11 endpoint + IMPL-01 7 endpoint 100% 保留」）：

- Nx10TeamTask + Nx10TeamTaskLog（既有 schema 完整、targetType AT/KP/DR/OT + taskCycle W/M + rewardExp）
- Nx10MentorshipRecord（既有 schema 完整、mentorId + menteeId + rewardExp default 500 + rewardIssued）
- Nx10PromotionCriteria（既有 schema 完整、6 條件：fromRole/toRole + minMedal + minTenure + minKpiRate + minMentorship + noPenalty）
- Nx10PromotionRequest（既有 schema 完整、status P/A/R/E/X、sysVerifyResult P/F、supervisorRecommend + reviewedBy 3 階審核欄齊全）

**Phase 1 = 純 verify、0 migration 寫入**。

### L2 — 3 新 service（Phase 2-4）

#### TeamTask service（Phase 2、驅動力 #5）

- **Nx10TeamTaskService**：
  - listTasks（HR_ADMIN list / 員工 list 倉庫適用）
  - getById
  - createTask（HR_ADMIN）
  - patchTask（HR_ADMIN）
  - listMyAchievements（個人所在倉庫 TeamTaskLog 歷史）
- **Nx10TeamTaskController** `/nx10/team-task`：5 endpoint

#### Mentorship service（Phase 3、驅動力 #5 + #1）

- **Nx10MentorshipService**：
  - listMine（個人作為 mentor / mentee 紀錄）
  - createPair（HR_ADMIN 指派、startDate 必填）
  - issueReward（達標時手動觸發、寫 rewardIssued=true + issuedAt + applyExpChange 給 mentor）
  - patchEnd（HR_ADMIN 結束、endDate + menteeKpiRate）
- **Nx10MentorshipController** `/nx10/mentorship`：4 endpoint

#### Promotion 3 階審核 service（Phase 4、驅動力 #3 + #2 + #1）⭐⭐⭐

- **Nx10PromotionService**：
  - listCriteria（HR_ADMIN 看 + 員工看自己可申請的）
  - createCriteria（HR_ADMIN）
  - applyRequest（員工申請、系統階段 1 驗證 + 寫 sysVerifyResult P/F + sysVerifyDetail）
  - listMyRequests（個人申請歷史）
  - patchSupervisorRecommend（OWNER 階段 2 推薦）
  - reviewRequest（HR_ADMIN 階段 3 審核：status=A 核准 / R 退件 / X 取消）
  - executeRequest（status='A' → 更新 NX01 user.roleId + status='E'）
- **Nx10PromotionController** `/nx10/promotion`：7 endpoint

### L3 — 3 跨模組 helper + wire（Phase 5、業界改革 ⭐⭐⭐）

⭐ **Hank Q-H2 自決**：對齊 NX02/NX04/NX05/NX07 既有 helper 範式（shared/nx10/）+ try/catch wrap（NX07 paylog wire 範式、helper 失敗不阻擋上游流程）。

#### helper 1：nx10-create-reward-from-handover ⭐⭐⭐

- file: `shared/nx10/nx10-create-reward-from-handover.ts`
- input: `{ tenantId, handoverId, userId }`
- 邏輯：read DnHandover → both fromDriver + toDriver 各 award 25 Exp（動態交接協作獎勵）
- 冪等：透過 EmpExpLog reason prefix `HANDOVER:` 標記去重
- wire 入：`nx06/dynamic-handover.service.updateStatus` 當 COMPLETED transition

#### helper 2：nx10-update-ranking-from-performance

- file: `shared/nx10/nx10-update-ranking-from-performance.ts`
- input: `{ tenantId, soId, userId }`
- 邏輯：read SO → 業績 award Exp（基於 totalAmount tier、>10萬 +50 / >1萬 +20 / 其他 +5）
- 冪等：reason prefix `SO_SHIPPED:<docNo>`
- wire 入：`nx04/so.service.patch` 當 SHIPPED transition

#### helper 3：nx10-apply-medal-bonus-to-salary

- file: `shared/nx10/nx10-apply-medal-bonus-to-salary.ts`
- input: `{ tenantId, salaryRecordId, userId }`
- 邏輯：read EmpMedal.tier → 醫章 tier 加碼倍率（BRONZE ×1 / SILVER ×1.05 / GOLD ×1.10 / PLATINUM ×1.15 / DIAMOND ×1.20）
- 寫 Nx07SalaryRecordItem 加碼一筆（calcBasis prefix `MEDAL-BONUS:`）
- 冪等：query 既有 calcBasis startsWith MEDAL-BONUS → 重算前刪
- wire 入：`nx07/salary-accrual.service.applyKpiBonus` end-of-method

### L4 — UI placeholder + menu 升（Phase 6）

- 加 4 placeholder：
  - `/dashboard/nx10/team-task`（驅動力 #5）
  - `/dashboard/nx10/mentorship`（驅動力 #5 + #1）
  - `/dashboard/nx10/promotion`（驅動力 #3 + #2、業界改革 ⭐⭐⭐）
  - `/dashboard/nx10/handover-reward`（動態交接獎勵展示、業界改革 ⭐⭐⭐）
- 升級 `/dashboard/nx10/workspace` desc（IMPL-02 八角完整化 + 3 跨模組 wire）
- menu.nx10.ts 升（既有 6 → 10 items）

---

## §3 Migration 拆軌策略（A041 估 = **0 軌 schema**）

⭐ **本軌 0 schema migration**（5 schema-only model 既有 schema 完整、純加 service + endpoint）。

對齊 NX06-IMPL-02 / NX07-IMPL-01 紀律：當 schema 已備、純 service 升級走「0 migration commit」。

---

## §4 commit 拆軌（A041 估 = **9~11 commit**、命中 Crown 估 8-12 預算 90-100%）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本檔）|
| Phase 1 | 0 | schema verify（pure verify、無 commit）|
| Phase 2 | 1 | TeamTask service + controller + DTO |
| Phase 3 | 1 | Mentorship service + controller + DTO |
| Phase 4 | 1 | Promotion 3 階審核 service + controller + DTO ⭐⭐⭐ |
| Phase 5 | 1 | 3 cross-module helper + 3 wire（NX06/NX04/NX07）|
| Phase 6 | 1 | UI 4 placeholder + menu 升 |
| Phase 7 | 1 | summary + worklog 主題 5 + _team 主題 32 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push（待 Crown）|

**估計**：7 commit + 1 收尾 = 8、命中 Crown 估 8-12 預算 ✓ 命中 plan 估 9-11 下界。

---

## §5 拍板 Q 對齊 overview v1.0 §3.2

| Q | Crown 拍板 | 影響 |
|---|---|---|
| Q1（既定）| Crown overview §3.2 全 8 項本軌落地 | ✅ |
| Q2（既定）| 八角剩 3 角（#1 #3 #5）+ 3 跨模組 wire | ✅ |

**本軌 Hank 自決 Q-H**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 既有 14 model 處置 | 結構 0 動、純 service | 5 schema-only model schema 已備 + Crown 紀律 |
| Q-H2 跨模組 helper 範式 | try/catch wrap + audit log + 冪等 reason prefix | 對齊 NX07 paylog wire 範式 |
| Q-H3 TeamTask endpoint 範圍 | list/get/create/patch/my-achievements 5 endpoint | 業務員 self-view + HR_ADMIN 管理 |
| Q-H4 Mentorship endpoint 範圍 | mine/createPair/issueReward/patchEnd 4 endpoint | HR_ADMIN 主寫 + 員工 self-view |
| Q-H5 Promotion endpoint 範圍 | 7 endpoint 完整 3 階審核 | 業界改革 ⭐⭐⭐ 必完整 |
| Q-H6 動態交接獎勵 Exp 金額 | both driver 各 +25（共 50）| 對齊 NX06-IMPL-02 動態交接「半自動倉管組長拍板」精神 |
| Q-H7 業績 SO Exp 公式 | >10萬 +50 / >1萬 +20 / 其他 +5 | 業界 gamification 標準金額階梯 |
| Q-H8 醫章加碼倍率 | BRONZE×1 / SILVER×1.05 / GOLD×1.10 / PLATINUM×1.15 / DIAMOND×1.20 | 5 tier 線性增 5% / 對齊 NX10 醫章設計 |

---

## §6 邊界守住

- ✅ **既有 11 endpoint 100% 保留**（IMPL-01 前 5 controller）
- ✅ **IMPL-01 新 7 endpoint 100% 保留**（SurpriseBox + Sprint）
- ✅ **既有 14 model 結構 0 動**（schema-only model schema 已完整）
- ⚠️ **3 跨模組 wire 行為改變揭露**（plan §7 風險揭露）：
  - NX06 DynamicHandoverService.updateStatus（COMPLETED transition 多 award 50 Exp、純 additive、try/catch）
  - NX04 SoService.patch（SHIPPED transition 多 award N Exp、純 additive、try/catch）
  - NX07 SalaryAccrualService.applyKpiBonus（end-of-method 多寫 1 筆 MEDAL-BONUS item、純 additive、try/catch）
- ⚠️ **Promotion executeRequest 寫 NX01 user.roleId**（純 additive、實際 role 變更、需 HR_ADMIN 拍板）

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| NX06 DynamicHandover wire 失敗影響既有 COMPLETED 流程 | 低 | 中 | try/catch wrap、helper 失敗不阻擋 status transition |
| NX04 SO SHIPPED wire 失敗影響既有銷貨流程 | 低 | 中 | 同上 try/catch |
| NX07 SalaryAccrual wire 醫章加碼計算錯誤 | 中 | 小 | 冪等 reason prefix 標記、可重算 |
| Promotion 3 階審核狀態流轉複雜（5 status）| 中 | 中 | service 內定狀態 transition guard + 階段順序檢查 |
| executeRequest 寫 NX01 user.roleId 衝擊既有 RBAC | 低 | 高 | 純 audit log + HR_ADMIN 主寫入紀律 |
| Mentorship issueReward 重複觸發 | 中 | 小 | rewardIssued boolean guard |
| 動態交接 Exp 雙 driver 都 award 衍生 EmpExpLog 量 | 低 | 小 | reason prefix 冪等 |

---

## §8 後續軌預告

- TASK-NX10-IMPL-UI-01：UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫 + 衝刺倒數計時器 + 轉職申請表 + 帶新人配對 UI
- TASK-NX10-IMPL-02-TEST：service + 3 helper unit test
- TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD：NX08 OwnerDashboard 加 NX10 員工成長 dashboard
- TASK-NX10-IMPL-04-KM-LEARNING：NX09 KM 學習任務 wire（看 N 篇文章解任務）
- TASK-NX10-IMPL-05-CUSTOMER-GAMIFICATION：客戶端遊戲化（範圍 B 戰略軌）

---

> 文件版本：v0.1.0（IMPL-02 plan 初版、Q-RHYTHM-2 第八次落地、八角框架完整化）
> 待 plan commit 後 → Phase 2 service 開工（Phase 1 = 純 schema verify、無 commit）
