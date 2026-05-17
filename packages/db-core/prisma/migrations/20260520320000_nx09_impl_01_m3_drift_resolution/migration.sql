-- DropForeignKey
ALTER TABLE "nx09_system_manual" DROP CONSTRAINT "nx09_system_manual_tenant_fkey";

-- AddForeignKey
ALTER TABLE "nx09_system_manual" ADD CONSTRAINT "nx09_system_manual_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
