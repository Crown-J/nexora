<!-- docs/_team/nx06-pwa-audit-01.md -->

# NX06-PWA-AUDIT-01 — NX06 外務員 PWA 既有 UI + endpoint 真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：NEXORA v1.5 NX09 雙軌完整化（main HEAD `13fab41`、13 tag）後 Crown 啟動「UI 真實化軌」階段 1（員工手機優先）、Alex 寫 v0 Mobile Card 指令前 verify
> 對齊：[NX-UI-AUDIT-01](./ui-audit-01.md) §7 揭露「9 角色 dashboard」+ §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 量級總覽（A041 精確）

```
NX06 backend controller × 12          → 43 endpoint（@Get|Post|Patch|Delete 計數）
NX06 backend service                  → 12 個（一對一 controller）
NX06 driver-mobile controller         → 2 endpoint（GET /my-dns + /dashboard）
NX06 frontend page                    → 12 個（含 driver/* 4 個）
NX06 driver/* PWA page                → 4 個（全 placeholder）
NX06 features/                        → 1 file（push-subscription.ts）
PWA Service Worker                    → public/sw.js（純手寫、48 行）
PWA manifest.json                     → ❌ 不存在
next-pwa npm package                  → ❌ 未安裝
```

**最重大揭露**：
- ⚠️ **沒有 manifest.json**（瀏覽器 install prompt 條件不完整）
- ⚠️ **沒用 next-pwa 套件**（純手寫 Service Worker + Web Push）
- ✅ Web Push **後端完整**（subscribe / unsubscribe / sendNotification、43 endpoint 中含 4）
- ⚠️ Web Push **send 是 stub**（VAPID + web-push lib 留 backlog、Hank Q-H4 揭露）
- ❌ **driver/* 4 PWA page 全 placeholder**（0 button / 0 form / 0 真實 UI）

### §I.6.3 §0 揭露不完整

- 未 verify 瀏覽器實際安裝 PWA 流程能否走通（無 manifest 可能僅 iOS apple-touch-icon 可用、Android Chrome install prompt 不出現）
- 未 verify VAPID public key env 變數是否已配發（push subscribe 走通需要）

---

## §1 NX06 既有 endpoint 真相（A041 精確 = 43 endpoint / 12 controller）

### 1.1 endpoint × 12 controller 全清單

| controller | route prefix | endpoint 數 | 主要 endpoint | 角色（@Roles）| 給誰用 |
|---|---|---|---|---|---|
| **DriverMobileController** ⭐ | `/nx06/driver-mobile` | 2 | GET `/my-dns` + GET `/dashboard` | SYSADMIN/OWNER/WAREHOUSE | **外務員 PWA 首頁 + 任務頁** |
| **DynamicHandoverController** ⭐⭐⭐ | `/nx06/handover` | 5 | POST `/suggest` / POST `/` / PATCH `/:id/status` / GET `/dn/:dnId` / GET `/driver/:driverId` | SYSADMIN/OWNER/WAREHOUSE | **倉管組長派 + 外務員接** |
| DeliveryController | `/nx06/delivery` | 6 | GET / GET `/:id` / POST / PATCH `/:id/location` / PATCH `/:id` / DELETE | SYSADMIN/OWNER | 配送單 CRUD + GPS 上傳 |
| PickupController | `/nx06/pickup` | 5 | CRUD（list/get/post/patch/delete）| SYSADMIN/OWNER | 取貨單 |
| ReturnPickupController | `/nx06/return-pickup` | 5 | CRUD | SYSADMIN/OWNER | 退貨取件 |
| IntlShippingController | `/nx06/intl-shipping` | 5 | CRUD | SYSADMIN/OWNER | 國際運輸 |
| DnOpsController | `/nx06/dn-ops` | 4 | PATCH `/stops/:stopId/exception` / PATCH `/items/:itemId/exception` / PATCH `/items/:itemId/internal-cost` / GET `/map/active` | SYSADMIN/OWNER/WAREHOUSE | **異常回報 + 倉管組長地圖** |
| **WebPushController** ⭐ | `/nx06/push` | 4 | POST `/subscribe` / DELETE `/subscribe` / GET `/mine` / POST `/send` | SYSADMIN/OWNER/WAREHOUSE | **PWA 推播訂閱** |
| RouteOptimizationController | `/nx06/route-optimization` | 3 | POST `/single-vehicle` / POST `/multi-vehicle` / GET `/batch/:batchId` | SYSADMIN/OWNER/WAREHOUSE | 倉管組長派工 |
| LalamoveIntegrationController | `/nx06/lalamove` | 2 | POST `/:dnId/create` / POST `/webhook` | SYSADMIN/OWNER/WAREHOUSE | 第三方物流 webhook |
| DispatchController | `/nx06/dispatch` | 1 | PATCH `/:dnId/assign` | SYSADMIN/OWNER/WAREHOUSE | 倉管組長派 driver |
| PrinterIntegrationController | `/nx06/printer` | 1 | POST `/:dnId/print` | SYSADMIN/OWNER | 列印 |

⭐ **A041 真實：43 endpoint / 12 controller**。

### 1.2 業務語意分類：手機（外務員）vs 桌面（倉管組長）

| 用途 | endpoint 屬於外務員 PWA 用 | endpoint 屬於倉管組長桌面用 |
|---|---|---|
| 看任務 | ✅ GET `/driver-mobile/my-dns`、GET `/driver-mobile/dashboard` | GET `/delivery` + GET `/pickup` 等 list |
| 領任務 / 接派工 | ✅ PATCH `/handover/:id/status`（接受 / 拒絕）| POST `/dispatch/:dnId/assign`（指派）|
| 動態交接 ⭐⭐⭐ | ✅ PATCH `/handover/:id/status` + GET `/handover/driver/:driverId` | POST `/handover/suggest` + POST `/handover` |
| 配送中 GPS 上傳 | ✅ PATCH `/delivery/:id/location`（heartbeat 30s）| GET `/dn-ops/map/active`（看 driver 位置）|
| 簽收 / 完成 | ✅ PATCH `/delivery/:id`（含 signature 結構）| - |
| 異常回報 | ✅ PATCH `/dn-ops/stops/:stopId/exception` + PATCH `/dn-ops/items/:itemId/exception` | - |
| 路線取得 | ✅ GET `/route-optimization/batch/:batchId` | POST `/single-vehicle` + `/multi-vehicle` |
| 推播訂閱 | ✅ POST `/push/subscribe` + DELETE `/push/subscribe` | POST `/push/send` |

### 1.3 重點 endpoint 細節揭露

#### 1.3.1 任務接收（外務員 PWA 主入口）

```
GET /nx06/driver-mobile/dashboard
→ { todayActive, todayCompleted, pendingHandovers, activeBatchId }

GET /nx06/driver-mobile/my-dns
→ { count, rows: [{ id, docNo, status, logisticsType, routeBatchId,
                    routeOrderInSequence, estimatedDurationSec,
                    lastLat, lastLng, lastLocationAt,
                    rev_Nx06DnStop_dnId: [{ stopNo, address,
                                            contactName, contactPhone, status }] }] }
```

⭐ status 範圍：DRAFT / DISPATCHED / IN_TRANSIT / CUSTOMS / ARRIVED / DELIVERED / PICKED_UP / COMPLETED。

#### 1.3.2 動態交接 ⭐⭐⭐（業界改革核心）

```
GET /nx06/handover/driver/:driverId
→ 列當前 driver 的 SUGGESTED + ACCEPTED handover
→ include: { dn: { id, docNo, status } }

PATCH /nx06/handover/:id/status
body: { status: 'SUGGESTED'|'ACCEPTED'|'REJECTED'|'COMPLETED'|'CANCELLED' }
→ COMPLETED transition 自動：
   1. dn.driverUserId 轉移為 toDriverId
   2. NX10 wire：fromDriver + toDriver 各 +25 Exp（v1.4.0 落地、業界改革 ⭐⭐⭐）
```

⭐ 狀態流轉守規：SUGGESTED → ACCEPTED → COMPLETED；任意 → CANCELLED；ACCEPTED 前 → REJECTED。

#### 1.3.3 簽收（PatchDeliveryDto 含 SignatureDto）

```
PATCH /nx06/delivery/:id
body: {
  status: string,                    // 通常 DELIVERED
  signature?: {
    signerType: string,              // 1 字（C 客戶 / R 收件 / O 其他）
    signerName: string,              // ≤ 50 字
    signatureUrl?: string,           // ≤ 500 字（簽名圖 URL）
    stopId?: string,                 // 指定 stop
  },
  vehicleNo?: string,
  remark?: string,
}
```

⚠️ **重大缺口**：DTO 有 `signatureUrl` field 但**沒有 file upload endpoint**（簽名圖 / 照片上傳需要單獨 upload service、本軌未 verify）。

#### 1.3.4 配送異常回報（4 enum）

```
PATCH /nx06/dn-ops/stops/:stopId/exception
body: { exceptionRemark: string }    // ≤ 200 字（停點層級、例：客戶不在 / 地址錯誤）

PATCH /nx06/dn-ops/items/:itemId/exception
body: {
  exceptionType: 'W'|'Q'|'D'|'O',    // W=送錯 / Q=數量 / D=破損 / O=其他
  exceptionReason?: string,
}
```

#### 1.3.5 GPS 上傳（heartbeat）

```
PATCH /nx06/delivery/:id/location
body: { lat: -90..90, lng: -180..180, timestamp?: ISO date }
```

⭐ **Hank Q-H6 拍板**：driver heartbeat 沿用既有 PATCH `/nx06/delivery/:id/location`（不新建 `/heartbeat` endpoint）。

#### 1.3.6 路線取得

```
GET /nx06/route-optimization/batch/:batchId
→ { batchId, dnSequence: [{ dnId, docNo, routeOrderInSequence, ... }] }
```

⭐ 外務員 PWA 拿 `driver-mobile/dashboard.activeBatchId` → 呼此 endpoint 取得當日訪問順序。

### §I.6.3 §1 揭露不完整

- 未 verify 簽名圖 / 照片上傳 endpoint（看似在 NX09 IMPL-01 backlog 留 file upload service、本軌 NX06 無 dedicated upload endpoint）
- 未 verify DnOps 異常回報是否 wire 給倉管組長即時通知（push notification 流程？）
- 未 verify Pickup / ReturnPickup / IntlShipping 是否也有 driver-mobile 等價（目前只有 Delivery 是 driver 主流量）

---

## §2 NX06 既有 frontend 真相

### 2.1 PWA 路由清單（A041 精確 = 4 page）

```
apps/nx-ui/src/app/dashboard/nx06/driver/
├── page.tsx              → @FUNCTION_CODE NX06-DRIVER-HOME-UI-001-F01
├── tasks/page.tsx        → @FUNCTION_CODE NX06-DRIVER-TASKS-UI-001-F01
├── map/page.tsx          → @FUNCTION_CODE NX06-DRIVER-MAP-UI-001-F01
└── handover/page.tsx     → @FUNCTION_CODE NX06-DRIVER-HANDOVER-UI-001-F01
```

⚠️ **4 個 driver/* PWA page 全 NxWorkspacePlaceholder**：
- 0 button / 0 form / 0 onClick
- 純文字 + 🚧 emoji + 對應 API hint 揭露
- 對應 menu.nx06.ts `group: '外務員 PWA App' { driver.home / tasks / map / handover }` 4 items

### 2.2 features/nx06 既有檔案（A041 精確 = 1 file）

```
apps/nx-ui/src/features/nx06/
└── push-subscription.ts     ← 純 helper（subscribeToPush / unsubscribeFromPush / isPushSupported）
```

⚠️ **features/nx06/ 只有 1 個 helper file、0 component / 0 UI**（對比 features/nx01/ 含 PO/PR/RFQ/RR 完整 component layer）。

### 2.3 既有 NX06 frontend api / hook（A041 精確 = 0）

```
grep apps/nx-ui/src -rE "/nx06/(driver-mobile|handover|delivery|dn-ops|push)" → 0 hit
```

⚠️ **NX06 frontend 0 API call wire**（push-subscription.ts 用 fetch 但走 `/api/nx06/push/subscribe` 是 Next API route 而非直接打 backend）。

### 2.4 ProNx10LeftPanel 範式對應 NX06？

對齊 [ui-audit-01 §5.3](./ui-audit-01.md)：

```
components/dashboard/LeftPanel/
├── CheckinCard / CheckinRewardModal / DailyGoalCard / DailyReportBtn / MonthlyGoalCard
（全 NX10 八角遊戲化用、與 NX06 物流無關）
```

⚠️ **NX06 既有 0 frontend component**（無 DriverDashboardPanel / DriverTaskCard / DriverHandoverPanel 等）— 全在 placeholder 階段。

### 2.5 既有 Mobile UI 範式（可供 v0 借鏡）

對齊 [ui-audit-01 §3.3](./ui-audit-01.md) 揭露：

```
apps/nx-ui/src/features/sale/ui/
├── hub/SalesHubMobile.tsx                  ← 銷售 hub 行動端範式
├── inquiry/MobileInquiryListPage.tsx       ← 列表 + 狀態 chip 篩選
├── inquiry/MobileInquiryDetailPage.tsx     ← 詳情 + 動作
├── inquiry/MobileQTDetailPage.tsx          ← QT 詳情
├── inquiry/components/                     ← AdoptQuoteDialog / ConfirmDialog / InquiryListItem / VendorQuoteInput / VendorQuoteItem
├── sop-workspace/MobileSaleSopPage.tsx     ← SOP 工作流
└── sop-workspace/components/
    └── FloatingToast.tsx                   ← 自製 toast（無第三方庫）
```

⭐ **NEXORA 已有 4 個 Mobile* prefix 真實 page**（全在 sale module）+ FloatingToast 自製範式 + 安全區 padding (`pb-[calc(env(safe-area-inset-bottom)+4rem)]`) + 狀態 chip filter pattern。

### §I.6.3 §2 揭露不完整

- 未 verify 4 個 Mobile* page 是 PWA 安裝後在 iOS Safari home screen 可獨立啟動 vs 純 browser tab
- 未 verify Mobile* page 是否有針對 PWA 行動裝置額外設定（手勢 / haptic / install prompt）

---

## §3 PWA 技術棧真相

### 3.1 npm package（A041 精確）

對齊 [apps/nx-ui/package.json](../../apps/nx-ui/package.json)：

| 套件 | 版本 | 性質 |
|---|---|---|
| next | 16.1.6 | Framework |
| react / react-dom | 19.2.3 | UI |
| **next-pwa** | ❌ **未安裝** | 業界 PWA 標配套件 |
| **next-pwa-workbox** | ❌ 未安裝 | - |
| **workbox-*** | ❌ 未安裝 | - |
| web-push | ❌ 未安裝（backend 用、待 backlog Hank Q-H4）| Web Push 後端 lib |
| serwist | ❌ 未安裝 | Next 16 替代 next-pwa 候選 |

### 3.2 Service Worker（純手寫、48 行）

對齊 [apps/nx-ui/public/sw.js](../../apps/nx-ui/public/sw.js)：

| Handler | 行為 |
|---|---|
| `install` | `self.skipWaiting()` 立即激活 |
| `activate` | 清舊版 cache（CACHE_NAME = `nexora-pwa-v2`）+ `self.clients.claim()` |
| `fetch` | **空 handler**（無 offline cache strategy、純讓瀏覽器知道有 SW 控制）|
| `push` | parse JSON payload → `showNotification(title, { body, icon, badge, tag, data: { url } })` |
| `notificationclick` | 找 existing tab focus or `clients.openWindow(url)` |

⚠️ **缺口揭露**：
- ❌ 0 offline cache strategy（`fetch` 空、無 Cache First / Network First / Stale While Revalidate）
- ❌ 0 background sync（API 失敗時排隊重送）
- ❌ 0 periodic sync（推送 GPS heartbeat 即使背景）
- ⚠️ SW 在 `process.env.NODE_ENV === 'production'` 才註冊（dev 不註冊、避免 HMR 干擾）

### 3.3 manifest.json — ❌ **不存在**

```
ls apps/nx-ui/public/manifest* → No such file
```

⚠️ **重大缺口**：無 manifest.json 後果：
- Chrome / Edge Android **不會出現 install prompt**（PWA install 條件之一）
- 無 `name` / `short_name` / `start_url` / `display` / `theme_color` / `background_color`
- 無 `screenshots` / `categories` / `shortcuts`（PWA 進階特性全缺）
- iOS Safari 部分功能仍可用（apple-touch-icon + appleWebApp meta 已設）

✅ **既有彌補**：
- `apps/nx-ui/src/app/layout.tsx` 設了 `appleWebApp: { capable: true, title: 'NEXORA GRID', statusBarStyle: 'black-translucent' }`
- `viewport: { themeColor: '#141414', colorScheme: 'dark' }`
- 5 icon size（favicon.ico + 16/32/192/512 png + apple-touch-icon.png）

→ **iOS Safari「加到主畫面」可工作 + Android 部分功能可工作、但 Android 沒有正規 PWA install prompt**。

### 3.4 Web Push wire 真相

#### 3.4.1 frontend（push-subscription.ts、純手寫 helper）

```typescript
isPushSupported() → check serviceWorker + PushManager + Notification
subscribeToPush(vapidPublicKey)
  → Notification.requestPermission()
  → navigator.serviceWorker.ready
  → reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  → POST /api/nx06/push/subscribe { endpoint, p256dhKey, authKey, userAgent }
unsubscribeFromPush()
  → sub.unsubscribe()
  → DELETE /api/nx06/push/subscribe { endpoint }
```

⚠️ **打的是 `/api/nx06/push/subscribe`**（Next API route），未 verify 是否有對應 proxy route（apps/nx-ui/src/app/api/nx06/push/subscribe/route.ts？）— 推測 stub。

#### 3.4.2 backend（4 endpoint、subscribe 完整、send 是 stub）

```
POST /nx06/push/subscribe  → 寫 Nx06PushSubscription（schema 在）
DELETE /nx06/push/subscribe → 軟刪除 is_active=false
GET /nx06/push/mine        → debug
POST /nx06/push/send       → ⚠️ stub（web-push lib 留 backlog、寫 audit 但不實際 HTTP push）
```

⭐ Hank Q-H4 紀律：**send 是 stub**：
- `WEB_PUSH_ENABLED` env 未設時 mock 模式
- 對應 schema `Nx06PushSubscription` 已落地（NX06-IMPL-02 M3 migration）
- VAPID key 生成 + web-push npm install 留 backlog

#### 3.4.3 wire 鏈完整度

| 階段 | 狀態 |
|---|---|
| SW push handler | ✅ 完整（show notification）|
| 訂閱 → backend store | ✅ 完整 |
| backend 發送 push | ⚠️ stub（待 backlog 裝 web-push lib）|
| iOS 16.4+ 支援 | ⚠️ frontend 揭露需此版本、production 未測 |
| Email fallback（iOS 15-）| ❌ stub（features/nx06/push-subscription.ts header 提及）|

### §I.6.3 §3 揭露不完整

- 未 verify Next 16.1 + React 19 是否與 next-pwa / serwist 相容（Next 15+ 後 next-pwa 維護不活躍）
- 未 verify VAPID key env 變數命名 + 生成流程
- 未 verify apps/nx-ui/src/app/api/nx06/push/subscribe/route.ts 是否存在（proxy 到 backend?）

---

## §4 業界改革承載對齊 verify

### 4.1 NX06 動態交接獎勵 wire（v1.4.0 NX10-IMPL-02 落地、業界改革 ⭐⭐⭐）

對齊 [NX10-IMPL-02 Phase 5](../nx10/spec/impl/) + [NX09-AUDIT-02 §0](../nx09/nx09-audit-02.md)：

```
PATCH /nx06/handover/:id/status { status: 'COMPLETED' }
  ↓
DynamicHandoverService.updateStatus
  ↓
[ 1 ] dn.driverUserId = toDriverId（轉移）
[ 2 ] try { createRewardFromHandover(tx, expService, { tenantId, handoverId, actorUserId }) }
       → fromDriver + toDriver 各 +25 Exp
       → reason prefix HANDOVER:<handoverId>（冪等）
       catch err → console.warn（不阻擋）
```

⭐ **業界改革承載點**：Mobile Card UI 上需展示「接受動態交接 → 雙方 +25 Exp」獎勵視覺化（business value 對應）。

### 4.2 簽收流程 endpoint

```
PATCH /nx06/delivery/:id  ← 含 signature: { signerType, signerName, signatureUrl?, stopId? }
```

⚠️ **signatureUrl 上傳缺口**：
- DTO 收 URL string（≤ 500 字）、但**沒有 dedicated file upload endpoint**
- 業界範式：簽名 canvas + 上傳 → 取回 URL → 帶入 PATCH delivery
- 解法候選：A=新建 `POST /nx06/upload/signature` upload endpoint；B=client side data URL（base64）→ PATCH 直接帶（schema 加大 signatureUrl 至 50KB+）；C=用 NX09 既有 file upload（如有）

### 4.3 路線優化 endpoint（v0.9.0 落地）

對齊 [NX06-IMPL-02 closure](../nx06/) `v0.9.0-nx06-route-optimization-handover-closure`：

```
POST /nx06/route-optimization/single-vehicle  ← ≤ 30 DN
POST /nx06/route-optimization/multi-vehicle   ← ≤ 5 driver / ≤ 100 DN VRP
GET /nx06/route-optimization/batch/:batchId   ← 取得 sequence
```

⭐ **業界改革承載點**：Mobile Card UI 上「我的任務列表」需按 `routeOrderInSequence` 排序（已落地、未連 UI）。

### 4.4 哪些業界改革候選 ⭐⭐⭐ 必須在 Mobile Card 展示

| # | 改革候選 | Mobile Card 元素需求 |
|---|---|---|
| 1 | 動態任務轉派 ⭐⭐⭐ | **「接受 / 拒絕」雙 button**（大、可點）+ 推薦理由顯示（半徑 X km / 任務量 / ETA）+ 訂閱推播 |
| 2 | 動態交接獎勵 +25 Exp ⭐⭐⭐ | 接受後顯示 +25 Exp 動畫 / toast（NX10 八角遊戲化承載）|
| 3 | 路線優化（最短訪問順序）| 任務列表按 routeOrderInSequence 排序、顯示 ETA + 路線批次 ID |
| 4 | GPS heartbeat（30s）| **背景**自動上傳（PWA 需 permission + foreground / background sync）|
| 5 | 異常回報（4 enum）| 「異常」button → modal 選 type W/Q/D/O + reason input |
| 6 | 簽收 + signature | canvas + 客戶姓名 input + 完成按鈕 |
| 7 | dashboard 聚合（today active / completed / pending handover / active batch）| 4 KPI 卡片 + drill-down |

### §I.6.3 §4 揭露不完整

- 未 verify Lalamove webhook 是否需 driver 額外 UI 互動（POST `/nx06/lalamove/:dnId/create` 後 driver 端要做什麼？）
- 未 verify 列印整合（POST `/nx06/printer/:dnId/print`）是 driver 列印 vs 倉管列印（推測倉管、driver 行動端不便接印表機）

---

## §5 v0 指令需要的技術細節揭露

### 5.1 React + Next.js 版本

| 項目 | 版本 |
|---|---|
| Next.js | **16.1.6**（App Router）|
| React | **19.2.3** |
| reactCompiler | **true**（next.config.ts 啟用、自動記憶化）|
| turbopack | true（dev server）|
| TypeScript | ^5 |

⚠️ **重要對 v0 提示**：
- App Router（不是 Pages Router）
- React 19 + reactCompiler = 不需手動 `memo / useMemo / useCallback`
- `'use client'` directive 用於 client component
- 套用 layout 階層：`app/layout.tsx → app/dashboard/layout.tsx → app/dashboard/nx06/driver/.../page.tsx`

### 5.2 shadcn/ui 既有元件（A041 精確 = 12 個）

```
apps/nx-ui/src/components/ui/
├── avatar.tsx
├── badge.tsx        ← 狀態 chip 可用
├── button.tsx       ← 6 variant（default/destructive/outline/secondary/ghost/link）+ 6 size
├── calendar.tsx
├── card.tsx         ← Mobile Card 基底
├── dialog.tsx       ← Radix Dialog wrapper
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── scroll-area.tsx
├── tabs.tsx
└── textarea.tsx
```

⚠️ **缺基礎元件**（v0 指令需自製 or 用 div 替代）：
- ❌ Sheet（行動端常用 bottom drawer）
- ❌ Drawer
- ❌ Toast / Sonner（FloatingToast 在 sale/sop-workspace 自製可借用）
- ❌ Tooltip / Popover
- ❌ Select / Combobox
- ❌ Skeleton（loading 骨架）
- ❌ Progress / Slider
- ❌ Switch / Checkbox / RadioGroup
- ❌ Form（react-hook-form 整合）

### 5.3 Tailwind config

| 項目 | 真相 |
|---|---|
| Tailwind 版本 | **v4**（@tailwindcss/postcss、新版 CSS-first config）|
| config 檔 | ❌ **無 tailwind.config.ts**（全在 globals.css `@theme inline` block）|
| design tokens 來源 | `apps/nx-ui/src/app/globals.css`（940 行）|

#### 5.3.1 color tokens（OKLCH + hex 混用、3 處 :root override 範式）

```css
--background: #0a0a0a              (final override)
--foreground: #d6dae3
--card: color-mix(in srgb, #1e1e1e 78%, #2a2621 22%)
--primary: #ffb800                 (amber 業界改革標誌色)
--accent: #cc8400                  (deep amber)
--muted: #252525
--muted-foreground: #9ca8b8
--border: #3d3d3d
```

⭐ **NEXORA 主色 = amber `#ffb800`**（業界改革 ⭐ 對應視覺）+ dark mode 預設（colorScheme: 'dark'）。

#### 5.3.2 breakpoint（Tailwind v4 預設、無 custom）

```
sm: 640px / md: 768px / lg: 1024px / xl: 1280px / 2xl: 1536px
```

#### 5.3.3 既有 mobile pattern

對齊 [features/sale/ui/inquiry/MobileInquiryListPage.tsx](../../apps/nx-ui/src/features/sale/ui/inquiry/MobileInquiryListPage.tsx)：

```tsx
<div className="space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
  <header className="space-y-1">
    <h1 className="text-lg text-white">標題</h1>
    <p className="text-xs text-white/50">副標</p>
  </header>
  <div className="flex flex-wrap gap-2">  {/* 狀態 chip */}
    <button className={cx(isActive ? '...' : '...')}>篩選</button>
  </div>
  ...
</div>
```

⭐ **既有 Mobile pattern**：
- 外層 `p-4` padding + `pb-[calc(env(safe-area-inset-bottom)+4rem)]`（iOS 安全區）
- `text-white` / `text-white/50` 對比層次
- 狀態 chip = 純 `<button>` + 條件 className
- 用 `cx`（`@/shared/lib/cx`）取代 clsx（既有自製 util）

### 5.4 既有 design tokens 速查

```css
/* Color */
text-foreground / text-muted-foreground / text-primary
bg-background / bg-card / bg-primary / bg-muted / bg-accent / bg-destructive
border-border / outline-ring

/* Radius */
rounded-md / rounded-lg / rounded-xl / rounded-2xl / rounded-full
--radius-sm / --radius-md / --radius-lg / --radius-xl

/* Spacing */
space-y-{1..6} / gap-{1..6} / p-{2..6}

/* Typography */
text-xs / text-sm / text-base / text-lg / text-xl
font-medium / font-semibold / font-mono

/* Font */
--font-geist-sans / --font-geist-mono
```

### 5.5 既有 i18n / 多語

```
i18n 庫：❌ 0（無 next-intl / react-i18next / formatjs）
locale 檔：❌ 0
useTranslation hook：❌ 0
HTML lang：'zh-Hant' hard-coded（app/layout.tsx）
日期 lib：date-fns 4.x（無 locale import 引用）
```

⚠️ **i18n 全缺**：v0 指令直接用繁體中文 hard-coded 即可（對齊 NEXORA 現況、Yaro / 恆迎台灣業務員、零越南籍員工需求）。

### 5.6 既有 mobile-first 規範

- ❌ 無 `docs/mobile-design-guidelines.md`
- ❌ 無 Figma URL
- ✅ 既有 4 個 Mobile* page 真實範式可參考（sale/inquiry × 3 + sale/sop-workspace × 1）
- ✅ FloatingToast 自製 toast 元件可借用（features/sale/ui/sop-workspace/components/FloatingToast.tsx）
- ✅ `pb-[calc(env(safe-area-inset-bottom)+4rem)]` 安全區 padding pattern

### 5.7 v0 指令建議 starter kit

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cx } from '@/shared/lib/cx';

// 主色：amber #ffb800（bg-primary / text-primary）
// 安全區：pb-[calc(env(safe-area-inset-bottom)+4rem)]
// 文字對比：text-foreground / text-muted-foreground
// 卡片：bg-card border border-border rounded-xl
```

### §I.6.3 §5 揭露不完整

- 未 verify shadcn/ui 元件補齊預算（一次補 5 個 vs 隨需求補）
- 未 verify v0 指令是否需考慮 SSR / Server Component 邊界（NX06 driver 場景全 client、推測純 `'use client'`）
- 未 verify Crown 對「mobile-first vs responsive desktop」優先（外務員手機是主場景、倉管組長桌面是次場景）

---

## §6 戰略總覽（給 Alex 寫 v0 指令的基底）

### 6.1 NX06 PWA 4 page 對應 endpoint 速查

| PWA page | 對應 endpoint | 主要互動 | v0 Mobile Card 元素 |
|---|---|---|---|
| `/dashboard/nx06/driver` | GET `/driver-mobile/dashboard` | 4 KPI 顯示 | 4 個 stats Card（today active / completed / pending handover / active batch）|
| `/dashboard/nx06/driver/tasks` | GET `/driver-mobile/my-dns` | 任務列表 + drill-down | DN Card × N（含 stops list + GPS 距離 + ETA + 異常 button）|
| `/dashboard/nx06/driver/map` | PATCH `/delivery/:id/location` | 地圖 + GPS heartbeat | 地圖庫缺、需先選 map lib（leaflet / maplibre）|
| `/dashboard/nx06/driver/handover` | GET `/handover/driver/:driverId` + PATCH `/handover/:id/status` | 接受 / 拒絕 / 完成 | Handover Card + 接受/拒絕雙 button + 推薦理由 |

### 6.2 v0 指令最高優先級 Mobile Card 候選

| 優先級 | Mobile Card | 戰略價值 | 既有 endpoint 完整度 |
|---|---|---|---|
| ⭐⭐⭐ | 任務列表 + DN Card（顯示 stops / contact / ETA）| 外務員每日主畫面 | ✅ 100%（my-dns endpoint 完整）|
| ⭐⭐⭐ | 動態交接 Card（接受 / 拒絕 + 推薦理由 + +25 Exp 揭露）| 業界改革 v1.4 落地 | ✅ 100%（handover/driver + status PATCH）|
| ⭐⭐ | dashboard 4 KPI Card | 首頁聚合 | ✅ 100%（driver-mobile/dashboard）|
| ⭐⭐ | 異常回報 modal（W/Q/D/O 選擇）| 高頻使用 | ✅ 100%（dn-ops exception）|
| ⭐⭐ | 簽收 Card（含 signature canvas）| 完成配送必經 | ⚠️ 90%（簽名圖上傳 endpoint 缺）|
| ⭐ | 地圖視圖（自己 + 任務點）| Hank Q-H6 揭露需 GPS 與任務融合 | ⚠️ 50%（GPS endpoint 在、map lib 未選）|

### 6.3 v0 指令必須揭露給 Alex / v0 的關鍵真相（避免幻覺）

1. ⚠️ **無 manifest.json**（v0 不要寫 `<link rel="manifest">` 引用）
2. ⚠️ **無 next-pwa 套件**（v0 不要 `import { PWA } from 'next-pwa'`）
3. ✅ **既有 Service Worker public/sw.js**（推播 handler 完整、可借用）
4. ✅ **既有 Web Push frontend helper**（features/nx06/push-subscription.ts、subscribe/unsubscribe）
5. ⚠️ **0 chart 庫 / 0 map 庫 / 0 form 庫**（v0 不要 import recharts / leaflet / react-hook-form、用純 HTML / div 替代）
6. ✅ **既有 shadcn/ui 12 元件**（Button / Card / Badge / Dialog / Tabs / Input / Textarea / Avatar / Calendar / DropdownMenu / Label / ScrollArea）
7. ⚠️ **缺 Sheet / Drawer / Toast / Tooltip / Select**（v0 需自製或用 Dialog 替代）
8. ✅ **既有 4 個 Mobile* page 範式可借鏡**（sale/inquiry × 3 + sale/sop-workspace × 1）
9. ✅ **既有 FloatingToast**（features/sale/ui/sop-workspace/components/FloatingToast.tsx）可借用
10. ⚠️ **i18n 全缺**（v0 直接用繁體中文 hard-coded）
11. ✅ **既有 amber `#ffb800` 主色 + dark mode 預設**
12. ✅ **既有 cx util**（不是 clsx）
13. ✅ **既有 `pb-[calc(env(safe-area-inset-bottom)+4rem)]` 安全區 pattern**
14. ✅ **既有 use 'client' + useState + useEffect + fetch 範式**（不要 react-hook-form / tanstack-query / swr）
15. ⚠️ **driver-mobile @Roles 'WAREHOUSE'**（外務員實際角色是 WAREHOUSE、不是 DRIVER role）

---

## §7 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / 業務員補揭露：

1. **§0** 瀏覽器實際 PWA 安裝流程能否走通（無 manifest 可能 Android 失敗）
2. **§0** VAPID public key env 變數是否已配發
3. **§1** 簽名圖 / 照片上傳 endpoint（NX06 無、NX09 有？）
4. **§1** DnOps 異常回報後是否自動推送倉管組長
5. **§1** Pickup / ReturnPickup / IntlShipping 是否有 driver-mobile 等價
6. **§2** Mobile* page 在 PWA 安裝後 iOS Safari home screen 啟動行為
7. **§3** Next 16.1 與 next-pwa / serwist 相容性
8. **§3** /api/nx06/push/subscribe Next API route 是否存在
9. **§4** Lalamove webhook 後 driver 端 UI 互動
10. **§4** 列印 endpoint 是 driver 用 vs 倉管用
11. **§5** Crown 對 mobile-first vs responsive 優先級
12. **§5** shadcn/ui 元件補齊預算

---

## §8 結論：v0 指令 ready 度評估

| 維度 | 評估 |
|---|---|
| Backend endpoint 完整度 | ⭐⭐⭐ 100%（4 PWA page 對應 endpoint 全在）|
| Frontend placeholder 結構 | ⭐⭐ 100%（4 placeholder + menu wire 完整）|
| 既有 Mobile UI 範式 | ⭐⭐ 4 個 Mobile* page + FloatingToast + 安全區 pattern 可借鏡 |
| PWA install 體驗 | ⭐ 50%（iOS 可、Android 缺 manifest 不完整）|
| Web Push send | ⭐ 30%（subscribe 完整、send stub）|
| 地圖 / chart / form 庫 | ❌ 0（v0 不可幻覺、需先決策補哪個）|

⭐⭐⭐ **v0 指令 ready 度：足夠寫 Mobile Card v0（任務 Card + 動態交接 Card + dashboard KPI Card）**：
- 任務 Card / 動態交接 Card / dashboard KPI Card 不依賴地圖 / chart 庫
- 簽收 Card 依賴 signature canvas（可純 HTML5 canvas）
- 地圖 Card 須先補 map lib（不在 v0 第一批）

---

> 文件版本：v1.0（NX06-PWA-AUDIT-01 純諮詢、8 段揭露 + 6 表 + 15 v0 關鍵真相 + 6 Mobile Card 優先級）
> 待 Alex 寫 v0 指令對齊 §5 + §6.3 15 關鍵真相、避免幻覺
