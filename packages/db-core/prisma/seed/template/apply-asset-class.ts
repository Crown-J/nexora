// packages/db-core/prisma/seed/template/apply-asset-class.ts
// @FUNCTION_CODE SYS-TMPL-SVC-025-F01
// 範本：資產類別。
//
// ⭐ 這張表是用亞羅自己的判準糾正亞羅自己的表：它立的規矩是「一個值域每個值都帶著其他屬性，
//    就不是參數是主檔」，而資產類別帶著「對映科目」與「累計折舊科目」兩個屬性
//    → 本來就該從代碼參數表升格成主檔（亞羅資產主檔那一欄目前還是自由文字、其待補清單第 74 項）。
// ⚠️ 每類資產各自一個累計折舊科目，不再另設「累計折舊-全部」——恆迎兩套並存，沒人知道該記哪個。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

const ROWS = [
  { code: 'EQP', name: '生財器具',   asset: '1501', accum: '1502', life: 5, remark: '貨架、重型置物系統等。' },
  { code: 'ITE', name: '資訊設備',   asset: '1511', accum: '1512', life: 3, remark: '電腦、印表機、事務機。⚠ 會移動、會單獨壞掉 → 逐台建檔並貼財產標籤。' },
  { code: 'VEH', name: '運輸設備',   asset: '1521', accum: '1522', life: 3, remark: '🔴 逐台建檔（有車牌、單獨繳牌照燃料稅）。' },
  { code: 'LHI', name: '租賃改良物', asset: '1531', accum: '1532', life: 3, remark: '🔴 攤提年限與剩餘租期取短——租約簽幾年決定攤幾年。' },
  { code: 'SEC', name: '安全設備',   asset: '1511', accum: '1512', life: 5, remark: '監視與保全系統。⚠ 對映科目與資訊設備相同，分開只是為了盤點時好認。' },
] as const;

export async function applyAssetClass(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const accounts = await prisma.nx05AccountCode.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const accId = (code: string): string => {
    const id = accounts.find((a) => a.code === code)?.id;
    if (!id) throw new Error(`[TEMPLATE] applyAssetClass: 科目 ${code} 不存在`);
    return id;
  };

  for (const [i, r] of ROWS.entries()) {
    const data = {
      name: r.name,
      assetAccountCodeId: accId(r.asset),
      accumDepAccountCodeId: accId(r.accum),
      defaultUsefulLife: r.life,
      sortNo: i + 1,
      isActive: true,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    await prisma.nx05AssetClass.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_asset_class_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_asset_class), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyAssetClass: ${ROWS.length} 筆 (tenant=${tenantId})`);
}
