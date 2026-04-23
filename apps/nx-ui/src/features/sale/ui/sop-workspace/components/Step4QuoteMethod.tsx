// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step4QuoteMethod.tsx
/**
 * STEP 4 — 如何給客戶報價（口頭 vs 列印）
 *
 * 核心展示：系統懂業界慣例
 * - 口頭報價：一般日常採購（業界慣例）
 * - 列印報價單：估車 / 保險公司請款 / 客戶堅持書面
 */

'use client';

import { CheckCircle2, type LucideIcon, Mic, Printer } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import type { QuoteMethod, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step4QuoteMethodProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

type Option = {
  id: QuoteMethod;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  bullets?: string[];
  scenario?: string;
  detail: string;
};

const OPTIONS: readonly Option[] = [
  {
    id: 'verbal',
    icon: Mic,
    title: '口頭報價',
    subtitle: '業界慣例',
    description: '適用：一般日常採購',
    scenario: '客戶問「多少錢？」\n您口頭回覆即可',
    detail: '系統會記錄此次報價供日後查詢',
  },
  {
    id: 'print',
    icon: Printer,
    title: '列印報價單',
    subtitle: '特殊情況',
    description: '適用：',
    bullets: ['估車（零件項目多要逐項列）', '保險公司請款', '客戶堅持要書面'],
    detail: '回公司列印 PDF 給客戶',
  },
];

function MethodCard({
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
      <div className="flex items-start gap-3">
        {/* Icon 框 */}
        <div
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isSelected ? 'bg-[#E8A020]/20' : 'bg-white/10',
          )}
        >
          <Icon
            className={cx('h-5 w-5', isSelected ? 'text-[#E8A020]' : 'text-white/60')}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-base text-white">{option.title}</span>
            <span className="text-xs text-white/40">（{option.subtitle}）</span>
          </div>

          <div className="mb-2 text-xs text-white/70">{option.description}</div>

          {option.bullets ? (
            <div className="mb-2 space-y-0.5 pl-2 text-xs text-white/60">
              {option.bullets.map((b, i) => (
                <div key={i}>・{b}</div>
              ))}
            </div>
          ) : null}

          {option.scenario ? (
            <div className="my-2 whitespace-pre-line border-l-2 border-white/20 pl-3 text-xs text-white/60">
              {option.scenario}
            </div>
          ) : null}

          <div className="text-xs text-white/50">{option.detail}</div>
        </div>

        {isSelected ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E8A020]" aria-hidden />
        ) : null}
      </div>
    </button>
  );
}

export function Step4QuoteMethod({ state, dispatch, onBack, onNext }: Step4QuoteMethodProps) {
  const selected = state.quoteMethod;

  return (
    <StepWrapper
      canProceed={selected !== null}
      onBack={onBack}
      onNext={onNext}
      nextLabel={selected ? '下一步' : '下一步'}
      disabledHint={selected ? undefined : '請選擇一種報價方式'}
    >
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <MethodCard
            key={opt.id}
            option={opt}
            isSelected={selected === opt.id}
            onSelect={() => dispatch({ type: 'SET_QUOTE_METHOD', method: opt.id })}
          />
        ))}
      </div>
    </StepWrapper>
  );
}
