<!-- docs/nx07/spec/impl/nx07-impl-01-merge-verify.md -->

# TASK-NX07-IMPL-01 — Merge Main 上線風險揭露（NX07-IMPL-01-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 6 closure 後、Q-RHYTHM-2 第五次全軌連跑完成
> 真實 main HEAD（merge 前）：`f1d9bd8`（v1.0.0-nx08-closure + NX07-AUDIT-01）
> 分支：`feature/nx07-hr`（ahead 6 commit + 1 Phase 6 docs）
> 對應依據：[plan v0.1.0](./nx07-impl-01-plan.md) + [overview v0.1.0](../intent/nx07-overview.md) + [audit-01](../../nx07-audit-01.md)

---

## §0 ahead 7 commit 真實清單

```
（Phase 6 本 commit：summary v1.0 + worklog 主題 5 + _team 主題 29 + merge-verify）
[Phase 5 commit] UI 7+1 placeholder + menu.nx07 + side-menu wire
134c340 Phase 4 commit: nx05-create-paylog-from-salary helper + wire payroll.service.patch ⭐⭐⭐
6a53ded Phase 3 commit: SalaryAccrualService NX04 業績 → NX07 薪資加給 wire ⭐⭐⭐
4bac922 Phase 2 commit: 醫療管理 service + controller（Crown Q1=b 亞羅特色 ⭐）
43564a2 Phase 1 commit: 2 migration (M1 醫療 + M2 drift)
6afd0e1 Phase 0 commit: plan v0.1.0 + overview v0.1.0
```

---

## §1 NX07 service 改動 verify

### 1.1 既有 7 controller / 37 endpoint 行為

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `attendance.controller` (7)        | ❌ 0 改 | ✅ checkin/checkout + 5 CRUD 100% 保留 |
| `leave.controller` (5)             | ❌ 0 改 | ✅ |
| `overtime.controller` (5)          | ❌ 0 改 | ✅ |
| `payroll.controller` (5)           | ❌ 0 改 | ✅ list/get/post/delete 100% 保留 |
| `payroll.service.patch` ⚠️         | ⚠️ 升級 | CONFIRMED transition wire NX05 Paylog（純 additive、try/catch wrap、失敗不阻擋）|
| `performance.controller` (5)       | ❌ 0 改 | ✅ |
| `training.controller` (5)          | ❌ 0 改 | ✅ |
| `employee-change.controller` (5)   | ❌ 0 改 | ✅ |

⭐ **既有 37 endpoint 100% 保留 / payroll.service.patch 行為改變但純 additive**。

### 1.2 新增 2 service + 2 controller + 10 endpoint（純新增、0 替換）

| controller | 路由 | endpoint | 角色 |
|---|---|---|---|
| Nx07MedicalController ⭐         | /nx07/medical          | 9（records 5 + injuries 4） | @Roles HR_ADMIN |
| Nx07SalaryAccrualController ⭐⭐⭐ | /nx07/salary-accrual   | 1（apply-kpi-bonus）         | @Roles HR_ADMIN |

⭐ A041：**9 controller / 47 endpoint**（既有 7/37 + 本軌 2/10）。

### 1.3 跨模組 wire ⚠️ 行為改變揭露

唯一 production wire 點：`payroll.service.patch` CONFIRMED transition

| 改動 | 行為改變 |
|---|---|
| CONFIRMED 觸發 createPaylogFromConfirmedSalary | 純 additive：salary CONFIRMED 成功後額外建 1 筆 Paylog DRAFT |
| try/catch wrap | helper 失敗時不阻擋 salary CONFIRMED |
| 失敗時 audit log | 「Paylog wire 失敗、HR 需手動補建」|

⚠️ **production 影響揭露**：
- 既有 NX07 SalaryRecord CONFIRMED 路徑會多建 1 筆 nx05_paylog（payType='CP'、status='DRAFT'）
- 由會計手動 POSTED（仿既有 CR/CP 流程）
- partnerId=null（員工非 Partner）
- 風險：低（純 additive、salary 流程 0 中斷）

---

## §2 schema 改對既有功能影響

### 2.1 M1 nx07_impl_01_m1_medical_management_tables（純新表 × 2）

| 維度 | 評估 |
|---|---|
| 純 CREATE TABLE × 2 | ✅ 0 ALTER 既有表、0 backfill 衝突 |
| 既有 16 model 影響 | ✅ 0 動（Crown Q5=b 拍板對齊）|
| 既有 service 路徑 | ✅ 0 動（reverse FK 是 prisma 編譯期、runtime 0 影響）|
| FK 約束 | 4 FK：tenant × 2 + user × 2、寫入時 user 不存在會 throw |

### 2.2 M2 nx07_impl_01_m2_constraint_naming_alignment（auto-gen drift）

| 維度 | 評估 |
|---|---|
| 內容 | M1 我的 CONSTRAINT 自訂名 → Prisma convention 名（純命名）|
| 風險 | 低（命名變更、FK 邏輯不變）|
| 沿用範式 | NX06-IMPL-02 M4 + NX08-IMPL-01 M2 同模式 |

⭐ **§2 結論：2 軌 schema 純 additive、既有 production 0 影響**。

---

## §3 跨模組 helper / wire verify

### 3.1 NX04 業績 → NX07 薪資加給（service-level wire、無 helper）

- Nx07SalaryAccrualService.applyKpiBonus 內 query NX04 SO + Nx07SalaryComponent + 寫 Nx07SalaryRecordItem
- 0 動 NX04 既有 SO service / sales-performance service
- 0 動 既有 SalaryRecord patch（separate apply endpoint）

### 3.2 NX07 薪資 → NX05 Paylog（新 helper + wire 入 payroll.service.patch）

- 新 helper：`shared/nx05/nx05-create-paylog-from-salary.ts`
- payType='CP' / payMethod='TT' / partnerId=null / accountCode='6111' 薪資支出
- 冪等：remark prefix 'SAL:<yearMonth>/<userId>' 去重
- ⚠️ Crown spec 提 accountCode 6130、實際 seed 是 6111、用 seed 真實值（plan §5 揭露）

---

## §4 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 升級 `/dashboard/nx07/workspace` desc | ✅ placeholder 文字更新、UI shell 0 動 |
| 新 7 placeholder | ✅ 純新路由、既有 1 placeholder 0 動 |
| `menu.nx07.ts` 新建（既有 0 個）| ✅ 純新檔 |
| `side-menu.ts` 加 nx07 條件 | ✅ 純 additive（既有 nx02-06+08 路由 0 動）|

⭐ **§4 結論：UI 純 stub 新增、0 production behavior change**。

---

## §5 環境變數 & 業務拍板對齊 verify

| Crown 戰略題 | 拍板 | 實作對齊 |
|---|---|---|
| Q1 醫療管理範圍 | b=醫療 + 職災追蹤 | ✅ M1 新 2 表 + 9 endpoint |
| Q2 NX04 業績 wire | a=本軌 | ✅ SalaryAccrualService + 1 endpoint |
| Q3 NX05 Paylog wire | a=本軌 | ✅ helper + wire payroll.patch |
| Q4 UI 範圍 | a=純 stub | ✅ 7+1 placeholder + menu + wire |
| Q5 班表 / 員工擴充 / IpWhitelist | b=後續軌 | ✅ 本軌 0 動 |

⚠️ **環境變數**：本軌 0 新環境變數（無需 deploy 設定）。

⭐ **§5 結論：5 戰略拍板 100% 對齊**。

---

## §6 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 37 endpoint 100% 保留 / 10 新 endpoint 純新增 / payroll.patch wire additive
- [ ] §2 2 軌 schema 純 additive（2 新醫療表 + drift 結算、0 既有 ALTER）
- [ ] §3 NX04 wire service-level / NX05 wire helper + payroll.patch try/catch（失敗不阻擋）
- [ ] §4 UI 7+1 placeholder + menu.nx07 + side-menu wire 純 additive
- [ ] §5 5 戰略拍板 100% 對齊（Q1=b / Q2=a / Q3=a / Q4=a / Q5=b）
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓（71 migrations applied）
- [ ] ⭐⭐⭐ 業務閉環完整化第三大現金流接入 NX05 Paylog（採購 + 銷貨 + 發薪 100%）

---

## §7 後續軌預告

| 軌 | 啟動條件 |
|---|---|
| TASK-NX07-IMPL-UI-01 | UI 真實表單（員工 / 出勤 / 薪資 form + 個人 + 主管 dashboard）|
| TASK-NX07-IMPL-02-SCHEDULE | 班表系統完整化（schedule / scheduleItem / shiftType 三表）|
| TASK-NX07-IMPL-03-EMPLOYEE-PROFILE | 員工主檔擴充（學歷 / 證照 / 緊急聯絡人）|
| TASK-NX07-IMPL-04-IP-WHITELIST | IpWhitelist + GPS attendance.checkin wire |
| TASK-NX07-IMPL-05-SCHEMA-ENDPOINT | 7 schema-only model endpoint 補齊 |
| TASK-NX07-IMPL-06-HANDOVER-BONUS | NX06 DnHandover → 動態交接獎金 wire |
| TASK-NX07-IMPL-02-TEST | service + helper unit test |

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx07-hr → main + tag `v1.1.0-nx07-closure`（業務閉環完整化第三大現金流接入、NEXORA v1.1 達成）
