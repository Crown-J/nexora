-- NX05 Phase 6: AR/AP 狀態改 API token；關帳狀態 workflow；幣別 FK 長度對齊

ALTER TABLE "nx05_ar_ledger" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx05_ar_ledger" SET "status" = CASE "status"
  WHEN 'O' THEN 'OPEN'
  WHEN 'P' THEN 'PARTIAL'
  WHEN 'C' THEN 'PAID'
  WHEN 'V' THEN 'WRITTEN_OFF'
  ELSE "status"
END;
ALTER TABLE "nx05_ar_ledger" ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "nx05_ar_ledger" ALTER COLUMN "currency_id" TYPE VARCHAR(15);

ALTER TABLE "nx05_ap_ledger" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx05_ap_ledger" SET "status" = CASE "status"
  WHEN 'O' THEN 'OPEN'
  WHEN 'P' THEN 'PARTIAL'
  WHEN 'C' THEN 'PAID'
  WHEN 'V' THEN 'VOID'
  ELSE "status"
END;
ALTER TABLE "nx05_ap_ledger" ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "nx05_ap_ledger" ALTER COLUMN "currency_id" TYPE VARCHAR(15);

ALTER TABLE "nx05_closing" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx05_closing" SET "status" = CASE "status"
  WHEN 'C' THEN 'CLOSED'
  WHEN 'R' THEN 'REOPENED'
  ELSE "status"
END;
ALTER TABLE "nx05_closing" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- 票據／折讓：狀態改 API token
ALTER TABLE "nx05_note" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx05_note" SET "status" = CASE "status"
  WHEN 'H' THEN 'ACTIVE'
  WHEN 'C' THEN 'CLEARED'
  WHEN 'B' THEN 'BOUNCED'
  WHEN 'V' THEN 'VOIDED'
  ELSE "status"
END;
ALTER TABLE "nx05_note" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx05_allowance" ALTER COLUMN "status" TYPE VARCHAR(30);
UPDATE "nx05_allowance" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'A' THEN 'PENDING'
  WHEN 'P' THEN 'APPROVED'
  WHEN 'C' THEN 'PROCESSED'
  WHEN 'V' THEN 'VOIDED'
  ELSE "status"
END;
ALTER TABLE "nx05_allowance" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "nx05_paylog" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
