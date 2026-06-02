-- packages/db-core/scripts/cleanup-20260602-phase6-2-dirty-tenants.sql
-- 平台/租戶層分離軌 Phase 6.2：一次性清髒/驗證租戶
--
-- 執行環境：localhost（PostgreSQL nexora_core）
-- 執行時間：2026-06-02
-- 執行者：Hank（總經理白話 STOP 點頭後執行）
-- 風險：破壞性、不可逆（已確認兩租戶無業務資料）
--
-- 被清的兩筆來源：
-- - TEST-PHASE3（NX99TANT9900004）：Phase 3 驗證時用 Bash curl 從 Windows shell
--   送中文 body 造成編碼破壞、name=「Phase3 ���դ��q」含 5 個 U+FFFD replacement char
-- - TEST-UTF8（NX99TANT9900005）：Phase 6.2 根因驗證時用 Python urllib 模擬瀏覽器
--   UTF-8 鏈、寫入結果 name=「測試UTF8公司」完全乾淨、證明開戶鏈本身 100% UTF-8 OK
--
-- 影響面：合計 12 筆（兩租戶各 6 筆：tenant + user + user_role + role + site + warehouse）
-- 不影響：既有 LITE/PLUS/PRO/INNOVA/SYSTEM、業務資料 0 動、schema 0 動、Railway 0 動

BEGIN;

DELETE FROM nx01_user_role WHERE tenant_id IN ('NX99TANT9900004','NX99TANT9900005');
DELETE FROM nx01_user      WHERE tenant_id IN ('NX99TANT9900004','NX99TANT9900005');
DELETE FROM nx01_warehouse WHERE tenant_id IN ('NX99TANT9900004','NX99TANT9900005');
DELETE FROM nx01_site      WHERE tenant_id IN ('NX99TANT9900004','NX99TANT9900005');
DELETE FROM nx01_role      WHERE tenant_id IN ('NX99TANT9900004','NX99TANT9900005');
DELETE FROM nx99_tenant    WHERE id        IN ('NX99TANT9900004','NX99TANT9900005');

COMMIT;

-- 執行結果（從 psql 回傳）：
--   DELETE 2 (nx01_user_role)
--   DELETE 2 (nx01_user)
--   DELETE 2 (nx01_warehouse)
--   DELETE 2 (nx01_site)
--   DELETE 2 (nx01_role)
--   DELETE 2 (nx99_tenant)
-- 合計 12 筆、平台 customers 列表降回 3 筆（LITE/PLUS/PRO）、INNOVA/SYSTEM 仍正常排除
