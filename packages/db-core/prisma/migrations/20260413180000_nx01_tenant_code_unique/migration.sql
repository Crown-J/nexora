-- NX01: scope `code` uniqueness per tenant (warehouse, part_brand, partner, role).

DROP INDEX IF EXISTS "nx01_part_brand_code_key";
CREATE UNIQUE INDEX "nx01_part_brand_tenant_id_code_key" ON "nx01_part_brand"("tenant_id", "code");

DROP INDEX IF EXISTS "nx01_partner_code_key";
CREATE UNIQUE INDEX "nx01_partner_tenant_id_code_key" ON "nx01_partner"("tenant_id", "code");

DROP INDEX IF EXISTS "nx01_role_code_key";
CREATE UNIQUE INDEX "nx01_role_tenant_id_code_key" ON "nx01_role"("tenant_id", "code");

DROP INDEX IF EXISTS "nx01_warehouse_code_key";
CREATE UNIQUE INDEX "nx01_warehouse_tenant_id_code_key" ON "nx01_warehouse"("tenant_id", "code");
