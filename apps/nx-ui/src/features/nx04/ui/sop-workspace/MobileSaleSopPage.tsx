// apps/nx-ui/src/features/sale/ui/sop-workspace/MobileSaleSopPage.tsx
/**
 * 國內銷貨 SOP 手機工作台 — 主容器（R6 demo 主力）
 *
 * 狀態：useReducer 驅動 9 步流程（全 Mock）
 * 佈局：頂部固定 ProgressHeader；STEP 1~8 底部由 StepWrapper 管，
 *        STEP 9 自備底部操作列（再來一次 / 回銷貨中心）
 *
 * TASK-BUSINESS-RESTRUCTURE Phase 5:訂單編號改由 Step 8 呼叫 SalesStore.createSO 注入,
 *   不再於 Step 7 自動生成 placeholder。
 */

'use client';

import { useCallback, useReducer, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { ProgressHeader } from './components/ProgressHeader';
import { Step1SelectCustomer } from './components/Step1SelectCustomer';
import { Step2SearchParts } from './components/Step2SearchParts';
import { Step3QuoteList } from './components/Step3QuoteList';
import { Step4QuoteMethod } from './components/Step4QuoteMethod';
import { Step5CustomerDecide } from './components/Step5CustomerDecide';
import { Step6DeliveryMethod } from './components/Step6DeliveryMethod';
import { Step7SignMethod } from './components/Step7SignMethod';
import { Step8OrderComplete } from './components/Step8OrderComplete';
import { Step9Summary } from './components/Step9Summary';
import type { SaleSopAction, SaleSopState, StepNumber } from './types';

const initialState: SaleSopState = {
  selectedCustomer: null,
  quoteItems: [],
  quoteMethod: null,
  customerDecision: null,
  deliveryMethod: null,
  signMethod: null,
  hasSigned: false,
  orderNumber: null,
};

function reducer(state: SaleSopState, action: SaleSopAction): SaleSopState {
  switch (action.type) {
    case 'SELECT_CUSTOMER':
      return { ...state, selectedCustomer: action.customer };
    case 'CLEAR_CUSTOMER':
      return { ...state, selectedCustomer: null };
    case 'ADD_QUOTE_ITEM': {
      const exists = state.quoteItems.some((q) => q.sku === action.item.sku);
      if (exists) {
        return {
          ...state,
          quoteItems: state.quoteItems.map((q) =>
            q.sku === action.item.sku ? action.item : q,
          ),
        };
      }
      return { ...state, quoteItems: [...state.quoteItems, action.item] };
    }
    case 'REMOVE_QUOTE_ITEM':
      return {
        ...state,
        quoteItems: state.quoteItems.filter((q) => q.sku !== action.sku),
      };
    case 'UPDATE_QUOTE_ITEM':
      return {
        ...state,
        quoteItems: state.quoteItems.map((q) =>
          q.sku === action.sku
            ? {
                ...q,
                quantity: action.quantity ?? q.quantity,
                unitPrice: action.unitPrice ?? q.unitPrice,
              }
            : q,
        ),
      };
    case 'SET_QUOTE_METHOD':
      return { ...state, quoteMethod: action.method };
    case 'SET_CUSTOMER_DECISION':
      return { ...state, customerDecision: action.decision };
    case 'RESET_CUSTOMER_DECISION':
      // Phase 1 修復:從 STEP 6 上一步回 STEP 5 時清除,避免 accept 分支的 setTimeout 迴圈。
      return { ...state, customerDecision: null };
    case 'SET_DELIVERY_METHOD':
      return { ...state, deliveryMethod: action.method };
    case 'SET_SIGN_METHOD':
      // 切換簽單方式時清除既有簽名，避免先電子簽再改紙本卻留下 hasSigned=true
      return { ...state, signMethod: action.method, hasSigned: false };
    case 'CLEAR_SIGN_METHOD':
      return { ...state, signMethod: null, hasSigned: false };
    case 'COMPLETE_SIGNATURE':
      return { ...state, hasSigned: true };
    case 'SET_ORDER_NUMBER':
      // Phase 5:Step8 由 SalesStore 建立真實 SO 後注入單號,覆寫舊的 placeholder
      return { ...state, orderNumber: action.orderNumber };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function MobileSaleSopPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [state, dispatch] = useReducer(reducer, initialState);

  // Phase 5:訂單號由 Step8 呼叫 SalesStore.createSO 於情境判斷後一次性注入。

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      router.push('/dashboard/sale');
      return;
    }
    // Phase 1 bug fix:從 STEP 6 回 STEP 5 時清除 customerDecision
    // 避免 accept_all 觸發的 setTimeout 立即把使用者彈回 STEP 6
    if (currentStep === 6) {
      dispatch({ type: 'RESET_CUSTOMER_DECISION' });
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

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setCurrentStep(1);
  }, []);

  const handleReturnToHub = useCallback(() => {
    router.push('/dashboard/sale');
  }, [router]);

  // Phase 3:Step5 的 consider / reject 結束 SOP;reset state + 回銷售中心
  const handleFinishSOP = useCallback(() => {
    dispatch({ type: 'RESET' });
    router.push('/dashboard/sale');
  }, [router]);

  // Phase 3:Step5 的 price_adjust 確認後跳回 STEP 4 重新報價
  const handleGoToStep = useCallback((step: StepNumber) => {
    setCurrentStep(step);
  }, []);

  let stepContent: ReactNode;
  switch (currentStep) {
    case 1:
      stepContent = (
        <Step1SelectCustomer state={state} dispatch={dispatch} onNext={handleNext} />
      );
      break;
    case 2:
      stepContent = (
        <Step2SearchParts
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 3:
      stepContent = (
        <Step3QuoteList
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 4:
      stepContent = (
        <Step4QuoteMethod
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 5:
      stepContent = (
        <Step5CustomerDecide
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
          onFinishSOP={handleFinishSOP}
          onGoToStep={handleGoToStep}
        />
      );
      break;
    case 6:
      stepContent = (
        <Step6DeliveryMethod
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 7:
      stepContent = (
        <Step7SignMethod
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 8:
      stepContent = (
        <Step8OrderComplete
          state={state}
          dispatch={dispatch}
          onBack={handleBack}
          onNext={handleNext}
        />
      );
      break;
    case 9:
      stepContent = (
        <Step9Summary
          state={state}
          onReset={handleReset}
          onReturnToHub={handleReturnToHub}
        />
      );
      break;
    default:
      stepContent = null;
      break;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ProgressHeader currentStep={currentStep} onBack={handleBack} />
      <main key={currentStep}>{stepContent}</main>
    </div>
  );
}
