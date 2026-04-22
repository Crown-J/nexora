// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step2SearchParts.tsx
/**
 * STEP 2 — 查料號 / 庫存（最戲劇性的 step）
 *
 * 對應戲劇亮點 1（當場查庫存）+ 亮點 3（庫存不足自動建議調貨）：
 * - 搜尋框 + 常用關鍵字 chips（剎車片 / 機油濾心 / ...）
 * - 結果卡：多倉位庫存、B 級客戶建議售價、歷史成交價、料號 emoji
 * - 數量 stepper：若 > 本倉庫存 → 卡片變身為「庫存不足救援」，秀多倉調貨建議
 * - 加入報價清單後，卡片變「已加入」態
 */

'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarcodeIcon,
  CheckCircle2,
  Mic,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { MOCK_PARTS, searchParts } from '../mock-data/parts';
import {
  WAREHOUSE_META,
  type Part,
  type QuoteItem,
  type SaleSopAction,
  type SaleSopState,
  type WarehouseKey,
} from '../types';
import { StepWrapper } from './StepWrapper';

export type Step2SearchPartsProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

const SUGGESTED_KEYWORDS = ['剎車片', '機油濾心', '空氣濾心', '火星塞'] as const;

/** 依本倉庫存分類庫存狀態 */
function stockLevel(mainStock: number): 'abundant' | 'low' | 'zero' {
  if (mainStock === 0) return 'zero';
  if (mainStock < 10) return 'low';
  return 'abundant';
}

function StockRow({
  wh,
  qty,
}: {
  wh: WarehouseKey;
  qty: number;
}) {
  const isZero = qty === 0;
  const meta = WAREHOUSE_META[wh];
  return (
    <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-2 py-1.5 text-[12px]">
      <span className="flex items-center gap-1.5 text-white/70">
        <Package className="h-3 w-3 text-white/40" aria-hidden />
        {meta.label}
      </span>
      <span
        className={cx(
          'tabular-nums font-semibold',
          isZero ? 'text-white/30' : qty >= 10 ? 'text-[#1D9E75]' : 'text-[#E8A020]',
        )}
      >
        {qty} 個 {isZero ? '' : wh === 'main' ? '✅' : ''}
      </span>
    </div>
  );
}

function PartCard({
  part,
  tier,
  existingQty,
  onAddOrUpdate,
  onRemove,
}: {
  part: Part;
  tier: 'A' | 'B' | 'C' | 'D';
  existingQty: number | null;
  onAddOrUpdate: (qty: number) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState<number>(existingQty ?? 1);
  const suggestedPrice = part.prices[tier];
  const mainStock = part.stocks.main;
  const hsinchuStock = part.stocks.hsinchu;
  const taichungStock = part.stocks.taichung;
  const totalOtherStock = hsinchuStock + taichungStock;
  const level = stockLevel(mainStock);

  const shortage = qty > mainStock;
  const canFullFill = qty <= mainStock + totalOtherStock;
  const otherNeed = Math.min(Math.max(0, qty - mainStock), totalOtherStock);

  const inQuote = existingQty !== null;

  const adjust = (delta: number) => {
    setQty((q) => Math.max(1, Math.min(99, q + delta)));
  };

  return (
    <article
      className={cx(
        'rounded-xl border p-4 transition-colors',
        inQuote
          ? 'border-[#1D9E75]/50 bg-[#1D9E75]/[0.06]'
          : shortage
            ? 'border-[#E8A020]/40 bg-[#E8A020]/[0.05]'
            : 'border-white/10 bg-white/[0.03]',
      )}
    >
      {/* 料號抬頭 */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
          <Package className="h-4 w-4 text-white/40" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {level === 'abundant' && mainStock >= 20 ? (
              <span
                className="inline-flex items-center rounded bg-[#1D9E75]/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#1D9E75]"
                aria-label="庫存充足"
              >
                🏆
              </span>
            ) : null}
            <h3 className="truncate text-sm font-semibold text-white/95">
              {part.sku} {part.name}
            </h3>
          </div>
          <div className="mt-0.5 text-[11px] text-white/50">
            {part.brand} · 適用 {part.vehicleTypes.join(' / ')}
          </div>
        </div>
      </div>

      {/* 庫存 */}
      <div className="mt-3 flex flex-col gap-1">
        <StockRow wh="main" qty={mainStock} />
        <StockRow wh="hsinchu" qty={hsinchuStock} />
        <StockRow wh="taichung" qty={taichungStock} />
      </div>

      {/* 售價 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#E8A020]/30 bg-[#E8A020]/[0.08] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-[#E8A020]/90">
            建議售價 {tier} 級
          </div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-[#E8A020]">
            NT$ {suggestedPrice.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/40">
            <TrendingUp className="h-2.5 w-2.5" aria-hidden />
            歷史成交
          </div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-white/85">
            NT$ {part.lastSoldPrice.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 數量 stepper */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-white/55">數量</span>
        <div className="inline-flex items-center rounded-lg border border-white/15 bg-white/5">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={qty <= 1}
            className="inline-flex h-9 w-9 items-center justify-center text-white/70 transition-colors hover:text-white disabled:text-white/20"
            aria-label="減少數量"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            value={qty}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setQty(Math.max(1, Math.min(99, Math.floor(v))));
            }}
            className="h-9 w-12 border-x border-white/15 bg-transparent text-center text-sm font-semibold tabular-nums text-white focus:outline-none"
            inputMode="numeric"
            aria-label="數量"
          />
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={qty >= 99}
            className="inline-flex h-9 w-9 items-center justify-center text-white/70 transition-colors hover:text-white disabled:text-white/20"
            aria-label="增加數量"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 庫存不足救援（亮點 3） */}
      {shortage ? (
        <div className="mt-3 rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/[0.08] p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8A020]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            本倉只有 {mainStock} 個，您要 {qty} 個
          </div>
          {canFullFill ? (
            <>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
                <Sparkles className="h-3 w-3 text-[#E8A020]" aria-hidden />
                系統建議
              </div>
              <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-white/75">
                {mainStock > 0 ? (
                  <li>📦 本倉 {mainStock} 個（{WAREHOUSE_META.main.etaHint}）</li>
                ) : null}
                {otherNeed > 0 ? (
                  <li>
                    🚚 {hsinchuStock > 0 ? '新竹倉' : '台中倉'}調 {otherNeed} 個（
                    {hsinchuStock > 0
                      ? WAREHOUSE_META.hsinchu.etaHint
                      : WAREHOUSE_META.taichung.etaHint}
                    ）
                  </li>
                ) : null}
                <li className="text-[#1D9E75]">✅ 可完整出貨！</li>
              </ul>
            </>
          ) : (
            <div className="mt-2 text-[11px] text-white/70">
              ⚠️ 所有倉合計庫存 {mainStock + totalOtherStock} 個，仍不足 {qty - (mainStock + totalOtherStock)} 個。
              <br />
              建議請客戶改減量或改其他料號。
            </div>
          )}
        </div>
      ) : null}

      {/* 加入報價清單 / 已加入 */}
      <div className="mt-3 flex items-center gap-2">
        {inQuote ? (
          <>
            <button
              type="button"
              onClick={() => onAddOrUpdate(qty)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#28b388] active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              已加入 · 更新為 {qty} 個
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/20 px-3 text-xs text-white/60 transition-colors hover:bg-white/5"
            >
              移除
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onAddOrUpdate(qty)}
            disabled={!canFullFill}
            className={cx(
              'inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]',
              canFullFill
                ? 'bg-[#E8A020] text-black shadow-[0_4px_12px_rgba(232,160,32,0.25)]'
                : 'cursor-not-allowed bg-white/10 text-white/40',
            )}
          >
            {canFullFill ? (shortage ? '接受此建議並加入 →' : '加入報價清單 →') : '缺貨無法下單'}
          </button>
        )}
      </div>
    </article>
  );
}

export function Step2SearchParts({
  state,
  dispatch,
  onBack,
  onNext,
}: Step2SearchPartsProps) {
  const [keyword, setKeyword] = useState('');

  const results = useMemo<Part[]>(() => {
    const kw = keyword.trim();
    if (!kw) return [];
    return searchParts(kw);
  }, [keyword]);

  const customer = state.selectedCustomer;
  const tier = customer?.tier ?? 'B';

  const quoteQtyBySku = useMemo(() => {
    const m = new Map<string, number>();
    state.quoteItems.forEach((q) => m.set(q.sku, q.quantity));
    return m;
  }, [state.quoteItems]);

  const totalItemsInQuote = state.quoteItems.length;

  const handleAddOrUpdate = (part: Part, qty: number) => {
    const item: QuoteItem = {
      sku: part.sku,
      quantity: qty,
      unitPrice: part.prices[tier],
    };
    if (quoteQtyBySku.has(part.sku)) {
      dispatch({ type: 'UPDATE_QUOTE_ITEM', sku: part.sku, quantity: qty });
    } else {
      dispatch({ type: 'ADD_QUOTE_ITEM', item });
    }
  };

  return (
    <StepWrapper
      canProceed={totalItemsInQuote > 0}
      onBack={onBack}
      onNext={onNext}
      nextLabel={totalItemsInQuote > 0 ? `下一步 → 建立清單（${totalItemsInQuote} 項）` : '下一步'}
      disabledHint={totalItemsInQuote > 0 ? undefined : '請先加入至少一項料號'}
    >
      {/* 已選客戶摘要（穩重版） */}
      {customer ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/40">{customer.code}</span>
              <span className="truncate text-sm text-white">{customer.name}</span>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
                {tier} 級
              </span>
            </div>
          </div>
          <div className="shrink-0 text-xs text-white/50">自動套 {tier} 級價</div>
        </div>
      ) : null}

      {/* 搜尋框 */}
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <input
          type="search"
          inputMode="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="輸入料號或品名（例：剎車片、機油濾心）"
          className={cx(
            'h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] pl-9 pr-3 text-sm',
            'text-white placeholder:text-white/35',
            'focus:border-[#E8A020] focus:bg-black/40 focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30',
            'transition-colors',
          )}
          aria-label="料號搜尋"
        />
      </label>

      {/* 掃描/語音（視覺 mock） */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            /* demo 視覺，無實際動作 */
          }}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-[11px] text-white/60 transition-colors hover:bg-white/10"
        >
          <BarcodeIcon className="h-3.5 w-3.5" aria-hidden />
          掃描條碼
        </button>
        <button
          type="button"
          onClick={() => {
            /* demo 視覺，無實際動作 */
          }}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-[11px] text-white/60 transition-colors hover:bg-white/10"
        >
          <Mic className="h-3.5 w-3.5" aria-hidden />
          語音輸入
        </button>
      </div>

      {/* 常用關鍵字 chips */}
      {!keyword ? (
        <div className="mt-4">
          <div className="mb-2 text-[11px] text-white/45">常用搜尋：</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_KEYWORDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKeyword(k)}
                className="inline-flex h-8 items-center rounded-full border border-white/15 bg-white/[0.04] px-3 text-xs text-white/75 transition-colors hover:border-[#E8A020] hover:text-[#E8A020]"
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-white/35">
            目前共 {MOCK_PARTS.length} 個料號
            <br />
            輸入關鍵字開始查詢
          </p>
        </div>
      ) : null}

      {/* 搜尋結果 */}
      {keyword && results.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
          沒有找到符合「{keyword}」的料號
        </div>
      ) : null}

      {keyword && results.length > 0 ? (
        <section className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-white/85">
              🔍 搜尋「{keyword}」 · 找到 {results.length} 項
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {results.map((p) => (
              <PartCard
                key={p.sku}
                part={p}
                tier={tier}
                existingQty={quoteQtyBySku.get(p.sku) ?? null}
                onAddOrUpdate={(q) => handleAddOrUpdate(p, q)}
                onRemove={() => dispatch({ type: 'REMOVE_QUOTE_ITEM', sku: p.sku })}
              />
            ))}
          </div>
        </section>
      ) : null}
    </StepWrapper>
  );
}
