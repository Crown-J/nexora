-- v1.2 對齊軌 階段 F P1：財務模組 schema 變動
-- 對應意圖書 §2.1（廠商退費應收）+ §5.3（C 案上報旗標）
-- Alex 拍板：Q1=(a) PR 衍生應收 / Q5=(b) Nx05Closing 加上報旗標欄
--
-- 性質：⚠️ 含「ALTER COLUMN DROP NOT NULL」（破壞性、需總經理 review 拍板後才 apply）
-- 既有資料影響：
--   - nx05_ar_ledger 既有 row 全部從 SO 來、DEFAULT 'SO' 對齊、soId 不為 null
--   - nx05_closing 既有 row 上報旗標 3 欄 NULL（兼容、不影響既有關帳）
-- 回滾：附 down 段（最後）

-- ============================================================
-- §1. nx05_ar_ledger：對齊 Nx05ApLedger 範式、加 sourceType + prId
-- ============================================================

-- 加 sourceType（DEFAULT 'SO'、既有 row 全部自動標 SO）
ALTER TABLE "nx05_ar_ledger"
  ADD COLUMN "source_type" VARCHAR(2) NOT NULL DEFAULT 'SO';

COMMENT ON COLUMN "nx05_ar_ledger"."source_type" IS
  '來源類型（SO=銷貨單 / PR=廠商退費衍生）。對齊 Nx05ApLedger.sourceType 範式。';

-- 加 prId（NULLABLE、只有 sourceType='PR' 時填）
ALTER TABLE "nx05_ar_ledger"
  ADD COLUMN "pr_id" VARCHAR(15);

ALTER TABLE "nx05_ar_ledger"
  ADD CONSTRAINT "fk_nx05_ar_ledger_pr_id"
  FOREIGN KEY ("pr_id") REFERENCES "nx02_pr"("id");

COMMENT ON COLUMN "nx05_ar_ledger"."pr_id" IS
  '來源廠商退費單 ID（nx02_pr、sourceType=PR 時必填、SO 時為 null）';

-- ⚠️ 破壞性：so_id 從 NOT NULL 改 NULL（容納 PR 來源不需 SO）
-- 風險：既有應用程式碼若假設 soId 必填會炸（Hank 已盤點：service / mapRow 都用 ??、無假設）
ALTER TABLE "nx05_ar_ledger"
  ALTER COLUMN "so_id" DROP NOT NULL;

-- ============================================================
-- §2. nx05_closing：加 401 上報旗標 3 欄（C 案鎖定）
-- ============================================================

ALTER TABLE "nx05_closing"
  ADD COLUMN "report_period" VARCHAR(7),
  ADD COLUMN "report_filed_at" TIMESTAMP,
  ADD COLUMN "report_filed_by" VARCHAR(15);

ALTER TABLE "nx05_closing"
  ADD CONSTRAINT "fk_nx05_closing_report_filed_by"
  FOREIGN KEY ("report_filed_by") REFERENCES "nx01_user"("id");

COMMENT ON COLUMN "nx05_closing"."report_period" IS
  '所屬 401 申報期（YYYY-EE 格式、EE=01~06、01=1-2月 / 02=3-4月 / 03=5-6月 / 04=7-8月 / 05=9-10月 / 06=11-12月）';
COMMENT ON COLUMN "nx05_closing"."report_filed_at" IS
  '上報 401 報表完成時間（null=未上報、可解鎖該期；非 null=已上報、該期所有月鎖死）';
COMMENT ON COLUMN "nx05_closing"."report_filed_by" IS
  '上報人 user id（FK nx01_user）';

-- ============================================================
-- 回滾段（如需手動 revert、注意 PR 來源資料會孤立）
-- ============================================================
--
-- -- nx05_closing
-- ALTER TABLE "nx05_closing"
--   DROP CONSTRAINT "fk_nx05_closing_report_filed_by",
--   DROP COLUMN "report_period",
--   DROP COLUMN "report_filed_at",
--   DROP COLUMN "report_filed_by";
--
-- -- nx05_ar_ledger
-- -- ⚠️ 若已有 PR 來源 row、回滾前須先 DELETE WHERE source_type='PR'
-- ALTER TABLE "nx05_ar_ledger" ALTER COLUMN "so_id" SET NOT NULL;
-- ALTER TABLE "nx05_ar_ledger"
--   DROP CONSTRAINT "fk_nx05_ar_ledger_pr_id",
--   DROP COLUMN "pr_id",
--   DROP COLUMN "source_type";
