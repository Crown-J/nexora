-- =============================================
-- NX99-T2：nx00_user 補 tenant_id 欄位
-- Migration 名稱：add-tenant-id-to-nx00-user
-- ⚠️ 請在 NX99-T1 migration 執行成功後再跑此 migration
-- =============================================

ALTER TABLE "nx00_user"
  ADD COLUMN "tenant_id" VARCHAR(15);

ALTER TABLE "nx00_user"
  ADD CONSTRAINT "nx00_user_tenant_id_fkey"
  FOREIGN KEY ("tenant_id")
  REFERENCES "nx99_tenant"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "nx00_user_tenant_id_idx"
  ON "nx00_user"("tenant_id");
