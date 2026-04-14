-- nx01_currency.id is VARCHAR(15); nx02 FK columns were VARCHAR(10) and could not store real currency ids.

ALTER TABLE "nx02_rfq_item" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
ALTER TABLE "nx02_po" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
ALTER TABLE "nx02_rr" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
ALTER TABLE "nx02_pr" ALTER COLUMN "currency_id" TYPE VARCHAR(15);
