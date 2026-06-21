-- packages/db-core/prisma/migrations/20260621000000_add_user_job_title_cytic/migration.sql
-- CYTIC 開戶 2026-06-21：nx01_user 加 jobTitle 純文字欄
-- 用途：純顯示用、不掛權限
-- 範式：恆迎範例 - 負責人 / 股東 / 業務員 / 會計 / 倉管員 / 外務員 / 採購助理
-- v1.2 FU-07 拍板「業務角色由 OWNER 從零建」不變、本欄不取代 role

ALTER TABLE nx01_user ADD COLUMN IF NOT EXISTS job_title VARCHAR(20);
