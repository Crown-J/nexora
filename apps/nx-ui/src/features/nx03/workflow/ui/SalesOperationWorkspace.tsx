/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesOperationWorkspace.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 實際銷貨操作：關鍵字搜尋零件族，於族內切換通用件檢視庫存／進貨／報價／成交（mock）
 *
 * Notes:
 * - 資料來自 `searchPartFamilies`；不呼叫 API
 */

'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cx } from '@/shared/lib/cx';
import {
  searchPartFamilies,
  type PartFamilyGroup,
  type PartVariantSnapshot,
} from '@/features/nx03/workflow/mock/operation.mock';

type ResultTab = 'stock' | 'history' | 'pricing';

const RESULT_TABS: Array<{ id: ResultTab; label: string; description: string }> = [
  { id: 'stock', label: '庫存', description: '先確認各倉可用量' },
  { id: 'history', label: '報價與成交', description: '歷史報價與成交價' },
  { id: 'pricing', label: '成本與建議報價', description: '成本分析與建議區間' },
];

const RESULT_TAB_ORDER: ResultTab[] = ['stock', 'history', 'pricing'];

/**
 * @FUNCTION_CODE NX03-WKFL-UI-005-F01
 * 切換零件族時，預設選取該族第一筆料號。
 */
function pickDefaultVariantId(family: PartFamilyGroup): string {
  return family.variants[0]!.id;
}

/**
 * @FUNCTION_CODE NX03-WKFL-UI-005-F03
 * 循環切換搜尋結果分頁（庫存／報價／成本）。
 */
function cycleResultTab(current: ResultTab, delta: number): ResultTab {
  const i = RESULT_TAB_ORDER.indexOf(current);
  const n = RESULT_TAB_ORDER.length;
  const j = (((i + delta) % n) + n) % n;
  return RESULT_TAB_ORDER[j]!;
}

export type SalesOperationWorkspaceProps = {
  /** 由父層 F2 觸發聚焦料號搜尋框 */
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchInputId?: string;
};

/**
 * @FUNCTION_CODE NX03-WKFL-UI-005-F02
 * 實際銷貨操作主畫面：關鍵字搜尋、多族結果、族內料號切換與明細表。
 */
export function SalesOperationWorkspace({
  searchInputRef,
  searchInputId = 'nx03-part-search-input',
}: SalesOperationWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [families, setFamilies] = useState<PartFamilyGroup[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('stock');

  const activeFamily = useMemo(
    () => families.find((f) => f.id === familyId) ?? null,
    [families, familyId]
  );

  const activeVariant = useMemo((): PartVariantSnapshot | null => {
    if (!activeFamily || !variantId) return null;
    return activeFamily.variants.find((v) => v.id === variantId) ?? null;
  }, [activeFamily, variantId]);

  useEffect(() => {
    setResultTab('stock');
  }, [variantId]);

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setHasSearched(true);
    const next = searchPartFamilies(q);
    setFamilies(next);
    if (next.length === 0) {
      setFamilyId(null);
      setVariantId(null);
      return;
    }
    const first = next[0]!;
    setFamilyId(first.id);
    setVariantId(pickDefaultVariantId(first));
  }, [query]);

  const selectFamily = useCallback((fam: PartFamilyGroup) => {
    setFamilyId(fam.id);
    setVariantId(pickDefaultVariantId(fam));
  }, []);

  const data = activeVariant;

  /**
   * @FUNCTION_CODE NX03-WKFL-UI-005-F04
   * 有搜尋結果時：←→ 切換通用件（多筆）或分頁（單筆）；↑↓ 切換分頁；Shift+↑↓ 切換零件線（多組）。
   */
  useEffect(() => {
    if (!activeFamily || !data) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (e.shiftKey) {
          if (families.length > 1) {
            e.preventDefault();
            const fi = families.findIndex((f) => f.id === familyId);
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            const nf = (fi + delta + families.length) % families.length;
            selectFamily(families[nf]!);
          }
          return;
        }
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'TEXTAREA') return;
        if (target?.tagName === 'SELECT') return;
        if (target?.tagName === 'INPUT' && target.id !== searchInputId) return;
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        setResultTab((prev) => cycleResultTab(prev, delta));
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'TEXTAREA') return;
        if (target?.tagName === 'INPUT' && target.id === searchInputId) return;
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        if (activeFamily.variants.length > 1) {
          const order = activeFamily.variants;
          const i = order.findIndex((v) => v.id === variantId);
          const ni = (i + delta + order.length) % order.length;
          setVariantId(order[ni]!.id);
        } else {
          setResultTab((prev) => cycleResultTab(prev, delta));
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    activeFamily,
    data,
    families,
    familyId,
    variantId,
    searchInputId,
    selectFamily,
  ]);

  return (
    <div className="space-y-6">
      <div
        className={cx(
          'rounded-2xl border border-border/80 bg-card/45 p-4 shadow-sm sm:p-6',
          'backdrop-blur-sm'
        )}
      >
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES / 實際操作</p>
        <p className="mt-1 text-sm text-muted-foreground">
          支援<strong className="font-medium text-foreground">料號、品名或關鍵字</strong>
          （可輸入片段，例如 <span className="font-mono text-xs">06H</span>、水泵、Bosch）。找到零件族後，於下方
          <strong className="font-medium text-foreground">切換通用件</strong>，檢視各料號的庫存、進貨、報價與成交。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">
          快捷鍵：<span className="font-mono text-amber-200/90">F2</span> 聚焦搜尋｜
          <span className="font-mono text-amber-200/90">Enter</span> 查詢｜有結果時{' '}
          <span className="font-mono text-amber-200/90">↑↓</span> 切換庫存／報價／成本分頁｜
          <span className="font-mono text-amber-200/90">←→</span> 切換通用件（多筆時）或分頁（單筆時）｜
          多組零件線時 <span className="font-mono text-amber-200/90">Shift+↑↓</span> 切換產品線。
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id={searchInputId}
              ref={(el) => {
                if (searchInputRef) searchInputRef.current = el;
              }}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="料號、品名或關鍵字…"
              className={cx(
                'w-full rounded-xl border border-border/70 bg-background/80 py-2.5 pl-10 pr-4 text-sm',
                'placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
              aria-label="零件關鍵字搜尋"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            className={cx(
              'inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium',
              'border border-amber-500/35 bg-amber-500/15 text-amber-50',
              'transition-colors hover:border-amber-400/50 hover:bg-amber-500/22'
            )}
          >
            查詢
          </button>
        </div>
      </div>

      {!hasSearched ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
          請輸入關鍵字並查詢。可搜尋料號片段、中文品名或廠牌代碼。
        </p>
      ) : families.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 px-4 py-10 text-center text-sm text-muted-foreground">
          找不到符合的零件資料（mock）。請試試其他關鍵字，例如 <span className="font-mono">水泵</span>、
          <span className="font-mono">06H</span>、<span className="font-mono">煞車</span>、
          <span className="font-mono">Bosch</span>。
        </p>
      ) : (
        <div className="space-y-4">
          {families.length > 1 ? (
            <section
              className={cx(
                'rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5',
                'backdrop-blur-sm'
              )}
            >
              <h2 className="text-sm font-semibold text-foreground">搜尋結果（{families.length} 組零件線）</h2>
              <p className="mt-1 text-xs text-muted-foreground">請選擇一組，以檢視旗下各通用件明細。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {families.map((fam) => (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => selectFamily(fam)}
                    className={cx(
                      'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                      familyId === fam.id
                        ? 'border-amber-500/50 bg-amber-500/15 text-amber-50'
                        : 'border-border/60 bg-background/30 text-foreground hover:bg-muted/25'
                    )}
                  >
                    <span className="font-medium">{fam.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({fam.variants.length} 筆料號)</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeFamily && data ? (
            <>
              <section
                className={cx(
                  'rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5',
                  'backdrop-blur-sm'
                )}
              >
                <h2 className="text-sm font-semibold text-foreground">{activeFamily.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  點選下方<strong className="text-foreground">通用件／對應料號</strong>
                  後，以<strong className="text-foreground">庫存 → 報價與成交 → 成本與建議報價</strong>
                  三個分頁檢視（預設先看庫存）。
                </p>
                <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="通用件切換">
                  {activeFamily.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      role="tab"
                      aria-selected={variantId === v.id}
                      onClick={() => setVariantId(v.id)}
                      className={cx(
                        'max-w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                        variantId === v.id
                          ? 'border-amber-500/55 bg-amber-500/18 text-amber-50 shadow-sm'
                          : 'border-border/60 bg-background/30 text-foreground hover:bg-muted/25'
                      )}
                    >
                      <div className="font-mono text-xs font-medium tracking-tight">{v.partNo}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{v.roleLabel}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section
                className={cx(
                  'rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5',
                  'backdrop-blur-sm'
                )}
              >
                <h2 className="text-sm font-semibold text-foreground">目前檢視料號</h2>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted-foreground">料號：</span>
                    <span className="font-mono font-medium">{data.partNo}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">品名：</span>
                    {data.partName}
                  </span>
                  <span>
                    <span className="text-muted-foreground">類型：</span>
                    {data.roleLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.brands.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </section>

              <section
                className={cx(
                  'rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5',
                  'backdrop-blur-sm'
                )}
                aria-label="搜尋結果分頁"
              >
                <div className="flex flex-col gap-1 border-b border-border/50 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-sm font-semibold text-foreground">搜尋結果</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {RESULT_TABS.find((t) => t.id === resultTab)?.description}
                  </p>
                </div>

                <div
                  className="mt-4 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="結果分類"
                >
                  {RESULT_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={resultTab === t.id}
                      onClick={() => setResultTab(t.id)}
                      className={cx(
                        'shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        resultTab === t.id
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-50'
                          : 'border-transparent bg-muted/25 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      <span className="font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-5" role="tabpanel">
                  {resultTab === 'stock' ? (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        各倉庫存
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm">
                        {data.stockByWarehouse.map((w) => (
                          <li
                            key={w.warehouse}
                            className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
                          >
                            <span className="text-foreground">{w.warehouse}</span>
                            <span className="tabular-nums text-muted-foreground">
                              可用 <span className="font-medium text-foreground">{w.qty}</span>｜安全{' '}
                              {w.safety}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {resultTab === 'history' ? (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">對客戶報價紀錄</h3>
                        <div className="mt-4 grid gap-6 lg:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-amber-600/90 dark:text-amber-300/90">
                              本客戶
                            </h4>
                            {data.quotesThisCustomer.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">無紀錄</p>
                            ) : (
                              <table className="mt-2 w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                                    <th className="py-1.5 pr-2 font-medium">報價單號</th>
                                    <th className="py-1.5 pr-2 font-medium">客戶</th>
                                    <th className="py-1.5 pr-2 font-medium">單價</th>
                                    <th className="py-1.5 font-medium">日期</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.quotesThisCustomer.map((r) => (
                                    <tr key={r.quoteNo} className="border-b border-border/40 last:border-0">
                                      <td className="py-2 font-mono text-xs">{r.quoteNo}</td>
                                      <td className="py-2">{r.customerName}</td>
                                      <td className="py-2 tabular-nums">{r.unitPrice}</td>
                                      <td className="py-2 tabular-nums text-muted-foreground">{r.date}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              其他客戶
                            </h4>
                            {data.quotesOtherCustomers.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">無紀錄</p>
                            ) : (
                              <table className="mt-2 w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                                    <th className="py-1.5 pr-2 font-medium">報價單號</th>
                                    <th className="py-1.5 pr-2 font-medium">客戶</th>
                                    <th className="py-1.5 pr-2 font-medium">單價</th>
                                    <th className="py-1.5 font-medium">日期</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.quotesOtherCustomers.map((r) => (
                                    <tr key={r.quoteNo} className="border-b border-border/40 last:border-0">
                                      <td className="py-2 font-mono text-xs">{r.quoteNo}</td>
                                      <td className="py-2">{r.customerName}</td>
                                      <td className="py-2 tabular-nums">{r.unitPrice}</td>
                                      <td className="py-2 tabular-nums text-muted-foreground">{r.date}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">客戶成交紀錄</h3>
                        <div className="mt-4 grid gap-6 lg:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-amber-600/90 dark:text-amber-300/90">
                              本客戶
                            </h4>
                            {data.dealsThisCustomer.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">無紀錄</p>
                            ) : (
                              <table className="mt-2 w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                                    <th className="py-1.5 pr-2 font-medium">單據號</th>
                                    <th className="py-1.5 pr-2 font-medium">客戶</th>
                                    <th className="py-1.5 pr-2 font-medium">金額</th>
                                    <th className="py-1.5 font-medium">日期</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.dealsThisCustomer.map((r) => (
                                    <tr key={r.docNo} className="border-b border-border/40 last:border-0">
                                      <td className="py-2 font-mono text-xs">{r.docNo}</td>
                                      <td className="py-2">{r.customerName}</td>
                                      <td className="py-2 tabular-nums">{r.amount}</td>
                                      <td className="py-2 tabular-nums text-muted-foreground">{r.date}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              其他客戶
                            </h4>
                            {data.dealsOtherCustomers.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">無紀錄</p>
                            ) : (
                              <table className="mt-2 w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                                    <th className="py-1.5 pr-2 font-medium">單據號</th>
                                    <th className="py-1.5 pr-2 font-medium">客戶</th>
                                    <th className="py-1.5 pr-2 font-medium">金額</th>
                                    <th className="py-1.5 font-medium">日期</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.dealsOtherCustomers.map((r) => (
                                    <tr key={r.docNo} className="border-b border-border/40 last:border-0">
                                      <td className="py-2 font-mono text-xs">{r.docNo}</td>
                                      <td className="py-2">{r.customerName}</td>
                                      <td className="py-2 tabular-nums">{r.amount}</td>
                                      <td className="py-2 tabular-nums text-muted-foreground">{r.date}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {resultTab === 'pricing' ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          進貨與成本基礎
                        </h3>
                        <dl className="mt-3 grid gap-3 rounded-lg border border-border/50 bg-background/25 p-4 text-sm sm:grid-cols-2">
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">上次進貨價格</dt>
                            <dd className="font-medium tabular-nums text-foreground">
                              {data.lastPurchasePrice}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">成本價格</dt>
                            <dd className="font-medium tabular-nums text-foreground">{data.costPrice}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">建議報價參考</h3>
                        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/8 p-4">
                          <dl className="space-y-3 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">建議對客單價（參考）</dt>
                              <dd className="mt-1 text-lg font-semibold tabular-nums text-amber-100">
                                {data.pricingAssist.suggestedQuote}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">參考區間</dt>
                              <dd className="mt-1 text-foreground">{data.pricingAssist.quoteRange}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">毛利／加成說明</dt>
                              <dd className="mt-1 leading-relaxed text-foreground">
                                {data.pricingAssist.marginHint}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          成本與進價分析
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-foreground">
                          {data.pricingAssist.purchaseVsCostNote}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
