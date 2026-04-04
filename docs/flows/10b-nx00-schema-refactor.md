# NX00 Schema 重構計劃書

## 背景與決策

本次重構原因：

1. `nx00_brand_code_role` 改名為 `nx00_brand_code_rule`，新增 `name` 欄位，移除 `part_brand_id` 唯一限制（支援同品牌多套編碼規則，例如 Bosch 德國版 vs 上海版）
2. `nx00_part.code` 改為系統自動組合（不由使用者輸入），唯一性改為 `@@unique([tenantId, code, countryId])`，同料號不同產地可並存
3. `nx00_part.code_rule_id` 新增 FK → `nx00_brand_code_rule`，讓每筆零件明確知道用哪套規則組合 code
4. `nx00_user_warehouse.tenant_id` 依計劃書 §1.2 加回，NOT NULL（schema／seed 已對齊者僅需與 [docs/nx00_field.csv](../nx00_field.csv) 欄位順序核對）
5. `nx99_subscription.currency_id` 新增 FK → `nx00_currency`（取代舊有純字串 `currency` 欄位；Prisma 上 `currencyId` 型別對齊 `nx00_currency.id` 為 `VARCHAR(15)`，CSV 若標 `VARCHAR(10)` 以實際 PK 為準）
6. 欄位順序全面對齊 `docs/nx00_field.csv`（最新版）
7. Railway DB 全部清除重新 seed（見 Phase 3）

**執行順序：Phase 1 → Alex 確認 → Phase 2 → Alex 確認 → Phase 3**

**參考文件**：`docs/nx00_field.csv`（已更新，含所有異動欄位）

**應用層銜接**（Prisma `generate` 後必做，見本 repo 實作）：`nx-api` 料號規則模組改為 `brand-code-rule`／`nx00BrandCodeRule`，零件建立須帶 `codeRuleId`；詳見程式變更與 `grep` 清殘留。

---

## 決策定案

| 決策項目 | 定案內容 |
|---------|---------|
| `nx00_brand_code_role` 改名 | → `nx00_brand_code_rule`，新增 `name` 欄位 |
| `part_brand_id` 唯一限制 | 移除，同品牌可有多筆規則 |
| `nx00_part.code` 唯一性 | `@@unique([tenantId, code, countryId])` |
| `nx00_part.code_rule_id` | 新增 FK → `nx00_brand_code_rule`，NN |
| `nx00_user_warehouse.tenant_id` | 依計劃書 §1.2，NN |
| `nx99_subscription.currency_id` | 新增 FK → `nx00_currency` |
| 欄位順序 | 全面對齊 `docs/nx00_field.csv`（已更新） |

---

## 三、執行方式

三個 Phase 依序執行，**每個 Phase 完成後必須回傳給 Alex 確認，才能繼續下一個 Phase。**

```
Phase 1：修改 schema.prisma → 回傳 Alex 確認
    ↓
Phase 2：修改 seed.ts → 回傳 Alex 確認
    ↓
Phase 3：清除 Railway DB → 套用 migration → 重新 seed → 驗收
```

---

## Phase 1：schema.prisma 修改

> **完成後將完整 schema.prisma 回傳給 Alex 確認，才可進行 Phase 2。**

### 修改 1：Nx00BrandCodeRule（改名 + 調整）

- 原 `Nx00BrandCodeRole` 改名為 `Nx00BrandCodeRule`，`@@map` → `nx00_brand_code_rule`
- 新增 `name`（第 4 欄，在 `partBrandId` 之後）
- 移除 `partBrandId` 的 `@unique`，改 `@@index([partBrandId])`
- ID：`gen_nx00_bcor_id()` 不變
- 反向關聯：`parts Nx00Part[]`
- `Nx00PartBrand`：`brandCodeRules Nx00BrandCodeRule[]`（一對多）

### 修改 2：Nx00Part

- `tenantId` 後新增 `codeRuleId` NN，FK → `Nx00BrandCodeRule`
- `@@unique([tenantId, code, countryId])`，`@@index([codeRuleId])`
- 欄位順序對齊 CSV

### 修改 3：Nx00UserWarehouse

- `tenantId` NN，`@@unique([tenantId, userId, warehouseId])`（與 CSV 核對順序）

### 修改 4：Nx99Subscription

- `remark` 前新增 `currencyId` FK → `Nx00Currency`（`@db.VarChar(15)`）
- `Nx00Currency` 補 `subscriptions Nx99Subscription[]`
- 移除舊 `currency` 字串欄位（migration 負責資料遷移）

### 修改 5：反向關聯

- `Nx00User`：`brandCodeRulesCreated` / `brandCodeRulesUpdated`（relation 名稱對應新 model）
- `Nx99Tenant`：`brandCodeRules Nx00BrandCodeRule[]`

### Phase 1 驗收條件

- [ ] `pnpm exec prisma validate` 無錯誤
- [ ] `Nx00BrandCodeRule` 存在，`Nx00BrandCodeRole` 已完全移除
- [ ] `Nx00Part.codeRuleId` NN，FK 正確
- [ ] `@@unique([tenantId, code, countryId])`
- [ ] `Nx99Subscription.currencyId` FK → `Nx00Currency`

---

## Phase 2：seed.ts 修改

> **完成後將 seed.ts 完整內容回傳給 Alex 確認，才可進行 Phase 3。**

### 修改 1：seedBrandCodeRules（原 seedBrandCodeRoles）

- FUNCTION：`NX00-SEED-SVC-001-F12 → seedBrandCodeRules`
- BOS 兩筆：Bosch 德國／Bosch 上海（同品牌多套規則）
- 規則表：VAG、OEM、MAN、BOS（×2）依計劃 seg／codeFormat／brandSort

### 修改 2：seedParts

- 每筆 `codeRuleId`；多數 `countryId = DEU`
- 展示：同 code `8K0-819-439B` 與 `06L-115-561` 各 DEU + CHN

### 修改 3：seedUserWarehouses

- 確認 `tenantId` 皆有寫入

### 修改 4：seedSubscriptions

- `currencyId` = TWD 之 `nx00_currency.id`

### Phase 2 驗收條件

- [ ] 使用 `nx00BrandCodeRule`
- [ ] BOS 兩筆規則
- [ ] 每筆 part 有 `codeRuleId`
- [ ] 至少 2 組同料號不同產地
- [ ] subscription 有 `currencyId`
- [ ] seed 可重複執行

---

## Phase 3：清除資料庫並重新 seed

> **Phase 3 在 Phase 1、Phase 2 均經 Alex 確認後才開始。**

### Step 1：DBeaver 清除 Railway DB

```sql
TRUNCATE TABLE
  nx00_audit_log,
  nx00_calendar_event,
  nx00_bulletin,
  nx00_user_warehouse,
  nx00_user_role,
  nx00_role_view,
  nx00_user,
  nx00_role,
  nx00_part_relation,
  nx00_part,
  nx00_brand_code_rule,
  nx00_location,
  nx00_partner,
  nx00_warehouse,
  nx00_part_group,
  nx00_car_brand,
  nx00_part_brand,
  nx00_country,
  nx00_currency,
  nx99_subscription_item,
  nx99_subscription,
  nx99_tenant
RESTART IDENTITY CASCADE;
```

若 DB 仍為舊表名 `nx00_brand_code_role`，該行改為舊名；**migration 套用後**表名為 `nx00_brand_code_rule`。

### Step 2：本機 migration dev

```bash
cd packages/db-core
pnpm exec prisma migrate dev --name MIG002-nx00-schema-refactor
```

審閱產出之 `migration.sql` 後再套用到 Railway。

### Step 3：Railway migrate deploy

```bash
# DATABASE_URL 指向 Railway
pnpm exec prisma migrate deploy
```

### Step 4：重新 seed

```bash
pnpm exec prisma db seed
```

### Step 5：DBeaver 驗收查詢

（租戶、同料號雙產地、BOS 雙規則、`nx00_user_warehouse.tenant_id`、`nx99_subscription.currency_id` 等——詳見原計劃 SQL。）

### Phase 3 驗收條件

- [ ] `nx00_brand_code_rule` 存在，舊 `nx00_brand_code_role` 不存在
- [ ] 三租戶 DEV-INNOVA／DEMO-LITE／DEMO-PLUS
- [ ] BOS 兩筆規則、同料號雙產地
- [ ] `prisma migrate status`：2 migrations applied，無 drift

---

## 銜接本 repo 其他文件

繼續 [11-railway-db-and-tenant-prep.md](./11-railway-db-and-tenant-prep.md) 的 Railway／雲端整備前，**須先完成本計劃 Phase 1～3**（含 MIG002 與重 seed）。
