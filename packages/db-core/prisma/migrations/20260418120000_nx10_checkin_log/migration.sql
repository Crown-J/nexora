-- nx10_checkin_log：每日簽到記錄（與 nx10_emp_medal 連續簽到欄位搭配）
CREATE SEQUENCE IF NOT EXISTS seq_nx10_checkin_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx10_checkin_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX10CKLG' || LPAD(nextval('seq_nx10_checkin_log_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx10_checkin_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx10_checkin_log_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "checkin_date" DATE NOT NULL,
    "consecutive_after" INTEGER NOT NULL DEFAULT 0,
    "exp_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx10_checkin_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx10_checkin_log_tenant_id_user_id_checkin_date_key"
  ON "nx10_checkin_log"("tenant_id", "user_id", "checkin_date");

CREATE INDEX "nx10_checkin_log_tenant_id_user_id_idx"
  ON "nx10_checkin_log"("tenant_id", "user_id");

ALTER TABLE "nx10_checkin_log" ADD CONSTRAINT "nx10_checkin_log_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx10_checkin_log" ADD CONSTRAINT "nx10_checkin_log_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
