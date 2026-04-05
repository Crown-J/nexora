'use client';

import type { ReactNode } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { PlanUpgradePrompt } from '@/features/nx02/shared/ui/PlanUpgradePrompt';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

import { PoPlusTeaser } from '../../shared/ui/PoPlusTeaser';

export function PoLiteAware({ children }: { children: ReactNode }) {
  const { planCode } = useSessionMe();
  const showPlus = planSupportsNx02PlusFeatures(planCode);

  if (!showPlus) {
    return (
      <div className="space-y-4">
        <PlanUpgradePrompt
          kicker="NX01"
          title="採購單需要 PLUS 方案"
          description="採購單列表、建立與轉進貨為 PLUS／PRO 功能；LITE 仍可使用詢價（RFQ）與進貨（RR）。升級後即可串接完整採購流程。"
        />
        <PoPlusTeaser />
      </div>
    );
  }

  return <>{children}</>;
}
