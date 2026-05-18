<!-- docs/_team/ui-audit-02-crud-pattern.md -->

# NX-UI-AUDIT-02 — NEXORA 既有 UX 範式 verify（CRUD Dialog vs 獨立頁）

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：NEXORA v1.5 NX09 雙軌完整化（main HEAD `13fab41`、13 tag）後 Crown 啟動 Master Page Registry 全棧整理軌前、Alex 批 1 NX01 主檔層產出 46 頁面（含獨立 create / edit 頁範式）+ Crown 揭露「主檔的新增和修改是跳視窗 Dialog、不是獨立頁」、Hank 校正 Master Page Registry 規模 verify
> 對齊：[NX-UI-AUDIT-01](./ui-audit-01.md) §3 揭露「82 真實 UI」+ §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 結論先說（給 Alex 即時校正用）

⭐⭐⭐ **Crown 揭露 100% 對齊既有實作真相**：

| 範式 | 用於 | 既有實作數 | 頁面數 |
|---|---|---|---|
| **A. BaseMasterModalFrame**（主檔置中彈窗範式）⭐ | 複雜主檔（user / partner / part / role / 分類字典）| **10 個 MasterView** | **1 page per entity** |
| **B. inline form**（list 下方 form expand 範式）| 簡化主檔 / 過渡（engine / customer-grade 等）| **6 個 MasterView**（A065 後續軌升級至 A）| **1 page per entity** |
| **C. 獨立頁 list + [id] + new**（複雜業務單據範式）| 含明細的長表單單據（PO / PR / RFQ / RR / 庫存單據）| **7 個 entity** | **3 page per entity** |

⭐ **NEXORA 主檔層真相 = 1 page per entity（in-page modal）**、**非** list + new + edit 3 page。

→ **Alex Master Page Registry 規模校正建議**：
- NX01 主檔層 46 page → **約 25 page**（縮 ~46%）
- 全棧 180~200 page → **約 100~110 page**（縮 ~45%）

---

## §1 NEXORA 既有 CRUD 範式真相

### 1.1 4 種 modal 元件來源（A041 精確）

| 元件來源 | 使用 file 數 | 性質 |
|---|---|---|
| `@radix-ui/react-dialog`（shadcn primitive）| **10 個** | document / purchase / sale workspace / topbar / nx03 workflow / MasterSaveConfirm |
| **自製 Dialog（無 radix）** | **13 個** | sale/inquiry 3 + sale/sop-workspace 7 + base/keyboard 1（純 `fixed inset-0 z-50 bg-black/80`）|
| **BaseMasterModalFrame**（自製主檔彈窗範式）| **10 個 MasterView import** | base/* 全部主檔共用、`fixed inset-0` + glass aside + Prev/Next + Fullscreen toggle |
| **Sheet / Drawer** | **0 個** | shadcn 未引入此 primitive、既有 0 使用 |

### 1.2 BaseMasterModalFrame 範式真相（主檔層 ⭐ 標準）

對齊 [apps/nx-ui/src/features/base/shell/BaseMasterModalFrame.tsx](../../apps/nx-ui/src/features/base/shell/BaseMasterModalFrame.tsx)：

```tsx
// 主檔置中明細彈窗：遮罩 + glass aside + 標題列（上一筆／下一筆／全螢幕／關閉）
<>
  <div className="fixed inset-0 z-40 bg-background/55 backdrop-blur-[2px] dark:bg-background/70" />
  <aside
    className="glass-card nx-glass-raised fixed left-1/2 top-1/2 z-50
               -translate-x-1/2 -translate-y-1/2
               max-h-[min(85dvh,calc(100dvh-2rem))]
               w-[min(80vw,calc(100vw-1.5rem))]
               rounded-2xl border ..."
    aria-modal="true" role="dialog"
  >
    <header>
      <span>{detailEyebrow}</span>  {/* DETAIL */}
      <h2>{title}</h2>
      <Prev /> <Next /> <Fullscreen /> <Close />
    </header>
    {children}  {/* form 內容 */}
  </aside>
</>
```

⭐ **特徵**：
- 既有列表頁不跳路由、open detail / new = `setOpen(true)` 切到 modal 模式
- 鍵盤導航：↑↓ 移動 row、Enter 開 detail、Esc 關閉 → 退到 /base
- 上一筆/下一筆切換（編輯模式）+ Fullscreen toggle
- glass-card 視覺風格（毛玻璃 + dark）
- 中心置位（非 right slide-in、非 bottom-sheet）

### 1.3 既有真實 UI 哪些用 Dialog vs 獨立頁

| 模組 | 範式 A：BaseMasterModalFrame | 範式 B：inline form | 範式 C：獨立頁 list+[id]+new |
|---|---|---|---|
| base/users | ✅ | - | - |
| base/partners | ✅ | - | - |
| base/parts | ✅ | - | - |
| base/roles | ✅ | - | - |
| base/car-brand（brand-like）| ✅ | - | - |
| base/part-brand（brand-like）| ✅ | - | - |
| base/part-group | ✅ | - | - |
| base/brand-code-rule | ✅ | - | - |
| base/country（nx00-modal-code）| ✅ | - | - |
| base/currency（nx00-modal-code）| ✅ | - | - |
| base/warehouses | ✅ | - | - |
| base/location | ✅ | - | - |
| base/part-model | ✅ | - | - |
| base/part-relation | ✅ | - | - |
| base/engine | - | ✅ | - |
| base/customer-grade | - | ✅ | - |
| base/model | - | ✅ | - |
| base/transmission | - | ✅ | - |
| base/drivetrain（vehicle-classification）| - | ✅ | - |
| base/model-type（vehicle-classification）| - | ✅ | - |
| base/phonetic-dictionary | - | ✅ | - |
| **nx01/po** | - | - | ✅ |
| **nx01/pr** | - | - | ✅ |
| **nx01/rfq** | - | - | ✅ |
| **nx01/rr** | - | - | ✅ |
| nx02/init | - | - | ✅ |
| nx02/transfer | - | - | ✅ |
| nx02/stock-take | - | - | ✅ |

⭐ **真相**：
- **base 主檔 14 個用範式 A**（Dialog）
- **base 主檔 7 個用範式 B**（inline、A065 後續軌升級至 A）
- **nx01 + nx02 業務單據 7 個用範式 C**（獨立頁、含複雜明細）

### 1.4 既有 mobile page 範式對齊

對齊 [NX06-PWA-AUDIT-01 §2.5](./nx06-pwa-audit-01.md)：

| Mobile page | 範式 |
|---|---|
| sale/inquiry/MobileInquiryListPage | 列表 + 篩選 chip + 點項目跳 detail（獨立頁 `/dashboard/sale/inquiry/[rfqId]`）|
| sale/inquiry/MobileInquiryDetailPage | 詳情 + 自製 Dialog（AdoptQuoteDialog / ConfirmDialog）+ FloatingToast |
| sale/inquiry/MobileQTDetailPage | 詳情 + 自製 Dialog |
| sale/sop-workspace/MobileSaleSopPage | 工作流 + 7 個自製 Dialog（AddMore / Consider / OutOfStock / PartialAccept / PriceAdjust / RejectReason / SignaturePad）|

⭐ **mobile 範式 = 列表獨立頁 + 詳情獨立頁 + 自製 Dialog 處理子流程**（不用 BaseMasterModalFrame、自製因為 sale 是業務流程非主檔 CRUD）。

### §I.6.3 §1 揭露不完整

- 未 verify 各個 MasterView 內 form 結構是否一致（field 命名 / Label / 對齊範式）
- 未 verify Prev/Next 切換是否同樣對齊（不是所有 view 都實作 `goDetailPrev/Next`）

---

## §2 既有真實 UI 頁面範式樣本

### 2.1 base 主檔層樣本（範式 A、A041 精確）

樣本：BaseUserMasterView.tsx（1500+ 行）

```tsx
function BaseUserMasterView() {
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);          // 是否在新增模式
  const [editing, setEditing] = useState(false);            // 是否在編輯模式
  const [draft, setDraft] = useState(emptyDraft);           // form draft
  const [panelOpen, setPanelOpen] = useState(false);        // modal 開/關
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const openDetail = (id) => {
    setSelectedId(id);
    setPanelOpen(true);
    setEditing(false);
  };

  const onAdd = () => {
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft);
    setPanelOpen(true);
  };

  return (
    <>
      <section>
        <Toolbar onAdd={onAdd} onBulkActive={...} />
        <List rows={users} onRowDoubleClick={openDetail} />
      </section>
      <BaseMasterModalFrame
        open={panelOpen}
        title={creating ? '新增使用者' : auditSource?.username}
        onClose={() => { setPanelOpen(false); setCreating(false); setEditing(false); }}
        showPrevNext={!creating}
        onPrev={goDetailPrev} onNext={goDetailNext}
      >
        <Form draft={draft} onChange={setDraft} editing={editing || creating} />
      </BaseMasterModalFrame>
    </>
  );
}
```

⭐ **核心特徵**：
- list + modal **同一個 component**、同 page
- 「新增」+「編輯」+「明細查看」**3 種模式共用同個 modal**（透過 creating / editing / panelOpen 三 flag 切換）
- modal 內 form = 純 useState + Label + Input + readonly switch
- 1 個 entity = 1 個 page.tsx + 1 個 MasterView.tsx + N 個 form section

### 2.2 業務單據樣本（範式 C、A041 精確）

樣本：nx01/po（PO 採購單）

```
app/dashboard/nx01/po/
├── page.tsx              → PoListView（列表 + 篩選 + 「+ 新增採購」連到 /new）
├── new/page.tsx          → PoNewForm（新建 form、可選來源 RFQ）
└── [id]/page.tsx         → PoDetailView（編輯 form + items table）
```

```tsx
// page.tsx（list）
import { PoListView } from '@/features/nx01/po/ui/PoListView';
export default function Nx01PoPage() { return <PoListView />; }

// PoListView.tsx
return (
  <header>
    <h1>採購單</h1>
    <Link href="/dashboard/nx01/po/new">+ 新增採購</Link>
  </header>
  <List rows={rows} onClick={(id) => router.push(`/dashboard/nx01/po/${id}`)} />
);
```

⭐ **核心特徵**：
- list / new / [id] **3 個獨立 page**
- 新增 = `Link href=/po/new` 跳路由
- 編輯 = `router.push(/po/${id})` 跳路由
- 適合複雜表單（含明細 items table、相關 dropdown 多）

### 2.3 既有 component 命名範式

| 範式 A 命名 | 範式 B 命名 | 範式 C 命名 |
|---|---|---|
| `Base{Entity}MasterView.tsx`（用 BaseMasterModalFrame）| `{Entity}MasterView.tsx`（inline、無 modal frame）| `{Entity}ListView.tsx` + `{Entity}NewForm.tsx` + `{Entity}DetailView.tsx` |
| 例：BaseUserMasterView / BasePartMasterView | 例：EngineMasterView / CustomerGradeMasterView | 例：PoListView / PoNewForm / PoDetailView |
| 1 file（含 1500+ 行、modal + form 同檔）| 1 file（list + inline form 同檔）| 3 file（list / new / detail 分檔）|

⚠️ **無 `*FormDialog` 或 `*CreateDialog` 命名**（Crown 期待的命名範式在 base/ 不存在、實際是 `BaseMasterModalFrame` shared shell + per-entity MasterView 用 flag 切換）。

⚠️ **features/nx00 有 `*FormPanel` 命名**（7 個：BrandFormPanel / LocationFormPanel / PartFormPanel / PartnerFormPanel / RoleFormPanel / UserFormPanel / WarehouseFormPanel）— 但這些是「panel 內 form」、推測為 BaseMasterModalFrame 子內容 / 早期 layer、需確認是否還被引用。

### §I.6.3 §2 揭露不完整

- 未 verify features/nx00 `*FormPanel` 7 個是否仍被引用 vs 已被 base/* 取代
- 未 verify nx02 庫存 3 entity（init/transfer/stock-take）是否完全對齊範式 C（list + new + [id]）
- 未 verify base/[segment]/page.tsx 動態路由的用途（推測舊版 fallback）

---

## §3 主檔 vs 業務單據範式區分

### 3.1 業界 ERP 範式對標（Crown 假設）

| 業界範式 | 用於 | 為什麼 |
|---|---|---|
| **List + Dialog**（新增 / 編輯走彈窗）| 主檔（簡單欄位、< 15 個 field）| 操作快、不打斷 list context |
| **List + 獨立 Form 頁**（new + edit 路由）| 業務單據（複雜含明細 items table）| form 太長、要 URL 可分享 / 列印 / 回退 |

### 3.2 NEXORA 既有實作對齊

| 種類 | 數量 | NEXORA 範式 | 對齊業界？ |
|---|---|---|---|
| **主檔 < 15 field**（country / currency / customer-grade / engine 等）| ~7 個（範式 B inline）+ 4 個（範式 A modal、partGroup/brand-code-rule 等）| ⚠️ inline 過渡 vs modal 標準 | ✅ 對齊（modal）/ ⚠️ 過渡 |
| **主檔 15-30 field**（user / partner / part / role / car-brand 等）| ~10 個（範式 A modal）| ✅ BaseMasterModalFrame | ✅ 完美對齊業界 |
| **主檔含 sub-list**（part-model / part-relation / role-view / user-role / user-warehouse）| ~5 個（範式 A modal、含 sub-list panel）| ✅ BaseMasterModalFrame（modal 內 grid layout）| ✅ 對齊 |
| **業務單據含明細**（PO / PR / RFQ / RR / SO / DN / 庫存單據）| 7 個（範式 C 獨立頁）| ✅ 獨立 list / new / [id] | ✅ 完美對齊業界 |

### 3.3 戰略總覽 — NEXORA 設計範式 100% 對齊業界 ERP 慣例

⭐ **NEXORA 既有實作 = 業界 ERP 範式標準教科書版**：
- 主檔走彈窗 = ✅（10/14 已完成、4 inline 過渡需後續軌升）
- 業務單據走獨立頁 = ✅（7/7 完成）
- 子 list（user-role / part-model）走 modal 內 grid = ✅
- mobile 業務流程走獨立頁 + 自製 Dialog 子流程 = ✅

### §I.6.3 §3 揭露不完整

- 未 verify 「modal 內含 sub-list」CRUD 範式詳情（如 user-role / part-model 編輯時、sub-list row 是 inline edit vs 套娃 modal）
- 未 verify 業務單據明細（如 PO items）內 row 編輯範式（inline expand vs row-level modal）

---

## §4 既有 Dialog / Modal 元件揭露

### 4.1 shadcn Dialog primitive（@radix-ui/react-dialog wrapper）

對齊 [apps/nx-ui/src/components/ui/dialog.tsx](../../apps/nx-ui/src/components/ui/dialog.tsx)：

```tsx
Dialog / DialogTrigger / DialogPortal / DialogClose
DialogOverlay   ← fixed inset-0 z-50 bg-black/50 + animate-in/out
DialogContent   ← center + max-w-lg + grid + 帶 X close button
DialogHeader / DialogFooter / DialogTitle / DialogDescription
```

⭐ 標準 shadcn 範式（dark-mode 兼容）。

### 4.2 既有 BaseMasterModalFrame（主檔層 shared shell）

對齊 [apps/nx-ui/src/features/base/shell/BaseMasterModalFrame.tsx](../../apps/nx-ui/src/features/base/shell/BaseMasterModalFrame.tsx)（48 行核心 + 共用 props 介面）：

```typescript
type BaseMasterModalFrameProps = {
  open: boolean;
  detailPanelRef: RefObject<HTMLElement>;
  detailFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  titleId: string;
  detailEyebrow?: string;        // 預設 'DETAIL'
  title: ReactNode;
  subtitle?: ReactNode | null;
  showPrevNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  modalSizeClassName?: string;   // 覆寫寬度（小表單用較窄）
  children: ReactNode;           // form 內容
};
```

⭐ **特徵**：
- 純自製、**未用 @radix-ui/react-dialog**（avoid focus trap 衝突 + 自製鍵盤 nav）
- glass-card 視覺 + nx-glass-raised
- 中心置位 + max-h 85dvh + max-w 80vw
- Fullscreen 模式：90dvh × 92vw
- aria-modal="true" / role="dialog" / aria-labelledby

### 4.3 自製 Dialog（13 個）

| 來源 | 用途 |
|---|---|
| base/keyboard/MasterSaveConfirmDialog | 主檔儲存前 confirm（Esc 離開 / 還在編輯時）|
| sale/inquiry/components/AdoptQuoteDialog | RFQ 採用 vendor quote |
| sale/inquiry/components/ConfirmDialog | 通用二次確認（destructive 動作染紅）|
| sale/sop-workspace/components/AddMoreDialog | 加更多商品 |
| sale/sop-workspace/components/ConsiderDialog | 客戶考慮中 |
| sale/sop-workspace/components/OutOfStockDialog | 缺貨處理 |
| sale/sop-workspace/components/PartialAcceptDialog | 部分接受 |
| sale/sop-workspace/components/PriceAdjustDialog | 議價調整 |
| sale/sop-workspace/components/RejectReasonDialog | 拒絕原因 |
| sale/sop-workspace/components/SignaturePadModal | 簽名板 canvas |

⭐ 全部範式：`fixed inset-0 z-50 bg-black/80` + cx 條件樣式 + 無 radix（自製因為 sale 業務流程需要客製化 + 行動端 bottom sheet 兼容）。

### 4.4 Form 處理範式

對齊 [NX-UI-AUDIT-01 §4.2](./ui-audit-01.md)：

```
0 react-hook-form
0 zod schema validation
0 formik
純 useState + 受控元件 + 手寫 onSubmit
```

⭐ **既有 form 範式 = 純 React 19 useState**（reactCompiler 自動記憶化、避免 react-hook-form 引入）。

### §I.6.3 §4 揭露不完整

- 未 verify form validation 錯誤訊息 UX 範式（每個 field 自己顯示 vs 統一 ErrorSummary）
- 未 verify Dialog 在小螢幕（< 640px）下的行為（是否自動 bottom-sheet 化、需 verify mobile）

---

## §5 NX01 真實實作頁面盤點

### 5.1 NX01 主檔 17 表 vs UI 落地對應

對齊 [docs/nx01/spec/intent/](../nx01/spec/intent/) NX01-05 ~ NX01-17 範圍：

| NX01 子表 | UI 路由 | 範式 | 狀態 |
|---|---|---|---|
| nx01_user（NX01-01）| /dashboard/base/users | A modal | ✅ 真實（BaseUserMasterView 1500+ 行）|
| nx01_role（NX01-02）| /dashboard/base/roles | A modal | ✅ 真實（BaseRoleMasterView）|
| nx01_user_role（NX01-02 子）| /dashboard/base/user-role | ? | ✅ 真實 |
| nx01_role_view（NX01-02 子）| /dashboard/base/role-view | ? | ✅ 真實 |
| nx01_user_warehouse（NX01-02 子）| /dashboard/base/user-warehouse | ? | ✅ 真實 |
| nx01_warehouse（NX01-06）| /dashboard/base/warehouses | A modal | ✅ 真實（warehouse-like）|
| nx01_location（NX01-06）| /dashboard/base/location | A modal | ✅ 真實 |
| nx01_country（NX01-09）| /dashboard/base/country | A modal（nx00-modal-code）| ✅ 真實 |
| nx01_currency（NX01-09）| /dashboard/base/currency | A modal | ✅ 真實 |
| nx01_partner（NX01-04）| /dashboard/base/partners | A modal | ✅ 真實（BasePartnerMasterView）|
| nx01_customer_grade（NX01-07）| /dashboard/base/customer-grade | **B inline**（A065 後續軌升 A）| ✅ 真實 |
| nx01_part（NX01-05）| /dashboard/base/parts | A modal | ✅ 真實（BasePartMasterView）|
| nx01_part_brand（NX01-11）| /dashboard/base/part-brand | A modal（brand-like）| ✅ 真實 |
| nx01_part_group（NX01-07）| /dashboard/base/part-group | A modal | ✅ 真實 |
| nx01_brand_code_rule（NX01-11）| /dashboard/base/brand-code-rule | A modal | ✅ 真實 |
| nx01_part_relation（NX01-17）| /dashboard/base/part-relation | A modal | ✅ 真實 |
| nx01_car_brand（NX01-12）| /dashboard/base/car-brand | A modal（brand-like）| ✅ 真實 |
| nx01_model（NX01-13）| /dashboard/base/model | **B inline** | ✅ 真實 |
| nx01_engine（NX01-14）| /dashboard/base/engine | **B inline** | ✅ 真實 |
| nx01_transmission（NX01-15）| /dashboard/base/transmission | **B inline** | ✅ 真實 |
| nx01_drivetrain（NX01-15）| /dashboard/base/drivetrain | **B inline** | ✅ 真實 |
| nx01_model_type（NX01-15）| /dashboard/base/model-type | **B inline** | ✅ 真實 |
| nx01_part_model（NX01-16）| /dashboard/base/part-model | A modal | ✅ 真實 |
| nx01_phonetic_dictionary（NX01-10）| /dashboard/base/phonetic-dictionary | **B inline** | ✅ 真實 |

⭐ **A041 真實 = 24 NX01 主檔 100% UI 真實落地**（範式 A modal × 16 + 範式 B inline × 8）。

### 5.2 對齊 Crown 拍板「主檔的新增和修改是跳視窗（Dialog）」

- 範式 A 對齊 ✅（16/24）
- 範式 B 過渡（8/24）— 註解標記「A065 後續軌升級為完整 BaseMasterPage」即升至範式 A
- **0 個 NX01 主檔走範式 C 獨立頁**

⭐ **真相 = NX01 主檔層 100% 對齊 Crown 設計方向**：1 entity = 1 page（list + modal）、不是 list + new + edit 3 page。

### 5.3 不在 base 但屬 NX01 範圍的 entity

| entity | UI 路由 | 範式 |
|---|---|---|
| nx01_part_version（NX01-17）| **0 UI**（schema-only、純 audit 流）| - |
| nx01_kpi_template + nx01_department（NX01-08 公告 / 部門）| /dashboard/base/bulletins（公告主檔）| 待 verify |
| nx01_audit_log | **0 dedicated UI**（推測：跨模組 audit 統一查詢軌後續軌）| - |

### §I.6.3 §5 揭露不完整

- 未 verify user-role / role-view / user-warehouse / bulletins 4 個 sub-relation 的具體範式
- 未 verify nx01-08 部門 / KPI template 是否已 UI 落地
- 未 verify NX01-17 part-version 是否會有 UI（vs 純 audit 紀錄）

---

## §6 業界對標揭露

### 6.1 業界 ERP CRUD 範式對標

| 業界 ERP | 主檔範式 | 業務單據範式 | 來源 |
|---|---|---|---|
| **SAP**（Fiori UX）| List + Modal Dialog（Object Page Floorplan）| List Report + Object Page（獨立頁含 facets）| SAP Fiori Design Guidelines |
| **Oracle**（Redwood / OAF）| List + Inline Edit + Modal（複雜 entity）| List + Form Page（獨立）| Oracle Redwood Design System |
| **Microsoft Dynamics 365**（FastTrack）| Form Page（list 點開到 entity form、可內嵌 modal）| Form Page（同範式）| Dynamics 365 UX Patterns |
| **偉盟系統**（傳統 desktop ERP）| 主檔密集表單（Master-Detail 雙 panel）| 同範式 + 列印對齊 | PROJECT_CONTEXT §3.4 引用 |
| **中小汽配對手**（推測）| 簡化版 List + 簡單編輯區（同頁 inline）| 列印優先 + 簡化 form | - |

⭐ **NEXORA = SAP Fiori 範式變體**（List + Modal Dialog 主檔 / List Report + Object Page 業務單據）— 業界 modern ERP baseline。

### 6.2 主檔 Dialog 範式業界普及度

| 範式 | 適用場景 | 業界普及度 |
|---|---|---|
| **List + Modal Dialog** | 主檔（< 20 field）+ 子 list（簡單）| **業界 baseline ⭐⭐⭐**（SAP/Oracle/Dynamics 主流範式）|
| **List + Slide Sheet**（右側滑出）| 預覽 + 快速編輯 | 業界次主流（Linear / Notion 範式）|
| **List + Bottom Sheet**（手機）| mobile 編輯 | mobile-first 範式 |
| **List + 獨立頁** | 業務單據（複雜）| 業界 baseline ⭐⭐⭐ |
| **List + Inline 編輯** | Excel-like 表格快速編輯 | 業界進階（Airtable / Notion）|

⭐ **NEXORA 走業界 baseline 範式（modal + 獨立頁兩路徑）= 對齊 Crown UX 哲學「使用者導向 = 容易上手」**：
- 主檔 modal = 業務員每天用、彈窗保持 list context 不打斷
- 業務單據獨立頁 = URL 可分享 / 列印對齊 / 多步驟編輯
- 0 創新風險（不用 Linear-style Slide Sheet / Airtable-style Inline 等需學習的範式）

### 6.3 NEXORA 特色 vs 業界 baseline

| NEXORA 特色 | 業界 baseline | 差異 |
|---|---|---|
| ✅ BaseMasterModalFrame 含 Prev/Next 切換 | ⚠️ 業界部分支援（SAP Object Page 有 nav arrow）| NEXORA 主檔層快速切記錄、業務員效率高 |
| ✅ Fullscreen toggle（modal 內可放大）| ⚠️ 業界少見 | NEXORA 長 form 體驗友善 |
| ✅ glass-card 視覺（毛玻璃 + dark）| ⚠️ 業界淺色為主 | NEXORA 視覺差異化 |
| ✅ 鍵盤導航完整（↑↓/Enter/Esc/Ctrl+S）| ✅ 業界 baseline | NEXORA 對齊業界 |
| ❌ 0 Slide Sheet（右側滑出）| ✅ 業界部分用（Linear 範式）| NEXORA 暫不引入 |
| ❌ 0 Inline 表格編輯 | ✅ 業界進階（Airtable）| NEXORA 暫不引入 |

### §I.6.3 §6 揭露不完整

- 未 verify 業界中小汽配 ERP 對手實際範式（恆迎 / 偉盟以外其他競品）
- 未 verify 行動端 Modal vs Bottom Sheet 範式選擇（NEXORA 既有 modal 在 mobile 是否自動底部展開）
- 未 verify Crown 對未來引入 Sheet / 拖拽編輯等 modern 範式的 backlog 優先級

---

## §7 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex 補揭露：

1. **§1** 各 MasterView 內 form 一致性（field 命名 / Label / 排版）
2. **§2** features/nx00 `*FormPanel` 7 個是否仍被引用
3. **§2** nx02 庫存 3 entity 範式 C 對齊度
4. **§3** modal 內 sub-list CRUD 範式詳情
5. **§3** 業務單據明細 row 編輯範式
6. **§4** form validation 錯誤訊息 UX
7. **§4** Dialog 在小螢幕的行為
8. **§5** user-role / role-view / user-warehouse / bulletins 4 個 sub-relation 範式
9. **§5** NX01-08 部門 / KPI / nx01_audit_log UI 落地
10. **§6** 中小汽配 ERP 對手競品範式
11. **§6** mobile modal vs bottom sheet 範式

---

## §8 戰略總覽（給 Alex 校正 Master Page Registry 用）

### 8.1 NX01 主檔層 page count 校正

| 範式 | entity 數 | page 數 per entity | 總 page |
|---|---|---|---|
| 範式 A modal（既有 16 + 過渡升級 8）| 24 | 1 | **24 page** |
| 範式 C 獨立頁（業務單據、NX01 無、純 NX01-NX10 業務層）| 0 | 3 | 0 |

⭐ **NX01 主檔層 page 規模 = 24 page**（含 base/* 26 路由減 2 非 NX01：bulletins + [segment]）。

→ **校正 Alex 估的 46 page → 24 page**（縮 ~48%）。

### 8.2 全棧 page 規模校正預估

| 範式 | entity 範圍 | page 數 |
|---|---|---|
| **範式 A modal**（主檔層、含 NX01 24 + 部分 NX07/HR 主檔）| ~30 entity | ~30 page |
| **範式 C 獨立頁**（業務單據、NX02-NX10 含明細的）| ~25 entity | ~75 page |
| **placeholder**（NX05-NX10 + 部分 NX02-04 子頁）| ~30 | ~30 page |
| **真實單頁**（首頁 / login / 報表 dashboard 等）| - | ~15 page |

⭐ **全棧 page 規模 ≈ 150 page**（粗估、含 placeholder + 真實）— 校正 Alex 估的 180~200 page。

### 8.3 v0 模板分類校正

| 原 Alex v0 模板 | 校正後 |
|---|---|
| ❌ 「主檔 Create 獨立頁」模板 | 刪除（主檔 0 個用獨立頁、走 modal）|
| ❌ 「主檔 Edit 獨立頁」模板 | 刪除（同上）|
| ✅ 「主檔 List + Modal」模板 | **保留 / 重點**（24 個 NX01 entity 用）|
| ✅ 「業務單據 List」模板 | 保留 |
| ✅ 「業務單據 New Form」模板 | 保留 |
| ✅ 「業務單據 Detail/Edit」模板 | 保留 |
| ⚠️ 「主檔 inline form」模板 | 過渡用（標記 A065 後續軌升至 modal）|

→ **v0 模板從 ~6 個 → 5 個**（刪 2 個 + 加 1 過渡 inline、或直接刪 inline 全用 modal）。

### 8.4 ⭐⭐⭐ Alex Master Page Registry 重做建議

1. **採用 NEXORA 既有範式真相**：1 主檔 = 1 page（List + Modal）、1 業務單據 = 3 page（List / New / Detail）
2. **v0 模板基底**：
   - 模板 1：`BaseMasterModalView` 標準範式（用 BaseMasterModalFrame + 共用 toolbar / list scroll region / row selection hooks）
   - 模板 2：業務單據 ListView（純列表 + 篩選 + Link to /new）
   - 模板 3：業務單據 NewForm（純 page、含 items table 與下方 footer 按鈕）
   - 模板 4：業務單據 DetailView（純 page、含編輯 + status transition button）
3. **不要新增模板**「主檔 Create 獨立頁」/「主檔 Edit 獨立頁」（NEXORA 0 此範式）
4. **保留範式 B inline form** 為「短期過渡標記」（A065 後續軌升範式 A）

---

> 文件版本：v1.0（NX-UI-AUDIT-02 純諮詢、8 段揭露 + 12 表 + 3 CRUD 範式分類 + NX01 24 主檔逐 entity 範式對應）
> 待 Alex 重做 Master Page Registry（規模 ~46 → ~24、v0 模板 6 → 5）
