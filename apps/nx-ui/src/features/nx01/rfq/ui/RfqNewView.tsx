'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { listPartner } from '@/features/nx00/partner/api/partner';
import type { PartnerDto } from '@/features/nx00/partner/types';
import { listLookupPart, listLookupWarehouse } from '@/features/nx00/lookup/api/lookup';
import type { LookupRow } from '@/features/nx00/lookup/types';

import { createRfq } from '../../api/rfq';

type Line = {
  key: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: string;
  unitPrice: string;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSupplier(p: PartnerDto): boolean {
  return p.partnerType === 'S' || p.partnerType === 'SUP';
}

export function RfqNewView() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState('');
  const [whOpts, setWhOpts] = useState<LookupRow[]>([]);
  const [rfqDate, setRfqDate] = useState(todayYmd);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<PartnerDto[]>([]);
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [partQ, setPartQ] = useState('');
  const [partHits, setPartHits] = useState<LookupRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLookupWarehouse({ isActive: true })
      .then(setWhOpts)
      .catch(() => setWhOpts([]));
  }, []);

  useEffect(() => {
    listPartner({ page: 1, pageSize: 500 })
      .then((r) => setSuppliers(r.items.filter(isSupplier)))
      .catch(() => setSuppliers([]));
  }, []);

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
        unitPrice: '',
      },
    ]);
    setPartQ('');
    setPartHits([]);
  }, []);

  const removeLine = (key: string) => setLines((prev) => prev.filter((x) => x.key !== key));

  const updateLine = (key: string, patch: Partial<Pick<Line, 'qty' | 'unitPrice'>>) => {
    setLines((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const submit = async () => {
    setError(null);
    if (!warehouseId.trim()) {
      setError('請選擇倉庫（必填）。');
      return;
    }
    if (!lines.length) {
      setError('至少一筆明細。');
      return;
    }
    const items = [];
    for (const ln of lines) {
      const qty = Number(ln.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(`料號 ${ln.partNo} 數量須大於 0`);
        return;
      }
      const up = ln.unitPrice.trim() === '' ? null : Number(ln.unitPrice);
      if (up != null && (!Number.isFinite(up) || up < 0)) {
        setError(`料號 ${ln.partNo} 單價無效`);
        return;
      }
      items.push({
        partId: ln.partId,
        qty,
        unitPrice: up,
      });
    }
    setSaving(true);
    try {
      const r = await createRfq({
        warehouseId: warehouseId.trim(),
        rfqDate,
        supplierId: supplierId.trim() || null,
        remark: remark.trim() || null,
        items,
      });
      router.push(`/dashboard/nx01/rfq/${encodeURIComponent(r.id)}`);
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
          <h1 className="text-xl font-semibold">新增詢價單</h1>
          <p className="mt-1 text-sm text-muted-foreground">倉庫用於產生單號倉別碼，建立後仍可在後續轉進貨時指定進貨倉。</p>
        </div>
        <Link href="/dashboard/nx01/rfq" className="text-sm text-muted-foreground underline">
          返回列表
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card/40 p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          倉庫（必填）
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
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
          詢價日期
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={rfqDate}
            onChange={(e) => setRfqDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          供應商（選填）
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">未指定</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          備註
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 p-4">
        <h2 className="text-sm font-semibold">新增明細</h2>
        <div className="relative">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="輸入料號或品名關鍵字搜尋零件…"
            value={partQ}
            onChange={(e) => setPartQ(e.target.value)}
          />
          {partHits.length > 0 ? (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover text-sm shadow-md">
              {partHits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => addPart(p)}
                  >
                    <span className="font-mono">{p.code}</span> {p.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-2">料號</th>
                <th className="py-2 pr-2">品名</th>
                <th className="py-2 pr-2">數量</th>
                <th className="py-2 pr-2">單價（選填）</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => (
                <tr key={ln.key} className="border-t border-border/60">
                  <td className="py-2 pr-2 font-mono text-xs">{ln.partNo}</td>
                  <td className="py-2 pr-2">{ln.partName}</td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-24 rounded border border-border px-2 py-1 tabular-nums"
                      value={ln.qty}
                      onChange={(e) => updateLine(ln.key, { qty: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-28 rounded border border-border px-2 py-1 tabular-nums"
                      value={ln.unitPrice}
                      placeholder="空白＝待回覆"
                      onChange={(e) => updateLine(ln.key, { unitPrice: e.target.value })}
                    />
                  </td>
                  <td className="py-2">
                    <button type="button" className="text-xs text-destructive underline" onClick={() => removeLine(ln.key)}>
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? '建立中…' : '建立詢價單'}
        </button>
      </div>
    </div>
  );
}
