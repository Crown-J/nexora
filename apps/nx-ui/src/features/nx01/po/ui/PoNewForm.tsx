'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { listPartner } from '@/features/nx00/partner/api/partner';
import type { PartnerDto } from '@/features/nx00/partner/types';
import { listLookupPart, listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';

import { getRfq, listRfq } from '../../api/rfq';
import { createPo } from '../../api/po';
import type { RfqListRow } from '../../types';

type Source = 'direct' | 'rfq';

type Line = {
  key: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  unitCost: string;
  rfqItemId?: string | null;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSupplier(p: PartnerDto): boolean {
  return p.partnerType === 'S' || p.partnerType === 'SUP';
}

export function PoNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [source, setSource] = useState<Source>('direct');
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [rfqRows, setRfqRows] = useState<RfqListRow[]>([]);

  const [warehouseId, setWarehouseId] = useState('');
  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);
  const [poDate, setPoDate] = useState(todayYmd);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [partQ, setPartQ] = useState('');
  const [partHits, setPartHits] = useState<LookupRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedDone, setSeedDone] = useState(false);

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then(setWhOpts)
      .catch(() => setWhOpts([]));
    listPartner({ page: 1, pageSize: 500 })
      .then((r) => setSuppliers(r.items.filter(isSupplier)))
      .catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    if (source === 'rfq') {
      listRfq({ page: 1, pageSize: 100, status: 'R' })
        .then((r) => setRfqRows(r.data))
        .catch(() => setRfqRows([]));
    }
  }, [source]);

  const applyFromRfq = useCallback(async (rid: string) => {
    setError(null);
    try {
      const d = await getRfq(rid);
      setRfqId(rid);
      setSupplierId(d.supplierId ?? '');
      const next: Line[] = [];
      for (const it of d.items) {
        if (it.status !== 'R' || it.unitPrice == null) continue;
        next.push({
          key: `rfq-${it.id}`,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          qty: String(it.qty),
          unitCost: String(it.unitPrice),
          rfqItemId: it.id,
        });
      }
      if (!next.length) {
        setError('此詢價單無已回覆且有單價之明細');
      }
      setLines(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入詢價單失敗');
    }
  }, []);

  useEffect(() => {
    if (seedDone) return;
    const q = searchParams.get('rfq')?.trim();
    if (q) {
      setSource('rfq');
      setSeedDone(true);
      void applyFromRfq(q);
      setRfqId(q);
    } else {
      setSeedDone(true);
    }
  }, [searchParams, seedDone, applyFromRfq]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!partQ.trim()) {
        setPartHits([]);
        return;
      }
      void listLookupPart({ q: partQ, pageSize: 15 }).then(setPartHits).catch(() => setPartHits([]));
    }, 280);
    return () => clearTimeout(t);
  }, [partQ]);

  const addPart = useCallback((p: LookupRow) => {
    setLines((prev) => [
      ...prev,
      {
        key: `${p.id}-${Date.now()}`,
        partId: p.id,
        partNo: p.code,
        partName: p.name ?? '',
        qty: '1',
        unitCost: '0',
        rfqItemId: null,
      },
    ]);
    setPartQ('');
    setPartHits([]);
  }, []);

  const submit = async () => {
    setError(null);
    if (!warehouseId.trim()) {
      setError('請選擇倉庫。');
      return;
    }
    if (!supplierId.trim()) {
      setError('請選擇供應商。');
      return;
    }
    if (!lines.length) {
      setError('至少一筆明細。');
      return;
    }
    const items = [];
    for (const ln of lines) {
      const qty = Number(ln.qty);
      const unitCost = Number(ln.unitCost);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`料號 ${ln.partNo} 數量須大於 0`);
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setError(`料號 ${ln.partNo} 單價無效`);
        return;
      }
      items.push({
        partId: ln.partId,
        qty,
        unitCost,
        rfqItemId: ln.rfqItemId ?? undefined,
      });
    }
    setSaving(true);
    try {
      const r = await createPo({
        warehouseId: warehouseId.trim(),
        poDate,
        supplierId: supplierId.trim(),
        remark: remark.trim() || null,
        rfqId: source === 'direct' ? null : rfqId,
        items,
      });
      router.push(`/dashboard/nx01/po/${encodeURIComponent(r.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">NX01</p>
          <h1 className="text-xl font-semibold">新增採購單</h1>
        </div>
        <Link href="/dashboard/nx01/po" className="text-sm text-muted-foreground underline">
          返回列表
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <fieldset className="space-y-2 rounded-xl border border-border/70 p-4">
        <legend className="px-1 text-sm font-medium">來源</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="po-src"
            checked={source === 'direct'}
            onChange={() => {
              setSource('direct');
              setRfqId(null);
              setLines([]);
            }}
          />
          直接採購
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="po-src"
            checked={source === 'rfq'}
            onChange={() => {
              setSource('rfq');
              setRfqId(null);
              setLines([]);
            }}
          />
          從詢價單帶入（已回覆）
        </label>
      </fieldset>

      {source === 'rfq' ? (
        <label className="block text-xs text-muted-foreground">
          選擇詢價單
          <select
            className="mt-1 w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={rfqId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setRfqId(v || null);
              if (v) void applyFromRfq(v);
            }}
          >
            <option value="">請選擇</option>
            {rfqRows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.docNo} · {r.rfqDate} · {r.supplierName ?? '—'}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          倉庫（產生單號）
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
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
          採購日期
          <input type="date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          供應商
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">請選擇</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          備註
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 p-4">
        <h2 className="text-sm font-semibold">明細</h2>
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="搜尋零件以新增列…"
          value={partQ}
          onChange={(e) => setPartQ(e.target.value)}
        />
        {partHits.length > 0 ? (
          <ul className="max-h-40 overflow-auto rounded-lg border border-border text-sm">
            {partHits.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => addPart(p)}>
                  <span className="font-mono">{p.code}</span> {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2">料號</th>
              <th className="py-2">數量</th>
              <th className="py-2">單價</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((ln) => (
              <tr key={ln.key} className="border-t border-border/60">
                <td className="py-2 font-mono text-xs">{ln.partNo}</td>
                <td className="py-2">
                  <input
                    className="w-20 rounded border px-1"
                    value={ln.qty}
                    onChange={(e) => setLines((p) => p.map((x) => (x.key === ln.key ? { ...x, qty: e.target.value } : x)))}
                  />
                </td>
                <td className="py-2">
                  <input
                    className="w-24 rounded border px-1"
                    value={ln.unitCost}
                    onChange={(e) => setLines((p) => p.map((x) => (x.key === ln.key ? { ...x, unitCost: e.target.value } : x)))}
                  />
                </td>
                <td className="py-2">
                  <button type="button" className="text-xs text-destructive underline" onClick={() => setLines((p) => p.filter((x) => x.key !== ln.key))}>
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={saving}
        onClick={() => void submit()}
      >
        {saving ? '建立中…' : '建立'}
      </button>
    </div>
  );
}
