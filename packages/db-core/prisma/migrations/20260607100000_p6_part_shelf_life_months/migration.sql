-- packages/db-core/prisma/migrations/20260607100000_p6_part_shelf_life_months/migration.sql
-- 02 第四批 軌 6 2026-06-07：建議保存期限（族群預設 + 個別零件可覆寫）
--
-- 範式對齊「客戶分級加成率（CustomerGrade.marginPct）+ 個別毛利率（Partner.customMarginPct）」：
--   - 族群層 PartGroup.defaultShelfLifeMonths：預設值（族群所有零件預設保存期限）
--   - 零件層 Part.shelfLifeMonths：個別零件可覆寫（空=取族群預設、有值=蓋族群）
--   - effective = COALESCE(part.shelfLifeMonths, partGroup.defaultShelfLifeMonths)
-- 全部 additive、新欄 nullable、0 影響歷史資料。

ALTER TABLE "nx01_part_group"
  ADD COLUMN "default_shelf_life_months" INTEGER;

ALTER TABLE "nx01_part"
  ADD COLUMN "shelf_life_months" INTEGER;
