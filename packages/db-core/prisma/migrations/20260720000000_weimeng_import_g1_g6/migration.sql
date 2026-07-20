-- packages/db-core/prisma/migrations/20260720000000_weimeng_import_g1_g6/migration.sql
-- 偉盟單據匯入缺欄補齊 G1–G6（2026-07-20 Crown 拍板；對照文件 C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md）
--   G1 legacy_doc_no：7 張單據表加「舊系統原單號」＋ unique(tenant_id, legacy_doc_no)（歷史匯入冪等鍵＋追溯）
--   G2 nx04_so_item.unit_cost：銷貨成本快照（毛利計算；偉盟 RSIO.ROCOT）
--   G3 billing_partner_id：nx04_so / nx02_rr 帳款對象（可≠交易對象）
--   G4 nx02_rr.supplier_invoice_no / supplier_invoice_date：廠商發票（RSIM.ROINV/RODAV）
--   G5 nx02_rr.ref_so_id：進貨關聯銷貨單（代購/直送 RSIM.RORER）
--   G6 nx02_pr_item.rr_item_id 改可空（比照 nx04_sr_item.so_item_id 2026-07-07 前例）
-- ⚠️ 本機 migration 追蹤表壞 → 以 prisma db execute 手動套用（不走 migrate dev）

-- ── G1 legacy_doc_no（7 表）──────────────────────────────────────────────
ALTER TABLE nx04_so         ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx04_sr         ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx02_rr         ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx02_pr         ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx03_st         ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx03_stock_take ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);
ALTER TABLE nx03_disposal   ADD COLUMN IF NOT EXISTS legacy_doc_no VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS nx04_so_tenant_id_legacy_doc_no_key         ON nx04_so(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx04_sr_tenant_id_legacy_doc_no_key         ON nx04_sr(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx02_rr_tenant_id_legacy_doc_no_key         ON nx02_rr(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx02_pr_tenant_id_legacy_doc_no_key         ON nx02_pr(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx03_st_tenant_id_legacy_doc_no_key         ON nx03_st(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx03_stock_take_tenant_id_legacy_doc_no_key ON nx03_stock_take(tenant_id, legacy_doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS nx03_disposal_tenant_id_legacy_doc_no_key   ON nx03_disposal(tenant_id, legacy_doc_no);

-- ── G2 銷貨成本快照 ──────────────────────────────────────────────────────
ALTER TABLE nx04_so_item ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(14,4) NOT NULL DEFAULT 0;

-- ── G3 帳款對象 ─────────────────────────────────────────────────────────
ALTER TABLE nx04_so ADD COLUMN IF NOT EXISTS billing_partner_id VARCHAR(15);
ALTER TABLE nx02_rr ADD COLUMN IF NOT EXISTS billing_partner_id VARCHAR(15);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx04_so_billing_partner_id_fkey') THEN
    ALTER TABLE nx04_so
      ADD CONSTRAINT nx04_so_billing_partner_id_fkey
      FOREIGN KEY (billing_partner_id) REFERENCES nx01_partner(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx02_rr_billing_partner_id_fkey') THEN
    ALTER TABLE nx02_rr
      ADD CONSTRAINT nx02_rr_billing_partner_id_fkey
      FOREIGN KEY (billing_partner_id) REFERENCES nx01_partner(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── G4 廠商發票 ─────────────────────────────────────────────────────────
ALTER TABLE nx02_rr ADD COLUMN IF NOT EXISTS supplier_invoice_no   VARCHAR(20);
ALTER TABLE nx02_rr ADD COLUMN IF NOT EXISTS supplier_invoice_date DATE;

-- ── G5 進貨關聯銷貨單（代購/直送）─────────────────────────────────────────
ALTER TABLE nx02_rr ADD COLUMN IF NOT EXISTS ref_so_id VARCHAR(15);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nx02_rr_ref_so_id_fkey') THEN
    ALTER TABLE nx02_rr
      ADD CONSTRAINT nx02_rr_ref_so_id_fkey
      FOREIGN KEY (ref_so_id) REFERENCES nx04_so(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── G6 進退明細來源進貨改可空 ─────────────────────────────────────────────
ALTER TABLE nx02_pr_item ALTER COLUMN rr_item_id DROP NOT NULL;
