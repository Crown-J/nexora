/**
 * File: apps/nx-ui/src/app/dashboard/nx02/init/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 新增開帳存
 */

'use client';

import { useInitCreate } from '@/features/nx02/init/hooks/useInitCreate';
import { InitNewView } from '@/features/nx02/init/ui/InitNewView';

export default function Nx02InitNewPage() {
  const vm = useInitCreate();
  return <InitNewView vm={vm} />;
}
