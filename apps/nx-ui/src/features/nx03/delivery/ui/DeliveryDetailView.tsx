// apps/nx-ui/src/features/inventory/delivery/ui/DeliveryDetailView.tsx
// 撿包送 LITE-OP-UI 軌 3 2026-06-09：配送單詳細頁（DELIVERY + RETURN_PICKUP 兩 kind）
//
// 業務操作：
// - 表頭：driverUserId / vehicleNo / 來源 SO/SR
// - 停靠點：地址 / 客戶 / 聯絡人 / 簽收（signerType / signerName / signatureUrl / signedAt）
// - 推進：DRAFT → DISPATCHED（派車）→ DELIVERED/PICKED_UP（必填 signature）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  getDn,
  getReturnPickup,
  patchDn,
  patchReturnPickup,
  type Dn,
  type DnStatus,
  type DnStop,
  type ReturnPickup,
  type ReturnPickupStatus,
  type SignaturePayload,
} from '@data/endpoints/nx03/workstation/api';

type DnKind = 'DELIVERY' | 'RETURN_PICKUP';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  DISPATCHED: '已派車',
  DELIVERED: '已送達',
  PICKED_UP: '已取回',
  FAILED: '失敗',
  VOIDED: '作廢',
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-muted/30 text-foreground',
  DISPATCHED: 'bg-amber-500/15 text-amber-300',
  DELIVERED: 'bg-emerald-500/15 text-emerald-300',
  PICKED_UP: 'bg-emerald-500/15 text-emerald-300',
  FAILED: 'bg-destructive/15 text-destructive',
  VOIDED: 'bg-muted/30 text-muted-foreground',
};

type AnyDn = (Dn & { stops?: DnStop[] }) | (ReturnPickup & { stops?: DnStop[] });

export function DeliveryDetailView({ id, kind }: { id: string; kind: DnKind }) {
  const [doc, setDoc] = useState<AnyDn | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleDraft, setVehicleDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r =
        kind === 'DELIVERY'
          ? await getDn(id)
          : await getReturnPickup(id);
      setDoc(r as AnyDn);
      setVehicleDraft(r.vehicleNo ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return (
      <div className="m-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {error ?? '找不到配送單'}
      </div>
    );
  }

  const terminalStatus = kind === 'DELIVERY' ? 'DELIVERED' : 'PICKED_UP';

  const dispatch = async () => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'DELIVERY') {
        await patchDn(doc.id, {
          status: 'DISPATCHED',
          vehicleNo: vehicleDraft.trim() || undefined,
        });
      } else {
        await patchReturnPickup(doc.id, {
          status: 'DISPATCHED',
          vehicleNo: vehicleDraft.trim() || undefined,
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    const signerName = window.prompt('簽收人姓名（必填）');
    if (!signerName?.trim()) return;
    const signerType = window.confirm('簽收人是「客戶」？\n按確定=客戶簽收、按取消=倉管簽收') ? 'C' : 'W';
    setBusy(true);
    setError(null);
    try {
      const sig: SignaturePayload = { signerType, signerName: signerName.trim() };
      if (kind === 'DELIVERY') {
        await patchDn(doc.id, { status: 'DELIVERED', signature: sig });
      } else {
        await patchReturnPickup(doc.id, { status: 'PICKED_UP', signature: sig });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗');
    } finally {
      setBusy(false);
    }
  };

  const canDispatch = doc.status === 'DRAFT';
  const canComplete = doc.status === 'DISPATCHED';

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">
            INVENTORY · {kind === 'DELIVERY' ? '配送單' : '退貨取件單'}
          </p>
          <h1 className="text-xl font-mono font-semibold">{doc.docNo}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">日期 {doc.dnDate.slice(0, 10)}</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono">送貨員 {doc.driverUserId}</span>
            {doc.vehicleNo ? (
              <span className="rounded bg-muted px-2 py-0.5 font-mono">車號 {doc.vehicleNo}</span>
            ) : null}
            {kind === 'DELIVERY' && (doc as Dn).sourceSoId ? (
              <span className="rounded bg-blue-500/15 px-2 py-0.5 font-mono text-blue-300">
                來源 SO {(doc as Dn).sourceSoId}
              </span>
            ) : null}
            {kind === 'RETURN_PICKUP' && (doc as ReturnPickup).sourceSrId ? (
              <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-indigo-300">
                來源 SR {(doc as ReturnPickup).sourceSrId}
              </span>
            ) : null}
            <span className={`rounded px-2 py-0.5 ${STATUS_TONE[doc.status] ?? 'bg-muted'}`}>
              {STATUS_LABEL[doc.status] ?? doc.status}
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/inventory/delivery"
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

      <section className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">指派與推進</h2>
        <label className="block text-sm">
          <span className="text-xs text-muted-foreground">車號（DRAFT 時可改）</span>
          <input
            value={vehicleDraft}
            onChange={(e) => setVehicleDraft(e.target.value)}
            disabled={doc.status !== 'DRAFT'}
            placeholder="例 ABC-1234"
            className="mt-1 w-full max-w-xs rounded-md border bg-background px-2 py-1 font-mono disabled:opacity-50"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {canDispatch ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void dispatch()}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              派車（→ 已派車）
            </button>
          ) : null}
          {canComplete ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void complete()}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {kind === 'DELIVERY' ? '完成簽收（→ 已送達）' : '完成取件（→ 已取回）'}
            </button>
          ) : null}
        </div>
        {kind === 'DELIVERY' && doc.status === terminalStatus ? (
          <p className="text-xs text-emerald-300">
            ✓ 簽收完成、系統已把 SO 對應 line 標已送達；全部 lines 送達後 SO header 自動推「已完成」。
          </p>
        ) : null}
      </section>

      {/* 停靠點 + 簽收 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">停靠點（{doc.stops?.length ?? 0} 站）</h2>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">地址 / 聯絡</th>
                <th className="px-3 py-2 font-medium">到達</th>
                <th className="px-3 py-2 font-medium">完成</th>
                <th className="px-3 py-2 font-medium">簽收</th>
              </tr>
            </thead>
            <tbody>
              {!doc.stops || doc.stops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    尚無停靠點
                  </td>
                </tr>
              ) : (
                doc.stops.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{s.address}</div>
                      <div className="text-muted-foreground">
                        {s.contactName ?? '—'} · {s.contactPhone ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                      {s.arrivedAt ? s.arrivedAt.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                      {s.completedAt ? s.completedAt.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {(s as DnStop & { signedAt?: string | null; signedByName?: string | null }).signedAt ? (
                        <div>
                          <div className="text-emerald-300">
                            ✓ {(s as DnStop & { signedByName?: string | null }).signedByName ?? '已簽'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {(s as DnStop & { signedAt?: string | null }).signedAt?.slice(0, 16).replace('T', ' ')}
                          </div>
                        </div>
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
        💡 此版簽收用 prompt 取簽收人姓名 + 確認對話框選簽收人類型（C 客戶 / W 倉管）；數位簽名圖
        signatureUrl 留下一軌（行動裝置簽名板）。GPS 即時追蹤 / 路線優化 / Lalamove API 屬付費套件。
      </div>
    </div>
  );
}
