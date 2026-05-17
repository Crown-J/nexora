<!-- docs/nx04/spec/impl/nx04-merge-verify.md -->

# TASK-NX04-IMPL-01 — Merge Main 上線風險揭露（NX04-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Alex review、Crown 拍板後才 commit + execute merge（對齊 NX02 範式）
> 撰寫者：Hank
> 日期：2026-05-18
> 觸發：Phase 7 closure 後、對齊 NX02-MERGE-VERIFY 範式
> 真實 main HEAD：`6e72258`（NX02 v0.5.0-nx02-closure tag 後）
> 分支：`feature/nx04-sales`（ahead 14 commit）
> 對應依據：[plan v0.1.0](./nx04-impl-01-plan.md) + [phase5-verify](./nx04-impl-01-phase5-verify.md)

---

## §1 NX04 service 改動 verify

### 1.1 既有 4 子模組升級影響表

| 子模組 | 升級點 | 既有 endpoint 行為 | 既有 DTO shape |
|---|---|---|---|
| `so.service` | 3a：4 接點（客戶預設據點 fallback + 授信擋單 + 部分鎖 patchItem SHIPPED guard + 自動調撥 wire Phase 4b）| ⚠️ 行為變化：CreateSoDto.warehouseId 從必填改 optional（fallback customer.defaultWarehouseId）/ create() 內呼叫 CreditGuard（可能 throw Forbidden）/ patchItem SHIPPED 階段新 throw（既有 SHIPPED 已被 assertSoItemsEditable 擋）| ✅ CreateSoDto.warehouseId 改 optional 向後相容（既有 client 必傳仍 OK）|
| `quote.service` | 3b：whereList tenant-wide + search 擴 4 欄 | ✅ 完全相容（純擴 search OR 條件、既有 client 0 影響）| ✅ 0 DTO 變動 |
| `sales-return.service` | 3c：returnAction R/D/X 分流 + Phase 4a Allowance bridge wire | ⚠️ 行為變化：UpdateSalesReturnDto +returnAction optional（default 'R'）/ POSTED transit 多 createAllowanceFromSalesReturn call | ✅ UpdateSalesReturnDto +returnAction optional 向後相容 |
| `translator.service` | 0 改 | ✅ | ✅ |

### 1.2 SO_SEL / SR_SEL shape verify（API response 契約）

**`SO_SEL` 結論：⭐ 完全 backward compatible**
- 既有 25 欄保留（line 32~57）
- M1/M2 新增 schema 欄（defaultWarehouseId / creditOverdueDaysThreshold）**未加入 SO_SEL**（既有 defaultWarehouseId 在 partner、creditOverdueDaysThreshold 在 tenant）
- → GET /nx04/so + GET /nx04/so/:id response shape 完全不變、client 0 影響

**`SR_SEL` 結論：⭐ 完全 backward compatible**
- 既有 24 欄保留（line 31~54）
- returnAction 純 in-memory dto、未存 schema、無 SEL 影響
- → GET /nx04/sales-return response shape 完全不變

### 1.3 新建 3 service + 2 helper 影響

**3 新 service（純新 controller、0 替換既有）**：
- ✅ `CreditGuardService` + `POST /nx04/credit-guard/check`
- ✅ `SalesPerformanceService` + `GET /nx04/sales-performance/stats`
- ✅ `CoEstimateService` + `POST /nx04/co-estimate/estimate`

**2 inline helper（純新檔新 export）**：
- ✅ `nx05-create-allowance-from-sr.ts`（仿 NX02 範式）
- ✅ `nx03-auto-transfer-from-so.ts`（仿 RefreshmentDocCreator.createSt 範式）

⭐ **§1 結論：service 改動全 backward compatible（API contract 0 breaking change）、新增 3 endpoint + 2 inline helper**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 `nx01_partner.default_warehouse_id` VARCHAR(15) NULL FK SET NULL

| 維度 | 評估 |
|---|---|
| 純加欄 | ✅ nullable |
| 既有 row 行為 | ✅ 全 null、不影響既有 partner CRUD |
| 既有 service 路徑 | ✅ 0 既有 service 寫此欄、新 so.service.create 才讀（fallback 邏輯） |
| FK SET NULL | ✅ warehouse 主檔不會被刪、即使刪除客戶 fallback 系統選倉 |
| NX01 升版題 | ⚠️ 動 NX01 partner 主檔（跨 NX04 主軌）、partner.service 既有 dto / SEL 不影響（新欄 select 缺失 = undefined、客戶端 ignore）|

### 2.2 M2 `nx99_tenant.credit_overdue_days_threshold` INT NOT NULL DEFAULT 15

| 維度 | 評估 |
|---|---|
| 既有 row backfill | ✅ Postgres 自動套 default 15（業界半月 standard）|
| 既有 service 路徑 | ✅ 0 既有 service 讀此欄、新 CreditGuardService 才讀 |
| NX99 升版 | ⚠️ 動 NX99 tenant 主檔、tenant.service 既有 dto / SEL 不影響 |

⭐ **§2 結論：2 軌 schema 純加欄、全 nullable 或有 default、0 backfill 衝突、既有 production 0 影響**。

---

## §3 跨模組 helper 接點 verify

### 3.1 既有 NX05 helper 0 動

| 既有 NX05 helper | 本軌是否動 |
|---|---|
| `createApFromConfirmedPo` | ✅ 0 動 |
| `syncApLedgerFromPo` | ✅ 0 動 |
| `createArFromShippedSo` | ✅ 0 動 |
| `createAllowanceFromPurchaseReturn` | ✅ 0 動（NX02 Phase 5 落地）|
| `nx05/allowance/allowance.service` | ✅ 0 動（既有手動建單路徑）|
| `nx05/ar/ar.service` | ✅ 0 動 |
| `nx05/paylog` 系列 | ✅ 0 動 |

### 3.2 新增 helper：createAllowanceFromSalesReturn

| 維度 | 評估 |
|---|---|
| dedup 機制 | ✅ remark prefix `SR:<docNo>` startsWith 查詢（仿 NX02 範式）|
| FinancePeriod 校驗 | ⚠️ 缺 `assertFinancePeriodMutable`（同 NX02 Phase 5 commit 5a 既知邊界、A026 backlog 列）|
| 既有 service 衝突 | ✅ 並存（業務手動建單 vs 自動建單兩條路徑）|

### 3.3 新增 helper：autoCreateTransferFromSo

| 維度 | 評估 |
|---|---|
| 跨模組寫入 | 寫 Nx03St + Nx03StItem（NX03 主檔）|
| 冪等保護 | ✅ SoItem.stId 已存在 / transferStatus='C' 已完成 skip |
| 無倉庫支援 throw | ⚠️ DRAFT→CONFIRMED transit throw BadRequest 會擋 transit（業務需手動處理）|
| ST 過帳 | ⚠️ 本軌僅建 DRAFT ST、後續 ST 過帳由 NX03 ST service 處理（既有流程）|

⭐ **§3 結論：既有 NX05 / NX03 helper 0 動、2 新 helper 純並存、2 個既知邊界（FinancePeriod / 無倉庫 throw）皆業務可接受**。

---

## §4 role_view 影響 verify

### 4.1 既有 role 行為 verify（無變動）

**本軌不動 controller @Roles**：
- `so.controller` 既有 ✓
- `quote.controller` 既有 ✓
- `sales-return.controller` 既有 ✓
- `translator.controller` 既有 ✓

**新 3 controller @Roles**：
- `credit-guard.controller` `@Roles('SYSADMIN', 'OWNER', 'SALES')` ✓
- `sales-performance.controller` 同 ✓
- `co-estimate.controller` 同 ✓

### 4.2 NX02 SALES role 既有開放（無本軌變動）

- NX02 Phase 5 commit 5b 已開 `qt.controller` @Roles +SALES ✓
- 本軌 SALES 業務員可呼叫 NX02 QT endpoint（同行調貨業務歸 NX04）
- 本軌 0 動 NX02 role

⭐ **§4 結論：本軌 role 純增加（3 個新 controller、所有 SALES + SYSADMIN + OWNER）、既有 role 0 動**。

---

## §5 結論建議：merge 後回滾預案

### 5.1 風險評估總結

| 段 | 風險 | 風險點 |
|---|---|---|
| §1 service 升級 | 🟡 中-低 | so.service create CreditGuard 呼叫（可能 throw Forbidden）/ patchItem SHIPPED guard / 自動調撥 transit（無倉庫 throw）|
| §2 schema 加欄 | 🟢 低 | 2 軌純加欄、全 nullable 或 default、0 backfill 衝突 |
| §3 跨模組 helper | 🟢 低 | 既有 NX05/NX03 helper 0 動、2 新 helper 純並存（2 邊界已知）|
| §4 role +新 controllers | 🟢 低 | 純增加 3 controller、既有 role 0 動 |
| 整體 production 影響 | 🟡 中-低 | 既有 SO/Quote/SR/Translator endpoint backward compatible、新 guard 可能擋既有業務（授信 / 自動調撥） |

### 5.2 ⚠️ 主要風險點：CreditGuard + 自動調撥可能擋既有流程

**Case A：CreditGuard 4 機制可能擋既有 SO 建單**：
- 既有有客戶 creditStatus='F' 凍結 → 新軌 SO create throw Forbidden（之前可建）
- 既有有客戶 unpaidAr + soAmount > creditLimit → throw Forbidden
- **影響**：production 既有黑名單 / 超額客戶 SO 流被切斷
- **mitigation**：
  - production 前 verify customer creditStatus 分佈（若 0 個 F、低風險）
  - 可短期 disable CreditGuard call（純註解 so.service create 內 check call、保留 service / endpoint）

**Case B：autoCreateTransferFromSo 無倉庫支援 throw**：
- 既有 SO DRAFT→CONFIRMED transit 可能因部分料件無倉庫支援被擋
- **影響**：業務員需手動處理（不是 production 立即斷裂、是 transit 流被擋）
- **mitigation**：throw 訊息明確指引業務員、可短期 disable autoCreateTransferFromSo call

### 5.3 merge 建議：✅ 可直接 merge（但建議監測 §5.2 兩 case）

**理由**：
1. ✅ 既有 4 子模組 endpoint shape 0 破壞（SO_SEL / SR_SEL 完全不變）
2. ✅ 2 軌 schema 純加欄、既有 row 0 影響
3. ✅ 既有 NX05 / NX03 helper 0 動
4. ✅ 既有 controller @Roles 0 動
5. ✅ tsc 0 error per commit（14 commit 全綠）
6. ✅ 對齊 NX02 / NX03 / AR merge 範式（3 軌已 production 驗證）
7. ⚠️ §5.2 兩 case 建議監測（CreditGuard / autoTransfer）、production 24~48h 觀察

### 5.4 回滾預案

**Plan A：純 service 註解（最小化）⭐ 推薦**：
- 註解 so.service.create 內 `creditGuard.check` call（保留 service / endpoint、純跳過建單時 check）
- 註解 so.service.update 內 `autoCreateTransferFromSo` call（保留 helper / 跳過 transit 時建 ST）
- 註解 sales-return.service.update 內 `createAllowanceFromSalesReturn` call（保留 helper、跳過 Allowance 寫入）
- schema/data 0 動、最小影響面

**Plan B：純 service 整段 git revert**：
- `git revert` Phase 2~7 區段（commits 04b08b6~88bb4cf）
- schema M1+M2 留下（純加欄 0 害）
- 既有 endpoint 行為立即回復

**Plan C：完整回滾（含 schema）**：
- `git revert` 全 14 commit
- prisma migrate resolve --rolled-back M2~M1（注意逆序）
- DB 手動 drop nx01_partner.default_warehouse_id + nx99_tenant.credit_overdue_days_threshold
- ⚠️ 風險：可能影響其它軌（後續軌可能讀此欄）

### 5.5 觀察建議（merge 後 24~48h）

1. **CreditGuard throw 率**：grep Forbidden log `Customer.*credit limit exceeded` / `is FROZEN`、初期應低（既有客戶大多正常）
2. **autoTransfer 觸發率**：audit log `summary LIKE '%國外採購 6 階段流轉%'`（typo 應為 ST、需 query）、產生 ST 數 / 失敗 throw 數
3. **Allowance 產生監測**：grep `remark LIKE 'SR:%'` 應有對應 SR returnAction R/D POSTED 紀錄
4. **新 endpoint 使用統計**：JWT log `/nx04/credit-guard` / `/nx04/sales-performance` / `/nx04/co-estimate` 觸發數

---

## 後記

⚠️ 揭露可能不完整、Alex / Crown 想補的直接說。

下一步建議：
1. ✅ Alex review 本 verify 報告
2. ✅ Crown 拍 final merge
3. ✅ commit 本檔 + A026 backlog 條目（FinancePeriod for SR Allowance / autoTransfer schema 持久化）
4. ✅ git checkout main + merge --no-ff feature/nx04-sales
5. ✅ push origin main
6. ✅ tag v0.6.0-nx04-closure
7. ✅ push tag
8. 開啟觀察期 24~48h（§5.5 4 項監測）

**等 Alex review → Crown 拍板「merge ✅」後執行**。

---

> 對齊文件：[nx04-impl-01-plan v0.1.0](./nx04-impl-01-plan.md) · [nx04-impl-01-phase5-verify](./nx04-impl-01-phase5-verify.md) · [nx02-merge-verify](../../../nx02/spec/impl/nx02-merge-verify.md)
