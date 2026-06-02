-- packages/db-core/scripts/cleanup-20260602-hengying-pre-employee-id-redo.sql
-- 員工編號制改造軌：清恆迎 TW-100001、待改制完成後總經理親自重新註冊
--
-- 執行環境：localhost（PostgreSQL nexora_core）
-- 執行時間：2026-06-02
-- 執行者：Hank（總經理拍板「改制後重註冊恆迎、拿回真正的 TW-100001」）
--
-- 被清的 1 筆：
-- - TW-100001（NX99TANT9900006、恆迎企業有限公司）：Phase 6.3 後總經理首次正式
--   開戶、業務資料 0 筆。員工編號制改造完成後重註冊、員編改用「自由輸入」規格
--
-- 影響面：合計 6 筆（tenant + user + user_role + role + site + warehouse）
-- sequence reset：seq_tenant_code_tw → 100001（ZT 不動、保留現有 100004）
-- 不影響：既有 ZT-100001/100002/100003 + INNOVA + SYSTEM + 業務資料

BEGIN;

DELETE FROM nx01_user_role WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_user      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_warehouse WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_site      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx01_role      WHERE tenant_id = 'NX99TANT9900006';
DELETE FROM nx99_tenant    WHERE id        = 'NX99TANT9900006';

-- 重設 TW sequence、讓總經理重註冊時拿到真正的 TW-100001
SELECT setval('seq_tenant_code_tw', 100001, false);

COMMIT;
