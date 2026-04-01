-- Baseline: PostgreSQL sequences + gen_*_id() used by @default(dbgenerated(...)) in schema.prisma
-- Applied at the start of the init migration (before CREATE TABLE).

-- =======================================================
-- NX00
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USER' || LPAD(nextval('seq_nx00_user_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROLE' || LPAD(nextval('seq_nx00_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USRO' || LPAD(nextval('seq_nx00_user_role_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00VIEW' || LPAD(nextval('seq_nx00_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROVI' || LPAD(nextval('seq_nx00_role_view_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PART' || LPAD(nextval('seq_nx00_part_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_brand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BRAN' || LPAD(nextval('seq_nx00_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00WARE' || LPAD(nextval('seq_nx00_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_location_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_location_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00LOCA' || LPAD(nextval('seq_nx00_location_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_partner_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_partner_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PTNR' || LPAD(nextval('seq_nx00_partner_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_audit_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_audit_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00AULO' || LPAD(nextval('seq_nx00_audit_log_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =======================================================
-- NX99 & NX01
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx99_tant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_subs_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_suit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmm_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfqo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poht_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poit_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx99_tant_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_tant_seq');
  RETURN 'NX99TANT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_plan_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_plan_seq');
  RETURN 'NX99PLAN' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_subs_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_subs_seq');
  RETURN 'NX99SUBS' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_suit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_suit_seq');
  RETURN 'NX99SUIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_prmo_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_prmo_seq');
  RETURN 'NX99PRMO' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx99_prmm_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx99_prmm_seq');
  RETURN 'NX99PRMM' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_rfqo_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rfqo_seq');
  RETURN 'NX01RFQO' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_rfit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_rfit_seq');
  RETURN 'NX01RFIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_poht_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_poht_seq');
  RETURN 'NX01POHT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx01_poit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx01_poit_seq');
  RETURN 'NX01POIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- =======================================================
-- NX07 & NX08
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx07_quote_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx07_quote_item_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx08_sales_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx08_sales_order_item_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx07_quote_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx07_quote_seq');
  RETURN 'NX07QUOT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx07_quote_item_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx07_quote_item_seq');
  RETURN 'NX07QITM' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx08_sales_order_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx08_sales_order_seq');
  RETURN 'NX08SORD' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx08_sales_order_item_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx08_sales_order_item_seq');
  RETURN 'NX08SOIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- =======================================================
-- NX09
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx09_stock_balance_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx09_stock_txn_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx09_stock_balance_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx09_stock_balance_seq');
  RETURN 'NX09SBAL' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx09_stock_txn_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx09_stock_txn_seq');
  RETURN 'NX09STXN' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- =======================================================
-- NX02～NX06
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx02_dept_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx03_emp_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx04_unit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx05_cat_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx06_prod_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx02_dept_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx02_dept_seq');
  RETURN 'NX02DEPT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx03_emp_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx03_emp_seq');
  RETURN 'NX03EMPL' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx04_unit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx04_unit_seq');
  RETURN 'NX04UNIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx05_cat_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx05_cat_seq');
  RETURN 'NX05CAT' || LPAD(seq_val::TEXT, 8, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx06_prod_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx06_prod_seq');
  RETURN 'NX06PROD' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- =======================================================
-- NX00 首頁：公告 / 行事曆
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx00_bull_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bull_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BULL' || LPAD(nextval('seq_nx00_bull_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_caev_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_caev_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CAEV' || LPAD(nextval('seq_nx00_caev_id')::text, 7, '0');
$$ LANGUAGE sql;

-- =======================================================
-- NX00 docs/nx00_field.csv：國家／幣別／料號規則／零件關聯
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS seq_nx00_coun_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_coun_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00COUN' || LPAD(nextval('seq_nx00_coun_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_curr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_curr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CURR' || LPAD(nextval('seq_nx00_curr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_bcor_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bcor_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BCOR' || LPAD(nextval('seq_nx00_bcor_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pare_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pare_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PARE' || LPAD(nextval('seq_nx00_pare_id')::text, 7, '0');
$$ LANGUAGE sql;
