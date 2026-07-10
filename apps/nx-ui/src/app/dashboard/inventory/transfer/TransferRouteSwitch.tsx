// apps/nx-ui/src/app/dashboard/inventory/transfer/TransferRouteSwitch.tsx
// NX04-QT-SHELL：調撥入口響應式分流——桌面=單據模板 StWorkbench、窄螢幕=手機調撥工作站（階段 G 動線保留）。
'use client';

import { useEffect, useState } from 'react';

import { StWorkbench } from '@/features/nx03/transfer/ui/StWorkbench';
import { MobileTransferListPage } from '@/features/nx03/workstation/transfer/MobileTransferListPage';

export function TransferRouteSwitch() {
  // null=尚未量測（SSR/首繪）、避免水合閃爍：先渲染空殼
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  if (isMobile === null) return null;
  return isMobile ? <MobileTransferListPage /> : <StWorkbench />;
}
