/**
 * 自 docs/parts2.csv 匯入零件與零件廠牌（nx00_part / nx00_part_brand）
 * - 料號依 CSV 原樣寫入 code（不 trim，僅略過全空白列）
 * - 副廠料號寫入 spec
 * - 廠牌：依「廠牌」欄建立／略過已存在（createMany skipDuplicates）
 *
 * 執行（需 DATABASE_URL）：
 *   pnpm --filter db-core import:parts2
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CSV_REL = path.join('docs', 'parts2.csv');
const CSV_PATH = path.resolve(__dirname, '../../../', CSV_REL);

const BATCH = 800;

function normalizeCell(s: unknown): string {
  if (s == null) return '';
  return String(s).replace(/\r/g, '');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('DATABASE_URL is not set');
  }

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`找不到 CSV：${CSV_PATH}`);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const admin = await prisma.nx00User.findUnique({
    where: { username: 'admin' },
    select: { id: true },
  });
  const createdBy = admin?.id ?? null;

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[];

  const brandSet = new Set<string>();
  for (const row of rows) {
    const b = normalizeCell(row['廠牌']).trim();
    if (b) brandSet.add(b);
  }

  const brandCodes = [...brandSet].sort((a, b) => a.localeCompare(b, 'en'));

  await prisma.nx00PartBrand.createMany({
    data: brandCodes.map((code, i) => ({
      code: code.slice(0, 30),
      name: code.length > 100 ? code.slice(0, 100) : code,
      sortNo: i,
      isActive: true,
      createdBy,
      updatedBy: createdBy,
    })),
    skipDuplicates: true,
  });

  const brandRows = await prisma.nx00PartBrand.findMany({
    where: { code: { in: brandCodes } },
    select: { id: true, code: true },
  });
  const brandCodeToId = new Map(brandRows.map((x) => [x.code, x.id]));
  console.log(`✅ 零件廠牌：CSV 內 ${brandCodes.length} 種，已對應 DB ${brandCodeToId.size} 筆 code`);

  type PartRow = {
    code: string;
    name: string;
    partBrandId: string | null;
    spec: string | null;
    uom: string;
    isActive: boolean;
    createdBy: string | null;
    updatedBy: string | null;
  };

  const partData: PartRow[] = [];
  for (const row of rows) {
    const code = normalizeCell(row['料號']);
    if (code.trim() === '') continue;
    if (code.length > 50) {
      throw new Error(`料號超過 50 字元（nx00_part.code）：${JSON.stringify(code)}`);
    }

    const brandKey = normalizeCell(row['廠牌']).trim();
    const alt = normalizeCell(row['副廠料號']).trim();
    let name = normalizeCell(row['品名']).trim();
    if (!name) name = code.trim() || code;
    if (name.length > 200) name = name.slice(0, 200);

    const spec = alt.length > 0 ? (alt.length > 200 ? alt.slice(0, 200) : alt) : null;

    partData.push({
      code,
      name,
      partBrandId: brandKey ? brandCodeToId.get(brandKey) ?? null : null,
      spec,
      uom: 'pcs',
      isActive: true,
      createdBy,
      updatedBy: createdBy,
    });
  }

  console.log(`📦 準備寫入零件 ${partData.length} 筆（batch=${BATCH}）…`);

  let total = 0;
  for (let i = 0; i < partData.length; i += BATCH) {
    const chunk = partData.slice(i, i + BATCH);
    const res = await prisma.nx00Part.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    total += res.count;
    console.log(`   batch ${Math.floor(i / BATCH) + 1}: createMany count=${res.count}`);
  }

  console.log(`✅ 完成：本次新增 ${total} 筆（已存在之料號會略過 skipDuplicates）`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
