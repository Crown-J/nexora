-- TASK-A039-DEPARTMENT-RENAME-01
-- nx01_department：code='PURCHASE' → 'PRODUCT'、name='採購部' → '產品部'
--
-- 業務真相（Crown 拍 Q4-b）：
--   汽車零件業「研究產品 + 採購」同一批人 = 產品部門 = 業界 muscle memory。
--   原 PURCHASE 命名對齊台灣其他產業、不對齊汽車零件業（NEXORA 目標市場）。
--
-- 變更（pure data migration、無 schema 變動）：
--   1. UPDATE nx01_department SET code='PRODUCT', name='產品部' WHERE code='PURCHASE'
--      → per-tenant、idempotent（重複套用 0 row affected）
--
-- 跨環境影響：
--   - dev DB：PLUS（NX99TANT9900002）+ PRO（NX99TANT9900003）各 1 筆 backfill
--   - prod / Railway DB：對任何已執行 apply-department.ts 的 tenant 同步 backfill
--   - 新建 tenant：apply-department.ts 已改寫 PRODUCT、本 migration 對新建租戶 0 row affected
--
-- 紀律：
--   - 不動 nx01_role.code='PURCHASING'（role / department 命名解耦、Crown 紀律）
--   - 不動 NX02 採購工作台 UI 路由 `/dashboard/purchase`（屬模組業務流命名、與 department.code 解耦）

UPDATE "nx01_department"
SET "code" = 'PRODUCT',
    "name" = '產品部',
    "updated_at" = NOW(),
    "updated_by" = 'NX01USER0000001'
WHERE "code" = 'PURCHASE';
