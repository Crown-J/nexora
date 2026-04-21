// packages/db-core/prisma/seed/system/nx01_view.ts
// @FUNCTION_CODE SYS-SEED-SVC-008-F01
// 系統層：118 個畫面代碼（從 docs/spec 來源 CSV 載入）。

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { PrismaClient } from '../../../generated/prisma';
import { seedDataSystemDir } from '../lib/paths';
import { stripUtf8Bom } from '../lib/strip-bom';
import { viewCodeToModuleCode } from '../lib/view-module-code';
import { SYSADMIN_USER_ID } from './constants';

type ViewCsvRow = {
  view_code: string;
  view_name: string;
  route: string;
  min_plan: string;
  description: string;
};

export async function seedNx01View(prisma: PrismaClient): Promise<void> {
  const csvPath = path.join(seedDataSystemDir(), 'nx01_view.csv');
  const raw = stripUtf8Bom(fs.readFileSync(csvPath, 'utf8'));
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as ViewCsvRow[];

  let sortNo = 0;
  let upserted = 0;
  for (const row of rows) {
    sortNo += 1;
    const code = row.view_code?.trim();
    if (!code) continue;
    await prisma.nx01View.upsert({
      where: { code },
      create: {
        code,
        name: row.view_name?.trim() || code,
        moduleCode: viewCodeToModuleCode(code),
        path: row.route?.trim() || '/dashboard',
        sortNo,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
      update: {
        name: row.view_name?.trim() || code,
        moduleCode: viewCodeToModuleCode(code),
        path: row.route?.trim() || '/dashboard',
        sortNo,
        isActive: true,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
    upserted += 1;
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_view_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_view), 0), 1), true)`,
  );

  console.log(`✅ system/nx01_view: ${upserted} 筆（upsert by code，CSV ${rows.length} 列）`);
}
