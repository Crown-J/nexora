-- packages/db-core/prisma/migrations/20260425100200_phase0_st_item_source_so_nullable/migration.sql
-- ============================================================================
-- Migration: phase0_st_item_source_so_nullable (D3 spec patch)
-- 建立日期：2026-04-25
-- 任務：TASK-WP-PHASE0-D4-TRANSLATOR-IMPL（D3 補丁）
--
-- 目的：
--   Phase 0 D3 patch：drop NOT NULL on st_item.source_so_item_id.
--
--   Manual stock transfer (倉管手動調撥) is a legitimate scenario without
--   source SO line item. Cross-table CHECK constraint not feasible
--   (triggerSource is on header nx03_st, sourceSoItemId is on item
--   nx03_st_item — PostgreSQL CHECK cannot reference parent table).
--
--   Application-layer self-discipline:
--     - apps/nx-api/src/nx03/transfer/transfer.service.ts → writes NULL (manual)
--     - apps/nx-api/src/nx04/so/translator/refreshment-doc-creator.ts
--       → writes real so_item_id (SO-triggered)
--
--   Future schema specs should grep existing services to ensure all callers
--   are considered (D3 v1 missed nx03 transfer.service).
--
-- nx02_ti_item.source_so_item_id 維持 NOT NULL：repo 內 0 個 caller，
--   D3 意圖版同行調貨明確「SO 缺貨才觸發」，業務語意必填。
--   B5 spec 真要支援「採購主動屯貨」再另起 migration。
-- ============================================================================

ALTER TABLE "nx03_st_item"
    ALTER COLUMN "source_so_item_id" DROP NOT NULL;
