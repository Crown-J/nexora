/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesOperationWorkspace.tsx
 *
 * Purpose:
 * - 銷貨即時報價工作台：四滿版垂直區塊 + scrollIntoView + 快捷鍵（mock）
 * - 規格：docs/flows/10-sales-quote-workbench-ui.md
 */

'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cx } from '@/shared/lib/cx';
import {
  searchPartFamilies,
  type PartFamilyGroup,
  type PartVariantSnapshot,
} from '@/features/nx03/workflow/mock/operation.mock';
import {
  buildWorkbenchDerived,
  findMockCustomerByCode,
  parseTwdToNumber,
  WB_LOGIN_WAREHOUSE,
  WB_MOCK_CUSTOMERS,
  WB_STAFF_LABEL,
  type WorkbenchComparisonRow,
  type WorkbenchDerived,
} from '@/features/nx03/workflow/mock/workbench.mock';

const BLOCK_IDS = ['nx03-wb-block-1', 'nx03-wb-block-2', 'nx03-wb-block-3', 'nx03-wb-block-4'] as const;

function scrollToBlock(n: 1 | 2 | 3 | 4) {
  const el = document.getElementById(BLOCK_IDS[n - 1]);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pickDefaultVariantId(family: PartFamilyGroup): string {
  return family.variants[0]!.id;
}

function formatTwd(n: number): string {
  if (!n) return '—';
  return `NT$ ${n.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`;
}

/** 第二區右側：倉別／儲位一律展開（不收合） */
function Block2WarehousePanel({ wb }: { wb: WorkbenchDerived }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-200/90">本倉可出</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-50">{wb.localAvailable}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{WB_LOGIN_WAREHOUSE}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/25 p-4">
          <p className="text-[11px] text-muted-foreground">本倉總量</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{wb.localTotal}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/25 p-4">
          <p className="text-[11px] text-muted-foreground">庫存總量</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{wb.totalInventory}</p>
        </div>
      </div>

      {wb.localAvailable === 0 ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          本倉可出為 0，請參考下方各倉分布。
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">倉別摘要</h4>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/20 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">倉編號</th>
                <th className="px-3 py-2 font-medium">倉別</th>
                <th className="px-3 py-2 font-medium text-right">數量</th>
                <th className="px-3 py-2 font-medium text-right">可出</th>
              </tr>
            </thead>
            <tbody>
              {wb.rollup.map((r) => (
                <tr key={r.code} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">儲位明細</h4>
        <div className="space-y-3">
          {wb.binsByWarehouse.map((bw) => (
            <div key={bw.warehouse} className="rounded-xl border border-border/50 bg-background/20 p-3">
              <p className="text-sm font-medium">{bw.warehouse}</p>
              <table className="mt-2 w-full text-left text-sm">
                <thead className="text-[11px] text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">儲位</th>
                    <th className="py-1 font-medium">名稱</th>
                    <th className="py-1 font-medium text-right">數量</th>
                  </tr>
                </thead>
                <tbody>
                  {bw.bins.map((b) => (
                    <tr key={b.id} className="border-t border-border/30">
                      <td className="py-1.5 font-mono text-xs">{b.id}</td>
                      <td className="py-1.5">{b.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{b.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type SalesOperationWorkspaceProps = {
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchInputId?: string;
  /** 父層 F2 遞增時捲動至第一區 */
  searchFocusNonce?: number;
};

/**
 * @FUNCTION_CODE NX03-WKFL-UI-005-F02
 * 四區塊銷貨工作台（mock）。
 */
export function SalesOperationWorkspace({
  searchInputRef,
  searchInputId = 'nx03-part-search-input',
  searchFocusNonce = 0,
}: SalesOperationWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [families, setFamilies] = useState<PartFamilyGroup[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  const [filterSales, setFilterSales] = useState(true);
  const [filterQuote, setFilterQuote] = useState(true);

  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appliedCustomerCode, setAppliedCustomerCode] = useState<string | null>(null);

  const [histFocusIdx, setHistFocusIdx] = useState(0);

  const [quoteQty, setQuoteQty] = useState('1');
  const [quoteUnitPrice, setQuoteUnitPrice] = useState('');
  const [quoteCustomerCode, setQuoteCustomerCode] = useState('');
  const [quoteCustomerName, setQuoteCustomerName] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** 搜尋成功或下拉選料後，將焦點移到第二區對應零件列 */
  const [pendingListFocus, setPendingListFocus] = useState<{ variantId: string } | null>(null);
  /** Alt+A 後依客戶／單價是否為空，將焦點放到第四區對應欄位 */
  const [focusBlock4Nonce, setFocusBlock4Nonce] = useState(0);

  const customerSearchRef = useRef<HTMLInputElement>(null);
  const historyGridRef = useRef<HTMLDivElement>(null);
  const block2ListFocusRef = useRef<HTMLButtonElement>(null);
  const quoteCustomerCodeRef = useRef<HTMLInputElement>(null);
  const quotePriceRef = useRef<HTMLInputElement>(null);
  const quoteQtyRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const variantBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeFamily = useMemo(
    () => families.find((f) => f.id === familyId) ?? null,
    [families, familyId]
  );

  const activeVariant = useMemo((): PartVariantSnapshot | null => {
    if (!activeFamily || !variantId) return null;
    return activeFamily.variants.find((v) => v.id === variantId) ?? null;
  }, [activeFamily, variantId]);

  const wb: WorkbenchDerived | null = useMemo(() => {
    if (!activeVariant) return null;
    return buildWorkbenchDerived(activeVariant);
  }, [activeVariant]);

  const filteredHistory = useMemo((): WorkbenchComparisonRow[] => {
    if (!wb) return [];
    let rows = wb.comparisonRows.filter((r) => {
      if (r.category === '銷貨' && !filterSales) return false;
      if (r.category === '報價' && !filterQuote) return false;
      return true;
    });
    if (appliedCustomerCode && appliedCustomerCode.length > 0) {
      const code = appliedCustomerCode.toUpperCase();
      const cust = findMockCustomerByCode(code);
      rows = rows.filter(
        (r) =>
          r.customerId.replace(/—/g, '').toUpperCase() === code ||
          (cust && r.customerName === cust.name)
      );
    }
    return rows;
  }, [wb, filterSales, filterQuote, appliedCustomerCode]);

  const histDisplayIdx = useMemo(() => {
    if (filteredHistory.length === 0) return 0;
    return Math.min(Math.max(0, histFocusIdx), filteredHistory.length - 1);
  }, [histFocusIdx, filteredHistory.length]);

  const syncQuoteFromBlock3 = useCallback(() => {
    const code = customerCode.trim().toUpperCase();
    setQuoteCustomerCode(code);
    const found = findMockCustomerByCode(code);
    setQuoteCustomerName((found?.name ?? customerName).trim());
    const row = filteredHistory[histDisplayIdx] ?? null;
    if (row) {
      const n = parseTwdToNumber(row.unitPrice);
      if (n) setQuoteUnitPrice(String(Math.round(n)));
    }
  }, [customerCode, customerName, filteredHistory, histDisplayIdx]);

  useEffect(() => {
    if (searchFocusNonce === 0) return;
    const t = requestAnimationFrame(() => {
      scrollToBlock(1);
    });
    return () => cancelAnimationFrame(t);
  }, [searchFocusNonce]);

  useEffect(() => {
    if (!pendingListFocus) return;
    if (variantId !== pendingListFocus.variantId) return;
    const fam = families.find((f) => f.id === familyId);
    if (!fam) return;
    const idx = fam.variants.findIndex((v) => v.id === variantId);
    if (idx < 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        variantBtnRefs.current[idx]?.focus();
        setPendingListFocus(null);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pendingListFocus, variantId, familyId, families]);

  useLayoutEffect(() => {
    if (focusBlock4Nonce === 0) return;
    const custEmpty = !quoteCustomerCode.trim();
    const priceEmpty = !quoteUnitPrice.trim();
    if (custEmpty) {
      quoteCustomerCodeRef.current?.focus();
    } else if (priceEmpty) {
      quotePriceRef.current?.focus();
    } else {
      quoteQtyRef.current?.focus();
    }
    // 僅在 Alt+A（nonce 變更）時對焦，避免輸入客戶／單價時重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 刻意只依 nonce
  }, [focusBlock4Nonce]);

  const shortcutTargetOk = useCallback((t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    if (!el) return true;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return false;
    if (tag === 'INPUT') {
      const type = (el as HTMLInputElement).type;
      if (type === 'text' || type === 'search' || type === 'number') return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmOpen(false);
        }
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (!shortcutTargetOk(e.target)) return;
        e.preventDefault();
        setCheatOpen(true);
        return;
      }

      if (!e.altKey) return;

      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        scrollToBlock(2);
        requestAnimationFrame(() => block2ListFocusRef.current?.focus());
        return;
      }
      if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        scrollToBlock(3);
        requestAnimationFrame(() => customerSearchRef.current?.focus());
        return;
      }
      if (e.key.toLowerCase() === 'a' || e.code === 'KeyA') {
        e.preventDefault();
        scrollToBlock(4);
        syncQuoteFromBlock3();
        setFocusBlock4Nonce((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, shortcutTargetOk, syncQuoteFromBlock3]);

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setHasSearched(true);
    const next = searchPartFamilies(q);
    setFamilies(next);
    if (next.length === 0) {
      setFamilyId(null);
      setVariantId(null);
      setPendingListFocus(null);
      return;
    }
    const first = next[0]!;
    const vid = pickDefaultVariantId(first);
    setFamilyId(first.id);
    setVariantId(vid);
    setPendingListFocus({ variantId: vid });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBlock(2));
    });
  }, [query]);

  const applyPartPick = useCallback((value: string) => {
    const sep = value.indexOf(':');
    if (sep < 0) return;
    const fid = value.slice(0, sep);
    const vid = value.slice(sep + 1);
    setFamilyId(fid);
    setVariantId(vid);
    setPendingListFocus({ variantId: vid });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBlock(2));
    });
  }, []);

  const selectFamily = useCallback((fam: PartFamilyGroup) => {
    const vid = pickDefaultVariantId(fam);
    setFamilyId(fam.id);
    setVariantId(vid);
    setPendingListFocus({ variantId: vid });
  }, []);

  const partPickValue = familyId && variantId ? `${familyId}:${variantId}` : '';

  const onCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const found = findMockCustomerByCode(customerCode);
    if (found) setCustomerName(found.name);
    setAppliedCustomerCode(customerCode.trim() || null);
    setHistFocusIdx(0);
    requestAnimationFrame(() => historyGridRef.current?.focus());
  };

  const onHistKeyDown = (e: React.KeyboardEvent) => {
    if (filteredHistory.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistFocusIdx((i) => Math.min(filteredHistory.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistFocusIdx((i) => Math.max(0, i - 1));
    }
  };

  const openConfirm = useCallback(() => {
    const qty = Number(quoteQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setToast('請輸入有效數量');
      window.setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!quoteCustomerCode.trim()) {
      setToast('請輸入客戶編號');
      window.setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!quoteUnitPrice.trim()) {
      setToast('請輸入單價');
      window.setTimeout(() => setToast(null), 3000);
      return;
    }
    setConfirmOpen(true);
    requestAnimationFrame(() => confirmBtnRef.current?.focus());
  }, [quoteQty, quoteCustomerCode, quoteUnitPrice]);

  const finalizeQuote = useCallback(() => {
    setConfirmOpen(false);
    setToast(
      `（mock）建檔成功：客戶 ${quoteCustomerName || quoteCustomerCode}｜料號 ${activeVariant?.partNo ?? '—'}｜數量 ${quoteQty}｜單價 ${quoteUnitPrice}`
    );
    window.setTimeout(() => setToast(null), 5000);
  }, [quoteCustomerCode, quoteCustomerName, quoteQty, quoteUnitPrice, activeVariant?.partNo]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onDocKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && document.activeElement === confirmBtnRef.current) {
        ev.preventDefault();
        finalizeQuote();
      }
    };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [confirmOpen, finalizeQuote]);

  const blockClass = cx(
    'scroll-mt-4 rounded-2xl border border-border/80 bg-card/40 p-5 shadow-sm backdrop-blur-sm',
    'min-h-[min(70vh,720px)] flex flex-col'
  );

  return (
    <div className="space-y-6 pb-24">
      {toast ? (
        <div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {/* 第一區：搜尋 */}
      <section
        id="nx03-wb-block-1"
        className={blockClass}
        aria-labelledby="nx03-wb-h1"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h2 id="nx03-wb-h1" className="text-lg font-semibold tracking-tight">
              ① 搜尋料號
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">F2</kbd> 捲到此區並聚焦｜Enter
              查詢；有結果自動捲至庫存區
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{WB_STAFF_LABEL}</div>
            <div>
              本倉：<span className="text-foreground">{WB_LOGIN_WAREHOUSE}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-2 min-w-0 flex-1">
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
              'w-full rounded-xl border border-border/70 bg-background/80 py-3 pl-10 pr-4 text-base',
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
            'mt-4 inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-medium',
            'border border-amber-500/35 bg-amber-500/15 text-amber-50 hover:bg-amber-500/22'
          )}
        >
          查詢
        </button>

        {hasSearched && families.length > 0 ? (
          <div className="mt-6">
            <label htmlFor="nx03-wb-part-pick" className="text-sm font-medium text-foreground">
              快速選擇料號
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              搜尋結果內可切換料號；選取後會捲至庫存區並聚焦該列。
            </p>
            <select
              id="nx03-wb-part-pick"
              value={partPickValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v) applyPartPick(v);
              }}
              className={cx(
                'mt-2 w-full max-w-xl rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
            >
              <option value="">— 請選擇料號 —</option>
              {families.map((fam) => (
                <optgroup key={fam.id} label={fam.title}>
                  {fam.variants.map((v) => (
                    <option key={v.id} value={`${fam.id}:${v.id}`}>
                      {v.partNo} — {v.partName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : null}

        {!hasSearched ? (
          <p className="mt-6 text-sm text-muted-foreground">輸入關鍵字後按 Enter 或查詢。試：水泵、06H、煞車、Bosch。</p>
        ) : families.length === 0 ? (
          <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            沒有此料號（mock：找不到符合的零件資料）。
          </p>
        ) : null}
      </section>

      {/* 第二區：庫存 */}
      <section id="nx03-wb-block-2" className={blockClass} aria-labelledby="nx03-wb-h2">
        <h2 id="nx03-wb-h2" className="text-lg font-semibold tracking-tight">
          ② 庫存
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+1</kbd> 捲到此區｜左側 ↑↓
          選通用件，右側為各倉數量
        </p>

        {!hasSearched || families.length === 0 ? (
          <p className="mt-8 flex-1 text-sm text-muted-foreground">請先於第一區完成搜尋。</p>
        ) : (
          <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <div>
              <h3 className="text-sm font-medium text-foreground">可通用料號</h3>
              {families.length > 1 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {families.map((fam) => (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => selectFamily(fam)}
                      className={cx(
                        'rounded-lg border px-3 py-2 text-left text-sm',
                        familyId === fam.id
                          ? 'border-amber-500/50 bg-amber-500/15'
                          : 'border-border/60 hover:bg-muted/20'
                      )}
                    >
                      {fam.title}
                    </button>
                  ))}
                </div>
              ) : null}
              <div
                className="mt-4 overflow-hidden rounded-xl border border-border/50"
                role="listbox"
                aria-label="通用件列表"
              >
                {activeFamily?.variants.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={variantId === v.id}
                    ref={(el) => {
                      variantBtnRefs.current[idx] = el;
                      if (idx === 0) block2ListFocusRef.current = el;
                    }}
                    onClick={() => setVariantId(v.id)}
                    onKeyDown={(e) => {
                      if (!activeFamily) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const ni = Math.min(activeFamily.variants.length - 1, idx + 1);
                        setVariantId(activeFamily.variants[ni]!.id);
                        variantBtnRefs.current[ni]?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const ni = Math.max(0, idx - 1);
                        setVariantId(activeFamily.variants[ni]!.id);
                        variantBtnRefs.current[ni]?.focus();
                      }
                    }}
                    className={cx(
                      'flex w-full flex-col border-b border-border/40 px-3 py-3 text-left text-sm last:border-0',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50',
                      variantId === v.id ? 'bg-amber-500/15' : 'hover:bg-muted/15'
                    )}
                  >
                    <span className="font-mono text-xs font-medium">{v.partNo}</span>
                    <span>{v.partName}</span>
                    <span className="text-xs text-muted-foreground">{v.roleLabel}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">各倉數量</h3>
              {wb ? (
                <div className="mt-4">
                  <Block2WarehousePanel key={variantId} wb={wb} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">選擇左側料號以顯示庫存。</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 第三區：價格 */}
      <section id="nx03-wb-block-3" className={blockClass} aria-labelledby="nx03-wb-h3">
        <h2 id="nx03-wb-h3" className="text-lg font-semibold tracking-tight">
          ③ 價格與紀錄
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+2</kbd> 聚焦客戶框｜Enter
          篩選並移至下方紀錄；<kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+A</kbd>{' '}
          至報價區
        </p>

        {!wb ? (
          <p className="mt-8 flex-1 text-sm text-muted-foreground">請先完成搜尋並選擇料號。</p>
        ) : (
          <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">A～D 價參考</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                  <p className="text-[11px] text-muted-foreground">A 價</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatTwd(wb.priceList.a)}</p>
                </div>
                <div className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                  <p className="text-[11px] text-muted-foreground">B 價</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatTwd(wb.priceList.b)}</p>
                </div>
                <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-3">
                  <p className="text-[11px] text-muted-foreground">C 價</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatTwd(wb.priceList.c)}</p>
                </div>
                <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-3">
                  <p className="text-[11px] text-muted-foreground">D 價</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatTwd(wb.priceList.d)}</p>
                </div>
                <div className="col-span-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
                  <p className="text-[11px] text-muted-foreground">最近進價／平均進價</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatTwd(wb.priceList.lastPurchase)} ／ {formatTwd(wb.priceList.avgPurchase)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4">
              <div>
                <label htmlFor="nx03-wb-cust-search" className="text-sm font-medium">
                  客戶編號
                </label>
                <input
                  id="nx03-wb-cust-search"
                  ref={customerSearchRef}
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                  onBlur={() => {
                    const found = findMockCustomerByCode(customerCode);
                    if (found) setCustomerName(found.name);
                  }}
                  onKeyDown={onCustomerSearchKeyDown}
                  list="nx03-wb-cust-dl"
                  placeholder="輸入後 Enter 篩選紀錄"
                  className={cx(
                    'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 font-mono text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
                  )}
                  autoComplete="off"
                />
                <datalist id="nx03-wb-cust-dl">
                  {WB_MOCK_CUSTOMERS.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-muted-foreground">{customerName || '（名稱於 blur／Enter 帶入）'}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterSales}
                    onChange={(e) => {
                      setHistFocusIdx(0);
                      setFilterSales(e.target.checked);
                    }}
                    className="accent-amber-500"
                  />
                  銷貨
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterQuote}
                    onChange={(e) => {
                      setHistFocusIdx(0);
                      setFilterQuote(e.target.checked);
                    }}
                    className="accent-amber-500"
                  />
                  報價
                </label>
              </div>

              <div
                ref={historyGridRef}
                tabIndex={0}
                role="grid"
                aria-label="報價與銷貨紀錄"
                onKeyDown={onHistKeyDown}
                className="min-h-[200px] flex-1 overflow-auto rounded-xl border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
              >
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-border/50 bg-muted/95 text-[11px] text-muted-foreground backdrop-blur-sm">
                    <tr>
                      <th className="px-2 py-2 font-medium">單號</th>
                      <th className="px-2 py-2 font-medium">類別</th>
                      <th className="px-2 py-2 font-medium">日期</th>
                      <th className="px-2 py-2 font-medium">客戶</th>
                      <th className="px-2 py-2 font-medium text-right">單價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                          {appliedCustomerCode ? '此客戶無符合紀錄' : '請輸入客戶編號後 Enter 篩選，或檢視全部'}
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((r, i) => (
                        <tr
                          key={`${r.docNo}-${i}`}
                          className={cx(
                            'cursor-pointer border-b border-border/30',
                            i === histDisplayIdx ? 'bg-amber-500/20' : 'hover:bg-muted/15'
                          )}
                          onClick={() => {
                            setHistFocusIdx(i);
                            historyGridRef.current?.focus();
                          }}
                        >
                          <td className="px-2 py-2 font-mono text-xs">{r.docNo}</td>
                          <td className="px-2 py-2">{r.category}</td>
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.date}</td>
                          <td className="px-2 py-2 text-xs">{r.customerName}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.unitPrice}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 第四區：報價 */}
      <section id="nx03-wb-block-4" className={blockClass} aria-labelledby="nx03-wb-h4">
        <h2 id="nx03-wb-h4" className="text-lg font-semibold tracking-tight">
          ④ 報價
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+A</kbd>{' '}
          依客戶／單價是否空白決定起始欄位；<strong className="font-medium text-foreground">Enter</strong> 依序：客戶編號
          → 單價 → 數量 → 確認窗（客戶與單價皆已填時，從數量開始）。
        </p>

        <div className="mt-6 grid max-w-lg flex-1 gap-4">
          <div>
            <label htmlFor="nx03-wb-quote-cust-code" className="text-sm font-medium">
              客戶編號
            </label>
            <input
              id="nx03-wb-quote-cust-code"
              ref={quoteCustomerCodeRef}
              value={quoteCustomerCode}
              onChange={(e) => setQuoteCustomerCode(e.target.value.toUpperCase())}
              onBlur={() => {
                const found = findMockCustomerByCode(quoteCustomerCode);
                if (found) setQuoteCustomerName(found.name);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  quotePriceRef.current?.focus();
                }
              }}
              list="nx03-wb-quote-cust-dl"
              placeholder="可編輯；Enter 前往單價"
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 font-mono text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
              autoComplete="off"
            />
            <datalist id="nx03-wb-quote-cust-dl">
              {WB_MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="nx03-wb-quote-cust-name" className="text-sm font-medium">
              客戶名稱
            </label>
            <input
              id="nx03-wb-quote-cust-name"
              value={quoteCustomerName}
              onChange={(e) => setQuoteCustomerName(e.target.value)}
              onBlur={() => {
                const found = findMockCustomerByCode(quoteCustomerCode);
                if (found && !quoteCustomerName.trim()) setQuoteCustomerName(found.name);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  quotePriceRef.current?.focus();
                }
              }}
              placeholder="可編輯；blur 可依編號帶入；Enter 前往單價"
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="nx03-wb-quote-price" className="text-sm font-medium">
              單價
            </label>
            <input
              id="nx03-wb-quote-price"
              ref={quotePriceRef}
              value={quoteUnitPrice}
              onChange={(e) => setQuoteUnitPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  quoteQtyRef.current?.focus();
                }
              }}
              placeholder="Enter 前往數量"
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
            />
          </div>
          <div>
            <label htmlFor="nx03-wb-quote-qty" className="text-sm font-medium">
              數量
            </label>
            <input
              id="nx03-wb-quote-qty"
              ref={quoteQtyRef}
              value={quoteQty}
              onChange={(e) => setQuoteQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  openConfirm();
                }
              }}
              placeholder="Enter 開啟確認"
              className={cx(
                'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm tabular-nums',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
              inputMode="numeric"
            />
          </div>
          <button
            type="button"
            onClick={openConfirm}
            className="rounded-xl border border-amber-500/45 bg-amber-500/20 py-3 text-sm font-semibold text-amber-50 hover:bg-amber-500/30"
          >
            確認報價（Enter）
          </button>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <DialogHeader>
            <DialogTitle>確認建檔</DialogTitle>
            <DialogDescription>
              請與業務再次確認以下內容後建檔（mock）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              客戶：<span className="font-medium">{quoteCustomerName || quoteCustomerCode}</span>（{quoteCustomerCode}）
            </p>
            <p>
              料號：<span className="font-mono">{activeVariant?.partNo ?? '—'}</span>
            </p>
            <p>
              數量 {quoteQty} × 單價 {quoteUnitPrice}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm"
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              ref={confirmBtnRef}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              onClick={finalizeQuote}
            >
              確認建檔（Enter）
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cheatOpen} onOpenChange={setCheatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>快捷鍵</DialogTitle>
            <DialogDescription className="sr-only">銷貨工作台</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">F2</kbd> 第一區搜尋（捲動 + 聚焦）
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+1</kbd> 第二區庫存
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+2</kbd> 第三區客戶框
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+A</kbd> 第四區報價
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">?</kbd> 本說明（不在文字欄內）
            </li>
            <li className="text-xs text-muted-foreground">部分瀏覽器可能攔截 Alt 組合鍵。</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
