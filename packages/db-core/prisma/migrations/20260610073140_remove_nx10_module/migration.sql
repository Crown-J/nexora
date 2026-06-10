/*
  Warnings:

  - You are about to drop the `nx10_checkin_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_emp_exp_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_emp_medal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_emp_task_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_medal_level` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_mentorship_record` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_promotion_criteria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_promotion_request` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_sprint_task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_sprint_task_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_surprise_box_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_task_template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_team_task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nx10_team_task_log` table. If the table is not empty, all the data it contains will be lost.

*/
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

-- DropForeignKey
ALTER TABLE "nx10_checkin_log" DROP CONSTRAINT "nx10_checkin_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_checkin_log" DROP CONSTRAINT "nx10_checkin_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_exp_log" DROP CONSTRAINT "nx10_emp_exp_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_exp_log" DROP CONSTRAINT "nx10_emp_exp_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_medal" DROP CONSTRAINT "nx10_emp_medal_medal_level_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_medal" DROP CONSTRAINT "nx10_emp_medal_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_medal" DROP CONSTRAINT "nx10_emp_medal_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_task_log" DROP CONSTRAINT "nx10_emp_task_log_task_template_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_task_log" DROP CONSTRAINT "nx10_emp_task_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_emp_task_log" DROP CONSTRAINT "nx10_emp_task_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_medal_level" DROP CONSTRAINT "nx10_medal_level_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_mentorship_record" DROP CONSTRAINT "nx10_mentorship_record_mentee_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_mentorship_record" DROP CONSTRAINT "nx10_mentorship_record_mentor_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_mentorship_record" DROP CONSTRAINT "nx10_mentorship_record_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_criteria" DROP CONSTRAINT "nx10_promotion_criteria_from_role_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_criteria" DROP CONSTRAINT "nx10_promotion_criteria_min_medal_level_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_criteria" DROP CONSTRAINT "nx10_promotion_criteria_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_criteria" DROP CONSTRAINT "nx10_promotion_criteria_to_role_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_request" DROP CONSTRAINT "nx10_promotion_request_criteria_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_request" DROP CONSTRAINT "nx10_promotion_request_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_promotion_request" DROP CONSTRAINT "nx10_promotion_request_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_sprint_task" DROP CONSTRAINT "nx10_sprint_task_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_sprint_task_log" DROP CONSTRAINT "nx10_sprint_task_log_sprint_task_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_sprint_task_log" DROP CONSTRAINT "nx10_sprint_task_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_sprint_task_log" DROP CONSTRAINT "nx10_sprint_task_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_surprise_box_log" DROP CONSTRAINT "nx10_surprise_box_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_surprise_box_log" DROP CONSTRAINT "nx10_surprise_box_log_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_task_template" DROP CONSTRAINT "nx10_task_template_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_team_task" DROP CONSTRAINT "nx10_team_task_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_team_task" DROP CONSTRAINT "nx10_team_task_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_team_task_log" DROP CONSTRAINT "nx10_team_task_log_team_task_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_team_task_log" DROP CONSTRAINT "nx10_team_task_log_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "nx10_team_task_log" DROP CONSTRAINT "nx10_team_task_log_warehouse_id_fkey";

-- DropIndex
DROP INDEX "nx01_site_tenant_id_is_main_unique";

-- DropIndex
DROP INDEX "nx02_warranty_claim_source_pr_id_idx";

-- AlterTable (PRZ-02: RENAME CONSTRAINT 須獨立 statement)
ALTER TABLE "nx05_ar_reminder_log" RENAME CONSTRAINT "pk_nx05_ar_reminder_log" TO "nx05_ar_reminder_log_pkey";
ALTER TABLE "nx05_ar_reminder_log"
ALTER COLUMN "reminded_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nx05_closing" ALTER COLUMN "report_filed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable (PRZ-02: RENAME CONSTRAINT 須獨立 statement)
ALTER TABLE "nx05_paylog_settlement" RENAME CONSTRAINT "pk_nx05_paylog_settlement" TO "nx05_paylog_settlement_pkey";
ALTER TABLE "nx05_paylog_settlement"
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "nx10_checkin_log";

-- DropTable
DROP TABLE "nx10_emp_exp_log";

-- DropTable
DROP TABLE "nx10_emp_medal";

-- DropTable
DROP TABLE "nx10_emp_task_log";

-- DropTable
DROP TABLE "nx10_medal_level";

-- DropTable
DROP TABLE "nx10_mentorship_record";

-- DropTable
DROP TABLE "nx10_promotion_criteria";

-- DropTable
DROP TABLE "nx10_promotion_request";

-- DropTable
DROP TABLE "nx10_sprint_task";

-- DropTable
DROP TABLE "nx10_sprint_task_log";

-- DropTable
DROP TABLE "nx10_surprise_box_log";

-- DropTable
DROP TABLE "nx10_task_template";

-- DropTable
DROP TABLE "nx10_team_task";

-- DropTable
DROP TABLE "nx10_team_task_log";

-- DropFunction + DropSequence (Hank 補：prisma generator 只 drop table、
-- 14 個 gen_nx10_*_id() 跟 seq_nx10_*_id 來自 baseline migration 的
-- _gen_id_fragment.sql、需手動 drop 才能徹底乾淨)
DROP FUNCTION IF EXISTS gen_nx10_checkin_log_id();
DROP FUNCTION IF EXISTS gen_nx10_emp_exp_log_id();
DROP FUNCTION IF EXISTS gen_nx10_emp_medal_id();
DROP FUNCTION IF EXISTS gen_nx10_emp_task_log_id();
DROP FUNCTION IF EXISTS gen_nx10_medal_level_id();
DROP FUNCTION IF EXISTS gen_nx10_mentorship_record_id();
DROP FUNCTION IF EXISTS gen_nx10_promotion_criteria_id();
DROP FUNCTION IF EXISTS gen_nx10_promotion_request_id();
DROP FUNCTION IF EXISTS gen_nx10_sprint_task_id();
DROP FUNCTION IF EXISTS gen_nx10_sprint_task_log_id();
DROP FUNCTION IF EXISTS gen_nx10_surprise_box_log_id();
DROP FUNCTION IF EXISTS gen_nx10_task_template_id();
DROP FUNCTION IF EXISTS gen_nx10_team_task_id();
DROP FUNCTION IF EXISTS gen_nx10_team_task_log_id();

DROP SEQUENCE IF EXISTS seq_nx10_checkin_log_id;
DROP SEQUENCE IF EXISTS seq_nx10_emp_exp_log_id;
DROP SEQUENCE IF EXISTS seq_nx10_emp_medal_id;
DROP SEQUENCE IF EXISTS seq_nx10_emp_task_log_id;
DROP SEQUENCE IF EXISTS seq_nx10_medal_level_id;
DROP SEQUENCE IF EXISTS seq_nx10_mentorship_record_id;
DROP SEQUENCE IF EXISTS seq_nx10_promotion_criteria_id;
DROP SEQUENCE IF EXISTS seq_nx10_promotion_request_id;
DROP SEQUENCE IF EXISTS seq_nx10_sprint_task_id;
DROP SEQUENCE IF EXISTS seq_nx10_sprint_task_log_id;
DROP SEQUENCE IF EXISTS seq_nx10_surprise_box_log_id;
DROP SEQUENCE IF EXISTS seq_nx10_task_template_id;
DROP SEQUENCE IF EXISTS seq_nx10_team_task_id;
DROP SEQUENCE IF EXISTS seq_nx10_team_task_log_id;

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
