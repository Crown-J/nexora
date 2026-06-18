-- 執行長 2026-06-18 補 Hana demo 員工欄差異:userNameEn 英文姓名 + twoFaEnabled 兩階段驗證
-- 兩欄都 nullable / default false、現有 user 不受影響

ALTER TABLE "nx01_user" ADD COLUMN "user_name_en" VARCHAR(100);
ALTER TABLE "nx01_user" ADD COLUMN "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false;
