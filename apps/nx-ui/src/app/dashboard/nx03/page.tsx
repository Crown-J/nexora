/**
 * File: apps/nx-ui/src/app/dashboard/nx03/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業模組入口：流程式銷售與出貨總覽（mock 待辦＋導向客戶銷貨流程）
 */

import { SalesFlowHub } from '@/features/nx03/sales/SalesFlowHub';

export default function Nx03ModulePage() {
  return <SalesFlowHub />;
}
