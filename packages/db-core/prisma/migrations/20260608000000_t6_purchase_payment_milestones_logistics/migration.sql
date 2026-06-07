-- packages/db-core/prisma/migrations/20260608000000_t6_purchase_payment_milestones_logistics/migration.sql
-- T6 進貨對齊批次 2026-06-08：採購單付款里程碑 / 物流追蹤 / 報關行；進口進貨單提貨單號
--
-- 業務語意（補工作流步驟 6-8 的記錄點）：
--   - 國內採購（purchase_type=D/B）：物流追蹤編號（黑貓/嘉里/大榮）+ 付款里程碑（廠商通知付款/已付）
--   - 國外採購（purchase_type=I）：報關行廠商 FK + 提貨單號（在 Nx02RrImport）
--   - 帳款年月（apMonth）：所有採購單通用、月結用、寫入 AP 帳期歸戶
--
-- 設計取捨：
--   - paymentMilestone VARCHAR(1) NULL：null=未啟動 / N=廠商通知付款 / D=已付（與既有 partner.creditStatus N/W/F 範式相同）
--     · 對應國內國外都可用、但 paidAt（國外用）已存在不複用、語意是 stage=3 觸發
--   - apMonth VARCHAR(7)：YYYY-MM 字串、便於前端 month picker 直送、後端 service 校驗格式
--   - customsAgentPartnerId FK nx01_partner：partnerType='T' 外包物流（application 層 service 守、不在 DB 強制）
--   - deliveryOrderNo VARCHAR(50)：放 Nx02RrImport（國外進口提貨用、國內 RR 無此欄位無意義）
--
-- 全 additive、不動既有資料、所有 dev DB 既存 PO/RR 不受影響。
-- 備份檔：dev-backups/pre-t6-purchase-milestones_20260608_000000.sql (1.2MB)

-- ① Nx02Po：4 欄
ALTER TABLE "nx02_po"
  ADD COLUMN "domestic_tracking_no"      VARCHAR(50),
  ADD COLUMN "payment_milestone"         VARCHAR(1),
  ADD COLUMN "ap_month"                  VARCHAR(7),
  ADD COLUMN "customs_agent_partner_id"  VARCHAR(15);

-- FK + index 對齊既有 supplierId / rfqId 範式
ALTER TABLE "nx02_po"
  ADD CONSTRAINT "nx02_po_customs_agent_partner_id_fkey"
  FOREIGN KEY ("customs_agent_partner_id") REFERENCES "nx01_partner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "nx02_po_customs_agent_partner_id_idx"
  ON "nx02_po" ("customs_agent_partner_id");

-- ② Nx02RrImport：1 欄
ALTER TABLE "nx02_rr_import"
  ADD COLUMN "delivery_order_no" VARCHAR(50);
