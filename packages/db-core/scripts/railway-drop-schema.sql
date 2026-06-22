-- packages/db-core/scripts/railway-drop-schema.sql
-- 2026-06-22 Railway 全清重建：DROP SCHEMA public CASCADE + 重建空 schema
-- 執行長拍板：Railway 上都是沒用的假資料、全清

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
