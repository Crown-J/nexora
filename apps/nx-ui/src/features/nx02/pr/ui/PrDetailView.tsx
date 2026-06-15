'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { getPr, patchPrDisposition, postPr, voidPr } from '@data/endpoints/nx02/api/pr';
import type { PrDetailDto } from '@data/types/nx02';
import { prStatusLabel } from '../../shared/nx01-labels';

const DISPOSITION_LABEL: Record<'G' | 'B' | 'W', string> = {
  G: '一般退',
  B: '壞品退',
  W: '走保固',
};

const DISPOSITION_TONE: Record<'G' | 'B' | 'W', string> = {
  G: 'bg-muted text-muted-foreground',
  B: 'bg-[#E26060]/15 text-[#E26060]',
  W: 'bg-[#E8A020]/15 text-[#E8A020]',
};

export function PrDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<PrDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await getPr(id));
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

  const draft = doc.status === 'DRAFT' || doc.status === 'D';
  const disposition = (doc.dispositionFlag ?? 'G') as 'G' | 'B' | 'W';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX02</p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">退貨 {doc.docNo}</h1>
            <span className={`rounded px-2 py-0.5 text-xs ${DISPOSITION_TONE[disposition]}`}>
              {DISPOSITION_LABEL[disposition]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {prStatusLabel(doc.status)} · {doc.prDate?.slice(0, 10)}
            {doc.warehouseName ? ` · ${doc.warehouseName}` : ''}
            {doc.supplierName ? ` · ${doc.supplierName}` : ''}
            {doc.rrDocNo ? ` · 來源 ${doc.rrDocNo}` : ''}
          </p>
        </div>
        <Link href="/dashboard/purchase/pr" className="text-sm text-muted-foreground underline">
          返回
        </Link>
      </header>

      {draft ? (
        <>
          {/* 階段 I P2：退貨處置 G/B/W 三選一 */}
          <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
            <div className="mb-2 text-xs text-muted-foreground">退貨處置（過帳前可改）</div>
            <div className="flex flex-wrap gap-2">
              {(['G', 'B', 'W'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy || disposition === d}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await patchPrDisposition(doc.id, d);
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : '更新失敗');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    disposition === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {DISPOSITION_LABEL[d]}
                </button>
              ))}
            </div>
            {disposition === 'W' ? (
              <p className="mt-2 text-xs text-[#E8A020]">
                ⓘ 過帳時系統自動建立保固申請單（每個明細一張、status=草稿、後續可在保固頁補充說明送出）
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await postPr(doc.id);
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
              if (!confirm('作廢？')) return;
              setBusy(true);
              try {
                await voidPr(doc.id);
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
        </div>
        </>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
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
