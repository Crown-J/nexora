-- packages/db-core/prisma/migrations/20260519110000_nx06_impl_02_m2_dn_handover_table/migration.sql
-- NX06-IMPL-02 Phase 1 M2：Nx06DnHandover 動態任務轉派紀錄表
-- 對齊：overview v0.2.0 §4.3（動態任務轉派、亞羅簡化版 ⭐⭐⭐）+ plan §3 M2
-- 性質：新表、0 既有資料衝突

CREATE OR REPLACE FUNCTION gen_nx06_dn_handover_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq
  FROM nx06_dn_handover;
  RETURN 'NX06DNHO' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "nx06_dn_handover" (
  "id"               VARCHAR(15)   PRIMARY KEY DEFAULT gen_nx06_dn_handover_id(),
  "tenant_id"        VARCHAR(15)   NOT NULL,
  "dn_id"            VARCHAR(15)   NOT NULL,
  "from_driver_id"   VARCHAR(15)   NOT NULL,
  "to_driver_id"     VARCHAR(15)   NOT NULL,
  "handover_lat"     DECIMAL(12, 8),
  "handover_lng"     DECIMAL(12, 8),
  "handover_address" VARCHAR(200),
  "status"           VARCHAR(20)   NOT NULL DEFAULT 'SUGGESTED',
  "reason"           VARCHAR(200),
  "suggested_by"     VARCHAR(15)   NOT NULL,
  "suggested_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at"      TIMESTAMP(3),
  "completed_at"     TIMESTAMP(3),
  "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)  NOT NULL,
  "updated_by"       VARCHAR(15)   NOT NULL,
  CONSTRAINT "fk_handover_dn"     FOREIGN KEY ("dn_id")          REFERENCES "nx06_dn"("id"),
  CONSTRAINT "fk_handover_from"   FOREIGN KEY ("from_driver_id") REFERENCES "nx01_user"("id"),
  CONSTRAINT "fk_handover_to"     FOREIGN KEY ("to_driver_id")   REFERENCES "nx01_user"("id"),
  CONSTRAINT "fk_handover_tenant" FOREIGN KEY ("tenant_id")      REFERENCES "nx99_tenant"("id")
);

CREATE INDEX "idx_handover_dn"     ON "nx06_dn_handover"("dn_id");
CREATE INDEX "idx_handover_status" ON "nx06_dn_handover"("tenant_id", "status");

COMMENT ON TABLE  "nx06_dn_handover" IS 'NX06 動態任務轉派紀錄（亞羅簡化版半徑+任務量+ETA 半自動）。NX06-IMPL-02 M2 新增。';
COMMENT ON COLUMN "nx06_dn_handover"."status" IS '狀態（SUGGESTED 演算法建議 / ACCEPTED 兩外務同意 / REJECTED 拒絕 / COMPLETED 交接完成 / CANCELLED 取消）。';
COMMENT ON COLUMN "nx06_dn_handover"."reason" IS '演算法推薦理由（如：半徑 3.2km / from 任務 5 to 任務 2 / ETA 短 15 分鐘）。';
