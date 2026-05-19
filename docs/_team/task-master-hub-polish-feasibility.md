<!-- docs/_team/task-master-hub-polish-feasibility.md -->

# TASK-MASTER-HUB-POLISH — 預備可行性 6 段揭露（純諮詢）

> 性質：純諮詢、stop 給 Crown 拍板（Q-RHYTHM-2 verify 真相後再行動）
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 真實業務測試揭露 7 議題、業界改革 #22 戰略升級 closure 預備
> 後續：本檔由 Crown 拍板 4 議題範式後、進入 TASK-MASTER-HUB-POLISH 開工軌
> 對應依據：
> - [task-master-hub-improve-merge-verify.md](./task-master-hub-improve-merge-verify.md)（前軌 closure）
> - [task-master-data-center-audit.md](./task-master-data-center-audit.md) v1.0
> - [PROJECT_RULES.md](../PROJECT_RULES.md) §I.5 #16 / §I.6.3

---

## §1 全站預設字級調整真相

### 1.1 NEXORA Tailwind config 既有真相

```
✓ Tailwind v4（@tailwindcss/postcss、CSS-first）
✓ 無 tailwind.config.ts / tailwind.config.js（全部寫在 globals.css）
✓ postcss.config.mjs 僅一行 plugin 載入
✓ globals.css :root 無 font-size 設定 → 用瀏覽器預設 16px / 1rem
✓ @theme inline（line 281-320）只定義 --font-sans / --font-mono / --color-* / --radius-*
✓ 無 --text-base / --text-sm / --text-xs 等字級 token（用 Tailwind v4 預設）
```

### 1.2 100% → 110% 影響範圍真相

```
✓ Tailwind 字級 token（text-xs / text-sm / text-base / text-lg）= rem-based、會跟著放大
✓ Tailwind spacing token（gap-2 / p-3 / h-12）= rem-based、會跟著放大
✓ rounded-lg / rounded-xl = rem-based、會跟著放大
```

**但 hub 既有 fixed px 任意值不會跟著放大**（§G.9 通配 grep 揭露）：

```bash
grep "text-\[1.px\]" master-cards 相關 = 0
grep "text-\[1.px\]" page.tsx + VersionBadge + UpgradePromptDialog
```

實測 hub 程式碼 fixed px 數：

| 檔案 | text-[Npx] | text-[Nem] | size-N / w-Npx |
|------|-----------|-----------|----------------|
| dashboard/base/page.tsx | text-[10px]（badge）× 2、text-[11px]（卡片描述）× 3 | 0 | h-3.5/w-3.5 lock icon |
| VersionBadge.tsx | text-[10px] × 1 | 0 | 0 |
| UpgradePromptDialog.tsx | text-[10px]（badge in dialog）× 1 | 0 | 0 |
| hubCardDimensions（共用）| - | - | **lg:!w-[220px]** fixed px |

⚠️ **220px card width 是 fixed px**、不會跟 110% 放大。
⚠️ **text-[10px]/[11px]** fixed px、不會跟 110% 放大。

**結論真相**：100% → 110% 只放大 rem-based、fixed px 維持原樣 → 視覺秩序破壞（badge 字級不跟、卡片寬不跟、padding 跟但卡片不跟）。

### 1.3 響應式 × 110% 多組合（手機 / 平板 / 桌面）

```
手機 (< sm)：
  - Card 用 w-full / grid 自動分欄、放大後仍滿欄、OK
  - 但卡片內 text-[10px] / [11px] 不跟放大、視覺秩序破壞
  - lg:!w-[220px] 對手機不生效（lg: 開頭）、OK

桌面 (lg+)：
  - 卡片 fixed 220px 不跟放大 ⚠️
  - 卡片內字級 text-sm 跟放大、與卡片框架不協調
  - section title text-sm 跟放大、與 「n 項 / k 鎖」 text-[11px] 不協調

平板 (sm~lg)：
  - 同手機（無 lg: 觸發）
  - text-[10px]/[11px] 不跟放大
```

⚠️ 24 既有主檔頁面 + sys-dashboard / 工作站視覺秩序大量依賴 Tailwind rem token + 任意 px 混用、110% 改動需逐頁 verify。

### 1.4 業界 SaaS 推薦範式

| 範式 | 實作 | 優缺 | 適用 |
|------|------|------|------|
| **A 改 :root font-size** | `:root { font-size: 110%; }` | ⭐ 最簡單、影響 rem / em；但 fixed px 不變 | 全 rem-based 專案、NEXORA ⚠️ |
| **B CSS variable 動態** | `html { font-size: var(--nx-root-font-size, 100%); }` + JS toggle | ⭐⭐ 用戶可選、無侵入；fixed px 仍不變 | 含設定面板 |
| **C @theme inline 字級 token 改寫** | `--text-base: 1.1rem; --text-sm: 0.97rem` 等 | ⭐⭐⭐ 平衡（Tailwind token 全升、:root 不動、不影響任意 px）；但 NEXORA 任意 px 仍混用 | Tailwind v4 + 漸進規範化 |
| **D px 任意值規範化** | 把 text-[10px]/[11px] 全改回 Tailwind text-xs 等 token | ⭐⭐⭐⭐ 徹底；最大改動量；不可逆 | 長期重構 |
| **E body className** | `<body className="text-[110%]">` | ✗ 只影響 text-* token、不影響 spacing / sizing | 純字級調整 |

### 1.5 Hank 業界 muscle memory 推薦範式

⭐⭐⭐ **推薦 B + 後續軌 D 規範化**：

```
階段 1（POLISH 本軌、低風險）：
  - globals.css 加 :root { font-size: var(--nx-root-font-size, 100%); }
  - 預設 110%（封測偏好 + 使用者導向）
  - 後續可加設定面板讓用戶選 90% / 100% / 110%

階段 2（後續軌 TASK-UI-PX-NORMALIZE、大改動）：
  - 全站 text-[10px]/[11px]/[13px] 規範化為 Tailwind text-* token
  - 預估 50+ 檔案
  - Q-RHYTHM-2 漸進式 commit 群
```

**理由**：
- 階段 1 風險低（rem 跟、任意 px 不跟）、視覺秩序 80% OK
- 階段 2 才是 NEXORA 戰略：消除「Tailwind token vs 任意 px」混用範式
- 與業界（Linear / Notion / Figma）一致：rem 為主、任意 px 僅用於圖示／邊框 1px

---

## §2 Top bar tenant 顯示真相

### 2.1 「恆迎企業」字串真相（§G.9 通配 grep 揭露）

```
grep "恆迎" apps/nx-ui/src/**/*.{ts,tsx}：
  apps/nx-ui/src/mocks/dashboard.ts:66    ← tenantName: '恆迎企業'（mock 數據）

✗ 不在當前 dashboard / hub 顯示中
✗ legacy TopBar.tsx 接 tenantName prop、但只被 MainShell.tsx import
✗ MainShell.tsx 無人 import → 是 dead code
```

### 2.2 實際 dashboard topbar 真相

```
DashboardShell.tsx line 16: import { HomeTopBar } from '@/components/home/top-bar'
BaseMasterSubPageLayout.tsx line 14: 同上

HomeTopBar props:
  - tenantNameZh?: string | null   ← 顯示在 line 282
  - tenantNameEn?: string | null   ← 顯示在 line 291
  - displayName: string
  - roleLabel?: string
  ❌ 無 planCode prop ← 重大缺漏
```

### 2.3 tenant displayName 來源真相

```
useSessionMe.ts:
  - tenantNameZh = me.tenant_name?.trim() ?? ''
  - tenantNameEn = me.tenant_name_en?.trim() ?? ''

api /auth/me 回傳：
  - tenant_name = Nx99Tenant.name（schema line 6595）
  - tenant_name_en = Nx99Tenant.name_en（schema line 6597）

demo 模式（demo-session.ts:111）：
  - tenant_name: '伊諾瓦資訊科技有限公司'  ← Hank 命名（非業務）
  - tenant_name_en: 'Innova Information Technology'
```

### 2.4 Nx99Tenant schema 真相

```prisma
model Nx99Tenant {
  id                String   @id @default(dbgenerated("gen_nx99_tenant_id()"))  // NX99TANT0000001
  code              String   @db.VarChar(30)   // 租戶代碼（如 TEST-LITE）
  name              String   @db.VarChar(100)  // 租戶中文名 ← tenantNameZh 來源
  nameEn            String?  @map("name_en") @db.VarChar(100)  // 租戶英文名
  status            String   @db.VarChar(1)
  // ...
  @@map("nx99_tenant")
}
```

⚠️ **無 `displayName` 欄位**、只有 `name`。Crown 期望「測試公司（LITE）」=
- name = "測試公司"（直接寫入 nx99_tenant.name、demo seed）
- 「(LITE)」= 從 me.plan_code 衍生 badge

### 2.5 業界 SaaS 範式：tenant displayName + plan badge

```
Linear topbar:        [LOGO] [Org Name]                    [User]
Notion topbar:        [LOGO] [Workspace Name ▾]            [User]
GitHub topbar:        [LOGO] [Org / Repo]                  [PRO badge] [User]
Slack topbar:         [Workspace ▾]                        [User]
Salesforce topbar:    [LOGO] [Org Name (Edition)]          [User]
GitLab topbar:        [LOGO] [Group / Project]   [Ultimate badge] [User]

NEXORA 候選範式：
  [LOGO] [tenant.name (LITE)] [tenant.nameEn]   [Date]   [User]
            ↑ name             ↑ 灰字           ↑ 既有
            ↑ 加版本 chip
```

⭐ Crown 期望 = GitHub / GitLab / Salesforce 範式（tenant name 後緊跟 plan chip）。

### 2.6 落地需動檔案範圍

```
1. apps/nx-ui/src/components/home/top-bar.tsx
   - HomeTopBarProps 加 planCode?: string | null
   - line 282 後渲染 <PlanChip plan={planCode} />
   - 對齊既有 VersionBadge.tsx 範式（重用或抽 shared 元件）

2. apps/nx-ui/src/features/layout/ui/DashboardShell.tsx
   - line 35 useSessionMe() 多取 planCode
   - line 88-95 / 107-113 <HomeTopBar /> 加 planCode={planCode}

3. apps/nx-ui/src/features/base/shell/BaseMasterSubPageLayout.tsx
   - 同上 2 處

4. apps/nx-ui/src/features/auth/demo-session.ts
   - line 111 tenant_name 改 '測試公司' 或同步 seed
   - （或保留 '伊諾瓦資訊科技有限公司' 作 production demo、'測試公司' 作 LITE demo）

5. （可選）packages/db-core/prisma/seed* 加 TEST-LITE/PLUS/PRO 三租戶
   - 已有 deriveDemoPlanCodeFromSession() 邏輯預備、可順用
```

預估改動：5 檔、+30 / -5 行（不含 plan chip 抽元件）。

---

## §3 dual entries 拆解真相

### 3.1 Crown 拍板範式 B：拆 2 獨立卡片

對齊 [task-master-hub-improve-merge-verify.md](./task-master-hub-improve-merge-verify.md) §2.1
揭露「23 卡片 + 2 dual entries × 1 extra = 25 access points」、Crown 拍 B = 全拆獨立。

### 3.2 既有 dual entries 揭露（master-cards.ts）

```typescript
// brand-masters（line 211-222）
{
  id: 'brand-masters',
  section: 'product',
  title: '汽車／零件廠牌',
  links: [
    { label: '汽車廠牌', href: '/dashboard/base/car-brand', entryIcon: CarFront },
    { label: '零件廠牌', href: '/dashboard/base/part-brand', entryIcon: Tags },
  ],
}

// warehouse-location（line 287-299）
{
  id: 'warehouse-location',
  section: 'organization',
  title: '倉庫及庫位',
  links: [
    { label: '倉庫主檔', href: '/dashboard/base/warehouses', entryIcon: Warehouse },
    { label: '庫位主檔', href: '/dashboard/base/location', entryIcon: MapPin },
  ],
}
```

### 3.3 拆解後 4 卡（A041 精確 count）

```typescript
// 1. 汽車廠牌（從 brand-masters 拆）
{ id: 'car-brand', section: 'product', minPlan: 'LITE',
  title: '汽車廠牌', description: '汽車品牌代碼、國家與啟用狀態（NX01-12）',
  icon: CarFront, statLabel: '汽車廠牌', href: '/dashboard/base/car-brand' }

// 2. 零件廠牌（從 brand-masters 拆）
{ id: 'part-brand', section: 'product', minPlan: 'LITE',
  title: '零件廠牌', description: '零件品牌代碼、國家與啟用狀態',
  icon: Tags, statLabel: '零件廠牌', href: '/dashboard/base/part-brand' }

// 3. 倉庫主檔（從 warehouse-location 拆）
{ id: 'warehouse', section: 'organization', minPlan: 'LITE',
  title: '倉庫主檔', description: '倉別代碼、據點與啟用狀態',
  icon: Warehouse, statLabel: '倉庫', href: '/dashboard/base/warehouses' }

// 4. 庫位主檔（從 warehouse-location 拆）
{ id: 'location', section: 'organization', minPlan: 'LITE',
  title: '庫位主檔', description: '儲位代碼、所屬倉庫與啟用狀態',
  icon: MapPin, statLabel: '庫位', href: '/dashboard/base/location' }
```

### 3.4 master-cards.ts 改動範圍

```
✗ 刪 brand-masters 卡（line 211-222、12 行）
✗ 刪 warehouse-location 卡（line 287-299、13 行）
✓ 新 4 卡（約 40 行）
✓ MasterHubCardLink type 改 deprecated（保留還是刪？建議刪）
✓ DualEntryHubCard 元件改 deprecated（page.tsx line 38-117 約 80 行）
  → 但 lockedShellClass 保留通用
✓ renderHubCard 簡化（無 card.links?.length 分支）
```

預估改動：master-cards.ts +28 / -25、page.tsx -75 / +0、淨 -72 行。

### 3.5 卡片數對齊揭露

```
前（v1.5.1）：23 卡片 / 25 access points / 2 dual entries
後（v1.5.2 polish）：25 卡片 / 25 access points / 0 dual entries
真實 25 入口點對齊 Hank 上輪 audit  ✓
```

### 3.6 minPlan 分佈重新對齊（13/9/1 → 15/9/1）

```
拆解前：
  LITE 13（brand-masters 1 卡 + warehouse-location 1 卡計入）
  PLUS 9
  PRO 1
  合計 23

拆解後：
  LITE 15 = 13 - 2（移除 brand-masters / warehouse-location）+ 4（4 新卡全 LITE）
  PLUS 9（不變）
  PRO 1（不變）
  合計 25 ✓

新 LITE 分區：
  account 5：user / role / user-role / user-warehouse / role-view
  product 5：part / car-brand / part-brand / part-group   （+2 from dual、原 brand-masters 1 卡）
  organization 2：warehouse / location                      （+1 from dual、原 warehouse-location 1 卡）
  partner 1：partner
  system 3：bulletin / country / currency
```

### 3.7 §3.6 三版本可見性表更新（對齊 merge-verify §2.2）

```
LITE 用戶可見場景（15 卡無 badge、10 卡鎖）：
  account 5 全可入
  product 5 全可入（car-brand / part-brand LITE 起開放）
  product 3 鎖：brand-code-rule / part-relation / part-model（PLUS）
  vehicle 5 全 PLUS 鎖
  organization 2 全可入（warehouse / location 拆解後）
  partner 1 可入 + 1 鎖（customer-grade PLUS）
  system 3 可入 + 1 鎖（phonetic-dictionary PRO）

PLUS 用戶可見場景（24 卡可入、1 卡鎖）：
  phonetic-dictionary PRO 鎖
  其餘 24 卡全可入

PRO 用戶可見場景（25 卡全可入）：
  無鎖
```

---

## §4 分區優化建議揭露 ⭐

對齊 Crown 揭露：「針對目前的分類你認為有地方能做優化嗎？」
**Hank 業界 muscle memory 揭露 3 優化候選**、最終 Crown 業務 muscle memory 拍板。

### 4.1 候選 1：「組織架構」分區（拆解後 2 卡、仍偏小）

#### 4.1.1 現狀真相

```
拆解前：organization 1 卡（warehouse-location dual）
拆解後：organization 2 卡（warehouse / location 獨立）
```

#### 4.1.2 業界中小汽配 ERP 範式對標

| 業界 ERP | 組織架構分區 | 卡數 | 涵蓋 |
|---------|------------|------|------|
| SAP B1 | Organizational Structure | 5+ | 公司 / 部門 / 倉庫 / 據點 / 成本中心 |
| Oracle NetSuite | Subsidiaries | 4 | Subsidiary / Department / Location / Class |
| Odoo | Inventory > Warehouses | 2-3 | Warehouse / Location / Operation Type |
| Tally（印度小型）| Godowns | 2 | Warehouse / Location |
| 鼎新 ERP（台灣中型）| 公司基本 | 6 | 公司 / 部門 / 廠別 / 倉庫 / 庫別 / 員工 |
| **NEXORA 當前** | **組織架構** | **2** | warehouse / location |

#### 4.1.3 Hank 揭露 3 子候選

```
A. 保留獨立分區、預留擴充
   - 未來加：公司主檔 / 部門 / 據點 / 成本中心
   - 對齊鼎新 ERP / SAP B1 範式
   - 業界改革 #23 候選：「組織架構 6 主檔」

B. 合併到「系統設定」
   - organization 與 system 合併
   - 卡數 system 3 → 5
   - 業界範式：Odoo（無組織架構獨立、屬 Settings）

C. 合併到「主資料」概念（新分區）
   - 新分區 'foundation' 涵蓋 organization + system
   - 大重組、需 schema migration（無）
```

⭐ Hank 推薦 **A**：保留獨立 + 預留擴充。理由：
- NX99 系列已有 tenant / department / cost-center schema 草稿
- 未來 1~2 軌會補：「公司主檔 / 部門 / 成本中心」（業界改革 #23 預備）
- 短期 2 卡看似小、長期 6+ 卡是中型 ERP 標準

### 4.2 候選 2：「交易對象」分區可擴展

#### 4.2.1 現狀真相

```
拆解後：partner 2 卡
  - partner 客戶主檔（LITE）
  - customer-grade 客戶等級主檔（PLUS）

但 schema 真相揭露（nx01_partner）：
  partner_type CHAR(1) DEFAULT 'C'
  5 種 type：
    C 客戶（Customer）
    S 供應商（Supplier）
    T 物流商（Transporter）
    V 廠商（Vendor、非零件）
    B 銀行（Bank）
```

#### 4.2.2 業界範式對標

| 範式 | 描述 | 業界採用 | 優缺 |
|------|------|---------|------|
| **A 單一主檔 + tab 切換** | 1 個 partner 主檔頁、上方 Tab 切 5 type | NEXORA 當前、SAP B1、Odoo | ⭐ schema 簡單；UI tab 切換 |
| **B 拆 5 獨立主檔** | 客戶／供應商／物流／廠商／銀行 5 卡 | 鼎新 / 文晟（台灣） | ⭐ 業務 muscle memory；schema 5 表 |
| **C 拆 2-3 卡（核心 + 次要）** | 客戶 / 供應商 / 其他 3 卡 | Salesforce Account / Vendor | ⭐⭐ 平衡 |

#### 4.2.3 NEXORA 當前實作真相

```
✓ schema = A（單表 + partner_type 鑑別）
✓ /dashboard/base/partners 頁 = 上方 Tab 切 5 type（nx01-03 spec §2.1 line 93）
✗ hub 卡片只揭露 1 卡（"客戶主檔"）→ 業務無法在 hub 看到「我可管 5 種 partner」
```

#### 4.2.4 Hank 揭露 3 子候選

```
A. 保持單卡（最小改動）
   - 描述改：'客戶／供應商／物流／廠商／銀行 5 類交易對象'
   - 卡上 hover 揭露 5 子分類
   - 業務看到 1 卡、知道有 Tab 切換

B. 拆 2 卡（核心拆分）
   - 「客戶主檔」（partner_type=C、business 最常用）
   - 「供應商主檔」（partner_type=S+V、採購用）
   - 物流 / 銀行隱性使用、合併到 sys 或 partner 子頁

C. 拆 5 卡（完整對齊 schema）
   - 客戶 / 供應商 / 物流商 / 廠商 / 銀行 5 卡
   - 全用 /dashboard/base/partners?type=C 等 query 進子頁
   - hub 視覺豐富、但 partner section 變大（2 → 5+ 1 grade = 6 卡）
```

⭐ Hank 推薦 **B 拆 2 卡**：
- 業務 muscle memory：客戶 / 供應商是 2 個 SOP 起點、其他 3 type 是子分類
- partner section 卡數 = 3（client / supplier / grade）、剛好（與 system 對等）
- 對齊 Salesforce Account（Customer）vs Vendor 範式
- schema 不動、href 用 query parameter

### 4.3 候選 3：「系統設定」順序 + 內容

#### 4.3.1 現狀真相

```
system section 卡序（master-cards.ts MASTER_HUB_CARDS array）：
  1. bulletin       公告主檔（LITE）
  2. country        國家主檔（LITE）
  3. currency       幣別主檔（LITE）
  4. phonetic-dictionary  注音字典（PRO）

display 順序 = array 順序（getMasterHubSections 不再排序）
```

#### 4.3.2 業界 ERP 系統設定範式

```
Linear / Notion：Settings = User + Workspace + Billing + Integration
SAP B1：System Initialization = Company / Document Numbering / Print Templates
NetSuite：Setup = Company / Users / Customization / Localization
鼎新 ERP：系統設定 = 公司基本資料 / 編號設定 / 列印格式 / 權限矩陣 / 公告

NEXORA 當前 4 卡：
  公告 / 國家 / 幣別 / 注音字典
  → 4 卡偏雜（無歸類邏輯）
```

#### 4.3.3 Hank 揭露 3 子候選

```
A. 順序優化（最小改動）
   重排：國家 / 幣別 / 公告 / 注音字典
   → 「全域型錄（國家 / 幣別）」優先、「業務工具（公告 / 注音）」次之
   business muscle memory：用戶常先設 country / currency（建公司基本資料）、再設公告

B. 拆 2 子分區
   - 'foundation'：國家 / 幣別 / 公告（全域基礎）
   - 'tools'：注音字典 / 其他 PRO 工具
   - 分區擴展為 7（多 1 區）

C. 加 NX99 系列主檔
   - 公司主檔（Nx99Tenant）
   - 方案主檔（Nx99Plan、view-only）
   - 訂閱主檔（Nx99Subscription）
   - 將 system 擴為 7+ 卡、含 NX99
```

⭐ Hank 推薦 **A 順序優化**：
- 改動最小（只動 MASTER_HUB_CARDS array 順序）
- 對齊業務 muscle memory（國家 → 幣別 → 業務工具）
- C 候選留給後續軌「TASK-NX99-MASTER-HUB」（含 plan / subscription / tenant 管理）

### 4.4 §4 整合 Hank 業界 muscle memory 推薦

```
Q-RHYTHM-2 拍板 4 議題：
  4.1 候選 1：保留 organization 獨立 + 預留擴充（推 A）
  4.2 候選 2：partner 拆 2 卡（client / supplier）（推 B）
  4.3 候選 3：system 順序優化（國家 → 幣別 → 公告 → 注音）（推 A）

對 Hank 推薦範式落地後分區結構：

account 5：user / role / user-role / user-warehouse / role-view（不變）
product 5：part / car-brand / part-brand / part-group + 3 PLUS（拆 brand-masters）
vehicle 5：engine / model / transmission / drivetrain / model-type（不變）
organization 2：warehouse / location（拆 warehouse-location、預留擴充）
partner 3：客戶 / 供應商 / 客戶等級（拆 partner）  ← Crown 拍板候選 2 後加 1 卡
system 4：國家 / 幣別 / 公告 / 注音字典（順序優化）  ← Crown 拍板候選 3 後重排

合計：5+5+5+2+3+4 = 24 卡（或 25 卡若不拆 partner）/ 25 access points
```

⭐ Crown 業務 muscle memory 最權威、Hank 推薦僅供諮詢。

---

## §5 卡片視覺 polish 真相

### 5.1 卡片副標題現狀（dashboard/base/page.tsx）

```tsx
// single-href card（line 178+）
<p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
  {card.description}
</p>

// dual-link card（被本軌移除、見 §3.4）

// minimal placeholder card（無描述、不渲染）
```

實測描述字數（A041 精確 count）：

| Card | 描述（中文）| 字數 | 預期換行 |
|------|-------------|------|---------|
| user | 帳號、聯絡方式與啟用狀態 | 12 | 1 行 OK |
| role | 職務代碼、名稱與啟用狀態 | 12 | 1 行 OK |
| user-role | 依職務匯入或移除隸屬使用者 | 13 | 1 行 OK |
| brand-code-rule | 依零件品牌的 seg 長度與排列（nx00_brand_code_rule）| 26 + schema | ⚠️ 2 行 + schema 暴露 |
| part-relation | 改號／同款／組合包等零件關係 | 14 | 1 行 OK |
| part-group | 族群名稱與料號匹配（廠牌 + seg1～5）| 18 | 1 行邊緣 |
| model | 車廠 × 車系 × 年式組合與規格摘要 | 16 | 1 行 OK |
| transmission | 自手排／CVT／DCT 等變速箱類型代碼（NX01-15）| 21 | 1 行邊緣 |
| drivetrain | FF／FR／4WD／AWD 傳動配置代碼（NX01-15）| 19 | 1 行邊緣 |
| customer-grade | 依交易額／信用條件分級，影響定價與付款條件 | 21 | 1 行邊緣 |

⚠️ 4 卡描述 18~26 字、line-clamp-2 後可能 2 行、視覺不均。

### 5.2 業界 SaaS 範式對標（卡片副標題）

| 平台 | 副標題範式 | 觀察 |
|------|----------|------|
| Linear | 無（卡只有標題 + icon） | minimal |
| Notion Page Cards | 無（icon + title） | minimal |
| Figma Files | 無（preview + title） | minimal |
| Airtable Bases | 短描述（5-10 字） | 短 |
| Stripe Dashboard | 短描述（10-15 字）| 短 |
| Salesforce Object Manager | 完整描述 + Help icon | 詳細 |
| **NEXORA 當前** | **完整描述（12-26 字）** | **偏詳細** |

### 5.3 3 選項揭露

#### A 移除副標題（業界 minimal 範式）

```tsx
// 卡片只剩 icon + title + badge
// 對齊 Linear / Notion / Figma
+ ⭐ 視覺簡潔、卡片高度可縮
+ ⭐ 移除 schema/table 名稱暴露問題（§6.4）
- ⚠️ 業務用戶資訊量少、需 hover tooltip 補
```

#### B 統一 1 行字數限制（如 20 字、超過 ellipsis）

```tsx
<p className="truncate text-[11px] leading-snug text-muted-foreground">
  {card.description}
</p>
// 視覺秩序統一、超過用 ... 截
+ ⭐⭐ 視覺秩序、最小改動
- ⚠️ 用戶看不到完整描述（除非 hover title 屬性）
```

#### C Hover 才顯示副標題（progressive disclosure）

```tsx
<div className="group">
  <h3>{card.title}</h3>
  <p className="hidden group-hover:block">{card.description}</p>
</div>
// 對齊 Apple Finder / macOS file icon
+ ⭐⭐⭐ 平時 minimal、需要時揭露
- ⚠️ 觸控設備（手機）無 hover、需替代範式（long-press / accordion）
- ⚠️ 增加 UI 複雜度
```

### 5.4 page subtitle 揭露

```tsx
// dashboard/base/page.tsx line 187-189
<p className="max-w-2xl text-sm text-muted-foreground">
  依業務分區排列；點選卡片進入各主檔維護。
</p>
```

**業界 SaaS 範式對標**：
- Linear / Notion / Figma：dashboard 頁面通常無 subtitle（標題已自證）
- SAP B1：有 subtitle，但偏向「使用提示」
- Salesforce Object Manager：有 subtitle + Help link

⭐ **Hank 推薦移除 page subtitle**：
- 主標題「主檔中心」已自證
- 「依業務分區排列；點選卡片進入各主檔維護」= 重複資訊（卡 + section header 已揭露）
- 對齊 NEXORA 蘋果範式（minimal）

### 5.5 Hank 業界 muscle memory 推薦組合

⭐⭐⭐ **推薦 B 統一 1 行 + 移除 page subtitle**：
- 視覺秩序統一（line-clamp-2 → truncate）
- 完整描述用 `title={card.description}` HTML 屬性、hover 揭露
- page subtitle 移除、節省垂直空間
- 與業界 SaaS（Stripe / Airtable）平衡範式對齊

---

## §6 Upgrade Dialog polish 真相

### 6.1 「了解升級方案」button 當前實作真相

```tsx
// UpgradePromptDialog.tsx line 108-118
<Button
  className="bg-[#E8A020] text-background hover:bg-[#E8A020]/90"
  onClick={() => {
    // 後續軌 TASK-NX99-PLAN-CHECKOUT 才接金流 API；本軌純 UI、關閉 Dialog
    onClose();
  }}
>
  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
  了解升級方案
</Button>
```

**真相**：
- ❌ 無 navigate（不跳頁）
- ❌ 無 API call
- ❌ 無 placeholder route（如 /pricing）
- ✅ 純關閉 Dialog（同「稍後再說」）
- ✅ 註解明示「後續軌 TASK-NX99-PLAN-CHECKOUT 接金流」

### 6.2 業界 SaaS Upgrade prompt 範式對標

| 平台 | Upgrade button 行為 | 落地頁 | 金流 |
|------|---------------------|--------|------|
| Linear Free→Pro | 跳 `/settings/plans` | 純展示對比表 | Stripe |
| Notion Free→Plus | 跳 `/upgrade` | 純展示對比表 | Stripe |
| Figma Free→Pro | 跳 `/pricing` 並高亮 Pro | 純展示對比表 + CTA | Stripe |
| Airtable Free→Pro | 跳 `/billing/plans` | 純展示對比表 | Stripe |
| Salesforce Free→Pro | 跳 「Contact Sales」表單 | 業務聯絡頁 | 手動 |
| GitHub Free→Pro | 跳 `/settings/billing/plans` | 純展示對比表 | Stripe |

### 6.3 NEXORA 戰略對齊：「不串第三方金流」（封測二階）

```
封測一階（current）：無金流、Upgrade button 純 onClose
封測二階（後續軌 NX99-PLAN-CHECKOUT）：接金流、Upgrade button 跳實體 Checkout
正式版：與封測二階同
```

⭐ Hank 推薦 polish 軌範式：

```tsx
// 跳「方案說明頁」純展示（無金流）
<Button onClick={() => router.push('/pricing')}>
  <Sparkles /> 了解升級方案
</Button>

// 新建 /pricing 頁：純展示 LITE/PLUS/PRO 對比表 + 「聯繫業務」CTA
//   - 對齊 Salesforce 範式（Contact Sales）
//   - 不串金流、業務 muscle memory
//   - 後續軌可改為直接 checkout（CTA 換 button）
```

### 6.4 Dialog 描述中 schema/table 名稱暴露真相

#### 6.4.1 揭露點（§G.9 通配 grep）

```bash
grep "nx0[0-9]_\|nx99_\|（nx" master-cards.ts：
  line 239: description: '依零件品牌的 seg 長度與排列（nx00_brand_code_rule）'
```

⚠️ **唯一暴露 schema/table 名稱於 user-facing description**。

#### 6.4.2 元數據來源真相

```
✗ 無「自動從 schema 讀」機制
✓ description 純手寫字串（master-cards.ts MasterHubCard.description）
✓ Dialog 中描述 = card.description（UpgradePromptDialog.tsx line 65）
```

### 6.5 業界範式：使用者面對絕對不暴露 schema / table 名稱

```
業界 ERP / SaaS 範式：
  ✗ partner_type   ← schema 欄位、不暴露
  ✗ nx00_brand_code_rule   ← table 名、不暴露
  ✓ 客戶 / 供應商 / 物流 / 廠商 / 銀行   ← 業務語言
  ✓ 品牌料號規則              ← 業務語言

Apple Cloud / GitHub / Notion 等業界遵循：
  - URL 用 hyphen-case slug（user-friendly）
  - schema 名只用於 docs / 開發者文件 / log
  - i18n key 用業務語言
```

⭐ Hank 推薦 polish 軌範式：

```typescript
// master-cards.ts line 239 改：
description: '依零件品牌的 seg 長度與排列規則',  // 移除 (nx00_brand_code_rule)

// 同時 §G.9 通配 grep 全 hub 程式碼確認無其他 schema 暴露
```

### 6.6 §6 整合 Hank 業界 muscle memory 推薦

```
6.1 「了解升級方案」button：跳 /pricing 純展示頁（無金流）
6.4 schema 暴露：master-cards.ts line 239 移除 (nx00_brand_code_rule)
6.5 後續軌 grep 巡檢：確認全 hub 描述無 nx?? 命名暴露
```

預估改動：UpgradePromptDialog.tsx +5 / -5、master-cards.ts +1 / -1、新建 /pricing 頁約 +120 行（純展示對比表）。

---

## §7 揭露不完整 / 範圍邊界

對齊規範 §I.6.3「揭露不完整每段尾標」、本檔尚未涵蓋：

```
1. §1 階段 2（TASK-UI-PX-NORMALIZE）50+ 檔案範圍 = 估計、未實測 grep
2. §2 / 2.6 plan chip 元件抽 shared 與否 = Crown 拍板未定
3. §3 / 3.4 DualEntryHubCard 元件保留 deprecate 註解 vs 刪除 = Crown 拍板未定
4. §4 / 4.4 Crown 業務 muscle memory 拍板等待中（3 候選 × 3 子候選 = 9 排列）
5. §5 / 5.5 page subtitle 移除是否影響 SEO / a11y = 未 verify
6. §6 / 6.3 新建 /pricing 頁是否本軌做 vs 後續軌做 = Crown 拍板未定
7. 業界改革 #22 完整 closure = 待本 polish 軌 + NX99-PLAN-MIDDLEWARE 雙軌完成
```

---

## §8 預估 polish 軌 commit 群（待 Crown 拍板後落地）

```
commit 1：font-size 範式 B（:root CSS variable + 預設 110%）
commit 2：HomeTopBar 加 planCode prop + plan chip 渲染（§2）
commit 3：dual entries 拆 4 卡 + DualEntryHubCard deprecated（§3）
commit 4：分區優化（待 Crown 拍板 4.1/4.2/4.3 三組合）（§4）
commit 5：卡片副標題 polish（B + page subtitle 移除）（§5）
commit 6：Upgrade Dialog button 跳 /pricing + schema 暴露移除（§6）
commit 7：新建 /pricing 純展示頁（若 Crown 拍板本軌做）
commit 8：merge-verify 文件 8 段揭露
```

預估 7~8 commit Q-RHYTHM-2、預估開工 2~3 hours、Hank 自主全軌。

---

**等 Crown 拍板**：
- §1 字級範式 A/B/C/D/E（推 B）
- §2 plan chip 範式（推 GitHub / Salesforce）
- §3 拆 dual entries（已拍板 B）
- §4 分區優化 3 候選 × 3 子候選（Hank 推 A/B/A）
- §5 副標題 + page subtitle（推 B + 移除）
- §6 Upgrade button + schema 暴露移除（推 跳 /pricing + 清理）
