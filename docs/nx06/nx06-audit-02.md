<!-- docs/nx06/nx06-audit-02.md -->

# NX06-AUDIT-02 — 路線優化 + 動態交接技術選型 verify

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：Crown 拍板 TASK-NX06-IMPL-02 啟動（路線優化 + 動態交接）前 verify
> 對齊：[CLAUDE.md / PROJECT_RULES §I.5 #22 鐵律](../../docs/PROJECT_RULES.md)（Alex 寫 overview 前 verify 技術真相）+ §G.9 通配 grep + §I.6.3 揭露不完整每段尾標
> 真實 main HEAD：`0333b55`（v0.8.0-nx06-closure）

---

## §0 既有真相 verify（A041 精確 count）

| 項目 | 真實值 | 來源 |
|---|---|---|
| NX06 controller 個數 | **8 個** | `find apps/nx-api/src/nx06 -name '*.controller.ts'` |
| NX06 endpoint 個數 | **28 個** | `grep -rE "@(Get\|Post\|Patch\|Put\|Delete)\(" apps/nx-api/src/nx06/ --include='*.controller.ts'` |
| GPS 欄位 | lastLat / lastLng / lastLocationAt（Decimal(12,8) + DateTime、單點不軌跡）| `schema.prisma:4329-4334`（Nx06Dn）|
| GPS 寫入路徑 | `dn-logistics.service.patchDeliveryLocation` + `PATCH /nx06/delivery/:id/location` | `dn-logistics.service.ts:751-768` |
| 既有 HTTP client | ❌ 無（axios / got / undici 都沒裝）| `apps/nx-api/package.json` |
| 既有 WebSocket | ❌ 無（socket.io / @nestjs/websockets 都沒裝）| 同上 |
| 既有 push 服務 | ❌ 無（firebase-admin / @capacitor/push 都沒裝）| 同上 |
| 既有 cron / scheduler | ❌ 無（@nestjs/schedule 都沒裝）| 同上、AR 軌已揭露走外部 cron |
| 既有 frontend RN/Flutter | ❌ 無（純 Next.js 16.1.6 + React 19）| `apps/nx-ui/package.json` |
| 既有 PWA Service Worker | ❌ 無（next-pwa 沒裝）| 同上 |

⭐ **本軌啟動 = 0 基礎 greenfield**：所有外部依賴需新增（HTTP client / push / WebSocket / cron / PWA / 地圖 lib）。

⚠️ §I.6.3：本段 verify 限制：未實測 production runtime 是否已有反向代理 / load balancer 支援 WebSocket（DevOps 軌資訊缺）。

---

## §1 路線優化演算法候選 verify

### 表 1：3 演算法 / 服務評估

| 維度 | Google Maps Distance Matrix API | OSRM 開源自架 | Google OR-Tools 開源 |
|---|---|---|---|
| **技術本質** | HTTP API 外部服務（return matrix of distances/times）| 開源 routing engine（C++、OSM 圖資）| 開源 OR solver（VRP / TSP / CVRP / PDPTW）|
| **計算位置** | Google 雲端 | 自架 server | 本地 Node 程式 |
| **TW 圖資** | ✅ 完整（Google 主資料庫）| ⚠️ OpenStreetMap TW 覆蓋良好但需自更新 | N/A（需配合圖資 API 取距離）|
| **費用模式** | $5 USD / 1000 elements（業界估、需 Crown verify 2026-05 實價）+ Google Cloud free tier $200/mo credit | 自架成本：1 台 t3.medium（~$30/mo）+ 工程維護 | $0 license、需算力（CPU）|
| **配額** | 1000 req/sec hard limit / project | 自架無限制（吃自己機器）| 本地無限制 |
| **多車調度 VRP** | ❌ 純 distance/time matrix、VRP 需外部 solver 配 | ❌ 純 routing、無 VRP solver | ✅ 業界 VRP 標準 solver |
| **開發成本** | 低（HTTP fetch + parse JSON）| 中（Docker 自架 + 圖資更新 pipeline）| 中高（學 OR-Tools API、Python binding 主、Node 走 child_process）|
| **維護負擔** | 0（Google 全包）| 高（圖資季更 + server uptime）| 0（library 隨碼）|
| **典型 use case** | 點對點距離 / ETA | 全道路 routing + ETA | 多車最優分配 / 時間窗 |
| **業界中小 ERP** | ⭐ 主流（70%+）| ⚠️ 中型物流自架（10%）| ⚠️ 大型物流業務（5-10%）|

### 1.1 業界中小 ERP 真實常態

- **單車送貨**（< 5 stops/單）：直接 Google Maps Distance Matrix + 客戶端排序、不跑 VRP
- **多車多單**（每日 > 50 DN）：通常 Google Distance Matrix + OR-Tools VRP solver
- **超大型**（如 Uber / DoorDash）：自架 OSRM + 自寫分配演算法

### 1.2 亞羅規模 verify（需 Crown / Alex 揭露）

⚠️ **未 verify 真相**：
- 亞羅每日真實 DN 數（估 5-30 單？）
- 單台車典型停點數（估 3-10 停？）
- 是否有「同時多車派送」需求 vs「單車跑完才下一車」

⚠️ §I.6.3：無亞羅真實業務量、推薦組合需 Crown 補揭露日均 DN / 車數 / 停點數後再對焦。

---

## §2 動態交接演算法 verify

### 表 2：動態交接演算法 — 業界範式 + 簡化版可行性

| 維度 | Uber Eats 範式 | DoorDash 範式 | Lalamove 範式 | 亞羅簡化版（推薦）|
|---|---|---|---|---|
| **業界術語** | Dynamic Dispatching | Real-time Reassignment | Broadcast + Auction（搶單）| Geo-radius + Load Balance |
| **匹配演算法** | ML 預測 + nearest available + ETA 加權 | 同 + delivery time SLA 約束 | 不匹配、廣播給半徑內所有司機、先搶先得 | 半徑判斷 + 司機任務量平衡 + ETA 估算 |
| **算力需求** | 高（real-time ML inference）| 高（同）| 低（純廣播）| 低（純距離計算 + DB query）|
| **演算法名稱** | Bandit allocation / Hungarian / Auction-based | 同 | First-come-first-serve | Greedy + balance heuristic |
| **NEXORA 簡化可行** | ❌ 過度工程 | ❌ 過度工程 | ⚠️ 適合「外部派遣」（已 Lalamove 整合）| ✅ 適合「內部車隊」（本軌主場景）|

### 2.1 推薦：亞羅簡化版 3 步驟

```
觸發：新 DN 進入 DRAFT、或既有 DN driver 取消
Step 1: 半徑判斷
  - DN.pickup_address → geocoding → (lat, lng)
  - query Dn.lastLat/Lng WHERE status IN (DISPATCHED, IN_TRANSIT) AND driver active
  - haversine 距離 < 5 km 候選池
Step 2: 任務量平衡
  - 候選池內各 driver 當前 task 數（COUNT Dn WHERE status='DISPATCHED' OR 'IN_TRANSIT'）
  - 過濾 task 數 > N 的 driver（avoid overload）
Step 3: ETA 估算
  - 候選池前 3 名 driver 用 Google Maps Distance Matrix 算 ETA
  - 取最短 ETA driver、提供推薦給倉管組長手動拍板（半自動，不 auto-assign）
```

### 2.2 業務語意取捨

- ✅ **半自動而非全自動**：倉管組長最終拍板（業務責任歸屬清楚、合 NX06 既有 Crown Q1 「WAREHOUSE 主寫入」拍板）
- ✅ **不做機會匹配 ML**：亞羅 3-30 單規模、ML 過度工程、heuristic 夠用
- ⚠️ **geocoding 依賴**：DN.pickup_address 是 free-text、需 Google Geocoding API 轉 lat/lng（$5 USD / 1000 req）

⚠️ §I.6.3：未 verify 亞羅是否有「車輛狀態 / 載重 / 車型限制」需求（影響候選池過濾），需 Crown / 倉管組長補揭露。

---

## §3 外務員 App 範式 verify

### 表 3：3 App 範式評估

| 維度 | Web App（純瀏覽器）| PWA（Progressive Web App）| 原生 App（React Native / Flutter）|
|---|---|---|---|
| **開發語言** | 既有 Next.js 直接做 | 既有 Next.js + next-pwa | 新 stack（RN / Flutter）|
| **部署管道** | URL 直接訪問 | URL + 加到主畫面 | App Store / Play Store 審核 |
| **離線支援** | ❌ | ✅（Service Worker cache）| ✅（原生 storage）|
| **Push notification** | ❌（無 native push）| ✅（Web Push API、不需 FCM）| ✅（FCM + APNS）|
| **GPS 後台上傳** | ⚠️ 需 tab 開啟 | ⚠️ 需 tab 開啟（iOS Safari Service Worker 限制嚴）| ✅ 後台 daemon |
| **相機 / 簽名圖** | ✅（getUserMedia）| ✅ 同 | ✅ 原生 API |
| **藍牙列印** | ❌（Web Bluetooth Chrome 限定、Android 主、iOS 不支援）| ❌ 同 | ✅ 原生藍牙 SDK |
| **開發時程** | 1-2 週 | 2-3 週 | 6-12 週 |
| **維護成本** | 低（一套 Next.js）| 低（一套 Next.js + manifest）| 高（Android + iOS 雙 build + store 審核）|
| **業界中小物流** | ⚠️（內部測試）| ⭐ 主流（80%+）| ⚠️ 大型客戶 |
| **業界對標** | 早期 Uber driver | Lalamove driver（部分 PWA）| Uber / DoorDash / Foodpanda driver 主原生 |

### 3.1 亞羅階段推薦

- **封測 / 上線初期（< 6 個月）**：✅ **PWA**（既有 Next.js + next-pwa、開發快、無 app store 審核、可即時 hot fix）
- **規模化（> 100 DN/day）**：⚠️ 考慮升原生（解決 iOS 後台 GPS 限制 + 藍牙列印 + 推播穩定性）
- **後續軌**：TASK-NX06-DRIVER-APP-NATIVE（封測一階 PWA 驗證後決定）

### 3.2 ⚠️ iOS PWA 限制揭露

- iOS Safari PWA 後台 GPS 上傳會被殺（背景任務嚴格限制）
- iOS PWA Web Push 自 iOS 16.4 才支援（2023-03 後）、客戶設備版本需 verify
- 藍牙列印 iOS PWA 完全不可用、需走「Web App 觸發 + 列印走 iPad 接 USB / 藍牙 SDK 走原生」混合方案

⚠️ §I.6.3：未 verify 亞羅外務員設備分佈（iOS vs Android 比例）、推薦組合 iOS 占比 > 50% 時需重新對焦（PWA 風險上升）。

---

## §4 推播服務 verify

### 表 4：推播服務選擇

| 服務 | 對接成本 | 月費 | 適用 §3 App 範式 | 業界中小常用度 |
|---|---|---|---|---|
| **Firebase Cloud Messaging (FCM)** | 中（firebase-admin SDK + Google Cloud project）| $0（無限免費、Google 全包）| 原生 Android / iOS / Web | ⭐⭐⭐ 業界第一（90%+ 用 FCM）|
| **Apple Push Notification (APNS)** | 中（需 Apple Developer Program $99/yr + certificate 管理）| $99/yr | 原生 iOS（FCM 也可代轉 APNS）| ⚠️ 通常 FCM 代轉、極少直連 |
| **Web Push API（Service Worker）** | 低（純前端 + VAPID key）| $0 | PWA only | ⭐⭐ PWA 主流（業界 60-80%）|
| **Twilio SMS（TW）** | 中（API key + 加值帳號）| ~$0.05-0.10 USD / 封 | 所有 | ⚠️ 補充用、單成本高 |
| **Email（SendGrid / SES）** | 低（SMTP / API）| $0~$15/mo | 所有 | ⭐ 補充用（非即時）|

### 4.1 推薦組合（依 §3 App 範式）

- **PWA 階段**：✅ **Web Push API**（純前端、無需 FCM key、開發快）+ Email 補充（重要事件）
- **原生階段**：✅ **FCM** + Email 補充（iOS 走 FCM 代轉 APNS、不直連 APNS）
- **SMS 不推**：成本高、業務不需即時打司機（GPS dashboard 已可見）

⚠️ §I.6.3：未 verify 「外務員配 + 倉管組長配 + 客戶配」3 種角色推播需求差異（客戶端是否需推播 SMS 配送通知？）。

---

## §5 GPS realtime sync 真相 verify

### 表 5：GPS sync 範式

| 維度 | 純 polling | Server-Sent Events (SSE) | WebSocket | Long-polling |
|---|---|---|---|---|
| **方向** | client pull | server push | bi-directional | client pull 假裝 push |
| **既有 NX06 path** | ✅ `GET /nx06/delivery/:id`（讀 lastLat/Lng）| ❌ 無 | ❌ 無 | ❌ 無 |
| **協議** | HTTP REST | HTTP/1.1 streaming | WS upgrade | HTTP |
| **連線數成本** | 低（短連線）| 中（持久 HTTP）| 高（持久 TCP）| 高 |
| **業界中小 ERP** | ⭐ 70% | ⭐ 15% | ⭐ 10% | ⭐ 5% |
| **適合 GPS dashboard** | ✅（10s 輪詢可接受、簡單）| ✅（半即時、單向）| ⚠️ overkill（GPS 上傳本就間隔 30s）| ❌ 沒理由 |

### 5.1 既有 schema 真相（audit-01 + audit-02 verify）

```prisma
model Nx06Dn {
  ...
  lastLat              Decimal?      @map("last_lat") @db.Decimal(12, 8)
  lastLng              Decimal?      @map("last_lng") @db.Decimal(12, 8)
  lastLocationAt       DateTime?     @map("last_location_at")
  ...
}
```

⭐ **schema 取捨：單點不軌跡**（nx06-worklog 主題 3B 已揭露 Crown 拍板）
- 90% 業務只需「現在在哪」、不需歷史軌跡
- 軌跡資料靠 nx01_audit_log 反推（GPS update 寫 audit、可重建）
- 若後續軌需軌跡分析、可加 `nx06_dn_gps_trail` 子表（不破壞主表 query 性能）

### 5.2 外務員 App GPS 上傳頻率

| 頻率 | 電池影響 | dashboard 即時性 | 業界對標 |
|---|---|---|---|
| 每 10 秒 | 重（手機過熱、電量 1h 殺 30%）| 高 | Uber driver |
| 每 30 秒 | 中（電量 1h 殺 ~10%）| 中 | ⭐ Lalamove / 業界主流 |
| 每 1 分鐘 | 輕（電量 1h 殺 ~5%）| 低 | 中小物流 |
| 移動才傳 | 最輕 | 不穩（GPS 漂移誤判靜止）| 進階 |

### 5.3 推薦組合

- **driver App → server**：每 **30 秒** POST `/nx06/delivery/:id/location`（既有 endpoint）
- **dashboard ← server**：**純 polling 每 10 秒** GET DN list with lastLat/Lng（簡單、無需 WebSocket）
- **後續軌**：若 dashboard 同時開 > 10 倉管在看、考慮升 SSE / WebSocket 降 server load

⚠️ §I.6.3：未 verify production server 是否能撐「N driver × 30s POST + M dashboard × 10s GET」吞吐（DevOps 軌資訊缺、需 load test）。

---

## 🗺️ 推薦組合地圖

### ✅ 推薦組合（Alex 寫 overview 前的技術選型基底）

```
┌─────────────────────────────────────────────────────────────────┐
│  亞羅 NX06-IMPL-02 路線優化 + 動態交接 推薦組合（封測一階）        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  §1 路線優化 → Google Maps Distance Matrix API（外部）           │
│             + 客戶端排序（單車場景）/ OR-Tools VRP（多車場景）   │
│                                                                  │
│  §2 動態交接 → 亞羅簡化版（半徑 + 任務量平衡 + ETA 估）          │
│             + 倉管組長半自動拍板（不 auto-assign）                │
│                                                                  │
│  §3 外務員 App → PWA（既有 Next.js + next-pwa、開發 2-3 週）     │
│             + Web Push API（推播）                                │
│                                                                  │
│  §4 推播 → Web Push API（PWA）+ Email 補充（重要事件）           │
│                                                                  │
│  §5 GPS sync → driver 每 30 秒 POST、dashboard 每 10 秒 polling │
│             + 既有 lastLat/Lng 單點 schema 不動                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ⚠️ 需 Crown 拍板的戰略題

1. **§1 亞羅日均 DN 量揭露**（決定 VRP solver 是否需要）
   - 估 < 10 單/天：純 Google Distance Matrix 夠用
   - 估 10-30 單/天：需 OR-Tools VRP
   - 估 > 30 單/天：考慮 OSRM 自架降 Google API 成本

2. **§3 外務員設備分佈揭露**（iOS vs Android 比例）
   - iOS > 50%：PWA 風險上升（後台 GPS / 藍牙）、可能需提前走原生
   - Android > 80%：PWA 100% 適用

3. **§4 客戶端推播範圍**（是否需給客戶推送配送通知？）
   - 不需：Web Push API 純內部用即可
   - 需要：考慮加 SMS（Twilio TW）或 LINE Messaging API（業界 TW 主流）

4. **§5 dashboard 即時性需求**（10s polling vs SSE）
   - 倉管 < 5 人同時看：純 polling 夠用
   - 倉管 > 10 人 / 客戶端要看：SSE 降 server load

5. **路線優化 vs 動態交接 軌序**（同軌做還是分軌）
   - 同軌：TASK-NX06-IMPL-02 一次做完（plan estimate ~15-20 commit、3-4 週）
   - 分軌：路線優化先（IMPL-02）/ 動態交接後（IMPL-03）

### 🔵 後續軌候選

| 軌名 | 啟動條件 |
|---|---|
| TASK-NX06-IMPL-02 路線優化 | 本 audit-02 Crown 拍板後 |
| TASK-NX06-IMPL-03 動態交接 | IMPL-02 closure 後 / 或同軌 |
| TASK-NX06-DRIVER-APP-PWA | 外務員 PWA 落地 |
| TASK-NX06-DRIVER-APP-NATIVE | PWA 驗證 6+ 個月後若規模升級 |
| TASK-NX06-LALAMOVE-WIRE | 封測二階、Lalamove 沙盒 |
| TASK-NX06-PRINTER-WIRE | 封測二階、實體印表機 |
| TASK-NX06-GPS-TRAIL | 軌跡分析需求出現後（加 nx06_dn_gps_trail 子表）|
| TASK-NX06-DASHBOARD-SSE | dashboard 即時性升級（polling → SSE）|
| TASK-NX06-CUSTOMER-NOTIFY | 客戶端配送通知（SMS / LINE）|

---

## §6 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / 倉管組長補揭露事項：

1. **§1.2** 亞羅日均 DN 數 / 單車典型停點數 / 多車並行需求
2. **§2.2** 車輛狀態 / 載重 / 車型限制需求
3. **§3.2** 外務員設備 iOS vs Android 比例
4. **§4.1** 客戶端推播範圍（要不要給客戶推送）
5. **§5.3** production server 對 polling 吞吐量
6. **§0** production 反向代理是否支援 WebSocket（DevOps 軌資訊缺）
7. **本 audit 全段** Google Maps API 2026-05 實價（業界估值 $5 / 1000 elements、需 Crown / Alex verify Google Cloud Console 真實計價頁）

---

## §7 audit-02 vs audit-01 對比

| 維度 | audit-01（IMPL-01 前）| audit-02（IMPL-02 前）|
|---|---|---|
| 性質 | 既有 schema + service 真相揭露 | 技術選型 + 外部 API 真相 |
| 範圍 | 內部 codebase 完整 grep | 內外部混合（codebase + 業界對標 + 外部 API）|
| 推薦 | 補完 10 業務功能（已落地） | 5 段技術選型 + 5 戰略題待拍板 |
| 後續產出 | nx06-impl-01-plan.md → 6 Phase 8 commit | 待 Crown 拍板 5 戰略題後、Alex 寫 nx06-overview-v0.2.md → nx06-impl-02-plan.md |

---

> 文件版本：v1.0（NX06-AUDIT-02 純諮詢、5 段 5 表 + 1 地圖）
> 待 Crown 拍板 5 戰略題（§推薦組合地圖 ⚠️ 段）→ Alex 寫 overview-v0.2 → Hank 寫 nx06-impl-02-plan
