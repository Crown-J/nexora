-- NEXORA: ID 序號與 gen_*_id()（對齊 docs/spec Table ID 範例前綴）
-- 由 scripts/generate-gen-id-sql.mjs 產生；置於 baseline migration 最前段

CREATE SEQUENCE IF NOT EXISTS seq_nx01_audit_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_audit_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01AULO' || LPAD(nextval('seq_nx01_audit_log_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_brand_code_rule_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_brand_code_rule_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BCOR' || LPAD(nextval('seq_nx01_brand_code_rule_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_bulletin_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_bulletin_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01BULL' || LPAD(nextval('seq_nx01_bulletin_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_calendar_event_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_calendar_event_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01CAEV' || LPAD(nextval('seq_nx01_calendar_event_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_car_brand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_car_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01CABR' || LPAD(nextval('seq_nx01_car_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_country_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_country_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01COUN' || LPAD(nextval('seq_nx01_country_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_currency_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_currency_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01CURR' || LPAD(nextval('seq_nx01_currency_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_customer_grade_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_customer_grade_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01CUGR' || LPAD(nextval('seq_nx01_customer_grade_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_department_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_department_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01DEPT' || LPAD(nextval('seq_nx01_department_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_discount_code_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_discount_code_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01DISC' || LPAD(nextval('seq_nx01_discount_code_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_kpi_record_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_kpi_record_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01KPIR' || LPAD(nextval('seq_nx01_kpi_record_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_kpi_target_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_kpi_target_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01KPIG' || LPAD(nextval('seq_nx01_kpi_target_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_kpi_template_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_kpi_template_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01KPIT' || LPAD(nextval('seq_nx01_kpi_template_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_location_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_location_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01LOCA' || LPAD(nextval('seq_nx01_location_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_brand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PABR' || LPAD(nextval('seq_nx01_part_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_group_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_group_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PAGR' || LPAD(nextval('seq_nx01_part_group_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PART' || LPAD(nextval('seq_nx01_part_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_part_relation_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_relation_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PARE' || LPAD(nextval('seq_nx01_part_relation_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_partner_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_partner_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PTNR' || LPAD(nextval('seq_nx01_partner_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01ROLE' || LPAD(nextval('seq_nx01_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_role_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_role_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01ROVI' || LPAD(nextval('seq_nx01_role_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_team_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_team_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01TEAM' || LPAD(nextval('seq_nx01_team_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_user_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01USER' || LPAD(nextval('seq_nx01_user_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_user_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01USRO' || LPAD(nextval('seq_nx01_user_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_team_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_user_team_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01USTM' || LPAD(nextval('seq_nx01_user_team_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_user_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_user_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01USWA' || LPAD(nextval('seq_nx01_user_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01VIEW' || LPAD(nextval('seq_nx01_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01WARE' || LPAD(nextval('seq_nx01_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_warehouse_type_id START 1;
CREATE OR REPLACE FUNCTION gen_nx01_warehouse_type_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01WHTP' || LPAD(nextval('seq_nx01_warehouse_type_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_demand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_demand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02DMND' || LPAD(nextval('seq_nx02_demand_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_po_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_po_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02POHT' || LPAD(nextval('seq_nx02_po_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_po_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_po_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02POIT' || LPAD(nextval('seq_nx02_po_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_pr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_pr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02PRHT' || LPAD(nextval('seq_nx02_pr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_pr_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_pr_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02PRIT' || LPAD(nextval('seq_nx02_pr_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rfq_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_rfq_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RFHT' || LPAD(nextval('seq_nx02_rfq_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rfq_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_rfq_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RFIT' || LPAD(nextval('seq_nx02_rfq_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_rr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RRHT' || LPAD(nextval('seq_nx02_rr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rr_import_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_rr_import_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RRIM' || LPAD(nextval('seq_nx02_rr_import_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_rr_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_rr_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02RRIT' || LPAD(nextval('seq_nx02_rr_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_ti_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_ti_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02TIHT' || LPAD(nextval('seq_nx02_ti_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx02_ti_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx02_ti_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX02TIIT' || LPAD(nextval('seq_nx02_ti_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_auto_replenish_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_auto_replenish_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03AURE' || LPAD(nextval('seq_nx03_auto_replenish_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_init_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_init_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03INHD' || LPAD(nextval('seq_nx03_init_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_init_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_init_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03INIT' || LPAD(nextval('seq_nx03_init_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_parcel_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_parcel_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PARC' || LPAD(nextval('seq_nx03_parcel_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_part_stock_setting_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_part_stock_setting_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PSST' || LPAD(nextval('seq_nx03_part_stock_setting_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_pk_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_pk_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PKHD' || LPAD(nextval('seq_nx03_pk_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_pk_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_pk_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PKIT' || LPAD(nextval('seq_nx03_pk_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_pl_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_pl_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PLHD' || LPAD(nextval('seq_nx03_pl_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_pl_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_pl_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03PLIT' || LPAD(nextval('seq_nx03_pl_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_shortage_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_shortage_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03SHOR' || LPAD(nextval('seq_nx03_shortage_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_st_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_st_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STHD' || LPAD(nextval('seq_nx03_st_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_st_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_st_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STIT' || LPAD(nextval('seq_nx03_st_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_stock_balance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_stock_balance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STBL' || LPAD(nextval('seq_nx03_stock_balance_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_stock_ledger_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_stock_ledger_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STLE' || LPAD(nextval('seq_nx03_stock_ledger_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_stock_take_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_stock_take_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STTK' || LPAD(nextval('seq_nx03_stock_take_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx03_stock_take_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx03_stock_take_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX03STTI' || LPAD(nextval('seq_nx03_stock_take_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_quote_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_quote_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04QTHD' || LPAD(nextval('seq_nx04_quote_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_quote_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_quote_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04QTIT' || LPAD(nextval('seq_nx04_quote_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_so_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_so_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04SOHD' || LPAD(nextval('seq_nx04_so_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_so_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_so_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04SOIT' || LPAD(nextval('seq_nx04_so_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_sr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_sr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04SRHD' || LPAD(nextval('seq_nx04_sr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx04_sr_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx04_sr_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX04SRIT' || LPAD(nextval('seq_nx04_sr_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_account_code_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_account_code_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ACCD' || LPAD(nextval('seq_nx05_account_code_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_allowance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_allowance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ALOW' || LPAD(nextval('seq_nx05_allowance_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_allowance_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_allowance_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05AWIT' || LPAD(nextval('seq_nx05_allowance_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_ap_ledger_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_ap_ledger_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05APLE' || LPAD(nextval('seq_nx05_ap_ledger_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_ar_ledger_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_ar_ledger_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05ARLE' || LPAD(nextval('seq_nx05_ar_ledger_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_closing_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_closing_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05CLOS' || LPAD(nextval('seq_nx05_closing_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_note_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_note_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05NOTE' || LPAD(nextval('seq_nx05_note_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx05_paylog_id START 1;
CREATE OR REPLACE FUNCTION gen_nx05_paylog_id()
RETURNS VARCHAR AS $$
  SELECT 'NX05PAYL' || LPAD(nextval('seq_nx05_paylog_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx06_dn_id START 1;
CREATE OR REPLACE FUNCTION gen_nx06_dn_id()
RETURNS VARCHAR AS $$
  SELECT 'NX06DNHD' || LPAD(nextval('seq_nx06_dn_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx06_dn_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx06_dn_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX06DNIT' || LPAD(nextval('seq_nx06_dn_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx06_dn_stop_id START 1;
CREATE OR REPLACE FUNCTION gen_nx06_dn_stop_id()
RETURNS VARCHAR AS $$
  SELECT 'NX06DNST' || LPAD(nextval('seq_nx06_dn_stop_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_attendance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_attendance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07ATND' || LPAD(nextval('seq_nx07_attendance_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_ip_whitelist_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_ip_whitelist_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07IPWL' || LPAD(nextval('seq_nx07_ip_whitelist_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_leave_balance_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_leave_balance_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07LVBL' || LPAD(nextval('seq_nx07_leave_balance_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_leave_request_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_leave_request_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07LVRQ' || LPAD(nextval('seq_nx07_leave_request_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_leave_type_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_leave_type_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07LVTP' || LPAD(nextval('seq_nx07_leave_type_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_overtime_request_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_overtime_request_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07OTRQ' || LPAD(nextval('seq_nx07_overtime_request_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_salary_component_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_salary_component_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SLCP' || LPAD(nextval('seq_nx07_salary_component_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_salary_record_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_salary_record_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SLRC' || LPAD(nextval('seq_nx07_salary_record_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_salary_record_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_salary_record_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SLRI' || LPAD(nextval('seq_nx07_salary_record_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_salary_setting_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_salary_setting_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SLST' || LPAD(nextval('seq_nx07_salary_setting_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_schedule_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_schedule_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SCHD' || LPAD(nextval('seq_nx07_schedule_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_schedule_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_schedule_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SCIT' || LPAD(nextval('seq_nx07_schedule_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx07_shift_type_id START 1;
CREATE OR REPLACE FUNCTION gen_nx07_shift_type_id()
RETURNS VARCHAR AS $$
  SELECT 'NX07SHFT' || LPAD(nextval('seq_nx07_shift_type_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_daily_report_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_daily_report_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08DRPT' || LPAD(nextval('seq_nx08_daily_report_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_finance_cache_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_finance_cache_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08FICA' || LPAD(nextval('seq_nx08_finance_cache_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_hr_cache_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_hr_cache_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08HRCA' || LPAD(nextval('seq_nx08_hr_cache_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_inventory_cache_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_inventory_cache_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08IVCA' || LPAD(nextval('seq_nx08_inventory_cache_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_monthly_report_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_monthly_report_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08MRPT' || LPAD(nextval('seq_nx08_monthly_report_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_pestel_record_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_pestel_record_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08PEST' || LPAD(nextval('seq_nx08_pestel_record_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_purchase_cache_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_purchase_cache_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08PUCA' || LPAD(nextval('seq_nx08_purchase_cache_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_sales_cache_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_sales_cache_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08SLCA' || LPAD(nextval('seq_nx08_sales_cache_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx08_swot_record_id START 1;
CREATE OR REPLACE FUNCTION gen_nx08_swot_record_id()
RETURNS VARCHAR AS $$
  SELECT 'NX08SWOT' || LPAD(nextval('seq_nx08_swot_record_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_document_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_document_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09DOCU' || LPAD(nextval('seq_nx09_document_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_document_version_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_document_version_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09DVER' || LPAD(nextval('seq_nx09_document_version_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_km_article_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_km_article_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09ARTI' || LPAD(nextval('seq_nx09_km_article_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_km_article_tag_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_km_article_tag_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09KMTL' || LPAD(nextval('seq_nx09_km_article_tag_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_km_feedback_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_km_feedback_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09KMFB' || LPAD(nextval('seq_nx09_km_feedback_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_km_tag_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_km_tag_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09KMTG' || LPAD(nextval('seq_nx09_km_tag_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_meeting_action_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_meeting_action_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09MTAC' || LPAD(nextval('seq_nx09_meeting_action_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_meeting_attendee_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_meeting_attendee_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09MTAT' || LPAD(nextval('seq_nx09_meeting_attendee_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_meeting_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_meeting_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09MTNG' || LPAD(nextval('seq_nx09_meeting_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx09_meeting_minutes_id START 1;
CREATE OR REPLACE FUNCTION gen_nx09_meeting_minutes_id()
RETURNS VARCHAR AS $$
  SELECT 'NX09MTMI' || LPAD(nextval('seq_nx09_meeting_minutes_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx98_doc_link_id START 1;
CREATE OR REPLACE FUNCTION gen_nx98_doc_link_id()
RETURNS VARCHAR AS $$
  SELECT 'NX98DOCL' || LPAD(nextval('seq_nx98_doc_link_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_plan_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_plan_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99PLAN' || LPAD(nextval('seq_nx99_plan_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_product_module_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_product_module_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99PRMO' || LPAD(nextval('seq_nx99_product_module_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_product_module_map_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_product_module_map_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99PRMM' || LPAD(nextval('seq_nx99_product_module_map_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_release_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_release_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99RELE' || LPAD(nextval('seq_nx99_release_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_release_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_release_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99REIT' || LPAD(nextval('seq_nx99_release_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_subscription_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_subscription_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99SUBS' || LPAD(nextval('seq_nx99_subscription_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_subscription_item_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_subscription_item_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99SUIT' || LPAD(nextval('seq_nx99_subscription_item_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx99_tenant_id START 1;
CREATE OR REPLACE FUNCTION gen_nx99_tenant_id()
RETURNS VARCHAR AS $$
  SELECT 'NX99TANT' || LPAD(nextval('seq_nx99_tenant_id')::text, 7, '0');
$$ LANGUAGE sql;
