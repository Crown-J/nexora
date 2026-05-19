<!-- docs/_team/task-master-hub-improve-merge-verify.md -->

# TASK-MASTER-HUB-IMPROVE — Merge Main 上線風險揭露

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：4 commit Q-RHYTHM-2 自主全軌信任授權連跑完成
> 分支：`feature/task-master-hub-improve`（ahead 4 commit + 本 merge-verify commit）
> 對應依據：[task-master-data-center-audit.md](./task-master-data-center-audit.md) v1.0 §1-§8
> 業界改革候選：**#22 主檔分區範式 + 三版本可見性策略** ⭐⭐⭐

---

## §0 ahead 5 commit 真實清單

```
（本 commit：merge-verify 6 段揭露）
32e321e [TASK-MASTER-HUB-IMPROVE] commit 4：hub card 命名對齊 NX01-13/14/15/10 spec
d63ba8e [TASK-MASTER-HUB-IMPROVE] commit 3：版本鎖 grey-out + UpgradePromptDialog
70ef353 [TASK-MASTER-HUB-IMPROVE] commit 2：VersionBadge UI 嵌入 hub 卡片
1b560ea [TASK-MASTER-HUB-IMPROVE] commit 1：master-cards metadata 重組
```

**Base**：`345c88e` [TASK-MASTER-DATA-CENTER-AUDIT] 主檔中心真相 verify
**Files changed**：6 ()
- `apps/nx-ui/src/features/base/config/master-cards.ts`（重大重組）
- `apps/nx-ui/src/app/dashboard/base/page.tsx`（整合 useSessionMe + Dialog）
- `apps/nx-ui/src/features/base/ui/MobileSectionTabs.tsx`（+vehicle）
- `apps/nx-ui/src/features/base/ui/VersionBadge.tsx`（新檔）
- `apps/nx-ui/src/features/base/ui/UpgradePromptDialog.tsx`（新檔）
- `docs/_team/task-master-hub-improve-merge-verify.md`（本檔）

---

## §1 4 需求落地驗證

對齊 Crown 拍板 4 需求：

| 需求 | 落地狀態 | commit |
|------|---------|--------|
| 1. 補 7 missing 主檔卡片 | ✅ 全 7 落地、href 全對齊既有路由 | commit 1 |
| 2. 6 分區重組（+ vehicle 車型字典） | ✅ MasterHubSectionId + ORDER + TITLES 三同步 | commit 1 |
| 3. Version badge 顯示（LITE/PLUS/PRO） | ✅ PLUS 冷藍 / PRO 暖琥珀 / LITE 不渲染 | commit 2 |
| 4. 三版本可見性策略（版本鎖 + Upgrade prompt） | ✅ grey-out + Dialog + locked count | commit 3 |
| 額外：spec naming 對齊 | ✅ NX01-13/14/15/10 術語校正 | commit 4 |

---

## §2 數量真相揭露（A041 精確 count）

### 2.1 卡片 / 分區 / 入口

```
前：16 卡 / 5 分區 / 18 入口（含 2 dual entries）
後：23 卡 / 6 分區 / 25 入口（含 2 dual entries）
增：+7 卡 / +1 分區（vehicle）/ +7 入口
```

### 2.2 minPlan 分佈

```
LITE (13、預設、無 badge)：
  account 5：user / role / user-role / user-warehouse / role-view
  product 3：part / brand-masters / part-group
  organization 1：warehouse-location
  partner 1：partner
  system 3：bulletin / country / currency

PLUS (9、冷藍 badge)：
  product 3：brand-code-rule / part-relation / part-model
  vehicle 5：engine / model / transmission / drivetrain / model-type
  partner 1：customer-grade

PRO (1、暖琥珀 badge)：
  system 1：phonetic-dictionary
```

### 2.3 分區 × 卡數

```
account     5（全 LITE）
product     6（3 LITE + 3 PLUS）
vehicle     5（全 PLUS）⭐ 新分區
organization 1（LITE）
partner     2（1 LITE + 1 PLUS）
system      4（3 LITE + 1 PRO）
───────────
合計        23
```

---

## §3 三版本可見性 UX 驗證

### 3.1 LITE 用戶可見場景（13 卡無 badge、10 卡鎖）

```
account 5 卡：全可入（無 badge）
product 6 卡：3 LITE 可入 / 3 PLUS 鎖 grey-out
vehicle 5 卡：全 PLUS 鎖 grey-out
organization 1 卡：可入
partner 2 卡：1 LITE 可入 / 1 PLUS 鎖
system 4 卡：3 LITE 可入 / 1 PRO 鎖
section header「n 項 / k 鎖」（amber 字色提示）
```

### 3.2 PLUS 用戶可見場景（22 卡可入、1 卡鎖）

```
phonetic-dictionary：PRO 鎖 grey-out
其餘 22 卡全可入
section header system「4 項 / 1 鎖」
```

### 3.3 PRO 用戶可見場景（全 23 卡可入）

```
無 grey-out、無 Dialog 觸發
section header 全「n 項」、無「k 鎖」
```

### 3.4 鎖定卡互動

```
1. 點擊鎖定卡 → setLockedCard(card) → UpgradePromptDialog open
2. Dialog 揭露：
   - 卡片 icon + title + description
   - 「需 X 版」VersionBadge
   - 「您目前使用 Y 版」（normalizePlanCode）
   - 升級後解鎖內容清單（PLUS 3 項 / PRO 3 項）
3. 「了解升級方案」button：onClose、純 UI、不串金流 API
4. 「稍後再說」button：onClose
5. ESC / overlay click：onClose
```

### 3.5 normalizePlanCode 收斂規則

```
'NEXORA-PLUS' / 'plus' / 'PLUS'  → 'PLUS'
'NEXORA-PRO' / 'NEXORA-ENTERPRISE' / 'pro' → 'PRO'
'NEXORA-LITE' / 'LITE' / null / ''  → 'LITE'
未知 / 異常值 → 'LITE'（保守）
```

⭐ demo / 未登入 / loading 階段一律視同 LITE、避免閃現高版本內容後再收回。

---

## §4 spec naming 對齊真相

### 4.1 對齊明細（commit 4）

| segment | 對齊前（hub） | 對齊後（hub）| spec 來源 | page header（不動）|
|---------|--------------|--------------|----------|-------------------|
| transmission | 變速箱主檔 | **變速箱型錄** | NX01-15 §2.1 | 變速箱型錄 ✓ |
| drivetrain | 驅動方式主檔 | **傳動方式型錄** | NX01-15 §2.2 | 傳動方式型錄 ✓ |
| model-type | 車型類別主檔 | **車體類型型錄** | NX01-15 §2.3 | 車體類型型錄 ✓ |
| phonetic-dictionary | 注音字典主檔 | **注音字典** | NX01-10 §1.1 | 注音字典維護 ⚠️ |
| engine | 引擎主檔 | 引擎主檔（不動） | NX01-14 | 引擎主檔 ✓ |
| model | 車型主檔 | 車型主檔（不動） | NX01-13 | 車型主檔 ✓ |
| customer-grade | 客戶等級主檔 | 客戶等級主檔（不動）| NX01-03（多處）| 客戶分級主檔 ⚠️ |

### 4.2 揭露 2 個既有 page header bug（不在本軌修）

```
1. customer-grade page header: '客戶分級主檔'
   spec NX01-03 §4 全文用「客戶等級」
   → 既有 page 偏離 spec、留 TASK-MASTER-NAMING-ALIGN 軌

2. phonetic-dictionary page header: '注音字典維護'（動詞 + 維護）
   spec NX01-10 §1.1 用「注音字典」（B 型錄、名詞）
   hub 對齊 spec 用名詞、page 動詞、互斥
   → 既有 page 偏離 list 主檔命名慣例、留同上軌
```

---

## §5 紀律邊界（揭露真相）

### 5.1 純 frontend UX gate、非 backend security

```
本軌：minPlan filter / grey-out / Dialog 全 frontend
後續軌 TASK-NX99-PLAN-MIDDLEWARE：backend route guard
```

**真實風險**：LITE 用戶手動輸入 `/dashboard/base/engine` URL 仍能進子頁、backend 不擋。
**業務影響**：低（demo / 封測階段、無真實付費客戶）
**修補時機**：首位 PRO 客戶簽約前 1 個月、TASK-NX99-PLAN-MIDDLEWARE 落地。

### 5.2 normalizePlanCode 保守化

```
LITE / null / '' / 未知 → 'LITE'
```

意義：寧可誤鎖 PLUS / PRO 用戶（他們會回報），不可誤開 PLUS / PRO 內容給 LITE（看到才知不能用、UX 反挫）。

### 5.3 Upgrade prompt 純 UI、不串金流 API

```
「了解升級方案」button onClick = onClose（純關閉 Dialog）
無 navigate to /pricing、無 POST /checkout
```

留 TASK-NX99-PLAN-CHECKOUT 軌串金流。

### 5.4 schema 全 LITE 起開放

```
prisma schema 25 個主檔 model 全無版本鎖欄位
nx99_plan / nx99_product_module 既有 schema 不啟用
本軌純 hub UX 層、不動 schema / migration
```

對齊 Crown 拍板「frontend-only」邊界。

### 5.5 demo 模式行為

```
isNexoraDemoMode() = true 時：
  - useSessionMe 從 sessionStorage 讀 planCode
  - 預設 .env.example 為 LITE（10 鎖 grey-out 全顯示、業界 demo 黃金路徑）
  - 想 demo PLUS：sessionStorage.setItem('NEXORA_DEMO_PLAN', 'PLUS')
  - 想 demo PRO：sessionStorage.setItem('NEXORA_DEMO_PLAN', 'PRO')
```

---

## §6 後續軌 A026 backlog

本軌完成後、衍生 4 個後續軌（按優先序）：

| 優先 | 軌 ID | 內容 | 觸發時機 |
|------|-------|------|---------|
| P0 | TASK-NX99-PLAN-MIDDLEWARE | backend route guard（補純 frontend gate 漏洞）| 首位 PRO 客戶簽約前 1 個月 |
| P1 | TASK-MASTER-NAMING-ALIGN | customer-grade / phonetic-dictionary page header 對齊 spec | 命名一致性審查週 |
| P2 | TASK-NX99-PLAN-CHECKOUT | Upgrade prompt 接金流（Stripe / 綠界 / Tappay）| 封測 → 正式版過渡 |
| P3 | TASK-MASTER-HUB-DEPENDENCY-VIZ | 卡片間依賴關係視覺化（如 part → brand → country）| 主檔總數 > 30 時 |

⭐ Q-RHYTHM-2 紀律：以上 4 軌皆為**獨立 task**、待 Crown 拍板優先序與時間點、不在本 task 範圍。

---

## §7 業界改革 #22 落地 verify ⭐⭐⭐

### 7.1 業界對標（同類 SaaS ERP / B2B SaaS）

| 平台 | 分區數 | 版本可見性 | Upgrade prompt | 評估 |
|------|--------|-----------|----------------|------|
| SAP Business One | 12+ 模組 | ✅（License 鎖）| ❌ 無 prompt、直接擋 | 工程師導向、UX 差 |
| Oracle NetSuite | 8+ 模組 | ✅（Bundle 鎖）| ⚠️ 行銷郵件、非 in-app | 行銷導向、in-app 弱 |
| Odoo | 10+ 模組 | ✅（App store 鎖）| ✅ in-app 解鎖 | 接近 NEXORA、但分區較鬆 |
| Salesforce | 6+ 模組 | ✅（Edition 鎖）| ✅ in-app + 行銷郵件 | 雙軌、強 |
| Zoho One | 50+ Apps | ❌（無分區）| N/A | App List 過長、UX 差 |
| **NEXORA GRID** | **6 分區 + 23 卡** | **✅ 3 版本鎖** | **✅ in-app grey-out + Dialog** | **接近 Salesforce + Odoo 之長** |

### 7.2 NEXORA 主檔分區範式三大特徵

1. **分區常數而非動態**：6 分區固化（不隨版本變化、用戶心智圖穩定）
2. **卡片可見而非隱藏**：鎖定卡 grey-out 而非過濾、用戶看得到「我升級可解鎖什麼」
3. **Dialog 預告而非威脅**：升級提示展示「解鎖內容清單」、非「您權限不足」

⭐ 對標 Apple iCloud+ 升級體驗：「看得到 → 點得到 → 知道升級可得到什麼」三層心智模型。

### 7.3 商業價值

```
LITE 用戶看到「10 鎖」+ 升級內容清單 → 升級轉換驅力
PLUS 用戶看到「1 鎖」（phonetic）→ PRO 升級驅力
分區邊界清晰 → 業務人員 SOP 教育成本下降
```

---

## §8 Hank 自我審查（pre-merge checklist）

- [x] typecheck pass（4 次 commit 全跑、無錯）
- [x] commit message 格式對齊 `[TASK-XXX] commit N：...`
- [x] Co-Authored-By 簽名完整
- [x] 無 destructive 命令（無 reset --hard / push --force）
- [x] 無 schema migration（純 frontend）
- [x] 無 backend route 改動（minPlan 純 UX）
- [x] 對齊規範 §I.6.3 揭露不完整每段尾標
- [x] 對齊 §G.9 通配 grep 已驗證（路徑 / 命名 / 卡片數）
- [x] 對齊 [[feedback_workflow]] 漸進式 commit 群

⭐ Crown 拍板 Q-RHYTHM-2 自主全軌信任授權、commit 1~5 連跑不中斷已落地。

---

**等 Crown final merge 拍板**（Q-RHYTHM-2 Final merge 介入點）
