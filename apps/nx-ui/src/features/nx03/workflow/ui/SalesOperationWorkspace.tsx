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
import type { QuoteSnapshot } from '@/features/nx03/workflow/types';

const BLOCK_IDS = ['nx03-wb-block-1', 'nx03-wb-block-2', 'nx03-wb-block-3', 'nx03-wb-block-4'] as const;

function scrollToBlock(n: 1 | 2 | 3 | 4) {
  const el = document.getElementById(BLOCK_IDS[n - 1]);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pickDefaultVariantId(family: PartFamilyGroup): string {
  return family.variants[0]!.id;
}

/** 與 datalist 選取一致：輸入值完整等於某筆料號時鎖定該筆 */
function findExactVariantByPartNo(
  trimmed: string,
  fams: PartFamilyGroup[]
): { fid: string; vid: string } | null {
  for (const fam of fams) {
    for (const v of fam.variants) {
      if (v.partNo.trim() === trimmed) return { fid: fam.id, vid: v.id };
    }
  }
  return null;
}

function formatTwd(n: number): string {
  if (!n) return '—';
  return `NT$ ${n.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`;
}

/** 第二區右側：固定 Z00～Z04 顯示數量 + 調貨（mock：數量依 rollup 列依序對應） */
function buildBlock2OutboundRows(wb: WorkbenchDerived) {
  const r = wb.rollup;
  const q = (i: number) => r[i]?.qty ?? 0;
  return [
    { key: 'Z00', code: 'Z00', name: '總倉', qty: q(0) },
    { key: 'Z01', code: 'Z01', name: '台北倉', qty: q(1) },
    { key: 'Z02', code: 'Z02', name: '新莊倉', qty: q(2) },
    { key: 'Z04', code: 'Z04', name: '林口倉', qty: q(3) },
    { key: 'TRANSFER', code: '—', name: '調貨', qty: null as null },
  ];
}

export type SalesOperationWorkspaceProps = {
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchInputId?: string;
  /** 父層 F2 遞增時捲動至第一區 */
  searchFocusNonce?: number;
  /** 報價完成：進入「建立銷貨單」階段 */
  onQuoteComplete?: (snapshot: QuoteSnapshot) => void;
};

/**
 * @FUNCTION_CODE NX03-WKFL-UI-005-F02
 * 四區塊銷貨工作台（mock）。
 */
export function SalesOperationWorkspace({
  searchInputRef,
  searchInputId = 'nx03-part-search-input',
  searchFocusNonce = 0,
  onQuoteComplete,
}: SalesOperationWorkspaceProps) {
  const [query, setQuery] = useState('');
  const families = useMemo((): PartFamilyGroup[] => {
    const q = query.trim();
    if (!q) return [];
    return searchPartFamilies(q);
  }, [query]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const familyIdRef = useRef<string | null>(null);
  const variantIdRef = useRef<string | null>(null);
  familyIdRef.current = familyId;
  variantIdRef.current = variantId;

  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appliedCustomerCode, setAppliedCustomerCode] = useState<string | null>(null);

  const [histFocusIdx, setHistFocusIdx] = useState(0);

  const [quoteQty, setQuoteQty] = useState('1');
  const [quoteUnitPrice, setQuoteUnitPrice] = useState('');
  const [quoteCustomerCode, setQuoteCustomerCode] = useState('');
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quoteRemark, setQuoteRemark] = useState('');

  const quoteLineTotals = useMemo(() => {
    const u = Number(String(quoteUnitPrice).replace(/,/g, '').trim());
    const q = Number(String(quoteQty).replace(/,/g, '').trim());
    if (!Number.isFinite(u) || !Number.isFinite(q) || q < 0) {
      return { excl: null as number | null, incl: null as number | null };
    }
    const incl = u * q;
    const excl = incl / 1.05;
    return { excl: Math.round(excl), incl: Math.round(incl) };
  }, [quoteUnitPrice, quoteQty]);

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
  const quoteCustomerNameRef = useRef<HTMLInputElement>(null);
  const quotePriceRef = useRef<HTMLInputElement>(null);
  const quoteQtyRef = useRef<HTMLInputElement>(null);
  const quoteRemarkRef = useRef<HTMLTextAreaElement>(null);
  const confirmDialogCancelRef = useRef<HTMLButtonElement>(null);
  const variantBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** 第二區右側：出貨倉／調貨列（Enter 後進入第三區） */
  const block2WarehouseBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [outboundSlotKey, setOutboundSlotKey] = useState<string | null>(null);

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

  const block2OutboundRows = useMemo(() => (wb ? buildBlock2OutboundRows(wb) : []), [wb]);

  useEffect(() => {
    setOutboundSlotKey(null);
  }, [variantId]);

  const goToBlock3FromWarehouse = useCallback(
    (slotKey: string) => {
      const row = block2OutboundRows.find((r) => r.key === slotKey);
      if (row && row.qty !== null && row.qty === 0) {
        setToast('目前此倉庫沒有貨');
        window.setTimeout(() => setToast(null), 4000);
      }
      const tag =
        row?.key === 'TRANSFER' ? '由調貨出貨' : row ? `由${row.code}${row.name}出貨` : '';
      if (tag) {
        setQuoteRemark((prev) => {
          const cleaned = prev.replace(/^由[^；\n]+出貨[；\s]*/u, '').trim();
          return cleaned ? `${tag}；${cleaned}` : tag;
        });
      }
      setOutboundSlotKey(slotKey);
      scrollToBlock(3);
      requestAnimationFrame(() => customerSearchRef.current?.focus());
    },
    [block2OutboundRows]
  );

  /** 已篩選客戶時：最近一次報價、最近一次銷貨（成交） */
  const compactHistory = useMemo(() => {
    if (!wb || !appliedCustomerCode) return null;
    const code = appliedCustomerCode.toUpperCase();
    const cust = findMockCustomerByCode(code);
    const rows = wb.comparisonRows.filter(
      (r) =>
        r.customerId.replace(/—/g, '').toUpperCase() === code ||
        (cust && r.customerName === cust.name)
    );
    const quotes = rows
      .filter((r) => r.category === '報價')
      .sort((a, b) => b.date.localeCompare(a.date));
    const sales = rows
      .filter((r) => r.category === '銷貨')
      .sort((a, b) => b.date.localeCompare(a.date));
    return { latestQuote: quotes[0] ?? null, latestSales: sales[0] ?? null };
  }, [wb, appliedCustomerCode]);

  const syncQuoteFromBlock3 = useCallback(() => {
    const code = customerCode.trim().toUpperCase();
    setQuoteCustomerCode(code);
    const found = findMockCustomerByCode(code);
    setQuoteCustomerName((found?.name ?? customerName).trim());
    if (!compactHistory) return;
    const idx = Math.min(2, Math.max(0, histFocusIdx));
    if (idx === 2) {
      setQuoteUnitPrice('');
      return;
    }
    if (idx === 0 && compactHistory.latestQuote) {
      const n = parseTwdToNumber(compactHistory.latestQuote.unitPrice);
      if (n) setQuoteUnitPrice(String(Math.round(n)));
      return;
    }
    if (idx === 1 && compactHistory.latestSales) {
      const n = parseTwdToNumber(compactHistory.latestSales.unitPrice);
      if (n) setQuoteUnitPrice(String(Math.round(n)));
      return;
    }
    setQuoteUnitPrice('');
  }, [customerCode, customerName, compactHistory, histFocusIdx]);

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

  /** 從第三區 Enter 或 Alt+A 進入第四區時，永遠先鎖定客戶編號 */
  useLayoutEffect(() => {
    if (focusBlock4Nonce === 0) return;
    quoteCustomerCodeRef.current?.focus();
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

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setFamilyId(null);
      setVariantId(null);
      return;
    }
    const next = searchPartFamilies(q);
    if (next.length === 0) {
      setFamilyId(null);
      setVariantId(null);
      return;
    }
    const exact = findExactVariantByPartNo(q, next);
    if (exact) {
      setFamilyId(exact.fid);
      setVariantId(exact.vid);
      return;
    }
    const prevF = familyIdRef.current;
    const prevV = variantIdRef.current;
    const fam = prevF ? next.find((f) => f.id === prevF) : undefined;
    const targetFam = fam ?? next[0]!;
    const vOk = prevV && targetFam.variants.some((v) => v.id === prevV);
    const targetVid = vOk ? prevV! : pickDefaultVariantId(targetFam);
    setFamilyId(targetFam.id);
    setVariantId(targetVid);
  }, [query]);

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    const next = searchPartFamilies(q);
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

  const selectFamily = useCallback((fam: PartFamilyGroup) => {
    const vid = pickDefaultVariantId(fam);
    setFamilyId(fam.id);
    setVariantId(vid);
    setPendingListFocus({ variantId: vid });
  }, []);

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
    if (!wb) return;
    if (compactHistory) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHistFocusIdx((i) => Math.min(2, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHistFocusIdx((i) => Math.max(0, i - 1));
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      syncQuoteFromBlock3();
      scrollToBlock(4);
      setFocusBlock4Nonce((n) => n + 1);
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
    requestAnimationFrame(() => confirmDialogCancelRef.current?.focus());
  }, [quoteQty, quoteCustomerCode, quoteUnitPrice]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmOpen(false);
    requestAnimationFrame(() => quoteCustomerCodeRef.current?.focus());
  }, []);

  const handleContinueQuote = useCallback(() => {
    setConfirmOpen(false);
    scrollToBlock(1);
    requestAnimationFrame(() => searchInputRef?.current?.focus());
  }, [searchInputRef]);

  const handleQuoteComplete = useCallback(() => {
    const snapshot: QuoteSnapshot = {
      customerCode: quoteCustomerCode.trim(),
      customerName: quoteCustomerName.trim(),
      partNo: activeVariant?.partNo ?? '',
      qty: quoteQty,
      unitPrice: quoteUnitPrice,
      remark: quoteRemark.trim(),
    };
    setConfirmOpen(false);
    setToast('報價完成（mock），請於「建立銷貨單」繼續流程');
    window.setTimeout(() => setToast(null), 4000);
    onQuoteComplete?.(snapshot);
  }, [
    quoteCustomerCode,
    quoteCustomerName,
    quoteQty,
    quoteUnitPrice,
    quoteRemark,
    activeVariant?.partNo,
    onQuoteComplete,
  ]);

  const blockClass = cx(
    'scroll-mt-4 rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm',
    'min-h-[min(70vh,720px)] flex flex-col'
  );
  const blockClassSearch = cx(
    'scroll-mt-4 rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm',
    'flex flex-col'
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
        className={blockClassSearch}
        aria-labelledby="nx03-wb-h1"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h2 id="nx03-wb-h1" className="text-lg font-semibold tracking-tight">
              ① 搜尋料號
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">F2</kbd> 捲到此區並聚焦｜Enter
              查詢；與客戶欄相同，輸入即出現下拉選單
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{WB_STAFF_LABEL}</div>
            <div>
              本倉：<span className="text-foreground">{WB_LOGIN_WAREHOUSE}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <label htmlFor={searchInputId} className="text-sm font-medium text-foreground">
            料號
          </label>
          <input
            id={searchInputId}
            ref={(el) => {
              if (searchInputRef) searchInputRef.current = el;
            }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              }
            }}
            list="nx03-wb-part-dl"
            placeholder="輸入後 Enter 查詢或選擇料號"
            className={cx(
              'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 font-mono text-sm',
              'placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
            )}
            aria-label="零件關鍵字搜尋"
            autoComplete="off"
          />
          <datalist id="nx03-wb-part-dl">
            {families.flatMap((fam) =>
              fam.variants.map((v) => (
                <option key={v.id} value={v.partNo}>
                  {v.partName}
                </option>
              ))
            )}
          </datalist>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeVariant ? (
              <>
                <span className="font-mono text-amber-200/90">{activeVariant.partNo}</span>
                <span className="text-amber-200/90"> · </span>
                <span>{activeVariant.partName}</span>
              </>
            ) : (
              '（選擇料號後顯示品名）'
            )}
          </p>
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

        {!query.trim() ? (
          <p className="mt-6 text-sm text-muted-foreground">輸入關鍵字即出現可選料號（與客戶欄相同）；Enter 或查詢會捲至庫存區。試：水泵、06H、煞車、Bosch。</p>
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
          選通用件；<strong className="font-medium text-foreground">Enter</strong> 至右側選出貨倉；再{' '}
          <strong className="font-medium text-foreground">Enter</strong> 進入第三區
        </p>

        {families.length === 0 ? (
          <p className="mt-8 flex-1 text-sm text-muted-foreground">請先於第一區輸入關鍵字並出現可選料號。</p>
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
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        setOutboundSlotKey('Z00');
                        requestAnimationFrame(() => block2WarehouseBtnRefs.current[0]?.focus());
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
                <div className="mt-4 space-y-1" role="listbox" aria-label="出貨倉位">
                  {block2OutboundRows.map((row, idx) => (
                    <button
                      key={row.key}
                      type="button"
                      role="option"
                      aria-selected={outboundSlotKey === row.key}
                      ref={(el) => {
                        block2WarehouseBtnRefs.current[idx] = el;
                      }}
                      onFocus={() => setOutboundSlotKey(row.key)}
                      onClick={() => goToBlock3FromWarehouse(row.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          goToBlock3FromWarehouse(row.key);
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          block2WarehouseBtnRefs.current[
                            Math.min(idx + 1, block2OutboundRows.length - 1)
                          ]?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          block2WarehouseBtnRefs.current[Math.max(0, idx - 1)]?.focus();
                        }
                      }}
                      className={cx(
                        'grid w-full grid-cols-[4rem_1fr_4rem] items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45',
                        outboundSlotKey === row.key
                          ? 'border-amber-500/50 bg-amber-500/12'
                          : 'border-border/50 hover:bg-muted/15'
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
                      <span className="min-w-0">{row.name}</span>
                      <span className="text-right tabular-nums text-foreground">
                        {row.qty === null ? '—' : row.qty}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">選擇左側料號以顯示各倉數量。</p>
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
          篩選並移至下方紀錄；於紀錄表再按 <strong className="font-medium text-foreground">Enter</strong> 至第四區報價（或{' '}
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+A</kbd>）
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

              <p className="text-xs text-muted-foreground">
                已篩選客戶時僅顯示<strong className="text-foreground/90">最近一次報價</strong>、
                <strong className="text-foreground/90">最近一次成交</strong>，以及
                <strong className="text-foreground/90">自訂報價</strong>（第四區自行輸入單價）。
              </p>

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
                      <th className="px-2 py-2 font-medium">類型</th>
                      <th className="px-2 py-2 font-medium">單號</th>
                      <th className="px-2 py-2 font-medium">日期</th>
                      <th className="px-2 py-2 font-medium text-right">單價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!appliedCustomerCode ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                          請輸入客戶編號後 Enter 篩選
                        </td>
                      </tr>
                    ) : !compactHistory ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                          —
                        </td>
                      </tr>
                    ) : (
                      (
                        [
                          {
                            key: 'q',
                            label: '最近報價',
                            row: compactHistory.latestQuote,
                          },
                          {
                            key: 's',
                            label: '最近成交',
                            row: compactHistory.latestSales,
                          },
                          { key: 'c', label: '自訂報價', row: null as WorkbenchComparisonRow | null },
                        ] as const
                      ).map((item, i) => {
                        const active = Math.min(2, Math.max(0, histFocusIdx)) === i;
                        return (
                          <tr
                            key={item.key}
                            className={cx(
                              'cursor-pointer border-b border-border/30',
                              active ? 'bg-amber-500/20' : 'hover:bg-muted/15'
                            )}
                            onClick={() => {
                              setHistFocusIdx(i);
                              historyGridRef.current?.focus();
                            }}
                          >
                            <td className="px-2 py-2 font-medium">{item.label}</td>
                            <td className="px-2 py-2 font-mono text-xs">
                              {item.row?.docNo ?? (item.key === 'c' ? '—' : '—')}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-muted-foreground">
                              {item.row?.date ?? '—'}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              {item.key === 'c'
                                ? '（第四區輸入）'
                                : (item.row?.unitPrice ?? '—')}
                            </td>
                          </tr>
                        );
                      })
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
          進入本區後<strong className="font-medium text-foreground"> 永遠先鎖定客戶編號</strong>。
          <strong className="font-medium text-foreground"> Enter</strong> 依序：客戶編號 → 客戶名稱 → 單價（含稅）→ 數量 → 備註 →
          確認窗（<kbd className="rounded border border-border px-1 font-mono text-[10px]">Alt+A</kbd> 亦會帶入並聚焦本區）。左側可編輯，右側為試算。
        </p>

        <div className="mt-6 grid max-w-2xl flex-1 gap-4">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
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
                    quoteCustomerNameRef.current?.focus();
                  }
                }}
                list="nx03-wb-quote-cust-dl"
                placeholder="Enter 前往客戶名稱"
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
                ref={quoteCustomerNameRef}
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
                placeholder="Enter 前往單價（含稅）"
                className={cx(
                  'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
                )}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div>
              <label htmlFor="nx03-wb-quote-price" className="text-sm font-medium">
                單價（含稅價）
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
              <label className="text-sm font-medium text-muted-foreground">未稅總價</label>
              <div className="mt-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 text-sm tabular-nums text-foreground">
                {quoteLineTotals.excl != null ? formatTwd(quoteLineTotals.excl) : '—'}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">含稅單價×數量÷1.05（試算）</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
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
                    quoteRemarkRef.current?.focus();
                  }
                }}
                placeholder="Enter 前往備註"
                className={cx(
                  'mt-2 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm tabular-nums',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
                )}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">含稅總價（5%）</label>
              <div className="mt-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 text-sm tabular-nums text-foreground">
                {quoteLineTotals.incl != null ? formatTwd(quoteLineTotals.incl) : '—'}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">含稅單價×數量（試算）</p>
            </div>
          </div>
          <div>
            <label htmlFor="nx03-wb-quote-remark" className="text-sm font-medium">
              備註
            </label>
            <textarea
              id="nx03-wb-quote-remark"
              ref={quoteRemarkRef}
              value={quoteRemark}
              onChange={(e) => setQuoteRemark(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  openConfirm();
                }
              }}
              rows={3}
              placeholder="Enter 開啟確認（Shift+Enter 換行）"
              className={cx(
                'mt-2 w-full resize-y rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45'
              )}
            />
          </div>
          <button
            type="button"
            onClick={openConfirm}
            className="rounded-xl border border-amber-500/45 bg-amber-500/20 py-3 text-sm font-semibold text-amber-50 hover:bg-amber-500/30"
          >
            開啟確認
          </button>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          draggable
          className="max-w-md"
          onOpenAutoFocus={(ev) => {
            ev.preventDefault();
            requestAnimationFrame(() => confirmDialogCancelRef.current?.focus());
          }}
        >
          <DialogHeader>
            <DialogTitle>確認報價</DialogTitle>
            <DialogDescription>請選擇下一步（mock）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              客戶：<span className="font-medium">{quoteCustomerName || quoteCustomerCode}</span>（{quoteCustomerCode}）
            </p>
            <p>
              料號：<span className="font-mono">{activeVariant?.partNo ?? '—'}</span>
            </p>
            <p>
              數量 {quoteQty} × 單價（含稅）{quoteUnitPrice}
            </p>
            {quoteRemark.trim() ? (
              <p>
                備註：<span className="text-muted-foreground">{quoteRemark}</span>
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              ref={confirmDialogCancelRef}
              className="rounded-lg border border-border px-4 py-2 text-sm"
              onClick={handleConfirmCancel}
            >
              取消
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-50 hover:bg-amber-500/25"
              onClick={handleContinueQuote}
            >
              繼續報價
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              onClick={handleQuoteComplete}
            >
              報價完成
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cheatOpen} onOpenChange={setCheatOpen}>
        <DialogContent draggable className="max-w-md">
          <DialogHeader>
            <DialogTitle>快捷鍵</DialogTitle>
            <DialogDescription className="sr-only">銷貨工作台</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">F2</kbd> 第一區搜尋（捲動 + 聚焦）
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+1</kbd> 第二區庫存（左 Enter → 右；再 Enter
              → 第三區）
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+2</kbd> 第三區客戶框
            </li>
            <li>
              <kbd className="rounded border px-1 font-mono text-xs">Alt+A</kbd> 第四區報價（等同第三區紀錄表 Enter）
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
