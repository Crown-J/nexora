<!-- docs/nx05/spec/impl/nx05-merge-verify.md -->

# TASK-NX05-IMPL-01 — Merge Main 上線風險揭露（NX05-MERGE-VERIFY）

> 性質：純諮詢、stop 給 Crown + Alex 驗收（Q-RHYTHM-2：Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-18
> 觸發：Phase 6 closure 後、Q-RHYTHM-2 全軌連跑完成
> 真實 main HEAD：`af727d9`（NX04 v0.6.0 + NX05 audit-01）
> 分支：`feature/nx05-finance`（ahead 12 commit）
> 對應依據：[plan v0.1.0](./nx05-impl-01-plan.md) + [nx05-summary.md](../../nx05-summary.md)

---

## §1 NX05 service 改動 verify

### 1.1 既有 7 子模組 service 影響

| 子模組 | 是否動 | 既有 endpoint 行為 |
|---|---|---|
| `allowance.service` | ❌ 0 改（既有 line 122 FinancePeriod 校驗保留）| ✅ |
| `ap.service` | ❌ 0 改 | ✅ |
| `ar.service` | ❌ 0 改 | ✅ |
| `note.service` | ❌ 0 改（CLEARED 觸發 Paylog 留 TASK-NX05-NOTE-PAYLOG 獨立軌）| ✅ |
| `payment.service` | ❌ 0 改 | ✅ |
| `period-close.service` | ❌ 0 改 | ✅ |
| `receipt.service` | ❌ 0 改 | ✅ |

⭐ **既有 7 service 完全 0 改、既有 34 endpoints 行為 100% 保留**。

### 1.2 新增 3 service / controller（純新增、0 替換既有）

- ✅ `AccountCodeService` + 5 endpoints（`/nx05/account-code`、補主檔缺口）
- ✅ `ArStatementService` + 1 endpoint（`/nx05/ar-statement/:customerId`、純 query）
- ✅ `OverdueWatcherService` + 1 endpoint（`/nx05/overdue-watcher/list`、純 query）

### 1.3 既有 2 Allowance helper 補 FinancePeriod 校驗（⚠️ 行為改變）

| helper | 行為改變 |
|---|---|
| `createAllowanceFromPurchaseReturn` | +assertFinancePeriodMutable(pr.prDate) |
| `createAllowanceFromSalesReturn` | +assertFinancePeriodMutable(sr.srDate) |

⚠️ **production 影響揭露**：
- 既有 NX02 PR returnMode='A' POSTED + NX04 SR R/D POSTED 在已關帳期間呼叫 → 會 throw（之前不會）
- 業務責任：對齊既有 `nx05/allowance/allowance.service` line 122 範式（同 throw）
- 風險：低（業務本不該在已關帳期間建單）

### 1.4 新增 2 跨模組 helper（純新增、0 替換、0 wire）

| helper | 用途 |
|---|---|
| `createApFromPostedRr` | LITE 直接路徑（NX02 RR POSTED 無對應 PO → AP）|
| `createApFromPostedTi` | 同行調貨過帳 → AP |

⭐ **2 helper 純 export 不 wire**：
- 本軌不改 NX02 既有 rr.service / TI 處理流（0 改 production）
- 後續軌 NX02 LITE 路徑 / TI service 啟動時 wire
- production 接點 0 改變

⭐ **§1 結論：既有 7 service 0 改、既有 34 endpoints 行為 100% 保留、3 新 service + 7 new endpoints 純新增、2 Allowance helper +FinancePeriod 為唯一行為改變**。

---

## §2 schema 改對既有功能影響

### 2.1 M1 AccountCode seed（INSERT only）

| 維度 | 評估 |
|---|---|
| 純 INSERT | ✅ 無 ALTER TABLE、無 schema 結構變動 |
| 既有 row 影響 | ✅ ON CONFLICT (tenant_id, code) DO NOTHING、既有自訂科目 0 覆蓋 |
| 既有 service 路徑 | ✅ 既有 NX05 service 0 引用 AccountCode（除 paylog accountCodeId FK）|
| 對既有 tenant 寫入 | ✅ 對既有所有 tenant 批次 INSERT、新 tenant 暫時無 seed（後續軌可升 application 層 seed-on-tenant-create）|

⭐ **§2 結論：1 軌 schema 純 INSERT、0 ALTER、0 backfill 衝突、既有 production 0 影響**。

---

## §3 跨模組 helper 整合 verify

### 3.1 既有 5 helper 0 動（核心保留）

| 既有 helper | 本軌是否動 |
|---|---|
| `createApFromConfirmedPo` | ✅ 0 動 |
| `syncApLedgerFromPo` | ✅ 0 動 |
| `createArFromShippedSo` | ✅ 0 動 |
| `createAllowanceFromPurchaseReturn` | ⚠️ +FinancePeriod 校驗（§1.3 已揭露） |
| `createAllowanceFromSalesReturn` | ⚠️ +FinancePeriod 校驗（§1.3 已揭露） |

### 3.2 NX05 跨模組 helper 完整化（7 helper、業務閉環收口）

```
shared/nx05/
├── nx05-create-ap-from-po.ts             ✅ 既有
├── nx05-sync-ap-from-po.ts               ✅ 既有
├── nx05-create-ar-from-so.ts             ✅ 既有
├── nx05-create-allowance-from-pr.ts      ✅ 既有 + 本軌補 FinancePeriod
├── nx05-create-allowance-from-sr.ts      ✅ 既有 + 本軌補 FinancePeriod
├── nx05-create-ap-from-rr.ts             ⭐ 本軌新（純 export 不 wire）
└── nx05-create-ap-from-ti.ts             ⭐ 本軌新（純 export 不 wire）
```

⭐ **§3 結論：既有 3 helper 0 動、2 helper +FinancePeriod 校驗、2 新 helper 純並存、業務閉環收口完整**。

---

## §4 role_view 影響 verify

### 4.1 既有 role 行為 verify（無變動）

**本軌不動既有 controller @Roles**。

**新 3 controller @Roles**：
- `account-code.controller` `@Roles('SYSADMIN', 'OWNER', 'FINANCE')`
- `ar-statement.controller` `@Roles('SYSADMIN', 'OWNER', 'FINANCE', 'SALES')`（SALES 看自己客戶對帳單）
- `overdue-watcher.controller` `@Roles('SYSADMIN', 'OWNER', 'FINANCE', 'SALES')`（SALES 看自己客戶逾期）

⭐ **§4 結論：本軌 role 純增加 3 新 controller、既有 7 controller @Roles 0 動**。

---

## §5 結論建議：merge 後回滾預案

### 5.1 風險評估總結

| 段 | 風險 | 風險點 |
|---|---|---|
| §1 service 改動 | 🟢 低 | 既有 7 service 0 改、新 3 純新增、2 helper +FinancePeriod 業務責任 |
| §2 schema 加欄 | 🟢 低 | 純 INSERT seed、ON CONFLICT 保護、0 ALTER |
| §3 跨模組 helper | 🟢 低 | 既有 3 helper 0 動、2 helper +FinancePeriod、2 新 helper 純並存不 wire |
| §4 role +新 controllers | 🟢 低 | 純增加 3 controller、既有 0 動 |
| 整體 production 影響 | 🟢 低 | 既有所有 endpoint 行為保留、3 新 endpoint 純新增、2 helper +FinancePeriod 是唯一行為改變 |

### 5.2 ⚠️ 主要風險點：2 Allowance helper +FinancePeriod 校驗

**Case：既有 NX02 PR / NX04 SR POSTED 在已關帳期間呼叫**：
- 既有：直接寫 Allowance（無校驗）
- 本軌後：throw assertFinancePeriodMutable（業務責任）
- **影響**：production 既有 PR/SR POSTED 流可能在關帳期間被擋
- **業務語意**：對齊既有 nx05/allowance/allowance.service line 122 範式（同 throw 邏輯）
- **mitigation**：
  - production 前 verify 既有 Closing CLOSED 期間是否有 PR/SR POSTED 紀錄
  - 若有、改 Closing.status='OPEN' 重新打開（既有 reopen 邏輯）

### 5.3 merge 建議：✅ 可直接 merge

**理由**：
1. ✅ 既有 7 service 0 改、既有 34 endpoints 行為 100% 保留
2. ✅ 1 軌 schema 純 INSERT seed、ON CONFLICT 保護
3. ✅ 既有 3 NX05 helper 0 動
4. ✅ 既有 controller @Roles 0 動
5. ✅ tsc 0 error per commit（12 commit 全綠）
6. ✅ 對齊 NX02 / NX03 / AR / NX04 merge 範式（4 軌已 production 驗證）
7. ⚠️ §5.2 1 case 建議監測（FinancePeriod 校驗、production 24~48h 觀察）

### 5.4 回滾預案

**Plan A：純 service 註解（最小化）⭐ 推薦**：
- 註解 2 Allowance helper 內 assertFinancePeriodMutable call（保留新 helper / 跳過 FinancePeriod 校驗）
- 註解 3 新 controller 註冊（保留 service / endpoint disable）
- schema/data 0 動、最小影響面

**Plan B：純 service 整段 git revert**：
- `git revert` Phase 2~6 區段（commits f408afd~15a3081）
- schema M1 seed 留下（純 INSERT、0 害）
- 既有 endpoint 行為立即回復

**Plan C：完整回滾（含 schema）**：
- `git revert` 全 12 commit
- DB 手動 DELETE FROM nx05_account_code WHERE is_system=TRUE AND created_by='SYSTEM'（純清 seed）
- ⚠️ 風險：低（純 seed、無業務資料依賴）

### 5.5 觀察建議（merge 後 24~48h）

1. **AccountCode seed 監測**：grep `WHERE is_system=TRUE AND created_by='SYSTEM'` count 應 = 95 × tenant 數
2. **AR Statement 使用統計**：JWT log `/nx05/ar-statement/:customerId` 觸發數
3. **OverdueWatcher 使用統計**：JWT log `/nx05/overdue-watcher/list` 觸發數
4. **FinancePeriod 校驗 throw**：grep Forbidden / BadRequest log（PR/SR Allowance 在關帳期間呼叫）

---

## 後記

⚠️ 揭露可能不完整、Alex / Crown 想補的直接說。

下一步建議：
1. ✅ Alex review 本 verify 報告
2. ✅ Crown 拍 final merge
3. ✅ commit 本檔 + A026 backlog 條目（FinancePeriod 校驗 production 前 verify + AccountCode seed-on-tenant-create）
4. ✅ git checkout main + merge --no-ff feature/nx05-finance
5. ✅ push origin main
6. ✅ tag v0.7.0-nx05-closure
7. ✅ push tag
8. 開啟觀察期 24~48h（§5.5 4 項監測）

**Q-RHYTHM-2 首次落地完成**：Crown + Alex 預批 + Hank 全軌連跑 12 commit / 1 migration / 1~2 小時 → stop 給 Crown + Alex 驗收。

**等 Alex review → Crown 拍板「merge ✅」後執行**。

---

> 對齊文件：[nx05-impl-01-plan v0.1.0](./nx05-impl-01-plan.md) · [nx04-merge-verify](../../../nx04/spec/impl/nx04-merge-verify.md) · [nx02-merge-verify](../../../nx02/spec/impl/nx02-merge-verify.md)
