-- packages/db-core/prisma/migrations/20260519120000_nx06_impl_02_m3_push_subscription_table/migration.sql
-- NX06-IMPL-02 Phase 1 M3：Nx06PushSubscription Web Push 訂閱表
-- 對齊：overview v0.2.0 §4.5 推播服務（Web Push API + Email fallback）+ plan §3 M3
-- 性質：新表、0 既有資料衝突

CREATE OR REPLACE FUNCTION gen_nx06_push_subscription_id() RETURNS varchar(15) AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 9) AS INT)), 0) + 1 INTO next_seq
  FROM nx06_push_subscription;
  RETURN 'NX06PSUB' || LPAD(next_seq::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "nx06_push_subscription" (
  "id"          VARCHAR(15)  PRIMARY KEY DEFAULT gen_nx06_push_subscription_id(),
  "tenant_id"   VARCHAR(15)  NOT NULL,
  "user_id"     VARCHAR(15)  NOT NULL,
  "endpoint"    VARCHAR(500) NOT NULL,
  "p256dh_key"  VARCHAR(200) NOT NULL,
  "auth_key"    VARCHAR(100) NOT NULL,
  "user_agent"  VARCHAR(500),
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "updated_by"  VARCHAR(15)  NOT NULL,
  CONSTRAINT "fk_push_user"   FOREIGN KEY ("user_id")   REFERENCES "nx01_user"("id"),
  CONSTRAINT "fk_push_tenant" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id")
);

CREATE UNIQUE INDEX "idx_push_endpoint"    ON "nx06_push_subscription"("endpoint");
CREATE INDEX        "idx_push_user_active" ON "nx06_push_subscription"("tenant_id", "user_id", "is_active");

COMMENT ON TABLE  "nx06_push_subscription" IS 'NX06 Web Push 訂閱（外務員 PWA + 倉管組長瀏覽器）。NX06-IMPL-02 M3 新增。';
COMMENT ON COLUMN "nx06_push_subscription"."endpoint" IS 'Web Push API 推播 endpoint URL（瀏覽器產生唯一 ID）。';
COMMENT ON COLUMN "nx06_push_subscription"."p256dh_key" IS 'VAPID 公鑰（subscription 內含）。';
COMMENT ON COLUMN "nx06_push_subscription"."auth_key" IS 'subscription auth secret。';
