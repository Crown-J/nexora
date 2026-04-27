-- DropForeignKey
ALTER TABLE "nx02_rr_import" DROP CONSTRAINT "nx02_rr_import_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "nx02_ti" DROP CONSTRAINT "nx02_ti_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "nx05_note" DROP CONSTRAINT "nx05_note_currency_id_fkey";

-- AlterTable
ALTER TABLE "nx02_rr_import" ALTER COLUMN "currency_id" SET DATA TYPE VARCHAR(15);

-- AlterTable
ALTER TABLE "nx02_ti" ALTER COLUMN "currency_id" SET DATA TYPE VARCHAR(15);

-- AlterTable
ALTER TABLE "nx05_note" ALTER COLUMN "currency_id" SET DATA TYPE VARCHAR(15);

-- AddForeignKey
ALTER TABLE "nx02_rr_import" ADD CONSTRAINT "nx02_rr_import_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx02_ti" ADD CONSTRAINT "nx02_ti_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_note" ADD CONSTRAINT "nx05_note_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
