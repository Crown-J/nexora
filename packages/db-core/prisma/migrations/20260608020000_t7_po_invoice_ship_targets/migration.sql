-- packages/db-core/prisma/migrations/20260608020000_t7_po_invoice_ship_targets/migration.sql
-- T7 進貨對齊批次 2026-06-08：採購單付款對象 / 指送對象 / 收貨地址 / 交貨地點
--
-- 業務語意（補工作流「對象分開」需求）：
--   - 母公司付款：invoiceToPartnerId 指向母公司、廠商開發票對母公司
--   - 分店收貨：shipToPartnerId 指向分店、shipToAddressId 指向分店地址
--   - 直送客戶現場：shipToPartnerId 指向客戶（partnerType=C 保養廠）、deliveryAddress 填現場地址
--
-- 4 欄全 nullable、null = 「跟 supplier 同」（前後端依此判斷預設行為）。
-- application 層守：partner 存在 + tenant 一致、address 屬該 partner（service guard、不在 DB 強制）。
--
-- 備份檔：dev-backups/pre-t7-purchase-targets_20260608_010000.sql (1.2MB)
-- 全 additive、不動既有資料。

ALTER TABLE "nx02_po"
  ADD COLUMN "invoice_to_partner_id" VARCHAR(15),
  ADD COLUMN "ship_to_partner_id"    VARCHAR(15),
  ADD COLUMN "ship_to_address_id"    VARCHAR(15),
  ADD COLUMN "delivery_address"      VARCHAR(200);

ALTER TABLE "nx02_po"
  ADD CONSTRAINT "nx02_po_invoice_to_partner_id_fkey"
  FOREIGN KEY ("invoice_to_partner_id") REFERENCES "nx01_partner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_po"
  ADD CONSTRAINT "nx02_po_ship_to_partner_id_fkey"
  FOREIGN KEY ("ship_to_partner_id") REFERENCES "nx01_partner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nx02_po"
  ADD CONSTRAINT "nx02_po_ship_to_address_id_fkey"
  FOREIGN KEY ("ship_to_address_id") REFERENCES "nx01_partner_address"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "nx02_po_invoice_to_partner_id_idx" ON "nx02_po" ("invoice_to_partner_id");
CREATE INDEX "nx02_po_ship_to_partner_id_idx"    ON "nx02_po" ("ship_to_partner_id");
CREATE INDEX "nx02_po_ship_to_address_id_idx"    ON "nx02_po" ("ship_to_address_id");
