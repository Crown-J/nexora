// packages/db-core/prisma/seed/template/apply-fin-master.ts
// @FUNCTION_CODE SYS-TMPL-SVC-021-F01
// 範本：總帳脊椎財會主檔（A 階段 2026-08-01 執行長拍板）。
//
// 為什麼收成一支入口：科目表與稅別是雙向相依——
//   nx05_tax_code.tax_account_code_id → 科目（2121 銷項稅額 / 1133 進項稅額）
//   nx05_account_code.default_tax_code_id → 稅別
// 單獨排順序解不掉，本檔用「先建本體、後回填關聯」的兩趟寫法一次處理乾淨。
//
// 執行順序（有依賴關係、不可任意調換）：
//   1 科目類別 → 2 稅別(本體) → 3 會計科目(含 parent + 預設稅別) → 4 回填稅別的對映科目
//   → 5 收付方式 → 6 資產類別 → 7 付款條件範本 → 8 過帳規則 → 9 代碼參數 → 10 會計政策
//
// 規格：docs/專案/規格書/核心/NEXORA-財會主檔-schema規格-A階段.md v0.2

import type { PrismaClient } from '../../../generated/prisma';

import { applyAccountClass } from './apply-account-class';
import { applyAccountCode } from './apply-account-code';
import { applyAccountingPolicy } from './apply-accounting-policy';
import { applyAssetClass } from './apply-asset-class';
import { applyParam } from './apply-param';
import { applyPayMethod } from './apply-pay-method';
import { applyPaymentTerm } from './apply-payment-term';
import { applyPostingRule } from './apply-posting-rule';
import { applyTaxCode, linkTaxAccountCode } from './apply-tax-code';
import type { ApplyTemplateParams } from './index';

export async function applyFinMaster(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId } = params;
  console.log(`▶ [TEMPLATE] 財會主檔（總帳脊椎 A 階段）tenantId=${tenantId}`);

  await applyAccountClass(prisma, params);
  await applyTaxCode(prisma, params);
  await applyAccountCode(prisma, params);
  await linkTaxAccountCode(prisma, params);
  await applyPayMethod(prisma, params);
  await applyAssetClass(prisma, params);
  await applyPaymentTerm(prisma, params);
  await applyPostingRule(prisma, params);
  await applyParam(prisma, params);
  await applyAccountingPolicy(prisma, params);
}
