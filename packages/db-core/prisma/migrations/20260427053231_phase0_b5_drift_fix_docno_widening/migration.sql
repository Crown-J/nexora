-- AlterTable
ALTER TABLE "nx01_calendar_event" ALTER COLUMN "order_doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx02_demand" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx02_ti" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx03_init" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx03_pk" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx03_pl" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx04_co" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_allowance" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_ap_ledger" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_ar_ledger" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_closing" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_note" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "nx05_paylog" ALTER COLUMN "doc_no" SET DATA TYPE VARCHAR(30);
