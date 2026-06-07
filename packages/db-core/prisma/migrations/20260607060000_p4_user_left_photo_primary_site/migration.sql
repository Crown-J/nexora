-- packages/db-core/prisma/migrations/20260607060000_p4_user_left_photo_primary_site/migration.sql
-- 02 第四批 軌 1 2026-06-07：使用者基本資料三欄位
--   1) leftAt 離職日期（Date?、留空=在職）
--   2) 大頭貼 4 欄（photoStorageKey / photoMimeType / photoFileSize / photoOrigFilename、單張、走 FileUploadService）
--   3) primarySiteId 主要據點（forward 視角、與 nx01_user_warehouse 多倉衛星並存）
-- 全部 additive、新欄都 nullable、0 影響歷史資料。

ALTER TABLE "nx01_user"
  ADD COLUMN "left_at" DATE,
  ADD COLUMN "photo_storage_key" VARCHAR(255),
  ADD COLUMN "photo_mime_type" VARCHAR(50),
  ADD COLUMN "photo_file_size" INTEGER,
  ADD COLUMN "photo_orig_filename" VARCHAR(200),
  ADD COLUMN "primary_site_id" VARCHAR(15);

ALTER TABLE "nx01_user"
  ADD CONSTRAINT "nx01_user_primary_site_id_fkey"
  FOREIGN KEY ("primary_site_id") REFERENCES "nx01_site"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
