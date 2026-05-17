<!-- docs/nx06/spec/impl/nx06-merge-verify.md -->

# TASK-NX06-IMPL-01 — Merge Main 上線風險揭露（NX06-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Phase 6 closure 後、Q-RHYTHM-2 第二次全軌連跑完成
> 真實 main HEAD：`38077c8`（NX01-16 + Yaro 規範軌 v1.14）
> 分支：`feature/nx06-logistics`（ahead 8 commit）
> 對應依據：[plan v0.1.0](./nx06-impl-01-plan.md) + [nx06-summary.md](../../nx06-summary.md)

---

## §1 NX06 service 改動 verify

### 1.1 既有 1 共用 service + 4 controller 影響

| 既有 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `dn-logistics.service`（797 → 950+ lines）| ⚠️ +3 method / 0 替換既有 | ✅ 既有 createDelivery / createPickup / createIntlShipping / createReturnPickup / patchDn / patchDeliveryLocation / remove / applySignatureToStops / list / getById 全 0 改 |
| `delivery.controller`         | ❌ 0 改 | ✅ |
| `pickup.controller`           | ❌ 0 改 | ✅ |
| `intl-shipping.controller`    | ❌ 0 改 | ✅ |
| `return-pickup.controller`    | ❌ 0 改 | ✅ |

⭐ **既有 21 endpoints 行為 100% 保留**。

### 1.2 dn-logistics.service 升級揭露（⚠️ 行為 mildly 改變）

| 改動 | 行為改變 | 風險 |
|---|---|---|
| DN_SEL 加 5 欄（printer + lalamove）| ✅ 既有 list / getById response 多 5 欄 | 低（純 additive，前端 placeholder 不讀新欄）|
| ITEM_SEL 加 internalCost | ✅ 既有 item response 多 1 欄 | 低（同上）|
| `markStopException` 新 method | ❌ 0 改既有 | 0（純新 endpoint）|
| `markItemException` 新 method | ❌ 0 改既有 | 0（純新 endpoint）|
| `setItemInternalCost` 新 method | ❌ 0 改既有 | 0（純新 endpoint）|

⚠️ **API response shape 改變揭露**：list / getById 多 6 個 nullable 欄位（DN: 5、Item: 1）。既有前端若用 TS strict shape 比對可能 warning，但 placeholder 不讀。

### 1.3 新增 3 service / 4 controller（純新增、0 替換既有）

- ✅ `DispatchService`            + 1 endpoint（`PATCH /nx06/dispatch/:dnId/assign`）
- ✅ `PrinterIntegrationService`  + 1 endpoint（`POST /nx06/printer/:dnId/print`）
- ✅ `LalamoveIntegrationService` + 2 endpoint（`POST /nx06/lalamove/:dnId/create` + `POST /nx06/lalamove/webhook`）
- ✅ `DnOpsController`            + 3 endpoint（`PATCH /nx06/dn-ops/stops|items/exception` + `PATCH /nx06/dn-ops/items/:itemId/internal-cost`）

⭐ **§1 結論：既有 21 endpoints 行為保留、dn-logistics.service 僅 SELECT 補欄（前端 placeholder 0 影響）、3 新 service + 7 new endpoints 純新增**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 DnItem.internalCost（ALTER ADD COLUMN nullable）

| 維度 | 評估 |
|---|---|
| ADD COLUMN nullable | ✅ 既有 row default NULL、0 backfill 衝突 |
| 既有 createXxx 流程 | ✅ 不寫入 internalCost、既有路徑 0 影響 |
| 既有讀路徑 | ✅ SELECT 補欄但既有前端讀 placeholder、0 衝突 |

### 2.2 M2 Dn 印表機 + Lalamove 5 欄（ALTER ADD COLUMN nullable × 5）

| 維度 | 評估 |
|---|---|
| 5 欄 nullable | ✅ 既有 row default NULL、0 backfill 衝突 |
| 既有 createXxx | ✅ 不寫入新欄、既有路徑 0 影響 |
| 環境變數 `LALAMOVE_API_ENABLED` 預設 false | ✅ mock 模式、不依賴公網 Lalamove webhook endpoint |

⭐ **§2 結論：2 軌 schema 純 ADD COLUMN nullable、0 ALTER 現有欄、0 backfill 衝突、既有 production 0 影響**。

---

## §3 跨模組 helper 整合 verify

### 3.1 既有 1 helper 0 動（核心保留）

| 既有 helper | 本軌是否動 |
|---|---|
| `createDeliveryDnFromShippedSo` | ✅ 0 動 |

### 3.2 NX06 跨模組 helper 完整化（4 helper、本軌新增 3）

```
shared/nx06/
├── nx06-create-delivery-from-so.ts            ✅ 既有（已 wire 入 nx04 so.service）
├── nx06-create-return-pickup-from-sr.ts       🆕 本軌 wire 入 sales-return.service POSTED+R/D
├── nx06-create-dn-item-from-parcel.ts         🆕 本軌 pure export（不 wire）
└── nx06-create-paylog-from-dn-cost.ts         🆕 本軌 pure export（不 wire）
```

### 3.3 唯一 production wire 點：sales-return.service.ts ⚠️ 行為改變

| 改動 | 行為改變 |
|---|---|
| SR POSTED + returnAction=R/D | +createReturnPickupFromPostedSr 自動建 RETURN_PICKUP DN 草稿 |

⚠️ **production 影響揭露**：
- 既有 NX04 SR POSTED R/D 路徑會多寫 1 筆 nx06_dn（status=DRAFT、driverUserId=操作員、stop.address=客戶主檔地址）
- 失敗條件 → return null（不 throw、SR POSTED 流程不中斷）：
  - 客戶主檔沒地址
  - SR 沒 items
  - SR 沒 warehouse
- 風險：低（純 additive、SR 流程 0 中斷）
- 業務責任：倉管組長後續手動 PATCH driverUserId / dispatch

### 3.4 NX05 doc-no allocator 擴充

| 改動 | 行為改變 |
|---|---|
| `Nx05DocKind` 加 `'EX'` kind | ✅ 純擴充 union、既有 7 kind 0 動 |
| `allocNx05DocNo` reuse PY-prefix + nx05Paylog 查詢路徑 | ✅ 既有 'RC'/'CP' 路徑 0 動 |

⭐ **§3 結論：既有 1 helper 0 動、3 新 helper（1 wire + 2 pure export）、sales-return.service 唯一 wire 點為 mildly behavior change（純 additive nx06_dn 多寫，SR 流程 0 中斷）**。

---

## §4 UI 改對既有功能影響

| 改動 | 影響 |
|---|---|
| 升級 `/dashboard/nx06/workspace` desc | ✅ placeholder 文字更新，UI shell 0 動 |
| 新 4 placeholder（dispatch/sign/cost/exception）| ✅ 純新路由、既有路由 0 動 |
| `menu.nx06.ts` 新增 | ✅ 純新檔 |
| `side-menu.ts` 加 nx06 條件 | ✅ 純 additive（既有 nx02-05 路由 0 動）|

⭐ **§4 結論：UI 純 stub 新增 + 既有 1 placeholder desc 升級、0 production behavior change**。

---

## §5 環境變數 & DevOps verify

| 環境變數 | 預設 | 啟動條件 |
|---|---|---|
| `LALAMOVE_API_ENABLED` | `false`（mock）| 後續軌：商家申請 Lalamove API key + 公網 webhook endpoint + DevOps 設 true |

⭐ **本軌 deploy 無需新環境變數設定**（預設 false = mock 模式）。

---

## §6 8 commit ahead 真實清單

```
45af765 Phase 5 commit: UI stub 5 placeholder + menu.nx06.ts + side-menu wire
7ce607c Phase 4 commit: L4 跨模組 wire (3 helper) + sales-return wire SR helper
07febc3 Phase 3 commit: L2 dn-logistics.service 升級 (異常 + 內部成本) + DnOps controller
d7a24a3 Phase 2 commit: L1 新建 3 service (Dispatch / PrinterIntegration / LalamoveIntegration)
e6762c1 Phase 1 M2: Dn 印表機 + Lalamove 5 欄
a69aa90 Phase 1 M1: DnItem.internalCost
0c1c61e Phase 0 plan: nx06-impl-01-plan.md v0.1.0
（本 commit：Phase 6 docs: summary + worklog + merge-verify）
```

---

## §7 上線檢查清單（Crown / Alex 驗收）

- [ ] §1 既有 21 endpoints 行為 100% 保留 / dn-logistics SELECT 補欄前端 placeholder 0 影響
- [ ] §2 2 migration 純 ADD COLUMN nullable / 0 backfill 衝突
- [ ] §3.3 sales-return wire 自動建 RETURN_PICKUP DN（純 additive、SR 流程 0 中斷）
- [ ] §3.4 Nx05DocKind 加 'EX' 擴充（既有 RC/CP 路徑 0 動）
- [ ] §4 UI 5 placeholder + menu.nx06.ts + side-menu wire（純 additive）
- [ ] §5 環境變數預設 mock 模式 deploy（無需新設定）
- [ ] tsc 0 error（nx-api + nx-ui 雙清）
- [ ] DB schema is up to date ✓

---

> 文件版本：v1.0
> 待 Crown 拍板 A → Hank 自跑 merge feature/nx06-logistics → main + tag `v0.8.0-nx06-closure`
