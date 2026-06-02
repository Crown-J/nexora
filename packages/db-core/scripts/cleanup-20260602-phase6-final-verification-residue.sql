-- packages/db-core/scripts/cleanup-20260602-phase6-final-verification-residue.sql
-- 平台/租戶層分離軌 Phase 6 收尾前：清驗證殘留 + 重設 sequence
--
-- 執行環境：localhost（PostgreSQL nexora_core）
-- 執行時間：2026-06-02
-- 執行者：Hank（總經理拍板「恆迎是首位正式上線客戶、走正式流程拿真正的 TW-100001」）
--
-- 被清的兩筆：
-- - TW-100001（NX99TANT9900007、恆迎企業）：Phase 6.3 Step C 用 Python 模擬 UI
--   開出來、屬於驗證殘留。總經理要從 platform UI 親自開戶拿到真正的 TW-100001。
-- - ZT-100004（NX99TANT9900006、ZT 測試樣本）：Phase 6.3 Step C 驗證殘留、清回 ZT 起點。
--
-- 影響面：合計 12 筆（兩租戶各 6 筆）、無業務資料
-- sequence reset：seq_tenant_code_tw → 100001、seq_tenant_code_zt → 100004

BEGIN;

-- 清 TW-100001 驗證殘留
DELETE FROM nx01_user_role WHERE tenant_id = 'NX99TANT9900007';
DELETE FROM nx01_user      WHERE tenant_id = 'NX99TANT9900007';
DELETE FROM nx01_warehouse WHERE tenant_id = 'NX99TANT9900007';
DELETE FROM nx01_site      WHERE tenant_id = 'NX99TANT9900007';
DELETE FROM nx01_role      WHERE tenant_id = 'NX99TANT9900007';
DELETE FROM nx99_tenant    WHERE id        = 'NX99TANT9900007';

-- 清 ZT-100004 驗證樣本
DELETE FROM nx01_user_role WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_user      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_warehouse WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_site      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_role      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx99_tenant    WHERE id        = 'NX99TANT9900006';

-- 重設 sequence、讓下次 nextval 回起點（false = 還沒被 call、下次直接回該值）
SELECT setval('seq_tenant_code_tw', 100001, false);
SELECT setval('seq_tenant_code_zt', 100004, false);

COMMIT;

-- 執行結果：12 DELETE + 2 setval 全成功
-- 之後：總經理從 /platform UI 開恆迎 → 拿到真正的 TW-100001（首位正式客戶）
