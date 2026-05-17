<!-- docs/nx06/nx06-audit-01.md -->

# NX06 物流模組 — Schema + 既有狀態真相揭露（NX06-AUDIT-01）

> 性質：純諮詢、不開工、不 commit、不切分支（本檔 Write 至 main 後 commit、Crown 拍板後啟動 IMPL）
> 撰寫者：Hank（NEXORA 工程 AI、Cursor IDE 載體）
> 日期：2026-05-18
> 任務：NX05 財務範圍 A closure（v0.7.0、2026-05-18）後、業務鏈閉環完成（採購+庫存+銷貨+自動補貨+財務 五軌）、Crown 拍板 NX06 物流第六戰略軌、Alex 寫子規格書前依 §I.5 #22 鐵律 verify schema 真相
> 真實 main HEAD：`4c3c8ac`（NX05 v0.7.0 tag 後）
> 五軌 closure：NX03 v0.3.0 / AR v0.4.0 / NX02 v0.5.0 / NX04 v0.6.0 / NX05 v0.7.0
> 對應依據：[nx02-audit-01](../nx02/nx02-audit-01.md) + [nx04-audit-01](../nx04/nx04-audit-01.md) + [nx05-audit-01](../nx05/nx05-audit-01.md) 範式對齊

---

## 0. 揭露範圍與限制（先講）

- 本檔依 §G.9 通配 grep + §I.5 #22 schema verify + §I.6.5 A041 精確 count
- 一律使用 `grep -c` 精確數、禁用「N+ 處」「多處」
- 每段尾依 §I.6.3 加「揭露可能不完整、Crown / Alex 想補的直接說」
- 本檔僅揭露**已落地**狀態、不寫 plan、不寫拍板 Q
- NX06 為 NEXORA 業務模組第一階段最後拼圖（業務閉環 + 物流延伸）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §1. NX06 schema 真相

### 1.1 A041 精確 count

```
grep -c "^model Nx06" packages/db-core/prisma/schema.prisma
→ 3
```

**NX06 已落地 schema = 3 個 model**（Dn 表頭 + Item 明細 + Stop 停靠點）。

⭐ **NX06 是 NEXORA schema 衝擊最小的模組**（3 model vs NX02 13 / NX04 7 / NX05 8）、但 schema 設計密度高（單表多功能：4 物流類型 + GPS + 簽收 + 國際）。

### 1.2 全 3 個 model 列表（line 範圍 + 業務語意 + 啟用版本）

| # | Model | Line | Table | 業務語意 | 啟用版本 |
|---|---|---|---|---|---|
| 1 | `Nx06Dn`     | 4310 | nx06_dn      | 送貨單表頭（4 物流類型 + 多階 status + GPS 追蹤 + 國際物流欄 + 簽收+異常配套）| LITE-CORE |
| 2 | `Nx06DnItem` | 4379 | nx06_dn_item | 送貨明細（多來源 SO/ST/TI/PR/SR + parcelId + part snapshot + 異常處理 4 enum）| LITE-CORE |
| 3 | `Nx06DnStop` | 4429 | nx06_dn_stop | 停靠點（4 任務類型 D/K/R/C + 簽收 3 種 + 異常 4 enum + 電子簽名 URL）| LITE-CORE |

### 1.3 唯一約束 + Index 概況

| Model | unique | index |
|---|---|---|
| Nx06Dn | `[docNo]` | `[tenantId, sourceSoId]` + `[tenantId, sourceSrId]` + `[tenantId, logisticsType]` |
| Nx06DnItem | — | — |
| Nx06DnStop | — | — |

⭐ **Dn 表 3 index 完整**（反查 SO / SR / logisticsType 業界查詢範式）、DnItem + DnStop 0 index（量大時可能需後續軌補）。

### 1.4 Dn 多功能設計（單表覆蓋 4 物流類型）

| 物流類型（logisticsType）| 業務 | 觸發來源 |
|---|---|---|
| `DELIVERY` 配送 | 業務員開車送貨給客戶 | NX04 SO SHIPPED → createDeliveryDnFromShippedSo |
| `PICKUP` 取貨 | 外務取廠商貨 / 同行調貨 | 待 verify（推測手動建單）|
| `INTL_SHIPPING` 國際物流 | 進口貨配送（含報關 / 港口 / ETA）| 推測 NX02 PO purchaseType=I 觸發 |
| `RETURN_PICKUP` 退貨取件 | 客戶銷退取件 | NX04 SR returnMethod='C' 外務取貨 |

### 1.5 跨 NX 模組 FK 接點

| 來源 | 目的 | 業務 |
|---|---|---|
| `Nx06Dn.warehouseId` | Nx01Warehouse | 出發倉 |
| `Nx06Dn.driverUserId` | Nx01User | 外務人員（業務員 / 物流組）|
| `Nx06Dn.sourceSoId` | Nx04So | DELIVERY 配送來源 |
| `Nx06Dn.sourceSrId` | Nx04Sr | RETURN_PICKUP 取件來源 |
| `Nx06DnItem.parcelId` | Nx03Parcel | ⭐ 包裹來源（NX03 撿包 SOP 接點）|
| `Nx06DnItem.partId` | Nx01Part | PICKUP/RETURN 任務時直接料件 |
| `Nx06DnStop.partnerId` | Nx01Partner | 客戶 / 同行 / 廠商 |
| `Nx06DnStop.warehouseId` | Nx01Warehouse | 調撥目標倉 |

#### NX06 ← 上游 reverse FK（grep `rev_Nx06`）

```
NX01 Partner: rev_Nx06DnStop_partnerId（既有）
NX03 Parcel:  rev_Nx06DnItem_parcelId（既有）
NX04 So:      rev_Nx06Dn_sourceSoId（既有、NX04 audit-01 §1.4 揭露）
NX04 Sr:      rev_Nx06Dn_sourceSrId（既有、NX04 audit-01 §1.4 揭露）
```

⭐ **NX06 跨模組接點完整度高**（NX01 partner/warehouse/user/part + NX03 parcel + NX04 so/sr）、業務鏈接收側完整。

### 1.6 GPS 追蹤 + 簽收 + 異常設計（業界 muscle memory 完整）

| 維度 | schema 欄 | 業務語意 |
|---|---|---|
| GPS 追蹤 | lastLat/lastLng/lastLocationAt | 外務即時位置（業界 OBU / 手機 GPS）|
| 簽收 3 種 | signerType C 客戶/W 倉管/N 不需 + signedAt/signedByName/signatureUrl | 紙本 / 電子簽 + 照片儲存 |
| 國際物流 | customsDeclarationNo + originPort + destinationPort + etaDate | 報關單 + 起運港 + 目的港 + 預計到港 |
| 異常處理 | DnItem.exceptionType W/Q/D/O + exceptionReason + DnStop.exceptionRemark | 送錯料號/數量不符/貨損/其他 |
| 任務類型 | DnStop.taskType D/K/R/C | 送貨/取貨/退貨/取回退貨 |

⭐ **NX06 schema 設計成熟度高**（業界 muscle memory 全覆蓋：GPS / 簽收 / 國際 / 異常 / 多任務）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §2. NX06 backend service 真相

### 2.1 A041 精確 count

```
find apps/nx-api/src/nx06 -iname "*.ts" -type f | wc -l
→ 11（全 production、0 test）
```

**4 子模組落地 + 共用 service**：`delivery / pickup / intl-shipping / return-pickup`（4 controller）+ 1 共用 `dn-logistics.service.ts`（root 層、797 lines）+ root `dto/nx06-signature.dto.ts` + nx06.module.ts。

### 2.2 子模組結構 + 測試覆蓋

| 子模組 | files | tests | 性質 |
|---|---|---|---|
| `nx06.module.ts` | 1 | — | 根聚合 |
| `dn-logistics.service.ts` | 1 | 0 | **共用 service**（797 lines、4 物流類型業務全在此）|
| `dto/nx06-signature.dto.ts` | 1 | 0 | 共用 signature DTO |
| `delivery/` | 2（controller + dto）| 0 | DELIVERY 物流類型 |
| `pickup/` | 2 | 0 | PICKUP 物流類型 |
| `intl-shipping/` | 2 | 0 | INTL_SHIPPING 國際物流 |
| `return-pickup/` | 2 | 0 | RETURN_PICKUP 退貨取件 |

⚠️ **NX06 結構特殊**：
- **共用 service 範式**（dn-logistics.service.ts 1 大檔處理 4 物流類型業務、不是每子模組各自 service）
- 4 controllers 純路由 + DTO、純薄層
- 對比 NX02/NX04/NX05 範式（每子模組各自 service）、NX06 更精簡

### 2.3 Controller 路由 + endpoint count

```
grep "@Controller" apps/nx-api/src/nx06/**/*.controller.ts
→ 4 controllers、共 21 endpoints
```

| Controller | path | endpoints |
|---|---|---|
| `delivery/delivery.controller.ts` | `nx06/delivery` | 6 |
| `pickup/pickup.controller.ts` | `nx06/pickup` | 5 |
| `intl-shipping/intl-shipping.controller.ts` | `nx06/intl-shipping` | 5 |
| `return-pickup/return-pickup.controller.ts` | `nx06/return-pickup` | 5 |

⭐ endpoint 分佈均勻（5~6 per controller、按物流類型拆 CRUD）。

### 2.4 共用 utils（4 / shared/nx06/）

```
find apps/nx-api/src/shared/nx06 -type f -iname "*.ts" | wc -l
→ 4
```

| utils | 用途 |
|---|---|
| `nx06-doc-no.ts` | DocKind enum：DN 等（推測單一前綴）|
| `nx06-state-machine.ts` | API token 對 DB enum 雙向轉換（4 物流類型 + 多 status）|
| `nx06-list-query.dto.ts` | 分頁 / 排序 / 篩選通用 DTO |
| **`nx06-create-delivery-from-so.ts`** | ⭐ 跨模組 helper：NX04 SO SHIPPED → DN（既有、NX04 audit-01 揭露存在）|

### 2.5 createDeliveryDnFromShippedSo helper 整合狀態 verify

```
grep "createDeliveryDnFromShippedSo" apps/nx-api/src
→ 引用點：
  shared/nx06/nx06-create-delivery-from-so.ts:8 export function
  nx04/so/so.service.ts (NX04 audit-01 揭露在 SO SHIPPED transit 呼叫)
```

- ✅ helper 落地完整
- ✅ NX04 so.service SHIPPED transit 呼叫（既有 + NX04-IMPL-01 0 改、純沿用）
- ✅ sourceDocType='SO'、sourceSoId 串接（schema 既有 FK）
- ✅ 屬於 NEXORA 跨模組 helper 範式（與 NX05 5 helper 對稱）

⭐ **NX06 唯一跨模組 helper 完整接通**（NX04 → NX06、業務閉環延伸）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §3. NX06 frontend 真相

### 3.1 A041 精確 count

```
find apps/nx-ui/src -ipath "*nx06*" -type f | wc -l
→ 1
```

**1 個 NX06 前端檔**（純 dashboard/nx06/workspace/page.tsx placeholder）。

### 3.2 Dashboard page（唯一 1 placeholder）

| path | functionCode | title | desc |
|---|---|---|---|
| `nx06/workspace/page.tsx` | NX06-WS-UI-001-F01 | 物流工作台 | 送貨單 / 電子簽收 |

⚠️ **NX06 dashboard 最簡**（vs NX02 5 / NX04 3 / NX05 5）、純 1 stub。

### 3.3 features 殘留揭露

```
find apps/nx-ui/src/features -ipath "*nx06*" → 0
find apps/nx-ui/src/features -ipath "*logistic*" / "*delivery*" → 2
```

| path | 性質 |
|---|---|
| `features/inventory/workstation/delivery/MobileDeliveryListPage.tsx` | ⚠️ 1 檔孤兒（pivot 前 inventory 模組內配送 UI 殘留）|
| `features/sale/ui/sop-workspace/components/Step6DeliveryMethod.tsx` | ⚠️ 1 檔（pivot 前 sale 模組內配送方式選擇 demo 殘留）|

⚠️ **2 命名孤兒**（features/inventory/ + features/sale/、pivot 後 NX06 名稱未統一）。

### 3.4 menu config（無）

```
ls features/layout/config/menu.nx06.ts → 不存在
```

⚠️ **NX06 無 menu.nx06.ts**（對齊 NX05 之前狀況、需後續軌建立）。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §4. 既有 demo 揭露

### 4.1 service 鏈完整、0 test 安全網

對齊 NX05 範式（service 完整 + 測試斷層）：
- ✅ dn-logistics.service.ts 797 lines（4 物流類型業務全在此、規模最大單一 service）
- ✅ 4 controllers + 5~6 endpoints each = 21 endpoints
- ❌ **0 test spec / 0 integration**（對齊 NX05 範式、最大覆蓋缺口）

### 4.2 已落地業務 vs stub

| 業務 | schema | service | 狀態 |
|---|---|---|---|
| **DELIVERY 配送**（業務員 / 自家車輛 / GPS 追蹤）| ✅ schema + 6 endpoints | ✅ dn-logistics.service | service 完整 |
| **PICKUP 取貨**（外務取廠商貨 / 同行調貨）| ✅ + 5 endpoints | ✅ | service 完整 |
| **INTL_SHIPPING 國際物流**（報關 / 港口 / ETA）| ✅ + 5 endpoints | ✅ | service 完整 |
| **RETURN_PICKUP 退貨取件**（客戶 SR 取件）| ✅ + 5 endpoints | ✅ | service 完整 |
| **電子簽收**（簽名 URL / 客戶簽 / 倉管簽）| ✅ schema | ✅（signature DTO 共用）| service 完整 |
| **GPS 追蹤**（lastLat/Lng/locationAt）| ✅ schema | ✅ | service 完整 |
| **異常處理**（DnItem.exceptionType + DnStop.exceptionRemark）| ✅ | ✅ | service 完整 |
| **多停靠路線**（DnStop.stopNo 排序）| ✅ | ✅ | service 完整 |
| **跨模組接收側**（SO SHIPPED → DN 自動建）| ✅ + helper | ✅ NX04 既有 wire | 完整 |

⭐ **NX06 service 完整覆蓋 4 物流類型業務**（schema 設計成熟 + service 規模均衡、單 service 共用範式）。

### 4.3 業務鏈完整、3 接點未必接通

| 接點 | 是否接通 |
|---|---|
| NX04 SO SHIPPED → DN | ✅ 接通（createDeliveryDnFromShippedSo + so.service wire）|
| NX04 SR returnMethod='C' → RETURN_PICKUP DN | 🟡 schema reverse 已備、service wire 待 verify |
| NX02 PO purchaseType='I' → INTL_SHIPPING DN | 🟡 schema 已備、service wire 待 verify |
| NX03 Parcel → DnItem.parcelId | ✅ schema reverse 已備（NX03 包貨完成可接 DN）|
| 物流外包 partner_type='T' | 🟡 schema partnerType=T 既有、但 NX06 service 純自家配送、外包 API 整合留後續軌 |

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §5. NX06 vs 五軌範式對齊

### 5.1 partVersionId M1 配套狀態

```
grep "partVersionId" apps/nx-api/src/nx06 → 0 條
```

⭐ **NX06 partVersionId 配套 = N/A**（純物流流轉、不寫 NX03 stock_ledger、無需 partVersion snapshot）。

對齊 NX05 範式（純帳務模組 N/A）、NX06 純物流模組同樣 N/A：
- NX02/NX03/NX04 寫 stock_ledger → 必須 partVersionId M1 配套
- AR/NX05/NX06 不寫 stock_ledger → N/A

### 5.2 跟 NX04 SHIPPED → DN 接點完整度

| 階段 | 狀態 |
|---|---|
| schema reverse FK Nx04So.rev_Nx06Dn_sourceSoId | ✅ |
| helper createDeliveryDnFromShippedSo 落地 | ✅ |
| NX04 so.service.update SHIPPED transit 呼叫 helper | ✅（NX04 既有、IMPL-01 0 改）|
| sourceDocType='SO' 寫入 DnItem | ✅（helper line 98）|

⭐ **NX04 → NX06 接點完全乾淨**（schema + helper + wire 三層完整）。

### 5.3 跟 NX03 Parcel.toPartnerId / toWarehouseId 接點完整度

| 接點 | 狀態 |
|---|---|
| Nx03Parcel.rev_Nx06DnItem_parcelId | ✅ schema reverse 既有 |
| Nx06DnItem.parcelId nullable FK | ✅ |
| Parcel COMPLETED → DN service wire | 🟡 待 verify（NX03 既有 Parcel service 是否觸發 DN 建立）|

⚠️ **NX03 Parcel → NX06 接點半接通**（schema 完整、service wire 待 verify）。

### 5.4 模組層治理落後程度

| 治理項 | NX01 | NX03 | AR | NX02 | NX04 | NX05 | NX06 現況 |
|---|---|---|---|---|---|---|---|
| `*-summary.md` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 無 |
| audit 序列 | — | 4 | 1 v2 | 2 | 1 | 1 | 🟡 本檔 |
| `*-overview.md` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 無 |
| Phase N 拆軌 | — | 8 | 8 | 8 | 8 | 7 | ❌ 散在歷史 |
| 範圍 closure 標準 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 無 |
| L1~L4 分層 | — | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 平鋪共用 service |
| tag 版本 | — | v0.3.0 | v0.4.0 | v0.5.0 | v0.6.0 | v0.7.0 | ❌ 無 NX06 tag |

⭐ **NX06 在「技術接點」對齊（NX04 → NX06 完整 + schema 設計成熟）、但模組層治理（summary/audit/overview/phase/closure/tag）落後 6 軌**。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## §6. 業界場景候選揭露

### 6.1 已落地場景（15）

| 場景 | schema | service | UI |
|---|---|---|---|
| DELIVERY 配送 + GPS 追蹤 | ✅ | ✅ | 🟡 stub |
| PICKUP 取貨（外務取廠商貨）| ✅ | ✅ | 🟡 stub |
| INTL_SHIPPING 國際物流（報關 / 港口 / ETA）| ✅ | ✅ | 🟡 stub |
| RETURN_PICKUP 退貨取件 | ✅ | ✅ | 🟡 stub |
| 電子簽收（簽名 URL + 客戶 / 倉管簽收）| ✅ | ✅ | 🟡 stub |
| 紙本簽收（signerType='N' 不需簽）| ✅ | ✅ | 🟡 stub |
| 多停靠路線（DnStop.stopNo 排序）| ✅ | ✅ | 🟡 stub |
| 任務類型 4 種（D/K/R/C 送貨/取貨/退貨/取回退貨）| ✅ | ✅ | 🟡 stub |
| 異常處理（送錯料號 / 數量不符 / 貨損 / 其他）| ✅ enum | ✅ | 🟡 stub |
| 跨模組接收 NX04 SO SHIPPED → DN | ✅ FK + helper | ✅ wire | — |
| 跨模組接收 NX04 SR → RETURN_PICKUP | ✅ FK | 🟡 wire 待 verify | — |
| NX03 Parcel → DnItem 包裹接點 | ✅ FK | 🟡 wire 待 verify | — |
| 車牌記錄（vehicleNo）| ✅ | ✅ | — |
| 出發 / 到達 / 完成時間追蹤 | ✅ | ✅ | — |
| 多源 sourceDocType（SO/ST/TI/PR/SR）| ✅ | ✅ | — |

### 6.2 候選但未盤點場景（業界常見、本軌可補）

| 場景 | 現況 | 備註 |
|---|---|---|
| **物流外包整合**（partner_type='T' 外包配送）| 🟡 partner schema 已備、NX06 service 純自家、外包流 0 | 業界中小 ERP 常見、API 整合屬獨立技術軌 |
| **配送排程**（每日路線規劃 / 多車輛分派）| ❌ 0 service、純手動排 stopNo | PRO 候選 |
| **路線規劃自動化**（Google Maps API / 路徑優化）| ❌ 0 整合 | 第三方 API 軌 |
| **取消重送**（送錯地址 / 客戶不在 → 重派）| 🟡 schema status='FAILED' 已備、流程待 verify | 業界常見 |
| **簽收照片儲存**（signatureUrl 雲端儲存）| 🟡 schema URL 欄已備、實際儲存方案待 verify | S3 / 雲端儲存軌 |
| **配送費用計算**（按里程 / 重量 / 時段）| ❌ 0 schema | 整合 NX05 收費軌 |
| **物流主檔**（外包物流商主檔 + 報價 + 評核）| 🟡 partner_type='T' 既有、評核 0 schema | 對齊 NX02 供應商評核範式 |
| **代收貨款**（COD、Cash On Delivery）| ❌ 0 schema、純現金記錄在 Paylog | 業界配送常見 |
| **快遞單號追蹤**（黑貓 / 宅急便外部單號）| ❌ 0 schema（Dn 有國際物流欄、純國內外包單號 0）| 後續軌 |
| **GPS 路徑記錄**（lastLat/Lng 純最後一筆、無歷史軌跡）| 🟡 schema 純最新位置、軌跡 0 | PRO 候選（時序資料 + 視覺化）|
| **預約配送時段**（客戶指定到貨時段）| ❌ 0 schema | 業界常見 |
| **冷鏈配送**（冷藏 / 冷凍貨追蹤）| ❌ 0 schema、汽配業 likely 不需 | 排除 |

### 6.3 戰略候選排序（給 Crown 參考）

1. ⭐⭐⭐ **物流外包整合**（partner_type='T' + 外包流 service、業界中小 ERP 常見）
2. ⭐⭐⭐ **取消重送處理**（送錯 / 客戶不在 → 重派、業界配送基本需求）
3. ⭐⭐⭐ **NX04 SR → RETURN_PICKUP wire verify + 補完**（schema 已備、半接通）
4. ⭐⭐ **代收貨款 COD**（Paylog 整合）
5. ⭐⭐ **配送費用計算**（NX05 整合）
6. ⭐⭐ **NX03 Parcel → DnItem wire verify**（schema 已備、半接通）
7. ⭐ **簽收照片儲存方案**（S3 / 雲端整合、PRO 候選）
8. ⭐ **配送排程 / 路線規劃**（PRO 候選、Google Maps 整合）
9. ⭐ **GPS 路徑軌跡記錄**（PRO 候選、時序資料）
10. ⭐ **預約配送時段**（業界常見、可選）
11. ⭐ **快遞單號追蹤**（外包商整合）
12. ⭕ **冷鏈配送**（汽配業排除）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

## 後記

### 全檔對齊五軌 audit 範式 5 標準

| 標準 | 本檔 |
|---|---|
| §G.9 通配 grep | ✅（10+ 處 grep -c / find -iname）|
| §I.5 #22 schema verify | ✅（3 model line 範圍精確、1 unique + 3 index 列）|
| §I.6.5 A041 精確 count | ✅（3 schema / 11 ts / 1 UI / 21 endpoint / 4 controller / 4 utils / 1 跨模組 helper / 0 spec / 1 共用 service 797 lines）|
| §I.6.3 揭露不完整尾標 | ✅（6 段尾全標）|
| 純諮詢 | ✅（本檔 Write 至 main 後 commit、Crown 拍板後決定 IMPL 軌）|

### 已揭露關鍵 drift / 殘留 / 缺口

1. ⚠️ **NX06 全 0 test spec**（對齊 NX05 範式、最大覆蓋缺口）
2. ⚠️ **NX06 結構特殊：共用 service 範式**（dn-logistics.service 797 lines、不同於 NX02/NX04/NX05 子模組各自 service）
3. ⚠️ **2 命名孤兒**（features/inventory/workstation/delivery + features/sale/Step6DeliveryMethod、pivot 後殘留）
4. ⚠️ **無 menu.nx06.ts**（對齊 NX05 之前狀況、需 IMPL 軌建立）
5. ⚠️ **DnItem + DnStop 全 0 index**（除 Dn 表 3 index、量大時可能需補）
6. 🟡 **NX04 SR → RETURN_PICKUP wire 待 verify**（schema reverse 已備、service 接通待確認）
7. 🟡 **NX03 Parcel → DnItem wire 待 verify**（schema reverse 已備、service 接通待確認）
8. 🟡 **NX02 PO purchaseType='I' → INTL_SHIPPING wire 待 verify**（schema 已備、service 接通待確認）

### 下一步候選（給 Crown 拍板）

1. **NX06-AUDIT-02**：3 wire verify 深掘（SR + Parcel + INTL_SHIPPING 接點）+ 物流外包業務對標
2. **NX06-IMPL-01-PLAN**：直接進實作軌、對齊 NX05 範式（補 audit-01 8 缺口 + 治理升級）
3. **TASK-NX06-DEMO-CLEANUP**：清 2 命名孤兒 + 建 menu.nx06.ts
4. **TASK-NX06-IMPL-UI-01**：UI 獨立軌（補多 placeholder 對齊 NX02/NX04/NX05 範式）
5. **TASK-NX06-IMPL-02-TEST**：測試獨立軌（補 0 spec 缺口）
6. **NX06 範圍 B**：物流外包整合 + 路線規劃 + GPS 軌跡（PRO 戰略軌）

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

---

> 對齊文件：[nx02-audit-01](../nx02/nx02-audit-01.md) · [nx04-audit-01](../nx04/nx04-audit-01.md) · [nx05-audit-01](../nx05/nx05-audit-01.md) · [nx03-audit-01](../nx03/nx03-audit-01.md)
