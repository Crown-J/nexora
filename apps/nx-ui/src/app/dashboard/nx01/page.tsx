/**
 * File: apps/nx-ui/src/app/dashboard/nx01/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01 進／退貨作業模組入口（占位頁）
 */

import { ModulePlaceholderPage } from '@/features/layout/ui/ModulePlaceholderPage';

export default function Nx01ModulePage() {
  return (
    <ModulePlaceholderPage
      title="進／退貨作業"
      description="詢價、進貨、退貨等採購相關流程將於此模組操作。"
    />
  );
}
