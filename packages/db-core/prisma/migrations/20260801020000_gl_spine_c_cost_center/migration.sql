-- packages/db-core/prisma/migrations/20260801020000_gl_spine_c_cost_center/migration.sql
-- 總帳脊椎 C 階段 C1：據點 → 成本中心關聯（2026-08-01）
--
-- ⭐ 為什麼非有不可：所有存貨相關的分錄行（進貨／調撥／盤點盈虧／報廢／保固出庫）
--    在過帳規則上都要求填成本中心，但這些單據上沒有業務員、只有倉庫。
--    倉庫 → 據點 已經是必填關聯，缺的就是據點 → 成本中心這一條。
--    不補這條，庫存接總帳的第一張單就會卡在「需要部門（成本中心），呼叫端未提供」。
--
-- ⚠ 可空（nullable）：沒設定的據點退回既有做法，不擋任何既有流程。
-- ⚠ ON DELETE SET NULL：部門本來就走停用不刪除，這裡只是防呆。

ALTER TABLE "nx01_site" ADD COLUMN "cost_center_dept_id" VARCHAR(15);

ALTER TABLE "nx01_site" ADD CONSTRAINT "nx01_site_cost_center_dept_id_fkey"
  FOREIGN KEY ("cost_center_dept_id") REFERENCES "nx01_department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON COLUMN "nx01_site"."cost_center_dept_id" IS
  '對應成本中心（FK nx01_department）。會計政策第 11 項「不分攤、看店的貢獻」＝損益按店切，庫存類單據的成本中心走 倉庫 → 據點 → 這一欄。可空：未設定則退回既有做法。';
