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

> 文件版本：v1.0（初版、Q-RHYTHM-2 第二次落地 closure）
> 下次更新觸發：NX06-IMPL-02 路線優化啟動 / NX06-IMPL-UI-01 啟動 / Lalamove real API 啟動
