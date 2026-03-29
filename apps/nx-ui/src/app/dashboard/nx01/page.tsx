/**
 * File: apps/nx-ui/src/app/dashboard/nx01/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01 進／退貨作業模組入口：流程式採購與進貨總覽（mock 待辦＋導向庫存補貨）
 */

import { ProcurementFlowHub } from '@/features/nx01/procurement/ProcurementFlowHub';

export default function Nx01ModulePage() {
  return <ProcurementFlowHub />;
}
