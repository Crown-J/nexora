// packages/db-core/prisma/seed/template/apply-welcome-bulletin.ts
// @FUNCTION_CODE SYS-TMPL-SVC-012-F01
// 範本：歡迎公告（ALL，每個新租戶 1 筆）。
// 文案改為通用版本（原 default 寫死「恆迎企業示範租戶」）。
// 屬於 template 層：未來 SYS-W01 真實客戶建立時也會自動發歡迎訊息。
//
// 對齊 NX01-08 spec v1.0 升級（軌 3）：
//   - status='published'（已發布、非 draft）
//   - categoryId 指向 'system' category（lookup applyBulletinCategory 建的）
//   - importance='normal'（default、不需特別跳 modal）
//   - type='S' 保留 backward compat（v0 遺留、後續 task 廢棄）

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const WELCOME_TITLE = '歡迎使用 NEXORA GRID';
const WELCOME_CONTENT =
  '您的租戶已初始化完成。請使用 admin 帳號登入（首次登入請依政策變更密碼）。如需協助，請參考文件庫內的使用手冊。';

export async function applyWelcomeBulletin(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  // 查 'system' category（applyBulletinCategory 在本 step 之前已建）
  const systemCategory = await prisma.nx01BulletinCategory.findFirst({
    where: { tenantId, code: 'system' },
    select: { id: true },
  });

  const commonData = {
    content: WELCOME_CONTENT,
    type: 'S',
    categoryId: systemCategory?.id ?? null,
    importance: 'normal',
    status: 'published',
    isPinned: true,
    isActive: true,
  };

  const existing = await prisma.nx01Bulletin.findFirst({
    where: { tenantId, title: WELCOME_TITLE },
  });

  if (existing) {
    await prisma.nx01Bulletin.update({
      where: { id: existing.id },
      data: { ...commonData, updatedBy: actorUserId },
    });
  } else {
    await prisma.nx01Bulletin.create({
      data: {
        tenantId,
        title: WELCOME_TITLE,
        ...commonData,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_bulletin_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_bulletin), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyWelcomeBulletin: 歡迎公告 1 筆 (tenant=${tenantId})`);
}
