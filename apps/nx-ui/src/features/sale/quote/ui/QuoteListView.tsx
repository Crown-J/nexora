// apps/nx-ui/src/features/sale/quote/ui/QuoteListView.tsx
// NX04-M3 C1：QT 報價單工作台 - 列表 + 快速新增
//
// LITE 範式（對齊 NX03 issue-report）：空畫面 + 全鍵盤（N/R）+ 桌面優先
// 狀態流：DRAFT → SENT →（ACCEPTED 被採用 / REJECTED 拒絕 / EXPIRED 過期）→ CANCELLED

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createQuote, listQuote } from '../api/quote';
import type { CreateQuotePayload, Quote, QuoteStatus } from '@data/types/sale/quote';
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL } from '@data/types/sale/quote';

const STATUS_OPTIONS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  ...QUOTE_STATUSES.map((s) => ({ value: s, label: `${s} ${QUOTE_STATUS_LABEL[s]}` })),
];

const STATUS_BADGE_CLASS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

export function QuoteListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listQuote({
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
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · QUOTE</p>
        <h1 className="text-2xl font-semibold tracking-tight">報價單工作台</h1>
        <p className="text-sm text-muted-foreground">
          DRAFT → SENT → ACCEPTED（被 SO 採用）/ REJECTED / EXPIRED / CANCELLED。
          <kbd className="ml-2 rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus | '')}
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
            placeholder="單號 / 備註 / 客戶代碼 / 名稱 / 料件"
            className="rounded border bg-background px-2 py-1"
          />
        </label>
        <button
          onClick={() => void reload()}
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '新增報價 (N)'}
        </button>
      </section>

      {showNew ? (
        <QuickCreateForm
          onCreated={(id) => router.push(`/dashboard/sale/qt/${id}`)}
          onCancel={() => setShowNew(false)}
        />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無報價單。按 <kbd className="rounded border px-1">N</kbd> 新增一筆。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">報價日</th>
                <th className="px-3 py-2 text-left">有效至</th>
                <th className="px-3 py-2 text-left">客戶 ID</th>
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
                  <td className="px-3 py-2">{r.quoteDate.slice(0, 10)}</td>
                  <td className="px-3 py-2">{r.validUntil ? r.validUntil.slice(0, 10) : '-'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.customerId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.subtotal}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.totalAmount}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[r.status] ?? 'bg-muted'}`}>
                      {QUOTE_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/sale/qt/${r.id}`}
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
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerGradeId, setCustomerGradeId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim() || !customerId.trim()) {
      setErr('warehouseId / customerId 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuotePayload = {
        warehouseId: warehouseId.trim(),
        customerId: customerId.trim(),
        customerGradeId: customerGradeId.trim() || undefined,
        quoteDate,
        validUntil: validUntil || undefined,
        taxRate: Number(taxRate) || 0,
        remark: remark.trim() || undefined,
      };
      const q = await createQuote(payload);
      onCreated(q.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增報價單（建立後進入詳情頁加料件）</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block mb-1">🟢 倉庫 ID *</span>
          <input
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="NX01WHSE..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 客戶 ID *</span>
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="NX01PTNR..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 客戶等級 ID（影響毛利警告）</span>
          <input
            value={customerGradeId}
            onChange={(e) => setCustomerGradeId(e.target.value)}
            placeholder="NX01CUGR..."
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 報價日 *</span>
          <input
            type="date"
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 有效至</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
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
        <label className="text-sm md:col-span-2">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="客戶口頭備註等"
            className="w-full rounded border bg-background px-2 py-1"
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
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-1.5 text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}
