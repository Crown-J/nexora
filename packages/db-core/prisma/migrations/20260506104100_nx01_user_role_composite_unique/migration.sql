-- TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01
-- nx01_user_role 補 composite unique（NX01-02 §3.1 防重複指派）
--
-- 變更：
--   1. ADD UNIQUE INDEX (tenant_id, user_id, role_id)
--   防止同 tenant 內、同 user 對同 role 多筆 active 指派

-- CreateIndex
CREATE UNIQUE INDEX "nx01_user_role_tenant_id_user_id_role_id_key" ON "nx01_user_role"("tenant_id", "user_id", "role_id");
