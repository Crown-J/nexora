-- packages/db-core/scripts/weimeng-v2-backfill-quote-record.sql
-- 偉盟「單行報價單」回填即時報價紀錄（nx04_quote → nx04_quote_record）
--   背景：偉盟報價匯入只寫了 nx04_quote / nx04_quote_item，未回寫 nx04_quote_record，
--         導致「即時報價」清單看不到偉盟報價。本腳本把「明細只有 1 行」的偉盟報價單
--         複製成一筆報價紀錄（source=QUOTE、source_doc_id 回指原報價單）。
--   範圍（Crown 拍板 2026-07-21）：只回填單行報價單；source=QUOTE；目標 Railway 正式庫。
--   冪等：NOT EXISTS 守衛（同一報價單已有 source=QUOTE 紀錄則跳過），可重複執行不重覆。
--   欄位對照：對齊 RecordService.createQuoteRecord + weimeng-v2-load-quote 範式。
--   ⚠️ 正式庫執行前必先 pg_dump 備份、且先跑 verify 段核對數量。

INSERT INTO nx04_quote_record
  (id, tenant_id, record_date, customer_id, customer_grade_id,
   part_id, part_no, part_name, warehouse_id, qty, unit_price, currency_id,
   source, source_doc_id, is_transfer, sales_person_id, remark,
   created_at, created_by, updated_at, updated_by)
SELECT
  gen_nx04_quote_record_id(),
  q.tenant_id, q.quote_date, q.customer_id, q.customer_grade_id,
  qi.part_id, qi.part_no, qi.part_name, q.warehouse_id, qi.qty, qi.unit_price, q.currency_id,
  'QUOTE', q.id, false, q.sales_person_id, '偉盟回填(單行報價)',
  q.created_at, q.created_by, q.updated_at, q.updated_by
FROM nx04_quote q
JOIN nx04_quote_item qi ON qi.quote_id = q.id
WHERE q.tenant_id = (SELECT id FROM nx99_tenant WHERE code = 'TW-100001')
  AND q.legacy_doc_no IS NOT NULL
  AND q.remark LIKE '偉盟匯入%'
  AND (SELECT count(*) FROM nx04_quote_item x WHERE x.quote_id = q.id) = 1
  AND NOT EXISTS (
    SELECT 1 FROM nx04_quote_record r
    WHERE r.source = 'QUOTE' AND r.source_doc_id = q.id
  );
