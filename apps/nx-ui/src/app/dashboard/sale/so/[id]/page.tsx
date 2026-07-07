// apps/nx-ui/src/app/dashboard/sale/so/[id]/page.tsx
// NX04-QT-SHELL：SO 銷貨單 - detail route（改用單據模板 SoWorkbench、深連結開詳情）

import { SoWorkbench } from '@/features/nx04/so/ui/SoWorkbench';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SoWorkbench initialId={id} initialTab="detail" />;
}
