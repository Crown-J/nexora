-- 修正 nx08 日報／月報唯一鍵：原僅 report_date / year_month 無租戶與人員，與規格「每人每日／每人每月一筆」不符
DROP INDEX IF EXISTS "nx08_daily_report_report_date_key";
CREATE UNIQUE INDEX "nx08_daily_report_tenant_id_user_id_report_date_key"
  ON "nx08_daily_report" ("tenant_id", "user_id", "report_date");

DROP INDEX IF EXISTS "nx08_monthly_report_year_month_key";
CREATE UNIQUE INDEX "nx08_monthly_report_tenant_id_user_id_year_month_key"
  ON "nx08_monthly_report" ("tenant_id", "user_id", "year_month");
