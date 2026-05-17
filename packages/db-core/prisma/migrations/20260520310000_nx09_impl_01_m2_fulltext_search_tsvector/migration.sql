-- packages/db-core/prisma/migrations/20260520310000_nx09_impl_01_m2_fulltext_search_tsvector/migration.sql
-- NX09-IMPL-01 Phase 1 M2：Postgres FTS tsvector + GIN index + trigger（Crown Q3=b ⭐）
-- 對齊：overview v1.0 §5 + audit-01 §6.2 全文搜尋候選 + plan §3 M2
-- 性質：3 主檔加 tsvector 欄 + trigger 自動更新 + backfill 既有 row
-- 中文分詞：simple（CJK 字元分詞、無需安裝 pg_jieba、Hank Q-H5 拍板）

-- ============================================================
-- 1. ADD tsvector 欄（nullable、純 additive）
-- ============================================================
ALTER TABLE "nx09_km_article"   ADD COLUMN "search_vector" tsvector;
ALTER TABLE "nx09_document"     ADD COLUMN "search_vector" tsvector;
ALTER TABLE "nx09_system_manual" ADD COLUMN "search_vector" tsvector;

-- ============================================================
-- 2. GIN index × 3（FTS query 效能）
-- ============================================================
CREATE INDEX "nx09_km_article_fts_idx"     ON "nx09_km_article"     USING GIN("search_vector");
CREATE INDEX "nx09_document_fts_idx"       ON "nx09_document"       USING GIN("search_vector");
CREATE INDEX "nx09_system_manual_fts_idx"  ON "nx09_system_manual"  USING GIN("search_vector");

-- ============================================================
-- 3. trigger × 3（INSERT / UPDATE 自動寫 tsvector）
-- ============================================================
CREATE OR REPLACE FUNCTION nx09_km_article_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.question, '') || ' ' || COALESCE(NEW.answer, '') || ' ' || COALESCE(NEW.context, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nx09_km_article_search_vector_update
  BEFORE INSERT OR UPDATE OF question, answer, context ON nx09_km_article
  FOR EACH ROW EXECUTE FUNCTION nx09_km_article_search_vector_trigger();

CREATE OR REPLACE FUNCTION nx09_document_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.remark, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nx09_document_search_vector_update
  BEFORE INSERT OR UPDATE OF title, remark ON nx09_document
  FOR EACH ROW EXECUTE FUNCTION nx09_document_search_vector_trigger();

CREATE OR REPLACE FUNCTION nx09_system_manual_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.feature_key, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nx09_system_manual_search_vector_update
  BEFORE INSERT OR UPDATE OF title, content, feature_key ON nx09_system_manual
  FOR EACH ROW EXECUTE FUNCTION nx09_system_manual_search_vector_trigger();

-- ============================================================
-- 4. backfill 既有 row（plan §7 風險 mitigation：tsvector trigger 對既有 row 不寫入）
-- ============================================================
UPDATE nx09_km_article SET search_vector = to_tsvector('simple',
  COALESCE(question, '') || ' ' || COALESCE(answer, '') || ' ' || COALESCE(context, '')
);

UPDATE nx09_document SET search_vector = to_tsvector('simple',
  COALESCE(title, '') || ' ' || COALESCE(remark, '')
);
-- nx09_system_manual 為本軌 M1 新表、無既有 row 需 backfill
