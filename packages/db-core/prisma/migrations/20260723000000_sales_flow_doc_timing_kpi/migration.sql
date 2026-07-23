-- packages/db-core/prisma/migrations/20260723000000_sales_flow_doc_timing_kpi/migration.sql
-- 單據計時 KPI（2026-07-23 執行長拍板）：SO/ST 加時間戳、算「這張單從撿貨開始→出貨完成花多久」。
--   · nx04_so.pick_started_at：撿貨開始（CONFIRMED→PICKING 第一次撿貨動作、只寫一次）＝KPI 起點。
--   · nx04_so.sealed_at：封箱完成（每次封箱覆寫＝取最後一箱）＝KPI 中段點；簽收完成已有 completed_at。
--   · nx03_st.dispatched_at：發貨出庫（DRAFT→TRANSIT）＝調撥 KPI 起點；收貨已有 received_at。
-- 非破壞：三欄皆 additive nullable（既有列一律 null、不回填、KPI 只從此刻起的新單算）。
-- ⚠️ 本機 migration 追蹤表壞（shadow DB P3006）→ prisma db execute 手動套用（沿用 0720~0722 範式）。

ALTER TABLE "nx04_so" ADD COLUMN "pick_started_at" TIMESTAMP(3);
ALTER TABLE "nx04_so" ADD COLUMN "sealed_at" TIMESTAMP(3);
ALTER TABLE "nx03_st" ADD COLUMN "dispatched_at" TIMESTAMP(3);
