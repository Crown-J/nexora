-- packages/db-core/prisma/migrations/20260425100000_phase0_so_data_model/migration.sql
-- ============================================================================
-- Migration: phase0_so_data_model
-- 建立日期：2026-04-25
-- 任務：TASK-WP-PHASE0-SCHEMA-IMPL
-- 對應 spec：docs/nx04/spec/impl/d3-impl_so-schema.md + docs/nx04/spec/impl/d3-trigger.md
--
-- 目的：
--   實現 Phase 0 D3「SO data model」5 條意圖規格：
--     3.1 銷貨明細補貨來源（4 種 type + 多欄 FK 派）
--     3.2 雙帳追蹤（升級既有 reservedQty/availableQty 為 trigger 維護）
--     3.3 反查能力（新 index）
--     3.4 SO→PL→Parcel→DN 1:N（既有 schema 已支援，無需動）
--     3.5 明細狀態雙段（transfer_status + fulfill_status，舊 itemStatus deprecated 過渡）
--
-- 內容（10 段）：
--   1. nx04_co 的 sequence + ID generator
--   2. CREATE TABLE nx04_co + indexes + FKs
--   3. ALTER TABLE 加新欄位（nx04_so_item / nx02_ti_item / nx03_st_item）
--   4. CREATE INDEX（5 個 nx04_so_item + 2 個 *_item source 反向）
--   5. AddForeignKey（nx04_so_item.co_id, *_item.source_so_item_id）
--   6. CHECK constraints（合法 enum 值組合）
--   7. helper functions（apply_reserved_delta / nx03_set_trigger_session）
--   8. RECALCULATE reserved_qty（trigger 啟用前一次性）
--   9. CREATE TRIGGER × 4（reserved sync / 防寫 / itemStatus 雙寫 / source_type 防寫）
--  10. 預設 nexora.phase0_strict 為 false（dev 模式）
--
-- 風險評估：
--   - HIGH：第 8 段 RECALCULATE 會修正既有 application-layer reservedQty 計算 bug。
--           dev 機跑完後須產出「修正前 vs 修正後」差異報表給 Crown + Alex（D3 v1
--           review §Q3 的拍板）。Prod 上線前另起決策議題。
--   - MED ：第 3 段 NOT NULL 新欄位（source_so_item_id）假設 dev 機 reset 過，
--           nx02_ti_item / nx03_st_item 為空。Prod 環境的 backfill 另寫 migration。
--   - LOW ：第 9 段 trigger 用 advisory lock 保 race，跟 translator 共用同一 lock key。
--
-- 追蹤：
--   - 須補 nx04_co 進 docs/_shared/reference/nx-table.csv（Phase 0 結尾 Alex 處理）
-- ============================================================================

-- ============================================================================
-- 1. nx04_co 的 sequence + ID generator
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx04_co_id START 1;

CREATE OR REPLACE FUNCTION gen_nx04_co_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04COHD' || LPAD(nextval('seq_nx04_co_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx04_co
-- ============================================================================

CREATE TABLE "nx04_co" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_co_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "doc_no" VARCHAR(20) NOT NULL,
    "co_date" DATE NOT NULL,
    "customer_id" VARCHAR(15) NOT NULL,
    "part_id" VARCHAR(15) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "expected_fulfill_date" DATE,
    "status" VARCHAR(1) NOT NULL DEFAULT 'P',
    "source_so_item_id" VARCHAR(15) NOT NULL,
    "remark" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx04_co_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx04_co_doc_no_key"               ON "nx04_co"("doc_no");
CREATE INDEX "nx04_co_tenant_id_customer_id_idx"        ON "nx04_co"("tenant_id", "customer_id");
CREATE INDEX "nx04_co_tenant_id_status_idx"             ON "nx04_co"("tenant_id", "status");
CREATE INDEX "nx04_co_tenant_id_source_so_item_id_idx"  ON "nx04_co"("tenant_id", "source_so_item_id");

ALTER TABLE "nx04_co" ADD CONSTRAINT "nx04_co_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx04_co" ADD CONSTRAINT "nx04_co_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx04_co" ADD CONSTRAINT "nx04_co_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx04_co" ADD CONSTRAINT "nx04_co_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "nx01_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- nx04_co.source_so_item_id FK 在第 5 段加（必須先建 nx04_so_item 新欄）

-- ============================================================================
-- 3. ALTER TABLE 加新欄位
--    新欄位都先用 DEFAULT，避免既有資料炸鍋；NOT NULL 同時施加。
-- ============================================================================

-- nx04_so_item: 加 4 欄
ALTER TABLE "nx04_so_item"
    ADD COLUMN "transfer_source_type" VARCHAR(1)  NOT NULL DEFAULT 'S',
    ADD COLUMN "transfer_status"      VARCHAR(1)  NOT NULL DEFAULT 'C',
    ADD COLUMN "fulfill_status"       VARCHAR(2)  NOT NULL DEFAULT 'W',
    ADD COLUMN "co_id"                VARCHAR(15);

-- nx02_ti_item / nx03_st_item: 加 source_so_item_id（nullable + 無 default）
-- 採 C 方案（兩階段 ALTER）：此 migration 加 nullable 欄位，SET NOT NULL 拆到
-- 配套 tighten migration（20260425100100_phase0_so_data_model_tighten）。
-- 設計理由：避免在 DB 留下 sentinel 假值（如 '_PENDING_BACKFILL_'），任何時刻
-- DB 都不會有 caller 讀到的假字串。Prod 上線時可在此 migration 跟 tighten
-- migration 之間插入 backfill SQL 推導真實 source_so_item_id，再走 tighten。
ALTER TABLE "nx02_ti_item"
    ADD COLUMN "source_so_item_id" VARCHAR(15);
ALTER TABLE "nx03_st_item"
    ADD COLUMN "source_so_item_id" VARCHAR(15);

-- ============================================================================
-- 4. CREATE INDEX
-- ============================================================================

CREATE INDEX "nx04_so_item_committed_lookup_idx" ON "nx04_so_item"("part_id", "warehouse_id");
CREATE INDEX "nx04_so_item_fulfill_status_idx"   ON "nx04_so_item"("fulfill_status");
CREATE INDEX "nx04_so_item_xfer_st_idx"          ON "nx04_so_item"("transfer_source_type", "st_id");
CREATE INDEX "nx04_so_item_xfer_ti_idx"          ON "nx04_so_item"("transfer_source_type", "ti_id");
CREATE INDEX "nx04_so_item_xfer_co_idx"          ON "nx04_so_item"("transfer_source_type", "co_id");

CREATE INDEX "nx02_ti_item_source_so_item_idx"   ON "nx02_ti_item"("source_so_item_id");
CREATE INDEX "nx03_st_item_source_so_item_idx"   ON "nx03_st_item"("source_so_item_id");

-- ============================================================================
-- 5. AddForeignKey
-- ============================================================================

ALTER TABLE "nx04_so_item" ADD CONSTRAINT "nx04_so_item_co_id_fkey"
    FOREIGN KEY ("co_id") REFERENCES "nx04_co"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx04_co" ADD CONSTRAINT "nx04_co_source_so_item_id_fkey"
    FOREIGN KEY ("source_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx02_ti_item" ADD CONSTRAINT "nx02_ti_item_source_so_item_id_fkey"
    FOREIGN KEY ("source_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_source_so_item_id_fkey"
    FOREIGN KEY ("source_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 6. CHECK constraints（合法 enum 值組合）
-- ============================================================================

ALTER TABLE "nx04_so_item"
    ADD CONSTRAINT "chk_xfer_source_type"
    CHECK ("transfer_source_type" IN ('S', 'T', 'G', 'B'));

ALTER TABLE "nx04_so_item"
    ADD CONSTRAINT "chk_transfer_status"
    CHECK ("transfer_status" IN ('P', 'I', 'C'));

ALTER TABLE "nx04_so_item"
    ADD CONSTRAINT "chk_fulfill_status"
    CHECK ("fulfill_status" IN ('W', 'PK', 'PL', 'D', 'F'));

-- 狀態組合合法性：self 來源 transfer_status 必為 C；其他來源若 transfer != C 則 fulfill 必須 W
ALTER TABLE "nx04_so_item"
    ADD CONSTRAINT "chk_status_combination"
    CHECK (
        ("transfer_source_type" = 'S' AND "transfer_status" = 'C')
        OR
        ("transfer_source_type" IN ('T', 'G', 'B')
         AND ("fulfill_status" = 'W' OR "transfer_status" = 'C'))
    );

-- ============================================================================
-- 7. Helper functions
-- ============================================================================

-- 標記「我是 trigger 寫入」的 session 變數，給 trigger 2（防寫）放行用
CREATE OR REPLACE FUNCTION nx03_set_trigger_session() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('nexora.is_internal_trigger', 'true', true);
END;
$$ LANGUAGE plpgsql;

-- 統一執行 reserved_qty / available_qty 的 delta 更新；含 advisory lock 與 INSERT
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

    UPDATE "nx03_stock_balance"
    SET "reserved_qty"   = "reserved_qty" + p_delta,
        "available_qty"  = "on_hand_qty" - ("reserved_qty" + p_delta),
        "last_move_at"   = NOW(),
        "updated_at"     = NOW()
    WHERE "tenant_id"   = p_tenant_id
      AND "part_id"     = p_part_id
      AND "warehouse_id" = p_warehouse_id;

    -- stock_balance 列不存在 → INSERT 一筆
    IF NOT FOUND THEN
        INSERT INTO "nx03_stock_balance" (
            "id", "tenant_id", "part_id", "warehouse_id",
            "on_hand_qty", "reserved_qty", "available_qty",
            "created_at", "created_by", "updated_at", "updated_by",
            "last_move_at", "is_active"
        ) VALUES (
            gen_nx03_stock_balance_id(), p_tenant_id, p_part_id, p_warehouse_id,
            0, p_delta, -p_delta,
            NOW(), 'NX01USER0000001', NOW(), 'NX01USER0000001',
            NOW(), TRUE
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. RECALCULATE reserved_qty（trigger 啟用前一次性）
--    ⚠️ HIGH IMPACT：此段會修正既有應用層維護的 reserved_qty。dev 跑完後須產出
--    「修正前 vs 修正後」差異報表（D3-impl spec §5 + Q3 拍板）。
-- ============================================================================

-- Step 8.1：把所有 fulfill_status != 'F' 的 so_item 的 qty 加總，UPDATE 已存在的 stock_balance 列
WITH recalc AS (
    SELECT
        so."tenant_id" AS tenant_id,
        soi."part_id"  AS part_id,
        soi."warehouse_id" AS warehouse_id,
        COALESCE(SUM(soi."qty"), 0) AS new_reserved
    FROM "nx04_so_item" soi
    JOIN "nx04_so" so ON so."id" = soi."so_id"
    WHERE soi."fulfill_status" != 'F'
    GROUP BY so."tenant_id", soi."part_id", soi."warehouse_id"
)
UPDATE "nx03_stock_balance" sb
SET "reserved_qty"  = r.new_reserved,
    "available_qty" = sb."on_hand_qty" - r.new_reserved,
    "last_move_at"  = NOW(),
    "updated_at"    = NOW()
FROM recalc r
WHERE sb."tenant_id"    = r.tenant_id
  AND sb."part_id"      = r.part_id
  AND sb."warehouse_id" = r.warehouse_id;

-- Step 8.2：so_item 有對應 (part, warehouse) 但 stock_balance 還沒列的 → INSERT
INSERT INTO "nx03_stock_balance" (
    "id", "tenant_id", "part_id", "warehouse_id",
    "on_hand_qty", "reserved_qty", "available_qty",
    "created_at", "created_by", "updated_at", "updated_by",
    "last_move_at", "is_active"
)
SELECT
    gen_nx03_stock_balance_id(), r.tenant_id, r.part_id, r.warehouse_id,
    0, r.new_reserved, -r.new_reserved,
    NOW(), 'NX01USER0000001', NOW(), 'NX01USER0000001',
    NOW(), TRUE
FROM (
    SELECT
        so."tenant_id" AS tenant_id,
        soi."part_id"  AS part_id,
        soi."warehouse_id" AS warehouse_id,
        SUM(soi."qty") AS new_reserved
    FROM "nx04_so_item" soi
    JOIN "nx04_so" so ON so."id" = soi."so_id"
    WHERE soi."fulfill_status" != 'F'
    GROUP BY so."tenant_id", soi."part_id", soi."warehouse_id"
) r
WHERE NOT EXISTS (
    SELECT 1 FROM "nx03_stock_balance" sb
    WHERE sb."tenant_id"    = r.tenant_id
      AND sb."part_id"      = r.part_id
      AND sb."warehouse_id" = r.warehouse_id
);

-- Step 8.3：reset reserved_qty=0 for stock_balance rows that have NO matching active so_item
-- （既有應用層可能漏減 reserved_qty 的 SO 已出貨完成資料 → 修正回 0）
UPDATE "nx03_stock_balance" sb
SET "reserved_qty"  = 0,
    "available_qty" = sb."on_hand_qty",
    "last_move_at"  = NOW(),
    "updated_at"    = NOW()
WHERE sb."reserved_qty" > 0
  AND NOT EXISTS (
      SELECT 1 FROM "nx04_so_item" soi
      JOIN "nx04_so" so ON so."id" = soi."so_id"
      WHERE so."tenant_id"    = sb."tenant_id"
        AND soi."part_id"     = sb."part_id"
        AND soi."warehouse_id" = sb."warehouse_id"
        AND soi."fulfill_status" != 'F'
  );

-- ============================================================================
-- 9. CREATE TRIGGER × 4
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1: nx04_so_item 變動 → 同步 nx03_stock_balance.reserved_qty
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_nx04_so_item_reserved_qty_sync() RETURNS TRIGGER AS $$
DECLARE
    v_old_tenant_id VARCHAR(15);
    v_new_tenant_id VARCHAR(15);
BEGIN
    PERFORM nx03_set_trigger_session();

    -- 從 so 抓 tenant_id（line item 不直接持有）
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT "tenant_id" INTO v_old_tenant_id FROM "nx04_so" WHERE "id" = OLD."so_id";
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT "tenant_id" INTO v_new_tenant_id FROM "nx04_so" WHERE "id" = NEW."so_id";
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW."fulfill_status" != 'F' THEN
            PERFORM apply_reserved_delta(v_new_tenant_id, NEW."part_id", NEW."warehouse_id", NEW."qty");
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Case 1: warehouse 搬移（rare 但要支援）
        IF NEW."warehouse_id" IS DISTINCT FROM OLD."warehouse_id"
           OR NEW."part_id"   IS DISTINCT FROM OLD."part_id"
           OR v_new_tenant_id IS DISTINCT FROM v_old_tenant_id THEN
            IF OLD."fulfill_status" != 'F' THEN
                PERFORM apply_reserved_delta(v_old_tenant_id, OLD."part_id", OLD."warehouse_id", -OLD."qty");
            END IF;
            IF NEW."fulfill_status" != 'F' THEN
                PERFORM apply_reserved_delta(v_new_tenant_id, NEW."part_id", NEW."warehouse_id", NEW."qty");
            END IF;

        -- Case 2: fulfill 從非 F 進 F（出貨完成）
        ELSIF OLD."fulfill_status" != 'F' AND NEW."fulfill_status" = 'F' THEN
            PERFORM apply_reserved_delta(v_new_tenant_id, NEW."part_id", NEW."warehouse_id", -OLD."qty");

        -- Case 3: fulfill 從 F 退回非 F（理論不應發生，防呆）
        ELSIF OLD."fulfill_status" = 'F' AND NEW."fulfill_status" != 'F' THEN
            PERFORM apply_reserved_delta(v_new_tenant_id, NEW."part_id", NEW."warehouse_id", NEW."qty");

        -- Case 4: 純 qty 變動（fulfill 仍非 F）
        ELSIF OLD."fulfill_status" != 'F' AND NEW."qty" IS DISTINCT FROM OLD."qty" THEN
            PERFORM apply_reserved_delta(v_new_tenant_id, NEW."part_id", NEW."warehouse_id", NEW."qty" - OLD."qty");
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD."fulfill_status" != 'F' THEN
            PERFORM apply_reserved_delta(v_old_tenant_id, OLD."part_id", OLD."warehouse_id", -OLD."qty");
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx04_so_item_reserved_sync
    AFTER INSERT OR UPDATE OR DELETE ON "nx04_so_item"
    FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_item_reserved_qty_sync();

-- ----------------------------------------------------------------------------
-- Trigger 2: nx03_stock_balance 防應用層直寫 reserved_qty / available_qty
--   dev 模式：phase0_strict=false → RAISE NOTICE
--   prod 模式：phase0_strict=true → RAISE EXCEPTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_nx03_stock_balance_protect_committed() RETURNS TRIGGER AS $$
DECLARE
    v_is_trigger TEXT;
    v_is_strict  TEXT;
BEGIN
    v_is_trigger := current_setting('nexora.is_internal_trigger', true);
    v_is_strict  := current_setting('nexora.phase0_strict', true);

    IF (NEW."reserved_qty"  IS DISTINCT FROM OLD."reserved_qty"
        OR NEW."available_qty" IS DISTINCT FROM OLD."available_qty")
       AND COALESCE(v_is_trigger, '') != 'true' THEN

        IF COALESCE(v_is_strict, '') = 'true' THEN
            RAISE EXCEPTION 'reserved_qty / available_qty must be maintained by trigger only (got direct UPDATE on row %/%/%).',
                NEW."tenant_id", NEW."part_id", NEW."warehouse_id";
        ELSE
            RAISE NOTICE 'Application-layer write to reserved_qty / available_qty detected (table=nx03_stock_balance, row=%/%/%, old reserved=%, new=%). Will become EXCEPTION when phase0_strict=true.',
                NEW."tenant_id", NEW."part_id", NEW."warehouse_id",
                OLD."reserved_qty", NEW."reserved_qty";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx03_stock_balance_protect
    BEFORE UPDATE ON "nx03_stock_balance"
    FOR EACH ROW EXECUTE FUNCTION trg_nx03_stock_balance_protect_committed();

-- ----------------------------------------------------------------------------
-- Trigger 3: nx04_so_item.item_status 雙寫（過渡用，Phase 3 收尾移除）
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_nx04_so_item_dual_write_status() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW."transfer_status" IS DISTINCT FROM OLD."transfer_status"
       OR NEW."fulfill_status"  IS DISTINCT FROM OLD."fulfill_status" THEN

        NEW."item_status" := CASE
            WHEN NEW."transfer_status" = 'P' AND NEW."fulfill_status" = 'W' THEN 'WA'
            WHEN NEW."transfer_status" = 'I' AND NEW."fulfill_status" = 'W' THEN
                CASE NEW."transfer_source_type"
                    WHEN 'T' THEN 'TA'
                    WHEN 'G' THEN 'TG'
                    ELSE 'WA'
                END
            WHEN NEW."transfer_status" = 'C' AND NEW."fulfill_status" = 'W' THEN 'WP'
            WHEN NEW."fulfill_status" = 'PK' THEN 'WB'
            WHEN NEW."fulfill_status" = 'PL' THEN 'WS'
            WHEN NEW."fulfill_status" = 'D'  THEN 'ID'
            WHEN NEW."fulfill_status" = 'F'  THEN 'C'
            ELSE NEW."item_status"
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx04_so_item_dual_write
    BEFORE INSERT OR UPDATE ON "nx04_so_item"
    FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_item_dual_write_status();

-- ----------------------------------------------------------------------------
-- Trigger 4: nx04_so.source_type deprecated 防寫
--   dev 模式：應用層仍然能寫，但會 NOTICE warn
--   prod 模式：RAISE EXCEPTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_nx04_so_protect_source_type() RETURNS TRIGGER AS $$
DECLARE
    v_is_strict TEXT;
BEGIN
    v_is_strict := current_setting('nexora.phase0_strict', true);

    IF TG_OP = 'INSERT' THEN
        -- 強制設為 'S'（既有 default），讓 header 此欄不再具語意
        NEW."source_type" := 'S';

    ELSIF TG_OP = 'UPDATE' AND NEW."source_type" IS DISTINCT FROM OLD."source_type" THEN
        IF COALESCE(v_is_strict, '') = 'true' THEN
            RAISE EXCEPTION 'nx04_so.source_type is deprecated since Phase 0 D3; per-lineitem transfer_source_type instead.';
        ELSE
            RAISE NOTICE 'Write to deprecated nx04_so.source_type ignored (so_id=%).', NEW."id";
            NEW."source_type" := OLD."source_type";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nx04_so_protect_source_type_t
    BEFORE INSERT OR UPDATE ON "nx04_so"
    FOR EACH ROW EXECUTE FUNCTION trg_nx04_so_protect_source_type();

-- ============================================================================
-- 10. 設定 phase0_strict 預設為 false（dev 模式）
--     prod 上線時改為 true：ALTER DATABASE nexora SET nexora.phase0_strict = 'true';
-- ============================================================================

-- 註：DB-level 的 SET 不能在 migration 內跑（需要 ALTER DATABASE 權限），
-- 改在 application connection 開始時設定 SESSION 變數，或由 DBA 在 prod 拍板時跑。
-- 這裡只記在 comment 提醒。

COMMENT ON COLUMN "nx04_so"."source_type" IS
    '@deprecated Phase 0 D3：改由 line item 的 transfer_source_type 決定；header 此欄無語意。trigger 4 防寫入。';
COMMENT ON COLUMN "nx04_so_item"."item_status" IS
    '@deprecated Phase 0 D3：改用 (transfer_status, fulfill_status) 雙段。trigger 3 仍會雙寫保留既有讀路徑相容。';

-- ============================================================================
-- 結束
-- ============================================================================
