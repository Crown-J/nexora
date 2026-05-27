-- ============================================================
-- 據點 / 庫位拆分（A 案）+ 零件廠牌 isOem
--   · 新增 nx01_site（據點：公司物理分點、倉庫之上一層）
--   · nx01_warehouse / nx01_location 加 site_id（所屬據點，scalar，對齊 audit 欄位慣例不建 FK，避免 drift）
--   · nx01_part_brand 加 is_oem
--   · 現有 nx01_location 仍為「庫位」（區/架/層/格），不動其 18 個庫存外鍵
--   · 資料遷移：每租戶 seed 一筆預設據點「總公司(HQ)」、回填倉庫 / 庫位 site_id
-- ============================================================

-- gen id 函式（新表 nx01_site 的 id 預設值，須先於 CREATE TABLE 建立）
CREATE SEQUENCE IF NOT EXISTS seq_nx01_site_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_site_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01SITE' || LPAD(nextval('seq_nx01_site_id')::text, 7, '0');
$$ LANGUAGE sql;

-- AlterTable
ALTER TABLE "nx01_location" ADD COLUMN     "site_id" VARCHAR(15);

-- AlterTable
ALTER TABLE "nx01_part_brand" ADD COLUMN     "is_oem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "nx01_warehouse" ADD COLUMN     "site_id" VARCHAR(15);

-- CreateTable
CREATE TABLE "nx01_site" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx01_site_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200),
    "phone" VARCHAR(30),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_site_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx01_site_tenant_id_code_key" ON "nx01_site"("tenant_id", "code");

-- ── 資料遷移 ─────────────────────────────────────────────
-- 每個租戶建一筆預設據點「總公司」（LITE 可直接用、created_by 填 SYSADMIN）
INSERT INTO "nx01_site" ("id", "tenant_id", "code", "name", "sort_no", "is_active", "created_at", "created_by", "updated_at", "updated_by")
SELECT gen_nx01_site_id(), t."id", 'HQ', '總公司', 0, true, CURRENT_TIMESTAMP, 'NX01USER0000001', CURRENT_TIMESTAMP, 'NX01USER0000001'
FROM "nx99_tenant" t;

-- 倉庫回填：指向同租戶的預設據點
UPDATE "nx01_warehouse" w
SET "site_id" = (
  SELECT s."id" FROM "nx01_site" s
  WHERE s."tenant_id" = w."tenant_id"
  ORDER BY s."sort_no", s."code"
  LIMIT 1
)
WHERE w."site_id" IS NULL;

-- 庫位回填：跟著所屬倉庫的據點
UPDATE "nx01_location" l
SET "site_id" = (SELECT w."site_id" FROM "nx01_warehouse" w WHERE w."id" = l."warehouse_id")
WHERE l."site_id" IS NULL;
