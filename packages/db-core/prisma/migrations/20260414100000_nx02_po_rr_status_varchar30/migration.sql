-- Widen PO/RR status for Phase 5 state machines (full tokens).

ALTER TABLE "nx02_po" ALTER COLUMN "status" TYPE VARCHAR(30);
ALTER TABLE "nx02_rr" ALTER COLUMN "status" TYPE VARCHAR(30);

UPDATE "nx02_po" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'S' THEN 'CONFIRMED'
  WHEN 'C' THEN 'CLOSED'
  WHEN 'V' THEN 'CANCELLED'
  ELSE "status"
END;

UPDATE "nx02_rr" SET "status" = CASE "status"
  WHEN 'D' THEN 'DRAFT'
  WHEN 'P' THEN 'POSTED'
  WHEN 'C' THEN 'CANCELLED'
  ELSE "status"
END;

ALTER TABLE "nx02_po" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "nx02_rr" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
