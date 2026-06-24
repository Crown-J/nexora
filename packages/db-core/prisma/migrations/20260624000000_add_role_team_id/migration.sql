-- packages/db-core/prisma/migrations/20260624000000_add_role_team_id/migration.sql
-- 2026-06-24 執行長拍板「職務硬綁組別」(部門→組別→職務→成員 四層架構)
-- 業務職務必填、isSystem=true 系統角色（SYSADMIN/OWNER 等跨部門）豁免可空
-- 既有資料：team_id 預設 NULL、由業務層補填、本 migration 不刪資料、Railway 安全

-- AlterTable: 加 team_id 欄位（nullable）
ALTER TABLE "nx01_role" ADD COLUMN "team_id" VARCHAR(15);

-- CreateIndex: 加速依組別查職務（OrgStructurePage 四欄 cascade 用）
CREATE INDEX "nx01_role_tenant_id_team_id_idx" ON "nx01_role"("tenant_id", "team_id");

-- AddForeignKey: 組別停用 → 職務 teamId 設 NULL（不刪職務本身）
ALTER TABLE "nx01_role" ADD CONSTRAINT "nx01_role_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "nx01_team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
