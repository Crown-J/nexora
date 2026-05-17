<!-- docs/nx10/spec/intent/nx10-overview.md -->

# NX10 八角遊戲化 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 跨 2 輪需求討論共 4 題拍板 closure（基於八角框架）
> 依賴揭露：NX10-AUDIT-01 完成（schema 真相 verify ✓、20 medal levels）
> 戰略定位：**業務模組最後 1 軌（11/11 達成）+ 八角框架完整落地 + 員工企業認同度提升**
> 紀律：拆 2 軌（IMPL-01 八角基礎 / IMPL-02 社交+使命+跨模組）、Q-RHYTHM-2 第七+八次落地

---

## §0 文件性質

Crown 揭露 NX10 設計哲學：**Yu-kai Chou 八角框架（Octalysis Framework）**、9 schema-only model 對應 8 角驅動力、不是隨機功能、是完整 gamification 系統。

兩軌實作（Crown Q2=b 拍板）：
- **TASK-NX10-IMPL-01**：八角基礎（任務/醫章/排行/點數/驚喜寶箱/衝刺）
- **TASK-NX10-IMPL-02**：社交+使命+跨模組 wire（團隊任務/帶新人/轉職）

每軌獨立套 Q-RHYTHM-2 全軌連跑、各自 final merge。

Hank impl 對齊原則：
- 本文件業務需求 = 真相
- 詳細範式 Hank 自決
- 兩軌獨立 plan + impl + merge

---

## §1 NX10 業務本質

### 1.1 NX10 是什麼

**NX10 八角遊戲化 = 亞羅員工的「動力引擎」、八角框架完整落地**。

業務本質回答 1 個核心問題：

> **如何讓亞羅員工對企業認同度更高？**

→ Crown 揭露答案：**Yu-kai Chou 八角框架**（業界經典 gamification 設計）。

### 1.2 八角框架對應 NEXORA 落地

| # | 八角驅動力 | NEXORA schema 落地 |
|---|---|---|
| 1 | **史詩意義與使命感** | 公司大目標連動（業績達成率、轉職機制）|
| 2 | **發展與成就** | 醫章系統（20 levels、5 tier × 4 rank）+ 排行榜 |
| 3 | **賦權與創造力** | 轉職機制（3 階審核、自主選擇）|
| 4 | **所有權與佔有** | 點數累積 + 醫章收集 |
| 5 | **社交影響與關聯** | 團隊任務 + 帶新人系統 |
| 6 | **稀缺與渴望** | 衝刺（限時挑戰）+ 稀有醫章 |
| 7 | **不可預期與好奇** | **驚喜寶箱** + 神祕獎勵 |
| 8 | **損失與避免** | 排名下降風險 + 任務過期 |

### 1.3 NX10 在 NEXORA 全棧的角色

```
業務模組產生資料：
NX04 業績 → 排行榜（驅動力 #2 #4）
NX06 動態交接 → 動態交接獎勵（驅動力 #5 ⭐⭐⭐）
NX07 薪資 → 加碼獎金（驅動力 #4 #1）
NX09 KM 學習 → 學習任務（後續軌）
        ↓
NX10 八角遊戲化引擎：
   任務 + 醫章 + 排行 + 點數 + 驚喜寶箱 + 衝刺
   + 團隊任務 + 帶新人 + 轉職
        ↓
員工企業認同度提升（Crown 揭露目的）
```

### 1.4 NEXORA 戰略意義

⭐⭐⭐ NX10 落地 4 個業界改革候選：

1. **NX06 動態交接 → NX10 獎勵 wire**（業界第一個動態交接遊戲化）⭐⭐⭐
2. **轉職機制 3 階審核**（系統驗證 + 主管推薦 + 負責人、業界遊戲化罕見）
3. **帶新人 Exp 獎勵**（業界遊戲化罕見）
4. **八角框架完整落地**（中小汽配 ERP 業界第一個完整 gamification）

---

## §2 主使用者與權限

### 2.1 主使用者 = 全公司員工 + HR_ADMIN 管理

| 角色 | NX10 使用場景 |
|---|---|
| **全公司員工** | 看自己醫章 / 點數 / 排行 / 任務 / 驚喜寶箱 |
| **HR_ADMIN** | 管理任務模板 / 醫章模板 / 衝刺設定 / 轉職審核 |
| **OWNER 主管** | 看部門排行 / 主管推薦轉職 / 帶新人指派 |
| **Crown 戰略** | 跨部門綜合 / 員工活躍度分析 |

### 2.2 權限機制 = 彈性 role_view

對齊 NX02~NX09 範式：
- 員工 self-view（自己醫章 / 點數 / 任務）
- HR_ADMIN 跨員工管理
- 主管 cross-view + 簽核（轉職 / 帶新人）

---

## §3 兩軌範圍架構

### 3.1 TASK-NX10-IMPL-01 範圍（八角基礎、預估 10~15 commit）

對應八角驅動力 #2 #4 #6 #7 #8：

| # | 功能 | 八角驅動力 | audit 狀態 | IMPL-01 |
|---|---|---|---|---|
| 1 | 醫章系統（20 levels、5 tier × 4 rank）| #2 #4 | ✅ schema + service | ✅ verify |
| 2 | 排行榜（個人 / 部門 / 公司）| #2 #8 | ✅ schema + service | ✅ verify |
| 3 | 點數 / Exp 系統 | #4 | ✅ schema + service | ✅ verify |
| 4 | 日 / 週 / 月任務（TaskTemplate seed）| #2 #8 | 🟡 schema 部分 | ✅ 補強 |
| 5 | **驚喜寶箱** ⭐（神祕獎勵）| **#7** | 🟡 schema-only | ✅ 新建 service |
| 6 | **衝刺**（限時挑戰）| **#6** | 🟡 schema-only | ✅ 新建 service |
| 7 | A029 apply-checkin-reward 撈回 | - | ❌ 老債 | ✅ 補 |
| 8 | 20 medal level seed | - | ❌ 0 seed | ✅ seed |
| 9 | UI placeholder + menu.nx10 + side-menu wire | - | ❌ 0 | ✅ 補 |
| 10 | 治理檔補完 | - | ❌ 落後 2 階段 | ✅ 補 |

### 3.2 TASK-NX10-IMPL-02 範圍（社交+使命+跨模組、預估 8~12 commit）

對應八角驅動力 #1 #3 #5：

| # | 功能 | 八角驅動力 | audit 狀態 | IMPL-02 |
|---|---|---|---|---|
| 1 | **團隊任務** ⭐（跨部門協作）| **#5** | 🟡 schema-only | ✅ 新建 service |
| 2 | **帶新人系統** ⭐（師徒配對 + Exp 獎勵）| **#5 #1** | 🟡 schema-only | ✅ 新建 service |
| 3 | **轉職機制** ⭐（3 階審核、業界改革 ⭐⭐⭐）| **#3 #2** | 🟡 schema-only | ✅ 新建 service |
| 4 | NX06 動態交接 → 獎勵 wire ⭐⭐⭐ | #5 | ❌ 0 wire | ✅ 新建 helper |
| 5 | NX04 業績 → 排行榜 wire | #2 | ❌ 0 wire | ✅ 新建 helper |
| 6 | NX07 薪資 → 加碼獎金 wire | #4 #1 | ❌ 0 wire | ✅ 新建 helper |
| 7 | UI placeholder 補完 | - | - | ✅ |
| 8 | 治理檔補完 | - | - | ✅ |

---

## §4 醫章系統（20 levels、Crown 修正 16→20）

### 4.1 5 tier × 4 rank = 20 levels

對齊 Hank audit § 1 verify schema 真實值：

| Tier | Rank | Level Range |
|---|---|---|
| BRONZE 銅 | IV → III → II → I | 1~4（最低 銅 IV）|
| SILVER 銀 | IV → III → II → I | 5~8 |
| GOLD 金 | IV → III → II → I | 9~12 |
| PLATINUM 白金 | IV → III → II → I | 13~16 |
| DIAMOND 鑽 | IV → III → II → I | 17~20（最高 鑽 I）|

sortNo 1=最低、20=最高。

### 4.2 範圍 A 範圍

IMPL-01：
- 20 medal level seed（5 tier × 4 rank 完整）
- 既有 medal service 升級 + verify
- 員工醫章展示 endpoint

---

## §5 跨模組 wire（IMPL-02、業界改革 ⭐⭐⭐）

### 5.1 NX06 動態交接 → NX10 獎勵 wire（業界第一個 ⭐⭐⭐）

對齊 NX06-IMPL-02 動態交接 closure：
- DnHandover COMPLETED 觸發
- 動態交接外務員獲得 Exp + 點數
- 對應八角驅動力 #5（社交影響）

業界對標：Uber Eats / DoorDash 高峰期動態派單獎勵、NEXORA 中小汽配 ERP 第一個。

### 5.2 NX04 業績 → NX10 排行榜 wire

對齊 NX04 SalesPerformance：
- SO SHIPPED 觸發業績累積
- 排行榜資料源
- 對應驅動力 #2（成就）#8（損失）

### 5.3 NX07 薪資 → NX10 加碼獎金 wire

對齊 NX07-IMPL-01 SalaryAccrual：
- 業績獎金加碼（醫章等級 + 衝刺達成）
- 對應驅動力 #4（佔有）#1（使命感）

---

## §6 轉職機制 3 階審核（IMPL-02、業界改革 ⭐⭐⭐）

### 6.1 業界 muscle memory

- 業務員想轉採購？倉管想轉業務？
- 業界傳統：純人事面試、無系統化
- NEXORA 範式：**3 階審核**：
  - 階段 1：系統驗證（年資 / 業績 / 醫章等級達標）
  - 階段 2：主管推薦（OWNER role）
  - 階段 3：負責人（HR_ADMIN 或 Crown）

### 6.2 對應八角驅動力

- **#3 賦權與創造力**：員工可自主決定轉職方向
- **#2 發展與成就**：升等的具體路徑
- **#1 使命感**：找到自己在公司的位置

### 6.3 業界改革點

中小企業遊戲化罕見「轉職系統」、亞羅有 = 員工有「在公司長期發展」感、提升認同度。

---

## §7 帶新人系統（IMPL-02、業界改革 ⭐⭐⭐）

### 7.1 範式

- 師徒配對（HR_ADMIN 指派 + 員工申請）
- 帶新人 Exp 獎勵（資深員工教新人）
- 新人達成里程碑、師父分享 Exp

### 7.2 對應八角驅動力

- **#5 社交影響**：師徒關係建立
- **#1 使命感**：教導他人提升自己價值

### 7.3 業界改革點

中小企業遊戲化罕見「師徒系統」、亞羅有 = 新人快速融入 + 資深員工有教導動機。

---

## §8 跨模組接點

### 8.1 IMPL-01 範圍（純獨立）

對齊 audit 揭露「0 業務模組接點」、本軌維持純獨立。

### 8.2 IMPL-02 跨模組 wire

| 跨模組 | wire 範式 | 用途 |
|---|---|---|
| NX06 DnHandover | helper `nx10-create-reward-from-handover` | 動態交接獎勵 ⭐⭐⭐ |
| NX04 SalesPerformance | helper `nx10-update-ranking-from-performance` | 業績排行 |
| NX07 SalaryAccrual | helper `nx10-apply-medal-bonus-to-salary` | 醫章加碼薪資 |

### 8.3 不在範圍（後續軌）

- NX09 KM 學習任務（看 N 篇文章解任務）
- 客戶端遊戲化（範圍 B 戰略軌）
- AI 個人化推薦任務（戰略 C 軌）

---

## §9 範圍 closure 定義

### 9.1 TASK-NX10-IMPL-01 範圍 closure（10 項）

對應八角驅動力 #2 #4 #6 #7 #8：
- 20 medal level seed + verify
- 排行榜 + 點數 service verify
- 日/週/月任務 TaskTemplate seed
- 驚喜寶箱 service + endpoint ⭐（#7）
- 衝刺 service + endpoint ⭐（#6）
- A029 apply-checkin-reward 撈回
- UI placeholder + menu.nx10 + side-menu wire
- 治理檔補完
- 既有 ProNx10LeftPanel verify
- 既有 11 endpoint 行為保留

### 9.2 TASK-NX10-IMPL-02 範圍 closure（8 項）

對應八角驅動力 #1 #3 #5：
- 團隊任務 service + endpoint ⭐（#5）
- 帶新人系統 service + endpoint ⭐（#5 #1、業界改革 ⭐⭐⭐）
- 轉職機制 3 階審核 service + endpoint ⭐（#3 #2、業界改革 ⭐⭐⭐）
- NX06 動態交接獎勵 helper（業界第一個 ⭐⭐⭐）
- NX04 業績排行 helper
- NX07 醫章加碼薪資 helper
- UI placeholder 補完
- 治理檔補完

### 9.3 範圍不涵蓋（後續軌）

- 真實 UI（醫章展示 / 排行榜 / 任務列表 → TASK-NX10-IMPL-UI-01）
- NX09 KM 學習任務 wire（後續軌候選）
- 客戶端遊戲化（範圍 B）
- AI 個人化推薦任務（戰略 C 軌）

---

## §10 範圍 B 戰略軌（NX10 上線後啟動）

- 客戶端遊戲化（客戶忠誠度 / 採購量級成就）
- AI 個人化推薦任務
- 醫章 NFT 化（戰略 C 軌、年代候選）
- 跨公司排行（亞羅 + 合作夥伴）

---

## §11 後續軌 backlog

### 11.1 NX10 既有殘留處理

- features/nx10/ 0 子模組（建立）
- menu.nx10.ts 0 檔（建立）
- side-menu wire（補）
- A029 apply-checkin-reward 老債

### 11.2 範圍 A 完成後預備

- TASK-NX10-IMPL-UI-01（UI 真實表單 / 醫章展示 / 排行榜）
- TASK-NX10-IMPL-03-KM-WIRE（NX09 學習任務 wire）
- TASK-NX10-IMPL-02-TEST（測試獨立軌）

---

## §12 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、Crown 揭露八角框架 + 拆 2 軌 + 4 戰略題拍板 + 20 medal levels 修正 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> 兩軌獨立 plan + impl + merge、各自套 Q-RHYTHM-2 全軌連跑
> Hank IMPL-01 + IMPL-02 階段對齊本文件、技術細節 Hank 自決
> 任何 schema / API 設計衝突、以本文件業務需求為真相
> 本軌 closure = NEXORA 業務模組 11/11 達成（100%）⭐⭐⭐
