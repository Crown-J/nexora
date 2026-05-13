-- packages/db-core/prisma/migrations/20260513120000_nx01_10_phonetic_create_2_tables/migration.sql
-- ============================================================================
-- Migration: nx01_10_phonetic_create_2_tables
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-12-IMPL-v2 軌中 commit 1.A（NX01-10 schema 基礎設施）
-- 對應 spec：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0
--
-- 範圍：
--   1. 2 個 sequence + gen_id function
--   2. CREATE TABLE nx01_phonetic_dictionary（全域字典、無 tenantId）
--   3. CREATE TABLE nx01_phonetic_index（每租戶索引、tenant scoped）
--   4. indexes（含 text_pattern_ops、unique）
--   5. FK：phonetic_index → nx99_tenant
--   6. trigger functions（generic、給後續主檔 attach、本軌不 attach）
--
-- 對齊 Crown 拍板 Q3 = C：字典資料空表進、留 A057 後續軌
-- 對齊 Hank 自決 F9：本軌不 attach part/partner trigger、留 A061 後續軌
-- ============================================================================

-- ============================================================================
-- 1. sequences + gen_id functions
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_nx01_phonetic_dictionary_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_phonetic_dictionary_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PHDC' || LPAD(nextval('seq_nx01_phonetic_dictionary_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx01_phonetic_index_id START 1;

CREATE OR REPLACE FUNCTION gen_nx01_phonetic_index_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PHIX' || LPAD(nextval('seq_nx01_phonetic_index_id')::text, 7, '0');
$$ LANGUAGE sql;

-- ============================================================================
-- 2. CREATE TABLE nx01_phonetic_dictionary（全域字典、無 tenantId）
-- ============================================================================

CREATE TABLE "nx01_phonetic_dictionary" (
    "id"                VARCHAR(15) NOT NULL DEFAULT gen_nx01_phonetic_dictionary_id(),
    "character"         VARCHAR(4)  NOT NULL,
    "primary_phonetic"  VARCHAR(10) NOT NULL,
    "alt_phonetics"     TEXT[]      NOT NULL DEFAULT '{}',
    "primary_initial"   VARCHAR(2)  NOT NULL,
    "usage_freq"        INTEGER     NOT NULL DEFAULT 0,
    "is_active"         BOOLEAN     NOT NULL DEFAULT true,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"        VARCHAR(15) NOT NULL,
    "updated_at"        TIMESTAMP(3) NOT NULL,
    "updated_by"        VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_phonetic_dictionary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx01_phonetic_dictionary_character_key"
  ON "nx01_phonetic_dictionary"("character");

CREATE INDEX "nx01_phonetic_dictionary_primary_initial_idx"
  ON "nx01_phonetic_dictionary"("primary_initial");

-- ============================================================================
-- 3. CREATE TABLE nx01_phonetic_index（每租戶索引、tenant scoped）
-- ============================================================================

CREATE TABLE "nx01_phonetic_index" (
    "id"             VARCHAR(15) NOT NULL DEFAULT gen_nx01_phonetic_index_id(),
    "tenant_id"      VARCHAR(15) NOT NULL,
    "source_table"   VARCHAR(50) NOT NULL,
    "source_id"      VARCHAR(15) NOT NULL,
    "source_field"   VARCHAR(50) NOT NULL,
    "source_text"    VARCHAR(500) NOT NULL,
    "phonetic_code"  VARCHAR(50) NOT NULL,
    "phonetic_full"  VARCHAR(200) NOT NULL,
    "is_manual"      BOOLEAN     NOT NULL DEFAULT false,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"     VARCHAR(15) NOT NULL,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    "updated_by"     VARCHAR(15) NOT NULL,

    CONSTRAINT "nx01_phonetic_index_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. indexes
-- ============================================================================

-- 主檔反查 / 同步 unique（規格 §3.1）
CREATE UNIQUE INDEX "nx01_phonetic_index_tenant_table_source_key"
  ON "nx01_phonetic_index"("tenant_id", "source_table", "source_id");

-- Hybrid 階段 1：嚴格前綴匹配主索引（規格 §4.4）
CREATE INDEX "nx01_phonetic_index_tenant_code_idx"
  ON "nx01_phonetic_index"("tenant_id", "phonetic_code");

-- Hybrid 階段 2：全前綴匹配（PostgreSQL LIKE 'prefix%' 用 text_pattern_ops、規格 §4.4）
CREATE INDEX "nx01_phonetic_index_tenant_code_text_pattern_idx"
  ON "nx01_phonetic_index"("tenant_id", "phonetic_code" text_pattern_ops);

-- ============================================================================
-- 5. FK：phonetic_index → nx99_tenant
-- ============================================================================

ALTER TABLE "nx01_phonetic_index"
  ADD CONSTRAINT "nx01_phonetic_index_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 6. trigger function: phonetic_index_sync (generic、給後續主檔 attach)
--    對齊規格 §3.2「is_manual=true 保護人工修正」+ §5.6「缺字容錯」
--    本軌僅建函式、不 attach 主檔（A061 後續軌）
-- ============================================================================

CREATE OR REPLACE FUNCTION phonetic_index_sync(
  p_tenant_id    VARCHAR,
  p_source_table VARCHAR,
  p_source_id    VARCHAR,
  p_source_field VARCHAR,
  p_source_text  TEXT,
  p_actor_id     VARCHAR
) RETURNS VOID AS $$
DECLARE
  v_phonetic_code TEXT := '';
  v_phonetic_full TEXT := '';
  v_char          TEXT;
  v_dict          RECORD;
  v_is_manual     BOOLEAN;
BEGIN
  -- 檢查既有 is_manual flag（手動改後 trigger 不再覆蓋、規格 §5.2 / §3.2）
  SELECT is_manual INTO v_is_manual
    FROM nx01_phonetic_index
    WHERE tenant_id = p_tenant_id
      AND source_table = p_source_table
      AND source_id = p_source_id;

  IF FOUND AND v_is_manual THEN
    -- 跳過、保留人工修正
    RETURN;
  END IF;

  -- 逐字組注音碼（缺字留空白容錯、規格 §5.6）
  FOR v_char IN SELECT regexp_split_to_table(p_source_text, '') LOOP
    SELECT primary_phonetic, primary_initial INTO v_dict
      FROM nx01_phonetic_dictionary
      WHERE character = v_char AND is_active = true;
    IF FOUND THEN
      v_phonetic_code := v_phonetic_code || v_dict.primary_initial;
      v_phonetic_full := v_phonetic_full || v_dict.primary_phonetic || ' ';
    ELSE
      -- 缺字佔位（不阻塞主檔操作、SYSADMIN 後續補字典）
      v_phonetic_code := v_phonetic_code || ' ';
      v_phonetic_full := v_phonetic_full || '? ';
    END IF;
  END LOOP;

  -- UPSERT phonetic_index
  INSERT INTO nx01_phonetic_index (
    tenant_id, source_table, source_id, source_field,
    source_text, phonetic_code, phonetic_full, is_manual,
    created_by, updated_by, updated_at
  ) VALUES (
    p_tenant_id, p_source_table, p_source_id, p_source_field,
    p_source_text, RTRIM(v_phonetic_code), RTRIM(v_phonetic_full), false,
    p_actor_id, p_actor_id, CURRENT_TIMESTAMP
  )
  ON CONFLICT (tenant_id, source_table, source_id) DO UPDATE
    SET source_field  = EXCLUDED.source_field,
        source_text   = EXCLUDED.source_text,
        phonetic_code = EXCLUDED.phonetic_code,
        phonetic_full = EXCLUDED.phonetic_full,
        updated_by    = EXCLUDED.updated_by,
        updated_at    = CURRENT_TIMESTAMP
    WHERE nx01_phonetic_index.is_manual = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. trigger function: phonetic_index_clear (主檔 DELETE 時呼叫)
-- ============================================================================

CREATE OR REPLACE FUNCTION phonetic_index_clear(
  p_tenant_id    VARCHAR,
  p_source_table VARCHAR,
  p_source_id    VARCHAR
) RETURNS VOID AS $$
BEGIN
  DELETE FROM nx01_phonetic_index
    WHERE tenant_id = p_tenant_id
      AND source_table = p_source_table
      AND source_id = p_source_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 完成：NX01-10 schema 基礎設施落地
-- 後續軌：
--   A057：字典資料匯入（Crown 拍 License 後、教育部國語辭典 / Unicode CJK）
--   A061：主檔 trigger attach（nx01_part / nx01_partner / nx01_user）
-- ============================================================================
