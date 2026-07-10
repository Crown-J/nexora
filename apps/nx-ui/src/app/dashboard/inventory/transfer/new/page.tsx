// apps/nx-ui/src/app/dashboard/inventory/transfer/new/page.tsx
// NX04-QT-SHELL：調撥單 - 新增 route（改用單據模板 StWorkbench、直接開新增面板）

import { StWorkbench } from '@/features/nx03/transfer/ui/StWorkbench';

export default function TransferNewPage() {
  return <StWorkbench initialCreate />;
}
