-- MW1 baseline: PostgreSQL sequences + gen_*_id() for @default(dbgenerated(...)) in schema.prisma
-- (NX00 + NX99 only; no NX01-NX06)

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

CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USWA' || LPAD(nextval('seq_nx00_user_warehouse_id')::text, 7, '0');
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

CREATE SEQUENCE IF NOT EXISTS seq_nx00_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PART' || LPAD(nextval('seq_nx00_part_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pabr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PABR' || LPAD(nextval('seq_nx00_pabr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_cabr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_cabr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CABR' || LPAD(nextval('seq_nx00_cabr_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_pagr_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_pagr_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PAGR' || LPAD(nextval('seq_nx00_pagr_id')::text, 7, '0');
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
-- NX99
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS nx99_tant_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_subs_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_suit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_prmm_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_rele_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx99_reit_seq START 1;

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

CREATE OR REPLACE FUNCTION gen_nx99_rele_id()
RETURNS VARCHAR AS $$ SELECT 'NX99RELE' || LPAD(nextval('nx99_rele_seq')::text, 7, '0'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION gen_nx99_reit_id()
RETURNS VARCHAR AS $$ SELECT 'NX99REIT' || LPAD(nextval('nx99_reit_seq')::text, 7, '0'); $$ LANGUAGE sql;
