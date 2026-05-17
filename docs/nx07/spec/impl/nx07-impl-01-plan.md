<!-- docs/nx07/spec/impl/nx07-impl-01-plan.md -->

# TASK-NX07-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx07-hr`（自 main HEAD `f1d9bd8` 切出、v1.0.0-nx08-closure + NX07-AUDIT-01 後）
> 對應依據：[nx07-overview v0.1.0](../intent/nx07-overview.md) + [nx07-audit-01](../../nx07-audit-01.md)
> 紀律：對齊 NX02~NX08 範式（Q-RHYTHM-2 第五次落地）

---

## §0 計畫文件性質

⚠️ **NX07 本軌特殊性**：
- backend 既有 16 model + 37 endpoint **最完整**（→ 0 重做、純加強 + verify）
- frontend **最落後**（僅 1 placeholder、0 menu、0 features）
- 治理檔落後 2 階段（無 spec / audit / plan / summary / merge-verify、僅 worklog v1.0）
- → 本軌 = **治理補齊 + 跨模組 wire + UI stub + 醫療管理補強**、不是建新模組

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v0.1.0 沒提到的新需求）
- 既有 37 endpoint 需動到（屬重大破壞、Crown 拍板）
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 6 業務功能（對齊 overview v0.1.0 §9.1）

| # | 功能 | 既有狀態 | 本軌動作 |
|---|---|---|---|
| 1 | 既有 37 endpoint verify | ✅ 完整 | tsc 0 error + 0 改既有 行為 |
| 2 | 醫療管理 + 職災追蹤 schema/service | ❌ 0 schema | M1 新 2 表（MedicalRecord + Injury）+ 新 service + controller |
| 3 | NX04 業績 → NX07 薪資加給 wire ⭐⭐⭐ | ⚠️ FK schema 在（SalaryComponent.kpiTemplateId）、wire 0 | 新建 SalaryAccrualService.applyKpiBonus（service-level、月底手動觸發）|
| 4 | NX07 薪資 → NX05 Paylog wire ⭐⭐⭐ | ❌ 0 helper | 新建 `nx05-create-paylog-from-salary.ts`（仿 NX05 7 helper 範式、payType=CP）|
| 5 | UI 6-10 placeholder + menu + wire | ❌ 1 placeholder | 7 新 placeholder + menu.nx07 + side-menu wire |
| 6 | 治理檔補完 | ❌ 0 | summary + worklog 主題 5 + _team 主題 29 + merge-verify |

---

## §2 拓樸排序 4 層

### L1 — 基礎層（schema：M1 新 2 醫療表）

⭐ **Hank Q-H1 自決**：既有 16 Nx07 model 0 動（守 Q-RHYTHM-2 紀律對齊 Crown Q5=b「本軌補核心」），新增 **2 個醫療管理表**（鏡像 Crown Q1=b 拍板）：

- **Nx07MedicalRecord**（年度健檢紀錄：員工 + 年度 + 體檢項目 + 結果 + 醫師簽核）
- **Nx07Injury**（職災追蹤：員工 + 日期 + 病況 + 通報狀態 + 賠償金額）

**M1 schema 性質**：純新表 × 2、無 ALTER 既有 table、0 backfill 衝突；reverse FK 列表加在 Nx01User + Nx99Tenant。

### L2 — 醫療 service + controller（新 1 service / 1 controller）

- **Nx07MedicalService**：CRUD MedicalRecord + Injury（共享 service、雙表共一個 service）
- **Nx07MedicalController** (`/nx07/medical`)：list / get / create / update / delete + injury create / update

### L3 — 跨模組 wire（2 新範式 ⭐⭐⭐）

#### L3a：NX04 業績 → NX07 薪資加給 wire

⭐ **Hank Q-H2 自決**：service-level 月底手動觸發（不裝 cron、對齊 NX05 ArStatement / NX08 ETL 範式）：

- 新建 `Nx07SalaryAccrualService`（內含 `applyKpiBonus`）：
  - input: tenantId + yearMonth + userId（or all users）
  - logic: query NX04 SalesPerformance + NX07 SalaryComponent + Nx01KpiTarget → 計算業績獎金 → 寫入 Nx07SalaryRecordItem
  - 對齊 audit § 1.4 揭露既有 NX01 KpiTemplate FK 鏈
- 新 endpoint：`POST /nx07/salary-accrual/apply-kpi-bonus`（HR_ADMIN 手動觸發）

#### L3b：NX07 薪資 → NX05 Paylog helper

⭐ **業務閉環完整化最後一塊**（採購 + 銷貨 + 發薪三大現金流接入 NX05 Paylog）：

- 新建 `apps/nx-api/src/shared/nx05/nx05-create-paylog-from-salary.ts`
- 仿 NX05 既有 7 helper 範式：
  - `createPaylogFromConfirmedSalary(tx, { tenantId, salaryRecordId, userId })`
  - payType='CP'（付款）
  - accountCodeId 查既有 6130 薪資科目（NX05 seed 已含）
  - amount = salaryRecord.netSalary
  - remark 標記 `SAL:<docNo>` dedup
  - 冪等：同 salaryRecordId 重複呼叫 return existing
- wire 入 `Nx07PayrollService.confirmSalary`（CONFIRMED 階段呼叫、CONFIRMED → POSTED 後自動建 Paylog DRAFT）

### L4 — UI + menu + wire

- `apps/nx-ui/src/app/dashboard/nx07/` 加 7 placeholder：
  - employee（員工主檔）/ attendance（出勤）/ leave（請假）/ salary（薪資）/ kpi（KPI 業績考核）/ medical（醫療管理 ⭐）/ department（部門組織）
- 既有 `/dashboard/nx07/workspace` 升 desc
- **menu.nx07.ts** 建立（getNx07SideMenu、8 items）
- **side-menu.ts** 加 nx07 路由 → getNx07SideMenu()

---

## §3 Migration 拆軌策略（A041 精確 = **1 軌**）

### M1 — `nx07_impl_01_m1_medical_management_tables`

範圍：純新表 × 2 + 4 reverse FK list（Nx01User × 2 + Nx99Tenant × 2）。

```sql
-- Nx07MedicalRecord：年度健檢紀錄
CREATE TABLE "nx07_medical_record" (
  id                VARCHAR(15) PRIMARY KEY DEFAULT gen_nx07_medical_record_id(),
  tenant_id         VARCHAR(15) NOT NULL,
  user_id           VARCHAR(15) NOT NULL,
  record_date       DATE        NOT NULL,
  record_type       VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',  -- ANNUAL / SPECIAL / FOLLOWUP
  exam_items        TEXT,                                    -- JSON: 體檢項目 + 結果
  conclusion        VARCHAR(500),
  recommendation    TEXT,
  doctor_name       VARCHAR(50),
  hospital_name     VARCHAR(100),
  attachment_url    VARCHAR(500),
  ...
);

-- Nx07Injury：職災追蹤
CREATE TABLE "nx07_injury" (
  id                VARCHAR(15) PRIMARY KEY DEFAULT gen_nx07_injury_id(),
  tenant_id         VARCHAR(15) NOT NULL,
  user_id           VARCHAR(15) NOT NULL,
  injury_date       DATE        NOT NULL,
  injury_type       VARCHAR(50),                             -- LIFT/CUT/CHEM/MACHINE/ERGO/OTHER
  injury_location   VARCHAR(200),                            -- 部位
  description       TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'REPORTED', -- REPORTED / TREATING / RECOVERED / DISABLED / FATAL
  recovery_at       TIMESTAMP(3),
  insurance_claim   DECIMAL(10,2),
  attachment_url    VARCHAR(500),
  ...
);
```

性質：ALTER 0、ADD COLUMN 0、純 CREATE TABLE × 2、0 既有資料衝突。

---

## §4 commit 拆軌（A041 估 = **8~10 commit**、命中 Crown 估 8~12 預算）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本檔）|
| Phase 1 | 1 | M1 schema（2 醫療表 + reverse FK list + migrate dev）|
| Phase 2 | 1 | 醫療 service + controller + DTO（CRUD + Injury status flow）|
| Phase 3 | 1 | NX04→NX07 業績 wire（Nx07SalaryAccrualService + endpoint）|
| Phase 4 | 1 | NX07→NX05 Paylog helper + wire 入 PayrollService.confirmSalary |
| Phase 5 | 1 | UI 7 placeholder + menu.nx07（8 items）+ side-menu wire |
| Phase 6 | 1 | summary + worklog 主題 5 + _team 主題 29 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push（待 Crown）|

**估計**：7 commit + 1 收尾 = 8 commit、命中 Crown 估 8-12 預算下界。

---

## §5 拍板 Q 對齊 overview v0.1.0

| Q | Crown 拍板 | 影響 |
|---|---|---|
| Q1 醫療管理範圍 | b=醫療 + 職災追蹤（亞羅特色 ⭐）| M1 新 2 表（MedicalRecord + Injury）|
| Q2 NX04 業績 → NX07 薪資加給 wire | a=本軌 wire | 新 SalaryAccrualService + 月底手動觸發 |
| Q3 NX07 薪資 → NX05 Paylog wire | a=本軌 wire | 新 helper + wire 入 confirmSalary |
| Q4 UI 範圍 | a=純 stub（同 NX02-08）| 7 placeholder（醫療 + 既有功能入口）|
| Q5 班表 / 員工擴充 / IpWhitelist / 7 schema-only model | b=後續軌 | 本軌 0 動 |

**本軌 Hank 自決 Q**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 既有 16 model 處置 | 結構 0 動 | Crown Q5=b 對齊「本軌補核心」、既有 backend 0 破壞 |
| Q-H2 NX04→NX07 wire 機制 | service-level + 手動觸發 endpoint（不裝 cron）| 對齊 NX05 ArStatement / NX08 ETL 範式 |
| Q-H3 NX07→NX05 Paylog wire | helper + wire 入 PayrollService.confirmSalary | 對齊 NX02 createApFromPo / NX04 createArFromSo 範式 |
| Q-H4 醫療 service 切分 | 雙表共 1 service（MedicalService）| 業務語意接近、避免過度切割 |
| Q-H5 UI 7 placeholder 不含 workspace 升級 | 升 workspace desc + 7 新 | menu 第 1 item 仍指 workspace |
| Q-H6 menu.nx07 結構 | 8 items 單 group（簡潔、對齊 menu.nx05）| HR_ADMIN dashboard 入口 |
| Q-H7 medical attachment_url 暫不實作上傳 | schema 留欄位 / service 接受 URL 字串 / 上傳留後續軌 | 對齊 Lalamove mock 範式 |
| Q-H8 SalaryAccrualService 範圍 | 純 KPI bonus apply method（不含全套薪資自動結算）| 對齊 Q5=b 本軌補核心 |

---

## §6 邊界守住

- ✅ **既有 7 service + 37 endpoint 行為 100% 保留**（attendance / leave / overtime / payroll / performance / training / employee-change 0 改既有 method）
- ✅ **既有 16 model 結構 0 動**（Q-RHYTHM-2 紀律 + Crown Q5=b）
- ✅ **雙層脫敏 + 主動側既有範式不動**（worklog 主題 2 / 主題 3 保留）
- ⚠️ **PayrollService.confirmSalary 升級 wire NX05 Paylog**（行為改變、純 additive 寫 1 筆 paylog DRAFT、不破壞既有 status 流轉）
- ⚠️ **2 新醫療表 schema 純 additive**（純新表、0 writer 外部依賴）

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| PayrollService.confirmSalary wire NX05 Paylog 衝擊既有薪資流程 | 中 | 中 | helper 內 try/catch、失敗 return null 不阻擋 salary CONFIRMED |
| NX04 SalesPerformance schema 與 SalaryComponent FK 真實串接 | 中 | 中 | Phase 3 先 verify 既有 FK + 寫 mock helper、wire 留 backlog 真實計算公式 |
| 醫療管理欄位設計（exam_items JSON 結構）| 低 | 小 | 簡化版 TEXT 存 JSON、後續軌升結構化 |
| UI placeholder 量大（7 個）| 低 | 小 | 純 stub、無互動 |
| Prisma migrate drift 結算 | 中（NX06 + NX08 教訓）| 低 | 預期 auto-gen M2 drift / rename + resolve、commit message 揭露 |

---

## §8 後續軌預告

對齊 audit § 7 + overview § 10：

- TASK-NX07-IMPL-UI-01：UI 真實表單（員工主檔 / 出勤 / 薪資 form + 個人 + 主管 dashboard）
- TASK-NX07-IMPL-02-SCHEDULE：班表系統完整化（schedule / scheduleItem / shiftType 三表 endpoint + UI）
- TASK-NX07-IMPL-03-EMPLOYEE-PROFILE：員工主檔擴充（學歷 / 證照 / 緊急聯絡人）
- TASK-NX07-IMPL-04-IP-WHITELIST：IpWhitelist + GPS attendance.checkin wire
- TASK-NX07-IMPL-05-SCHEMA-ENDPOINT：7 schema-only model endpoint 補齊
- TASK-NX07-IMPL-06-HANDOVER-BONUS：NX06 DnHandover → 動態交接獎金 wire
- TASK-NX07-IMPL-02-TEST：service + helper unit test

---

> 文件版本：v0.1.0（IMPL-01 plan 初版、Q-RHYTHM-2 第五次落地）
> 待 plan commit 後 → Phase 1 schema 開工
