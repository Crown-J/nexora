-- packages/db-core/prisma/migrations/20260520200000_nx07_impl_01_m1_medical_management_tables/migration.sql
-- NX07-IMPL-01 Phase 1 M1：醫療管理 + 職災追蹤 2 新表（Crown Q1=b 亞羅特色 ⭐）
-- 對齊：overview v0.1.0 §4 + audit-01 §6.3 + plan §3 M1
-- 性質：純新表 × 2、0 既有 ALTER、0 backfill 衝突

-- ID 生成 function × 2
CREATE OR REPLACE FUNCTION gen_nx07_medical_record_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx07_medical_record;
  RETURN 'NX07MDRC' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_nx07_injury_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq FROM nx07_injury;
  RETURN 'NX07INJU' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- 表 1：Nx07MedicalRecord（年度健檢紀錄）
CREATE TABLE "nx07_medical_record" (
  "id"             VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx07_medical_record_id(),
  "tenant_id"      VARCHAR(15)  NOT NULL,
  "user_id"        VARCHAR(15)  NOT NULL,
  "record_date"    DATE         NOT NULL,
  "record_type"    VARCHAR(20)  NOT NULL DEFAULT 'ANNUAL',
  "exam_items"     TEXT,
  "conclusion"     VARCHAR(500),
  "recommendation" TEXT,
  "doctor_name"    VARCHAR(50),
  "hospital_name"  VARCHAR(100),
  "attachment_url" VARCHAR(500),
  "remark"         VARCHAR(200),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     VARCHAR(15)  NOT NULL,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "updated_by"     VARCHAR(15)  NOT NULL,
  CONSTRAINT "nx07_medical_record_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx07_medical_record_user_fkey"   FOREIGN KEY ("user_id")   REFERENCES "nx01_user"("id")
);
CREATE INDEX "nx07_medical_record_user_idx"      ON "nx07_medical_record" ("user_id");
CREATE INDEX "nx07_medical_record_tenant_dt_idx" ON "nx07_medical_record" ("tenant_id", "record_date");

COMMENT ON TABLE  "nx07_medical_record" IS 'NX07 員工醫療紀錄（年度健檢 / 特殊作業健康管理、Crown Q1=b 亞羅特色 ⭐）。NX07-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx07_medical_record"."record_type" IS '紀錄類型（ANNUAL 年度健檢 / SPECIAL 特殊作業健檢 / FOLLOWUP 追蹤健檢）';
COMMENT ON COLUMN "nx07_medical_record"."exam_items" IS '體檢項目 + 結果（JSON 字串、後續軌升結構化）';

-- 表 2：Nx07Injury（職災追蹤、亞羅汽配業特色 ⭐⭐⭐）
CREATE TABLE "nx07_injury" (
  "id"              VARCHAR(15)    PRIMARY KEY DEFAULT gen_nx07_injury_id(),
  "tenant_id"       VARCHAR(15)    NOT NULL,
  "user_id"         VARCHAR(15)    NOT NULL,
  "injury_date"     DATE           NOT NULL,
  "injury_type"     VARCHAR(50),
  "injury_location" VARCHAR(200),
  "description"     TEXT,
  "status"          VARCHAR(20)    NOT NULL DEFAULT 'REPORTED',
  "recovery_at"     TIMESTAMP(3),
  "insurance_claim" DECIMAL(10, 2),
  "attachment_url"  VARCHAR(500),
  "remark"          VARCHAR(200),
  "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"      VARCHAR(15)    NOT NULL,
  "updated_at"      TIMESTAMP(3)   NOT NULL,
  "updated_by"      VARCHAR(15)    NOT NULL,
  CONSTRAINT "nx07_injury_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id"),
  CONSTRAINT "nx07_injury_user_fkey"   FOREIGN KEY ("user_id")   REFERENCES "nx01_user"("id")
);
CREATE INDEX "nx07_injury_user_idx"          ON "nx07_injury" ("user_id");
CREATE INDEX "nx07_injury_tenant_status_idx" ON "nx07_injury" ("tenant_id", "status");

COMMENT ON TABLE  "nx07_injury" IS 'NX07 職災追蹤（汽配業常見：搬料 / 切割 / 化學 / 工具意外、亞羅特色業界改革候選 ⭐⭐⭐）。NX07-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx07_injury"."injury_type" IS '職災類型（LIFT 搬料 / CUT 切割 / CHEM 化學 / MACHINE 機械 / ERGO 姿勢職業病 / OTHER）';
COMMENT ON COLUMN "nx07_injury"."status" IS '狀態（REPORTED 通報 / TREATING 治療中 / RECOVERED 康復 / DISABLED 失能 / FATAL 死亡）';
