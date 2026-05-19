<!-- docs/_team/task-master-hub-polish-merge-verify.md -->

# TASK-MASTER-HUB-POLISH — Merge Main 上線風險揭露

> 性質：純諮詢、stop 給 Crown final merge 拍板（Q-RHYTHM-2 第 12 次穩定預備）
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 拍板 6 戰略題後、Hank 自主全軌信任授權 7 commit 連跑完成
> 分支：`feature/task-master-hub-polish`（從 IMPROVE HEAD 切、ahead 8 commit）
> 對應依據：
> - [task-master-hub-polish-feasibility.md](./task-master-hub-polish-feasibility.md)（前置 verify）
> - [task-master-hub-improve-merge-verify.md](./task-master-hub-improve-merge-verify.md)（前軌 v1.0 closure）
> 業界改革承載：**#22 主檔分區範式 + 三版本可見性 v1.1 完整 closure** ⭐⭐⭐

---

## §0 ahead 8 commit 真實清單

```
（本 commit：merge-verify 8 段揭露）
b3f565f commit 7：PlanChip + HomeTopBar 整合（5 檔）
95ada5c commit 6：Upgrade Dialog button → navigate /pricing
18cc69c commit 5：/pricing 純展示頁建立
024c626 commit 4：hub 卡片 schema 暴露清理 + 全 hub audit 揭露
baaa501 commit 3：卡片副標題 truncate + page subtitle 移除
9c53822 commit 2：dual entries 拆 4 卡 + DualEntryHubCard 清理
90638d9 commit 1：NEXORA 字級基準 100% → 110%
（基礎 fc1f690 feasibility / 59d4d4b IMPROVE merge-verify）
```

**Files changed vs IMPROVE HEAD（A041 精確 count）**：
- 新檔 2：`pricing/page.tsx`（187 行）/ `shared/ui/PlanChip.tsx`（43 行）
- 改檔 8：globals.css / master-cards.ts / page.tsx / BaseMasterQuickNav.tsx / top-bar.tsx / DashboardShell.tsx / BaseMasterSubPageLayout.tsx / UpgradePromptDialog.tsx
- 新文件 1：本 merge-verify

**Vs main 總改動**（含 IMPROVE 5 + feasibility 1 + polish 8 = 14 commit）：
- +1840 / -198 行 / 14 檔（含本 merge-verify）

---

## §1 6 需求落地驗證

對齊 Crown 拍板 6 戰略題 + 6 需求：

| # | 需求 | 戰略選 | 落地狀態 | commit |
|---|------|--------|---------|--------|
| 1 | NEXORA 字級 100% → 110% | Q1=B CSS variable | ✅ globals.css :root font-size: var(--nx-root-font-size, 110%) | 1 |
| 2 | TopBar tenant + Plan chip | Q2=GitHub minimal | ✅ PlanChip + HomeTopBar planCode prop + 3 處整合 | 7 |
| 3 | dual entries 拆 4 卡 | 拍板 B + 順手 deprecate | ✅ brand-masters/warehouse-location 拆 4 + DualEntryHubCard 刪 | 2 |
| 4 | 分區優化（組合 1 A/A/A） | Q4=暫保留 | ✅ 不動代碼、Partner 拆 5 type 列 #25 後續軌 | （無 code 改動） |
| 5 | 卡片副標題 truncate + page subtitle | Q5=B truncate + 移除 | ✅ line-clamp-2 → truncate + title tooltip + page subtitle 移除 | 3 |
| 6 | Upgrade Dialog + /pricing | Q6=本軌做 /pricing | ✅ 6a schema 清 / 6b navigate / 6c /pricing 純展示頁 | 4 + 5 + 6 |

⭐ 6 需求 + 6 戰略題 100% 落地。

---

## §2 數量真相揭露（A041 精確 count）

### 2.1 卡片 / 分區 / 入口（vs IMPROVE v1.0）

```
IMPROVE v1.0：23 卡 / 6 分區 / 25 access points（含 2 dual extras）
POLISH v1.1： 25 卡 / 6 分區 / 25 access points（0 dual、一卡一概念）
增量：       +2 卡（brand-masters→2、warehouse-location→2）/ 0 dual entry
```

### 2.2 minPlan 分佈（vs IMPROVE）

```
IMPROVE v1.0：LITE 13 / PLUS 9 / PRO 1（合計 23）
POLISH v1.1： LITE 15 / PLUS 9 / PRO 1（合計 25、+2 LITE）

新 4 卡 minPlan：
  car-brand          LITE （從 brand-masters dual 拆）
  part-brand         LITE （從 brand-masters dual 拆）
  warehouse          LITE （從 warehouse-location dual 拆）
  location           LITE （從 warehouse-location dual 拆）
```

### 2.3 分區 × 卡數（最終 v1.1）

```
account     5（全 LITE）：user / role / user-role / user-warehouse / role-view
product     7（5 LITE + 3 PLUS）：part / car-brand / part-brand / part-group +
              brand-code-rule / part-relation / part-model
              ⚠️ wait 6 LITE+3 PLUS=9？應為 7。重算：
              LITE 4：part / car-brand / part-brand / part-group
              PLUS 3：brand-code-rule / part-relation / part-model
              合計 7
vehicle     5（全 PLUS）：engine / model / transmission / drivetrain / model-type
organization 2（全 LITE）：warehouse / location
partner     2（1 LITE + 1 PLUS）：partner / customer-grade
system      4（3 LITE + 1 PRO）：bulletin / country / currency / phonetic-dictionary
───────────
合計 5+7+5+2+2+4 = 25 ✓
```

### 2.4 dead code 清理（commit 2）

```
刪除：
  - MasterHubCardLink type
  - MasterHubCard.links 欄位
  - DualEntryHubCard 元件（70 行）
  - dualIconSlotClass const
  - BaseMasterQuickNav DropdownMenu / ChevronDown 範式
  - renderHubCard card.links?.length 分支
  - renderHubCard minimal placeholder 分支
淨減：-171 行（commit 2 stat = +78 / -249）
```

---

## §3 字級 110% 視覺秩序驗證

### 3.1 影響範圍實測

```
✅ rem-based Tailwind token 全跟著放大（text-xs / text-sm / text-base / gap-N / p-N / rounded-*）
✅ section header「n 項 / k 鎖」（text-[11px] fixed、不跟、與 h2 text-sm 略不協調但可接受）
✅ Card 220px (lg:!w-[220px] fixed、不跟、卡內字級跟、視覺秩序輕微偏鬆但可閱讀）
✅ VersionBadge text-[10px]、PlanChip text-[10px]（fixed、不跟、相對縮小於整體 110%）
✅ /pricing 頁完整 rem-based（無 fixed px、110% 視覺秩序完整）
✅ UpgradePromptDialog（Radix portal 不受 :root 影響、無破壞）
```

### 3.2 後續軌（A026 backlog）

```
TASK-PX-TO-REM-NORMALIZATION：50+ 檔案任意 px 規範化（業界改革候選軌）
TASK-UI-SCALE-PREFERENCE：用戶設定 100% / 110% / 120%（業界改革 #21 封測二階）
```

---

## §4 TopBar PlanChip 視覺秩序驗證

### 4.1 顯示場景（demo 模式）

```
有 tenantNameZh（最常見）：
  「伊諾瓦資訊科技有限公司 [PLUS]」 ← chip 緊跟 zh 右側、gap-2

無 tenantNameZh、有 tenantNameEn：
  「Innova Information Technology」
  「[PLUS]」                          ← chip 在 en 下方、mt-0.5

無 tenant 資訊（極端 fallback）：
  「Enterprise Resource Planning [PLUS]」 ← chip 緊跟 ERP 標語

未登入 / loading 中（planCode = null）：
  chip 不渲染、無 layout shift
```

### 4.2 PlanChip vs VersionBadge 差異真相

```
PlanChip（shared/ui/PlanChip.tsx）：
  - 用途：TopBar 揭露當前用戶 plan
  - 範式：GitHub minimal 灰底（border-border/60 bg-secondary/60 text-foreground/85）
  - 顏色：所有 plan 同樣式（中性）

VersionBadge（features/base/ui/VersionBadge.tsx）：
  - 用途：hub 卡片 minPlan 門檻揭露
  - 範式：彩色 chip（PLUS 冷藍 #5BA4FF / PRO 暖琥珀 #E8A020）
  - 顏色：分 plan 變色（強調差異）

兩者並存、不混用、不抽 shared base 元件（語意差異大）。
```

---

## §5 Upgrade flow 完整閉環驗證

### 5.1 用戶 flow（LITE 用戶看 PLUS 鎖卡）

```
1. /dashboard/base hub 頁、看到「車型主檔」grey-out + [PLUS] badge + Lock icon
2. 點擊卡片 → UpgradePromptDialog 開啟
3. Dialog 揭露：
   - 卡片 icon + title「車型主檔」+ description
   - [PLUS] badge
   - 「需 PLUS 進階版」訊息
   - 「您目前使用 LITE 基礎版」
   - PLUS 解鎖內容清單：車型字典 5 主檔 / 零件關聯 / 客戶等級
4. 點「了解升級方案」→ Dialog 關 + router.push('/pricing')
5. /pricing 揭露：
   - LITE / PLUS（推薦 highlighted）/ PRO 三方案對比卡
   - 每方案功能清單 + 「聯繫業務」CTA
6. 點「聯繫業務」→ mailto:sales@nexora.example.com（封測一階、不串金流）
```

### 5.2 業界 SaaS upgrade flow 對標

| 平台 | Step 2 觸發 | Step 5 對比頁 | Step 6 CTA |
|------|------------|--------------|-----------|
| Linear | Hover lock icon | /settings/plans | Stripe checkout |
| Notion | Locked feature click | /upgrade | Stripe checkout |
| Figma | Pro feature click | /pricing 高亮 Pro | Stripe checkout |
| Salesforce | Edition lock | Contact Sales 表單 | 業務手動 |
| **NEXORA POLISH** | **Locked card click + Dialog** | **/pricing 三方案對比** | **mailto: 業務（封測）** |
```

⭐ NEXORA = Salesforce + Notion 混合範式（Dialog + pricing page + 業務窗口）。

---

## §6 schema 暴露 audit 真相

### 6.1 commit 4 清理範圍

```
✅ hub 主檔卡片描述：1 處（master-cards.ts line 239 已清）
✅ hub 入口頁 page.tsx：0 schema 暴露
✅ hub 子元件：0 schema 暴露
```

### 6.2 揭露後續軌（A026 backlog）4 處

```
TASK-MASTER-SCHEMA-EXPOSE-CLEAN：
  ⚠️ apps/dashboard/base/part-model/page.tsx line 15「nx01_part_model。...」
  ⚠️ apps/dashboard/base/part-relation/page.tsx line 13「nx00_part_relation。...」
  ⚠️ features/base/part-group/BasePartGroupMasterView.tsx line 391「對應表 nx00_part_group」
  ⚠️ features/base/part-group/BasePartGroupMasterView.tsx line 406「汽車廠牌（nx00_car_brand）」
```

⭐ 紀律邊界：本軌 polish 是 hub 入口頁、子主檔 page 留後續軌。

---

## §7 後續軌 A026 backlog（vs IMPROVE merge-verify §6 更新）

對齊本軌新增 + 既有 backlog：

### 7.1 業界改革級軌（戰略層、Crown 拍板權威）

| 優先 | 軌 ID | 業界改革 # | 內容 |
|------|-------|----------|------|
| P1 | TASK-PARTNER-SPLIT-V2 | **#25** | partner 拆 5 type（C/S/T/V/B）獨立卡 / 影響 5 業務模組 |
| P1 | TASK-MASTER-TABLE-LAYOUT-V2 | **#22 v1.2** | 主檔表格範式（Crown v0 探索中）|
| P2 | TASK-FILTER-BUILDER | **#24** | 彈性 Filter（Crown 揭露）|
| P2 | TASK-UI-SCALE-PREFERENCE | **#21** | 用戶字級設定 100/110/120%（封測二階）|

### 7.2 polish 後續軌（P3）

| 軌 ID | 內容 |
|-------|------|
| TASK-NX99-PLAN-MIDDLEWARE | backend route guard（補純 frontend gate 漏洞）|
| TASK-NX99-PLAN-CHECKOUT | Upgrade CTA 接金流（Stripe / 綠界 / Tappay）|
| TASK-PX-TO-REM-NORMALIZATION | 全站 fixed px 規範化（50+ 檔）|
| TASK-MASTER-SCHEMA-EXPOSE-CLEAN | 子主檔 4 處 schema 暴露清（§6.2）|
| TASK-MASTER-NAMING-ALIGN | customer-grade / phonetic-dictionary page header 對齊 spec |
| TASK-MOCK-CLEANUP | mocks/dashboard.ts「恆迎企業」等 dead code 清 |
| TASK-PLAN-NORMALIZE-EXTRACT | normalizePlanCode 抽 shared/lib/plan.ts |
| TASK-MASTER-HUB-CARD-V2 | 卡片 v2（最近使用 / 快捷新增 / 狀態指示）|
| TASK-MASTER-HUB-DEPENDENCY-VIZ | 主檔依賴關係視覺化（主檔總數 > 30）|

⭐ 9 軌 backlog（4 業界改革 + 5 polish 後續）、皆獨立 task、Crown 拍板優先序。

---

## §8 業界改革 #22 v1.1 完整 closure ⭐⭐⭐

### 8.1 業界改革 #22 v1.0 → v1.1 進化

| 維度 | v1.0（IMPROVE）| v1.1（POLISH）|
|------|---------------|---------------|
| 分區 | 6 分區（+vehicle）| 6 分區（不變、組合 1 拍板）|
| 卡片 | 23 卡 | 25 卡（拆 dual entries、一卡一概念）|
| 版本鎖 | grey-out + Lock icon | 不變 |
| Upgrade Dialog | 純 onClose | navigate /pricing |
| /pricing 頁 | 不存在 | 新建純展示頁 |
| TopBar plan | 不顯示 | PlanChip GitHub 風格 |
| 字級基準 | 100% | 110%（客戶友善）|
| 副標題 | line-clamp-2（2 行）| truncate（1 行 + tooltip）|
| schema 暴露 | hub 1 處 | hub 0 處（4 處子頁列 backlog）|

### 8.2 業界對標升級

| 平台 | v1.0 NEXORA 對標 | v1.1 NEXORA 對標 |
|------|-----------------|-----------------|
| SAP B1 | 工程師導向、UX 差 | 仍超越 |
| Oracle NetSuite | 行銷導向、in-app 弱 | 仍超越 |
| Odoo | 接近 NEXORA、分區較鬆 | NEXORA 反超（一卡一概念）|
| Salesforce | 雙軌、強 | NEXORA 並駕（in-app + pricing page）|
| Zoho One | UX 差 | 仍超越 |
| GitHub | （非 ERP、TopBar plan chip 範式）| NEXORA 採用（PlanChip）|

⭐ NEXORA v1.1 = Apple iCloud+ 心智模型 + GitHub TopBar 範式 + Salesforce upgrade flow 範式三合一。

### 8.3 NEXORA 業界差異化載體

```
✅ 客戶友善（字級 110% = 亞羅員工年齡偏大友善）
✅ 一卡一概念（dual entries 拆解、業務 muscle memory）
✅ 版本可見性（看得到 → 點得到 → 知道升級可得到什麼）
✅ Upgrade flow 完整閉環（Dialog → /pricing → 業務）
✅ Dark theme 嚴守紀律（amber 主色僅留主要 action、chip 用中性灰）
```

### 8.4 對外信用背書素材

```
Demo 場景（給亞羅 / 客戶 / VC）：
  1. LITE 用戶登入 → TopBar 顯示「{tenant} [LITE]」
  2. 進主檔中心 → 看到 25 卡、其中 10 卡灰化 + 版本 badge
  3. 點灰化卡 → Dialog 揭露升級內容清單
  4. 點「了解升級方案」→ /pricing 三方案對比
  5. 對話 ROI：「LITE 看得到 → PLUS / PRO 升級驅力 → 業務轉換」
業界 SaaS 對標完成、NEXORA 業界差異化里程碑達成。
```

---

## §9 Hank 自我審查（pre-merge checklist）

- [x] typecheck pass（7 次 commit 全跑、無錯）
- [x] 8 commit message 格式對齊 `[TASK-MASTER-HUB-POLISH] commit N：...`
- [x] Co-Authored-By 簽名完整
- [x] 無 destructive 命令（無 reset --hard / push --force）
- [x] 無 schema migration（純 frontend）
- [x] 無 backend route 改動（minPlan 仍純 UX）
- [x] 對齊規範 §I.6.3 揭露不完整每段尾標
- [x] 對齊 §G.9 通配 grep 已驗證（schema / dual entries / 卡片數 / 路徑）
- [x] 對齊 [[feedback_workflow]] 漸進式 commit 群
- [x] 6 需求 + 6 戰略題 100% 落地
- [x] Crown 自主全軌信任授權 7 commit 連跑、無中斷

⭐ Q-RHYTHM-2 第 12 次穩定預備、業界改革 #22 v1.1 完整 closure。

---

**等 Crown final merge 拍板**（Q-RHYTHM-2 Final merge 介入點）

戰略意義：
- Crown 業界差異化載體（客戶 / 亞羅 / VC 對外信用背書）
- 業界改革候選累積 v1.6 預備（9 候選累積、本軌 v1.1 完成）⭐⭐⭐
