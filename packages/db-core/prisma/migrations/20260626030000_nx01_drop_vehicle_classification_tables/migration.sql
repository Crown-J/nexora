-- 2026-06-26 Hank：零件主檔重構 Step 5
-- 砍車型分類四表（engine / transmission / drivetrain / model_type）。
-- 執行長拍板：車型只留主檔、引擎資訊改自由輸入（engine_code + displacement_cc）、其餘三維不留。

-- 1. 先回填：把現有車型的引擎代碼 / 排氣量從 engine 字典帶進 model scalar 欄位（不丟資料）
UPDATE "nx01_model" m
SET "engine_code"     = e."code",
    "displacement_cc" = e."displacement_cc"
FROM "nx01_engine" e
WHERE m."engine_id" = e."id"
  AND m."engine_id" IS NOT NULL;

-- 2. nx01_model 移除四個外鍵約束 + 欄位
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_engine_id_fkey";
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_transmission_id_fkey";
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_drivetrain_id_fkey";
ALTER TABLE "nx01_model" DROP CONSTRAINT IF EXISTS "nx01_model_model_type_id_fkey";
ALTER TABLE "nx01_model"
  DROP COLUMN IF EXISTS "engine_id",
  DROP COLUMN IF EXISTS "transmission_id",
  DROP COLUMN IF EXISTS "drivetrain_id",
  DROP COLUMN IF EXISTS "model_type_id";

-- 3. DROP 四張字典表 + 其 ID generator / sequence
DROP TABLE IF EXISTS "nx01_engine";
DROP TABLE IF EXISTS "nx01_transmission";
DROP TABLE IF EXISTS "nx01_drivetrain";
DROP TABLE IF EXISTS "nx01_model_type";

DROP FUNCTION IF EXISTS gen_nx01_engine_id();
DROP FUNCTION IF EXISTS gen_nx01_transmission_id();
DROP FUNCTION IF EXISTS gen_nx01_drivetrain_id();
DROP FUNCTION IF EXISTS gen_nx01_model_type_id();

DROP SEQUENCE IF EXISTS "seq_nx01_engine_id";
DROP SEQUENCE IF EXISTS "seq_nx01_transmission_id";
DROP SEQUENCE IF EXISTS "seq_nx01_drivetrain_id";
DROP SEQUENCE IF EXISTS "seq_nx01_model_type_id";
