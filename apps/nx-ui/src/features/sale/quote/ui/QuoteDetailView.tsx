// apps/nx-ui/src/features/sale/quote/ui/QuoteDetailView.tsx
// NX04-M3 C1：QT 報價單 - 詳情 + 狀態流轉 + 加料件（含歷史價提示 + 毛利警告）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { IssueReportTrigger } from '@/features/shared/issue-report-trigger';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import {
  addQuoteItem,
  getQuote,
  getQuoteHistoricalPrices,
  removeQuoteItem,
  updateQuote,
  voidQuote,
} from '../api/quote';
import type {
  CreateQuoteItemPayload,
  Quote,
  QuoteHistoricalPrice,
  QuoteItem,
  QuoteStatus,
} from '../types';
import { QUOTE_STATUS_LABEL } from '../types';

export function QuoteDetailView({ id }: { id: string }) {
  return (
    <TieredFormProvider defaultMode="lite">
      <QuoteDetailInner id={id} />
    </TieredFormProvider>
  );
}

function QuoteDetailInner({ id }: { id: string }) {
  const [q, setQ] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuote(id);
      setQ(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !q) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !q) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!q) return null;

  const editable = q.status === 'DRAFT' || q.status === 'SENT';
  const itemsEditable = editable && !q.voidedAt;

  // 狀態流轉
  const canSend = q.status === 'DRAFT';
  const canReject = q.status === 'SENT';
  const canExpire = q.status === 'SENT';
  const canVoid = q.status === 'DRAFT' || q.status === 'SENT';

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · QUOTE</p>
          <h1 className="text-2xl font-mono font-semibold">{q.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              狀態：{QUOTE_STATUS_LABEL[q.status] ?? q.status}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">客戶 {q.customerId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">倉庫 {q.warehouseId}</span>
            {q.customerGradeId ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                等級 {q.customerGradeId}
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                ⚠️ 未設客戶等級、無毛利警告
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/nx04/quote" className="rounded border px-3 py-1 text-sm hover:bg-muted">
            ← 返回列表
          </Link>
          <button
            disabled={busy}
            onClick={() => void reload()}
            className="rounded border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            重整 (R)
          </button>
          <IssueReportTrigger sourceDocType="QT" sourceDocId={q.id} warehouseId={q.warehouseId} />
          {canSend ? (
            <button
              disabled={busy}
              onClick={() => void handle(() => updateQuote(id, { status: 'SENT' }), '寄出')}
              className="rounded bg-amber-500 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              寄出 → SENT
            </button>
          ) : null}
          {canReject ? (
            <button
              disabled={busy}
              onClick={() => void handle(() => updateQuote(id, { status: 'REJECTED' }), '拒絕')}
              className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-700 disabled:opacity-50"
            >
              客戶拒絕 → REJECTED
            </button>
          ) : null}
          {canExpire ? (
            <button
              disabled={busy}
              onClick={() => void handle(() => updateQuote(id, { status: 'EXPIRED' }), '過期')}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              標記過期 → EXPIRED
            </button>
          ) : null}
          {canVoid ? (
            <button
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('作廢原因（必填）');
                if (!reason?.trim()) return;
                void handle(() => voidQuote(id, reason.trim()), '作廢');
              }}
              className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 disabled:opacity-50"
            >
              作廢 → CANCELLED
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <HeaderEditor q={q} editable={editable} onSaved={reload} />

      <ItemsSection
        q={q}
        items={q.items ?? []}
        editable={itemsEditable}
        onChanged={reload}
      />

      <footer className="flex flex-wrap gap-6 rounded border bg-muted/30 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">未稅小計</div>
          <div className="font-mono tabular-nums">{q.subtotal}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">稅率 / 稅額</div>
          <div className="font-mono tabular-nums">
            {q.taxRate}% / {q.taxAmount}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">總額（含稅）</div>
          <div className="font-mono tabular-nums text-lg font-semibold">{q.totalAmount}</div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          建立 {q.createdAt.slice(0, 19).replace('T', ' ')} by {q.createdBy}
          <br />
          更新 {q.updatedAt.slice(0, 19).replace('T', ' ')} by {q.updatedBy}
        </div>
      </footer>
    </div>
  );
}

function HeaderEditor({
  q,
  editable,
  onSaved,
}: {
  q: Quote;
  editable: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [quoteDate, setQuoteDate] = useState(q.quoteDate.slice(0, 10));
  const [validUntil, setValidUntil] = useState(q.validUntil?.slice(0, 10) ?? '');
  const [remark, setRemark] = useState(q.remark ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await updateQuote(q.id, {
        quoteDate,
        validUntil: validUntil || undefined,
        remark,
      });
      setSavedAt(new Date().toLocaleTimeString());
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border p-4">
      <h2 className="mb-3 text-sm font-semibold">基本資料 {editable ? '' : <span className="text-muted-foreground">（唯讀）</span>}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="block mb-1">報價日</span>
          <input
            type="date"
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">有效至</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="block mb-1">備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
      </div>
      {editable ? (
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '儲存中…' : '儲存基本資料'}
          </button>
          {savedAt ? <span className="text-xs text-emerald-700">已儲存 {savedAt}</span> : null}
          {err ? <span className="text-xs text-destructive">{err}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function ItemsSection({
  q,
  items,
  editable,
  onChanged,
}: {
  q: Quote;
  items: QuoteItem[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">明細（{items.length} 行）</h2>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">料號 / 品名</th>
                <th className="px-3 py-2 text-right">數量</th>
                <th className="px-3 py-2 text-right">單價</th>
                <th className="px-3 py-2 text-right">最低售價</th>
                <th className="px-3 py-2 text-right">已轉量</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">毛利警示</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const below = it.minPrice && Number(it.unitPrice) < Number(it.minPrice);
                return (
                  <tr key={it.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{it.partNo}</div>
                      <div className="text-muted-foreground">{it.partName}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${below ? 'text-rose-600 font-semibold' : ''}`}>
                      {it.unitPrice}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                      {it.minPrice ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{it.transferredQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                    <td className="px-3 py-2 text-xs">
                      {below ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-900">
                          ⚠️ 低於最低售價：{it.belowMinReason ?? '未填理由'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`刪除明細 ${it.lineNo}？`)) return;
                            try {
                              await removeQuoteItem(q.id, it.id);
                              await onChanged();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : '刪除失敗');
                            }
                          }}
                          className="text-xs text-rose-700 hover:underline"
                        >
                          刪除
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          尚無明細。{editable ? '用下方表單新增。' : ''}
        </div>
      )}

      {editable ? (
        <AddItemForm customerId={q.customerId} quoteId={q.id} onAdded={onChanged} />
      ) : null}
    </section>
  );
}

function AddItemForm({
  customerId,
  quoteId,
  onAdded,
}: {
  customerId: string;
  quoteId: string;
  onAdded: () => void | Promise<void>;
}) {
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [belowMinReason, setBelowMinReason] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<QuoteHistoricalPrice[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!partId.trim()) {
      setErr('請先輸入 partId');
      return;
    }
    setHistLoading(true);
    setErr(null);
    try {
      const rows = await getQuoteHistoricalPrices(customerId, partId.trim(), 5);
      setHistory(rows);
      if (rows.length && Number(unitPrice) === 0) {
        // 自動帶上次報價當預設、user 可改
        setUnitPrice(rows[0].unitPrice);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '查歷史價失敗');
    } finally {
      setHistLoading(false);
    }
  }, [customerId, partId, unitPrice]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId.trim() || Number(qty) <= 0) {
      setErr('partId / qty 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuoteItemPayload = {
        partId: partId.trim(),
        qty: Number(qty),
        unitPriceSnapshot: Number(unitPrice),
        belowMinReason: belowMinReason.trim() || undefined,
        remark: remark.trim() || undefined,
      };
      await addQuoteItem(quoteId, payload);
      // reset
      setPartId('');
      setQty('1');
      setUnitPrice('0');
      setBelowMinReason('');
      setRemark('');
      setHistory([]);
      await onAdded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '新增失敗';
      setErr(
        msg.includes('belowMinReason')
          ? `${msg}（請補填「低於最低售價的原因」後重送）`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">新增明細</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="block mb-1">🟢 料號 ID *</span>
          <div className="flex gap-1">
            <input
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              placeholder="NX01PART..."
              className="w-full rounded border bg-background px-2 py-1"
              required
            />
            <button
              type="button"
              onClick={() => void fetchHistory()}
              disabled={histLoading}
              className="rounded border px-2 text-xs disabled:opacity-50"
              title="查歷史價"
            >
              📜
            </button>
          </div>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 數量 *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 報價單價 *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="block mb-1">🟡 低於最低售價原因（若被擋下、補填這欄）</span>
          <input
            value={belowMinReason}
            onChange={(e) => setBelowMinReason(e.target.value)}
            placeholder="客戶老主顧 / 量大 / ..."
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
        <label className="text-sm md:col-span-4">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>

      {history.length > 0 ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div className="mb-2 font-semibold text-emerald-900">
            📜 該客戶歷史報價（最近 {history.length} 筆）
          </div>
          <div className="space-y-1 font-mono">
            {history.map((h) => (
              <div key={h.quoteItemId} className="flex flex-wrap gap-3 text-emerald-900">
                <span>{h.docNo}</span>
                <span>{h.quoteDate.slice(0, 10)}</span>
                <span>{h.status}</span>
                <span>單價 {h.unitPrice}</span>
                <span>數量 {h.qty}</span>
                {h.minPrice ? <span className="opacity-60">最低 {h.minPrice}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? '新增中…' : '新增明細'}
      </button>
    </form>
  );
}
