import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const out = path.join(ROOT, 'prisma/migrations/20260413120000_spec_v7_baseline/migration.sql');
const hdr = `-- =============================================================================
-- NEXORA spec v7 baseline（全新第一包）
-- 1) 全部 gen_{table}_id() + SEQUENCE（128 組）
-- 2) Prisma migrate diff --from-empty --to-schema 產生之 DDL
-- gen SQL：node scripts/generate-gen-id-sql.mjs
-- =============================================================================

`;
const gen = fs.readFileSync(path.join(ROOT, 'prisma/_gen_id_fragment.sql'), 'utf8');
const ddl = fs.readFileSync(path.join(ROOT, 'prisma/_ddl_fragment.sql'), 'utf8');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, hdr + gen + '\n\n' + ddl, 'utf8');
console.log('Wrote', out);
