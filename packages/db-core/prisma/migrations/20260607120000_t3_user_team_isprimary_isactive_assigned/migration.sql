-- packages/db-core/prisma/migrations/20260607120000_t3_user_team_isprimary_isactive_assigned/migration.sql
-- 05 批 T3 2026-06-07：UserTeam 加 5 欄位 + 1 unique constraint
--
-- 範式對齊 nx01_user_role：UserTeam 從「單純 m-n 對應」升級成「軟刪除 + 主組旗標 + 指派紀錄」。
-- 業務語意：
--   - is_primary：主組旗標、每員工至多 1 筆 true（決定 user.hr_department_id 自動帶）
--   - is_active：軟刪除（撤銷後仍保留紀錄）
--   - assigned_at / assigned_by：誰何時指派（稽核追溯）
--   - revoked_at：何時撤銷
-- 同員工同組不可重複指派（unique）。
-- 全 additive、新欄都有 default、0 影響歷史資料。

ALTER TABLE "nx01_user_team"
  ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "assigned_by" VARCHAR(15),
  ADD COLUMN "revoked_at" TIMESTAMP(3);

-- 同員工同組不可重複指派（dev 已驗 0 重複）
CREATE UNIQUE INDEX "nx01_user_team_tenant_id_user_id_team_id_key"
  ON "nx01_user_team"("tenant_id", "user_id", "team_id");
