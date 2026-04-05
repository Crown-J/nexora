-- NX01: link RR line to RFQ line (post 時將 rfq_item 標為 SELECTED)
ALTER TABLE "nx01_rr_item" ADD COLUMN IF NOT EXISTS "rfq_item_id" VARCHAR(15);

CREATE INDEX IF NOT EXISTS "nx01_rr_item_rfq_item_id_idx" ON "nx01_rr_item"("rfq_item_id");

ALTER TABLE "nx01_rr_item"
  DROP CONSTRAINT IF EXISTS "nx01_rr_item_rfq_item_id_fkey";

ALTER TABLE "nx01_rr_item"
  ADD CONSTRAINT "nx01_rr_item_rfq_item_id_fkey"
  FOREIGN KEY ("rfq_item_id") REFERENCES "nx01_rfq_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
