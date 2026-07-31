/**
 * File: apps/nx-api/src/shared/module-access/resolve-enabled-modules.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 解析「這個租戶啟用了哪些 app 模組」——**依模組訂閱，不依方案版本**。
 * - 產品鐵則（CLAUDE.md §4）：三版只差人數上限、功能全模組化不綁版本、絕不做版本功能閘門。
 *   因此模組可用與否的唯一判準是 **有沒有訂到那個模組**，而不是 planCode 是不是 PRO。
 *
 * 資料鏈：
 *   Nx99Tenant → Nx99Subscription(status='A')
 *     ├─ 方案標配：Nx99ProductModule.applicablePlanCode = plan.code
 *     └─ 加購明細：Nx99SubscriptionItem(status='A', itemType='M').refId → Nx99ProductModule.id
 *   兩者聯集 → Nx99ProductModuleMap.appModuleCode（如 'NX07'）
 *
 * Notes:
 * - 本檔是 jwt.strategy 與 nx99/feature-flag 的**共用單一實作**，不要各自複製一份。
 */

import type { PrismaService } from '../../prisma/prisma.service';

export type ModuleFlag = {
  app_module_code: string;
  enabled: boolean;
  product_module_id: string;
  product_module_code: string;
  name: string;
  module_level: string;
  applicable_plan_code: string;
  is_required: boolean;
};

export type EnabledModules = {
  planCode: string | null;
  flags: ModuleFlag[];
  /** 已啟用的 app 模組代碼（大寫、去重、排序）——guard 直接用這個判斷。*/
  codes: string[];
};

const EMPTY: EnabledModules = { planCode: null, flags: [], codes: [] };

/**
 * 解析租戶已啟用的 app 模組。查無有效訂閱時回傳空集合（＝什麼都沒開通）。
 */
export async function resolveEnabledModules(
  prisma: PrismaService,
  tenantId: string | null | undefined,
): Promise<EnabledModules> {
  if (!tenantId) return EMPTY;

  const sub = await prisma.nx99Subscription.findFirst({
    where: { tenantId, status: 'A' },
    include: {
      plan: true,
      rev_Nx99SubscriptionItem_subscriptionId: {
        where: { status: 'A', itemType: 'M' },
        select: { refId: true },
      },
    },
  });

  const planCode = sub?.plan?.code ?? null;
  const addOnIds = (sub?.rev_Nx99SubscriptionItem_subscriptionId ?? []).map((i) => i.refId);

  // 方案標配 ∪ 加購，一次查完（避免 N 次往返）
  const or: { applicablePlanCode?: string; id?: { in: string[] } }[] = [];
  if (planCode) or.push({ applicablePlanCode: planCode });
  if (addOnIds.length) or.push({ id: { in: addOnIds } });
  if (or.length === 0) return { planCode, flags: [], codes: [] };

  const modules = await prisma.nx99ProductModule.findMany({
    where: { isActive: true, OR: or },
    select: {
      id: true,
      code: true,
      name: true,
      moduleLevel: true,
      applicablePlanCode: true,
      rev_Nx99ProductModuleMap_productModuleId: {
        select: { appModuleCode: true, isRequired: true },
      },
    },
  });

  const flags: ModuleFlag[] = [];
  const seen = new Set<string>();
  for (const m of modules) {
    for (const map of m.rev_Nx99ProductModuleMap_productModuleId) {
      const code = map.appModuleCode?.trim();
      if (!code) continue;
      const key = `${m.id}:${code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flags.push({
        app_module_code: code,
        enabled: true,
        product_module_id: m.id,
        product_module_code: m.code,
        name: m.name,
        module_level: m.moduleLevel,
        applicable_plan_code: m.applicablePlanCode,
        is_required: map.isRequired,
      });
    }
  }
  flags.sort((a, b) => a.app_module_code.localeCompare(b.app_module_code));

  const codes = [...new Set(flags.map((f) => f.app_module_code.toUpperCase()))].sort();

  return { planCode, flags, codes };
}
