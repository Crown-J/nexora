// packages/db-core/prisma/seed/template/apply-account-class.ts
// @FUNCTION_CODE SYS-TMPL-SVC-022-F01
// 範本：科目類別（8 類、值域固定不新增）。
//
// 這張表決定「借貸方向」與「財報歸屬」：會計科目靠編號第一碼自動查到這裡，人不用填。
// ⚠️ 恆迎反面教材：科目分類表 43 筆、六個代碼只對應三個名稱（612/617 都叫營業費用、
//    613/615 都叫推銷費用），而且「資　產」有全形空格版與無空格版兩種寫法 → 統計時被算成兩類。
//    所以本表 isSystem 恆為 true、租戶不可新增或改名。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  { code: '1', name: '資產',     side: 'D', st: 'BS', sec: '資產',       remark: '公司有什麼。現金、應收、存貨、設備' },
  { code: '2', name: '負債',     side: 'C', st: 'BS', sec: '負債',       remark: '公司欠什麼。應付、借款、代扣款' },
  { code: '3', name: '權益',     side: 'C', st: 'BS', sec: '權益',       remark: '股東的部分。股本、累積盈餘' },
  { code: '4', name: '營業收入', side: 'C', st: 'PL', sec: '營業收入',   remark: '本業賺進來的' },
  { code: '5', name: '營業成本', side: 'D', st: 'PL', sec: '營業成本',   remark: '賣出去那批貨的進價' },
  { code: '6', name: '營業費用', side: 'D', st: 'PL', sec: '營業費用',   remark: '養公司的錢。薪資、租金、水電' },
  { code: '7', name: '營業外收入', side: 'C', st: 'PL', sec: '營業外損益', remark: '不是本業賺的。利息、匯兌' },
  { code: '8', name: '營業外支出', side: 'D', st: 'PL', sec: '營業外損益', remark: '不是本業花的。利息支出、所得稅' },
] as const;

export async function applyAccountClass(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const [i, r] of ROWS.entries()) {
    const data = {
      name: r.name,
      increaseSide: r.side,
      statement: r.st,
      statementSection: r.sec,
      sortNo: i + 1,
      isSystem: true,
      isActive: true,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    await prisma.nx05AccountClass.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_account_class_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_account_class), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyAccountClass: ${ROWS.length} 筆 (tenant=${tenantId})`);
}
