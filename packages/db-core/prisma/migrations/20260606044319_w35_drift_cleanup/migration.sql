-- DropForeignKey
ALTER TABLE "nx01_import_batch" DROP CONSTRAINT "fk_nx01_import_batch_tenant";

-- DropForeignKey
ALTER TABLE "nx01_import_batch" DROP CONSTRAINT "fk_nx01_import_batch_uploader";

-- DropForeignKey
ALTER TABLE "nx01_role_permission" DROP CONSTRAINT "fk_nx01_role_permission_permission";

-- DropForeignKey
ALTER TABLE "nx01_role_permission" DROP CONSTRAINT "fk_nx01_role_permission_role";

-- DropForeignKey
ALTER TABLE "nx01_role_permission" DROP CONSTRAINT "fk_nx01_role_permission_tenant";

-- DropForeignKey
ALTER TABLE "nx01_user_page_guide" DROP CONSTRAINT "fk_nx01_user_page_guide_tenant";

-- DropForeignKey
ALTER TABLE "nx01_user_page_guide" DROP CONSTRAINT "fk_nx01_user_page_guide_user";

-- DropForeignKey
ALTER TABLE "nx01_user_pref" DROP CONSTRAINT "fk_nx01_user_pref_tenant";

-- DropForeignKey
ALTER TABLE "nx01_user_pref" DROP CONSTRAINT "fk_nx01_user_pref_user";

-- DropForeignKey
ALTER TABLE "nx03_issue_report" DROP CONSTRAINT "nx03_issue_report_location_id_fkey";

-- DropForeignKey
ALTER TABLE "nx03_issue_report" DROP CONSTRAINT "nx03_issue_report_part_version_id_fkey";

-- DropForeignKey
ALTER TABLE "nx03_part_stock_setting" DROP CONSTRAINT "nx03_part_stock_setting_default_location_id_fkey";

-- DropForeignKey
ALTER TABLE "nx05_ar_ledger" DROP CONSTRAINT "fk_nx05_ar_ledger_pr_id";

-- DropForeignKey
ALTER TABLE "nx05_ar_ledger" DROP CONSTRAINT "nx05_ar_ledger_so_id_fkey";

-- DropForeignKey
ALTER TABLE "nx05_ar_reminder_log" DROP CONSTRAINT "fk_nx05_ar_reminder_log_ar";

-- DropForeignKey
ALTER TABLE "nx05_ar_reminder_log" DROP CONSTRAINT "fk_nx05_ar_reminder_log_tenant";

-- DropForeignKey
ALTER TABLE "nx05_ar_reminder_log" DROP CONSTRAINT "fk_nx05_ar_reminder_log_user";

-- DropForeignKey
ALTER TABLE "nx05_closing" DROP CONSTRAINT "fk_nx05_closing_report_filed_by";

-- DropForeignKey
ALTER TABLE "nx05_paylog_settlement" DROP CONSTRAINT "fk_nx05_paylog_settlement_ap";

-- DropForeignKey
ALTER TABLE "nx05_paylog_settlement" DROP CONSTRAINT "fk_nx05_paylog_settlement_ar";

-- DropForeignKey
ALTER TABLE "nx05_paylog_settlement" DROP CONSTRAINT "fk_nx05_paylog_settlement_paylog";

-- DropForeignKey
ALTER TABLE "nx05_paylog_settlement" DROP CONSTRAINT "fk_nx05_paylog_settlement_tenant";

-- W3.5 Alex 拍板選項 B：保留 nx01_site partial unique（業務 invariant「每 tenant 只 1 個主據點」）
-- prisma 不支援 partial unique、會在每次 migrate dev 偵測為 drift；本軌不 drop、留 site 上的索引運作
-- 原 prisma 想 drop 的 `nx01_site_tenant_id_is_main_unique` 不執行

-- DropIndex（保留：nx02_warranty_claim_source_pr_id_idx 為普通 partial index、純查詢效能、移除無業務影響）
DROP INDEX "nx02_warranty_claim_source_pr_id_idx";

-- W3.5 Alex 拍板：5 個 timestamp 截斷 → TIMESTAMP(3) + 1 個 DROP DEFAULT
-- 修 prisma 7 generator bug：RENAME CONSTRAINT 跟 ALTER COLUMN 不能混 multi-clause、拆成獨立 statement
-- 不然 PG 邏輯上 RENAME 那行單獨先跑、後續 ALTER COLUMN 因 parser 路徑被吞掉、不生效

-- AlterTable: nx05_ar_reminder_log PK rename + 2 timestamps
ALTER TABLE "nx05_ar_reminder_log" RENAME CONSTRAINT "pk_nx05_ar_reminder_log" TO "nx05_ar_reminder_log_pkey";
ALTER TABLE "nx05_ar_reminder_log"
  ALTER COLUMN "reminded_at" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: nx05_closing report_filed_at 截斷
ALTER TABLE "nx05_closing" ALTER COLUMN "report_filed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: nx05_paylog_settlement PK rename + 2 timestamps + DROP DEFAULT
ALTER TABLE "nx05_paylog_settlement" RENAME CONSTRAINT "pk_nx05_paylog_settlement" TO "nx05_paylog_settlement_pkey";
ALTER TABLE "nx05_paylog_settlement"
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" DROP DEFAULT,
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "nx01_role_permission" ADD CONSTRAINT "nx01_role_permission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role_permission" ADD CONSTRAINT "nx01_role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx01_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_role_permission" ADD CONSTRAINT "nx01_role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "nx01_permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_page_guide" ADD CONSTRAINT "nx01_user_page_guide_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_page_guide" ADD CONSTRAINT "nx01_user_page_guide_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_import_batch" ADD CONSTRAINT "nx01_import_batch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_import_batch" ADD CONSTRAINT "nx01_import_batch_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_part_stock_setting" ADD CONSTRAINT "nx03_part_stock_setting_default_location_id_fkey" FOREIGN KEY ("default_location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_issue_report" ADD CONSTRAINT "nx03_issue_report_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "nx01_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx03_issue_report" ADD CONSTRAINT "nx03_issue_report_part_version_id_fkey" FOREIGN KEY ("part_version_id") REFERENCES "nx01_part_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "nx04_so"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_ledger" ADD CONSTRAINT "nx05_ar_ledger_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "nx02_pr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_closing" ADD CONSTRAINT "nx05_closing_report_filed_by_fkey" FOREIGN KEY ("report_filed_by") REFERENCES "nx01_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog_settlement" ADD CONSTRAINT "nx05_paylog_settlement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog_settlement" ADD CONSTRAINT "nx05_paylog_settlement_paylog_id_fkey" FOREIGN KEY ("paylog_id") REFERENCES "nx05_paylog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog_settlement" ADD CONSTRAINT "nx05_paylog_settlement_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "nx05_ar_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_paylog_settlement" ADD CONSTRAINT "nx05_paylog_settlement_ap_id_fkey" FOREIGN KEY ("ap_id") REFERENCES "nx05_ap_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_reminder_log" ADD CONSTRAINT "nx05_ar_reminder_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_reminder_log" ADD CONSTRAINT "nx05_ar_reminder_log_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "nx05_ar_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx05_ar_reminder_log" ADD CONSTRAINT "nx05_ar_reminder_log_reminded_by_fkey" FOREIGN KEY ("reminded_by") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_pref" ADD CONSTRAINT "nx01_user_pref_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx01_user_pref" ADD CONSTRAINT "nx01_user_pref_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx01_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "nx01_import_batch_tenant_type_idx" RENAME TO "nx01_import_batch_tenant_id_import_type_idx";

-- RenameIndex
ALTER INDEX "nx01_partner_grade_history_tenant_partner_idx" RENAME TO "nx01_partner_grade_history_tenant_id_partner_id_idx";

-- RenameIndex
ALTER INDEX "nx01_partner_grade_history_tenant_status_idx" RENAME TO "nx01_partner_grade_history_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "nx01_permission_mca_idx" RENAME TO "nx01_permission_module_code_category_action_idx";

-- RenameIndex
ALTER INDEX "nx01_role_permission_role_perm_unique" RENAME TO "nx01_role_permission_role_id_permission_id_key";

-- RenameIndex
ALTER INDEX "nx01_role_permission_tenant_role_idx" RENAME TO "nx01_role_permission_tenant_id_role_id_idx";

-- RenameIndex
ALTER INDEX "nx01_user_page_guide_user_page_uq" RENAME TO "nx01_user_page_guide_user_id_page_key_key";

-- RenameIndex
ALTER INDEX "nx01_user_pref_user_key_uq" RENAME TO "nx01_user_pref_user_id_pref_key_key";

-- RenameIndex
ALTER INDEX "nx02_warranty_claim_tenant_part_idx" RENAME TO "nx02_warranty_claim_tenant_id_part_id_idx";

-- RenameIndex
ALTER INDEX "nx02_warranty_claim_tenant_status_idx" RENAME TO "nx02_warranty_claim_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "nx02_warranty_claim_tenant_supplier_idx" RENAME TO "nx02_warranty_claim_tenant_id_supplier_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_ar_reminder_log_ar" RENAME TO "nx05_ar_reminder_log_ar_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_ar_reminder_log_remindedAt" RENAME TO "nx05_ar_reminder_log_reminded_at_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_ar_reminder_log_tenant" RENAME TO "nx05_ar_reminder_log_tenant_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_paylog_settlement_ap" RENAME TO "nx05_paylog_settlement_ap_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_paylog_settlement_ar" RENAME TO "nx05_paylog_settlement_ar_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_paylog_settlement_paylog" RENAME TO "nx05_paylog_settlement_paylog_id_idx";

-- RenameIndex
ALTER INDEX "idx_nx05_paylog_settlement_tenant" RENAME TO "nx05_paylog_settlement_tenant_id_idx";

-- RenameIndex
ALTER INDEX "nx98_task_pool_tenant_assignee_status_idx" RENAME TO "nx98_task_pool_tenant_id_assignee_user_id_status_idx";

-- RenameIndex
ALTER INDEX "nx98_task_pool_tenant_dept_status_idx" RENAME TO "nx98_task_pool_tenant_id_department_id_status_idx";

-- RenameIndex
ALTER INDEX "nx98_task_pool_tenant_source_idx" RENAME TO "nx98_task_pool_tenant_id_source_module_source_doc_id_idx";

-- RenameIndex
ALTER INDEX "nx98_task_pool_tenant_status_idx" RENAME TO "nx98_task_pool_tenant_id_status_idx";

-- ============================================================
-- W3.5 Alex 拍板補強：補建 nx01_warehouse 主倉 partial unique（schema 已宣告、DB 端未建、drift fix）
-- 範式對齊 nx01_site_tenant_id_is_main_unique：同 tenant 只 1 筆 is_main=true
-- prisma 7 不支援 partial unique、改用 raw SQL 在 migration 末段建
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "nx01_warehouse_tenant_id_is_main_unique"
  ON "nx01_warehouse" ("tenant_id")
  WHERE ("is_main" = true);
