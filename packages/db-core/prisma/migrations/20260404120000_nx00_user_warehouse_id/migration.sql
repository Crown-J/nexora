-- AlterTable: nx00_user.warehouse_id → nx00_warehouse (nullable FK)
ALTER TABLE "nx00_user" ADD COLUMN "warehouse_id" VARCHAR(15);

ALTER TABLE "nx00_user"
ADD CONSTRAINT "nx00_user_warehouse_id_fkey"
FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "nx00_user_warehouse_id_idx" ON "nx00_user"("warehouse_id");
