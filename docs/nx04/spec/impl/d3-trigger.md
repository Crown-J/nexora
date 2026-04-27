<!-- docs/nx04/spec/impl/d3-trigger.md -->
# D3 — 雙帳 trigger 詳細實作

> 文件類型：實作 spec（trigger 部分，從 d3-impl_so-schema 拆出獨立檔）
> 撰寫者：Hank
> 日期：2026-04-25
> 對應 spec：[`./d3-impl_so-schema.md`](./d3-impl_so-schema.md)
> 狀態：待 Alex review → 拍板後才寫進 migration.sql

---

## 0. 文件性質

把意圖規格 3.2「committed_stock 由 trigger 自動維護，應用層不直接寫」+ 3.5「itemStatus 雙寫」+ 4.3「deprecated 欄位防寫」三個 trigger 需求各自詳列實作。

PostgreSQL 14+ 語法（NEXORA dev/prod 都用 PostgreSQL 16）。

---

## 1. Trigger 1：`reserved_qty` 自動維護（核心）

**目的**：意圖規格 3.2 — committed stock 由系統自動算，應用層不直接寫。

### 1.1 行為定義

當 `nx04_so_item` 發生 INSERT / UPDATE / DELETE 時，自動同步到 `nx03_stock_balance.reserved_qty`。`available_qty = on_hand_qty − reserved_qty` 用 generated column 自動算，不需 trigger 維護。

### 1.2 觸發點

| 事件 | 對 reserved_qty 的影響 |
|---|---|
| INSERT 新 so_item（fulfill_status != 'F'） | reserved_qty += NEW.qty |
| UPDATE so_item.qty（fulfill_status != 'F'） | reserved_qty += (NEW.qty − OLD.qty) |
| UPDATE so_item.fulfill_status: 任意 → 'F'（已送達） | reserved_qty −= OLD.qty |
| UPDATE so_item.fulfill_status: 'F' → 任意（理論上不該發生） | reserved_qty += NEW.qty |
| UPDATE so_item.warehouse_id（搬倉） | OLD warehouse 的 reserved -= OLD.qty；NEW warehouse 的 reserved += NEW.qty |
| DELETE so_item（fulfill_status != 'F'） | reserved_qty −= OLD.qty |

### 1.3 SQL 草案

```sql
-- 標記「我是 trigger 寫入」的 session 變數，給 trigger 2（防寫）放行用
CREATE OR REPLACE FUNCTION nx03_set_trigger_session() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('nexora.is_internal_trigger', 'true', true);  -- LOCAL to txn
END;
$$ LANGUAGE plpgsql;

-- 主 trigger function
CREATE OR REPLACE FUNCTION trg_nx04_so_item_reserved_qty_sync() RETURNS TRIGGER AS $$
DECLARE
  v_delta DECIMAL(14,4) := 0;
  v_old_warehouse VARCHAR(15);
  v_new_warehouse VARCHAR(15);
BEGIN
  PERFORM nx03_set_trigger_session();

  IF TG_OP = 'INSERT' THEN
    -- 新單除非 fulfill 已 F，都加入 reserved
    IF NEW.fulfill_status != 'F' THEN
      v_delta := NEW.qty;
      v_new_warehouse := NEW.warehouse_id;
      PERFORM apply_reserved_delta(NEW.tenant_id, NEW.part_id, v_new_warehouse, v_delta);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Case 1: warehouse 搬移
    IF NEW.warehouse_id != OLD.warehouse_id THEN
      IF OLD.fulfill_status != 'F' THEN
        PERFORM apply_reserved_delta(OLD.tenant_id, OLD.part_id, OLD.warehouse_id, -OLD.qty);
      END IF;
      IF NEW.fulfill_status != 'F' THEN
        PERFORM apply_reserved_delta(NEW.tenant_id, NEW.part_id, NEW.warehouse_id, NEW.qty);
      END IF;

    -- Case 2: fulfill 從非 F 進 F（出貨完成）
    ELSIF OLD.fulfill_status != 'F' AND NEW.fulfill_status = 'F' THEN
      PERFORM apply_reserved_delta(NEW.tenant_id, NEW.part_id, NEW.warehouse_id, -OLD.qty);

    -- Case 3: fulfill 從 F 退回非 F（理論不應發生，防呆處理）
    ELSIF OLD.fulfill_status = 'F' AND NEW.fulfill_status != 'F' THEN
      PERFORM apply_reserved_delta(NEW.tenant_id, NEW.part_id, NEW.warehouse_id, NEW.qty);

    -- Case 4: qty 變動（其他欄位變動但 fulfill 仍非 F）
    ELSIF OLD.fulfill_status != 'F' AND NEW.qty != OLD.qty THEN
      PERFORM apply_reserved_delta(NEW.tenant_id, NEW.part_id, NEW.warehouse_id, NEW.qty - OLD.qty);
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.fulfill_status != 'F' THEN
      PERFORM apply_reserved_delta(OLD.tenant_id, OLD.part_id, OLD.warehouse_id, -OLD.qty);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 實際 update 邏輯（單獨抽出方便 reuse）
CREATE OR REPLACE FUNCTION apply_reserved_delta(
  p_tenant_id    VARCHAR(15),
  p_part_id      VARCHAR(15),
  p_warehouse_id VARCHAR(15),
  p_delta        DECIMAL(14,4)
) RETURNS VOID AS $$
BEGIN
  -- 跟 translator 用同一個 advisory lock key，保證跟 SO INSERT 鎖同一把
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id || ':' || p_part_id || ':' || p_warehouse_id, 0)
  );

  UPDATE nx03_stock_balance
  SET reserved_qty = reserved_qty + p_delta,
      available_qty = on_hand_qty - (reserved_qty + p_delta),
      last_move_at = NOW(),
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND part_id = p_part_id
    AND warehouse_id = p_warehouse_id;

  -- stock_balance 列不存在 → INSERT 一筆（first-time committed）
  IF NOT FOUND THEN
    INSERT INTO nx03_stock_balance (
      id, tenant_id, part_id, warehouse_id,
      on_hand_qty, reserved_qty, available_qty,
      created_at, created_by, updated_at, updated_by, last_move_at, is_active
    ) VALUES (
      gen_nx03_stock_balance_id(), p_tenant_id, p_part_id, p_warehouse_id,
      0, p_delta, -p_delta,
      NOW(), 'NX01USER0000001', NOW(), 'NX01USER0000001', NOW(), TRUE
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 綁 trigger
CREATE TRIGGER trg_nx04_so_item_reserved_sync
  AFTER INSERT OR UPDATE OR DELETE ON nx04_so_item
  FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_item_reserved_qty_sync();
```

### 1.4 並發行為

- Trigger 用 advisory lock 同 key（`hashtextextended('${tenantId}:${partId}:${warehouseId}', 0)`），跟 Translator 主動取的 lock 是**同一把** — 兩條路徑不會 race
- Translator 在 transaction 開始時主動取 lock；trigger 在 update 時若 lock 已被 holder 持有，會直接 acquire（同一 transaction 不阻塞）
- 兩個並發 transaction 改同一 (part, warehouse) 列：第二個會等第一個 commit 後才取得 lock → serial 但不 deadlock

### 1.5 例外處理

| 例外 | 處理 |
|---|---|
| stock_balance 列不存在 | 自動 INSERT（first-time committed）|
| reserved_qty 計算後變負（理論不可能但防呆） | 不擋（業務上允許 over-fulfill 的情境，但 raise WARNING 寫 log）|
| trigger 內 RAISE EXCEPTION | 整個 transaction rollback，包含上層 SO INSERT |

---

## 2. Trigger 2：`reserved_qty` / `available_qty` 防應用層直寫

**目的**：意圖規格 3.2「應用層不該直接寫會計庫存」。

### 2.1 行為定義

對 `nx03_stock_balance` 的任何 UPDATE，若 reserved_qty 或 available_qty 被修改、且不是 trigger 1 來源（`nexora.is_internal_trigger != 'true'`）→ RAISE EXCEPTION。

dev 期間先 RAISE NOTICE（log only），不擋 — 等 6 個 sprint 內所有應用層程式都改完後（CLAUDE.md 鐵律：先後端 API 改完才動前端），prod 才 RAISE EXCEPTION。

### 2.2 SQL 草案

```sql
CREATE OR REPLACE FUNCTION trg_nx03_stock_balance_protect_committed() RETURNS TRIGGER AS $$
DECLARE
  v_is_trigger TEXT;
BEGIN
  v_is_trigger := current_setting('nexora.is_internal_trigger', true);

  -- reserved_qty 或 available_qty 被改動且非 trigger 來源
  IF (NEW.reserved_qty IS DISTINCT FROM OLD.reserved_qty
      OR NEW.available_qty IS DISTINCT FROM OLD.available_qty)
     AND COALESCE(v_is_trigger, '') != 'true' THEN

    -- dev 階段 (NEXORA_PHASE0_STRICT 環境變數未設) → RAISE NOTICE
    IF current_setting('nexora.phase0_strict', true) != 'true' THEN
      RAISE NOTICE 'Application-layer write to reserved_qty / available_qty detected (table=nx03_stock_balance, row=%/%/%, old=%, new=%). Will become EXCEPTION when phase0_strict=true.',
        NEW.tenant_id, NEW.part_id, NEW.warehouse_id, OLD.reserved_qty, NEW.reserved_qty;
    ELSE
      RAISE EXCEPTION 'reserved_qty / available_qty must be maintained by trigger only (got direct UPDATE on row %/%/%).',
        NEW.tenant_id, NEW.part_id, NEW.warehouse_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx03_stock_balance_protect
  BEFORE UPDATE ON nx03_stock_balance
  FOR EACH ROW EXECUTE FUNCTION trg_nx03_stock_balance_protect_committed();
```

### 2.3 啟用切換策略

```
Phase 0：dev 機 NOTICE only（log 但不擋）
Phase 1：dev 機切到 STRICT（RAISE EXCEPTION）
Phase 2 結束：所有應用層 reserved_qty 寫入路徑都改光
Phase 3：prod 切到 STRICT
```

切換靠 `ALTER DATABASE nexora SET nexora.phase0_strict = 'true';`，不需重啟 PostgreSQL。

---

## 3. Trigger 3：`item_status` 雙寫（過渡用）

**目的**：意圖規格 3.5 雙段狀態取代既有 11 值 itemStatus，但既有讀路徑（庫存中心 5 頁等）還沒改完。trigger 在 (transfer_status, fulfill_status) 變動時自動同步寫回 itemStatus，讓既有讀仍能用。

### 3.1 行為定義

| 新 (transfer_status, fulfill_status) | 舊 itemStatus |
|---|---|
| (P, W) — 待補/等貨 | WA（待調撥）— 偏向這個泛指「等補貨」 |
| (I, W) — 補貨中/等貨 | TA（調撥中）or TG（調貨中），按 transfer_source_type 區分 |
| (C, W) — 補完/等貨 | WP（待撿貨）|
| (C, PK) — 補完/撿中 | WB（待包貨）|
| (C, PL) — 補完/包中 | WS（待寄貨）or WT（待取貨），按 nx03_pl.pl_type 區分 |
| (C, D) — 補完/配送中 | ID |
| (C, F) — 補完/已送達 | C |

### 3.2 SQL 草案

```sql
CREATE OR REPLACE FUNCTION trg_nx04_so_item_dual_write_status() RETURNS TRIGGER AS $$
BEGIN
  -- 只在 INSERT 或 雙段狀態變動時 寫回 item_status
  IF TG_OP = 'INSERT'
     OR NEW.transfer_status IS DISTINCT FROM OLD.transfer_status
     OR NEW.fulfill_status IS DISTINCT FROM OLD.fulfill_status THEN

    NEW.item_status := CASE
      WHEN NEW.transfer_status = 'P' AND NEW.fulfill_status = 'W' THEN 'WA'
      WHEN NEW.transfer_status = 'I' AND NEW.fulfill_status = 'W' THEN
        CASE NEW.transfer_source_type WHEN 'T' THEN 'TA' WHEN 'G' THEN 'TG' ELSE 'WA' END
      WHEN NEW.transfer_status = 'C' AND NEW.fulfill_status = 'W' THEN 'WP'
      WHEN NEW.fulfill_status = 'PK' THEN 'WB'
      WHEN NEW.fulfill_status = 'PL' THEN 'WS'  -- 寄貨 OR 取貨需另查 pl_type，這裡先預設 WS
      WHEN NEW.fulfill_status = 'D'  THEN 'ID'
      WHEN NEW.fulfill_status = 'F'  THEN 'C'
      ELSE NEW.item_status  -- fallback 不變
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx04_so_item_dual_write
  BEFORE INSERT OR UPDATE ON nx04_so_item
  FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_item_dual_write_status();
```

### 3.3 移除時機

Phase 3 收尾時，把所有讀 `item_status` 的應用層程式改光後，這個 trigger 跟 `item_status` 欄位一起刪除。預期 Phase 3 結束時做。

---

## 4. Trigger 4：deprecated 欄位防寫（`nx04_so.source_type`）

**目的**：意圖規格 4.3「deprecated 欄位用 trigger 防寫不刪欄位」。

### 4.1 SQL 草案

```sql
CREATE OR REPLACE FUNCTION trg_nx04_so_protect_source_type() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 新 SO 預設 source_type = 'S'，但實際 type 看 line item，header 此欄不再具語意
    -- 強制設為 NULL（讓讀者注意）
    NEW.source_type := 'S';

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.source_type IS DISTINCT FROM OLD.source_type THEN
      IF current_setting('nexora.phase0_strict', true) = 'true' THEN
        RAISE EXCEPTION 'nx04_so.source_type is deprecated since v1.1; per-lineitem transfer_source_type instead.';
      ELSE
        RAISE NOTICE 'Write to deprecated nx04_so.source_type ignored (so_id=%).', NEW.id;
        NEW.source_type := OLD.source_type;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx04_so_protect_source_type_t
  BEFORE INSERT OR UPDATE ON nx04_so
  FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_protect_source_type();
```

---

## 5. Trigger 安裝順序

migration.sql 內必須按順序：

```
Step 1. 建 helper functions（apply_reserved_delta, nx03_set_trigger_session, gen_nx04_co_id）
Step 2. 一次 RECALCULATE：清空 reserved_qty，按所有 fulfill_status != 'F' 的 so_item 重算（見 §6）
Step 3. 啟用 trigger 1（reserved_qty sync）
Step 4. 啟用 trigger 2（防應用層直寫）— dev mode = NOTICE
Step 5. 啟用 trigger 3（item_status 雙寫）
Step 6. 啟用 trigger 4（source_type 防寫）— dev mode = NOTICE
Step 7. 設定 ALTER DATABASE 參數：phase0_strict = false（dev 預設）
```

---

## 6. RECALCULATE reserved_qty（migration 內一次性）

```sql
-- 在 trigger 1 啟用前跑一次，把所有 fulfill_status != 'F' 的承諾量重算
WITH recalc AS (
  SELECT
    tenant_id, part_id, warehouse_id,
    COALESCE(SUM(qty), 0) AS new_reserved
  FROM nx04_so_item
  WHERE fulfill_status != 'F'
  GROUP BY tenant_id, part_id, warehouse_id
)
UPDATE nx03_stock_balance sb
SET reserved_qty = COALESCE(r.new_reserved, 0),
    available_qty = sb.on_hand_qty - COALESCE(r.new_reserved, 0),
    last_move_at = NOW()
FROM recalc r
WHERE sb.tenant_id = r.tenant_id
  AND sb.part_id = r.part_id
  AND sb.warehouse_id = r.warehouse_id;

-- 補：so_item 有對應 part/warehouse 但 stock_balance 還沒列的 → INSERT
INSERT INTO nx03_stock_balance (
  id, tenant_id, part_id, warehouse_id,
  on_hand_qty, reserved_qty, available_qty,
  created_at, created_by, updated_at, updated_by, last_move_at, is_active
)
SELECT
  gen_nx03_stock_balance_id(), r.tenant_id, r.part_id, r.warehouse_id,
  0, r.new_reserved, -r.new_reserved,
  NOW(), 'NX01USER0000001', NOW(), 'NX01USER0000001', NOW(), TRUE
FROM (
  SELECT DISTINCT tenant_id, part_id, warehouse_id, SUM(qty) AS new_reserved
  FROM nx04_so_item WHERE fulfill_status != 'F'
  GROUP BY tenant_id, part_id, warehouse_id
) r
WHERE NOT EXISTS (
  SELECT 1 FROM nx03_stock_balance sb
  WHERE sb.tenant_id = r.tenant_id
    AND sb.part_id = r.part_id
    AND sb.warehouse_id = r.warehouse_id
);
```

⚠️ **這個 RECALCULATE 會「修正」所有既有應用層 bug 殘留** — 比對前後值差異，可能揭露既有資料的 reservedQty 算錯。dev 機跑完後請 Crown / Alex 抽樣比對 5~10 筆 (part, warehouse) 的差異是否合理。

---

## 7. 完成定義

- [ ] 4 個 trigger function 寫進 migration.sql
- [ ] RECALCULATE 寫進 migration.sql 並在 trigger 啟用前跑
- [ ] dev 機跑完後 sample 5 筆 (part, warehouse)，verify reserved_qty 跟手算一致
- [ ] 開兩個 transaction 並發 INSERT 同 part 的 SO，verify 沒有 race（committed_qty 應該等於兩筆和）
- [ ] 應用層直寫 reserved_qty → log 出 NOTICE（dev mode 行為符合預期）

---

## 8. 不在這份 spec 範圍

- Translator service 主動取 advisory lock 的呼叫端 → D4 spec
- 既有應用層改寫（移除直接 UPDATE reserved_qty 的程式）→ Phase 1+ 慢慢改
- 監控 / alerting：當 reserved_qty 變動超過 ±10% 時通知 → 後續 ops spec

---

## 9. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版，4 個 trigger + RECALCULATE，待 Alex review |

---

*文件結束*
