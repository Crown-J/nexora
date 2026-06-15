// apps/nx-ui/src/features/inventory/picking/ui/PickingDetailView.tsx
// 撿包送 LITE-OP-UI 軌 1 2026-06-09：撿貨單詳細頁
//
// 業務操作：
// - 表頭：狀態 P→C→F、撿貨碼、完成時間
// - 明細：每行標「✓ 已完成」或「✗ 找不到貨 + 原因」
// - 狀態推進按鈕：草稿 → 撿貨中（startedAt）→ 已完成（completedAt + completedBy）
// state machine 不允許 P → F 直跳、必經 C；UI 提供「開始撿貨」+「完成撿貨」兩按鈕

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  completePicking,
  getPk,
  patchPk,
  patchPkItem,
  type PkDetail,
  type PkItem,
} from '@data/endpoints/inventory/workstation/api';

const ITEM_STATUS_LABEL: Record<'P' | 'C' | 'M', string> = {
  P: '待撿',
  C: '已完成',
  M: '找不到貨',
};

const ITEM_STATUS_TONE: Record<'P' | 'C' | 'M', string> = {
  P: 'bg-amber-500/15 text-amber-300',
  C: 'bg-emerald-500/15 text-emerald-300',
  M: 'bg-destructive/15 text-destructive',
};

export function PickingDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<PkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getPk(id);
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

  if (loading) return <p className="p-6 text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return (
      <div className="m-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {error ?? '找不到撿貨單'}
      </div>
    );
  }

  const startPicking = async () => {
    setBusy(true);
    setError(null);
    try {
      await patchPk(doc.id, { status: 'C' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const finishPicking = async () => {
    setBusy(true);
    setError(null);
    try {
      await completePicking(doc.id, doc.status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const markItem = async (item: PkItem, status: 'P' | 'C' | 'M', reason?: string) => {
    setBusy(true);
    setError(null);
    try {
      await patchPkItem(doc.id, item.id, {
        status,
        notFoundReason: status === 'M' ? reason : undefined,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const canStart = doc.status === 'P';
  const canFinish = doc.status === 'P' || doc.status === 'C';
  const itemsEditable = doc.status !== 'F' && doc.status !== 'V';

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · 撿貨單</p>
          <h1 className="text-xl font-mono font-semibold">{doc.docNo}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">日期 {doc.pkDate.slice(0, 10)}</span>
            <span className="rounded bg-muted px-2 py-0.5">
              來源 {doc.triggerSource === 'S' ? '銷貨' : '調撥'}
            </span>
            <span className="rounded bg-muted px-2 py-0.5">配送類型 {doc.deliveryType}</span>
            {doc.pickupCode ? (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-amber-300">
                撿貨碼 {doc.pickupCode}
              </span>
            ) : null}
            <span
              className={`rounded px-2 py-0.5 ${
                doc.status === 'F'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : doc.status === 'C'
                  ? 'bg-blue-500/15 text-blue-300'
                  : doc.status === 'V'
                  ? 'bg-muted/30 text-muted-foreground'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {doc.status === 'P' ? '待撿貨' : doc.status === 'C' ? '撿貨中' : doc.status === 'F' ? '已完成' : '作廢'}
            </span>
            {doc.startedAt ? (
              <span className="rounded bg-muted px-2 py-0.5">
                開始 {doc.startedAt.slice(0, 16).replace('T', ' ')}
              </span>
            ) : null}
            {doc.completedAt ? (
              <span className="rounded bg-muted px-2 py-0.5">
                完成 {doc.completedAt.slice(0, 16).replace('T', ' ')}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/dashboard/inventory/picking"
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          ← 返回列表
        </Link>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startPicking()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            開始撿貨（→ 撿貨中）
          </button>
        ) : null}
        {canFinish ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void finishPicking()}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            完成撿貨（→ 已完成）
          </button>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">明細（{doc.items.length} 行）</h2>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">料件</th>
                <th className="px-3 py-2 font-medium">庫位</th>
                <th className="px-3 py-2 text-right font-medium">數量</th>
                <th className="px-3 py-2 font-medium">來源</th>
                <th className="px-3 py-2 font-medium">狀態</th>
                <th className="px-3 py-2 font-medium">動作</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    尚無撿貨明細
                  </td>
                </tr>
              ) : (
                doc.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/50">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{it.partNo ?? it.partId}</div>
                      <div className="text-muted-foreground">{it.partName ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{it.locationId ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {it.refSoItemId ? `SO ${it.refSoItemId}` : it.refStId ? `ST ${it.refStId}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] ${ITEM_STATUS_TONE[it.status]}`}>
                        {ITEM_STATUS_LABEL[it.status]}
                      </span>
                      {it.status === 'M' && it.notFoundReason ? (
                        <div className="mt-1 text-[10px] text-destructive">{it.notFoundReason}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {itemsEditable && it.status === 'P' ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void markItem(it, 'C')}
                            className="rounded border border-emerald-500/40 px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                          >
                            ✓ 已撿
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const reason = window.prompt('找不到貨原因（必填）');
                              if (!reason?.trim()) return;
                              void markItem(it, 'M', reason.trim());
                            }}
                            className="rounded border border-destructive/40 px-2 py-0.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            ✗ 找不到
                          </button>
                        </div>
                      ) : itemsEditable && it.status !== 'P' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void markItem(it, 'P')}
                          className="text-muted-foreground hover:underline"
                        >
                          重設為待撿
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 撿完所有 line → 按「完成撿貨」推 F；後續到「包貨單」由倉管手動建包單（plType 對齊本單 deliveryType）。
      </div>
    </div>
  );
}
