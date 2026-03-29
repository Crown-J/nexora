/**
 * File: apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷貨首頁：兩分頁「實際銷貨操作」與「瀏覽銷貨單據」（mock）
 *
 * Notes:
 * - 客戶銷貨流程另開連結；不呼叫後端
 */

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/shared/lib/cx';
import { SalesDocumentsBrowse } from '@/features/nx03/workflow/ui/SalesDocumentsBrowse';
import { SalesOperationWorkspace } from '@/features/nx03/workflow/ui/SalesOperationWorkspace';

type SalesMainTab = 'operation' | 'documents';

const PART_SEARCH_INPUT_ID = 'nx03-part-search-input';

/**
 * @FUNCTION_CODE NX03-WKFL-UI-001-F01
 * 銷貨模組主頁：雙分頁切換與客戶銷貨流程連結。
 */
export function SalesWorkflowPage() {
  const [mainTab, setMainTab] = useState<SalesMainTab>('operation');
  const [focusSearchNonce, setFocusSearchNonce] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      setMainTab('operation');
      setFocusSearchNonce((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (focusSearchNonce === 0 || mainTab !== 'operation') return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [focusSearchNonce, mainTab]);

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">銷貨作業</h1>
        <p className="text-sm text-muted-foreground">
          實際操作查料號與價格資訊，或瀏覽報價／銷貨／成交單據進度（mock）。
        </p>
      </header>

      <nav
        className="flex flex-wrap items-end gap-1 border-b border-border/60 pb-px"
        aria-label="銷貨主分頁"
      >
        <button
          type="button"
          onClick={() => setMainTab('operation')}
          className={cx(
            'inline-flex items-center rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
            mainTab === 'operation'
              ? 'border border-b-0 border-amber-500/35 bg-amber-500/10 text-amber-50'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          實際銷貨操作
        </button>
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
        <Link
          href="/dashboard/nx03/customer-sales"
          className={cx(
            'ml-auto inline-flex items-center rounded-t-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-muted/40 hover:text-foreground'
          )}
        >
          客戶銷貨流程
        </Link>
      </nav>

      {mainTab === 'operation' ? (
        <SalesOperationWorkspace searchInputRef={searchInputRef} searchInputId={PART_SEARCH_INPUT_ID} />
      ) : (
        <SalesDocumentsBrowse />
      )}
    </div>
  );
}
