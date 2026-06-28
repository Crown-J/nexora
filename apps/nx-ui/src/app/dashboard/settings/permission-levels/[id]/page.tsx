// apps/nx-ui/src/app/dashboard/settings/permission-levels/[id]/page.tsx
// 職務↔權限拆分軌 Step5：權限等級「權限設定」明細頁

import { PermissionLevelDetailView } from '@/features/nx01/permission/permission-level/PermissionLevelDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PermissionLevelDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PermissionLevelDetailView levelId={id} />;
}
