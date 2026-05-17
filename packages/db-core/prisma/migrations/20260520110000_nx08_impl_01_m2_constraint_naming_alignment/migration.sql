-- DropForeignKey
ALTER TABLE "nx08_ap_cache_snapshot" DROP CONSTRAINT "nx08_ap_cache_snapshot_ap_ledger_fkey";

-- DropForeignKey
ALTER TABLE "nx08_ap_cache_snapshot" DROP CONSTRAINT "nx08_ap_cache_snapshot_tenant_fkey";

-- DropForeignKey
ALTER TABLE "nx08_ar_cache_snapshot" DROP CONSTRAINT "nx08_ar_cache_snapshot_ar_ledger_fkey";

-- DropForeignKey
ALTER TABLE "nx08_ar_cache_snapshot" DROP CONSTRAINT "nx08_ar_cache_snapshot_tenant_fkey";

-- DropForeignKey
ALTER TABLE "nx08_delivery_cache_snapshot" DROP CONSTRAINT "nx08_delivery_cache_snapshot_dn_fkey";

-- DropForeignKey
ALTER TABLE "nx08_delivery_cache_snapshot" DROP CONSTRAINT "nx08_delivery_cache_snapshot_tenant_fkey";

-- AddForeignKey
ALTER TABLE "nx08_ap_cache_snapshot" ADD CONSTRAINT "nx08_ap_cache_snapshot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_ap_cache_snapshot" ADD CONSTRAINT "nx08_ap_cache_snapshot_ap_ledger_id_fkey" FOREIGN KEY ("ap_ledger_id") REFERENCES "nx05_ap_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_ar_cache_snapshot" ADD CONSTRAINT "nx08_ar_cache_snapshot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_ar_cache_snapshot" ADD CONSTRAINT "nx08_ar_cache_snapshot_ar_ledger_id_fkey" FOREIGN KEY ("ar_ledger_id") REFERENCES "nx05_ar_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_delivery_cache_snapshot" ADD CONSTRAINT "nx08_delivery_cache_snapshot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx08_delivery_cache_snapshot" ADD CONSTRAINT "nx08_delivery_cache_snapshot_dn_id_fkey" FOREIGN KEY ("dn_id") REFERENCES "nx06_dn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
