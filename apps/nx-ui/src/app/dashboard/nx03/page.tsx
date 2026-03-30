/**
 * File: apps/nx-ui/src/app/dashboard/nx03/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業模組入口：流程式總覽（與 NX01 採購模組同版型）；即時工作台見 `/dashboard/nx03/workbench`
 */

import { SalesFlowHub } from '@/features/nx03/sales/SalesFlowHub';

export default function Nx03ModulePage() {
  return <SalesFlowHub />;
}
