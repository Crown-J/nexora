// apps/nx-ui/src/app/dashboard/base/discount-code/page.tsx
/** F1-A 銷貨優惠價子系統 2026-06-08：折扣代碼主檔
 *  業務員自助管理 DEFECT/USED/VIP/BULK 等代碼、配合 QuoteItem/SoItem.discountCodeId 引用。
 *  EntityMasterPage 範式、後端 /nx01/discount-codes（5 endpoint 完備）、DashboardShell 已加 bypass。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { DISCOUNT_CODE_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={DISCOUNT_CODE_MASTER} />;
}
