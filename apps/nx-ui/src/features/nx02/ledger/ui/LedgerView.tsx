/**
 * File: apps/nx-ui/src/features/nx02/ledger/ui/LedgerView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-UI-001：庫存台帳 QUERY 版面
 *
 * Notes:
 * - @FUNCTION_CODE NX02-LED-UI-001-F01
 */

'use client';

import { cx } from '@/shared/lib/cx';

import type { LedgerVm } from '../hooks/useLedger';

const ntd = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const MOVEMENT_LABEL: Record<string, string> = {
  I: '入庫',
  O: '出庫',
  A: '盤點調整',
};

const SOURCE_LABEL: Record<string, string> = {
  I: '開帳存',
  P: '進貨',
  S: '銷貨',
  T: '盤點',
  X: '調撥',
  R: '退貨',
};

function movementBadgeClass(t: string): string {
  if (t === 'I') return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
  if (t === 'O') return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
  if (t === 'A') return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
  return 'bg-muted text-muted-foreground';
}

export type LedgerViewProps = {
  vm: LedgerVm;
};

/**
 * @FUNCTION_CODE NX02-LED-UI-001-F01
 */
export function LedgerView({ vm }: LedgerViewProps) {
  const {
    qInput,
    setQInput,
    warehouseId,
    movementType,
    sourceDocType,
    dateFrom,
    dateTo,
    page,
    pageSize,
    rows,
    total,
    loading,
    error,
    rangeError,
    setQuery,
    warehouses,
  } = vm;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
        <h1 className="text-xl font-semibold text-foreground">庫存台帳</h1>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-card/40 p-4">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
          料號／品名
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          倉庫
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={warehouseId}
            onChange={(e) => setQuery({ warehouseId: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          異動類型
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={movementType}
            onChange={(e) => setQuery({ movementType: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            <option value="I">入庫</option>
            <option value="O">出庫</option>
            <option value="A">盤點調整</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          來源單據
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={sourceDocType}
            onChange={(e) => setQuery({ sourceDocType: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            <option value="I">開帳存</option>
            <option value="P">進貨</option>
            <option value="S">銷貨</option>
            <option value="T">盤點</option>
            <option value="X">調撥</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          起始日
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(e) => setQuery({ dateFrom: e.target.value, page: '1' })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          結束日
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={dateTo}
            onChange={(e) => setQuery({ dateTo: e.target.value, page: '1' })}
          />
        </label>
      </div>

      {rangeError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {rangeError}
        </div>
      ) : null}
      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">異動時間</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">異動類型</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">來源單據</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">料號</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">品名</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">倉庫</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">庫位</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">入庫量</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">出庫量</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">單位成本</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">異動總成本</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">異動後庫存</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">異動後均價</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">來源單號</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                  無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.movementDate).toLocaleString('zh-TW')}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cx(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        movementBadgeClass(r.movementType),
                      )}
                    >
                      {MOVEMENT_LABEL[r.movementType] ?? r.movementType}
                    </span>
                  </td>
                  <td className="px-3 py-2">{SOURCE_LABEL[r.sourceDocType] ?? r.sourceDocType}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.partCode}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">{r.partName}</td>
                  <td className="px-3 py-2">{r.warehouseName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.locationName ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.qtyIn != null ? r.qtyIn.toLocaleString('zh-TW') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.qtyOut != null ? r.qtyOut.toLocaleString('zh-TW') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">{ntd.format(r.unitCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{ntd.format(r.totalCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.balanceQty.toLocaleString('zh-TW')}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">{ntd.format(r.balanceCost)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.sourceDocId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          第 {page} / {totalPages} 頁（共 {total} 筆）
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setQuery({ page: String(page - 1) })}
          >
            上一頁
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setQuery({ page: String(page + 1) })}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}
