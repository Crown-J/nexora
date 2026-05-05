-- TASK-PHASE2-NX01-PARTNER-SCHEMA-EXTEND-01
-- 修正 nx01_partner.partner_type default drift（v6 historical）
-- v6 default 'BOTH' 跟 v7 規範 C/S/T/V/B 不符（VARCHAR(1) 撞 4 字元 default 值）
-- 對應架構債 A031（同 A002 模式：v6 → v7 schema 演進歷史殘跡）
--
-- 變更：
--   1. defensive backfill：UPDATE BOTH → C（dev/seed noop、prod 防禦）
--   2. ALTER COLUMN default 'BOTH' → 'C'

-- DefensiveBackfill
UPDATE "nx01_partner" SET "partner_type" = 'C' WHERE "partner_type" = 'BOTH';

-- AlterTable
ALTER TABLE "nx01_partner" ALTER COLUMN "partner_type" SET DEFAULT 'C';
