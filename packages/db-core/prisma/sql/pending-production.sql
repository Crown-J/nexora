-- packages/db-core/prisma/sql/pending-production.sql
-- 位置：packages/db-core/prisma/sql/
-- 版本：2026-07-11 起累積（Hank 維護）
-- 說明：「db execute 範式」下（migrate dev 壞、執行長拍板）schema 變更不產 migration、
--       各機各自 db execute。本檔累積【尚未套到 Railway production】的 DDL、
--       production 部署前必須整檔跑過一次（全部冪等、可重複執行）。
--       套完 production 後：把已套段落移到檔尾「已套用歷史」區、標日期。

-- ============================================================
-- 【待套用】
-- ============================================================

-- ---- 1) W5 異常鏈 Step 3a（commit 3ba076a1、2026-07-11）：四張處置單加來源異常單軟連結 ----
ALTER TABLE "nx02_pr"             ADD COLUMN IF NOT EXISTS "source_issue_report_id" VARCHAR(15);
ALTER TABLE "nx02_warranty_claim" ADD COLUMN IF NOT EXISTS "source_issue_report_id" VARCHAR(15);
ALTER TABLE "nx03_disposal"       ADD COLUMN IF NOT EXISTS "source_issue_report_id" VARCHAR(15);
ALTER TABLE "nx03_conversion"     ADD COLUMN IF NOT EXISTS "source_issue_report_id" VARCHAR(15);

-- ---- 2) WEIMENG-P2 Step 1（commit 9ba2172b、2026-07-11）：零件條碼對照子表 ----
CREATE SEQUENCE IF NOT EXISTS "seq_nx01_part_barcode_id" START 1;
CREATE OR REPLACE FUNCTION gen_nx01_part_barcode_id()
RETURNS VARCHAR AS $$
  SELECT 'NX01PBAR' || LPAD(nextval('seq_nx01_part_barcode_id')::text, 7, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS "nx01_part_barcode" (
  "id"         VARCHAR(15) NOT NULL DEFAULT gen_nx01_part_barcode_id(),
  "tenant_id"  VARCHAR(15) NOT NULL,
  "part_id"    VARCHAR(15) NOT NULL,
  "barcode"    VARCHAR(64) NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "remark"     VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" VARCHAR(15) NOT NULL,
  CONSTRAINT "nx01_part_barcode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nx01_part_barcode_tenant_id_barcode_key"
  ON "nx01_part_barcode" ("tenant_id", "barcode");
CREATE INDEX IF NOT EXISTS "nx01_part_barcode_tenant_id_part_id_idx"
  ON "nx01_part_barcode" ("tenant_id", "part_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx01_part_barcode_tenant_id_fkey') THEN
    ALTER TABLE "nx01_part_barcode"
      ADD CONSTRAINT "nx01_part_barcode_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "nx99_tenant" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx01_part_barcode_part_id_fkey') THEN
    ALTER TABLE "nx01_part_barcode"
      ADD CONSTRAINT "nx01_part_barcode_part_id_fkey"
      FOREIGN KEY ("part_id") REFERENCES "nx01_part" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ---- 3) AP 帳款歸戶（feature/ap-bill-to、2026-07-11）：承 PO 付款對象 ----
ALTER TABLE "nx05_ap_ledger" ADD COLUMN IF NOT EXISTS "bill_to_partner_id" VARCHAR(15);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx05_ap_ledger_bill_to_partner_id_fkey') THEN
    ALTER TABLE "nx05_ap_ledger"
      ADD CONSTRAINT "nx05_ap_ledger_bill_to_partner_id_fkey"
      FOREIGN KEY ("bill_to_partner_id") REFERENCES "nx01_partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---- 4) F2-TUNING 定案 1（2026-07-12）：客戶主檔補預設取貨方式 ----
-- 值域同 nx04_so.delivery_type（D=配送/P=自取/C=寄貨）、nullable、無 FK/CHECK（application 層 enum）
ALTER TABLE "nx01_partner" ADD COLUMN IF NOT EXISTS "default_delivery_type" VARCHAR(1);

-- ---- 5) TRANSFER-INQ 6/7（2026-07-12）：報價紀錄調貨旗標 ----
-- F2 報價④出貨倉庫選「調貨」＝報這顆時已決定走同行調貨、旗標落進紀錄
ALTER TABLE "nx04_quote_record" ADD COLUMN IF NOT EXISTS "is_transfer" BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- 6) F2 搜尋效能（2026-07-13 問題3）：pg_trgm 函式索引 ----
-- 料號搜尋原 regexp_replace(...) LIKE '%…%' 全表掃 11 萬筆 ~356ms；
--   後端 part-search.service 同步把 OR 改 UNION（OR 讓 planner 放棄索引）→ ~1ms。
-- ⚠️ 索引運算式必須與 part-search.service 查詢逐字一致，否則不會被使用。
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_nx01_part_code_norm_trgm ON nx01_part
  USING gin (regexp_replace(lower(code), '[ #\-*.]', '', 'g') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nx01_part_sec_code_norm_trgm ON nx01_part
  USING gin (regexp_replace(lower(coalesce(sec_code, '')), '[ #\-*.]', '', 'g') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nx01_part_oem_code_norm_trgm ON nx01_part_oem_code
  USING gin (regexp_replace(lower(oem_code), '[ #\-*.]', '', 'g') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nx01_part_name_trgm ON nx01_part
  USING gin (name gin_trgm_ops);

-- ============================================================
-- 【已套用歷史】（production 套完把段落移到這、標套用日期）
-- ============================================================
-- （尚無）
