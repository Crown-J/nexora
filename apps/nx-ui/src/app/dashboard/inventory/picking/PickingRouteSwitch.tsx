// apps/nx-ui/src/app/dashboard/inventory/picking/PickingRouteSwitch.tsx
// 撿貨作業響應式分流（SALES-FLOW 撿貨重設計）：窄螢幕=手機版(選卡+dock)、桌機=電腦版(行內操作)。
'use client';

import { useEffect, useState } from 'react';

import { MobilePickPoolPage } from '@/features/nx03/workstation/picking/MobilePickPoolPage';
import { PickWorkbench } from '@/features/nx03/workstation/picking/PickWorkbench';

export function PickingRouteSwitch() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  if (isMobile === null) return null;
  return isMobile ? <MobilePickPoolPage /> : <PickWorkbench />;
}
