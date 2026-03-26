/**
 * File: apps/nx-ui/src/app/dashboard/nx03/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業模組入口（占位頁）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function Nx03ModulePage() {
  return (
    <ModulePlaceholderPage
      title="銷售作業"
      description="報價、訂單、出貨與退貨等銷售流程將於此模組操作。"
    />
  );
}
