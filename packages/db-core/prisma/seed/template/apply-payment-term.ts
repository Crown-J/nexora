// packages/db-core/prisma/seed/template/apply-payment-term.ts
// @FUNCTION_CODE SYS-TMPL-SVC-026-F01
// 範本：付款條件範本（四維度：觸發點 × 付款% × 觸發後天數 × 工具）。
//
// ⭐ 執行長 7/30 對亞羅說「恆迎的廠商太多，沒辦法給你一個明確的答案」——這句話本身就是答案：
//    不要問「帳期幾天」，要問「哪四個維度」。他口述的六種（訂金 15%／訂金 5%／到貨付全額／
//    月結／月票／備貨通知撥款）全部是這四個維度的排列。
//
// ⚠️ 掛在往來對象當預設（nx01_partner.payment_term_id，A 階段新增的 FK 欄）、採購單可覆寫。
//    舊的字串欄 payment_term_domestic 一字未動——實測 85 處在讀（Q5 拍板 additive 過渡）。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface TermLine {
  no: number; trigger: string; pct: number; days: number; method: string | null;
  noteDays: number | null; remark: string | null;
}
interface Term {
  code: string; name: string; applyTo: string; remark: string | null; lines: TermLine[];
}

const ROWS: readonly Term[] = [
  {
    code: 'PT-A', name: '訂金 15% ＋ 到貨付清', applyTo: 'AP', remark: null,
    lines: [
      { no: 1, trigger: 'ORD', pct: 15, days: 0, method: 'BANK', noteDays: null, remark: '訂金' },
      { no: 2, trigger: 'RCV', pct: 85, days: 0, method: 'BANK', noteDays: null, remark: '尾款' },
    ],
  },
  {
    code: 'PT-B', name: '訂金 5% ＋ 到貨付清', applyTo: 'AP', remark: null,
    lines: [
      { no: 1, trigger: 'ORD', pct: 5, days: 0, method: 'BANK', noteDays: null, remark: '訂金' },
      { no: 2, trigger: 'RCV', pct: 95, days: 0, method: 'BANK', noteDays: null, remark: '尾款' },
    ],
  },
  {
    code: 'PT-C', name: '到貨後付全額', applyTo: 'AP', remark: null,
    lines: [{ no: 1, trigger: 'RCV', pct: 100, days: 0, method: 'BANK', noteDays: null, remark: null }],
  },
  {
    code: 'PT-D', name: '備貨完成通知後付全額', applyTo: 'AP',
    remark: '🔴 收到款項才出貨。這是執行長 7/30 口述的情境，也是「備貨完成通知」這個行為存在的理由。',
    lines: [{ no: 1, trigger: 'RDY', pct: 100, days: 0, method: 'BANK', noteDays: null, remark: null }],
  },
  {
    code: 'PT-E', name: '月結 30 天', applyTo: 'BOTH', remark: null,
    lines: [{ no: 1, trigger: 'MTH', pct: 100, days: 30, method: 'BANK', noteDays: null, remark: null }],
  },
  {
    code: 'PT-F', name: '月結開 60 天票', applyTo: 'AP',
    remark: '⚠ 應付沖掉不等於現金出去——票到期才是。執行長 7/30：要像恆迎那樣的規模才談得到。',
    lines: [{ no: 1, trigger: 'MTH', pct: 100, days: 0, method: 'CHQP', noteDays: 60, remark: null }],
  },
  {
    code: 'PT-G', name: '下單全額預付', applyTo: 'AP',
    remark: '最嚴苛。前期量小的新公司常遇到。',
    lines: [{ no: 1, trigger: 'ORD', pct: 100, days: 0, method: 'BANK', noteDays: null, remark: null }],
  },
  {
    code: 'PT-H', name: '出貨後 30 天', applyTo: 'AP', remark: null,
    lines: [{ no: 1, trigger: 'SHP', pct: 100, days: 30, method: 'BANK', noteDays: null, remark: null }],
  },
];

export async function applyPaymentTerm(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const methods = await prisma.nx05PayMethod.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const methodIdByCode = new Map(methods.map((m) => [m.code, m.id]));

  for (const [i, t] of ROWS.entries()) {
    // 同一範本各行付款% 合計必須 = 100
    const sum = t.lines.reduce((a, l) => a + l.pct, 0);
    if (sum !== 100) {
      throw new Error(`[TEMPLATE] applyPaymentTerm: 範本 ${t.code} 各行付款% 合計為 ${sum}、應為 100`);
    }

    const header = {
      name: t.name, applyTo: t.applyTo, isDefault: t.code === 'PT-C',
      sortNo: i + 1, isActive: true, remark: t.remark, updatedBy: actorUserId,
    };
    const term = await prisma.nx05PaymentTerm.upsert({
      where: { tenantId_code: { tenantId, code: t.code } },
      create: { tenantId, code: t.code, createdBy: actorUserId, ...header },
      update: header,
      select: { id: true },
    });

    for (const l of t.lines) {
      const data = {
        triggerPoint: l.trigger,
        percentage: l.pct,
        daysAfterTrigger: l.days,
        payMethodId: l.method ? (methodIdByCode.get(l.method) ?? null) : null,
        noteDays: l.noteDays,
        remark: l.remark,
        updatedBy: actorUserId,
      };
      await prisma.nx05PaymentTermLine.upsert({
        where: { termId_lineNo: { termId: term.id, lineNo: l.no } },
        create: { termId: term.id, lineNo: l.no, createdBy: actorUserId, ...data },
        update: data,
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_payment_term_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_payment_term), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_payment_term_line_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_payment_term_line), 0), 1), true)`,
  );

  const lineCount = ROWS.reduce((a, t) => a + t.lines.length, 0);
  console.log(`✅ [TEMPLATE] applyPaymentTerm: ${ROWS.length} 個範本 / ${lineCount} 行 (tenant=${tenantId})`);
}
