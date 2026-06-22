-- packages/db-core/scripts/railway-bootstrap-country.sql
-- 解 a1_district_postal_seed 跑前需要 country NX01COUN0000001 存在的問題
-- 對齊 baseline schema 欄位 sort_no（不是 sort_order）

INSERT INTO nx01_country (id, code, name, sort_no, is_active, created_by, updated_at, updated_by)
VALUES ('NX01COUN0000001', 'TWN', '台灣', 10, true, 'NX01USER0000001', NOW(), 'NX01USER0000001')
ON CONFLICT DO NOTHING;
