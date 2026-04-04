-- MIG002: nx00_brand_code_rule (rename + name, drop part_brand unique), nx00_part (code_rule_id, unique tenant+code+country), nx99_subscription (currency_id FK)

-- ---------------------------------------------------------------------------
-- nx00_brand_code_role -> nx00_brand_code_rule
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_brand_code_role" RENAME TO "nx00_brand_code_rule";

DROP INDEX "nx00_brand_code_role_part_brand_id_key";
ALTER INDEX "nx00_brand_code_role_tenant_id_idx" RENAME TO "nx00_brand_code_rule_tenant_id_idx";
ALTER INDEX "nx00_brand_code_role_is_active_idx" RENAME TO "nx00_brand_code_rule_is_active_idx";

ALTER TABLE "nx00_brand_code_rule" RENAME CONSTRAINT "nx00_brand_code_role_pkey" TO "nx00_brand_code_rule_pkey";
ALTER TABLE "nx00_brand_code_rule" RENAME CONSTRAINT "nx00_brand_code_role_tenant_id_fkey" TO "nx00_brand_code_rule_tenant_id_fkey";
ALTER TABLE "nx00_brand_code_rule" RENAME CONSTRAINT "nx00_brand_code_role_part_brand_id_fkey" TO "nx00_brand_code_rule_part_brand_id_fkey";
ALTER TABLE "nx00_brand_code_rule" RENAME CONSTRAINT "nx00_brand_code_role_created_by_fkey" TO "nx00_brand_code_rule_created_by_fkey";
ALTER TABLE "nx00_brand_code_rule" RENAME CONSTRAINT "nx00_brand_code_role_updated_by_fkey" TO "nx00_brand_code_rule_updated_by_fkey";

ALTER TABLE "nx00_brand_code_rule" ADD COLUMN "name" VARCHAR(15);

UPDATE "nx00_brand_code_rule" AS b
SET "name" = LEFT(COALESCE(pb."code", 'R') || ' 標準', 15)
FROM "nx00_part_brand" AS pb
WHERE pb."id" = b."part_brand_id";

UPDATE "nx00_brand_code_rule" SET "name" = 'DEFAULT' WHERE "name" IS NULL OR TRIM("name") = '';

ALTER TABLE "nx00_brand_code_rule" ALTER COLUMN "name" SET NOT NULL;

CREATE INDEX "nx00_brand_code_rule_part_brand_id_idx" ON "nx00_brand_code_rule"("part_brand_id");

-- ---------------------------------------------------------------------------
-- nx00_part: code_rule_id + composite unique
-- ---------------------------------------------------------------------------
ALTER TABLE "nx00_part" ADD COLUMN "code_rule_id" VARCHAR(15);

UPDATE "nx00_part" AS p
SET "code_rule_id" = (
  SELECT r."id"
  FROM "nx00_brand_code_rule" AS r
  WHERE r."part_brand_id" = p."part_brand_id" AND r."tenant_id" = p."tenant_id"
  ORDER BY r."id" ASC
  LIMIT 1
)
WHERE p."part_brand_id" IS NOT NULL;

UPDATE "nx00_part" AS p
SET "code_rule_id" = (
  SELECT r."id" FROM "nx00_brand_code_rule" r WHERE r."tenant_id" = p."tenant_id" ORDER BY r."id" ASC LIMIT 1
)
WHERE p."code_rule_id" IS NULL;

ALTER TABLE "nx00_part" ALTER COLUMN "code_rule_id" SET NOT NULL;

DROP INDEX "nx00_part_tenant_id_code_key";

CREATE UNIQUE INDEX "nx00_part_tenant_id_code_country_id_key" ON "nx00_part"("tenant_id", "code", "country_id");

CREATE INDEX "nx00_part_code_rule_id_idx" ON "nx00_part"("code_rule_id");

ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_code_rule_id_fkey" FOREIGN KEY ("code_rule_id") REFERENCES "nx00_brand_code_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- nx99_subscription: currency -> currency_id (FK nx00_currency)
-- ---------------------------------------------------------------------------
ALTER TABLE "nx99_subscription" ADD COLUMN "currency_id" VARCHAR(15);

UPDATE "nx99_subscription" AS s
SET "currency_id" = COALESCE(
  (SELECT c."id" FROM "nx00_currency" c WHERE c."code" = TRIM(s."currency") LIMIT 1),
  (SELECT c."id" FROM "nx00_currency" c WHERE c."code" = 'TWD' LIMIT 1),
  (SELECT c."id" FROM "nx00_currency" c ORDER BY c."id" ASC LIMIT 1)
);

ALTER TABLE "nx99_subscription" ALTER COLUMN "currency_id" SET NOT NULL;

ALTER TABLE "nx99_subscription" ADD CONSTRAINT "nx99_subscription_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "nx00_currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nx99_subscription" DROP COLUMN "currency";
