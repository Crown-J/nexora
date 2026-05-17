<!-- docs/nx07/spec/intent/nx07-overview.md -->

# NX07 人資管理 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 5 戰略題拍板 closure（b/a/a/a/b）
> 依賴揭露：NX07-AUDIT-01 完成（schema 真相 verify ✓）
> 戰略定位：NEXORA v1.0 後第一個收尾軌（NX07 backend 最完整 / frontend 最落後）
> 紀律：Q-RHYTHM-2 第五次落地

---

## §0 文件性質

本文件為 NX07 人資管理模組業務需求總覽、整合 audit-01 揭露 + Crown 5 戰略拍板。

⚠️ **NX07 跟其他模組不同**：
- backend 已最完整（16 model / 37 endpoint）
- frontend 最落後（1 placeholder）
- 治理檔落後 2 階段
- → 本軌 = **治理補齊 + 跨模組 wire + UI stub**、不是建新模組

Hank impl 對齊原則：
- 本文件業務需求 = 真相
- Q-RHYTHM-2 全軌連跑紀律
- 詳細範式 Hank 自決

---

## §1 NX07 業務本質

### 1.1 NX07 是什麼

**NX07 人資管理 = 亞羅 HR_ADMIN 的工作台 + 業務閉環的「人」維度**。

業務本質回答 4 個核心問題：

1. **誰在公司？**（員工主檔、6 部門組織）
2. **他們有上班嗎？**（出勤、班表、請假）
3. **薪水怎麼算？**（基本薪 + 加給 + 業績獎金 + 扣繳）
4. **他們健康嗎？**（健檢追蹤、職災管理 ⭐ 亞羅特色）

### 1.2 NX07 在 NEXORA 全棧的角色

```
上游業務模組（業績資料）：
NX04 SalesPerformance → 業績獎金加給（業界改革 ⭐⭐⭐）
NX06 DnHandover → 動態交接獎金（亞羅核心競爭力延伸）
        ↓
NX07 人資管理：
   員工主檔 + 出勤 + 班表 + 薪資 + 業績獎金 + 醫療管理
        ↓
下游業務閉環：
NX05 Paylog payType=CP（發薪、業務閉環完整化 ⭐⭐⭐）
NX08 報表分析（人力成本 / 業績獎金分析、後續軌）
```

**核心定位**：NEXORA v1.0 後的第一個收尾軌、把「人」這個維度接進業務閉環。

### 1.3 NEXORA 戰略意義

⭐⭐⭐ NX07 落地 3 個業界改革候選：

1. **醫療管理 + 人資整合**（汽配業勞工健康 / 健檢 / 職災追蹤、Crown 揭露亞羅特色）
2. **NX04 業績 → NX07 薪資加給自動連動**（既有 schema FK 在、wire 落地業界第一）
3. **NX06 DnHandover → NX07 業績獎金**（接合動態交接 closure、業界首發）

---

## §2 主使用者與權限

### 2.1 主使用者 = HR_ADMIN

對齊 memory #4「NEXORA 8 role 含 HR_ADMIN」：

| 角色 | NEXORA 角色 | 跟 NX07 關係 |
|---|---|---|
| 人資部門 | **HR_ADMIN** | **NX07 主寫入者、員工 / 薪資 / 出勤管理** |
| 員工本人 | 各業務角色 | 看自己的薪資 / 出勤 / 業績獎金 |
| 主管 | OWNER | 跨員工 read、業績審視 / 簽核 |

### 2.2 權限機制 = 彈性 role_view

對齊 NX02~NX06 範式：
- 預設 HR_ADMIN 操作 + 員工 self-view + 主管 cross-view
- 既有 audit § 2 揭露 **雙層脫敏 + 主動側**（敏感員工資料）✓

---

## §3 業務功能架構（Crown Q5=b 本軌補核心）

### 3.1 NX07 範圍 A 業務功能

對齊 audit § 6 18 業務候選池 + Crown 5 戰略拍板：

| # | 功能 | audit 狀態 | 範圍 A |
|---|---|---|---|
| 1 | 員工主檔（基本資料 / 部門 / 角色）| ✅ schema + service 完整 | ✅ verify |
| 2 | 部門組織（亞羅 6 部門）| ✅ schema + service | ✅ verify |
| 3 | 出勤打卡（attendance）| ✅ schema + service | ✅ verify |
| 4 | 請假管理（leave / leave-type）| ✅ schema + service | ✅ verify |
| 5 | 薪資管理（salary / salary-component）| ✅ schema + service | ✅ verify |
| 6 | KPI / 業績考核 | ✅ schema + service | ✅ verify |
| 7 | **醫療管理 + 職災追蹤** ⭐（Crown Q1=b）| 🟡 部分 schema | ✅ 補強 |
| 8 | **NX04 業績 → NX07 薪資加給 wire** ⭐⭐⭐（Crown Q2=a）| 🟡 FK 在、wire 0 | ✅ 新建 |
| 9 | **NX07 薪資 → NX05 Paylog wire** ⭐⭐⭐（Crown Q3=a）| ❌ 0 wire | ✅ 新建 helper |
| 10 | **frontend UI stub**（Crown Q4=a）| ❌ 1 placeholder | ✅ 補 N placeholder |
| 11 | **治理檔補齊**（spec/audit/plan/summary/merge-verify）| ❌ 0 | ✅ 補完 |

### 3.2 範圍 A 不涵蓋（Crown Q5=b 後續軌）

對齊「先全備、封測再評估」哲學：

- 班表系統（schedule / scheduleItem / shiftType 三表）→ 後續軌
- 員工主檔擴充（學歷 / 證照 / 緊急聯絡人）→ 後續軌
- IpWhitelist + GPS attendance.checkin wire → 後續軌
- 7 schema-only model endpoint 補齊 → 後續軌（leave-type / salary-component / salary-setting / schedule × 3 / ipWhitelist）

---

## §4 醫療管理 + 職災追蹤（Crown Q1=b ⭐ 亞羅特色）

### 4.1 業界 muscle memory

汽配業勞工常見職業傷害：
- 搬料受傷（重物搬運）
- 切割 / 焊接傷害
- 油漆 / 化學物品接觸
- 工具操作意外
- 長期姿勢職業病

### 4.2 業界改革候選範式

NEXORA 範圍 A 落地：
- **年度健檢追蹤**（業界標準、法規必備）
- **職災通報 + 追蹤**（亞羅特色、業界中小 ERP 0）
- **健康紀錄**（員工醫療敏感資料、雙層脫敏既有 schema 範式）

### 4.3 schema 處置

對齊 audit § 1 揭露「16 model 部分已有 medical 相關欄」：
- Hank verify 既有 schema 是否需 ALTER 補強
- 或新建 Nx07MedicalRecord / Nx07Injury 表（Hank 自決）

---

## §5 NX04 業績 → NX07 薪資加給 wire（Crown Q2=a 業界改革 ⭐⭐⭐）

### 5.1 既有架構（audit 揭露）

```
NX04 SalesPerformance（v0.6.0 已落地）
   - 業務員月度業績 + 目標達成率
   - LITE/PLUS 毛利顯示
        ↓ FK 已在（audit § 1 揭露）⭐
NX07 KpiTemplate（v1.0 既有 schema + service）
   - KPI 規則模板
   - 業績計算公式
        ↓ wire 0（本軌新建）
Nx07Salary 自動加給
   - 業績獎金 / 提成
   - 加給入薪資總額
```

### 5.2 業界改革點

對齊「業界中小汽配 ERP 0、NEXORA 第一個」：
- 業績 → 薪資自動連動（不用人資手動算）
- KPI 規則模板可自定（每家公司不同）
- 業績獎金透明（員工看得到自己怎麼算）

### 5.3 wire 範式

對齊 audit § 5 揭露既有 11 reverse FK：
- Hank 自決 wire 方向（service-level 或 helper 範式）
- 月底 cron / 手動觸發（對齊 NX05 ArStatement 範式）

---

## §6 NX07 薪資 → NX05 Paylog wire（Crown Q3=a 業務閉環完整化 ⭐⭐⭐）

### 6.1 既有架構

```
NX07 Salary（薪資計算完成）
        ↓ helper 新建（仿 NX02/NX04 範式）
NX05 Paylog payType=CP（付款流水、發薪）
        ↓ 對齊
NX05 AccountCode（薪資科目、6130 薪資）
```

### 6.2 業務閉環完整化意義

NEXORA 至此業務閉環：
- 採購 → 庫存 → 銷貨 → 自動補貨 → 財務 → 物流 → 報表 → **人資 → 發薪**

→ 採購 + 銷貨 + 發薪三大現金流全接入 NX05 Paylog、完整化第一階段。

### 6.3 helper 範式

對齊 NX05 既有 7 helper 範式：
- 新建 `nx05-create-paylog-from-salary.ts`
- payType=CP（付款）
- accountCodeId 對應「薪資」科目
- 對齊 NX02 createApFromPo / NX04 createArFromSo / NX05 createAllowance 範式

---

## §7 UI 範圍（Crown Q4=a 純 stub）

對齊 NX02~NX08 範式：

### 7.1 範圍 A
- placeholder UI（HR_ADMIN dashboard + 員工 self-view + 主管 cross-view 入口）
- API hint（指向既有 37 endpoint）
- menu.nx07.ts 建立
- side-menu wire

### 7.2 範圍不涵蓋（後續軌 TASK-NX07-IMPL-UI-01）
- 真實表單（員工主檔 / 出勤 / 薪資 form）
- 個人 + 主管 dashboard 真實 chart
- 自助式請假申請 UI

### 7.3 placeholder 候選

預估 6~10 placeholder：
- /dashboard/nx07/workspace（既有 升級 desc）
- /dashboard/nx07/employee（員工主檔）
- /dashboard/nx07/attendance（出勤）
- /dashboard/nx07/leave（請假）
- /dashboard/nx07/salary（薪資）
- /dashboard/nx07/kpi（KPI 業績考核）
- /dashboard/nx07/medical（醫療管理 ⭐）
- /dashboard/nx07/department（部門組織）

---

## §8 跨模組接點

### 8.1 上游接點

| 上游 | 提供 | NX07 用途 |
|---|---|---|
| NX01 User | 員工帳號 | 員工主檔（11 reverse FK 已在）|
| NX01 Role | 角色（8 種含 HR_ADMIN）| 員工角色定義 |
| NX04 SalesPerformance | 業績資料 | **業績獎金加給 ⭐⭐⭐** |
| NX06 DnHandover | 動態交接統計 | **動態交接獎金（後續軌候選）**|

### 8.2 下游接點

| 下游 | NX07 提供 | wire 範式 |
|---|---|---|
| **NX05 Paylog** | 薪資資料 | **新 helper createPaylogFromSalary** ⭐⭐⭐ |
| NX08 報表 | 人力成本 / 業績獎金 | 後續軌（report aggregation）|

### 8.3 NX07 內部 16 model 接點

對齊 audit 揭露 16 model + 11 NX01 User reverse FK：
- 員工 ↔ 部門 ↔ 角色
- 員工 ↔ 出勤 ↔ 請假 ↔ 班表（後續軌）
- 員工 ↔ 薪資 ↔ KPI ↔ 業績獎金
- 員工 ↔ 醫療紀錄 ↔ 職災追蹤 ⭐

---

## §9 範圍 closure 定義

### 9.1 範圍 A 涵蓋

| # | 功能 | 範圍 A |
|---|---|---|
| 1 | 既有 37 endpoint verify | ✅ |
| 2 | 醫療管理 + 職災追蹤 schema/service 補強 | ✅ |
| 3 | NX04 業績 → NX07 薪資加給 wire（業界改革 ⭐⭐⭐）| ✅ |
| 4 | NX07 薪資 → NX05 Paylog wire（業務閉環完整化 ⭐⭐⭐）| ✅ |
| 5 | UI 6~10 placeholder + menu.nx07.ts + side-menu wire | ✅ |
| 6 | 治理檔補完（spec/audit/plan/summary/merge-verify）| ✅ |

### 9.2 範圍 closure 標準

- 既有 backend 0 改、純加強（醫療管理）
- 2 業界改革 wire 落地（NX04→NX07 + NX07→NX05）
- UI placeholder stub 完整
- menu.nx07.ts + side-menu wire
- 治理檔對齊 NX02~NX08 範式

### 9.3 範圍 A 不涵蓋（後續軌）

- 班表系統（schedule 三表 wire）
- 員工主檔擴充（學歷 / 證照 / 緊急聯絡人）
- IpWhitelist + GPS attendance.checkin
- 7 schema-only model endpoint 補齊
- 真實 UI 表單（TASK-NX07-IMPL-UI-01）
- NX06 DnHandover → 動態交接獎金（後續軌候選）

---

## §10 後續軌 backlog

### 10.1 NX07 範圍 B 戰略軌

- 班表系統完整化
- 自助請假 / 加班申請 UI
- 員工自助 portal
- NX06 動態交接獎金 wire
- 教育訓練 / 證照管理
- 員工生命週期管理（入職 / 異動 / 離職）

### 10.2 NX07 既有殘留處理

- features/nx07/ 0 子模組（建立）
- menu.nx07.ts 0 檔（建立）
- side-menu wire（補）

### 10.3 範圍 A 完成後預備

- TASK-NX07-IMPL-UI-01（UI 真實表單獨立軌）
- TASK-NX07-IMPL-02-SCHEDULE（班表系統獨立軌）
- TASK-NX07-IMPL-02-TEST（測試獨立軌、補 0 spec）

---

## §11 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、整合 Crown 5 戰略題拍板 + NX07-AUDIT-01 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank IMPL-01 階段對齊本文件、技術細節 Hank 自決
> Q-RHYTHM-2 全軌連跑套用、預估 8~12 commit
