-- 執行長 2026-06-18 補 Hana demo 員工欄差異:emergencyRelation 緊急聯絡人關係
-- nullable / VARCHAR(20)、現有 user 不受影響

ALTER TABLE "nx01_user" ADD COLUMN "emergency_relation" VARCHAR(20);
