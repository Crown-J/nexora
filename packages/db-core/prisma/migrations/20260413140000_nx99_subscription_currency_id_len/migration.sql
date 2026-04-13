-- Align nx99_subscription.currency_id with nx01_currency.id (VARCHAR(15)) for FK integrity.
ALTER TABLE "nx99_subscription" ALTER COLUMN "currency_id" SET DATA TYPE VARCHAR(15);
