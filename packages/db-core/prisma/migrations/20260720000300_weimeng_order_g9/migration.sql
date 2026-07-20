-- packages/db-core/prisma/migrations/20260720000300_weimeng_order_g9/migration.sql
-- 偉盟訂單匯入 G9（2026-07-20 Crown 拍板：新增專用訂單表）
--   NEXORA 原生無獨立客戶訂單文件（動線報價→SO），Nx04Co 是缺貨補單（綁 SO、無金額欄）。
--   為忠實容納偉盟 RORA/RORB（多行、含金額）新增 nx04_order / nx04_order_item。
--   純量外鍵（不進 Prisma 關聯圖），FK 約束於此建立。
-- ⚠️ 本機以 prisma db execute 手動套用（migrate 追蹤表壞）。

CREATE TABLE IF NOT EXISTS nx04_order (
  id            VARCHAR(15) PRIMARY KEY,
  tenant_id     VARCHAR(15) NOT NULL,
  warehouse_id  VARCHAR(15) NOT NULL,
  doc_no        VARCHAR(30) NOT NULL,
  legacy_doc_no VARCHAR(20),
  order_date    DATE NOT NULL,
  customer_id   VARCHAR(15) NOT NULL,
  expected_date DATE,
  source_doc_no VARCHAR(30),
  payment_term  VARCHAR(40),
  subtotal      DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_rate      DECIMAL(5,2)  NOT NULL DEFAULT 5,
  tax_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount  DECIMAL(14,2) NOT NULL DEFAULT 0,
  status        VARCHAR(30) NOT NULL DEFAULT 'CLOSED',
  remark        VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    VARCHAR(15) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,
  updated_by    VARCHAR(15) NOT NULL,
  CONSTRAINT nx04_order_tenant_id_fkey    FOREIGN KEY (tenant_id)    REFERENCES nx99_tenant(id),
  CONSTRAINT nx04_order_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES nx01_warehouse(id),
  CONSTRAINT nx04_order_customer_id_fkey  FOREIGN KEY (customer_id)  REFERENCES nx01_partner(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS nx04_order_doc_no_key ON nx04_order(doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx04_order_tenant_id_legacy_doc_no_key ON nx04_order(tenant_id, legacy_doc_no);
CREATE INDEX IF NOT EXISTS nx04_order_tenant_id_customer_id_idx ON nx04_order(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS nx04_order_item (
  id          VARCHAR(15) PRIMARY KEY,
  order_id    VARCHAR(15) NOT NULL,
  line_no     INTEGER NOT NULL,
  part_id     VARCHAR(15) NOT NULL,
  part_no     VARCHAR(50) NOT NULL,
  part_name   VARCHAR(200) NOT NULL,
  brand_name  VARCHAR(100),
  qty         DECIMAL(14,4) NOT NULL DEFAULT 0,
  unit_price  DECIMAL(14,4) NOT NULL DEFAULT 0,
  line_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  remark      VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  VARCHAR(15) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  updated_by  VARCHAR(15) NOT NULL,
  CONSTRAINT nx04_order_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES nx04_order(id) ON DELETE CASCADE,
  CONSTRAINT nx04_order_item_part_id_fkey  FOREIGN KEY (part_id)  REFERENCES nx01_part(id)
);
CREATE INDEX IF NOT EXISTS nx04_order_item_order_id_idx ON nx04_order_item(order_id);
