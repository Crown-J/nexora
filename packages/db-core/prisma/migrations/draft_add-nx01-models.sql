-- =============================================
-- NX01-T1：採購模組 Schema
-- Migration 名稱：add-nx01-models
-- ⚠️ 執行順序：NX99-T1 → NX99-T2 → NX01-T1
-- =============================================

-- Sequence
CREATE SEQUENCE IF NOT EXISTS nx01_rfqo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_rfit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poht_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx01_poit_seq START 1;

-- ID 函式（風格對齊現有 gen_nx00_xxx_id()）
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

-- CREATE TABLE、INDEX、FK 由 Prisma migrate 自動產生
-- 請將上方 Sequence + Function 補在 Prisma 產生的 migration.sql 末端

