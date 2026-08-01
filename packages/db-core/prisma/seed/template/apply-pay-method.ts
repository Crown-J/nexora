// packages/db-core/prisma/seed/template/apply-pay-method.ts
// @FUNCTION_CODE SYS-TMPL-SVC-024-F01
// 範本：收付方式。
//
// ⭐ 「多久才真的入帳」那兩欄（isImmediate / settleLagDays / useNoteDueDate）
//    是 13 週現金預測的關鍵：即時入帳＝否的方式，要走票據到期日或延遲天數排入，不是收款日。
// ⭐ 抵帳（OFFS）證明「往來對象合一」是對的：同一家同行既是客戶也是供應商，
//    合一之後直接沖同一個對象的應收與應付、只結淨額；恆迎因為客戶與供應商分兩張表，
//    只好另開 1131 進貨抵帳 / 2131 銷貨抵帳等四個專屬科目繞路。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  {
    code: 'CASH', name: '現金', applyTo: 'B', acc: '1101', immediate: true, lag: 0,
    dueDate: false, noteInfo: false, fee: null, cash: true,
    remark: '現場散客為主。',
  },
  {
    code: 'BANK', name: '匯款／轉帳', applyTo: 'B', acc: '1102', immediate: true, lag: 0,
    dueDate: false, noteInfo: false, fee: '6406', cash: true,
    remark: '手續費由誰付要在報價時講清楚。',
  },
  {
    code: 'CHQR', name: '支票（收到）', applyTo: 'R', acc: '1112', immediate: false, lag: null,
    dueDate: true, noteInfo: true, fee: null, cash: true,
    remark: '⚠ 收到票＝應收沖掉，但現金還沒進來，要等票到期。這是台灣汽零業最容易踩的現金坑。',
  },
  {
    code: 'CHQP', name: '支票（開出）', applyTo: 'P', acc: '2102', immediate: false, lag: null,
    dueDate: true, noteInfo: true, fee: null, cash: true,
    remark: '⚠ 開票＝應付沖掉，但現金還在。到期日那天支存戶要有錢，否則跳票。',
  },
  {
    code: 'CARD', name: '信用卡', applyTo: 'R', acc: '1113', immediate: false, lag: 10,
    dueDate: false, noteInfo: false, fee: '6406', cash: true,
    remark: '刷卡約 7–14 天入帳、手續費 1.5–3%。散客要不要收卡，看毛利撐不撐得住。',
  },
  {
    code: 'OFFS', name: '抵帳（同行互抵）', applyTo: 'B', acc: null, immediate: false, lag: null,
    dueDate: false, noteInfo: false, fee: null, cash: false,
    remark: '⚠ 同行既賣也買，雙方掛帳互抵、只結淨額。本系統往來對象合一，'
      + '抵帳直接沖同一個對象的應收與應付，不必另開科目。',
  },
] as const;

export async function applyPayMethod(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const accounts = await prisma.nx05AccountCode.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const accId = (code: string | null): string | null => {
    if (!code) return null;
    const id = accounts.find((a) => a.code === code)?.id;
    if (!id) throw new Error(`[TEMPLATE] applyPayMethod: 科目 ${code} 不存在`);
    return id;
  };

  for (const [i, r] of ROWS.entries()) {
    const data = {
      name: r.name,
      applyTo: r.applyTo,
      accountCodeId: accId(r.acc),
      isImmediate: r.immediate,
      settleLagDays: r.lag,
      useNoteDueDate: r.dueDate,
      requireNoteInfo: r.noteInfo,
      feeAccountCodeId: accId(r.fee),
      affectsCash: r.cash,
      status: 'ACTIVE',
      sortNo: i + 1,
      isActive: true,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    await prisma.nx05PayMethod.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_pay_method_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_pay_method), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyPayMethod: ${ROWS.length} 筆 (tenant=${tenantId})`);
}
