-- TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01
-- nx01_role 對齊 NX01-02 規格書 v1.0（Crown 拍 Q1+Q2+Q3）
-- 8 筆 → 7 筆 role：移除 LOGISTICS + HR_ADMIN、加 OWNER、code/name 校正
--
-- 變更：
--   1. Rename code: ADMIN → SYSADMIN, PURCHASE → PURCHASING
--   2. Rename name: 「採購人員」「業務人員」「倉管人員」「財務人員」「人資人員」→ 去「人員」後綴
--   3. 移除 LOGISTICS / HR_ADMIN role（先清 user_role 引用、再刪 role）
--   4. 加 OWNER role per tenant（idempotent ON CONFLICT）
--   5. 校正 sortNo（對齊規格書順序）
--
-- 跨環境策略：
--   - dev DB: 既有 8 筆 → backfill 後 7 筆
--   - prod DB: Railway auto-run、idempotent ON CONFLICT 防止重複插入

-- 1. Rename code（保留 ID、保 user_role.role_id FK）
UPDATE "nx01_role" SET "code" = 'SYSADMIN' WHERE "code" = 'ADMIN';
UPDATE "nx01_role" SET "code" = 'PURCHASING' WHERE "code" = 'PURCHASE';

-- 2. Rename name（移除「人員」後綴、對齊 Crown 拍 Q3 = B）
UPDATE "nx01_role" SET "name" = '採購' WHERE "name" = '採購人員';
UPDATE "nx01_role" SET "name" = '業務' WHERE "name" = '業務人員';
UPDATE "nx01_role" SET "name" = '倉管' WHERE "name" = '倉管人員';
UPDATE "nx01_role" SET "name" = '財務' WHERE "name" = '財務人員';
UPDATE "nx01_role" SET "name" = '人資' WHERE "name" = '人資人員';

-- 3. 移除 LOGISTICS / HR_ADMIN role
--    LOGISTICS 業務真相：外包物流由 partner_type=T 處理、不是內部 role
--    HR_ADMIN 業務真相：併入 HR、HR_ADMIN 屬「進階權限」by application 層判斷
--    先清 user_role + role_view 引用避免 FK violation
DELETE FROM "nx01_user_role"
WHERE "role_id" IN (SELECT "id" FROM "nx01_role" WHERE "code" IN ('LOGISTICS', 'HR_ADMIN'));

DELETE FROM "nx01_role_view"
WHERE "role_id" IN (SELECT "id" FROM "nx01_role" WHERE "code" IN ('LOGISTICS', 'HR_ADMIN'));

DELETE FROM "nx01_role" WHERE "code" IN ('LOGISTICS', 'HR_ADMIN');

-- 4. 加 OWNER role per tenant（idempotent、不會重複插入）
INSERT INTO "nx01_role" (
    "id", "tenant_id", "code", "name", "description",
    "is_system", "sort_no", "is_active",
    "created_at", "created_by", "updated_at", "updated_by"
)
SELECT
    gen_nx01_role_id(),
    t."id",
    'OWNER',
    '負責人',
    '老闆 / 總經理、全模組總覽',
    true,
    2,
    true,
    NOW(),
    'NX01USER0000001',
    NOW(),
    'NX01USER0000001'
FROM "nx99_tenant" t
WHERE t."is_active" = true
ON CONFLICT ("tenant_id", "code") DO NOTHING;

-- 5. 校正 sortNo（對齊規格書 7 種順序）
UPDATE "nx01_role" SET "sort_no" = 1 WHERE "code" = 'SYSADMIN';
UPDATE "nx01_role" SET "sort_no" = 2 WHERE "code" = 'OWNER';
UPDATE "nx01_role" SET "sort_no" = 3 WHERE "code" = 'HR';
UPDATE "nx01_role" SET "sort_no" = 4 WHERE "code" = 'SALES';
UPDATE "nx01_role" SET "sort_no" = 5 WHERE "code" = 'PURCHASING';
UPDATE "nx01_role" SET "sort_no" = 6 WHERE "code" = 'WAREHOUSE';
UPDATE "nx01_role" SET "sort_no" = 7 WHERE "code" = 'FINANCE';

-- 6. 對應 description 校正（HR 對齊規格書、其他維持）
UPDATE "nx01_role" SET "description" = '人資模組' WHERE "code" = 'HR';
