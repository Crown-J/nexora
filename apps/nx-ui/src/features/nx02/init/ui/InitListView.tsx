/**
 * File: apps/nx-ui/src/features/nx02/init/ui/InitListView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-UI-001：開帳存清單
 *
 * Notes:
 * - @FUNCTION_CODE NX02-INIT-UI-001-F02
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import { cx } from '@/shared/lib/cx';

import type { InitListVm } from '../hooks/useInitList';

function statusBadge(status: string) {
  if (status === 'P') return { label: '已過帳', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (status === 'V') return { label: '作廢', cls: 'bg-destructive/15 text-destructive' };
  return { label: '草稿', cls: 'bg-muted text-muted-foreground' };
}

export type InitListViewProps = { vm: InitListVm };

/**
 * @FUNCTION_CODE NX02-INIT-UI-001-F02
 */
export function InitListView({ vm }: InitListViewProps) {
  const {
    warehouseId,
    status,
    dateFrom,
    dateTo,
    page,
    pageSize,
    rows,
    total,
    loading,
    error,
    setQuery,
  } = vm;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-xl font-semibold text-foreground">開帳存</h1>
        </div>
        <Link
          href="/dashboard/nx02/init/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          新增開帳存
        </Link>
      </header>

      <div className="flex flex-wrap gap-3 rounded-xl border border-border/80 bg-card/40 p-4 text-sm">
        <WarehouseFilter value={warehouseId} onChange={(v) => setQuery({ warehouseId: v || null, page: '1' })} />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          狀態
          <select
            className="rounded-lg border border-border bg-background px-2 py-1.5"
            value={status}
            onChange={(e) => setQuery({ status: e.target.value || null, page: '1' })}
          >
            <option value="">全部</option>
            <option value="D">草稿</option>
            <option value="P">已過帳</option>
            <option value="V">作廢</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          起日
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-2 py-1.5"
            value={dateFrom}
            onChange={(e) => setQuery({ dateFrom: e.target.value || null, page: '1' })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          迄日
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-2 py-1.5"
            value={dateTo}
            onChange={(e) => setQuery({ dateTo: e.target.value || null, page: '1' })}
          />
        </label>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">單號</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">倉庫</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">開帳日期</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">料號數</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">狀態</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const b = statusBadge(r.status);
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/dashboard/nx02/init/${r.id}`} className="text-primary hover:underline">
                        {r.docNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.warehouseName}</td>
                    <td className="px-3 py-2">{r.initDate}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.itemCount}</td>
                    <td className="px-3 py-2">
                      <span className={cx('rounded-full px-2 py-0.5 text-xs', b.cls)}>{b.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString('zh-TW')}
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

function WarehouseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [opts, setOpts] = useState<{ id: string; name: string; code: string }[]>([]);
  useEffect(() => {
    let alive = true;
    listLookupWarehouse({ isActive: true })
      .then((w) => {
        if (alive) setOpts(w.map((x) => ({ id: x.id, name: x.name, code: x.code })));
      })
      .catch(() => {
        if (alive) setOpts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      倉庫
      <select
        className="min-w-[160px] rounded-lg border border-border bg-background px-2 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">全部</option>
        {opts.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.code})
          </option>
        ))}
      </select>
    </label>
  );
}
