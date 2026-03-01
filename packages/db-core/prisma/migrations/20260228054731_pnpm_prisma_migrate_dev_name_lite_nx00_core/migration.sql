-- CreateTable
CREATE TABLE "nx00_user" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_id(),
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_user_role" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_user_role_id(),
    "user_id" VARCHAR(15) NOT NULL,
    "role_id" VARCHAR(15) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nx00_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_view_id(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "path" VARCHAR(200) NOT NULL,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_role_view" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_role_view_id(),
    "role_id" VARCHAR(15) NOT NULL,
    "view_id" VARCHAR(15) NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" VARCHAR(15),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_role_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_part" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_part_id(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "brand_id" VARCHAR(15),
    "spec" VARCHAR(200),
    "uom" VARCHAR(10) NOT NULL DEFAULT 'pcs',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_brand" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_brand_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "origin_country" VARCHAR(50),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_warehouse" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_warehouse_id(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_location" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_location_id(),
    "warehouse_id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100),
    "zone" VARCHAR(20),
    "rack" VARCHAR(20),
    "level_no" INTEGER,
    "bin_no" VARCHAR(20),
    "remark" VARCHAR(200),
    "sort_no" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_partner" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_partner_id(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "partner_type" VARCHAR(10) NOT NULL DEFAULT 'BOTH',
    "contact_name" VARCHAR(50),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "email" VARCHAR(100),
    "address" VARCHAR(200),
    "remark" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_audit_log" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx00_audit_log_id(),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" VARCHAR(15) NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "entity_table" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(20),
    "entity_code" VARCHAR(50),
    "summary" VARCHAR(200),
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_addr" VARCHAR(45),
    "user_agent" VARCHAR(200),

    CONSTRAINT "nx00_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_username_key" ON "nx00_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_code_key" ON "nx00_role"("code");

-- CreateIndex
CREATE INDEX "nx00_user_role_user_id_idx" ON "nx00_user_role"("user_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_role_id_idx" ON "nx00_user_role"("role_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_is_active_idx" ON "nx00_user_role"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_role_user_id_role_id_key" ON "nx00_user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_view_code_key" ON "nx00_view"("code");

-- CreateIndex
CREATE INDEX "nx00_view_module_code_idx" ON "nx00_view"("module_code");

-- CreateIndex
CREATE INDEX "nx00_view_is_active_idx" ON "nx00_view"("is_active");

-- CreateIndex
CREATE INDEX "nx00_role_view_role_id_idx" ON "nx00_role_view"("role_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_view_id_idx" ON "nx00_role_view"("view_id");

-- CreateIndex
CREATE INDEX "nx00_role_view_is_active_idx" ON "nx00_role_view"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_view_role_id_view_id_key" ON "nx00_role_view"("role_id", "view_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_part_code_key" ON "nx00_part"("code");

-- CreateIndex
CREATE INDEX "nx00_part_brand_id_idx" ON "nx00_part"("brand_id");

-- CreateIndex
CREATE INDEX "nx00_part_is_active_idx" ON "nx00_part"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_brand_code_key" ON "nx00_brand"("code");

-- CreateIndex
CREATE INDEX "nx00_brand_is_active_idx" ON "nx00_brand"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_warehouse_code_key" ON "nx00_warehouse"("code");

-- CreateIndex
CREATE INDEX "nx00_warehouse_is_active_idx" ON "nx00_warehouse"("is_active");

-- CreateIndex
CREATE INDEX "nx00_location_warehouse_id_idx" ON "nx00_location"("warehouse_id");

-- CreateIndex
CREATE INDEX "nx00_location_is_active_idx" ON "nx00_location"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_location_warehouse_id_code_key" ON "nx00_location"("warehouse_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_partner_code_key" ON "nx00_partner"("code");

-- CreateIndex
CREATE INDEX "nx00_partner_is_active_idx" ON "nx00_partner"("is_active");

-- CreateIndex
CREATE INDEX "nx00_partner_partner_type_idx" ON "nx00_partner"("partner_type");

-- CreateIndex
CREATE INDEX "nx00_audit_log_occurred_at_idx" ON "nx00_audit_log"("occurred_at");

-- CreateIndex
CREATE INDEX "nx00_audit_log_actor_user_id_idx" ON "nx00_audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "nx00_audit_log_module_code_idx" ON "nx00_audit_log"("module_code");

-- CreateIndex
CREATE INDEX "nx00_audit_log_entity_table_idx" ON "nx00_audit_log"("entity_table");

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_view" ADD CONSTRAINT "nx00_view_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "nx00_view"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role_view" ADD CONSTRAINT "nx00_role_view_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "nx00_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_part" ADD CONSTRAINT "nx00_part_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand" ADD CONSTRAINT "nx00_brand_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_brand" ADD CONSTRAINT "nx00_brand_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_warehouse" ADD CONSTRAINT "nx00_warehouse_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "nx00_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_location" ADD CONSTRAINT "nx00_location_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_partner" ADD CONSTRAINT "nx00_partner_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_audit_log" ADD CONSTRAINT "nx00_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
