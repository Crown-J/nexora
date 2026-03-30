/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx
 *
 * Purpose:
 * - NX03 銷貨首頁：流程圖式「建立報價單 → 建立銷貨單」與「瀏覽銷貨單據」（mock）
 */

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/shared/lib/cx';
import type { QuoteSnapshot } from '@/features/nx03/workflow/types';
import { SalesDocumentsBrowse } from '@/features/nx03/workflow/ui/SalesDocumentsBrowse';
import { SalesOperationWorkspace } from '@/features/nx03/workflow/ui/SalesOperationWorkspace';
import { SalesOrderWorkspace } from '@/features/nx03/workflow/ui/SalesOrderWorkspace';

type MainTab = 'operation' | 'documents';
type OperationPhase = 'quote' | 'salesOrder';

const PART_SEARCH_INPUT_ID = 'nx03-part-search-input';

export function SalesWorkflowPage() {
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>('operation');
  const [operationPhase, setOperationPhase] = useState<OperationPhase>('quote');
  const [quoteSnapshot, setQuoteSnapshot] = useState<QuoteSnapshot | null>(null);
  const [focusSearchNonce, setFocusSearchNonce] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const phase = searchParams.get('phase');
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (phase === 'salesOrder') {
        setMainTab('operation');
        setOperationPhase('salesOrder');
      } else if (phase === 'quote') {
        setMainTab('operation');
        setOperationPhase('quote');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      setMainTab('operation');
      setOperationPhase('quote');
      setFocusSearchNonce((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (focusSearchNonce === 0 || mainTab !== 'operation' || operationPhase !== 'quote') return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [focusSearchNonce, mainTab, operationPhase]);

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-1">
        <p className="text-sm">
          <Link
            href="/dashboard/nx03"
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            ← 銷貨流程總覽
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">銷貨作業</h1>
        <p className="text-sm text-muted-foreground">
          建立報價單後可進入建立銷貨單；或瀏覽報價／銷貨／成交單據進度（mock）。
        </p>
      </header>

      <nav
        className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-px"
        aria-label="銷貨主導覽"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-t-lg border border-b-0 border-amber-500/25 bg-card/30 px-2 py-1.5"
            role="group"
            aria-label="銷貨作業流程"
          >
            <button
              type="button"
              onClick={() => {
                setMainTab('operation');
                setOperationPhase('quote');
              }}
              className={cx(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                mainTab === 'operation' && operationPhase === 'quote'
                  ? 'bg-amber-500/20 text-amber-50 ring-1 ring-amber-500/40'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              建立報價單
            </button>
            <span className="select-none text-muted-foreground" aria-hidden>
              →
            </span>
            <button
              type="button"
              disabled={!quoteSnapshot}
              title={!quoteSnapshot ? '請先於報價完成確認窗選擇「報價完成」' : undefined}
              onClick={() => {
                if (!quoteSnapshot) return;
                setMainTab('operation');
                setOperationPhase('salesOrder');
              }}
              className={cx(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                mainTab === 'operation' && operationPhase === 'salesOrder'
                  ? 'bg-amber-500/20 text-amber-50 ring-1 ring-amber-500/40'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                !quoteSnapshot && 'cursor-not-allowed opacity-50 hover:bg-transparent'
              )}
            >
              建立銷貨單
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMainTab('documents')}
            className={cx(
              'inline-flex items-center rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              mainTab === 'documents'
                ? 'border border-b-0 border-amber-500/35 bg-amber-500/10 text-amber-50'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            瀏覽銷貨單據
          </button>
        </div>

        <Link
          href="/dashboard/nx03/customer-sales"
          className={cx(
            'inline-flex shrink-0 items-center rounded-t-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-muted/40 hover:text-foreground'
          )}
        >
          客戶銷貨流程
        </Link>
      </nav>

      {mainTab === 'operation' ? (
        operationPhase === 'quote' ? (
          <SalesOperationWorkspace
            searchInputRef={searchInputRef}
            searchInputId={PART_SEARCH_INPUT_ID}
            searchFocusNonce={focusSearchNonce}
            onQuoteComplete={(snap) => {
              setQuoteSnapshot(snap);
              setOperationPhase('salesOrder');
            }}
          />
        ) : (
          <SalesOrderWorkspace snapshot={quoteSnapshot} />
        )
      ) : (
        <SalesDocumentsBrowse />
      )}
    </div>
  );
}
