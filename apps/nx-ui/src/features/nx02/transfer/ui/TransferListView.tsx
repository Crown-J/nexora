/**
 * File: apps/nx-ui/src/features/nx02/transfer/ui/TransferListView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-XFER-UI-001：調撥單列表
 *
 * @FUNCTION_CODE NX02-XFER-UI-001-F01
 */

'use client';

import Link from 'next/link';

import { cx } from '@/shared/lib/cx';

import { useTransferList } from '../hooks/useTransfer';

export type TransferListViewProps = { vm: ReturnType<typeof useTransferList> };

function statusBadge(status: string) {
  if (status === 'P') return { label: '已過帳', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (status === 'V') return { label: '作廢', cls: 'bg-destructive/15 text-destructive' };
  return { label: '草稿', cls: 'bg-muted text-muted-foreground' };
}

/**
 * @FUNCTION_CODE NX02-XFER-UI-001-F01
 */
export function TransferListView({ vm }: TransferListViewProps) {
  const { data, loading, error, page, setPage, status, setStatus } = vm;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <h1 className="text-xl font-semibold">調撥單</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部狀態</option>
            <option value="D">草稿</option>
            <option value="P">已過帳</option>
            <option value="V">作廢</option>
          </select>
          <Link
            href="/dashboard/nx02/transfer/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            新增調撥
          </Link>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
      {loading && !data ? <p className="text-sm text-muted-foreground">載入中…</p> : null}

      {data ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">單號</th>
                  <th className="px-3 py-2 font-medium">來源倉</th>
                  <th className="px-3 py-2 font-medium">目標倉</th>
                  <th className="px-3 py-2 font-medium">調撥日期</th>
                  <th className="px-3 py-2 text-right font-medium">料號數</th>
                  <th className="px-3 py-2 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      尚無資料
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => {
                    const b = statusBadge(r.status);
                    return (
                      <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/nx02/transfer/${r.id}`} className="font-mono text-primary underline">
                            {r.docNo}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{r.fromWarehouseName}</td>
                        <td className="px-3 py-2">{r.toWarehouseName}</td>
                        <td className="px-3 py-2">{r.stDate}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.itemCount}</td>
                        <td className="px-3 py-2">
                          <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', b.cls)}>{b.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              第 {data.page} / {totalPages} 頁，共 {data.total} 筆
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded border border-border px-3 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一頁
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                className="rounded border border-border px-3 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
