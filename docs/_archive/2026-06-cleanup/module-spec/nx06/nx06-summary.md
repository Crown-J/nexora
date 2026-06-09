<!-- docs/nx06/nx06-summary.md -->

# NX06 物流管理 — 模組架構書（給 Claude.AI 上傳簡化版）

> 文件版本：v1.0
> 最後更新：2026-05-17
> 撰寫：Hank（整合 TASK-NX06-IMPL-01 6 Phase commit + AUDIT-01 + overview v0.1.0）
> 性質：模組層 summary、跨對話接力 Hank / Alex 必讀
> 完整子規格在 `docs/nx06/spec/intent/nx06-overview.md`
> 戰略定位：NEXORA 業務閉環模組（採購 + 庫存 + 銷貨 + 自動補貨 + 財務 + **物流**）第一階段封板
> Q-RHYTHM-2 第二次落地：Crown + Alex 預批、Hank 全軌連跑（NX05 之後）

---

# § 1. NX06 模組業務角色

## 1.1 模組定位

NX06 = **物流交付閉環** 模組，4 種物流類型 + 配單 + 簽收 + 異常 + 成本，5 業務工作台 + 跨模組 helper 自動建單。

```
上游：
  NX04 銷貨 SO SHIPPED + deliveryType=D → DELIVERY DN 自動建單（既有）
  NX04 銷貨 SR POSTED + returnAction=R/D → RETURN_PICKUP DN 自動建單（NX06-IMPL-01 新增）
  NX03 庫存 Parcel → DnItem 附掛（NX06-IMPL-01 新增 pure export、本軌不 wire）
        ↓
NX06 物流完整鏈：
   DN 4 類型（D/K/I/R） → Dispatch 配單 → 列印 → 配送 → 簽收 / 異常 → COMPLETED
        ↓ 衍生服務
        Lalamove API 半自動整合（mock / real env toggle）
        熱感印表機標記（藍牙 SDK 屬前端軌）
        DN 件項 internalCost 成本內部記錄
        ↓
下游：
  NX05 PaylogEX 費用支出（NX06-IMPL-01 新增 pure export、本軌不 wire）
```

**戰略意義**：
- ⭐⭐ Lalamove API 半自動整合（業界改革：傳統手動 call 司機、本系統可半自動派單）
- ⭐⭐ 件項層級異常追蹤（W=送錯 / Q=數量 / D=破損 / O=其他、外務員 App 現場標記）
- ⭐⭐ 配送成本內部記錄（汽配業界客戶不另收運費、月底會計入帳）
- ⭐ 電子簽收法律憑證（signerType + signatureUrl + signedAt 三件套）

## 1.2 10 業務功能（對齊 overview §3.1）

1. 送貨單 DN 4 物流類型（DELIVERY / PICKUP / INTL_SHIPPING / RETURN_PICKUP）
2. 多停點 Stop + Item 兩層（DnStop + DnItem）
3. GPS 即時定位（lastLat / lastLng / lastLocationAt）
4. 銷退取件自動建單（NX04 SR POSTED → NX06 RETURN_PICKUP）
5. 倉管組長配單（DRAFT → DISPATCHED + driver + vehicleNo）
6. 停點 / 件項異常標記（status='E' + exceptionType / exceptionRemark）
7. 電子簽收（signerType C/W/N + signatureUrl）
8. 國際物流 6 階段（DRAFT → CUSTOMS → IN_TRANSIT → ARRIVED → DELIVERED）
9. Lalamove API 半自動整合（mock / real env toggle + webhook）
10. 配送成本內部記錄（item.internalCost + 月底 PaylogEX bridge）

---

# § 2. Schema 真相

## 2.1 2 migration（NX06-IMPL-01 Phase 1）

| 軌 | migration 名 | 範圍 |
|---|---|---|
| M1 | `20260518300000_nx06_impl_01_m1_dn_item_internal_cost` | DnItem.internalCost Decimal(14,2) |
| M2 | `20260518310000_nx06_impl_01_m2_dn_printer_lalamove_columns` | Dn 加 printerDeviceId / printedAt / lalamoveOrderId / lalamoveTrackingNo / lalamoveCallbackStatus |

## 2.2 既有 3 model（audit-01 揭露、本軌不動 schema 主結構）

| # | Model | Table | 業務語意 |
|---|---|---|---|
| 1 | `Nx06Dn`     | nx06_dn      | 送貨單主表（4 logisticsType + status 4-6 階 + GPS + 簽收 + 國際 + 配送成本）|
| 2 | `Nx06DnStop` | nx06_dn_stop | 停點（多停點、taskType D/K/R/C、status P/D/C/E）|
| 3 | `Nx06DnItem` | nx06_dn_item | 件項（parcelId 預留、deliveryStatus P/C/E + 異常欄 + internalCost）|

⭐ **NX06 schema 設計成熟**（既有 v7_baseline 已含 4 物流類型 + GPS + 簽收 + 國際 + 異常，本軌僅補配送成本 + 印表機 + Lalamove 6 欄）。

---

# § 3. Service 真相

## 3.1 既有 1 service + 4 controller（NX06-IMPL-01 前）

對齊 audit-01 §2.2：dn-logistics.service（797 → 950+ lines、cross-cutting 共用 service）+ delivery/pickup/intl-shipping/return-pickup 4 controller

## 3.2 新增 service 3 + controller 4（Phase 2-3）

| service | 角色 | 主 method |
|---|---|---|
| `DispatchService`            | 配單（DRAFT→DISPATCHED + driver + vehicleNo）| assignDriver |
| `PrinterIntegrationService`  | 熱感印表機標記（藍牙 SDK 屬前端軌）| markPrinted |
| `LalamoveIntegrationService` | Lalamove API 半自動整合 + webhook | createOrder / handleWebhook |

| controller | 路由 | 角色 |
|---|---|---|
| `DispatchController`            | /nx06/dispatch        | 配單入口 |
| `PrinterIntegrationController`  | /nx06/printer         | 列印標記入口 |
| `LalamoveIntegrationController` | /nx06/lalamove        | Lalamove create + webhook |
| `DnOpsController`               | /nx06/dn-ops          | 跨 DN 的 stop/item 異常 + 內部成本 |

## 3.3 dn-logistics.service 升級（Phase 3 新增 3 method）

| method | 角色 |
|---|---|
| `markStopException` | 停點異常標記（status=E + exceptionRemark）|
| `markItemException` | 件項異常標記（W/Q/D/O + reason、deliveryStatus=E）|
| `setItemInternalCost` | 件項內部成本手動設定（Decimal 14,2 非負）|

## 3.4 跨模組 inline helper 完整化（4 helper、本軌新增 3 + 既有 1）

```
shared/nx06/
├── nx06-create-delivery-from-so.ts            ✅ 既有（SO SHIPPED → DELIVERY DN）
├── nx06-create-return-pickup-from-sr.ts       🆕 本軌（SR POSTED+R/D → RETURN_PICKUP DN，wire 入 sales-return.service）
├── nx06-create-dn-item-from-parcel.ts         🆕 本軌（NX03 Parcel → DnItem 附掛，pure export 不 wire）
└── nx06-create-paylog-from-dn-cost.ts         🆕 本軌（DN COMPLETED → NX05 PaylogEX，pure export 不 wire）
```

⭐ **本軌 wire 1 / 預留 2**：SR helper 立即生效，Parcel + PaylogEX 留後續軌 wire（避免外部依賴拖累本軌）。

---

# § 4. API 真相（25 endpoints、本軌新增 7）

## 4.1 既有 21 endpoints（NX06-IMPL-01 前、4 controller）

audit-01 §3.3 揭露：delivery/pickup/intl-shipping/return-pickup 各 5+ endpoint（list / getById / create / patch / patchLocation / remove）。

## 4.2 本軌新增 7 endpoints（Phase 2-3）

| 路由 | method | 角色 |
|---|---|---|
| PATCH /nx06/dispatch/:dnId/assign           | dispatch          | 配單 |
| POST  /nx06/printer/:dnId/print             | printer           | 列印標記 |
| POST  /nx06/lalamove/:dnId/create           | lalamove          | Lalamove 建單 |
| POST  /nx06/lalamove/webhook                | lalamove          | Lalamove webhook |
| PATCH /nx06/dn-ops/stops/:stopId/exception  | dn-ops            | 停點異常 |
| PATCH /nx06/dn-ops/items/:itemId/exception  | dn-ops            | 件項異常 |
| PATCH /nx06/dn-ops/items/:itemId/internal-cost | dn-ops         | 件項成本 |

⭐ 全部 7 endpoint 走 RolesGuard SYSADMIN/OWNER/WAREHOUSE。

---

# § 5. UI 真相

## 5.1 既有 1 placeholder（NX06-IMPL-01 前）

- `/dashboard/nx06/workspace` — 物流工作台 placeholder

## 5.2 本軌新增 4 placeholder + 1 menu + side-menu wire（Phase 5）

5 placeholder（升級 1 + 新 4）：
- `/dashboard/nx06/workspace`  — 物流工作台（升級 desc）
- `/dashboard/nx06/dispatch`   — 配單工作台
- `/dashboard/nx06/sign`       — 電子簽收工作台
- `/dashboard/nx06/cost`       — 配送成本工作台
- `/dashboard/nx06/exception`  — 物流異常工作台

menu.nx06.ts（getNx06SideMenu）+ side-menu.ts 加 nx06 路由 → getNx06SideMenu()。

⭐ Crown Q-U1=c 拍板：UI 純 stub、實作獨立軌 TASK-NX06-IMPL-UI-01。

---

# § 6. 環境變數（本軌新增 1）

| 環境變數 | 預設 | 角色 |
|---|---|---|
| `LALAMOVE_API_ENABLED` | `false`（mock）| 控制 Lalamove HTTP call mock vs real（後續軌設 true + Lalamove 商家 API key + 公網 webhook endpoint）|

---

# § 7. NX06-IMPL-01 commit 真相（8 commit / 6 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `0c1c61e` | nx06-impl-01-plan.md（Q-RHYTHM-2 + 4-layer + 12 commit estimate）|
| 1 M1 | `a69aa90` | DnItem.internalCost 欄 + schema |
| 1 M2 | `e6762c1` | Dn 印表機 + Lalamove 5 欄 + schema |
| 2 L1 | `d7a24a3` | DispatchService + PrinterIntegrationService + LalamoveIntegrationService（+ DTO + controller + module wire）|
| 3 L2 | `07febc3` | dn-logistics.service 升級（DN_SEL/ITEM_SEL 補欄 + 3 method 異常 + 成本）+ DnOpsController |
| 4 L4 | `7ce607c` | 3 cross-module helper（SR wire / Parcel + PaylogEX pure export）+ NX05 Nx05DocKind 加 EX |
| 5 UI | `45af765` | 5 placeholder + menu.nx06.ts + side-menu wire |
| 6 docs | （本 commit）| summary + worklog + merge-verify |

⭐ 實際 8 commit、超原估 12 commit 預算 33%（4 phase commit + 2 migration + 1 plan + 1 docs）。

---

# § 8. 後續軌（dual-track 預告）

- **TASK-NX06-IMPL-02 路線優化**：Crown 拍板啟動條件 = 本軌 closure
  - GPS 軌跡 vs 單點權衡（本軌單點、後續軌可能加軌跡 schema）
  - Lalamove real API 啟動（環境變數 + 公網 webhook endpoint + Lalamove 商家 API key）
  - DN COMPLETED → NX05 PaylogEX wire 入 patchDn 終態 hook（本軌 pure export）
  - NX03 Parcel → DnItem attach 流程（半自動 wire）
- **TASK-NX06-IMPL-UI-01 UI 獨立軌**：5 placeholder → 真實工作台 + GPS 地圖 component + 藍牙 SDK 對接

---

---

# § 9. TASK-NX06-IMPL-02 範圍（路線優化 + 動態交接 ⭐⭐⭐、Q-RHYTHM-2 第三次落地、v0.2.0 升級）

## 9.1 7 業務功能（對齊 overview v0.2.0 §4.1）

1. 路線優化（單車）TSP nearest-neighbor + Google Maps Distance Matrix
2. 路線優化（多車 VRP 簡化版）load-balanced greedy + per-vehicle NN（亞羅 Q1=100/日、≤ 5 driver / ≤ 100 DN）
3. ⭐⭐⭐ 動態任務轉派（亞羅簡化版）半徑 + 任務量平衡 + ETA、半自動倉管組長拍板、中小汽配 ERP 業界第一個
4. 外務員 PWA App（sw.js v2 + push handler + 客戶端訂閱 helper）
5. 倉管組長地圖視圖（GET /nx06/dn-ops/map/active、dashboard polling 10s）
6. 推播服務（Web Push API 訂閱 + sendNotification stub mock 模式）
7. GPS realtime sync（既有 PATCH /nx06/delivery/:id/location、driver 30s POST + dashboard 10s polling）

## 9.2 新增 schema（3 軌 + 1 軌 drift 結算）

| 軌 | migration | 範圍 |
|---|---|---|
| M1 | `nx06_impl_02_m1_dn_route_optimization_columns` | nx06_dn +3 欄（route_order_in_sequence / estimated_duration_sec / route_batch_id）|
| M2 | `nx06_impl_02_m2_dn_handover_table` | 新表 nx06_dn_handover（動態交接、5 status enum）|
| M3 | `nx06_impl_02_m3_push_subscription_table` | 新表 nx06_push_subscription（Web Push 訂閱）|
| M4 | `nx06_impl_02_m4_schema_drift_resolution` | auto-gen drift 結算（M2/M3 constraint 重命名 + pre-existing drift）|

## 9.3 新增 4 service + 4 controller（IMPL-02、純新增 0 替換）

| service | controller | 路由 | endpoint 數 |
|---|---|---|---|
| RouteOptimizationService | RouteOptimizationController | /nx06/route-optimization | 3 |
| DynamicHandoverService   | DynamicHandoverController   | /nx06/handover           | 5 |
| WebPushService           | WebPushController           | /nx06/push               | 4 |
| DriverMobileService      | DriverMobileController      | /nx06/driver-mobile      | 2 |

dn-logistics.service 升級：+1 method `listActiveForMap` + GET /nx06/dn-ops/map/active endpoint。

## 9.4 shared helper 新增 2

```
shared/nx06/
├── nx06-haversine.ts              🆕 IMPL-02（地球距離 + TSP nearest-neighbor + 速度估）
└── nx06-google-maps-client.ts     🆕 IMPL-02（Distance Matrix API + env toggle mock/real）
```

## 9.5 UI 升級（IMPL-01 5 → IMPL-02 12 placeholder）

倉管組長 +3 placeholder：
- `/dashboard/nx06/map`       — 物流地圖視圖
- `/dashboard/nx06/route`     — 路線優化工作台
- `/dashboard/nx06/handover`  — 動態任務轉派 ⭐⭐⭐

外務員 PWA +4 placeholder（新 group）：
- `/dashboard/nx06/driver`           — PWA home
- `/dashboard/nx06/driver/tasks`     — 任務列表
- `/dashboard/nx06/driver/map`       — 地圖
- `/dashboard/nx06/driver/handover`  — 動態交接接收

menu.nx06.ts 升 2 group / 13 items。

## 9.6 PWA Service Worker 升級

`apps/nx-ui/public/sw.js` v1 → v2：
- 加 push event handler（parse JSON payload + showNotification）
- 加 notificationclick handler（focus tab / openWindow）
- 客戶端訂閱 helper：`apps/nx-ui/src/features/nx06/push-subscription.ts`

## 9.7 環境變數（本軌新增 5、全 mock 預設）

| 環境變數 | 預設 | 角色 |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | unset → mock | Google Maps Distance Matrix |
| `GOOGLE_MAPS_API_ENABLED` | false → mock | real API 啟動 |
| `NX06_HANDOVER_DEFAULT_RADIUS_KM` | 5 | 動態交接半徑 |
| `NX06_HANDOVER_DEFAULT_MAX_LOAD` | 10 | 候選 driver 任務量上限 |
| `WEB_PUSH_ENABLED` | false → mock | web-push real send |

## 9.8 IMPL-02 commit 真相（7 commit / 7 Phase）

| Phase | commit | 範圍 |
|---|---|---|
| 0 plan | `dae2bc3` | plan v0.1.0 + overview v0.2.0 |
| 1 migrations | `a4f53d6` | M1 + M2 + M3 + M4 |
| 2-4 合併 | `?` (Phase 2-4) | 4 service + 2 helper + dn-logistics + module |
| 5 PWA | `ab3e8fb` | sw.js v2 + push subscription helper |
| 6 UI | `47400db` | 7 placeholder + menu.nx06 升 |
| 7 docs | （本 commit）| summary v0.2.0 + worklog 主題 5 + merge-verify |
| 收尾 | merge / tag | v0.9.0-nx06-routing-closure |

⭐ NX06 範圍 A 全 closure（IMPL-01 物流基礎 + IMPL-02 路線優化）= **15 commit / 6 migration / 12 controller / 43 endpoint / 17 placeholder UI / 2 group menu**。

---

> 文件版本：v0.2.0（IMPL-02 closure、Q-RHYTHM-2 第三次落地）
> 下次更新觸發：NX06-IMPL-UI-01 啟動 / Lalamove real API 啟動 / Google Maps API key 接 / web-push real wire / 客戶端推播範圍 B
