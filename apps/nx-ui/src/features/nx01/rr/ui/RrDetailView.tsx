'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { getRr, postRr, voidRr } from '../../api/rr';
import type { RrDetailDto } from '../../types';
import { rrStatusLabel } from '../../shared/nx01-labels';

export function RrDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<RrDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await getRr(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error ?? '找不到'}</div>;
  }

  const draft = doc.status === 'D';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">進貨 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {rrStatusLabel(doc.status)} · {doc.rrDate} · {doc.warehouseName} · {doc.supplierName}
          </p>
        </div>
        <Link href="/dashboard/nx01/rr" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {draft ? (
          <>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await postRr(doc.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : '過帳失敗');
                } finally {
                  setBusy(false);
                }
              }}
            >
              過帳
            </button>
            <button
              type="button"
              className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                if (!confirm('作廢草稿？')) return;
                setBusy(true);
                try {
                  await voidRr(doc.id);
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : '失敗');
                } finally {
                  setBusy(false);
                }
              }}
            >
              作廢
            </button>
          </>
        ) : null}
        {doc.status === 'P' ? (
          <Link
            href={`/dashboard/nx01/pr/new?rr=${encodeURIComponent(doc.id)}`}
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium"
          >
            由此進貨單建立退貨 →
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
              <th className="px-3 py-2">庫位</th>
              <th className="px-3 py-2 text-right">數量</th>
              <th className="px-3 py-2 text-right">單價</th>
              <th className="px-3 py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="px-3 py-2">{it.lineNo}</td>
                <td className="px-3 py-2 font-mono text-xs">{it.partNo}</td>
                <td className="px-3 py-2">{it.locationCode ?? it.locationId}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
    </div>
  );
}
