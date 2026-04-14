-- Align nx02 RFQ/PO/RR/PR doc_no length with v3 numbering (type-YYYYMM-warehouse-#####).

ALTER TABLE "nx02_rfq" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
ALTER TABLE "nx02_po" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
ALTER TABLE "nx02_rr" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
ALTER TABLE "nx02_pr" ALTER COLUMN "doc_no" TYPE VARCHAR(30);
