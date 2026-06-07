-- packages/db-core/prisma/migrations/20260607140000_t1fix_po_submitted_for_review/migration.sql
-- T1-fix-a 進貨對齊批次 2026-06-07：採購單加「送審」稽核欄、配合 PENDING_APPROVAL 新狀態
--
-- 業務語意：Alex 拍板撤回「送審/核准合一」、改成真實兩步、三版本完全一致
--   DRAFT →〔送審 採購員〕→ PENDING_APPROVAL →〔核准 主管〕→ APPROVED → SUBMITTED → CONFIRMED → ...
--                                              →〔退件 主管〕→ DRAFT（填 rejectReason、清核准印）
--
-- status 欄是 VARCHAR(30)、不是 enum constraint、新值 'PENDING_APPROVAL' 不需動 type；
-- 既有 dev DB 1 筆 CONFIRMED PO 不受影響；無 'APPROVED' 歷史資料、改 state machine 0 風險。
--
-- 本 migration 只加 2 欄稽核欄（與 approvedAt/By 對稱）、全 additive。

ALTER TABLE "nx02_po"
  ADD COLUMN "submitted_for_review_at" TIMESTAMP(3),
  ADD COLUMN "submitted_for_review_by" VARCHAR(15);
