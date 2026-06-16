// apps/nx-ui/src/features/purchase/ui/sop-workspace/MobilePurchaseSopPage.tsx
/**
 * 國內進貨 SOP 手機工作台 — 主容器。
 *
 * 狀態：useReducer 驅動 9 步流程（全 Mock）
 * 佈局：頂部固定 ProgressHeader + 底部固定 StepWrapper 按鈕列
 *
 * 第一階段（R5 phase 1）：STEP 1~2 完整實作，3~9 用 StepPlaceholder 占位，
 * 讓 Crown 可驗收初版 UX 並預覽 9 節點流程條動態。
 */

'use client';

import { useCallback, useReducer, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { ProgressHeader } from './components/ProgressHeader';
import { Step1Requirements } from './components/Step1Requirements';
import { Step2Inquiry } from './components/Step2Inquiry';
import { StepPlaceholder } from './components/StepPlaceholder';
import { MOCK_REQUIREMENTS } from './mock-data/scenario';
import type {
  InspectionLine,
  ScenarioAction,
  ScenarioState,
  StepNumber,
} from './types';

const initialScenarioState: ScenarioState = {
  selectedSkus: MOCK_REQUIREMENTS.filter((r) => r.defaultChecked).map((r) => r.sku),
  selectedVendorId: null,
  approvalStatus: 'pending',
  sentAt: null,
  vendorReplied: false,
  inspection: {},
};

function ensureInspectionLine(
  state: ScenarioState,
  sku: string,
): InspectionLine {
  return (
    state.inspection[sku] ?? {
      sku,
      expectedQty: 0,
      actualQty: null,
      condition: 'ok',
    }
  );
}

function scenarioReducer(state: ScenarioState, action: ScenarioAction): ScenarioState {
  switch (action.type) {
    case 'TOGGLE_REQUIREMENT': {
      const has = state.selectedSkus.includes(action.sku);
      return {
        ...state,
        selectedSkus: has
          ? state.selectedSkus.filter((s) => s !== action.sku)
          : [...state.selectedSkus, action.sku],
      };
    }
    case 'SET_SELECTED_SKUS':
      return { ...state, selectedSkus: action.skus };
    case 'SELECT_VENDOR':
      return { ...state, selectedVendorId: action.vendorId };
    case 'APPROVE':
      return { ...state, approvalStatus: 'approved' };
    case 'SENT_TO_VENDOR':
      return { ...state, sentAt: new Date().toISOString() };
    case 'VENDOR_REPLIED':
      return { ...state, vendorReplied: true };
    case 'SET_INSPECTION_QTY': {
      const prev = ensureInspectionLine(state, action.sku);
      return {
        ...state,
        inspection: {
          ...state.inspection,
          [action.sku]: { ...prev, actualQty: action.actualQty },
        },
      };
    }
    case 'SET_INSPECTION_CONDITION': {
      const prev = ensureInspectionLine(state, action.sku);
      return {
        ...state,
        inspection: {
          ...state.inspection,
          [action.sku]: { ...prev, condition: action.condition },
        },
      };
    }
    case 'INIT_INSPECTION': {
      const next: Record<string, InspectionLine> = {};
      action.lines.forEach((l) => {
        next[l.sku] = l;
      });
      return { ...state, inspection: next };
    }
    case 'RESET':
      return initialScenarioState;
    default:
      return state;
  }
}

export function MobilePurchaseSopPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [state, dispatch] = useReducer(scenarioReducer, initialScenarioState);

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      router.push('/dashboard/purchase');
      return;
    }
    setCurrentStep((s) => Math.max(1, s - 1) as StepNumber);
  }, [currentStep, router]);

  const handleNext = useCallback(() => {
    if (currentStep === 9) {
      dispatch({ type: 'RESET' });
      setCurrentStep(1);
      return;
    }
    setCurrentStep((s) => Math.min(9, s + 1) as StepNumber);
  }, [currentStep]);

  let stepContent: ReactNode;
  switch (currentStep) {
    case 1:
      stepContent = (
        <Step1Requirements state={state} dispatch={dispatch} onNext={handleNext} />
      );
      break;
    case 2:
      stepContent = (
        <Step2Inquiry
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    default:
      stepContent = (
        <StepPlaceholder
          currentStep={currentStep}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ProgressHeader currentStep={currentStep} onBack={handleBack} />
      {/* 每次 currentStep 變化時重新 mount，讓瀏覽器自然 scroll 到頂 */}
      <main key={currentStep}>{stepContent}</main>
    </div>
  );
}
