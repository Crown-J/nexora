-- packages/db-core/prisma/migrations/20260520100000_nx08_impl_01_m1_doc_level_caches/migration.sql
-- NX08-IMPL-01 Phase 1 M1：3 個 doc-level snapshot Cache 表
-- 對齊：overview v0.1.0 §8.2 + audit-01 §5.2「0 業務模組接點」缺口、plan §3 M1
-- 性質：純新表 × 3、0 既有 ALTER、0 backfill 衝突；Q1=c 拍板 0 writer（後續軌 TASK-NX08-IMPL-02-CACHE 啟動 ETL）

-- ID 生成 function × 3
CREATE OR REPLACE FUNCTION gen_nx08_ap_cache_snapshot_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx08_ap_cache_snapshot;
  RETURN 'NX08APCS' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_nx08_ar_cache_snapshot_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx08_ar_cache_snapshot;
  RETURN 'NX08ARCS' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_nx08_delivery_cache_snapshot_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx08_delivery_cache_snapshot;
  RETURN 'NX08DLCS' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 表 1：Nx08ApCacheSnapshot（per Nx05ApLedger 快照）
CREATE TABLE "nx08_ap_cache_snapshot" (
  "id"              VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx08_ap_cache_snapshot_id(),
  "tenant_id"       VARCHAR(15)  NOT NULL,
  "ap_ledger_id"    VARCHAR(15)  NOT NULL,
  "snapshot_date"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "original_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "paid_amount"     DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "balance_amount"  DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "status_at"       VARCHAR(20)  NOT NULL,
  "overdue_days"    INT          NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nx08_ap_cache_snapshot_tenant_fkey"    FOREIGN KEY ("tenant_id")    REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx08_ap_cache_snapshot_ap_ledger_fkey" FOREIGN KEY ("ap_ledger_id") REFERENCES "nx05_ap_ledger"("id")
);
CREATE INDEX "nx08_ap_cache_snapshot_ap_idx"      ON "nx08_ap_cache_snapshot" ("ap_ledger_id");
CREATE INDEX "nx08_ap_cache_snapshot_tenant_dt_idx" ON "nx08_ap_cache_snapshot" ("tenant_id", "snapshot_date");

COMMENT ON TABLE  "nx08_ap_cache_snapshot" IS 'NX08 AP 帳款逐筆 doc-level snapshot（per Nx05ApLedger、後續 ETL 寫入）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."overdue_days" IS '快照時刻計算的逾期天數（snapshot_date - due_date）。';

-- 表 2：Nx08ArCacheSnapshot（per Nx05ArLedger 快照）
CREATE TABLE "nx08_ar_cache_snapshot" (
  "id"              VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx08_ar_cache_snapshot_id(),
  "tenant_id"       VARCHAR(15)  NOT NULL,
  "ar_ledger_id"    VARCHAR(15)  NOT NULL,
  "snapshot_date"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "original_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "paid_amount"     DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "balance_amount"  DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "status_at"       VARCHAR(20)  NOT NULL,
  "overdue_days"    INT          NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nx08_ar_cache_snapshot_tenant_fkey"    FOREIGN KEY ("tenant_id")    REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx08_ar_cache_snapshot_ar_ledger_fkey" FOREIGN KEY ("ar_ledger_id") REFERENCES "nx05_ar_ledger"("id")
);
CREATE INDEX "nx08_ar_cache_snapshot_ar_idx"      ON "nx08_ar_cache_snapshot" ("ar_ledger_id");
CREATE INDEX "nx08_ar_cache_snapshot_tenant_dt_idx" ON "nx08_ar_cache_snapshot" ("tenant_id", "snapshot_date");

COMMENT ON TABLE  "nx08_ar_cache_snapshot" IS 'NX08 AR 帳款逐筆 doc-level snapshot（per Nx05ArLedger、後續 ETL 寫入）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."overdue_days" IS '快照時刻計算的逾期天數（snapshot_date - due_date）。';

-- 表 3：Nx08DeliveryCacheSnapshot（per Nx06Dn 快照）
CREATE TABLE "nx08_delivery_cache_snapshot" (
  "id"                VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx08_delivery_cache_snapshot_id(),
  "tenant_id"         VARCHAR(15)  NOT NULL,
  "dn_id"             VARCHAR(15)  NOT NULL,
  "snapshot_date"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "driver_user_id"    VARCHAR(15),
  "status_at"         VARCHAR(20)  NOT NULL,
  "logistics_type"    VARCHAR(20)  NOT NULL,
  "handover_count"    INT          NOT NULL DEFAULT 0,
  "internal_cost_sum" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "duration_sec"      INT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nx08_delivery_cache_snapshot_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx08_delivery_cache_snapshot_dn_fkey"     FOREIGN KEY ("dn_id")     REFERENCES "nx06_dn"("id")
);
CREATE INDEX "nx08_delivery_cache_snapshot_dn_idx"        ON "nx08_delivery_cache_snapshot" ("dn_id");
CREATE INDEX "nx08_delivery_cache_snapshot_tenant_dt_idx" ON "nx08_delivery_cache_snapshot" ("tenant_id", "snapshot_date");

COMMENT ON TABLE  "nx08_delivery_cache_snapshot" IS 'NX08 配送單逐筆 doc-level snapshot（per Nx06Dn、含 handover_count 統計、後續 ETL 寫入）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."handover_count" IS 'DN 累積動態交接次數（query nx06_dn_handover where dn_id 統計）';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."internal_cost_sum" IS 'DN 所有 items 的 internal_cost 加總';
