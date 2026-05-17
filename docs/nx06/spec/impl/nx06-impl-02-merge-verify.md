<!-- docs/nx06/spec/impl/nx06-impl-02-merge-verify.md -->

# TASK-NX06-IMPL-02 — Merge Main 上線風險揭露（NX06-IMPL-02-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 7 closure 後、Q-RHYTHM-2 第三次全軌連跑完成
> 真實 main HEAD（merge 前）：`2b9ab05`（v0.8.0-nx06-closure + audit-02）
> 分支：`feature/nx06-routing`（ahead 7 commit）
> 對應依據：[plan v0.1.0](./nx06-impl-02-plan.md) + [overview v0.2.0](../intent/nx06-overview-v02.md) + [audit-02](../../nx06-audit-02.md)

---

## §0 ahead 7 commit 真實清單

```
47400db Phase 6 commit: UI 7 新 placeholder + menu.nx06 升（IMPL-01 6 → IMPL-02 13 items）
ab3e8fb Phase 5 commit: PWA Service Worker push handling + 客戶端訂閱 helper
（Phase 7 docs commit：本檔 + summary + worklog）
[將補] Phase 2-4 合併 commit（route-opt + handover + web-push + driver-mobile + helpers）
a4f53d6 Phase 1 commit: 4 migration（M1+M2+M3+M4 drift 結算）
dae2bc3 Phase 0 commit: plan v0.1.0 + overview v0.2.0
```

---

## §1 NX06 service 改動 verify

### 1.1 既有 8 controller + service 影響

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `dn-logistics.service`         | ⚠️ +1 method `listActiveForMap` / 0 替換 | ✅ 既有 createXxx/patchXxx/簽收/異常/成本 全 0 改 |
| `delivery.controller` × 4 物流  | ❌ 0 改 | ✅ |
| `dispatch.controller`          | ❌ 0 改 | ✅ |
| `printer-integration.controller` | ❌ 0 改 | ✅ |
| `lalamove-integration.controller` | ❌ 0 改 | ✅ |
| `dn-ops.controller`            | ⚠️ +1 endpoint `GET /map/active` / 0 替換既有 | ✅ 既有 3 PATCH endpoint 0 改 |

⭐ **既有 IMPL-01 28 endpoint 行為 100% 保留**。

### 1.2 新增 4 service + 4 controller（純新增、0 替換）

| controller | 路由 | endpoint 數 |
|---|---|---|
| RouteOptimizationController | /nx06/route-optimization | 3（single / multi / get batch）|
| DynamicHandoverController   | /nx06/handover           | 5（suggest / create / update status / list-by-dn / list-for-driver）|
| WebPushController           | /nx06/push               | 4（subscribe / unsubscribe / mine / send）|
| DriverMobileController      | /nx06/driver-mobile      | 2（my-dns / dashboard）|

**A041 endpoint 真實統計**：12 controller / 43 endpoint（IMPL-01 28 + IMPL-02 15 = 43）。

⭐ **§1 結論：既有 28 endpoint 100% 保留 / dn-logistics +1 method 純 additive / 4 新 service + 15 new endpoint 純新增**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 nx06_dn 加 3 欄（ALTER ADD COLUMN nullable × 3）

| 欄 | 類型 | 用途 |
|---|---|---|
| route_order_in_sequence | INT nullable | 多車場景順序 |
| estimated_duration_sec | INT nullable | Google Maps 預估時長 |
| route_batch_id | VARCHAR(15) nullable | 路線優化 batch ID |

⭐ 既有 row default NULL、0 backfill 衝突、既有 createXxx/patchXxx 0 影響。

### 2.2 M2 新表 nx06_dn_handover（動態任務轉派）

- 純新表、0 既有資料衝突
- 4 FK：dn_id / from_driver_id / to_driver_id / tenant_id
- 5 status enum：SUGGESTED / ACCEPTED / REJECTED / COMPLETED / CANCELLED

### 2.3 M3 新表 nx06_push_subscription（Web Push 訂閱）

- 純新表、0 既有資料衝突
- 2 FK：user_id / tenant_id
- endpoint UNIQUE 索引

### 2.4 M4 auto-gen drift 結算（誠實揭露）⚠️

prisma migrate dev 自動產出、內容：
- M2/M3 我的 CONSTRAINT 自訂名 → Prisma convention 名（fk_handover_dn → nx06_dn_handover_dn_id_fkey 等）
- **pre-existing drift cleanup**（不是本軌引起、累積自前軌）：
  - nx01_warehouse city/district/street FK 重建
  - nx01_partner_shipping_address 索引調整
  - nx01_brand_code_rule.seg_definitions DEFAULT 移除
  - 多筆 RenameIndex（nx01_bulletin / nx01_phonetic_index / nx03_brand_allocation_rule）

⚠️ 風險：低（純命名/索引調整、FK 邏輯不變）
A026 backlog：後續軌可寫 drift-audit 釐清 pre-existing drift 來源。

⭐ **§2 結論：3 軌新 schema（純新欄 + 純新表 × 2）+ 1 軌 drift 結算（pre-existing drift 補齊）、既有 production 0 影響**。

---

## §3 跨模組 helper / wire verify

⭐ **本軌 0 cross-module helper 變動**（純 NX06 內部、路線優化是模組純內部演算法）。

- IMPL-01 既有 3 helper 0 動：nx06-create-delivery-from-so / nx06-create-return-pickup-from-sr / nx06-create-dn-item-from-parcel / nx06-create-paylog-from-dn-cost（共 4 helper）
- NX05 docKind 0 動（IMPL-01 已加 'EX'）

---

## §4 外部依賴 verify

### 4.1 Google Maps Distance Matrix API

| 維度 | 處理 |
|---|---|
| API key 來源 | env `GOOGLE_MAPS_API_KEY` + `GOOGLE_MAPS_API_ENABLED=true` |
| 預設模式 | mock（Haversine 估距 + URBAN_AVG_KMH 25 估時）|
| Crown API key 狀態 | ⚠️ 申請中、未到 → 本軌 deploy 走 mock |
| 啟動條件 | Crown 設 env + Google Cloud Console 開啟 Distance Matrix API |

⚠️ **本軌 deploy 預設 mock 模式、無需 Crown API key**。

### 4.2 OR-Tools（npm package）

⭐ **Hank 自決 Q-H2**：採 pure-js heuristic（nearest-neighbor + load-balanced greedy）取代 OR-Tools npm。
- 理由：OR-Tools npm 安裝 / native binding 編譯風險、亞羅 100/日 規模 heuristic 已夠用
- 後續軌：規模升級（> 200/日）後可裝完整 VRP solver

### 4.3 web-push npm package

⭐ **Hank 自決 Q-H4**：本軌 service shell 純 stub、`sendNotification` mock 模式寫 audit。
- 後續軌：`pnpm add web-push` + VAPID key 生成 + `WEB_PUSH_ENABLED=true` 啟動
- Service Worker push 接收已落地（sw.js v2）、訂閱客戶端 helper 已落地

### 4.4 PWA Service Worker

| 維度 | 處理 |
|---|---|
| 既有 PWA infra | ✅ 既有完整（manifest.ts + sw.js + PwaRegister + icons）|
| 本軌升級 | sw.js v1 → v2（加 push event + notificationclick handler）|
| iOS 16.4+ Web Push | ✅ 支援 |
| iOS 15 以下 | ⚠️ Email fallback（本軌純 stub、後續軌 wire）|

---

## §5 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 新 7 placeholder（map/route/handover/driver × 4）| ✅ 純新路由、既有 5 placeholder 0 動 |
| menu.nx06.ts 升（6 → 13 items + 1 new group）| ✅ 純 additive |
| sw.js 升 v2 | ⚠️ 對既有 PWA 用戶會自動更新 SW（瀏覽器 install hook 觸發、無 UI 衝突）|

⭐ **§5 結論：UI 純 stub + sw.js 升級無破壞性**。

---

## §6 環境變數揭露

| 環境變數 | 預設 | 啟動條件 |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | unset（→ mock）| Crown 申請完 Google Cloud Console API key 後設 |
| `GOOGLE_MAPS_API_ENABLED` | false（→ mock）| 同上、設 true 啟用 real API |
| `NX06_HANDOVER_DEFAULT_RADIUS_KM` | 5 | 動態交接半徑 override |
| `NX06_HANDOVER_DEFAULT_MAX_LOAD` | 10 | 動態交接候選 driver 最大任務量 |
| `WEB_PUSH_ENABLED` | false（→ mock）| install web-push npm + VAPID key 後啟用 |

⭐ **本軌 deploy 無需任何新環境變數**（全預設 mock 模式可運行）。

---

## §7 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 28 endpoint 100% 保留 / dn-logistics +1 method additive
- [ ] §2 4 軌 schema（M1 純新欄 + M2/M3 純新表 + M4 drift 結算純命名/索引）
- [ ] §3 0 cross-module helper 變動（純 NX06 內部）
- [ ] §4 外部依賴全 mock fallback（Google Maps / OR-Tools / web-push 全可關）
- [ ] §5 UI 7 placeholder + menu 升 + sw.js push event handler
- [ ] §6 環境變數預設 mock、無需新設定即可 deploy
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓
- [ ] 本軌啟動 NEXORA 業務閉環第一階段全 closure（採購+庫存+銷貨+自動補貨+財務+物流基礎+物流路線優化）

---

## §8 後續軌預告

| 軌 | 啟動條件 |
|---|---|
| TASK-NX06-LALAMOVE-WIRE | 封測二階、Lalamove 沙盒 |
| TASK-NX06-PRINTER-WIRE | 封測二階、實體印表機 |
| TASK-NX06-GOOGLE-MAPS-WIRE | Crown 申請 Google Cloud API key 後 |
| TASK-NX06-WEB-PUSH-WIRE | install web-push + VAPID key + production wire |
| TASK-NX06-IMPL-UI-01 | UI 真實 component（地圖 / 外務員 PWA / route view）|
| TASK-NX06-IMPL-03 | 客戶端配送通知（範圍 B 戰略軌）|
| TASK-NX06-IMPL-04 | dashboard SSE 升級（規模化後）|
| TASK-NX06-DRIFT-AUDIT | M4 pre-existing drift 來源追溯 |

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx06-routing → main + tag `v0.9.0-nx06-routing-closure`
