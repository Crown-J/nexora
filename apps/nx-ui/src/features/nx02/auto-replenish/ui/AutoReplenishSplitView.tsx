/**
 * File: apps/nx-ui/src/features/nx02/auto-replenish/ui/AutoReplenishSplitView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-UI-001：自動補貨設定 左清單＋右表單
 *
 * @FUNCTION_CODE NX02-AURE-UI-001-F01
 */

'use client';

import { cx } from '@/shared/lib/cx';

import { useAutoReplenish } from '../hooks/useAutoReplenish';

import { AutoReplenishFormPanel } from './AutoReplenishFormPanel';

export type AutoReplenishSplitViewProps = { vm: ReturnType<typeof useAutoReplenish> };

/**
 * @FUNCTION_CODE NX02-AURE-UI-001-F01
 */
export function AutoReplenishSplitView({ vm }: AutoReplenishSplitViewProps) {
  const { rows, loading, error, selectedId, selectRow, startNew } = vm;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <aside className="lg:w-[min(420px,40%)] space-y-3 rounded-xl border border-border/80 bg-card/40 p-4">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-lg font-semibold">自動補貨設定</h1>
        </header>
        <button
          type="button"
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground"
          onClick={() => startNew()}
        >
          新增規則
        </button>
        {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
        {loading ? <p className="text-sm text-muted-foreground">載入中…</p> : null}
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto text-sm">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => void selectRow(r.id)}
                className={cx(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  selectedId === r.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/80 bg-background/60 hover:bg-muted/40',
                )}
              >
                <div className="font-medium">
                  {r.fromWarehouseName} → {r.toWarehouseName}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>順序 {r.priority}</span>
                  <span>{r.isActive ? '啟用' : '停用'}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="min-w-0 flex-1">
        <AutoReplenishFormPanel vm={vm} />
      </section>
    </div>
  );
}
