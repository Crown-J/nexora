<!-- docs/nx07/nx07-worklog.md -->

# NEXORA - NX07 - 人資模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX07 人資管理（attendance / leave / overtime / payroll / performance / training / employee-change）+ NX07 主動觸發的跨模組同步（NX07 → NX01 主檔 / NX08 ↔ NX07 attendance）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 4 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ NX07 是 **PRO-only 模組** + **雙重權限**（版本 + 角色 + 資料分層脫敏）+ **法規驅動欄位**、業務複雜度比 NX05/NX06 高、不是穩定模組第三例
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（過帳通用規則 / 公版 component / A002 schema drift / 接收側設計 5 個必備配對）

---

## 主題 1｜v7_baseline + Phase5-NX07 第八批 API 落地（PRO + 非財務雙層權限）

### 起源

`spec_v7_baseline` 建好 NX07 schema（attendance / leave / overtime / payroll / performance / training / employee-change 7 個主表 + items）。Phase5「第八批 API」按序填模組（... → NX06 → **NX07** → NX08~10）、本主題是 NX07 7 子模組 controller + service + DTO + 雙層權限 guard 落地。

> ⚠️ **NX07 沒 spec/intent 目錄、但有 workflow/primary**（跟 NX05/NX06 不同）：6 個業務流程文件已寫（h-w01 出勤 / h-w02 請假加班 / h-w03 薪資 / h-w04 員工異動 / h-w05 績效 / h-w06 訓練）— Alex 寫 NX07 規格書時有業務流程基礎、不必從零開始。
>
> 業務真相來源：[dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX07 段落 + workflow/primary/ 6 份。

### 設計決策

#### 雙層權限切割：版本 gate + 角色 gate

```
PRO Plan Guard（Nx07ProPlanGuard）           ← 版本層：LITE/PLUS 全 403
       ↓
No-Finance Guard（Nx07NoFinanceGuard）       ← 角色層：FINANCE 全 403
       ↓
canViewPayrollSalaryDetail（service 內判斷） ← 資料層：見主題 2 脫敏
       ↓
Controller 才執行
```

**為什麼分兩層 guard、不寫一個複合 guard**：
1. **PRO gate 跨模組共用**（NX08/NX09/NX10 也用）：抽 `apps/nx-api/src/shared/nexora-pro-plan.ts`、`Nx07ProPlanGuard` 是 thin wrapper
2. **FINANCE 全擋是 NX07 獨有**：財務角色不能看人資（防財務看自己薪資、含家人在公司的隱私問題）— 跟 NX05 `finance-access.guard` 反過來（NX05 是只讓 FINANCE 看、NX07 是只擋 FINANCE）
3. **獨立 guard 命名清晰**：`Nx07ProPlanGuard` + `Nx07NoFinanceGuard` 名字直接揭露用途、看 controller decorator 就懂語意

#### 5 個共用 utils（shared/nx07/）

| Util | 用途 |
|------|------|
| `nx07-pro-plan.guard.ts` | PRO 版本 gate（NX07 整模組擋）|
| `nx07-no-finance.guard.ts` | FINANCE 角色 gate（**NX07 獨有設計**）|
| `nx07-plan.ts` | re-export `nexora-pro-plan` 別名（NX08/09 共用 source）|
| `nx07-list-query.dto.ts` | 列表分頁 |
| `nx07-state-machine.ts` | 狀態機（含績效/訓練 VOIDED + employee-change DRAFT→REJECTED）|

#### 狀態機特殊點（補了兩個）

- **績效/訓練作廢 `VOIDED`**：跟 NX05 paylog VOIDED 同精神（會計學「沖一抵一」）— 績效評核已成立後、若發現嚴重錯誤要作廢、原紀錄留 `VOIDED` 狀態（保留 audit trail）+ 開反向紀錄
- **employee-change `DRAFT → REJECTED`**：員工異動申請被拒、不是 CANCELLED（CANCELLED 是申請人自己撤回）、是 REJECTED（審核者退件）— 兩個語意不同、不能合併

### 實作歷程

- 2026-04-13 `c210ce2` | SYS-DASH-P5 complete all backend API modules NX01-NX10（NX07 含在內）
- 2026-04-14（migration）`20260414180000_nx07_phase5_api_status_tables` | NX07 status enum + tables baseline
- 2026-04-15 `306a1f3` | SYS-DASH-PRO：circular KPI + attendance panel（首頁 PRO 方案視覺化、用 nx07_attendance 資料源）

### 踩坑 / 學到的

- **「FINANCE 全擋」不是 OOP convention、是法規驅動**：第一版我以為「角色細分」是設計選擇、實際是個資法 + 公司治理要求（財務不能看自己 / 同事薪資、是利益衝突防範）。教訓：**法規驅動的權限切割要在 worklog 寫清楚法規來源**（沿用 NX06 主題 3D 範式）— 詳見主題 4 4B 個資法段落。
- **A002 涉及 NX07 是 v6 historical drift**：DB 存 `'N'/'P'/'D'` 字元、schema/業務 token `'NORMAL'/'DRAFT'`、靜默 mismatch — 這跟 NX02 v6 historical schema 同模式（DB 單字元、API token）、屬全跨模組 drift。本主題 migration 列表帶過、詳細處理見 [_shared/worklog.md](../_shared/worklog.md)（待寫）。
- **狀態機補 VOIDED 跟 NX05 paylog 同對應**：第二次套用「VOIDED 是合法狀態」設計（NX05 主題 3 第一次定義）、教訓：**範式跨模組可重複、寫 worklog 時明標「沿用」即可、不必重新對焦**。

### Migration 列表（NX07 直接相關 + 跨模組受影響）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX07 schema 建立（7 主表 + items）|
| `20260414180000_nx07_phase5_api_status_tables` | NX07 status enum + 績效/訓練/employee-change 狀態擴欄 |
| `20260421152710_fix_schema_drift` | A002 修復含 nx07 狀態 default mismatch（**屬 _shared 跨模組 drift、不重述、見 [_shared/worklog.md](../_shared/worklog.md)**）|

### 對應文件

- 後端：[apps/nx-api/src/nx07/](../../apps/nx-api/src/nx07/) + [shared/nx07/](../../apps/nx-api/src/shared/nx07/)
- 業務流程：[docs/nx07/workflow/primary/](workflow/primary/)（Alex 寫的 6 份）
- 業務真相來源：[dailylog/20260414.md](../../dailylog/20260414.md) Phase5-NX07 段落

---

## 主題 2｜薪資雙層存取設計（同 endpoint 不同角色不同回傳）

> Alex 觀察：跟 NX05 `finance-access.guard` 是不同層次 — **NX05 是「該不該看」、NX07 是「看到什麼」**。本主題第一次在 NEXORA 實作「資料分層脫敏」設計。

### 起源

薪資資料是公司最敏感的資料之一。一般員工要看自己薪資（個人 portal 場景）、HR 要看全公司薪資（管理場景）、ADMIN 要看全部（稽核場景）— 但**不能讓一般員工看到「列表」就知道同事薪資總額**（即使不看明細）。

如果用傳統「endpoint 角色 guard」設計：
- 方案 i：列表 + 明細都 ADMIN/HR-only → 一般員工看不到自己薪資（業務不接受）
- 方案 ii：列表 + 明細都開放 → 一般員工列表就看到所有同事薪資（隱私破洞）
- 方案 iii ⭐：**列表開放但只露總額、明細依角色脫敏**（NX07 採用）

### 設計決策

#### API 設計（雙層存取）

```
GET /nx07/payroll                           ← 列表開放給所有 PRO 員工
  → [{ id, employee, period, totalAmount }] ← 只露總額、不含 items 明細

GET /nx07/payroll/:id                       ← 明細看角色脫敏
  → ADMIN / HR_ADMIN：{ ...header, items: [...] }   ← 含明細
  → 其他角色：       { ...header }                  ← 不含 items（service 脫敏）
  → 一般員工查自己：{ ...header, items: [...] }     ← 自己的 OK 看
```

#### 為什麼 controller 不另鎖 `:id`、由 service 脫敏

第一版想用 controller decorator `@Roles('ADMIN', 'HR_ADMIN')` 鎖 `:id` endpoint、但這樣**一般員工連自己的薪資明細都看不到**。改成：
- controller 開放 endpoint、由 `payroll.service.ts` 內判斷 `canViewPayrollSalaryDetail`
- 判斷邏輯：是 ADMIN/HR_ADMIN？OR 查的是自己的 payrollId？→ 含 items；否則回傳脫敏版本

**設計核心**：**權限檢查放越靠近資料越好、不是越靠近 endpoint 越好**。傳統 RESTful 思維是 endpoint 鎖角色、但敏感資料的「自己看自己 vs 別人看自己」業務語意必須在 service 層判斷。

### NX05 finance-access vs NX07 payroll 雙層存取對比

| 維度 | NX05 finance-access.guard | NX07 payroll 雙層存取 |
|------|---------------------------|----------------------|
| **權限粒度** | endpoint 整擋（FINANCE 才看）| 同 endpoint 不同角色不同回傳 |
| **檢查位置** | controller decorator | service 內 `canViewPayrollSalaryDetail` |
| **業務語意** | 「該不該看」（黑白分明） | 「看到什麼」（漸層脫敏）|
| **設計觸發場景** | 角色業務隔離 | 同類資料不同人看權限不同（如自己 vs 別人）|

### 實作歷程

- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit 內 | payroll.controller + payroll.service + canViewPayrollSalaryDetail helper

### 踩坑 / 學到的

- **「endpoint 鎖角色」是 RESTful 慣例、不是敏感資料規則**：傳統 NestJS 教程一律 `@Roles(...)` 鎖 endpoint、新人寫 NX07 第一版也這樣寫、結果一般員工連自己薪資都看不到。教訓：**敏感資料的權限要看「同類資料不同人不同視角」、不是「該角色能不能進這個 endpoint」**。
- **service 脫敏要明確命名 helper**：第一版 service 內直接 `if (role !== 'ADMIN' && role !== 'HR_ADMIN') delete payroll.items` — 一行 if 把脫敏邏輯混進業務 service。改成 `canViewPayrollSalaryDetail(user, payrollId)` 抽 helper、未來同邏輯共用。教訓：**權限判斷邏輯抽 helper、不要 inline 在 service 裡**。
- **「自己看自己」是常見漏寫情境**：第一版只判 role、結果一般員工連自己薪資明細都看不到。改成 `role IN [ADMIN, HR_ADMIN] OR payroll.userId === currentUser.id`。教訓：**敏感資料權限要記得「自己 vs 別人」分支**、別只看 role。

### 對應文件

- payroll.service：[apps/nx-api/src/nx07/payroll/](../../apps/nx-api/src/nx07/payroll/)
- 跨模組對比：[NX05 主題 1](../nx05/worklog.md)（finance-access.guard 整 endpoint 擋）

---

## 主題 3｜跨模組同步：NX07 主動側設計（接收側反向）+ NX07 ↔ NX08 attendance 同步

> 跨 worklog 設計範式對照：[NX05 主題 2](../nx05/worklog.md) / [NX06 主題 2](../nx06/worklog.md) 是**接收側**、本主題是**主動側**。兩種範式形成完整光譜。

### 3A. employee-change：NX07 主動改 NX01 主檔

#### 起源

員工異動（HIRE 入職 / TRANSFER 調動 / RESIGN 離職）審批通過後、必須**同步更新 NX01 主檔**（user.role_id / department_id / is_active）。問題：同步邏輯放哪？

3 方案對焦（跟 NX05/NX06 同模式）：

| 方案 | 做法 | 取捨 |
|------|------|------|
| **i** ⭐ | NX07 主導：employee-change APPROVED 在 transaction 內呼叫同步 NX01 helper | 人資 owns 員工生命週期、NX01 是被動更新 |
| ii | NX01 主導：監聽 employee-change 事件 | event-driven 複雜度高、debug 困難 |
| iii | trigger 自動同步 | 跨表 trigger 過於複雜 |

選方案 i，但**跟 NX05/NX06「接收側設計」反向**。

#### 接收側 vs 主動側 4 維度對比（本日誌建立）

| 維度 | NX05/NX06 接收側設計 | NX07 主動側設計 |
|------|---------------------|----------------|
| **業務語意 owner** | 業務模組（NX02 採購 / NX04 銷貨）擁有業務語意 | NX07 人資擁有員工生命週期語意 |
| **helper 位置** | 接收側模組（NX05 / NX06）提供 helper | 主動側模組（NX07）內部呼叫 NX01 update |
| **觸發點** | 業務模組過帳時呼叫（RR POSTED / SO SHIPPED）| NX07 employee-change APPROVED 觸發 |
| **適用場景判準** | **結果模組 owns 結果**（AR/AP 屬財務 / DN 屬物流）| **動作發起者 owns 副作用**（人資 owns 員工狀態）|

**判準總結**：
- 接收側：「**業務動作 → 對應憑證**」（憑證模組擁有憑證 schema 一致性）
- 主動側：「**業務審批 → 主檔狀態變動**」（審批模組擁有業務生命週期、主檔被動跟著走）

#### APPROVED 三種類型同步邏輯

| 異動類型 | NX01 同步動作 |
|---------|--------------|
| **HIRE**（入職）| 設 `nx01_user.is_active=true` + 帶新主檔 role_id / department_id |
| **TRANSFER**（調動）| 改 `nx01_user.role_id` + `department_id` + 主要 `nx01_user_role.role_id` |
| **RESIGN**（離職）| 設 `nx01_user.is_active=false`（**不刪帳號**、保留稽核 + 法定保存期）|

⚠️ **RESIGN 不刪帳號**是法規驅動：勞基法要求人事資料保存 5 年、個資法不可立即刪除。詳見主題 4 4A/4B。

### 3B. NX07 ↔ NX08 attendance 同步

#### 起源

NX08 daily-report（日報）有「下班打卡」欄位、跟 NX07 attendance 的 `clock_out_at` 是同一份資料（不同模組視角）。如果各自管、會 desync。

#### 設計

NX08 `PATCH /nx08/daily-report/:id/complete`（員工填完日報按完成）→ 在 transaction 內**同步寫 `nx07_attendance.clock_out_at`**。

```
員工填日報
  ↓
PATCH /nx08/daily-report/:id/complete
  ↓ tx
  ├─ update nx08_daily_report SET status='COMPLETE'
  └─ update nx07_attendance SET clock_out_at=NOW()  ← NX08 主動寫 NX07
```

**為什麼 NX08 寫 NX07、不是 NX07 寫 NX08**：
- 員工的入口是 NX08 日報（每天填完工作再下班）、不是 NX07 attendance
- attendance.clock_out_at 是 NX08 完成日報的副作用、不是獨立業務動作
- 跟 employee-change → NX01 反向（NX07 寫 NX01）對稱：**入口模組寫資料模組**、不論誰擁有 schema

### 實作歷程

- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit | employee-change.service 內呼叫 NX01 user update
- 2026-04-14 `feature/sys-dashboard` SYS-DASH-P5 commit | nx08 daily-report.controller 加 PATCH .../complete + 同步 NX07 attendance

### 踩坑 / 學到的

- **「主動側」第一次明確命名**（本日誌建立）：之前只有「接收側設計」（NX05 主題 2 + NX06 主題 2）、實際 NX07 用 NX01 / NX08 用 NX07 都是主動側、但沒明確命名。教訓：**設計範式有對偶時要明確命名兩端**、避免一端命名變成默認、另一端就模糊。
- **「不刪帳號」是 RESIGN 設計核心、不是 nice-to-have**：第一版想直接 DELETE 離職員工帳號、Crown 拍板「**不刪、留 is_active=false**」+ 法規依據（勞基法 + 個資法）。教訓：**法規驅動的設計決策要在 worklog 寫清楚法規來源**（沿用 NX06 主題 3D 手法）。
- **跨模組 transaction 不能跨服務 client**：第一版 employee-change.service 用獨立 PrismaClient call NX01 update、結果 employee-change update OK 但 NX01 沒更新（兩個 transaction）。改成 `tx.user.update(...)` 在同 tx 內。教訓：**跨表業務必須單一 prisma.$transaction、不能拆兩個 client**（沿用 NX02 主題 1 教訓、跨模組亦適用）。

### 對應文件

- employee-change.service：[apps/nx-api/src/nx07/employee-change/](../../apps/nx-api/src/nx07/employee-change/)
- nx08 daily-report：[apps/nx-api/src/nx08/daily-report/](../../apps/nx-api/src/nx08/daily-report/)
- 跨模組關聯：[NX05 主題 2](../nx05/worklog.md)（接收側設計第一次定義）/ [NX06 主題 2](../nx06/worklog.md)（接收側第二次套用）

---

## 主題 4｜法規驅動欄位設計（沿用 [NX06 主題 3D](../nx06/worklog.md) 法規揭露手法、子段落 4A~4D）

### 起源

NX07 是 NEXORA 第一個**全模組受多重法規約束**的模組。其他模組（NX02~06）有零星法規欄位（如 NX06 電子簽收涉電子簽章法）、但 NX07 是「**勞基法 + 個資法 + 性別工作平等法 + 勞保條例**」**4 個法規同時**驅動 schema 設計。

業務上：人資模組做錯就是公司法律風險（罰款、訴訟、主管機關裁罰）、不是「使用者體驗變差」而已。

### 4A. 勞基法（Labor Standards Act, LSA）

**法規依據**：《勞動基準法》第 30 條（工時）、第 32~36 條（加班）、第 38 條（特休）、第 43 條（請假）。

| schema 欄位 | LSA 條文 | 設計考量 |
|------------|---------|---------|
| `nx07_attendance.clock_in_at` / `clock_out_at` | LSA §30 一日 8 小時、一週 40 小時 | 工時計算基礎、不可篡改 + audit log |
| `nx07_overtime.overtime_hours` + `rate` | LSA §32~36 加班費率（平日 1.34/1.67、休息日 1.34~2.67、國定假日 2.0）| 費率不可硬寫、改法規時可調 |
| `nx07_leave.annual_leave_days` | LSA §38 特休天數依年資累進（6 月 3 天、1 年 7 天、3 年 10 天 ...）| 累進規則 helper、不寫死 |
| `nx07_leave.leave_type` | LSA §43 請假類型（病假 / 事假 / 婚假 / 喪假 / 公假）| ENUM 對齊法規分類、不可自訂 |

⚠️ **缺口**：加班費率計算 helper、特休累進 helper **沒實作**（schema 有 / logic 沒）— 業務鏈缺口。

### 4B. 個資法（Personal Data Protection Act, PDPA）

**法規依據**：《個人資料保護法》第 5 條（誠信使用）、第 10~11 條（當事人權利）、第 27 條（資料安全）。

| schema 欄位 | PDPA 條文 | 設計考量 |
|------------|---------|---------|
| `nx07_payroll.*`（薪資資料）| PDPA §5 必要範圍內使用 | **主題 1 + 主題 2 雙層權限是 PDPA 驅動**：FINANCE 全擋（防自身利益衝突）、列表只露總額（防同事看薪資）|
| `nx07_employee_change` 「不刪帳號、is_active=false」 | PDPA §11 當事人請求刪除權 vs 公司法定保存義務 | RESIGN 不立即刪、保留法定 5 年（勞基法 §30-1）— **法規衝突解法是「保存但停用」** |
| `nx07_attendance.gps_lat / gps_lng`（如果未來加）| PDPA §27 GPS 屬敏感個資 | ⚠️ **暫未加**、若未來加要先寫 PDPA 同意書 |

⚠️ **連回主題 1 + 主題 2**：PRO+FINANCE 雙層權限 + 薪資雙層存取**都是 PDPA 驅動**、不是工程 convention。

### 4C. 性別工作平等法（Act of Gender Equality in Employment, AGEE）

**法規依據**：《性別工作平等法》第 14~17 條（產假 / 陪產假 / 育嬰留停 / 流產假）。

| schema 欄位 | AGEE 條文 | 設計考量 |
|------------|---------|---------|
| `nx07_leave.leave_type` ENUM 加 | AGEE §14 產假 8 週、§15 陪產假 7 日、§16 育嬰留停最長 2 年、§17 流產假分類 | ENUM 對齊法規分類、產假 / 陪產假 / 育嬰留停 / 流產假不可合併 |
| `nx07_leave.is_paid` 布林 | 各類型支薪 / 不支薪規則不同（產假支薪、育嬰留停不支薪）| 不寫死、依 leave_type 對應 helper 判斷 |

### 4D. 勞工保險條例（Labor Insurance Act, LIA） + 全民健康保險法（NHIA）

**法規依據**：《勞工保險條例》第 14 條（投保薪資）、《全民健康保險法》第 18 條（保險費分攤）。

| schema 欄位 | LIA/NHIA 條文 | 設計考量 |
|------------|---------|---------|
| `nx07_payroll_item.insurance_base` | LIA §14 投保薪資級距（依政府公告 LSP 對照表）| 級距表外掛、不寫死、政府改級距時可更新 |
| `nx07_payroll_item.labor_insurance_amount` | LIA §15 員工負擔 20%、雇主 70%、政府 10% | 比例外掛 helper、計算依當期級距 |
| `nx07_payroll_item.health_insurance_amount` | NHIA §18 員工 30%、雇主 60%、政府 10% | 同上 |

⚠️ **缺口**：勞健保級距表 + 計算 helper **沒實作**（schema 有 / logic 沒）— 業務鏈缺口。

### 對應 NX07 schema 欄位（總表）

依 Crown 拍板「每子段落末尾加對應 NX07 schema 欄位標明」：
- 4A 勞基法：`attendance` / `overtime` / `leave` 主表 + items
- 4B 個資法：跨表（payroll 雙層 + user is_active + GPS 暫無）
- 4C 性平法：`leave.leave_type` ENUM + `leave.is_paid`
- 4D 勞健保：`payroll_item.insurance_base` + `labor_insurance_amount` + `health_insurance_amount`

### 踩坑 / 學到的

- **法規 ENUM 不可自訂**：第一版想開 `leave.custom_type` 給租戶自訂假類型、Crown 拍板「**法規定義的假類型不可自訂、ENUM 鎖死**」。教訓：**法規驅動的 ENUM 是法律分類、不是業務分類、開放自訂等於放任租戶違法**。
- **「不刪帳號」是法規衝突解法**：PDPA 給當事人請求刪除權、勞基法給雇主法定保存義務、衝突的解法是「**邏輯刪除（is_active=false）+ 物理保留**」。教訓：**法規衝突的設計要在 worklog 寫清楚兩邊條文 + 解法選擇**。
- **政府級距表外掛**：勞健保級距表政府每年調、寫死 schema 等於每年改 migration。改成「helper + 級距 JSON 配置」、政府公告新表 → 改配置不改 schema。教訓：**法規數字參數化、不寫死 schema**。

### 對應文件

- 業務流程：[docs/nx07/workflow/primary/h-w03-payroll.md](workflow/primary/h-w03-payroll.md) / `h-w02-leave-overtime.md`
- 範式來源：[NX06 主題 3D](../nx06/worklog.md)（電子簽章法 — 第一次定義「法規驅動欄位設計」範式）

---

## 揭露的設計缺口（NX07 全部 4 個、按處理路徑分性質）

| # | 缺口 | 性質 | 處理路徑 |
|---|------|------|---------|
| 1 | 薪資計算 helper 沒實作（payroll schema 有、實際計算 logic 沒）| **業務鏈缺口** | Alex 規格書補設計 |
| 2 | 加班費率 / 特休累進規則 helper 沒實作（schema 有 / logic 沒、4A 揭露）| **業務鏈缺口** | Alex 規格書補設計 |
| 3 | 勞健保級距表 + 計算 helper 沒實作（4D 揭露）| **業務鏈缺口** | Alex 規格書補設計、配置 JSON 級距表 |
| 4 | 沒 spec/intent 目錄（雖有 workflow/primary 6 份）| **schema/spec 缺漏** | Alex 寫 NX07 業務 spec |

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/worklog.md) ~ [NX06](../nx06/worklog.md) worklog 五段式結構
- ⚠️ **「跨模組設計光譜：接收側 / 主動側 / trigger 的判準」新範式**（本日誌建立、Crown 拍板）：
  | 範式 | 適用場景 | 觸發點 | helper 位置 | 範例 |
  |------|---------|--------|------------|------|
  | **接收側** | 業務動作 → 對應憑證（憑證模組 owns 結果） | 業務模組過帳時呼叫 | 接收側 | NX02 RR POSTED → NX05 AP / NX04 SO SHIPPED → NX06 DN |
  | **主動側** | 業務審批 → 主檔狀態變動（審批模組 owns 生命週期） | 主動側模組業務動作 | 主動側內部 | NX07 employee-change → NX01 user / NX08 daily-report → NX07 attendance |
  | **trigger** | schema 衍生事實（強制 source of truth） | DB 內部 | DB trigger | D3 雙帳子帳狀態回算主帳（NX04 主題 3）|
  選範式判準：**誰擁有業務語意 + 誰是動作發起者 + 是否需要 DB 內部一致性**。

- ⚠️ **「資料分層脫敏」範式**（本日誌建立、主題 2）：當「同類資料不同人不同視角」時、權限不能只在 endpoint 鎖、要在 service 內依「角色 + 自己 vs 別人」脫敏。NEXORA 第一例是 NX07 payroll、未來其他敏感資料（薪資 / 績效 / 健康資料）可參考。

- ⚠️ **「法規驅動欄位設計」範式延伸**（NX06 主題 3D 第一次定義 / NX07 主題 4 第二次套用）：NX07 是 4 個法規同時驅動的最複雜情境、寫法可參考主題 4 4A~4D 子段落 + 「對應 schema 欄位」總表 + 「法規衝突解法」踩坑。

- ⚠️ **「揭露缺口分性質」表格化**（NX06 範式延續、本日誌 4 個缺口都歸類）：業務鏈 / demo→prod / schema-spec 缺漏 / 規範不一致。

- 跨模組或公版（過帳通用規則 / 公版 component / A002 schema drift / 接收側設計 5 個必備配對 / 跨模組測試基礎設施演進）**不寫進本日誌**、之後寫 `_shared/worklog.md` 統合
- 下一輪預期：[docs/nx08/worklog.md](../nx08/worklog.md)（NX08 報表分析、PRO 模組、kpi/daily-report/monthly-report、預期工作量視 SYS-DASH-PRO 系列複雜度而定）

---

> 文件版本：v1.0（初版、4 主題、~5800 字、PRO + 雙重權限 + 法規驅動）
> 下次更新觸發：薪資計算 helper 補上 / 勞健保級距表配置 / NX07 業務 spec 寫完 / NX07 出現新工作（先 audit 性質）
