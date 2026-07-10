// apps/nx-ui/src/app/dashboard/sale/return/[id]/page.tsx
// NX04-QT-SHELL：SR 銷退單 - detail route（改用單據模板 SrWorkbench、深連結開詳情）

import { SrWorkbench } from '@/features/nx04/sales-return/ui/SrWorkbench';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesReturnDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SrWorkbench initialId={id} initialTab="detail" />;
}
