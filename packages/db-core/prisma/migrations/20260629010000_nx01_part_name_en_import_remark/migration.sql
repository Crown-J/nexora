-- 2026-06-29 Hank：恆迎零件匯入加兩欄（additive、選填）
-- nx01_part 加 name_en（英文品名 col5）+ import_remark（原始備註 col39 原文保留）
-- 對應 commit 45040566。本機已直接 ALTER 套用、此檔補正規遷移、兩端 _prisma_migrations 登記。

ALTER TABLE "nx01_part"
ADD COLUMN "name_en" VARCHAR(50),
ADD COLUMN "import_remark" TEXT;
