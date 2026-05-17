-- DropForeignKey
ALTER TABLE "nx07_injury" DROP CONSTRAINT "nx07_injury_tenant_fkey";

-- DropForeignKey
ALTER TABLE "nx07_injury" DROP CONSTRAINT "nx07_injury_user_fkey";

-- DropForeignKey
ALTER TABLE "nx07_medical_record" DROP CONSTRAINT "nx07_medical_record_tenant_fkey";

-- DropForeignKey
ALTER TABLE "nx07_medical_record" DROP CONSTRAINT "nx07_medical_record_user_fkey";

-- AddForeignKey
ALTER TABLE "nx07_medical_record" ADD CONSTRAINT "nx07_medical_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_medical_record" ADD CONSTRAINT "nx07_medical_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_injury" ADD CONSTRAINT "nx07_injury_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx07_injury" ADD CONSTRAINT "nx07_injury_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
