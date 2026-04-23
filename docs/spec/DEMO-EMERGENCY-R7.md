# [TASK-DEMO-EMERGENCY-R7] 銷售中心重構 — 4 分區架構 + 待辦清單 + KPI

> 發件人：Alex（PM AI）
> 收件人：Hank（Cursor AI）
> 版本：v2（2026-04-23 中午修正）
> 分支：`feature/demo-emergency`
> 專案路徑：`nexora/docs/spec/DEMO-EMERGENCY-R7.md`

---

## 📋 Spec 版本歷史

| 版本 | 日期 | 變更重點 |
|------|------|----------|
| v1 | 2026-04-23 早晨 | 原始 spec |
| v2 | 2026-04-23 中午 | 反映 Phase 1/2/2.5 完成；DOCK 設計從「保留」改為「全移除」；底部高度 100px→56px |

---

## 📊 Phase 進度追蹤

| Phase | 狀態 | Commit | 說明 |
|-------|------|--------|------|
| Phase 1 | ✅ 完成 | 2feea55 | 登入頁清理 + DOCK 視覺統一（後被 Phase 2.5 取代） |
| Phase 2 | ✅ 完成 | 75f2191 | 4 分區架構 + 狀態追蹤分區（KPI + 待辦清單） |
| Phase 2.5 | ✅ 完成 | 10841d3 | 移除非首頁 DOCK，SectionTabs 改貼底 |
| Phase 3 | ✅ 完成 | 64a63f5 | 工作站分區（4 項）+ 單據管理分區（7 項）+ 10 個子路由 placeholder |
| Phase 4 | ✅ 完成 | TBD | 客戶維護分區（3 項）+ 3 個子路由 placeholder |
| Phase 5 | ⏳ 待做 | - | 調貨詢價 A+B 彈窗 |
| Phase 6 | ⏳ 待做 | - | 清理（移除 SOP 精品示範入口卡）+ 整合測試 |

---

## 📋 Spec 同步規則（v2 新增）

### 規則

**每個 phase 實作時，commit 必須同步更新本 spec 檔案。**

### 原因

Crown + Hank 的工作跨越時空：
- 早上公司電腦，晚上家裡電腦
- Hank 每次啟動工作會讀 spec 檔案作為「真理來源」
- 如果 spec 過時，下次工作就會踩坑

### 操作方式

```
1. Hank 寫 code（主要工作）
2. 發現 spec 有過時措辭 → 同步修正
3. 同一個 commit 同時涵蓋 code 改動 + spec 改動
4. Commit message 標註「+spec sync」

範例：
[DEMO-R7 phase 3] workstation + documents sections (+spec sync)
```

### Hank 的判斷權限

- ✅ 文字描述過時 → 直接改（例如「雙層 bar」→「單層 bar」）
- ✅ 高度/尺寸數字過時 → 直接改（例如 100px → 56px）
- ✅ 流程步驟已執行 → 在 Phase 進度追蹤表更新狀態
- ⚠️ 架構決策疑似過時 → 在回報中指出，請 Crown 確認後 Alex 更新
- ❌ 不要改「戰略背景」、「設計哲學」等核心段落（那是 Crown 的決策，Alex 負責追蹤）

---

## 🎯 本任務一句話摘要

把銷售中心從「Tab + 卡片導航」改成「4 分區（狀態追蹤 / 工作站 / 單據管理 / 客戶維護）+ 待辦追蹤 + PRO KPI」的專業 ERP 結構。**這個結構未來會套用到其他所有中心**。

---

## 📋 戰略背景

### Crown 的核心方針

> 「銷售中心邏輯未來其他中心都能全部套上使用，所以這不能馬虎。」

```
今天做的銷售中心 4 分區結構：
  ↓
明天起套用到：
  - 採購中心（國內採購 / 國外採購 / 特殊採購）
  - 庫存中心（出貨 / 進貨 / 盤點）
  - 財務中心（AR / AP / 收付款）
  - 人資中心（出勤 / 薪資 / 異動）
  
所以：今天的銷售中心 = NEXORA 手機版「中心」的設計範本
```

### 「中心 = 角色工作台」哲學（v2 新增）

```
Crown 2026-04-23 中午確認：

NEXORA 中心定義：
  中心 ≠ 功能模組
  中心 = 角色工作台

業務的中心 = 銷售中心（包含查庫存等所有業務需要的功能）
倉管的中心 = 庫存中心（倉管不需要接觸銷售）
業務根本不該進庫存中心（那是倉管的世界）

業務要查庫存可以直接在銷貨中心查（多一個選客戶步驟即可）。

延伸設計決策：
  - 底部 DOCK（中心切換）對業務是雜訊 → 全站移除
  - 跨中心切換 = 「換身份」級的重大動作 → 由 TopBar 星球承擔
```

### 「工作站 = SOP」的統一原則

```
手機版「國內銷售」直接 = 9 step SOP 工作台
不再有「進入國內銷售後再選作業方式」這種多餘層級

未來其他工作站（國外銷售 / 銷退 / 保固申請）也比照辦理：
  → 每個工作站子功能 = 一個 SOP 流程
  → 業務手機上沒有「自由作業」這種模式
  → 全部 SOP 化，符合「SOP 內建」的產品哲學
```

---

## 🎨 風格延續

延續 R6 Phase 2 確立的穩重風格：

```
✅ 全部 lucide-react，零 emoji
✅ 金色（#E8A020）只用於 CTA + 當前 step + 淡金邊（/60）
✅ 綠色（#1D9E75）只用於成功/達標標記
✅ 紅色（#E24B4A）只用於警示/逾期
✅ Badge 一律 bg-white/10 text-white/80 text-xs
✅ Card 一律 border-white/10 bg-white/5 rounded-lg
✅ 字型只有 3 級：text-lg / text-sm / text-xs
✅ 無 font-bold，無 text-xl+
✅ 數字使用 tabular-nums
✅ 進度條 / 動畫 transition-all duration-300~700
```

---

# ✅ PART 1：登入頁底部清理（Phase 1 已完成）

## Commit 2feea55 已執行

- ✅ 移除桌面左下角「SYS.VER 2.0.26 / ONLINE」
- ✅ 移除登入卡下方「系統正常運作 | v1.0.0」
- ✅ 移除底部 footer bar（版權 / 服務條款 / 隱私政策）
- ✅ 保留：NEXORA logo、PlanetOrbit 動畫、登入卡、展示模式橫幅（功能提示非版本號）

---

# ✅ PART 2：手機 DOCK 處理（已演進為全移除）

## v1 原計畫（已被 Phase 2.5 推翻）

- ~~把手機 DOCK 統一成首頁風格~~
- ~~保留全站底部 DOCK~~

## v2 實際執行（Phase 2.5 完成）

Commit 10841d3 最終結果：

```
首頁 /dashboard：
  保持原本「自定義快捷鍵」（本來就沒 DOCK）

非首頁（所有中心）：
  DOCK 完全移除（透過 MobileDock 函式頂層 early return）
  跨中心切換改由 TopBar 星球承擔
```

**元件處理策略**：
- MobileDock 元件檔案保留（未來可能恢復）
- 非首頁渲染路徑變成死碼，加註解標記
- 未來要恢復：`git revert 10841d3` 一條 commit 解決

---

# ✅ PART 3：銷售中心 4 分區架構（Phase 2 已完成）

## 結構總覽

```
銷售中心頁面結構（v2 - 單層底部）：

┌─────────────────────────────────────┐
│ TopBar（含星球 = 跨中心切換）        │
├─────────────────────────────────────┤
│ 內容區（依當前選中分區動態顯示）       │
│                                     │
│ [狀態追蹤 預設]                      │
│   - PRO KPI 區（角色自動）           │
│   - 待辦追蹤清單                     │
│                                     │
│ [工作站]                             │
│   - 國內銷售（→ SOP 工作台）         │
│   - 國外銷售                         │
│   - 銷退作業                         │
│   - 保固申請                         │
│                                     │
│ [單據管理]                           │
│   - 7 個子功能                       │
│                                     │
│ [客戶維護]                           │
│   - 3 個子功能                       │
│                                     │
├─────────────────────────────────────┤
│ 銷售中心 4 分區 Tab（貼底，~56px）   │ ← 單層，無 DOCK
│ [狀態追蹤] [工作站] [單據] [客戶]     │
└─────────────────────────────────────┘
```

## 路由設計（已實作）

```
/dashboard/sale                        → 預設「狀態追蹤」分區
/dashboard/sale?section=status         → 狀態追蹤
/dashboard/sale?section=workstation    → 工作站
/dashboard/sale?section=documents      → 單據管理
/dashboard/sale?section=customer       → 客戶維護

子功能路由（Phase 3+ 實作）：
工作站：
  /dashboard/sale/sop-demo             → 國內銷售（直接是 SOP）
  /dashboard/sale/export               → 國外銷售（placeholder）
  /dashboard/sale/return               → 銷退作業（placeholder）
  /dashboard/sale/warranty             → 保固申請（placeholder）

單據管理：
  /dashboard/sale/docs/quote           → 報價單據管理（placeholder）
  /dashboard/sale/docs/inquiry         → 調貨詢價管理（placeholder）
  /dashboard/sale/docs/transfer        → 調貨單據管理（placeholder）
  /dashboard/sale/docs/sales           → 銷售單據管理（placeholder）
  /dashboard/sale/docs/orders          → 客戶訂單管理（placeholder，獨立）
  /dashboard/sale/docs/return          → 銷退單據管理（placeholder）
  /dashboard/sale/docs/warranty        → 保固單據管理（placeholder）

客戶維護：
  /dashboard/sale/customer/analysis    → 客戶分析報表（placeholder）
  /dashboard/sale/customer/grading     → 客戶分級管理（placeholder）
  /dashboard/sale/customer/info        → 客戶資料維護（placeholder）
```

## 4 分區 Tab 元件（Phase 2 已實作）

位置：`apps/nx-ui/src/features/layout/ui/module-hub/MobileHubSectionTabs.tsx`

**Phase 2 實作重點**：
- 加 `showLabel` + `offsetBottom` props（向後相容）
- 採購/庫存原有的 Section Tabs 使用預設值，不受影響
- 銷售中心使用新 props：`showLabel=true`、`offsetBottom=0`（Phase 2.5 改為貼底）

## State 管理（Phase 2 已實作）

URL query string 是事實來源：

```tsx
// SalesHubMobile.tsx
const searchParams = useSearchParams()
const router = useRouter()
const currentSection = (searchParams.get('section') || 'status') as Section

const handleSectionChange = (section: Section) => {
  router.push(`/dashboard/sale?section=${section}`, { scroll: false })
}
```

---

# ✅ PART 4：狀態追蹤分區（Phase 2 已完成）

## 4.1 整體版面（已實作）

```
【KPI 區】（PRO 限定，非 PRO 不 render）
  依 MOCK_USER_ROLE 顯示對應層級：
    sales → 個人 KPI（王小明）
    team_leader → 團隊 KPI
    sales_manager → 公司 KPI
  
【待辦追蹤】共 8 筆
  詢價待回覆（3 筆）
  銷售待出貨（4 筆）
  保固待結果（1 筆）
```

## 4.2 實作位置

```
apps/nx-ui/src/features/sale/ui/hub/
  ├─ SalesHubMobile.tsx                  主元件
  ├─ sections/StatusSection.tsx          狀態追蹤分區組裝
  ├─ components/ProKPICard.tsx           3 格 KPI 卡
  ├─ components/TodoGroup.tsx            手風琴群組 + 染色 badge
  └─ mock-data/scenario.ts               MOCK_USER_ROLE + KPI + 3 群待辦
```

## 4.3 Mock 資料

```ts
// scenario.ts（Phase 2 已實作）
export const MOCK_USER_ROLE: 'sales' | 'team_leader' | 'sales_manager' = 'sales'

export const MOCK_KPI_DATA = {
  personal: {
    salesActual: 485230, salesTarget: 600000, salesProgress: 80.9,
    marginRate: 28.3, returnRate: 1.2,
  },
  team: { /* ... */ },
  company: { /* ... */ },
}

export const MOCK_INQUIRY_TODOS: TodoItem[] = [/* 3 筆 */]
export const MOCK_SALES_TODOS: TodoItem[] = [/* 4 筆 */]
export const MOCK_WARRANTY_TODOS: TodoItem[] = [/* 1 筆（含 partName） */]
```

## 4.4 待辦項目視覺規則

```
Badge 染色（依等待天數）：
  < 3 天 → bg-white/10 text-white/70（淡灰）
  3~7 天 → bg-[#E8A020]/15 text-[#E8A020]（淡金）
  > 7 天 → bg-[#E24B4A]/15 text-[#E24B4A]（淡紅，逾期警示）

保固單例外：
  amount=0 && partName 存在時
  金額位置改顯示零件名稱
```

---

# ✅ PART 5：工作站分區（Phase 3 已完成）

## 5.1 整體版面

```
工作站分區內容：

┌─────────────────────────────────────┐
│ 銷售中心 · 工作站                    │
│ 進入作業流程                         │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📦 國內銷售                     │ │ ← 可用
│ │ 9 步驟 SOP 流程                 │ │
│ │ 從選客戶到訂單成立              │ │
│ │ →                               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🌐 國外銷售    [即將推出]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ↩ 銷退作業    [即將推出]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🛡 保固申請    [即將推出]       │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## 5.2 元件設計

```tsx
// sections/WorkstationSection.tsx
function WorkstationSection() {
  const router = useRouter()
  
  const items = [
    {
      id: 'domestic',
      icon: Package,
      title: '國內銷售',
      subtitle: '9 步驟 SOP 流程',
      description: '從選客戶到訂單成立',
      route: '/dashboard/sale/sop-demo',
      enabled: true,
    },
    {
      id: 'export',
      icon: Globe,
      title: '國外銷售',
      subtitle: '12 步驟（含報關/物流）',
      description: '出口銷售完整流程',
      route: '/dashboard/sale/export',
      enabled: false,
    },
    {
      id: 'return',
      icon: Undo2,
      title: '銷退作業',
      subtitle: '客戶退貨處理流程',
      description: '退貨入庫與帳款處理',
      route: '/dashboard/sale/return',
      enabled: false,
    },
    {
      id: 'warranty',
      icon: Shield,
      title: '保固申請',
      subtitle: '客戶保固送修流程',
      description: '送原廠或同行處理',
      route: '/dashboard/sale/warranty',
      enabled: false,
    },
  ]
  
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-white">工作站</div>
        <div className="text-xs text-white/50 mt-0.5">進入作業流程</div>
      </div>
      
      <div className="space-y-3">
        {items.map((item) => (
          <WorkstationItem 
            key={item.id} 
            item={item}
            onClick={() => item.enabled && router.push(item.route)}
          />
        ))}
      </div>
    </div>
  )
}

function WorkstationItem({ item, onClick }: Props) {
  const Icon = item.icon
  
  return (
    <button
      onClick={onClick}
      disabled={!item.enabled}
      className={cx(
        'w-full text-left border rounded-lg p-4 transition-all',
        item.enabled 
          ? 'border-white/10 bg-white/5 hover:border-white/20 active:border-[#E8A020]/60'
          : 'border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cx(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          item.enabled ? 'bg-white/10' : 'bg-white/5'
        )}>
          <Icon className={cx(
            'w-5 h-5',
            item.enabled ? 'text-white/70' : 'text-white/30'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-white">{item.title}</span>
            {!item.enabled && (
              <span className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded">
                即將推出
              </span>
            )}
          </div>
          <div className="text-xs text-white/60">{item.subtitle}</div>
          <div className="text-xs text-white/40 mt-0.5">{item.description}</div>
        </div>
        
        {item.enabled && (
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        )}
      </div>
    </button>
  )
}
```

## 5.3 重要：「國內銷售」整合邏輯

```
點「國內銷售」→ router.push('/dashboard/sale/sop-demo')

這條路徑就是 R6 做的 SOP 工作台
「國內銷售」= SOP 工作台

⚠️ Phase 6 要拿掉的東西：
  - R6 在 /dashboard/sale 加的「SOP 精品示範 🔥」入口卡
  - 這個卡完全移除（Phase 6 清理）
  - 新結構下，「國內銷售」= SOP 入口

⚠️ 注意：
  - SOP 工作台本身（/dashboard/sale/sop-demo）不動
  - 只是入口從「特殊精品卡」變成「正常工作站項目」
  - SOP 內部 9 step 流程完全不動
```

---

# ✅ PART 6：單據管理分區（Phase 3 已完成）

## 6.1 整體版面

7 個子功能項目（全 placeholder）：

```
┌─────────────────────────────────────┐
│ 📃 報價單據管理         本月 142 張  │
├─────────────────────────────────────┤
│ ❓ 調貨詢價管理   本月 38 張 待回覆 3│ ← 金色強調
├─────────────────────────────────────┤
│ ⇄ 調貨單據管理          本月 25 張  │
├─────────────────────────────────────┤
│ 🛒 銷售單據管理   本月 89 張 進行中 4│ ← 金色強調
├─────────────────────────────────────┤
│ 📌 客戶訂單管理         進行中 7 張  │ ← 獨立、金色強調
├─────────────────────────────────────┤
│ ↩ 銷退單據管理          本月 5 張  │
├─────────────────────────────────────┤
│ 🛡 保固單據管理   本月 3 張 處理中 1│ ← 金色強調
└─────────────────────────────────────┘
```

## 6.2 元件設計

```tsx
// sections/DocumentsSection.tsx
function DocumentsSection() {
  const router = useRouter()
  
  const items = [
    { id: 'quote', icon: FileText, title: '報價單據管理',
      stats: '本月 142 張', route: '/dashboard/sale/docs/quote', enabled: false },
    { id: 'inquiry', icon: HelpCircle, title: '調貨詢價管理',
      stats: '本月 38 張 · 待回覆 3 張', statsHighlight: true,
      route: '/dashboard/sale/docs/inquiry', enabled: false },
    { id: 'transfer', icon: ArrowLeftRight, title: '調貨單據管理',
      stats: '本月 25 張', route: '/dashboard/sale/docs/transfer', enabled: false },
    { id: 'sales', icon: ShoppingCart, title: '銷售單據管理',
      stats: '本月 89 張 · 進行中 4 張', statsHighlight: true,
      route: '/dashboard/sale/docs/sales', enabled: false },
    { id: 'orders', icon: Bookmark, title: '客戶訂單管理',
      subtitle: '客戶預訂單',
      stats: '進行中 7 張', statsHighlight: true,
      route: '/dashboard/sale/docs/orders', enabled: false },
    { id: 'return', icon: Undo2, title: '銷退單據管理',
      stats: '本月 5 張', route: '/dashboard/sale/docs/return', enabled: false },
    { id: 'warranty', icon: Shield, title: '保固單據管理',
      stats: '本月 3 張 · 處理中 1 張', statsHighlight: true,
      route: '/dashboard/sale/docs/warranty', enabled: false },
  ]
  
  // ... 渲染邏輯（類似 WorkstationSection 但用 DocumentItem）
}
```

**statsHighlight=true** 時 stats 文字用金色（`text-[#E8A020]`）表示「有待處理」。

## 6.3 子功能 Placeholder 頁面

```tsx
// 所有子功能 placeholder 頁統一樣式

export default function PlaceholderPage() {
  const router = useRouter()
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-14 h-14 rounded-full bg-white/10 
                      flex items-center justify-center mb-4">
        <Hammer className="w-7 h-7 text-white/40" />
      </div>
      <div className="text-base text-white mb-2">即將推出</div>
      <div className="text-xs text-white/50 text-center max-w-xs">
        此功能將於後續版本推出，敬請期待。
      </div>
      <button
        onClick={() => router.back()}
        className="mt-6 text-xs text-white/60 hover:text-white"
      >
        ← 返回
      </button>
    </div>
  )
}
```

---

# ✅ PART 7：客戶維護分區（Phase 4 已完成）

## 7.1 整體版面

3 個子功能項目（全 placeholder）：

```
┌─────────────────────────────────────┐
│ 📊 客戶分析報表   業務用            │
│ 掌握客戶成長 · 銷售/銷退/趨勢        │
├─────────────────────────────────────┤
│ 🏅 客戶分級管理   業務組長用        │
│ 設定客戶等級 · A/B/C/D 升降級       │
├─────────────────────────────────────┤
│ 👤 客戶資料維護   業務用            │
│ 更新基本資訊 · 地址/聯絡/備註        │
└─────────────────────────────────────┘
```

## 7.2 元件設計

```tsx
// sections/CustomerSection.tsx
function CustomerSection() {
  const items = [
    {
      id: 'analysis', icon: BarChart3,
      title: '客戶分析報表', role: '業務用',
      description: '掌握客戶成長',
      detail: '銷售 / 銷退 / 趨勢',
      route: '/dashboard/sale/customer/analysis',
      enabled: false,
    },
    {
      id: 'grading', icon: Award,
      title: '客戶分級管理', role: '業務組長用',
      description: '設定客戶等級',
      detail: 'A / B / C / D 升降級',
      route: '/dashboard/sale/customer/grading',
      enabled: false,
    },
    {
      id: 'info', icon: User,
      title: '客戶資料維護', role: '業務用',
      description: '更新基本資訊',
      detail: '地址 / 聯絡 / 備註',
      route: '/dashboard/sale/customer/info',
      enabled: false,
    },
  ]
  
  // ... 渲染邏輯
}
```

每個項目都有「角色 badge」（業務用 / 業務組長用），顯示誰該使用這個功能。這呼應「中心 = 角色工作台」哲學。

---

# ⏳ PART 8：SOP 工作台 — 調貨詢價彈窗（Phase 5 待做）

## 8.1 觸發場景

業務在 R6 SOP 工作台 STEP 2 查料時：
- 點開某料號詳情
- 看到該料號**全公司無庫存**（本倉/新竹/台中都 0）
- **正常情況**：無法加入報價清單（沒貨可賣）

**Phase 5 新增功能**：點「向同行調貨詢價」按鈕 → 彈出選擇對話框

## 8.2 觸發判斷

```tsx
// Step2SearchParts.tsx 內，料號詳情區
const totalStock = part.stocks.main + part.stocks.hsinchu + part.stocks.taichung
const isOutOfStock = totalStock === 0

{isOutOfStock ? (
  <div className="space-y-3">
    {/* 缺貨警示 */}
    <div className="border border-[#E24B4A]/40 bg-[#E24B4A]/5 rounded-lg p-3
                    flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-[#E24B4A] mt-0.5 shrink-0" />
      <div className="text-xs">
        <div className="text-white/80 mb-1">全公司無庫存</div>
        <div className="text-white/60">
          可向同行調貨詢價以協助客戶取得此料號
        </div>
      </div>
    </div>
    
    <button
      onClick={() => setShowInquiryDialog(true)}
      className="w-full h-11 border border-[#E8A020]/60 text-[#E8A020] 
                 rounded-lg hover:bg-[#E8A020]/10 transition-colors"
    >
      向同行調貨詢價
    </button>
  </div>
) : (
  /* 原本的「加入報價清單」按鈕 */
  <button onClick={addToQuote} className="...">
    加入報價清單
  </button>
)}
```

## 8.3 A+B 並存彈窗

```tsx
function InquiryDialog({ part, onSelectA, onSelectB, onCancel }: Props) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 
                   rounded-t-2xl sm:rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="text-base text-white">如何處理調貨詢價？</div>
          <div className="text-xs text-white/50">
            <span className="font-mono">{part.sku}</span> {part.name}
          </div>
        </div>
        
        {/* 選項 A：加入待辦 */}
        <button onClick={onSelectA} className="w-full text-left border border-white/10 bg-white/5 rounded-lg p-4 hover:border-white/20 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <BookmarkPlus className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-1">加入待辦，稍後處理</div>
              <div className="text-xs text-white/60">繼續目前銷售流程</div>
              <div className="text-xs text-white/40 mt-1">
                此料號將出現在「狀態追蹤 → 詢價待回覆」
              </div>
            </div>
          </div>
        </button>
        
        {/* 選項 B：立刻建詢價單 */}
        <button onClick={onSelectB} className="w-full text-left border border-white/10 bg-white/5 rounded-lg p-4 hover:border-white/20 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white mb-1">立刻建詢價單</div>
              <div className="text-xs text-white/60">跳到調貨詢價作業</div>
              <div className="text-xs text-white/40 mt-1">可選同行廠商、寄出詢價</div>
            </div>
          </div>
        </button>
        
        <button onClick={onCancel} className="w-full h-10 text-sm text-white/50 hover:text-white/70">
          取消
        </button>
      </div>
    </div>
  )
}
```

## 8.4 兩個選項的後續動作

```tsx
// 選項 A：加入待辦（Demo 用 toast 提示）
const handleSelectA = () => {
  showToast({ type: 'success', message: `已加入待辦清單，可至「狀態追蹤」查看` })
  setShowInquiryDialog(false)
  // 繼續 STEP 2
}

// 選項 B：跳工作站（Demo 用 placeholder）
const handleSelectB = () => {
  setShowInquiryDialog(false)
  router.push('/dashboard/sale/docs/inquiry')
}
```

---

# ⏳ PART 9：移除舊「SOP 精品示範」入口卡（Phase 6）

R6 在 `/dashboard/sale` 加的「SOP 精品示範 🔥」入口卡**完全移除**。

理由：
- 新結構下，「工作站 → 國內銷售」就是 SOP 入口
- 不需要「特殊精品」這種額外 badge
- 春酒對方的路徑：銷售中心 → 工作站 → 國內銷售 → SOP 9 step

需要修改的地方：
- 移除「SOP 精品示範」相關的元件 / 卡片 / mock data
- 確認 `/dashboard/sale` 預設進「狀態追蹤」分區（Phase 2 已完成）

---

# 🚨 嚴格紀律

## 必須遵守

```
✅ 4 分區結構（狀態追蹤 / 工作站 / 單據管理 / 客戶維護）
✅ 預設選中「狀態追蹤」
✅ PRO KPI 區只在 PRO tier 顯示（用 useSessionMe）
✅ 待辦清單純 Mock，靜態顯示
✅ 工作站「國內銷售」直接進 SOP（/dashboard/sale/sop-demo）
✅ 拿掉「SOP 精品示範 🔥」入口卡
✅ 子功能頁面（單據/客戶維護）先 placeholder
✅ 調貨詢價 A+B 並存彈窗
✅ 延續穩重風格（zero emoji、金色收斂）
✅ 手機版各中心底部無 DOCK（Phase 2.5 已完成）
✅ 登入頁底部小字清理（Phase 1 已完成）
✅ 每個 phase commit 同步更新本 spec 檔案（v2 新規則）
```

## 禁止

```
❌ 不要動 R6 SOP 工作台的內部 9 step 流程
❌ 不要假裝實作真實單據列表（會出 bug）
❌ 不要動其他中心（採購 / 庫存）— R7 只改銷售
❌ 不要動桌面版（手機優先，桌面以後再整）
❌ 不要為了 demo 加花俏動畫
❌ 不要動首頁（首頁已有自定義快捷鍵，不該動）
```

---

# 📋 開發順序（剩餘 Phase）

```
Phase 3（~60 分鐘）：工作站 + 單據管理分區
  3-1 WorkstationSection（4 個項目）
  3-2 國內銷售 → 路由到 SOP
  3-3 DocumentsSection（7 個項目）
  3-4 子功能 placeholder 頁面
  → commit 必須同步更新本 spec（Phase 3 進度、過時措辭）

Phase 4（~30 分鐘）：客戶維護分區
  4-1 CustomerSection（3 個項目）
  4-2 子功能 placeholder
  → commit 同步更新 spec

Phase 5（~45 分鐘）：調貨詢價彈窗
  5-1 缺貨判斷邏輯（Step2SearchParts）
  5-2 InquiryDialog 元件
  5-3 A 選項 toast 訊息
  5-4 B 選項 router 跳轉
  → commit 同步更新 spec

Phase 6（~30 分鐘）：清理 + 整合測試
  6-1 移除 SOP 精品示範入口卡
  6-2 完整走過 4 分區
  6-3 確認 R6 SOP 流程沒破壞
  6-4 確認 R5 採購 SOP 沒破壞
  → commit 同步更新 spec（標記全部完成）

剩餘總估：2.75 小時
```

---

# 📋 完成回報格式

```markdown
## R7 Phase X 完成回報

### 改動範圍（code）
- [x] ...

### Spec 同步（v2 新規則）
- [x] 已更新本 spec 的 Phase 進度追蹤表
- [x] 已修正過時措辭：（列出）
- [x] 同一個 commit 涵蓋 code + spec

### 偏差說明（如有）

### Commit hash

### Crown 驗收路徑
...
```

---

# 🎯 Demo 完成後的銷售中心 pitch

R7 完成後，春酒銷售中心的展示路徑：

```
1. 「打開銷售中心」
   → 進入「狀態追蹤」首頁
   → KPI + 待辦清單
   → 「業務一打開系統就知道今天要做什麼」

2. 「切到工作站」
   → 4 個作業（國內銷售可用）
   → 「點國內銷售就進入 SOP 流程」

3. 「跑 SOP 流程」
   → 進 R6 9 step 完整 demo
   → 5 分鐘成交一單

4. 回到狀態追蹤
   → 「剛剛這單會出現在『銷售待出貨』裡」

5. 切「單據管理」
   → 7 種單據分類

6. 切「客戶維護」
   → 3 個維護功能（依角色使用）
```

---

# 🚀 開工

R7 Phase 3 起：程式碼改動 + spec 同步更新 = 一個 commit。

讓 spec 永遠是「現在式」，跨時空的你我都讀到最新真相。

開工！🫡
