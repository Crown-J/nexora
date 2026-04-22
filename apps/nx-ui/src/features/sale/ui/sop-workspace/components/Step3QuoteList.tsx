// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step3QuoteList.tsx
/**
 * STEP 3 — 建立報價清單
 *
 * 核對加入的料號、調整數量/單價、顯示總金額與毛利率提示。
 * 穩重風格、無 emoji；毛利率用淡色提示，達標 text-[#1D9E75] / 略低 text-[#E8A020]。
 */

'use client';

import { PART_BY_SKU } from '../mock-data/parts';
import { TAX_RATE, TIER_TARGET_MARGIN } from '../mock-data/scenario';
import type { QuoteItem, SaleSopAction, SaleSopState } from '../types';
import { StepWrapper } from './StepWrapper';

export type Step3QuoteListProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

function QuoteItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: QuoteItem;
  onUpdate: (partial: { quantity?: number; unitPrice?: number }) => void;
  onRemove: () => void;
}) {
  const part = PART_BY_SKU[item.sku];
  if (!part) return null;

  const lineTotal = item.quantity * item.unitPrice;

  // 庫存分布摘要（提示「本倉 X + 調他倉 Y」）
  const mainStock = part.stocks.main;
  const needFromOther = Math.max(0, item.quantity - mainStock);
  const stockInfo =
    item.quantity <= mainStock
      ? `本倉 ${mainStock}（足）`
      : `本倉 ${mainStock} + 調他倉 ${needFromOther}`;

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      {/* 料號 + 品名 + 移除 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-white/40">{item.sku}</span>
            <span className="truncate text-sm text-white">{part.name}</span>
          </div>
          <div className="mt-0.5 text-xs text-white/50">{stockInfo}</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs text-white/40 transition-colors hover:text-[#E24B4A]"
        >
          移除
        </button>
      </div>

      {/* 數量 + 單價 + 小計 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="mb-1 text-white/50">數量</div>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 1) onUpdate({ quantity: Math.floor(v) });
            }}
            className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums text-white focus:border-[#E8A020]/60 focus:outline-none"
            inputMode="numeric"
            aria-label="數量"
          />
        </div>
        <div>
          <div className="mb-1 text-white/50">單價</div>
          <input
            type="number"
            value={item.unitPrice}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 0) onUpdate({ unitPrice: Math.floor(v) });
            }}
            className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums text-white focus:border-[#E8A020]/60 focus:outline-none"
            inputMode="numeric"
            aria-label="單價"
          />
        </div>
        <div>
          <div className="mb-1 text-white/50">小計</div>
          <div className="rounded bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums text-white/90">
            {lineTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step3QuoteList({ state, dispatch, onBack, onNext }: Step3QuoteListProps) {
  const customer = state.selectedCustomer;
  const items = state.quoteItems;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const totalCost = items.reduce((s, i) => {
    const part = PART_BY_SKU[i.sku];
    return s + (part ? part.unitCost * i.quantity : 0);
  }, 0);
  const estimatedMargin = subtotal - totalCost;
  const marginRate = subtotal > 0 ? (estimatedMargin / subtotal) * 100 : 0;
  const targetMargin = customer ? TIER_TARGET_MARGIN[customer.tier] : 0;
  const reachedTarget = marginRate >= targetMargin;

  return (
    <StepWrapper
      canProceed={items.length > 0}
      onBack={onBack}
      onNext={onNext}
      nextLabel={items.length > 0 ? '下一步 → 決定報價方式' : '下一步'}
      disabledHint={items.length > 0 ? undefined : '報價清單為空'}
    >
      {/* 客戶摘要 */}
      {customer ? (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-white/40">{customer.code}</span>
            <span className="truncate text-sm text-white">{customer.name}</span>
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
              {customer.tier} 級
            </span>
          </div>
        </div>
      ) : null}

      {/* 報價明細 */}
      <div className="space-y-2">
        <div className="text-xs text-white/50">報價明細</div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm text-white/40">
            尚未加入任何料號
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <QuoteItemCard
                key={item.sku}
                item={item}
                onUpdate={(partial) =>
                  dispatch({ type: 'UPDATE_QUOTE_ITEM', sku: item.sku, ...partial })
                }
                onRemove={() => dispatch({ type: 'REMOVE_QUOTE_ITEM', sku: item.sku })}
              />
            ))}
          </div>
        )}
      </div>

      {/* 總計區 */}
      {items.length > 0 ? (
        <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">小計</span>
            <span className="tabular-nums text-white">NT$ {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">稅金 5%</span>
            <span className="tabular-nums text-white">NT$ {tax.toLocaleString()}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="font-medium text-white/90">總金額</span>
            <span className="text-base font-medium tabular-nums text-white">
              NT$ {total.toLocaleString()}
            </span>
          </div>

          {/* 毛利率提示（業務用，淡色） */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">預估毛利</span>
              <span className="tabular-nums text-white/70">
                NT$ {estimatedMargin.toLocaleString()} ({marginRate.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{customer?.tier ?? 'B'} 級目標毛利</span>
              <span
                className={reachedTarget ? 'text-[#1D9E75]' : 'text-[#E8A020]'}
              >
                {targetMargin}%　{reachedTarget ? '達標' : '略低'}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </StepWrapper>
  );
}
