// packages/db-core/prisma/seed/template/apply-site.ts
// @FUNCTION_CODE SYS-TMPL-SVC-009-F01
// 範本：據點（ALL）。每租戶建 1 筆預設據點「主要倉庫(M)」（LITE 單據點、無「總公司」概念）。
// 須在 applyWarehouse 之前執行（倉庫的 siteId 會指向此據點）。
// schema：@@unique([tenantId, code])。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

export const DEFAULT_SITE_CODE = 'M';
export const DEFAULT_SITE_NAME = '主要倉庫';

export async function applySite(prisma: PrismaClient, params: ApplyTemplateParams): Promise<void> {
  const { tenantId, actorUserId } = params;

  await prisma.nx01Site.upsert({
    where: { tenantId_code: { tenantId, code: DEFAULT_SITE_CODE } },
    create: {
      tenantId,
      code: DEFAULT_SITE_CODE,
      name: DEFAULT_SITE_NAME,
      isMain: true,
      sortNo: 0,
      isActive: true,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    update: {
      name: DEFAULT_SITE_NAME,
      isMain: true,
      updatedBy: actorUserId,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_site_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_site), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applySite: 主要倉庫(M) (tenant=${tenantId})`);
}
