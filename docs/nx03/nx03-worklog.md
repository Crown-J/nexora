<!-- docs/nx03/nx03-worklog.md -->

# NEXORA - NX03 - 庫存模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX03 庫存管理（stock-balance / stock-ledger / inbound / outbound / stocktake / transfer / stock-reservation）+ NX03 主導的跨模組 task（B2 反查 API、庫存中心 4 分區重構、W2-mini 工作站）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史散在 `main` / `feature/wp-phase0-schema` / `feature/demo-emergency` / `feature/wp-phase1-w2-mini`

---

## 結構說明

- 按主題（不按時間順序）累加、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- 寫「為什麼這樣蓋」「踩過什麼坑」、不寫「現在長什麼樣」（[system-architecture.md](../_team/system-architecture.md) 的事）
- ⚠️ 標記未確認 / 待 Crown / Alex 補充
- **跨模組或公版主題不寫進本日誌**、寫進 [_team/worklog.md](../_team/worklog.md)（D3 雙帳 / D4 Translator / 過帳邏輯通用規則 / 公版 component / TASK-BUSINESS-RESTRUCTURE 大塊 1+2 / A002 drift / A020 nx03_st_item FK ON DELETE drift）

---

## 主題 1｜v7_baseline + Phase5-NX03 第四批 API 落地（2026-04-14~15）

### 起源

`spec_v7_baseline`（2026-04-13）建好 NX03 schema（stock-balance / ledger / stocktake / transfer 等）。Phase5「第四批 API」依序填模組（NX99 → NX01 → NX02 → **NX03** → NX04 → NX05 → NX06~10）、本主題是 NX03 7 子模組 controller + service + DTO 一次落地。

### 設計決策

1. **過帳跨模組通用規則統一抽 `nx03-inventory.ts`**：所有過帳（inbound POSTED / outbound SHIPPED / stocktake POSTED / transfer RECEIVED）用單一 helper `applyQtyInWithLedger / applyQtyOutWithLedger`、強制單一 `prisma.$transaction` 內 balance + ledger 一起寫。**過帳邏輯通用規則跨模組共用**、依 [CLAUDE.md §九] 實作於 `apps/nx-api/src/shared/nx03/nx03-inventory.ts`、規範細節見 [_team/worklog.md](../_team/worklog.md)。
2. **stock_ledger.source\* 識別跨模組來源**：每筆 ledger 寫 `sourceModule`（NX02/NX03/NX04 等）+ `sourceDocType`（單字元 I/O/T/X/S/R/P）。理由：未來查 ledger 反推「這筆異動是哪個業務動作造成」、不需 join 多表。
3. **transfer 屬 PLUS+ feature**：`@UseGuards(planSupportsNx02PlusFeatures)`（雖然名字寫 nx02、實際是 PLUS feature gate）、LITE 不能用調撥。
4. **單據前綴對齊 v3 規則**：`IB-` 入庫 / `OB-` 出庫 / `SL-` 庫存台帳 / `ST-` 盤點 / `XF-` 調撥（後 0427 B5 加 `TI-` 屬 NX02 採購、不在本日誌）。
5. **狀態 token 對齊 NX02 模式**：盤點 `DRAFT/COUNTING/ADJUSTING/POSTED/CANCELLED`、調撥 `DRAFT/TRANSIT/RECEIVED/CANCELLED`（舊單字元 `P` 轉 `RECEIVED`）。

### 實作歷程

- 2026-04-15（migration）`20260415120000_nx03_inbound_outbound_phase5` | 4 個新表（IB/IB_item/OB/OB_item）+ stocktake/st 狀態擴欄 + doc_no widening
- 2026-04-15（commits 在 `feature/sys-dashboard`、後 merge）| 7 子模組 controller/service/DTO + shared utils + crud-fetch 驗證腳本

### Migration 列表（NX03 直接相關）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX03 schema 建立（stock-balance / ledger / stocktake / transfer / location 等） |
| `20260415120000_nx03_inbound_outbound_phase5` | 4 個新表 + 盤點/調撥狀態 token 化 + doc_no 擴欄 |
| `20260425100200_phase0_st_item_source_so_nullable` | st_item.source_so_item_id 從 NOT NULL 改 nullable（**D4 主導、見 _team/worklog.md**）|

### 踩坑 / 學到的

- **過帳必須單一 transaction、不能拆兩個 prisma client**：第一版想「先 update inbound.status、再用另一個 client 寫 ledger」、結果 status 寫了但 ledger 沒寫、庫存對不上。教訓：**balance + ledger 同時寫是物理約束、tx callback 內全部完成、出錯整批 rollback**。
- **舊單字元狀態值轉 token 要在 migration 內完成**：v6 schema 留 stocktake.status 值 `D / C / A / P / V`、API 改吐 token 後若 DB 還存單字元、會撞「`D` 不在 enum 內」。migration 的 UPDATE 把舊值轉新值是必要步驟、不能等 application 端轉換。
- **transfer state machine 比想像複雜**：`DRAFT → TRANSIT → RECEIVED` 是順向、但 `TRANSIT → CANCELLED` 要寫 ledger（沖回來源倉出帳）、`RECEIVED → CANCELLED` 不可（已過帳、要走銷退另開單）。第一版 state-machine.ts 沒區分、寫成全部 cancel 都允許、撞測試才補完。教訓：state machine 不只看「能不能轉」、還要看「轉了之後副作用」。
- **`@Roles('ADMIN')` 是早期保守做法**：stock-balance/ledger 等查詢給 ADMIN-only 太嚴、後續 B2（主題 4）改開放公開、形成 A021 不一致（待春酒後處理）。

### 對應文件

- 後端：[apps/nx-api/src/nx03/](../../apps/nx-api/src/nx03/) + [shared/nx03/](../../apps/nx-api/src/shared/nx03/)
- 過帳通用規則：[CLAUDE.md §九](../../CLAUDE.md) + [_team/worklog.md 主題 3](../_team/worklog.md)
- 對應架構債：A021（stock-balance.controller @Roles('ADMIN') vs B2 開放方向不一致）

---

## 主題 2｜庫存中心 Hub UI + DEMO-R1 mobile 響應式

> Alex 觀察：本主題桌面 hub 結構決策 vs mobile UX 適配是不同性質工作、拆 2A/2B 小節給 Alex 易讀。

### 2A. 庫存中心卡片頁 Hub（2026-04-20）

#### 起源

0420-D 五大中心 Hub 系列（D1 採購 / D2 銷售 / **D3 庫存** / D4 財務 / D5 報表）一次到位、共用 hub-primitives 抽出。庫存中心 Hub 是「給倉管 daily 進入點」、不是業務的快捷入口。

#### 設計決策

1. **路由 `/dashboard/inventory`**：跟舊 `/dashboard/nx03` 並存（A027 過渡期）、新路由是業務語意。
2. **卡片配 PRO 鎖**：庫存進階功能（多倉調撥 / 智能補貨 / KPI）配 `HubProBadge`、LITE/PLUS 看到但點不開（顯示升級提示）。
3. **共用 hub-primitives**：`ModuleHubSection / HubLinkCard / HubStepBadge / HubProBadge`、所有五大中心同一套 component。

#### 實作歷程

- 2026-04-20 `bb3016a` | 0420-D3：建立庫存中心卡片頁 `/dashboard/inventory`
- 2026-04-20 `69dff21` | sales/inventory/finance/report centers align with purchase hub pattern
- 2026-04-22 `2a40f32` | DEMO-R4-C：purchase/sale/inventory hubs mobile bottom tabs

#### 踩坑 / 學到的

- **PRO 鎖卡片要點得進去看「為什麼鎖」**、不能單純 disabled：點下去要 alert / dialog 說明「此功能屬 PRO 方案」+ 升級 CTA、否則使用者看到鎖只覺得壞掉。

### 2B. DEMO-R1 mobile 響應式（2026-04-22）

#### 起源

桌面版 NX03 操作頁（balance / ledger / stock-take / transfer / shortage）在手機上 4 欄 grid 撐爆螢幕。Crown demo 排期前要把這 5 個頁面手機可看 — 不是重新設計 mobile UX、純粹「**讓桌面版在手機上不爆**」。

⚠️ **路由還在 `/dashboard/nx02/*` 殘留**（v1 殘留、應屬 NX03 業務、A027 架構債）。

#### 設計決策

1. **純響應式適配、不重新設計**：桌面 4 欄 grid 在 mobile 改 1 欄 stack、卡片內容不變、不另寫 mobile-only component。理由：DEMO-R1 是「**讓 demo 跑得起來**」、不是「mobile-first 重新設計」（後者 R7 才做）。
2. **List view + Detail form 切版**：list 在 mobile 改卡片堆疊、detail form 改縱向（label 在欄位上方而非左側）。
3. **balance / ledger 加 P3 行動快捷**：手機點 balance row 直接「補貨」「查歷史」、不需多步點選。

#### 實作歷程

- 2026-04-22 `cf84e66` | DEMO-R1 mobile：`/dashboard/nx02/balance` card list responsive
- 2026-04-22 `e020c9c` | mobile：nx02 stock-take + transfer list responsive
- 2026-04-22 `c41d6c6` | mobile：nx02 stock-take detail + transfer form responsive
- 2026-04-22 `875acd9` | mobile：nx02 shortage + ledger responsive (P3)

#### 踩坑 / 學到的

- **桌面 4 欄 grid 在 mobile 縮 70% 不可行**（NX02 主題 4 也有同教訓）：列在 mobile 變 1 欄 stack 才合理、grid responsive 不是 fontsize scale 問題、是 layout 重排問題。
- **Detail form label 位置 mobile 必改**：桌面 label 在欄位左側（節省高度）、mobile 改 label 在上方（節省寬度）。同樣 form component 用 `flex-col md:flex-row` 切。

### 對應文件

- 庫存中心 Hub：[apps/nx-ui/src/app/dashboard/inventory/](../../apps/nx-ui/src/app/dashboard/inventory/)
- 共用 hub primitives：[apps/nx-ui/src/features/layout/ui/module-hub/hub-primitives.tsx](../../apps/nx-ui/src/features/layout/ui/module-hub/hub-primitives.tsx)
- 對應架構債：A027（dashboard/{nx02} vs dashboard/{inventory} 並存、含 DEMO-R1 殘留路徑）

---

## 主題 3｜TASK-BUSINESS-RESTRUCTURE 大塊 3 庫存中心 4 分區重構（2026-04-23）

> ⚠️ **BUSINESS-RESTRUCTURE 大塊 1+2 跨多模組（NX02/04/06）見 [_team/worklog.md 主題 5](../_team/worklog.md)**。**大塊 3 純 NX03 庫存、寫進本日誌**。Crown 拍板（NX03 worklog Q1）。

### 起源

大塊 1（業務 SOP Phase 1~4）+ 大塊 2（SO 備貨 4 情境分流 + 跨中心連動 SO→PK→BX→DN）已落地、需要把「**庫存中心**」對應立體化。原本的 `/dashboard/inventory-mobile/*` 是大塊 2 為避開桌面版的臨時路徑、大塊 3 整合到正式路徑 + 把 SalesHubMobile 的 4 分區範本套到 InventoryHubMobile。

### 設計決策（含 Crown 親口的核心哲學）

1. **「中心 = 角色工作台」哲學落地**（Crown 親口、Phase 2.5 揭露）：
   ```
   業務的中心 = 銷售中心（包含查庫存等業務需要的功能）
   倉管的中心 = 庫存中心（倉管不接觸客戶）
   業務根本不該進庫存中心（那是倉管的世界）
   ```
   **延伸決策**：庫存中心 4 分區的「第 4 分區」從銷售中心的「客戶維護」換成「**倉位管理**」（倉管不接觸客戶）。
2. **InventoryHubMobile 套銷售中心 4 分區範本**：
   - 狀態追蹤（KPI + TodoGroup）/ 工作站（N 項 item card）/ 單據管理（N 項 item card + stats）/ **倉位管理**（庫位 + 盤點設定）
   - 同 `?section=` query 驅動
   - 同用 `MobileHubSectionTabs with showLabel`
3. **Phase 9 路徑遷移用 git mv 保歷史**：`features/inventory-mobile/*` → `features/inventory/workstation/*`、避免 git 看成 D+A、保 rename 歷史方便日後追溯。
4. **Phase 10 倉位管理含「設定一致 vs 需與採購討論」對比**：庫位設定的安全量 vs 採購補貨設定的安全量、兩邊不一致時倉管看坪效給採購建議。**這是 ERP 業務真實 pain point**：傳統 ERP 倉管跟採購的安全量設定常脫節、本系統把對比 inline 在倉管視角。

### 實作歷程

- 2026-04-23 `a6cb00c` | 大塊 3 Phase 8：庫存中心 4 分區 InventoryHubMobile + InventoryProKPICard
- 2026-04-23 `bc3d23c` | 大塊 3 Phase 9：inventory-mobile → `/dashboard/inventory/*` 遷移 + 進貨/盤點 placeholder
- 2026-04-23 `0df5a84` | 大塊 3 Phase 10：倉管 KPI + 庫位管理頁 + 盤點設定頁 + WarehouseSection 啟用
- 2026-04-23 `ba8a01d` | merge `feature/demo-emergency` 進 main
- 2026-04-23 `6f3c45b` | 🔥 hotfix：StatusSection Zustand selector → React #185（A014）

### 踩坑 / 學到的

- **🔥 React #185 production hotfix（A014 永久教訓）**：merge main + Vercel 部署後 Crown 手機登入 `/dashboard/sale` 白屏、`Maximum update depth exceeded`。Root cause：`StatusSection` 的 Zustand selector 寫 `useStore((s) => s.sos.filter(...))`、每次 render 回傳新 array reference、Zustand `Object.is` 判定變、無限 re-render。**Dev mode React 19 容忍（只印警告）、production build 直接拋 #185**。修法：selector 只取 slice、derive 用 `useMemo`。**這是 NEXORA 全 codebase 適用規範、不只 NX03**、charter §A 同步寫進。
- **A017 流程改善：push main 前必跑 `pnpm build` + `next start` 抽驗關鍵路徑**：本次 #185 就是 dev mode 重現不到的 bug、需 prod build 才能 catch。
- **「中心 = 角色工作台」是 NEXORA 跟一般 ERP 最大區隔**：傳統 ERP 用「模組樹」組織導航（採購/庫存/銷售 → 子功能 → 子表單）、NEXORA 用「角色工作台」（業務/倉管/採購員 → 我的工作 → 我關注的單據）。**這條哲學影響全部 hub UI 設計**、不只大塊 3。
- **PlaceholderPage 跨 feature import（A016）**：進貨/盤點 placeholder 共用 `sale/hub` 的 PlaceholderPage、跨 feature import 是設計味道、未來應提升至 `layout/shared`、但本次不阻塞、列順手清。

### 對應文件

- 銷售中心 4 分區範本（被本主題複用）：見 [_team/worklog.md 主題 5](../_team/worklog.md) BUSINESS-RESTRUCTURE 大塊 1+2
- 對應架構債：✅ A007（store 拆分、大塊 2 落實）/ 🔴 A014（Zustand selector 規範、本主題 hotfix 揭露）/ 🟢 A015（InventoryCenterHub orphan 桌面版）/ 🟢 A016（PlaceholderPage 跨 feature import）/ 🔴 A017（prod build 流程）

---

## 主題 4｜B2 Stock Reverse Lookup API（Phase 0 收官，2026-04-27）— 純 NX03 主導

> B2 跟 NX02 B5 是同期 Phase 0 收官、兩個 API 設計關聯緊密（B2 反查的 5 種狀態包含 B5 的 RFQ/QT 接龍）— 見 [docs/nx02/nx02-worklog.md 主題 5](../nx02/nx02-worklog.md#主題-5b5-rfqqt-api--demo-02-nx02-schema-widening)。

### 起源

D3 雙帳資料模型把 SO 改成「主帳 + 子帳 type='S' 本倉現貨 / type='T' 自倉調撥 / type='G' 同行調貨 / type='B' 缺貨」。前端 W2-mini 工作站要顯示「這筆 SO line 現在是哪種狀態 + 詳情」、需要一個**反向查詢 API**：給 partId / warehouseId 反查當前所有 reservation + 現貨、回傳 5 種狀態的整合 view。

### 5 取捨拍板（Crown 親自）

| 取捨 | 選項 | 拍板 | 理由 |
|------|------|------|------|
| Endpoint 拆分 | 1 endpoint 包 / 2 endpoint 分 | **2 endpoint** | 庫存摘要跟預留清單關注點不同、2 個別獨立、避免 over-fetch |
| 分頁 | 加分頁 / 不分頁 | **不分頁** | 同 part + warehouse 的 reservation 通常 < 50 筆、不需分頁 |
| Cache | 加 cache / 不 cache | **不 cache** | 庫存即時性要求高、cache invalidation 比省的 query 還複雜 |
| Roles 限制 | ADMIN-only / 開放 | **開放公開**（A021 不一致登記） | 業務查庫存是常見動作、不該 ADMIN-only |
| salespersonId 命名 | salespersonId / creatorId | **creatorId** | nx04_so 沒 salesperson FK、建單者 ≠ 業務歸屬、改 creatorId 對齊 schema 真實 |

### API 設計

```
GET /nx03/stock-summary/:partId?warehouseId=...
  → { partId, warehouseId, onHandQty, reservedQty, availableQty,
      states: { S: 8, T_pending: 2, G_adopted: 3, G_pending: 1, B: 0 } }

GET /nx03/reservations/:partId?warehouseId=...
  → [{ soItemId, soDocNo, customer, qty, state: 'S'|'T'|'G_adopted'|'G_pending'|'B',
       creatorId, creatorName, createdAt, ... }]
```

### 接龍鎖反查 5 種狀態（核心邏輯）

依 D3 子帳 type 對應：
- **S (本倉現貨)**：`type='S'`、直接從 stock_balance 扣
- **T (自倉調撥)**：`type='T'`、調撥單 transit、來源倉已扣、目標倉未到
- **G adopted (同行已採用)**：`type='G' + transferStatus='adopted'`、QT 採用後 TI 在路上
- **G pending (同行未採用)**：`type='G' + transferStatus='pending'`、RFQ 已發、QT 未採用
- **B (缺貨)**：`type='B'`、上游全無解、待採購補

### N+1 防範實作

```typescript
// ❌ N+1：每筆 SoItem 查一次 user
soItems.forEach(async (item) => {
  const user = await prisma.user.findUnique({ where: { id: item.creatorId } })
})

// ✅ 2 round-trip：一次 IN 查所有 user
const soItems = await prisma.soItem.findMany({ where: { partId, warehouseId } })
const userIds = [...new Set(soItems.map(i => i.creatorId))]
const users = await prisma.user.findMany({ where: { id: { in: userIds } } })
const userMap = new Map(users.map(u => [u.id, u]))
```

### 實作歷程

- 2026-04-27 `e8af9d6` | B2-impl spec
- 2026-04-27 `7652c43` | B2 service：2 endpoints + 11 unit + 1 integration tests
- 2026-04-27 `259825c` | Phase 0 main work merge（含 B2 全部）+ tag `phase0-complete`

### 踩坑 / 學到的

- **multi-tenant integration test 必驗租戶隔離**：同 partId 在 tenant A 跟 tenant B 都有 SoItem、查 tenant A 不能撈到 tenant B 的。integration test 自帶兩個 tenant fixture、各自 query 驗 isolated。教訓：multi-tenant 不是寫 `WHERE tenantId = :id` 就好、要有 test 證明跨租戶不洩漏。
- **意圖版命名疏漏 catch（B5 反向同步）**：B5-impl spec 揭露 B2 意圖版 §5.2 兩個命名疏漏（salespersonId / vendorPartner）→ 反向 sync 到 intent v1.1。教訓：**impl spec 階段反向 catch 意圖版命名是健康訊號**、不是 spec 失敗、是雙向收斂的設計。
- **拆 endpoint vs 包 endpoint 的決策**：第一版想包成 1 個 endpoint「stock-info」回傳 summary + reservations、發現使用者 90% 場景只需 summary、reservations 是 click-to-expand。拆 2 個避免 over-fetch、API 設計回到「endpoint 對齊 use case」原則。

### 對應文件

- 意圖：[docs/nx03/spec/intent/stock-reverse-lookup-api-intent.md](spec/intent/stock-reverse-lookup-api-intent.md)
- 實作：[docs/nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md](spec/impl/b2-impl_stock-reverse-lookup-api.md)
- 跨模組關聯：[docs/nx02/nx02-worklog.md 主題 5](../nx02/nx02-worklog.md)（B5 RFQ/QT API 同期 Phase 0 收官、本 API 反查的 G_adopted/G_pending 即 B5 接龍鎖狀態）
- 對應架構債：A021（B2 開放公開 vs stock-balance ADMIN-only 方向不一致、待春酒後評估）

---

## 主題 5｜W2-mini 庫存查詢工作站（Phase 1 進行中，2026-04-27~28）

> ⚠️ **本主題進行中、Phase 1A~1D 落地時補 v1.1。** 目前僅紀錄 prep 階段（W2 inventory + intent + impl spec）的決策軌跡。跟 NX02 主題 4（demo 階段、可能丟棄）區分：W2-mini 是**真實 NEXORA codebase**、會持續演進到 production。

### 起源

Phase 0 收官（B2 + B5 + D3/D4）後、Crown 拍板雙線並行 Phase 1：
- Alex 線：寫 W2-mini 意圖版（基於 D5 navigation policy）
- Hank 線：TASK-SEED-DEMO-02 業務 mock 資料

W2-mini 是「**第一個串真 API 的桌面工作站**」、之前的工作台都是 mock。把 B2 反查 + B5 RFQ/QT + D4 Translator 5 個 API 串起來、demo「業務查庫存 → 撞缺貨 → 開 RFQ → 採用 QT → 出 SO」完整流程。

### 設計決策（5 取捨拍板等 Alex review）

依 W2-mini impl spec v1.0（507 行）、5 個取捨：

1. **路由實體**：獨立 `/dashboard/sale/w2/` + 連結卡（不 in-place embed 進銷售工作台）。理由：W2-mini 是新工作站類型、in-place embed 會跟既有銷售 sop-demo 撞 layout。
2. **桌面/手機切換**：同一個 `page.tsx` responsive、不分桌面 mobile 兩個頁面。理由：W2 inventory 桌面 7 節點 / 手機 3 節點是「**內容裁減**」不是「兩種設計」、用 responsive 切。
3. **Store 升級策略**：既有 `useSalesStore` + `adapter 層` + `feature flag`、不另開新 store。理由：避免 store 倍增（已有 inquiry / fulfillment 兩個）、adapter 在 store action 內判斷走 mock 或真 API。
4. **Feature flag**：env `NEXT_PUBLIC_W2_USE_REAL_API`、預設 false。理由：開發/CI 時走 mock、staging/prod 才打開真 API。
5. **sop-demo 並存驗證**：用 ESLint check 取代 e2e test。理由：sop-demo 跟 W2 並存的「真假 API 不混」測試、e2e 跑成本高、ESLint 規則檢查 import path 反而更穩。

### Store mismatch 完整對照表（Alex 第 6 次失誤揭露）

W2-mini intent v1.0 §5.4 寫「actions 命名也對齊後端」、Hank catch 是過度樂觀（Alex 第 6 次「跟既有對齊」失誤）。Crown 附加要求 impl spec §3 必須列**完整對照表**：

#### useSalesStore 8 actions vs 真 API

| Store action | 對接後端 | 階段 |
|--------------|----------|------|
| `createSO` | D4 Translator (POST /nx04/so/translator) | Phase 1A 上 |
| `addLineItem` | client-only mock | 暫保留（W4 銷貨單獨升級時對接） |
| `updateLineItemQty` | client-only mock | 同上 |
| `removeLineItem` | client-only mock | 同上 |
| `confirmOrder` | client-only mock | 同上 |
| `cancelOrder` | client-only mock | 同上 |
| `attachInquiry` | client-only mock | 同上 |
| `detachInquiry` | client-only mock | 同上 |

只 1/8 對接 D4、其餘 7 個保留 client mock。

#### useRFQStore 7 actions

業務只用 `abandonRFQ` → 對接 B5 `cancelRfq`、其餘 6 個屬 W4 採購工作台範圍、本 W2-mini 不對接。

### Alex 第 6 次失誤紀錄（規則升級）

> Catch #2 是 Alex 第 6 次同類失誤（意圖版說「跟既有對齊」沒深入比對細節）。
> 規則升級：Alex 寫意圖時遇到「對齊既有 X」段落、要嘛**列具體對照表**、要嘛**標 ⚠️ 待 Hank 對照真 codebase 補**。

本次 W2-mini impl spec §3 = 第一次落地此規則的成果。

### 4 sub-phase 規劃（1A~1D）

- **Phase 1A 桌面骨架（~1 週）**：路由 + 節點 1（查庫存）+ 節點 4（送 SO type='S'）+ 節點 5（出貨追蹤）
- **Phase 1B 桌面完整節點**：type='T'/'G'/'B' + 節點 2/3/6 + 跳 W6/W4
- **Phase 1C 手機精簡 3 節點**
- **Phase 1D 整合測試 + Crown 親測 5~10 次都順**

### 實作歷程（prep 階段）

- 2026-04-27 `87e39d0` | W2 inventory + DEMO-02 seed planning（10 段盤點 + 8 條 checklist）
- 2026-04-27 `278c85d` | W2-mini intent v1.0（462 行）— Alex 寫
- 2026-04-27 `eb2140b` | W2-mini impl spec v1.0（507 行）+ DEMO-02 spec amend（含 store mismatch 對照表）
- 2026-04-28~ ⏸ Phase 1A 未啟動、等 Alex review impl spec 5 取捨

### 踩坑 / 學到的（prep 階段揭露）

- **意圖版說「跟既有對齊」是危險斷言**：Alex 第 6 次失誤揭露這個 pattern、規則升級寫進規範。教訓：**任何對齊既有 codebase 的斷言都要列對照表、不能模糊講對齊**。本次規則第一次落地的成果是 store mismatch 完整對照表。
- **Alex 順手 catch Hank 數字也是健康訊號**：DEMO-02 spec §3.1 vs §5 Q8 Hank 寫的數字加總不對（PRO 7 天 ~228 SO > Hank §3.1 假設 56~105）、Alex catch 給 Hank 修。教訓：規劃文件寫完後自己再 spotcheck 數字加總、不要假設「我寫的兩段一定一致」。
- **雙線並行的時序管理**：DEMO-02 規劃可獨立於 W2-mini 意圖版（不耦合）、但 W2-mini impl spec 反向需要 DEMO-02 拍板（B2 反查 + type='G' 中間態驗證需 demo data）。教訓：雙線並行時、文件層 commit 越早越好（GitHub 可見即拍板）；程式碼層需等文件對焦完成。

### 對應文件

- 工作站規劃：[docs/nx04/spec/intent/w2-mini-intent.md](../nx04/spec/intent/w2-mini-intent.md)（位於 NX04 因 SO 主導）
- impl spec：[docs/nx04/spec/impl/w2-mini-impl.md](../nx04/spec/impl/w2-mini-impl.md)
- DEMO-02 spec：[docs/nx99/spec/intent/seed-demo-02-intent.md](../nx99/spec/intent/seed-demo-02-intent.md)
- 跨模組關聯：對接 B2（本日誌主題 4）+ B5（[NX02 主題 5](../nx02/nx02-worklog.md)）+ D4 Translator（待寫 [NX04 worklog](../nx04/nx04-worklog.md)）

---

## 統整：NX03 Migration 列表（v7_baseline 之後）

| Migration | 主題 | 性質 |
|-----------|------|------|
| `20260413120000_spec_v7_baseline` | 主題 1 | NX03 schema 建立（balance / ledger / stocktake / transfer / location 等） |
| `20260415120000_nx03_inbound_outbound_phase5` | 主題 1 | 4 個新表 + 盤點/調撥狀態 token 化 + doc_no 擴欄 |
| `20260425100200_phase0_st_item_source_so_nullable` | （D4 主導，見 _shared）| st_item.source_so_item_id 從 NOT NULL 改 nullable |
| `20260427014134_phase0_b5_rfq_source_so_item` | （B5 主導，見 NX02 主題 5）| 順手修 nx03_st_item FK ON DELETE drift（A020）|

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/nx01-worklog.md) / [NX02](../nx02/nx02-worklog.md) worklog 五段式結構：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件
- **disclaimer 模式有兩種、別搞混**：
  - **NX02 主題 4 disclaimer**：「demo / mock 階段、未來真實落地可能整套重寫」（會被丟掉）
  - **NX03 主題 5 disclaimer**：「進行中、Phase 1A~1D 落地時補 v1.1」（會持續演進、不丟）
  - 寫 worklog 時看主題本質：是 demo 拋棄式、還是 production 進行式？
- 主題 2 拆 2A 桌面 / 2B mobile 是「**不同性質工作合併在一個主題下**」的處理範式（NX02 主題 5 拆 5A~5E 是「**單一主題工作量大**」、結構不同）
- 跨模組或公版（D3 / D4 / 過帳通用規則 / 公版 component / BUSINESS-RESTRUCTURE 大塊 1+2 / A002）**不寫進本日誌**、已寫進 [_team/worklog.md](../_team/worklog.md) 統合
- 下一輪預期：[docs/nx04/nx04-worklog.md](../nx04/nx04-worklog.md)（主題會跟 D3 雙帳資料模型 + D4 SYS-C Translator + Phase5-NX04 報價/銷貨/銷退 + W2-mini 桌面骨架 1A 重疊；D3/D4 是 NX04 主導的 Phase 0 核心、本日誌主題 4 多次交叉引用）

---

> 文件版本：v1.0（初版、含進行中 W2-mini prep 階段）
> 下次更新觸發：W2-mini Phase 1A~1D 落地 / NX03 有新 migration / 庫存業務新 spec
