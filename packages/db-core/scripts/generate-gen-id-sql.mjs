/**
 * 依 prisma/schema.prisma 的 dbgenerated("gen_*_id()") 與 docs/spec/nx_table_v7.csv
 * 產出 PostgreSQL CREATE SEQUENCE + CREATE OR REPLACE FUNCTION 語句。
 * 執行：node scripts/generate-gen-id-sql.mjs [out.sql]（cwd = packages/db-core）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma/schema.prisma');
const TABLE_SPEC = path.resolve(ROOT, '../../docs/spec/nx_table_v7.csv');
const SPEC_DIR = path.resolve(ROOT, '../../docs/spec');
const FIELD_FILES = [
  'nx01_field_v1.csv',
  'nx02_field_v1.csv',
  'nx03_field_v1.csv',
  'nx04_field_v1.csv',
  'nx05_field_v1.csv',
  'nx06_field_v1.csv',
  'nx07_field_v1.csv',
  'nx08_field_v1.csv',
  'nx09_field_v1.csv',
  'nx98_field_v1.csv',
  'nx99_field_v1.csv',
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function loadTableIdExamples() {
  const map = new Map();
  const text = fs.readFileSync(TABLE_SPEC, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  const idxTable = headers.indexOf('表格名稱');
  const idxEx = headers.indexOf('Table ID 範例');
  if (idxTable < 0 || idxEx < 0) throw new Error('nx_table_v7.csv missing 表格名稱 / Table ID 範例');
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const t = cols[idxTable]?.trim();
    const ex = cols[idxEx]?.trim();
    if (t && ex && /^NX\d{2}[A-Z0-9]+\d{7}$/.test(ex)) {
      map.set(t, ex);
    }
  }
  // 補齊：欄位表有、nx_table_v7 尚未列的表（從 id 列「欄位說明」擷取 EX : NX08DRPT0000001）
  for (const fn of FIELD_FILES) {
    const p = path.join(SPEC_DIR, fn);
    if (!fs.existsSync(p)) continue;
    const fl = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim());
    const h = parseCsvLine(fl[0]);
    const hiTable = h.indexOf('表格名稱');
    const hiCol = h.indexOf('欄位名稱');
    const hiPk = h.indexOf('PK');
    const hiDesc = h.indexOf('欄位說明');
    if (hiTable < 0 || hiCol < 0 || hiPk < 0 || hiDesc < 0) continue;
    for (let i = 1; i < fl.length; i++) {
      const cols = parseCsvLine(fl[i]);
      const tbl = cols[hiTable]?.trim();
      const col = cols[hiCol]?.trim();
      const pk = cols[hiPk]?.trim();
      const desc = cols[hiDesc] || '';
      if (!tbl || col !== 'id' || pk !== 'True' || map.has(tbl)) continue;
      const m = desc.match(/EX\s*:\s*(NX\d{2}[A-Z0-9]+\d{7})\b/);
      if (m && /^NX\d{2}[A-Z0-9]+\d{7}$/.test(m[1])) map.set(tbl, m[1]);
    }
  }
  return map;
}

function tableFromFnName(fnBase) {
  // gen_nx01_user_id -> nx01_user
  return fnBase.replace(/^gen_/, '').replace(/_id$/, '');
}

function prefixFromExample(ex) {
  return ex.replace(/\d{7}$/, '');
}

function main() {
  const schema = fs.readFileSync(SCHEMA, 'utf8');
  const re = /dbgenerated\("(gen_nx\d{2}_[a-z0-9_]+_id)\(\)"\)/g;
  const names = new Set();
  let m;
  while ((m = re.exec(schema)) !== null) {
    names.add(m[1]);
  }
  const sorted = [...names].sort();
  const examples = loadTableIdExamples();

  const lines = [
    '-- NEXORA: ID 序號與 gen_*_id()（對齊 docs/spec Table ID 範例前綴）',
    '-- 由 scripts/generate-gen-id-sql.mjs 產生；置於 baseline migration 最前段',
    '',
  ];

  for (const fnBase of sorted) {
    const table = tableFromFnName(fnBase);
    const ex = examples.get(table);
    if (!ex) {
      console.error('Missing Table ID 範例 for table:', table);
      process.exit(1);
    }
    const prefix = prefixFromExample(ex);
    if (prefix.length + 7 !== 15) {
      console.warn('Unexpected prefix length', table, prefix, ex);
    }
    const seq = `seq_${table}_id`;
    lines.push(`CREATE SEQUENCE IF NOT EXISTS ${seq} START 1;`);
    lines.push(`CREATE OR REPLACE FUNCTION ${fnBase}()`);
    lines.push(`RETURNS VARCHAR AS $$`);
    lines.push(`  SELECT '${prefix}' || LPAD(nextval('${seq}')::text, 7, '0');`);
    lines.push(`$$ LANGUAGE sql;`);
    lines.push('');
  }

  const sql = lines.join('\n');
  const outPath = process.argv[2];
  if (outPath) {
    fs.writeFileSync(outPath, sql, 'utf8');
    console.log('Wrote', outPath, 'functions:', sorted.length);
  } else {
    process.stdout.write(sql);
  }
}

main();
