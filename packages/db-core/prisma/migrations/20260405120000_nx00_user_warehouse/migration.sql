-- nx00_user_warehouse：使用者據點對應；並將 nx00_user.warehouse_id 既有資料移入後移除該欄

CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USWA' || LPAD(nextval('seq_nx00_user_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE "nx00_user_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_warehouse_id(),
    "user_id" VARCHAR(15) NOT NULL,
    "warehouse_id" VARCHAR(15) NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx00_user_warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx00_user_warehouse_user_id_warehouse_id_key" ON "nx00_user_warehouse"("user_id", "warehouse_id");
CREATE INDEX "nx00_user_warehouse_user_id_idx" ON "nx00_user_warehouse"("user_id");
CREATE INDEX "nx00_user_warehouse_warehouse_id_idx" ON "nx00_user_warehouse"("warehouse_id");
CREATE INDEX "nx00_user_warehouse_is_active_idx" ON "nx00_user_warehouse"("is_active");

ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx00_user_warehouse" ADD CONSTRAINT "nx00_user_warehouse_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 將單一欄位隸屬倉庫移轉為對應表（僅在曾加過 warehouse_id 欄位時有意義）
INSERT INTO "nx00_user_warehouse" ("user_id", "warehouse_id", "assigned_at", "is_active")
SELECT "id", "warehouse_id", CURRENT_TIMESTAMP, true
FROM "nx00_user"
WHERE "warehouse_id" IS NOT NULL;

ALTER TABLE "nx00_user" DROP CONSTRAINT IF EXISTS "nx00_user_warehouse_id_fkey";
DROP INDEX IF EXISTS "nx00_user_warehouse_id_idx";
ALTER TABLE "nx00_user" DROP COLUMN IF EXISTS "warehouse_id";
