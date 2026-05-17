<!-- docs/nx07/nx07-audit-01.md -->

# NX07-AUDIT-01 — 人資模組 schema + 既有狀態真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：NEXORA v1.0 主版本達成（main HEAD `e8b3d65`、8 tag）後、Crown 啟動 NX07 人資前 verify
> 對齊：NX02 / NX03 / AR / NX04 / NX05 / NX06 / NX08 audit 範式 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §1 NX07 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx07" packages/db-core/prisma/schema.prisma
→ 16
```

⭐ **NEXORA 業務模組中 model 最多的之一**（對比 NX08 8 model / NX06 5 model 含 IMPL-02）。

### 1.2 16 個 Nx07* model（schema.prisma line 範圍 + 業務語意）

| # | Model | Line | Table | 業務語意 | 既有 endpoint |
|---|---|---|---|---|---|
| 1 | `Nx07Attendance`        | 4508 | nx07_attendance         | 出勤打卡記錄（員工 + 日期）| ✅ 完整 CRUD + 2 quick-action |
| 2 | `Nx07IpWhitelist`       | 4573 | nx07_ip_whitelist       | 倉庫 IP 白名單（打卡地點限制）| ❌ 0 endpoint |
| 3 | `Nx07LeaveBalance`      | 4603 | nx07_leave_balance      | 員工每假別年度餘額 | （透過 leave CRUD 衍生）|
| 4 | `Nx07LeaveRequest`      | 4634 | nx07_leave_request      | 請假申請（員工 / 主管簽核）| ✅ 完整 CRUD |
| 5 | `Nx07LeaveType`         | 4681 | nx07_leave_type         | 假別主檔（特休 / 病假 / 事假 等）| ❌ 0 endpoint（schema-only）|
| 6 | `Nx07OvertimeRequest`   | 4722 | nx07_overtime_request   | 加班申請 | ✅ 完整 CRUD |
| 7 | `Nx07SalaryComponent`   | 4766 | nx07_salary_component   | 薪資項目主檔（本薪 / 加給 / 扣繳）| ❌ 0 endpoint（schema-only）|
| 8 | `Nx07SalaryRecord`      | 4807 | nx07_salary_record      | 薪資記錄（每月每員工一筆）| ✅ 完整 CRUD（payroll） |
| 9 | `Nx07SalaryRecordItem`  | 4858 | nx07_salary_record_item | 薪資明細（本薪 / 加給 / 勞健保 / 所得稅 ...）| （透過 payroll 衍生）|
| 10 | `Nx07SalarySetting`    | 4880 | nx07_salary_setting     | 員工薪資設定（基本薪資 + 個人化加給）| ❌ 0 endpoint（schema-only）|
| 11 | `Nx07Schedule`         | 4924 | nx07_schedule           | 班表 header（team-level）| ❌ 0 endpoint |
| 12 | `Nx07ScheduleItem`     | 4959 | nx07_schedule_item      | 班表項目（員工 + 班別 + 日期）| ❌ 0 endpoint |
| 13 | `Nx07ShiftType`        | 4996 | nx07_shift_type         | 班別主檔（早班 / 中班 / 晚班）| ❌ 0 endpoint（schema-only）|
| 14 | `Nx07Performance`      | 5034 | nx07_performance        | 績效考核（subject + reviewer + 評等）| ✅ 完整 CRUD |
| 15 | `Nx07Training`         | 5059 | nx07_training           | 教育訓練（課程 / 證照）| ✅ 完整 CRUD |
| 16 | `Nx07EmployeeChange`   | 5080 | nx07_employee_change    | 員工異動（角色 / 部門 / 主動側設計）| ✅ 完整 CRUD |

### 1.3 跟 NX01 主檔 FK 關係（A041 精確）

⭐ **員工主檔在 NX01、不在 NX07**：
- `Nx01User`（line 1146）= 員工主檔（含 employeeId / userAccount / userName / email / phone / roleId / departmentId / isActive）
- `Nx01Department`（line 451）= 部門主檔（code / name / sortNo）
- `Nx01Role`（line 1022）= 角色主檔（code / name / isSystem）

NX07 透過 `userId` FK 關聯 `Nx01User`、透過 `Nx07EmployeeChange.newRoleId / newDepartmentId` 寫主動側到 NX01。

### 1.4 跟其他模組接點

| 上游 / 下游 | 來源 | NX07 模型 | 接點欄 / FK |
|---|---|---|---|
| **NX01 User**       | line 1146 | Attendance / LeaveBalance / LeaveRequest / OvertimeRequest / SalaryRecord / SalarySetting / ScheduleItem (swapUserId) / Performance (subject + reviewer) / EmployeeChange (targetUser) | `userId` 等 11 FK |
| **NX01 Department** | line 451 | EmployeeChange.newDepartmentId | newDepartmentId |
| **NX01 Role**       | line 1022 | EmployeeChange.newRoleId | newRoleId |
| **NX01 Warehouse**  | line 1340 | IpWhitelist.warehouseId | warehouseId（打卡地點）|
| **NX01 Team**       | line 1110 | Schedule.teamId | teamId |
| **NX01 KpiTemplate** | line 597 | SalaryComponent.kpiTemplateId | kpiTemplateId（業績加給連動）|
| **NX99 Tenant**     | line 6577 | 全 16 model × tenantId | tenantId |

⚠️ **重大揭露：NX04 / NX05 / NX06 / NX08 → NX07 全 0 reverse FK**：
- NX04 SalesPerformance（業績獎金 source of truth）→ ❌ 0 直接 FK 接 NX07 SalaryRecord
- NX05 Paylog（薪資費用支付）→ ❌ 0 直接 FK
- NX06 Dn.driverUserId（配送員）→ ❌ 0 直接接 NX07 Attendance
- NX08 HrCache → ✅ rev_Nx08HrCache_userId（line 1213）但僅 cache、非 NX07 主鏈接點

⭐ **設計意涵**：NX07 純人資管理層、與業務模組的接點走 **NX01 User**（員工身份）+ **NX01 KpiTemplate**（業績加給）+ NX08 cache 聚合，無直接業務單據接點。

### §I.6.3 §1 揭露不完整

- 未 verify Nx07 schema migration 拆軌數（grep migration dir）
- 未 verify Nx07 各 model 確切欄位細節（如 SalaryRecordItem 14 欄是否含 4D 法規完整）
- 未 verify Nx07 IpWhitelist 是否實質參與 Attendance.checkin 流程

---

## §2 NX07 backend service 真相

### 2.1 既有 service 列表（A041 精確 = **7 service / 7 controller / 37 endpoint**）

```
apps/nx-api/src/nx07/
├── nx07.module.ts
├── attendance/         (controller + service + dto、7 endpoint，含 checkin/checkout quick-action)
├── employee-change/    (5 endpoint、主動側設計範式)
├── leave/              (5 endpoint)
├── overtime/           (5 endpoint)
├── payroll/            (5 endpoint、雙層權限脫敏範式)
├── performance/        (5 endpoint)
└── training/           (5 endpoint)
```

⭐ A041 endpoint breakdown：
- attendance × 7（含 POST checkin / POST checkout）
- employee-change × 5（Get list / Get :id / Post / Patch / Delete）
- leave × 5
- overtime × 5
- payroll × 5
- performance × 5
- training × 5
- 合計 **37 endpoint**

### 2.2 shared/nx07（A041 精確 = **5 檔**）

```
apps/nx-api/src/shared/nx07/
├── nx07-list-query.dto.ts       (PaginatedListQueryDto 對齊)
├── nx07-no-finance.guard.ts     (非財務員阻擋特定 endpoint)
├── nx07-plan.ts                 (@deprecated alias → planSupportsNexoraPro)
├── nx07-pro-plan.guard.ts       (PRO 方案 guard、對齊 NX08-pro-plan.guard)
└── nx07-state-machine.ts        (請假 / 加班 / 異動 status transition)
```

### 2.3 雙層權限脫敏範式（worklog 主題 2）

`payroll.service` 雙層權限：
- 同 endpoint `GET /nx07/payroll`
- 自己看 → 完整薪資明細
- 別人看 → 只見部分 fields（脫敏）
- 走 service 層 role + 自己 vs 別人 判斷

⚠️ **NEXORA 第一例「資料分層脫敏」範式**、未來敏感資料（健康 / 績效）可參考。

### 2.4 主動側設計範式（worklog 主題 3）

`employee-change` 主動寫 NX01 user.roleId / departmentId：
- NX07 主導審批生命週期
- 過帳通過 → 寫 NX01 user 主檔
- 對齊「業務狀態主動側」子範式（NX08 worklog 主題 4 定義）

### 2.5 worklog 揭露的既有缺口

對齊 `docs/nx07/nx07-worklog.md`（4 主題、349 lines、~5800 字）：
1. ⚠️ KPI 自動帶入薪資未實作（schema 有 SalaryComponent.kpiTemplateId / service 0）
2. ⚠️ leave_type / salary_component / salary_setting / schedule / shift_type 5 model schema-only（0 endpoint、0 CRUD UI）
3. ⚠️ schedule 班表完全沒落地（schedule / scheduleItem / shiftType 三表全空）
4. ⚠️ IpWhitelist 寫入 / 校驗 attendance.checkin 0 wire

### §I.6.3 §2 揭露不完整

- 未 verify attendance.checkin / checkout 流程是否含 IP 校驗 + GPS 校驗
- 未 verify payroll 雙層脫敏 service 確切實作（grep payroll.service.ts）
- 未 verify employee-change → NX01 user 主動側 atomicity（transaction wrap?）

---

## §3 NX07 frontend 真相

### 3.1 既有 app/dashboard/nx07（A041 精確 = **1 page**）

```
apps/nx-ui/src/app/dashboard/nx07/
└── workspace/
    └── page.tsx   (NX07-WS-UI-001-F01、title='人資工作台'、desc='PRO 功能')
```

### 3.2 features/nx07（A041 精確 = **0 檔**）

```
find apps/nx-ui/src/features -ipath '*nx07*'  → 0 results
```

⚠️ **features/nx07 不存在**（對比 NX06 已有 features/nx06/push-subscription.ts）。

### 3.3 menu.nx07.ts（A041 精確 = **不存在**）

```
ls apps/nx-ui/src/features/layout/config/menu.nx07*  → No such file
grep -n 'nx07\|Nx07' apps/nx-ui/src/features/layout/config/side-menu.ts  → 0 matches
```

⚠️ **side-menu.ts 0 wire nx07**（對比 menu.nx02-06 + nx08 全在）。

### 3.4 production 運作狀態

- ✅ /dashboard/nx07/workspace 純 placeholder（onboarding 進入 = "人資工作台 / PRO 功能"）
- ❌ 真實 UI 0（無員工列表 / 出勤打卡 UI / 薪資查詢 / 請假表單 / 績效考核表）

### §I.6.3 §3 揭露不完整

- 未 verify 是否有其他模組 dashboard 引用 NX07 endpoint（如 NX08 OwnerDashboard.deptPerf 走 createdBy 而非 NX07 attendance）

---

## §4 既有 demo 揭露

### 4.1 從 codebase + worklog 推斷

- ✅ **真實落地（NX07-IMPL phase5 v7_baseline + SYS-DASH-PRO）**：7 controller × CRUD 37 endpoint backend 完整
- ✅ **真實落地**：attendance.checkin / checkout 快速打卡 endpoint
- ✅ **真實落地**：payroll 雙層權限脫敏（worklog 主題 2 揭露）
- ✅ **真實落地**：employee-change 主動側寫 NX01 user（worklog 主題 3）
- ✅ **真實落地**：4D 法規驅動 schema（勞基法 + 性平法 + 個資法 + 勞健保、worklog 主題 4）
- ⚠️ **schema-only 沒 endpoint**：LeaveType / SalaryComponent / SalarySetting / Schedule / ScheduleItem / ShiftType / IpWhitelist 7 model
- ❌ **UI 0 demo**：只有 1 placeholder、無真實 form/list/dashboard
- ❌ **班表系統完全沒落地**（schedule / scheduleItem / shiftType 三表全空）
- ❌ **KPI → 薪資自動帶入**未實作（worklog 缺口 #1）

### 4.2 對比其他模組 demo 狀態

| 模組 | 真實 demo backend | UI 落地 |
|---|---|---|
| NX02-06 + AR | ✅ 完整業務 demo | ⚠️ stub placeholder（UI 獨立軌 backlog）|
| NX08（IMPL-01 後）| ✅ 12 + 22 endpoint | ⚠️ 22 placeholder（21 + 1）|
| **NX07（本軌前）** | ✅ 37 endpoint 完整 | ❌ 僅 1 placeholder（最落後）|

### §I.6.3 §4 揭露不完整

- 未 verify production env 是否實際有 attendance / leave / payroll 真實 row
- 未 verify schedule 三表全空是否含 system seed（schedule 範式 / 班別預設）
- 未 verify 「亞羅 6 部門」是否已透過 NX01 seed 落地

---

## §5 NX07 vs 8 軌範式對齊

### 5.1 partVersionId M1 配套狀態

- ⭐ **N/A**：NX07 是純人資管理層、不寫 stock_ledger / paylog 等 ledger 表
- 對齊 NX05 / NX06 / NX08 純非 ledger 模組範式

### 5.2 跟其他模組接點完整度

| 接點 | 真相 |
|---|---|
| NX07 → NX01 User 主動側（employee-change）| ✅ 已 wire（write user.roleId / departmentId）|
| NX01 User → NX07（員工身份）| ✅ 11 reverse FK 在 |
| NX01 KpiTemplate → NX07 SalaryComponent | ✅ schema FK 在、service wire ❌ 缺 |
| NX04 SalesPerformance → NX07 業績獎金 | ❌ 0 schema FK（業界需求、TASK-NX07-IMPL-01 候選）|
| NX05 Paylog → NX07 薪資費用支付 | ❌ 0 schema FK（薪資 POSTED → NX05 Paylog 候選）|
| NX08 HrCache → NX07 Attendance | ✅ schema FK（rev_Nx08HrCache_userId）、cache writer ❌ 缺 |
| NX02 醫療費用 / 員工健保 | ❌ 0 schema（Crown 揭露的特色候選）|

### 5.3 模組層治理（summary / audit / phase / closure）落後程度

| 治理檔 | NX02 | NX03 | NX04 | NX05 | NX06 | NX08 | **NX07** |
|---|---|---|---|---|---|---|---|
| audit-01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **🆕 本檔**|
| audit-02 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | — |
| overview spec | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| impl-01 plan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| summary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| merge verify | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| worklog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ v1.0（4 主題、~5800 字、PRO+雙重權限+法規驅動）|

⚠️ **NX07 治理落後**（無 spec / 無 audit / 無 plan / 無 summary / 無 merge verify、僅 worklog v1.0 4 主題揭露）。

### §I.6.3 §5 揭露不完整

- 未 verify Crown 對 NX07 → NX05 Paylog（薪資 → 費用支付）的範圍 A vs B 拍板
- 未 verify Crown 對 NX04 SalesPerformance → NX07 SalaryComponent.kpiTemplateId wire 的優先級
- 未 verify A002 schema drift 對 NX07 status default 既有狀態（Crown 揭露 memory #4、本 audit 未深 grep verify）

---

## §6 業界場景候選揭露 ⭐ Crown 拍板池

### 6.1 NEXORA 6+ 業務模組基礎齊備（業務閉環延伸）

| 上游 | 提供素材 | NX07 用途 |
|---|---|---|
| NX01 主檔 | User / Department / Role | 員工身份 + 部門結構 |
| NX01 KpiTemplate | KPI 範本（calcMethod / sourceModule） | KPI → 薪資加給連動 |
| NX04 SO + SalesPerformance | 業務員業績累計 | 業績獎金計算 |
| NX02 + NX05 | 採購 + 應付帳款 | 員工費用報帳 候選 |
| NX06 Dn.driverUserId | 配送員出勤連動 | 動態交接 KPI 連動 |
| NX08 HrCache | 報表聚合 cache | 主管 KPI dashboard |

### 6.2 業界 muscle memory 候選池（中小汽配 ERP / 人事系統）

| # | 業務功能 | 業界範式 | 既有 schema | 既有 endpoint | ⭐ 評等 |
|---|---|---|---|---|---|
| 1  | **員工主檔擴充**（學歷 / 證照 / 身分證 / 緊急聯絡人 / 銀行帳號）| NX01 User 擴充 or NX07 EmployeeProfile 新表 | ❌（僅 NX01 User 9 欄）| ❌ | ⭐⭐⭐ 業界必備 |
| 2  | **部門組織圖**（樹狀 hierarchy / manager 關係）| NX01 Department 加 parentId | ❌（僅 sortNo）| ❌ | ⭐⭐ |
| 3  | **出勤打卡**（GPS + IP + 時段）| 既有 Attendance + IpWhitelist | ✅ | ✅ checkin/checkout | ⭐⭐⭐ 已落地 |
| 4  | **班表系統**（早 / 中 / 晚 / 大夜班）| 既有 Schedule + ScheduleItem + ShiftType | ✅ schema | ❌ 0 endpoint | ⭐⭐ 候選 |
| 5  | **請假管理**（特休 / 病假 / 事假 / 婚喪假）| 既有 LeaveType + LeaveRequest + LeaveBalance | ✅ | ✅ leave 5 endpoint | ⭐⭐⭐ 已落地 |
| 6  | **加班管理**（平日 / 假日 / 國定）| 既有 OvertimeRequest | ✅ | ✅ overtime 5 endpoint | ⭐⭐⭐ 已落地 |
| 7  | **薪資計算**（本薪 + 加給 + 扣繳 + 勞健保 + 所得稅）| 既有 SalaryRecord + Item + Component + Setting | ✅ | ✅ payroll 5 endpoint（雙層脫敏 ⭐⭐）| ⭐⭐⭐ 已落地 |
| 8  | **業績獎金**（接合 NX04 SalesPerformance）| SalaryComponent.kpiTemplateId schema 在、wire 0 | ⚠️ FK 在 / 行為 0 | ❌ | ⭐⭐⭐ 業界需求 |
| 9  | **教育訓練 + 證照**（課程 / 完成 / 證照效期）| 既有 Training | ✅ | ✅ training 5 endpoint | ⭐⭐ 已落地 |
| 10 | **績效考核**（KPI + 年度評等 + reviewer）| 既有 Performance | ✅ | ✅ performance 5 endpoint | ⭐⭐ 已落地 |
| 11 | **福利管理**（年假累計 / 補貼）| 部分透過 LeaveBalance | ⚠️ 部分 | ⚠️ 部分 | ⭐ |
| 12 | **員工異動**（升職 / 轉部門 / 離職）| 既有 EmployeeChange（主動側）| ✅ | ✅ employee-change 5 endpoint | ⭐⭐⭐ 已落地 |
| 13 | **薪資 → NX05 費用支付**（薪資 POSTED → Paylog）| ❌ 0 schema / 0 wire | ❌ | ❌ | ⭐⭐⭐ 業界需求（接合 NX05）|
| 14 | **健保 / 勞保 cache**（公司投保 / 員工自付）| 部分 SalaryRecordItem 欄 | ⚠️ 部分（worklog 4D）| ❌ | ⭐⭐ 法規必備 |
| 15 | **醫療管理 ⭐ Crown 揭露**（汽配業勞工健康 / 健檢 / 職災追蹤）| ❌ 0 schema | ❌ | ❌ | ⭐⭐⭐ 業界改革候選（亞羅特色）|
| 16 | **個人 dashboard**（自己出勤 / 假別餘額 / 本月薪資）| ❌ 0 UI | — | （endpoint 在）| ⭐⭐ 規範必備 |
| 17 | **主管 dashboard**（部門出勤率 / 請假趨勢 / KPI 達成）| 透過 NX08 HrCache | ⚠️ schema 在 / writer 0 | ❌ | ⭐⭐ |
| 18 | **離職管理**（離職單 / 交接清單 / 結算薪資）| EmployeeChange 已含 changeType | ⚠️ 部分 | ⚠️ 部分 | ⭐⭐ |

### 6.3 醫療管理 ⭐ Crown 揭露候選（業界改革候選 ⭐⭐⭐）

對齊 Crown v1.0 前 NX06 段落曾提「汽配業勞工健康」，本軌候選範圍：

| 醫療場景 | schema 候選 | 業務語意 |
|---|---|---|
| **員工健檢記錄** | Nx07HealthCheck（員工 + 年度 + 項目 + 結果） | 法規（勞工健康保護規則）每年定期 |
| **職災追蹤** | Nx07OccupationalInjury（員工 + 日期 + 病況 + 賠償） | 法規（職業安全衛生法）+ 勞保理賠 |
| **健保 / 勞保 投保** | 部分 SalaryRecordItem 已含 / 抽出 Nx07Insurance 候選 | 4D 法規（勞保 / 健保）|
| **特殊作業健康管理** | 倉管 / 配送員體檢追蹤 | 汽配業舉重 / 駕駛 |
| **疫情 / 流感追蹤** | 體溫打卡 / 居家隔離記錄 | COVID-19 後業界範式 |

⚠️ **本 audit §I.6.3 揭露不完整**：Crown 揭露的「醫療管理」候選範圍細節（哪些是法規必備 / 哪些是亞羅特色加值）待 overview spec 階段補揭。

### 6.4 業界改革候選 ⭐⭐⭐

- ⭐⭐⭐ **NEXORA 業界第一個「醫療管理 + 人資整合」中小汽配 ERP**（Crown 揭露候選）
- ⭐⭐⭐ **NX04 業績 → NX07 薪資加給自動連動**（既有 schema FK 在、wire 落地後業界第一）
- ⭐⭐⭐ **NX06 DnHandover 動態交接 → NX07 業績獎金**（接合動態交接 closure、業界首發）
- ⭐⭐ 薪資 POSTED → NX05 Paylog EX 費用支付（業務閉環完整化）

### §I.6.3 §6 揭露不完整

- 未 verify Crown 對「醫療管理」範圍 A vs B 拍板（法規必備 vs 亞羅特色加值）
- 未 verify Crown 對「員工主檔擴充」（學歷 / 證照 / 緊急聯絡人）優先級
- 未 verify Crown 對「班表系統」是否本軌啟動 vs 後續軌（既有 3 schema 全空）
- 未 verify 業績獎金連動公式（百分比 / 階梯 / 上限）
- 未 verify 薪資 → NX05 Paylog wire 是否本軌或範圍 B

---

## §7 IMPL plan 預告（給 Alex 寫 overview 對齊用）

對齊 NX02-08 audit → IMPL 範式預告，NX07 推測 plan 框架：

| Phase 候選 | 範圍 |
|---|---|
| Phase 0 plan | overview v0.1.0 + Q-RHYTHM-2 拍板 |
| Phase 1 schema | M1 補（候選：員工主檔擴充 / 醫療管理表 / 薪資 → Paylog FK）|
| Phase 2 service | 補 schema-only 7 model endpoint（leave-type / salary-component / salary-setting / schedule / scheduleItem / shiftType / ipWhitelist）|
| Phase 3 wire | NX04 業績 → NX07 KPI 加給 + 薪資 → NX05 Paylog（候選）|
| Phase 4 個人 / 主管 dashboard | 個人 dashboard + 主管 dashboard（接合 NX08）|
| Phase 5 UI stub | 21+ placeholder（員工 / 出勤 / 請假 / 薪資 / 績效 / 訓練 / 醫療？）+ menu.nx07 + side-menu wire |
| Phase 6 docs | summary + worklog 主題 5 + _team 主題 29 + merge-verify |

**戰略題待 Crown 拍板**（推估 5~8 題）：
1. **醫療管理範圍**（A=法規必備 / B=亞羅特色加值 / C=後續軌）
2. **業績獎金 wire**（A=本軌 wire / B=後續軌）
3. **薪資 → NX05 Paylog wire**（A=本軌 / B=後續軌）
4. **班表系統**（A=本軌補 endpoint + UI / B=schema-only 保留 / C=刪表）
5. **員工主檔擴充**（A=NX01 User 擴 / B=NX07 EmployeeProfile 新表 / C=本軌不擴）
6. **UI 範圍**（純 stub / 真實表單 / 個人+主管 dashboard）
7. **IpWhitelist + GPS attendance.checkin wire**（A=本軌啟動 / B=後續軌）
8. **schema-only 7 model endpoint 補齊**（A=本軌全補 / B=分軌 / C=保留 schema-only）

---

## §8 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / HR 部門補揭露：

1. **§1** Nx07 schema migration 拆軌數 + 各 model 確切欄位完整度
2. **§1** Nx07 IpWhitelist 是否實質參與 Attendance.checkin
3. **§2** attendance.checkin 含 IP / GPS 校驗實際狀態
4. **§2** payroll 雙層脫敏 service 確切實作細節
5. **§2** employee-change 主動側 atomicity
6. **§3** 其他模組 dashboard 是否引用 NX07 endpoint
7. **§4** production 真實 row 量 / system seed 狀態
8. **§4** 亞羅 6 部門 NX01 seed 落地狀態
9. **§5** Crown 對 NX07→NX05 Paylog / NX04→NX07 KPI wire 範圍拍板
10. **§5** A002 schema drift 對 NX07 status default 完成度 verify（Crown memory #4 揭露）
11. **§6** Crown 醫療管理範圍 A vs B / 員工主檔擴充優先級 / 班表系統處置
12. **§6** 業績獎金連動公式 / 薪資→Paylog wire 範圍
13. **§7** 5-8 戰略題確切答案

---

## §9 與 nx07-worklog v1.0 對齊揭露

對齊 [docs/nx07/nx07-worklog.md](../nx07-worklog.md) 主題 1-4 揭露：

- 主題 1：v7_baseline + Phase5-NX07 第八批 API 落地（PRO + 非財務雙層權限）
- 主題 2：薪資雙層存取設計（同 endpoint 不同角色不同回傳、NEXORA 首例脫敏範式）
- 主題 3：跨模組同步 — NX07 主動側設計（接收側反向）+ NX07 ↔ NX08 attendance 同步
- 主題 4：法規驅動欄位設計 4A~4D（勞基法 + 性平法 + 個資法 + 勞健保）

worklog 已揭露 4 個既有缺口（本 audit §2.5 對應重述）。

⭐ 本 audit-01 補揭重點：
- 16 model / 7 controller / 37 endpoint A041 精確（worklog 未精確）
- 0 frontend menu / 0 features/nx07 / 1 placeholder（治理落後）
- 「醫療管理」候選範圍 Crown 揭露候選池（亞羅特色）
- 業績獎金 / 薪資→Paylog / 班表 / 員工主檔擴充 4 大戰略題

---

> 文件版本：v1.0（NX07-AUDIT-01 純諮詢、9 段揭露 + 16 model schema + 37 endpoint + 1 placeholder + 18 業務功能候選池 + 醫療管理特色 ⭐）
> 待 Crown 拍板 5-8 戰略題（§7 末段）→ Alex 寫 nx07-overview v0.1.0 → Hank 寫 nx07-impl-01-plan
