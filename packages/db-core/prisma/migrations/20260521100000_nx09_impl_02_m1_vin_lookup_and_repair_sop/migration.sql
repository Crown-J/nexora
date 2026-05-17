-- packages/db-core/prisma/migrations/20260521100000_nx09_impl_02_m1_vin_lookup_and_repair_sop/migration.sql
-- NX09-IMPL-02 Phase 1 M1：VinLookup + RepairSop + RepairSopPartModel 三新表
-- 對齊：overview v0.2.0 §5 §6 §7 + plan v0.1.0 §2.L1 + Crown Q1=c/Q2=a/Q6=a
-- 性質：純新表（3 表）+ 0 既有 ALTER、0 backfill 衝突
-- 業界改革：VIN 對照（NHTSA + 手動）+ 維修 SOP 結構化 + RepairSop↔PartModel 內部 wire ⭐⭐⭐

-- ============================================================
-- 1. ID generator functions × 3（對齊既有 gen_nx09_*_id 範式）
-- ============================================================

CREATE OR REPLACE FUNCTION gen_nx09_vin_lookup_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx09_vin_lookup;
  RETURN 'NX09VINL' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_nx09_repair_sop_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx09_repair_sop;
  RETURN 'NX09RPSP' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_nx09_repair_sop_part_model_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx09_repair_sop_part_model;
  RETURN 'NX09RSPM' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Nx09VinLookup（VIN 17 碼結構化主檔）
-- ============================================================

CREATE TABLE "nx09_vin_lookup" (
  "id"                VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx09_vin_lookup_id(),
  "tenant_id"         VARCHAR(15)  NOT NULL,
  "vin"               VARCHAR(17)  NOT NULL,
  "car_brand_id"      VARCHAR(15),
  "model_id"          VARCHAR(15),
  "source"            VARCHAR(10)  NOT NULL DEFAULT 'MANUAL',
  "decoded_at"        TIMESTAMP(3),
  "raw_api_response"  TEXT,
  "notes"             VARCHAR(500),
  "is_active"         BOOLEAN      NOT NULL DEFAULT true,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"        VARCHAR(15)  NOT NULL,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "updated_by"        VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx09_vin_lookup_tenant_fkey"     FOREIGN KEY ("tenant_id")    REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx09_vin_lookup_car_brand_fkey"  FOREIGN KEY ("car_brand_id") REFERENCES "nx01_car_brand"("id"),
  CONSTRAINT "nx09_vin_lookup_model_fkey"      FOREIGN KEY ("model_id")     REFERENCES "nx01_model"("id")
);

CREATE UNIQUE INDEX "nx09_vin_lookup_tenant_vin_key" ON "nx09_vin_lookup" ("tenant_id", "vin");
CREATE INDEX "nx09_vin_lookup_tenant_idx"            ON "nx09_vin_lookup" ("tenant_id");
CREATE INDEX "nx09_vin_lookup_model_idx"             ON "nx09_vin_lookup" ("tenant_id", "model_id");
CREATE INDEX "nx09_vin_lookup_source_idx"            ON "nx09_vin_lookup" ("tenant_id", "source");

COMMENT ON TABLE  "nx09_vin_lookup" IS 'NX09 VIN 對照主檔（NHTSA decode + 手動建檔混合、業界改革 ⭐⭐⭐）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_vin_lookup"."vin"              IS 'VIN 17 碼國際標準（ISO 3779 / SAE J853）';
COMMENT ON COLUMN "nx09_vin_lookup"."source"           IS '資料來源（API=NHTSA 自動解析 / MANUAL=業務員手動建檔）';
COMMENT ON COLUMN "nx09_vin_lookup"."raw_api_response" IS 'NHTSA decode 原始 JSON（debug + 補錄用）';

-- ============================================================
-- 3. Nx09RepairSop（維修 SOP 結構化主檔）
-- ============================================================

CREATE TABLE "nx09_repair_sop" (
  "id"                   VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx09_repair_sop_id(),
  "tenant_id"            VARCHAR(15)  NOT NULL,
  "code"                 VARCHAR(30)  NOT NULL,
  "title"                VARCHAR(200) NOT NULL,
  "category"             VARCHAR(20)  NOT NULL DEFAULT 'OTHER',
  "steps"                TEXT         NOT NULL,
  "tools"                TEXT,
  "warnings"             TEXT,
  "estimated_minutes"    INT,
  "photos"               TEXT,
  "car_model_filter"     VARCHAR(15),
  "difficulty"           SMALLINT     NOT NULL DEFAULT 1,
  "is_active"            BOOLEAN      NOT NULL DEFAULT true,
  "remark"               VARCHAR(500),
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"           VARCHAR(15)  NOT NULL,
  "updated_at"           TIMESTAMP(3) NOT NULL,
  "updated_by"           VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx09_repair_sop_tenant_fkey"     FOREIGN KEY ("tenant_id")        REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx09_repair_sop_car_model_fkey"  FOREIGN KEY ("car_model_filter") REFERENCES "nx01_model"("id")
);

CREATE UNIQUE INDEX "nx09_repair_sop_tenant_code_key" ON "nx09_repair_sop" ("tenant_id", "code");
CREATE INDEX "nx09_repair_sop_tenant_idx"             ON "nx09_repair_sop" ("tenant_id");
CREATE INDEX "nx09_repair_sop_category_idx"           ON "nx09_repair_sop" ("tenant_id", "category");
CREATE INDEX "nx09_repair_sop_car_model_idx"          ON "nx09_repair_sop" ("tenant_id", "car_model_filter");

COMMENT ON TABLE  "nx09_repair_sop" IS 'NX09 維修 SOP 結構化主檔（步驟 + 工具 + 注意事項 + 預估時間、業界改革 ⭐⭐⭐）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_repair_sop"."category"          IS '維修分類（ENGINE/BRAKE/ELECTRIC/MAINTAIN/SUSPENSION/AC/TRANS/OTHER）';
COMMENT ON COLUMN "nx09_repair_sop"."steps"             IS 'JSON 陣列：[{seq, description, tool, warning, imageUrl}]';
COMMENT ON COLUMN "nx09_repair_sop"."tools"             IS 'JSON 陣列：工具清單';
COMMENT ON COLUMN "nx09_repair_sop"."warnings"          IS 'JSON 陣列：注意事項';
COMMENT ON COLUMN "nx09_repair_sop"."photos"            IS 'JSON 陣列：照片 URL';
COMMENT ON COLUMN "nx09_repair_sop"."car_model_filter"  IS '適用車型過濾（可空 = 通用、FK Nx01Model）';
COMMENT ON COLUMN "nx09_repair_sop"."difficulty"        IS '維修難度（1-5、預設 1 簡易）';

-- ============================================================
-- 4. Nx09RepairSopPartModel（RepairSop ↔ PartModel link 表、業界改革 ⭐⭐⭐ 雙向 wire）
-- ============================================================

CREATE TABLE "nx09_repair_sop_part_model" (
  "id"             VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx09_repair_sop_part_model_id(),
  "repair_sop_id"  VARCHAR(15)  NOT NULL,
  "part_model_id"  VARCHAR(15)  NOT NULL,
  "notes"          VARCHAR(200),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx09_repair_sop_part_model_sop_fkey"        FOREIGN KEY ("repair_sop_id") REFERENCES "nx09_repair_sop"("id"),
  CONSTRAINT "nx09_repair_sop_part_model_part_model_fkey" FOREIGN KEY ("part_model_id") REFERENCES "nx01_part_model"("id")
);

CREATE UNIQUE INDEX "nx09_repair_sop_part_model_uniq_key" ON "nx09_repair_sop_part_model" ("repair_sop_id", "part_model_id");
CREATE INDEX "nx09_repair_sop_part_model_sop_idx"         ON "nx09_repair_sop_part_model" ("repair_sop_id");
CREATE INDEX "nx09_repair_sop_part_model_part_model_idx"  ON "nx09_repair_sop_part_model" ("part_model_id");

COMMENT ON TABLE  "nx09_repair_sop_part_model" IS 'NX09 RepairSop ↔ Nx01PartModel link 表（雙向查詢業界改革 ⭐⭐⭐：查料件→看 SOP / 查 SOP→看料件）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."notes" IS '為什麼這料件適用此 SOP（業務員備註）';
