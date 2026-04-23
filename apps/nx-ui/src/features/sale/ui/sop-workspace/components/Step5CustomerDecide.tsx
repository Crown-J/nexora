// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx
/**
 * STEP 5 — 客戶決定(TASK-BUSINESS-RESTRUCTURE Phase 3 重構)
 *
 * 5 選項 + 4 個 sub-flow:
 *   A. accept_all    接受所有品項   → 設定 decision,業務按底部下一步(無 setTimeout,Phase 1 bug 也一併解決)
 *   B. partial_accept 部分接受      → PartialAcceptDialog 勾選品項 → 移除未勾選的 + reset decision
 *   C. price_adjust   要求調整價格  → PriceAdjustDialog 逐項改單價 → UPDATE_QUOTE_ITEM + 回 STEP 4 讓業務重新報
 *   D. consider       考慮看看      → ConsiderDialog 設定追蹤天數 → createDirectQTs + 結束 SOP
 *   E. reject         全部不要      → RejectReasonDialog 選原因 → 結束 SOP
 *
 * 只有 decision=accept_all 才能按底部下一步進 STEP 6(出貨方式)。
 * 其他選項都透過 dialog sub-flow 處理,完成後要嘛 reset 要嘛結束 SOP。
 */

'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ListChecks,
  type LucideIcon,
  MessageSquare,
  XCircle,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';
import { useRFQStore } from '@/features/sale/ui/inquiry/store';

import { PART_BY_SKU } from '../mock-data/parts';
import { TAX_RATE } from '../mock-data/scenario';
import type {
  CustomerDecision,
  RejectReasonCode,
  SaleSopAction,
  SaleSopState,
  StepNumber,
} from '../types';
import { ConsiderDialog } from './ConsiderDialog';
import { PartialAcceptDialog } from './PartialAcceptDialog';
import { PriceAdjustDialog } from './PriceAdjustDialog';
import { RejectReasonDialog } from './RejectReasonDialog';
import { StepWrapper } from './StepWrapper';

export type Step5CustomerDecideProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
  /** Phase 3:consider / reject 後結束 SOP 回銷售中心 */
  onFinishSOP: () => void;
  /** Phase 3:price_adjust 確認後跳回 STEP 4 讓業務重新報價 */
  onGoToStep: (step: StepNumber) => void;
};

interface Option {
  id: CustomerDecision;
  Icon: LucideIcon;
  iconColor: string;
  title: string;
  quote: string;
}

const OPTIONS: readonly Option[] = [
  {
    id: 'accept_all',
    Icon: CheckCircle2,
    iconColor: 'text-[#1D9E75]',
    title: '接受所有品項',
    quote: '「好,就這樣」',
  },
  {
    id: 'partial_accept',
    Icon: ListChecks,
    iconColor: 'text-[#E8A020]',
    title: '部分接受',
    quote: '「我只要前面幾項」',
  },
  {
    id: 'price_adjust',
    Icon: MessageSquare,
    iconColor: 'text-[#E8A020]',
    title: '要求調整價格',
    quote: '「可以便宜一點嗎?」',
  },
  {
    id: 'consider',
    Icon: Clock,
    iconColor: 'text-[#4D8FE8]',
    title: '考慮看看',
    quote: '「我再想想」',
  },
  {
    id: 'reject',
    Icon: XCircle,
    iconColor: 'text-[#E24B4A]/80',
    title: '全部不要',
    quote: '「先不要了」',
  },
];

function DecisionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: Option;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { Icon } = option;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        'w-full rounded-lg border p-4 text-left transition-colors',
        isSelected
          ? 'border-[#E8A020]/60 bg-[#E8A020]/5'
          : 'border-white/10 bg-white/5 hover:border-white/20',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cx('h-5 w-5 shrink-0', option.iconColor)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white">{option.title}</div>
          <div className="mt-1 text-xs text-white/50">{option.quote}</div>
        </div>
      </div>
    </button>
  );
}

type SubDialog = 'partial' | 'adjust' | 'consider' | 'reject' | null;

export function Step5CustomerDecide({
  state,
  dispatch,
  onBack,
  onNext,
  onFinishSOP,
  onGoToStep,
}: Step5CustomerDecideProps) {
  const items = state.quoteItems;
  const customer = state.selectedCustomer;
  const decision = state.customerDecision;
  const [dialog, setDialog] = useState<SubDialog>(null);

  const createDirectQTs = useRFQStore((s) => s.createDirectQTs);

  // 報價摘要
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const quoteMethodLabel =
    state.quoteMethod === 'verbal'
      ? '口頭報價'
      : state.quoteMethod === 'print'
        ? '列印報價單'
        : '—';

  const handleSelect = (id: CustomerDecision) => {
    if (id === 'accept_all') {
      dispatch({ type: 'SET_CUSTOMER_DECISION', decision: 'accept_all' });
      return;
    }
    if (id === 'partial_accept') setDialog('partial');
    else if (id === 'price_adjust') setDialog('adjust');
    else if (id === 'consider') setDialog('consider');
    else if (id === 'reject') setDialog('reject');
    // 選項 UI 高亮用 decision(這 4 種只是預選,最終由 dialog 確認)
    dispatch({ type: 'SET_CUSTOMER_DECISION', decision: id });
  };

  const handlePartialConfirm = (acceptedSkus: string[]) => {
    items.forEach((i) => {
      if (!acceptedSkus.includes(i.sku)) {
        dispatch({ type: 'REMOVE_QUOTE_ITEM', sku: i.sku });
      }
    });
    setDialog(null);
    dispatch({ type: 'RESET_CUSTOMER_DECISION' });
    // 業務回 STEP 5 看到新清單,自行點「接受所有品項」繼續下單
  };

  const handlePriceAdjustConfirm = (updates: Record<string, number>) => {
    Object.entries(updates).forEach(([sku, unitPrice]) => {
      dispatch({ type: 'UPDATE_QUOTE_ITEM', sku, unitPrice });
    });
    setDialog(null);
    dispatch({ type: 'RESET_CUSTOMER_DECISION' });
    onGoToStep(4);
  };

  const handleConsiderConfirm = (_trackingDays: number) => {
    if (customer) {
      createDirectQTs({
        customer: { code: customer.code, name: customer.name, tier: customer.tier },
        items: items.map((i) => {
          const part = PART_BY_SKU[i.sku];
          return {
            sku: i.sku,
            name: part?.name ?? i.sku,
            quantity: i.quantity,
            finalPrice: i.unitPrice,
            cost: part?.unitCost ?? i.unitPrice,
          };
        }),
      });
    }
    setDialog(null);
    onFinishSOP();
  };

  const handleRejectConfirm = (reasons: RejectReasonCode[], note: string) => {
    // Demo 期:只印 console;未來 R10 會有流失分析 store
    // eslint-disable-next-line no-console
    console.info('[Phase 3] 客戶拒絕:', { reasons, note });
    setDialog(null);
    onFinishSOP();
  };

  const canProceed = decision === 'accept_all';
  const disabledHint = canProceed
    ? undefined
    : decision === null
      ? '請選擇客戶回應'
      : '此選項需在彈窗內完成處理';

  return (
    <StepWrapper
      canProceed={canProceed}
      onBack={onBack}
      onNext={onNext}
      nextLabel={canProceed ? '下一步:選擇出貨方式' : '下一步'}
      disabledHint={disabledHint}
    >
      {/* 報價摘要 */}
      <div className="mb-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/50">已向客戶報價</div>
        <div className="space-y-1">
          {items.slice(0, 3).map((i) => {
            const part = PART_BY_SKU[i.sku];
            return (
              <div
                key={i.sku}
                className="flex items-center justify-between text-xs"
              >
                <span className="min-w-0 truncate text-white/80">
                  <span className="mr-1.5 font-mono text-white/40">{i.sku}</span>
                  {part?.name ?? ''} × {i.quantity}
                </span>
              </div>
            );
          })}
          {items.length > 3 ? (
            <div className="text-xs text-white/40">…另 {items.length - 3} 項</div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
          <span className="text-white/70">總金額</span>
          <span className="tabular-nums text-white">
            NT$ {total.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">報價方式</span>
          <span className="text-white/70">{quoteMethodLabel}</span>
        </div>
      </div>

      <div className="mb-3 text-xs text-white/50">客戶回應</div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <DecisionCard
            key={opt.id}
            option={opt}
            isSelected={decision === opt.id}
            onSelect={() => handleSelect(opt.id)}
          />
        ))}
      </div>

      {/* Sub-flow dialogs */}
      {dialog === 'partial' ? (
        <PartialAcceptDialog
          items={items}
          partBySku={PART_BY_SKU}
          onConfirm={handlePartialConfirm}
          onCancel={() => {
            setDialog(null);
            dispatch({ type: 'RESET_CUSTOMER_DECISION' });
          }}
        />
      ) : null}

      {dialog === 'adjust' && customer ? (
        <PriceAdjustDialog
          items={items}
          partBySku={PART_BY_SKU}
          tier={customer.tier}
          onConfirm={handlePriceAdjustConfirm}
          onCancel={() => {
            setDialog(null);
            dispatch({ type: 'RESET_CUSTOMER_DECISION' });
          }}
        />
      ) : null}

      {dialog === 'consider' && customer ? (
        <ConsiderDialog
          customerCode={customer.code}
          customerName={customer.name}
          items={items}
          partBySku={PART_BY_SKU}
          onConfirm={handleConsiderConfirm}
          onCancel={() => {
            setDialog(null);
            dispatch({ type: 'RESET_CUSTOMER_DECISION' });
          }}
        />
      ) : null}

      {dialog === 'reject' ? (
        <RejectReasonDialog
          onConfirm={handleRejectConfirm}
          onCancel={() => {
            setDialog(null);
            dispatch({ type: 'RESET_CUSTOMER_DECISION' });
          }}
        />
      ) : null}
    </StepWrapper>
  );
}
