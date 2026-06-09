<!-- docs/nx07/nx07-summary.md -->

# NX07 人資管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX07-IMPL-01 6 Phase commit + AUDIT-01 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx07/spec/intent/nx07-overview.md`
> 戰略定位：NEXORA v1.0 後第一個收尾軌、業務閉環完整化第三大現金流接入
> Q-RHYTHM-2 第五次落地：Crown + Alex 預批、Hank 全軌連跑

---

# § 1. NX07 模組業務角色

## 1.1 模組定位

NX07 = **NEXORA 業務閉環的「人」**、HR_ADMIN 工作台 + 業務員/主管 self-view + 跨模組業績獎金 + 業務閉環發薪。

```
上游業務模組：
  NX04 SalesPerformance（v0.6.0 既有）→ 業績獎金加給（業界改革 ⭐⭐⭐ 本軌 wire）
  NX01 KpiTemplate → KPI 規則模板
  NX01 User / Department / Role → 員工身份
        ↓
NX07 人資管理：
  16 既有 model（attendance/leave/overtime/payroll/performance/training/employee-change + medical + injury 新 2）
  47 endpoint（既有 37 + 醫療 9 + KPI 加給 1）
  HR_ADMIN 主寫入者 + 雙層脫敏 + 主動側設計
        ↓
下游業務閉環：
  NX05 Paylog payType='CP' 發薪（業務閉環完整化 ⭐⭐⭐ 本軌 wire）
       ↑
  ⭐⭐⭐ 三大現金流全接入 NX05 Paylog：採購 + 銷貨 + 發薪
```

**戰略意義**：
- ⭐⭐⭐ NX04 業績 → NX07 薪資加給 wire（業界中小汽配 ERP 第一個）
- ⭐⭐⭐ NX07 薪資 → NX05 Paylog wire（業務閉環完整化最後一塊）
- ⭐ 醫療管理 + 職災追蹤（亞羅特色、汽配業勞工健康）

## 1.2 6 業務功能（對齊 overview v0.1.0 §9.1）

1. 既有 37 endpoint verify（0 動既有行為）
2. 醫療管理 + 職災追蹤 schema/service 補強（Crown Q1=b）
3. NX04 業績 → NX07 薪資加給 wire（Crown Q2=a ⭐⭐⭐）
4. NX07 薪資 → NX05 Paylog wire（Crown Q3=a ⭐⭐⭐）
5. UI 7+1 placeholder + menu.nx07 + side-menu wire（Crown Q4=a）
6. 治理檔補完（spec/audit/plan/summary/merge-verify）

---

# § 2. Schema 真相

## 2.1 2 軌 migration（NX07-IMPL-01 Phase 1）

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx07_impl_01_m1_medical_management_tables` | 純新表 × 2（MedicalRecord + Injury）+ 4 reverse FK list |
| M2 | `nx07_impl_01_m2_constraint_naming_alignment` | auto-gen drift 結算（M1 constraint 自訂名 → Prisma convention）|

## 2.2 既有 16 model + 本軌新增 2 model（總 18 model）

audit-01 §1.2 揭露的 16 model（attendance / ipWhitelist / leaveBalance/Request/Type / overtimeRequest / salaryComponent/Record/RecordItem/Setting / schedule/ScheduleItem / shiftType / performance / training / employeeChange）+ 本軌新增：

| Model | Table | 業務語意 |
|---|---|---|
| `Nx07MedicalRecord` | nx07_medical_record | 員工醫療紀錄（ANNUAL/SPECIAL/FOLLOWUP + exam_items JSON + 醫師資訊 + 附件 URL）|
| `Nx07Injury`        | nx07_injury         | 職災追蹤（LIFT/CUT/CHEM/MACHINE/ERGO/OTHER + 5-stage status flow + 保險理賠）|

⭐ Q5=b 拍板：既有 16 model 結構 0 動、純加 2 新醫療表。

---

# § 3. Service 真相

## 3.1 既有 7 service / 7 controller / 37 endpoint（NX07-IMPL-01 前）

對齊 audit-01 §2.1：attendance（含 checkin/checkout quick-action）/ leave / overtime / payroll（雙層脫敏 ⭐）/ performance / training / employee-change（主動側 ⭐）。

## 3.2 本軌新增 2 service / 2 controller / 10 endpoint

| service | controller | 路由 | endpoint 數 |
|---|---|---|---|
| `Nx07MedicalService` ⭐         | controller | /nx07/medical                  | 9（records 5 + injuries 4）|
| `Nx07SalaryAccrualService` ⭐⭐⭐ | controller | /nx07/salary-accrual           | 1（apply-kpi-bonus）|

⭐ A041 真實：**9 controller / 47 endpoint**（既有 7/37 + 本軌 2/10）。

## 3.3 shared/nx07（既有 5 helper、本軌不動）

audit-01 §2.2：nx07-list-query.dto / nx07-no-finance.guard / nx07-plan / nx07-pro-plan.guard / nx07-state-machine

## 3.4 shared/nx05 跨模組 helper（本軌新增 1）

```
shared/nx05/
├── ... 既有 7 helper ✅
└── nx05-create-paylog-from-salary.ts  🆕 本軌（NX07 SalaryRecord CONFIRMED → NX05 Paylog DRAFT）
```

⭐ wire 入 `Nx07PayrollService.patch`（CONFIRMED transition）：
- try/catch wrap（helper 失敗不阻擋薪資 CONFIRMED）
- 失敗時 audit log 記錄「HR 需手動補建」
- 成功時 audit summary 附 paylog id

---

# § 4. 業界改革 + 業務閉環完整化 ⭐⭐⭐（本軌 2 大里程碑）

## 4.1 ⭐⭐⭐ NX04 業績 → NX07 薪資加給 wire（業界改革 #2、Crown Q2=a）

`Nx07SalaryAccrualService.applyKpiBonus`：
- input: salaryRecordId（必須 DRAFT）
- 演算法 4 步驟：
  1. query NX04 SO by yearMonth + createdBy → 月度業績總額
  2. query Nx07SalaryComponent where calcMethod='K' + kpiTemplateId IS NOT NULL + active
  3. 冪等：先刪既有 `KPI-AUTO:` prefix items 再重算
  4. bonus = performanceAmount × component.defaultValue% / 100、signed by compType A/D
- HR_ADMIN 月底手動觸發（對齊 NX05 ArStatement / NX08 ETL 範式、不裝 cron）

## 4.2 ⭐⭐⭐ NX07 薪資 → NX05 Paylog wire（業務閉環完整化、Crown Q3=a）

NEXORA 三大現金流完整接入 NX05 Paylog：

| 現金流 | wire helper | tag |
|---|---|---|
| 採購 | createApFromConfirmedPo + createApFromPostedRr + createApFromPostedTi | v0.5.0-nx02 |
| 銷貨 | createArFromShippedSo + createAllowanceFromSalesReturn | v0.6.0-nx04 + v0.7.0-nx05 |
| **發薪** | **createPaylogFromConfirmedSalary** | **本軌 ⭐⭐⭐**|

業界中小汽配 ERP 三大現金流全 wire 進帳款流水的 NEXORA 第一個。

---

# § 5. UI 真相

## 5.1 既有 1 placeholder（NX07-IMPL-01 前）

- `/dashboard/nx07/workspace`（升 desc 標 8 子模組 + 47 endpoint + 2 跨模組 wire）

## 5.2 本軌新增 7 placeholder + 1 menu + side-menu wire（Phase 5）

7 新 placeholder：
- `/dashboard/nx07/employee`     — 員工主檔
- `/dashboard/nx07/attendance`   — 出勤打卡
- `/dashboard/nx07/leave`        — 請假 / 加班
- `/dashboard/nx07/salary` ⭐⭐⭐ — 薪資 + KPI 業績獎金（NX04 wire + NX05 wire）
- `/dashboard/nx07/kpi`          — KPI 業績考核
- `/dashboard/nx07/medical` ⭐    — 醫療管理 + 職災追蹤
- `/dashboard/nx07/department`   — 部門組織

menu.nx07.ts（getNx07SideMenu）1 group / 8 items + side-menu.ts 加 nx07 路由。

⭐ Crown Q4=a 拍板：UI 純 stub、實作獨立軌 TASK-NX07-IMPL-UI-01。

---

# § 6. NX07-IMPL-01 commit 真相（7 commit / 6 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `6afd0e1` | plan v0.1.0 + overview v0.1.0 |
| 1 schema | `43564a2` | M1 醫療 2 表 + M2 drift 結算 |
| 2 medical | `4bac922` | Nx07MedicalService + Controller（9 endpoint）|
| 3 NX04 wire | `6a53ded` | Nx07SalaryAccrualService.applyKpiBonus ⭐⭐⭐ |
| 4 NX05 wire | `134c340` | createPaylogFromConfirmedSalary helper + wire payroll.patch ⭐⭐⭐ |
| 5 UI | （Phase 5）| 7 placeholder + workspace 升 + menu.nx07 + side-menu wire |
| 6 docs | （本 commit）| summary v1.0 + worklog 主題 5 + _team 主題 29 + merge-verify |
| 收尾 | merge / push / tag | v1.1.0-nx07-closure（待 Crown）|

⭐ 7 commit + 1 收尾 = 8、命中 plan 估 8-10 預算 ✓ + Crown 估 8-12 下界。

---

# § 7. Q-RHYTHM-2 第五次落地對齊

| Q | Crown 拍板 | 實作對齊 |
|---|---|---|
| Q1 醫療管理範圍 | b=醫療 + 職災追蹤 | M1 新 2 表 + 9 endpoint ✓ |
| Q2 NX04 業績 wire | a=本軌 | SalaryAccrualService + 1 endpoint ✓ |
| Q3 NX05 Paylog wire | a=本軌 | createPaylogFromConfirmedSalary helper + wire ✓ |
| Q4 UI 範圍 | a=純 stub | 7+1 placeholder + menu + wire ✓ |
| Q5 班表 / 員工擴充 / IpWhitelist | b=後續軌 | 本軌 0 動 ✓ |

---

# § 8. 後續軌（業務閉環完整化後啟動）

- TASK-NX07-IMPL-UI-01：UI 真實表單（員工 / 出勤 / 薪資 form + 個人 + 主管 dashboard）
- TASK-NX07-IMPL-02-SCHEDULE：班表系統完整化（schedule / scheduleItem / shiftType 三表 endpoint + UI）
- TASK-NX07-IMPL-03-EMPLOYEE-PROFILE：員工主檔擴充（學歷 / 證照 / 緊急聯絡人）
- TASK-NX07-IMPL-04-IP-WHITELIST：IpWhitelist + GPS attendance.checkin wire
- TASK-NX07-IMPL-05-SCHEMA-ENDPOINT：7 schema-only model endpoint 補齊
- TASK-NX07-IMPL-06-HANDOVER-BONUS：NX06 DnHandover → 動態交接獎金 wire
- TASK-NX07-IMPL-02-TEST：service + helper unit test

---

> 文件版本：v1.0（IMPL-01 closure、Q-RHYTHM-2 第五次落地）
> 下次更新觸發：NX07-IMPL-UI-01 / NX07-IMPL-02-SCHEDULE / 員工擴充 / 後續軌啟動
