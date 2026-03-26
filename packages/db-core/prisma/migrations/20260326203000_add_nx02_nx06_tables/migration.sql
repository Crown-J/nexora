-- NX02～NX06：部門／員工／單位／類別／產品（對應設計 NX02_Dept～NX06_Product；CompanyID 以 tenant_id 對應租戶）
-- 欄位說明以 COMMENT ON 寫入 PostgreSQL（與 Prisma /// 對齊）

CREATE SEQUENCE IF NOT EXISTS nx02_dept_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx03_emp_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx04_unit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx05_cat_seq START 1;
CREATE SEQUENCE IF NOT EXISTS nx06_prod_seq START 1;

CREATE OR REPLACE FUNCTION gen_nx02_dept_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx02_dept_seq');
  RETURN 'NX02DEPT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx03_emp_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx03_emp_seq');
  RETURN 'NX03EMPL' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx04_unit_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx04_unit_seq');
  RETURN 'NX04UNIT' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx05_cat_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx05_cat_seq');
  RETURN 'NX05CAT' || LPAD(seq_val::TEXT, 8, '0');
END; $$;

CREATE OR REPLACE FUNCTION gen_nx06_prod_id()
RETURNS VARCHAR(15) LANGUAGE plpgsql AS $$
DECLARE seq_val BIGINT;
BEGIN
  seq_val := nextval('nx06_prod_seq');
  RETURN 'NX06PROD' || LPAD(seq_val::TEXT, 7, '0');
END; $$;

-- NX02 部門主檔
CREATE TABLE "nx02_dept" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx02_dept_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "dept_code" VARCHAR(20) NOT NULL,
    "dept_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx02_dept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx02_dept_tenant_id_dept_code_key" ON "nx02_dept"("tenant_id", "dept_code");
CREATE INDEX "nx02_dept_tenant_id_idx" ON "nx02_dept"("tenant_id");

ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx02_dept" ADD CONSTRAINT "nx02_dept_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx02_dept" IS 'NX02 部門主檔（對應設計 NX02_Dept；公司代號以 tenant_id 表示）';
COMMENT ON COLUMN "nx02_dept"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx02_dept"."tenant_id" IS '租戶／公司（對應設計 CompanyID）';
COMMENT ON COLUMN "nx02_dept"."dept_code" IS '部門代號';
COMMENT ON COLUMN "nx02_dept"."dept_name" IS '部門名稱';
COMMENT ON COLUMN "nx02_dept"."remark" IS '備註';
COMMENT ON COLUMN "nx02_dept"."created_at" IS '建立日期';
COMMENT ON COLUMN "nx02_dept"."created_by" IS '建立人員（→ nx00_user.id）';
COMMENT ON COLUMN "nx02_dept"."updated_at" IS '修改日期';
COMMENT ON COLUMN "nx02_dept"."updated_by" IS '修改人員（→ nx00_user.id）';

-- NX03 員工主檔
CREATE TABLE "nx03_emp" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx03_emp_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "emp_code" VARCHAR(20) NOT NULL,
    "emp_name" VARCHAR(50) NOT NULL,
    "dept_id" VARCHAR(15) NOT NULL,
    "title" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx03_emp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx03_emp_tenant_id_emp_code_key" ON "nx03_emp"("tenant_id", "emp_code");
CREATE INDEX "nx03_emp_tenant_id_idx" ON "nx03_emp"("tenant_id");
CREATE INDEX "nx03_emp_dept_id_idx" ON "nx03_emp"("dept_id");

ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "nx02_dept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx03_emp" ADD CONSTRAINT "nx03_emp_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx03_emp" IS 'NX03 員工主檔（對應設計 NX03_Emp）';
COMMENT ON COLUMN "nx03_emp"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx03_emp"."tenant_id" IS '租戶／公司';
COMMENT ON COLUMN "nx03_emp"."emp_code" IS '員工代號';
COMMENT ON COLUMN "nx03_emp"."emp_name" IS '員工姓名';
COMMENT ON COLUMN "nx03_emp"."dept_id" IS '部門（→ nx02_dept.id）';
COMMENT ON COLUMN "nx03_emp"."title" IS '職稱';
COMMENT ON COLUMN "nx03_emp"."phone" IS '電話';
COMMENT ON COLUMN "nx03_emp"."email" IS '電子郵件';
COMMENT ON COLUMN "nx03_emp"."remark" IS '備註';
COMMENT ON COLUMN "nx03_emp"."created_at" IS '建立日期';
COMMENT ON COLUMN "nx03_emp"."created_by" IS '建立人員（→ nx00_user.id）';
COMMENT ON COLUMN "nx03_emp"."updated_at" IS '修改日期';
COMMENT ON COLUMN "nx03_emp"."updated_by" IS '修改人員（→ nx00_user.id）';

-- NX04 單位主檔
CREATE TABLE "nx04_unit" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx04_unit_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "unit_code" VARCHAR(20) NOT NULL,
    "unit_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx04_unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx04_unit_tenant_id_unit_code_key" ON "nx04_unit"("tenant_id", "unit_code");
CREATE INDEX "nx04_unit_tenant_id_idx" ON "nx04_unit"("tenant_id");

ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx04_unit" ADD CONSTRAINT "nx04_unit_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx04_unit" IS 'NX04 單位主檔（對應設計 NX04_Unit）';
COMMENT ON COLUMN "nx04_unit"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx04_unit"."tenant_id" IS '租戶／公司';
COMMENT ON COLUMN "nx04_unit"."unit_code" IS '單位代號';
COMMENT ON COLUMN "nx04_unit"."unit_name" IS '單位名稱';
COMMENT ON COLUMN "nx04_unit"."remark" IS '備註';
COMMENT ON COLUMN "nx04_unit"."created_at" IS '建立日期';
COMMENT ON COLUMN "nx04_unit"."created_by" IS '建立人員（→ nx00_user.id）';
COMMENT ON COLUMN "nx04_unit"."updated_at" IS '修改日期';
COMMENT ON COLUMN "nx04_unit"."updated_by" IS '修改人員（→ nx00_user.id）';

-- NX05 類別主檔
CREATE TABLE "nx05_category" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx05_cat_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "category_code" VARCHAR(20) NOT NULL,
    "category_name" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx05_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx05_category_tenant_id_category_code_key" ON "nx05_category"("tenant_id", "category_code");
CREATE INDEX "nx05_category_tenant_id_idx" ON "nx05_category"("tenant_id");

ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx05_category" ADD CONSTRAINT "nx05_category_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx05_category" IS 'NX05 類別主檔（對應設計 NX05_Category）';
COMMENT ON COLUMN "nx05_category"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx05_category"."tenant_id" IS '租戶／公司';
COMMENT ON COLUMN "nx05_category"."category_code" IS '類別代號';
COMMENT ON COLUMN "nx05_category"."category_name" IS '類別名稱';
COMMENT ON COLUMN "nx05_category"."remark" IS '備註';
COMMENT ON COLUMN "nx05_category"."created_at" IS '建立日期';
COMMENT ON COLUMN "nx05_category"."created_by" IS '建立人員（→ nx00_user.id）';
COMMENT ON COLUMN "nx05_category"."updated_at" IS '修改日期';
COMMENT ON COLUMN "nx05_category"."updated_by" IS '修改人員（→ nx00_user.id）';

-- NX06 產品主檔
CREATE TABLE "nx06_product" (
    "id" VARCHAR(15) NOT NULL DEFAULT gen_nx06_prod_id(),
    "tenant_id" VARCHAR(15) NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(100),
    "unit_id" VARCHAR(15) NOT NULL,
    "category_id" VARCHAR(15) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(15),
    CONSTRAINT "nx06_product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nx06_product_tenant_id_product_code_key" ON "nx06_product"("tenant_id", "product_code");
CREATE INDEX "nx06_product_tenant_id_idx" ON "nx06_product"("tenant_id");
CREATE INDEX "nx06_product_unit_id_idx" ON "nx06_product"("unit_id");
CREATE INDEX "nx06_product_category_id_idx" ON "nx06_product"("category_id");

ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "nx04_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "nx05_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nx06_product" ADD CONSTRAINT "nx06_product_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "nx06_product" IS 'NX06 產品主檔（對應設計 NX06_Product）';
COMMENT ON COLUMN "nx06_product"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx06_product"."tenant_id" IS '租戶／公司';
COMMENT ON COLUMN "nx06_product"."product_code" IS '產品代號';
COMMENT ON COLUMN "nx06_product"."product_name" IS '產品名稱';
COMMENT ON COLUMN "nx06_product"."spec" IS '規格';
COMMENT ON COLUMN "nx06_product"."unit_id" IS '單位（→ nx04_unit.id）';
COMMENT ON COLUMN "nx06_product"."category_id" IS '類別（→ nx05_category.id）';
COMMENT ON COLUMN "nx06_product"."price" IS '單價';
COMMENT ON COLUMN "nx06_product"."cost" IS '成本';
COMMENT ON COLUMN "nx06_product"."remark" IS '備註';
COMMENT ON COLUMN "nx06_product"."created_at" IS '建立日期';
COMMENT ON COLUMN "nx06_product"."created_by" IS '建立人員（→ nx00_user.id）';
COMMENT ON COLUMN "nx06_product"."updated_at" IS '修改日期';
COMMENT ON COLUMN "nx06_product"."updated_by" IS '修改人員（→ nx00_user.id）';
