<!-- docs/_team/sales-fulfillment-phase3-routing-and-posting-proposal.md -->
<!-- 檔案版本：v0.1（階段 3 實作提案、待執行長 review 後才實作） -->
<!-- 檔案說明：撿包送階段 3「三區路由 + 過帳搬到簽收」的實作提案。
     2026-07-22 Hank 依 grep 現況撰寫。此段為整條線唯一破壞性改動、動前必經執行長拍板（CLAUDE.md §12）。 -->

# 階段 3 提案：封箱後三區路由 + 過帳搬到簽收

**版本** v0.1 提案 ｜ **狀態** 待執行長 review ｜ **依據** [[sales-fulfillment-pick-pack-ship-design]] §5-B D4/D5/D6、§5-E 階段3

---

## 1. 目標（拍板 D4/D5/D6）
1. **封箱後依出貨方式路由三區**：自取 / 寄貨 / 配送 三個工作佇列。
2. **扣庫存＋開應收從「出庫」搬到「交貨簽收後」**（D4）。寄貨無簽收＝交物流輸單號即過帳（D5）。
3. **`SHIPPED` 重定義＝「已出倉待簽收」**（封箱到此）；**簽收才落帳、SO 進 `COMPLETED`**（D6）。

## 2. grep 實測現況（動手前真相）
| 現況 | 位置 | 現在做什麼 |
|---|---|---|
| 扣庫存 `applySoShipping`（私有） | `so.service.ts:362` | SO PICKING→SHIPPED 時扣庫存出庫（`applyQtyOutWithLedger`） |
| 開應收 `createArFromShippedSo` | `shared/nx05/nx05-create-ar-from-so.ts` | SHIPPED 時開 AR |
| 產配送單 `createDeliveryDnFromShippedSo` | `shared/nx06/nx06-create-delivery-from-so.ts` | SHIPPED + deliveryType=D 時建 DN 草稿（冪等） |
| **完成集中鉤 `maybeCompleteAfterDelivery`** | `so.service.ts:1271` | ⭐ 各簽收點呼叫、全 lines fulfillStatus=F 時把 SO 推 COMPLETED。**目前只改狀態、不過帳** |
| 配送簽收 | `dn-logistics.service.ts:602 applySignatureToStops` | 簽收 → 行 fulfillStatus=F → 收尾呼 `maybeCompleteAfterDelivery` |
| 自取簽收 | nx06/pickup（走同一套 DN 簽收） | 同上 |
| 保留量 `reservedQty` | SoItem 欄、DB trigger 自動同步 | SO 確認即保留 → available = on_hand − reserved |

**關鍵**：`maybeCompleteAfterDelivery` 已是「簽收→COMPLETED」的**唯一集中鉤**、各簽收點都經它。過帳搬移只要掛這裡、天然冪等（只在 SHIPPED→COMPLETED 那次觸發）。

## 3. 核心設計（改動出乎意料地乾淨）
### 3-1. 過帳搬移
- **移除**：`so.service` PICKING→SHIPPED 那刀的 `applySoShipping` + `createArFromShippedSo`（不再於出庫扣帳）。
- **新增**：把「扣庫存 + 開應收」搬進 `maybeCompleteAfterDelivery`（SHIPPED→COMPLETED 那次），包一層 transaction、只在真的轉 COMPLETED 時做一次（冪等）。
- `applySoShipping` 抽成共用 helper `postSoStockOut(tx, {soId,tenantId,userId})`（給完成鉤呼叫）。
- **一次一整張 SO 過帳**（全簽收才扣）：簡單、冪等、對齊現有 `isAllLinesDelivered` 判斷。

### 3-2. 封箱 → SHIPPED + 產配送單
- `pack-pool.sealPacking`（階段2）擴充：封箱時把該包貨單涵蓋的 SO 全部 PICKING→SHIPPED（**不過帳**），並對 deliveryType=D 的 SO 呼 `createDeliveryDnFromShippedSo`（此時就產配送單草稿，好讓外務有東西可跑）。
- 跨 SO 包貨單 → 涵蓋多張 SO 一起 SHIPPED。

### 3-3. 三完成事件全funnel到 `maybeCompleteAfterDelivery`（＝過帳點）
| 出貨方式 | 完成事件 | 動作 |
|---|---|---|
| 配送 | 外務送達簽收（既有 DN 簽收） | 行 F → `maybeCompleteAfterDelivery` → 扣帳 + COMPLETED |
| 自取 | 客人取貨簽收（既有 pickup 簽收） | 同上 |
| 寄貨 | 交物流輸單號寄出（**新動作**） | 行 F（視同送達、D5）→ `maybeCompleteAfterDelivery` → 扣帳 + COMPLETED；同步寫 `pl.logisticsProvider/TrackingNo` + `parcel.logisticsTrackingNo` |

## 4. 狀態流 before / after
```
【before】確認 → PICKING →[出庫SHIPPED＝扣庫存+開應收+產DN]→ 簽收COMPLETED（只改狀態）
【after 】確認 → PICKING(撿) →[封箱=SHIPPED 已出倉待簽收(不扣帳)+產DN]
                → 自取簽收/配送簽收/寄貨輸單號 →[COMPLETED＝扣庫存+開應收]（過帳點）
```

## 5. 三區佇列（看板、對齊執行長裝置分工）
| 區 | 誰用/裝置 | 佇列來源 | 完成動作 |
|---|---|---|---|
| 自取區 | 櫃台桌機 | 封箱(PL=F) 且 plType=P 未完成 | 客人取貨→簽收→過帳 |
| 寄貨區 | 包裝桌機 | 封箱 且 plType=C 未完成 | 輸物流商+單號→寄出→過帳 |
| 配送區 | 組長桌機配單 + 外務手機 | 封箱 且 plType=D 未完成 | 配單給外務（既有 DN dispatch）→跑→簽收→過帳 |

## 6. 檔案改動清單（blast radius）
- `so.service.ts`：移除 SHIPPED 那刀的扣帳/AR；`applySoShipping` 抽 helper；`maybeCompleteAfterDelivery` 加過帳（包 tx）。
- 新 `shared/nx04/post-so-stock-out.ts`（helper）。
- `pack-pool.service.ts`：`sealPacking` 擴充（SO→SHIPPED + 產 DN）。
- 新 `nx03/ship-zones/`（三區佇列 read + 寄貨寄出 endpoint；自取/配送複用既有 nx06）。
- 前端：三區頁面（自取/寄貨/配送佇列）。
- ⚠️ 需迴歸：即時銷售建單→撿→包→簽收全鏈、既有 DN/pickup 簽收、銷退(SR) 不受影響（SR 走自己的退貨鏈、不經此過帳）。

## 7. ⚠️ 待你拍板的決策
1. **部分配送的過帳**：一張 SO 分多趟送時，先送的先不扣、**等整張 SO 全簽收才一次扣帳**。可接受？（LITE 簡化；替代＝逐箱送達逐步扣、較複雜、AR 也要拆期）
   - 建議：整張全簽收才過帳（先求簡單正確）。
2. **出倉→簽收的庫存空窗**：封箱後貨已離倉、帳上到簽收才扣。已有 `reservedQty` 保留量擋著（available 已扣除）→ 不會被重複配貨。**我會在實作時驗證保留量在此窗內不釋放**；你認可「靠保留量擋、帳面 on_hand 到簽收才降」這個設計嗎？
   - 建議：認可（保留量已是現成機制）。
3. **手動把銷貨單翻 SHIPPED 的舊入口**：新流程改由封箱驅動 SHIPPED。舊手動入口要**關掉（只走封箱）**還是**保留當逃生門（但不再扣帳、純狀態）**？
   - 建議：保留當逃生門、但拔掉扣帳（扣帳一律走簽收）。

## 8. 分階段（漸進式、逐段 commit）
- **3a 過帳搬移（核心破壞性）**：helper 抽出 + 搬到完成鉤 + 封箱→SHIPPED+DN。先讓扣帳時點正確。
- **3b 三區佇列後端**：三區 read + 寄貨寄出 endpoint（自取/配送複用 nx06）。
- **3c 三區前端**：自取/寄貨/配送三頁。
- **3d 收尾**：迴歸腳本（即時銷售→撿→包→三區→簽收→過帳全鏈）、操作手冊、舊太空風殘頁清理。

⚠️ 3a 動到過帳核心邏輯——`migrate` 無、但屬破壞性業務邏輯改動，逐段 commit、每段本機 tsc + 迴歸驗證後才進下一段。
