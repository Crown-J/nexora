-- packages/db-core/prisma/migrations/20260607080000_p5_part_last_purchase_sale_at/migration.sql
-- 02 第四批 軌 3b 2026-06-07：零件「最後進貨/銷售時間」業務員業績指標欄
--
-- 範式：
--   - lastPurchaseAt 寫入點：Nx03Inbound INSPECTING→POSTED applyInboundPosting 內、ledger 寫完後（取單據業務日 inboundDate、max）
--   - lastSaleAt 寫入點：Nx03Outbound PACKED→SHIPPED applyOutboundShipping 內、ledger 寫完後（取單據業務日 outboundDate、max）
--   - 唯讀：service 自動寫、UI 不允許編輯（範式同 priceUpdatedAt）
-- 全部 additive、新欄 nullable、0 影響歷史資料。

ALTER TABLE "nx01_part"
  ADD COLUMN "last_purchase_at" TIMESTAMP(3),
  ADD COLUMN "last_sale_at" TIMESTAMP(3);

-- ─── 一次性 backfill：從既有 POSTED inbound / SHIPPED outbound 回填 ─────
-- 取「每顆零件、所有 POSTED 入庫單的最新 inbound_date」作為 lastPurchaseAt 起始值；
-- 取「每顆零件、所有 SHIPPED 出庫單的最新 outbound_date」作為 lastSaleAt 起始值。
-- 上線後 hook 自動接手、舊資料保留歷史。

WITH ib AS (
  SELECT
    ii.part_id AS part_id,
    MAX(i.inbound_date) AS max_dt
  FROM "nx03_inbound_item" ii
  JOIN "nx03_inbound" i ON i.id = ii.inbound_id
  WHERE i.status = 'POSTED'
  GROUP BY ii.part_id
)
UPDATE "nx01_part" p
SET "last_purchase_at" = ib.max_dt
FROM ib
WHERE p.id = ib.part_id;

WITH ob AS (
  SELECT
    oi.part_id AS part_id,
    MAX(o.outbound_date) AS max_dt
  FROM "nx03_outbound_item" oi
  JOIN "nx03_outbound" o ON o.id = oi.outbound_id
  WHERE o.status = 'SHIPPED'
  GROUP BY oi.part_id
)
UPDATE "nx01_part" p
SET "last_sale_at" = ob.max_dt
FROM ob
WHERE p.id = ob.part_id;
