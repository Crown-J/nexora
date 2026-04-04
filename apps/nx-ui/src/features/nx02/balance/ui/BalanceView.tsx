/**
 * File: apps/nx-ui/src/features/nx02/balance/ui/BalanceView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-UI-001：庫存一覽（QUERY：篩選、排序、表格列樣式）
 *
 * Notes:
 * - 資料由 useBalance 注入（props.vm）
 * - @FUNCTION_CODE NX02-BAL-UI-001-F01
 */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { cx } from '@/shared/lib/cx';

import type { BalanceVm } from '../hooks/useBalance';

const ntd0 = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const ntd4 = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export type BalanceViewProps = {
  vm: BalanceVm;
  showPlus: boolean;
};

/**
 * @FUNCTION_CODE NX02-BAL-UI-001-F01
 */
export function BalanceView({ vm, showPlus }: BalanceViewProps) {
  const {
    qInput,
    setQInput,
    warehouseId,
    status,
    page,
    pageSize,
    sortBy,
    sortDir,
    rows,
    total,
    summary,
    warehouses,
    loading,
    error,
    setQuery,
    toggleSort,
    ledgerHrefForPart,
  } = vm;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function SortTh({ field, children }: { field: string; children: ReactNode }) {
    const active = sortBy === field;
    return (
      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
        <button
          type="button"
          className={cx('inline-flex items-center gap-1 hover:text-foreground', active && 'text-primary')}
          onClick={() => toggleSort(field)}
        >
          {children}
          {active ? (sortDir === 'asc' ? '↑' : '↓') : null}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
        <h1 className="text-xl font-semibold text-foreground">庫存一覽</h1>
      </header>

      {summary ? (
        <p className="text-sm text-muted-foreground">
          共 {summary.total.toLocaleString('zh-TW')} 料號｜有庫存 {summary.inStock.toLocaleString('zh-TW')}｜零庫存{' '}
          {summary.zero.toLocaleString('zh-TW')}｜負庫存 {summary.negative.toLocaleString('zh-TW')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-card/40 p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
          料號／品名
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="輸入料號或品名搜尋…"
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
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          庫存狀態
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setQuery({ status: e.target.value, page: '1' })}
          >
            <option value="all">全部</option>
            <option value="in_stock">有庫存</option>
            <option value="zero">零庫存</option>
            <option value="negative">負庫存</option>
          </select>
        </label>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortTh field="code">料號</SortTh>
              <SortTh field="name">品名</SortTh>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">廠牌</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">倉庫</th>
              <SortTh field="on_hand_qty">現存量</SortTh>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">佔用量</th>
              <SortTh field="available_qty">可用量</SortTh>
              {showPlus ? (
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">調撥中</th>
              ) : null}
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">單位</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">移動均價</th>
              <SortTh field="stock_value">庫存金額</SortTh>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">安全量</th>
              <SortTh field="last_move_at">最後異動</SortTh>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showPlus ? 13 : 12} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showPlus ? 13 : 12} className="px-3 py-8 text-center text-muted-foreground">
                  無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const low =
                  r.minQty != null &&
                  r.minQty > 0 &&
                  r.onHandQty < r.minQty;
                const rowBg =
                  r.onHandQty < 0
                    ? 'bg-red-500/10'
                    : r.onHandQty === 0
                      ? 'bg-muted/40'
                      : '';
                return (
                  <tr key={r.id} className={cx('border-b border-border/60', rowBg)}>
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={ledgerHrefForPart(r.partCode)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {r.partCode}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2">{r.partName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.brandName ?? '—'}</td>
                    <td className="px-3 py-2">{r.warehouseName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.onHandQty.toLocaleString('zh-TW')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.reservedQty.toLocaleString('zh-TW')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.availableQty.toLocaleString('zh-TW')}</td>
                    {showPlus ? (
                      <td className="px-3 py-2 text-right tabular-nums">{r.inTransitQty.toLocaleString('zh-TW')}</td>
                    ) : null}
                    <td className="px-3 py-2">{r.uom}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{ntd4.format(r.avgCost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{ntd0.format(r.stockValue)}</td>
                    <td
                      className={cx(
                        'px-3 py-2 text-right tabular-nums',
                        low && 'font-medium text-orange-500',
                      )}
                    >
                      {r.minQty == null ? '—' : r.minQty.toLocaleString('zh-TW')}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.lastMoveAt).toLocaleString('zh-TW')}
                    </td>
                  </tr>
                );
              })
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
