'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { listPr } from '../../api/pr';
import type { PrListRow } from '../../types';
import { prStatusLabel } from '../../shared/nx01-labels';

export function PrListView() {
  const [rows, setRows] = useState<PrListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listPr({ page, pageSize: 20, status: status || undefined });
      setRows(r.data);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">退貨單</h1>
        </div>
        <Link href="/dashboard/nx01/pr/new" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          + 新增退貨
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <label className="text-xs text-muted-foreground">
        狀態
        <select
          className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">全部</option>
          <option value="D">草稿</option>
          <option value="P">已過帳</option>
        </select>
      </label>

      {loading ? <p className="text-sm text-muted-foreground">載入中…</p> : null}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">單號</th>
              <th className="px-3 py-2">日期</th>
              <th className="px-3 py-2">供應商</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2 text-right">總額</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/nx01/pr/${encodeURIComponent(r.id)}`} className="font-mono text-primary hover:underline">
                    {r.docNo}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.prDate}</td>
                <td className="px-3 py-2">{r.supplierName}</td>
                <td className="px-3 py-2">{prStatusLabel(r.status)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.totalAmount}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  尚無資料
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一頁
          </button>
          <span className="tabular-nums text-muted-foreground">
            {page} / {pages}
          </span>
          <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            下一頁
          </button>
        </div>
      ) : null}
    </div>
  );
}
