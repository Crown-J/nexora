/**
 * File: apps/nx-ui/src/app/dashboard/nx02/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02 庫存管理模組入口（占位頁）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function Nx02ModulePage() {
  return (
    <ModulePlaceholderPage
      title="庫存管理"
      description="庫存異動、盤點與倉儲作業將於此模組管理。"
    />
  );
}
