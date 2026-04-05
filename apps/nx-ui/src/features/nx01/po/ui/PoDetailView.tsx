'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';

import { getPo, patchPoStatus, poToRr, voidPo } from '../../api/po';
import type { PoDetailDto } from '../../types';
import { poStatusLabel } from '../../shared/nx01-labels';

export function PoDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<PoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRr, setShowRr] = useState(false);
  const [rrWh, setRrWh] = useState('');
  const [rrPick, setRrPick] = useState<Record<string, { on: boolean; qty: string }>>({});
  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getPo(id);
      setDoc(r);
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

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then(setWhOpts)
      .catch(() => setWhOpts([]));
  }, []);

  const openToRr = () => {
    if (!doc) return;
    const next: Record<string, { on: boolean; qty: string }> = {};
    for (const it of doc.items) {
      const remain = it.qty - it.receivedQty;
      next[it.id] = { on: remain > 0, qty: remain > 0 ? String(remain) : '0' };
    }
    setRrPick(next);
    setRrWh('');
    setShowRr(true);
  };

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{error ?? '找不到'}</div>;
  }

  const canVoid = doc.status === 'D';
  const canMarkSent = doc.status === 'D';
  const canToRr = doc.status === 'S' && doc.items.some((it) => it.qty - it.receivedQty > 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">採購 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {poStatusLabel(doc.status)} · {doc.poDate} · {doc.supplierName}
          </p>
        </div>
        <Link href="/dashboard/nx01/po" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {canMarkSent ? (
          <button
            type="button"
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await patchPoStatus(doc.id, 'S');
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : '失敗');
              } finally {
                setBusy(false);
              }
            }}
          >
            標示為已送出
          </button>
        ) : null}
        {canToRr ? (
          <button type="button" className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50" disabled={busy} onClick={openToRr}>
            轉進貨
          </button>
        ) : null}
        {doc.status === 'D' ? (
          <p className="self-center text-xs text-muted-foreground">轉進貨前請先「標示為已送出」</p>
        ) : null}
        {canVoid ? (
          <button
            type="button"
            className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              if (!confirm('作廢採購單？')) return;
              setBusy(true);
              try {
                await voidPo(doc.id);
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
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
              <th className="px-3 py-2 text-right">採購量</th>
              <th className="px-3 py-2 text-right">已收</th>
              <th className="px-3 py-2 text-right">單價</th>
              <th className="px-3 py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="px-3 py-2">{it.lineNo}</td>
                <td className="px-3 py-2 font-mono text-xs">{it.partNo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.receivedQty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.unitCost}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">轉進貨</h2>
            <p className="mt-1 text-sm text-muted-foreground">選擇收貨倉庫與本次進貨數量（不可超過未收量）。</p>
            <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
              倉庫
              <select className="rounded-md border bg-background px-2 py-2 text-sm" value={rrWh} onChange={(e) => setRrWh(e.target.value)}>
                <option value="">請選擇</option>
                {whOpts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <ul className="mt-4 space-y-2 text-sm">
              {doc.items.map((it) => {
                const remain = it.qty - it.receivedQty;
                const row = rrPick[it.id] ?? { on: false, qty: '0' };
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-2 border-b py-2">
                    <input
                      type="checkbox"
                      disabled={remain <= 0}
                      checked={row.on}
                      onChange={(e) => setRrPick((p) => ({ ...p, [it.id]: { ...row, on: e.target.checked } }))}
                    />
                    <span className="font-mono text-xs">{it.partNo}</span>
                    <span className="text-xs text-muted-foreground">可收 {remain}</span>
                    <input
                      className="ml-auto w-20 rounded border px-1 tabular-nums"
                      disabled={!row.on}
                      value={row.qty}
                      onChange={(e) => setRrPick((p) => ({ ...p, [it.id]: { ...row, qty: e.target.value } }))}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setShowRr(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  if (!rrWh.trim()) {
                    setError('請選倉庫');
                    return;
                  }
                  const items = [];
                  for (const it of doc.items) {
                    const row = rrPick[it.id];
                    if (!row?.on) continue;
                    const q = Number(row.qty);
                    if (!Number.isFinite(q) || q <= 0) continue;
                    items.push({ poItemId: it.id, qty: q });
                  }
                  if (!items.length) {
                    setError('請勾選明細');
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  try {
                    const r = await poToRr(doc.id, { warehouseId: rrWh.trim(), items });
                    setShowRr(false);
                    router.push(`/dashboard/nx01/rr/${encodeURIComponent(r.id)}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                建立進貨
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div> : null}
    </div>
  );
}
