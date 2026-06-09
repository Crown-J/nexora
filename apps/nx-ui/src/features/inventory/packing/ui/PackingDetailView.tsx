// apps/nx-ui/src/features/inventory/packing/ui/PackingDetailView.tsx
// 撿包送 LITE-OP-UI 軌 2 2026-06-09：包貨單詳細頁
//
// 業務操作：
// - 表頭：狀態 P→C→F→S、物流業者/追蹤號
// - 明細：每行展示料件 + 包裹分配（parcelId、來自 Parcel 自動產 BX-yyyymm-倉-5碼）
// - 狀態推進：開始包貨 → 完成包貨（自動建一個 Parcel、產生包裹編號）→ 已寄出（寄貨時填追蹤號）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  completePackingAndCreateParcel,
  getPl,
  listParcels,
  patchPl,
  type Parcel,
  type PlDetail,
} from '@/features/inventory/workstation/api';

export function PackingDetailView({ id }: { id: string }) {
  const [doc, setDoc] = useState<PlDetail | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logisticsDraft, setLogisticsDraft] = useState<{ provider: string; trackingNo: string }>({
    provider: '',
    trackingNo: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getPl(id);
      setDoc(r);
      setLogisticsDraft({
        provider: r.logisticsProvider ?? '',
        trackingNo: r.logisticsTrackingNo ?? '',
      });
      // 列此 Pl 下的所有 parcel（後端目前 list 是全部、此版前端過濾）
      const ps = await listParcels({ pageSize: 100 });
      setParcels(ps.items.filter((p) => p.plId === id));
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
        {error ?? '找不到包貨單'}
      </div>
    );
  }

  const startPacking = async () => {
    setBusy(true);
    setError(null);
    try {
      await patchPl(doc.id, { status: 'C' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const finishPacking = async () => {
    setBusy(true);
    setError(null);
    try {
      const { parcel } = await completePackingAndCreateParcel(doc.id, doc.status, doc.plType);
      alert(`包貨完成！包裹編號：${parcel.parcelNo}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const markShipped = async () => {
    if (!logisticsDraft.provider.trim() || !logisticsDraft.trackingNo.trim()) {
      setError('寄貨需填物流業者與追蹤號');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchPl(doc.id, {
        status: 'S',
        logisticsProvider: logisticsDraft.provider.trim(),
        logisticsTrackingNo: logisticsDraft.trackingNo.trim(),
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
  const canShip = doc.status === 'F' && doc.plType === 'C';

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · 包貨單</p>
          <h1 className="text-xl font-mono font-semibold">{doc.docNo}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">日期 {doc.plDate.slice(0, 10)}</span>
            <span className="rounded bg-muted px-2 py-0.5">類型 {doc.plType}</span>
            {doc.pkNo ? (
              <span className="rounded bg-muted px-2 py-0.5 font-mono">來源 Pk {doc.pkNo}</span>
            ) : null}
            <span
              className={`rounded px-2 py-0.5 ${
                doc.status === 'S'
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : doc.status === 'F'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : doc.status === 'C'
                  ? 'bg-blue-500/15 text-blue-300'
                  : doc.status === 'V'
                  ? 'bg-muted/30 text-muted-foreground'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {{ P: '待包貨', C: '包貨中', F: '已完成', S: '已寄出', V: '作廢' }[doc.status]}
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/inventory/packing"
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
            onClick={() => void startPacking()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            開始包貨（→ 包貨中）
          </button>
        ) : null}
        {canFinish ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void finishPacking()}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            完成包貨（→ 已完成 + 自動產包裹編號）
          </button>
        ) : null}
      </div>

      {/* 已產生的包裹 */}
      {parcels.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h2 className="text-sm font-semibold text-emerald-300">包裹（{parcels.length} 個）</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {parcels.map((p) => (
              <div key={p.id} className="rounded border border-emerald-500/30 bg-card/40 p-3">
                <div className="font-mono text-sm text-emerald-300">{p.parcelNo}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  類型 {p.parcelType} · 建立 {p.createdAt.slice(0, 16).replace('T', ' ')}
                </div>
                {p.logisticsTrackingNo ? (
                  <div className="mt-1 font-mono text-xs">追蹤 {p.logisticsTrackingNo}</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 寄貨：物流業者 / 追蹤號 + 推 S */}
      {canShip ? (
        <section className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">寄貨資訊（plType=C 寄貨類型才需填）</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">物流業者</span>
              <input
                value={logisticsDraft.provider}
                onChange={(e) => setLogisticsDraft((p) => ({ ...p, provider: e.target.value }))}
                placeholder="新竹貨運 / 黑貓 …"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">追蹤號</span>
              <input
                value={logisticsDraft.trackingNo}
                onChange={(e) => setLogisticsDraft((p) => ({ ...p, trackingNo: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void markShipped()}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            標已寄出（→ S）
          </button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">明細（{doc.items.length} 行）</h2>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">料件</th>
                <th className="px-3 py-2 text-right font-medium">數量</th>
                <th className="px-3 py-2 font-medium">分配包裹</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                    尚無包貨明細（系統從撿貨單明細自動帶入）
                  </td>
                </tr>
              ) : (
                doc.items.map((it) => {
                  const parcel = parcels.find((p) => p.id === it.parcelId);
                  return (
                    <tr key={it.id} className="border-b border-border/50">
                      <td className="px-3 py-2 text-xs">
                        <div className="font-mono">{it.partNo ?? it.partId}</div>
                        <div className="text-muted-foreground">{it.partName ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {parcel ? parcel.parcelNo : it.parcelId ?? '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        💡 完成包貨會自動建一個包裹（包裹編號 BX-yyyymm-倉-5 碼）；plType=C 寄貨類型才需填物流業者+追蹤號、推 S 已寄出。
        plType=D 配送類型由 SO 自動建配送單、進入「配送單」管理。
      </div>
    </div>
  );
}
