-- TASK-NX02-PURCHASE-M4-SCHEMA
-- LITE 階段 1 M4：跨模組共享待辦池（從零）
--
-- 對應 Crown 2026-05-28 拍板：
--   - 全模組共用框架（進貨/銷貨/庫存/財務都接此池）
--   - 任何人可建、可指派或留池中（assigneeUserId=null）
--   - 池中待辦任何人可領取（status OPEN→CLAIMED）
--   - 主管 ABCD 可指派給 EF（assignee 變更）
--   - 完成 status=DONE / 作廢 status=VOIDED
--   - 跨模組通用：sourceModule + sourceDocType + sourceDocId 軟連結（不建 FK）

CREATE SEQUENCE IF NOT EXISTS seq_nx98_task_pool_id;
CREATE OR REPLACE FUNCTION gen_nx98_task_pool_id()
RETURNS VARCHAR AS $$
  SELECT 'NX98TPOL' || LPAD(nextval('seq_nx98_task_pool_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx98_task_pool" (
  "id"               VARCHAR(15) NOT NULL DEFAULT gen_nx98_task_pool_id(),
  "tenant_id"        VARCHAR(15) NOT NULL,
  "doc_no"           VARCHAR(30),
  "source_module"    VARCHAR(10),
  "source_doc_type"  VARCHAR(10),
  "source_doc_id"    VARCHAR(15),
  "source_doc_no"    VARCHAR(30),
  "title"            VARCHAR(200) NOT NULL,
  "description"      VARCHAR(1000),
  "category"         VARCHAR(30) NOT NULL,
  "priority"         VARCHAR(1) NOT NULL DEFAULT 'M',
  "due_date"         DATE,
  "department_id"    VARCHAR(15),
  "assignee_user_id" VARCHAR(15),
  "assigned_at"      TIMESTAMP(3),
  "assigned_by"      VARCHAR(15),
  "claimed_at"       TIMESTAMP(3),
  "claimed_by"       VARCHAR(15),
  "status"           VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  "completed_at"     TIMESTAMP(3),
  "completed_by"     VARCHAR(15),
  "completed_remark" VARCHAR(500),
  "voided_at"        TIMESTAMP(3),
  "voided_by"        VARCHAR(15),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"       VARCHAR(15) NOT NULL,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "updated_by"       VARCHAR(15) NOT NULL,

  CONSTRAINT "nx98_task_pool_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nx98_task_pool_tenant_status_idx" ON "nx98_task_pool"("tenant_id", "status");
CREATE INDEX "nx98_task_pool_tenant_assignee_status_idx" ON "nx98_task_pool"("tenant_id", "assignee_user_id", "status");
CREATE INDEX "nx98_task_pool_tenant_dept_status_idx" ON "nx98_task_pool"("tenant_id", "department_id", "status");
CREATE INDEX "nx98_task_pool_tenant_source_idx" ON "nx98_task_pool"("tenant_id", "source_module", "source_doc_id");

ALTER TABLE "nx98_task_pool"
  ADD CONSTRAINT "nx98_task_pool_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx98_task_pool"
  ADD CONSTRAINT "nx98_task_pool_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "nx01_department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx98_task_pool"
  IS '跨模組共享待辦池：進貨/銷貨/庫存/財務等模組產生的待辦進此池。LITE 階段 1 M4 新加。';

COMMENT ON COLUMN "nx98_task_pool"."status"
  IS '狀態（OPEN=池中未領 / CLAIMED=已領取 / DONE=已完成 / VOIDED=作廢）。';

COMMENT ON COLUMN "nx98_task_pool"."source_module"
  IS '來源模組碼（NX02/NX03/NX04/NX05、可空 = 跨模組獨立待辦）。';

COMMENT ON COLUMN "nx98_task_pool"."category"
  IS '業務分類（PURCHASE_RECEIVE 待驗收 / SALES_PICK 待撿貨 / INVENTORY_DISPOSAL 待異常處理 等）。';
