-- packages/db-core/prisma/migrations/20260429120000_nx08_drop_monthly_report/migration.sql
--
-- TASK-NX08-MONTHLY-REPORT-CLEANUP
-- Crown 拍 A：刪 nx08_monthly_report 表（schema 對齊行為）
-- 詳見 docs/nx08/worklog.md 主題 3、A030 已登記 system-architecture §G.1
--
-- 行為驗證：
--   monthly-report.service.ts list/summary 兩 endpoint 都 read nx01_kpi_record
--   完全不查 nx08_monthly_report 表（schema vs 行為不一致 v7_baseline 留下）
--   刪表後 service 行為不變、未來月報慢用 cache 解、不重啟用此表
--
-- 涉及物件：
--   - 表 nx08_monthly_report（含 unique index、tenant FK、user FK 全 CASCADE drop）
--   - ID gen function gen_nx08_monthly_report_id()
--   - sequence seq_nx08_monthly_report_id

DROP TABLE IF EXISTS "nx08_monthly_report" CASCADE;

DROP FUNCTION IF EXISTS gen_nx08_monthly_report_id();

DROP SEQUENCE IF EXISTS seq_nx08_monthly_report_id;
