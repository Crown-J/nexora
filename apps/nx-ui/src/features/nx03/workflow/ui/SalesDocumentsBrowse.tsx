/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesDocumentsBrowse.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 瀏覽銷貨單據：三步驟（報價／銷貨／成交）流程條與 mock 待辦
 *
 * Notes:
 * - 報價／銷貨階段含題述情境；資料來自 documentsBrowse.mock
 */

'use client';

import { useMemo, useState } from 'react';
import { cx } from '@/shared/lib/cx';
import {
  browseSteps,
  mockBrowseDocsByStep,
} from '@/features/nx03/workflow/mock/documentsBrowse.mock';
import { WorkflowQuickActions } from '@/features/nx03/workflow/ui/WorkflowQuickActions';
import { WorkflowStepBar } from '@/features/nx03/workflow/ui/WorkflowStepBar';
import { WorkflowStepPanel } from '@/features/nx03/workflow/ui/WorkflowStepPanel';

/**
 * @FUNCTION_CODE NX03-WKFL-UI-006-F01
 * 三步驟單據瀏覽（報價→銷貨→成交）。
 */
export function SalesDocumentsBrowse() {
  const [activeStep, setActiveStep] = useState<string>('quote');
  const docs = useMemo(() => mockBrowseDocsByStep[activeStep] ?? [], [activeStep]);

  const handleQuickNavigate = (path: string) => {
    console.log(path);
  };

  return (
    <div
      className={cx(
        'rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-6',
        'backdrop-blur-sm'
      )}
    >
      <div className="space-y-1 border-b border-border/50 pb-4">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES / 單據瀏覽</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          依報價、銷貨、成交三階段檢視待辦。報價含「找零件／已報價考慮中」；銷貨含撿貨、待配送、配送中（mock）。
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          流程進度
        </p>
        <WorkflowStepBar
          steps={browseSteps}
          activeStep={activeStep}
          onStepClick={setActiveStep}
        />
      </div>

      <div className="mt-6">
        <WorkflowStepPanel stepId={activeStep} steps={browseSteps} docs={docs} />
      </div>

      <div className="mt-8">
        <WorkflowQuickActions onNavigate={handleQuickNavigate} />
      </div>
    </div>
  );
}
