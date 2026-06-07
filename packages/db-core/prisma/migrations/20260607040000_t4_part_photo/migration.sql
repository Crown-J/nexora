-- packages/db-core/prisma/migrations/20260607040000_t4_part_photo/migration.sql
-- 02 第三批 T4 2026-06-07：零件照片子表
--
-- 業務範式：
--   每顆零件最多 5 張、sortNo=0 為主圖（業務員可拖曳重排或設主圖）
--   storageKey 指向 FileUploadService 的 storage（dev local、production 後續換 R2/S3）
--   實際檔案存 .uploads/{tenantId}/part-photo/{yyyy}/{mm}/{uuid}{ext}
--   多租戶隔離由 FileUploadService 強制 tenantId prefix

CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_photo_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_photo_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PPHO' || LPAD(nextval('seq_nx01_part_photo_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_part_photo" (
  "id"            VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_photo_id(),
  "tenant_id"     VARCHAR(15) NOT NULL,
  "part_id"       VARCHAR(15) NOT NULL,
  "storage_key"   VARCHAR(255) NOT NULL,
  "mime_type"     VARCHAR(50) NOT NULL,
  "file_size"     INTEGER NOT NULL,
  "orig_filename" VARCHAR(200),
  "sort_no"       INTEGER NOT NULL DEFAULT 0,
  "uploader_user_id" VARCHAR(15) NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nx01_part_photo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "nx01_part_photo_part_idx"
  ON "nx01_part_photo" ("tenant_id", "part_id", "sort_no");

ALTER TABLE "nx01_part_photo"
  ADD CONSTRAINT "nx01_part_photo_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "nx01_part_photo"
  ADD CONSTRAINT "nx01_part_photo_part_id_fkey"
  FOREIGN KEY ("part_id") REFERENCES "nx01_part" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
