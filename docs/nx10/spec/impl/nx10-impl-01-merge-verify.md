<!-- docs/nx10/spec/impl/nx10-impl-01-merge-verify.md -->

# TASK-NX10-IMPL-01 — Merge Main 上線風險揭露（NX10-IMPL-01-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 6 closure 後、Q-RHYTHM-2 第七次全軌連跑完成
> 真實 main HEAD（merge 前）：`5c346a4`（v1.2.0-nx09-eip-closure + NX10-AUDIT-01）
> 分支：`feature/nx10-gamification`（ahead 5 commit + 1 Phase 6 docs）
> 對應依據：[plan v0.1.0](./nx10-impl-01-plan.md) + [overview v0.1.0](../intent/nx10-overview.md) + [audit-01](../../nx10-audit-01.md)

---

## §0 ahead 6 commit 真實清單

```
（Phase 6 本 commit：summary v1.0 + worklog 主題 4 + _team 主題 31 + merge-verify）
[Phase 5 commit] UI 5+1 placeholder + menu.nx10 + side-menu wire
[Phase 2-4 合併]  M2 STREAK seed + A029 撈回 + SurpriseBox + Sprint + module wire
414ed89 Phase 1 commit: M1 seed (20 medal + 5 TaskTemplate)
b39de95 Phase 0 commit: plan v0.1.0 + overview v0.1.0（八角框架）
```

---

## §1 NX10 service 改動 verify

### 1.1 既有 5 controller / 11 endpoint 行為

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `exp.controller` (3)         | ❌ 0 改 | ✅ |
| `checkin.controller` (2)     | ⚠️ service 1 line fix（A029）| ✅ 既有 endpoint 行為 additive 升級（CheckinLog create 後自動 award Exp）|
| `tasks.controller` (3) + tasks-today | ❌ 0 改 | ✅ |
| `medals.controller` (2)      | ❌ 0 改 | ✅ |
| `leaderboard.controller` (1) | ❌ 0 改 | ✅ |

⭐ **既有 11 endpoint 100% 保留 / checkin.service 1 line fix（A029 撈回）為唯一行為改變、純 additive**。

### 1.2 新增 2 service + 2 controller + 7 endpoint（純新增、0 替換）

| controller | 路由 | endpoint | 八角驅動力 |
|---|---|---|---|
| Nx10SurpriseBoxController ⭐ | /nx10/surprise-box | 2（open + me）| #7 不可預期 |
| Nx10SprintController ⭐ | /nx10/sprint | 5（active + me + :id + POST + PATCH）| #6 稀缺 |

⭐ A041：**7 controller / 18 endpoint**（既有 5/11 + 本軌 2/7）。

### 1.3 A029 撈回 ⚠️ 行為改變揭露

| 改動 | 行為改變 |
|---|---|
| `checkin.service.checkin()` line 85-87 移除 tenantId filter | 純按 code 查 STREAK template（schema global unique 設計即支援）|
| M2 seed 7 STREAK_D{N} templates | 既有 checkin endpoint 終於可運作（之前 throw NotFoundException）|
| CheckinLog create → 自動 award Exp | 既有 checkin 流程 + Exp 累積（純 additive、try/catch 無、因既有 transaction 包覆）|

⚠️ **production 影響揭露**：
- 既有 production CheckinLog INSERT 流程會多 award Exp（NX10EmpMedal.totalExp accumulate）
- 之前 production 若曾呼叫 checkin endpoint、必 throw NotFoundException（schema-only template 缺）、所以實際上未生 production 資料
- 風險：低（撈回反而修復既有未生效流程）

---

## §2 schema 改對既有功能影響

### 2.1 M1 nx10_impl_01_m1_medal_and_task_seed（純 INSERT seed）

| 維度 | 評估 |
|---|---|
| 0 ALTER schema | ✅ 既有 14 model 結構 0 動 |
| CROSS JOIN 全 tenant seed medal_level | ✅ 4 tenants × 20 levels = 80 rows、ON CONFLICT DO NOTHING idempotent |
| system tenant seed task_template | ✅ 5 系統範本（DAILY_CHECKIN/WEEKLY_SALES_KPI/MONTHLY_GOAL/QUARTERLY_PERF/MILESTONE_FIRST_SO）|

### 2.2 M2 nx10_impl_01_m2_streak_task_templates_seed（A029 撈回 seed）

| 維度 | 評估 |
|---|---|
| 0 ALTER schema | ✅ |
| 7 STREAK_D{N} templates seed | ✅ system tenant、global code unique 對齊 |
| 0 prisma drift | ⭐ 罕見！純 seed 無 constraint 名稱差異 |

### 2.3 踩坑揭露：VARCHAR(10) 限制

⚠️ 第一次 M1 因 `PLATINUM_III`/`DIAMOND_III` (11 chars) 超過 VARCHAR(10) 失敗：
- 修正：縮寫 `PLAT_*` / `DIA_*` 對應 tier 完整名
- 教訓：seed 寫入前先 grep schema VARCHAR 寬度

⭐ **§2 結論：2 軌 schema 純 seed、0 ALTER、0 prisma drift（連 4 軌 NX06+NX08+NX07+NX09 drift 之後本軌罕見 0 drift）**。

---

## §3 跨模組 wire verify

⭐ **本軌 0 跨模組 wire**（Crown Q3=a 拍板：跨模組 wire 留 IMPL-02 後續軌）。

### 3.1 IMPL-02 預留接點

- NX06 DnHandover → NX10 動態交接獎勵 ⭐⭐⭐（業界第一）
- NX04 SO 業績 → NX10 排行榜
- NX07 SalaryComponent → NX10 業績加成
- NX09 KmArticle → NX10 KM 貢獻 Exp（學習任務）

---

## §4 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 升級 `/dashboard/nx10/workspace` desc | ✅ placeholder 文字更新 |
| 新 5 placeholder | ✅ 純新路由、既有 1 placeholder 0 動 |
| 既有 ProNx10LeftPanel sys-dashboard | ✅ 0 動（audit § 3.2 揭露既有 component）|
| `menu.nx10.ts` 新建 | ✅ 純新檔 |
| `side-menu.ts` 加 nx10 條件 | ✅ 純 additive |

⭐ **§4 結論：UI 純 stub 新增 + 0 production behavior change**。

---

## §5 環境變數 & 業務拍板對齊

| Crown 戰略題 | 拍板 | 實作對齊 |
|---|---|---|
| Q1 八角範圍 | a=完整落地 | ✅ 5 驅動力本軌 + 3 留 IMPL-02 |
| Q2 拆軌 | b=拆 2 軌 | ✅ |
| Q3 跨模組 wire | a=IMPL-02 連 3 模組 | ✅ 本軌 0 wire |
| Q4 UI 範圍 | a=純 stub | ✅ 5+1 placeholder + menu + wire |

⚠️ **環境變數**：本軌 0 新環境變數（無需 deploy 設定）。

⭐ **§5 結論：4 戰略拍板 100% 對齊**。

---

## §6 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 11 endpoint 100% 保留 / 7 新 endpoint 純新增 / checkin.service 1 line fix（A029 撈回）additive
- [ ] §2 2 軌 schema 純 INSERT seed（0 ALTER、0 prisma drift 罕見）
- [ ] §3 0 跨模組 wire（IMPL-02 留後續軌）
- [ ] §4 UI 5+1 placeholder + menu.nx10 + side-menu wire 純 additive
- [ ] §5 4 戰略拍板 100% 對齊
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓（76 migrations applied）
- [ ] ⭐ A029 老債撈回完成（worklog 主題 1D）
- [ ] ⭐⭐⭐ 業務模組進度 10/11 → 11/11（100%）

---

## §7 後續軌預告

| 軌 | 啟動條件 |
|---|---|
| TASK-NX10-IMPL-02-SOCIAL-MISSION ⭐⭐⭐ | 團隊任務 + 帶新人 + 轉職 + 跨模組 wire（NX06 動態交接獎勵 ⭐⭐⭐ / NX04 業績 / NX07 薪資加成）|
| TASK-NX10-IMPL-UI-01 | UI 真實勳章 panel + 排行榜 chart + 任務列表 + 驚喜寶箱動畫 + 衝刺倒數計時器 |
| TASK-NX10-IMPL-02-TEST | service + Sprint/SurpriseBox unit test |
| TASK-NX10-IMPL-03-CROSS-MODULE-DASHBOARD | NX08 OwnerDashboard 加 NX10 員工成長 dashboard |

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx10-gamification → main + tag `v1.3.0-nx10-gamification-closure`（業務模組 11/11 100% 達成、NEXORA v1.3）
