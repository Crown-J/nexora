<!-- docs/nx06/spec/impl/nx06-impl-02-plan.md -->

# TASK-NX06-IMPL-02 — 路線優化 + 動態交接 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 分支：`feature/nx06-routing`（自 main HEAD `2b9ab05` 切出、v0.8.0-nx06-closure + audit-02 後）
> 對應依據：[nx06-overview v0.2.0](../intent/nx06-overview-v02.md) + [nx06-audit-02](../../nx06-audit-02.md)
> 紀律：對齊 NX05/NX06-IMPL-01 範式（Q-RHYTHM-2 第三次落地）

---

## §0 計畫文件性質

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview v0.2.0 沒提到的新需求）
- Google Maps API key 未到 → 進 mock 框架 fallback（不 stop）
- OR-Tools VRP solver 安裝/編譯問題 → stop
- PWA Service Worker 設定衝突 → stop
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 7 業務功能（對齊 overview v0.2.0 §4.1）

| # | 功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | 路線優化（單車）Google Maps Distance Matrix | ✅ lastLat/Lng | 0 | 新建 RouteOptimizationService | 🟡 stub |
| 2 | **路線優化（多車 VRP）OR-Tools** ⭐ | ✅ lastLat/Lng | 0 | 同上 | 🟡 stub |
| 3 | **動態任務轉派（亞羅簡化版）** ⭐⭐⭐ | ⚠️ schema 補 | M2 +handover 表 | 新建 DynamicHandoverService | 🟡 stub |
| 4 | 外務員 PWA App | — | — | 新建 DriverMobileService | next-pwa setup + 4 page |
| 5 | 倉管組長地圖視圖 | — | — | 既有 dn-logistics.service 加 list-active | 🟡 map view stub |
| 6 | 推播服務（Web Push + Email fallback）| ❌ | M3 +push subscription 表 | 新建 WebPushService | — |
| 7 | GPS realtime sync（30s+10s polling）| ✅ 既有 patchLocation | 0 | 既有 endpoint | 🟡 driver App background sync |

---

## §2 拓樸排序 4 層

### L1 — 基礎層（schema + 新建 4 service）

- **M1** Nx06Dn +路線優化欄（routeOrderInSequence + estimatedDurationSec）
- **M2** 新表 Nx06DnHandover（動態交接紀錄）
- **M3** 新表 Nx06PushSubscription（Web Push 訂閱）
- 新建 4 service：
  - **RouteOptimizationService**（Google Maps Distance Matrix + OR-Tools VRP）
  - **DynamicHandoverService**（亞羅簡化版半徑+任務量+ETA）
  - **WebPushService**（VAPID + subscription + send）
  - **DriverMobileService**（外務員 App 後端 API：list assigned DN / accept handover / heartbeat）

### L2 — 既有 service 升級

- **dn-logistics.service 加 2 method**：
  - `listActiveForMap`（dashboard map view、含 GPS lastLat/Lng + driver name）
  - `bulkAssignFromRouteOpt`（路線優化結果批次寫入 Dn.driverUserId）

### L3 — 跨模組 wire（內部、無 production 外接）

⭐ **本軌全 NX06 內部、0 cross-module helper**（路線優化是 NX06 純內部演算法）

### L4 — UI + PWA

- **next-pwa setup**：manifest.json + Service Worker + offline 基本支援
- **倉管組長地圖視圖**：`/dashboard/nx06/map` placeholder（後續軌真實 component）
- **外務員 PWA**：`/dashboard/nx06/driver` 4 placeholder（home / tasks / map / handover）
- **menu.nx06.ts 升**：加 map view + driver entry

---

## §3 Migration 拆軌策略（A041 精確 = **3 軌**）

### M1 — `nx06_dn_route_optimization_columns`（路線優化欄）

範圍：
```sql
ALTER TABLE "nx06_dn" ADD COLUMN "route_order_in_sequence"   INT;          -- 多車場景：在某外務員 batch 內的順序
ALTER TABLE "nx06_dn" ADD COLUMN "estimated_duration_sec"    INT;          -- Google Maps Distance Matrix 預估
ALTER TABLE "nx06_dn" ADD COLUMN "route_batch_id"            VARCHAR(15);  -- 路線優化 batch id (multi-DN 批次)
```

性質：ALTER ADD COLUMN nullable × 3、0 backfill 衝突。

### M2 — `nx06_dn_handover_table`（動態交接紀錄）

新表 Nx06DnHandover：
```sql
CREATE TABLE "nx06_dn_handover" (
  id              VARCHAR(15) PRIMARY KEY,
  tenant_id       VARCHAR(15) NOT NULL,
  dn_id           VARCHAR(15) NOT NULL,
  from_driver_id  VARCHAR(15) NOT NULL,
  to_driver_id    VARCHAR(15) NOT NULL,
  handover_lat    DECIMAL(12, 8),         -- 交接地點推薦 lat
  handover_lng    DECIMAL(12, 8),         -- 交接地點推薦 lng
  handover_address VARCHAR(200),          -- 交接地點地址（人類可讀）
  status          VARCHAR(20) DEFAULT 'SUGGESTED',  -- SUGGESTED / ACCEPTED / REJECTED / COMPLETED / CANCELLED
  reason          VARCHAR(200),           -- 演算法推薦理由（半徑 X km / 任務量平衡 / ETA 短 N 分）
  suggested_by    VARCHAR(15) NOT NULL,   -- 倉管組長 user_id
  suggested_at    TIMESTAMP(3) DEFAULT now() NOT NULL,
  accepted_at     TIMESTAMP(3),
  completed_at    TIMESTAMP(3),
  created_at      TIMESTAMP(3) DEFAULT now() NOT NULL,
  updated_at      TIMESTAMP(3) NOT NULL,
  updated_by      VARCHAR(15) NOT NULL,
  CONSTRAINT fk_handover_dn FOREIGN KEY (dn_id) REFERENCES "nx06_dn"(id),
  CONSTRAINT fk_handover_from FOREIGN KEY (from_driver_id) REFERENCES "nx01_user"(id),
  CONSTRAINT fk_handover_to FOREIGN KEY (to_driver_id) REFERENCES "nx01_user"(id),
  CONSTRAINT fk_handover_tenant FOREIGN KEY (tenant_id) REFERENCES "nx99_tenant"(id)
);
CREATE INDEX idx_handover_dn ON "nx06_dn_handover"(dn_id);
CREATE INDEX idx_handover_status ON "nx06_dn_handover"(tenant_id, status);
```

### M3 — `nx06_push_subscription_table`（Web Push 訂閱）

新表 Nx06PushSubscription：
```sql
CREATE TABLE "nx06_push_subscription" (
  id            VARCHAR(15) PRIMARY KEY,
  tenant_id     VARCHAR(15) NOT NULL,
  user_id       VARCHAR(15) NOT NULL,
  endpoint      VARCHAR(500) NOT NULL,    -- Web Push API endpoint URL
  p256dh_key    VARCHAR(200) NOT NULL,    -- VAPID public key
  auth_key      VARCHAR(100) NOT NULL,    -- subscription auth secret
  user_agent    VARCHAR(500),             -- browser identifier (for debugging)
  is_active     BOOLEAN DEFAULT true NOT NULL,
  created_at    TIMESTAMP(3) DEFAULT now() NOT NULL,
  updated_at    TIMESTAMP(3) NOT NULL,
  updated_by    VARCHAR(15) NOT NULL,
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES "nx01_user"(id),
  CONSTRAINT fk_push_tenant FOREIGN KEY (tenant_id) REFERENCES "nx99_tenant"(id)
);
CREATE UNIQUE INDEX idx_push_endpoint ON "nx06_push_subscription"(endpoint);
CREATE INDEX idx_push_user_active ON "nx06_push_subscription"(tenant_id, user_id, is_active);
```

性質：純新表、0 既有資料衝突。

---

## §4 commit 拆軌（A041 估 = **15~20 commit**）

| Phase | commit | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0（本檔）|
| Phase 1 | 3 | M1 + M2 + M3 schema migrate dev |
| Phase 2 | 2 | L1 RouteOptimizationService shell + DynamicHandoverService shell |
| Phase 3 | 3 | L2 OR-Tools VRP integration / Google Maps client / haversine helper |
| Phase 4 | 2 | WebPushService + DriverMobileService + dn-logistics 升 listActiveForMap |
| Phase 5 | 2 | PWA next-pwa setup + Service Worker + manifest |
| Phase 6 | 2 | UI placeholders（map view + driver 4 page）+ menu.nx06.ts 升 |
| Phase 7 | 1 | summary + worklog 主題 5 + _team 主題 27 + merge-verify |
| 收尾 | 1 | pre-merge / merge / push + tag v0.9.0-nx06-routing-closure（Crown 拍板後）|

**估計**：13 + 1 收尾 = 14 commit、可能因 OR-Tools 整合複雜度浮動 ±3。

---

## §5 拍板 Q 對齊 overview v0.2.0

| Q | 拍板 | 影響 |
|---|---|---|
| Q1 亞羅日均 DN | 100 張、需 VRP solver | OR-Tools 必裝 |
| Q2 App 範式 | PWA + iOS Web Push 16.4+ + Email fallback | next-pwa + email job |
| Q3 客戶推播 | 不做 | WebPushService 只支援內部 user |
| Q4 dashboard | polling 10 秒 | 不裝 WebSocket / SSE |
| Q5 軌序 | 同軌 IMPL-02 全部 | 7 功能一次性 |

**本軌 Hank 自決 Q（plan 階段）**：

| Q | Hank 自決 | 理由 |
|---|---|---|
| Q-H1 Google Maps Distance Matrix client | 純 `fetch()` + 環境變數 `GOOGLE_MAPS_API_KEY` | 既有 nx-api 0 HTTP client、加 axios 過度、fetch 原生足夠 |
| Q-H2 OR-Tools npm package | `ortools-vrp-js` 或 `@google/or-tools` | 二選一視 npm install 成功度、fallback pure-js heuristic |
| Q-H3 mock fallback | API key 未到時 mock 返回 sequenced order（lineNo asc）| 同 Lalamove 範式、env `GOOGLE_MAPS_API_ENABLED=false` |
| Q-H4 Web Push VAPID | 用 `web-push` npm package（業界標準）| 不重造輪子 |
| Q-H5 動態交接半徑 | 預設 5 km、env override | 亞羅未提供精確值、5km 業界估 |
| Q-H6 driver heartbeat | 既有 PATCH `/nx06/delivery/:id/location` 足夠 | 不另建 endpoint |
| Q-H7 push subscription endpoint | POST `/nx06/push/subscribe` + DELETE `/nx06/push/unsubscribe` | 對齊 Web Push API spec |
| Q-H8 動態交接 controller | 新建 `dynamic-handover.controller.ts` (`/nx06/handover/`) | 對應新 service |

---

## §6 邊界守住

- ✅ **既有 dn-logistics.service createXxx/patchXxx/簽收 0 動**（同 IMPL-01 Phase 3 紀律）
- ✅ **既有 28 endpoint 行為 100% 保留**
- ✅ **OR-Tools 純 local lib，無外部 API 依賴**
- ⚠️ **Google Maps API key 依賴**：未到時走 mock、deploy 時 Crown 設定 env
- ⚠️ **PWA Service Worker 對既有 nx-ui 影響**：next-pwa 加入後 Service Worker 全域 register、需 verify 對既有 page route 0 影響
- ⚠️ **新增 npm 依賴**：`web-push` / OR-Tools binding，需 verify install 順暢

---

## §7 風險清單

| 風險 | 機率 | 影響 | mitigation |
|---|---|---|---|
| OR-Tools npm package 不存在 / 編譯失敗 | 中 | 大（VRP 功能無法落地）| fallback pure-js heuristic（nearest-neighbor + 2-opt）|
| Google Maps API key Crown 未到 | 高（已揭露）| 中 | mock 框架（同 Lalamove 範式）|
| PWA Service Worker 與 Next.js 16 衝突 | 低 | 中 | next-pwa 官方支援 Next.js 16、若衝突 fallback 純 manifest + 不裝 Service Worker |
| iOS 16.4+ Web Push 限制 | 確定 | 小 | Email fallback 已 plan |
| `web-push` VAPID key 配發 | 低 | 小 | 寫一次性 script 產 VAPID key、env 設定 |

---

## §8 後續軌預告（封測後啟動）

- TASK-NX06-IMPL-UI-01：UI 真實落地（地圖 component / 外務員 App 真實 UI / route view）
- TASK-NX06-LALAMOVE-WIRE：Lalamove 沙盒 wire
- TASK-NX06-PRINTER-WIRE：熱感印表機 wire
- TASK-NX06-IMPL-03：客戶端配送通知（範圍 B 戰略軌）
- TASK-NX06-IMPL-04：dashboard SSE 升級（規模化後）
- TASK-NX06-IMPL-05：完整 VRP solver（亞羅規模 > 200/日 後）

---

> 文件版本：v0.1.0（IMPL-02 plan 初版、Q-RHYTHM-2 第三次落地）
> 待 plan commit 後 → Phase 1 schema 開工
