-- v1.2 對齊軌 C-FU FU-system-param-01：報價單預設有效期
-- 對應 v1.2 §12.3 系統參數

ALTER TABLE "nx99_tenant"
  ADD COLUMN "quote_default_validity_days" INTEGER NOT NULL DEFAULT 30;
