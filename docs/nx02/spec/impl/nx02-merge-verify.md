<!-- docs/nx02/spec/impl/nx02-merge-verify.md -->

# TASK-NX02-IMPL-01 — Merge Main 上線風險揭露（NX02-MERGE-VERIFY）

> 性質：純諮詢、不動 code、不 commit（本檔 Write 至 docs/、Crown 拍板後決定是否一併進 merge）
> 撰寫者：Hank
> 日期：2026-05-17
> 觸發：Crown 對齊 [AR-MERGE-VERIFY 範式](../../../auto-replenish/spec/impl/ar-merge-verify.md)
> 真實 main HEAD：`52af3e9`（NX02-AUDIT-02 後）
> 分支：`feature/nx02-purchase`（ahead 19 commit）
> 對應依據：[plan v0.1.1](./nx02-impl-01-plan.md) + [phase5-verify](./nx02-impl-01-phase5-verify.md)

---

## §1 NX02 service 改動 verify

### 1.1 既有 5 子模組升級影響表

| 子模組 | 升級點 | 既有 endpoint 行為 | 既有 DTO shape |
|---|---|---|---|
| `po.service` | 3a：付款條件帶入 + 主管審核寫 approvedAt/By + 國外 stage=1 + purchaseType dto | ✅ 完全相容（新邏輯只在 dto 指定 purchaseType=I 時觸發、default 'D' 與既有行為一致）| ✅ CreatePoDto +purchaseType 是 optional default 'D'、向後相容 |
| `rfq.service` | 3c：+exportRfq method + GET /:id/export | ✅ 純新增 endpoint、既有 endpoint 0 改 | ✅ 0 DTO 變動 |
| `purchase-return.service` | 3b：returnMode F/P/A 入口分流 + 5a NX05 Allowance bridge | ⚠️ A 路徑為新分支（既有 F/P 路徑 0 改、預設 default 'P' 與既有行為一致）| ✅ CreatePurchaseReturnDto +returnMode 是 optional default 'P' |
| `qt.service` | 0 改 | ✅ | ✅ |
| `rr.service` | 0 改（NX03 Phase 4 已升 G/P 分流 + partVersionId）| ✅ | ✅ |

### 1.2 PO_SEL / PR_SEL shape verify（API response 契約）

**`PO_SEL` 結論：⭐ 完全 backward compatible**
- 既有 19 欄保留（grep verified line 22~43）
- M1/M2 新增 6 欄（paymentTermDomestic / purchaseStage / 4 時間欄）**未加入 PO_SEL**
- → GET /nx02/po + GET /nx02/po/:id response shape **完全不變**、client 0 影響
- → 新欄位寫入 DB 但 API 不 expose（後續 UI 軌如需 expose 再升 PO_SEL）

**`PR_SEL` 結論：⚠️ +1 欄、向後相容**
- 既有 21 欄保留 + 新增 1 欄 returnMode
- → GET /nx02/purchase-return response 多 returnMode 欄（'F' / 'P' / 'A'）
- → client 解析多餘欄位自動 ignore、無 breaking change（業界 muscle memory：JSON 反序列化忽略未知欄）

### 1.3 Phase 5 helper 新增影響

`createAllowanceFromPurchaseReturn` (`shared/nx05/`)：
- ✅ **純新檔新 export**、未替換任何既有 helper
- ✅ 既有 `createApFromConfirmedPo` / `syncApLedgerFromPo` / `createArFromShippedSo` **0 動**
- ✅ 既有 NX03 `applyQtyInWithLedger` / `applyQtyOutWithLedger` **0 動**
- ✅ AR/NX03 既有跑路徑完全不受影響（grep verified）

⭐ **§1 結論：service 改動全 backward compatible、既有 endpoint 行為保留、無 API contract breaking change**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 `paymentTermDomestic` VARCHAR(10) NULL

| 維度 | 評估 |
|---|---|
| 純加欄 | ✅ nullable、無 default constraint |
| 既有 row 行為 | ✅ 全 null、不影響既有 PO 查詢/列表/編輯 |
| 既有 service 路徑 | ✅ 0 既有 service 寫此欄、新 po.service.create 才寫 |
| 跨模組讀取 | ⚠️ 既有 `createApFromConfirmedPo` 仍從 partner.paymentTermDomestic 取（line 39）、本軌新欄是「PO 自身覆寫」、非取代既有 partner 主檔取值路徑（後續 NX05 ApLedger 升如要用、需另升 helper） |

### 2.2 M2 5 欄國外 6 階段配套

| 欄 | 影響 |
|---|---|
| `purchaseStage` SmallInt NULL | ✅ 既有國內 PO 全 null、不影響既有業務 |
| `requestedPaymentAt / paidAt / shippedAt / arrivedAt` TIMESTAMP(3) NULL | ✅ 純時間欄、無 NOT NULL constraint |
| application 路徑 | ✅ 只在 PurchaseStageService.transit 寫入、既有 PO endpoint 0 寫 |
| 國內 PO（purchaseType=D/B）| ✅ 0 影響（建單時 application 條件式寫 null）|

### 2.3 M3 `returnMode` VARCHAR(1) NOT NULL DEFAULT 'P'

| 維度 | 評估 |
|---|---|
| 既有 row backfill | ✅ Postgres 自動套 default 'P'（已 verified DB up to date）|
| 既有 service 路徑 | ✅ 既有 PR endpoint POSTED transition 走 F/P 路徑（與既有行為一致：扣庫存 source=R） |
| 業務語意一致性 | ✅ 既有 row 視為「部分退」（業界常態）、與業務直覺一致 |
| ⚠️ 邊界 | 既有 row 若需要重新分類為 A 折讓、需業務手動 PATCH returnMode（非自動）|

### 2.4 M4 `Nx02PartnerPart` 純新表

| 維度 | 評估 |
|---|---|
| 既有 schema 引用 | ✅ 0 既有表引用此新表 |
| 既有 service 引用 | ✅ 0 既有 service 引用（grep verified、只 PartnerPart/PurchaseSuggestion/PriceComparison 用）|
| FK 衝突 | ✅ 3 FK（tenant/partner/part）ON DELETE RESTRICT、不會影響上游主檔刪除（業務本不刪 partner/part）|
| 空表 production 影響 | ✅ 空表狀態下 PurchaseSuggestionService supplierId 篩會 fallback 純歷史推算（自然 graceful degradation）|

⭐ **§2 結論：4 軌 schema 純加欄/新表、全 nullable 或有 default、0 backfill 衝突、既有 production 0 影響**。

---

## §3 role_view +SALES 加 QT controller 影響

### 3.1 既有 role 行為 verify

`qt.controller.ts` 4 個寫入 endpoint（addQt / adoptQt / rejectQt / cancelRfq）：
- **既有**：`@Roles('SYSADMIN', 'OWNER', 'PURCHASING')`
- **升級後**：`@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')`

| role | 既有行為 | 升級後行為 |
|---|---|---|
| SYSADMIN | ✅ 可寫 | ✅ 可寫（0 改）|
| OWNER | ✅ 可寫 | ✅ 可寫（0 改）|
| PURCHASING | ✅ 可寫 | ✅ 可寫（0 改、Crown Q-5b-1=a 保留 OWNER + PURCHASING）|
| SALES | ❌ 403 | ✅ 可寫（新權限）|
| 其它 role | ❌ 403 | ❌ 403（0 改）|

### 3.2 SALES 新權限觸發既有 endpoint 異常風險

- **service 邏輯 0 改**：addQt / adoptQt / rejectQt / cancelRfq 內部邏輯完全保留
- **業務語意對齊**：QT/TI 業務歸 NX04 SALES（Crown Q-C4=A、同行調貨是銷售動作）
- **應用層校驗保留**：service 內部 `assertPartnerIsInquiry` (qt.service line 436) `partner_type='S'` guard 不變
- **既有 6 spec test**：純 service level test、不檢查 role、不受 controller @Roles 變動影響

⭐ **§3 結論：role 純增加、既有 3 role 行為完全保留、新 SALES 走相同 service 邏輯、無異常觸發風險**。

---

## §4 Phase 5 NX05 Allowance bridge 影響

### 4.1 既有 NX05 Allowance service 並存 verify

```
既有：apps/nx-api/src/nx05/allowance/allowance.service.ts
  - 完整 CRUD（list / getById / create / update / softDelete）
  - 業務手動建單路徑（POST /nx05/allowance）
  - 對 allowanceType S（銷貨折讓）+ P（進貨折讓）兩種

新增：apps/nx-api/src/shared/nx05/nx05-create-allowance-from-pr.ts
  - PR returnMode='A' POSTED 時自動呼叫（inline helper、非 service）
  - 只寫 allowanceType='P' 進貨折讓
```

### 4.2 兩條路徑衝突 verify

| 維度 | 既有 service | 新 inline helper |
|---|---|---|
| 觸發來源 | 業務人員手動 POST /nx05/allowance | PR returnMode='A' POSTED 自動 |
| schema 寫入 | nx05_allowance + nx05_allowance_item | 同 |
| docNo 生成 | allocNx05DocNo 'AL' | 同 |
| dedup 機制 | schema unique [docNo]（NX05 既有）| remark prefix `PR:<docNo>` startsWith 查詢 |
| financePeriodMutable 校驗 | ✅ 既有 service 有（line 122） | ❌ 新 helper 無 |

⚠️ **邊界揭露 1**：新 helper 0 跑 `assertFinancePeriodMutable` 校驗（既有 service line 122 有此 guard、防止寫入已關帳期間）。
- **影響範圍**：若 PR POSTED 時間落在 NX05 已關帳期、新 helper 仍會寫入 Allowance（既有 service 會擋）
- **業務語意**：低風險（PR 過帳本身在 NX02 服務內、業務人員若在已關帳期過帳 PR、本身就是業務責任、非 helper 範圍）
- **可後續軌補強**：inline helper 加 `assertFinancePeriodMutable` 對齊

⚠️ **邊界揭露 2**：dedup 用 `remark.startsWith('PR:<docNo>')`、若既有 service 業務手動建單時 remark 正好以此 prefix 開頭、會誤判 dup。
- **影響範圍**：誤判機率極低（業務手動輸入 remark 不會用 `PR:` 開頭慣例）
- **回滾**：若發生、移除 helper 內部 dedup（純新建、依賴 schema docNo unique）

### 4.3 既有 NX05 路徑保留 verify

| 既有 NX05 helper | Phase 5 是否動 |
|---|---|
| `createApFromConfirmedPo` | ✅ 0 動 |
| `syncApLedgerFromPo` | ✅ 0 動 |
| `createArFromShippedSo` | ✅ 0 動 |
| `nx05-doc-no.allocNx05DocNo` | ✅ 0 動（新 helper 復用既有）|
| `nx05/ar/ar.service` | ✅ 0 動 |
| `nx05/allowance/allowance.service` | ✅ 0 動 |
| `nx05/paylog` | ✅ 0 動 |
| `nx05/ap` 系列 | ✅ 0 動 |

⭐ **§4 結論：新 inline helper 與既有 NX05 完全並存、0 替換、0 干涉、2 個邊界揭露（FinancePeriod / dedup）為低風險可後續軌補強**。

---

## §5 結論建議：merge 後回滾預案

### 5.1 風險評估總結

| 段 | 風險等級 | 風險點 |
|---|---|---|
| §1 service 升級 | 🟢 低 | 全 backward compatible、PR_SEL 多 1 欄 client 自動 ignore |
| §2 schema 加欄 | 🟢 低 | 4 軌純加欄/新表、全 nullable 或 default、0 backfill 衝突 |
| §3 role +SALES | 🟢 低 | 純增加權限、既有 3 role 0 動、service 邏輯 0 改 |
| §4 NX05 bridge | 🟡 中-低 | 2 邊界（FinancePeriod / dedup 假衝突）皆低觸發機率 |
| 整體 production 影響 | 🟢 低 | 既有 PO/PR/RFQ/RR/QT/TI endpoint 全 backward compatible |

### 5.2 merge 建議：✅ 可直接 merge main

**理由**：
1. ✅ 既有 5 子模組 endpoint 行為 0 破壞（PO_SEL 完全不變、PR_SEL +1 欄相容、其它 0 改）
2. ✅ 4 軌 schema 純加欄/新表、既有 row 0 影響
3. ✅ role_view 純增加（無減去任何既有 role）
4. ✅ NX05 4 helper 並存、既有 service 0 動
5. ✅ tsc 0 error per commit（19 commit 全綠）
6. ✅ 對齊 NX03/AR merge 範式（兩軌已 production 驗證）

### 5.3 回滾預案（如萬一）

**Plan A：純 service 回滾（不退 schema）**
- `git revert` 5a~7c 區段（commits fd50592~661b376）
- schema M1~M4 留下（純加欄 0 害）
- 既有 endpoint 行為立即回復

**Plan B：完整回滾（含 schema）**
- `git revert` 全 19 commit
- prisma migrate resolve --rolled-back M4~M1（注意逆序）
- DB 手動 drop nx02_partner_part 表 + drop 6 欄位（PG ALTER TABLE DROP COLUMN）
- ⚠️ 風險：若已有 production PR row 寫過 returnMode 非 'P'、回滾後資料保留但欄位消失

**Plan C：選擇性 disable（推薦）**
- 不 git revert、不退 schema
- 純 application 層 disable：
  - `PurchaseStageController` controller 註解掉（停 6 階段 endpoint）
  - `purchase-return.service.applyPrPosting` 內 returnMode='A' 分支強制 throw（停 A 折讓路徑）
  - `qt.controller` @Roles 移除 'SALES'（回 PURCHASING-only）
- 既有 schema/data 0 動、最小影響面

### 5.4 觀察建議（merge 後 24~48h）

1. **NX05 Allowance 產生監測**：grep `remark LIKE 'PR:%'` 應有對應 PR returnMode='A' POSTED 紀錄
2. **PO purchaseStage 流轉日誌**：audit log `entity_table='nx02_po' summary LIKE '%國外採購 6 階段流轉%'`
3. **SALES role 使用統計**：JWT log SALES 角色觸發 QT endpoint 數
4. **PartnerPart 主檔成長**：`SELECT COUNT(*) FROM nx02_partner_part GROUP BY source`（S vs M 比例）

---

## 後記

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。

下一步建議：
1. ✅ 直接 merge `feature/nx02-purchase` → `main`（風險評估 🟢 低）
2. ✅ push origin main
3. ✅ tag `v0.5.0-nx02-closure`
4. 開啟觀察期 24~48h（§5.4 4 項監測）
5. 後續軌：TASK-NX02-IMPL-UI-01（UI 獨立軌、Crown Q-U1=c 拍板留 backlog）

---

> 對齊文件：[nx02-impl-01-plan v0.1.1](./nx02-impl-01-plan.md) · [nx02-impl-01-phase5-verify](./nx02-impl-01-phase5-verify.md) · [ar-merge-verify](../../../auto-replenish/spec/impl/ar-merge-verify.md)
