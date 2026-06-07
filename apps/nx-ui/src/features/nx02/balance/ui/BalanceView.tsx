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
};

/**
 * @FUNCTION_CODE NX02-BAL-UI-001-F01
 *
 * T1-fix-c 進貨對齊批次 2026-06-07：拿掉 showPlus 版本守、「調撥中」欄三版本全顯示。
 */
export function BalanceView({ vm }: BalanceViewProps) {
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
        <h1 className="text-lg font-semibold text-foreground md:text-xl">庫存一覽</h1>
      </header>

      {summary ? (
        <p className="text-xs text-muted-foreground md:text-sm">
          共 {summary.total.toLocaleString('zh-TW')} 料號｜有庫存 {summary.inStock.toLocaleString('zh-TW')}｜零庫存{' '}
          {summary.zero.toLocaleString('zh-TW')}｜負庫存 {summary.negative.toLocaleString('zh-TW')}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/40 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
        <label className="flex w-full min-w-[200px] flex-col gap-1 text-xs text-muted-foreground sm:flex-1">
          料號／品名
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground lg:h-9"
            placeholder="輸入料號或品名搜尋…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto">
          倉庫
          <select
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm lg:h-9"
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
        <label className="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto">
          庫存狀態
          <select
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm lg:h-9"
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

      <div className="hidden overflow-x-auto rounded-xl border border-border/80 lg:block">
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
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">調撥中</th>
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
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
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
                    <td className="px-3 py-2 text-right tabular-nums">{r.inTransitQty.toLocaleString('zh-TW')}</td>
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

      <div className="space-y-2 lg:hidden">
        {loading ? (
          <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-8 text-center text-sm text-muted-foreground">
            載入中…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-card/40 px-3 py-8 text-center text-sm text-muted-foreground">
            無資料
          </div>
        ) : (
          rows.map((r) => {
            const low = r.minQty != null && r.minQty > 0 && r.onHandQty < r.minQty;
            const cardTone =
              r.onHandQty < 0
                ? 'border-red-500/40 bg-red-500/5'
                : r.onHandQty === 0
                  ? 'border-border/60 bg-muted/30'
                  : 'border-border/80 bg-card/40';
            return (
              <div key={r.id} className={cx('rounded-xl border p-3', cardTone)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={ledgerHrefForPart(r.partCode)}
                      className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {r.partCode}
                    </Link>
                    <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {r.partName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.brandName ?? '—'} · {r.warehouseName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">可用量</div>
                    <div className="tabular-nums text-lg font-semibold text-foreground">
                      {r.availableQty.toLocaleString('zh-TW')}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.uom}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border/40 pt-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">現存</div>
                    <div className="tabular-nums text-foreground">{r.onHandQty.toLocaleString('zh-TW')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">佔用</div>
                    <div className="tabular-nums text-foreground">{r.reservedQty.toLocaleString('zh-TW')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">調撥中</div>
                    <div className="tabular-nums text-foreground">{r.inTransitQty.toLocaleString('zh-TW')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">安全量</div>
                    <div
                      className={cx(
                        'tabular-nums',
                        low ? 'font-medium text-orange-500' : 'text-foreground',
                      )}
                    >
                      {r.minQty == null ? '—' : r.minQty.toLocaleString('zh-TW')}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">庫存金額 {ntd0.format(r.stockValue)}</span>
                  <span>{new Date(r.lastMoveAt).toLocaleString('zh-TW')}</span>
                </div>
                {r.onHandQty < 0 ? (
                  <div className="mt-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-500">⚠ 負庫存</div>
                ) : low ? (
                  <div className="mt-2 rounded-md bg-orange-500/10 px-2 py-1 text-xs text-orange-500">⚠ 低於安全量</div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          第 {page} / {totalPages} 頁（共 {total} 筆）
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-border px-4 disabled:opacity-40 lg:min-h-0 lg:px-3 lg:py-1.5"
            disabled={page <= 1}
            onClick={() => setQuery({ page: String(page - 1) })}
          >
            上一頁
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-border px-4 disabled:opacity-40 lg:min-h-0 lg:px-3 lg:py-1.5"
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
