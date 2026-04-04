/**
 * File: apps/nx-ui/src/features/nx02/stock-take/ui/StockTakeListView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-UI-001：盤點單清單
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import { cx } from '@/shared/lib/cx';

import type { StockTakeListVm } from '../hooks/useStockTakeList';

function st(s: string) {
  if (s === 'P') return { label: '已過帳', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (s === 'C') return { label: '盤點中', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' };
  if (s === 'V') return { label: '作廢', cls: 'bg-destructive/15 text-destructive' };
  return { label: '草稿', cls: 'bg-muted text-muted-foreground' };
}

export type StockTakeListViewProps = { vm: StockTakeListVm };

/**
 * @FUNCTION_CODE NX02-STTK-UI-001-F01
 */
export function StockTakeListView({ vm }: StockTakeListViewProps) {
  const { warehouseId, status, page, pageSize, rows, total, loading, error, setQuery } = vm;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [whOpts, setWhOpts] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then((w) => setWhOpts(w.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setWhOpts([]));
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-xl font-semibold">盤點單</h1>
        </div>
        <Link
          href="/dashboard/nx02/stock-take/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          新增盤點
        </Link>
      </header>
      <div className="flex flex-wrap gap-3 rounded-xl border border-border/80 bg-card/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          倉庫
          <select
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            value={warehouseId}
            onChange={(e) => setQuery({ warehouseId: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            {whOpts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          狀態
          <select
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setQuery({ status: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            <option value="D">草稿</option>
            <option value="C">盤點中</option>
            <option value="P">已過帳</option>
            <option value="V">作廢</option>
          </select>
        </label>
      </div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">單號</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">倉庫</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">日期</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">範圍</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">料號數</th>
              <th className="px-2 py-2 text-right text-xs text-muted-foreground">已盤</th>
              <th className="px-2 py-2 text-left text-xs text-muted-foreground">狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const b = st(r.status);
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-2 py-2 font-mono text-xs">
                      <Link href={`/dashboard/nx02/stock-take/${r.id}`} className="text-primary hover:underline">
                        {r.docNo}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{r.warehouseName}</td>
                    <td className="px-2 py-2">{r.stockTakeDate}</td>
                    <td className="px-2 py-2">{r.scopeType === 'F' ? '全倉' : '部分'}</td>
                    <td className="px-2 py-2 text-right">{r.itemCount}</td>
                    <td className="px-2 py-2 text-right">{r.countedDoneCount}</td>
                    <td className="px-2 py-2">
                      <span className={cx('rounded-full px-2 py-0.5 text-xs', b.cls)}>{b.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          第 {page}/{totalPages} 頁（{total} 筆）
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded border border-border px-2 py-1 disabled:opacity-40"
            onClick={() => setQuery({ page: String(page - 1) })}
          >
            上一頁
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded border border-border px-2 py-1 disabled:opacity-40"
            onClick={() => setQuery({ page: String(page + 1) })}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}
