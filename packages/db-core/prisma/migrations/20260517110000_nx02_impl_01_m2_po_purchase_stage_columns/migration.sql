-- packages/db-core/prisma/migrations/20260517110000_nx02_impl_01_m2_po_purchase_stage_columns/migration.sql
-- ============================================================================
-- Migration: nx02_impl_01_m2_po_purchase_stage_columns
-- 建立日期：2026-05-17
-- 任務：TASK-NX02-IMPL-01 Phase 1 M2（國外採購 6 階段追蹤配套）
-- 對應 plan：docs/nx02/spec/impl/nx02-impl-01-plan.md §3 M2
-- 對應 overview：docs/nx02/spec/intent/nx02-overview.md §3.7 + §8.1 #6
-- 對應拍板：
--   - Crown Q-S1=A purchaseStage 用 SmallInt 1~6（對齊 NX01-17 enum SmallInt 範式）
--   - Crown Q-C3=A strict 順序（不可跳階、guard 1→2→3→4→5→6、application 層）
--   - Crown Q-impl 業界改革候選 ⭐⭐（業界中小 ERP 少見系統化）
--   - 業務需求：國外採購 6 階段追蹤（備貨/付款/待出貨/上船/到港/驗收）
--
-- 範圍（A041 = 5 ALTER TABLE ADD COLUMN、純加欄、無 FK）：
--   1. purchase_stage          SMALLINT NULL  6 階段 enum、null=非國外採購、SmallInt 對齊 NX01-17 範式
--   2. requested_payment_at    TIMESTAMP(3) NULL  廠商要求付款時間（stage=2 觸發）
--   3. paid_at                  TIMESTAMP(3) NULL  實際付款時間（stage=3 觸發）
--   4. shipped_at               TIMESTAMP(3) NULL  上船時間（stage=4 觸發）
--   5. arrived_at               TIMESTAMP(3) NULL  實際到港時間（stage=5 觸發、相對既有 eta 預計）
--
-- 業務語意：
--   - purchase_stage 6 enum：
--     1=備貨中（PO confirmed 後預設、廠商備貨）
--     2=要求付款（廠商 email 通知付款）
--     3=待出貨（付款完成、等廠商出貨）
--     4=出貨上船（廠商出貨、船號 vesselNo + 貨櫃號 containerNo 已備）
--     5=已到港（報關行主動 email 通知）⭐ 業界 muscle memory
--     6=驗收完成（轉 RR 流程）
--   - 既有 schema 配套（無需新增）：
--     vesselNo / containerNo / eta ✓（line 1571~1575）
--     sentAt / supplierConfirmedAt ✓（line 1563/1565）
--     paymentTermImport ✓（line 1577）
--   - 國內採購（purchase_type=D/B）purchase_stage 留 null、不走 6 階段流
--
-- 漸進範式：
--   - 既有 row 全 null、不影響既有 PO 流
--   - 國外採購（purchase_type=I）新單建立時 application 層自動寫 purchase_stage=1
--   - 6 階段流轉 application 層 guard strict 順序（Crown Q-C3=A）
--   - 例外允許「stage 回退」（業務修錯）、本軌 strict 簡化（candidate stage_history 後續軌）
--   - 屬 LITE-CORE 級欄位（國外採購業界改革候選）
--
-- 風險：低（純加欄、全 nullable、SmallInt 應用層 guard 而非 CHECK constraint）
-- ============================================================================

ALTER TABLE "nx02_po" ADD COLUMN "purchase_stage"        SMALLINT;
ALTER TABLE "nx02_po" ADD COLUMN "requested_payment_at"  TIMESTAMP(3);
ALTER TABLE "nx02_po" ADD COLUMN "paid_at"               TIMESTAMP(3);
ALTER TABLE "nx02_po" ADD COLUMN "shipped_at"            TIMESTAMP(3);
ALTER TABLE "nx02_po" ADD COLUMN "arrived_at"            TIMESTAMP(3);

-- ============================================================================
-- 完成：Nx02Po +5 國外 6 階段配套欄
-- 後續：M3 退貨類型 enum 補齊（returnMode F/P/A）
-- ============================================================================
