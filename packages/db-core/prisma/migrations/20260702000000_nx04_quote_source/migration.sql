-- NX04 報價架構 2026-07-02：Nx04Quote 加來源旗標 source（FORMAL 正式 / INSTANT 即時）
-- ⚠️ 本機 migrate dev 壞（見 feedback_prisma7_quirks），此檔為紀錄；實際以 prisma db execute 套用。
ALTER TABLE "nx04_quote" ADD COLUMN "source" VARCHAR(10) NOT NULL DEFAULT 'FORMAL';
