// apps/nx-ui/src/features/purchase/ui/sop-workspace/components/Step2Inquiry.tsx
/**
 * STEP 2：廠商詢價比較
 * - 上半部：使用者在 STEP 1 勾選的採購明細
 * - 下半部：三家廠商的比價卡（A 級金邊突出 + 額外推銷、B 級中價交期快、C 級低價交期長）
 * - 選擇某家後下一步按鈕轉金色可按
 *
 * SOP 內建亮點：系統自動向推薦廠商發詢價，新人不用記「誰是合作廠商」。
 */

'use client';

import { useMemo } from 'react';
import { Award, CheckCircle2, Clock, Gift, Phone } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import {
  MOCK_VENDORS,
  REQUIREMENT_BY_SKU,
  computeVendorQuote,
} from '../mock-data/scenario';
import type { ScenarioAction, ScenarioState, Vendor, VendorGrade } from '../types';
import { StepWrapper } from './StepWrapper';

type Step2Props = {
  state: ScenarioState;
  dispatch: (action: ScenarioAction) => void;
  onBack: () => void;
  onNext: () => void;
};

const GRADE_COPY: Record<VendorGrade, { label: string; tone: string; ringTone: string; iconTone: string }> = {
  A: {
    label: 'A 級合作廠商',
    tone: 'border-[#E8A020]/60 bg-[#E8A020]/[0.08]',
    ringTone: 'ring-2 ring-[#E8A020]/60',
    iconTone: 'text-[#E8A020]',
  },
  B: {
    label: 'B 級合作廠商',
    tone: 'border-white/25 bg-white/[0.03]',
    ringTone: 'ring-2 ring-[#1D9E75]/60',
    iconTone: 'text-[#1D9E75]',
  },
  C: {
    label: 'C 級合作廠商',
    tone: 'border-white/15 bg-white/[0.02]',
    ringTone: 'ring-2 ring-sky-400/60',
    iconTone: 'text-sky-300',
  },
};

const currencyNTD = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
});

export function Step2Inquiry({ state, dispatch, onBack, onNext }: Step2Props) {
  const canProceed = state.selectedVendorId !== null;

  const selectedItems = useMemo(
    () =>
      state.selectedSkus
        .map((sku) => REQUIREMENT_BY_SKU[sku])
        .filter(Boolean),
    [state.selectedSkus],
  );

  const quotes = useMemo(
    () =>
      MOCK_VENDORS.map((v) => ({
        vendor: v,
        quote: computeVendorQuote(v.id, state.selectedSkus),
      })),
    [state.selectedSkus],
  );

  const lowestTotal = useMemo(
    () => Math.min(...quotes.map((q) => q.quote.total)),
    [quotes],
  );

  return (
    <StepWrapper
      canProceed={canProceed}
      onBack={onBack}
      onNext={onNext}
      nextLabel={canProceed ? '下一步 → 建立採購單' : '請選一家廠商'}
      disabledHint="請選一家廠商"
    >
      <div className="space-y-5">
        {/* 採購項目摘要 */}
        <section className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/90">您要採購的項目</h2>
            <span className="text-[11px] text-white/50 tabular-nums">
              {selectedItems.length} 項
            </span>
          </div>
          <ul className="space-y-1.5">
            {selectedItems.map((item) => (
              <li
                key={item.sku}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <span className="font-mono text-[11px] text-white/50">{item.sku}</span>
                <span className="truncate">{item.name}</span>
                <span className="ml-auto shrink-0 tabular-nums text-white/60">
                  × {item.suggested}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 比價 hint */}
        <div className="flex items-center gap-2 rounded-xl border border-[#E8A020]/30 bg-[#E8A020]/5 px-3 py-2 text-xs text-[#E8A020]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>系統已向 3 家推薦廠商同時發出詢價，請比較後選擇</span>
        </div>

        {/* 三家廠商比價卡 */}
        <div className="space-y-3">
          {quotes.map(({ vendor, quote }) => {
            const isSelected = state.selectedVendorId === vendor.id;
            const isLowest = quote.total === lowestTotal;
            return (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                totalAmount={quote.total}
                isLowest={isLowest}
                isSelected={isSelected}
                onSelect={() => dispatch({ type: 'SELECT_VENDOR', vendorId: vendor.id })}
              />
            );
          })}
        </div>
      </div>
    </StepWrapper>
  );
}

function VendorCard({
  vendor,
  totalAmount,
  isLowest,
  isSelected,
  onSelect,
}: {
  vendor: Vendor;
  totalAmount: number;
  isLowest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const visual = GRADE_COPY[vendor.grade];

  return (
    <article
      className={cx(
        'relative rounded-xl border transition-all duration-200',
        visual.tone,
        isSelected && visual.ringTone,
      )}
    >
      {vendor.grade === 'A' ? (
        <div className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-[#E8A020] px-2 py-0.5 text-[10px] font-bold text-black">
          <Award className="h-3 w-3" aria-hidden />
          推薦
        </div>
      ) : null}

      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white/95">
              {vendor.name}
            </h3>
          </div>
          <div className={cx('mt-0.5 text-[11px] font-medium', visual.iconTone)}>
            {visual.label}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/50">總報價</div>
          <div className="tabular-nums text-lg font-bold text-white">
            {currencyNTD.format(totalAmount)}
          </div>
          {isLowest ? (
            <div className="text-[10px] font-semibold text-[#1D9E75]">本次最低價</div>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/5 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-white/70">
          <Clock className="h-3.5 w-3.5 text-white/40" aria-hidden />
          交期 {vendor.deliveryDays} 天
        </div>
        <div className="flex items-center gap-1.5 text-white/70">
          <Phone className="h-3.5 w-3.5 text-white/40" aria-hidden />
          {vendor.contactName}
        </div>
        <div className="col-span-2 text-white/50">{vendor.paymentTerms}</div>
      </div>

      {vendor.extraOffer ? (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-[#E8A020]/25 bg-[#E8A020]/10 px-3 py-2 text-[11px] text-[#E8A020]">
          <Gift className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>額外推薦：{vendor.extraOffer}</span>
        </div>
      ) : null}

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          className={cx(
            'inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-[0.98]',
            isSelected
              ? 'bg-[#E8A020] text-black shadow-[0_6px_18px_rgba(232,160,32,0.35)]'
              : 'border border-white/25 text-white/85 hover:bg-white/5',
          )}
        >
          {isSelected ? '✓ 已選擇此廠商' : '選擇此廠商'}
        </button>
      </div>
    </article>
  );
}
