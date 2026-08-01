// packages/db-core/prisma/seed/template/apply-tax-code.ts
// @FUNCTION_CODE SYS-TMPL-SVC-023-F01
// 範本：稅別（營業稅）。
//
// 🔴 國別皮：表的「結構」是 VAT 通則（稅率／進銷項／可否扣抵／對映稅額科目），歐盟與東南亞同構；
//    但下面這 7 列「值域」是台灣的（三聯式／二聯式／不得扣抵）。所以值走 seed、不寫成 enum。
//    將來出海只換這一支 seed，schema 不動。
//
// ⚠️ 稅率存百分數（5.00 = 5%），對齊全庫既有 7 處 tax_rate 寫法（Q6 拍板）。
//    亞羅 xlsx 存的是 0.05 小數，此處已 ×100。
//
// 兩趟寫入：本體先建（此時科目可能還沒有），對映稅額科目由 linkTaxAccountCode 回填。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  {
    code: 'S53', name: '應稅銷項（三聯式）', rate: 5, dir: 'OUT', ded: null,
    doc: '三聯式統一發票', acc: '2121', cost: false, status: 'ACTIVE',
    remark: '開給有統編的客戶（保養廠、同行）。對方可以扣抵，所以他們一定會要。',
  },
  {
    code: 'S52', name: '應稅銷項（二聯式）', rate: 5, dir: 'OUT', ded: null,
    doc: '二聯式／電子發票 B2C', acc: '2121', cost: false, status: 'ACTIVE',
    remark: '開給散客。⚠ 稅額內含在售價裡，報價時要記得——同樣的售價，二聯式的實收比三聯式少。',
  },
  {
    code: 'P5', name: '應稅進項（可扣抵）', rate: 5, dir: 'IN', ded: true,
    doc: '三聯式／電子發票', acc: '1133', cost: false, status: 'ACTIVE',
    remark: '進貨、房租、水電、設備。⚠ 貨車與機車可扣抵。',
  },
  {
    code: 'PND', name: '進項不得扣抵', rate: 5, dir: 'IN', ded: false,
    doc: '三聯式／二聯式', acc: null, cost: true, status: 'ACTIVE',
    remark: '⚠ 交際費、自用乘人小客車。不是不用付稅，是付了不能扣 → 那 5% 要連同本金一起記進費用科目：'
      + '交際費 10,500 元就是 10,500 元的費用，不是 10,000 元費用＋500 元進項稅額。',
  },
  {
    code: 'Z0', name: '零稅率', rate: 0, dir: 'OUT', ded: null,
    doc: '外銷相關證明', acc: null, cost: false, status: 'RESERVED',
    remark: '外銷。1-a 用不到，先建不啟用。',
  },
  {
    code: 'EX', name: '免稅', rate: 0, dir: 'OUT', ded: null,
    doc: '免稅發票', acc: null, cost: false, status: 'RESERVED',
    remark: '先建不啟用。',
  },
  {
    code: 'NA', name: '不適用', rate: 0, dir: 'NA', ded: null,
    doc: null, acc: null, cost: false, status: 'ACTIVE',
    remark: '不涉及營業稅的交易：薪資、借款、股東出資、內部調撥。',
  },
] as const;

export async function applyTaxCode(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const [i, r] of ROWS.entries()) {
    const data = {
      name: r.name,
      taxRate: r.rate,
      direction: r.dir,
      deductible: r.ded,
      documentType: r.doc,
      includeInCost: r.cost,
      status: r.status,
      sortNo: i + 1,
      isActive: true,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    await prisma.nx05TaxCode.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_tax_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_tax_code), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyTaxCode: ${ROWS.length} 筆 (tenant=${tenantId})`);
}

/** 第 2 趟：回填「對映稅額科目」（要等會計科目建好才做得到）。 */
export async function linkTaxAccountCode(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const accounts = await prisma.nx05AccountCode.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const accIdByCode = new Map(accounts.map((a) => [a.code, a.id]));

  let linked = 0;
  for (const r of ROWS) {
    if (!r.acc) continue;
    const accId = accIdByCode.get(r.acc);
    if (!accId) {
      throw new Error(`[TEMPLATE] linkTaxAccountCode: 稅別 ${r.code} 指向的科目 ${r.acc} 不存在`);
    }
    await prisma.nx05TaxCode.update({
      where: { tenantId_code: { tenantId, code: r.code } },
      data: { taxAccountCodeId: accId, updatedBy: actorUserId },
    });
    linked += 1;
  }

  console.log(`✅ [TEMPLATE] linkTaxAccountCode: ${linked} 筆對映稅額科目 (tenant=${tenantId})`);
}
