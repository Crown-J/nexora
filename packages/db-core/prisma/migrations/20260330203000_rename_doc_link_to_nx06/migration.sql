-- Align physical table with docs/field_list.csv: nx06_doc_link (NX06DOCL id prefix), not nx04.

ALTER SEQUENCE "nx04_docl_seq" RENAME TO "nx06_docl_seq";

CREATE OR REPLACE FUNCTION gen_nx06_docl_id()
RETURNS VARCHAR AS $$ SELECT 'NX06DOCL' || LPAD(nextval('nx06_docl_seq')::text, 7, '0'); $$ LANGUAGE sql;

ALTER TABLE "nx04_doc_link" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nx04_doc_link" ALTER COLUMN "id" SET DEFAULT gen_nx06_docl_id();

DROP FUNCTION IF EXISTS gen_nx04_docl_id();

ALTER TABLE "nx04_doc_link" RENAME TO "nx06_doc_link";

ALTER INDEX "nx04_doc_link_pkey" RENAME TO "nx06_doc_link_pkey";
