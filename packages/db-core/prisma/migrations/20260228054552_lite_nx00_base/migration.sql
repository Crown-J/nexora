-- =======================================================
-- NEXORA LITE - NX00 BASE
-- Purpose:
-- - Provide shared DB primitives required by NX00 (and later modules)
-- - gen_*_id() functions for VARCHAR(15) IDs
-- =======================================================

-- Optional: If you plan to use gen_random_uuid() etc.
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: generate next sequence number padded to 7 digits
-- We use one sequence per entity to keep it simple & predictable.

-- NX00_USER
CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USER' || LPAD(nextval('seq_nx00_user_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_ROLE
CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROLE' || LPAD(nextval('seq_nx00_role_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_USER_ROLE
CREATE SEQUENCE IF NOT EXISTS seq_nx00_user_role_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_user_role_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00USRO' || LPAD(nextval('seq_nx00_user_role_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_VIEW
CREATE SEQUENCE IF NOT EXISTS seq_nx00_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00VIEW' || LPAD(nextval('seq_nx00_view_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_ROLE_VIEW
CREATE SEQUENCE IF NOT EXISTS seq_nx00_role_view_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_role_view_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00ROVI' || LPAD(nextval('seq_nx00_role_view_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_PART
CREATE SEQUENCE IF NOT EXISTS seq_nx00_part_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_part_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PART' || LPAD(nextval('seq_nx00_part_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_BRAND
CREATE SEQUENCE IF NOT EXISTS seq_nx00_brand_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_brand_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BRAN' || LPAD(nextval('seq_nx00_brand_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_WAREHOUSE
CREATE SEQUENCE IF NOT EXISTS seq_nx00_warehouse_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_warehouse_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00WARE' || LPAD(nextval('seq_nx00_warehouse_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_LOCATION
CREATE SEQUENCE IF NOT EXISTS seq_nx00_location_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_location_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00LOCA' || LPAD(nextval('seq_nx00_location_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_PARTNER
CREATE SEQUENCE IF NOT EXISTS seq_nx00_partner_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_partner_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00PTNR' || LPAD(nextval('seq_nx00_partner_id')::text, 7, '0');
$$ LANGUAGE sql;

-- NX00_AUDIT_LOG
CREATE SEQUENCE IF NOT EXISTS seq_nx00_audit_log_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_audit_log_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00AULO' || LPAD(nextval('seq_nx00_audit_log_id')::text, 7, '0');
$$ LANGUAGE sql;