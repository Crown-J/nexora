/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業「流程引導中心」主容器：路徑切換、步驟條、單據面板、常用功能（mock）
 *
 * Notes:
 * - 切換路徑時將 activeStep 重設為該路徑第一步；預設路徑 A、預設步驟 quote
 */

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cx } from '@/shared/lib/cx';
import type { SalesPath } from '@/features/nx03/workflow/types';
import {
  getFirstStepId,
  getStepsForPath,
  mockDocsByStep,
} from '@/features/nx03/workflow/mock/workflow.mock';
import { WorkflowQuickActions } from '@/features/nx03/workflow/ui/WorkflowQuickActions';
import { WorkflowStepBar } from '@/features/nx03/workflow/ui/WorkflowStepBar';
import { WorkflowStepPanel } from '@/features/nx03/workflow/ui/WorkflowStepPanel';

/**
 * @FUNCTION_CODE NX03-WKFL-UI-001-F01
 * 路徑切換時重設為該路徑第一步。
 */
function usePathChangeHandler(
  setActivePath: (p: SalesPath) => void,
  setActiveStep: (id: string) => void
) {
  return (path: SalesPath) => {
    setActivePath(path);
    setActiveStep(getFirstStepId(path));
  };
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-001-F02
 * 銷售流程引導頁：標題、Tab、主卡片（路徑選擇 + 步驟條 + 面板 + 常用功能）。
 */
export function SalesWorkflowPage() {
  const [activePath, setActivePath] = useState<SalesPath>('A');
  const [activeStep, setActiveStep] = useState<string>('quote');

  const onPathChange = usePathChangeHandler(setActivePath, setActiveStep);

  const steps = useMemo(() => getStepsForPath(activePath), [activePath]);
  const docs = mockDocsByStep[activeStep] ?? [];

  const handleQuickNavigate = (path: string) => {
    console.log(path);
  };

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">銷售與出貨作業</h1>
        <p className="text-sm text-muted-foreground">
          流程引導中心：依情境選擇路徑，於同畫面檢視步驟與待辦（mock）。
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-2 border-b border-border/60 pb-1"
        aria-label="銷售模組分頁"
      >
        <span
          className={cx(
            'inline-flex items-center rounded-t-lg border border-b-0 border-amber-500/35 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-50'
          )}
        >
          銷售作業總覽
        </span>
        <Link
          href="/dashboard/nx03/customer-sales"
          className={cx(
            'inline-flex items-center rounded-t-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-muted/40 hover:text-foreground'
          )}
        >
          客戶銷貨流程
        </Link>
      </nav>

      <div
        className={cx(
          'rounded-2xl border border-border/80 bg-card/45 p-4 shadow-sm sm:p-6',
          'backdrop-blur-sm'
        )}
      >
        <div className="space-y-1 border-b border-border/50 pb-4">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES / NX03</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            有庫存可直接報價；無庫存則先詢同行取得成本再對客報價。下列為流程步驟與 mock 待辦，不呼叫後端。
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">作業路徑</span>
          <div
            className="inline-flex rounded-xl border border-border/60 bg-background/40 p-1"
            role="group"
            aria-label="銷售作業路徑"
          >
            <button
              type="button"
              onClick={() => onPathChange('A')}
              className={cx(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activePath === 'A'
                  ? 'bg-amber-500/20 text-amber-50 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/30'
              )}
            >
              有庫存
            </button>
            <button
              type="button"
              onClick={() => onPathChange('C')}
              className={cx(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activePath === 'C'
                  ? 'bg-amber-500/20 text-amber-50 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/30'
              )}
            >
              需詢價
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            流程進度
          </p>
          <WorkflowStepBar
            steps={steps}
            activeStep={activeStep}
            onStepClick={setActiveStep}
          />
        </div>

        <div className="mt-6">
          <WorkflowStepPanel stepId={activeStep} activePath={activePath} docs={docs} />
        </div>

        <div className="mt-8">
          <WorkflowQuickActions onNavigate={handleQuickNavigate} />
        </div>
      </div>
    </div>
  );
}
