// packages/db-core/prisma/seed/template/apply-bulletin-category.ts
// @FUNCTION_CODE SYS-TMPL-SVC-015-F01
// 範本：公告分類（ALL、LITE/PLUS/PRO 分層）。
//
// 對齊 NX01-08 spec v1.0 §3.2 + §4.3：
//   - LITE：2 筆（all / system）
//   - PLUS：7 筆（all / system / mgmt / product / sales / warehouse / finance）
//   - PRO：同 PLUS、user 可加自訂（v1.0 範圍）
//
// audience_logic enum 對應：
//   - tenant_all  → 全租戶 user
//   - system_all  → 全租戶 user（SYSADMIN 跨租戶系統公告留未來軌）
//   - leaders_all → nx01_user_team.is_leader = true（軌 2 audience-query helper）
//   - by_team_id  → 對應 team_id（PLUS+ 部門 category）
//
// 依賴：必須在 applyTeam 之後執行（部門 category 引用 team_id）。
// 但本 seed 對齊軌 2 PRO/PLUS 「依 department 動態建 default team」、code 對齊 department.code、
// 透過 findFirst lookup 容忍命名 drift。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface CategoryRow {
  code: string;
  name: string;
  audienceLogic: 'tenant_all' | 'system_all' | 'leaders_all' | 'by_team_id';
  /** 部門對應 code（用於 lookup nx01_team.code 找 team_id），仅 by_team_id 時用 */
  teamCode?: string;
  tierRequired: 'LITE' | 'PLUS' | 'PRO';
  isSystem: boolean;
  sortOrder: number;
}

const CATEGORY_ROWS_LITE: CategoryRow[] = [
  { code: 'all',    name: '全公司', audienceLogic: 'tenant_all',  tierRequired: 'LITE', isSystem: true, sortOrder: 1 },
  { code: 'system', name: '系統',   audienceLogic: 'system_all',  tierRequired: 'LITE', isSystem: true, sortOrder: 2 },
];

const CATEGORY_ROWS_PLUS: CategoryRow[] = [
  ...CATEGORY_ROWS_LITE,
  { code: 'mgmt',      name: '管理', audienceLogic: 'leaders_all', tierRequired: 'PLUS', isSystem: true, sortOrder: 3 },
  // by_team_id 對應 department.code 動態 lookup（容忍 PRODUCT / PURCHASE 兩狀態、對齊軌 2 範式）
  { code: 'product',   name: '產品', audienceLogic: 'by_team_id', teamCode: 'PRODUCT',   tierRequired: 'PLUS', isSystem: true, sortOrder: 4 },
  { code: 'sales',     name: '銷售', audienceLogic: 'by_team_id', teamCode: 'SALES',     tierRequired: 'PLUS', isSystem: true, sortOrder: 5 },
  { code: 'warehouse', name: '倉管', audienceLogic: 'by_team_id', teamCode: 'WAREHOUSE', tierRequired: 'PLUS', isSystem: true, sortOrder: 6 },
  { code: 'finance',   name: '財務', audienceLogic: 'by_team_id', teamCode: 'FINANCE',   tierRequired: 'PLUS', isSystem: true, sortOrder: 7 },
];

function rowsForTier(tier: 'LITE' | 'PLUS' | 'PRO'): CategoryRow[] {
  if (tier === 'LITE') return CATEGORY_ROWS_LITE;
  return CATEGORY_ROWS_PLUS; // PRO 同 PLUS、user 自訂 v1.0 範圍由 application 層處理
}

export async function applyBulletinCategory(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, tier, actorUserId } = params;
  const rows = rowsForTier(tier);

  // 載入該租戶所有 active team（lookup teamCode → teamId）
  // 對齊軌 2 範式：team.code = department.code（容忍 PRODUCT / PURCHASE 兩狀態）
  const teams = await prisma.nx01Team.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, code: true },
  });
  const teamIdByCode = new Map(teams.map((t) => [t.code, t.id]));

  // PURCHASING role → PRODUCT team 範式（軌 2）、若 main 命名仍 PURCHASE、需 fallback
  // teamCode='PRODUCT' 找不到時、fallback 找 'PURCHASE'
  const PRODUCT_FALLBACK: Record<string, readonly string[]> = {
    PRODUCT: ['PRODUCT', 'PURCHASE'],
  };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of rows) {
    let teamId: string | null = null;
    if (r.audienceLogic === 'by_team_id' && r.teamCode) {
      const candidates = PRODUCT_FALLBACK[r.teamCode] ?? [r.teamCode];
      for (const code of candidates) {
        const id = teamIdByCode.get(code);
        if (id) {
          teamId = id;
          break;
        }
      }
      if (!teamId) {
        console.warn(
          `⚠️ [TEMPLATE] applyBulletinCategory: category ${r.code} teamCode ${r.teamCode} no matching team (tried: ${candidates.join('/')})`,
        );
        skipped += 1;
        continue;
      }
    }

    const existing = await prisma.nx01BulletinCategory.findFirst({
      where: { tenantId, code: r.code },
      select: { id: true },
    });

    if (existing) {
      await prisma.nx01BulletinCategory.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          audienceLogic: r.audienceLogic,
          teamId,
          tierRequired: r.tierRequired,
          isSystem: r.isSystem,
          sortOrder: r.sortOrder,
          isActive: true,
          updatedBy: actorUserId,
        },
      });
      updated += 1;
    } else {
      await prisma.nx01BulletinCategory.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          audienceLogic: r.audienceLogic,
          teamId,
          tierRequired: r.tierRequired,
          isSystem: r.isSystem,
          sortOrder: r.sortOrder,
          isActive: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      created += 1;
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_bulletin_category_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_bulletin_category), 0), 1), true)`,
  );

  console.log(
    `✅ [TEMPLATE] applyBulletinCategory: ${created + updated} 筆 (tenant=${tenantId} tier=${tier}、created=${created}/updated=${updated}/skipped=${skipped})`,
  );
}
