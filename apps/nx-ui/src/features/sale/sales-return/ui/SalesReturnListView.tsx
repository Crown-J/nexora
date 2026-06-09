// apps/nx-ui/src/features/sale/sales-return/ui/SalesReturnListView.tsx
// NX04-M3 C4：SR 銷退單工作台 - 列表 + 快速新增

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createSr, listSr } from '../api/sales-return';
import type { CreateSrPayload, Sr, SrStatus } from '../types';
import { SR_STATUS_BADGE_CLASS, SR_STATUS_LABEL, SR_STATUSES } from '../types';

const STATUS_OPTIONS: { value: SrStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  ...SR_STATUSES.map((s) => ({ value: s, label: `${s} ${SR_STATUS_LABEL[s]}` })),
];

const METHOD_OPTIONS = [
  { value: 'R', label: 'R 退錢' },
  { value: 'D', label: 'D 折讓' },
  { value: 'X', label: 'X 換新' },
];

export function SalesReturnListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Sr[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SrStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listSr({
        status: status || undefined,
        search: search.trim() || undefined,
        pageSize: 50,
      });
      setRows(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'list 失敗');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowNew((v) => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void reload();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reload]);

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · SALES RETURN</p>
        <h1 className="text-2xl font-semibold tracking-tight">銷退單工作台</h1>
        <p className="text-sm text-muted-foreground">
          DRAFT（業務開單）→ INSPECTING（倉管收貨、填好品/壞品）→ POSTED / REJECTED / CANCELLED。
          <kbd className="ml-2 rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SrStatus | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="單號 / 備註"
            className="rounded border bg-background px-2 py-1"
          />
        </label>
        <button onClick={() => void reload()} className="rounded border px-3 py-1 text-sm hover:bg-muted">
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '新增銷退 (N)'}
        </button>
      </section>

      {showNew ? (
        <QuickCreateForm
          onCreated={(id) => router.push(`/dashboard/nx04/sales-return/${id}`)}
          onCancel={() => setShowNew(false)}
        />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無銷退單。按 <kbd className="rounded border px-1">N</kbd> 新增一筆。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">銷退日</th>
                <th className="px-3 py-2 text-left">客戶 / SO</th>
                <th className="px-3 py-2 text-left">退款方式</th>
                <th className="px-3 py-2 text-right">未稅</th>
                <th className="px-3 py-2 text-right">含稅</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/50">
                  <td className="px-3 py-2 font-mono">{r.docNo}</td>
                  <td className="px-3 py-2">{r.srDate.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <div>{r.customerId}</div>
                    <div className="text-muted-foreground">SO {r.soId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.returnMethod}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.subtotal}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.totalAmount}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${SR_STATUS_BADGE_CLASS[r.status] ?? 'bg-muted'}`}>
                      {SR_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/nx04/sales-return/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      進入 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">共 {total} 筆</footer>
    </div>
  );
}

function QuickCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [soId, setSoId] = useState('');
  const [srDate, setSrDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnMethod, setReturnMethod] = useState('R');
  // 05 補做 C1 2026-06-09：退回方式（A=業務發起 / B=送貨員當場帶回）
  const [initiationType, setInitiationType] = useState<'A' | 'B' | ''>('A');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!soId.trim()) {
      setErr('soId 必填（來源 SO 必填）');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateSrPayload = {
        soId: soId.trim(),
        srDate,
        returnMethod,
        // 05 補做 C1 2026-06-09
        initiationType: initiationType || undefined,
        taxRate: Number(taxRate) || 0,
        remark: remark.trim() || undefined,
      };
      const sr = await createSr(payload);
      onCreated(sr.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增銷退單（建立後進入詳情頁加退貨明細）</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block mb-1">🟢 來源 SO ID *</span>
          <input
            value={soId}
            onChange={(e) => setSoId(e.target.value)}
            placeholder="NX04SO..."
            className="w-full rounded border bg-background px-2 py-1 font-mono"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 銷退日 *</span>
          <input
            type="date"
            value={srDate}
            onChange={(e) => setSrDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 退款方式 *</span>
          <select
            value={returnMethod}
            onChange={(e) => setReturnMethod(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {/* 05 補做 C1 2026-06-09：退回方式 */}
        <label className="text-sm">
          <span className="block mb-1">🟢 退回方式</span>
          <select
            value={initiationType}
            onChange={(e) => setInitiationType((e.target.value as 'A' | 'B' | '') || '')}
            className="w-full rounded border bg-background px-2 py-1"
          >
            <option value="A">A 業務發起（計畫性）</option>
            <option value="B">B 送貨員當場帶回（臨時）</option>
            <option value="">— 未指定</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 稅率 % *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm md:col-span-4">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            placeholder="客戶反映、退貨原因摘要"
          />
        </label>
      </div>
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? '建立中…' : '建立並進入'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
          取消
        </button>
      </div>
    </form>
  );
}
