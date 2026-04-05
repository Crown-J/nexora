'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createPr } from '../../api/pr';
import { getRr, listRr } from '../../api/rr';
import type { RrDetailDto, RrListRow } from '../../types';

type Step = 1 | 2;

export function PrNewView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rrFromQuery = searchParams.get('rr')?.trim() ?? '';

  const [step, setStep] = useState<Step>(1);
  const [rrList, setRrList] = useState<RrListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [rrDetail, setRrDetail] = useState<RrDetailDto | null>(null);
  const [pick, setPick] = useState<Record<string, { on: boolean; qty: string }>>({});
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPostedRrList = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await listRr({ page: 1, pageSize: 100, status: 'P' });
      setRrList(r.data);
    } catch {
      setRrList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPostedRrList();
  }, [loadPostedRrList]);

  const selectRr = useCallback(async (rrId: string) => {
    setError(null);
    try {
      const d = await getRr(rrId);
      if (d.status !== 'P') {
        setError('僅能選擇已過帳的進貨單');
        return;
      }
      setRrDetail(d);
      const next: Record<string, { on: boolean; qty: string }> = {};
      for (const it of d.items) {
        next[it.id] = { on: true, qty: String(it.qty) };
      }
      setPick(next);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入進貨單失敗');
    }
  }, []);

  useEffect(() => {
    if (!rrFromQuery) return;
    void selectRr(rrFromQuery);
  }, [rrFromQuery, selectRr]);

  const submit = async () => {
    if (!rrDetail) return;
    setError(null);
    const items = [];
    for (const it of rrDetail.items) {
      const row = pick[it.id];
      if (!row?.on) continue;
      const q = Number(row.qty);
      if (!Number.isFinite(q) || q <= 0) {
        setError(`數量無效：${it.partNo}`);
        return;
      }
      items.push({ rrItemId: it.id, qty: q });
    }
    if (!items.length) {
      setError('請至少勾選一筆明細');
      return;
    }
    setSaving(true);
    try {
      const r = await createPr({
        rrId: rrDetail.id,
        supplierId: rrDetail.supplierId,
        warehouseId: rrDetail.warehouseId,
        remark: remark.trim() || null,
        items,
      });
      router.push(`/dashboard/nx01/pr/${encodeURIComponent(r.id)}`);
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
          <h1 className="text-xl font-semibold">新增退貨單</h1>
        </div>
        <Link href="/dashboard/nx01/pr" className="text-sm text-muted-foreground underline">
          返回列表
        </Link>
      </header>

      <ol className="flex flex-wrap gap-4 text-sm">
        <li
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${step === 1 ? 'border-primary bg-primary/5 font-medium' : 'border-border text-muted-foreground'}`}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">1</span>
          選擇來源進貨單（須已過帳）
        </li>
        <li
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${step === 2 ? 'border-primary bg-primary/5 font-medium' : 'border-border text-muted-foreground'}`}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">2</span>
          勾選退貨明細與數量
        </li>
      </ol>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">請先選一張已過帳的進貨單；倉庫與供應商將帶入下一步，無須重填。</p>
          {listLoading ? <p className="text-sm text-muted-foreground">載入進貨單…</p> : null}
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">單號</th>
                  <th className="px-3 py-2">日期</th>
                  <th className="px-3 py-2">倉庫</th>
                  <th className="px-3 py-2">供應商</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rrList.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono">{r.docNo}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.rrDate}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.warehouseCode}</td>
                    <td className="px-3 py-2">{r.supplierName}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-primary underline" onClick={() => void selectRr(r.id)}>
                        選此單
                      </button>
                    </td>
                  </tr>
                ))}
                {!listLoading && rrList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      尚無已過帳進貨單
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {step === 2 && rrDetail ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">來源進貨：</span>
              <span className="font-mono font-medium">{rrDetail.docNo}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              {rrDetail.warehouseName} · {rrDetail.supplierName} · 日期 {rrDetail.rrDate}
            </p>
            <button type="button" className="mt-2 text-xs text-primary underline" onClick={() => setStep(1)}>
              ← 改選其他進貨單
            </button>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            備註
            <input className="rounded-lg border bg-background px-3 py-2 text-sm" value={remark} onChange={(e) => setRemark(e.target.value)} />
          </label>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-10" />
                  <th className="px-3 py-2">料號</th>
                  <th className="px-3 py-2">品名</th>
                  <th className="px-3 py-2 text-right">原進貨量</th>
                  <th className="px-3 py-2 text-right">退貨數量</th>
                </tr>
              </thead>
              <tbody>
                {rrDetail.items.map((it) => {
                  const row = pick[it.id] ?? { on: false, qty: '0' };
                  return (
                    <tr key={it.id} className="border-b border-border/50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.on}
                          onChange={(e) => setPick((p) => ({ ...p, [it.id]: { ...row, on: e.target.checked } }))}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{it.partNo}</td>
                      <td className="px-3 py-2">{it.partName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          className="w-24 rounded border px-2 py-1 tabular-nums text-right"
                          disabled={!row.on}
                          value={row.qty}
                          onChange={(e) => setPick((p) => ({ ...p, [it.id]: { ...row, qty: e.target.value } }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? '建立中…' : '建立退貨單'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
