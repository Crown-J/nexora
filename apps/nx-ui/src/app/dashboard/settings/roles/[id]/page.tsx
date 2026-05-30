// apps/nx-ui/src/app/dashboard/settings/roles/[id]/page.tsx
// v1.2 對齊軌 A+B：角色與權限 detail 頁（權限樹勾選）

import { RoleDetailView } from '@/features/settings/roles/ui/RoleDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RoleDetailView roleId={id} />;
}
