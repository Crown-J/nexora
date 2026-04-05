'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { listPartner } from '@/features/nx00/partner/api/partner';
import type { PartnerDto } from '@/features/nx00/partner/types';
import { listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';
import { planSupportsNx02PlusFeatures } from '@/shared/lib/plan-plus-support';

import { getRfq, patchRfqStatus, rfqToPo, rfqToRr, voidRfq } from '../../api/rfq';
import type { RfqDetailDto } from '../../types';
import { rfqStatusLabel } from '../../shared/nx01-labels';

function isSupplier(p: PartnerDto): boolean {
  return p.partnerType === 'S' || p.partnerType === 'SUP';
}

export function RfqDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { planCode } = useSessionMe();
  const showPlus = planSupportsNx02PlusFeatures(planCode);

  const [doc, setDoc] = useState<RfqDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRr, setShowRr] = useState(false);
  const [rrWh, setRrWh] = useState('');
  const [rrSupplier, setRrSupplier] = useState('');
  const [rrPick, setRrPick] = useState<Record<string, { on: boolean; qty: string }>>({});

  const [showPo, setShowPo] = useState(false);
  const [poPick, setPoPick] = useState<Record<string, { on: boolean; qty: string }>>({});

  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getRfq(id);
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
    listPartner({ page: 1, pageSize: 500 })
      .then((r) => setSuppliers(r.items.filter(isSupplier)))
      .catch(() => setSuppliers([]));
  }, []);

  const initRrPick = useCallback(() => {
    if (!doc) return;
    const next: Record<string, { on: boolean; qty: string }> = {};
    for (const it of doc.items) {
      const can = it.unitPrice != null;
      next[it.id] = { on: can, qty: String(it.qty) };
    }
    setRrPick(next);
    setRrWh('');
    setRrSupplier(doc.supplierId ?? '');
    setShowRr(true);
  }, [doc]);

  const initPoPick = useCallback(() => {
    if (!doc) return;
    const next: Record<string, { on: boolean; qty: string }> = {};
    for (const it of doc.items) {
      const can = it.unitPrice != null;
      next[it.id] = { on: can, qty: String(it.qty) };
    }
    setPoPick(next);
    setShowPo(true);
  }, [doc]);

  const canVoid = doc?.status === 'D';
  const canToRr = doc && doc.status !== 'V' && doc.items.some((x) => x.unitPrice != null);
  const canToPo = showPlus && doc && doc.status !== 'V' && doc.supplierId && doc.items.some((x) => x.unitPrice != null);

  const statusOptions = useMemo(() => {
    if (!doc || doc.status === 'V') return [];
    return ['D', 'S', 'R', 'C'].filter((s) => s !== doc.status);
  }, [doc]);

  if (loading) return <p className="text-sm text-muted-foreground">載入中…</p>;
  if (error || !doc) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {error ?? '找不到單據'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">詢價 {doc.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            狀態：{rfqStatusLabel(doc.status)} · 日期 {doc.rfqDate}
          </p>
        </div>
        <Link href="/dashboard/nx01/rfq" className="text-sm text-muted-foreground underline">
          返回列表
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {statusOptions.length > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">變更狀態</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1"
              defaultValue=""
              onChange={async (e) => {
                const v = e.target.value;
                if (!v) return;
                e.target.value = '';
                setBusy(true);
                try {
                  await patchRfqStatus(doc.id, v);
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : '更新失敗');
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <option value="">選擇…</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {rfqStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {canVoid ? (
          <button
            type="button"
            className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              if (!confirm('確定作廢此草稿？')) return;
              setBusy(true);
              try {
                await voidRfq(doc.id);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : '作廢失敗');
              } finally {
                setBusy(false);
              }
            }}
          >
            作廢
          </button>
        ) : null}
        {canToRr ? (
          <button
            type="button"
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={busy}
            onClick={initRrPick}
          >
            轉進貨 RR
          </button>
        ) : null}
        {canToPo ? (
          <button
            type="button"
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={busy}
            onClick={initPoPick}
          >
            轉採購 PO
          </button>
        ) : null}
        {!showPlus ? (
          <span className="self-center text-xs text-muted-foreground">轉採購需 PLUS 方案</span>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-border/70 p-4 text-sm md:grid-cols-2">
        <div>
          <span className="text-muted-foreground">供應商</span>
          <p>{doc.supplierName ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">聯絡</span>
          <p>
            {doc.contactName ?? '—'} {doc.contactPhone ? `· ${doc.contactPhone}` : ''}
          </p>
        </div>
        <div className="md:col-span-2">
          <span className="text-muted-foreground">備註</span>
          <p>{doc.remark ?? '—'}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">料號</th>
              <th className="px-3 py-2">品名</th>
              <th className="px-3 py-2 text-right">數量</th>
              <th className="px-3 py-2 text-right">單價</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it) => (
              <tr key={it.id} className="border-b border-border/50">
                <td className="px-3 py-2 tabular-nums">{it.lineNo}</td>
                <td className="px-3 py-2 font-mono text-xs">{it.partNo}</td>
                <td className="px-3 py-2">{it.partName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {it.unitPrice != null ? it.unitPrice : '待回覆'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">轉進貨單</h2>
            <p className="mt-1 text-sm text-muted-foreground">選擇進貨倉與供應商，並勾選已報價之明細與數量。</p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                倉庫
                <select
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm"
                  value={rrWh}
                  onChange={(e) => setRrWh(e.target.value)}
                >
                  <option value="">請選擇</option>
                  {whOpts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                供應商
                <select
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm"
                  value={rrSupplier}
                  onChange={(e) => setRrSupplier(e.target.value)}
                >
                  <option value="">請選擇</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {doc.items.map((it) => {
                const priced = it.unitPrice != null;
                const row = rrPick[it.id] ?? { on: false, qty: String(it.qty) };
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-2 border-b border-border/50 py-2">
                    <input
                      type="checkbox"
                      disabled={!priced}
                      checked={row.on}
                      onChange={(e) =>
                        setRrPick((p) => ({
                          ...p,
                          [it.id]: { ...row, on: e.target.checked },
                        }))
                      }
                    />
                    <span className="font-mono text-xs">{it.partNo}</span>
                    <span className="text-muted-foreground">{priced ? '' : '（無單價）'}</span>
                    <input
                      className="ml-auto w-20 rounded border border-border px-1 py-0.5 tabular-nums"
                      disabled={!row.on}
                      value={row.qty}
                      onChange={(e) =>
                        setRrPick((p) => ({
                          ...p,
                          [it.id]: { ...row, qty: e.target.value },
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setShowRr(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  if (!rrWh.trim() || !rrSupplier.trim()) {
                    setError('請選擇倉庫與供應商');
                    return;
                  }
                  const items = [];
                  for (const it of doc.items) {
                    const row = rrPick[it.id];
                    if (!row?.on) continue;
                    const q = Number(row.qty);
                    if (!Number.isFinite(q) || q <= 0) {
                      setError(`數量無效：${it.partNo}`);
                      return;
                    }
                    items.push({ rfqItemId: it.id, qty: q });
                  }
                  if (!items.length) {
                    setError('請至少勾選一筆明細');
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  try {
                    const r = await rfqToRr(doc.id, {
                      warehouseId: rrWh.trim(),
                      supplierId: rrSupplier.trim(),
                      items,
                    });
                    setShowRr(false);
                    router.push(`/dashboard/nx01/rr/${encodeURIComponent(r.id)}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '轉進貨失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                建立進貨單
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
            <h2 className="text-lg font-semibold">轉採購單</h2>
            <p className="mt-1 text-sm text-muted-foreground">將使用詢價單上的供應商與系統預設倉別產生採購單號。勾選已報價明細。</p>
            <ul className="mt-4 space-y-2 text-sm">
              {doc.items.map((it) => {
                const priced = it.unitPrice != null;
                const row = poPick[it.id] ?? { on: false, qty: String(it.qty) };
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-2 border-b border-border/50 py-2">
                    <input
                      type="checkbox"
                      disabled={!priced}
                      checked={row.on}
                      onChange={(e) =>
                        setPoPick((p) => ({
                          ...p,
                          [it.id]: { ...row, on: e.target.checked },
                        }))
                      }
                    />
                    <span className="font-mono text-xs">{it.partNo}</span>
                    <input
                      className="ml-auto w-20 rounded border border-border px-1 py-0.5 tabular-nums"
                      disabled={!row.on}
                      value={row.qty}
                      onChange={(e) =>
                        setPoPick((p) => ({
                          ...p,
                          [it.id]: { ...row, qty: e.target.value },
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setShowPo(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  const items = [];
                  for (const it of doc.items) {
                    const row = poPick[it.id];
                    if (!row?.on) continue;
                    const q = Number(row.qty);
                    if (!Number.isFinite(q) || q <= 0) {
                      setError(`數量無效：${it.partNo}`);
                      return;
                    }
                    items.push({ rfqItemId: it.id, qty: q });
                  }
                  if (!items.length) {
                    setError('請至少勾選一筆明細');
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  try {
                    const r = await rfqToPo(doc.id, { items });
                    setShowPo(false);
                    router.push(`/dashboard/nx01/po/${encodeURIComponent(r.id)}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '轉採購失敗');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                建立採購單
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}
    </div>
  );
}
