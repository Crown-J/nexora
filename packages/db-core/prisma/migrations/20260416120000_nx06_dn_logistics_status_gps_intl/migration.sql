-- NX06 Phase 7: 送貨單狀態語意化、物流類型、GPS、國際欄位、來源 SO/SR
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "logistics_type" VARCHAR(30) NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "last_lat" DECIMAL(12, 8);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "last_lng" DECIMAL(12, 8);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "last_location_at" TIMESTAMP(3);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "customs_declaration_no" VARCHAR(80);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "origin_port" VARCHAR(100);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "destination_port" VARCHAR(100);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "eta_date" DATE;
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "source_so_id" VARCHAR(15);
ALTER TABLE "nx06_dn" ADD COLUMN IF NOT EXISTS "source_sr_id" VARCHAR(15);

UPDATE "nx06_dn" SET "status" = CASE "status"
  WHEN 'P' THEN 'DRAFT'
  WHEN 'D' THEN 'DISPATCHED'
  WHEN 'C' THEN 'DELIVERED'
  WHEN 'V' THEN 'VOIDED'
  ELSE 'DRAFT'
END;

ALTER TABLE "nx06_dn" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx06_dn" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "nx06_dn_tenant_logistics_idx" ON "nx06_dn" ("tenant_id", "logistics_type");
CREATE INDEX IF NOT EXISTS "nx06_dn_source_so_idx" ON "nx06_dn" ("tenant_id", "source_so_id");
CREATE INDEX IF NOT EXISTS "nx06_dn_source_sr_idx" ON "nx06_dn" ("tenant_id", "source_sr_id");

ALTER TABLE "nx06_dn" ADD CONSTRAINT "nx06_dn_source_so_id_fkey" FOREIGN KEY ("source_so_id") REFERENCES "nx04_so"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx06_dn" ADD CONSTRAINT "nx06_dn_source_sr_id_fkey" FOREIGN KEY ("source_sr_id") REFERENCES "nx04_sr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 單號實際長度可超過 16（例：DN-202604-Z01-00001）
ALTER TABLE "nx06_dn" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
