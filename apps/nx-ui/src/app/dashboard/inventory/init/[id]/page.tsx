/**
 * File: apps/nx-ui/src/app/dashboard/inventory/init/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 開帳存明細
 */

'use client';

import { useParams } from 'next/navigation';

import { useInitDetail } from '@/features/nx03/init/hooks/useInitDetail';
import { InitDetailView } from '@/features/nx03/init/ui/InitDetailView';

export default function Nx02InitDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const vm = useInitDetail(id);
  return <InitDetailView vm={vm} />;
}
