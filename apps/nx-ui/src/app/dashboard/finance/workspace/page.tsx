/**
 * File: apps/nx-ui/src/app/dashboard/finance/workspace/page.tsx
 *
 * Purpose:
 * - 財務作業工作台（路由 v2：`/dashboard/finance/workspace`）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function FinanceWorkspacePage() {
  return (
    <ModulePlaceholderPage
      title="財務管理"
      description="應收應付、立帳與財務報表將於此模組檢視與維護。"
    />
  );
}
