-- packages/db-core/prisma/migrations/20260720000200_weimeng_quote_import_g8/migration.sql
-- 偉盟報價匯入缺欄 G8（2026-07-20 Crown 拍板）：Nx04Quote 加「舊系統原單號」
--   nx04_quote.legacy_doc_no VARCHAR(20)（偉盟 RSAA.RAREN；歷史匯入冪等鍵＋追溯）
--   + unique(tenant_id, legacy_doc_no)
-- 註：QuoteItem 為子表、以 quote_id 關聯，不需 legacy_doc_no。
-- ⚠️ 本機以 prisma db execute 手動套用（migrate 追蹤表壞）。
ALTER TABLE nx04_quote ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS nx04_quote_tenant_id_legacy_doc_no_key ON nx04_quote(tenant_id, legacy_doc_no);
