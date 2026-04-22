// apps/nx-ui/src/features/sale/ui/sop-workspace/MobileSaleSopPage.tsx
/**
 * 國內銷貨 SOP 手機工作台 — 主容器（R6 demo 主力）
 *
 * 狀態：useReducer 驅動 9 步流程（全 Mock）
 * 佈局：頂部固定 ProgressHeader + 底部固定 StepWrapper 按鈕列
 *
 * R6 Phase 1：STEP 1~2 完整實作，3~9 用 StepPlaceholder 占位，
 * Crown 可先驗收核心戲劇點（選客戶 + 查料號 + 庫存不足救援）。
 */

'use client';

import { useCallback, useReducer, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { MOCK_SO_NO } from './mock-data/scenario';
import { ProgressHeader } from './components/ProgressHeader';
import { Step1SelectCustomer } from './components/Step1SelectCustomer';
import { Step2SearchParts } from './components/Step2SearchParts';
import { Step3QuoteList } from './components/Step3QuoteList';
import { Step4QuoteMethod } from './components/Step4QuoteMethod';
import { Step5CustomerDecide } from './components/Step5CustomerDecide';
import { Step6DeliveryMethod } from './components/Step6DeliveryMethod';
import { StepPlaceholder } from './components/StepPlaceholder';
import type { SaleSopAction, SaleSopState, StepNumber } from './types';

const initialState: SaleSopState = {
  selectedCustomer: null,
  quoteItems: [],
  quoteMethod: null,
  customerDecision: null,
  deliveryMethod: null,
  signMethod: null,
  hasSigned: false,
  orderNumber: MOCK_SO_NO,
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
    case 'SET_DELIVERY_METHOD':
      return { ...state, deliveryMethod: action.method };
    case 'SET_SIGN_METHOD':
      return { ...state, signMethod: action.method };
    case 'COMPLETE_SIGNATURE':
      return { ...state, hasSigned: true };
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

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      router.push('/dashboard/sale');
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
      <main key={currentStep}>{stepContent}</main>
    </div>
  );
}
