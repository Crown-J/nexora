-- 2026-06-22 Hank：員工主要倉庫旗標
-- nx01_user_warehouse 加 is_primary BOOL NOT NULL DEFAULT false
-- 範式同 nx01_user_role.is_primary（schema 層無 partial unique、service 層守唯一）
-- 業務語意（執行長拍板）：員工可多歸倉、但要能指定一個主要倉
-- 點收快：新欄位有預設值、現有資料自動帶 false、不需 backfill

ALTER TABLE "nx01_user_warehouse"
ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false;
