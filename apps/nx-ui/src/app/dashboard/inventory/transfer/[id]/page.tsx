// apps/nx-ui/src/app/dashboard/inventory/transfer/[id]/page.tsx
// NX04-QT-SHELL：調撥單 - detail route（改用單據模板 StWorkbench、深連結開詳情）

import { StWorkbench } from '@/features/nx03/transfer/ui/StWorkbench';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransferDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StWorkbench initialId={id} initialTab="detail" />;
}
