// apps/nx-api/src/sys-admin/importer/handlers/partner.handler.ts
// v1.2 對齊軌 C-FU FU-import-01：客戶 / 廠商 importer
// 對應 v1.2 §11 客戶 / 供應商 / 同行 / 銀行 / 廠商 5 主檔
//
// 範本欄位：name / taxId / address / phone / partnerType (C/S/V/O/B)
// 範本中 partnerType=C 是「客戶（保養廠）」、O 是「同行」、S 是「供應商」、V 一般廠商、B 銀行

import type { HandlerContext, HandlerResult, ImportRow } from './base';

const VALID_TYPES = new Set(['C', 'S', 'V', 'O', 'B', 'T']);
const TYPE_CODE_PREFIX: Record<string, string> = {
  C: 'C',
  S: 'S',
  V: 'V',
  O: 'O',
  B: 'B',
  T: 'T',
};

export async function importPartners(
  ctx: HandlerContext,
  rows: ImportRow[],
): Promise<HandlerResult> {
  const result: HandlerResult = { imported: 0, errors: [] };

  // 每種 type 一個序號計數器、用來自動產 code
  const typeCounter: Record<string, number> = {};

  for (const { rowNo, data } of rows) {
    if (!data.name) {
      result.errors.push({ rowNo, reason: '公司名稱必填' });
      continue;
    }
    const partnerType = data.partnerType.toUpperCase();
    if (!VALID_TYPES.has(partnerType)) {
      result.errors.push({
        rowNo,
        reason: `類型必為 C/S/V/O/B（收到 ${data.partnerType}）`,
      });
      continue;
    }

    // 自動產 code：類型字母 + 5 位序號（從現有最大序號 +1 開始）
    if (typeCounter[partnerType] === undefined) {
      const existing = await ctx.prisma.nx01Partner.findMany({
        where: {
          tenantId: ctx.tenantId,
          code: { startsWith: TYPE_CODE_PREFIX[partnerType] },
        },
        select: { code: true },
      });
      let maxSeq = 0;
      for (const r of existing) {
        const m = r.code.match(/(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxSeq) maxSeq = n;
        }
      }
      typeCounter[partnerType] = maxSeq;
    }
    typeCounter[partnerType]++;
    const code = `${TYPE_CODE_PREFIX[partnerType]}${String(typeCounter[partnerType]).padStart(5, '0')}`;

    // 檢 taxId 重複（若有）
    if (data.taxId) {
      const exist = await ctx.prisma.nx01Partner.findFirst({
        where: { tenantId: ctx.tenantId, taxId: data.taxId },
        select: { id: true, name: true },
      });
      if (exist) {
        result.errors.push({
          rowNo,
          reason: `統編 ${data.taxId} 已存在（${exist.name}）、跳過`,
        });
        typeCounter[partnerType]--;
        continue;
      }
    }

    await ctx.prisma.nx01Partner.create({
      data: {
        tenantId: ctx.tenantId,
        code,
        name: data.name,
        partnerType,
        canTransferStock: partnerType === 'O',
        taxId: data.taxId || null,
        address: data.address || null,
        phone: data.phone || null,
        isActive: true,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    result.imported++;
  }
  return result;
}
