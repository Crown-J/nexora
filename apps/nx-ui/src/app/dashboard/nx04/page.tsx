/**
 * File: apps/nx-ui/src/app/dashboard/nx04/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 財務管理模組入口（占位頁）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function Nx04ModulePage() {
  return (
    <ModulePlaceholderPage
      title="財務管理"
      description="應收應付、立帳與財務報表將於此模組檢視與維護。"
    />
  );
}
