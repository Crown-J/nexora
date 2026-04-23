// apps/nx-ui/src/features/sale/ui/sop-workspace/components/Step2SearchParts.tsx
/**
 * STEP 2 — 查料號 / 庫存（Phase 2 穩重化 + 手風琴版）
 *
 * 對應戲劇亮點 1（當場查庫存）+ 亮點 3（庫存不足自動建議調貨）
 *
 * UX 結構：
 * - 頂部已選客戶摘要（穩重、無 emoji）
 * - 搜尋框 + 常用關鍵字 chips
 * - 列表層：每筆料號一行（料號 font-mono + 品名 + 庫存/建議售價摘要 + chevron）
 * - 點擊展開詳情（手風琴，同時只一個展開）：
 *   - 料號圖片 aspect-video（點擊開 Lightbox）
 *   - 多倉位庫存 3 格
 *   - 報價售價可編輯（建議值 = 該客戶等級價）
 *   - 數量 stepper + 手動輸入
 *   - 庫存不足救援建議（數量 > 本倉時出現，AlertCircle + 淡金邊）
 *   - 加入報價清單按鈕（金色 CTA）
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarcodeIcon,
  ChevronRight,
  Mic,
  Minus,
  Package,
  Plus,
  Search,
} from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { useRFQStore } from '@/features/sale/ui/inquiry/store';

import { MOCK_PARTS, searchParts } from '../mock-data/parts';
import { useHistoryRecord, type HistoryRecord } from '../mock-data/quote-history';
import {
  WAREHOUSE_META,
  type Part,
  type QuoteItem,
  type SaleSopAction,
  type SaleSopState,
} from '../types';
import { AddMoreDialog } from './AddMoreDialog';
import { FloatingToast, type ToastType } from './FloatingToast';
import { HistoryQuoteAlert } from './HistoryQuoteAlert';
import { ImageLightbox } from './ImageLightbox';
import { MarginAlert } from './MarginAlert';
import { OutOfStockDialog } from './OutOfStockDialog';
import { StepWrapper } from './StepWrapper';

export type Step2SearchPartsProps = {
  state: SaleSopState;
  dispatch: React.Dispatch<SaleSopAction>;
  onBack: () => void;
  onNext: () => void;
};

const SUGGESTED_KEYWORDS = ['剎車片', '機油濾心', '空氣濾心', '火星塞'] as const;

function PartDetailExpanded({
  part,
  tier,
  customerCode,
  existingItem,
  onAdd,
  onUpdate,
  onRemove,
  onZoom,
  onInquire,
  onViewHistory,
}: {
  part: Part;
  tier: 'A' | 'B' | 'C' | 'D';
  customerCode: string | null;
  existingItem: QuoteItem | null;
  onAdd: (item: QuoteItem) => void;
  onUpdate: (partial: { quantity?: number; unitPrice?: number }) => void;
  onRemove: () => void;
  onZoom: () => void;
  /** R7 Phase 7-1：全公司無庫存時的分流決策彈窗入口,帶上當前選的數量 */
  onInquire: (qty: number) => void;
  /** Phase 2:HistoryQuoteAlert 的「查看詳情」點擊 */
  onViewHistory: (history: HistoryRecord) => void;
}) {
  const suggestedPrice = part.prices[tier];

  // 本地編輯狀態（未加入時使用），加入後直接走 reducer
  const [localQty, setLocalQty] = useState<number>(existingItem?.quantity ?? 1);
  const [localPrice, setLocalPrice] = useState<number>(existingItem?.unitPrice ?? suggestedPrice);

  const qty = existingItem ? existingItem.quantity : localQty;
  const price = existingItem ? existingItem.unitPrice : localPrice;

  const setQty = (n: number) => {
    const v = Math.max(1, Math.min(99, Math.floor(n)));
    if (existingItem) onUpdate({ quantity: v });
    else setLocalQty(v);
  };
  const setPrice = (n: number) => {
    const v = Math.max(0, Math.floor(n));
    if (existingItem) onUpdate({ unitPrice: v });
    else setLocalPrice(v);
  };

  const mainStock = part.stocks.main;
  const hsinchuStock = part.stocks.hsinchu;
  const taichungStock = part.stocks.taichung;
  const totalOtherStock = hsinchuStock + taichungStock;
  const totalCompanyStock = mainStock + totalOtherStock;
  const isOutOfStock = totalCompanyStock === 0;
  const shortage = qty > mainStock;
  const canFullFill = qty <= mainStock + totalOtherStock;
  const otherNeed = Math.min(Math.max(0, qty - mainStock), totalOtherStock);

  // Phase 2:查該客戶 × 該料號的歷史記錄(RFQ / QT / 歷史報價)
  const history = useHistoryRecord(customerCode, part.sku);

  const handleAddClick = () => {
    onAdd({ sku: part.sku, quantity: qty, unitPrice: price });
  };

  return (
    <div className="space-y-4 border-t border-white/10 bg-black/30 p-4">
      {/* Phase 2:歷史記錄提醒(RFQ 進行中 / QT 待確認 / 30 天內歷史報價) */}
      {history ? (
        <HistoryQuoteAlert
          history={history}
          onApply={history.type === 'quote' ? (v) => setPrice(v) : undefined}
          onView={onViewHistory}
        />
      ) : null}

      {/* 圖片 aspect-video + Lightbox trigger */}
      <button
        type="button"
        onClick={onZoom}
        className="block aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-colors hover:border-white/20"
        aria-label="放大檢視料號圖片"
      >
        {part.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={part.imageUrl}
            alt={part.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-white/30" aria-hidden />
          </div>
        )}
      </button>

      {/* 適用車型 */}
      {part.vehicleTypes.length > 0 ? (
        <div className="text-xs text-white/60">
          適用：{part.vehicleTypes.join(' / ')}
        </div>
      ) : null}

      {/* 分隔線 */}
      <div className="h-px bg-white/10" />

      {/* 多倉位庫存 3 格 */}
      <div>
        <div className="mb-2 text-xs text-white/50">庫存分布</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(
            [
              ['main', WAREHOUSE_META.main.label, mainStock],
              ['hsinchu', WAREHOUSE_META.hsinchu.label, hsinchuStock],
              ['taichung', WAREHOUSE_META.taichung.label, taichungStock],
            ] as const
          ).map(([key, label, qtyVal]) => (
            <div key={key} className="rounded bg-white/5 p-2 text-center">
              <div className="mb-1 text-white/50">{label}</div>
              <div
                className={cx(
                  'tabular-nums',
                  qtyVal === 0
                    ? 'text-white/30'
                    : key === 'main'
                      ? 'text-[#1D9E75]'
                      : 'text-white/80',
                )}
              >
                {qtyVal}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 售價（可編輯） */}
      <div>
        <div className="mb-2 text-xs text-white/50">報價</div>
        <div className="flex items-center gap-3">
          <div className="shrink-0 text-xs text-white/40">建議（{tier} 級）</div>
          <input
            type="number"
            value={price}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setPrice(v);
            }}
            className={cx(
              'flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white',
              'tabular-nums',
              'focus:border-[#E8A020]/60 focus:outline-none',
            )}
            inputMode="numeric"
            aria-label="單價"
          />
        </div>
        <div className="mt-1 text-xs text-white/40">
          歷史成交：NT$ {part.lastSoldPrice.toLocaleString()}
        </div>
        {/* Phase 2:毛利警覺性(系統建議+目標+實際毛利,即時染色) */}
        <div className="mt-2">
          <MarginAlert tier={tier} cost={part.unitCost} finalPrice={price} />
        </div>
      </div>

      {/* 數量 stepper */}
      <div>
        <div className="mb-2 text-xs text-white/50">數量</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty(qty - 1)}
            disabled={qty <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 transition-colors hover:border-white/20 disabled:opacity-30"
            aria-label="減少數量"
          >
            <Minus className="h-4 w-4 text-white/70" aria-hidden />
          </button>
          <input
            type="number"
            value={qty}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setQty(v);
            }}
            className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-center text-sm tabular-nums text-white focus:border-[#E8A020]/60 focus:outline-none"
            inputMode="numeric"
            aria-label="數量"
          />
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            disabled={qty >= 99}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 transition-colors hover:border-white/20 disabled:opacity-30"
            aria-label="增加數量"
          >
            <Plus className="h-4 w-4 text-white/70" aria-hidden />
          </button>
        </div>
      </div>

      {/* 庫存不足救援（R7 Phase 7：OOS 時不顯示，改由底部「目前全公司無庫存」按鈕承擔） */}
      {shortage && !isOutOfStock ? (
        <div className="rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#E8A020]" aria-hidden />
            <div className="space-y-2 text-xs">
              <div className="text-white/80">
                本倉僅 {mainStock} 個，您需要 {qty} 個
              </div>
              {canFullFill ? (
                <>
                  <div className="text-white/60">系統建議：</div>
                  <div className="space-y-0.5 pl-2 text-white/70">
                    {mainStock > 0 ? (
                      <div>• 本倉 {mainStock} 個（{WAREHOUSE_META.main.etaHint}）</div>
                    ) : null}
                    {otherNeed > 0 ? (
                      <div>
                        • {hsinchuStock > 0 ? '新竹倉' : '台中倉'}調 {otherNeed} 個（
                        {hsinchuStock > 0
                          ? WAREHOUSE_META.hsinchu.etaHint
                          : WAREHOUSE_META.taichung.etaHint}
                        ）
                      </div>
                    ) : null}
                  </div>
                  <div className="text-[#1D9E75]">✓ 可完整出貨</div>
                </>
              ) : (
                <div className="text-white/70">
                  所有倉合計 {mainStock + totalOtherStock} 個，仍不足{' '}
                  {qty - (mainStock + totalOtherStock)} 個；建議請客戶改減量或改其他料號。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 加入 / 已加入 / 全公司缺貨（R7 Phase 7-1：分流選單入口） */}
      {isOutOfStock ? (
        <button
          type="button"
          onClick={() => onInquire(qty)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E8A020]/60 text-sm text-[#E8A020] transition-colors hover:bg-[#E8A020]/10"
        >
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span>目前全公司無庫存</span>
        </button>
      ) : existingItem ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 px-3 py-2 text-center text-xs text-[#1D9E75]">
            已加入報價清單 · 自動同步本卡變更
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-10 shrink-0 items-center rounded border border-white/20 px-3 text-xs text-white/60 transition-colors hover:border-[#E24B4A]/60 hover:text-[#E24B4A]"
          >
            移除
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!canFullFill}
          className={cx(
            'inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors',
            canFullFill
              ? 'bg-[#E8A020] text-black hover:bg-[#E8A020]/90'
              : 'cursor-not-allowed bg-white/10 text-white/40',
          )}
        >
          {canFullFill ? '加入報價清單' : '缺貨無法下單'}
        </button>
      )}
    </div>
  );
}

function PartRow({
  part,
  tier,
  isExpanded,
  onToggle,
}: {
  part: Part;
  tier: 'A' | 'B' | 'C' | 'D';
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const suggestedPrice = part.prices[tier];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx(
        'w-full p-3 text-left transition-colors',
        isExpanded ? 'bg-[#E8A020]/5' : 'hover:bg-white/5',
      )}
      aria-expanded={isExpanded}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* 料號 + 品名 */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-white/40">{part.sku}</span>
            <span className="truncate text-sm text-white">{part.name}</span>
          </div>
          {/* 庫存摘要 + 建議售價 */}
          <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
            <span className={part.stocks.main > 0 ? 'text-[#1D9E75]' : 'text-white/40'}>
              本倉 {part.stocks.main}
            </span>
            <span>·</span>
            <span className="tabular-nums">
              建議 NT$ {suggestedPrice.toLocaleString()}
            </span>
          </div>
        </div>
        <ChevronRight
          className={cx(
            'h-4 w-4 shrink-0 text-white/40 transition-transform',
            isExpanded && 'rotate-90',
          )}
          aria-hidden
        />
      </div>
    </button>
  );
}

export function Step2SearchParts({
  state,
  dispatch,
  onBack,
  onNext,
}: Step2SearchPartsProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [lightboxPart, setLightboxPart] = useState<Part | null>(null);
  // R7 Phase 7-1：全公司無庫存分流決策彈窗 + 操作 toast
  // 記錄部件 + 業務在詳情區選的數量，供選項 A/B 建立 RFQ / CO
  const [oosDialog, setOosDialog] = useState<{ part: Part; qty: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  // Phase 3 追加品項機制:加入清單後彈出「還要查嗎?」
  const [addMorePart, setAddMorePart] = useState<Part | null>(null);

  const createRFQ = useRFQStore((s) => s.createRFQ);
  const createCustomerOrder = useRFQStore((s) => s.createCustomerOrder);

  const results = useMemo<Part[]>(() => {
    const kw = keyword.trim();
    if (!kw) return [];
    return searchParts(kw);
  }, [keyword]);

  const customer = state.selectedCustomer;
  const tier = customer?.tier ?? 'B';

  const itemBySku = useMemo(() => {
    const m = new Map<string, QuoteItem>();
    state.quoteItems.forEach((q) => m.set(q.sku, q));
    return m;
  }, [state.quoteItems]);

  const totalItemsInQuote = state.quoteItems.length;

  const handleAdd = (item: QuoteItem) => {
    dispatch({ type: 'ADD_QUOTE_ITEM', item });
    // Phase 3 追加品項:每次加入清單後詢問「還要查嗎?」
    const part = MOCK_PARTS.find((p) => p.sku === item.sku) ?? null;
    setAddMorePart(part);
    // 收起詳情讓 UI 清爽
    setExpandedSku(null);
  };
  const handleUpdate = (sku: string, partial: { quantity?: number; unitPrice?: number }) => {
    dispatch({ type: 'UPDATE_QUOTE_ITEM', sku, ...partial });
  };
  const handleRemove = (sku: string) => {
    dispatch({ type: 'REMOVE_QUOTE_ITEM', sku });
  };

  // R7 Phase 7-1 選項 A:向同行調貨 → 建 RFQ 詢價單（寫進 store）
  const handleSelectInquiry = () => {
    const snap = oosDialog;
    setOosDialog(null);
    if (!snap || !customer) return;
    const rfq = createRFQ({
      customer: { code: customer.code, name: customer.name, tier: customer.tier },
      part: { sku: snap.part.sku, name: snap.part.name },
      quantity: snap.qty,
    });
    setToast({
      message: `已建立詢價單 ${rfq.rfqNumber},可至「同行調貨」處理`,
      type: 'success',
    });
  };

  // Phase 2:歷史提醒的「查看詳情」跳對應單據
  const handleViewHistory = (history: HistoryRecord) => {
    if (history.type === 'rfq' && history.refId) {
      router.push(`/dashboard/sale/inquiry/${history.refId}`);
    } else if (history.type === 'qt' && history.refId) {
      router.push(`/dashboard/sale/docs/quote/${history.refId}`);
    } else {
      // type=quote 的歷史紀錄是 mock,沒有可跳頁面,就顯示提示
      setToast({ message: `歷史報價 ${history.docNumber},暫無詳情頁`, type: 'info' });
    }
  };

  // R7 Phase 7-1 選項 B:轉客戶訂單 → 建 Customer Order（預訂單）
  const handleSelectCustomerOrder = () => {
    const snap = oosDialog;
    setOosDialog(null);
    if (!snap || !customer) return;
    const order = createCustomerOrder({
      customer: { code: customer.code, name: customer.name, tier: customer.tier },
      part: { sku: snap.part.sku, name: snap.part.name },
      quantity: snap.qty,
    });
    setToast({
      message: `已建立客戶訂單 ${order.orderNumber},下次進貨時系統會提醒`,
      type: 'success',
    });
  };

  return (
    <StepWrapper
      canProceed={totalItemsInQuote > 0}
      onBack={onBack}
      onNext={onNext}
      nextLabel={
        totalItemsInQuote > 0 ? `下一步 → 報價清單（${totalItemsInQuote} 項）` : '下一步'
      }
      disabledHint={totalItemsInQuote > 0 ? undefined : '請先加入至少一項料號'}
    >
      {/* 已選客戶摘要（穩重版） */}
      {customer ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-white/40">{customer.code}</span>
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
            'h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm',
            'text-white placeholder:text-white/35',
            'transition-colors focus:border-[#E8A020]/60 focus:outline-none',
          )}
          aria-label="料號搜尋"
        />
      </label>

      {/* 掃描/語音（視覺 mock） */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {}}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 transition-colors hover:border-white/20"
        >
          <BarcodeIcon className="h-3.5 w-3.5" aria-hidden />
          掃描條碼
        </button>
        <button
          type="button"
          onClick={() => {}}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 transition-colors hover:border-white/20"
        >
          <Mic className="h-3.5 w-3.5" aria-hidden />
          語音輸入
        </button>
      </div>

      {/* 常用關鍵字 chips */}
      {!keyword ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-white/45">常用搜尋：</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_KEYWORDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKeyword(k)}
                className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70 transition-colors hover:border-[#E8A020]/60 hover:text-[#E8A020]"
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-white/35">
            目前共 {MOCK_PARTS.length} 個料號
            <br />
            輸入關鍵字開始查詢
          </p>
        </div>
      ) : null}

      {/* 搜尋結果 */}
      {keyword && results.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
          沒有找到符合「{keyword}」的料號
        </div>
      ) : null}

      {keyword && results.length > 0 ? (
        <section className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm text-white/70">
              搜尋「{keyword}」· 找到 {results.length} 項
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10">
            {results.map((p, idx) => {
              const isExpanded = expandedSku === p.sku;
              const existing = itemBySku.get(p.sku) ?? null;
              return (
                <div key={p.sku}>
                  {idx > 0 ? <div className="h-px bg-white/10" /> : null}
                  <PartRow
                    part={p}
                    tier={tier}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedSku(isExpanded ? null : p.sku)}
                  />
                  {isExpanded ? (
                    <PartDetailExpanded
                      part={p}
                      tier={tier}
                      customerCode={customer?.code ?? null}
                      existingItem={existing}
                      onAdd={handleAdd}
                      onUpdate={(partial) => handleUpdate(p.sku, partial)}
                      onRemove={() => handleRemove(p.sku)}
                      onZoom={() => setLightboxPart(p)}
                      onInquire={(qty) => setOosDialog({ part: p, qty })}
                      onViewHistory={handleViewHistory}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Lightbox */}
      <ImageLightbox
        imageUrl={lightboxPart?.imageUrl ?? null}
        alt={lightboxPart?.name}
        onClose={() => setLightboxPart(null)}
      />

      {/* R7 Phase 7-1:全公司無庫存分流彈窗（A=同行調貨 / B=客戶訂單） */}
      {oosDialog ? (
        <OutOfStockDialog
          part={{ sku: oosDialog.part.sku, name: oosDialog.part.name }}
          onInquiry={handleSelectInquiry}
          onCustomerOrder={handleSelectCustomerOrder}
          onCancel={() => setOosDialog(null)}
        />
      ) : null}

      {/* Phase 3 追加品項:加入清單後彈「還要查嗎?」 */}
      {addMorePart ? (
        <AddMoreDialog
          justAddedPartName={addMorePart.name}
          onAddMore={() => {
            // 清空搜尋讓業務重新輸入下一個料號,並關閉 dialog
            setAddMorePart(null);
            setKeyword('');
          }}
          onFinish={() => {
            setAddMorePart(null);
            onNext();
          }}
        />
      ) : null}

      {/* Toast(選項 A/B 後、歷史提醒跳頁失敗時顯示) */}
      {toast ? (
        <FloatingToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
    </StepWrapper>
  );
}
