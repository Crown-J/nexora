-- NX04 Phase 5: API status tokens (varchar 30), longer doc_no / currency FK, quote_item.created_by

ALTER TABLE "nx04_quote" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx04_quote" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
ALTER TABLE "nx04_quote" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
UPDATE "nx04_quote" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'S' THEN 'SENT'
  WHEN 'C' THEN 'ACCEPTED'
  WHEN 'X' THEN 'CANCELLED'
  ELSE "status"
END;
ALTER TABLE "nx04_quote" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx04_so" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx04_so" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
ALTER TABLE "nx04_so" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
UPDATE "nx04_so" SET "status" = CASE "status"
  WHEN 'N' THEN 'DRAFT'
  WHEN 'R' THEN 'DRAFT'
  WHEN 'B' THEN 'PICKING'
  WHEN 'F' THEN 'PICKING'
  WHEN 'O' THEN 'SHIPPED'
  WHEN 'C' THEN 'INVOICED'
  WHEN 'X' THEN 'CANCELLED'
  ELSE "status"
END;
ALTER TABLE "nx04_so" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx04_sr" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx04_sr" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
UPDATE "nx04_sr" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'A' THEN 'INSPECTING'
  WHEN 'P' THEN 'POSTED'
  WHEN 'R' THEN 'REJECTED'
  WHEN 'V' THEN 'CANCELLED'
  WHEN 'C' THEN 'POSTED'
  ELSE "status"
END;
ALTER TABLE "nx04_sr" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx04_quote_item" ADD COLUMN "created_by" VARCHAR(15);
UPDATE "nx04_quote_item" SET "created_by" = "updated_by" WHERE "created_by" IS NULL;
ALTER TABLE "nx04_quote_item" ALTER COLUMN "created_by" SET NOT NULL;

ALTER TABLE "nx04_so_item" ADD COLUMN "created_by" VARCHAR(15);
UPDATE "nx04_so_item" SET "created_by" = "updated_by" WHERE "created_by" IS NULL;
ALTER TABLE "nx04_so_item" ALTER COLUMN "created_by" SET NOT NULL;

ALTER TABLE "nx04_sr_item" ADD COLUMN "created_by" VARCHAR(15);
UPDATE "nx04_sr_item" SET "created_by" = "updated_by" WHERE "created_by" IS NULL;
ALTER TABLE "nx04_sr_item" ALTER COLUMN "created_by" SET NOT NULL;
