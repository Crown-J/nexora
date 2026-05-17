-- packages/db-core/prisma/migrations/20260520400000_nx10_impl_01_m1_medal_and_task_seed/migration.sql
-- NX10-IMPL-01 Phase 1 M1：20 medal levels + 5 TaskTemplate 範例 system seed
-- 對齊：overview v0.1.0 §4 + audit-01 §6.2 + plan §3 M1
-- 性質：純 INSERT seed、0 ALTER schema、ON CONFLICT 冪等
-- Hank Q-H4 自決：SQL CROSS JOIN nx99_tenant 跨租戶 idempotent insert
--
-- ⚠️ medal_level 5 tier × 4 rank = 20 levels（修正 Crown 記憶 16 vs schema 真實 20）
-- ⚠️ Crown overview v0.1.0 §4.1 對照表確認

-- ============================================================
-- 1. 20 medal levels seed（per-tenant、unique tenant_id + level_code）
-- ============================================================

INSERT INTO nx10_medal_level (tenant_id, level_code, level_name, tier, rank, sort_no, exp_threshold, is_active, created_at, created_by, updated_at, updated_by)
SELECT t.id, x.level_code, x.level_name, x.tier, x.rank, x.sort_no, x.exp_threshold, true, NOW(), 'SYS', NOW(), 'SYS'
FROM nx99_tenant t
CROSS JOIN (VALUES
  ('BRONZE_IV',   '銅 IV',    'BRONZE',   4,  1,      0),
  ('BRONZE_III',  '銅 III',   'BRONZE',   3,  2,    100),
  ('BRONZE_II',   '銅 II',    'BRONZE',   2,  3,    300),
  ('BRONZE_I',    '銅 I',     'BRONZE',   1,  4,    600),
  ('SILVER_IV',   '銀 IV',    'SILVER',   4,  5,   1000),
  ('SILVER_III',  '銀 III',   'SILVER',   3,  6,   1600),
  ('SILVER_II',   '銀 II',    'SILVER',   2,  7,   2500),
  ('SILVER_I',    '銀 I',     'SILVER',   1,  8,   3700),
  ('GOLD_IV',     '金 IV',    'GOLD',     4,  9,   5300),
  ('GOLD_III',    '金 III',   'GOLD',     3, 10,   7500),
  ('GOLD_II',     '金 II',    'GOLD',     2, 11,  10500),
  ('GOLD_I',      '金 I',     'GOLD',     1, 12,  14500),
  ('PLAT_IV',     '白金 IV',  'PLATINUM', 4, 13,  20000),
  ('PLAT_III',    '白金 III', 'PLATINUM', 3, 14,  27500),
  ('PLAT_II',     '白金 II',  'PLATINUM', 2, 15,  37500),
  ('PLAT_I',      '白金 I',   'PLATINUM', 1, 16,  50000),
  ('DIA_IV',      '鑽 IV',    'DIAMOND',  4, 17,  65000),
  ('DIA_III',     '鑽 III',   'DIAMOND',  3, 18,  80000),
  ('DIA_II',      '鑽 II',    'DIAMOND',  2, 19,  92000),
  ('DIA_I',       '鑽 I',     'DIAMOND',  1, 20, 100000)
) AS x(level_code, level_name, tier, rank, sort_no, exp_threshold)
ON CONFLICT (tenant_id, level_code) DO NOTHING;

-- ============================================================
-- 2. 5 TaskTemplate 系統範本 seed（global code unique、用系統 tenant 持有）
-- 對應 5 任務 cycle：D=每日 / W=每週 / M=每月 / Q=季度 / O=里程碑
-- ============================================================

INSERT INTO nx10_task_template (tenant_id, code, name, task_cycle, applicable_roles, exp_base, exp_formula, source_module, source_kpi_code, is_system, is_active, created_at, created_by, updated_at, updated_by)
SELECT
  (SELECT id FROM nx99_tenant WHERE id = 'NX99TANT0000000' LIMIT 1),
  x.code, x.name, x.task_cycle, x.applicable_roles, x.exp_base, x.exp_formula, x.source_module, x.source_kpi_code,
  true, true, NOW(), 'SYS', NOW(), 'SYS'
FROM (VALUES
  ('DAILY_CHECKIN',         '每日簽到',           'D', NULL,         5,    '固定 +5 Exp（連續簽到累進：7 天 +20 / 30 天 +50 / 100 天 +200）', NULL,    NULL),
  ('WEEKLY_SALES_KPI',      '週銷售 KPI 達成',     'W', 'SALES',     100,   '達成率（0~150%）× 100 Exp 上限 150',                              'NX04',  'WEEKLY_SALES'),
  ('MONTHLY_GOAL',          '月度業績目標',        'M', 'SALES,OWNER', 500, '達成率（0~150%）× 500 Exp 上限 750',                              'NX04',  'MONTHLY_SALES'),
  ('QUARTERLY_PERF',        '季度績效評等',        'Q', NULL,         2000, '績效等級 S/A/B/C → 2000/1500/1000/500 Exp',                       'NX07',  'QUARTERLY_KPI'),
  ('MILESTONE_FIRST_SO',    '首單成就（一次性）',  'O', 'SALES',      50,   '固定 +50 Exp（一次性、業務員第一筆 SO）',                          'NX04',  NULL)
) AS x(code, name, task_cycle, applicable_roles, exp_base, exp_formula, source_module, source_kpi_code)
WHERE EXISTS (SELECT 1 FROM nx99_tenant WHERE id = 'NX99TANT0000000')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 揭露：
-- - medal_level 跨所有 tenant insert（per-tenant 自有 20 levels）
-- - task_template 走系統 tenant（code global unique、所有 tenant 共享系統範本）
-- - 新 tenant 加入時：medal_level 需後續軌 trigger or application 補（本軌 backfill 既有 4 tenant）
-- ============================================================
