-- Prisma @updatedAt 會在應用程式寫入時帶值；手動 INSERT 時 updated_at 先前未設 DB DEFAULT，導致須自行填寫。
-- 對齊 nx00_user 等表：INSERT 省略欄位時由資料庫帶入時間戳。

ALTER TABLE "nx00_bulletin" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "nx00_calendar_event" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
