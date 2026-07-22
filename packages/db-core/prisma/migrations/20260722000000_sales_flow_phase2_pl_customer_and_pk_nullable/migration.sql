-- packages/db-core/prisma/migrations/20260722000000_sales_flow_phase2_pl_customer_and_pk_nullable/migration.sql
-- 撿包送階段2 包貨（規格 docs/_team/sales-fulfillment-phase2-packing-schema-proposal.md v0.2、2026-07-22 執行長拍板）：
--   D2 包貨以客戶為單位、預設一箱一單、同客戶小件可 opt-in 併箱省包材。
--   · nx03_pl.pk_id 改可空：單一撿貨單來源時填、同客戶併箱跨多撿貨單時 null（逐行靠 pl_item.pk_item_id 溯源）。
--   · nx03_pl 新增 customer_id：客戶快照、一張包貨單對一個客戶、三區清單/裝箱單免溯源直接顯示。
-- 非破壞：pk_id widening + customer_id additive（既有列一律不動）。
-- ⚠️ 本機 migration 追蹤表壞（shadow DB P3006）→ prisma db execute 手動套用（沿用 0720/0721 範式）。
-- PRZ-02：多子句 ALTER 拆成獨立 statement。

-- 1) pk_id 放寬可空（FK 隨之 Restrict → SET NULL）
ALTER TABLE "nx03_pl" DROP CONSTRAINT "nx03_pl_pk_id_fkey";
ALTER TABLE "nx03_pl" ALTER COLUMN "pk_id" DROP NOT NULL;
ALTER TABLE "nx03_pl" ADD CONSTRAINT "nx03_pl_pk_id_fkey" FOREIGN KEY ("pk_id") REFERENCES "nx03_pk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) 新增客戶快照欄 + FK
ALTER TABLE "nx03_pl" ADD COLUMN "customer_id" VARCHAR(15);
ALTER TABLE "nx03_pl" ADD CONSTRAINT "nx03_pl_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "nx01_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
