-- Phase 5 NX07: API status tokens, attendance audit cols, overtime audit cols,
-- nx01_user HR mirror fields, new performance/training/employee_change tables.

-- nx01_user: HR-synced role / department (nullable)
ALTER TABLE "nx01_user" ADD COLUMN IF NOT EXISTS "role_id" VARCHAR(15);
ALTER TABLE "nx01_user" ADD COLUMN IF NOT EXISTS "department_id" VARCHAR(15);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nx01_user_role_id_fkey'
  ) THEN
    ALTER TABLE "nx01_user"
      ADD CONSTRAINT "nx01_user_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nx01_user_department_id_fkey'
  ) THEN
    ALTER TABLE "nx01_user"
      ADD CONSTRAINT "nx01_user_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- nx07_attendance: audit + void
ALTER TABLE "nx07_attendance" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(15);
ALTER TABLE "nx07_attendance" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(15);
ALTER TABLE "nx07_attendance" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);

UPDATE "nx07_attendance" SET "created_by" = 'NX01USER0000001', "updated_by" = 'NX01USER0000001'
WHERE "created_by" IS NULL OR "updated_by" IS NULL;

ALTER TABLE "nx07_attendance" ALTER COLUMN "created_by" SET NOT NULL;
ALTER TABLE "nx07_attendance" ALTER COLUMN "updated_by" SET NOT NULL;

ALTER TABLE "nx07_attendance" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx07_attendance" SET "status" = CASE "status" WHEN 'N' THEN 'NORMAL' WHEN 'L' THEN 'LATE' WHEN 'E' THEN 'EARLY' WHEN 'A' THEN 'ABSENT' WHEN 'S' THEN 'SPECIAL' ELSE 'NORMAL' END;

-- nx07_leave_request status → API tokens
ALTER TABLE "nx07_leave_request" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx07_leave_request" SET "status" = CASE "status"
  WHEN 'P' THEN 'PENDING'
  WHEN 'A' THEN 'APPROVED'
  WHEN 'R' THEN 'REJECTED'
  WHEN 'C' THEN 'CANCELLED'
  ELSE 'PENDING'
END;

-- nx07_overtime_request: audit + status
ALTER TABLE "nx07_overtime_request" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(15);
ALTER TABLE "nx07_overtime_request" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(15);

UPDATE "nx07_overtime_request" SET "created_by" = 'NX01USER0000001', "updated_by" = 'NX01USER0000001'
WHERE "created_by" IS NULL OR "updated_by" IS NULL;

ALTER TABLE "nx07_overtime_request" ALTER COLUMN "created_by" SET NOT NULL;
ALTER TABLE "nx07_overtime_request" ALTER COLUMN "updated_by" SET NOT NULL;

ALTER TABLE "nx07_overtime_request" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx07_overtime_request" SET "status" = CASE "status"
  WHEN 'P' THEN 'PENDING'
  WHEN 'A' THEN 'APPROVED'
  WHEN 'R' THEN 'REJECTED'
  WHEN 'C' THEN 'CANCELLED'
  ELSE 'PENDING'
END;

-- nx07_salary_record status
ALTER TABLE "nx07_salary_record" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx07_salary_record" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'C' THEN 'CONFIRMED'
  WHEN 'P' THEN 'PAID'
  ELSE 'DRAFT'
END;

-- nx07_performance
CREATE SEQUENCE IF NOT EXISTS seq_nx07_performance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_performance_id() RETURNS VARCHAR AS $$
  SELECT 'NX07PERF' || LPAD(nextval('seq_nx07_performance_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx07_performance" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_performance_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "period_label" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "score" DECIMAL(5,2),
    "comment" VARCHAR(500),
    "reviewer_user_id" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx07_performance_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx07_performance" ADD CONSTRAINT "nx07_performance_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx07_performance" ADD CONSTRAINT "nx07_performance_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx07_performance" ADD CONSTRAINT "nx07_performance_reviewer_user_id_fkey"
  FOREIGN KEY ("reviewer_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- nx07_training
CREATE SEQUENCE IF NOT EXISTS seq_nx07_training_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_training_id() RETURNS VARCHAR AS $$
  SELECT 'NX07TRNG' || LPAD(nextval('seq_nx07_training_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx07_training" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_training_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(200),
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx07_training_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx07_training" ADD CONSTRAINT "nx07_training_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- nx07_employee_change
CREATE SEQUENCE IF NOT EXISTS seq_nx07_employee_change_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_employee_change_id() RETURNS VARCHAR AS $$
  SELECT 'NX07EMCH' || LPAD(nextval('seq_nx07_employee_change_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx07_employee_change" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx07_employee_change_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "target_user_id" VARCHAR(15) NOT NULL,
    "change_type" VARCHAR(20) NOT NULL,
    "new_role_id" VARCHAR(15),
    "new_department_id" VARCHAR(15),
    "effective_date" DATE NOT NULL,
    "remark" VARCHAR(200),
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,
    CONSTRAINT "nx07_employee_change_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx07_employee_change" ADD CONSTRAINT "nx07_employee_change_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx07_employee_change" ADD CONSTRAINT "nx07_employee_change_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx07_employee_change" ADD CONSTRAINT "nx07_employee_change_new_role_id_fkey"
  FOREIGN KEY ("new_role_id") REFERENCES "nx01_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx07_employee_change" ADD CONSTRAINT "nx07_employee_change_new_department_id_fkey"
  FOREIGN KEY ("new_department_id") REFERENCES "nx01_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
