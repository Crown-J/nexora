-- Align NX00 physical schema to docs/nx00_field.csv
-- - Remove non-spec tables (basic/org/menu/permission/role_menu/role_permission/param/file/daily_log) and nx00_user.org_id
-- - Add nx00_country, nx00_currency, nx00_brand_code_role, nx00_part_relation
-- - Restructure nx00_part_group; drop nx00_part_group_map
-- - Extend nx00_part; nx00_part_brand.country_id; nx00_car_brand.country_id (drop part_brand_id / origin text columns)
-- - nx00_user.tenant_id NOT NULL; nx00_partner.partner_type CUST/SUP/BOTH

-- ---------------------------------------------------------------------------
-- 1) Drop mistaken NX00 tables + user.org_id (from prior exploratory migration)
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_user" DROP CONSTRAINT IF EXISTS "nx00_user_org_id_fkey";
ALTER TABLE "nx00_user" DROP COLUMN IF EXISTS "org_id";

DROP TABLE IF EXISTS "nx00_role_permission" CASCADE;
DROP TABLE IF EXISTS "nx00_role_menu" CASCADE;
DROP TABLE IF EXISTS "nx00_permission" CASCADE;
DROP TABLE IF EXISTS "nx00_menu" CASCADE;
DROP TABLE IF EXISTS "nx00_param" CASCADE;
DROP TABLE IF EXISTS "nx00_file" CASCADE;
DROP TABLE IF EXISTS "nx00_daily_log" CASCADE;
DROP TABLE IF EXISTS "nx00_basic" CASCADE;
DROP TABLE IF EXISTS "nx00_org" CASCADE;

-- ---------------------------------------------------------------------------
-- 2) ID generators: country / currency / brand_code_role / part_relation
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_nx00_coun_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_coun_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00COUN' || LPAD(nextval('seq_nx00_coun_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_curr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_curr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CURR' || LPAD(nextval('seq_nx00_curr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_bcor_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bcor_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BCOR' || LPAD(nextval('seq_nx00_bcor_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pare_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pare_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PARE' || LPAD(nextval('seq_nx00_pare_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
-- 3) nx00_country, nx00_currency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nx00_country" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_coun_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_country_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_country_code_key" ON "nx00_country"("code");

CREATE TABLE IF NOT EXISTS "nx00_currency" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_curr_id(),
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(5),
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_currency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_currency_code_key" ON "nx00_currency"("code");

ALTER TABLE "nx00_country" DROP CONSTRAINT IF EXISTS "nx00_country_created_by_fkey";
ALTER TABLE "nx00_country" DROP CONSTRAINT IF EXISTS "nx00_country_updated_by_fkey";
ALTER TABLE "nx00_country" ADD CONSTRAINT "nx00_country_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_country" ADD CONSTRAINT "nx00_country_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_currency" DROP CONSTRAINT IF EXISTS "nx00_currency_created_by_fkey";
ALTER TABLE "nx00_currency" DROP CONSTRAINT IF EXISTS "nx00_currency_updated_by_fkey";
ALTER TABLE "nx00_currency" ADD CONSTRAINT "nx00_currency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_currency" ADD CONSTRAINT "nx00_currency_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4) Seed minimal countries for FK backfill (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO "nx00_country" ("id", "code", "name", "sort_no", "is_active", "created_at", "updated_at")
SELECT gen_nx00_coun_id(), 'DEU', '德國', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "nx00_country" WHERE "code" = 'DEU');
INSERT INTO "nx00_country" ("id", "code", "name", "sort_no", "is_active", "created_at", "updated_at")
SELECT gen_nx00_coun_id(), 'TWN', '台灣', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "nx00_country" WHERE "code" = 'TWN');

-- ---------------------------------------------------------------------------
-- 5) nx00_part_brand: country_id replaces origin_country
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_part_brand" ADD COLUMN IF NOT EXISTS "country_id" VARCHAR(15);
UPDATE "nx00_part_brand" pb
SET "country_id" = c."id"
FROM "nx00_country" c
WHERE pb."country_id" IS NULL
  AND pb."origin_country" IS NOT NULL
  AND (
    (upper(trim(pb."origin_country")) IN ('DE', 'DEU') AND c."code" = 'DEU')
    OR (upper(trim(pb."origin_country")) IN ('TW', 'TWN') AND c."code" = 'TWN')
  );
ALTER TABLE "nx00_part_brand" DROP CONSTRAINT IF EXISTS "nx00_part_brand_country_id_fkey";
ALTER TABLE "nx00_part_brand" ADD CONSTRAINT "nx00_part_brand_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "nx00_part_brand_country_id_idx" ON "nx00_part_brand"("country_id");
ALTER TABLE "nx00_part_brand" DROP COLUMN IF EXISTS "origin_country";

-- ---------------------------------------------------------------------------
-- 6) nx00_car_brand: country_id; drop part_brand_id + origin_country
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_car_brand" ADD COLUMN IF NOT EXISTS "country_id" VARCHAR(15);
UPDATE "nx00_car_brand" cb
SET "country_id" = pb."country_id"
FROM "nx00_part_brand" pb
WHERE cb."country_id" IS NULL AND cb."part_brand_id" IS NOT NULL AND pb."id" = cb."part_brand_id";
ALTER TABLE "nx00_car_brand" DROP CONSTRAINT IF EXISTS "nx00_car_brand_part_brand_id_fkey";
ALTER TABLE "nx00_car_brand" DROP COLUMN IF EXISTS "part_brand_id";
ALTER TABLE "nx00_car_brand" DROP COLUMN IF EXISTS "origin_country";
ALTER TABLE "nx00_car_brand" DROP CONSTRAINT IF EXISTS "nx00_car_brand_country_id_fkey";
ALTER TABLE "nx00_car_brand" ADD CONSTRAINT "nx00_car_brand_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "nx00_car_brand_country_id_idx" ON "nx00_car_brand"("country_id");

-- ---------------------------------------------------------------------------
-- 7) Drop part_group_map; reshape nx00_part_group to CSV
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "nx00_part_group_map" CASCADE;

DELETE FROM "nx00_part_group";

ALTER TABLE "nx00_part_group" DROP CONSTRAINT IF EXISTS "nx00_part_group_car_brand_id_fkey";
DROP INDEX IF EXISTS "nx00_part_group_car_brand_id_code_key";

ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "car_brand_id";
ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "seg1";
ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "seg2";
ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "seg3";
ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "seg4";
ALTER TABLE "nx00_part_group" DROP COLUMN IF EXISTS "seg5";

ALTER TABLE "nx00_part_group" ALTER COLUMN "sort_no" DROP DEFAULT;
ALTER TABLE "nx00_part_group" ALTER COLUMN "sort_no" TYPE INTEGER USING (
  CASE
    WHEN trim(coalesce("sort_no"::text, '')) ~ '^[0-9]+$' THEN trim("sort_no"::text)::integer
    ELSE 0
  END
);
ALTER TABLE "nx00_part_group" ALTER COLUMN "sort_no" SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "nx00_part_group_code_key" ON "nx00_part_group"("code");

-- ---------------------------------------------------------------------------
-- 8) nx00_part: new columns + FKs
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "sec_code" VARCHAR(50);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "seg1" VARCHAR(10);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "seg2" VARCHAR(10);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "seg3" VARCHAR(10);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "seg4" VARCHAR(10);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "seg5" VARCHAR(10);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "country_id" VARCHAR(15);
ALTER TABLE "nx00_part" ADD COLUMN IF NOT EXISTS "part_group_id" VARCHAR(15);

UPDATE "nx00_part" SET "type" = 'A' WHERE "type" IS NULL;

ALTER TABLE "nx00_part" DROP CONSTRAINT IF EXISTS "nx00_part_country_id_fkey";
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "nx00_country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx00_part" DROP CONSTRAINT IF EXISTS "nx00_part_part_group_id_fkey";
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_part_group_id_fkey"
  FOREIGN KEY ("part_group_id") REFERENCES "nx00_part_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "nx00_part_country_id_idx" ON "nx00_part"("country_id");
CREATE INDEX IF NOT EXISTS "nx00_part_part_group_id_idx" ON "nx00_part"("part_group_id");

-- ---------------------------------------------------------------------------
-- 9) nx00_brand_code_role, nx00_part_relation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "nx00_brand_code_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_bcor_id(),
    "part_brand_id" VARCHAR(15) NOT NULL,
    "seg1" INTEGER NOT NULL DEFAULT 0,
    "seg2" INTEGER NOT NULL DEFAULT 0,
    "seg3" INTEGER NOT NULL DEFAULT 0,
    "seg4" INTEGER NOT NULL DEFAULT 0,
    "seg5" INTEGER NOT NULL DEFAULT 0,
    "code_format" VARCHAR(20) NOT NULL,
    "brand_sort" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_brand_code_role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "nx00_brand_code_role_part_brand_id_key" ON "nx00_brand_code_role"("part_brand_id");

ALTER TABLE "nx00_brand_code_role" DROP CONSTRAINT IF EXISTS "nx00_brand_code_role_part_brand_id_fkey";
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_part_brand_id_fkey"
  FOREIGN KEY ("part_brand_id") REFERENCES "nx00_part_brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nx00_brand_code_role" DROP CONSTRAINT IF EXISTS "nx00_brand_code_role_created_by_fkey";
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_brand_code_role" DROP CONSTRAINT IF EXISTS "nx00_brand_code_role_updated_by_fkey";
ALTER TABLE "nx00_brand_code_role" ADD CONSTRAINT "nx00_brand_code_role_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "nx00_part_relation" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_pare_id(),
    "part_id_from" VARCHAR(15) NOT NULL,
    "part_id_to" VARCHAR(15) NOT NULL,
    "relation_type" VARCHAR(1) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx00_part_relation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "nx00_part_relation" DROP CONSTRAINT IF EXISTS "nx00_part_relation_part_id_from_fkey";
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_part_id_from_fkey"
  FOREIGN KEY ("part_id_from") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_part_relation" DROP CONSTRAINT IF EXISTS "nx00_part_relation_part_id_to_fkey";
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_part_id_to_fkey"
  FOREIGN KEY ("part_id_to") REFERENCES "nx00_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_part_relation" DROP CONSTRAINT IF EXISTS "nx00_part_relation_created_by_fkey";
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx00_part_relation" DROP CONSTRAINT IF EXISTS "nx00_part_relation_updated_by_fkey";
ALTER TABLE "nx00_part_relation" ADD CONSTRAINT "nx00_part_relation_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "nx00_part_relation_part_id_from_idx" ON "nx00_part_relation"("part_id_from");
CREATE INDEX IF NOT EXISTS "nx00_part_relation_part_id_to_idx" ON "nx00_part_relation"("part_id_to");

-- ---------------------------------------------------------------------------
-- 10) nx00_user.tenant_id NOT NULL
-- ---------------------------------------------------------------------------
UPDATE "nx00_user" u
SET "tenant_id" = t."id"
FROM (SELECT "id" FROM "nx99_tenant" ORDER BY "sort_no" ASC NULLS LAST, "id" ASC LIMIT 1) t
WHERE u."tenant_id" IS NULL;

ALTER TABLE "nx00_user" ALTER COLUMN "tenant_id" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 11) nx00_partner type codes per CSV
-- ---------------------------------------------------------------------------
UPDATE "nx00_partner" SET "partner_type" = 'CUST' WHERE "partner_type" = 'CUSTOMER';
UPDATE "nx00_partner" SET "partner_type" = 'SUP' WHERE "partner_type" = 'SUPPLIER';
