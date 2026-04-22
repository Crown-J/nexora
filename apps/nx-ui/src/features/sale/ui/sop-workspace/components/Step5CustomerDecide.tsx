// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step5CustomerDecide.tsx
/**
 * STEP 5 — 客戶決定（接受 / 協商 / 拒絕）
 *
 * 分流邏輯：
 * - accept：選擇後 300ms 自動進下一步（demo 主線）
 * - negotiate：顯示 demo 提示「實際版可回 STEP 3 調整單價」
 * - decline：顯示 demo 提示「實際版會記錄流失原因」
 * 非主線也允許手動繼續，方便春酒時展示流程完整性。
 */

'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, type LucideIcon, MessageSquare, XCircle } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { PART_BY_SKU } from '../mock-data/parts';
import { TAX_RATE } from '../mock-data/scenario';
import type { CustomerDecision, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step5CustomerDecideProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

type Option = {
  id: CustomerDecision;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  quote: string;
  hint: string | null;
};

const OPTIONS: readonly Option[] = [
  {
    id: 'accept',
    icon: CheckCircle2,
    iconColor: 'text-[#1D9E75]',
    title: '接受並下單',
    quote: '「好，就這樣」',
    hint: null,
  },
  {
    id: 'negotiate',
    icon: MessageSquare,
    iconColor: 'text-[#E8A020]',
    title: '要求調整',
    quote: '「可以便宜一點嗎？」',
    hint: '實際版可回 STEP 3 調整單價，此 demo 為示意',
  },
  {
    id: 'decline',
    icon: XCircle,
    iconColor: 'text-[#E24B4A]/70',
    title: '不下單',
    quote: '「我再想想」',
    hint: '實際版會記錄流失原因，此 demo 為示意',
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
  const Icon = option.icon;
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
          {isSelected && option.hint ? (
            <div className="mt-2 border-l-2 border-white/20 pl-2 text-xs text-white/40">
              {option.hint}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function Step5CustomerDecide({
  state,
  dispatch,
  onBack,
  onNext,
}: Step5CustomerDecideProps) {
  const decision = state.customerDecision;

  // accept 自動進下一步（延遲 300ms 讓選中視覺先出現）
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (decision === 'accept') {
      autoAdvanceRef.current = setTimeout(() => {
        onNext();
      }, 300);
    }
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [decision, onNext]);

  // 報價摘要（簡易）
  const items = state.quoteItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const quoteMethodLabel =
    state.quoteMethod === 'verbal'
      ? '口頭報價'
      : state.quoteMethod === 'print'
        ? '列印報價單'
        : '—';

  return (
    <StepWrapper
      canProceed={decision !== null}
      onBack={onBack}
      onNext={onNext}
      nextLabel={decision === 'accept' ? '自動進下一步...' : '下一步'}
      disabledHint={decision ? undefined : '請選擇客戶回應'}
    >
      {/* 報價摘要 */}
      <div className="mb-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/50">已向客戶報價</div>
        <div className="space-y-1">
          {items.slice(0, 3).map((i) => {
            const part = PART_BY_SKU[i.sku];
            return (
              <div key={i.sku} className="flex items-center justify-between text-xs">
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
          <span className="tabular-nums text-white">NT$ {total.toLocaleString()}</span>
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
            onSelect={() => dispatch({ type: 'SET_CUSTOMER_DECISION', decision: opt.id })}
          />
        ))}
      </div>
    </StepWrapper>
  );
}
