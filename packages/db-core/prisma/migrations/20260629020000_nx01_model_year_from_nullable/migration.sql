-- 2026-06-29 Hank：車型起始年份改可空（恆迎匯入有車型無明確起始年）
-- nx01_model.model_year_from DROP NOT NULL。對應 commit bdef1561。
-- 本機已直接 ALTER 套用、此檔補正規遷移、兩端 _prisma_migrations 登記。

ALTER TABLE "nx01_model"
ALTER COLUMN "model_year_from" DROP NOT NULL;
