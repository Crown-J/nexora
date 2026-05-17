-- packages/db-core/prisma/migrations/20260520410000_nx10_impl_01_m2_streak_task_templates_seed/migration.sql
-- NX10-IMPL-01 Phase 4 M2：A029 apply-checkin-reward 撈回 — 7 STREAK_D{N} task templates seed
-- 對齊：worklog 主題 1D 揭露 A029 老債（apply-checkin-reward 未建立、TASK-SEED-REFACTOR-01 Step 7 情境 A 決定先不做）
-- 真相揭露：既有 checkin.service 已 wire applyExpChange、但依賴 STREAK_D{N} templates、本軌 seed 補完
--
-- ⚠️ Hank Q-H 自決：因 nx10_task_template.@@unique([code]) 是 global、所以 STREAK_D1~D7 用 system tenant 持有
--                  → checkin.service 需配合改為「忽略 tenantId、純按 code 查」（global code 自然全 tenant 共享）
--                  → 服務層 fix 在後續 commit 配套
--
-- ⚠️ Exp 公式（plan §5 Q-H6 拍板）：
--   STREAK_D1 → +5 Exp (連續 1 天)
--   STREAK_D2 → +5 Exp
--   STREAK_D3 → +5 Exp
--   STREAK_D4 → +5 Exp
--   STREAK_D5 → +10 Exp
--   STREAK_D6 → +10 Exp
--   STREAK_D7 → +20 Exp (週末獎勵 / 連續 7 天 milestone)

INSERT INTO nx10_task_template (tenant_id, code, name, task_cycle, applicable_roles, exp_base, exp_formula, source_module, source_kpi_code, is_system, is_active, created_at, created_by, updated_at, updated_by)
SELECT
  (SELECT id FROM nx99_tenant WHERE id = 'NX99TANT0000000' LIMIT 1),
  x.code, x.name, x.task_cycle, x.applicable_roles, x.exp_base, x.exp_formula, x.source_module, x.source_kpi_code,
  true, true, NOW(), 'SYS', NOW(), 'SYS'
FROM (VALUES
  ('STREAK_D1', '連續簽到第 1 日', 'D', NULL,  5,  '連續第 1 天 +5 Exp',         NULL, NULL),
  ('STREAK_D2', '連續簽到第 2 日', 'D', NULL,  5,  '連續第 2 天 +5 Exp',         NULL, NULL),
  ('STREAK_D3', '連續簽到第 3 日', 'D', NULL,  5,  '連續第 3 天 +5 Exp',         NULL, NULL),
  ('STREAK_D4', '連續簽到第 4 日', 'D', NULL,  5,  '連續第 4 天 +5 Exp',         NULL, NULL),
  ('STREAK_D5', '連續簽到第 5 日', 'D', NULL, 10,  '連續第 5 天 +10 Exp',        NULL, NULL),
  ('STREAK_D6', '連續簽到第 6 日', 'D', NULL, 10,  '連續第 6 天 +10 Exp',        NULL, NULL),
  ('STREAK_D7', '連續簽到第 7 日+', 'D', NULL, 20, '連續第 7 天起每日 +20 Exp', NULL, NULL)
) AS x(code, name, task_cycle, applicable_roles, exp_base, exp_formula, source_module, source_kpi_code)
WHERE EXISTS (SELECT 1 FROM nx99_tenant WHERE id = 'NX99TANT0000000')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- A029 老債撈回完成揭露：
-- - 既有 checkin.service.checkin() 已實作 wire applyExpChange（line 91-99）
-- - 缺的只是 STREAK_D1~D7 task_template seed（本 M2 補完）
-- - 配套：checkin.service 需改為按 code 全 tenant 查（後續 commit）
-- ============================================================
