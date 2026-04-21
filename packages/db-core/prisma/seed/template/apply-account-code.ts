// packages/db-core/prisma/seed/template/apply-account-code.ts
// @FUNCTION_CODE SYS-TMPL-SVC-007-F01
// 範本：會計科目（ALL，12 個常用科目）。
// upsert by tenantId_code（migration 20260421132744_fix_tenant_scoped_unique 後）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export async function applyAccountCode(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const rows = [
    { code: '4100', name: '銷貨收入',   category: 'I' },
    { code: '5100', name: '銷貨成本',   category: 'E' },
    { code: '6132', name: '租金支出',   category: 'E' },
    { code: '6139', name: '水電費',     category: 'E' },
    { code: '6150', name: '電話費',     category: 'E' },
    { code: '6200', name: '薪資支出',   category: 'E' },
    { code: '6300', name: '折舊費用',   category: 'E' },
    { code: '7100', name: '利息收入',   category: 'I' },
    { code: '7200', name: '利息支出',   category: 'E' },
    { code: '1100', name: '現金',       category: 'A' },
    { code: '1200', name: '應收帳款',   category: 'A' },
    { code: '2100', name: '應付帳款',   category: 'L' },
  ];

  for (const r of rows) {
    await prisma.nx05AccountCode.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        category: r.category,
        isSystem: true,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
      update: {
        name: r.name,
        category: r.category,
        isSystem: true,
        isActive: true,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_account_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_account_code), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyAccountCode: ${rows.length} 筆 (tenant=${tenantId})`);
}
