-- 清空零件主檔及所有外鍵指向 nx00_part 的資料（與 migration 20260406120000 之 TRUNCATE 效果相同）
-- 使用方式（例）：psql $DATABASE_URL -f prisma/scripts/truncate-nx00-part.sql
TRUNCATE TABLE "nx00_part" CASCADE;
