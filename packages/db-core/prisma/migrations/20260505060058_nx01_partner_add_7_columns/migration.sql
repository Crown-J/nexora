-- AlterTable
ALTER TABLE "nx01_partner" ADD COLUMN     "default_currency_id" VARCHAR(15),
ADD COLUMN     "fax" VARCHAR(30),
ADD COLUMN     "name_en" VARCHAR(100),
ADD COLUMN     "sales_user_id" VARCHAR(15),
ADD COLUMN     "service_location" VARCHAR(50),
ADD COLUMN     "short_name" VARCHAR(50),
ADD COLUMN     "website" VARCHAR(200);

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_partner" ADD CONSTRAINT "nx01_partner_default_currency_id_fkey" FOREIGN KEY ("default_currency_id") REFERENCES "nx01_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
