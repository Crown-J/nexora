import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { PrismaClient } from '../../../generated/prisma';
import { includeSeedRow, type SeedTier } from '../lib/seed-tier';
import { seedDataSystemDir } from '../lib/paths';
import { stripUtf8Bom } from '../lib/strip-bom';

type RoleViewCsvRow = {
  role_code: string;
  view_code: string;
  can_read: string;
  can_create: string;
  can_update: string;
  can_delete: string;
  can_export: string;
  seed_type: string;
};

function parseBool(v: string | undefined): boolean {
  return String(v ?? '').toUpperCase().trim() === 'TRUE';
}

export type RoleViewSeedContext = {
  tenantId: string;
  actorUserId: string;
  tier: SeedTier;
};

/**
 * 租戶層角色×畫面權限（CSV 為系統規格，實際寫入需 tenant / role / view 已存在）。
 */
export async function seedNx01RoleView(prisma: PrismaClient, ctx: RoleViewSeedContext): Promise<void> {
  const csvPath = path.join(seedDataSystemDir(), 'nx01_role_view.csv');
  const raw = stripUtf8Bom(fs.readFileSync(csvPath, 'utf8'));
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as RoleViewCsvRow[];

  const views = await prisma.nx01View.findMany({ select: { id: true, code: true } });
  const viewIdByCode = new Map(views.map((v) => [v.code, v.id]));

  const roles = await prisma.nx01Role.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, code: true },
  });
  const roleIdByCode = new Map(roles.map((r) => [r.code, r.id]));

  await prisma.nx01RoleView.deleteMany({ where: { tenantId: ctx.tenantId } });

  let inserted = 0;
  for (const row of rows) {
    if (!includeSeedRow(row.seed_type ?? 'ALL', ctx.tier)) continue;

    const viewId = viewIdByCode.get(row.view_code?.trim() ?? '');
    const roleId = roleIdByCode.get(row.role_code?.trim() ?? '');
    if (!viewId || !roleId) continue;

    await prisma.nx01RoleView.create({
      data: {
        tenantId: ctx.tenantId,
        roleId,
        viewId,
        canRead: parseBool(row.can_read),
        canCreate: parseBool(row.can_create),
        canUpdate: parseBool(row.can_update),
        canDelete: parseBool(row.can_delete),
        canExport: parseBool(row.can_export),
        canApprove: false,
        isActive: true,
        grantedBy: ctx.actorUserId,
      },
    });
    inserted += 1;
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_role_view_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_role_view), 0), 1), true)`,
  );

  console.log(`✅ system/nx01_role_view: ${inserted} 筆（tenant=${ctx.tenantId}）`);
}
