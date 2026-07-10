// apps/nx-ui/src/app/dashboard/purchase/rfq/new/page.tsx
// NX02-RFQ-SHELL：新增詢價單 → 單據外殼 RfqWorkbench（直開新增）
'use client';

import { RfqWorkbench } from '@/features/nx02/rfq/ui/RfqWorkbench';

export default function RfqNewPage() {
  return <RfqWorkbench initialCreate />;
}
