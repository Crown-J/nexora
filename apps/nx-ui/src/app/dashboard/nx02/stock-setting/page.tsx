/**
 * File: apps/nx-ui/src/app/dashboard/nx02/stock-setting/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 庫存設定（左清單＋右表單）
 */

'use client';

import { useStockSetting } from '@/features/nx02/stock-setting/hooks/useStockSetting';
import { StockSettingSplitView } from '@/features/nx02/stock-setting/ui/StockSettingSplitView';

export default function Nx02StockSettingPage() {
  const vm = useStockSetting();
  return <StockSettingSplitView vm={vm} />;
}
