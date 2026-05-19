<!-- docs/_team/task-master-data-center-audit.md -->

# TASK-MASTER-DATA-CENTER-AUDIT — 主檔中心真相 verify

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-19
> 觸發：Crown 戰略「主檔中心優先測試」+ Alex 預備產 NEXORA_主檔中心測試報告 v1.0 docx + Crown 揭露三版本可見性需區分
> 對齊：[NX-UI-AUDIT-02 CRUD pattern](./ui-audit-02-crud-pattern.md) §5 + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 結論先說（給 Alex 寫 v1.0 測試報告基底）

### A041 真實量級揭露

```
base 路由（apps/nx-ui/src/app/dashboard/base/*）  → 25 entity（含 [segment] 動態 + 25 entity subdir）
master-cards.ts hub 卡片                          → 14 cards（其中 2 雙入口 = 18 access points）
hub 卡片涵蓋 entity                                → 18 個
⚠️ 未在 hub 卡片但路由存在 entity                  → 7 個
NX01 schema 主檔 model                            → 25 個（已 UI 真實落地）
NX99 plan schema                                  → 3 plan (LITE / PLUS / PRO) + tier (S/M/L/XL)
```

### 5 重大揭露

1. ⚠️ **7 個「後加入主檔」未在 hub 卡片**（customer-grade / engine / model / transmission / drivetrain / model-type / phonetic-dictionary）— **對應 Crown「所有後來加入新增或修改主檔案都補上」拍板**
2. ⚠️ **三版本可見性 = backend 0 鎖 / frontend 0 gate**（schema 25 主檔全 LITE 起、master-cards.ts 0 version metadata）
3. ⚠️ **既有 5 分區 vs 7 個 NX01-13~16 字典主檔分類缺**（vehicle-classification 子表無歸宿）
4. ✅ **dual entry card 範式既有**（brand-masters / warehouse-location 各含 2 link）
5. ⭐ **Nx99Plan + Nx99ProductModule + Nx99ProductModuleMap 三表 schema 已備**（業界 SaaS 版本 gate baseline、frontend 未對齊使用）

---

## §1 主檔中心當前全主檔清單

### 1.1 既有 5 分區 hub 卡片（14 cards / 18 access points）

對齊 `apps/nx-ui/src/features/base/config/master-cards.ts`：

| section | card id | title | 路由 | 卡片類型 |
|---|---|---|---|---|
| **account（帳號與權限）**| user | 使用者 | /base/users | single |
| account | role | 職務主檔 | /base/roles | single |
| account | user-role | 使用者職務設定 | /base/user-role | single |
| account | user-warehouse | 使用者據點設定 | /base/user-warehouse | single |
| account | role-view | 職務權限設定 | /base/role-view | single |
| **product（產品與料號）**| part | 零件主檔 | /base/parts | single |
| product | brand-masters | 汽車／零件廠牌（雙入口）| /base/car-brand + /base/part-brand | **dual** |
| product | part-group | 零件族群主檔 | /base/part-group | single |
| product | brand-code-rule | 品牌料號規則 | /base/brand-code-rule | single |
| product | part-relation | 零件關聯 | /base/part-relation | single |
| product | part-model | 料件車型適配 | /base/part-model | single |
| **organization（組織架構）**| warehouse-location | 倉庫+庫位（雙入口）| /base/warehouses + /base/location | **dual** |
| **partner（交易對象）**| partner | 廠商/客戶 | /base/partners | single |
| **system（系統設定）**| country | 國家主檔 | /base/country | single |
| system | currency | 幣別主檔 | /base/currency | single |
| system | bulletin | 公告主檔 | /base/bulletins | single |

⭐ **5 分區涵蓋 14 hub 卡片 / 18 access points**：
- account 5 / product 6 / organization 1（dual）/ partner 1 / system 3

### 1.2 ⚠️ 7 個「未在 hub」但路由存在的主檔

對應 Crown「所有後來加入新增或修改主檔案都補上」拍板：

| 主檔 | 路由 | NX01 spec | 對應 schema | 加入時間（推測）|
|---|---|---|---|---|
| customer-grade | /base/customer-grade | NX01-07 | Nx01CustomerGrade | NX01-IMPL（middle）|
| **engine** | /base/engine | NX01-14 | Nx01Engine | NX01-IMPL（late）|
| **model** | /base/model | NX01-13 | Nx01Model | NX01-IMPL（late）|
| **transmission** | /base/transmission | NX01-15 | Nx01Transmission | NX01-IMPL（late）|
| **drivetrain** | /base/drivetrain | NX01-15 | Nx01Drivetrain | NX01-IMPL（late）|
| **model-type** | /base/model-type | NX01-15 | Nx01ModelType | NX01-IMPL（late）|
| phonetic-dictionary | /base/phonetic-dictionary | NX01-10 | Nx01PhoneticDictionary | NX01-IMPL（middle）|

⚠️ **7 個全部已有真實 UI**（[NX-UI-AUDIT-02 §5.1](./ui-audit-02-crud-pattern.md) verify、含 6 inline form + 1 modal）、但 hub 卡片 0 入口、業務員需透過 URL 或 menu 直接訪問。

### 1.3 統計（A041 精確）

```
NEXORA 當前使用者面對主檔：25 個
  ├─ hub 卡片涵蓋：18 個（72%）
  └─ ⚠️ hub 卡片未涵蓋：7 個（28%）

NX01 schema model 總：46 個（含 8 個業務子檔如 KpiTemplate/BulletinAttachment 等非直接主檔）
業務員面對主檔（base/* 路由）：25 個 ⭐
```

### §I.6.3 §1 揭露不完整

- 未 verify NX02-NX10 模組是否有「使用者面對主檔」（推測有：NX07 員工 / NX02 廠商等、但分散在各業務模組首頁、不在 base 主檔中心）
- 未 verify base/[segment]/page.tsx 動態路由是否還有額外主檔（推測為 fallback）
- 未 verify nx02/vendor + nx04/customer placeholder 是否與 base/partners 重疊

---

## §2 既有 5 分區校正建議

### 2.1 既有分區評估

| 分區 | 既有 cards | 業界 ERP 範式對齊 | 建議 |
|---|---|---|---|
| account | 5（user/role/user-role/user-warehouse/role-view）| ✅ 對齊「身分權限管理」業界範式 | 保留 |
| product | 6（part + brand-masters dual + group + rule + relation + model）| ✅ 對齊「商品與分類」業界範式 | ⚠️ 補車型字典 5 個（engine/model/transmission/drivetrain/model-type）|
| organization | 1（warehouse-location dual）| ⚠️ 偏窄（業界含部門 / 團隊 / 據點 3 維）| ⚠️ 後續補 department / team（NX01 schema 已備）|
| partner | 1（partner 統一管廠商+客戶）| ✅ NEXORA 創新（業界多分廠商/客戶 2 個）| 保留、揭露補 customer-grade 在此 |
| system | 3（country/currency/bulletin）| ⚠️ 混淆（country/currency = 主檔常數、bulletin = 內容管理）| ⚠️ 建議拆「常數設定」+「內容管理」|

### 2.2 推薦校正方案（給 Alex v1.0 報告 + Crown 拍板）

#### 方案 A（最小校正）：補 7 missing + 不調分區

| 補卡片 | 建議 section |
|---|---|
| customer-grade | partner（客戶分級 → 交易對象的進階屬性）|
| engine | product（引擎主檔 → 車型字典屬商品層）|
| model | product |
| transmission | product |
| drivetrain | product |
| model-type | product |
| phonetic-dictionary | system（注音檢索 → 系統設定）|

→ **product 從 6 → 11 cards**、system 從 3 → 4 cards、partner 從 1 → 2 cards。

#### 方案 B（5 → 6 分區、加「車型字典」獨立區）

對應 NX01-13~16 vehicle-classification 子規格群、業界改革候選：

```
account / product / vehicle-dictionary / organization / partner / system
                    ↑ 新區
                    含 engine / model / transmission / drivetrain / model-type
```

⭐ **業界改革候選**：中小汽配 ERP **「車型字典」獨立分區**業界罕見（多數混在商品內）、NEXORA 提升業務員 muscle memory。

#### 方案 C（業界 SaaS 7 分區）

```
account / product / vehicle / organization / partner / system / integration
                                                                  ↑ 後續軌（整合設定：API key / webhook / 第三方）
```

⭐ **方案 C** 為未來預留 NX99 整合（如 Lalamove / NHTSA / Web Push 等 secrets 管理）。

### 2.3 推薦 Hank 業界 muscle memory

⭐ **推薦 方案 B**：
- 補 7 missing
- 加「車型字典」獨立分區（中小汽配特色、業界改革 #22 候選）
- partner 補 customer-grade（最自然歸宿）
- system 補 phonetic-dictionary
- 6 分區 = account / product / vehicle / organization / partner / system

⚠️ **若 Crown 拍 方案 A**（不調分區）也合理（最低改動、補 7 完成）。

### §I.6.3 §2 揭露不完整

- 未 verify Crown 對「車型字典分區」業界改革等級拍板（⭐⭐ vs ⭐⭐⭐）
- 未 verify partner 統一卡片內部如何拆「廠商/客戶」filter（既有 base/partners 用 partnerType='C'/'V' 區分）

---

## §3 LITE / PLUS / PRO 三版本可見性真相 ⭐⭐⭐

### 3.1 ⚠️ schema 真相：25 主檔全 LITE 起、0 PLUS / PRO 鎖

對齊 `packages/db-core/prisma/schema.prisma` grep 結果：

```
Nx01User / Role / UserRole / UserWarehouse / RoleView / Bulletin     → 全 LITE
Nx01Part / CarBrand / PartBrand / PartGroup / BrandCodeRule          → 全 LITE
Nx01PartRelation / PartModel / Engine / Model / Transmission         → 全 LITE
Nx01Drivetrain / ModelType / PhoneticDictionary                       → 全 LITE
Nx01Country / Currency / Warehouse / Location                         → 全 LITE
Nx01Partner / CustomerGrade                                            → 全 LITE-CORE
```

⭐ **意涵**：backend 沒鎖、所有主檔 LITE 即可用。

### 3.2 frontend 範式：master-cards.ts 0 version metadata

對齊 grep：master-cards.ts **0 `LITE` / 0 `PLUS` / 0 `PRO` 字串**、`MasterHubCard` type **無 minPlan 欄位**。

⭐ **意涵**：UI 不依 plan 切換顯示。

### 3.3 既有 plan 機制揭露

對齊 `apps/nx-ui/src/shared/lib/plan-plus-support.ts`：

```typescript
planSupportsNx02PlusFeatures(planCode) {
  return p === 'PLUS' || 'PRO' || 'NEXORA-PLUS' || 'NEXORA-PRO' || 'NEXORA-ENTERPRISE';
}
```

⭐ 只 NX02 庫存（init / transfer / stock-take）有 plan gate、其他模組 0 gate。

### 3.4 Nx99 schema 三表 baseline 已備（業界 SaaS 範式 ready）

對齊 schema：

| Model | 用途 |
|---|---|
| `Nx99Plan` | 方案定義（LITE/PLUS/PRO 各一筆、含 levelNo / baseFeeMonth / seatFeeMonth / tier 等）|
| `Nx99ProductModule` | 產品模組（每個功能模組）|
| `Nx99ProductModuleMap` | Plan ↔ ProductModule 多對多（誰能用哪個模組）|
| `Nx99Subscription` + `SubscriptionItem` | 租戶訂閱 |

⭐ **業界 SaaS baseline 完整 schema 但 frontend 未對齊使用**（master-cards.ts 沒 query / 沒 minPlan metadata）。

### 3.5 三版本可見性建議（給 Alex v1.0 報告）

#### 範式 A（建議、業界 SaaS 標準）：版本鎖 + Upgrade prompt

```typescript
type MasterHubCard = {
  // ... existing fields
  minPlan?: 'LITE' | 'PLUS' | 'PRO';  // 預設 LITE（不寫=LITE）
};

// hub page 邏輯：
// - 卡片渲染：依 minPlan 判斷
//   * 當前 plan ≥ minPlan → 正常顯示
//   * 當前 plan < minPlan → 顯示「鎖定 ✦ Upgrade to PLUS」灰階卡片
```

UI 範式：
```
┌─────────────────────────┐    ┌─────────────────────────┐
│ 🔓 客戶分級              │    │ 🔒 客戶分級（PLUS）     │
│ 客戶等級與毛利區間管理   │    │ 升級至 PLUS 啟用此功能  │
│                          │    │ [升級方案 →]           │
└─────────────────────────┘    └─────────────────────────┘
   ↑ PLUS / PRO 使用者          ↑ LITE 使用者
```

#### 範式 B（簡化、初期）：純標籤、不鎖

```
┌─────────────────────────┐
│ 客戶分級  [PLUS] 🏷️     │
│ 客戶等級與毛利區間管理   │
└─────────────────────────┘
```

純顯示版本要求、不阻擋（all-or-nothing UX）。

#### 範式 C（NEXORA 既有真相）：全部顯示、無版本資訊

⚠️ 既有現況：所有 plan 看到相同卡片、business 上 NEXORA 25 主檔全 LITE 開放。

### 3.6 Hank 推薦三版本可見性對應

⭐ **Hank 推薦**（假設 Crown 想做版本差異化）：

| 主檔 | LITE | PLUS | PRO | 理由 |
|---|---|---|---|---|
| user / role / user-role / role-view | ✅ | ✅ | ✅ | 帳號權限是基礎、所有版本 |
| user-warehouse | ✅ | ✅ | ✅ | 同上 |
| bulletin | ✅ | ✅ | ✅ | 公告基礎 |
| part / part-group | ✅ | ✅ | ✅ | 料件基礎 |
| brand-masters（car/part-brand）| ✅ | ✅ | ✅ | 品牌基礎 |
| brand-code-rule | ⚠️ | ✅ | ✅ | 進階料號規則（LITE 用預設）|
| part-relation | ❌ | ✅ | ✅ | 零件關聯 PLUS+（業界中小無此功能）|
| part-model（料件車型適配）⭐ | ❌ | ✅ | ✅ | 業界改革核心、PLUS+ 才解鎖 |
| **engine / model / transmission / drivetrain / model-type** | ❌ | ✅ | ✅ | 車型字典 PLUS+（30 年知識結構化）|
| country / currency | ✅ | ✅ | ✅ | 國際基礎 |
| warehouse-location | ✅ | ✅ | ✅ | 倉儲基礎 |
| partner | ✅ | ✅ | ✅ | 交易對象基礎 |
| customer-grade | ⚠️ | ✅ | ✅ | 客戶分級 PLUS+（LITE 用統一價）|
| phonetic-dictionary | ❌ | ❌ | ✅ | 注音檢索 PRO（高階搜尋）|

⭐ **Crown 拍板題**：是否啟動三版本差異化、或全部 LITE 開放？

### §I.6.3 §3 揭露不完整

- 未 verify Nx99Plan 既有 seed 資料（LITE/PLUS/PRO 是否真有 3 筆 row、價格設定）
- 未 verify Nx99ProductModuleMap 既有 seed（哪些模組 map 給哪個 plan）
- 未 verify Crown 對「版本差異化策略」拍板（業界改革 vs 簡化）

---

## §4 主檔卡片視覺資訊

### 4.1 既有卡片元素（A041 精確）

對齊 `MASTER_HUB_CARDS` type：

```typescript
type MasterHubCard = {
  id: string;
  section: 'account' | 'product' | 'organization' | 'partner' | 'system';
  title: string;          // 「使用者」「職務主檔」等
  description: string;    // 「帳號、聯絡方式與啟用狀態」
  icon: LucideIcon;       // lucide-react 圖示
  statLabel: string;      // 「啟用帳號」「職務項目」
  statValue: string;      // 「42 筆」或「—」（API 覆寫）
  href?: string;          // single entry
  links?: MasterHubCardLink[];  // dual entry
};
```

⭐ 5 元素：圖示 + 標題 + 說明 + 統計 label + 統計 value。

### 4.2 ❌ 無「版本標籤」既有顯示

對齊 grep：master-cards.ts **0 `LITE` / 0 `PLUS` / 0 `PRO` / 0 `badge` / 0 `version`**。

### 4.3 業界 SaaS 範式建議

#### 業界 SaaS hub 卡片元素標配

| 元素 | NEXORA | Notion | Linear | Salesforce |
|---|---|---|---|---|
| 圖示 | ✅ | ✅ | ✅ | ✅ |
| 標題 | ✅ | ✅ | ✅ | ✅ |
| 說明 | ✅ | ✅ | ✅ | ✅ |
| 統計（count / 數字）| ✅ | ⚠️ | ⚠️ | ✅ |
| **版本標籤**（PLUS/PRO badge）| ❌ | ✅ | ✅ | ✅ |
| **最近使用** | ❌ | ✅ | ✅ | ❌ |
| **快捷動作**（+ 新增）| ❌ | ✅ | ✅ | ✅ |
| **狀態指示**（⚠️ 待處理 N 個）| ❌ | ⚠️ | ⚠️ | ✅ |

⚠️ NEXORA 缺：版本標籤 / 最近使用 / 快捷動作 / 狀態指示 = 4 業界 baseline 元素。

#### 推薦版本標籤範式

```tsx
<MasterHubCard
  title="客戶分級"
  description="客戶等級與毛利區間管理"
  badge={{ text: 'PLUS', tone: 'plus' }}  // 'lite' / 'plus' / 'pro'
/>
```

UI 視覺：
```
┌───────────────────────────┐
│ 🏷️ 客戶分級  [PLUS]       │  ← 標題右側小 badge（business value 揭露）
│ 客戶等級與毛利區間管理     │
│ 12 筆                     │
└───────────────────────────┘
```

### §I.6.3 §4 揭露不完整

- 未 verify hub 卡片 statValue「42 筆」「—」實際 API 覆寫範式（page 是否 fetch 每個 entity count？）
- 未 verify 卡片在 mobile vs 桌面 layout 差異（既有 MobileSectionTabs）

---

## §5 主檔層級關係

### 5.1 既有依賴關係（A041 schema FK grep）

#### account 區（5 主檔依賴鏈）

```
Nx01User ──┬─→ Nx01UserRole ←── Nx01Role
           ├─→ Nx01UserWarehouse ←── Nx01Warehouse
           └─→ Nx01RoleView ←── Nx01Role + Nx01View
```

⚠️ **依賴鏈**：要設使用者職務、先建 role；要設使用者據點、先建 warehouse；要設職務權限、先建 role + view。

#### product 區（6 主檔依賴鏈）

```
Nx01Part ──→ FK：Nx01PartGroup（required）
                Nx01CarBrand（透過 BrandCodeRule）
                Nx01Country
                
Nx01BrandCodeRule ──→ FK：Nx01PartBrand / Nx01CarBrand
                       
Nx01PartRelation ──→ FK：Nx01Part × 2

Nx01PartModel ──→ FK：Nx01Part + Nx01Model

Nx01Model ──→ FK：Nx01CarBrand + Nx01Engine + Nx01Transmission + Nx01Drivetrain + Nx01ModelType
```

⚠️ **product 區依賴最複雜**：要建 Part、需先建 PartGroup + CarBrand + PartBrand + BrandCodeRule + Country；要建 Model（車型）、需先建 CarBrand + Engine + Transmission + Drivetrain + ModelType。

#### partner 區

```
Nx01Partner ──→ FK：Nx01Country / Nx01Currency / Nx01CustomerGrade
                + Nx01PartnerBillingAddress / ShippingAddress
```

### 5.2 業界 ERP 依賴關係展示範式

| 範式 | 業界例 | NEXORA 既有 |
|---|---|---|
| **依賴順序排序**（hub 卡片排序）| SAP Fiori | ✅ section 內無明確排序 |
| **依賴提示**（「需先建 X」）| Oracle | ❌ 0 |
| **依賴 graph 視覺**（mind map）| 進階 ERP | ❌ 0 |
| **缺失依賴 warning**（「3 個料件未指定品牌」）| 業界普及 | ❌ 0 |
| **建議建檔順序教學**（onboarding wizard）| SaaS 業界 | ❌ 0 |

⚠️ NEXORA 既有 hub 純列卡片、無依賴關係視覺。

### 5.3 推薦展示範式

#### 範式 A（簡單、建議）：依賴順序排卡片

```
account 區：
  1. user        ← 基礎
  2. role        ← 基礎
  3. user-role   ← 依賴 user + role
  4. user-warehouse  ← 依賴 user + warehouse
  5. role-view   ← 依賴 role + view

product 區：
  1. brand-masters（car-brand + part-brand）← 最基礎
  2. country / currency ← 國際基礎（system 區）
  3. part-group  ← 第二層
  4. brand-code-rule  ← 依賴 brand-masters
  5. part        ← 依賴 group + brand + country
  6. part-relation / part-model ← 依賴 part
```

#### 範式 B（進階、業界改革）：依賴 hint 標籤

```tsx
<MasterHubCard
  title="使用者職務設定"
  dependsOn={['user', 'role']}  // tooltip 提示「需先建 使用者 + 職務」
/>
```

#### 範式 C（onboarding wizard）：新租戶引導

⭐ 業界 SaaS 範式（Salesforce / HubSpot onboarding）：
1. 開戶時引導 5 步驟「建第一個 user / role / warehouse / part-group / part」
2. 依依賴順序 walk-through
3. NEXORA 未有 onboarding wizard

### §I.6.3 §5 揭露不完整

- 未 verify NEXORA 既有是否有 onboarding flow（推測 0、新租戶直接進主檔自己摸）
- 未 verify base/[segment]/page.tsx 是否已實作部分依賴提示

---

## §6 業界改革候選承載

### 6.1 NEXORA 業界改革候選累積（A041 grep docs）

| # | 候選 | 落地軌 | 狀態 |
|---|---|---|---|
| #17 | 手機介面 = NEXORA 亮點 | TASK-LOGIN-MOBILE-PLANET-FIX | ✅ V2 |
| #18 | 大小寫無關（多租戶識別）| AU-001 backend `mode: 'insensitive'` | ✅ AUTH-ERROR-CODE |
| #19 | 錯誤代碼制度 ⭐⭐⭐ | TASK-AUTH-ERROR-CODE | ✅ v1.5.0 落地 |
| #20 | 信箱驗證門檻 | （Crown 揭露）| 🔵 後續軌 |
| **#21** | **UI 縮放偏好** | （Crown 上輪揭露）| 🔵 規劃中 |
| **#22 候選** | **主檔分區範式 + 版本可見性** | （本 audit 揭露）| ⚠️ Crown 拍板 |

### 6.2 主檔中心適合承載的業界改革

#### ⭐⭐⭐ 候選 #22：主檔分區範式 + 三版本可見性 + 車型字典獨立分區

| 元素 | 業界 SaaS 對標 | NEXORA 改革點 |
|---|---|---|
| **主檔分區範式**（5/6/7 區）| Salesforce Setup（>50 區）/ Oracle（混雜）| NEXORA **精簡 6 區 + 中小汽配優化** ⭐ |
| **車型字典獨立分區** | 業界中小汽配 ERP **多無**（混在商品）| NEXORA 業界改革 ⭐⭐⭐ |
| **三版本可見性**（LITE/PLUS/PRO badge）| Notion / Linear / Stripe 標配 | NEXORA 對齊業界 baseline + 自家 Yaro/恆迎 plan 切分 |
| **版本鎖 + Upgrade prompt** | SaaS 業界標配 | NEXORA 對齊（schema 已 ready）|

#### ⭐⭐ 候選 #23：主檔卡片進階元素

對齊 §4.3：補 4 業界 baseline（version badge / 最近使用 / 快捷新增 / 狀態指示）。

#### ⭐⭐ 候選 #24：onboarding wizard

⭐ 新租戶開戶引導：5 步驟建第一個 user / role / warehouse / part-group / part。

#### ⭐ 候選 #25：依賴關係視覺

對齊 §5.3 範式 B/C：tooltip dependsOn + 缺失依賴 warning。

### 6.3 Hank 業界 muscle memory 推薦排序

| 優先 | 候選 | 戰略價值 | 落地成本 |
|---|---|---|---|
| ⭐⭐⭐ | #22 主檔分區 + 版本可見性 | 客戶看 NEXORA 第一印象、影響定價策略 | 中（master-cards.ts metadata 升級）|
| ⭐⭐ | #23 卡片進階元素 | 業界 baseline 對齊 | 中 |
| ⭐ | #24 onboarding wizard | 新客戶上手率 | 高（design + implement）|
| ⭐ | #25 依賴關係視覺 | 業務員效率 | 中 |

### §I.6.3 §6 揭露不完整

- 未 verify Crown 對「車型字典獨立分區」業界改革等級拍板
- 未 verify Crown 對「版本鎖 vs 全開放」戰略拍板（影響定價）

---

## §7 §I.6.3 揭露不完整總清單

1. **§1** NX02-NX10 模組是否有「使用者面對主檔」分散在各業務模組首頁
2. **§1** base/[segment]/page.tsx 動態路由用途
3. **§1** nx02/vendor vs base/partners 重疊
4. **§2** Crown 對「車型字典分區」業界改革等級拍板
5. **§3** Nx99Plan 既有 seed 資料 + ProductModuleMap seed
6. **§3** Crown 對版本差異化策略拍板
7. **§4** hub 卡片 statValue API 覆寫範式
8. **§4** mobile vs 桌面 layout 差異
9. **§5** NEXORA 既有 onboarding flow 真實狀態
10. **§5** base/[segment] 是否已部分依賴提示

---

## §8 戰略總覽（給 Alex 寫 NEXORA_主檔中心測試報告 v1.0 用）

### 8.1 ⭐⭐⭐ 主檔中心當前真實量級

```
A041 真實：
  base 路由 entity：25 個
  hub 卡片：14 cards / 18 access points
  ⚠️ 7 個「後加入主檔」未在 hub
  5 分區：account / product / organization / partner / system
  三版本可見性：backend 0 鎖、frontend 0 gate（schema 全 LITE 起）
  卡片元素：5（icon + title + desc + statLabel + statValue）
  卡片元素缺：4 業界 baseline（version badge / 最近使用 / 快捷新增 / 狀態指示）
```

### 8.2 Alex v1.0 測試報告建議結構

```
§1 主檔中心 18 access points 逐項測試
§2 ⚠️ 7 個「後加入主檔」入口缺失測試（揭露 customer-grade / engine / model / transmission / drivetrain / model-type / phonetic-dictionary）
§3 三版本可見性測試
   - LITE 帳號登入 → 看到哪些
   - PLUS 帳號登入 → 看到哪些
   - PRO 帳號登入 → 看到哪些
   - 對齊既有 schema 全 LITE 真相 vs Hank §3.6 推薦三版本差異
§4 卡片視覺資訊測試（icon / title / desc / statValue / mobile）
§5 主檔依賴關係（建檔順序）測試
§6 業界改革候選 #22 / #23 / #24 / #25 對標
```

### 8.3 ⭐⭐⭐ Crown 4 拍板題

| # | 題目 | 推薦 |
|---|---|---|
| 1 | 補 7 missing 主檔卡片 | ✅ 立即補（Crown 揭露對應）|
| 2 | 5 分區 vs 6 分區（車型字典獨立）| **方案 B**（6 分區、車型字典獨立、業界改革 #22）|
| 3 | 三版本可見性策略 | **方案 A**（版本鎖 + Upgrade prompt、業界 SaaS 標準、schema 已 ready）|
| 4 | 卡片進階元素優先級 | **版本 badge 先**（對齊 #3）→ statValue API 動態抓 → 後續軌補最近使用 / 快捷動作 |

### 8.4 後續軌候選（A026 backlog）

- **TASK-MASTER-HUB-MISSING-7**（補 7 missing 卡片 + 分區校正）
- **TASK-MASTER-HUB-VERSION-BADGE**（三版本可見性 + Upgrade prompt）
- **TASK-MASTER-HUB-CARD-V2**（卡片元素 v2：badge + 最近使用 + 快捷新增）
- **TASK-MASTER-ONBOARDING-WIZARD**（新租戶引導 5 步驟）
- **TASK-MASTER-DEPENDENCY-VIZ**（依賴關係 tooltip + warning）
- **TASK-NX99-PLAN-SEED-VERIFY**（Nx99Plan + ProductModuleMap seed 完整 verify + 補）

---

> 文件版本：v1.0（TASK-MASTER-DATA-CENTER-AUDIT 純諮詢、8 段揭露 + 5 大重大揭露 + 4 Crown 拍板題 + 6 A026 後續軌候選）
> 待 Alex 寫 NEXORA_主檔中心測試報告 v1.0 docx 對齊本 audit
