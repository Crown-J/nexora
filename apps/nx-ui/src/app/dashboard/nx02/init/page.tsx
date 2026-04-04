/**
 * File: apps/nx-ui/src/app/dashboard/nx02/init/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 開帳存清單
 */

'use client';

import { InitListView } from '@/features/nx02/init/ui/InitListView';
import { useInitList } from '@/features/nx02/init/hooks/useInitList';

export default function Nx02InitListPage() {
  const vm = useInitList();
  return <InitListView vm={vm} />;
}
