/**
 * 從 docs/spec/nx*_field_v1.csv 產生 prisma/schema.prisma
 * 執行：node scripts/generate-schema-from-spec.mjs（cwd = packages/db-core）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SPEC_DIR = path.resolve(ROOT, '../../docs/spec');
const OUT_FILE = path.join(ROOT, 'prisma/schema.prisma');

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

function parseCsvFile(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function tableToModel(table) {
  return table
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function genIdFn(table) {
  return `gen_${table}_id()`;
}

function prismaType(sqlTypeRaw) {
  const sqlType = sqlTypeRaw.toUpperCase().trim();
  if (sqlType === 'JSON') return { prisma: 'Json', db: null };
  if (sqlType === 'TEXT') return { prisma: 'String', db: '@db.Text' };
  if (sqlType === 'BOOLEAN') return { prisma: 'Boolean', db: null };
  if (sqlType === 'INT' || sqlType === 'INTEGER') return { prisma: 'Int', db: null };
  if (sqlType === 'BIGINT') return { prisma: 'BigInt', db: null };
  if (sqlType === 'TIMESTAMP' || sqlType === 'TIMESTAMPTZ') return { prisma: 'DateTime', db: null };
  if (sqlType === 'DATE') return { prisma: 'DateTime', db: '@db.Date' };
  const dec = sqlType.match(/^DECIMAL\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (dec) return { prisma: 'Decimal', db: `@db.Decimal(${dec[1]},${dec[2]})` };
  const vc = sqlType.match(/^VARCHAR\s*\(\s*(\d+)\s*\)/);
  if (vc) return { prisma: 'String', db: `@db.VarChar(${vc[1]})` };
  const chr = sqlType.match(/^CHAR\s*\(\s*(\d+)\s*\)/);
  if (chr) return { prisma: 'String', db: `@db.Char(${chr[1]})` };
  return { prisma: 'String', db: null };
}

function isUserAuditScalarFk(row) {
  if (row['FK'] !== 'True') return false;
  const col = row['欄位名稱'];
  if (col === 'id') return false;
  // 凡審計／操作人欄位一律純 scalar（規格 CSV 可能寫 nx02_user，實際為 nx01_user）
  if (col.endsWith('_by')) return true;
  if (col === 'actor_user_id') return true;
  if (
    col.endsWith('_user_id') &&
    (col.includes('actor') || col.includes('assign') || col.includes('grant') || col.includes('revoke'))
  )
    return true;
  return false;
}

/** 規格 CSV 誤植：採購單明細引用 nx02_part，應為 nx01_part（主檔） */
function normalizeRefTable(ref) {
  const r = ref?.trim();
  if (!r) return r;
  const map = {
    nx02_part: 'nx01_part',
    nx02_partner: 'nx01_partner',
    nx02_warehouse: 'nx01_warehouse',
    nx02_currency: 'nx01_currency',
    nx02_location: 'nx01_location',
    nx01_rr: 'nx02_rr',
    nx02_user: 'nx01_user',
  };
  return map[r] || r;
}

function parseDefault(def, prismaT) {
  const d = def?.trim();
  if (!d || d === 'GEN') return null;
  if (d === 'NOW' || d === 'NOW()') return prismaT === 'DateTime' ? '@default(now())' : null;
  if (d === 'TRUE') return '@default(true)';
  if (d === 'FALSE') return '@default(false)';
  if (/^-?\d+$/.test(d)) {
    if (prismaT === 'String') return `@default("${d}")`;
    return `@default(${d})`;
  }
  if (prismaT === 'String' && d.length < 80 && !d.includes('"') && !d.includes(',')) return `@default("${d}")`;
  return null;
}

function escComment(s) {
  if (!s) return '';
  return s.replace(/\r?\n/g, ' ').replace(/\/\//g, '/ /').trim();
}

/** 欄位 /// 註解：規格說明 + CSV「啟用最低需求版本」 */
function fieldDoc(row) {
  const desc = escComment(row['欄位說明']);
  const verRaw = (row['啟用最低需求版本'] || '').trim();
  const ver = verRaw || '—';
  const parts = [];
  if (desc) parts.push(desc);
  parts.push(`啟用最低需求版本：${ver}`);
  return parts.join('；');
}

function relationSideName(camelField) {
  if (camelField.endsWith('Id')) return camelField.slice(0, -2);
  return `rel${camelField.charAt(0).toUpperCase()}${camelField.slice(1)}`;
}

function main() {
  /** @type {Map<string, object[]>} */
  const tables = new Map();

  for (const fn of FIELD_FILES) {
    const p = path.join(SPEC_DIR, fn);
    if (!fs.existsSync(p)) {
      console.error('Missing:', p);
      process.exit(1);
    }
    for (const row of parseCsvFile(p)) {
      const t = row['表格名稱']?.trim();
      if (!t) continue;
      if (!tables.has(t)) tables.set(t, []);
      tables.get(t).push(row);
    }
  }

  for (const [, rows] of tables) {
    rows.sort((a, b) => Number(a['欄位序號']) - Number(b['欄位序號']));
  }

  const tableNames = [...tables.keys()].sort();

  /** @type {Map<string, { relName: string; fromModel: string }[]>} */
  const backRefs = new Map();

  function noteBack(targetModel, relName, fromModel) {
    if (!backRefs.has(targetModel)) backRefs.set(targetModel, []);
    backRefs.get(targetModel).push({ relName, fromModel });
  }

  // Pass 1: collect Prisma relation back-references
  for (const table of tableNames) {
    const rows = tables.get(table);
    const model = tableToModel(table);
    for (const row of rows) {
      const col = row['欄位名稱'];
      const camel = snakeToCamel(col);
      const isFk = row['FK'] === 'True';
      let refTable = normalizeRefTable(row['來源表格']?.trim());
      if (!isFk || !refTable || isUserAuditScalarFk(row)) continue;
      if (!tables.has(refTable)) continue;
      const refModel = tableToModel(refTable);
      const relName = `R_${model}_${camel}`;
      noteBack(refModel, relName, model);
    }
  }

  const header = `// =============================================================================
// NEXORA GRID — Prisma Schema（docs/spec 欄位表驅動）
// =============================================================================
// 產生：node scripts/generate-schema-from-spec.mjs（packages/db-core）
// 規格來源：
//   - docs/spec/nx01_field_v1.csv … nx09_field_v1.csv、nx98、nx99
//   - docs/spec/nx_table_v7.csv（表清單／模組／說明）
//   - docs/spec/nx_model_v2.csv（模組定義）
//   - docs/spec/version_plan.csv、version_feature_matrix.csv（方案與功能）
//
// 命名：Prisma camelCase；DB snake_case @map；表 nx{模組}_{實體}；Model Nx{模組}{PascalCase}。
// ID：VARCHAR(15)，dbgenerated("gen_{table}_id()") — 首包 migration 已內建 seq + gen_*（見 scripts/generate-gen-id-sql.mjs）。
// 欄位 ///：含 CSV「欄位說明」+「啟用最低需求版本」（LITE / PLUS / PRO 等級距標示如 LITE-CORE、PRO）。
// 租戶：業務表 tenant_id；NX99 為系統層（無租戶欄位）。
// 審計：created_by／updated_by 等指向 nx01_user 僅 scalar，不建立 Relation（避免 Nx01User 反向關聯過大）。
// 其餘 FK：雙向 @relation，名稱 R_{FromModel}_{fkFieldCamel}；反向欄位 rev_{FromModel}_{fkFieldCamel}。
//
// 產生器修正（CSV 與實際模組對齊）：
// - nx02_part / nx02_partner / nx02_warehouse / nx02_currency / nx02_location → nx01_* 主檔表
// - nx01_rr → nx02_rr（進貨單屬採購模組）
// - 主鍵 id：規格常將 GEN 寫在「欄位說明」；凡 PK 欄位 id 一律 dbgenerated(gen_{table}_id())
// - 欄位表尚未提供的表（例：nx01_employee）：指向該表的 FK 僅輸出 scalar，不產生 @relation
// =============================================================================

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

`;

  const modelBlocks = [];

  for (const table of tableNames) {
    const rows = tables.get(table);
    const model = tableToModel(table);
    const out = [];
    out.push(`/// =======================================================`);
    out.push(`/// ${model} — DB table \`${table}\``);
    out.push(`/// =======================================================`);
    out.push(`model ${model} {`);

    const relLines = [];

    for (const row of rows) {
      const col = row['欄位名稱'];
      const camel = snakeToCamel(col);
      const docText = fieldDoc(row);
      const isPk = row['PK'] === 'True';
      const isNn = row['NN'] === 'True';
      const isFk = row['FK'] === 'True';
      let refTable = normalizeRefTable(row['來源表格']?.trim());
      const defVal = row['預設值']?.trim();
      const sqlType = row['型別'];
      const { prisma: pType, db: dbAttr } = prismaType(sqlType);
      const optional = isNn ? '' : '?';

      const doc = docText ? `  /// ${docText}\n` : '';

      // 規格常把 GEN 寫在欄位說明而非「預設值」欄；凡 id + PK 即視為序列 ID
      if (isPk && col === 'id') {
        out.push(`${doc}  id String @id @default(dbgenerated("${genIdFn(table)}")) @db.VarChar(15)`);
        continue;
      }

      const attrList = [];
      if (dbAttr) attrList.push(dbAttr);
      if (col !== camel) attrList.push(`@map("${col}")`);

      if (col === 'updated_at' && pType === 'DateTime' && isNn) {
        attrList.push('@updatedAt');
      } else if (col === 'created_at' && pType === 'DateTime' && isNn && (defVal === 'NOW' || defVal === 'NOW()')) {
        attrList.push('@default(now())');
      } else {
        const d = parseDefault(defVal, pType);
        if (d) attrList.push(d);
      }

      const attrStr = attrList.length ? ` ${attrList.join(' ')}` : '';
      out.push(`${doc}  ${camel} ${pType}${optional}${attrStr}`);

      if (isFk && refTable && !isUserAuditScalarFk(row) && tables.has(refTable)) {
        const refModel = tableToModel(refTable);
        const relName = `R_${model}_${camel}`;
        const side = relationSideName(camel);
        relLines.push(
          `  ${side} ${refModel}${optional} @relation("${relName}", fields: [${camel}], references: [id])`,
        );
      }
    }

    if (table === 'nx01_user') {
      relLines.push(
        `  createdByUser ${model}? @relation("Nx01UserCreatedBy", fields: [createdBy], references: [id])`,
      );
      relLines.push(
        `  updatedByUser ${model}? @relation("Nx01UserUpdatedBy", fields: [updatedBy], references: [id])`,
      );
      relLines.push(`  usersCreated ${model}[] @relation("Nx01UserCreatedBy")`);
      relLines.push(`  usersUpdated ${model}[] @relation("Nx01UserUpdatedBy")`);
    }

    for (const rl of relLines) out.push(rl);

    const backs = backRefs.get(model) || [];
    const used = new Set();
    for (const { relName, fromModel } of backs) {
      if (used.has(relName)) continue;
      used.add(relName);
      const suffix = relName.replace(/^R_/, '');
      out.push(`  rev_${suffix} ${fromModel}[] @relation("${relName}")`);
    }

    if (table === 'nx01_user') {
      out.push(`  @@unique([tenantId, userAccount])`);
    }
    if (table === 'nx03_stock_balance') {
      out.push(`  @@unique([tenantId, partId, warehouseId])`);
    }

    const uqSingles = rows
      .filter((r) => r['UQ'] === 'True' && r['欄位名稱'] !== 'id')
      .map((r) => snakeToCamel(r['欄位名稱']));
    if (uqSingles.length === 1) {
      out.push(`  @@unique([${uqSingles[0]}])`);
    }

    out.push(`  @@map("${table}")`);
    out.push(`}`);
    modelBlocks.push(out.join('\n'));
  }

  fs.writeFileSync(OUT_FILE, header + '\n' + modelBlocks.join('\n\n') + '\n', 'utf8');
  console.log('Wrote', OUT_FILE, 'tables:', tableNames.length);
}

main();
