// apps/nx-ui/src/app/dashboard/base/partner-part/page.tsx
/** T3 進貨對齊批次 2026-06-08：供應商供貨對應主檔（哪家賣哪些料）。
 *  EntityMasterPage 範式、後端 /nx02/partner-part（5 endpoint 完備）、DashboardShell 已加 bypass。
 *  撐起工作流第 2 步「查可跟誰詢價」、三版本一致（LITE-CORE）。 */
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PARTNER_PART_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PARTNER_PART_MASTER} />;
}
