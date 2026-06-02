-- packages/db-core/prisma/migrations/20260602110000_tenant_code_sequences/migration.sql
-- 平台/租戶層分離軌 Phase 6.3：租戶代碼規格 TW/ZT-{6digits} 落地
--
-- 規格（總經理 STOP-6.3 拍板）：
-- - 正式客戶：TW-100001、TW-100002...（國碼 TW + 6 位流水）
-- - 測試租戶：ZT-100001、ZT-100002...（ZT 前綴 + 同格式）
-- - 流水號 6 位實心、從 100001 起、純遞增、退租保留號碼不跳號
-- - 國碼可擴充（未來 JP/US 加新 sequence、schema 0 動）
-- - 系統自動產、開戶者不填、統編與登入代碼分離
--
-- 範圍：純 additive sequence + 一次性 UPDATE 現有 3 筆測試租戶正名
-- 不動：schema 表結構、92 支既有 migration、Railway

-- ─────────────────────────────────────────
-- 1. 新增 sequences（TW 起點 100001、ZT 起點 100004 保留 100001~3 給現有正名）
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_tenant_code_tw START 100001;
CREATE SEQUENCE IF NOT EXISTS seq_tenant_code_zt START 100004;

-- ─────────────────────────────────────────
-- 2. 正名現有 3 個測試租戶（對照表 STOP-6.3 已確認）
-- ─────────────────────────────────────────
-- TEST-LITE → ZT-100001
UPDATE nx99_tenant SET code='ZT-100001' WHERE id='NX99TANT9900001' AND code='TEST-LITE';
-- TEST-PLUS → ZT-100002
UPDATE nx99_tenant SET code='ZT-100002' WHERE id='NX99TANT9900002' AND code='TEST-PLUS';
-- TEST-PRO  → ZT-100003
UPDATE nx99_tenant SET code='ZT-100003' WHERE id='NX99TANT9900003' AND code='TEST-PRO';

-- 注意：WHERE 加 code='TEST-*' 是冪等保險（若重跑、新 code 已存在則 0 row affected、不會誤覆蓋）
