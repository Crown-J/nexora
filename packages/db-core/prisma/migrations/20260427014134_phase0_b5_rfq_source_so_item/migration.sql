-- DropForeignKey
ALTER TABLE "nx03_st_item" DROP CONSTRAINT "nx03_st_item_source_so_item_id_fkey";

-- AlterTable
ALTER TABLE "nx02_rfq" ADD COLUMN     "source_so_item_id" VARCHAR(15);

-- CreateIndex
CREATE INDEX "nx02_rfq_tenant_source_so_item_idx" ON "nx02_rfq"("tenant_id", "source_so_item_id");

-- AddForeignKey
ALTER TABLE "nx02_rfq" ADD CONSTRAINT "nx02_rfq_source_so_item_id_fkey" FOREIGN KEY ("source_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_st_item" ADD CONSTRAINT "nx03_st_item_source_so_item_id_fkey" FOREIGN KEY ("source_so_item_id") REFERENCES "nx04_so_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
