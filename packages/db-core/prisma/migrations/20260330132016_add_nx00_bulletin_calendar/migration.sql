-- ID generators（與 prisma/sql/id_generators.sql 對齊）
CREATE SEQUENCE IF NOT EXISTS seq_nx00_bull_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_bull_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00BULL' || LPAD(nextval('seq_nx00_bull_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE SEQUENCE IF NOT EXISTS seq_nx00_caev_id START 1;
CREATE OR REPLACE FUNCTION gen_nx00_caev_id()
RETURNS VARCHAR AS $$
  SELECT 'NX00CAEV' || LPAD(nextval('seq_nx00_caev_id')::text, 7, '0');
$$ LANGUAGE sql;

-- CreateTable
CREATE TABLE "nx00_bulletin" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_bull_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "subtitle" VARCHAR(200),
    "content" TEXT,
    "type" VARCHAR(1) NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "expired_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_badge" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_calendar_event" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_caev_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "subtitle" VARCHAR(200),
    "content" TEXT,
    "type" VARCHAR(1) NOT NULL,
    "event_kind" VARCHAR(20) NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(200),
    "order_type" VARCHAR(2),
    "order_id" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nx00_bulletin_tenant_id_idx" ON "nx00_bulletin"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_bulletin_type_idx" ON "nx00_bulletin"("type");

-- CreateIndex
CREATE INDEX "nx00_bulletin_is_active_idx" ON "nx00_bulletin"("is_active");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_tenant_id_idx" ON "nx00_calendar_event"("tenant_id");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_date_start_idx" ON "nx00_calendar_event"("date_start");

-- CreateIndex
CREATE INDEX "nx00_calendar_event_is_active_idx" ON "nx00_calendar_event"("is_active");

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_bulletin" ADD CONSTRAINT "nx00_bulletin_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_calendar_event" ADD CONSTRAINT "nx00_calendar_event_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
